import { Injectable, ConflictException, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import * as bcrypt from "bcryptjs";
import { UsuarioTipo } from "@prisma/client";
import type { AtualizarUsuarioAdminInput } from "@imbobi/schemas";

export interface CriarUsuarioAdminDto {
  nome: string;
  email: string;
  senha: string;
  tipo: UsuarioTipo;
}

export interface AdminOverview {
  totalUsuarios: number;
  obrasAtivas: number;
  obrasTotal: number;
  creditoAprovado: number;
  creditoLiberado: number;
  kycPendentes: number;
  etapasPendentes: number;
  visitasAgendadas: number;
  filaLiberacao: number;
}

export interface Atividade {
  id: string;
  tipo: string;
  descricao: string;
  criadoEm: string;
}

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(): Promise<AdminOverview> {
    const [
      totalUsuarios,
      obrasAtivas,
      obrasTotal,
      creditosAgregados,
      kycPendentes,
      etapasPendentes,
      filaLiberacao,
      visitasAgendadas,
    ] = await Promise.all([
      this.prisma.usuario.count({ where: { deletadoEm: null } }),
      this.prisma.obra.count({ where: { status: "EM_EXECUCAO" } }),
      this.prisma.obra.count(),
      this.prisma.credito.aggregate({
        where: { status: { in: ["ATIVO"] } },
        _sum: { valorAprovado: true, valorLiberado: true },
      }),
      this.prisma.kycDocumento.count({ where: { status: { in: ["PENDENTE"] } } }),
      // etapas aguardando aprovação de vistoria
      this.prisma.etapaObra.count({ where: { status: "AGUARDANDO_VISTORIA" } }),
      // etapas concluídas aguardando liberação financeira
      this.prisma.etapaObra.count({ where: { status: "CONCLUIDA" } }),
      // obras distintas com pelo menos uma etapa aguardando vistoria (site visits pending)
      this.prisma.obra.count({
        where: { etapas: { some: { status: "AGUARDANDO_VISTORIA" } } },
      }),
    ]);

    return {
      totalUsuarios,
      obrasAtivas,
      obrasTotal,
      creditoAprovado: Number(creditosAgregados._sum.valorAprovado ?? 0),
      creditoLiberado: Number(creditosAgregados._sum.valorLiberado ?? 0),
      kycPendentes,
      etapasPendentes,
      visitasAgendadas,
      filaLiberacao,
    };
  }

  async atividades(limit: number): Promise<Atividade[]> {
    const [etapasAudit, kycDocs, creditos] = await Promise.all([
      this.prisma.etapaAuditLog.findMany({
        orderBy: { criadoEm: "desc" },
        take: limit,
        include: {
          etapa: { select: { nome: true } },
        },
      }),
      this.prisma.kycDocumento.findMany({
        orderBy: { criadoEm: "desc" },
        take: limit,
        include: {
          usuario: { select: { nome: true } },
        },
      }),
      this.prisma.credito.findMany({
        orderBy: { criadoEm: "desc" },
        take: limit,
        include: {
          usuario: { select: { nome: true } },
        },
      }),
    ]);

    const eventos: Atividade[] = [
      ...etapasAudit.map((log) => ({
        id: log.auditId,
        tipo: `ETAPA_${log.acaoTipo}`,
        descricao: `Etapa "${log.etapa.nome}" ${log.acaoTipo.toLowerCase()}`,
        criadoEm: log.criadoEm.toISOString(),
      })),
      ...kycDocs.map((doc) => ({
        id: doc.kycDocumentoId,
        tipo: "KYC_ENVIADO",
        descricao: `KYC "${doc.tipo}" enviado por ${doc.usuario.nome}`,
        criadoEm: doc.criadoEm.toISOString(),
      })),
      ...creditos.map((c) => ({
        id: c.creditoId,
        tipo: "CREDITO_SOLICITADO",
        descricao: `Crédito R$ ${c.valorAprovado.toFixed(2)} solicitado por ${c.usuario.nome}`,
        criadoEm: c.criadoEm.toISOString(),
      })),
    ];

    eventos.sort(
      (a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime()
    );

    return eventos.slice(0, limit);
  }

  async risco() {
    const agora = new Date();

    const [creditos, liberacoesFalha, liberacoesConcluidas] = await Promise.all([
      this.prisma.credito.findMany({
        select: { status: true, valorAprovado: true, valorLiberado: true, dataVencimento: true },
      }),
      this.prisma.liberacaoParcela.aggregate({
        where: { status: "FALHA" },
        _count: true,
        _sum: { valor: true },
      }),
      this.prisma.liberacaoParcela.count({ where: { status: "CONCLUIDA" } }),
    ]);

    const totalCreditos = creditos.length;
    const valorTotal = creditos.reduce((s, c) => s + Number(c.valorAprovado), 0);
    const valorLiberado = creditos.reduce((s, c) => s + Number(c.valorLiberado), 0);

    const statusMap: Record<string, { count: number; valor: number }> = {};
    for (const c of creditos) {
      if (!statusMap[c.status]) statusMap[c.status] = { count: 0, valor: 0 };
      statusMap[c.status].count++;
      statusMap[c.status].valor += Number(c.valorAprovado);
    }
    const porStatus = Object.entries(statusMap).map(([status, v]) => ({ status, ...v }));

    const vencidos = creditos.filter((c) => c.status === "VENCIDO");
    const nplValor = vencidos.reduce((s, c) => s + Number(c.valorAprovado), 0);

    const aging = [
      { faixa: "0-30d", min: 0, max: 30 },
      { faixa: "31-60d", min: 31, max: 60 },
      { faixa: "61-90d", min: 61, max: 90 },
      { faixa: "90d+", min: 91, max: Infinity },
    ];
    const porAging = aging.map(({ faixa, min, max }) => {
      const items = vencidos.filter((c) => {
        const ref = c.dataVencimento ?? agora;
        const dias = Math.floor((agora.getTime() - ref.getTime()) / 86400000);
        return dias >= min && dias <= max;
      });
      return { faixa, count: items.length, valor: items.reduce((s, c) => s + Number(c.valorAprovado), 0) };
    });

    const totalFalha = liberacoesFalha._count;
    const valorFalha = Number(liberacoesFalha._sum.valor ?? 0);
    const taxaFalha = totalFalha + liberacoesConcluidas > 0
      ? Math.round((totalFalha / (totalFalha + liberacoesConcluidas)) * 100)
      : 0;

    return {
      carteira: { totalCreditos, valorTotal, valorLiberado, porStatus },
      npl: {
        count: vencidos.length,
        valor: nplValor,
        percentualCarteira: valorTotal > 0 ? Math.round((nplValor / valorTotal) * 10000) / 100 : 0,
        porAging,
      },
      liberacoes: { totalFalha, valorFalha, taxaFalha },
    };
  }

  async listarUsuarios() {
    const rows = await this.prisma.usuario.findMany({
      where: { deletadoEm: null },
      orderBy: { criadoEm: "desc" },
      select: {
        usuarioId: true,
        nome: true,
        email: true,
        telefone: true,
        tipo: true,
        kycStatus: true,
        bloqueadoEm: true,
        funcoesBloqueadas: true,
        criadoEm: true,
        _count: { select: { obras: true, creditos: true } },
      },
    });
    return rows.map(({ usuarioId, _count, ...rest }) => ({
      id: usuarioId,
      ...rest,
      totalObras: _count.obras,
      totalCreditos: _count.creditos,
    }));
  }

  async atualizarUsuario(id: string, dto: AtualizarUsuarioAdminInput, adminId: string) {
    const usuario = await this.prisma.usuario.findUnique({ where: { usuarioId: id } });
    if (!usuario || usuario.deletadoEm) throw new NotFoundException("Usuário não encontrado");

    // O admin não pode bloquear a própria conta nem rebaixar o próprio perfil
    if (id === adminId && (dto.bloqueado === true || (dto.tipo && dto.tipo !== "ADMIN"))) {
      throw new BadRequestException("Não é possível bloquear ou rebaixar a própria conta de administrador.");
    }

    const { usuarioId, ...atualizado } = await this.prisma.usuario.update({
      where: { usuarioId: id },
      data: {
        ...(dto.tipo !== undefined && { tipo: dto.tipo as UsuarioTipo }),
        ...(dto.bloqueado !== undefined && { bloqueadoEm: dto.bloqueado ? new Date() : null }),
        ...(dto.funcoesBloqueadas !== undefined && { funcoesBloqueadas: dto.funcoesBloqueadas }),
      },
      select: {
        usuarioId: true,
        nome: true,
        email: true,
        tipo: true,
        kycStatus: true,
        bloqueadoEm: true,
        funcoesBloqueadas: true,
        criadoEm: true,
      },
    });

    // Bloqueio de conta derruba as sessões ativas do usuário
    if (dto.bloqueado === true) {
      await this.prisma.sessaoToken.updateMany({
        where: { usuarioId: id, revogadoEm: null },
        data: { revogadoEm: new Date() },
      });
    }

    return { id: usuarioId, ...atualizado };
  }

  async listarObras(limit: number, offset: number) {
    const obras = await this.prisma.obra.findMany({
      take: limit, skip: offset,
      orderBy: { criadoEm: "desc" },
      include: {
        usuario: { select: { nome: true } },
        etapas: { select: { status: true } },
      },
    });
    // Map to the ApiObra shape expected by the frontend (id, nome, status, tomador)
    return obras.map((o) => ({
      id: o.obraId,
      nome: o.nome,
      status: o.status,
      tomador: o.usuario?.nome,
    }));
  }

  async criarUsuario(dto: CriarUsuarioAdminDto) {
    const existe = await this.prisma.usuario.findUnique({ where: { email: dto.email } });
    if (existe) throw new ConflictException("E-mail já cadastrado");
    const passwordHash = await bcrypt.hash(dto.senha, 10);
    const { usuarioId, ...rest } = await this.prisma.usuario.create({
      data: {
        nome: dto.nome,
        email: dto.email,
        // Derive a deterministic placeholder CPF from the email (email is unique → CPF is unique)
        cpf: (() => {
          const h = Buffer.from(dto.email.toLowerCase()).toString("hex").replace(/[^0-9]/g, "").padStart(9, "0").slice(0, 9);
          return `${h.slice(0, 3)}.${h.slice(3, 6)}.${h.slice(6, 9)}-00`;
        })(),
        telefone: "",
        passwordHash,
        tipo: dto.tipo,
        consentidoTermos: true,
        consentidoPrivacy: true,
      },
      select: {
        usuarioId: true,
        nome: true,
        email: true,
        tipo: true,
        kycStatus: true,
        criadoEm: true,
      },
    });
    return { id: usuarioId, ...rest };
  }
}

import { Injectable, ConflictException, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { NotificacoesService } from "../notificacoes/notificacoes.service";
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificacoes: NotificacoesService,
  ) {}

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
    if (existe && !existe.deletadoEm) throw new ConflictException("E-mail já cadastrado");
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

  async excluirUsuario(id: string, adminId: string) {
    if (id === adminId) throw new BadRequestException("Não é possível excluir a própria conta.");
    const usuario = await this.prisma.usuario.findUnique({ where: { usuarioId: id } });
    if (!usuario || usuario.deletadoEm) throw new NotFoundException("Usuário não encontrado.");

    await this.prisma.$transaction([
      this.prisma.sessaoToken.updateMany({
        where: { usuarioId: id, revogadoEm: null },
        data: { revogadoEm: new Date() },
      }),
      this.prisma.usuario.update({
        where: { usuarioId: id },
        data: { deletadoEm: new Date() },
      }),
    ]);

    return { ok: true };
  }

  // ── Fila do Operador ──────────────────────────────────────────────────────────

  async listarTransferenciasPendentes(
    statusFiltro: string | undefined,
    limit: number,
    offset: number,
  ) {
    const status = (statusFiltro as any) ?? "AGUARDANDO_TRANSFERENCIA";
    const acoes = await this.prisma.acaoOperador.findMany({
      where: { status },
      orderBy: { criadoEm: "asc" },
      take: limit,
      skip: offset,
      include: {
        dadosBancarios: true,
        liberacao: {
          include: {
            credito: {
              include: { usuario: { select: { nome: true, email: true, telefone: true } } },
            },
          },
        },
      },
    });

    return acoes.map((a) => ({
      acaoId: a.acaoId,
      status: a.status,
      numeroParcela: a.numeroParcela,
      valorBruto: a.valorBruto,
      feeTranche: a.feeTranche,
      valorTransferir: a.valorTransferir,
      criadoEm: a.criadoEm.toISOString(),
      confirmadoEm: a.confirmadoEm?.toISOString(),
      observacao: a.observacao,
      dadosBancarios: a.dadosBancarios
        ? {
            banco: a.dadosBancarios.banco,
            agencia: a.dadosBancarios.agencia,
            conta: a.dadosBancarios.conta,
            tipoConta: a.dadosBancarios.tipoConta,
            chavePix: a.dadosBancarios.chavePix,
            tipoChavePix: a.dadosBancarios.tipoChavePix,
            nomeTitular: a.dadosBancarios.nomeTitular,
            cpfCnpjTitular: a.dadosBancarios.cpfCnpjTitular,
          }
        : null,
      construtor: {
        nome: a.liberacao.credito.usuario.nome,
        email: a.liberacao.credito.usuario.email,
        telefone: a.liberacao.credito.usuario.telefone,
      },
    }));
  }

  async confirmarTransferencia(acaoId: string, operadorId: string, observacao?: string) {
    const acao = await this.prisma.acaoOperador.findUnique({ where: { acaoId } });
    if (!acao) throw new NotFoundException("Ação não encontrada.");
    if (acao.status !== "AGUARDANDO_TRANSFERENCIA") {
      throw new BadRequestException("Esta transferência não está aguardando confirmação.");
    }

    await this.prisma.acaoOperador.update({
      where: { acaoId },
      data: {
        status: "TRANSFERENCIA_CONFIRMADA",
        operadorId,
        confirmadoEm: new Date(),
        observacao: observacao ?? null,
      },
    });

    await this.notificacoes.criar(
      acao.usuarioId,
      "TRANSFERENCIA_CONFIRMADA",
      "Transferência confirmada!",
      `A ${acao.numeroParcela}ª tranche foi transferida. Verifique sua conta bancária.`,
      "/dashboard",
    );

    return { ok: true };
  }

  // ── Validação de RI ───────────────────────────────────────────────────────────

  async validarRi(obraId: string, adminId: string) {
    const obra = await this.prisma.obra.findUnique({ where: { obraId } });
    if (!obra) throw new NotFoundException("Obra não encontrada.");

    await this.prisma.obra.update({
      where: { obraId },
      data: { riValidado: true },
    });

    return { ok: true, obraId, riValidado: true };
  }
}

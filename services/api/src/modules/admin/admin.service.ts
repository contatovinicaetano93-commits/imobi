import { Injectable, ConflictException, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { EmailService } from "../email/email.service";
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

export interface CreditoLiberadoMensal {
  mes: string;
  valor: number;
}

export interface ObrasPorStatus {
  status: string;
  quantidade: number;
}

export interface AdminMetricas {
  creditoLiberadoPorMes: CreditoLiberadoMensal[];
  obrasPorStatus: ObrasPorStatus[];
  taxaAprovacaoEtapas: number;
  kycPendentes: number;
  etapasAprovadas: number;
  etapasRejeitadas: number;
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
    private readonly email: EmailService,
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

  async metricas(): Promise<AdminMetricas> {
    const inicio = new Date();
    inicio.setMonth(inicio.getMonth() - 11);
    inicio.setDate(1);
    inicio.setHours(0, 0, 0, 0);

    const [
      liberacoes,
      obrasPorStatusRaw,
      etapasAprovadas,
      etapasRejeitadas,
      kycPendentes,
    ] = await Promise.all([
      this.prisma.liberacaoParcela.findMany({
        where: {
          status: "CONCLUIDA",
          processadoEm: { gte: inicio },
        },
        select: { valor: true, processadoEm: true },
      }),
      this.prisma.obra.groupBy({
        by: ["status"],
        _count: { obraId: true },
      }),
      this.prisma.etapaObra.count({ where: { status: "CONCLUIDA" } }),
      this.prisma.etapaObra.count({ where: { status: "REPROVADA" } }),
      this.prisma.kycDocumento.count({ where: { status: "PENDENTE" } }),
    ]);

    const mesesPt = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const buckets = new Map<string, number>();

    for (let i = 0; i < 12; i++) {
      const d = new Date(inicio);
      d.setMonth(inicio.getMonth() + i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      buckets.set(key, 0);
    }

    for (const lib of liberacoes) {
      if (!lib.processadoEm) continue;
      const d = lib.processadoEm;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (buckets.has(key)) {
        buckets.set(key, (buckets.get(key) ?? 0) + Number(lib.valor));
      }
    }

    const creditoLiberadoPorMes = Array.from(buckets.entries()).map(([key, valor]) => {
      const [year, month] = key.split("-");
      const mes = `${mesesPt[Number(month) - 1]}/${String(year).slice(2)}`;
      return { mes, valor };
    });

    const obrasPorStatus = obrasPorStatusRaw.map((row) => ({
      status: row.status,
      quantidade: row._count.obraId,
    }));

    const totalDecididas = etapasAprovadas + etapasRejeitadas;
    const taxaAprovacaoEtapas =
      totalDecididas > 0 ? Math.round((etapasAprovadas / totalDecididas) * 1000) / 10 : 0;

    return {
      creditoLiberadoPorMes,
      obrasPorStatus,
      taxaAprovacaoEtapas,
      kycPendentes,
      etapasAprovadas,
      etapasRejeitadas,
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

    if (id === adminId && (dto.bloqueado === true || (dto.tipo && dto.tipo !== "ADMIN"))) {
      throw new BadRequestException("Não é possível bloquear ou rebaixar a própria conta de administrador.");
    }

    if (dto.email && dto.email !== usuario.email) {
      const emailEmUso = await this.prisma.usuario.findFirst({
        where: { email: dto.email, usuarioId: { not: id }, deletadoEm: null },
      });
      if (emailEmUso) throw new ConflictException("E-mail já cadastrado.");
    }

    const data: Record<string, unknown> = {};
    if (dto.nome !== undefined) data.nome = dto.nome;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.telefone !== undefined) data.telefone = dto.telefone;
    if (dto.kycStatus !== undefined) data.kycStatus = dto.kycStatus;
    if (dto.tipo !== undefined) data.tipo = dto.tipo as UsuarioTipo;
    if (dto.bloqueado !== undefined) data.bloqueadoEm = dto.bloqueado ? new Date() : null;
    if (dto.funcoesBloqueadas !== undefined) data.funcoesBloqueadas = dto.funcoesBloqueadas;
    if (dto.novaSenha) data.passwordHash = await bcrypt.hash(dto.novaSenha, 12);

    const { usuarioId, ...atualizado } = await this.prisma.usuario.update({
      where: { usuarioId: id },
      data,
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
    const passwordHash = await bcrypt.hash(dto.senha, 12);
    const cpfDigits = Buffer.from(dto.email.toLowerCase())
      .toString("hex")
      .replace(/[^0-9]/g, "")
      .padStart(11, "0")
      .slice(0, 11);
    const { usuarioId, ...rest } = await this.prisma.usuario.create({
      data: {
        nome: dto.nome,
        email: dto.email,
        cpf: cpfDigits,
        telefone: "11999999999",
        passwordHash,
        tipo: dto.tipo,
        consentidoTermos: true,
        consentidoPrivacy: true,
        consentidoKyc: true,
        consentidoEm: new Date(),
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

  /** Homologa obra no pipe ativo (SIPOC — Admin). */
  async homologarObra(obraId: string, adminId: string) {
    const obra = await this.prisma.obra.findUnique({
      where: { obraId },
      include: { usuario: { select: { usuarioId: true, nome: true, email: true } } },
    });
    if (!obra) throw new NotFoundException("Obra não encontrada.");
    if (!["AGUARDANDO_HOMOLOGACAO", "PLANEJAMENTO"].includes(obra.status)) {
      throw new BadRequestException("Obra não está aguardando homologação.");
    }

    await this.prisma.obra.update({
      where: { obraId },
      data: { status: "EM_EXECUCAO" },
    });

    if (obra.usuario) {
      await this.notificacoes.criar(
        obra.usuario.usuarioId,
        "OBRA_HOMOLOGADA",
        "Obra homologada no pipe IMOBI",
        `Sua obra "${obra.nome}" entrou no pipe ativo. Você já pode executar etapas e enviar evidências.`,
        `/dashboard/obras/${obraId}`,
      );
      this.email
        .obraHomologadaEmail(obra.usuario.nome, obra.usuario.email, obra.nome)
        .catch(() => {});
    }

    return {
      ok: true,
      obraId,
      status: "EM_EXECUCAO",
      tomador: obra.usuario?.nome,
      homologadoPor: adminId,
    };
  }

  async reprovarHomologacaoObra(obraId: string, motivo: string) {
    const obra = await this.prisma.obra.findUnique({ where: { obraId } });
    if (!obra) throw new NotFoundException("Obra não encontrada.");
    if (!["AGUARDANDO_HOMOLOGACAO", "PLANEJAMENTO"].includes(obra.status)) {
      throw new BadRequestException("Obra não está aguardando homologação.");
    }
    await this.prisma.obra.update({
      where: { obraId },
      data: { status: "CANCELADA" },
    });
    return { ok: true, motivo };
  }

  async listarLiberacoesAguardandoPagamento(limit = 50) {
    const rows = await this.prisma.liberacaoParcela.findMany({
      where: { status: "AGUARDANDO_PAGAMENTO" },
      orderBy: { criadoEm: "asc" },
      take: limit,
      include: {
        credito: {
          include: {
            usuario: {
              select: {
                nome: true,
                email: true,
                contaBanco: true,
                contaAgencia: true,
                contaNumero: true,
                contaPix: true,
                contaTitular: true,
              },
            },
            obras: { select: { obraId: true, nome: true }, take: 1 },
          },
        },
      },
    });

    return rows.map((r) => ({
      liberacaoId: r.liberacaoId,
      etapaId: r.etapaId,
      valor: r.valor,
      status: r.status,
      criadoEm: r.criadoEm,
      tomador: r.credito.usuario?.nome,
      email: r.credito.usuario?.email,
      conta: {
        banco: r.credito.usuario?.contaBanco,
        agencia: r.credito.usuario?.contaAgencia,
        numero: r.credito.usuario?.contaNumero,
        pix: r.credito.usuario?.contaPix,
        titular: r.credito.usuario?.contaTitular,
      },
      obra: r.credito.obras[0] ?? null,
    }));
  }

  async confirmarPagamentoLiberacao(liberacaoId: string, referenciaPagamento?: string) {
    const lib = await this.prisma.liberacaoParcela.findUnique({
      where: { liberacaoId },
      include: {
        credito: {
          include: {
            usuario: true,
            obras: { take: 1 },
          },
        },
      },
    });
    if (!lib) throw new NotFoundException("Liberação não encontrada.");
    if (lib.status !== "AGUARDANDO_PAGAMENTO") {
      throw new BadRequestException("Liberação não está aguardando pagamento manual.");
    }

    await this.prisma.$transaction(async (tx) => {
      const current = await tx.liberacaoParcela.findUnique({ where: { liberacaoId } });
      if (!current || current.status !== "AGUARDANDO_PAGAMENTO") return;

      await tx.credito.update({
        where: { creditoId: lib.creditoId },
        data: { valorLiberado: { increment: lib.valor } },
      });

      await tx.liberacaoParcela.update({
        where: { liberacaoId },
        data: {
          status: "CONCLUIDA",
          processadoEm: new Date(),
          referenciaPagamento: referenciaPagamento ?? null,
        },
      });
    });

    const usuario = lib.credito.usuario;
    const obra = lib.credito.obras[0];
    if (usuario) {
      await this.notificacoes.criar(
        usuario.usuarioId,
        "PARCELA_LIBERADA",
        "Pagamento confirmado",
        `O pagamento de ${lib.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} foi creditado na conta cadastrada.`,
        obra ? `/dashboard/obras/${obra.obraId}` : "/dashboard/credito",
      );
      this.email
        .parcelaLiberadaEmail(usuario.nome, usuario.email, lib.valor, obra?.nome ?? "sua obra")
        .catch(() => {});
    }

    return {
      ok: true,
      liberacaoId,
      valor: lib.valor,
      referenciaPagamento,
    };
  }
}

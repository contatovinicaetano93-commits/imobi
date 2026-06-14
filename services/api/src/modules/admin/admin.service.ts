import { Injectable, ConflictException, NotFoundException, BadRequestException } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bull";
import { Queue } from "bull";
import { PrismaService } from "../prisma/prisma.service";
import { NotificacoesService } from "../notificacoes/notificacoes.service";
import { EmailService } from "../email/email.service";
import { PushNotificacoesService } from "../push-notificacoes/push-notificacoes.service";
import { QUEUE_LIBERACAO, type LiberacaoJob } from "../../common/constants";
import * as bcrypt from "bcryptjs";
import { UsuarioTipo } from "@prisma/client";
import type { SolicitacaoStatus } from "@prisma/client";
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
    private readonly email: EmailService,
    private readonly pushNotificacoes: PushNotificacoesService,
    @InjectQueue(QUEUE_LIBERACAO) private readonly liberacaoQueue: Queue<LiberacaoJob>,
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

  async excluirUsuario(id: string, adminId: string) {
    if (id === adminId) {
      throw new BadRequestException("Não é possível excluir a própria conta.");
    }
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

  async listarEtapasAguardandoValidacao(limit = 20, offset = 0) {
    const [etapas, total] = await Promise.all([
      this.prisma.etapaObra.findMany({
        where: { status: "APROVADA_ENGENHEIRO" },
        take: limit,
        skip: offset,
        orderBy: { atualizadoEm: "asc" }, // oldest first = most urgent
        include: {
          obra: {
            include: {
              usuario: { select: { nome: true, email: true } },
              credito: { select: { creditoId: true, valorAprovado: true, status: true } },
            },
          },
          auditLogs: {
            orderBy: { criadoEm: "desc" },
            take: 1,
            include: { usuario: { select: { nome: true } } },
          },
          evidencias: {
            select: { evidenciaId: true, fotoUrl: true, latCaptura: true, lngCaptura: true, criadoEm: true },
          },
        },
      }),
      this.prisma.etapaObra.count({ where: { status: "APROVADA_ENGENHEIRO" } }),
    ]);

    return {
      etapas: etapas.map((e) => ({
        etapaId: e.etapaId,
        nome: e.nome,
        percentualObra: e.percentualObra,
        valorLiberacao: Number(e.valorLiberacao ?? 0),
        obraId: e.obra.obraId,
        obraNome: e.obra.nome,
        construtor: e.obra.usuario?.nome ?? "—",
        creditoStatus: e.obra.credito?.status ?? "—",
        valorAprovado: Number(e.obra.credito?.valorAprovado ?? 0),
        aprovadoPorEngenheiro: e.auditLogs[0]?.usuario?.nome ?? "—",
        aprovadoEm: e.auditLogs[0]?.criadoEm ?? e.atualizadoEm,
        totalEvidencias: e.evidencias.length,
        evidencias: e.evidencias,
      })),
      total,
    };
  }

  async validarEtapa(adminId: string, etapaId: string, observacoes?: string) {
    const etapa = await this.prisma.etapaObra.findUnique({
      where: { etapaId },
      include: { obra: { include: { credito: true, usuario: true } } },
    });
    if (!etapa) throw new NotFoundException("Etapa não encontrada.");

    const updated = await this.prisma.etapaObra.updateMany({
      where: { etapaId, status: "APROVADA_ENGENHEIRO" },
      data: { status: "CONCLUIDA", dataConclusaoReal: new Date() },
    });
    if (updated.count === 0) {
      throw new BadRequestException("Etapa não está aguardando validação do admin.");
    }

    await this.prisma.etapaAuditLog.create({
      data: { etapaId, acaoTipo: "VALIDADA_ADMIN", usuarioId: adminId, observacoes: observacoes ?? null },
    });

    // Notify construtor
    await this.notificacoes.criar(
      etapa.obra.usuarioId,
      "ETAPA_APROVADA",
      `Etapa aprovada: ${etapa.nome}`,
      `A etapa "${etapa.nome}" da obra "${etapa.obra.nome}" foi validada e a parcela será liberada em breve.`,
      `/dashboard/obras/${etapa.obra.obraId}`,
    );

    this.pushNotificacoes
      .enviarPush({
        usuarioId: etapa.obra.usuarioId,
        titulo: `Etapa Aprovada: ${etapa.nome}`,
        mensagem: "Sua etapa foi validada e a parcela será liberada em breve.",
        tipo: "ETAPA_APROVADA",
        dados: { obraId: etapa.obra.obraId, etapaId },
      })
      .catch(() => {});

    const credito = etapa.obra.credito;
    if (credito) {
      const valorLiberacao =
        Number(credito.valorAprovado ?? 0) * (Number(etapa.percentualObra) / 100);

      this.email
        .etapaAprovadaEmail(
          etapa.obra.usuario?.nome ?? "usuário",
          etapa.obra.usuario?.email ?? "",
          etapa.nome,
          etapa.obra.nome,
          valorLiberacao,
        )
        .catch(() => {});

      if (credito.status === "ATIVO" && valorLiberacao > 0) {
        const liberacao = await this.prisma.liberacaoParcela.create({
          data: { creditoId: credito.creditoId, valor: valorLiberacao, status: "PENDENTE" },
        });
        await this.liberacaoQueue.add({
          creditoId: credito.creditoId,
          etapaId,
          liberacaoId: liberacao.liberacaoId,
          valor: valorLiberacao,
        });
      } else {
        await this.prisma.etapaAuditLog.create({
          data: {
            etapaId,
            acaoTipo: "LIBERACAO_BLOQUEADA",
            usuarioId: adminId,
            observacoes: `Parcela não enfileirada: crédito status=${credito.status}, valorLiberacao=${valorLiberacao}`,
          },
        });
      }
    }

    return { ok: true, etapaId, status: "CONCLUIDA" };
  }

  async rejeitarEtapaAdmin(adminId: string, etapaId: string, motivo: string) {
    const etapa = await this.prisma.etapaObra.findUnique({
      where: { etapaId },
      include: { obra: { include: { usuario: true } } },
    });
    if (!etapa) throw new NotFoundException("Etapa não encontrada.");

    const updated = await this.prisma.etapaObra.updateMany({
      where: { etapaId, status: "APROVADA_ENGENHEIRO" },
      data: { status: "REPROVADA" },
    });
    if (updated.count === 0) {
      throw new BadRequestException("Etapa não está aguardando validação do admin.");
    }

    await this.prisma.etapaAuditLog.create({
      data: { etapaId, acaoTipo: "REJEITADA_ADMIN", usuarioId: adminId, observacoes: motivo },
    });

    await this.notificacoes.criar(
      etapa.obra.usuarioId,
      "ETAPA_REPROVADA",
      `Etapa reprovada: ${etapa.nome}`,
      `A etapa "${etapa.nome}" foi reprovada pelo comitê. Motivo: ${motivo}`,
      `/dashboard/obras/${etapa.obra.obraId}`,
    );

    return { ok: true, etapaId, status: "REPROVADA" };
  }

  // ── Configurações do Sistema ──────────────────────────────────────

  async getConfiguracoes() {
    const cfg = await this.prisma.configuracaoSistema.upsert({
      where: { id: "singleton" },
      create: { id: "singleton" },
      update: {},
    });
    return cfg;
  }

  async updateConfiguracoes(body: {
    taxaMensalMin?: number;
    taxaMensalMax?: number;
    taxaPadrao?: number;
    valorMinCredito?: number;
    valorMaxCredito?: number;
    prazoMaxMeses?: number;
    raioValidacaoMetrosPadrao?: number;
    toleranciaPrecisaoGps?: number;
    diasAprovacao?: number;
    limiteEvidenciasMB?: number;
    modoManutencao?: boolean;
  }) {
    const cfg = await this.prisma.configuracaoSistema.upsert({
      where: { id: "singleton" },
      create: { id: "singleton", ...body },
      update: body,
    });
    return cfg;
  }

  // ── Capital do Fundo ──────────────────────────────────────────────

  async getCapitalFundo() {
    const cap = await this.prisma.capitalFundo.upsert({
      where: { id: "singleton" },
      create: { id: "singleton" },
      update: {},
    });
    return cap;
  }

  async updateCapitalFundo(capitalDisponivel: number) {
    const cap = await this.prisma.capitalFundo.upsert({
      where: { id: "singleton" },
      create: { id: "singleton", capitalDisponivel },
      update: { capitalDisponivel },
    });
    return cap;
  }

  // ── Iniciar Comitê (Admin) ─────────────────────────────────────────

  async iniciarComite(solicitacaoId: string, adminId: string) {
    const solicitacao = await this.prisma.solicitacaoCredito.findUnique({
      where: { solicitacaoId },
      include: { comite: true, usuario: true },
    });

    if (!solicitacao) throw new NotFoundException("Solicitação não encontrada.");
    if (solicitacao.comite) throw new BadRequestException("Esta solicitação já possui um comitê aberto.");

    const comite = await this.prisma.comiteDigital.create({
      data: { solicitacaoId },
    });

    await this.prisma.solicitacaoCredito.update({
      where: { solicitacaoId },
      data: { status: "EM_COMITE" },
    });

    // Notificar gestores e admins
    const admins = await this.prisma.usuario.findMany({
      where: { tipo: { in: ["ADMIN", "GESTOR"] }, deletadoEm: null },
      select: { usuarioId: true },
    });

    await Promise.allSettled(
      admins
        .filter(u => u.usuarioId !== adminId)
        .map(u => this.notificacoes.criar(
          u.usuarioId,
          "COMITE_ABERTO",
          "Novo comitê iniciado",
          `Um comitê foi aberto para solicitação #${solicitacaoId.slice(0, 8)}. Aguardando votação.`,
          `/dashboard/admin/comite`,
        ))
    );

    return { ok: true, comiteId: comite.comiteId };
  }

  // ── Listar Solicitações (Admin) ────────────────────────────────────

  async listarSolicitacoes(status?: string, semComite?: boolean) {
    const solicitacoes = await this.prisma.solicitacaoCredito.findMany({
      where: {
        ...(status ? { status: status as SolicitacaoStatus } : {}),
        ...(semComite ? { comite: null } : {}),
      },
      include: {
        usuario: { select: { nome: true, email: true } },
        comite: { select: { comiteId: true, status: true } },
      },
      orderBy: { criadoEm: "desc" },
      take: 50,
    });
    return solicitacoes;
  }
}

import { Injectable, NotFoundException, BadRequestException, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { NotificacoesService } from "../notificacoes/notificacoes.service";
import { EmailQueueService } from "../email/email-queue.service";
import type { VotoDecisao, SolicitacaoStatus, ComiteStatus } from "@prisma/client";

@Injectable()
export class ComiteService {
  private readonly logger = new Logger(ComiteService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificacoes: NotificacoesService,
    private readonly emailQueue: EmailQueueService,
  ) {}

  // ── Construtor: submeter solicitação ──────────────────────────────

  async submeterSolicitacao(usuarioId: string, body: {
    valorSolicitado: number;
    prazoMeses: number;
    taxaMensal: number;
    finalidade: string;
    garantias?: string;
    observacoes?: string;
    obraId?: string;
    vgv?: number;
    custoObra?: number;
    ltv?: number;
  }) {
    if (body.obraId) {
      const obra = await this.prisma.obra.findUnique({ where: { obraId: body.obraId } });
      if (!obra) throw new NotFoundException("Obra não encontrada.");
      if (obra.usuarioId !== usuarioId) throw new NotFoundException("Obra não encontrada.");
    }

    const rating = this.calcularRating(body.ltv ?? 0);

    const solicitacao = await this.prisma.solicitacaoCredito.create({
      data: {
        usuarioId,
        obraId: body.obraId ?? null,
        valorSolicitado: body.valorSolicitado,
        prazoMeses: body.prazoMeses,
        taxaMensal: body.taxaMensal,
        finalidade: body.finalidade,
        garantias: body.garantias ?? null,
        observacoes: body.observacoes ?? null,
        vgv: body.vgv ?? null,
        custoObra: body.custoObra ?? null,
        ltv: body.ltv ?? null,
        ratingCalculado: rating,
        status: "PENDENTE",
      },
      include: { usuario: { select: { nome: true, email: true } } },
    });

    // Auto-open committee
    await this.prisma.comiteDigital.create({
      data: { solicitacaoId: solicitacao.solicitacaoId, status: "ABERTO" },
    });

    await this.prisma.solicitacaoCredito.update({
      where: { solicitacaoId: solicitacao.solicitacaoId },
      data: { status: "EM_COMITE" },
    });

    return solicitacao;
  }

  // ── Construtor: minhas solicitações ──────────────────────────────

  async minhasSolicitacoes(usuarioId: string) {
    return this.prisma.solicitacaoCredito.findMany({
      where: { usuarioId },
      orderBy: { criadoEm: "desc" },
      include: {
        comite: { include: { votos: { include: { votante: { select: { nome: true, tipo: true } } } } } },
      },
    });
  }

  // ── Engenheiro: submeter parecer ─────────────────────────────────

  async submeterParecer(comiteId: string, engId: string, parecerTecnico: string) {
    const comite = await this.prisma.comiteDigital.findUnique({ where: { comiteId } });
    if (!comite) throw new NotFoundException("Comitê não encontrado");
    if (comite.status === "ENCERRADO") throw new BadRequestException("Comitê já encerrado");
    if (comite.parecerTecnico) throw new BadRequestException("Parecer já registrado");

    return this.prisma.comiteDigital.update({
      where: { comiteId },
      data: {
        parecerTecnico,
        parecerEngId: engId,
        parecerEm: new Date(),
        status: "EM_VOTACAO",
      },
    });
  }

  // ── Admin: votar ─────────────────────────────────────────────────

  async votar(comiteId: string, votanteId: string, voto: VotoDecisao, justificativa?: string, condicoes?: string) {
    const comite = await this.prisma.comiteDigital.findUnique({
      where: { comiteId },
      include: { votos: true },
    });
    if (!comite) throw new NotFoundException("Comitê não encontrado");
    if (comite.status === "ENCERRADO") throw new BadRequestException("Comitê já encerrado");

    const jaVotou = comite.votos.some((v) => v.votanteId === votanteId);
    if (jaVotou) throw new BadRequestException("Você já registrou seu voto neste comitê");

    await this.prisma.votoComite.create({
      data: { comiteId, votanteId, voto, justificativa: justificativa ?? null, condicoes: condicoes ?? null },
    });

    // Auto-close: majority of admins voted → resolve
    const todosVotos = await this.prisma.votoComite.findMany({ where: { comiteId } });
    const adminCount = await this.prisma.usuario.count({ where: { tipo: "ADMIN", bloqueadoEm: null } });
    const quorum = Math.ceil(Math.max(1, adminCount) / 2);

    if (todosVotos.length >= quorum) {
      await this.encerrarComite(comiteId, todosVotos);
    }

    return { ok: true, totalVotos: todosVotos.length, quorum };
  }

  private async encerrarComite(comiteId: string, votos: { voto: VotoDecisao }[]) {
    const contagem = { APROVAR: 0, AJUSTAR: 0, REPROVAR: 0 };
    for (const v of votos) contagem[v.voto]++;

    let decisao: "APROVADO" | "AJUSTADO" | "REPROVADO" = "REPROVADO";
    if (contagem.APROVAR > contagem.AJUSTAR && contagem.APROVAR > contagem.REPROVAR) decisao = "APROVADO";
    else if (contagem.AJUSTAR > contagem.REPROVAR) decisao = "AJUSTADO";

    const comite = await this.prisma.comiteDigital.update({
      where: { comiteId },
      data: { status: "ENCERRADO", decisao, decisaoEm: new Date() },
      include: {
        solicitacao: {
          include: { usuario: { select: { usuarioId: true, nome: true, email: true } } },
        },
      },
    });

    const novoStatus: SolicitacaoStatus = decisao === "APROVADO" ? "APROVADA" : decisao === "AJUSTADO" ? "AJUSTADA" : "REPROVADA";
    await this.prisma.solicitacaoCredito.update({
      where: { solicitacaoId: comite.solicitacaoId },
      data: { status: novoStatus },
    });

    const s = comite.solicitacao;
    const usuario = s.usuario;

    // If approved → create Credito and link to obra atomically
    if (decisao === "APROVADO") {
      await this.prisma.$transaction(async (tx) => {
        const credito = await tx.credito.create({
          data: {
            usuarioId: s.usuarioId,
            valorAprovado: s.valorSolicitado,
            valorLiberado: 0,
            taxaMensal: s.taxaMensal,
            prazoMeses: s.prazoMeses,
            status: "ATIVO",
            dataVencimento: new Date(Date.now() + s.prazoMeses * 30 * 24 * 60 * 60 * 1000),
          },
        });
        if (s.obraId) {
          await tx.obra.update({
            where: { obraId: s.obraId },
            data: { creditoId: credito.creditoId },
          });
        }
      });
    }

    // Notify applicant about committee decision
    const textoDecisao =
      decisao === "APROVADO" ? "aprovado" : decisao === "AJUSTADO" ? "aprovado com ajustes" : "reprovado";
    await this.notificacoes.criar(
      s.usuarioId,
      decisao === "APROVADO" ? "CREDITO_APROVADO" : "COMITE_DECISAO",
      `Crédito ${textoDecisao}`,
      `Sua solicitação de crédito de R$ ${Number(s.valorSolicitado).toLocaleString("pt-BR")} foi ${textoDecisao} pelo comitê.`,
    ).catch((e) => this.logger.warn("Falha ao criar notificação de decisão do comitê", e));

    if (usuario) {
      const valorFormatado = Number(s.valorSolicitado).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
      await this.emailQueue.etapaAprovada(
        usuario.nome,
        usuario.email,
        `Decisão do Comitê: ${textoDecisao.toUpperCase()}`,
        `Solicitação de crédito ${valorFormatado}`,
        Number(s.valorSolicitado),
      ).catch((e) => this.logger.warn("Falha ao enviar email de decisão do comitê", e));
    }
  }

  // ── Leitura: dossiê completo ─────────────────────────────────────

  async getDossie(comiteId: string) {
    const comite = await this.prisma.comiteDigital.findUnique({
      where: { comiteId },
      include: {
        solicitacao: {
          include: {
            usuario: {
              select: {
                usuarioId: true, nome: true, email: true, telefone: true,
                kycStatus: true, tipo: true, criadoEm: true,
              },
            },
          },
        },
        votos: { include: { votante: { select: { nome: true, tipo: true } } } },
      },
    });
    if (!comite) throw new NotFoundException("Comitê não encontrado");
    return comite;
  }

  async listarComites(filtroStatus?: string) {
    return this.prisma.comiteDigital.findMany({
      where: filtroStatus ? { status: filtroStatus as ComiteStatus } : undefined,
      orderBy: { criadoEm: "desc" },
      include: {
        solicitacao: {
          include: { usuario: { select: { nome: true, email: true } } },
        },
        votos: {
          include: { votante: { select: { nome: true, tipo: true } } },
          orderBy: { criadoEm: "asc" },
        },
      },
    });
  }

  // ── Rating simples A/B/C/D ────────────────────────────────────────

  private calcularRating(ltv: number): string {
    if (ltv <= 50) return "A";
    if (ltv <= 65) return "B";
    if (ltv <= 75) return "C";
    return "D";
  }
}

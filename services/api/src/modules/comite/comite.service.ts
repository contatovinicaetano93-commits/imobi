import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { NotificacoesService } from "../notificacoes/notificacoes.service";
import { EmailService } from "../email/email.service";
import type { VotoDecisao, SolicitacaoStatus, ComiteStatus } from "@prisma/client";
import type { ComiteSolicitarInput } from "@imbobi/schemas";

@Injectable()
export class ComiteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificacoes: NotificacoesService,
    private readonly email: EmailService,
  ) {}

  // ── Construtor: submeter solicitação ──────────────────────────────

  async submeterSolicitacao(usuarioId: string, body: ComiteSolicitarInput) {
    const rating = this.calcularRating(body.ltv ?? 0);

    return this.prisma.$transaction(async (tx) => {
      const solicitacao = await tx.solicitacaoCredito.create({
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
          status: "EM_COMITE",
        },
        include: { usuario: { select: { nome: true, email: true } } },
      });

      await tx.comiteDigital.create({
        data: { solicitacaoId: solicitacao.solicitacaoId, status: "ABERTO" },
      });

      return solicitacao;
    });
  }

  // ── Construtor: minhas solicitações ──────────────────────────────

  async minhasSolicitacoes(usuarioId: string) {
    return this.prisma.solicitacaoCredito.findMany({
      where: { usuarioId },
      orderBy: { criadoEm: "desc" },
      take: 20,
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
    const [todosVotos, adminCount] = await Promise.all([
      this.prisma.votoComite.findMany({ where: { comiteId } }),
      this.prisma.usuario.count({ where: { tipo: "ADMIN", bloqueadoEm: null } }),
    ]);
    const quorum = Math.ceil(adminCount / 2);

    if (todosVotos.length >= quorum) {
      await this.encerrarComite(comiteId, todosVotos);
    }

    return { ok: true, totalVotos: todosVotos.length, quorum };
  }

  private async encerrarComite(comiteId: string, votos: { voto: VotoDecisao }[]) {
    const contagem = { APROVAR: 0, AJUSTAR: 0, REPROVAR: 0 };
    for (const v of votos) contagem[v.voto]++;

    let decisao: "APROVADO" | "AJUSTADO" | "REPROVADO" = "REPROVADO";
    if (contagem.APROVAR >= contagem.AJUSTAR && contagem.APROVAR >= contagem.REPROVAR) decisao = "APROVADO";
    else if (contagem.AJUSTAR >= contagem.REPROVAR) decisao = "AJUSTADO";

    const comite = await this.prisma.comiteDigital.update({
      where: { comiteId },
      data: { status: "ENCERRADO", decisao, decisaoEm: new Date() },
      include: {
        solicitacao: {
          include: { usuario: { select: { nome: true, email: true } } },
        },
      },
    });

    const novoStatus: SolicitacaoStatus = decisao === "APROVADO" ? "APROVADA" : decisao === "AJUSTADO" ? "AJUSTADA" : "REPROVADA";
    await this.prisma.solicitacaoCredito.update({
      where: { solicitacaoId: comite.solicitacaoId },
      data: { status: novoStatus },
    });

    const s = comite.solicitacao;
    const { nome, email: emailAddr } = s.usuario;

    void this.email.comiteDecisaoEmail(nome, emailAddr, decisao, Number(s.valorSolicitado));

    if (decisao === "APROVADO") {
      const novoCredito = await this.prisma.credito.create({
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
        await this.prisma.obra.update({
          where: { obraId: s.obraId },
          data: { creditoId: novoCredito.creditoId },
        });
      }

      await this.notificacoes.criar(
        s.usuarioId,
        "CREDITO_APROVADO",
        "Crédito aprovado pelo comitê",
        `Sua solicitação de R$ ${Number(s.valorSolicitado).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} foi aprovada.`,
        "/dashboard/credito",
      );
    } else {
      await this.notificacoes.criar(
        s.usuarioId,
        "COMITE_DECISAO",
        decisao === "AJUSTADO" ? "Solicitação requer ajustes" : "Solicitação reprovada",
        decisao === "AJUSTADO"
          ? "O comitê solicitou ajustes na sua proposta. Entre em contato com seu gestor."
          : "Sua solicitação de crédito foi reprovada pelo comitê.",
        "/dashboard/credito",
      );
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
      take: 100,
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

  // ── Encerramento manual ───────────────────────────────────────────

  async encerrarManualmente(
    comiteId: string,
    decisao: "APROVADO" | "AJUSTADO" | "REPROVADO",
    motivo?: string,
  ) {
    const comite = await this.prisma.comiteDigital.findUnique({ where: { comiteId } });
    if (!comite) throw new NotFoundException("Comitê não encontrado");
    if (comite.status === "ENCERRADO") throw new BadRequestException("Comitê já encerrado");

    await this.prisma.comiteDigital.update({
      where: { comiteId },
      data: { decisaoMotivo: motivo ?? null },
    });

    const votosSimulados: { voto: "APROVAR" | "AJUSTAR" | "REPROVAR" }[] = decisao === "APROVADO"
      ? [{ voto: "APROVAR" }, { voto: "APROVAR" }]
      : decisao === "AJUSTADO"
        ? [{ voto: "AJUSTAR" }, { voto: "AJUSTAR" }]
        : [{ voto: "REPROVAR" }, { voto: "REPROVAR" }];

    await this.encerrarComite(comiteId, votosSimulados);
    return { ok: true, decisao };
  }

  // ── Rating simples A/B/C/D ────────────────────────────────────────

  private calcularRating(ltv: number): string {
    if (ltv <= 50) return "A";
    if (ltv <= 65) return "B";
    if (ltv <= 75) return "C";
    return "D";
  }
}

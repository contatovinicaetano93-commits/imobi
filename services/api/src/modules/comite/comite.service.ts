import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { NotificacoesService } from "../notificacoes/notificacoes.service";
import { EmailService } from "../email/email.service";
import type { VotoDecisao, SolicitacaoStatus, ComiteStatus } from "@prisma/client";
import type { ComiteSolicitarInput } from "@imbobi/schemas";
import { addMonths } from "../../common/utils/date.util";

@Injectable()
export class ComiteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificacoes: NotificacoesService,
    private readonly email: EmailService,
  ) {}

  // ── Construtor: submeter solicitação ──────────────────────────────

  private get taxaMensalDefault(): number {
    return Number(process.env.TAXA_MENSAL_DEFAULT ?? "0.0099");
  }

  async submeterSolicitacao(usuarioId: string, body: ComiteSolicitarInput) {
    const rating = this.calcularRating(body.ltv ?? 0);

    return this.prisma.$transaction(async (tx) => {
      const solicitacao = await tx.solicitacaoCredito.create({
        data: {
          usuarioId,
          obraId: body.obraId ?? null,
          valorSolicitado: body.valorSolicitado,
          prazoMeses: body.prazoMeses,
          taxaMensal: this.taxaMensalDefault,
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

    await this._fecharComite(comiteId, decisao);
  }

  /** Applies a committee decision: persists the outcome and triggers downstream effects. */
  private async _fecharComite(
    comiteId: string,
    decisao: "APROVADO" | "AJUSTADO" | "REPROVADO",
    motivo?: string,
  ) {
    const novoStatus: SolicitacaoStatus = decisao === "APROVADO" ? "APROVADA" : decisao === "AJUSTADO" ? "AJUSTADA" : "REPROVADA";

    // Both writes are atomic — torn state (comite=ENCERRADO but solicitacao still EM_COMITE)
    // would leave the system inconsistent if the process crashes between them.
    const comite = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.comiteDigital.update({
        where: { comiteId },
        data: { status: "ENCERRADO", decisao, decisaoEm: new Date(), decisaoMotivo: motivo ?? null },
        include: {
          solicitacao: {
            include: { usuario: { select: { nome: true, email: true, kycStatus: true } } },
          },
        },
      });
      await tx.solicitacaoCredito.update({
        where: { solicitacaoId: updated.solicitacaoId },
        data: { status: novoStatus },
      });
      return updated;
    });

    const s = comite.solicitacao;
    const { nome, email: emailAddr } = s.usuario;

    void this.email.comiteDecisaoEmail(nome, emailAddr, decisao, Number(s.valorSolicitado));

    if (decisao === "APROVADO") {
      // KYC must be fully approved before a credit contract is issued (fintech compliance).
      // The committee decision is recorded as APROVADA, but the Credito object is only
      // created once KYC is complete — the user is notified to finish verification.
      if (s.usuario.kycStatus !== "APROVADO") {
        await this.notificacoes.criar(
          s.usuarioId,
          "CREDITO_APROVADO",
          "Crédito aprovado — KYC pendente",
          `Sua solicitação de R$ ${Number(s.valorSolicitado).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} foi aprovada pelo comitê, mas a liberação está sujeita à conclusão da verificação de identidade (KYC). Acesse o app para finalizar.`,
          "/dashboard/kyc",
        );
        return;
      }

      const novoCredito = await this.prisma.$transaction(async (tx) => {
        // Advisory lock prevents concurrent calls (e.g. retry + webhook) from issuing a second Credito
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`emitir_credito:${comite.solicitacaoId}`}))`;

        // Re-check inside the lock — another concurrent call may have already emitted
        const sol = await tx.solicitacaoCredito.findUnique({
          where: { solicitacaoId: comite.solicitacaoId },
          select: { creditoEmitido: true },
        });
        if (sol?.creditoEmitido) return null;

        const dataVencimento = addMonths(new Date(), s.prazoMeses);

        const credito = await tx.credito.create({
          data: {
            usuarioId: s.usuarioId,
            valorAprovado: s.valorSolicitado,
            valorLiberado: 0,
            taxaMensal: this.taxaMensalDefault,
            prazoMeses: s.prazoMeses,
            status: "ATIVO",
            dataVencimento,
          },
        });

        await tx.solicitacaoCredito.update({
          where: { solicitacaoId: comite.solicitacaoId },
          data: { creditoEmitido: true },
        });

        if (s.obraId) {
          await tx.obra.update({
            where: { obraId: s.obraId },
            data: { creditoId: credito.creditoId },
          });
        }

        return credito;
      });

      if (!novoCredito) return;

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
    if (motivo && motivo.length > 1000) throw new BadRequestException("Motivo não pode exceder 1000 caracteres.");

    // decisaoMotivo is written inside _fecharComite in the same update as status/decisao,
    // so a partial failure cannot leave the motivo persisted without a final decision.
    await this._fecharComite(comiteId, decisao, motivo);
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

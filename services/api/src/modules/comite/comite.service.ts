import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { VotoDecisao, SolicitacaoStatus, ComiteStatus } from "@prisma/client";
import { FluxoService } from "../fluxo/fluxo.service";
import { NotificacoesService } from "../notificacoes/notificacoes.service";
import { EmailService } from "../email/email.service";

@Injectable()
export class ComiteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fluxo: FluxoService,
    private readonly notificacoes: NotificacoesService,
    private readonly email: EmailService,
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
    await this.fluxo.assertPodeSolicitarComite(usuarioId, body.obraId);
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

    await this.prisma.comiteDigital.create({
      data: { solicitacaoId: solicitacao.solicitacaoId, status: "ABERTO" },
    });

    await this.prisma.solicitacaoCredito.update({
      where: { solicitacaoId: solicitacao.solicitacaoId },
      data: { status: "EM_COMITE" },
    });

    return solicitacao;
  }

  async minhasSolicitacoes(usuarioId: string) {
    return this.prisma.solicitacaoCredito.findMany({
      where: { usuarioId },
      orderBy: { criadoEm: "desc" },
      include: {
        comite: { include: { votos: { include: { votante: { select: { nome: true, tipo: true } } } } } },
      },
    });
  }

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

    const todosVotos = await this.prisma.votoComite.findMany({ where: { comiteId } });
    const adminCount = await this.prisma.usuario.count({ where: { tipo: "ADMIN", bloqueadoEm: null } });
    const quorum = Math.max(1, Math.ceil(adminCount / 2));

    if (todosVotos.length >= quorum) {
      await this.encerrarComite(comiteId, todosVotos);
    }

    return { ok: true, totalVotos: todosVotos.length, quorum };
  }

  private async encerrarComite(
    comiteId: string,
    votos: { voto: VotoDecisao; condicoes?: string | null }[],
  ) {
    const contagem = { APROVAR: 0, AJUSTAR: 0, REPROVAR: 0 };
    for (const v of votos) contagem[v.voto]++;

    let decisao: "APROVADO" | "AJUSTADO" | "REPROVADO" = "REPROVADO";
    if (contagem.APROVAR >= contagem.AJUSTAR && contagem.APROVAR >= contagem.REPROVAR) decisao = "APROVADO";
    else if (contagem.AJUSTAR >= contagem.REPROVAR) decisao = "AJUSTADO";

    const comite = await this.prisma.comiteDigital.update({
      where: { comiteId },
      data: { status: "ENCERRADO", decisao, decisaoEm: new Date() },
      include: { solicitacao: { include: { usuario: true } } },
    });

    const novoStatus: SolicitacaoStatus =
      decisao === "APROVADO" ? "APROVADA" : decisao === "AJUSTADO" ? "AJUSTADA" : "REPROVADA";
    await this.prisma.solicitacaoCredito.update({
      where: { solicitacaoId: comite.solicitacaoId },
      data: { status: novoStatus },
    });

    if (decisao === "APROVADO" || decisao === "AJUSTADO") {
      const s = comite.solicitacao;
      let taxaMensal = s.taxaMensal;
      if (decisao === "AJUSTADO") {
        const ajuste = votos.find((v) => v.voto === "AJUSTAR" && v.condicoes);
        const match = ajuste?.condicoes?.match(/taxa[:=]([\d.]+)/i);
        if (match) taxaMensal = parseFloat(match[1]);
      }

      const credito = await this.prisma.credito.create({
        data: {
          usuarioId: s.usuarioId,
          valorAprovado: s.valorSolicitado,
          valorLiberado: 0,
          taxaMensal,
          prazoMeses: s.prazoMeses,
          status: "ATIVO",
          dataVencimento: new Date(Date.now() + s.prazoMeses * 30 * 24 * 60 * 60 * 1000),
        },
      });

      if (s.obraId) {
        await this.prisma.obra.update({
          where: { obraId: s.obraId },
          data: { creditoId: credito.creditoId },
        });
      }
    }

    const usuario = comite.solicitacao.usuario;
    const titulo =
      decisao === "APROVADO" ? "Crédito aprovado" :
      decisao === "AJUSTADO" ? "Crédito aprovado com ajustes" :
      "Solicitação reprovada";

    await this.notificacoes.criar(
      usuario.usuarioId,
      "COMITE_DECISAO",
      titulo,
      `Sua solicitação de crédito foi ${decisao.toLowerCase()}.`,
      "/dashboard/comite",
    );

    this.email.enviarEmail({
      to: usuario.email,
      subject: `Imobi — ${titulo}`,
      html: `<p>Olá ${usuario.nome},</p><p>Sua solicitação de crédito foi <strong>${decisao}</strong>.</p>`,
    }).catch(() => null);
  }

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

  private calcularRating(ltv: number): string {
    if (ltv <= 50) return "A";
    if (ltv <= 65) return "B";
    if (ltv <= 75) return "C";
    return "D";
  }
}

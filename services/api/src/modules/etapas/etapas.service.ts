import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import type { EtapaStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { NotificacoesService } from "../notificacoes/notificacoes.service";
import { EmailService } from "../email/email.service";
import { PushNotificacoesService } from "../push-notificacoes/push-notificacoes.service";
import {
  buildCapitalFaseWhatsAppMessage,
  buildFinanceiroWhatsAppUrl,
} from "../../common/constants/financeiro";

@Injectable()
export class EtapasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificacoes: NotificacoesService,
    private readonly email: EmailService,
    private readonly pushNotificacoes: PushNotificacoesService,
  ) {}

  /** Aprovação técnica (engenheiro) — dispara liberação financeira manual. */
  async aprovar(aprovadorId: string, etapaId: string, observacao?: string) {
    const etapa = await this.prisma.etapaObra.findUnique({
      where: { etapaId },
      include: { obra: { include: { credito: true, usuario: true } } },
    });
    if (!etapa) throw new NotFoundException("Etapa não encontrada.");

    if (etapa.obra.status !== "EM_EXECUCAO") {
      throw new BadRequestException(
        "Obra ainda não está no pipe ativo. Aguarde homologação do Admin.",
      );
    }

    const evidencias = await this.prisma.evidenciaEtapa.count({
      where: { etapaId },
    });
    if (evidencias === 0) {
      throw new BadRequestException("Etapa precisa ter ao menos uma evidência fotográfica.");
    }

    const updated = await this.prisma.etapaObra.updateMany({
      where: { etapaId, status: "AGUARDANDO_VISTORIA" },
      data: { status: "CONCLUIDA", dataConclusaoReal: new Date() },
    });
    if (updated.count === 0) {
      throw new BadRequestException("Etapa não está aguardando vistoria.");
    }

    await this.prisma.etapaAuditLog.create({
      data: {
        etapaId,
        acaoTipo: "APROVADA",
        usuarioId: aprovadorId,
        observacoes: observacao || null,
      },
    });

    const credito = etapa.obra.credito;
    const valorLiberacao = credito
      ? Number(credito.valorAprovado) * (Number(etapa.percentualObra) / 100)
      : Number(etapa.valorLiberacao) || 0;

    const valorFmt = new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(valorLiberacao);

    let liberacaoId: string | null = null;

    if (credito && credito.status === "ATIVO" && valorLiberacao > 0) {
      const liberacao = await this.prisma.liberacaoParcela.create({
        data: {
          creditoId: credito.creditoId,
          etapaId,
          valor: valorLiberacao,
          status: "AGUARDANDO_PAGAMENTO",
        },
      });
      liberacaoId = liberacao.liberacaoId;
    }

    const whatsMsg = buildCapitalFaseWhatsAppMessage({
      obraNome: etapa.obra.nome,
      etapaNome: etapa.nome,
      valorFormatado: valorFmt,
      liberacaoId: liberacaoId ?? etapaId,
      tomadorNome: etapa.obra.usuario?.nome ?? "Tomador",
    });
    const whatsUrl = buildFinanceiroWhatsAppUrl(whatsMsg);

    const notifCorpo = [
      `Capital da fase "${etapa.nome}" aprovado tecnicamente (${valorFmt}).`,
      "O financeiro IMOBI processará o pagamento na conta cadastrada.",
      `Confirme pelo WhatsApp: ${whatsUrl}`,
    ].join(" ");

    await this.notificacoes.criar(
      etapa.obra.usuarioId,
      "PARCELA_LIBERADA",
      `Capital fase liberado: ${etapa.nome}`,
      notifCorpo,
      `/dashboard/obras/${etapa.obra.obraId}`,
    );

    this.pushNotificacoes
      .enviarPush({
        usuarioId: etapa.obra.usuarioId,
        titulo: `Capital fase ${etapa.nome} liberado`,
        mensagem: `${valorFmt} — aguardando pagamento. Fale com o financeiro pelo WhatsApp.`,
        tipo: "PARCELA_LIBERADA",
        dados: {
          obraId: etapa.obra.obraId,
          etapaId,
          liberacaoId: liberacaoId ?? "",
          whatsAppUrl: whatsUrl,
        },
      })
      .catch(() => {});

    if (etapa.obra.usuario?.email) {
      this.email
        .capitalFaseAguardandoPagamentoEmail({
          nome: etapa.obra.usuario.nome,
          email: etapa.obra.usuario.email,
          obraNome: etapa.obra.nome,
          etapaNome: etapa.nome,
          valor: valorLiberacao,
          whatsAppUrl: whatsUrl,
          liberacaoRef: liberacaoId?.slice(0, 8).toUpperCase() ?? "",
        })
        .catch(() => {});
    }

    return {
      ok: true,
      observacao,
      liberacaoId,
      valorLiberacao,
      whatsAppUrl: whatsUrl,
      aguardandoPagamento: !!liberacaoId,
    };
  }

  async rejeitar(aprovadorId: string, etapaId: string, motivo: string) {
    const etapa = await this.prisma.etapaObra.findUnique({
      where: { etapaId },
      include: { obra: { include: { usuario: true } } },
    });
    if (!etapa) throw new NotFoundException("Etapa não encontrada.");

    const updated = await this.prisma.etapaObra.updateMany({
      where: { etapaId, status: "AGUARDANDO_VISTORIA" },
      data: { status: "REPROVADA" },
    });
    if (updated.count === 0) {
      throw new BadRequestException("Etapa não está aguardando vistoria.");
    }

    await this.prisma.etapaAuditLog.create({
      data: {
        etapaId,
        acaoTipo: "REJEITADA",
        usuarioId: aprovadorId,
        observacoes: motivo,
      },
    });

    await this.notificacoes.criar(
      etapa.obra.usuarioId,
      "ETAPA_REPROVADA",
      `Etapa reprovada: ${etapa.nome}`,
      `A etapa "${etapa.nome}" foi reprovada na vistoria. Motivo: ${motivo}`,
      `/dashboard/obras/${etapa.obra.obraId}`,
    );

    return { ok: true, motivo };
  }

  async atualizarStatus(etapaId: string, status: string, usuarioId: string, userTipo: string) {
    const etapaExistente = await this.prisma.etapaObra.findUnique({
      where: { etapaId },
      include: { obra: true },
    });
    if (!etapaExistente) throw new NotFoundException("Etapa não encontrada.");

    const normalizedTipo = userTipo === "GESTOR_FUNDO" ? "GESTOR" : userTipo;
    const isPrivileged = ["GESTOR", "ADMIN", "ENGENHEIRO"].includes(normalizedTipo);
    if (!isPrivileged) {
      if (etapaExistente.obra.usuarioId !== usuarioId) throw new ForbiddenException("Acesso negado.");
      if (status !== "AGUARDANDO_VISTORIA") {
        throw new ForbiddenException("Você só pode submeter a etapa para vistoria.");
      }
      if (etapaExistente.obra.status !== "EM_EXECUCAO") {
        throw new BadRequestException("Obra aguardando homologação do Admin IMOBI.");
      }
    }

    return this.prisma.etapaObra.update({
      where: { etapaId },
      data: { status: status as EtapaStatus },
    });
  }

  async listarPorObra(obraId: string, usuarioId: string, tipo: string) {
    const isStaff = ["ADMIN", "GESTOR", "ENGENHEIRO", "GESTOR_OBRA"].includes(tipo);
    if (!isStaff) {
      const obra = await this.prisma.obra.findUnique({ where: { obraId }, select: { usuarioId: true } });
      if (!obra) throw new NotFoundException("Obra não encontrada.");
      if (obra.usuarioId !== usuarioId) throw new ForbiddenException("Acesso negado.");
    }
    return this.prisma.etapaObra.findMany({
      where: { obraId },
      orderBy: { ordem: "asc" },
      include: {
        evidencias: {
          select: { evidenciaId: true, fotoUrl: true, validada: true, criadoEm: true },
          orderBy: { criadoEm: "desc" },
          take: 5,
        },
      },
    });
  }
}

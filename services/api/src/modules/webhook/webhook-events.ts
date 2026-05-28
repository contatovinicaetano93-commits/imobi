/**
 * Helpers para disparar eventos de webhook
 * Importe este arquivo nos serviços para integrar webhooks
 */

import { Injectable, Inject } from "@nestjs/common";
import { WebhookService, WebhookEvent } from "./webhook.service";

@Injectable()
export class WebhookEvents {
  constructor(
    @Inject(WebhookService) private readonly webhookService: WebhookService
  ) {}

  /**
   * Usuário se registrou
   */
  async onUserSignup(usuarioId: string, nome: string, email: string, tipo: string) {
    return this.webhookService.trigger({
      evento: "user.signup" as WebhookEvent,
      dados: {
        usuarioId,
        nome,
        email,
        tipo,
      },
    });
  }

  /**
   * KYC aprovado
   */
  async onKycApproved(usuarioId: string, documentos: any[]) {
    return this.webhookService.trigger({
      evento: "user.kyc.approved" as WebhookEvent,
      dados: {
        usuarioId,
        kycStatus: "APROVADO",
        kycDocumentos: documentos,
      },
    });
  }

  /**
   * KYC rejeitado
   */
  async onKycRejected(usuarioId: string, motivo: string, documentos: any[]) {
    return this.webhookService.trigger({
      evento: "user.kyc.rejected" as WebhookEvent,
      dados: {
        usuarioId,
        kycStatus: "REJEITADO",
        motivo,
        kycDocumentos: documentos,
      },
    });
  }

  /**
   * Crédito aprovado
   */
  async onCreditApproved(
    creditoId: string,
    usuarioId: string,
    valorAprovado: number,
    prazoMeses: number,
    taxaMensal: number
  ) {
    return this.webhookService.trigger({
      evento: "credit.approved" as WebhookEvent,
      dados: {
        creditoId,
        usuarioId,
        valorAprovado,
        prazoMeses,
        taxaMensal,
        status: "ATIVO",
      },
    });
  }

  /**
   * Crédito rejeitado
   */
  async onCreditRejected(creditoId: string, usuarioId: string, motivo: string) {
    return this.webhookService.trigger({
      evento: "credit.rejected" as WebhookEvent,
      dados: {
        creditoId,
        usuarioId,
        motivo,
        status: "REJEITADO",
      },
    });
  }

  /**
   * Obra concluída
   */
  async onWorkCompleted(
    obraId: string,
    creditoId: string,
    usuarioId: string,
    nome: string
  ) {
    return this.webhookService.trigger({
      evento: "work.completed" as WebhookEvent,
      dados: {
        obraId,
        creditoId,
        usuarioId,
        nome,
        status: "CONCLUIDA",
        dataConcluida: new Date().toISOString(),
      },
    });
  }

  /**
   * Etapa aprovada
   */
  async onStageApproved(
    etapaId: string,
    obraId: string,
    creditoId: string,
    usuarioId: string,
    etapa: any
  ) {
    return this.webhookService.trigger({
      evento: "stage.approved" as WebhookEvent,
      dados: {
        etapaId,
        obraId,
        creditoId,
        usuarioId,
        nome: etapa.nome,
        ordem: etapa.ordem,
        percentualObra: etapa.percentualObra,
        valorLiberacao: etapa.valorLiberacao,
        status: "CONCLUIDA",
      },
    });
  }

  /**
   * Etapa rejeitada
   */
  async onStageRejected(
    etapaId: string,
    obraId: string,
    creditoId: string,
    usuarioId: string,
    etapa: any,
    motivo: string
  ) {
    return this.webhookService.trigger({
      evento: "stage.rejected" as WebhookEvent,
      dados: {
        etapaId,
        obraId,
        creditoId,
        usuarioId,
        nome: etapa.nome,
        status: "REPROVADA",
        motivo,
      },
    });
  }

  /**
   * Parcela liberada
   */
  async onPaymentReleased(
    liberacaoId: string,
    creditoId: string,
    usuarioId: string,
    valor: number
  ) {
    return this.webhookService.trigger({
      evento: "payment.released" as WebhookEvent,
      dados: {
        liberacaoId,
        creditoId,
        usuarioId,
        valor,
        status: "CONCLUIDA",
        dataLiberacao: new Date().toISOString(),
      },
    });
  }
}

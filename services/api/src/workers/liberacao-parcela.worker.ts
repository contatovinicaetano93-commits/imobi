import { Processor, Process, OnQueueFailed, OnQueueCompleted } from "@nestjs/bull";
import { Job } from "bull";
import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../modules/prisma/prisma.service";
import { NotificacoesService } from "../modules/notificacoes/notificacoes.service";
import { EmailService } from "../modules/email/email.service";
import { PushNotificacoesService } from "../modules/push-notificacoes/push-notificacoes.service";
import { PaymentService } from "../modules/payments/payment.service";
import { QUEUE_LIBERACAO, type LiberacaoJob } from "../common/constants";
import { captureException } from "../common/config/sentry.config";

@Injectable()
@Processor(QUEUE_LIBERACAO)
export class LiberacaoParcelaWorker {
  private readonly logger = new Logger(LiberacaoParcelaWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificacoes: NotificacoesService,
    private readonly email: EmailService,
    private readonly pushNotificacoes: PushNotificacoesService,
    private readonly payments: PaymentService,
  ) {}

  @Process()
  async handle(job: Job<LiberacaoJob>) {
    const { creditoId, liberacaoId, valor } = job.data;

    try {
      const liberacao = await this.prisma.liberacaoParcela.findUnique({
        where: { liberacaoId },
      });
      if (!liberacao || liberacao.status !== "PENDENTE") {
        this.logger.log(`Liberação ${liberacaoId} já processada, ignorando retry`);
        return;
      }

      const credito = await this.prisma.credito.findUnique({
        where: { creditoId },
        include: { usuario: true, obras: true },
      });
      if (!credito) throw new Error(`Crédito ${creditoId} não encontrado`);

      await this.prisma.liberacaoParcela.update({
        where: { liberacaoId },
        data: { status: "PROCESSANDO" },
      });

      const payment = await this.payments.disburse({
        liberacaoId,
        creditoId,
        usuarioId: credito.usuarioId,
        valor,
        idempotencyKey: liberacaoId,
      });

      if (!payment.success) {
        await this.prisma.liberacaoParcela.update({
          where: { liberacaoId },
          data: {
            status: "FALHA",
            failureReason: payment.failureReason ?? "Pagamento recusado",
            paymentProvider: payment.provider,
            processadoEm: new Date(),
          },
        });
        throw new Error(payment.failureReason ?? "Pagamento falhou");
      }

      let processed = false;
      await this.prisma.$transaction(async (tx) => {
        const lib = await tx.liberacaoParcela.findUnique({ where: { liberacaoId } });
        if (!lib || lib.status === "CONCLUIDA") return;

        await tx.credito.update({
          where: { creditoId },
          data: { valorLiberado: { increment: valor } },
        });

        await tx.liberacaoParcela.update({
          where: { liberacaoId },
          data: {
            status: "CONCLUIDA",
            processadoEm: new Date(),
            externalPaymentId: payment.externalPaymentId,
            paymentProvider: payment.provider,
          },
        });

        processed = true;
      });

      if (!processed) return;

      const obra = credito.obras?.[0];
      const formattedValue = new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(valor);

      await this.notificacoes.criar(
        credito.usuarioId,
        "PARCELA_LIBERADA",
        "Parcela liberada com sucesso",
        `Liberação de ${formattedValue} foi processada para ${obra?.nome || "sua obra"}.`,
        obra ? `/dashboard/obras/${obra.obraId}` : "/dashboard",
      );

      this.pushNotificacoes.enviarPush({
        usuarioId: credito.usuarioId,
        titulo: "Parcela Liberada!",
        mensagem: `${formattedValue} foi creditado para ${obra?.nome || "sua obra"}.`,
        tipo: "PARCELA_LIBERADA",
        dados: { creditoId, valor: String(valor) },
      }).catch((e) => this.logger.error(`Erro ao enviar push: ${e}`));

      this.email
        .parcelaLiberadaEmail(credito.usuario.nome, credito.usuario.email, valor, obra?.nome || "sua obra")
        .catch((e) => this.logger.error(`Erro ao enviar email: ${e}`));

      this.logger.log(`Liberação processada para crédito ${creditoId}: R$ ${valor} via ${payment.provider}`);
    } catch (error) {
      this.logger.error(`Erro ao processar liberação: ${error}`);
      captureException(error instanceof Error ? error : new Error(String(error)), {
        liberacaoId,
        creditoId,
      });
      throw error;
    }
  }

  @OnQueueFailed()
  onFailed(job: Job, err: Error) {
    this.logger.error(`Job ${job.id} falhou: ${err.message}`);
    captureException(err, { liberacaoId: job.data.liberacaoId, creditoId: job.data.creditoId });

    this.prisma.credito
      .findUnique({ where: { creditoId: job.data.creditoId }, include: { obras: true } })
      .then(async (credito) => {
        if (!credito) return;

        await this.prisma.liberacaoParcela.updateMany({
          where: { liberacaoId: job.data.liberacaoId, status: { in: ["PENDENTE", "PROCESSANDO"] } },
          data: { status: "FALHA", processadoEm: new Date(), failureReason: err.message },
        });

        const obra = credito.obras?.[0];
        await this.notificacoes
          .criar(
            credito.usuarioId,
            "PARCELA_FALHA",
            "Erro na liberação da parcela",
            `Ocorreu um erro ao processar a liberação para ${obra?.nome || "sua obra"}.`,
            obra ? `/dashboard/obras/${obra.obraId}` : "/dashboard",
          )
          .catch((e) => this.logger.error(`Erro ao notificar falha: ${e}`));
      })
      .catch((e) => this.logger.error(`Erro ao processar falha de liberação: ${e}`));
  }

  @OnQueueCompleted()
  onCompleted(job: Job) {
    this.logger.log(`Job ${job.id} completado com sucesso`);
  }
}

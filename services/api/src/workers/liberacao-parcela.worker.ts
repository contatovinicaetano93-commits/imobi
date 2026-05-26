import { Processor, Process, OnQueueFailed, OnQueueCompleted } from "@nestjs/bull";
import { Job } from "bull";
import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../modules/prisma/prisma.service";
import { NotificacoesService } from "../modules/notificacoes/notificacoes.service";
import { EmailService } from "../modules/email/email.service";
import { PushNotificacoesService } from "../modules/push-notificacoes/push-notificacoes.service";

export const QUEUE_LIBERACAO = "liberacao-parcela";
export const QUEUE_LIBERACAO_DLQ = "liberacao-parcela-dlq";

export interface LiberacaoJob {
  creditoId: string;
  etapaId: string;
  valor: number;
}

@Injectable()
@Processor(QUEUE_LIBERACAO)
export class LiberacaoParcelaWorker {
  private readonly logger = new Logger(LiberacaoParcelaWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificacoes: NotificacoesService,
    private readonly email: EmailService,
    private readonly pushNotificacoes: PushNotificacoesService
  ) {}

  @Process()
  async handle(job: Job<LiberacaoJob>) {
    const { creditoId, valor } = job.data;

    try {
      const credito = await this.prisma.credito.findUnique({
        where: { creditoId },
        include: { usuario: true, obras: true },
      });
      if (!credito) throw new Error(`Crédito ${creditoId} não encontrado`);

      await this.prisma.$transaction(async (tx) => {
        // Atualiza saldo liberado no crédito
        await tx.credito.update({
          where: { creditoId },
          data: { valorLiberado: { increment: valor } },
        });

        // Marca liberação como concluída
        await tx.liberacaoParcela.updateMany({
          where: { creditoId, status: "PENDENTE" },
          data: { status: "CONCLUIDA", processadoEm: new Date() },
        });
      });

      // Notifica usuário sobre liberação bem-sucedida
      const obra = credito.obras?.[0];
      const formattedValue = new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(valor);

      await this.notificacoes.criar(
        credito.usuarioId,
        "PARCELA_LIBERADA",
        "Parcela liberada com sucesso",
        `Liberação de R$ ${formattedValue} foi processada para ${obra?.nome || "sua obra"}.`,
        obra ? `/dashboard/obras/${obra.obraId}` : "/dashboard"
      );

      // Envia push notification
      this.pushNotificacoes.enviarPush({
        usuarioId: credito.usuarioId,
        titulo: "Parcela Liberada!",
        mensagem: `R$ ${formattedValue} foi creditado para ${obra?.nome || "sua obra"}.`,
        tipo: "PARCELA_LIBERADA",
        dados: { creditoId, valor: String(valor) },
      }).catch((e) => this.logger.error(`Erro ao enviar push: ${e}`));

      // Envia email
      this.email
        .parcelaLiberadaEmail(
          credito.usuario.nome,
          credito.usuario.email,
          valor,
          obra?.nome || "sua obra"
        )
        .catch((e) => this.logger.error(`Erro ao enviar email: ${e}`));

      this.logger.log(`Liberação processada para crédito ${creditoId}: R$ ${valor}`);
    } catch (error) {
      this.logger.error(`Erro ao processar liberação: ${error}`);
      throw error;
    }
  }

  @OnQueueFailed()
  async onFailed(job: Job, err: Error) {
    this.logger.error(
      `Job ${job.id} falhou na tentativa ${job.attemptsMade} de ${job.opts.attempts}: ${err.message}`
    );

    // Only mark as final failure after all retries are exhausted
    if (job.attemptsMade >= (job.opts.attempts || 3)) {
      try {
        const credito = await this.prisma.credito.findUnique({
          where: { creditoId: job.data.creditoId },
          include: { obras: true, usuario: true },
        });

        if (!credito) {
          this.logger.warn(`Crédito ${job.data.creditoId} não encontrado`);
          return;
        }

        // Update liberação status to FALHA
        await this.prisma.liberacaoParcela.updateMany({
          where: { creditoId: job.data.creditoId, status: "PENDENTE" },
          data: {
            status: "FALHA",
            processadoEm: new Date(),
            motivo: `Erro após 3 tentativas: ${err.message}`,
          },
        });

        // Notify user about failure
        const obra = credito.obras?.[0];
        await this.notificacoes.criar(
          credito.usuarioId,
          "PARCELA_FALHA",
          "Erro na liberação da parcela",
          `Ocorreu um erro ao processar a liberação para ${obra?.nome || "sua obra"}. Por favor, contate o suporte.`,
          obra ? `/dashboard/obras/${obra.obraId}` : "/dashboard"
        );

        // Send email notification
        this.email
          .parcelaFalhaEmail(credito.usuario.nome, credito.usuario.email, job.data.valor)
          .catch((e) => this.logger.error(`Erro ao enviar email de falha: ${e}`));

        this.logger.error(
          `Liberação para crédito ${job.data.creditoId} falhou permanentemente. Motivo: ${err.message}`
        );
      } catch (error) {
        this.logger.error(`Erro ao processar falha de liberação: ${error}`);
      }
    }
  }

  @OnQueueCompleted()
  onCompleted(job: Job) {
    this.logger.log(`Job ${job.id} completado com sucesso`);
  }
}

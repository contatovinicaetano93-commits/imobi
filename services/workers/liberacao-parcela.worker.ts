import { Processor, Process, OnWorkerEvent } from "@nestjs/bull";
import { Job } from "bull";
import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../api/src/modules/prisma/prisma.service";

export const QUEUE_LIBERACAO = "liberacao-parcela";

export interface LiberacaoJob {
  creditoId: string;
  etapaId: string;
  valor: number;
}

@Injectable()
@Processor(QUEUE_LIBERACAO)
export class LiberacaoParcelaWorker {
  private readonly logger = new Logger(LiberacaoParcelaWorker.name);

  constructor(private readonly prisma: PrismaService) {}

  @Process()
  async handle(job: Job<LiberacaoJob>) {
    const { creditoId, valor } = job.data;

    try {
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

      this.logger.log(`Liberação processada para crédito ${creditoId}: R$ ${valor}`);
    } catch (error) {
      this.logger.error(`Erro ao processar liberação: ${error}`);
      // Rethrow para que o BullMQ marque como falha
      throw error;
    }
  }

  @OnWorkerEvent("failed")
  onFailed(job: Job, err: Error) {
    this.logger.error(`Job ${job.id} falhou: ${err.message}`);
    // Registra a falha no banco de dados
    this.prisma.liberacaoParcela
      .updateMany({
        where: { creditoId: job.data.creditoId, status: "PENDENTE" },
        data: { status: "FALHA", processadoEm: new Date() },
      })
      .catch((e) => this.logger.error(`Erro ao atualizar status de falha: ${e}`));
  }

  @OnWorkerEvent("completed")
  onCompleted(job: Job) {
    this.logger.log(`Job ${job.id} completado com sucesso`);
  }
}

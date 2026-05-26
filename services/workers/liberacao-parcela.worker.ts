import { Processor, Process } from "@nestjs/bull";
import { Job } from "bull";
import { PrismaService } from "../api/src/modules/prisma/prisma.service";

export const QUEUE_LIBERACAO = "liberacao-parcela";

export interface LiberacaoJob {
  creditoId: string;
  etapaId: string;
  valor: number;
}

@Processor(QUEUE_LIBERACAO)
export class LiberacaoParcelaWorker {
  constructor(private readonly prisma: PrismaService) {}

  @Process()
  async handle(job: Job<LiberacaoJob>) {
    const { creditoId, etapaId, valor } = job.data;

    await this.prisma.$transaction(async (tx) => {
      // Atualiza saldo liberado no crédito
      await tx.credito.update({
        where: { id: creditoId },
        data: { valorLiberado: { increment: valor } },
      });

      // Marca liberação como concluída
      await tx.liberacaoParcela.updateMany({
        where: { creditoId, etapaId, status: "PROCESSANDO" },
        data: { status: "CONCLUIDA", processadoEm: new Date() },
      });
    });
  }
}

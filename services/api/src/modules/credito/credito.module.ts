import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bull";
import { CreditoController } from "./credito.controller";
import { CreditoService } from "./credito.service";
import { LiberacaoParcelaWorker } from "../../workers/liberacao-parcela.worker";
import { QUEUE_LIBERACAO } from "../../common/constants";
import { QueueMonitoringService } from "../../common/queue-monitoring.service";
import { PrismaModule } from "../prisma/prisma.module";
import { NotificacoesModule } from "../notificacoes/notificacoes.module";
import { EmailModule } from "../email/email.module";
import { PushNotificacoesModule } from "../push-notificacoes/push-notificacoes.module";

@Module({
  imports: [
    PrismaModule,
    NotificacoesModule,
    EmailModule,
    PushNotificacoesModule,
    BullModule.registerQueue({
      name: QUEUE_LIBERACAO,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
        removeOnComplete: true,
      },
      // Dead-letter queue: captures failed jobs after all retries exhausted
      settings: {
        retryProcessDelay: 5000, // 5s between retries
      },
    }),
  ],
  controllers: [CreditoController],
  providers: [
    CreditoService,
    QueueMonitoringService,
    ...(process.env.NODE_ENV !== "test" ? [LiberacaoParcelaWorker] : []),
  ],
  exports: [QueueMonitoringService],
})
export class CreditoModule {}

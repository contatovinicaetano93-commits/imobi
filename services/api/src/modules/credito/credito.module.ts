import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bull";
import { CreditoController } from "./credito.controller";
import { CreditoService } from "./credito.service";
import { LiberacaoParcelaWorker } from "../../workers/liberacao-parcela.worker";
import { QUEUE_LIBERACAO } from "../../common/constants";
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
    }),
  ],
  controllers: [CreditoController],
  providers: [CreditoService, ...(process.env.NODE_ENV !== "test" ? [LiberacaoParcelaWorker] : [])],
})
export class CreditoModule {}

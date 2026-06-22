import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { BullModule } from "@nestjs/bull";
import { PrismaModule } from "./modules/prisma/prisma.module";
import { NotificacoesModule } from "./modules/notificacoes/notificacoes.module";
import { EmailModule } from "./modules/email/email.module";
import { PushNotificacoesModule } from "./modules/push-notificacoes/push-notificacoes.module";
import { PaymentModule } from "./modules/payments/payment.module";
import { LiberacaoParcelaWorker } from "./workers/liberacao-parcela.worker";
import { ExcluirUsuarioWorker, QUEUE_EXCLUIR_USUARIO } from "./workers/excluir-usuario.worker";
import { QUEUE_LIBERACAO } from "./common/constants";
import { getRedisConfig } from "./common/config";

const redisConfig = getRedisConfig();

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRoot({
      redis: {
        host: redisConfig.host,
        port: redisConfig.port,
        ...(redisConfig.password && { password: redisConfig.password }),
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        retryStrategy: (times: number) => Math.min(times * 50, 2000),
      },
    }),
    BullModule.registerQueue({ name: QUEUE_LIBERACAO }),
    BullModule.registerQueue({ name: QUEUE_EXCLUIR_USUARIO }),
    PrismaModule,
    NotificacoesModule,
    EmailModule,
    PushNotificacoesModule,
    PaymentModule,
  ],
  providers: [LiberacaoParcelaWorker, ExcluirUsuarioWorker],
})
export class WorkerAppModule {}

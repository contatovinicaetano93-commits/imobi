import { Module, NestModule, MiddlewareConsumer } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { BullModule } from "@nestjs/bull";
import { ThrottlerModule } from "@nestjs/throttler";
import { CacheModule } from "@nestjs/cache-manager";
import { APP_GUARD, APP_INTERCEPTOR, Reflector } from "@nestjs/core";
import { CacheInterceptor } from "@nestjs/cache-manager";
import { UserAwareCacheInterceptor } from "./common/interceptors/user-aware-cache.interceptor";
import { ThrottlerStorage } from "@nestjs/throttler";
import KeyvRedis from "@keyv/redis";
import { PrismaModule } from "./modules/prisma/prisma.module";
import { AuthModule } from "./modules/auth/auth.module";
import { UsuariosModule } from "./modules/usuarios/usuarios.module";
import { CreditoModule } from "./modules/credito/credito.module";
import { ObrasModule } from "./modules/obras/obras.module";
import { EtapasModule } from "./modules/etapas/etapas.module";
import { EvidenciasModule } from "./modules/evidencias/evidencias.module";
import { ScoreModule } from "./modules/score/score.module";
import { KycModule } from "./modules/kyc/kyc.module";
import { ManagerModule } from "./modules/manager/manager.module";
import { EmailModule } from "./modules/email/email.module";
import { ParceirosModule } from "./modules/parceiros/parceiros.module";
import { NotificacoesModule } from "./modules/notificacoes/notificacoes.module";
import { ComercialModule } from "./modules/comercial/comercial.module";
import { EngenheirosModule } from "./modules/engenheiros/engenheiros.module";
import { AdminModule } from "./modules/admin/admin.module";
import { PushNotificacoesModule } from "./modules/push-notificacoes/push-notificacoes.module";
import { VistoriaModule } from "./modules/vistoria/vistoria.module";
import { SetupModule } from "./modules/setup/setup.module";
import { DueDiligenceModule } from "./modules/due-diligence/due-diligence.module";
import { DocumentosModule } from "./modules/documentos/documentos.module";
import { ComiteModule } from "./modules/comite/comite.module";
import { LiberacaoParcelaWorker } from "./workers/liberacao-parcela.worker";
import { ExcluirUsuarioWorker, QUEUE_EXCLUIR_USUARIO } from "./workers/excluir-usuario.worker";
import { EmailWorker } from "./workers/email.worker";
import { QUEUE_LIBERACAO, QUEUE_EMAIL } from "./common/constants";
import { HealthController } from "./common/health.controller";
import { getRedisConfig } from "./common/config";
import { ProductionMiddleware } from "./common/middleware/production.middleware";
import { HttpLoggingMiddleware } from "./common/middleware/http-logging.middleware";
import { CustomThrottlerGuard } from "./common/guards/throttler.guard";

const redisConfig = getRedisConfig();

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      { ttl: 60000, limit: 100 },
      { ttl: 60000, limit: 10, name: "auth" },
      { ttl: 60000, limit: 5, name: "upload" },
      { ttl: 60000, limit: 20, name: "manager" },
      { ttl: 3600000, limit: 10, name: "hour" },
    ]),
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: () => {
        const redisUrl = redisConfig.password
          ? `redis://:${redisConfig.password}@${redisConfig.host}:${redisConfig.port}`
          : `redis://${redisConfig.host}:${redisConfig.port}`;
        return {
          stores: [new KeyvRedis(redisUrl)],
          ttl: 300_000,
        };
      },
    }),
    BullModule.registerQueue({
      name: QUEUE_LIBERACAO,
      defaultJobOptions: { attempts: 5, backoff: { type: "exponential", delay: 10_000 }, removeOnComplete: 100, removeOnFail: 500 },
    }),
    BullModule.registerQueue({
      name: QUEUE_EXCLUIR_USUARIO,
      defaultJobOptions: { attempts: 3, backoff: { type: "exponential", delay: 30_000 }, removeOnComplete: 50, removeOnFail: 200 },
    }),
    BullModule.registerQueue({
      name: QUEUE_EMAIL,
      defaultJobOptions: { attempts: 3, backoff: { type: "exponential", delay: 5_000 }, removeOnComplete: 200, removeOnFail: 100 },
    }),
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
    PrismaModule,
    AuthModule,
    UsuariosModule,
    CreditoModule,
    ObrasModule,
    EtapasModule,
    EvidenciasModule,
    ScoreModule,
    KycModule,
    ManagerModule,
    EmailModule,
    NotificacoesModule,
    PushNotificacoesModule,
    ParceirosModule,
    ComercialModule,
    EngenheirosModule,
    AdminModule,
    VistoriaModule,
    SetupModule,
    DueDiligenceModule,
    DocumentosModule,
    ComiteModule,
  ],
  controllers: [HealthController],
  providers: [
    LiberacaoParcelaWorker,
    ExcluirUsuarioWorker,
    EmailWorker,
    {
      provide: APP_INTERCEPTOR,
      useClass: UserAwareCacheInterceptor,
    },
    {
      provide: APP_GUARD,
      useFactory: (
        options: any,
        storageService: ThrottlerStorage,
        reflector: Reflector,
      ) => new CustomThrottlerGuard(options, storageService, reflector),
      inject: ["THROTTLER:MODULE_OPTIONS", ThrottlerStorage, Reflector],
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    const nodeEnv = process.env.NODE_ENV || 'development';
    consumer.apply(HttpLoggingMiddleware).forRoutes('*');
    if (nodeEnv === 'production') {
      consumer.apply(ProductionMiddleware).forRoutes('*');
    }
  }
}

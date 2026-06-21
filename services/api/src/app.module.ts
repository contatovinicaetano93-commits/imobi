import { Module, NestModule, MiddlewareConsumer, RequestMethod } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { BullModule } from "@nestjs/bull";
import { ThrottlerModule } from "@nestjs/throttler";
import { CacheModule } from "@nestjs/cache-manager";
import { APP_GUARD, APP_INTERCEPTOR, Reflector } from "@nestjs/core";
import { CacheInterceptor } from "@nestjs/cache-manager";
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
import { MarketplaceModule } from "./modules/marketplace/marketplace.module";
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
import { FundosModule } from "./modules/fundos/fundos.module";
import { ConstrutorModule } from "./modules/construtor/construtor.module";
import { LedgerModule } from "./modules/ledger/ledger.module";
import { OutboxModule } from "./modules/outbox/outbox.module";
import { TotpModule } from "./modules/totp/totp.module";
import { WebhooksModule } from "./modules/webhooks/webhooks.module";
import { LiberacaoParcelaWorker } from "./workers/liberacao-parcela.worker";
import { ExcluirUsuarioWorker, QUEUE_EXCLUIR_USUARIO } from "./workers/excluir-usuario.worker";
import { OutboxWorker } from "./workers/outbox.worker";
import { ReconciliacaoWorker } from "./workers/reconciliacao.worker";
import { IdempotencyInterceptor } from "./common/interceptors/idempotency.interceptor";
import { QUEUE_LIBERACAO } from "./common/constants";
import { HealthController } from "./common/health.controller";
import { MetricsController } from "./common/controllers/metrics.controller";
import { getRedisConfig } from "./common/config";
import { ProductionMiddleware } from "./common/middleware/production.middleware";
import { CorrelationIdMiddleware } from "./common/middleware/correlation-id.middleware";
import { RequestLoggerMiddleware } from "./common/middleware/request-logger.middleware";
import { CustomThrottlerGuard } from "./common/guards/throttler.guard";
import { AuditModule } from "./common/services/audit.module";
import { CreditoVencidoWorker } from "./workers/credito-vencido.worker";
import { LgpdDeleteWorker } from "./workers/lgpd-delete.worker";

const redisConfig = getRedisConfig();

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      { ttl: 60000, limit: 100 },
      { ttl: 60000, limit: 10, name: "auth" },
      { ttl: 60000, limit: 5, name: "upload" },
      { ttl: 60000, limit: 20, name: "manager" },
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
    BullModule.registerQueue({ name: QUEUE_LIBERACAO }),
    BullModule.registerQueue({ name: QUEUE_EXCLUIR_USUARIO }),
    BullModule.forRoot({
      redis: {
        host: redisConfig.host,
        port: redisConfig.port,
        ...(redisConfig.password && { password: redisConfig.password }),
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        retryStrategy: (times: number) => Math.min(times * 50, 2000),
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 500 },
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
    MarketplaceModule,
    ParceirosModule,
    ComercialModule,
    EngenheirosModule,
    AdminModule,
    VistoriaModule,
    SetupModule,
    DueDiligenceModule,
    DocumentosModule,
    ComiteModule,
    FundosModule,
    ConstrutorModule,
    LedgerModule,
    OutboxModule,
    TotpModule,
    WebhooksModule,
    AuditModule,
  ],
  controllers: [HealthController, MetricsController],
  providers: [
    LiberacaoParcelaWorker,
    ExcluirUsuarioWorker,
    OutboxWorker,
    ReconciliacaoWorker,
    CreditoVencidoWorker,
    LgpdDeleteWorker,
    {
      provide: APP_INTERCEPTOR,
      useClass: CacheInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: IdempotencyInterceptor,
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
    // Correlation ID and request logging on all routes
    consumer
      .apply(CorrelationIdMiddleware, RequestLoggerMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });

    const nodeEnv = process.env.NODE_ENV || 'development';
    if (nodeEnv === 'production') {
      consumer.apply(ProductionMiddleware).forRoutes({ path: '*', method: RequestMethod.ALL });
    }
  }
}

import { Module, NestModule, MiddlewareConsumer } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { BullModule } from "@nestjs/bull";
import { ThrottlerModule } from "@nestjs/throttler";
import { CacheModule } from "@nestjs/cache-manager";
import { APP_GUARD, APP_INTERCEPTOR, Reflector } from "@nestjs/core";
import { ThrottlerStorage } from "@nestjs/throttler";
import KeyvRedis from "@keyv/redis";
import { PrismaModule } from "./modules/prisma/prisma.module";
import { AuthModule } from "./modules/auth/auth.module";
import { UsuariosModule } from "./modules/usuarios/usuarios.module";
import { CreditoModule } from "./modules/credito/credito.module";
import { JornadaModule } from "./modules/jornada/jornada.module";
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
import { DossiesModule } from "./modules/dossies/dossies.module";
import { PropostasModule } from "./modules/propostas/propostas.module";
import { DocumentosModule } from "./modules/documentos/documentos.module";
import { ComiteModule } from "./modules/comite/comite.module";
import { AssistenteModule } from "./modules/assistente/assistente.module";
import { LiberacaoParcelaWorker } from "./workers/liberacao-parcela.worker";
import { ExcluirUsuarioWorker, QUEUE_EXCLUIR_USUARIO } from "./workers/excluir-usuario.worker";
import { PropostaNotifyWorker } from "./workers/proposta-notify.worker";
import { KycNotifyWorker } from "./workers/kyc-notify.worker";
import { QUEUE_LIBERACAO, QUEUE_PROPOSTA_NOTIFY, QUEUE_KYC_NOTIFY } from "./common/constants";
import { HealthController } from "./common/health.controller";
import { getRedisConfig } from "./common/config";
import { ProductionMiddleware } from "./common/middleware/production.middleware";
import { CustomThrottlerGuard } from "./common/guards/throttler.guard";
import { PrometheusService } from "./common/observability/prometheus.service";
import { MetricsController } from "./common/metrics.controller";
import { HttpLoggingInterceptor } from "./common/interceptors/http-logging.interceptor";
import { TieredRateLimitService } from "./common/rate-limiting/tiered-rate-limit.service";
import { StructuredLoggerService } from "./common/logging/structured-logger.service";
import { ShardingService } from "./common/scalability/sharding.service";
import { MultiTierCacheService } from "./common/scalability/multi-tier-cache.service";
import { ReadReplicaService } from "./common/scalability/read-replica.service";
import { ZeroTrustService } from "./common/security/zero-trust.service";
import { ImmutableAuditService } from "./common/security/immutable-audit.service";
import { SecretRotationService } from "./common/security/secret-rotation.service";
import { EncryptionService } from "./common/security/encryption.service";

const redisConfig = getRedisConfig();

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
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
    BullModule.registerQueue({ name: QUEUE_PROPOSTA_NOTIFY }),
    BullModule.registerQueue({ name: QUEUE_KYC_NOTIFY }),
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
    JornadaModule,
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
    DossiesModule,
    PropostasModule,
    DocumentosModule,
    ComiteModule,
    AssistenteModule,
  ],
  controllers: [HealthController, MetricsController],
  providers: [
    PrometheusService,
    // TieredRateLimitService,
    // StructuredLoggerService,
    // ShardingService,
    // MultiTierCacheService,
    // ReadReplicaService,
    // ZeroTrustService,
    // ImmutableAuditService,
    // SecretRotationService,
    // EncryptionService,
    LiberacaoParcelaWorker,
    ExcluirUsuarioWorker,
    PropostaNotifyWorker,
    KycNotifyWorker,
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpLoggingInterceptor,
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
    if (nodeEnv === 'production') {
      consumer.apply(ProductionMiddleware).forRoutes('*');
    }
  }
}

import { Module, NestModule, MiddlewareConsumer } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { BullModule } from "@nestjs/bull";
import { ThrottlerModule } from "@nestjs/throttler";
import { CacheModule } from "@nestjs/cache-manager";
import { APP_GUARD, APP_INTERCEPTOR, Reflector } from "@nestjs/core";
import { CacheInterceptor } from "@nestjs/cache-manager";
import { ThrottlerStorage } from "@nestjs/throttler";
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
import { PushNotificacoesModule } from "./modules/push-notificacoes/push-notificacoes.module";
import { VistoriaModule } from "./modules/vistoria/vistoria.module";
import { LiberacaoParcelaWorker } from "./workers/liberacao-parcela.worker";
import { ExcluirUsuarioWorker } from "./workers/excluir-usuario.worker";
import { NotificacaoWorker } from "./workers/notificacao.worker";
import { AnaliseFraudeWorker } from "./workers/analise-fraude.worker";
import { HealthController } from "./common/health.controller";
import { getRedisConfig } from "./common/config";
import { QUEUE_NOTIFICACAO, QUEUE_ANALISE_FRAUDE } from "./common/constants";
import { ProductionMiddleware } from "./common/middleware/production.middleware";
import { CustomThrottlerGuard } from "./common/guards/throttler.guard";

const redisConfig = getRedisConfig();

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      { ttl: 60000, limit: 100 }, // General: 100 req/min
      { ttl: 60000, limit: 10, name: "auth" }, // Auth endpoints: 10 req/min
      { ttl: 60000, limit: 5, name: "upload" }, // File uploads: 5 req/min
      { ttl: 60000, limit: 20, name: "manager" }, // Manager ops: 20 req/min
    ]),
    CacheModule.register({
      isGlobal: true,
      store: "redis",
      host: redisConfig.host,
      port: redisConfig.port,
      ...(redisConfig.password && { password: redisConfig.password }),
      ttl: 300, // 5 min default TTL
      lazyConnect: true,
      retryStrategy: (times: number) => Math.min(times * 50, 2000),
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
    BullModule.registerQueue(
      { name: QUEUE_NOTIFICACAO },
      { name: QUEUE_ANALISE_FRAUDE }
    ),
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
    VistoriaModule,
  ],
  controllers: [HealthController],
  providers: [
    LiberacaoParcelaWorker,
    ExcluirUsuarioWorker,
    NotificacaoWorker,
    AnaliseFraudeWorker,
    {
      provide: APP_INTERCEPTOR,
      useClass: CacheInterceptor,
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

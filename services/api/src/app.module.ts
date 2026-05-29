import { Module, NestModule, MiddlewareConsumer } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { BullModule } from "@nestjs/bull";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { CacheModule } from "@nestjs/cache-manager";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { CacheInterceptor } from "@nestjs/cache-manager";
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
import { PushNotificacoesModule } from "./modules/push-notificacoes/push-notificacoes.module";
import { LiberacaoParcelaWorker } from "./workers/liberacao-parcela.worker";
import { HealthController } from "./common/health.controller";
import { getRedisConfig } from "./common/config";
import { ProductionMiddleware } from "./common/middleware/production.middleware";
import { CustomThrottlerGuard } from "./common/guards/throttler.guard";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      { ttl: 60000, limit: 100 }, // General: 100 req/min
      { ttl: 60000, limit: 10, name: "auth" }, // Auth endpoints: 10 req/min
      { ttl: 60000, limit: 5, name: "upload" }, // File uploads: 5 req/min
      { ttl: 60000, limit: 20, name: "manager" }, // Manager ops: 20 req/min
    ]),
    (() => {
      const redisConfig = getRedisConfig();
      return CacheModule.register({
        isGlobal: true,
        store: "redis",
        host: redisConfig.host,
        port: redisConfig.port,
        ...(redisConfig.password && { password: redisConfig.password }),
        ttl: 300, // 5 min default TTL
      });
    })(),
    (() => {
      const redisConfig = getRedisConfig();
      return BullModule.forRoot({
        redis: {
          host: redisConfig.host,
          port: redisConfig.port,
          ...(redisConfig.password && { password: redisConfig.password }),
        },
      });
    })(),
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
  ],
  controllers: [HealthController],
  providers: [
    LiberacaoParcelaWorker,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: CacheInterceptor,
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

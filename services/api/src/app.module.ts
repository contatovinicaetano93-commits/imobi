import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { BullModule } from "@nestjs/bull";
import { ThrottlerModule } from "@nestjs/throttler";
import { CacheModule } from "@nestjs/cache-manager";
import * as redisStore from "cache-manager-redis-store";
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
import { CustomThrottlerGuard } from "./common/guards/throttler.guard";
import { IpThrottlerGuard } from "./common/guards/ip-throttler.guard";
import { UserThrottlerGuard } from "./common/guards/user-throttler.guard";
import { APP_GUARD } from "@nestjs/core";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Configure throttler with multiple profiles for different endpoints
    ThrottlerModule.forRoot([
      {
        // Default global limit: 100 requests per 60 seconds
        ttl: 60000,
        limit: 100,
      },
      {
        // Auth endpoints: 5 requests per 15 minutes for login (900000ms)
        ttl: 900000,
        limit: 5,
        name: "login",
      },
      {
        // Auth endpoints: 3 requests per hour for register (3600000ms)
        ttl: 3600000,
        limit: 3,
        name: "register",
      },
      {
        // Auth endpoints: 10 requests per hour for token renewal
        ttl: 3600000,
        limit: 10,
        name: "renovar",
      },
      {
        // Credit endpoints: 20 requests per hour for simulation
        ttl: 3600000,
        limit: 20,
        name: "simular",
      },
      {
        // Evidence endpoints: 30 requests per day for upload (86400000ms)
        ttl: 86400000,
        limit: 30,
        name: "evidencias",
      },
    ]),
    BullModule.forRoot({
      redis: {
        host: process.env["REDIS_HOST"] ?? "localhost",
        port: Number(process.env["REDIS_PORT"] ?? 6379),
      },
    }),
    CacheModule.register({
      isGlobal: true,
      store: redisStore,
      host: process.env["REDIS_HOST"] ?? "localhost",
      port: Number(process.env["REDIS_PORT"] ?? 6379),
      ttl: 600000, // Default TTL: 10 minutes
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
  ],
  providers: [
    LiberacaoParcelaWorker,
    CustomThrottlerGuard,
    IpThrottlerGuard,
    UserThrottlerGuard,
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard,
    },
  ],
  exports: [CustomThrottlerGuard, IpThrottlerGuard, UserThrottlerGuard],
})
export class AppModule {}

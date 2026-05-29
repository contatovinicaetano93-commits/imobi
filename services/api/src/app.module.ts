import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { BullModule } from "@nestjs/bull";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { CacheModule } from "@nestjs/cache-manager";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { CacheInterceptor } from "@nestjs/cache-manager";
import { CacheService } from "./cache.service";
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
import { CsrfService } from "./common/csrf.service";
import { EncryptionService } from "./common/encryption.service";

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
      host: process.env["REDIS_HOST"] ?? "localhost",
      port: Number(process.env["REDIS_PORT"] ?? 6379),
      ttl: 300, // 5 min default TTL
    }),
    BullModule.forRoot({
      redis: {
        host: process.env["REDIS_HOST"] ?? "localhost",
        port: Number(process.env["REDIS_PORT"] ?? 6379),
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
  ],
  controllers: [HealthController],
  providers: [
    CacheService,
    CsrfService,
    EncryptionService,
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
export class AppModule {}

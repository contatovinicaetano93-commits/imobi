import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { BullModule } from "@nestjs/bull";
import { ThrottlerModule } from "@nestjs/throttler";
import { CustomThrottlerGuard } from "./common/guards/throttler.guard";
import { PrismaModule } from "./modules/prisma/prisma.module";
import { AuthModule } from "./modules/auth/auth.module";
import { AdminModule } from "./modules/admin/admin.module";
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
import { AuditModule } from "./modules/audit/audit.module";
import { LiberacaoParcelaWorker } from "./workers/liberacao-parcela.worker";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    BullModule.forRoot({
      redis: {
        host: process.env["REDIS_HOST"] ?? "localhost",
        port: Number(process.env["REDIS_PORT"] ?? 6379),
      },
    }),
    PrismaModule,
    AuthModule,
    AdminModule,
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
    AuditModule,
  ],
  providers: [
    LiberacaoParcelaWorker,
    { provide: APP_GUARD, useClass: CustomThrottlerGuard },
  ],
})
export class AppModule {}

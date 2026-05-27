import { Module } from "@nestjs/common";
import { KycService } from "./kyc.service";
import { KycController } from "./kyc.controller";
import { NotificacoesModule } from "../notificacoes/notificacoes.module";
import { EmailModule } from "../email/email.module";
import { PushNotificacoesModule } from "../push-notificacoes/push-notificacoes.module";
import { StorageModule } from "../storage/storage.module";

@Module({
  imports: [NotificacoesModule, EmailModule, PushNotificacoesModule, StorageModule],
  controllers: [KycController],
  providers: [KycService],
  exports: [KycService],
})
export class KycModule {}

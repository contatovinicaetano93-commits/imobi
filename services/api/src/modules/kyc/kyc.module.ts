import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bull";
import { KycService } from "./kyc.service";
import { KycController } from "./kyc.controller";
import { NotificacoesModule } from "../notificacoes/notificacoes.module";
import { EmailModule } from "../email/email.module";
import { PushNotificacoesModule } from "../push-notificacoes/push-notificacoes.module";
import { StorageModule } from "../storage/storage.module";
import { QUEUE_KYC_NOTIFY } from "../../common/constants";

@Module({
  imports: [
    NotificacoesModule,
    EmailModule,
    PushNotificacoesModule,
    StorageModule,
    BullModule.registerQueue({ name: QUEUE_KYC_NOTIFY }),
  ],
  controllers: [KycController],
  providers: [KycService],
  exports: [KycService],
})
export class KycModule {}

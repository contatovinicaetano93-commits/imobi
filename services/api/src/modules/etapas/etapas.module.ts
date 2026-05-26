import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bull";
import { EtapasController } from "./etapas.controller";
import { EtapasService } from "./etapas.service";
import { NotificacoesModule } from "../notificacoes/notificacoes.module";
import { EmailModule } from "../email/email.module";
import { PushNotificacoesModule } from "../push-notificacoes/push-notificacoes.module";
import { AuditModule } from "../audit/audit.module";
import { QUEUE_LIBERACAO } from "../../common/constants";

@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUE_LIBERACAO }),
    NotificacoesModule,
    EmailModule,
    PushNotificacoesModule,
    AuditModule,
  ],
  controllers: [EtapasController],
  providers: [EtapasService],
  exports: [EtapasService],
})
export class EtapasModule {}

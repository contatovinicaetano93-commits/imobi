import { Module } from "@nestjs/common";
import { EtapasController } from "./etapas.controller";
import { EtapasService } from "./etapas.service";
import { NotificacoesModule } from "../notificacoes/notificacoes.module";
import { EmailModule } from "../email/email.module";
import { PushNotificacoesModule } from "../push-notificacoes/push-notificacoes.module";

@Module({
  imports: [NotificacoesModule, EmailModule, PushNotificacoesModule],
  controllers: [EtapasController],
  providers: [EtapasService],
  exports: [EtapasService],
})
export class EtapasModule {}

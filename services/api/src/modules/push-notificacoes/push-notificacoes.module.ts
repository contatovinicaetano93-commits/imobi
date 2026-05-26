import { Module } from "@nestjs/common";
import { PushNotificacoesService } from "./push-notificacoes.service";

@Module({
  providers: [PushNotificacoesService],
  exports: [PushNotificacoesService],
})
export class PushNotificacoesModule {}

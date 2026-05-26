import { Module } from "@nestjs/common";
import { PushNotificacoesService } from "./push-notificacoes.service";
import { PushNotificacoesController } from "./push-notificacoes.controller";

@Module({
  controllers: [PushNotificacoesController],
  providers: [PushNotificacoesService],
  exports: [PushNotificacoesService],
})
export class PushNotificacoesModule {}

import { Module } from "@nestjs/common";
import { VistoriaController } from "./vistoria.controller";
import { VistoriaService } from "./vistoria.service";
import { NotificacoesModule } from "../notificacoes/notificacoes.module";
import { PushNotificacoesModule } from "../push-notificacoes/push-notificacoes.module";

@Module({
  imports: [NotificacoesModule, PushNotificacoesModule],
  controllers: [VistoriaController],
  providers: [VistoriaService],
})
export class VistoriaModule {}

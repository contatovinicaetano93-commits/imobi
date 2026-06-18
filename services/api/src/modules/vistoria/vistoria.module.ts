import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bull";
import { VistoriaController } from "./vistoria.controller";
import { VistoriaService } from "./vistoria.service";
import { NotificacoesModule } from "../notificacoes/notificacoes.module";
import { EmailModule } from "../email/email.module";
import { PushNotificacoesModule } from "../push-notificacoes/push-notificacoes.module";
import { ScoreModule } from "../score/score.module";
import { QUEUE_LIBERACAO } from "../../common/constants";

@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUE_LIBERACAO }),
    NotificacoesModule,
    EmailModule,
    PushNotificacoesModule,
    ScoreModule,
  ],
  controllers: [VistoriaController],
  providers: [VistoriaService],
})
export class VistoriaModule {}

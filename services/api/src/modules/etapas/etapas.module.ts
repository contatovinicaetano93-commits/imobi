import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bull";
import { EtapasController } from "./etapas.controller";
import { EtapasService } from "./etapas.service";
import { NotificacoesModule } from "../notificacoes/notificacoes.module";
import { EmailModule } from "../email/email.module";
import { QUEUE_LIBERACAO } from "../../../workers/liberacao-parcela.worker";

@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUE_LIBERACAO }),
    NotificacoesModule,
    EmailModule,
  ],
  controllers: [EtapasController],
  providers: [EtapasService],
  exports: [EtapasService],
})
export class EtapasModule {}

import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bull";
import { EtapasController } from "./etapas.controller";
import { EtapasService } from "./etapas.service";
import { QUEUE_LIBERACAO } from "../../../workers/liberacao-parcela.worker";

@Module({
  imports: [BullModule.registerQueue({ name: QUEUE_LIBERACAO })],
  controllers: [EtapasController],
  providers: [EtapasService],
})
export class EtapasModule {}

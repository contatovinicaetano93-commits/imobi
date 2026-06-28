import { Module } from "@nestjs/common";
import { VistoriaController } from "./vistoria.controller";
import { VistoriaService } from "./vistoria.service";
import { EtapasModule } from "../etapas/etapas.module";

@Module({
  imports: [EtapasModule],
  controllers: [VistoriaController],
  providers: [VistoriaService],
})
export class VistoriaModule {}

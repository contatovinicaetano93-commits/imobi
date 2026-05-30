import { Module } from "@nestjs/common";
import { SimuladorController } from "./simulador.controller";
import { SimuladorService } from "./simulador.service";

@Module({
  controllers: [SimuladorController],
  providers: [SimuladorService],
  exports: [SimuladorService],
})
export class SimuladorModule {}

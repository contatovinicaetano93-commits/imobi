import { Module } from "@nestjs/common";
import { CreditoController } from "./credito.controller";
import { CreditoService } from "./credito.service";
import { JornadaModule } from "../jornada/jornada.module";

@Module({
  imports: [JornadaModule],
  controllers: [CreditoController],
  providers: [CreditoService],
})
export class CreditoModule {}

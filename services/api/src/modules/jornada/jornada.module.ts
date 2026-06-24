import { Module } from "@nestjs/common";
import { JornadaController } from "./jornada.controller";
import { JornadaService } from "./jornada.service";
import { KycModule } from "../kyc/kyc.module";
import { ManagerModule } from "../manager/manager.module";
import { DossiesModule } from "../dossies/dossies.module";

@Module({
  imports: [KycModule, ManagerModule, DossiesModule],
  controllers: [JornadaController],
  providers: [JornadaService],
  exports: [JornadaService],
})
export class JornadaModule {}

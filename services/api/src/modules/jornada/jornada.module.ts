import { Module } from "@nestjs/common";
import { JornadaController } from "./jornada.controller";
import { JornadaService } from "./jornada.service";
import { KycModule } from "../kyc/kyc.module";
import { ManagerModule } from "../manager/manager.module";

@Module({
  imports: [KycModule, ManagerModule],
  controllers: [JornadaController],
  providers: [JornadaService],
  exports: [JornadaService],
})
export class JornadaModule {}

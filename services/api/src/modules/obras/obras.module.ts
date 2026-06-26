import { Module } from "@nestjs/common";
import { ObrasController } from "./obras.controller";
import { ObrasService } from "./obras.service";
import { JornadaModule } from "../jornada/jornada.module";

@Module({
  imports: [JornadaModule],
  controllers: [ObrasController],
  providers: [ObrasService],
})
export class ObrasModule {}

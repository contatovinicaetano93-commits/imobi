import { Module, Global } from "@nestjs/common";
import { FluxoController } from "./fluxo.controller";
import { FluxoService } from "./fluxo.service";
import { PrismaModule } from "../prisma/prisma.module";

@Global()
@Module({
  imports: [PrismaModule],
  controllers: [FluxoController],
  providers: [FluxoService],
  exports: [FluxoService],
})
export class FluxoModule {}

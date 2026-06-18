import { Module } from "@nestjs/common";
import { DadosBancariosController } from "./dados-bancarios.controller";
import { DadosBancariosService } from "./dados-bancarios.service";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [DadosBancariosController],
  providers: [DadosBancariosService],
  exports: [DadosBancariosService],
})
export class DadosBancariosModule {}

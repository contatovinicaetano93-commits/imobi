import { Module } from "@nestjs/common";
import { EtapasService } from "./etapas.service";
import { EtapasController } from "./etapas.controller";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  providers: [EtapasService],
  controllers: [EtapasController],
  exports: [EtapasService],
})
export class EtapasModule {}

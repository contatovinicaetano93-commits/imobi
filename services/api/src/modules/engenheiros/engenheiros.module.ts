import { Module } from "@nestjs/common";
import { EngenheirosController } from "./engenheiros.controller";
import { EngenheirosService } from "./engenheiros.service";
import { PrismaModule } from "../prisma/prisma.module";
import { EtapasModule } from "../etapas/etapas.module";

@Module({
  imports: [PrismaModule, EtapasModule],
  controllers: [EngenheirosController],
  providers: [EngenheirosService],
})
export class EngenheirosModule {}

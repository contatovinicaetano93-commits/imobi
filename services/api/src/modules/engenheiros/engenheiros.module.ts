import { Module } from "@nestjs/common";
import { EngenheirosController } from "./engenheiros.controller";
import { EngenheirosService } from "./engenheiros.service";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [EngenheirosController],
  providers: [EngenheirosService],
})
export class EngenheirosModule {}

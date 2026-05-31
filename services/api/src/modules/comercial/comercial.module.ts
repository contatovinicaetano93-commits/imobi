import { Module } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ComercialService } from "./comercial.service";
import { ComercialController } from "./comercial.controller";

@Module({
  controllers: [ComercialController],
  providers: [ComercialService, PrismaService],
  exports: [ComercialService],
})
export class ComercialModule {}

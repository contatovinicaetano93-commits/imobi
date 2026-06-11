import { Module } from "@nestjs/common";
import { DueDiligenceController } from "./due-diligence.controller";
import { DueDiligenceService } from "./due-diligence.service";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [DueDiligenceController],
  providers: [DueDiligenceService],
})
export class DueDiligenceModule {}

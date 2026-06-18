import { Module } from "@nestjs/common";
import { ScoreService } from "./score.service";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  providers: [ScoreService],
  exports: [ScoreService],
})
export class ScoreModule {}

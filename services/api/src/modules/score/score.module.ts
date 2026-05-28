import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { ScoreService } from "./score.service";

@Module({
  imports: [PrismaModule],
  providers: [ScoreService],
  exports: [ScoreService],
})
export class ScoreModule {}

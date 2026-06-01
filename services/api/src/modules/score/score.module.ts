import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { CacheService } from "../../cache.service";
import { ScoreService } from "./score.service";

@Module({
  imports: [PrismaModule],
  providers: [ScoreService, CacheService],
  exports: [ScoreService],
})
export class ScoreModule {}

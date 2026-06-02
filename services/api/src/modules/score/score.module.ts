import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { BullModule } from "@nestjs/bull";
import { PrismaModule } from "../prisma/prisma.module";
import { CacheService } from "../../cache.service";
import { ScoreService } from "./score.service";
import { ScoreUpdateWorker } from "../../workers/score-update.worker";
import { CoreModule } from "../../core/core.module";

@Module({
  imports: [
    BullModule.registerQueue({
      name: "score-update",
    }),
    PrismaModule,
    CoreModule,
  ],
  providers: [ScoreService, CacheService, ...(process.env.NODE_ENV !== "test" ? [ScoreUpdateWorker] : [])],
  exports: [ScoreService],
})
export class ScoreModule {}

import { Module } from "@nestjs/common";
import { ScoreService } from "./score.service";
import { ScoreController } from "./score.controller";
import { CacheAppModule } from "../cache/cache.module";

@Module({
  imports: [CacheAppModule],
  controllers: [ScoreController],
  providers: [ScoreService],
})
export class ScoreModule {}

import { Module } from "@nestjs/common";
import { ScoreController } from "./score.controller";
import { ScoreService } from "./score.service";
import { NotificacoesModule } from "../notificacoes/notificacoes.module";

@Module({
  imports: [NotificacoesModule],
  controllers: [ScoreController],
  providers: [ScoreService],
  exports: [ScoreService],
})
export class ScoreModule {}

import { Module } from "@nestjs/common";
import { CreditoController } from "./credito.controller";
import { CreditoService } from "./credito.service";
import { CreditAnalysisService } from "./credit-analysis.service";
import { ScoreModule } from "../score/score.module";
import { NotificacoesModule } from "../notificacoes/notificacoes.module";

@Module({
  imports: [ScoreModule, NotificacoesModule],
  controllers: [CreditoController],
  providers: [CreditoService, CreditAnalysisService],
})
export class CreditoModule {}

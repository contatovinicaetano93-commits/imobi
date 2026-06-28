import { Module } from "@nestjs/common";
import { CreditoController } from "./credito.controller";
import { CreditoService } from "./credito.service";
import { OperacaoConclusaoService } from "./operacao-conclusao.service";
import { JornadaModule } from "../jornada/jornada.module";
import { NotificacoesModule } from "../notificacoes/notificacoes.module";

@Module({
  imports: [JornadaModule, NotificacoesModule],
  controllers: [CreditoController],
  providers: [CreditoService, OperacaoConclusaoService],
  exports: [OperacaoConclusaoService],
})
export class CreditoModule {}

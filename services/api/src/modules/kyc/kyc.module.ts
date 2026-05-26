import { Module } from "@nestjs/common";
import { KycService } from "./kyc.service";
import { KycController } from "./kyc.controller";
import { NotificacoesModule } from "../notificacoes/notificacoes.module";

@Module({
  imports: [NotificacoesModule],
  controllers: [KycController],
  providers: [KycService],
  exports: [KycService],
})
export class KycModule {}

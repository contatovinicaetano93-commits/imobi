import { Module } from "@nestjs/common";
import { KycService } from "./kyc.service";
import { KycController } from "./kyc.controller";
import { NotificacoesModule } from "../notificacoes/notificacoes.module";
import { EmailModule } from "../email/email.module";

@Module({
  imports: [NotificacoesModule, EmailModule],
  controllers: [KycController],
  providers: [KycService],
  exports: [KycService],
})
export class KycModule {}

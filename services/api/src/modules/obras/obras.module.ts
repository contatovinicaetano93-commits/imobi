import { Module } from "@nestjs/common";
import { ObrasController } from "./obras.controller";
import { ObrasService } from "./obras.service";
import { NotificacoesModule } from "../notificacoes/notificacoes.module";

@Module({
  imports: [NotificacoesModule],
  controllers: [ObrasController],
  providers: [ObrasService],
})
export class ObrasModule {}

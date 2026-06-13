import { Module } from "@nestjs/common";
import { EvidenciasController } from "./evidencias.controller";
import { EvidenciasService } from "./evidencias.service";
import { StorageModule } from "../storage/storage.module";
import { NotificacoesModule } from "../notificacoes/notificacoes.module";

@Module({
  imports: [StorageModule, NotificacoesModule],
  controllers: [EvidenciasController],
  providers: [EvidenciasService],
})
export class EvidenciasModule {}

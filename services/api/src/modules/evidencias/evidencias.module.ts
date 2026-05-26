import { Module } from "@nestjs/common";
import { EvidenciasController } from "./evidencias.controller";
import { EvidenciasService } from "./evidencias.service";
import { StorageModule } from "../storage/storage.module";

@Module({
  imports: [StorageModule],
  controllers: [EvidenciasController],
  providers: [EvidenciasService],
})
export class EvidenciasModule {}

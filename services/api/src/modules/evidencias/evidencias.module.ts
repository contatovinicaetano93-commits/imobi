import { Module } from "@nestjs/common";
import { EvidenciasController } from "./evidencias.controller";
import { EvidenciasService } from "./evidencias.service";
import { StorageModule } from "../storage/storage.module";
import { CacheAppModule } from "../cache/cache.module";

@Module({
  imports: [StorageModule, CacheAppModule],
  controllers: [EvidenciasController],
  providers: [EvidenciasService],
})
export class EvidenciasModule {}

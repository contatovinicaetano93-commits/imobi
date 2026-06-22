import { Module } from "@nestjs/common";
import { ManagerService } from "./manager.service";
import { ManagerController } from "./manager.controller";
import { EtapasModule } from "../etapas/etapas.module";
import { KycModule } from "../kyc/kyc.module";
import { StorageModule } from "../storage/storage.module";

@Module({
  imports: [EtapasModule, KycModule, StorageModule],
  controllers: [ManagerController],
  providers: [ManagerService],
  exports: [ManagerService],
})
export class ManagerModule {}

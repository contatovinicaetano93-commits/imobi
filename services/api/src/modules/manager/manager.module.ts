import { Module } from "@nestjs/common";
import { CacheModule } from "@nestjs/cache-manager";
import { ManagerService } from "./manager.service";
import { ManagerController } from "./manager.controller";
import { EtapasModule } from "../etapas/etapas.module";
import { KycModule } from "../kyc/kyc.module";

@Module({
  imports: [CacheModule.register({ ttl: 300000 }), EtapasModule, KycModule],
  controllers: [ManagerController],
  providers: [ManagerService],
  exports: [ManagerService],
})
export class ManagerModule {}

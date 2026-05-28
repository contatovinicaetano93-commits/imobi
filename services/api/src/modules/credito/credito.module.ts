import { Module } from "@nestjs/common";
import { CreditoController } from "./credito.controller";
import { CreditoService } from "./credito.service";
import { CacheAppModule } from "../cache/cache.module";

@Module({
  imports: [CacheAppModule],
  controllers: [CreditoController],
  providers: [CreditoService],
})
export class CreditoModule {}

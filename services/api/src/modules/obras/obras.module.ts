import { Module } from "@nestjs/common";
import { ObrasController } from "./obras.controller";
import { ObrasService } from "./obras.service";
import { CacheAppModule } from "../cache/cache.module";

@Module({
  imports: [CacheAppModule],
  controllers: [ObrasController],
  providers: [ObrasService],
})
export class ObrasModule {}

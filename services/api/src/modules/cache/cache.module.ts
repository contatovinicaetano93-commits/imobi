import { Module } from "@nestjs/common";
import { CacheModule as NestCacheModule } from "@nestjs/cache-manager";
import { CacheService } from "./cache.service";

@Module({
  imports: [NestCacheModule.register({ isGlobal: true, ttl: 300000 })],
  providers: [CacheService],
  exports: [CacheService],
})
export class CacheModule {}

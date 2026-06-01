import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { Redis } from "ioredis";

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private redis: Redis;

  onModuleInit() {
    const redisHost = process.env.REDIS_HOST || "localhost";
    const redisPort = Number(process.env.REDIS_PORT || 6379);
    this.redis = new Redis({
      host: redisHost,
      port: redisPort,
      retryStrategy: (times) => Math.min(times * 50, 2000),
    });
  }

  onModuleDestroy() {
    return this.redis.quit();
  }

  async get<T>(key: string): Promise<T | null> {
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    await this.redis.setex(key, ttlSeconds, JSON.stringify(value));
  }

  async delete(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async deletePattern(pattern: string): Promise<void> {
    let cursor = 0;
    const batchSize = 100;
    do {
      const [nextCursor, keys] = await this.redis.scan(
        cursor,
        "MATCH",
        pattern,
        "COUNT",
        batchSize.toString(),
      );
      cursor = parseInt(nextCursor);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } while (cursor !== 0);
  }

  async invalidateUserCache(usuarioId: string): Promise<void> {
    await this.deletePattern(`user:${usuarioId}:*`);
  }

  async invalidateObraCache(obraId: string): Promise<void> {
    await this.deletePattern(`obra:${obraId}:*`);
  }
}

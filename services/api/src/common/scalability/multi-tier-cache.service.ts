import { Injectable } from '@nestjs/common';
import { PrometheusService } from '../observability/prometheus.service';

export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * Multi-tier caching implementation:
 * L1: In-memory cache (fast, limited size)
 * L2: Redis (distributed, larger size)
 * L3: Database (source of truth)
 *
 * Retrieval: Check L1 → L2 → Database → Populate L1/L2
 * Update: Update Database → Invalidate L1/L2
 */
@Injectable()
export class MultiTierCacheService {
  private readonly l1Cache = new Map<string, CacheEntry<any>>();
  private readonly l1MaxSize = 1000;
  private readonly l1TtlMs = 60000; // 1 minute
  private readonly l2TtlMs = 600000; // 10 minutes

  constructor(
    // private readonly redis: RedisService,  // To be injected
    private readonly prometheus: PrometheusService,
  ) {}

  /**
   * Get value from cache, checking all tiers in order
   */
  async get<T>(key: string): Promise<T | null> {
    // L1: In-memory cache
    const l1Entry = this.l1Cache.get(key);
    if (l1Entry && l1Entry.expiresAt > Date.now()) {
      this.prometheus.recordCacheHit('l1', true);
      return l1Entry.value as T;
    }

    // L2: Redis (would be implemented with actual Redis service)
    // const l2Entry = await this.redis.get(key);
    // if (l2Entry) {
    //   this.prometheus.recordCacheHit('l2', true);
    //   const value = JSON.parse(l2Entry) as T;
    //   this.setL1(key, value);
    //   return value;
    // }

    // L3: Database (return null, caller will fetch from DB)
    this.prometheus.recordCacheHit('l3', false);
    return null;
  }

  /**
   * Set value in cache (all tiers)
   */
  async set<T>(key: string, value: T, ttlSeconds: number = 600): Promise<void> {
    // L1: In-memory
    this.setL1(key, value);

    // L2: Redis (would be implemented with actual Redis service)
    // await this.redis.setex(key, ttlSeconds, JSON.stringify(value));
  }

  /**
   * Invalidate cache (all tiers)
   */
  async invalidate(key: string): Promise<void> {
    // L1: In-memory
    this.l1Cache.delete(key);

    // L2: Redis
    // await this.redis.del(key);
  }

  /**
   * Invalidate cache by pattern (all tiers)
   */
  async invalidatePattern(pattern: string): Promise<void> {
    // L1: In-memory
    for (const key of this.l1Cache.keys()) {
      if (key.match(pattern)) {
        this.l1Cache.delete(key);
      }
    }

    // L2: Redis
    // const keys = await this.redis.keys(pattern);
    // if (keys.length > 0) {
    //   await this.redis.del(...keys);
    // }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    l1Size: number;
    l1MaxSize: number;
    l1TtlMs: number;
    l2TtlMs: number;
  } {
    return {
      l1Size: this.l1Cache.size,
      l1MaxSize: this.l1MaxSize,
      l1TtlMs: this.l1TtlMs,
      l2TtlMs: this.l2TtlMs,
    };
  }

  /**
   * Clear all caches (use with caution)
   */
  async clear(): Promise<void> {
    this.l1Cache.clear();
    // await this.redis.flushdb();
  }

  private setL1<T>(key: string, value: T): void {
    // Evict oldest entry if cache is full (simple LRU)
    if (this.l1Cache.size >= this.l1MaxSize) {
      const firstKey = this.l1Cache.keys().next().value;
      if (firstKey) {
        this.l1Cache.delete(firstKey);
      }
    }

    this.l1Cache.set(key, {
      value,
      expiresAt: Date.now() + this.l1TtlMs,
    });
  }
}

import { Injectable, Inject } from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";

@Injectable()
export class CacheService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async get<T>(key: string): Promise<T | null> {
    return this.cacheManager.get<T>(key) ?? null;
  }

  async set<T>(key: string, value: T, ttlMs: number = 300000): Promise<void> {
    await this.cacheManager.set(key, value, ttlMs);
  }

  async invalidate(key: string): Promise<void> {
    await this.cacheManager.del(key);
  }

  async invalidatePattern(pattern: string): Promise<void> {
    const keys = await (this.cacheManager as any).stores?.keys?.() ?? await (this.cacheManager as any).store?.keys?.() ?? [];
    const matchingKeys = keys.filter((key) => key.includes(pattern));
    await Promise.all(matchingKeys.map((key) => this.cacheManager.del(key)));
  }

  // Specific cache keys and TTLs for different data types
  static readonly KEYS = {
    USER_PROFILE: (usuarioId: string) => `user:profile:${usuarioId}`,
    USER_SCORE: (usuarioId: string) => `user:score:${usuarioId}`,
    OBRA_DETAIL: (obraId: string) => `obra:detail:${obraId}`,
    CREDITO_DETAIL: (creditoId: string) => `credito:detail:${creditoId}`,
    MANAGER_STATS: "manager:stats",
    PARCEIROS_LIST: (especialidade: string, minAvaliacao: number) =>
      `parceiros:list:${especialidade}:${minAvaliacao}`,
    PARCEIRO_DETAIL: (parceiroId: string) => `parceiro:detail:${parceiroId}`,
  };

  static readonly TTL = {
    SHORT: 60000, // 1 minute
    MEDIUM: 300000, // 5 minutes
    LONG: 600000, // 10 minutes
  };
}

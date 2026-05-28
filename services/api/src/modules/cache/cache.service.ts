import { Injectable, Inject } from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";
import { globalMetrics } from "./performance.metrics";

export const CACHE_KEYS = {
  // Score caching (1 hour TTL)
  SCORE: (usuarioId: string) => `score:${usuarioId}`,
  SCORE_HISTORY: (usuarioId: string) => `scoreHistory:${usuarioId}`,

  // Profile caching (15 min TTL)
  PERFIL_USUARIO: (usuarioId: string) => `profile:${usuarioId}`,

  // Works list caching (5 min TTL)
  OBRAS_USUARIO: (usuarioId: string) => `obras:${usuarioId}`,

  // Credits caching (10 min TTL)
  CREDITOS_USUARIO: (usuarioId: string) => `creditos:${usuarioId}`,

  // Work details caching (5 min TTL)
  OBRA_DETALHE: (obraId: string) => `obra_detalhe:${obraId}`,

  // Work steps caching (5 min TTL)
  ETAPAS_OBRA: (obraId: string) => `etapas_obra:${obraId}`,
};

@Injectable()
export class CacheService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  private async withCache<T>(
    cacheKey: string,
    ttl: number,
    metricName: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const inicio = performance.now();
    const cached = await this.cacheManager.get<T>(cacheKey);

    if (cached) {
      const duracao = performance.now() - inicio;
      globalMetrics.record(metricName, duracao, true);
      return cached;
    }

    const resultado = await fn();
    const duracao = performance.now() - inicio;
    globalMetrics.record(metricName, duracao, false);
    await this.cacheManager.set(cacheKey, resultado, ttl);
    return resultado;
  }

  // Score caching (1 hour = 3600000ms)
  async obterScoreComCache<T>(usuarioId: string, fn: () => Promise<T>): Promise<T> {
    return this.withCache(
      CACHE_KEYS.SCORE(usuarioId),
      3600000,
      "score",
      fn
    );
  }

  // Profile caching (15 min = 900000ms)
  async obterPerfilComCache<T>(usuarioId: string, fn: () => Promise<T>): Promise<T> {
    return this.withCache(
      CACHE_KEYS.PERFIL_USUARIO(usuarioId),
      900000,
      "profile",
      fn
    );
  }

  // Works list caching (5 min = 300000ms)
  async obterObrasComCache<T>(usuarioId: string, fn: () => Promise<T>): Promise<T> {
    return this.withCache(
      CACHE_KEYS.OBRAS_USUARIO(usuarioId),
      300000,
      "works",
      fn
    );
  }

  // Credit statement caching (5 min = 300000ms)
  async obterExtratoComCache<T>(creditoId: string, fn: () => Promise<T>): Promise<T> {
    return this.withCache(
      `credito:extrato:${creditoId}`,
      300000,
      "creditoExtrato",
      fn
    );
  }

  // Work bounds caching (1 hour = 3600000ms)
  async obterObraBoundsComCache<T>(obraId: string, fn: () => Promise<T>): Promise<T> {
    return this.withCache(
      `obra:bounds:${obraId}`,
      3600000,
      "obraBounds",
      fn
    );
  }

  // Score history caching (1 hour = 3600000ms)
  async obterHistoricoComCache<T>(usuarioId: string, limit: number, fn: () => Promise<T>): Promise<T> {
    return this.withCache(
      `${CACHE_KEYS.SCORE_HISTORY(usuarioId)}:${limit}`,
      3600000,
      "scoreHistory",
      fn
    );
  }

  // Cache invalidation methods
  async invalidarScore(usuarioId: string): Promise<void> {
    await this.cacheManager.del(CACHE_KEYS.SCORE(usuarioId));
  }

  async invalidarHistoricoScore(usuarioId: string, limit?: number): Promise<void> {
    if (limit) {
      await this.cacheManager.del(`${CACHE_KEYS.SCORE_HISTORY(usuarioId)}:${limit}`);
    } else {
      // Clear all score history for this user - pattern-based approach
      // Since cache-manager doesn't have reset for patterns, we'll need to clear manually
      const patterns = [
        CACHE_KEYS.SCORE_HISTORY(usuarioId),
      ];
      for (const pattern of patterns) {
        try {
          await this.cacheManager.del(pattern);
        } catch (e) {
          // Pattern might not exist, continue
        }
      }
    }
  }

  async invalidarPerfil(usuarioId: string): Promise<void> {
    await this.cacheManager.del(CACHE_KEYS.PERFIL_USUARIO(usuarioId));
  }

  async invalidarObras(usuarioId: string): Promise<void> {
    await this.cacheManager.del(CACHE_KEYS.OBRAS_USUARIO(usuarioId));
  }

  async invalidarTudo(usuarioId: string): Promise<void> {
    await Promise.all([
      this.invalidarScore(usuarioId),
      this.invalidarPerfil(usuarioId),
      this.invalidarObras(usuarioId),
    ]);
  }

  // Helper to measure performance
  async medirPerformance<T>(
    descricao: string,
    fn: () => Promise<T>
  ): Promise<{ resultado: T; tempoMs: number }> {
    const inicio = performance.now();
    const resultado = await fn();
    const tempoMs = performance.now() - inicio;

    console.log(`[PERF] ${descricao}: ${tempoMs.toFixed(2)}ms`);

    return { resultado, tempoMs };
  }

  // Phase 3: Performance metrics reporting
  getPerformanceReport() {
    return {
      summary: globalMetrics.getAllSummaries(),
      totals: {
        totalRequests: globalMetrics.getMetrics().length,
        averageResponseTime: this.calculateAverageResponseTime(),
      },
    };
  }

  private calculateAverageResponseTime(): number {
    const metrics = globalMetrics.getMetrics();
    if (metrics.length === 0) return 0;
    const total = metrics.reduce((sum, m) => sum + m.durationMs, 0);
    return Math.round((total / metrics.length) * 100) / 100;
  }

  resetPerformanceMetrics(): void {
    globalMetrics.reset();
  }
}

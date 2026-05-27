export interface PerformanceMetric {
  operation: string;
  durationMs: number;
  cached: boolean;
  timestamp: Date;
}

export class PerformanceMetrics {
  private metrics: PerformanceMetric[] = [];

  record(operation: string, durationMs: number, cached: boolean): void {
    this.metrics.push({
      operation,
      durationMs,
      cached,
      timestamp: new Date(),
    });
  }

  getMetrics(operation?: string): PerformanceMetric[] {
    if (!operation) return this.metrics;
    return this.metrics.filter((m) => m.operation === operation);
  }

  getSummary(operation: string) {
    const metrics = this.getMetrics(operation);
    if (metrics.length === 0) return null;

    const cached = metrics.filter((m) => m.cached);
    const uncached = metrics.filter((m) => !m.cached);

    const avg = (arr: PerformanceMetric[]) =>
      arr.length ? arr.reduce((sum, m) => sum + m.durationMs, 0) / arr.length : 0;

    return {
      operation,
      totalRequests: metrics.length,
      cachedRequests: cached.length,
      uncachedRequests: uncached.length,
      avgCachedMs: Math.round(avg(cached) * 100) / 100,
      avgUncachedMs: Math.round(avg(uncached) * 100) / 100,
      improvement: uncached.length > 0
        ? Math.round((1 - avg(cached) / avg(uncached)) * 100)
        : 0,
    };
  }

  getAllSummaries() {
    const operations = [...new Set(this.metrics.map((m) => m.operation))];
    return operations.map((op) => this.getSummary(op)).filter((s) => s !== null);
  }

  reset(): void {
    this.metrics = [];
  }
}

export const globalMetrics = new PerformanceMetrics();

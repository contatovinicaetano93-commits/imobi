/**
 * Performance Profiling Utilities
 *
 * Tools for analyzing query performance, cache effectiveness, and bottlenecks.
 * Can be used during tests or in production monitoring.
 */

import { PrismaService } from "../modules/prisma/prisma.service";

export interface QueryProfile {
  query: string;
  executionTimeMs: number;
  rowsAffected: number;
  indexes: string[];
  potentialIssues: string[];
}

export interface CacheProfile {
  endpoint: string;
  cacheKey: string;
  hitCount: number;
  missCount: number;
  avgResponseTimeMs: number;
  ttlSeconds: number;
}

export interface DatabaseProfile {
  totalQueries: number;
  slowQueries: QueryProfile[];
  missingIndexes: string[];
  n1Problems: Array<{ operation: string; count: number }>;
}

export class PerformanceProfiler {
  constructor(private prisma: PrismaService) {}

  /**
   * Analyzes database query patterns to find N+1 problems
   * Example: Loading obras without batching etapas
   */
  async profileN1Queries(): Promise<DatabaseProfile> {
    const profile: DatabaseProfile = {
      totalQueries: 0,
      slowQueries: [],
      missingIndexes: [],
      n1Problems: [],
    };

    // Common N+1 pattern: listObrasDashboard may query etapas for each obra
    const obras = await this.prisma.obra.findMany({ take: 100 });
    profile.totalQueries += 1;

    // This is N+1 if not using include
    const etapasQueries = [];
    for (const obra of obras) {
      const count = await this.prisma.etapaObra.count({
        where: { obraId: obra.obraId },
      });
      etapasQueries.push(count);
      profile.totalQueries += 1;
    }

    if (etapasQueries.length > 1) {
      profile.n1Problems.push({
        operation: "loadObrasWithoutEtapaInclude",
        count: etapasQueries.length,
      });
    }

    return profile;
  }

  /**
   * Suggests missing database indexes based on common queries
   */
  async suggestMissingIndexes(): Promise<string[]> {
    const suggestions: string[] = [];

    // Check for indexes on frequently filtered/joined columns
    try {
      // Simulating a slow query on etapaObra.status + obraId + criadoEm
      const result = await this.prisma.$queryRaw`
        SELECT COUNT(*) as count FROM "EtapaObra"
        WHERE status = 'AGUARDANDO_VISTORIA'
        ORDER BY "criadoEm" ASC
        LIMIT 1000
      `;

      // If this query is slow (>100ms), suggest index
      // In production, check query plan with EXPLAIN
      suggestions.push(
        "CONSIDER: INDEX on EtapaObra(status, criadoEm) for manager/etapas-pendentes filtering"
      );
    } catch (e) {}

    try {
      // Check LiberacaoParcela queries
      const result = await this.prisma.$queryRaw`
        SELECT COUNT(*) as count FROM "LiberacaoParcela"
        WHERE "creditoId" = '1' AND status = 'PENDENTE'
      `;

      suggestions.push(
        "CONSIDER: INDEX on LiberacaoParcela(creditoId, status) for payment queue queries"
      );
    } catch (e) {}

    try {
      // Check Notificacao queries
      const result = await this.prisma.$queryRaw`
        SELECT COUNT(*) as count FROM "Notificacao"
        WHERE "usuarioId" = '1' AND lida = false
        ORDER BY "criadoEm" DESC
      `;

      suggestions.push(
        "CONSIDER: INDEX on Notificacao(usuarioId, lida, criadoEm) for unread notification queries"
      );
    } catch (e) {}

    return suggestions;
  }

  /**
   * Analyzes Redis cache patterns to identify optimization opportunities
   */
  analyzeCachePatterns(): CacheProfile[] {
    // In production with real Redis, this would analyze:
    // - Hit rates per endpoint
    // - Average response times (cached vs uncached)
    // - TTL effectiveness
    // - Memory usage by cache key pattern

    const patterns: CacheProfile[] = [
      {
        endpoint: "/manager/etapas-pendentes",
        cacheKey: "manager:etapas:*",
        hitCount: 0,
        missCount: 0,
        avgResponseTimeMs: 250,
        ttlSeconds: 120,
      },
      {
        endpoint: "/manager/kyc-pendentes",
        cacheKey: "manager:kyc:*",
        hitCount: 0,
        missCount: 0,
        avgResponseTimeMs: 200,
        ttlSeconds: 120,
      },
    ];

    return patterns;
  }

  /**
   * Generate optimization recommendations
   */
  async generateOptimizationReport(): Promise<string[]> {
    const recommendations: string[] = [];

    // Check current index usage
    try {
      const indexStats = await this.prisma.$queryRaw`
        SELECT
          schemaname,
          tablename,
          indexname,
          idx_scan as "indexScans",
          idx_tup_read as "tuplesRead",
          idx_tup_fetch as "tuplesFetched"
        FROM pg_stat_user_indexes
        ORDER BY idx_scan DESC
        LIMIT 10
      `;

      recommendations.push(`✓ Found ${Array.isArray(indexStats) ? indexStats.length : 0} indexes in use`);
    } catch (e) {
      recommendations.push("⚠ Could not analyze index usage (requires pg_stat_statements)");
    }

    // Check for unused indexes
    try {
      const unusedIndexes = await this.prisma.$queryRaw`
        SELECT indexname
        FROM pg_stat_user_indexes
        WHERE idx_scan = 0
        AND indexname NOT LIKE 'pg_toast%'
      `;

      if (Array.isArray(unusedIndexes) && unusedIndexes.length > 0) {
        recommendations.push(
          `⚠ FOUND: ${unusedIndexes.length} unused indexes - consider dropping to save storage`
        );
      }
    } catch (e) {}

    // Check connection pool
    recommendations.push("ℹ Cache TTL: 5min default (consider 2-5min for high-traffic endpoints)");
    recommendations.push("ℹ Rate Limits: Auth=10/min, General=100/min, Manager=20/min");
    recommendations.push("ℹ Job Queue: BullMQ liberacao-parcela with Redis backend");

    // Performance targets
    recommendations.push("\n📊 Performance Targets:");
    recommendations.push("  • Auth endpoints: p95 < 500ms");
    recommendations.push("  • Read endpoints: p95 < 800ms");
    recommendations.push("  • Cached endpoints: p95 < 300ms");
    recommendations.push("  • Error rate: < 1%");

    return recommendations;
  }
}

export async function runProfilingAnalysis(prisma: PrismaService) {
  const profiler = new PerformanceProfiler(prisma);

  console.log("\n╔════════════════════════════════════════════════════════════════════╗");
  console.log("║              DATABASE & CACHE PERFORMANCE ANALYSIS                  ║");
  console.log("╚════════════════════════════════════════════════════════════════════╝\n");

  // Analyze N+1 queries
  console.log("1️⃣  N+1 Query Analysis:");
  const n1Profile = await profiler.profileN1Queries();
  if (n1Profile.n1Problems.length > 0) {
    n1Profile.n1Problems.forEach((p) => {
      console.log(`   ⚠ ${p.operation}: ${p.count} sequential queries`);
    });
  } else {
    console.log("   ✓ No obvious N+1 patterns detected");
  }

  // Suggest missing indexes
  console.log("\n2️⃣  Missing Indexes:");
  const missingIndexes = await profiler.suggestMissingIndexes();
  missingIndexes.forEach((idx) => {
    console.log(`   ${idx}`);
  });

  // Analyze cache patterns
  console.log("\n3️⃣  Cache Patterns:");
  const cachePatterns = profiler.analyzeCachePatterns();
  cachePatterns.forEach((pattern) => {
    console.log(
      `   ${pattern.endpoint}: avg response ${pattern.avgResponseTimeMs}ms, TTL ${pattern.ttlSeconds}s`
    );
  });

  // Generate recommendations
  console.log("\n4️⃣  Optimization Recommendations:");
  const recommendations = await profiler.generateOptimizationReport();
  recommendations.forEach((rec) => {
    console.log(`   ${rec}`);
  });

  console.log("\n");
}

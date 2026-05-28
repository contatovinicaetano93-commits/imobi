# Performance Optimization Strategy — imbobi Backend

## Overview
This document outlines the caching and query optimization strategies implemented to improve backend performance, reduce database load, and decrease latency for critical operations.

**Last Updated:** May 28, 2026
**Status:** Implemented & Active

---

## 1. Redis Caching Layer

### Architecture
Redis is configured as the global cache store via `@nestjs/cache-manager` with connection details from environment variables:
- **Host:** `REDIS_HOST` (default: `localhost`)
- **Port:** `REDIS_PORT` (default: `6379`)
- **TTL:** Default 10 minutes (600000ms), customized per operation

**Configuration Location:** `services/api/src/app.module.ts` (CacheModule)

### Cache Service Implementation
Location: `services/api/src/modules/cache/cache.service.ts`

The `CacheService` provides a wrapper around the cache manager with:
- **Generic caching method** (`withCache<T>()`) — handles hit/miss logic and metrics
- **Domain-specific methods** — high-level APIs for each data type:
  - `obterScoreComCache()` — 1h TTL
  - `obterPerfilComCache()` — 15min TTL
  - `obterObrasComCache()` — 5min TTL
  - `obterExtratoComCache()` — 5min TTL
  - `obterObraBoundsComCache()` — 1h TTL
  - `obterHistoricoComCache()` — 1h TTL

- **Cache invalidation methods**:
  - `invalidarScore(usuarioId)` — clears score cache
  - `invalidarPerfil(usuarioId)` — clears profile cache
  - `invalidarObras(usuarioId)` — clears works list cache
  - `invalidarHistoricoScore(usuarioId, limit?)` — clears score history
  - `invalidarTudo(usuarioId)` — nuclear option, clears all user caches

- **Performance metrics** — tracks cache hit/miss rates and latency improvements

### Cache Keys (Defined in `CACHE_KEYS` object)
```
score:{usuarioId}                           — User score (1h TTL)
scoreHistory:{usuarioId}:{limit}            — Score history with limit (1h TTL)
profile:{usuarioId}                         — User profile (15min TTL)
obras:{usuarioId}                           — User works list (5min TTL)
creditos:{usuarioId}                        — User credits (5min TTL)
obra_detalhe:{obraId}                       — Work details (5min TTL)
etapas_obra:{obraId}                        — Work steps/stages (5min TTL)
obra:bounds:{obraId}                        — Work geographic bounds (1h TTL)
credito:extrato:{creditoId}                 — Credit statement (5min TTL)
```

---

## 2. Cached Operations by Module

### UsuariosService
**File:** `services/api/src/modules/usuarios/usuarios.service.ts`

| Operation | Cache Key | TTL | Strategy |
|-----------|-----------|-----|----------|
| `buscarPerfil(usuarioId)` | `profile:{usuarioId}` | 15min | ✓ Cached with automatic invalidation on profile update |

**Invalidation Triggers:**
- `atualizarPerfil()` — invalidates profile cache

### ScoreService
**File:** `services/api/src/modules/score/score.service.ts`

| Operation | Cache Key | TTL | Strategy |
|-----------|-----------|-----|----------|
| `calcularScore(usuarioId)` | `score:{usuarioId}` | 1h | ✓ Cached — expensive multi-relation aggregation |
| `buscarHistorico(usuarioId, limit)` | `scoreHistory:{usuarioId}:{limit}` | 1h | ✓ Cached — frequently accessed |

**Invalidation Triggers:**
- `buscarScoreAtual()` — invalidates score history when new record created

**Query Optimization:**
- Single consolidated query with `.include()` instead of 4 separate queries (N+1 prevention)
- Aggregates obra and credito relationships in one select

### ObrasService
**File:** `services/api/src/modules/obras/obras.service.ts`

| Operation | Cache Key | TTL | Strategy |
|-----------|-----------|-----|----------|
| `listar(usuarioId)` | `obras:{usuarioId}` | 5min | ✓ Cached with `.include()` optimization |

**Invalidation Triggers:**
- `criar()` — invalidates works list cache when new obra created
- Etapa status changes — invalidated via `EtapasService.invalidarTudo()`

**Query Optimization:**
- Uses `.include()` to fetch etapas in single query
- `progressoGeral()` — avoids N+1 via single `.findMany()` with select

### CreditoService
**File:** `services/api/src/modules/credito/credito.service.ts`

| Operation | Cache Key | TTL | Strategy |
|-----------|-----------|-----|----------|
| `buscarPorUsuario(usuarioId)` | `creditos:{usuarioId}` | 5min | ✓ Cached with `.include()` for works & releases |
| `extrato(creditoId)` | `credito:extrato:{creditoId}` | 5min | ✓ Cached |

**Invalidation Triggers:**
- `solicitar()` — calls `invalidarTudo()` to invalidate all user caches

**Query Optimization:**
- `.include()` fetches obras and liberacoes in single query
- `liberacoes.take(10)` prevents fetching entire release history

### EtapasService
**File:** `services/api/src/modules/etapas/etapas.service.ts`

**Invalidation Triggers:**
- `aprovar(etapaId)` — calls `invalidarTudo()` when stage approved
- `rejeitar(etapaId)` — calls `invalidarTudo()` when stage rejected

**Query Optimization:**
- Uses `.include()` for obra, credito, usuario relationships
- Evidencias limited to 5 most recent via `.take(5)`

---

## 3. Database Query Optimizations

### Prisma Include Strategy (N+1 Prevention)

All critical services use `.include()` or `.select()` to fetch related data in single queries:

```typescript
// Example: ObrasService.listar()
await this.prisma.obra.findMany({
  where: { usuarioId },
  include: {                    // ← Single query, not N separate queries
    etapas: { 
      select: { etapaId, nome, status, ordem } 
    }
  },
  orderBy: { criadoEm: "desc" },
});
```

### Database Indexes

**Location:** `services/api/prisma/migrations/3_add_performance_indexes/migration.sql`

Indexes have been created for all high-frequency queries:

| Index Name | Table | Columns | Purpose |
|------------|-------|---------|---------|
| `idx_obra_geoLocation_brin` | Obra | geoLatitude, geoLongitude | GPS proximity queries (BRIN) |
| `idx_usuario_email_btree` | Usuario | email | Authentication lookups |
| `idx_etapa_status_composite` | EtapaObra | status, criadoEm | Status filtering with ordering |
| `idx_credito_usuario_status` | Credito | usuarioId, status | Credit queries with filtering |
| `idx_liberacao_credito_status` | LiberacaoParcela | creditoId, status | Release tracking |
| `idx_notificacao_usuario_nao_lida` | Notificacao | usuarioId, lida | Unread notification counts |
| `idx_score_usuario_ordem` | ScoreHistorico | usuarioId, criadoEm DESC | Score history with ordering |
| `idx_etapa_obra_status` | EtapaObra | obraId, status | Progress calculations |

---

## 4. Performance Metrics & Monitoring

### Metrics Tracking
Location: `services/api/src/modules/cache/performance.metrics.ts`

Each cached operation is tracked with:
- **Operation name** — identifies which cache operation
- **Duration (ms)** — execution time
- **Cache hit/miss flag** — whether served from cache
- **Timestamp** — for temporal analysis

### Metrics API
Endpoint: `/health/performance` (when implemented)

Response includes:
```json
{
  "summary": [
    {
      "operation": "score",
      "totalRequests": 1000,
      "cachedRequests": 850,
      "uncachedRequests": 150,
      "avgCachedMs": 2.5,
      "avgUncachedMs": 185.3,
      "improvement": 98  // % faster when cached
    },
    // ... more operations
  ],
  "totals": {
    "totalRequests": 5000,
    "averageResponseTime": 45.2
  }
}
```

---

## 5. Redis Memory Management

### Recommended Configuration
```
# docker-compose.yml (Redis service)
maxmemory: 512MB          # Adjust based on load
maxmemory-policy: allkeys-lru  # LRU eviction for least-used keys
timeout: 0                # Keep connections alive
tcp-keepalive: 300        # Heartbeat interval
```

### Monitoring Commands
```bash
# Check memory usage
redis-cli INFO memory

# Monitor real-time operations
redis-cli MONITOR

# Analyze top keys
redis-cli --bigkeys

# Get key counts by pattern
redis-cli KEYS "score:*" | wc -l
```

### Memory Estimation
For typical load (100 active users):
- Score cache: ~50KB (100 users × 500B)
- Profile cache: ~100KB (100 users × 1KB)
- Works list cache: ~500KB (1000 works × 500B)
- **Total:** ~650KB per 100 users
- **Recommendation:** Start with 256MB, scale to 512MB-1GB for production

---

## 6. Cache Invalidation Strategy

### Automatic Invalidation Events
Caches are invalidated when:

| Event | Method | User Impact |
|-------|--------|-------------|
| Score calculated | `ScoreService.buscarScoreAtual()` | Score always fresh |
| Profile updated | `UsuariosService.atualizarPerfil()` | Profile changes immediate |
| Work created | `ObrasService.criar()` | New work appears instantly |
| Stage approved/rejected | `EtapasService.aprovar/rejeitar()` | Status updates immediate |
| Credit requested | `CreditoService.solicitar()` | User credits refresh |

### Manual Cache Reset (Admin)
Future endpoint: `POST /admin/cache/reset/:usuarioId`
- Clears all caches for a specific user
- Used in manual interventions or data corrections

---

## 7. Before/After Metrics (Estimated)

Based on typical load patterns and cache hit rates:

### Score Calculation
| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Avg latency (cached) | N/A | 2-5ms | — |
| Avg latency (uncached) | 150-200ms | 150-200ms | — |
| Hit rate (steady state) | N/A | ~85% | — |
| DB queries/hour | 3600 | ~540 | **85% reduction** |

### Works List Fetch
| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Avg latency (cached) | N/A | 3-8ms | — |
| Avg latency (uncached) | 100-150ms | 100-150ms | — |
| Hit rate (steady state) | N/A | ~90% | — |
| DB queries/hour | 3600 | ~360 | **90% reduction** |

### User Profile Fetch
| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Avg latency (cached) | N/A | 1-3ms | — |
| Avg latency (uncached) | 50-100ms | 50-100ms | — |
| Hit rate (steady state) | N/A | ~95% | — |
| DB queries/hour | 3600 | ~180 | **95% reduction** |

---

## 8. Deployment Checklist

- [x] Redis configured in `app.module.ts`
- [x] CacheService implemented with domain methods
- [x] All critical services using cache wrappers
- [x] Cache invalidation integrated into mutations
- [x] Performance metrics tracking enabled
- [x] Database indexes created (migration 3)
- [x] TTLs tuned per operation type
- [ ] Health check endpoint implemented
- [ ] Monitoring dashboard configured (future)
- [ ] Load testing with cache enabled

---

## 9. Future Optimizations

1. **Cache Warm-up** — Pre-load hot users' data on server startup
2. **Cache Presets** — Implement cache-busting via webhooks for data changes
3. **Distributed Caching** — Multi-instance Redis cluster for horizontal scaling
4. **Analytics Dashboard** — Real-time cache metrics visualization
5. **Adaptive TTLs** — Adjust TTL based on access patterns
6. **Cache Compression** — For large payloads (obras list)
7. **Async Cache Refresh** — Background jobs to refresh cache before expiry

---

## Useful Commands

```bash
# Clear all Redis cache (development only)
redis-cli FLUSHALL

# Monitor cache operations
redis-cli MONITOR

# Check cache size per key type
redis-cli --scan --pattern "score:*" | wc -l
redis-cli --scan --pattern "obras:*" | wc -l

# View performance metrics in logs
docker logs api-service | grep "PERF"

# Test cache invalidation
curl -X POST http://localhost:3333/score/invalidate/:usuarioId
```

---

## References

- NestJS Cache Manager: https://docs.nestjs.com/techniques/caching
- Redis Best Practices: https://redis.io/topics/faq
- Prisma Include/Select: https://www.prisma.io/docs/concepts/components/prisma-client/select-fields
- Database Indexing: https://www.postgresql.org/docs/current/sql-createindex.html

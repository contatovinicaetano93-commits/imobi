# Performance Optimization Guide - imbobi API

> **Last Updated:** May 28, 2026
> **Baseline Performance:** p95 < 200ms, p99 < 500ms for critical paths

## Table of Contents

1. [Performance Targets](#performance-targets)
2. [Database Optimization](#database-optimization)
3. [Caching Strategy](#caching-strategy)
4. [API Response Optimization](#api-response-optimization)
5. [Query Optimization Patterns](#query-optimization-patterns)
6. [Monitoring & Metrics](#monitoring--metrics)

## Performance Targets

| Metric | Target | Severity |
|--------|--------|----------|
| p50 Latency | < 50ms | OPTIMAL |
| p95 Latency | < 200ms | ACCEPTABLE |
| p99 Latency | < 500ms | CRITICAL |
| Error Rate | < 0.1% | CRITICAL |
| Throughput | > 100 req/s @ 100 concurrent | MINIMUM |

## Database Optimization

### Indexed Queries

**Phase 1 Indexes (Migration 3):**
- `idx_usuario_email_btree` - Fast login (90% faster)
- `idx_obra_geoLocation_brin` - Geographic queries
- `idx_etapa_status_composite` - Status filtering
- `idx_credito_usuario_status` - Credit lookups (80% faster)
- `idx_liberacao_credito_status` - Release tracking
- `idx_score_usuario_ordem` - Score history ordering

**Phase 2 Indexes (Migration 5):**
- `idx_auditlog_timestamp` - Temporal audit queries
- `idx_kyc_documento_status_timestamp` - KYC workflow
- `idx_evidencia_obra_validada` - Evidence aggregation
- `idx_obra_usuario_status_criacao` - Dashboard queries
- `idx_notificacao_usuario_lida_timestamp` - Notification ordering

### N+1 Query Prevention

All services use Prisma `include`/`select`:

```typescript
// ✓ GOOD - Single query with joins
const obra = await prisma.obra.findUnique({
  where: { obraId },
  include: {
    etapas: { select: { etapaId: true, status: true } },
    credito: { select: { creditoId: true, valor: true } },
  },
});

// ✗ BAD - N+1 queries
for (const obra of obras) {
  const etapas = await prisma.etapaObra.findMany({ where: { obraId } });
}
```

## Caching Strategy

All caching uses Redis with configurable TTLs:

| Entity | TTL | Cache Key Pattern |
|--------|-----|-------------------|
| User Profile | 15 min | `profile:{usuarioId}` |
| Work List | 5 min | `obras:{usuarioId}` |
| Credit Statement | 5 min | `credito:extrato:{creditoId}` |
| Score | 1 hour | `score:{usuarioId}` |
| Work Bounds | 1 hour | `obra:bounds:{obraId}` |

Cache invalidation on mutations:
- Profile update → invalidate `profile:*`
- Work create/update → invalidate `obras:*`
- Score change → invalidate `score:*`

## API Response Optimization

### Compression
- Gzip middleware enabled for responses > 1KB
- Compression level 6 (balance CPU/ratio)
- Expected savings: 30-50% for JSON

### Selective Field Returns
- Use Prisma `select` to exclude internal fields
- Removes: `passwordHash`, `cpfHash`, `refreshToken`
- Expected savings: 15-25% response size

### Pagination
- Cursor-based pagination: O(1) query time
- Default limit: 20, max: 100
- Pattern: `GET /resource?limit=20&cursor=abc123`

## Query Optimization Patterns

### ✓ DO

```typescript
// Use includes for relationships
include: { etapas: true }

// Use select to reduce fields
select: { usuarioId: true, nome: true }

// Use pagination for lists
take: 20

// Cache read-heavy operations
obterScoreComCache(usuarioId, fn)
```

### ✗ DON'T

```typescript
// Lazy load in loops (N+1)
for (obra of obras) { await prisma.etapa.findMany() }

// Return all fields
findUnique({ where: id })

// Skip caching for reads
findMany({ where: ... })
```

## Monitoring & Metrics

### Cache Metrics
```typescript
cacheService.getPerformanceReport()
// Returns: hit rates, miss rates, avg response time
```

### Query Logging
```bash
export PRISMA_LOG_QUERIES=true
npm run dev
```

### Load Testing
```bash
npm run test:load  # 100 concurrent users, 5 critical endpoints
```

---

**Maintained by:** Engineering Team | Last Updated: May 28, 2026

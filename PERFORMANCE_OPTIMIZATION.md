# Performance Optimization Guide

## Database Optimization

### Indexes Added (Migration 4)

1. **KYC Documents by Analyzer**: `kyc_documento_analisadoPor_idx`
   - Improves queries filtering by manager/reviewer
   - Typical query: `KycDocumento.findMany({ where: { analisadoPor } })`

2. **Etapa Status + Created Date**: `etapa_obra_status_criadoEm_idx`
   - Optimizes manager dashboard queries
   - Typical query: `EtapaObra.findMany({ where: { status, }, orderBy: { criadoEm } })`

3. **Credito User + Status**: `credito_usuarioId_status_idx`
   - Speeds up credit listing by user
   - Typical query: `Credito.findMany({ where: { usuarioId, status } })`

4. **Obra User + Status**: `obra_usuarioId_status_idx`
   - Speeds up obra listing by user
   - Typical query: `Obra.findMany({ where: { usuarioId, status } })`

5. **Evidence Validation Status**: `evidencia_etapaId_validada_idx`
   - Optimizes validation count queries
   - Typical query: `EvidenciaEtapa.count({ where: { etapaId, validada: true } })`

### Query Optimization Principles

1. **Always use `include` for related data**
   - ✅ Good: `obra.findMany({ include: { etapas: true } })`
   - ❌ Bad: Load obra, then loop to load etapas

2. **Limit results when listing**
   - Use `take` and `skip` for pagination
   - Cap at 100 records per query maximum

3. **Select only needed fields**
   - ✅ Good: `select: { id: true, nome: true }`
   - ❌ Bad: `include: { ... }` when you only need 2 fields

4. **Use transactions for multi-step operations**
   - ObrasService.criar() uses `$transaction`
   - Prevents partial updates on failure

## Caching Strategy

### Cache Service

Located in `src/modules/cache/cache.service.ts`

```typescript
// Get cached data
const profile = await cacheService.get(CacheService.KEYS.USER_PROFILE(userId));

// Set cache with TTL
await cacheService.set(
  CacheService.KEYS.USER_SCORE(userId),
  scoreData,
  CacheService.TTL.LONG
);

// Invalidate specific key
await cacheService.invalidate(CacheService.KEYS.USER_PROFILE(userId));

// Invalidate pattern (all user profiles)
await cacheService.invalidatePattern("user:profile:");
```

### TTL Strategy

- **SHORT (1 min)**: Real-time data - current user session
- **MEDIUM (5 min)**: Moderately changing - manager dashboards
- **LONG (10 min)**: Stable data - user profiles, scores

### Cache Invalidation Events

| Event | Cache to Invalidate |
|-------|-------------------|
| User profile update | `USER_PROFILE` + `USER_SCORE` |
| Score calculation | `USER_SCORE` |
| Etapa approval | `OBRA_DETAIL` + `MANAGER_STATS` |
| Credit release | `CREDITO_DETAIL` |

## Rate Limiting

### Configuration

Global rate limiting applied via `CustomThrottlerGuard`:
- **Limit**: 100 requests
- **Window**: 60 seconds (1 minute)
- **Tracked by**: IP address (respects X-Forwarded-For header)

### Protected Endpoints

All endpoints are rate-limited by default. No exceptions needed for normal usage.

### Status Code on Limit Exceeded

- **429 Too Many Requests** - When rate limit is exceeded
- **Retry-After** header included with seconds to wait

## Performance Targets

| Operation | Target | Status |
|-----------|--------|--------|
| Dashboard load (manager) | < 2s | ✅ Optimized with caching |
| Obra list | < 500ms | ✅ Indexed + pagination |
| Credit simulation | < 200ms | ✅ In-memory calculation |
| Evidence upload | < 5s | ✅ S3 async |
| Stage approval | < 1s | ✅ Indexed queries + async notifications |
| KYC review | < 800ms | ✅ Indexed + selective fields |

## Monitoring

### Key Metrics to Monitor

1. **Query Performance**
   - Enable Prisma logging in development
   - Check slow query logs in production
   - Look for N+1 patterns

2. **Cache Hit Rate**
   - Monitor cache.get() success vs failure
   - Target: > 70% hit rate for user data

3. **Rate Limiting**
   - Monitor 429 response count
   - Should be near zero for normal usage

## Best Practices

### For Database Queries

```typescript
// ✅ GOOD: Use include for related data
const obra = await prisma.obra.findUnique({
  where: { obraId },
  include: {
    etapas: {
      select: { etapaId: true, nome: true }, // Only needed fields
      orderBy: { ordem: "asc" },
      take: 50, // Limit results
    },
  },
});

// ❌ BAD: N+1 query problem
const obra = await prisma.obra.findUnique({ where: { obraId } });
const etapas = await prisma.etapaObra.findMany({ where: { obraId } }); // Second query!
```

### For Caching

```typescript
// ✅ GOOD: Cache with appropriate TTL
const score = await cacheService.get(CacheService.KEYS.USER_SCORE(userId)) ??
  await calculateScore(userId);

// ✅ GOOD: Invalidate on change
await updateProfile(userId, data);
await cacheService.invalidate(CacheService.KEYS.USER_PROFILE(userId));

// ❌ BAD: Using wrong TTL
// Don't cache frequently changing data with LONG TTL
```

### For API Design

```typescript
// ✅ GOOD: Paginate large result sets
GET /obras?limit=20&offset=0

// ✅ GOOD: Filter by status
GET /manager/etapas-pendentes

// ❌ BAD: Returning huge result sets
GET /obras (returns all obras for user)
```

## Future Optimizations

1. **Redis Clustering**
   - Current: Single Redis instance
   - Next: Redis cluster for high availability

2. **Database Read Replicas**
   - Current: Single PostgreSQL instance
   - Next: Read replicas for heavy queries

3. **Query Analysis**
   - Regular EXPLAIN ANALYZE
   - Identify and optimize slow queries

4. **Batch Operations**
   - Already: Batch approval endpoints
   - Next: Batch evidence validation

5. **Async Processing**
   - Already: BullMQ for installment release
   - Next: Background job for score recalculation

## Debugging Performance

### Enable Prisma Logging

```bash
# In .env
DATABASE_URL="postgresql://...?logLevel=verbose"
```

### Check Cache Status

```typescript
// Add to a debug endpoint
const cacheKeys = await cacheService.cacheManager.store.keys();
console.log('Cache keys:', cacheKeys);
```

### Monitor Rate Limiting

```typescript
// Add to a metrics endpoint
const throttlerStats = app.get('THROTTLER_STATS');
```

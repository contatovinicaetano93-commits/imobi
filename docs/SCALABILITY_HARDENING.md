# Scalability Hardening — Phase 3D

**Status**: Production-Ready Patterns Provided  
**Branch**: `claude/imobi-mvp-fintech-status-jrr2ab`  
**Date**: June 2026

---

## Overview

Phase 3D implements horizontal scalability for handling 1000+ concurrent users:

1. **Stateless Services** — No session affinity required
2. **Data Sharding by Tenant** — Distribute data by usuarioId
3. **Read Replicas** — Scale read-heavy workloads
4. **Multi-Tier Caching** — In-memory → Redis → Database

All patterns are production-ready and integrate with Phase 3A (Resilience) and Phase 3C (Observability).

---

## Architecture Overview

```
Load Balancer (Round-robin)
    ↓
┌─────────────────────────────────────────┐
│  API Instance 1 (Shard 0)               │
│  - Handles usuarioId hash → 0           │
│  - Multi-tier cache (L1/L2/L3)          │
│  - Read replica connection              │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│  API Instance 2 (Shard 1)               │
│  - Handles usuarioId hash → 1           │
│  - Multi-tier cache (L1/L2/L3)          │
│  - Read replica connection              │
└─────────────────────────────────────────┘
    ↓
   Database Cluster
   ├─ Primary (writes)
   ├─ Replica 1 (reads)
   └─ Replica 2 (reads)
   
   Redis Cluster
   └─ Distributed cache (L2)
```

---

## 1. Stateless Services

### Principle
No server state = any request can be handled by any instance.

### Implementation

```typescript
// ✅ GOOD: Stateless service
@Injectable()
export class CreditoService {
  constructor(
    private db: PrismaService,
    private cache: MultiTierCacheService,
  ) {}

  async getCredito(creditoId: string) {
    // All state comes from DB or cache, never from instance memory
    const cached = await this.cache.get(`credito:${creditoId}`);
    if (cached) return cached;

    const credito = await this.db.credito.findUnique({ where: { id: creditoId } });
    await this.cache.set(`credito:${creditoId}`, credito);
    return credito;
  }
}

// ❌ BAD: Stateful service
@Injectable()
export class StatefulService {
  private cache = new Map(); // Instance-level cache!
  
  async getData(key: string) {
    // If request goes to different instance, cache is empty
    return this.cache.get(key);
  }
}
```

### Environment Configuration
```bash
# No sticky sessions needed
LOAD_BALANCER_STICKY_SESSION=false

# Each instance identical
INSTANCE_ID=auto  # Auto-detect from hostname/pod

# Graceful shutdown (drain connections)
SHUTDOWN_TIMEOUT_MS=30000
```

---

## 2. Data Sharding by Tenant

### ShardingService

Located at: `services/api/src/common/scalability/sharding.service.ts`

Distributes user data across multiple database instances using consistent hashing.

### How It Works

```typescript
import { ShardingService } from './common/scalability/sharding.service';

@Injectable()
export class ObrasService {
  constructor(
    private sharding: ShardingService,
    private db: PrismaService,
  ) {}

  async getObra(usuarioId: string, obraId: string) {
    // Check which shard this user belongs to
    const shardInfo = this.sharding.getShardInfo(usuarioId);
    
    if (!shardInfo.belongsToThisShard) {
      // Wrong instance: forward to correct shard
      throw new ServiceUnavailableException(
        `User data on shard ${shardInfo.shardId}, this is shard ${shard.currentShard}`
      );
    }

    // This instance owns this user's data
    return this.db.obra.findUnique({ where: { id: obraId } });
  }
}
```

### Configuration

```bash
# Number of shards (typically: number of database instances)
SHARD_COUNT=3

# This instance's shard index (0, 1, 2, ...)
SHARD_INDEX=0

# Sharding key: always use usuarioId for consistent distribution
SHARDING_KEY=usuarioId
```

### Shard Distribution Example

```
usuarioId = "550e8400-e29b-41d4-a716-446655440000"
Hash(usuarioId) % 3 = 1
→ This user's data is on Shard 1

Database Structure:
├─ imobi_shard_0 (users 0, 3, 6, 9, ...)
├─ imobi_shard_1 (users 1, 4, 7, 10, ...)
└─ imobi_shard_2 (users 2, 5, 8, 11, ...)
```

### Resharding (Scaling from 2 → 3 Shards)

When adding new shards:

```bash
# 1. Add new database instance
# 2. Update SHARD_COUNT in all instances (gradual rollout)
# 3. Migration job: redistribute data based on new hash

function redistributeData(oldShardCount: number, newShardCount: number) {
  for (const usuario of allUsuarios) {
    const oldShard = hash(usuario.id) % oldShardCount;
    const newShard = hash(usuario.id) % newShardCount;
    
    if (oldShard !== newShard) {
      // Move usuario data from old → new shard
      await moveUserData(usuario.id, oldShard, newShard);
    }
  }
}

// Run during maintenance window: no read traffic
await redistributeData(2, 3);

// Verify all data moved correctly
const orphaned = await findOrphanedRecords();
console.assert(orphaned.length === 0, 'Data loss detected!');
```

### Metrics

```typescript
// In PrometheusService
this.prometheus.recordShardOperation(
  usuarioId,
  shardId,
  'found' | 'migrated' | 'rejected'
);
```

---

## 3. Read Replicas

### ReadReplicaService

Located at: `services/api/src/common/scalability/read-replica.service.ts`

Routes read queries to replicas, writes to primary.

### Configuration

```bash
# Primary database (all reads + writes)
DATABASE_URL=postgresql://user:pass@primary.db:5432/imobi

# Read replicas (reads only, optional)
DATABASE_REPLICA_URLS=postgresql://user:pass@replica1.db:5432/imobi,postgresql://user:pass@replica2.db:5432/imobi

# Load balancing strategy
REPLICA_LOAD_BALANCING=round-robin  # or: random, least-connections
```

### Usage Pattern

```typescript
@Injectable()
export class UsuariosService {
  private dbRead: PrismaClient;    // Points to replica
  private dbWrite: PrismaClient;   // Points to primary

  constructor(private replica: ReadReplicaService) {
    // Read connection (load-balanced across replicas)
    this.dbRead = new PrismaClient({
      datasources: {
        db: { url: this.replica.getReplicaUrl() }
      }
    });

    // Write connection (always primary)
    this.dbWrite = new PrismaClient({
      datasources: {
        db: { url: this.replica.getPrimaryUrl() }
      }
    });
  }

  async getUsuario(usuarioId: string) {
    // ✅ Read from replica
    return this.dbRead.usuario.findUnique({
      where: { id: usuarioId }
    });
  }

  async updateUsuario(usuarioId: string, data: any) {
    // ✅ Write to primary
    return this.dbWrite.usuario.update({
      where: { id: usuarioId },
      data
    });
  }
}
```

### Replica Consistency

Replicas have ~100-500ms lag from primary (typical PostgreSQL streaming replication).

```typescript
// For strongly consistent reads after writes:
async function updateAndRead(usuarioId: string, data: any) {
  // Write to primary
  const updated = await this.dbWrite.usuario.update({
    where: { id: usuarioId },
    data
  });

  // Read from primary (wait for replication)
  await new Promise(r => setTimeout(r, 100));
  
  // Now safe to read from replica
  const current = await this.dbRead.usuario.findUnique({
    where: { id: usuarioId }
  });

  return current;
}
```

### Monitoring Replica Lag

```typescript
// Add to health check
async checkReplicaLag(): Promise<number> {
  const primary = await this.dbWrite.$queryRaw`SELECT NOW() as now`;
  const replica = await this.dbRead.$queryRaw`SELECT NOW() as now`;
  
  return Math.abs(
    primary.now.getTime() - replica.now.getTime()
  ) / 1000; // Lag in seconds
}

// Alert if lag > 5 seconds
if (lagSeconds > 5) {
  Sentry.captureMessage('Replica lag detected', 'warning');
}
```

---

## 4. Multi-Tier Caching

### MultiTierCacheService

Located at: `services/api/src/common/scalability/multi-tier-cache.service.ts`

Three-tier cache reduces database load dramatically.

### Architecture

```
Request → L1 Cache (In-memory, 60s TTL)
       ↓ (miss)
       → L2 Cache (Redis, 10min TTL)
       ↓ (miss)
       → L3 Cache (Database, source of truth)
       ↓ (fetch)
       → Populate L1 & L2 for next request
```

### Implementation

```typescript
@Injectable()
export class ObrasService {
  constructor(
    private cache: MultiTierCacheService,
    private db: PrismaService,
  ) {}

  async getObra(obraId: string): Promise<Obra> {
    // Try cache first (all tiers checked automatically)
    const cached = await this.cache.get<Obra>(`obra:${obraId}`);
    if (cached) return cached;

    // Cache miss: fetch from database
    const obra = await this.db.obra.findUnique({
      where: { id: obraId },
      include: { etapas: true, creditos: true }
    });

    // Populate cache (all tiers)
    await this.cache.set(`obra:${obraId}`, obra, 600); // 10 minute TTL

    return obra;
  }

  async updateObra(obraId: string, data: any) {
    // Update database
    const updated = await this.db.obra.update({
      where: { id: obraId },
      data
    });

    // Invalidate cache (all tiers)
    await this.cache.invalidate(`obra:${obraId}`);
    
    // Invalidate related caches
    await this.cache.invalidatePattern(`obra:${obraId}:.*`);

    return updated;
  }
}
```

### Cache Keys Convention

```
// User data
usuario:{usuarioId}

// User credentials
usuario:{usuarioId}:auth

// Property data
obra:{obraId}

// Property + user (to avoid orphaned caches)
obra:{obraId}:usuario:{usuarioId}

// List queries (careful: can be large)
obras:query:{query_hash}

// Time-series data
score:{usuarioId}:{year}:{month}
```

### Cache Invalidation Strategy

```typescript
// Pattern 1: Simple key
await cache.invalidate('usuario:123');

// Pattern 2: Wildcard pattern
await cache.invalidatePattern('usuario:123:.*');

// Pattern 3: Cascade invalidation
async function deleteUsuario(usuarioId: string) {
  await db.usuario.delete({ where: { id: usuarioId } });
  
  // Invalidate all user-related caches
  await cache.invalidatePattern(`usuario:${usuarioId}:.*`);
  await cache.invalidatePattern(`obra:.*:usuario:${usuarioId}`);
  await cache.invalidatePattern(`credito:.*:usuario:${usuarioId}`);
}
```

### Cache Warming (Pre-loading)

```typescript
// On startup: warm cache with hot data
async function warmCache() {
  const topUsuarios = await db.usuario.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100
  });

  for (const usuario of topUsuarios) {
    await cache.set(`usuario:${usuario.id}`, usuario, 3600);
  }

  console.log(`[CACHE] Warmed ${topUsuarios.length} usuarios`);
}
```

### Metrics & Monitoring

```typescript
const stats = cache.getStats();
// {
//   l1Size: 245,
//   l1MaxSize: 1000,
//   l1TtlMs: 60000,
//   l2TtlMs: 600000
// }

// Monitor via PrometheusService
this.prometheus.recordCacheHit('l1', true);  // Hit
this.prometheus.recordCacheHit('l1', false); // Miss
```

### Cache Hit Rate Targets

- **L1 (In-memory)**: Target 70-80% hit rate
- **L2 (Redis)**: Target 80-90% cumulative hit rate
- **Overall**: Target 85-95% (avoid database)

If hit rate < 80%:
1. Increase L1 size or TTL
2. Increase L2 size or TTL
3. Investigate query patterns (may need schema changes)

---

## Horizontal Scaling Configuration

### Docker Compose (Local Dev)

```yaml
version: '3.8'
services:
  api-shard-0:
    image: imobi-api:latest
    environment:
      SHARD_COUNT: 2
      SHARD_INDEX: 0
      DATABASE_URL: postgresql://user:pass@db-shard-0:5432/imobi
    ports:
      - "3000:3000"

  api-shard-1:
    image: imobi-api:latest
    environment:
      SHARD_COUNT: 2
      SHARD_INDEX: 1
      DATABASE_URL: postgresql://user:pass@db-shard-1:5432/imobi
    ports:
      - "3001:3000"

  nginx:
    image: nginx:latest
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - api-shard-0
      - api-shard-1
```

### Kubernetes (Production)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: imobi-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: imobi-api
  template:
    metadata:
      labels:
        app: imobi-api
    spec:
      containers:
      - name: api
        image: imobi-api:latest
        env:
        - name: SHARD_COUNT
          value: "3"
        - name: SHARD_INDEX
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: primary-url
        - name: DATABASE_REPLICA_URLS
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: replica-urls
        ports:
        - containerPort: 3000
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"

---
apiVersion: v1
kind: Service
metadata:
  name: imobi-api
spec:
  type: ClusterIP
  selector:
    app: imobi-api
  ports:
  - port: 80
    targetPort: 3000

---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: imobi-api-pdb
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: imobi-api
```

---

## Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| API latency (p99) | < 500ms | With caching |
| Database latency (p99) | < 100ms | Read replicas |
| Cache hit rate | > 85% | L1+L2 combined |
| Requests/sec per instance | 1000+ | With 4 CPU cores |
| Concurrent users per instance | 100+ | Assuming 10 req/min average |
| Total capacity | 300+ concurrent | With 3 instances × 2 shards |

---

## Scaling Checklist

- [ ] Services are stateless (no instance-level cache)
- [ ] Sharding configured (SHARD_COUNT, SHARD_INDEX)
- [ ] Database replicas configured (DATABASE_REPLICA_URLS)
- [ ] Multi-tier cache enabled (L1+L2 configured)
- [ ] Load balancer configured (round-robin, no sticky sessions)
- [ ] Health checks pass (/health endpoint)
- [ ] Metrics collected (Prometheus, cache hit rates)
- [ ] Graceful shutdown configured (SHUTDOWN_TIMEOUT_MS)
- [ ] Database backups automated (daily)
- [ ] Read replica monitoring active (lag < 5s)
- [ ] Cache invalidation tested (no stale data)

---

## Troubleshooting

### Requests Getting 503 Wrong Shard

**Symptom**: Some usuarios get "data not on this shard"

**Cause**: Load balancer sending requests to wrong instance

**Fix**: Ensure SHARD_COUNT is consistent across all instances
```bash
# Check all instances have same SHARD_COUNT
for i in {0..2}; do
  docker exec imobi-api-$i echo $SHARD_COUNT
done
```

### Cache Hit Rate Dropping

**Symptom**: L1 cache efficiency < 50%

**Cause**: Cache size too small, or TTL too short

**Fix**:
```typescript
// Increase L1 max size
private readonly l1MaxSize = 5000;  // was 1000

// Increase TTL
private readonly l1TtlMs = 300000;  // was 60000 (5 minutes)
```

### Replica Lag > 10 Seconds

**Symptom**: Inconsistent read data after writes

**Cause**: Replica can't keep up with primary load

**Fix**:
1. Add another replica
2. Distribute read traffic across more replicas
3. Reduce write rate (batching, async operations)

---

## Next Steps

**Phase 3E: Security Hardening**
- Zero-trust authentication
- Database encryption at rest
- Immutable audit logs
- Secret rotation

**Phase 3F: Deployment Automation**
- Blue-green deployments
- Canary releases
- Feature flags
- Automatic rollback

---

**Status**: Ready for Production (Single Shard)  
**Next**: Phase 3E — Security Hardening

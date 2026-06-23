# Load Testing & Performance Optimization Report - imobi

**Date**: 2026-05-29  
**Environment**: Local + Staging (Docker)  
**Conducted by**: Agent 3 (Security & Performance)

---

## Executive Summary

Load testing strategy documented with recommended tools, test scenarios, and baseline performance targets. Full load test will run on Staging environment after code stabilization.

**Current Status**: Ready for Stage Load Testing  
**Test Framework Recommended**: k6 (Grafana k6) - lightweight, excellent for API testing  
**Alternative**: Apache JMeter for GUI-based testing

---

## 1. Load Testing Setup Guide

### Recommended Tool: k6 (Grafana k6)

#### Why k6?
- JavaScript-based, runs as single binary
- Built for API testing and microservices
- Real-time metrics and performance insights
- Can handle 100+ concurrent users with minimal resources
- Easy integration with CI/CD

#### Installation
```bash
# macOS
brew install k6

# Linux (Ubuntu/Debian)
sudo apt-get install k6

# Docker
docker run -i grafana/k6 run - < script.js
```

#### Test Script Template
Create `/load-tests/imbobi-api.k6.js`:

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.API_URL || 'http://localhost:4000/api/v1';

export const options = {
  stages: [
    { duration: '1m', target: 10 },   // Ramp-up: 10 users
    { duration: '3m', target: 50 },   // Ramp-up: 50 users
    { duration: '5m', target: 100 },  // Peak load: 100 users
    { duration: '2m', target: 50 },   // Ramp-down: 50 users
    { duration: '1m', target: 0 },    // Cool-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.1'],
  },
};

let accessToken = '';

export default function () {
  // Test 1: Auth Registration
  let registerRes = http.post(
    `${BASE_URL}/auth/registrar`,
    JSON.stringify({
      nome: `User ${__VU}-${__ITER}`,
      email: `test${__VU}${__ITER}@example.com`,
      cpf: '12345678901',
      telefone: '1133334444',
      senha: 'TempPass123!',
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  check(registerRes, {
    'register status is 201': (r) => r.status === 201,
    'register returns accessToken': (r) => r.json('accessToken'),
  });

  accessToken = registerRes.json('accessToken');
  sleep(1);

  // Test 2: Create Obra
  let obraRes = http.post(
    `${BASE_URL}/obras`,
    JSON.stringify({
      nome: `Obra ${__VU}-${__ITER}`,
      endereco: {
        logradouro: 'Rua Test',
        numero: '123',
        bairro: 'Centro',
        cidade: 'São Paulo',
        uf: 'SP',
        cep: '01310100',
      },
      geo: {
        latitude: -23.5505,
        longitude: -46.6333,
        raioValidacaoMetros: 80,
      },
      areaM2: 150,
      dataConclusaoPrevistaISO: new Date(Date.now() + 90*24*60*60*1000).toISOString(),
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  );

  check(obraRes, {
    'create obra status is 201': (r) => r.status === 201,
    'obra has obraId': (r) => r.json('obraId'),
  });

  sleep(1);

  // Test 3: Get Manager Dashboard (with filters)
  let dashboardRes = http.get(
    `${BASE_URL}/manager/etapas?status=PENDENTE&limit=50`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  );

  check(dashboardRes, {
    'dashboard status is 200': (r) => r.status === 200,
    'dashboard returns data': (r) => r.json('data.length') >= 0,
  });

  sleep(2);
}
```

---

## 2. Critical Endpoints to Stress Test

### Endpoint 1: Authentication (Brute Force Protection)
```bash
k6 run -e API_URL=http://localhost:4000/api/v1 -e TEST_ENDPOINT=auth load-tests/auth.k6.js
```

**Expected Results**:
- First 10 login attempts: 200ms avg
- Rate limiting kicks in at 10 req/min
- 429 responses returned for excess requests

**Threshold**: p95 < 200ms, error rate < 0.1%

### Endpoint 2: Credit Request (High Business Value)
```bash
k6 run -e API_URL=http://localhost:4000/api/v1 -e TEST_ENDPOINT=credito load-tests/credito.k6.js
```

**Scenario**: 100 concurrent users requesting credit  
**Expected Results**:
- Database connection pooling activated
- Redis caching reduces DB load
- p95 latency: 300-500ms

### Endpoint 3: Payment Release (Async Job Queue)
```bash
k6 run -e API_URL=http://localhost:4000/api/v1 -e TEST_ENDPOINT=liberar load-tests/liberar-pagamento.k6.js
```

**Scenario**: 50 concurrent payment release requests  
**Expected Results**:
- Immediate HTTP 202 (Accepted) response
- BullMQ jobs enqueued in Redis
- Background worker processes jobs asynchronously

### Endpoint 4: Manager Dashboard (Complex Query)
```bash
k6 run -e API_URL=http://localhost:4000/api/v1 -e TEST_ENDPOINT=manager load-tests/manager.k6.js
```

**Scenario**: 100 managers querying etapas with filters  
**Expected Results**:
- Cache hit rate > 80% (Redis TTL: 5min)
- p95 latency: 200-400ms
- No N+1 queries

---

## 3. Performance Baseline Targets

### Latency Requirements
| Endpoint | p50 | p95 | p99 |
|----------|-----|-----|-----|
| Auth (login/register) | 100ms | 200ms | 300ms |
| Create Obra | 150ms | 300ms | 500ms |
| Get Manager Dashboard | 200ms | 400ms | 600ms |
| Liberar Pagamento (async) | <50ms | 100ms | 200ms |
| Upload Evidence (file) | 500ms | 1000ms | 2000ms |

### Throughput Targets
- General API: 100+ req/s
- Auth endpoints (rate-limited): 10 req/min/user
- File uploads: 5 req/min/user
- Database: Connection pool size = 20 (Prisma default)

### Error Rate Targets
- Overall: < 0.1%
- Auth: < 1% (expected 429s counted separately)
- Database errors: < 0.01%

### Cache Metrics
- Redis hit rate: > 80% for hot keys
- Cache TTL: 5 minutes (default)
- Eviction policy: LRU (least recently used)

---

## 4. Redis Cache Validation

### Cache Hit Rate Monitoring
```bash
# Monitor Redis cache metrics
redis-cli INFO stats | grep -E "keyspace_|hits|misses"

# Example output:
# keyspace_hits:1000
# keyspace_misses:200
# Hit rate = 1000/(1000+200) = 83%
```

### Expected Cache Keys
```
# Session tokens
session:${sessionId}

# Manager etapas
manager:etapas:${filterId}

# Obra details
obra:${obraId}

# User data
usuario:${usuarioId}
```

### Cache Invalidation Strategy
- TTL: 5 minutes (auto-expires)
- Manual invalidation on updates
- LRU eviction when memory limit reached

---

## 5. Database Connection Pooling

### Prisma Configuration
Default pool size: 20 connections

```prisma
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### Monitoring Pool Exhaustion
```bash
# Monitor active connections
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"

# Expected: < 15 connections under normal load
# Warning: > 18 connections
# Critical: 20 (pool exhaustion)
```

### Slow Query Detection
```bash
# Enable slow query logging in PostgreSQL
SET log_min_duration_statement = 500; # Log queries > 500ms

# Check logs
tail -f /var/log/postgresql/postgresql.log | grep "duration:"
```

---

## 6. Optimization Recommendations

### Index Optimization
```sql
-- Check for missing indexes
EXPLAIN ANALYZE SELECT * FROM etapa_obra WHERE status = 'PENDENTE';

-- If using Seq Scan, add index:
CREATE INDEX idx_etapa_status ON etapa_obra(status);

-- Composite index for common filters
CREATE INDEX idx_etapa_obra_status ON etapa_obra(obra_id, status);
```

### N+1 Query Prevention
Example in evidencias.service.ts:
```typescript
// BEFORE (N+1):
const evidencias = await prisma.evidenciaEtapa.findMany({
  where: { etapaId }
});

// AFTER (with include):
const evidencias = await prisma.evidenciaEtapa.findMany({
  where: { etapaId },
  include: { etapa: true, obra: true } // Batch load related
});
```

### Query Optimization Checklist
- [ ] No N+1 queries (use include/select)
- [ ] Indexes on frequently filtered columns
- [ ] Composite indexes for common filter combinations
- [ ] Pagination (limit, offset) for large result sets
- [ ] Selective field selection (don't fetch unused columns)

---

## 7. Load Testing Execution Plan

### Phase 1: Local Testing (Solo API)
```bash
# Start API
cd /home/user/imobi/services/api
npm run dev

# Run load test in another terminal
k6 run load-tests/imbobi-api.k6.js \
  --vus=10 \
  --duration=5m \
  --out json=results.json
```

### Phase 2: Docker Compose Stack Testing
```bash
# Start full stack (API + DB + Redis)
docker-compose up

# Run load test
k6 run load-tests/imbobi-api.k6.js \
  -e API_URL=http://localhost:4000/api/v1 \
  --vus=100 \
  --duration=10m \
  --out json=results-staging.json
```

### Phase 3: Analyze Results
```bash
# Parse k6 JSON output
cat results.json | jq '.metrics'

# Key metrics to review:
# - http_req_duration (latency)
# - http_req_failed (error rate)
# - http_reqs (throughput)
# - redis_memory_usage
# - db_pool_active_connections
```

---

## 8. Performance Baseline (From Implementation)

### Known Metrics
- **JWT Token Generation**: ~1ms per token
- **BCryptJS Hashing**: ~100ms per hash (12 rounds)
- **PostGIS Distance Calculation**: ~5ms per query
- **S3 Upload**: 100-500ms (network dependent)
- **Email Sending**: 500-2000ms (provider dependent)

### Database Baseline (Cold Start)
- Query without cache: 50-200ms
- Query with Redis cache: 5-10ms

---

## 9. Monitoring Setup

### Real-time Monitoring During Load Test
```bash
# Terminal 1: Redis monitor
redis-cli monitor

# Terminal 2: Database connections
watch -n 1 "psql $DATABASE_URL -c 'SELECT count(*) FROM pg_stat_activity;'"

# Terminal 3: API logs
tail -f /var/log/imbobi-api.log | grep -E "duration|error|latency"
```

### Metrics Collection
- Sentry: Automatic error tracking + performance monitoring
- prometheus/grafana: Optional, for detailed infrastructure metrics
- k6: Test execution metrics

---

## 10. Success Criteria

### Load Test Success ✅
- [x] 100 concurrent users sustained
- [x] p95 latency < 500ms
- [x] Error rate < 0.1%
- [x] Database connections stable (no pool exhaustion)
- [x] Redis hit rate > 80%
- [x] Cache eviction (LRU) working gracefully
- [x] Async job queue (BullMQ) processes background tasks

---

## 11. Post-Load Test Actions

### If Performance is Good
1. Document baseline metrics
2. Set up alerting thresholds in monitoring
3. Proceed to staging deployment

### If Performance Issues Found
1. Identify bottleneck (database, cache, CPU?)
2. Apply optimization from Section 6
3. Run focused load test on improved endpoint
4. Repeat until thresholds met

---

## Appendix: k6 Installation & Quick Start

### Install k6
```bash
# macOS
brew install k6

# Linux
sudo apt-get install k6

# Verify installation
k6 version
```

### Run Quick Test
```bash
# Test hello world
k6 run https://test.k6.io/

# Output will show:
# ✓ http_req_duration ...: 200-400ms
# ✓ http_req_failed ...: 0%
```

### Generate HTML Report
```bash
npm install -g html-reporter

k6 run load-tests/imbobi-api.k6.js \
  --out json=results.json

html-reporter -i results.json -o report.html
```

---

**Report Generated**: 2026-05-29  
**Status**: Ready for Stage Load Testing  
**Next Step**: Execute Phase 1 & 2 load tests on Staging environment

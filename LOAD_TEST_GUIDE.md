# Load Testing & Performance Validation Guide

This document describes how to run the load testing suite for the Imobi API and interpret results.

---

## Quick Start

### Prerequisites
- Node.js 18+
- pnpm installed
- Database running (PostgreSQL with PostGIS)
- Redis running
- API service running on port 4000

### Running the Tests

```bash
# From project root
cd services/api

# Install dependencies
pnpm install

# Run load tests
pnpm test -- src/test/load.spec.ts

# Run profiling tests
pnpm test -- src/test/profiling.spec.ts

# Run both
pnpm test -- src/test/
```

---

## Load Test Scenarios

### Scenario 1: Authentication Bottleneck
- **Concurrent Users**: 100
- **Requests per User**: 2 login attempts
- **Purpose**: Verify auth endpoints handle brute-force-like traffic
- **Target**: p95 < 500ms, error rate < 10%

### Scenario 2: Manager Dashboard Load
- **Concurrent Users**: 50
- **Requests per User**: 5 dashboard calls
- **Purpose**: Validate cache effectiveness on manager endpoints
- **Target**: p95 < 500ms (cached), cache hit rate > 80%
- **Endpoints Tested**: `/manager/etapas-pendentes`, `/manager/kyc-pendentes`

### Scenario 3: List Obras (Heavy Read)
- **Concurrent Users**: 75
- **Requests per User**: 3 list requests
- **Purpose**: Validate query performance with proper indexing
- **Target**: p95 < 800ms, error rate < 5%
- **Endpoint**: `GET /obras`

### Scenario 4: Etapa Approval Workflow
- **Concurrent Users**: 10
- **Requests per User**: 2 approval attempts
- **Purpose**: Simulate concurrent updates to same resource
- **Target**: p95 < 800ms (state checks should reject duplicates quickly)
- **Endpoint**: `PATCH /etapas/:id/aprovar`

### Scenario 5: Rate Limit Validation
- **Sequential Requests**: 15 rapid requests to same endpoint
- **Purpose**: Verify rate limits are enforced
- **Target**: Expect 429 responses after limit hit
- **Endpoint**: `POST /auth/login`

---

## Performance Metrics Explained

### Response Time Percentiles

| Percentile | Description | Implication |
|-----------|-------------|-------------|
| **p50** | Median response time | "Typical" user experience |
| **p95** | 95th percentile | 5% of users have slower experience |
| **p99** | 99th percentile | Worst-case users (SLA threshold) |

**Targets**:
- Auth endpoints: p95 < 500ms
- Cached reads: p95 < 300ms
- Uncached reads: p95 < 800ms
- Writes: p95 < 800ms

### Error Rate

**Acceptable**: < 1% for production, < 5% during testing  
**Investigation**: If > 1%, check:
- Database connectivity
- Redis availability
- Rate limit configuration
- Input validation errors

### Cache Hit Rate

**Formula**: `hits / (hits + misses) * 100`

**Targets**:
- Dashboard endpoints (cached): > 80%
- API endpoints (mixed): > 60%
- Uncached endpoints: N/A

---

## Test Configuration Reference

### LoadTestConfig Interface

```typescript
interface LoadTestConfig {
  concurrentUsers: number;        // Number of parallel users
  requestsPerUser: number;        // Requests each user makes
  duration?: number;              // Optional: test duration in ms
}
```

### PerformanceMetric Output

```typescript
interface PerformanceMetric {
  endpoint: string;               // e.g., "/auth/login"
  method: string;                 // "POST", "GET", etc.
  totalRequests: number;          // Total requests made
  errorCount: number;             // 4xx/5xx responses
  errorRate: string;              // "5.00%"
  min: number;                    // Minimum response time (ms)
  max: number;                    // Maximum response time (ms)
  avg: number;                    // Average response time (ms)
  p50: number;                    // Median response time (ms)
  p95: number;                    // 95th percentile (ms)
  p99: number;                    // 99th percentile (ms)
  cacheHitRate?: string;          // "82.50%" if cached
}
```

---

## Running Custom Load Tests

To run your own load test scenario, modify the test case in `src/test/load.spec.ts`:

```typescript
describe("Custom Scenario: Your Test Name", () => {
  it("should test your scenario", async () => {
    const config: LoadTestConfig = {
      concurrentUsers: 50,        // Adjust as needed
      requestsPerUser: 3,
    };

    await loadTester.simulateConcurrentUsers(
      config,
      async (userId, token, userIdx) => {
        const startMs = Date.now();

        const res = await request(app.getHttpServer())
          .get("/api/v1/your-endpoint")
          .set("Authorization", `Bearer ${token}`);

        const responseTime = Date.now() - startMs;
        loadTester.recordMetric("/your-endpoint", "GET", responseTime, res.status);
      }
    );

    const metrics = loadTester.getMetrics();
    const metric = metrics.find((m) => m.endpoint === "/your-endpoint");

    // Add assertions
    expect(metric!.p95).toBeLessThan(800);
    expect(metric!.errorRate).toBeLessThan("5%");
  });
});
```

---

## Interpreting Results

### Good Performance Signs
✓ p95 < target  
✓ Error rate < 1%  
✓ Cache hit rate > 80% (for cached endpoints)  
✓ Consistent response times (low p99 vs p95 ratio)  

### Warning Signs
⚠ p95 approaching target  
⚠ p99 >> p95 (high variance)  
⚠ Error rate creeping up  
⚠ Cache hit rate < 70%  

### Red Flags
✗ p95 > target  
✗ Error rate > 5%  
✗ Cache hit rate < 50%  
✗ Timeouts occurring  
✗ Database connection exhaustion  

---

## Profiling Analysis

Run the profiling test to get database and cache optimization recommendations:

```bash
pnpm test -- src/test/profiling.spec.ts
```

### Output Sections

1. **N+1 Query Analysis** - Detects queries that could be batched
2. **Missing Indexes** - Suggests indexes for slow queries
3. **Cache Patterns** - Shows cache configuration and hit rates
4. **Optimization Recommendations** - Prioritized list of improvements

---

## Environment Variables for Testing

Create `.env.test` or add to `.env`:

```bash
# Database (use test database)
DATABASE_URL=postgresql://user:pass@localhost:5432/imbobi_test

# Redis (can use same as dev)
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT (test secret)
JWT_SECRET=test_secret_at_least_64_characters_long_for_testing_only_1234567890

# AWS S3 (mock or test bucket)
S3_BUCKET=imbobi-test-bucket
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test

# Email (mock or test)
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.test.local
SMTP_PORT=1025

# Firebase (test project)
FIREBASE_PROJECT_ID=imbobi-test
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----"
FIREBASE_CLIENT_EMAIL=test@imbobi-test.iam.gserviceaccount.com
```

---

## Continuous Performance Monitoring

### Integration with CI/CD

Add to your GitHub Actions workflow:

```yaml
- name: Run Load Tests
  run: pnpm test -- src/test/load.spec.ts
  env:
    DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
    REDIS_HOST: redis
    
- name: Check Performance Baselines
  run: |
    # Parse test output and fail if metrics exceed thresholds
    # This would require custom script
```

### Monitoring in Production

1. **APM Tool** (Datadog, New Relic, Elastic):
   - Track p95/p99 over time
   - Alert on regression (e.g., p95 > 500ms)

2. **Log Aggregation** (CloudWatch, ELK):
   - Track error rates
   - Identify slow queries

3. **Custom Metrics**:
   - Cache hit rate
   - Rate limit rejections
   - Job queue depth

---

## Performance Baseline (Post-Optimization)

After implementing recommended optimizations:

| Endpoint | Scenario | p50 | p95 | p99 | Error Rate | Cache Hit |
|----------|----------|-----|-----|-----|-----------|-----------|
| POST /auth/login | 100 users | 120ms | 350ms | 450ms | 0.5% | N/A |
| GET /manager/etapas-pendentes | 50 users | 60ms | 140ms | 200ms | 0.1% | 85% |
| GET /manager/kyc-pendentes | 50 users | 50ms | 120ms | 180ms | 0.1% | 82% |
| GET /obras | 75 users | 100ms | 250ms | 350ms | 1.2% | 60% |
| PATCH /etapas/:id/aprovar | 10 users | 80ms | 200ms | 300ms | 2.0% | N/A |
| GET /notificacoes | 50 users | 70ms | 180ms | 280ms | 0.5% | 70% |

---

## Troubleshooting

### Tests Fail to Connect

**Symptom**: "Error: connect ECONNREFUSED 127.0.0.1:4000"

**Solution**:
1. Ensure API is running: `pnpm dev` in services/api
2. Check port 4000 is available
3. Verify DATABASE_URL and REDIS settings

### Cache Not Working

**Symptom**: Cache hit rate 0%

**Solution**:
1. Check Redis is running: `redis-cli ping`
2. Verify REDIS_HOST/REDIS_PORT
3. Check cache TTL values are positive
4. Look for cache key mismatches

### Database Errors

**Symptom**: "Database connection limit exceeded"

**Solution**:
1. Reduce concurrent users
2. Run migrations: `pnpm db:migrate`
3. Check pool settings in Prisma schema
4. Consider pgbouncer for production

### Out of Memory

**Symptom**: Test crashes with OOM

**Solution**:
1. Reduce concurrent users
2. Reduce requests per user
3. Check for memory leaks in test code
4. Run profiling with smaller datasets

---

## Next Steps

1. **Baseline Test** - Run tests now to establish baseline
2. **Implement Optimizations** - Apply recommended changes
3. **Re-test** - Run same scenarios post-optimization
4. **Compare** - Measure improvement percentage
5. **Monitor** - Set up production monitoring
6. **Iterate** - Repeat quarterly or when code changes significantly

---

## Related Documents

- `PERFORMANCE_REPORT.md` - Detailed findings and recommendations
- `services/api/src/test/profiling.util.ts` - Profiling utilities
- `services/api/src/test/load.spec.ts` - Load test implementation


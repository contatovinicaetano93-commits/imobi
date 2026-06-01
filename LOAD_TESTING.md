# Load Testing Guide — imbobi Staging

**Purpose:** Validate API performance and stability under various load scenarios before production deployment.

**Scenarios:** Light → Medium → Heavy → Spike → Sustained

**Tools Required:** `ab` (Apache Bench), `jq`, `curl`

---

## Installation

```bash
# macOS
brew install httpd jq

# Ubuntu/Debian
sudo apt-get install apache2-utils jq curl

# Verify
ab -V
jq --version
```

---

## Test Scenarios

### Scenario 1: Light Load (Baseline)
**Purpose:** Verify baseline API performance with minimal concurrent users

**Configuration:**
- Concurrent users: 10
- Requests per user: 10
- Total requests: 100
- Duration: ~1 minute
- Think time: None (back-to-back requests)

**Expected Result:** ✅ PASS
- Response time: <100ms (p50), <500ms (p95)
- Error rate: 0%
- Throughput: >100 req/sec

**Command:**
```bash
ab -n 100 -c 10 -g light-load.tsv http://api-staging.imobi.com/api/v1/health
```

---

### Scenario 2: Medium Load (Typical Peak)
**Purpose:** Simulate typical peak hour traffic

**Configuration:**
- Concurrent users: 50
- Requests per user: 10
- Total requests: 500
- Duration: ~2 minutes
- Think time: 500ms (simulates browser think time)

**Expected Result:** ✅ PASS
- Response time: <200ms (p50), <1000ms (p95)
- Error rate: <0.5%
- Throughput: >40 req/sec

**Command:**
```bash
ab -n 500 -c 50 -g medium-load.tsv \
  -H "X-Think-Time: 500" \
  http://api-staging.imobi.com/api/v1/health
```

---

### Scenario 3: Heavy Load (Stress Test)
**Purpose:** Push system towards its limits

**Configuration:**
- Concurrent users: 200
- Requests per user: 5
- Total requests: 1000
- Duration: ~2-3 minutes
- Think time: None

**Expected Result:** ⚠️ DEGRADED (acceptable)
- Response time: 500-2000ms (p50), 2000-5000ms (p95)
- Error rate: <5%
- Throughput: >30 req/sec
- S3 uploads may timeout (rate limiting)

**Acceptable Failures:**
- File upload endpoints (S3 bottleneck)
- Database connection pool exhaustion
- Redis connection limits

**Command:**
```bash
ab -n 1000 -c 200 -g heavy-load.tsv \
  http://api-staging.imobi.com/api/v1/health
```

---

### Scenario 4: Spike Test (Traffic Burst)
**Purpose:** Handle unexpected traffic surge

**Configuration:**
- Concurrent users: 500 (sudden spike)
- Requests: 100
- Duration: ~30 seconds
- No ramp-up (immediate full load)

**Expected Result:** 🟡 CAUTION
- Response time: 1000-5000ms (p50), 5000-10000ms (p95)
- Error rate: 5-15% (acceptable under spike)
- Graceful degradation (no crashes)
- Retry-After headers sent

**Command:**
```bash
ab -n 500 -c 500 -g spike-load.tsv \
  http://api-staging.imobi.com/api/v1/health
```

---

### Scenario 5: Sustained Load (Endurance)
**Purpose:** Verify stability over extended period

**Configuration:**
- Concurrent users: 100
- Duration: 5 minutes (sustained)
- Requests per second: ~20
- Think time: 500ms

**Expected Result:** ✅ PASS
- Response time: <300ms (p50), <1500ms (p95)
- Error rate: <1%
- No memory leaks (check server logs)
- CPU/memory stable

**Command:**
```bash
for i in {1..5}; do
  echo "Minute $i..."
  ab -n 100 -c 10 -q \
    http://api-staging.imobi.com/api/v1/health
  sleep 60
done
```

---

## Mixed Workflow Test

**Purpose:** Simulate realistic user flows (signup, KYC, simulator)

**Configuration:**
- 50 concurrent users
- Each user: signup → login → view profile → calculator → logout
- 30 iterations
- Total: 150 distinct users, ~750 requests

**Command:**
```bash
bash load-test-workflow.sh api-staging.imobi.com 50
```

---

## Interpreting Results

### Apache Bench Output

```
This is ApacheBench, Version 2.3
...
Concurrency Level:      50
Time taken for tests:   45.234 seconds
Complete requests:      500
Failed requests:        2
Requests per second:    11.05 [#/sec]
Time per request:       4530.22 [ms]
Time per request:       90.60 [ms] (mean, across all concurrent requests)
Transfer rate:          18.45 [Kbytes/sec] received
```

**Key Metrics:**
- **Requests per second:** Target >10 for health endpoints
- **Time per request (concurrent):** Mean time per single request. Target <1000ms for health checks
- **Failed requests:** Should be 0 for light/medium, <5% for heavy/spike
- **Transfer rate:** Indicates network efficiency

### Gnuplot Results (`.tsv` files)

If you have gnuplot installed, visualize results:

```bash
gnuplot << EOF
set terminal png
set output "light-load.png"
set title "Light Load Test Results"
set xlabel "Request #"
set ylabel "Response Time (ms)"
plot "light-load.tsv" using 5:8 with lines
EOF
```

---

## Performance Thresholds

### By Endpoint Type

| Endpoint | Light | Medium | Heavy | Spike |
|----------|-------|--------|-------|-------|
| Health check | <50ms | <100ms | <500ms | <2000ms |
| Auth (login) | <100ms | <300ms | <1000ms | <3000ms |
| File upload | <2000ms | <5000ms | N/A* | N/A* |
| Database query | <200ms | <500ms | <2000ms | <5000ms |
| Cache hit | <10ms | <20ms | <50ms | <200ms |

*File uploads limited to medium load due to S3 bottleneck

### System Metrics to Monitor

During load tests, check server logs/metrics for:

```bash
# CPU Usage
top -b -n 1 | head -5

# Memory Usage
free -h

# Network connections
netstat -an | grep ESTABLISHED | wc -l

# Database connections
psql -h RDS_ENDPOINT -U postgres -d imobi -c "SELECT count(*) FROM pg_stat_activity;"

# Redis memory
redis-cli -h REDIS_ENDPOINT INFO memory
```

---

## Running Complete Test Suite

Execute all scenarios in sequence:

```bash
bash run-load-tests.sh api-staging.imobi.com 2>&1 | tee load-test-results.log
```

Script will:
1. Run all 5 scenarios
2. Collect results in `.tsv` files
3. Generate summary report
4. Output pass/fail status

---

## Failure Scenarios & Recovery

### If Tests Fail at Medium Load

**Possible causes:**
1. Database connection pool exhausted → Increase `pool_size` in Prisma
2. Redis connection limits → Increase ElastiCache `maxclients`
3. Rate limiting kicking in → Review threshold config
4. S3 timeouts → Check IAM permissions and bucket region

**Recovery steps:**
1. Check API logs: `docker logs imobi-api-staging | tail -100`
2. Check database: `psql -h RDS_ENDPOINT -U postgres -d imobi -c "SHOW max_connections;"`
3. Check Redis: `redis-cli -h REDIS_ENDPOINT INFO stats`
4. Increase resource limits and retest

### If Tests Fail at Heavy Load

**Expected:** Some failures are normal. Acceptable if:
- Error rate < 10%
- No cascading failures (one timeout doesn't crash others)
- System recovers after spike

**If not acceptable:**
1. Scale up API instances (add more EC2/ECS tasks)
2. Enable horizontal scaling in load balancer
3. Increase database replica count
4. Migrate to managed cache (AWS ElastiCache dedicated)

---

## Automated Monitoring During Tests

Run in separate terminal:

```bash
watch -n 5 "
  echo '=== API Health ===';
  curl -s http://api-staging.imobi.com/api/v1/health | jq '.status' || echo 'DOWN';
  echo '';
  echo '=== Database Connections ===';
  psql -h RDS_ENDPOINT -U postgres -d imobi -c 'SELECT count(*) FROM pg_stat_activity;' || echo 'Unavailable';
  echo '';
  echo '=== Redis Memory ===';
  redis-cli -h REDIS_ENDPOINT INFO memory | grep used_memory_human || echo 'Unavailable'
"
```

---

## Post-Test Analysis

After running complete test suite:

1. **Generate report:**
   ```bash
   bash analyze-load-tests.sh
   ```
   Produces: `load-test-report.html`

2. **Check logs for errors:**
   ```bash
   grep -i "error\|exception\|timeout" api-staging.log | wc -l
   ```

3. **Database performance:**
   ```bash
   psql -h RDS_ENDPOINT -U postgres -d imobi -c "
     SELECT query, calls, mean_time FROM pg_stat_statements
     ORDER BY mean_time DESC LIMIT 10;
   "
   ```

4. **Redis hit rate:**
   ```bash
   redis-cli -h REDIS_ENDPOINT INFO stats | grep hit_rate
   ```

---

## Load Testing Checklist

- [ ] Staging infrastructure provisioned (RDS, ElastiCache, S3, EC2/ECS)
- [ ] Environment variables configured (.env.staging)
- [ ] Database migrations completed (`pnpm db:migrate`)
- [ ] API server running and responding to health checks
- [ ] Web frontend deployed and accessible
- [ ] CloudWatch monitoring enabled
- [ ] Load testing tools installed (`ab`, `jq`)
- [ ] Baseline health check working
- [ ] Run light load test (10 concurrent, 100 requests)
- [ ] Run medium load test (50 concurrent, 500 requests)
- [ ] Run heavy load test (200 concurrent, 1000 requests)
- [ ] Run spike test (500 concurrent, 100 requests)
- [ ] Run sustained load test (100 concurrent, 5 minutes)
- [ ] Analyze results and document findings
- [ ] Identify bottlenecks and optimization opportunities
- [ ] Plan scaling strategy for production

---

## Next Steps

1. **Staging Validation:** Run this load test suite after infrastructure provisioning
2. **Performance Optimization:** Address bottlenecks identified during testing
3. **Capacity Planning:** Use results to size production infrastructure
4. **SLA Definition:** Set response time SLAs based on observed performance
5. **Alerting:** Configure CloudWatch alerts based on thresholds

---

**Reference:** See `run-load-tests.sh` and `analyze-load-tests.sh` for automated test execution.


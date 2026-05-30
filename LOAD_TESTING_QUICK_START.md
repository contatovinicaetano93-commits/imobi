# Load Testing Quick Start

## One-Command Test Suite

```bash
bash run-load-tests.sh https://api-staging.imobi.com
```

**What it does:**
- ✅ Light load: 10 concurrent, 100 requests
- ✅ Medium load: 50 concurrent, 500 requests  
- ✅ Heavy load: 200 concurrent, 1000 requests
- ✅ Spike: 500 concurrent, 100 requests
- ✅ Sustained: 100 concurrent, 5 minutes

**Results saved to:** `load-test-results-YYYYMMDD-HHMMSS/`

---

## View Results

```bash
# Generate HTML report
bash analyze-load-tests.sh load-test-results-YYYYMMDD-HHMMSS/

# Open report (macOS)
open load-test-results-YYYYMMDD-HHMMSS/load-test-report.html

# Open report (Linux)
xdg-open load-test-results-YYYYMMDD-HHMMSS/load-test-report.html
```

---

## Prerequisites

```bash
# Install Apache Bench
# macOS
brew install httpd

# Ubuntu/Debian
sudo apt-get install apache2-utils jq

# Verify
ab -V
```

---

## Expected Results

| Scenario | Status | Requests | Failure Rate | Response Time |
|----------|--------|----------|--------------|----------------|
| **Light** | ✅ PASS | 100 | 0% | <100ms |
| **Medium** | ✅ PASS | 500 | <0.5% | <200ms |
| **Heavy** | ⚠️ CAUTION | 1000 | <5% | <2000ms |
| **Spike** | 🟡 ACCEPTABLE | 100 | <15% | <5000ms |
| **Sustained** | ✅ PASS | 500 | <1% | <300ms |

---

## Troubleshooting

**Error: "API not responding"**
```bash
# Check if API is running
curl -s http://localhost:4000/api/v1/health | jq '.'
```

**Error: "ab: command not found"**
```bash
# Install Apache Bench
# macOS: brew install httpd
# Linux: sudo apt-get install apache2-utils
```

**Test incomplete / timeout**
```bash
# Run without spike test (shorter duration)
bash run-load-tests.sh https://api-staging.imobi.com --skip-spike
```

---

## Monitoring During Tests

Run in separate terminal:

```bash
# Watch API health
watch -n 2 'curl -s http://api-staging.imobi.com/api/v1/health | jq "."'

# Watch database connections
watch -n 5 'psql -h RDS_HOST -U postgres -d imobi -c "SELECT count(*) FROM pg_stat_activity;"'

# Watch Redis memory
watch -n 5 'redis-cli -h REDIS_HOST INFO memory | grep used_memory_human'
```

---

## Performance Optimization

If tests show degradation:

1. **Database bottleneck?**
   ```bash
   # Increase connection pool
   # In services/api/src/main.ts, update DATABASE_URL pool config
   DATABASE_URL="postgresql://...?connection_limit=40"
   ```

2. **Redis memory high?**
   ```bash
   # Increase ElastiCache instance size
   # AWS ElastiCache → Modify → cache.t3.small
   ```

3. **Too many errors at heavy load?**
   ```bash
   # Add rate limiting / circuit breaker
   # Review SECURITY_VALIDATION_REPORT.md for rate limit tiers
   ```

---

## Next Steps

1. ✅ **Run baseline test** — Before any deployments
2. ⚠️ **Monitor staging** — First 24 hours after deployment
3. 📊 **Plan capacity** — Use results for production sizing
4. 🚀 **Set up alerts** — Based on identified thresholds

---

**Full Guide:** See `LOAD_TESTING.md` for detailed configuration and interpretation.


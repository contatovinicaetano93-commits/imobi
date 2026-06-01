# imobi Testing & Validation Guide

Complete guide for running automated validation, security, and performance tests on the imobi staging environment.

**Generated:** 2026-05-31  
**Status:** ✅ Ready for Staging Deployment

---

## Overview

This guide covers three automated testing suites:

1. **VALIDATION_SUITE.sh** — Health checks, API endpoints, security headers, CORS, rate limiting
2. **SECURITY_TEST_AUTOMATION.sh** — OWASP Top 10 vulnerability testing
3. **k6-load-test.js** — Performance and load testing (50-100 concurrent users)

---

## Prerequisites

### Required Tools
```bash
# API validation suite
curl        # Usually pre-installed
jq          # JSON query tool (optional, for pretty-printing)

# Security testing
bash        # Shell scripting support
grep, sed   # Text processing utilities

# Load testing (optional, recommended)
k6          # Install from https://k6.io/docs/getting-started/installation/
```

### Environment Setup
```bash
# Ensure API and Web servers are running
# From project root:
pnpm dev  # Starts both web (3000) and API (4000)

# Or start separately:
pnpm --filter @imbobi/web dev      # Web on :3000
pnpm --filter @imbobi/api start    # API on :4000
```

### Database & External Services
For full testing on staging, you'll need:
- PostgreSQL 14+ (RDS or local)
- Redis 7+ (ElastiCache or local)
- AWS credentials (if testing S3/CloudWatch integration)

---

## Quick Start

### 1. Run Complete Validation Suite
```bash
cd /home/user/imobi

# Test against local dev environment
./VALIDATION_SUITE.sh

# Or specify custom URLs
./VALIDATION_SUITE.sh http://api.staging.imbobi.com.br https://staging.imbobi.com.br
```

**Expected Output:**
```
✓ API Health (200)
✓ API Liveness (200)
✓ API Readiness (200)
✓ Signup endpoint (400)
✓ Login endpoint (400)
✓ Content-Security-Policy header present
✓ X-Frame-Options header present
✓ CORS properly restricts unauthorized origins
✓ Rate limiting active (429 Too Many Requests)
...

✅ ALL VALIDATION TESTS PASSED
```

---

### 2. Run Security Tests
```bash
# Test against local development
./SECURITY_TEST_AUTOMATION.sh

# Or staging environment
./SECURITY_TEST_AUTOMATION.sh https://api.staging.imbobi.com.br
```

**Tests Covered:**
- A01: Broken Access Control (authentication checks)
- A02: Cryptographic Failures (HTTPS enforcement)
- A03: Injection (SQL injection, XSS prevention)
- A04: Insecure Design (input validation, password requirements)
- A05: Misconfiguration (security headers)
- A07: Authentication Failures (rate limiting, token security)
- A08: Data Integrity (CSRF, CORS)
- A09: Logging & Monitoring (health endpoints)
- A10: SSRF Prevention (open redirects)

**Expected Output:**
```
→ Access without token should be denied
✓ Protected endpoint requires authentication
→ Invalid token should be rejected
✓ Invalid token properly rejected
...

✅ SECURITY TESTS PASSED
```

---

### 3. Run Load Test (k6)
```bash
# Install k6 first
# macOS: brew install k6
# Linux: https://k6.io/docs/getting-started/installation/
# Windows: https://k6.io/docs/getting-started/installation/

# Run against local API
k6 run k6-load-test.js

# Run against staging
k6 run -e API_URL=https://api.staging.imbobi.com.br k6-load-test.js

# Run with custom output format
k6 run k6-load-test.js --out json=results.json
```

**Test Stages:**
- **30s warm-up:** Ramp from 0 → 10 users
- **1m ramp-up:** Increase to 50 users
- **2m sustained:** Hold at 50 users
- **1m spike:** Jump to 100 users
- **2m sustained:** Hold at 100 users
- **30s cool-down:** Ramp down to 0 users

**Thresholds (will fail test if exceeded):**
- `http_req_duration`: p95 < 500ms, p99 < 1000ms
- `http_req_failed`: < 10% error rate
- `health_check_success`: > 95% success rate
- `api_duration`: avg < 300ms, max < 1000ms

**Expected Output:**
```
✓ [==================================================] 100 users
↓ setup
↓ teardown
     checks....................... 89.2% ✓ 900     ✗ 110
     data_sent..................... 180 MB
     data_received................. 350 MB
     group_duration................ avg=245ms   min=10ms  med=198ms p(90)=412ms p(95)=487ms max=2156ms
     http_req_duration............. avg=187ms   min=5ms   med=142ms p(90)=387ms p(95)=486ms p(99)=892ms max=2156ms
     http_req_failed............... 2.5%
     iterations.................... 456
     vus........................... 100
     vus_max....................... 100
```

---

## Testing Phases (CI/CD Integration)

### Phase 1: Quick Validation (5-10 minutes)
Run before any deployment attempt:
```bash
./VALIDATION_SUITE.sh
```

### Phase 2: Security Verification (10-15 minutes)
Run before staging deployment:
```bash
./SECURITY_TEST_AUTOMATION.sh
```

### Phase 3: Load Testing (10-15 minutes)
Run after application deployment:
```bash
k6 run k6-load-test.js
```

### Phase 4: Manual E2E Testing (30+ minutes)
Test user workflows not covered by automation:
1. Sign up with test account
2. Complete KYC profile upload
3. Run credit simulator
4. Upload evidence photos with GPS validation
5. Manager approval workflows

---

## Test Cases by Feature

### Authentication Flow
```bash
# Sign up
curl -X POST http://localhost:4000/api/v1/auth/registrar \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "João Silva",
    "cpf": "12345678901",
    "email": "joao@example.com",
    "telefone": "11999999999",
    "senha": "SecurePassword123!"
  }'

# Login
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "joao@example.com",
    "password": "SecurePassword123!"
  }'

# Token refresh (with valid refresh token)
curl -X POST http://localhost:4000/api/v1/auth/renovar \
  -H "Authorization: Bearer <refresh-token>"
```

### Credit Simulator
```bash
curl -X POST http://localhost:4000/api/v1/credito/simular \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access-token>" \
  -d '{
    "valor": 50000,
    "prazo": 24
  }'
```

### KYC Document Upload
```bash
curl -X POST http://localhost:4000/api/v1/kyc/upload \
  -H "Authorization: Bearer <access-token>" \
  -F "documento=@/path/to/id.pdf" \
  -F "tipoDocumento=RG"
```

### Evidence Photo Upload (with GPS validation)
```bash
curl -X POST http://localhost:4000/api/v1/evidencias \
  -H "Authorization: Bearer <access-token>" \
  -F "foto=@/path/to/photo.jpg" \
  -F "latitude=-23.5505" \
  -F "longitude=-46.6333" \
  -F "etapaId=uuid"
```

---

## Performance Baselines

### Expected Metrics

**Response Times (p95):**
- Health checks: < 100ms
- Login/Signup: < 500ms
- Credit simulator: < 300ms
- List works: < 400ms (with caching)

**Error Rates:**
- Overall: < 1%
- Authentication: < 0.5%
- Database operations: < 2%

**Cache Hit Rate:**
- Score calculations: > 85%
- Works list: > 90%

---

## Debugging Failed Tests

### Validation Suite Failures

**Health endpoint timeout:**
```bash
# Check if API is running
lsof -i :4000

# Check API logs
docker logs <container-id>
# Or for local: tail -f /tmp/api.log
```

**Database connectivity:**
```bash
# Verify database is accessible
psql -h $RDS_ENDPOINT -d imbobi_staging -U postgres \
  -c "SELECT 1" 

# Or for local
psql -h localhost -d imbobi_staging -U postgres \
  -c "SELECT 1"
```

**Redis connectivity:**
```bash
# Test Redis connection
redis-cli -h $REDIS_ENDPOINT PING

# Or locally
redis-cli PING
```

### Security Test Failures

**Missing headers:**
Check that Helmet.js is properly configured in API:
```bash
# Verify main.ts has security middleware
grep -n "helmet" services/api/src/main.ts
```

**Rate limiting not working:**
Check that Throttler guard is applied:
```bash
# Verify rate limiting is configured
grep -r "ThrottlerGuard" services/api/src
```

### Load Test Failures

**High error rate:**
```bash
# Check API logs for errors during test
docker logs <container-id> --tail 100

# Check database slow query log
aws logs tail /aws/rds/imbobi --follow
```

**High latency (p95 > 500ms):**
```bash
# Check Redis cache status
redis-cli INFO stats

# Check database connection pool
curl http://localhost:4000/api/v1/health/ready | jq '.details.database'
```

---

## CI/CD Integration

### GitHub Actions Example
```yaml
name: Staging Validation

on: [push]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Build
        run: pnpm build
      
      - name: Start services
        run: |
          pnpm --filter @imbobi/api start &
          pnpm --filter @imbobi/web start &
          sleep 10
      
      - name: Run validation suite
        run: ./VALIDATION_SUITE.sh
      
      - name: Run security tests
        run: ./SECURITY_TEST_AUTOMATION.sh

  load-test:
    runs-on: ubuntu-latest
    needs: validate
    if: success()
    steps:
      - uses: actions/checkout@v3
      
      - name: Install k6
        run: |
          sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3232A
          echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Build and start
        run: |
          pnpm build
          pnpm --filter @imbobi/api start &
          sleep 10
      
      - name: Run load test
        run: k6 run k6-load-test.js
      
      - name: Upload results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: load-test-results
          path: summary.json
```

---

## Manual Testing Checklist

Use this checklist for manual E2E testing:

### Authentication
- [ ] Sign up with valid credentials
- [ ] Sign up with invalid email format (rejected)
- [ ] Sign up with weak password (rejected)
- [ ] Login with valid credentials
- [ ] Login with wrong password (error message)
- [ ] Logout clears session
- [ ] Token refresh works
- [ ] Expired token triggers re-login

### User Profile
- [ ] View my profile
- [ ] Edit profile information
- [ ] Update phone number
- [ ] Changes persist after logout/login

### KYC Profile
- [ ] Upload ID document
- [ ] Document shows in profile
- [ ] Upload second document
- [ ] Document status shows correctly (ENVIADO)
- [ ] Cannot proceed without KYC approval

### Credit Features
- [ ] Simulator calculates interest correctly
  - Input: R$50k, 24 months
  - Validate: Monthly installment formula
- [ ] Create credit request
- [ ] View credit history
- [ ] Check credit status updates

### Evidence Management
- [ ] GPS validation works
  - Photos taken > 2km away rejected
  - Valid GPS coordinates accepted
- [ ] Upload evidence photo
- [ ] Evidence appears in manager dashboard
- [ ] Manager can approve/reject
- [ ] Status updates in user view

### Performance
- [ ] Sign up completes in < 2 seconds
- [ ] Credit simulator calculates in < 300ms
- [ ] Works list loads in < 1 second (cached)
- [ ] Images load without blocking UI

### Security
- [ ] Cannot access /admin without permission
- [ ] Cannot view other user's data
- [ ] CSRF token validated on forms
- [ ] Passwords not visible in network tab
- [ ] Session expires after inactivity

---

## Reporting Issues

When tests fail, document:

1. **Environment Info**
   - API URL and version
   - Database (RDS or local)
   - Redis version
   - Timestamp of test

2. **Test Output**
   - Full error message
   - HTTP status code if applicable
   - Response body (JSON)
   - Stack trace

3. **System Metrics**
   - CPU/Memory utilization
   - Database query time
   - Cache hit rate

4. **Reproduction Steps**
   - Exact curl command used
   - Request payload
   - Expected vs actual response

---

## Success Criteria

### Validation Suite
- ✅ All 30+ checks pass
- ✅ No security header warnings
- ✅ Health endpoints respond < 200ms

### Security Tests
- ✅ All OWASP Top 10 tests pass
- ✅ Rate limiting active
- ✅ No token leakage in URLs
- ✅ CORS properly configured

### Load Test
- ✅ p95 response time < 500ms
- ✅ p99 response time < 1000ms
- ✅ Error rate < 10%
- ✅ > 95% health check success

### Manual E2E
- ✅ Complete signup → login → credit request flow
- ✅ KYC profile functional
- ✅ Evidence upload with GPS validation
- ✅ Manager approval workflow works

---

## Next Steps After Testing

1. **All tests pass?**
   - ✅ Ready for production deployment
   - Schedule production deployment
   - Plan rollback procedures

2. **Security tests fail?**
   - Review SECURITY_SUMMARY.md
   - Fix vulnerabilities
   - Re-run tests

3. **Load tests show issues?**
   - Check CloudWatch metrics
   - Review slow queries
   - Increase cache TTL or add indexes
   - Scale horizontally if needed

---

## References

- [DEPLOYMENT_START_HERE.md](./DEPLOYMENT_START_HERE.md) — Deployment overview
- [SECURITY_SUMMARY.md](./SECURITY_SUMMARY.md) — All 20 OWASP fixes documented
- [MONITORING_AND_ALERTING.md](./MONITORING_AND_ALERTING.md) — CloudWatch setup
- [PRE_DEPLOYMENT_VALIDATION.md](./PRE_DEPLOYMENT_VALIDATION.md) — Detailed test cases

---

**Last Updated:** 2026-05-31  
**Status:** ✅ Ready for Staging

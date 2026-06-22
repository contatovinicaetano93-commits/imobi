# E2E Production Validation Guide

Complete guide for running post-deployment E2E validation tests for Imobi API.

**Document Version**: 1.0  
**Last Updated**: 2026-06-22  
**Estimated Runtime**: < 30 minutes (5 phases)  
**Success Criteria**: All 5 phases pass with ≥ 95% assertion success rate

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Test Phases Overview](#test-phases-overview)
3. [Prerequisites](#prerequisites)
4. [Running Tests](#running-tests)
5. [Expected Results](#expected-results)
6. [Success Criteria](#success-criteria)
7. [Troubleshooting](#troubleshooting)
8. [Test Data Management](#test-data-management)
9. [Rollback Procedures](#rollback-procedures)

---

## Quick Start

### One-Command Validation

```bash
# Make script executable
chmod +x PRODUCTION_E2E_VALIDATION_SCRIPT.sh

# Run against production API
./PRODUCTION_E2E_VALIDATION_SCRIPT.sh https://api.imobi.com

# Run locally (for development)
./PRODUCTION_E2E_VALIDATION_SCRIPT.sh http://localhost:4000 --verbose

# Run with cleanup disabled (to inspect test data)
CLEANUP=false ./PRODUCTION_E2E_VALIDATION_SCRIPT.sh https://api.imobi.com
```

### Expected Output

```
═══════════════════════════════════════════════════════════
IMOBI PRODUCTION E2E VALIDATION
═══════════════════════════════════════════════════════════

[INFO] API URL: https://api.imobi.com
[INFO] Starting 5-phase validation suite...

>>> PHASE 1: API Health Check
[TEST] GET /api/v1/health → Health status
[PASS] HTTP 200 (expected 200)
...

>>> PHASE 2: Authentication Flow
[TEST] POST /api/v1/auth/registrar → Register constructor
[PASS] Registration creates user (201)
...

[Final Report shows all 5 phases with pass/fail status]
```

---

## Test Phases Overview

### Phase 1: API Health Check (5 min)
**Purpose**: Verify all external services are connected and database/Redis are operational.

**Tests**:
- ✓ Health endpoint responds with 200 OK
- ✓ Redis connectivity verified
- ✓ Database configuration verified
- ✓ All service dependencies report "configured: true"

**Endpoints**:
- `GET /api/v1/health`

---

### Phase 2: Authentication Flow (5 min)
**Purpose**: Validate user registration, login, JWT generation, and token-based access control.

**Tests**:
- ✓ User registration creates account (201)
- ✓ Login generates valid JWT token
- ✓ User profile retrieval requires valid token
- ✓ Invalid/missing tokens return 401
- ✓ Token claims include required fields

**Endpoints**:
- `POST /api/v1/auth/registrar` — User registration
- `POST /api/v1/auth/login` — Login & token generation
- `GET /api/v1/usuarios/meu-perfil` — Authenticated access

**Test Accounts Created**:
- Constructor: `constructor-e2e-{TIMESTAMP}@imbobi.test`
- Manager: `manager-e2e-{TIMESTAMP}@imbobi.test`

---

### Phase 3: Core Features (8 min)
**Purpose**: Validate main application workflows: obra creation, listing, notifications.

**Tests**:
- ✓ Obra listing with pagination
- ✓ Obra creation with GPS validation
- ✓ Obra detail retrieval
- ✓ Notification listing and structure
- ✓ User profile updates

**Endpoints**:
- `GET /api/v1/obras` — List obras
- `POST /api/v1/obras` — Create obra
- `GET /api/v1/obras/{obraId}` — Get obra details
- `GET /api/v1/notificacoes` — List notifications
- `GET /api/v1/usuarios/meu-perfil` — User profile

**Test Data Created**:
- 1 test obra with metadata and GPS coordinates
- 1 test notification (may be generated during workflow)

---

### Phase 4: Manager Portal & Workflows (5 min)
**Purpose**: Validate manager-only endpoints, approval workflows, and authorization.

**Tests**:
- ✓ Manager dashboard accessible by manager role
- ✓ Manager dashboard returns KPI metrics
- ✓ Pending etapas listing with filters
- ✓ Non-manager users cannot access manager endpoints (403/401)

**Endpoints**:
- `GET /api/v1/manager/dashboard` — Manager KPI dashboard
- `GET /api/v1/manager/etapas-pendentes` — Pending work items
- Role-based access control verification

**Authorization**:
- Manager role: Full access
- Constructor role: Access denied (403)

---

### Phase 5: Performance & Load (7 min)
**Purpose**: Validate response times, caching behavior, rate limiting, and error handling.

**Tests**:
- ✓ Response time benchmarks (10 sequential requests)
  - Average response time < 800ms (read endpoints)
  - Min/max variations acceptable
- ✓ Error rate < 10% on 10 sequential requests
- ✓ Rate limiting enforced (429 on limit exceed)
- ✓ Invalid query parameters return 400
- ✓ Missing authorization returns 401
- ✓ Server errors handled gracefully

**Metrics Tracked**:
- Min response time
- Max response time
- Average response time
- Error rate
- Rate limit detection

---

## Prerequisites

### Infrastructure Requirements

1. **API Server Running**
   - NestJS server started and listening on configured port
   - Environment variables properly set
   - Database migrations applied
   - Redis connected

2. **Database & Services**
   - PostgreSQL with PostGIS extension
   - Redis instance accessible
   - Email provider configured (optional for tests)
   - Firebase configured (optional for tests)
   - S3 configured (optional for tests)

3. **Network Access**
   - Firewall allows HTTP/HTTPS to API endpoint
   - DNS resolves API domain
   - No IP blocking or rate limiting by upstream proxy

### Tools Required

```bash
# Linux/macOS with bash
bash --version  # >= 4.0

# curl for HTTP requests
curl --version  # >= 7.0

# jq for JSON parsing (optional, script handles without it)
jq --version    # >= 1.6
```

### Environment Setup

```bash
# 1. Export API URL
export API_URL="https://api.imobi.com"  # Production
# OR
export API_URL="http://localhost:4000"  # Development

# 2. Ensure script is executable
chmod +x PRODUCTION_E2E_VALIDATION_SCRIPT.sh

# 3. (Optional) Enable verbose output
export VERBOSE=true

# 4. (Optional) Disable cleanup to inspect test data
export CLEANUP=false
```

---

## Running Tests

### Basic Execution

```bash
./PRODUCTION_E2E_VALIDATION_SCRIPT.sh https://api.imobi.com
```

### With Verbose Output

```bash
./PRODUCTION_E2E_VALIDATION_SCRIPT.sh https://api.imobi.com --verbose
```

### Development/Local Testing

```bash
# Ensure services are running
docker-compose -f services/api/docker-compose.test.yml up -d

# Run validation
./PRODUCTION_E2E_VALIDATION_SCRIPT.sh http://localhost:4000

# View logs if needed
docker-compose -f services/api/docker-compose.test.yml logs -f api

# Cleanup
docker-compose -f services/api/docker-compose.test.yml down
```

### CI/CD Integration

```bash
# GitHub Actions example
jobs:
  e2e-validation:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run E2E Validation
        run: |
          chmod +x PRODUCTION_E2E_VALIDATION_SCRIPT.sh
          ./PRODUCTION_E2E_VALIDATION_SCRIPT.sh ${{ secrets.API_URL }}
        env:
          CLEANUP: 'true'
```

---

## Expected Results

### Phase 1: Health Check
**Expected HTTP Responses**:
```
✓ GET /api/v1/health → 200 OK
  {
    "status": "ok",
    "timestamp": "2026-06-22T10:30:45.123Z",
    "redis": {
      "status": "connected",
      "host": "host.upstash.io",
      "port": 6379
    },
    "database": {
      "configured": true
    },
    "email": {
      "provider": "sendgrid",
      "configured": true
    },
    "firebase": {
      "configured": true
    }
  }
```

**Pass Criteria**:
- [ ] HTTP Status: 200 OK
- [ ] `status` = "ok" (not "degraded" or "error")
- [ ] `redis.status` = "connected"
- [ ] All services show `configured: true`
- [ ] Response time < 2s

---

### Phase 2: Authentication
**Expected HTTP Responses**:

#### Registration
```
✓ POST /api/v1/auth/registrar → 201 Created
  {
    "usuarioId": "clxxxxx...",
    "email": "test@imbobi.test",
    "nome": "Test User",
    "access_token": "eyJhbGc..."
  }
```

#### Login
```
✓ POST /api/v1/auth/login → 200 OK
  {
    "access_token": "eyJhbGc...",
    "refresh_token": "ref_xxxxx...",
    "usuario": {
      "usuarioId": "clxxxxx...",
      "email": "test@imbobi.test",
      "nome": "Test User"
    }
  }
```

#### Profile (with valid JWT)
```
✓ GET /api/v1/usuarios/meu-perfil → 200 OK
  {
    "usuarioId": "clxxxxx...",
    "email": "test@imbobi.test",
    "nome": "Test User",
    "avatar": "https://...",
    "createdAt": "2026-06-22T10:00:00Z"
  }
```

#### Profile (with invalid JWT)
```
✓ GET /api/v1/usuarios/meu-perfil → 401 Unauthorized
  {
    "message": "Invalid or expired token",
    "statusCode": 401
  }
```

**Pass Criteria**:
- [ ] Registration HTTP: 201
- [ ] Login HTTP: 200
- [ ] JWT token is non-empty string
- [ ] Profile with valid token HTTP: 200
- [ ] Profile with invalid token HTTP: 401
- [ ] All responses include expected fields

---

### Phase 3: Core Features
**Expected HTTP Responses**:

#### List Obras
```
✓ GET /api/v1/obras → 200 OK
  {
    "data": [
      {
        "obraId": "clxxxxx...",
        "nome": "Obra E2E Test",
        "endereco": "Rua Test 123, São Paulo, SP",
        "status": "ATIVA",
        "createdAt": "2026-06-22T10:00:00Z"
      }
    ],
    "total": 1,
    "limit": 10,
    "offset": 0
  }
```

#### Create Obra
```
✓ POST /api/v1/obras → 201 Created
  {
    "obraId": "clxxxxx...",
    "nome": "Obra E2E Test",
    "endereco": "Rua Test 123, São Paulo, SP",
    "status": "ATIVA",
    "etapas": []
  }
```

#### List Notifications
```
✓ GET /api/v1/notificacoes → 200 OK
  {
    "data": [],
    "total": 0,
    "limit": 20,
    "offset": 0
  }
```

**Pass Criteria**:
- [ ] Obras list HTTP: 200
- [ ] Response includes pagination fields
- [ ] Create obra HTTP: 201
- [ ] Created obra includes obraId
- [ ] Notifications list HTTP: 200

---

### Phase 4: Manager Portal
**Expected HTTP Responses**:

#### Manager Dashboard (Manager Role)
```
✓ GET /api/v1/manager/dashboard → 200 OK
  {
    "etapasAguardando": 0,
    "kycAguardando": 0,
    "emVistoria": 0,
    "recentApprovals": [],
    "kpis": {
      "totalObras": 0,
      "totalUsuarios": 2
    }
  }
```

#### Manager Dashboard (Constructor Role)
```
✓ GET /api/v1/manager/dashboard → 403 Forbidden
  {
    "message": "Access denied. Manager role required.",
    "statusCode": 403
  }
```

#### Pending Etapas
```
✓ GET /api/v1/manager/etapas-pendentes → 200 OK
  {
    "data": [],
    "total": 0,
    "limit": 10,
    "offset": 0
  }
```

**Pass Criteria**:
- [ ] Manager access HTTP: 200
- [ ] Dashboard returns KPI fields
- [ ] Constructor access HTTP: 403 or 401
- [ ] Etapas list HTTP: 200
- [ ] Response includes pagination

---

### Phase 5: Performance & Load
**Expected Metrics**:

```
Response Times:
  Min:     120ms
  Avg:     350ms
  Max:     750ms
  Target:  < 800ms p95 ✓

Error Rate:
  Failures: 0 of 10
  Rate:     0%
  Target:   < 10% ✓

Rate Limiting:
  Detections: 3 (on 15 rapid auth attempts)
  Status:     Working ✓

Error Handling:
  Invalid query (400):     ✓
  Missing auth (401):      ✓
  Invalid token (401):     ✓
```

**Pass Criteria**:
- [ ] Average response time < 800ms
- [ ] Error rate < 10%
- [ ] Rate limiting detected (429 responses)
- [ ] Invalid inputs return 400
- [ ] Unauthorized requests return 401

---

## Success Criteria

### Minimum Requirements (GO/NOGO Decision)

| Phase | Metric | Threshold | Status |
|-------|--------|-----------|--------|
| 1 | Health endpoint HTTP | = 200 | **REQUIRED** |
| 1 | Redis connected | = true | **REQUIRED** |
| 1 | Database configured | = true | **REQUIRED** |
| 2 | Registration HTTP | = 201 | **REQUIRED** |
| 2 | Login HTTP | = 200 | **REQUIRED** |
| 2 | JWT token present | = true | **REQUIRED** |
| 3 | Obras list HTTP | = 200 | **REQUIRED** |
| 3 | Create obra HTTP | = 201 | **REQUIRED** |
| 4 | Manager access HTTP | = 200 | **REQUIRED** |
| 4 | Authorization check | = 403/401 | **REQUIRED** |
| 5 | Avg response time | < 800ms | **REQUIRED** |
| 5 | Error rate | < 10% | **REQUIRED** |

### Deployment Readiness

**✓ GREEN (GO)**: All required tests pass + ≥ 95% assertion success  
**⚠ YELLOW (HOLD)**: Required tests pass but ≥ 3 non-critical failures  
**✗ RED (NO-GO)**: Any required test fails or < 90% pass rate  

### Final Sign-Off Checklist

```bash
# Before marking production as ready:

# 1. Run validation script
chmod +x PRODUCTION_E2E_VALIDATION_SCRIPT.sh
./PRODUCTION_E2E_VALIDATION_SCRIPT.sh https://api.imobi.com

# 2. Verify all REQUIRED criteria pass
# (Review Final Report section)

# 3. Check response times are acceptable
# (Phase 5: Performance metrics < 800ms average)

# 4. Verify rate limiting is active
# (Phase 5: 429 responses detected)

# 5. Confirm no critical errors in logs
# Review application logs for any warnings/errors

# 6. Sign off
echo "✓ Production validation complete - READY TO DEPLOY"
```

---

## Troubleshooting

### Issue: "API is not reachable"

**Symptom**: Script exits immediately with connectivity error.

**Root Causes**:
1. API server not running
2. Wrong API URL
3. Network/firewall blocking

**Solutions**:

```bash
# 1. Verify API is running
curl http://localhost:4000/api/v1/health

# 2. Check URL is correct
echo $API_URL
# Should output: https://api.imobi.com (or your API URL)

# 3. Test network connectivity
ping api.imobi.com
# Should return responses (no packet loss)

# 4. Check firewall
sudo ufw status
# Or: iptables -L

# 5. Verify DNS resolution
nslookup api.imobi.com
# Should return IP address(es)

# 6. Test with curl directly
curl -v https://api.imobi.com/api/v1/health
# Look for "Connected to" and HTTP status
```

---

### Issue: "Health endpoint returns degraded"

**Symptom**: Phase 1 shows `status: "degraded"` or `status: "error"`

**Root Causes**:
1. Redis unreachable
2. Database connection failed
3. Service credentials missing

**Solutions**:

```bash
# 1. Check Redis connection
redis-cli ping
# Should return: PONG

# 2. Check PostgreSQL connection
psql postgresql://user:pass@localhost:5432/imobi_prod -c "SELECT 1"
# Should return: 1

# 3. Verify environment variables
echo $DATABASE_URL
echo $REDIS_URL
echo $JWT_SECRET

# 4. Check service logs
# Vercel: https://vercel.com/dashboard → Deployments → Logs
# Or: journalctl -u api-service -n 50

# 5. Restart services
# Docker: docker restart postgres redis
# Vercel: Redeploy

# 6. Verify credentials in production config
# Check all required vars are set (see PRODUCTION_VALIDATION.md)
```

---

### Issue: "Registration fails with 500 error"

**Symptom**: Phase 2 fails at user registration step.

**Root Causes**:
1. Database schema not migrated
2. Email service misconfigured
3. Application error

**Solutions**:

```bash
# 1. Check database migrations
cd services/api
npx prisma migrate status --schema prisma/schema.prisma

# 2. Run pending migrations
npx prisma migrate deploy --schema prisma/schema.prisma

# 3. Verify email configuration
echo $EMAIL_PROVIDER
echo $SENDGRID_API_KEY  # If using SendGrid

# 4. Check application logs
tail -n 100 /var/log/api.log

# 5. For Vercel deployments
# View deployment logs at: https://vercel.com/dashboard
# Look for SQL errors, migration failures

# 6. Test registration manually
curl -X POST http://localhost:4000/api/v1/auth/registrar \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test@123","nome":"Test"}'
```

---

### Issue: "Tests timeout or hang"

**Symptom**: Script seems to freeze or take > 30 minutes.

**Root Causes**:
1. Slow network/API response
2. Database query taking too long
3. Redis/cache issues
4. External service blocking

**Solutions**:

```bash
# 1. Check response times
time curl https://api.imobi.com/api/v1/health
# Should complete in < 2 seconds

# 2. Check database performance
# In PostgreSQL:
SELECT * FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;

# 3. Monitor Redis performance
redis-cli --stat

# 4. Check network latency
ping -c 5 api.imobi.com
# Look for ping times > 500ms (investigate if so)

# 5. Increase shell timeouts (if needed)
# Edit script: Increase curl timeout flags

# 6. Run with strace to debug
strace -e trace=network ./PRODUCTION_E2E_VALIDATION_SCRIPT.sh https://api.imobi.com
```

---

### Issue: "Rate limiting tests fail or detect false positives"

**Symptom**: Phase 5 reports no rate limiting detected, or too many 429s.

**Root Causes**:
1. Rate limiting not configured
2. Rate limiting too strict (blocking legitimate traffic)
3. Rate limiting per-IP vs global

**Solutions**:

```bash
# 1. Check rate limiting configuration
# In services/api/src/app.module.ts:
grep -n "Throttle" src/app.module.ts

# 2. Verify rate limit is not too strict
# Auth endpoints: 10 req/min (should allow 1st 10 requests)
# General: 100 req/min

# 3. Test rate limiting manually
for i in {1..15}; do
  curl -w "Request $i: %{http_code}\n" -s -o /dev/null \
    https://api.imobi.com/api/v1/auth/login \
    -X POST \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"test"}'
done

# 4. If rate limiting too strict:
# Edit services/api/src/app.module.ts
# Increase limit thresholds (e.g., 10 → 20 req/min)

# 5. If rate limiting not working:
# Ensure @Throttle() decorator applied to endpoints
# Verify ThrottlerGuard is registered in app
```

---

### Issue: "Manager authorization tests fail"

**Symptom**: Phase 4 shows manager endpoints accessible to all roles.

**Root Causes**:
1. Role-based access control not implemented
2. @UseGuards() decorator missing
3. Manager role not assigned to test user

**Solutions**:

```bash
# 1. Check guard implementation
grep -rn "@UseGuards.*" services/api/src/modules/manager/

# 2. Verify role assignment logic
grep -n "ROLE\|manager" services/api/src/common/guards/

# 3. Check test user role assignment
# Query database:
SELECT email, tipoUsuario FROM usuario WHERE email LIKE 'manager-e2e-%';

# 4. Verify role-based access control
# Look for @Roles() decorator usage
grep -rn "@Roles" services/api/src/

# 5. If guards missing:
# Add to manager controller:
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(TipoUsuario.MANAGER)
```

---

### Issue: "Performance metrics show slow responses"

**Symptom**: Phase 5 shows avg response time > 800ms.

**Root Causes**:
1. Database queries not optimized
2. Redis caching not working
3. API resource constraints (CPU/memory)
4. Network latency

**Solutions**:

```bash
# 1. Profile database queries
# Enable query logging:
export DATABASE_DEBUG=true
NODE_ENV=production pnpm dev

# 2. Check database query performance
# In PostgreSQL:
SELECT query, mean_exec_time, calls FROM pg_stat_statements
  ORDER BY mean_exec_time DESC LIMIT 10;

# 3. Verify Redis caching working
redis-cli
> INFO stats
> Look for "keyspace_hits" and "keyspace_misses"
> Hit ratio should be > 50%

# 4. Monitor API resource usage
docker stats api-container
# Check CPU and memory usage

# 5. Optimize slow queries
# Add database indexes:
CREATE INDEX idx_obra_usuario ON obra(usuario_id);
CREATE INDEX idx_etapa_status ON etapa(status);

# 6. Enable Redis caching for frequently accessed endpoints
# In etapas.controller.ts:
@CacheKey('pending-etapas')
@Cacheable()
```

---

## Test Data Management

### Test Accounts Created

The validation script creates temporary test accounts:

```
Constructor:
  Email: constructor-e2e-{TIMESTAMP}@imbobi.test
  Password: TempPassword123!
  Role: CONSTRUTORA

Manager:
  Email: manager-e2e-{TIMESTAMP}@imbobi.test
  Password: TempPassword123!
  Role: MANAGER
```

### Test Data Created

1. **User Accounts** (2)
   - Constructor account with permissions
   - Manager account with permissions

2. **Obra Records** (1)
   - Test obra with GPS coordinates
   - Status: ATIVA

3. **Notifications** (0-N)
   - May be generated during workflow tests
   - Automatically cleaned up

### Cleanup Process

After validation completes:

```bash
# Automatic cleanup (default)
# - Test accounts deleted from database
# - Test obras deleted
# - Test notifications cleaned up

# Manual cleanup (if CLEANUP=false)
# Use admin API to delete test accounts:
curl -X DELETE https://api.imobi.com/api/v1/admin/usuarios/constructor-e2e-{TIMESTAMP}@imbobi.test \
  -H "Authorization: Bearer <admin-token>"

# Or use database directly:
# In PostgreSQL:
DELETE FROM usuario WHERE email LIKE 'constructor-e2e-%';
DELETE FROM usuario WHERE email LIKE 'manager-e2e-%';
```

### Data Retention

```bash
# To keep test data for manual inspection:
CLEANUP=false ./PRODUCTION_E2E_VALIDATION_SCRIPT.sh https://api.imobi.com

# To manually cleanup later:
# Option 1: Use database directly
psql $DATABASE_URL -c "DELETE FROM usuario WHERE email LIKE 'e2e-%';"

# Option 2: Use admin API endpoint
# (Requires admin role and endpoint implementation)
```

---

## Rollback Procedures

### If Validation Fails

**Decision Flow**:

```
Validation Result
    ├─ ✓ ALL PASS
    │   └─→ Monitor production (1-2 hours)
    │       └─→ All systems stable? YES → COMPLETE
    │
    ├─ ⚠ WARNINGS ONLY (non-critical)
    │   └─→ Review each warning
    │       ├─ Expected? → Document & Continue
    │       └─ Unexpected? → Investigate
    │
    └─ ✗ FAILURES (required tests)
        └─→ DO NOT USE IN PRODUCTION
            └─→ ROLLBACK to previous stable version
```

### Rollback Steps

If any **REQUIRED** test fails:

```bash
# 1. Identify failure in report
# Example: "FAIL: Health endpoint unreachable"

# 2. Decide: Fix vs Rollback
# If fixable in < 15 min → Fix & retry validation
# If complex → Rollback immediately

# 3. Rollback on Vercel
# Option A: Redeploy previous commit
vercel --prod --prod-commit <previous-commit-hash>

# Option B: Roll back via UI
# https://vercel.com/dashboard → [project] → Deployments
# Click "..." next to previous deployment → "Redeploy"

# 4. Verify rollback
./PRODUCTION_E2E_VALIDATION_SCRIPT.sh https://api.imobi.com

# 5. Post-Mortem
# Document what failed and why
# Schedule investigation for after stability achieved
```

### Quick Rollback (Emergency)

```bash
# Emergency rollback to immediately previous version:

# 1. Get previous deployment
PREV_HASH=$(git log --oneline -2 | tail -1 | cut -d' ' -f1)

# 2. Redeploy
vercel --prod --prod-commit $PREV_HASH

# 3. Verify
curl https://api.imobi.com/api/v1/health
```

---

## Post-Validation Monitoring

After successful validation, monitor these metrics:

### Continuous Monitoring (Production)

```bash
# 1. Daily health checks
0 6 * * * /path/to/PRODUCTION_E2E_VALIDATION_SCRIPT.sh https://api.imobi.com >> /var/log/e2e-validation.log 2>&1

# 2. Error rate monitoring
# Check logs for 5xx errors:
grep "ERROR\|500" /var/log/api.log | wc -l

# 3. Response time trending
# Monitor p95 latency over time (Vercel Analytics or APM tool)

# 4. Rate limit metrics
# Check logs for 429 responses:
grep "429" /var/log/api.log | wc -l

# 5. Database connection pool
# Monitor for connection exhaustion:
SELECT count(*) FROM pg_stat_activity;
```

### Alert Thresholds

Set up alerts for:

| Metric | Threshold | Action |
|--------|-----------|--------|
| Health check failures | 2+ consecutive | Page on-call |
| 5xx error rate | > 1% | Investigate |
| Response time p95 | > 1500ms | Review & optimize |
| 429 rate limit hits | > 100/min | Check for abuse |
| Database connections | > 90% pool | Increase pool size |
| Redis unavailable | Any | Critical alert |

---

## References

- [PRODUCTION_VALIDATION.md](./services/api/PRODUCTION_VALIDATION.md) — Configuration guide
- [E2E_TEST_GUIDE.md](./services/api/E2E_TEST_GUIDE.md) — Jest test documentation
- [MONITORING_AND_LOAD_TESTING.md](./MONITORING_AND_LOAD_TESTING.md) — Performance monitoring

---

## Support

**Issue Found?**

1. Check [Troubleshooting](#troubleshooting) section
2. Review API logs: `https://vercel.com/dashboard`
3. Contact DevOps team

**Document Feedback?**

Please report issues or improvements to: contato.vinicaetano93@gmail.com

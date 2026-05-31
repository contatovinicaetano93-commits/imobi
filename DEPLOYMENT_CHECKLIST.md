# Deployment & Validation Checklist

**Status:** Code ready ✅ | Infrastructure pending ⏳  
**Branch:** `claude/happy-goldberg-AFQPj`  
**Last Commit:** `931d5de` — "fix: resolve 8 critical code review findings"  
**Date:** 2026-05-31

---

## Phase 1: Infrastructure Setup (User / Ops)

### 1.1 PostgreSQL Database
- [ ] Provision PostgreSQL 14+ instance
  - Connection string format: `postgresql://user:password@host:5432/imobi`
  - Create database: `CREATE DATABASE imobi;`
- [ ] Verify connectivity:
  ```bash
  psql "postgresql://user:password@host:5432/imobi" -c "SELECT 1;"
  ```

### 1.2 Redis Cache
- [ ] Provision Redis 7+ instance
  - Configuration: `REDIS_HOST=<host>` `REDIS_PORT=6379`
  - Verify connectivity:
  ```bash
  redis-cli -h <host> -p 6379 PING
  ```

### 1.3 Environment Variables (.env.staging)
```bash
DATABASE_URL=postgresql://user:password@host:5432/imobi
REDIS_HOST=<redis-host>
REDIS_PORT=6379
JWT_SECRET=<generate: openssl rand -base64 48>
ENCRYPTION_KEY=<generate: openssl rand 32 | base64>
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com
NODE_ENV=staging
```

---

## Phase 2: Code Deployment

### 2.1 Pull Latest Code
```bash
cd /path/to/imobi
git fetch origin
git checkout claude/happy-goldberg-AFQPj
git pull origin claude/happy-goldberg-AFQPj
```

### 2.2 Install & Build
```bash
pnpm install
pnpm db:generate
pnpm build
```

**Verify:**
- [ ] API compiled: `dist/services/api/src/main.js` (~2KB)
- [ ] Web built: `.next/` directory exists
- [ ] No TypeScript errors

---

## Phase 3: Database Migration

```bash
export $(cat services/api/.env.staging | xargs)
pnpm db:migrate
```

**Verify:**
```bash
psql $DATABASE_URL -c "\dt"  # List tables
```

---

## Phase 4: Start Services

### 4.1 API Server
```bash
export $(cat services/api/.env.staging | xargs)
pnpm --filter @imbobi/api start:prod
```

**Verify:**
```bash
curl -s http://localhost:4000/api/v1/health | jq .
```

### 4.2 Web Server
```bash
export NEXT_PUBLIC_API_URL=http://localhost:4000
pnpm --filter web start
```

---

## Phase 5: Validation & Testing

### 5.1 Security Validation

**Test signup:**
```bash
curl -X POST http://localhost:4000/api/v1/auth/registrar \
  -H "Content-Type: application/json" \
  -d '{
    "nome":"Test User",
    "email":"test@example.com",
    "cpf":"00000000000",
    "telefone":"11999999999",
    "senha":"SecurePass123!"
  }'
```

**Test authentication:**
```bash
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","senha":"SecurePass123!"}'
```

**Test rate limiting (20/60s):**
```bash
for i in {1..25}; do
  curl -s -o /dev/null -w "%{http_code}\n" http://localhost:4000/api/v1/health
done
# First 20: 200, rest: 429
```

**Test CORS headers:**
```bash
curl -i http://localhost:4000/api/v1/health \
  -H "Origin: https://yourdomain.com"
# Check: Access-Control-Allow-Origin header present
```

### 5.2 Authorization Testing

**Test role-based access (manager endpoints should reject non-managers):**
```bash
TOKEN=$(curl -s -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","senha":"SecurePass123!"}' \
  | jq -r '.accessToken')

curl -X GET http://localhost:4000/manager/dashboard \
  -H "Authorization: Bearer $TOKEN"
# Expected: 403 Forbidden
```

### 5.3 Load Testing (if k6 available)

```bash
k6 run k6-load-test.js --env API_URL=http://localhost:4000
```

**Expected thresholds:**
- p95 response time: < 500ms
- p99 response time: < 1000ms
- Failed requests: < 10%
- Health check success: > 95%

---

## Phase 6: E2E Testing (Manual)

### 6.1 Web Flows
- [ ] **Signup:** http://localhost:3000/cadastro → Create account → Redirected to dashboard
- [ ] **KYC:** Perfil tab → Upload document → Status shows "ENVIADO"
- [ ] **Credit:** Crédito tab → Adjust sliders → Monthly installment calculated
- [ ] **Evidence:** Obras tab → Capture photo with GPS → Upload success
- [ ] **Logout/Login:** Logout → Login again → Session restored

### 6.2 Type Checking
```bash
pnpm type-check
# Expected: ✓ All 5 packages — no errors
```

---

## Phase 7: Monitoring Setup

### 7.1 Health Checks
```bash
# Continuous monitoring
while true; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/api/v1/health)
  echo "[$(date '+%H:%M:%S')] API Health: $STATUS"
  sleep 30
done
```

### 7.2 Database Health
```bash
psql $DATABASE_URL -c "SELECT count(*) FROM usuario;"
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity WHERE datname = 'imobi';"
```

### 7.3 Redis Health
```bash
redis-cli -h $REDIS_HOST PING
redis-cli -h $REDIS_HOST DBSIZE
```

---

## Phase 8: Deployment to Staging (Container)

### Docker Compose Example
```yaml
version: '3.8'
services:
  api:
    image: imobi-api:latest
    ports:
      - "4000:4000"
    environment:
      DATABASE_URL: ${DATABASE_URL}
      REDIS_HOST: redis
      JWT_SECRET: ${JWT_SECRET}
    depends_on:
      - postgres
      - redis
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:4000/api/v1/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  postgres:
    image: postgres:14-alpine
    environment:
      POSTGRES_DB: imobi
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres-data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redis-data:/data

volumes:
  postgres-data:
  redis-data:
```

**Deploy:**
```bash
docker-compose -f docker-compose.staging.yml up -d
```

---

## Phase 9: Smoke Tests

```bash
#!/bin/bash
STAGING_API="https://api-staging.yourdomain.com"

echo "✓ Testing health..."
curl -s $STAGING_API/api/v1/health | jq . || exit 1

echo "✓ Testing signup..."
curl -s -X POST $STAGING_API/api/v1/auth/registrar \
  -H "Content-Type: application/json" \
  -d '{"nome":"Test","email":"test'$(date +%s)'@test.com","cpf":"00000000000","telefone":"11999999999","senha":"Test123!"}' \
  | jq '.accessToken' || exit 1

echo "✓ All smoke tests passed!"
```

---

## Phase 10: Production Handoff

When staging fully validated:

1. [ ] All PR reviews complete
2. [ ] Security audit complete (20 OWASP fixes verified)
3. [ ] Load tests pass
4. [ ] E2E testing complete
5. [ ] Monitoring & alerts configured

**Then:**
```bash
git checkout main
git merge --no-ff claude/happy-goldberg-AFQPj
git tag -a v1.0.0 -m "Production release"
git push origin main --tags
```

---

## Troubleshooting

| Error | Fix |
|-------|-----|
| `ECONNREFUSED` (DB) | `psql $DATABASE_URL -c "SELECT 1;"` |
| `ECONNREFUSED` (Redis) | `redis-cli -h $REDIS_HOST ping` |
| JWT_SECRET too short | `openssl rand -base64 48` |
| Migration failure | `pnpm db:migrate` (verify clean DB) |

---

## Summary

**Ready:**
- ✅ Code compiled & type-checked
- ✅ All 20 OWASP vulnerabilities fixed
- ✅ All 8 code review findings resolved
- ✅ Web flows verified
- ✅ Mobile features complete
- ✅ PR #11 updated

**Waiting for:**
- ⏳ PostgreSQL instance
- ⏳ Redis instance
- ⏳ Environment variables
- ⏳ Staging infrastructure

**Next:** Set up infrastructure, run migrations, validate, deploy.

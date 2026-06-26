# 🚀 Imobi MVP — Soft Launch Guide

**Status**: Ready for Soft Launch  
**Target**: 2-3 weeks to production  
**Team**: Claude (Backend), Cursor (Frontend), DevOps Team

> **Stack canônica (2026):** API no **Render**, web no **Vercel**. Ver [`docs/DEPLOY_STACK.md`](./DEPLOY_STACK.md). Railway e AWS EC2 estão **desativados** — seções abaixo que citam Railway são legado histórico.

---

## 📋 SOFT LAUNCH CHECKLIST

### Phase 1: DEPLOYMENT SETUP (Week 1)

#### 1.1 Backend Deployment (Render — canônico)

```bash
# Render Web Service (NestJS) — ver docs/DEPLOY_STACK.md
pnpm render:env:push
pnpm render:redeploy
bash scripts/post-deploy-verification.sh https://imobi-api-staging.onrender.com
```

<details>
<summary>Legado: Railway (desativado — não usar)</summary>

```bash
# Option A: Railway (legado — NÃO usar em produção)
1. Create Railway project
2. Connect GitHub repo (contatovinicaetano93-commits/imobi)
3. Set deployment branch: main
4. Add PostgreSQL plugin
5. Add Redis plugin
6. Configure environment variables:
```

**Railway Environment Variables**:

```env
# Application
NODE_ENV=production
PORT=3000
API_VERSION=1.0.0

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/imobi
DATABASE_POOL_SIZE=25
DATABASE_IDLE_TIMEOUT=30000

# Cache (Redis)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT & Auth
JWT_SECRET=<generate-random-256-bit-key>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Encryption
ENCRYPTION_KEY=<generate-random-256-bit-key>
IV_LENGTH=12

# API Keys
OPENAPI_VERSION=1.0.0
API_KEY_ROTATION_DAYS=90

# Observability
SENTRY_DSN=<get-from-sentry>
LOG_LEVEL=info
STRUCTURED_LOGGING=true

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# External Services (Placeholder)
SENDGRID_API_KEY=
SLACK_WEBHOOK_URL=
```

</details>

#### 1.2 Frontend Deployment (Vercel)

```bash
# Once Next.js build issue is fixed:
1. Connect apps/web to Vercel
2. Set root directory: apps/web
3. Build command: pnpm build
4. Install command: pnpm install --frozen-lockfile
5. Set environment:
```

**Vercel Environment Variables**:

```env
NEXT_PUBLIC_API_URL=https://api.imobi.com
NEXT_PUBLIC_API_TIMEOUT=30000
NEXT_PUBLIC_SENTRY_DSN=<same-as-backend>
```

#### 1.3 Database Setup

```bash
# Run migrations in Render PostgreSQL (staging/prod)
psql $DATABASE_URL < services/api/prisma/migrations/*

# Seed with test data
pnpm db:seed
```

#### 1.4 Redis Setup

```bash
# Verify Redis connection
redis-cli -h <redis-host> -p 6379 ping
# Should return: PONG

# Check memory
redis-cli -h <redis-host> info memory
```

---

### Phase 2: OBSERVABILITY SETUP (Week 1)

#### 2.1 Sentry Configuration

```bash
# 1. Create Sentry account & project
# 2. Set SENTRY_DSN in Railway/Render & Vercel
# 3. Test integration:
curl -X POST https://api.imobi.com/api/v1/test-error \
  -H "Authorization: Bearer <test-token>"

# 4. Verify error appears in Sentry dashboard
```

#### 2.2 Prometheus Metrics

```bash
# Metrics endpoint: GET /metrics
curl https://api.imobi.com/metrics

# Expected output:
# HELP http_request_duration_seconds HTTP request latency
# TYPE http_request_duration_seconds histogram
# http_request_duration_seconds_bucket{le="0.1",...} 250
# http_request_duration_seconds_bucket{le="0.5",...} 450
```

#### 2.3 Structured Logging

```bash
# Check logs in Railway/Render dashboard
# Expected format:
# {
#   "timestamp": "2026-06-22T18:30:45.123Z",
#   "level": "info",
#   "service": "imobi-api",
#   "message": "POST /api/v1/credito 201",
#   "userId": "user-123",
#   "duration": 245,
#   "...": "..."
# }
```

---

### Phase 3: SECURITY HARDENING (Week 1-2)

#### 3.1 SSL/TLS Certificate

```bash
# Railway/Render auto-provides HTTPS on deploy.railway.app
# For custom domain:
1. Update DNS: CNAME -> *.railway.app
2. Request SSL certificate (auto-provisioned)
3. Test HTTPS:
curl -I https://api.imobi.com/health
```

#### 3.2 API Keys & Secrets

```bash
# Generate initial API keys for testing
curl -X POST https://api.imobi.com/api/v1/admin/api-keys \
  -H "Authorization: Bearer <admin-jwt>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "public-api-key",
    "tier": "FREE",
    "quotaPerMonth": 100000
  }'

# Store in secure vault (not in .env):
# - Railway: Use "Linked Services" for secrets
# - Render: Use "Private Environment Variables"
```

#### 3.3 CORS Configuration

```typescript
// Already configured in app.module.ts, verify:
// - Frontend domain allowed
// - Credentials mode enabled
// - Preflight caching set to 1 day
```

#### 3.4 Rate Limiting Test

```bash
# Test rate limit (FREE tier: 100 req/min)
for i in {1..105}; do
  curl -s https://api.imobi.com/api/v1/public/simulador \
    -H "X-API-Key: free-tier-key" > /dev/null
done

# Should return 429 Too Many Requests on 101st request
```

---

### Phase 4: CI/CD PIPELINE (Week 2)

#### 4.1 GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy Imobi API

on:
  push:
    branches:
      - main
    paths:
      - 'services/api/**'
      - 'packages/**'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Type check
        run: pnpm type-check
      
      - name: Lint
        run: pnpm lint --filter @imbobi/api
      
      - name: Build
        run: pnpm build --filter @imbobi/api
      
      - name: Test
        run: pnpm test --filter @imbobi/api

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: github/super-linter@v4
        env:
          DEFAULT_BRANCH: main
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

  deploy:
    needs: [test, security]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Railway
        run: |
          curl -X POST https://api.railway.app/graphql \
            -H "Authorization: Bearer ${{ secrets.RAILWAY_TOKEN }}" \
            -d '{"query": "mutation { deploymentCreate(input: {...}) }"}'
```

#### 4.2 Continuous Deployment

```bash
# Enable auto-deploy on Railway:
1. Project Settings → Deployments
2. "Deploy on push" → Enable
3. Branch: main
4. Auto-rollback: Enable (on health check failure)
```

---

### Phase 5: TESTING & VALIDATION (Week 2)

#### 5.1 API Health Checks

```bash
# Test health endpoint
curl https://api.imobi.com/health

# Expected response (200 OK):
{
  "status": "ok",
  "timestamp": "2026-06-22T18:30:45.123Z",
  "version": "1.0.0",
  "database": "connected",
  "redis": "connected"
}
```

#### 5.2 Smoke Tests

```bash
# 1. Public simulation API (no auth)
curl -X POST https://api.imobi.com/api/v1/public/simulador \
  -H "Content-Type: application/json" \
  -d '{
    "valorSolicitado": 1000000,
    "prazoMeses": 24,
    "tipoObra": "CONSTRUCAO"
  }'

# 2. Authentication (register + login)
curl -X POST https://api.imobi.com/api/v1/auth/registro \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Test User",
    "cpf": "12345678900",
    "email": "test@example.com",
    "telefone": "11999999999",
    "senha": "SecurePass123!"
  }'

# 3. Protected endpoint (with JWT)
curl -X GET https://api.imobi.com/api/v1/credito \
  -H "Authorization: Bearer <jwt-token>"

# 4. Rate limiting
curl -H "X-API-Key: free-api-key" \
  https://api.imobi.com/api/v1/public/simulador \
  -v | grep "RateLimit"
```

#### 5.3 Load Testing (Optional for Soft Launch)

```bash
# Install k6 (load testing)
brew install k6  # or: apt-get install k6

# Create k6/test-soft-launch.js
cat > k6/test-soft-launch.js << 'EOF'
import http from 'k6/http';
import { check } from 'k6';
import { Rate } from 'k6/metrics';

export const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '2m', target: 100 },   // Ramp up to 100 users
    { duration: '5m', target: 100 },   // Stay at 100 users
    { duration: '2m', target: 0 },     // Ramp down
  ],
};

export default function() {
  const res = http.post('https://api.imobi.com/api/v1/public/simulador', {
    valorSolicitado: 1000000,
    prazoMeses: 24,
    tipoObra: 'CONSTRUCAO',
  });

  errorRate.add(res.status !== 200);
  
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
}
EOF

# Run test
k6 run k6/test-soft-launch.js
```

---

### Phase 6: MONITORING ALERTS (Week 2)

#### 6.1 Uptime Monitoring

Use **UptimeRobot** (free):

```
1. Create monitor
2. Type: HTTP(S)
3. URL: https://api.imobi.com/health
4. Frequency: Every 5 minutes
5. Alert email: devops@imobi.com
6. Acceptable response time: 2 seconds
```

#### 6.2 Sentry Alerts

```
1. Sentry Dashboard → Settings
2. Alerts: Alert on any error rate > 5%
3. Channels:
   - Email: devops@imobi.com
   - Slack: #alerts (integration via webhook)
```

#### 6.3 Database Monitoring

```bash
# Check slow queries
psql $DATABASE_URL -c "
  SELECT query, mean_time, calls 
  FROM pg_stat_statements 
  WHERE mean_time > 100 
  ORDER BY mean_time DESC;
"
```

---

### Phase 7: SOFT LAUNCH EXECUTION (Week 3)

#### 7.1 Pre-Launch Checklist (48 hours before)

- [ ] All environment variables set in Railway/Render
- [ ] Database migrations run successfully
- [ ] Redis connection verified
- [ ] SSL/TLS certificate active
- [ ] API keys generated for all tiers
- [ ] Sentry project configured
- [ ] UptimeRobot monitoring enabled
- [ ] GitHub Actions workflow tested
- [ ] Health check endpoint responding
- [ ] All smoke tests passing

#### 7.2 Launch Day Playbook

```bash
# 9:00 AM - Final verification
curl -I https://api.imobi.com/health
curl https://api.imobi.com/metrics | head -20

# 9:30 AM - Monitor errors
# Watch Sentry dashboard in real-time
# Watch UptimeRobot status page
# Check Railway/Render logs

# 10:00 AM - Public announcement
# Share API endpoint: https://api.imobi.com
# Share OpenAPI docs: https://api.imobi.com/docs
# Share status page: https://status.imobi.com (via UptimeRobot)

# 5:00 PM - Post-launch review
# Document any issues
# Review performance metrics
# Check database query logs
```

#### 7.3 Post-Launch (Week 3-4)

```bash
# Monitor key metrics daily:
1. Error rate (target: < 1%)
2. API latency (target: < 500ms)
3. Database connections (target: < 20/25)
4. Cache hit rate (target: > 75%)
5. Rate limit violations (target: < 0.1%)

# Weekly review meeting:
1. Review Sentry error summary
2. Review performance trends
3. Review user feedback
4. Plan hotfixes if needed
```

---

## 🔧 COMMON ISSUES & SOLUTIONS

### Issue: Database Connection Timeout

```bash
# Solution 1: Check connection string
echo $DATABASE_URL  # Verify format

# Solution 2: Verify credentials
psql postgres://<user>:<pass>@<host>:<port>/<db>

# Solution 3: Increase pool timeout
DATABASE_IDLE_TIMEOUT=60000  # 60 seconds

# Solution 4: Check firewall
# Railway/Render: Whitelist your IP
# AWS RDS: Security group rules
```

### Issue: Redis Connection Failed

```bash
# Solution 1: Verify Redis is running
redis-cli -h <host> -p 6379 ping

# Solution 2: Check password
redis-cli -h <host> -a <password> ping

# Solution 3: Increase timeout
REDIS_CONNECT_TIMEOUT=5000
```

### Issue: High Memory Usage

```bash
# Check Prisma connection pool
DATABASE_POOL_SIZE=10  # Reduce from 25 to 10

# Check Node memory
node --max-old-space-size=2048 dist/main.js

# Check Redis memory
redis-cli info memory
```

### Issue: Slow API Responses

```bash
# Enable query logging
DATABASE_LOG_LEVEL=slow_statements
DATABASE_SLOW_QUERY_MS=100

# Check Prometheus metrics
curl https://api.imobi.com/metrics | grep http_request_duration

# Verify cache is working
redis-cli keys "obra:*" | wc -l  # Should have many entries
```

---

## 📊 DEPLOYMENT ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────┐
│                    Vercel (Frontend)                        │
│  apps/web → https://app.imobi.com                           │
└─────────────────────────────────────────────────────────────┘
                            ↓ (HTTPS)
┌─────────────────────────────────────────────────────────────┐
│              Railway/Render (Backend API)                   │
│  services/api → https://api.imobi.com                       │
│  - NestJS + Fastify                                         │
│  - Auto-scaling (0-4 instances)                             │
│  - Health check: /health (every 10s)                        │
└─────────────────────────────────────────────────────────────┘
                   ↓          ↓          ↓
        ┌──────────┴──────────┼──────────┴──────────┐
        │                     │                     │
    ┌───▼────┐         ┌──────▼────┐         ┌─────▼──┐
    │Database │         │  Redis    │         │Sentry  │
    │(PostgreSQL)       │(Cache)    │         │(Logs)  │
    │+ PostGIS          │+ Sessions │         │(Errors)│
    │+ Backups          │+ Queue    │         │        │
    └─────────┘         └───────────┘         └────────┘
        (RDS)          (ElastiCache)       (SaaS - Free)
```

---

## 🎯 SUCCESS METRICS

| Metric | Target | Acceptable | Critical |
|--------|--------|-----------|----------|
| Uptime | > 99.5% | > 99% | < 99% |
| API Latency (p95) | < 250ms | < 500ms | > 500ms |
| Error Rate | < 0.5% | < 1% | > 1% |
| Cache Hit Rate | > 80% | > 70% | < 70% |
| Database Pool Usage | < 50% | < 70% | > 70% |
| Disk Free Space | > 50% | > 25% | < 25% |

---

## 📞 POST-LAUNCH SUPPORT

**On-Call Rotation** (optional for soft launch):
- Claude: Backend API issues
- Cursor: Frontend issues
- DevOps: Infrastructure issues

**Escalation Path**:
1. Check monitoring dashboards (UptimeRobot, Sentry)
2. Review logs (Railway/Render, Sentry)
3. Deploy hotfix if needed
4. Document incident

**Communication**:
- Slack channel: #imobi-incidents
- Status page: https://status.imobi.com
- Email: support@imobi.com (automated responses)

---

## ✅ NEXT STEPS

1. **This week**: Complete Phase 1-2 (Deployment + Observability)
2. **Next week**: Complete Phase 3-4 (Security + CI/CD)
3. **Week 3**: Execute Soft Launch (Phase 5-7)
4. **Post-launch**: 4 weeks monitoring + optimization

**Owner**: DevOps Team / Claude (Backend)  
**Timeline**: 3 weeks from start to production  
**Risk Level**: LOW (proven infrastructure, observability + monitoring)

---

**Updated**: June 2026  
**Version**: 1.0  
**Status**: READY FOR EXECUTION

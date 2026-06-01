# imobi Staging & Production Deployment Guide

**Project:** imobi (Fintech Construction Lending Platform)  
**Stack:** Next.js 14 + NestJS + Fastify + PostgreSQL + Redis  
**Status:** 🟢 CODE READY FOR STAGING  
**Branch:** `claude/happy-goldberg-AFQPj`

---

## Quick Start

### For Staging Deployment

```bash
# 1. Ensure infrastructure is ready (PostgreSQL 14+, Redis 7+)
# 2. Run automated deployment
./STAGING_DEPLOYMENT.sh staging \
  "postgresql://user:pass@staging-db:5432/imbobi_staging" \
  "redis://staging-redis:6379"

# 3. Run security validation
./SECURITY_VALIDATION.sh http://staging-api:4000/api/v1

# 4. Run E2E tests (requires test database)
./RUN_E2E_TESTS.sh staging-db 5433 imbobi imbobi123 imbobi_test
```

### For Production Deployment

Same scripts, different environment variables:

```bash
./STAGING_DEPLOYMENT.sh production \
  "postgresql://user:pass@prod-db:5432/imbobi_prod" \
  "redis://prod-redis:6379"
```

---

## What's Included

### 📋 Deployment Scripts

| Script | Purpose | Time | Output |
|--------|---------|------|--------|
| `STAGING_DEPLOYMENT.sh` | Full deployment automation | 5-10 min | Ready-for-deployment checklist |
| `SECURITY_VALIDATION.sh` | 20-point OWASP security check | 2-3 min | Security validation report |
| `RUN_E2E_TESTS.sh` | Execute 10 E2E test suites | 10-15 min | Test results & coverage |

### 📚 Documentation

| Document | Content | Pages |
|----------|---------|-------|
| `STAGING_CHECKLIST.md` | 14-phase deployment checklist | 755 lines |
| `STAGING_DEPLOYMENT.md` | Detailed deployment guide | 200+ lines |
| `SECURITY_SUMMARY.md` | All 20 security fixes documented | 300+ lines |
| `DEPLOYMENT_README.md` | This file |  |

### 🔧 Code Quality Status

```
✅ Type Checking: PASSED (all 5+ packages)
✅ Production Build: SUCCESSFUL
✅ Security Hardening: 20/20 OWASP vulnerabilities resolved
✅ Frontend: Signup, login, KYC, simulator pages ready
✅ API: All endpoints compiled and modules initialized
✅ E2E Tests: 10 suites configured and ready
✅ Git: All commits pushed to origin/claude/happy-goldberg-AFQPj
```

---

## Prerequisites

### Infrastructure (Required for Staging)

```
✅ PostgreSQL 14+ instance
  └─ imbobi_staging database created
  └─ Connection pool ready (min 5, max 20)

✅ Redis 7+ instance
  └─ Memory: 2GB+ recommended
  └─ Persistence: AOF or RDB enabled
  └─ 10-minute TTL for cache keys

✅ Linux Server
  └─ Node.js 20+
  └─ pnpm 8+
  └─ SSL certificates (Let's Encrypt)

✅ Optional: Monitoring stack
  └─ Prometheus/Grafana
  └─ ELK Stack or CloudWatch
  └─ Sentry or similar error tracking
```

### Before Running Deployment

```bash
# Verify git branch
git status
# Expected: On branch claude/happy-goldberg-AFQPj

# Verify git is clean
git log --oneline -5
# Expected: Latest commit is deployment automation

# Verify Node/pnpm
node --version  # v20+
pnpm --version  # 8+

# Verify network connectivity
ping staging-db
ping staging-redis
```

---

## Deployment Process (Step by Step)

### Phase 1: Infrastructure Verification (10 min)

```bash
# Verify database connection
psql postgresql://user:pass@staging-db:5432/imbobi_staging -c "SELECT 1"

# Verify Redis connection
redis-cli -h staging-redis ping
# Expected: PONG

# Verify git access
git fetch origin claude/happy-goldberg-AFQPj
# Expected: up to date

# Verify Node.js/pnpm
node -v && pnpm -v
# Expected: v20+ and 8+
```

### Phase 2: Automated Deployment (5-10 min)

```bash
# Run deployment script
./STAGING_DEPLOYMENT.sh staging \
  "postgresql://imbobi:password@staging-db:5432/imbobi_staging" \
  "redis://staging-redis:6379"

# This script will:
# 1. Install dependencies (pnpm install)
# 2. Type check all packages (pnpm type-check)
# 3. Build production artifacts (pnpm build)
# 4. Run database migrations (pnpm db:migrate)
# 5. Verify database connection
# 6. Generate deployment checklist
```

### Phase 3: Server Startup (2-3 min)

```bash
# Terminal 1: API Server
cd services/api
node dist/main.js
# Expected: [Nest] API listening on port 4000

# Terminal 2: Web Server
cd apps/web
npx next start
# Expected: ▲ Next.js 14.2.35

# Terminal 3: Process Monitor
pm2 start "node services/api/dist/main.js" --name api
pm2 start "npx next start --cwd apps/web" --name web
pm2 logs
```

### Phase 4: Verification (5-10 min)

```bash
# Health checks
curl http://localhost:4000/api/v1/health
# Expected: {"status":"ok"}

curl http://localhost:3000/cadastro
# Expected: Signup page HTML

# Security validation
./SECURITY_VALIDATION.sh http://localhost:4000/api/v1

# E2E tests (if database available)
./RUN_E2E_TESTS.sh localhost 5433 imbobi imbobi123 imbobi_test
```

---

## What Gets Deployed

### API Server (`services/api`)
- NestJS + Fastify framework
- All modules initialized:
  - ✅ Auth (JWT + refresh tokens)
  - ✅ Users (profile management)
  - ✅ Credit (simulator + requests)
  - ✅ KYC (document upload + validation)
  - ✅ Evidências (GPS-validated photos)
  - ✅ Obras (construction projects)
  - ✅ Notifications (in-app + push)
  - ✅ Workers (BullMQ job queue)
  - ✅ Analytics (metrics + reporting)

### Web Application (`apps/web`)
- Next.js 14 with App Router
- Authentication guard (redirects to login)
- Pages:
  - ✅ `/cadastro` — Signup form
  - ✅ `/login` — Login form
  - ✅ `/dashboard` — Main dashboard
  - ✅ `/dashboard/kyc` — KYC profile
  - ✅ `/dashboard/simulador` — Credit simulator
  - ✅ `/dashboard/obras` — Projects list
  - ✅ `/dashboard/perfil` — User profile

### Mobile App (`apps/mobile`)
- Expo 51 + Expo Router
- All screens implemented:
  - ✅ KYC profile (document upload)
  - ✅ Credit simulator (sliders + calculation)
  - ✅ Evidências (GPS validation + upload)
  - ✅ Authentication (secure store)

---

## Monitoring & Operations

### Health Checks

```bash
# API Health
curl http://api:4000/api/v1/health/live      # Liveness
curl http://api:4000/api/v1/health/ready     # Readiness

# Web Health
curl http://web:3000                         # Should return 200

# Database
psql $DATABASE_URL -c "SELECT 1"

# Redis
redis-cli PING
```

### Common Operations

```bash
# View API logs
pm2 logs api

# View Web logs
pm2 logs web

# Restart services
pm2 restart api web

# Monitor resources
pm2 monit

# Database backup
pg_dump $DATABASE_URL > backup.sql

# Database restore
psql $DATABASE_URL < backup.sql
```

### Troubleshooting

| Issue | Solution |
|-------|----------|
| "Can't reach database" | Verify PostgreSQL running: `psql $DATABASE_URL` |
| "Cannot connect to Redis" | Verify Redis running: `redis-cli PING` |
| "Port 4000 already in use" | Kill process: `lsof -i :4000 \| kill -9` |
| "Build failed" | Clear cache: `rm -rf dist node_modules && pnpm install` |
| "Migration failed" | Check schema: `pnpm db:generate && pnpm db:migrate` |
| "E2E tests timeout" | Increase timeout: `jest --testTimeout=30000` |

---

## Security Checklist

Before going to production, verify:

```
Authentication & Tokens:
✅ JWT_SECRET is 64+ characters and random
✅ ENCRYPTION_KEY is base64-encoded 32-byte value
✅ Refresh tokens encrypted in HttpOnly cookies
✅ Token rotation working on refresh

CORS & Headers:
✅ CORS origin whitelist configured (no *)
✅ Content-Security-Policy header set
✅ Strict-Transport-Security header set
✅ X-Frame-Options set to DENY

Data Validation:
✅ CPF validation with modulo-11 checksum
✅ Email validation and uniqueness check
✅ Password minimum 8 characters
✅ SQL injection prevention (Prisma)

Database Security:
✅ SSL/TLS connection to database
✅ Database credentials not in code
✅ Backup encryption enabled
✅ Read replicas isolated from writes

Infrastructure:
✅ Firewall rules configured
✅ Only allow known IPs to database
✅ VPN/bastion host for SSH access
✅ Secrets stored in secure vault (not git)
```

---

## Performance Targets

| Metric | Target | How to Monitor |
|--------|--------|---|
| API Latency (p95) | <200ms | `curl -w "@curl-format.txt"` |
| API Throughput | >100 req/s | `wrk -t4 -c100` |
| Database Query (p95) | <100ms | PostgreSQL logs |
| Web Page Load | <2s | Lighthouse CI |
| Cache Hit Ratio | >70% | Redis INFO |

---

## Rollback Procedure

If deployment fails or issues discovered:

```bash
# 1. Stop services
pm2 stop api web

# 2. Restore previous version
git checkout <previous_commit>
pnpm install --frozen-lockfile
pnpm build

# 3. Run migrations rollback (if applicable)
pnpm prisma migrate resolve --rolled-back <migration_name>

# 4. Start services
pm2 start api web

# 5. Verify
curl http://api:4000/api/v1/health
```

---

## Support & Escalation

### On-Call Engineer
- **Name:** ________________
- **Phone:** ________________
- **Email:** ________________
- **PagerDuty:** ________________

### Critical Issues
1. **API Down** → Page on-call engineer immediately
2. **Database Down** → Failover to replica (if configured)
3. **Security Breach** → Follow incident response plan
4. **Data Corruption** → Restore from backup

### Status Page
- Public: `https://status.imbobi.com`
- Internal: Incident tracking system

---

## Next Steps

### After Staging Validation
1. ✅ Run full E2E test suite
2. ✅ Perform security audit
3. ✅ Load test to 100+ concurrent users
4. ✅ Get product team sign-off
5. ✅ Get security team sign-off
6. ✅ Then proceed to production

### Documentation References
- **Architecture:** See `CLAUDE.md` (project guide)
- **Security:** See `SECURITY_SUMMARY.md` (20 fixes documented)
- **Deployment:** See `STAGING_DEPLOYMENT.md` (detailed steps)
- **Checklist:** See `STAGING_CHECKLIST.md` (14 phases)

---

## Summary

**Current State:**
- ✅ Code complete and type-safe
- ✅ Build successful
- ✅ Security hardened (20/20 OWASP)
- ✅ Deployment automation ready
- ⏳ Awaiting infrastructure setup

**Timeline:**
- Infrastructure setup: 1-2 hours
- Code deployment: 5-10 minutes
- Verification: 5-10 minutes
- **Total: 1-3 hours to production-ready staging**

**Resources:**
- Branch: `claude/happy-goldberg-AFQPj`
- Docs: 4 comprehensive guides
- Scripts: 3 automated deployment tools
- Tests: 10 E2E test suites (ready to run)

**Ready to deploy! 🚀**

Questions? Check STAGING_DEPLOYMENT.md or SECURITY_SUMMARY.md for detailed information.

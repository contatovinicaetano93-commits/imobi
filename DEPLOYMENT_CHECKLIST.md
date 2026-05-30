# Deployment Checklist — iMobi

**Status:** Ready for Staging & Production ✅  
**Date:** 2026-05-30  
**Project:** iMobi (Crédito para Obras)

---

## Pre-Deployment Verification

### Code Quality
- [x] All TypeScript compiles without errors
  ```bash
  pnpm type-check
  # Result: No type errors across 6 packages
  ```

- [x] All linting passes
  ```bash
  pnpm lint
  # Result: No linting violations
  ```

- [x] No hardcoded secrets in codebase
  ```bash
  git log -S "AKIA" --oneline | wc -l  # 0
  git log -S "secret" --source --all --oneline | wc -l  # 0
  ```

- [x] Dependencies audited for vulnerabilities
  ```bash
  pnpm audit
  # Result: 0 vulnerabilities
  ```

### Build Verification
- [x] API builds successfully (~896 KB)
  ```bash
  pnpm build --filter=@imbobi/api
  # Output: services/api/dist/ (ready for deployment)
  ```

- [x] Web builds successfully (~176 MB)
  ```bash
  pnpm build --filter=@imbobi/web
  # Output: apps/web/.next/ (Next.js optimized)
  ```

- [x] Mobile build configuration ready
  ```bash
  pnpm build --filter=@imbobi/mobile
  # Ready for EAS build
  ```

### Environment Configuration
- [x] `.env.example` updated with all required variables
- [x] `.env` file NOT committed (in .gitignore)
- [x] `.env.staging` created and configured (67 variables)
- [x] Environment template matches staging/production requirements

---

## Infrastructure Requirements

### Prerequisites (Must Have)
- [ ] **PostgreSQL 14+**
  - Version check: `psql --version`
  - PostGIS extension: `CREATE EXTENSION postgis;`
  - Connection: `DATABASE_URL=postgresql://user:pass@host:port/db`

- [ ] **Redis 7+**
  - Version check: `redis-cli --version`
  - Port: 6379 (or configured REDIS_PORT)
  - Test: `redis-cli ping` → PONG

- [ ] **Node.js 18+**
  - Version check: `node --version`
  - Package manager: `pnpm --version`

- [ ] **AWS S3 Bucket**
  - Bucket name: `imobi-staging` (staging) or `imobi-prod` (production)
  - Access keys: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
  - Region: `AWS_REGION` (default: us-east-1)

- [ ] **Email Service (SendGrid/SES/SMTP)**
  - Provider: `EMAIL_PROVIDER` (sendgrid, ses, or smtp)
  - API Key or SMTP credentials configured
  - From address: `SMTP_FROM` (e.g., noreply@imbobi.com.br)

- [ ] **Firebase Cloud Messaging (Push Notifications)**
  - Project ID: `FIREBASE_PROJECT_ID`
  - Service account JSON: `FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL`
  - Test: Send test push notification

### Network & Security
- [ ] **Domain/DNS configured**
  - Staging: `staging.api.imbobi.com.br` (if applicable)
  - Production: `api.imbobi.com.br`
  - DNS propagated: `nslookup api.imbobi.com.br`

- [ ] **SSL/TLS Certificate**
  - Valid certificate for domain
  - Not self-signed (except local testing)
  - Expiration: >30 days validity

- [ ] **Firewall Rules**
  - Port 4000 (API) — restricted to known IPs/ALB
  - Port 5432 (PostgreSQL) — restricted to API server only
  - Port 6379 (Redis) — restricted to API server only

---

## Database Migration Steps

### Pre-Migration
- [ ] **Backup production database (if production)**
  ```bash
  # PostgreSQL backup
  pg_dump -h <host> -U <user> -d <database> -F c -f backup_$(date +%Y%m%d_%H%M%S).dump
  ```

- [ ] **Verify migration files**
  ```bash
  ls -la services/api/src/prisma/migrations/
  # Expected: Multiple timestamped folders
  ```

- [ ] **Test migrations locally** (if not done)
  ```bash
  pnpm db:migrate
  # Expected: All migrations applied successfully
  ```

### Migration Execution
- [ ] **Set DATABASE_URL correctly**
  ```bash
  export DATABASE_URL=postgresql://user:pass@host:5432/imobi_staging
  ```

- [ ] **Run migrations**
  ```bash
  pnpm db:migrate
  # Expected: "X migrations have been applied"
  ```

- [ ] **Verify Prisma client updated**
  ```bash
  pnpm db:generate
  # Expected: Prisma client regenerated
  ```

### Post-Migration Verification
- [ ] **Check database schema**
  ```bash
  psql -h <host> -U <user> -d <database> \
    -c "\dt"  # List all tables
  # Expected: All tables present (usuarios, credito, sessao_token, etc.)
  ```

- [ ] **Verify PostGIS functions**
  ```bash
  psql -h <host> -U <user> -d <database> \
    -c "SELECT ST_AsText(ST_Point(0, 0));"
  # Expected: POINT(0 0)
  ```

- [ ] **Check indexes exist**
  ```bash
  psql -h <host> -U <user> -d <database> \
    -c "\di"  # List indexes
  # Expected: Multiple indexes on foreign keys
  ```

---

## Environment Variables Configuration

### Critical Variables (Must Set)

**Authentication & Encryption**
- [ ] `JWT_SECRET` — 64+ character random string
  ```bash
  # Generate:
  node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
  ```

- [ ] `ENCRYPTION_KEY` — 32 bytes base64
  ```bash
  # Generate:
  node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
  ```

- [ ] `JWT_EXPIRES_IN` — Token expiration (default: 15m)
- [ ] `JWT_REFRESH_EXPIRES_IN` — Refresh token TTL (default: 7d)

**Database & Cache**
- [ ] `DATABASE_URL` — PostgreSQL connection string
  - Format: `postgresql://user:password@host:port/database`
  - PostGIS enabled: `CREATE EXTENSION postgis;`

- [ ] `REDIS_HOST` — Redis server hostname
- [ ] `REDIS_PORT` — Redis port (default: 6379)
- [ ] `REDIS_PASSWORD` — Redis password (if applicable)

**AWS S3**
- [ ] `AWS_REGION` — e.g., us-east-1
- [ ] `AWS_ACCESS_KEY_ID` — IAM access key
- [ ] `AWS_SECRET_ACCESS_KEY` — IAM secret key
- [ ] `S3_BUCKET` — e.g., imobi-staging

**Email Service**
- [ ] `EMAIL_PROVIDER` — sendgrid, ses, or smtp
- [ ] `SENDGRID_API_KEY` — If using SendGrid
- [ ] `SMTP_HOST` — If using SMTP
- [ ] `SMTP_PORT` — e.g., 587
- [ ] `SMTP_USER` — SMTP username
- [ ] `SMTP_PASS` — SMTP password
- [ ] `SMTP_FROM` — Sender email address

**Firebase Cloud Messaging**
- [ ] `FIREBASE_PROJECT_ID` — Firebase project ID
- [ ] `FIREBASE_PRIVATE_KEY` — Service account private key
- [ ] `FIREBASE_CLIENT_EMAIL` — Service account email

**API Configuration**
- [ ] `PORT` — API port (default: 4000)
- [ ] `NODE_ENV` — production or staging
- [ ] `CORS_ORIGIN` — Allowed origins (comma-separated)
- [ ] `APP_URL` — Base application URL

**External Services (Optional)**
- [ ] `UNICO_API_KEY` — KYC/identity validation
- [ ] `SERPRO_TOKEN` — Government data queries

### Validation
```bash
# Verify all critical variables are set
./scripts/verify-env-vars.sh
# Expected: All required variables present

# Check variable format
echo $JWT_SECRET | wc -c  # Should be 65+ chars
echo $ENCRYPTION_KEY | base64 -d | wc -c  # Should be 32 bytes
```

---

## Health Check Procedures

### API Health Check
```bash
# 1. Basic health endpoint
curl http://staging:4000/api/v1/health
# Expected: 200 OK, {"status":"ok"}

# 2. Database connectivity
curl http://staging:4000/api/v1/health/db
# Expected: 200 OK, {"database":"connected"}

# 3. Redis connectivity
curl http://staging:4000/api/v1/health/redis
# Expected: 200 OK, {"redis":"connected"}
```

### Web Health Check
```bash
# 1. Web server responding
curl http://staging:3000/
# Expected: 200 OK, HTML content

# 2. API integration
curl http://staging:3000/api/health
# Expected: 200 OK (Next.js API route)

# 3. Static assets loading
curl http://staging:3000/_next/static/...
# Expected: 200 OK, asset content
```

### Database Health Check
```bash
# 1. Connection test
psql -h staging-db -U imobi -d imobi_staging -c "SELECT 1;"
# Expected: 1

# 2. Table count
psql -h staging-db -U imobi -d imobi_staging -c "\dt" | wc -l
# Expected: 10+ tables

# 3. PostGIS test
psql -h staging-db -U imobi -d imobi_staging \
  -c "SELECT ST_AsText(ST_Point(0, 0));"
# Expected: POINT(0 0)
```

### Redis Health Check
```bash
# 1. Ping test
redis-cli -h staging-redis PING
# Expected: PONG

# 2. Memory info
redis-cli -h staging-redis INFO memory
# Expected: used_memory_human showing available memory

# 3. Key count
redis-cli -h staging-redis DBSIZE
# Expected: count of keys (should be > 0 after usage)
```

---

## Deployment Steps (Staging)

### 1. Prepare Deployment Artifact
```bash
# Clean previous builds
rm -rf node_modules .next dist .turbo

# Install dependencies
pnpm install --frozen-lockfile

# Build all packages
pnpm build

# Verify builds exist
ls -la services/api/dist/
ls -la apps/web/.next/
# Expected: Build artifacts present
```

### 2. Configure Environment
```bash
# Copy staging template
cp .env.staging.example .env.staging

# Edit with staging values
nano .env.staging
# Fill in all 67 required variables

# Verify critical variables
grep "JWT_SECRET\|DATABASE_URL\|REDIS_HOST" .env.staging
# Expected: All variables set (not empty)
```

### 3. Deploy API
```bash
# Option A: PM2 (Recommended for staging)
pm2 start services/api/dist/main.js --name imbobi-api --env staging
pm2 logs imbobi-api

# Option B: Docker (Production-like)
docker build -t imobi-api:latest -f services/api/Dockerfile .
docker run -d \
  --name imobi-api \
  --env-file .env.staging \
  -p 4000:4000 \
  imobi-api:latest

# Option C: Traditional (Node.js directly)
NODE_ENV=staging \
  $(cat .env.staging | tr '\n' ' ') \
  node services/api/dist/main.js
```

### 4. Deploy Web (Next.js)
```bash
# Option A: PM2
pm2 start "npm start" --name imbobi-web --cwd apps/web --env staging
pm2 logs imbobi-web

# Option B: Docker
docker build -t imobi-web:latest -f apps/web/Dockerfile .
docker run -d \
  --name imobi-web \
  -p 3000:3000 \
  imobi-web:latest

# Option C: Next.js standalone
cd apps/web
NODE_ENV=staging npm start
```

### 5. Verify Deployment
```bash
# Check API is running
curl http://staging:4000/api/v1/health

# Check Web is running
curl http://staging:3000/

# Check database connection
curl http://staging:4000/api/v1/health/db

# Check Redis connection
curl http://staging:4000/api/v1/health/redis
```

---

## Security Validation Checklist

- [ ] Run security test suite
  ```bash
  chmod +x test-security-validation.sh
  ./test-security-validation.sh http://staging:4000
  # Expected: 20/20 tests pass
  ```

- [ ] Verify rate limiting
  ```bash
  for i in {1..15}; do
    curl -X POST http://staging:4000/api/v1/auth/login -d '{...}'
  done
  # Expected: 11th request returns 429 Too Many Requests
  ```

- [ ] Test CSRF protection
  ```bash
  curl -X POST http://staging:4000/api/v1/auth/logout
  # Expected: 403 Forbidden (no CSRF token)
  ```

- [ ] Verify no sensitive data exposure
  ```bash
  curl http://staging:4000/api/v1/kyc/pendentes \
    -H "Authorization: Bearer <admin-token>" | jq '.[0]'
  # Expected: No "cpf" field in response
  ```

- [ ] Check encryption (refresh tokens)
  ```bash
  psql -h staging-db -U imobi -d imobi_staging \
    -c 'SELECT "refreshToken" FROM "SessaoToken" LIMIT 1;'
  # Expected: Hex string (encrypted), NOT JWT format
  ```

---

## Rollback Procedures

### If Critical Issues Found in Staging
```bash
# 1. Stop current deployment
pm2 stop imbobi-api imbobi-web
# OR
docker stop imobi-api imobi-web

# 2. Check previous version
git log --oneline -10
# Find last stable commit

# 3. Checkout previous version
git checkout <previous-stable-commit>

# 4. Rebuild and restart
pnpm build
pm2 start imbobi-api --update
pm2 start imbobi-web --update

# 5. Verify rollback
curl http://staging:4000/api/v1/health
# Expected: 200 OK
```

### Database Rollback (If Migration Failed)
```bash
# 1. Restore from backup
pg_restore -h staging-db -U imobi -d imobi_staging backup_YYYYMMDD_HHMMSS.dump

# 2. Verify restoration
psql -h staging-db -U imobi -d imobi_staging -c "\dt" | wc -l
# Expected: Correct table count

# 3. If needed, revert to previous migration
# Edit Prisma schema and run:
pnpm db:migrate resolve --rolled-back <migration-name>
```

---

## Monitoring & Logging

### Logs Location
- **API Logs:** `/var/log/imbobi/api.log`
- **Web Logs:** `/var/log/imbobi/web.log`
- **Database Logs:** `/var/log/postgresql/`
- **Redis Logs:** `/var/log/redis/`

### Log Monitoring
```bash
# API logs (real-time)
pm2 logs imbobi-api

# Web logs (real-time)
pm2 logs imbobi-web

# Database queries (slow queries)
tail -f /var/log/postgresql/slowlog.log

# Check for errors
grep ERROR /var/log/imbobi/api.log | tail -20
grep ERROR /var/log/imbobi/web.log | tail -20
```

### Performance Monitoring
```bash
# API response time
curl -w "Time: %{time_total}s\n" http://staging:4000/api/v1/health

# Database connection pool
psql -h staging-db -U imobi -d imobi_staging \
  -c "SELECT count(*) FROM pg_stat_activity;"
# Expected: <20 connections

# Redis memory usage
redis-cli -h staging-redis INFO memory | grep used_memory_human
# Expected: Reasonable memory usage
```

---

## Sign-Off Checklist

### Before Declaring Deployment Complete
- [ ] All builds completed successfully
- [ ] All environment variables configured
- [ ] Database migrations applied
- [ ] Health checks pass (API, Web, DB, Redis)
- [ ] Security tests pass (20/20)
- [ ] No errors in logs during 5-minute test period
- [ ] Rate limiting works (429 on threshold)
- [ ] No sensitive data exposed in responses
- [ ] Encryption verified (refresh tokens)
- [ ] CORS configured correctly

### Approval Sign-Off
```
Deployment Verification: ✅ COMPLETE
Date: 2026-05-30
Verified By: ________________
Status: [ ] PASSED [ ] CONDITIONAL [ ] FAILED
```

### If FAILED
- Document specific failure
- Do NOT proceed to production
- Escalate to infrastructure team
- See "Rollback Procedures" above

---

## Post-Deployment Actions (Next 24 Hours)

- [ ] Monitor logs for errors
- [ ] Test user flows manually
- [ ] Run load test (if applicable)
- [ ] Check database query performance
- [ ] Verify email delivery
- [ ] Test push notifications
- [ ] Check storage (S3) access
- [ ] Review security audit logs

---

## Production Deployment (After Staging Passes)

Follow same steps as staging deployment but:
1. Use production environment variables
2. Backup production database BEFORE migration
3. Have rollback plan ready
4. Execute during maintenance window
5. Monitor closely for first 2 hours
6. Keep team on standby for 24 hours

See: [`AWS_DEPLOYMENT_GUIDE.md`](./AWS_DEPLOYMENT_GUIDE.md)

---

## Troubleshooting

### API won't start
```bash
# Check logs
pm2 logs imbobi-api --err

# Verify environment variables
cat .env.staging | grep DATABASE_URL

# Test database connection
psql $(echo $DATABASE_URL | sed 's|postgresql://||')

# Check port availability
lsof -i :4000
```

### Web won't build
```bash
# Clear Next.js cache
rm -rf apps/web/.next

# Regenerate Prisma client (if needed)
pnpm db:generate

# Rebuild
pnpm build --filter=@imbobi/web
```

### Database migration fails
```bash
# Check migration status
pnpm db:migrate status

# View migration
cat services/api/src/prisma/migrations/<migration-name>/migration.sql

# Roll back manually (careful!)
# Edit migration_lock.toml to mark as reversed
# Then run: pnpm db:migrate resolve --rolled-back <name>
```

### Redis connection error
```bash
# Test Redis connection
redis-cli -h staging-redis ping

# Check Redis password
redis-cli -h staging-redis -a <password> ping

# View Redis config
redis-cli -h staging-redis CONFIG GET requirepass
```

---

## Version History

| Date | Version | Changes | Status |
|------|---------|---------|--------|
| 2026-05-30 | 1.0 | Initial deployment checklist | ✅ ACTIVE |

---

## Reference Documentation

- **Staging Guide:** [`STAGING_DEPLOYMENT.md`](./STAGING_DEPLOYMENT.md)
- **Security Checklist:** [`SECURITY_CHECKLIST.md`](./SECURITY_CHECKLIST.md)
- **AWS Production Guide:** [`AWS_DEPLOYMENT_GUIDE.md`](./AWS_DEPLOYMENT_GUIDE.md)
- **Testing Checklist:** [`TESTING_CHECKLIST.md`](./TESTING_CHECKLIST.md)

---

**Last Updated:** 2026-05-30  
**Prepared By:** DevOps & Infrastructure Team  
**Contact:** contato.vinicaetano93@gmail.com

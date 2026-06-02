# imobi Staging Deployment Checklist

Quick reference for deploying imobi on Render with PostgreSQL & Redis.

---

## Phase 1: Create Infrastructure (Render Dashboard)

### PostgreSQL Setup
- [ ] Go to Render Dashboard → New → Database → PostgreSQL
- [ ] Name: `imobi-staging-db`
- [ ] Version: PostgreSQL 14+ (recommend 16)
- [ ] Database: `imobi_staging`
- [ ] User: `imobi_staging`
- [ ] Region: Same as API service
- [ ] Copy connection string to safe location

### Redis Setup
- [ ] Go to Render Dashboard → New → Redis
- [ ] Name: `imobi-staging-redis`
- [ ] Version: Redis 7+
- [ ] Region: Same as PostgreSQL
- [ ] Copy host, port, password to safe location

---

## Phase 2: Generate Security Credentials

### JWT Secret (min 64 chars)
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```
- [ ] Generate and save value
- [ ] Verify length >= 64 characters

### Encryption Key (32-byte base64)
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```
- [ ] Generate and save value
- [ ] Verify length = 44 characters

---

## Phase 3: Set Environment Variables in Render

In Render Dashboard → API Service → Environment:

### Database & Cache
- [ ] `DATABASE_URL` = PostgreSQL connection string (with `?sslmode=require`)
- [ ] `REDIS_HOST` = Redis hostname
- [ ] `REDIS_PORT` = `6379`
- [ ] `REDIS_PASSWORD` = Redis password

### Security
- [ ] `JWT_SECRET` = Generated 64+ char key
- [ ] `ENCRYPTION_KEY` = Generated 44-char base64 key

### Deployment Config
- [ ] `NODE_ENV` = `staging`
- [ ] `PORT` = `4000`
- [ ] `CORS_ORIGIN` = Web service URL (https://...)

---

## Phase 4: Deploy API Service

- [ ] Push code to git with deployment configs
- [ ] Trigger Render build:
  ```bash
  pnpm install
  pnpm db:generate
  pnpm db:migrate
  pnpm build
  ```
- [ ] Verify build succeeds (check Render logs)
- [ ] Wait for health check to pass

---

## Phase 5: Verify Database Migrations

### Check Migration Status
```bash
pnpm prisma migrate status
```
Expected output: All 6 migrations marked as "✓ Applied"

- [ ] `0_init` — Core schema
- [ ] `1_add_notifications` — Notificacao table
- [ ] `2_add_kyc_documents` — KycDocumento table
- [ ] `3_add_performance_indexes` — Indexes
- [ ] `20260529172221_add_analytics_event` — Analytics
- [ ] `20260529224517_add_soft_delete_and_job_falha` — JobFalha tracking

### Verify Tables Exist
```bash
\dt  # In PostgreSQL console
```
- [ ] 13 core tables visible
- [ ] All foreign keys intact

---

## Phase 6: Test Connections

### API Health Check
```bash
curl https://[api-url].onrender.com/api/v1/health
```
- [ ] Returns status: "ok"
- [ ] database: "connected"
- [ ] redis: "connected"

### PostgreSQL Direct Test
```bash
DATABASE_URL="..." pnpm prisma db execute --stdin
SELECT version();
```
- [ ] Returns PostgreSQL version

### Redis Test (from API logs)
- [ ] Watch Render API logs for "Redis connected"
- [ ] Or manually test from console:
  ```bash
  redis-cli -h $REDIS_HOST -a $REDIS_PASSWORD PING
  # Should return: PONG
  ```

---

## Phase 7: Deploy Web Service

In Render Dashboard → Web Service → Environment:

- [ ] `NEXT_PUBLIC_API_URL` = API service URL
- [ ] `NODE_ENV` = `production`

- [ ] Trigger build (web service should auto-deploy)
- [ ] Wait for health check to pass
- [ ] Test web app loads and connects to API

---

## Phase 8: Optional - Seed Initial Data

For staging/demo purposes only:

```bash
DATABASE_URL="..." pnpm seed
```

- [ ] Creates test users
- [ ] Creates sample obras
- [ ] Sets up credit lines
- [ ] All test data uses São Paulo coordinates

---

## Phase 9: Monitoring & Alerts

### PostgreSQL Monitoring
In Render Dashboard → Database → Metrics:
- [ ] Set alert: CPU > 80%
- [ ] Set alert: Disk > 80%
- [ ] Enable automated backups (daily, 7-day retention)

### Redis Monitoring
In Render Dashboard → Redis → Metrics:
- [ ] Watch memory usage (should be < 100MB for staging)
- [ ] Watch connected clients
- [ ] Monitor for any evictions

### API Monitoring
- [ ] Enable Render notifications for build failures
- [ ] Monitor error logs in Render dashboard
- [ ] Check BullMQ worker logs: "liberacao-parcela" queue

---

## Phase 10: Backup & Recovery

### PostgreSQL Backups
- [ ] Verify automated backups enabled
- [ ] Test restore from backup (create test database)
- [ ] Document backup location and retention

### Redis Persistence
- [ ] Check RDB snapshot configured
- [ ] Note: Redis is cache-only, loss is recoverable
- [ ] Prioritize PostgreSQL backups

---

## Reference: Environment Variable Template

```bash
# Database & Cache
DATABASE_URL="postgresql://imobi_staging:PASSWORD@HOST:5432/imobi_staging?sslmode=require"
REDIS_HOST="HOST"
REDIS_PORT="6379"
REDIS_PASSWORD="PASSWORD"

# Security Keys (generate new values)
JWT_SECRET="[64+ random chars]"
ENCRYPTION_KEY="[32-byte base64]"

# Deployment
NODE_ENV="staging"
PORT="4000"
CORS_ORIGIN="https://[web-url].onrender.com"
NEXT_PUBLIC_API_URL="https://[api-url].onrender.com/api/v1"
```

---

## Troubleshooting Quick Links

| Error | Cause | Solution |
|-------|-------|----------|
| ECONNREFUSED 127.0.0.1:5432 | DATABASE_URL points to localhost | Use Render PostgreSQL hostname |
| CERTIFICATE_VERIFY_FAILED | sslmode not set | Add `?sslmode=require` to DATABASE_URL |
| password authentication failed | Wrong credentials | Copy fresh connection string from Render |
| NOAUTH Authentication required | REDIS_PASSWORD not set | Verify REDIS_PASSWORD in Render env vars |
| Database does not exist | Wrong database name | Use `imobi_staging`, not `postgres` |
| Tables don't exist | Migrations didn't run | Check Render deployment logs for `pnpm db:migrate` |

---

## File References

- **Setup Guide:** `/home/user/imobi/DEPLOYMENT_DATABASE_GUIDE.md`
- **Schema:** `/services/api/prisma/schema.prisma`
- **Migrations:** `/services/api/prisma/migrations/`
- **Environment Example:** `/services/api/.env.example`
- **Docker Compose (local reference):** `/docker-compose.staging.yml`

---

**Created:** 2026-06-02  
**Status:** Ready for Render Staging Deployment

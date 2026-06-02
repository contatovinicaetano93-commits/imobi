# imobi — Render Deployment Checklist

**Printable checklist for step-by-step verification during deployment**

Date: 2026-06-02

---

## PRE-DEPLOYMENT

- [ ] JWT_SECRET generated (64+ chars, base64)
- [ ] ENCRYPTION_KEY generated (32 bytes, base64)
- [ ] Render account set up
- [ ] GitHub repository access verified
- [ ] AWS S3 credentials ready
- [ ] Preferred region selected

---

## PHASE 1: PostgreSQL Setup

- [ ] Navigated to Render Dashboard
- [ ] Created PostgreSQL 14.9+ instance
- [ ] Instance name: `imobi-staging-db`
- [ ] Database name: `imobi_staging`
- [ ] Status shows "Available"
- [ ] Connection string copied (Internal URL preferred)
- [ ] Connection string format verified: `postgresql://user:password@host:5432/imobi_staging`

---

## PHASE 2: Redis Setup

- [ ] Clicked "New +" → "Redis"
- [ ] Instance name: `imobi-staging-cache`
- [ ] Region: Same as PostgreSQL
- [ ] Redis Version: 7.x or later
- [ ] Eviction Policy: `allkeys-lru`
- [ ] Status shows "Available"
- [ ] Connection string copied
- [ ] Extracted REDIS_HOST, REDIS_PORT, REDIS_PASSWORD

---

## PHASE 3: API Service Creation

- [ ] Created Web Service
- [ ] Name: `imobi-api-staging`
- [ ] Region: Same as PostgreSQL/Redis
- [ ] Build Command: `pnpm install && pnpm build`
- [ ] Start Command: `pnpm --filter @imbobi/api start:prod`

### Environment Variables Set

- [ ] DATABASE_URL (from PostgreSQL)
- [ ] REDIS_HOST (from Redis)
- [ ] REDIS_PORT (from Redis)
- [ ] REDIS_PASSWORD (from Redis)
- [ ] NODE_ENV = `staging`
- [ ] PORT = `4000`
- [ ] JWT_SECRET (generated)
- [ ] ENCRYPTION_KEY (generated)
- [ ] CORS_ORIGIN (staging domain)
- [ ] AWS_REGION
- [ ] AWS_ACCESS_KEY_ID
- [ ] AWS_SECRET_ACCESS_KEY
- [ ] AWS_S3_BUCKET

### Service Deployment

- [ ] Clicked "Create Web Service"
- [ ] Build completed successfully (check Logs)
- [ ] Service status: "Live"
- [ ] API URL obtained: `https://imobi-api-staging.onrender.com`

---

## PHASE 4: Database Migrations

### In Service Shell

- [ ] Opened Service → Shell tab
- [ ] Ran: `cd /app && pnpm db:generate`
- [ ] Output: "Generated Prisma Client"

### Run Migrations

- [ ] Ran: `pnpm db:migrate`
- [ ] All migrations applied successfully:
  - [ ] 0_init
  - [ ] 1_add_notifications
  - [ ] 2_add_kyc_documents
  - [ ] 3_add_performance_indexes
  - [ ] 20260529172221_add_analytics_event
  - [ ] 20260529224517_add_soft_delete_and_job_falha

### Verify Tables

- [ ] Ran: `pnpm prisma:studio`
- [ ] Opened: http://localhost:5555
- [ ] All 13 tables visible and accessible

---

## PHASE 5: Connection Testing

### API Health

- [ ] Test: `curl https://imobi-api-staging.onrender.com/health`
- [ ] Response: HTTP 200
- [ ] Contains: `"status": "ok"`
- [ ] Contains: `"database": "connected"`

### Logs Verification

- [ ] Check API Service → Logs
- [ ] See: "Database connection successful"
- [ ] See: "Redis connection successful"
- [ ] No connection errors

### Metrics

**PostgreSQL**:
- [ ] Connections: < 10
- [ ] Size: 100-500 MB
- [ ] CPU: < 20%

**Redis**:
- [ ] Memory: < 50 MB
- [ ] Clients: 1-3
- [ ] Evicted: 0

---

## PHASE 6: Monitoring Setup

### PostgreSQL Alerts

- [ ] Connections > 30 (5 min duration)
- [ ] Size > 5 GB
- [ ] Email notifications enabled

### Redis Alerts

- [ ] Memory > 75%
- [ ] Email notifications enabled

### API Health Checks

- [ ] Endpoint: `/health`
- [ ] Interval: 30s
- [ ] Timeout: 5s

---

## PHASE 7: Backup

- [ ] Automated backups enabled (retention 7+ days)
- [ ] Manual backup created: `pg_dump | gzip > backup.sql.gz`
- [ ] Backup size verified (50-500 MB for empty schema)

---

## PHASE 8: Web Service (Optional)

- [ ] Created Web Service for Next.js app
- [ ] NEXT_PUBLIC_API_URL set correctly
- [ ] Build completed
- [ ] Service "Live"
- [ ] Web app accessible

---

## FINAL CHECKS

### Status
- [ ] API: Live + Health check passing
- [ ] PostgreSQL: Available + All tables created
- [ ] Redis: Available + Memory healthy
- [ ] Logs: No critical errors
- [ ] Monitoring: Alerts enabled
- [ ] Backups: Enabled

### Security
- [ ] No secrets in git
- [ ] All credentials in Render dashboard
- [ ] SSL/TLS enabled
- [ ] Passwords 32+ characters

### Documentation
- [ ] Connection strings saved securely
- [ ] Disaster recovery documented
- [ ] Team notified
- [ ] Runbook created

---

## Completion Status

✓ All items completed and verified
✓ Ready for staging testing
✓ Monitoring active
✓ Backups enabled

**Date Completed**: _____________

**Verified By**: _____________

---

**Next**: Monitor for 24 hours, run load tests, test disaster recovery

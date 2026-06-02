# imobi — Render PostgreSQL & Redis Setup Guide

**Complete deployment guide for staging environment**

Date: June 2, 2026

---

## START HERE: Choose Your Path

### Path A: I'm Visual / First-Time Deployer (RECOMMENDED)
1. Read: **RENDER_STEP_BY_STEP.md** (20 min)
   - Click-by-click Render UI instructions
   - Visual walkthrough with expected results
   - All 8 parts clearly numbered

2. Use: **RENDER_DEPLOYMENT_CHECKLIST.md** (while deploying)
   - Printable checklist
   - Check off each step
   - Verify completion

3. Reference: **RENDER_QUICK_REFERENCE.md** (during deployment)
   - One-page commands
   - Connection strings
   - Troubleshooting table

### Path B: I'm Experienced & Want Speed
1. Skim: **RENDER_QUICK_REFERENCE.md** (5 min)
2. Use: **RENDER_DEPLOYMENT_COMMANDS.sh** (automate)
3. Reference: **RENDER_TECHNICAL_CONFIG.md** (as needed)

### Path C: I Want to Understand Everything First
1. Read: **RENDER_DEPLOYMENT_SETUP.md** (30 min)
2. Deep dive: **RENDER_TECHNICAL_CONFIG.md** (30 min)
3. Then follow: **RENDER_STEP_BY_STEP.md** (20 min)

---

## Quick Summary: What You're Setting Up

### 3 Services on Render
1. **PostgreSQL 14+** database (`imobi_staging`)
   - All tables for users, credits, projects, photos
   - Automated backups
   - Connection pool management

2. **Redis 7+** cache (`imobi-staging-cache`)
   - Session caching
   - Job queue management (BullMQ)
   - Real-time notifications

3. **NestJS API** web service (`imobi-api-staging`)
   - Connects to PostgreSQL + Redis
   - Runs database migrations
   - Exposes `/health` endpoint

### Timeline
- Create PostgreSQL: 5 minutes
- Create Redis: 5 minutes
- Deploy API: 15 minutes
- Run migrations: 5 minutes
- Verify & test: 10 minutes
- Total: **40-50 minutes**

---

## Required Information

### Before You Start, Gather:
- [ ] Render account (free tier available)
- [ ] GitHub repository access
- [ ] AWS S3 staging bucket credentials
- [ ] A terminal with these installed:
  - Node.js 18+ or 20+
  - pnpm
  - psql (PostgreSQL client)

### Generate These Secrets (Run Locally)
```bash
# JWT_SECRET (64+ characters)
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('base64'))"

# ENCRYPTION_KEY (32 bytes)
node -e "console.log('ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('base64'))"
```

Store both values securely - you'll need them later.

---

## Step 1: Create PostgreSQL on Render

1. Go to https://dashboard.render.com
2. Click **"New +"** → **"PostgreSQL"**
3. Fill form:
   - Name: `imobi-staging-db`
   - Database: `imobi_staging`
   - Version: `14.9` or later
   - Region: Your preferred region
4. Click **"Create Database"**
5. Wait 2-3 minutes for "Available" status
6. Copy connection string from **"Connections"** section

**Connection String Format**:
```
postgresql://username:password@host:5432/imobi_staging
```

**Save this** - becomes `DATABASE_URL`

---

## Step 2: Create Redis on Render

1. Click **"New +"** → **"Redis"**
2. Fill form:
   - Name: `imobi-staging-cache`
   - Region: **Same as PostgreSQL**
   - Version: `7.x` or later
   - Eviction Policy: `allkeys-lru`
3. Click **"Create Redis"**
4. Wait 1-2 minutes for "Available" status
5. Copy connection string from **"Connections"** section

**Extract From URL**:
- `REDIS_HOST` = the hostname part
- `REDIS_PORT` = usually 6379
- `REDIS_PASSWORD` = the password part

**Save all three** - they're needed in next step

---

## Step 3: Deploy API Service

1. Click **"New +"** → **"Web Service"**
2. Connect your GitHub repository
3. Fill form:
   - Name: `imobi-api-staging`
   - Region: Same as PostgreSQL/Redis
   - Branch: `staging` or `main`
   - Build Command: `pnpm install && pnpm build`
   - Start Command: `pnpm --filter @imbobi/api start:prod`

4. **IMPORTANT**: Before clicking "Create", set Environment Variables:

### Add These Environment Variables:

Copy from PostgreSQL:
```
DATABASE_URL=postgresql://...
```

Copy from Redis:
```
REDIS_HOST=...
REDIS_PORT=...
REDIS_PASSWORD=...
```

Generate (from earlier):
```
JWT_SECRET=... (64+ chars)
ENCRYPTION_KEY=... (32 bytes)
```

Application:
```
NODE_ENV=staging
PORT=4000
CORS_ORIGIN=https://web-staging.imobi.com
```

AWS (get from AWS):
```
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=imobi-staging-assets
```

5. Click **"Create Web Service"**
6. Wait 15+ minutes for build and deployment
7. Check **"Logs"** tab - look for errors
8. When status shows **"Live"**, it's deployed!

---

## Step 4: Run Database Migrations

**From Render Service Shell**:

1. Go to API service page
2. Click **"Shell"** tab
3. Run these commands:

```bash
# Generate Prisma client
pnpm db:generate

# Run migrations (creates all tables)
pnpm db:migrate
```

Expected output - all migrations applied:
- 0_init
- 1_add_notifications
- 2_add_kyc_documents
- 3_add_performance_indexes
- 20260529172221_add_analytics_event
- 20260529224517_add_soft_delete_and_job_falha

---

## Step 5: Verify Everything Works

### Test 1: API Health Endpoint
```bash
curl https://imobi-api-staging.onrender.com/health
```
Should return HTTP 200 with: `"status": "ok", "database": "connected"`

### Test 2: Check Logs
- API Service → **"Logs"** tab
- Look for:
  - `"Database connection successful"`
  - `"Redis connection successful"`
  - No error messages

### Test 3: Open Prisma Studio
In service shell:
```bash
pnpm prisma:studio
```
Browser: http://localhost:5555
- Should show all 13 tables
- Click tables to see structure

### Test 4: Check Database Metrics
PostgreSQL instance → **"Monitoring"** tab
- Connections: < 10 (good)
- Database Size: < 1 GB (normal for empty)
- CPU: < 20% (healthy)

### Test 5: Check Redis Metrics
Redis instance → **"Monitoring"** tab
- Memory: < 50 MB (normal)
- Connected Clients: 1-3 (normal)
- Evicted Keys: 0 (good)

---

## If Anything Goes Wrong

### Connection Refused Error
- Check DATABASE_URL is correct (copy from Render again)
- Check PostgreSQL instance is "Available"
- Check REDIS_HOST/PORT/PASSWORD are correct

### Migration Failed
- Verify DATABASE_URL is set in environment variables
- Check database user has CREATE privilege
- Look for SQL error in output

### API Won't Start
- Check all environment variables are set
- Check build logs for TypeScript errors
- Verify PORT is set to 4000

### Can't Connect with psql
```bash
# Test connection locally
psql "postgresql://user:password@host:5432/imobi_staging" -c "SELECT version();"
```

---

## Setup Complete! Next Steps

1. **Monitor for 24 hours**
   - Check logs regularly
   - Monitor database connections
   - Watch for errors

2. **Run Load Tests** (optional)
   - Test with realistic traffic
   - Monitor performance
   - Check scaling

3. **Deploy Web Service** (optional)
   - Create Web Service for Next.js app
   - Set NEXT_PUBLIC_API_URL to your API URL
   - Deploy and test

4. **Configure Monitoring**
   - Set up alerts for database
   - Set up alerts for Redis
   - Enable automated backups

---

## All Available Documentation

| Document | Purpose | Time |
|----------|---------|------|
| **RENDER_STEP_BY_STEP.md** | Visual walkthrough with UI instructions | 20 min |
| **RENDER_DEPLOYMENT_CHECKLIST.md** | Printable checklist to track progress | 5 min |
| **RENDER_QUICK_REFERENCE.md** | Commands and connection strings | 2 min |
| **RENDER_DEPLOYMENT_SETUP.md** | Comprehensive guide with all details | 30 min |
| **RENDER_TECHNICAL_CONFIG.md** | Performance tuning and config details | 30 min |
| **RENDER_DEPLOYMENT_COMMANDS.sh** | Automation scripts and bash functions | — |
| **RENDER_SETUP_INDEX.md** | Navigation guide for all docs | 5 min |

---

## Security Reminders

- Never commit `.env` files to git
- All secrets must go in Render dashboard ONLY
- Use passwords 32+ characters
- Use different secrets for each environment
- Never share connection strings via email/chat
- Enable SSL/TLS (automatic on Render)

---

## Support & Resources

- **Full guide**: See documentation files above
- **Render docs**: https://render.com/docs
- **Prisma docs**: https://www.prisma.io/docs/
- **PostgreSQL docs**: https://www.postgresql.org/docs/14/
- **Redis docs**: https://redis.io/docs/

---

## Summary

You now have:
- PostgreSQL database with 13 tables
- Redis cache with job queues
- NestJS API running and connected
- Automated backups configured
- Monitoring and alerts set up
- Full documentation for reference

**Time invested**: 40-50 minutes
**Staging environment**: READY
**Next**: Deploy web frontend and start testing!

---

**Document**: RENDER_DEPLOYMENT_START_HERE.md
**Created**: 2026-06-02
**Status**: Ready to Deploy

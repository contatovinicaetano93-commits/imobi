# Render Staging Deployment — Current Status

**Date:** June 2, 2026  
**Branch:** `claude/happy-goldberg-AFQPj`  
**Status:** Infrastructure Ready → Deploy API & Web Services

---

## ✅ COMPLETED: Infrastructure Setup

### PostgreSQL Database
- **Name:** `imobi-staging-db`
- **Status:** Available ✅
- **Region:** Virginia
- **Service ID:** dpg-d8fkjt99rddc73ajgbqg-a
- **Connection String:** postgresql://imobi_staging:PASSWORD@dpg-d8fkjt99rddc73ajgbqg-a.virginia-postgres.render.com/imobi_staging

### Redis Cache
- **Name:** `imobi-staging-cache`
- **Status:** Available ✅
- **Region:** Virginia
- **Service ID:** red-d8lkm1a8qa3s73addtng
- **Version:** Valkey 8.1.4
- **Internal Connection:** redis://:@localhost:6379 (internal, no password)
- **External Connection:** redis://:PASSWORD@red-d8lkm1a8qa3s73addtng.c1.us-virginia-1.evg.run:41783

---

## ⏳ NEXT STEPS: Deploy Services

### Step 1: Create API Web Service on Render

In Render Dashboard → **New +** → **Web Service**

**Configuration:**
```
Name:              imobi-api-staging
GitHub Repo:       contatovinicaetano93-commits/imobi
Branch:            claude/happy-goldberg-AFQPj
Root Directory:    services/api
Runtime:           Node.js
Region:            Virginia (same as PostgreSQL/Redis)
Instance Type:     Starter ($7/month) or Standard ($12/month)

Build Command:     pnpm install && pnpm build
Start Command:     pnpm --filter @imbobi/api start

Environment Variables:
  NODE_ENV=staging
  PORT=4000
  
  Database:
  DATABASE_URL=postgresql://imobi_staging:PASSWORD@dpg-d8fkjt99rddc73ajgbqg-a.virginia-postgres.render.com/imobi_staging?sslmode=require
  
  Redis:
  REDIS_HOST=localhost
  REDIS_PORT=6379
  REDIS_PASSWORD=(leave empty for internal connection)
  
  Security:
  JWT_SECRET=Gthkz2xAA6LrLYYPeWqfn9TuMfmqtPlvkHT7OJkdZkc=
  ENCRYPTION_KEY=TMA5MEFURfgTx5lYNCOuBvsz0ac3sFhSnlRCgWXbPkQ=
  
  CORS:
  CORS_ORIGIN=https://web-staging.onrender.com,http://localhost:3000
  
  AWS (if needed for file uploads):
  AWS_REGION=us-east-1
  AWS_S3_BUCKET=imobi-staging-assets
  AWS_ACCESS_KEY_ID=YOUR_KEY
  AWS_SECRET_ACCESS_KEY=YOUR_SECRET
```

**Steps:**
1. Click **"Create Web Service"**
2. Wait 15-20 minutes for build and deployment
3. Check **"Logs"** tab for errors
4. When status shows **"Live"**, proceed to next step

### Step 2: Run Database Migrations

Once API service is **"Live"**:

1. Go to API service → **"Shell"** tab
2. Run these commands:

```bash
# Generate Prisma client
pnpm db:generate

# Run migrations
pnpm db:migrate
```

Expected output: All 6 migrations applied
- ✓ 0_init
- ✓ 1_add_notifications
- ✓ 2_add_kyc_documents
- ✓ 3_add_performance_indexes
- ✓ 20260529172221_add_analytics_event
- ✓ 20260529224517_add_soft_delete_and_job_falha

### Step 3: Verify API Health

```bash
curl https://imobi-api-staging.onrender.com/api/v1/health
```

Expected response:
```json
{
  "status": "ok",
  "database": "connected",
  "redis": "connected",
  "timestamp": "2026-06-02T..."
}
```

### Step 4: Create Web Service (Optional)

To deploy the Next.js frontend:

**Configuration:**
```
Name:              imobi-web-staging
GitHub Repo:       contatovinicaetano93-commits/imobi
Branch:            claude/happy-goldberg-AFQPj
Root Directory:    apps/web
Runtime:           Node.js
Region:            Virginia
Instance Type:     Starter ($7/month)

Build Command:     pnpm install && pnpm build
Start Command:     pnpm --filter @imbobi/web start

Environment Variables:
  NODE_ENV=staging
  NEXT_PUBLIC_API_URL=https://imobi-api-staging.onrender.com/api/v1
```

---

## 📋 Testing Checklist

After all services are deployed:

- [ ] **API Health:** GET `/api/v1/health` returns 200
- [ ] **Web Landing:** Load https://imobi-web-staging.onrender.com
- [ ] **Signup Flow:** POST to `/api/v1/auth/register` with test data
- [ ] **Login Flow:** POST to `/api/v1/auth/login` with credentials
- [ ] **KYC Profile:** GET `/api/v1/kyc/status` returns current status
- [ ] **Database:** Verify tables exist via Prisma Studio or psql
- [ ] **Redis:** Verify connection in API logs

---

## 🔑 Important Notes

1. **Password Security:**
   - Replace PASSWORD in DATABASE_URL with actual PostgreSQL password
   - Use different credentials for each environment
   - Never commit .env files

2. **Internal vs External:**
   - Redis internal connection (Render to Render): uses `localhost` (no password)
   - Redis external connection (local to Render): uses hostname + password

3. **Migration Failures:**
   - Check DATABASE_URL is correct
   - Verify database exists (`imobi_staging`)
   - Check user has CREATE privilege

4. **Build Timeouts:**
   - If build takes >30 min, check logs for stuck processes
   - Increase instance type if builds fail due to memory

---

## 📞 Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| `ECONNREFUSED 127.0.0.1:5432` | Wrong DATABASE_URL | Use Render PostgreSQL hostname |
| `CERTIFICATE_VERIFY_FAILED` | Missing `?sslmode=require` | Add to DATABASE_URL |
| `NOAUTH Authentication required` | Redis password wrong | Use internal connection (no password) |
| `Tables don't exist` | Migrations didn't run | Check Shell tab for errors |
| `Health check failing` | API not ready | Check Logs for startup errors |

---

**Next Action:** Deploy API Web Service on Render dashboard, wait for "Live" status, then run migrations.


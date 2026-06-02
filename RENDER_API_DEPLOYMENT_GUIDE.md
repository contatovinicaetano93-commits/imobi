# Render API Deployment — Step-by-Step Guide

**Complete guide to deploy imobi API on Render**

---

## PREREQUISITES ✅

Before you start, ensure you have:
- [ ] PostgreSQL database created on Render (Status: Available)
- [ ] Redis cache created on Render (Status: Available)
- [ ] PostgreSQL password from Render dashboard (copy from Connections tab)
- [ ] GitHub repository access (already connected to Render)
- [ ] This guide open in another window

---

## STEP 1: Navigate to Render Dashboard

1. Go to https://dashboard.render.com
2. Sign in to your account
3. You should see your PostgreSQL and Redis services listed

---

## STEP 2: Create New Web Service

1. Click **"New +"** button (top right)
2. Select **"Web Service"** from the dropdown

---

## STEP 3: Connect GitHub Repository

1. **Authorization:** Click **"Connect"** next to your GitHub account
   - If not authorized, authorize Render to access your GitHub repos
2. **Search:** Type `imobi` in the search box
3. **Select:** Click the `contatovinicaetano93-commits/imobi` repository

---

## STEP 4: Configure Service Settings

Fill in the following fields:

```
┌─────────────────────────────────────┐
│ SERVICE CONFIGURATION               │
├─────────────────────────────────────┤
│ Name:         imobi-api-staging     │
│ Region:       Virginia (US)         │
│ Branch:       claude/happy-goldberg │
│               -AFQPj                │
│ Root Direc.:  services/api          │
│ Runtime:      Node.js               │
│ Instance:     Starter ($7/mo)       │
│ Build Cmd:    pnpm install &&      │
│               pnpm build            │
│ Start Cmd:    pnpm --filter         │
│               @imbobi/api start     │
└─────────────────────────────────────┘
```

**Field-by-field:**

### Name
- Type: `imobi-api-staging`
- (This will be part of your URL: imobi-api-staging.onrender.com)

### Region
- Select: **Virginia** (same as your PostgreSQL/Redis)

### Branch
- Type: `claude/happy-goldberg-AFQPj`

### Root Directory
- Type: `services/api`
- (This is where the API code lives)

### Build Command
```
pnpm install && pnpm build
```

### Start Command
```
pnpm --filter @imbobi/api start
```

---

## STEP 5: Add Environment Variables ⭐ CRITICAL

**IMPORTANT:** Scroll down to **"Environment Variables"** section

You'll add variables one by one. For each, click **"Add Environment Variable"**

### GROUP 1: Database Connection

**Variable 1: DATABASE_URL**
```
Key:   DATABASE_URL
Value: postgresql://imobi_staging:PASSWORD@dpg-d8fkjt99rddc73ajgbqg-a.virginia-postgres.render.com/imobi_staging?sslmode=require
```
⚠️ **REPLACE PASSWORD** with your actual PostgreSQL password from Render PostgreSQL Connections tab

### GROUP 2: Redis Connection

**Variable 2: REDIS_HOST**
```
Key:   REDIS_HOST
Value: localhost
```

**Variable 3: REDIS_PORT**
```
Key:   REDIS_PORT
Value: 6379
```

**Variable 4: REDIS_PASSWORD**
```
Key:   REDIS_PASSWORD
Value: (leave blank - internal Render connection)
```

### GROUP 3: Security Keys

**Variable 5: JWT_SECRET**
```
Key:   JWT_SECRET
Value: Gthkz2xAA6LrLYYPeWqfn9TuMfmqtPlvkHT7OJkdZkc=
```

**Variable 6: ENCRYPTION_KEY**
```
Key:   ENCRYPTION_KEY
Value: TMA5MEFURfgTx5lYNCOuBvsz0ac3sFhSnlRCgWXbPkQ=
```

### GROUP 4: Application Config

**Variable 7: NODE_ENV**
```
Key:   NODE_ENV
Value: staging
```

**Variable 8: PORT**
```
Key:   PORT
Value: 4000
```

**Variable 9: CORS_ORIGIN**
```
Key:   CORS_ORIGIN
Value: https://web-staging.onrender.com,http://localhost:3000
```

### GROUP 5: AWS (Optional - only if you need file uploads)

If you're using S3 for file uploads:

**Variable 10: AWS_REGION**
```
Key:   AWS_REGION
Value: us-east-1
```

**Variable 11: AWS_S3_BUCKET**
```
Key:   AWS_S3_BUCKET
Value: imobi-staging-assets
```

**Variable 12: AWS_ACCESS_KEY_ID**
```
Key:   AWS_ACCESS_KEY_ID
Value: (your AWS access key)
```

**Variable 13: AWS_SECRET_ACCESS_KEY**
```
Key:   AWS_SECRET_ACCESS_KEY
Value: (your AWS secret key)
```

---

## STEP 6: Create the Service

1. **Scroll to bottom** of the form
2. Click **"Create Web Service"** button (blue button)
3. **Wait for build and deployment** (takes 15-20 minutes)

---

## STEP 7: Monitor Deployment

1. You'll see a **"Build in progress..."** message
2. Click on **"Logs"** tab to watch the build process
3. Look for these success indicators:
   - ✅ `pnpm install` completes
   - ✅ `pnpm build` completes
   - ✅ Service starts (no errors)

**If build fails:**
- Check logs for error messages
- Most common: typo in environment variables or wrong branch
- Fix and click **"Trigger deploy"** to rebuild

---

## STEP 8: Verify Service is Live

1. When status changes to **"Live"** (green), click on your service name
2. Your API URL appears at the top, e.g.:
   ```
   https://imobi-api-staging.onrender.com
   ```

3. Test the health endpoint:
   ```bash
   curl https://imobi-api-staging.onrender.com/api/v1/health
   ```

   Expected response:
   ```json
   {
     "status": "ok",
     "database": "connecting...",
     "redis": "connecting..."
   }
   ```

---

## STEP 9: Run Database Migrations ⭐ IMPORTANT

Once service is **"Live"**:

1. Go to your API service page
2. Click **"Shell"** tab (next to Logs)
3. You now have a terminal in your service
4. Run these commands:

```bash
# Step 1: Generate Prisma client
pnpm db:generate

# Step 2: Run migrations
pnpm db:migrate
```

**Expected output:**
```
Applying migration `0_init`
Applying migration `1_add_notifications`
Applying migration `2_add_kyc_documents`
Applying migration `3_add_performance_indexes`
Applying migration `20260529172221_add_analytics_event`
Applying migration `20260529224517_add_soft_delete_and_job_falha`

✅ All migrations applied successfully
```

---

## STEP 10: Final Verification

Test the health endpoint again:

```bash
curl https://imobi-api-staging.onrender.com/api/v1/health
```

Now it should show:
```json
{
  "status": "ok",
  "database": "connected",
  "redis": "connected",
  "timestamp": "2026-06-02T..."
}
```

✅ **API is ready for testing!**

---

## TROUBLESHOOTING

| Problem | Solution |
|---------|----------|
| Build fails with "pnpm not found" | Check root directory is `services/api` |
| `ECONNREFUSED` on database | Verify DATABASE_URL is correct, replace PASSWORD |
| Migrations fail | Check database user has CREATE privilege |
| Health check returns 500 | Check all environment variables are set |
| Service won't start | Review Logs tab for startup errors |

---

## NEXT STEPS

After API is live and verified:

1. ✅ **Deploy Web Frontend** (optional but recommended)
   - Create another Web Service with root directory `apps/web`
   - Set `NEXT_PUBLIC_API_URL=https://imobi-api-staging.onrender.com/api/v1`

2. ✅ **Test Signup Flow**
   - Go to https://imobi-web-staging.onrender.com/cadastro
   - Create test account
   - Verify email confirmation works

3. ✅ **Test KYC Profile**
   - Login and navigate to `/dashboard`
   - Upload KYC documents
   - Verify document processing

4. ✅ **Test Credit Simulator**
   - In dashboard, test credit calculations
   - Verify monthly payment calculations

---

**Time estimate:** 20-25 minutes total (including migration)

**You've got this! 🚀**


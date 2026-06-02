# imobi — Render Setup Step-by-Step with Screenshots Guide

**Visual walkthrough for setting up PostgreSQL and Redis on Render**

---

## Part 1: PostgreSQL Database Setup

### Step 1.1: Navigate to Render Dashboard

1. Go to https://dashboard.render.com
2. Log in with your account
3. Click **"New +"** button (top left)

**Expected**: Dropdown menu appears with options

### Step 1.2: Select PostgreSQL

1. From the dropdown menu, click **"PostgreSQL"**

**Expected**: PostgreSQL creation form loads

### Step 1.3: Configure PostgreSQL Instance

Fill in the form with these values:

| Field | Value | Notes |
|-------|-------|-------|
| **Name** | `imobi-staging-db` | Identifies your database instance |
| **Database** | `imobi_staging` | Default database name |
| **User** | (auto-generated) | Usually `postgres` or similar |
| **Region** | Select nearest to your app | e.g., "Ohio" for US-East |
| **PostgreSQL Version** | `14.9` or latest 14/15 | Minimum version 14 |
| **Instance Type** | `Standard` (or `Starter` for testing) | Affects performance/cost |
| **Starter** | Disabled (for staging) | Auto-sleep OK for non-prod |

**Expected**: All fields populated

### Step 1.4: Review & Create

1. Scroll to bottom
2. Click **"Create Database"**
3. Render redirects to instance page showing "Creating..." status

**Expected**: Status changes to "Available" in 2-3 minutes

### Step 1.5: Copy Connection String

Once status shows **"Available"**:

1. Scroll to **"Connections"** section
2. You'll see:
   - **External Database URL**: Use if deploying from outside Render
   - **Internal Database URL**: Use if API is also on Render (recommended)

3. Copy the **Internal Database URL**:
   ```
   postgresql://imbobi:XXXXX@dpg-abc123.postgres.render.com:5432/imobi_staging
   ```

4. Save this value - it becomes `DATABASE_URL`

**Expected**: Connection string with format `postgresql://user:password@host:port/database`

### Step 1.6: (Optional) Create Dedicated User

For enhanced security in staging:

1. Click **"Query Editor"** (if available) or use external psql
2. Connect with admin user, then run:

```sql
CREATE USER imbobi_staging WITH PASSWORD 'your-secure-password-min-32-chars';
GRANT CONNECT ON DATABASE imobi_staging TO imbobi_staging;
GRANT CREATE ON SCHEMA public TO imbobi_staging;
```

3. Update `DATABASE_URL` to use this user:
   ```
   postgresql://imbobi_staging:your-secure-password@dpg-abc123.postgres.render.com:5432/imobi_staging
   ```

**Expected**: New user created with limited privileges

---

## Part 2: Redis Cache Setup

### Step 2.1: Navigate to Create New Service

1. From Render Dashboard, click **"New +"** again
2. From dropdown, click **"Redis"**

**Expected**: Redis creation form loads

### Step 2.2: Configure Redis Instance

Fill in the form with these values:

| Field | Value | Notes |
|-------|-------|-------|
| **Name** | `imobi-staging-cache` | Identifies your Redis instance |
| **Region** | Same as PostgreSQL | For low latency |
| **Redis Version** | `7.x` (latest) | Minimum version 7 |
| **Instance Type** | `Standard` (or `Starter` for testing) | Affects performance/cost |
| **Eviction Policy** | `allkeys-lru` | Recommended for cache |
| **ACL** | (default) | Auto-generated password |

**Expected**: All fields populated

### Step 2.3: Create & Wait

1. Click **"Create Redis"**
2. Render shows "Creating..." status

**Expected**: Status changes to "Available" in 1-2 minutes

### Step 2.4: Copy Connection String

Once status shows **"Available"**:

1. Scroll to **"Connections"** section
2. Copy the **Internal Redis URL**:
   ```
   redis://:cA3xL9pK2mQ5vN1x@dpg-def456.redis.render.com:6379
   ```

3. Extract these values:
   - `REDIS_HOST` = `dpg-def456.redis.render.com`
   - `REDIS_PORT` = `6379`
   - `REDIS_PASSWORD` = `cA3xL9pK2mQ5vN1x` (the part after `:`)

4. Save all three values

**Expected**: Full connection string with password

---

## Part 3: Deploy API Service to Render

### Step 3.1: Create Web Service

1. Click **"New +"**
2. Select **"Web Service"**
3. Connect your GitHub repository containing imobi

**Expected**: Repository options appear

### Step 3.2: Configure Web Service

| Field | Value |
|-------|-------|
| **Name** | `imobi-api-staging` |
| **Region** | Same as database/redis |
| **Branch** | `staging` or `main` |
| **Runtime** | `Node` |
| **Build Command** | `pnpm install && pnpm build` |
| **Start Command** | `pnpm --filter @imbobi/api start:prod` |

**Expected**: Configuration saved

### Step 3.3: Add Environment Variables

1. Scroll to **"Environment"** section
2. Add these variables (get values from PostgreSQL and Redis created above):

```
NODE_ENV=staging
PORT=4000
DATABASE_URL=postgresql://imbobi_staging:password@dpg-abc123.postgres.render.com:5432/imobi_staging
REDIS_HOST=dpg-def456.redis.render.com
REDIS_PORT=6379
REDIS_PASSWORD=cA3xL9pK2mQ5vN1x
JWT_SECRET=[GENERATE]
ENCRYPTION_KEY=[GENERATE]
CORS_ORIGIN=https://web-staging.imobi.com
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=[FROM AWS]
AWS_SECRET_ACCESS_KEY=[FROM AWS]
AWS_S3_BUCKET=imobi-staging-assets
```

**To generate JWT_SECRET and ENCRYPTION_KEY:**

Open terminal and run:
```bash
# JWT_SECRET (64+ chars)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# ENCRYPTION_KEY (32 bytes)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Expected**: All variables set (green checkmarks)

### Step 3.4: Deploy

1. Click **"Create Web Service"**
2. Render starts build process
3. Monitor progress in **"Logs"** tab

**Expected**: Build completes, service shows "Live"

---

## Part 4: Run Database Migrations

### Step 4.1: Access Service Shell

1. Go to API service page on Render
2. Click **"Shell"** tab

**Expected**: Terminal prompt appears

### Step 4.2: Run Migrations

In the shell, run:

```bash
cd /app
pnpm db:generate
```

**Expected**: Prisma client regenerated

Then run:

```bash
pnpm db:migrate
```

**Expected**: Output shows:
```
Migration applied: 0_init
Migration applied: 1_add_notifications
Migration applied: 2_add_kyc_documents
...
```

**If error occurs**: Check that `DATABASE_URL` environment variable is set correctly

### Step 4.3: Verify Tables Created

In the shell:

```bash
pnpm prisma:studio
```

This opens Prisma Studio at a URL. Navigate to it in your browser.

**Expected**: 11 tables visible:
- Usuario
- Credito
- Obra
- EtapaObra
- EvidenciaEtapa
- LiberacaoParcela
- KycDocumento
- Notificacao
- ScoreHistorico
- JobFalha
- AnalyticsEvent

---

## Part 5: Testing Connections

### Step 5.1: Test API Health

In your browser or terminal:

```bash
curl https://imobi-api-staging.onrender.com/health
```

**Expected Response**:
```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2026-06-02T10:30:00Z"
}
```

### Step 5.2: Check Service Logs

1. Go to API service page
2. Click **"Logs"** tab
3. Look for:
   - `"Database connection successful"`
   - `"Redis connection successful"`
   - Or any error messages

**Expected**: Green status indicators, no connection errors

### Step 5.3: Monitor Database Usage

1. Go to PostgreSQL instance page
2. Click **"Monitoring"** tab
3. Check:
   - **Connections**: Should be 1-5 for staging
   - **Database Size**: Should be < 500MB
   - **CPU**: Should be < 20%

**Expected**: Metrics show healthy usage

### Step 5.4: Monitor Redis Usage

1. Go to Redis instance page
2. Click **"Monitoring"** tab
3. Check:
   - **Memory Usage**: Should be < 50MB
   - **Connected Clients**: Should be 1-3
   - **Evicted Keys**: Should be 0

**Expected**: Metrics show healthy usage

---

## Part 6: Set Up Monitoring (Optional but Recommended)

### Step 6.1: PostgreSQL Alerts

1. Go to PostgreSQL instance
2. Click **"Monitoring"** → **"Alert Rules"**
3. Create alert:
   - **Metric**: Connections
   - **Threshold**: > 30
   - **Duration**: 5 minutes
   - **Notification**: Email

**Expected**: Alert rule created

### Step 6.2: Redis Alerts

1. Go to Redis instance
2. Click **"Monitoring"** → **"Alert Rules"**
3. Create alert:
   - **Metric**: Memory Usage
   - **Threshold**: > 75%
   - **Duration**: 5 minutes
   - **Notification**: Email

**Expected**: Alert rule created

### Step 6.3: API Health Checks

1. Go to API service
2. Click **"Settings"**
3. Scroll to **"Health Check"**
4. Configure:
   - **Path**: `/health`
   - **Interval**: 30s
   - **Timeout**: 5s

**Expected**: Health check enabled (green indicator)

---

## Part 7: Deploy Web Service (Next.js)

### Step 7.1: Create Next.js Web Service

1. Click **"New +"** → **"Web Service"**
2. Connect GitHub repository

| Field | Value |
|-------|-------|
| **Name** | `imobi-web-staging` |
| **Region** | Same as API |
| **Branch** | `staging` |
| **Runtime** | `Node` |
| **Build Command** | `pnpm install && pnpm build` |
| **Start Command** | `pnpm --filter @imbobi/web start` |

### Step 7.2: Add Environment Variables

```
NEXT_PUBLIC_API_URL=https://imobi-api-staging.onrender.com/api/v1
NEXT_PUBLIC_ENV=staging
```

### Step 7.3: Deploy

Click **"Create Web Service"** and wait for build to complete.

---

## Completion Checklist

- [ ] PostgreSQL instance created and "Available"
- [ ] Redis instance created and "Available"
- [ ] Connection strings copied and verified
- [ ] API service deployed to Render
- [ ] Environment variables set in API service
- [ ] `pnpm db:migrate` executed successfully
- [ ] All tables visible in Prisma Studio
- [ ] API health endpoint responds (`/health`)
- [ ] PostgreSQL monitoring enabled
- [ ] Redis monitoring enabled
- [ ] Alerts configured (optional)
- [ ] Web service deployed (optional)

---

## Reference: Connection Strings from Render UI

When creating services, Render shows connection strings in these locations:

**PostgreSQL**:
- Service page → **"Connections"** section
- Shows both "Internal" and "External" URLs
- Copy Internal URL if API is on Render

**Redis**:
- Service page → **"Connections"** section
- Shows "Internal Redis URL"
- Extract host, port, and password

**Web Service URLs**:
- Service page → Top section shows domain
- Example: `https://imobi-api-staging.onrender.com`

---

## Troubleshooting During Setup

| Issue | Solution |
|-------|----------|
| Database shows "Creating" for > 5 min | Check Render status page for incidents |
| Migration fails: "password invalid" | Verify DATABASE_URL in environment variables |
| API won't start | Check build logs for errors, verify all env vars set |
| Connection timeout | Ensure database/redis region matches API service |
| Out of memory error | Increase Redis/PostgreSQL instance size |

---

## Next Steps After Setup

1. **Deploy Mobile Service** (Expo)
   - Create another Web Service for mobile app
   - Set `EXPO_PUBLIC_API_URL` environment variable

2. **Configure CI/CD**
   - Connect GitHub branch to auto-deploy on push
   - Render → Service → **"Settings"** → **"Auto-deploy"**

3. **Set Up Backups**
   - PostgreSQL → **"Settings"** → **"Backups"**
   - Verify automated daily backups enabled

4. **Load Testing** (Optional)
   - Once staging is stable, test with realistic load
   - Monitor database and Redis under load

---

**Created**: 2026-06-02  
**For**: imobi Staging Deployment  
**Updated**: As of Render UI June 2026

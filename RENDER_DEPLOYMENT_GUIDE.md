# Render Deployment Guide — imobi NestJS API Backend

**Last Updated:** June 2, 2026  
**Status:** Production-Ready Guide  
**Target Environment:** Staging  

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Step-by-Step Service Creation](#step-by-step-service-creation)
3. [Environment Variables Configuration](#environment-variables-configuration)
4. [Deployment Settings](#deployment-settings)
5. [Post-Deployment Verification](#post-deployment-verification)
6. [Troubleshooting](#troubleshooting)
7. [Maintenance & Updates](#maintenance--updates)

---

## Prerequisites

Before starting the deployment, ensure you have:

- **GitHub Access**: Admin or write access to the repository `contatovinicaetano93-commits/imobi`
- **Render Account**: [https://render.com](https://render.com) (sign up if needed)
- **Database Ready**: PostgreSQL database deployed (e.g., AWS RDS, Railway, or Render Postgres)
- **Redis Ready**: Redis instance deployed (e.g., Redis Cloud, AWS ElastiCache, or Render Redis)
- **AWS Credentials**: AWS IAM user with S3 access for image storage
- **Information Handy**:
  - Database connection string (DATABASE_URL)
  - Redis connection string (REDIS_URL)
  - AWS credentials (Access Key ID & Secret Access Key)
  - AWS S3 bucket name

---

## Step-by-Step Service Creation

### Step 1: Connect GitHub Repository to Render

1. Go to [https://render.com/dashboard](https://render.com/dashboard)
2. Click **"New +"** button in the top-right corner
3. Select **"Web Service"**
4. Click **"Connect a repository"**
5. Authorize Render with GitHub (if not already done)
6. Search for and select: `contatovinicaetano93-commits/imobi`
7. Click **"Connect"**

### Step 2: Configure the Web Service

1. **Service Name:**
   - Enter: `imbobi-api-staging`
   - (This will be part of your URL: `imbobi-api-staging.onrender.com`)

2. **Branch:**
   - Select: `claude/happy-goldberg-AFQPj`

3. **Root Directory:**
   - Enter: `services/api`
   - (This tells Render where the API code lives in the monorepo)

4. **Environment:**
   - Select: **Node**
   - The Node version will auto-detect from `package.json` (requires Node >=20.0.0)

5. **Build Command:**
   ```bash
   npm install && npm run build
   ```
   **OR** (if using pnpm at root):
   ```bash
   cd ../.. && pnpm install && cd services/api && npm run build
   ```
   
   > **Note:** Use the first option if simpler. The second ensures all workspace dependencies are installed.

6. **Start Command:**
   ```bash
   npm start
   ```
   
   This runs `node dist/main.js` (as defined in `services/api/package.json`)

7. **Instance Type:**
   - Start with: **Starter** ($7/month) or **Standard** ($12/month)
   - **Recommendation:** Use **Standard** for production to ensure 1GB RAM and reliable CPU
   - API requires: ~512MB RAM (minimum), more if handling large payloads or many concurrent requests

8. **Region:**
   - Select: **us-east-1** (Ohio)
   - **Important:** Must match your database region for lowest latency

9. **Auto-Deploy:**
   - Enable: **Yes** (automatic deployment on push to branch)

---

## Environment Variables Configuration

### Important Security Note
**Environment variables (secrets) are NEVER committed to Git.** Configure them only in the Render dashboard.

### Step 3: Add Environment Variables in Render

After creating the service, follow these steps:

1. Click on your newly created service (`imbobi-api-staging`)
2. Go to the **"Environment"** tab on the left sidebar
3. Click **"Add Environment Variable"** for each variable below
4. Paste the exact values (replace placeholders with actual credentials)

---

### Required Environment Variables

#### 1. Node Configuration

| Variable | Value | Notes |
|----------|-------|-------|
| `NODE_ENV` | `production` | Enables production optimizations |
| `PORT` | `4000` | API port (Render exposes this to the web) |

#### 2. Database Configuration

| Variable | Value | Example |
|----------|-------|---------|
| `DATABASE_URL` | Your PostgreSQL connection string | `postgresql://dbuser:password@db.region.rds.amazonaws.com:5432/imbobi_staging?schema=public` |

**How to generate DATABASE_URL:**
```
postgresql://[username]:[password]@[host]:[port]/[database_name]?schema=public
```

- Get connection details from your database provider (AWS RDS, Railway, etc.)
- Make sure the user has permissions to create/migrate tables
- Include `?schema=public` at the end

#### 3. Redis Configuration

| Variable | Value | Example |
|----------|-------|---------|
| `REDIS_URL` | Your Redis connection string | `redis://:mypassword@redis.region.upstash.com:6379` |

**Format:**
```
redis://[optional-password@]host:port
```

- Or for Redis Cloud: `rediss://default:password@host:port` (note: `rediss://` for TLS)
- Get from your Redis provider dashboard (Redis Cloud, Upstash, AWS ElastiCache, etc.)

#### 4. Security Keys (Generate New for Production)

| Variable | How to Generate |
|----------|-----------------|
| `JWT_SECRET` | Run in terminal: `openssl rand -base64 32` (generates 44 chars) |
| `ENCRYPTION_KEY` | Run in terminal: `openssl rand -base64 32` |

**Important:**
- Each secret must be **at least 32 bytes** (44 base64 characters)
- Use **different values** for JWT and ENCRYPTION secrets
- Store these securely (never share via Slack, email, etc.)
- Keep backups in your password manager (1Password, LastPass, etc.)

**Example generation:**
```bash
# Run this in your terminal (macOS/Linux)
echo "JWT_SECRET: $(openssl rand -base64 32)"
echo "ENCRYPTION_KEY: $(openssl rand -base64 32)"

# Or on Windows PowerShell:
[Convert]::ToBase64String([byte[]]@((1..32 | ForEach-Object {Get-Random -Maximum 256})))
```

#### 5. AWS S3 Configuration

| Variable | Value | Notes |
|----------|-------|-------|
| `AWS_REGION` | `us-east-1` | Must match where bucket is created |
| `AWS_S3_BUCKET` | `imbobi-staging-assets` | S3 bucket name for storing work photos |
| `AWS_ACCESS_KEY_ID` | From AWS IAM | Never commit this to Git |
| `AWS_SECRET_ACCESS_KEY` | From AWS IAM | Never commit this to Git |

**How to get AWS credentials:**
1. Log in to [AWS IAM Console](https://console.aws.amazon.com/iam/)
2. Create or select a user with S3 permissions
3. Go to **"Security Credentials"** tab
4. Create **"Access Key"** -> Copy the ID and Secret Key
5. Paste into Render environment variables

#### 6. CORS Configuration

| Variable | Value |
|----------|-------|
| `CORS_ORIGIN` | `https://staging.imbobi.com,https://api.staging.imbobi.com,https://app-staging.imbobi.com` |

**Format:** Comma-separated list of allowed origins (no spaces)

**For Staging:** Include all staging domain variants:
- Web app domain
- API domain (if accessed directly)
- Mobile/app domains if applicable

**Update Later:** When you deploy the web app to Render or another host, update this with its exact URL.

#### 7. Email Configuration (Optional but Recommended)

| Variable | Value | Notes |
|----------|-------|-------|
| `SMTP_HOST` | `smtp.gmail.com` | Gmail SMTP server |
| `SMTP_PORT` | `587` | TLS port |
| `SMTP_USER` | Your Gmail address | e.g., `ops@imbobi.com` |
| `SMTP_PASS` | Gmail App Password | [Generate here](https://myaccount.google.com/apppasswords) |
| `SMTP_FROM` | `noreply@imbobi.com` | Email sender display name |

**How to get Gmail App Password:**
1. Enable 2-Step Verification on Google Account
2. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
3. Select "Mail" and "Windows/Other"
4. Google generates a 16-character password -> Copy it

#### 8. Firebase Configuration (Optional, for Push Notifications)

| Variable | Value |
|----------|-------|
| `FIREBASE_PROJECT_ID` | Your Firebase project ID |
| `FIREBASE_PRIVATE_KEY` | Private key from Firebase service account (with `\n` escaped) |
| `FIREBASE_CLIENT_EMAIL` | Service account email |

**How to get Firebase credentials:**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project -> Project Settings
3. Go to **"Service Accounts"** tab
4. Click **"Generate New Private Key"**
5. Copy JSON values into environment variables

#### 9. Sentry Error Tracking (Optional but Recommended)

| Variable | Value |
|----------|-------|
| `SENTRY_DSN` | Your Sentry project DSN |
| `RELEASE_VERSION` | Will be set by CI/CD, default: `dev-local` |

**How to get Sentry DSN:**
1. Create account at [sentry.io](https://sentry.io/)
2. Create a new NestJS project
3. Copy the DSN (format: `https://key@org.ingest.sentry.io/project`)

#### 10. EAS & Expo Configuration (For Mobile Builds)

| Variable | Value |
|----------|-------|
| `EXPO_PUBLIC_API_URL` | `https://imbobi-api-staging.onrender.com/api/v1` |
| `EAS_PROJECT_ID` | Your EAS project ID |

**Update after deployment:** Once your service URL is ready, copy the actual URL from Render and set it here.

---

## Deployment Settings

### Step 4: Final Configuration

After adding all environment variables, review these settings:

#### Auto-Deploy
- Enable if you want automatic deployment on push to `claude/happy-goldberg-AFQPj`
- First deployment takes 5-15 minutes

#### Health Check
- Render automatically pings your API for health checks
- Health endpoint: `GET /api/v1/health`
- Expected response: `200 OK { "status": "ok" }`

#### Build Environment
- If build fails, check the build logs in Render dashboard
- Common issues:
  - Missing workspace dependencies -> Ensure all pnpm packages are installed first
  - Node version mismatch -> Verify Node >=20.0.0

#### Logs
- View real-time logs: Click **"Logs"** tab in Render dashboard
- Check for startup errors or database connection issues

---

## Post-Deployment Verification

### Step 5: Verify the Deployment is Working

#### 1. Check Service Status

1. Go to your service page in Render
2. Look for status badge (should be **"Live"** with green checkmark)
3. Wait 2-3 minutes for first health check pass

#### 2. Test Health Endpoint

**Using Browser or cURL:**

```bash
curl https://imbobi-api-staging.onrender.com/api/v1/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "redis": "connected",
  "database": "connected"
}
```

**If you get `502 Bad Gateway`:**
- Wait 1-2 more minutes (still booting)
- Check logs for database connection errors
- Verify DATABASE_URL and REDIS_URL are correct

#### 3. Test CORS Headers

```bash
curl -i -X OPTIONS https://imbobi-api-staging.onrender.com/api/v1/health \
  -H "Origin: https://staging.imbobi.com" \
  -H "Access-Control-Request-Method: GET"
```

**Expected Response Headers:**
```
Access-Control-Allow-Origin: https://staging.imbobi.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH
Access-Control-Allow-Credentials: true
```

#### 4. Test Authentication Endpoint

```bash
curl -X POST https://imbobi-api-staging.onrender.com/api/v1/auth/registrar \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!",
    "nome": "Test User",
    "cpfCnpj": "12345678901234"
  }'
```

**Expected Response:** `201 Created` or validation error (means API is running)

#### 5. Check Database Connection

1. In Render dashboard, go to **"Logs"** tab
2. Search for "PostgreSQL" or "database"
3. Should see logs like: `Prisma ORM connected to database`

If database connection fails:
- Verify DATABASE_URL is correct
- Check that database user has permissions
- Ensure database is publicly accessible (or on same VPC as Render)

---

## Troubleshooting

### Common Issues and Solutions

#### Issue 1: Service Status is "Build Failed"

**Symptoms:** Red badge, "Build Failed" status

**Solutions:**
1. Click **"Deploy"** -> **"View Deploy Logs"**
2. Look for error messages (usually near the bottom)
3. Common fixes:
   - **"Cannot find module"** -> Missing workspace dependency
     ```bash
     # Ensure pnpm install runs at root first
     cd ../.. && pnpm install && cd services/api
     ```
   - **"Module not found: @imbobi/schemas"** -> Workspace resolution issue
     - Verify `package.json` has `"@imbobi/schemas": "workspace:*"`
     - Check root `package.json` includes `"packages/*"` in workspaces

#### Issue 2: Service is Live but Returns 502 Bad Gateway

**Symptoms:** Service shows "Live" but API requests fail

**Solutions:**
1. Wait 2-3 minutes (server might still be warming up)
2. Check Render logs for errors:
   - Database connection timeout -> Verify DATABASE_URL, network access
   - Redis connection error -> Verify REDIS_URL format
   - Port mismatch -> Ensure PORT=4000 in env vars
3. Test locally first:
   ```bash
   cd services/api
   npm install && npm run build
   PORT=4000 npm start
   ```

#### Issue 3: CORS Errors on Web App

**Symptoms:** Frontend gets `CORS policy: No 'Access-Control-Allow-Origin'`

**Solutions:**
1. Verify `CORS_ORIGIN` includes your frontend domain:
   ```bash
   # Should match:
   # - https://staging.imbobi.com (web app URL)
   # - https://app-staging.imbobi.com (alternate domains)
   ```
2. Update variable: Edit `CORS_ORIGIN` in Render -> redeploy
3. Check that frontend uses correct API URL:
   ```javascript
   // In web app .env:
   NEXT_PUBLIC_API_URL=https://imbobi-api-staging.onrender.com/api/v1
   ```

#### Issue 4: Database Migrations Not Running

**Symptoms:** Tables don't exist, schema error from Prisma

**Solutions:**
1. Render **does NOT** auto-run migrations
2. Manually run migrations:
   ```bash
   # Option A: Via Render shell (if enabled)
   # In Render dashboard, click "Console" tab
   npm run prisma:migrate:dev
   
   # Option B: Via local machine
   cd services/api
   DATABASE_URL="postgresql://..." npm run prisma:migrate:dev
   ```

#### Issue 5: Disk Space Running Out

**Symptoms:** Deployment fails with "No space left on device"

**Solutions:**
1. Restart the service:
   - Click **"Restart Service"** button
   - This clears temporary build files
2. Check what's consuming space:
   - `node_modules/` can be large (~2GB+)
   - Clean cache: `npm ci` instead of `npm install` for production builds

#### Issue 6: Environment Variable Not Being Read

**Symptoms:** Code uses `process.env.MY_VAR` but it's undefined

**Solutions:**
1. Verify variable exists in Render dashboard
2. Restart service after adding variables (environment changes require restart)
3. Check variable name is exact (case-sensitive):
   ```javascript
   // Correct:
   const dbUrl = process.env.DATABASE_URL;
   
   // Wrong (won't work):
   const dbUrl = process.env.database_url;
   ```

---

## Maintenance & Updates

### Deploying Code Updates

Since auto-deploy is enabled, the workflow is:

1. **Push code to branch:**
   ```bash
   git push origin claude/happy-goldberg-AFQPj
   ```

2. **Render automatically detects the push**
   - Starts a new build automatically
   - Logs appear in Render dashboard

3. **Monitor the deployment:**
   - Watch logs for errors
   - Once service turns "Live", the new code is active
   - Typical time: 5-10 minutes

### Updating Environment Variables

1. **Go to Render Dashboard**
2. **Click service -> Environment tab**
3. **Edit the variable** (click pencil icon)
4. **Click "Update"** (service auto-restarts with new values)

**Important:** Some changes require restart:
- `NODE_ENV`, database credentials, secrets
- Service auto-restarts after env var changes
- **API will be down for ~30 seconds**

### Running Database Migrations

For schema changes:

```bash
# Option 1: Use Render Console (if SSH enabled)
# In Render dashboard -> Console tab
npm run prisma:migrate:dev

# Option 2: Local deployment (safer)
cd services/api
DATABASE_URL="postgresql://..." npm run prisma:migrate:deploy
```

### Monitoring & Logs

**Daily checks:**
- Click **"Logs"** tab to view recent errors
- Look for patterns in 502s or auth failures
- Check for PostgreSQL connection warnings

**Set up alerts (optional):**
- In Render -> Service Settings -> Notifications
- Get email when deployment fails or service crashes

---

## Database Migrations

### Understanding Migrations in Staging

The imobi API uses **Prisma ORM** for database migrations.

#### What are Migrations?

Migrations are SQL scripts that define your database schema (tables, columns, relationships).

#### Do Migrations Run Automatically on Deploy?

**No** - Render does NOT automatically run migrations.

#### How to Run Migrations

**Option 1: Manual via Render Console** (Easiest)

1. In Render dashboard, go to your service
2. Click **"Console"** tab at the top
3. Run this command:
   ```bash
   npm run prisma:migrate:deploy
   ```
4. Wait for completion (should see "Migrations completed" message)

**Option 2: Via Local Machine** (More Control)

1. Get your production DATABASE_URL from Render
2. On your machine, run:
   ```bash
   cd services/api
   DATABASE_URL="postgresql://staging:password@host:5432/imbobi_staging?schema=public" \
   npm run prisma:migrate:deploy
   ```

---

## Production Checklist

Before going live to production:

- [ ] **Database**: Production database created and tested
- [ ] **Redis**: Production Redis instance ready
- [ ] **AWS S3**: Production S3 bucket created with correct region
- [ ] **Secrets**: New JWT_SECRET and ENCRYPTION_KEY generated (not reused from staging)
- [ ] **CORS**: Updated with production domain (e.g., `https://imbobi.com`)
- [ ] **Email**: Production SMTP configured (not staging Gmail)
- [ ] **Sentry**: Production Sentry project created and DSN added
- [ ] **SSL/TLS**: Render provides free HTTPS (automatic)
- [ ] **Health Check**: Verified `/api/v1/health` returns 200 OK
- [ ] **Database Migration**: Verified schema is correct with `prisma studio`
- [ ] **Load Testing**: Tested under expected traffic
- [ ] **Backups**: Database backups enabled (check database provider)
- [ ] **Monitoring**: Alerts set up for deployment failures and errors

---

## Useful Commands Reference

```bash
# Local development
cd services/api
npm install
npm run dev

# Production build locally
npm run build
PORT=4000 npm start

# Database management
npm run prisma:generate     # Regenerate Prisma client after schema changes
npm run prisma:migrate:dev  # Create new migration (dev)
npm run prisma:migrate:deploy # Apply migrations (production-safe)
npm run prisma:studio       # Open database GUI

# Validation
npm run type-check          # TypeScript type checking
npm run lint                # ESLint
npm run test                # Jest unit tests
npm run test:e2e            # End-to-end tests
```

---

## Support Resources

- **Render Docs:** https://render.com/docs
- **NestJS Docs:** https://docs.nestjs.com
- **Prisma Docs:** https://www.prisma.io/docs
- **PostgreSQL Docs:** https://www.postgresql.org/docs/current/

---

**Last Updated:** June 2, 2026
**Document Version:** 1.0

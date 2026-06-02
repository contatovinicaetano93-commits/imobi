# iMobi Render Deployment Guide

Complete reference for deploying iMobi to Render, including environment setup, security credentials, database migrations, and health checks.

## Table of Contents

1. [Generate Security Credentials](#generate-security-credentials)
2. [Environment Variables Reference](#environment-variables-reference)
3. [Pre-Deployment Checklist](#pre-deployment-checklist)
4. [Render Service Configuration](#render-service-configuration)
5. [Database Setup](#database-setup)
6. [Seed Data](#seed-data)
7. [Health Checks](#health-checks)
8. [Troubleshooting](#troubleshooting)

---

## Generate Security Credentials

Generate strong cryptographic keys before deploying to production.

### 1. Generate JWT Secret (64+ characters)

**What it does:** Creates a random base64-encoded string for signing JWT tokens. Must be at least 64 characters for production.

```bash
# Generate JWT Secret using Node.js
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

**Example output:**
```
kT8x/+vQ2mL5nP9aB3eW1zJ4mN7xY2qR5tF8uG1hI3kL6oM9sN2pQ7vT0wX5yZ8c
```

**How to save:**
1. Run the command above
2. Copy the entire output (without newlines)
3. Paste into Render environment variable `JWT_SECRET`
4. Save to 1Password or secure password manager for backup

---

### 2. Generate Encryption Key (32 bytes, base64)

**What it does:** Creates a 256-bit encryption key for AES-256-GCM encryption used to protect sensitive data (refresh tokens, internal credentials).

```bash
# Generate Encryption Key using Node.js (32 bytes = 256 bits)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Example output:**
```
D+Tq00RvRIfTL66ZbEnn7iAEryHRVyYLuCfUzY49pJM=
```

**How to save:**
1. Run the command above
2. Copy the entire output (including `=` padding)
3. Paste into Render environment variable `ENCRYPTION_KEY`
4. Save to 1Password or secure password manager for backup

---

## Environment Variables Reference

Complete table of all environment variables needed for Render deployment.

### Database Section (PostgreSQL + PostGIS)

| Variable | Source | Format | Example | Notes |
|----------|--------|--------|---------|-------|
| `DATABASE_URL` | Render PostgreSQL Add-on | `postgresql://user:pass@host:port/dbname` | `postgresql://imbobi:pwd@dpg-xxx.render.com:5432/imbobi_prod` | Include `?schema=public` if needed; PostGIS extension required |
| `NODE_ENV` | Deployment environment | `production` \| `staging` \| `development` | `production` | Always use `production` for Render |

**Getting DATABASE_URL from Render:**
1. Create PostgreSQL database in Render dashboard
2. Go to your database → Info tab
3. Copy "Internal Database URL" (includes credentials)
4. Paste as `DATABASE_URL` in API service environment

---

### Security Keys Section (Generate BEFORE deployment)

| Variable | How to Generate | Format | Example | Notes |
|----------|-----------------|--------|---------|-------|
| `JWT_SECRET` | See [Generate JWT Secret](#1-generate-jwt-secret-64-characters) | Base64 string, min 64 chars | `kT8x/+vQ2mL5nP9aB3eW1zJ4mN7xY2qR5tF8uG1hI3kL6oM9sN2pQ7vT0wX5yZ8c` | Used to sign JWT tokens; store safely |
| `JWT_EXPIRES_IN` | Manual | Duration string | `15m` | Access token expiration (15 minutes recommended) |
| `JWT_REFRESH_EXPIRES_IN` | Manual | Duration string | `7d` | Refresh token expiration (7 days recommended) |
| `ENCRYPTION_KEY` | See [Generate Encryption Key](#2-generate-encryption-key-32-bytes-base64) | Base64 string, 44 chars (32 bytes) | `D+Tq00RvRIfTL66ZbEnn7iAEryHRVyYLuCfUzY49pJM=` | AES-256-GCM encryption; includes `=` padding |

---

### Redis Cache & Message Queue

| Variable | How to Get | Format | Example | Notes |
|----------|-----------|--------|---------|-------|
| `REDIS_HOST` | Render Redis Add-on info | Hostname | `red-xxx.render.com` | Internal hostname from Render dashboard |
| `REDIS_PORT` | Render Redis Add-on info | Port number | `6379` | Default Redis port |
| `REDIS_PASSWORD` | Render Redis Add-on info | String | `randomPassword123...` | Copy from Render Redis dashboard; may be empty for development |

**Getting Redis credentials from Render:**
1. Create Redis database in Render dashboard
2. Go to your Redis instance → Info tab
3. Copy connection details (host, port, password)
4. Paste into API service environment variables

---

### API Service Configuration

| Variable | Value | Format | Example | Notes |
|----------|-------|--------|---------|-------|
| `PORT` | Application port | Integer | `4000` | Render assigns this; API listens on this port |
| `CORS_ORIGIN` | Allowed origins for requests | URL string | `https://imbobi.com.br,https://app.imbobi.com.br` | Comma-separated; use exact domain from web service |

---

### AWS S3 (Construction Evidence Photos)

| Variable | How to Get | Format | Example | Notes |
|----------|-----------|--------|---------|-------|
| `AWS_REGION` | AWS account setting | Region code | `us-east-1` or `sa-east-1` | Should match bucket region |
| `AWS_ACCESS_KEY_ID` | AWS IAM console | AWS access key | `AKIA...` | Create IAM user with S3 permissions only |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM console | Secret key | `...` | Keep secret; use IAM user credentials, not root |
| `S3_BUCKET` | S3 bucket name | Bucket name | `imbobi-evidencias-prod` | Must exist; create in same region as `AWS_REGION` |

**Setting up AWS S3 credentials:**
1. Go to AWS IAM console
2. Create new user with S3 permissions only:
   - `s3:PutObject` (upload photos)
   - `s3:GetObject` (retrieve photos)
   - `s3:ListBucket` (list files)
3. Generate access key and secret
4. Copy both into environment variables
5. Store secret key in 1Password backup

---

### Web Service (Next.js) Variables

| Variable | Where to Set | Format | Example | Notes |
|----------|--------------|--------|---------|-------|
| `NEXT_PUBLIC_API_URL` | Web service env vars | Full API URL | `https://api.imbobi.com.br` | Must match deployed API URL; used by browser |

---

### Mobile Service (Expo) Variables

| Variable | Where to Set | Format | Example | Notes |
|----------|--------------|--------|---------|-------|
| `EXPO_PUBLIC_API_URL` | Mobile service env vars | Full API URL | `https://api.imbobi.com.br` | Must match deployed API URL |
| `EAS_PROJECT_ID` | Expo project setting | Project ID | `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` | From Expo dashboard; optional for Render |

---

### Email Provider Configuration

Choose ONE email provider below:

#### Option 1: SendGrid (Recommended)

| Variable | How to Get | Format | Example | Notes |
|----------|-----------|--------|---------|-------|
| `EMAIL_PROVIDER` | Manual | `sendgrid` | `sendgrid` | Required to activate SendGrid |
| `SENDGRID_API_KEY` | SendGrid dashboard | API key | `SG...` | Get from Mail Settings → API Keys |

```bash
# SendGrid configuration
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG.xxxxxxxxxxxxx...
```

#### Option 2: AWS SES

| Variable | Value | Format | Example | Notes |
|----------|-------|--------|---------|-------|
| `EMAIL_PROVIDER` | Manual | `ses` | `ses` | Required to activate SES |
| AWS credentials | See AWS S3 section above | Already configured | Use same AWS credentials | Must have SES permissions |

```bash
# AWS SES configuration (uses AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY above)
EMAIL_PROVIDER=ses
# SES endpoint auto-configured based on AWS_REGION
```

#### Option 3: SMTP Generic

| Variable | How to Get | Format | Example | Notes |
|----------|-----------|--------|---------|-------|
| `EMAIL_PROVIDER` | Manual | `smtp` | `smtp` | Required to activate SMTP |
| `SMTP_HOST` | Email provider | Hostname | `smtp.sendgrid.net` | SMTP server hostname |
| `SMTP_PORT` | Email provider | Port number | `587` | Usually 587 (TLS) or 465 (SSL) |
| `SMTP_USER` | Email provider | Username | `apikey` (for SendGrid) | Depends on provider |
| `SMTP_PASS` | Email provider | Password | `SG...` | Application-specific password |
| `SMTP_FROM` | Your choice | Email address | `noreply@imbobi.com.br` | Sender email address |

---

### Firebase Cloud Messaging (Push Notifications)

| Variable | How to Get | Format | Example | Notes |
|----------|-----------|--------|---------|-------|
| `FIREBASE_PROJECT_ID` | Firebase console | Project ID | `imbobi-prod` | Found in Project Settings |
| `FIREBASE_PRIVATE_KEY` | Firebase console | Private key | `-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----` | Download JSON, paste `private_key` field value |
| `FIREBASE_CLIENT_EMAIL` | Firebase console | Email | `firebase-admin@imbobi-prod.iam.gserviceaccount.com` | From downloaded service account JSON |

**Important:** Include newlines literally in the string (e.g., `\n` not actual line breaks). Use quotes when setting.

---

### KYC/Identity Validation (Optional)

| Variable | How to Get | Format | Example | Notes |
|----------|-----------|--------|---------|-------|
| `UNICO_API_KEY` | Unico dashboard | API key | `...` | Brazilian identity validation; optional |
| `SERPRO_TOKEN` | SERPRO portal | Token | `...` | Government digital certificate queries; optional |

---

## Pre-Deployment Checklist

Before deploying to Render, verify all credentials and configurations:

```bash
# 1. Check all required environment variables are set
# Open Render dashboard and verify:
# ✓ DATABASE_URL is from PostgreSQL Add-on
# ✓ REDIS_HOST, REDIS_PORT, REDIS_PASSWORD are from Redis Add-on
# ✓ JWT_SECRET generated and set (min 64 chars)
# ✓ ENCRYPTION_KEY generated and set (base64, 44 chars)
# ✓ AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY set
# ✓ S3_BUCKET exists in AWS and is accessible
# ✓ EMAIL_PROVIDER set (sendgrid, ses, or smtp)
# ✓ NODE_ENV=production
# ✓ PORT=4000 (for API)
# ✓ CORS_ORIGIN matches web service URL

# 2. Test database connection locally before deploying
DATABASE_URL="postgresql://user:pass@host/db" pnpm db:generate
DATABASE_URL="postgresql://user:pass@host/db" pnpm db:migrate

# 3. Verify Render services are created
# - PostgreSQL database
# - Redis instance
# - API service (using Dockerfile)
# - Web service (using Dockerfile)
```

---

## Render Service Configuration

### API Service Setup

**Service Details:**
- **Runtime:** Node
- **Region:** Choose closest to your users
- **Build Command:** `pnpm install && pnpm build`
- **Start Command:** `node dist/services/api/src/main.js`
- **Port:** 4000

**Environment Variables (in Render dashboard):**

Copy and paste each variable:

```
PORT=4000
NODE_ENV=production
DATABASE_URL=[from PostgreSQL Add-on]
REDIS_HOST=[from Redis Add-on]
REDIS_PORT=6379
REDIS_PASSWORD=[from Redis Add-on]
JWT_SECRET=[generated above]
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
ENCRYPTION_KEY=[generated above]
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=[from AWS IAM]
AWS_SECRET_ACCESS_KEY=[from AWS IAM]
S3_BUCKET=imbobi-evidencias-prod
CORS_ORIGIN=https://imbobi.com.br
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=[from SendGrid]
FIREBASE_PROJECT_ID=[from Firebase]
FIREBASE_PRIVATE_KEY=[from Firebase service account JSON]
FIREBASE_CLIENT_EMAIL=[from Firebase]
```

**Health Check:**
- **Path:** `/api/v1/health`
- **Method:** GET
- **Expected:** HTTP 200 with `{"status":"ok"}`

---

### Web Service Setup

**Service Details:**
- **Runtime:** Node
- **Region:** Same as API
- **Build Command:** `pnpm install && pnpm build`
- **Start Command:** `pnpm --filter web start`
- **Port:** 3000

**Environment Variables:**

```
NEXT_PUBLIC_API_URL=[Render API service URL, e.g., https://api-xxx.render.com]
NODE_ENV=production
```

---

## Database Setup

### 1. Create PostgreSQL Database in Render

```bash
# In Render dashboard:
# 1. Click "New +" → PostgreSQL
# 2. Name: "imbobi-db-prod"
# 3. Database: "imbobi_prod"
# 4. User: "imbobi"
# 5. Click "Create Database"
# 6. Copy "Internal Database URL" from Info tab
```

### 2. Run Migrations After API Deployment

**Wait for API service to be live first**, then run migrations:

```bash
# Replace DATABASE_URL with value from Render PostgreSQL dashboard
DATABASE_URL="postgresql://imbobi:password@dpg-xxx.render.com:5432/imbobi_prod?schema=public" \
pnpm db:migrate
```

**Expected output:**
```
Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "imbobi_prod"

0 migrations found, and 0 migrations applied.

✓ Already in sync, no migrations to apply
```

This is normal if migrations were already applied. You should see all migrations listed.

### 3. Verify Database Connection

```bash
# Test PostgreSQL connection
DATABASE_URL="postgresql://imbobi:password@dpg-xxx.render.com:5432/imbobi_prod?schema=public" \
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.\$queryRaw\`SELECT 1\`.then(() => {
  console.log('✓ Database connected successfully');
  process.exit(0);
}).catch(e => {
  console.error('✗ Database connection failed:', e.message);
  process.exit(1);
});
"
```

### 4. Enable PostGIS Extension (Required for Location Validation)

```bash
# Connect to PostgreSQL using psql or Render dashboard
# SQL command:
CREATE EXTENSION IF NOT EXISTS postgis;

# Verify installation:
SELECT postgis_version();
```

If using Render dashboard's query editor:
1. Go to PostgreSQL dashboard
2. Click "Connections" tab
3. Open Database query editor
4. Paste:
   ```sql
   CREATE EXTENSION IF NOT EXISTS postgis;
   SELECT postgis_version();
   ```
5. Execute

---

## Seed Data

### When to Seed

- **Development:** Always seed after database creation
- **Staging:** Seed for testing
- **Production:** Seed only with anonymized test data

### Seed Command

After API is deployed and migrations complete:

```bash
# Option 1: Using ts-node (if TypeScript tools available)
DATABASE_URL="postgresql://imbobi:password@dpg-xxx.render.com:5432/imbobi_prod?schema=public" \
pnpm --filter @imbobi/api seed

# Option 2: Using compiled JavaScript (production-safe)
DATABASE_URL="postgresql://imbobi:password@dpg-xxx.render.com:5432/imbobi_prod?schema=public" \
node -r ts-node/register -r tsconfig-paths/register \
  services/api/src/seeds/seed.ts
```

### What Gets Loaded

The seed script creates:

- **5 test users** (DEVELOPER, BUILDER, ADMIN)
  - All with password: `TestPassword123`
  - KYC pre-verified for some

- **3 credit records** (loans ranging from R$10,000 to R$50,000)
  - Various statuses (APROVADO, ATIVO, etc.)
  - Includes interest calculations

- **3 construction projects (obras)** with GPS coordinates in São Paulo
  - Each with 9 construction stages (etapas)
  - Completion percentages and cost allocation

- **Evidence photos** from 2 obras
  - 5 total photo evidence entries
  - GPS coordinates and validation data

- **KYC documents** for all users
  - Some approved, some pending

- **Credit score history** for all users

- **Sample notifications** (5 per test user)
  - Credit approval, KYC verification, stage approval

---

## Health Checks

### 1. API Health Endpoint

```bash
# Test if API is responding
curl -i https://api-xxx.render.com/api/v1/health

# Expected response (HTTP 200):
HTTP/2 200 OK
Content-Type: application/json

{
  "status": "ok",
  "database": "connected",
  "redis": "connected",
  "timestamp": "2026-06-02T10:30:00.000Z"
}
```

### 2. Web Service Health

```bash
# Test if Next.js is serving pages
curl -i https://imbobi-web-xxx.render.com/

# Expected response (HTTP 200):
# Should contain HTML for landing page
```

### 3. Database Connection

```bash
# From local terminal with psql installed:
psql "postgresql://imbobi:password@dpg-xxx.render.com:5432/imbobi_prod" \
  -c "SELECT version();"

# Expected: PostgreSQL version info
```

### 4. Redis Connection

```bash
# From local terminal with redis-cli installed:
redis-cli -h red-xxx.render.com -p 6379 -a password PING

# Expected: PONG
```

### 5. AWS S3 Connection

```bash
# Test S3 access (requires AWS CLI)
aws s3 ls s3://imbobi-evidencias-prod \
  --region us-east-1 \
  --profile default

# Expected: Lists files in bucket (or empty if new)
```

### 6. Email Service

```bash
# Test SendGrid API key (example with curl)
curl -X GET "https://api.sendgrid.com/v3/user/account" \
  -H "Authorization: Bearer SG.xxxxx"

# Expected: HTTP 200 with account info
```

---

## Troubleshooting

### Common Issues and Solutions

#### Issue: "Database connection failed"

**Symptoms:** API won't start, error in logs mentions database

**Fix:**
1. Verify `DATABASE_URL` is correct in Render environment variables
2. Check that PostgreSQL service is running in Render dashboard
3. Ensure database name, user, and password are correct
4. Test connection locally:
   ```bash
   psql "postgresql://imbobi:password@host:5432/imbobi_prod"
   ```

#### Issue: "Redis connection refused"

**Symptoms:** Caching errors, BullMQ job queue fails

**Fix:**
1. Verify Redis service is running in Render dashboard
2. Check `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` are set correctly
3. Test with redis-cli:
   ```bash
   redis-cli -h [host] -p [port] -a [password] PING
   ```
4. Ensure API and Redis are on same internal network

#### Issue: "S3 access denied"

**Symptoms:** Photo uploads fail with 403 error

**Fix:**
1. Verify AWS credentials in environment variables
2. Check IAM user has S3 permissions:
   - `s3:PutObject`
   - `s3:GetObject`
   - `s3:ListBucket`
3. Verify bucket exists and is in correct region
4. Test credentials locally:
   ```bash
   aws s3 ls s3://imbobi-evidencias-prod --region us-east-1
   ```

#### Issue: "CORS error when calling API from web"

**Symptoms:** Browser console shows CORS blocked error

**Fix:**
1. Check `CORS_ORIGIN` in API environment variables
2. Must be exact domain of web service:
   ```bash
   # Correct
   CORS_ORIGIN=https://imbobi-web-xxx.render.com
   
   # Wrong (missing https or trailing slash)
   CORS_ORIGIN=http://imbobi-web-xxx.render.com/
   ```
3. Redeploy API after changing
4. Verify in browser DevTools → Network → Response headers should include `Access-Control-Allow-Origin`

#### Issue: "Migrations failed"

**Symptoms:** Error when running `pnpm db:migrate`

**Fix:**
1. Ensure API service is deployed first
2. Verify `DATABASE_URL` is exported:
   ```bash
   export DATABASE_URL="postgresql://..."
   pnpm db:migrate
   ```
3. Check Prisma schema is valid:
   ```bash
   pnpm prisma:validate
   ```
4. If stuck, reset database (loses data):
   ```bash
   DATABASE_URL="..." prisma migrate reset --force
   ```

#### Issue: "JWT token invalid/expired"

**Symptoms:** Mobile/web auth fails, 401 Unauthorized errors

**Fix:**
1. Verify `JWT_SECRET` is set and consistent across deployments
2. Check token expiry times are reasonable:
   - `JWT_EXPIRES_IN=15m` (access token)
   - `JWT_REFRESH_EXPIRES_IN=7d` (refresh token)
3. Ensure system clocks are synchronized (NTP)
4. Check Sentry error tracking for details

#### Issue: "Encryption key mismatch"

**Symptoms:** Can't decrypt stored tokens, "decipher fail" errors

**Fix:**
1. Verify `ENCRYPTION_KEY` matches what was used to encrypt data
2. Key must be base64-encoded 32 bytes (44 characters including `=`)
3. **Important:** Don't change encryption key in production without migration script
4. Test key format:
   ```bash
   node -e "console.log(Buffer.from('YOUR_KEY', 'base64').length)"
   # Should output: 32
   ```

#### Issue: "Firebase push notifications not working"

**Symptoms:** Mobile doesn't receive push notifications

**Fix:**
1. Verify service account JSON downloaded from Firebase Console
2. Check `FIREBASE_PRIVATE_KEY` includes newlines correctly:
   ```bash
   # Should contain \n (not literal newlines):
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
   ```
3. Verify `FIREBASE_PROJECT_ID` and `FIREBASE_CLIENT_EMAIL`
4. Test in Firebase Console → Cloud Messaging → Send test message

#### Issue: "Out of memory" errors

**Symptoms:** Service crashes with OOM, appears in logs

**Fix:**
1. Increase Node.js memory limit in Render:
   - Go to service settings
   - Set `NODE_OPTIONS=--max-old-space-size=1024`
2. Optimize database queries:
   - Check slow query logs in Render PostgreSQL dashboard
   - Add indexes if needed
3. Monitor Redis memory usage
4. Check for memory leaks in application code

#### Issue: "Deployment takes too long"

**Symptoms:** Build step times out (>30 minutes)

**Fix:**
1. Rebuild with `--frozen-lockfile` to skip install (in Dockerfile)
2. Check for missing `.dockerignore`:
   ```
   node_modules
   .git
   dist
   build
   .next
   ```
3. Clear Render build cache:
   - In service settings → click "Clear build cache"
4. Split monorepo packages if too large

---

## Additional Resources

- **Render Docs:** https://render.com/docs
- **Prisma Migration Guide:** https://www.prisma.io/docs/orm/prisma-migrate/understanding-prisma-migrate
- **PostGIS Documentation:** https://postgis.net/documentation/
- **NestJS Deployment:** https://docs.nestjs.com/deployment
- **Next.js Deployment:** https://nextjs.org/docs/deployment

---

**Last Updated:** 2026-06-02
**Stack:** Turborepo + Next.js 14 + NestJS + PostgreSQL + Redis

# Render Deployment Guide for imobi NestJS API

## Overview

This guide walks you through deploying the imobi NestJS backend API to Render. The API is built with NestJS, Fastify, PostgreSQL, and Redis, and serves as the backend for both web and mobile applications.

**Deployment Target:**
- Repository: `contatovinicaetano93-commits/imobi`
- Branch: `claude/happy-goldberg-AFQPj`
- Service Path: `services/api`

---

## Prerequisites

Before starting deployment, ensure you have:

1. **Render Account**: Create a free account at [render.com](https://render.com)
2. **GitHub Connection**: Your Render account must be connected to your GitHub account
3. **Database Ready**: PostgreSQL database instance (AWS RDS, Railway, or similar)
4. **Redis Ready**: Redis instance (AWS ElastiCache, Railway, or similar)
5. **AWS Credentials**: For S3 bucket access (if using S3 for image storage)

---

## Step 1: Create a New Web Service on Render

### 1.1 Access Render Dashboard
1. Log in to [render.com](https://render.com)
2. Click **"New +"** button in the top-right corner
3. Select **"Web Service"**

### 1.2 Connect GitHub Repository
1. In the deployment form, select **"GitHub"** as the source
2. Select your GitHub organization: `contatovinicaetano93-commits`
3. Search for and select the repository: `imobi`
4. Click **"Connect"** to authorize

### 1.3 Configure Service Settings

| Setting | Value | Notes |
|---------|-------|-------|
| **Service Name** | `imbobi-api-staging` | Use a descriptive name. Example: `imbobi-api-prod` for production |
| **Environment** | `Node` | Render will auto-detect Node.js |
| **Region** | `US East (N. Virginia)` | Match your database region for lower latency |
| **Branch** | `claude/happy-goldberg-AFQPj` | The specific branch to deploy |
| **Root Directory** | `services/api` | Important: Monorepo root for this service |

### 1.4 Configure Build and Start Commands

**Build Command:**
```bash
cd services/api && npm install && npm run build
```

Alternative (if Render supports pnpm):
```bash
pnpm --filter @imbobi/api install && pnpm --filter @imbobi/api build
```

**Start Command:**
```bash
cd services/api && npm start
```

Alternative (using pnpm):
```bash
pnpm --filter @imbobi/api start
```

**Advanced Settings (Optional):**
- **Node Version**: 20 (or latest stable)
- **Build Timeout**: 30 minutes (default is usually sufficient)

### 1.5 Instance Type
- **Plan**: Starter ($7/month) for staging, Standard ($25/month+) for production
- The API will auto-scale based on traffic

---

## Step 2: Configure Environment Variables

**CRITICAL**: Never commit secrets to git. All values below must be entered in the Render dashboard UI.

### 2.1 Access Environment Variables
1. In the Render dashboard, navigate to your service
2. Click the **"Environment"** tab (next to "Logs")
3. You'll see the "Environment Variables" section

### 2.2 Add Required Environment Variables

Copy and paste each variable below into the Render dashboard. Replace placeholder values with your actual credentials.

#### Core Application Settings
```
NODE_ENV=production
PORT=4000
RELEASE_VERSION=1.0.0
```

#### Database Configuration
```
DATABASE_URL=postgresql://username:password@your-database-host:5432/imobi_staging?schema=public&sslmode=require
```

**Generate DATABASE_URL:**
- Host: Your RDS or PostgreSQL provider's host
- Port: Usually `5432`
- Username/Password: Your database credentials
- Database: `imobi_staging` (for staging) or `imobi_prod` (for production)
- Add `&sslmode=require` for secure connections

#### Redis Configuration
```
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
```

**Or use REDIS_URL if your provider supplies it:**
```
REDIS_URL=redis://:password@your-redis-host:6379
```

#### JWT & Encryption Keys

**Generate JWT_SECRET (must be 64+ characters):**
```bash
openssl rand -base64 32
```
Output example: `A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8S9t0U1v2W3x4Y5z6A7b8C9d0E1f2`

```
JWT_SECRET=your-64-character-minimum-generated-key-here
```

**Generate ENCRYPTION_KEY (32 bytes base64):**
```bash
openssl rand -base64 32
```

```
ENCRYPTION_KEY=your-32-byte-base64-encoded-key-here
```

#### AWS S3 Configuration
```
AWS_REGION=us-east-1
AWS_S3_BUCKET=imobi-staging-assets
AWS_ACCESS_KEY_ID=your-iam-access-key-id
AWS_SECRET_ACCESS_KEY=your-iam-secret-access-key
```

**To get AWS credentials:**
1. Go to AWS IAM console
2. Create a new user with S3 access policy
3. Generate access key and secret key
4. Copy them to the environment variables above

#### CORS Configuration
```
CORS_ORIGIN=https://staging.imbobi.com,https://app-staging.imbobi.com,http://localhost:3000
```

**For multiple origins**, separate them with commas (no spaces around commas, but spaces at the end are trimmed).

#### Email Service (Optional)
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-specific-password
SMTP_FROM=noreply@imbobi.com
```

#### Firebase (Optional, for push notifications)
```
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase@your-project.iam.gserviceaccount.com
```

#### Sentry Error Tracking (Optional)
```
SENTRY_DSN=https://your-key@o123.ingest.sentry.io/456789
```

### 2.3 Save Environment Variables
1. After adding all variables, click **"Save"**
2. Render will automatically restart the service with the new environment

---

## Step 3: Trigger Initial Deployment

### 3.1 Manual Deployment
1. In the Render dashboard, click the **"Deploy"** button
2. Select **"Latest Commit"** from the dropdown
3. Render will start building and deploying

### 3.2 Monitor the Build
1. Click on the **"Logs"** tab to watch the build progress
2. Look for messages like:
   - `Building NestJS application...`
   - `npm install` completing
   - `npm run build` succeeding
   - `Starting service on port 4000`

### 3.3 Deployment Complete
When you see:
```
imbobi API running on port 4000
```

The deployment is successful. Your API is now live!

---

## Step 4: Post-Deployment Verification

### 4.1 Find Your API URL
1. In the Render dashboard, at the top of the service page, you'll see your service URL
2. Default format: `https://imbobi-api-staging.onrender.com`
3. **Save this URL** - you'll need it for your web app configuration

### 4.2 Test Health Endpoint
```bash
curl https://imbobi-api-staging.onrender.com/api/v1/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-06-02T10:30:00Z"
}
```

### 4.3 Verify CORS Headers
```bash
curl -H "Origin: https://staging.imbobi.com" \
     -H "Access-Control-Request-Method: POST" \
     -i https://imbobi-api-staging.onrender.com/api/v1/health
```

Look for this header in the response:
```
Access-Control-Allow-Origin: https://staging.imbobi.com
Access-Control-Allow-Credentials: true
```

### 4.4 Test Authentication Endpoint
```bash
curl -X POST https://imbobi-api-staging.onrender.com/api/v1/auth/registrar \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!",
    "nome": "Test User"
  }'
```

Expected response (201 Created or 400 with validation errors, NOT 500):
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "test@example.com",
    "nome": "Test User"
  }
}
```

### 4.5 Check Logs for Errors
1. Go to the **"Logs"** tab
2. Search for any `ERROR` or `EXCEPTION` messages
3. Common issues:
   - Database connection errors → Check `DATABASE_URL`
   - Redis connection errors → Check `REDIS_HOST` and `REDIS_PASSWORD`
   - JWT secret missing → Check `JWT_SECRET` is set

---

## Step 5: Database Migrations

### Option A: Automatic Migrations (Recommended)
Add this to your build script in Render:
```bash
cd services/api && npm install && npm run build && npx prisma migrate deploy --schema prisma/schema.prisma
```

This runs migrations automatically on every deploy.

### Option B: Manual Migrations
After deployment, run migrations manually:

**Using Render CLI:**
```bash
render run "cd services/api && npx prisma migrate deploy --schema prisma/schema.prisma"
```

**Or manually in your local environment with production credentials:**
```bash
# Set production database URL
export DATABASE_URL="your-production-database-url"

# Run migrations
pnpm db:migrate
```

**Verify migrations ran successfully:**
1. Check Render logs for: `✓ Successfully applied X migrations`
2. Query the database to confirm tables exist

---

## Step 6: Configure Web App to Use This API

### 6.1 Update Web App Environment Variables
In your Next.js app (`apps/web`), add:

```env
NEXT_PUBLIC_API_URL=https://imbobi-api-staging.onrender.com/api/v1
```

### 6.2 Update Mobile App Configuration
In your Expo app (`apps/mobile`), add:

```env
EXPO_PUBLIC_API_URL=https://imbobi-api-staging.onrender.com/api/v1
```

### 6.3 Redeploy Web and Mobile
After updating these environment variables, redeploy your web and mobile apps so they use the new API URL.

---

## Step 7: Enable Auto-Deployment (Optional)

### 7.1 Set Up GitHub Integration
1. In Render dashboard, go to **"Settings"** → **"GitHub"**
2. Enable **"Auto-Deploy"** for the branch `claude/happy-goldberg-AFQPj`
3. Every push to this branch will automatically trigger a deployment

### 7.2 Configure Deploy Hooks (Optional)
1. In **"Settings"** → **"Deploy Hooks"**
2. Copy the webhook URL
3. Add it to your CI/CD pipeline (GitHub Actions, etc.)

---

## Troubleshooting

### Build Fails: "Cannot find module @imbobi/schemas"

**Issue**: Monorepo workspace resolution failed

**Solution**:
1. Ensure `Root Directory` is set to `services/api`
2. Update build command to include workspace setup:
```bash
pnpm install --recursive && pnpm --filter @imbobi/api build
```

### Runtime Error: "DATABASE_URL not set"

**Issue**: Environment variables weren't saved correctly

**Solution**:
1. Go to **"Environment"** tab
2. Verify `DATABASE_URL` is visible in the list
3. Click **"Save"** again
4. Restart the service: **"Settings"** → **"Restart Service"**

### API Returns 502 Bad Gateway

**Issue**: Service crashed or is failing to start

**Solution**:
1. Check **"Logs"** tab for error messages
2. Common causes:
   - Redis connection failed → Verify `REDIS_URL` or `REDIS_HOST`/`REDIS_PASSWORD`
   - Port 4000 not listening → Check `PORT=4000` is set
   - Node version incompatibility → Ensure Node 20+

### CORS Errors in Browser

**Issue**: API calls blocked with CORS error

**Solution**:
1. Verify web app origin is in `CORS_ORIGIN` environment variable
2. Example: If web app is at `https://staging.imbobi.com`, add it to:
```
CORS_ORIGIN=https://staging.imbobi.com,https://app.imbobi.com
```
3. Restart service after updating

### Database Connection Timeout

**Issue**: `connect ETIMEDOUT` errors in logs

**Solution**:
1. Verify `DATABASE_URL` format is correct
2. Ensure database accepts connections from Render IP range
3. For AWS RDS: Check security group allows port 5432 from Render
4. Add `sslmode=require` to DATABASE_URL for secure connections

---

## Security Best Practices

1. **Never commit secrets to git**
   - Use Render's environment variable UI
   - Use `.env.example` for reference only

2. **Rotate secrets regularly**
   - JWT_SECRET every 3-6 months
   - AWS keys when team changes
   - Database password on deployment

3. **Use HTTPS only**
   - Render provides free SSL certificates
   - Ensure `CORS_ORIGIN` uses `https://`

4. **Database security**
   - Restrict database IP whitelist to Render service
   - Use strong passwords (20+ characters)
   - Enable database encryption at rest

5. **AWS credentials**
   - Use IAM user with minimal S3 permissions
   - Never use root AWS account credentials
   - Rotate keys quarterly

---

## Monitoring and Logging

### View Logs
1. Click **"Logs"** tab in Render dashboard
2. Filter by:
   - `ERROR` - Application errors
   - `WARN` - Warnings and issues
   - `INFO` - General information

### Set Up Alerts (Paid Plan)
1. Go to **"Settings"** → **"Notifications"**
2. Enable email alerts for deployment failures
3. Configure custom alerts for high error rates

### Sentry Integration (Recommended)
Already configured in the API! Check your `SENTRY_DSN` in environment variables.

---

## Production Deployment Checklist

Before deploying to production, verify:

- [ ] Database backups enabled
- [ ] Redis persistence enabled
- [ ] All environment variables configured (no defaults in code)
- [ ] CORS_ORIGIN includes all production domains
- [ ] JWT_SECRET is 64+ characters, randomly generated
- [ ] AWS credentials are from a dedicated IAM user
- [ ] Database migrations have been tested
- [ ] Health endpoint responds correctly
- [ ] API tests pass
- [ ] Logs show no errors or warnings
- [ ] Sentry is configured and receiving events
- [ ] Web and mobile apps point to production API URL
- [ ] Database has sufficient storage and connections for expected load

---

## Next Steps

1. **Deploy this API service** (Steps 1-5)
2. **Update web app** to use this API URL (Step 6)
3. **Update mobile app** to use this API URL (Step 6)
4. **Deploy web and mobile** to staging/production
5. **Test end-to-end** authentication and core flows
6. **Monitor logs** for 24-48 hours after deployment
7. **Collect feedback** from team and users

---

## Support & Documentation

- **Render Docs**: https://render.com/docs
- **NestJS Docs**: https://docs.nestjs.com
- **Fastify Docs**: https://www.fastify.io
- **Prisma Docs**: https://www.prisma.io/docs
- **Project Repo**: https://github.com/contatovinicaetano93-commits/imobi

---

## Deployment Handiwork Summary

**Service URL (after deployment):** 
```
https://imbobi-api-staging.onrender.com
```

**API Prefix:**
```
/api/v1
```

**Key Endpoints (for testing):**
- Health: `GET /api/v1/health`
- Register: `POST /api/v1/auth/registrar`
- Swagger Docs: `GET /docs` (development only, disabled in production)

**Environment Variables Used:**
- Total: 20+ variables
- Secrets: JWT_SECRET, ENCRYPTION_KEY, AWS keys, database password
- Public: API URLs, CORS origins, region settings

---

**Last Updated:** June 2, 2026  
**Guide Version:** 1.0  
**Project:** imobi (Fintech de crédito para construção civil)

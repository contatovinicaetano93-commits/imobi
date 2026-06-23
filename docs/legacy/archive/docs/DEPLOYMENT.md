# Deployment Guide — imbobi

This document covers deploying the imbobi platform to Render and Vercel, including the NestJS API, PostgreSQL database with PostGIS, and Redis cache.

## Overview

The deployment architecture consists of:
- **API Service**: NestJS/Fastify application (services/api) → Render
- **Database**: PostgreSQL 15 with PostGIS extension → Render
- **Cache**: Redis for BullMQ job queues → Upstash
- **Web Frontend**: Next.js application (apps/web) → Vercel
- **Storage**: AWS S3 for evidence photos

## Infrastructure Overview

| Component | Service | Environment | Status |
|-----------|---------|-------------|--------|
| Web App | Vercel | Staging + Production | ✓ Complete |
| API | Render | Staging + Production | ✓ Complete |
| Database (PostgreSQL 15) | Render Postgres | Staging + Production | ✓ Complete |
| Cache/Queue (Redis) | Upstash | Staging + Production | ✓ Complete |
| Object Storage | AWS S3 / Cloudflare R2 | Staging + Production | - |

---

## 1. PostgreSQL Database Setup (Render)

### Create PostgreSQL Instance

1. Go to https://dashboard.render.com/
2. Click **"New +"** → Select **"PostgreSQL"**
3. Configure the database:
   - **Name**: `alagami-postgres-staging`
   - **PostgreSQL Version**: `15` (includes PostGIS support)
   - **Region**: São Paulo (`America/Sao_Paulo`) or closest available
   - **Pricing Plan**: Standard or choose based on needs
4. Click **"Create Database"**
5. Wait for provisioning (5-10 minutes)

### Enable PostGIS Extension

Once the database is provisioned:

1. Copy the **External Database URL** from Render dashboard
2. Connect via psql:
   ```bash
   psql "postgresql://user:password@hostname.render.com:5432/dbname"
   ```
3. Enable PostGIS extensions:
   ```sql
   CREATE EXTENSION IF NOT EXISTS postgis;
   CREATE EXTENSION IF NOT EXISTS postgis_topology;
   SELECT postgis_version();
   ```
4. Verify installation:
   ```sql
   \dx postgis
   ```

### Database Connection URLs

- **Internal URL** (Render-to-Render): Use for API service within Render
- **External URL** (Local/External): Use from local machine or external services

Example URL format:
```
postgresql://user:password@hostname.render.com:5432/database_name
```

---

## 2. NestJS API Service Setup (Render)

### Create Web Service

1. Go to https://dashboard.render.com/
2. Click **"New +"** → Select **"Web Service"**
3. Click **"Connect Repository"**
   - Search: `contatovinicaetano93-commits/alagami-site`
   - Click **"Connect"**

### Configure Service Settings

**Basic Configuration:**
- **Name**: `alagami-api-staging`
- **Root Directory**: `services/api`
- **Runtime**: Node
- **Build Command**:
  ```bash
  pnpm install && pnpm db:generate && pnpm db:migrate && pnpm build
  ```
- **Start Command**:
  ```bash
  node dist/main.js
  ```

### Add Environment Variables

In Render Dashboard, add the following environment variables:

```bash
# Database (from PostgreSQL setup)
DATABASE_URL=postgresql://user:password@hostname.render.com:5432/dbname

# Environment
NODE_ENV=production
PORT=4000
CORS_ORIGIN=https://alagami-web-staging.onrender.com

# JWT Authentication
JWT_SECRET=<generate-64+-char-random-string>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Redis Cache (from Upstash or Render Redis)
REDIS_URL=redis://default:password@hostname:port

# AWS S3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<your-key>
AWS_SECRET_ACCESS_KEY=<your-secret>
S3_BUCKET=imbobi-evidencias-staging

# Email Configuration
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=<your-sendgrid-key>
SMTP_FROM=noreply-staging@imbobi.com
APP_URL=https://alagami-web-staging.onrender.com

# External Integrations
UNICO_API_KEY=<kyc-api-key>
SERPRO_TOKEN=<serpro-token>

# Firebase (Push Notifications)
FIREBASE_PROJECT_ID=<project-id>
FIREBASE_PRIVATE_KEY=<private-key>
FIREBASE_CLIENT_EMAIL=<service-account-email>
```

### Deployment Settings

- **Region**: São Paulo (Brazil) or US East (depends on your preference)
- **Auto-Deploy**: Enable (deploy on every push)
- **Health Check Path**: `/health`

### Generate JWT Secret

Create a strong 64+ character secret:

```bash
# Option 1: OpenSSL
openssl rand -base64 48

# Option 2: Node.js
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

---

## 3. Run Migrations After Deployment

### Option A: Using Render Shell

1. Go to API service on Render dashboard
2. Click **"Shell"** tab
3. Run:
   ```bash
   pnpm db:migrate
   ```

### Option B: One-Off Job

1. In Render API service, go to **"One-Off Jobs"**
2. Create job with command: `pnpm db:migrate`
3. Schedule after initial deployment

### Seed Data (Optional)

If seed script is available:
```bash
pnpm seed
```

---

## 4. Redis Cache Setup

### Using Upstash (Recommended for Staging)

1. Go to https://console.upstash.com/
2. Sign up with email (free tier available)
3. Create Database:
   - **Name**: `alagami-redis-staging`
   - **Region**: São Paulo
   - **Database Type**: Redis
   - **Tier**: FREE
4. Copy connection string
5. Add to API environment variables:
   ```
   REDIS_URL=redis://default:password@hostname:port
   ```

### Using Render Redis

1. From Render dashboard, click **"New +"** → **"Redis"**
2. Configure and connect to API service
3. Add to environment variables

---

## 5. Web App Deployment (Vercel)

### Initial Setup

1. Go to https://vercel.com/new
2. Click **"Continue with GitHub"**
3. Select: `contatovinicaetano93-commits/alagami-site`
4. Click **"Import"**

### Configure Build Settings

| Setting | Value |
|---------|-------|
| Framework Preset | Next.js |
| Project Name | alagami-site |
| Root Directory | `apps/web` |
| Build Command | `pnpm build` |
| Install Command | `pnpm install` |

### Add Environment Variables

In Vercel Settings > Environment Variables:

```
NEXT_PUBLIC_API_URL=https://alagami-api-staging.onrender.com
```

For production:
```
NEXT_PUBLIC_API_URL=https://api.alagami.com
```

### Deploy

Click **"Deploy"** button. Vercel automatically handles:
- Dependency installation
- Build optimization
- CDN deployment

---

## 6. Verification & Testing

### Health Check

Test API is running:
```bash
curl https://alagami-api-staging.onrender.com/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-05-27T..."
}
```

### API Documentation

If Swagger is enabled:
```
https://alagami-api-staging.onrender.com/api/docs
```

### Database Connection (Local)

From your machine:
```bash
psql postgresql://user:password@hostname.render.com:5432/dbname
```

Test PostGIS:
```sql
SELECT ST_AsText(ST_Point(0, 0));
```

---

## 7. Environment Variables Reference

### Required Variables

| Variable | Value | Notes |
|----------|-------|-------|
| `DATABASE_URL` | `postgresql://...` | Must have PostGIS extension |
| `NODE_ENV` | `production` | Environment mode |
| `PORT` | `4000` | API port |
| `CORS_ORIGIN` | Frontend URL | `https://alagami-web-staging...` |
| `JWT_SECRET` | 64+ random chars | Use `openssl rand -base64 48` |
| `REDIS_URL` | `redis://...` | BullMQ queue connection |

### Optional Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `AWS_REGION` | S3 region | `us-east-1` |
| `AWS_ACCESS_KEY_ID` | S3 auth | From AWS IAM |
| `AWS_SECRET_ACCESS_KEY` | S3 auth | From AWS IAM |
| `S3_BUCKET` | S3 bucket | `imbobi-evidencias-staging` |
| `EMAIL_PROVIDER` | Email service | `sendgrid` or `smtp` |
| `SENDGRID_API_KEY` | SendGrid auth | From SendGrid console |
| `UNICO_API_KEY` | KYC service | From Unico |
| `SERPRO_TOKEN` | CPF validation | From Serpro |
| `FIREBASE_PROJECT_ID` | Firebase auth | From Firebase console |
| `FIREBASE_PRIVATE_KEY` | Firebase auth | From Firebase console |
| `FIREBASE_CLIENT_EMAIL` | Firebase auth | From Firebase console |

---

## 8. Monitoring & Logs

### Render Logs

1. API service dashboard → **"Logs"** tab
2. View real-time logs and past deployments
3. Filter by log level and search terms

### Set Up Alerts

1. Service Settings → **"Notifications"**
2. Configure email for:
   - Deployment failures
   - Service crashes
   - High resource usage

### Vercel Logs

1. Vercel Dashboard → **"Deployments"**
2. Click deployment → **"Logs"**
3. View build and runtime logs

---

## 9. Continuous Deployment

### Auto-Deploy Configuration

- **Trigger**: Every push to selected branch
- **Automatic**: On by default in Render and Vercel

### Manual Deploy

**Render:**
1. API service page → **"Manual Deploy"**
2. Click **"Deploy latest commit"**

**Vercel:**
1. Deployments tab → **"Redeploy"**

---

## 10. Production Deployment Checklist

Infrastructure:
- [ ] PostgreSQL 15 created with PostGIS
- [ ] Database migrations successful
- [ ] Redis connection working
- [ ] All environment variables configured
- [ ] JWT secret is 64+ characters and strong

API Service:
- [ ] Service deployed and running
- [ ] Health check endpoint returns 200
- [ ] API documentation accessible
- [ ] Migrations completed
- [ ] CORS_ORIGIN matches frontend URL

Database:
- [ ] Backups enabled
- [ ] PostGIS extension verified
- [ ] Connection pool optimized

Monitoring:
- [ ] Logs accessible
- [ ] Alerts configured
- [ ] Error tracking enabled

---

## 11. Troubleshooting

### Build Fails: pnpm Not Found

Use this build command:
```bash
npm install -g pnpm && pnpm install && pnpm db:generate && pnpm db:migrate && pnpm build
```

### Database Connection Timeout

- Verify DATABASE_URL uses external URL from Render
- Check firewall rules
- Confirm PostgreSQL version is 15+

### PostGIS Extension Errors

- Verify PostgreSQL version: `SELECT version();`
- Create extension: `CREATE EXTENSION postgis;`
- Check migration files in `services/api/prisma/migrations/`

### CORS Errors

- Update `CORS_ORIGIN` to match frontend URL
- For multiple origins: `https://web1.com,https://web2.com`
- Verify frontend has `NEXT_PUBLIC_API_URL` set

### Service Crashes After Deploy

1. Check Render logs for errors
2. Verify all required env vars are set
3. Test locally: `NODE_ENV=production pnpm build && pnpm start`
4. Check migration status

### Redis Connection Issues

- Verify `REDIS_URL` format: `redis://default:password@host:port`
- Test connection: `redis-cli`
- Check IP whitelist on Upstash

---

## 12. Performance Optimization

### Database

- Enable query logging: `log_statement = 'all'`
- Monitor slow queries (>1000ms)
- Use connection pooling

### API

- Enable request caching headers
- Use Redis for session/cache
- Implement rate limiting (Throttler enabled)

### Frontend

- Image optimization with `next/image`
- Code splitting and lazy loading
- Vercel CDN caching

---

## 13. Related Documentation

- [API Endpoints](./API_ENDPOINTS.md)
- [Integration Guide](./INTEGRATION_GUIDE.md)
- [Performance Optimization](./PERFORMANCE.md)
- [Project Architecture](../CLAUDE.md)

---

## 14. Support & Resources

- **Render Docs**: https://render.com/docs
- **Vercel Docs**: https://vercel.com/docs
- **Upstash Docs**: https://upstash.com/docs
- **PostgreSQL Docs**: https://www.postgresql.org/docs/15/
- **PostGIS Docs**: https://postgis.net/docs/

**Contact**: contato.vinicaetano93@gmail.com

---

**Last Updated**: 2026-05-27  
**Deployment Environment**: Render + Vercel  
**Database**: PostgreSQL 15 + PostGIS  
**API Framework**: NestJS 10 + Fastify  
**Documentation Version**: 2.0

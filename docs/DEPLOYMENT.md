# Deployment Guide

This document covers deploying the Alagami stack across different services.

## Infrastructure Overview

| Component | Service | Environment |
|-----------|---------|-------------|
| Web App | Vercel | Staging + Production |
| API | Render | Staging + Production |
| Database (PostgreSQL) | Render Postgres | Staging + Production |
| Cache/Queue (Redis) | Upstash | Staging + Production |
| Object Storage | AWS S3 / Cloudflare R2 | Staging + Production |

## Services Setup

### PostgreSQL (Render)

1. Create a new PostgreSQL database on Render
2. Copy connection string (DATABASE_URL format: `postgresql://user:password@host:port/dbname`)
3. Run migrations: `pnpm db:migrate`

**Environment Variables:**
```
DATABASE_URL=postgresql://user:password@host:port/dbname
```

### Redis (Upstash)

Alagami uses Redis for:
- Session caching
- BullMQ background job queues (especially for "Liberação de Parcela")
- Rate limiting

**Setup Instructions:**

1. Go to https://console.upstash.com/
2. Sign up with email (free tier available)
3. Create Database:
   - **Name:** alagami-redis-staging (or alagami-redis-prod)
   - **Region:** São Paulo (or closest to your deployment)
   - **Database Type:** Redis
   - **Tier:** FREE (free tier available)
4. Copy the connection string from the database details
5. The URL format is: `redis://default:password@host:port`

**Environment Variables:**

From the Upstash console, extract these values from the connection string:

```
REDIS_URL=redis://default:password@host:port
REDIS_HOST=host
REDIS_PORT=port
REDIS_PASSWORD=password
```

### API (NestJS on Render)

**Build Command:**
```bash
pnpm build
```

**Start Command:**
```bash
pnpm start:prod
```

**Environment Variables:**
All variables from `.env.example` (see ENVIRONMENT_SETUP.md)

### Web (Next.js on Vercel)

1. Connect GitHub repository to Vercel
2. Select `apps/web` as root directory
3. Set environment variables (see ENVIRONMENT_SETUP.md)
4. Deploy

**Build Command:** (Vercel auto-detects)
```bash
pnpm build
```

**Start Command:** (Vercel auto-detects)
```bash
pnpm start
```

## Deployment Checklist

- [ ] PostgreSQL database created and migrations run
- [ ] Redis (Upstash) database created
- [ ] AWS S3 bucket configured or Cloudflare R2 setup
- [ ] Environment variables configured on each service
- [ ] API deployed and running on Render
- [ ] Web app deployed on Vercel
- [ ] Database backups enabled on Render
- [ ] Redis backups enabled on Upstash

## Monitoring

- **Render:** Check application logs in dashboard
- **Vercel:** Check deployments and analytics
- **Upstash:** Monitor dashboard for connection stats and performance

## Troubleshooting

### Redis Connection Issues
- Verify REDIS_URL format: `redis://default:password@host:port`
- Check IP whitelist on Upstash console
- Ensure BullMQ worker is running if using background jobs

### Database Connection Issues
- Verify DATABASE_URL includes correct password and host
- Check if migrations have been run: `pnpm db:migrate`
- Verify IP is whitelisted on Render

### CORS Issues
- Update CORS_ORIGIN environment variable to match frontend URL
- Ensure frontend URL is in NEXT_PUBLIC_API_URL on web app

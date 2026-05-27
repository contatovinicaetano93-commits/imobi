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

## Web App Deployment (Vercel)

### Initial Setup

#### 1. Connect Repository to Vercel

1. Go to [https://vercel.com/new](https://vercel.com/new)
2. Click "Continue with GitHub"
3. Select repository: **contatovinicaetano93-commits/alagami-site**
4. Click "Import"

#### 2. Configure Build Settings

During the import process, configure:

| Setting | Value |
|---------|-------|
| **Framework Preset** | Next.js |
| **Project Name** | alagami-site |
| **Root Directory** | `apps/web` |
| **Build Command** | `pnpm build` |
| **Install Command** | `pnpm install` |
| **Output Directory** | `.next` (auto-detected) |

#### 3. Add Environment Variables

Add to Vercel Dashboard > Settings > Environment Variables:

```
NEXT_PUBLIC_API_URL=https://alagami-api-staging.onrender.com
```

#### 4. Deploy

Click the **Deploy** button. Vercel will automatically:
1. Install dependencies via `pnpm install`
2. Build the project with `pnpm build`
3. Generate the `.next` output directory
4. Deploy to the edge network

### Vercel Configuration Details

**Framework:** Next.js 14 (App Router)  
**Package Manager:** pnpm  
**Build Command:** `pnpm build`  
**Install Command:** `pnpm install`  
**Start Command:** (Vercel auto-detects) `pnpm start`  

**Remote Image Patterns (pre-configured in `next.config.ts`):**
- AWS S3: `*.amazonaws.com`
- Cloudflare R2: `*.r2.cloudflarestorage.com`

### Automatic Deployments

- **Trigger:** Every push to connected branch
- **Preview Deployments:** All pull requests (auto)
- **Production:** Configure in Settings > Git > Deploy Contexts

Configure which branch triggers production deployments:
1. Vercel Dashboard > Settings > Git
2. Set Production Branch to `main` or `develop`

### Environment Variables

**Development** (local):
```bash
NEXT_PUBLIC_API_URL=http://localhost:4000
```

**Staging** (Vercel):
```
NEXT_PUBLIC_API_URL=https://alagami-api-staging.onrender.com
```

**Production** (Vercel):
```
NEXT_PUBLIC_API_URL=https://api.alagami.com
```

### Build and Deployment Process

**What Happens During Deploy:**

1. **Install Phase:** `pnpm install` installs workspace dependencies
   - @imbobi/core
   - @imbobi/schemas
   - @imbobi/ui

2. **Build Phase:** `pnpm build` from `apps/web`
   - TypeScript compilation
   - Next.js optimization
   - Tailwind CSS processing

3. **Output Phase:** `.next` directory uploaded to Vercel edge network

**Expected Duration:** 2-5 minutes initial, 1-3 minutes subsequent (with cache)

### Vercel URL

After first deployment, access at:
```
https://alagami-site.vercel.app
```

To add custom domain:
1. Vercel Dashboard > Settings > Domains
2. Add custom domain
3. Update DNS records as shown

### Troubleshooting Vercel

**Build Fails: "Cannot find module @imbobi/..."**
- Verify `pnpm-workspace.yaml` exists at root
- Check package paths in root `package.json`
- Test locally: `pnpm install && pnpm build`

**API Calls Fail (CORS errors)**
- Verify env var: `NEXT_PUBLIC_API_URL=https://alagami-api-staging.onrender.com`
- Check Vercel Dashboard > Settings > Environment Variables

**Image Optimization Errors**
- Remote patterns configured for AWS S3 and Cloudflare R2
- Add additional patterns in `apps/web/next.config.ts` if needed

**Workspace Dependencies Not Found**
- Verify monorepo structure at root:
  - `apps/web`, `apps/mobile`
  - `packages/`, `services/`

### View Logs

1. Vercel Dashboard > Deployments > [Deployment] > Logs
2. Check Build, Preview, and Production tabs
3. Download full logs if needed

### Rollback

To rollback to previous deployment:
1. Vercel Dashboard > Deployments
2. Find previous successful deployment
3. Click three dots > Promote to Production

---

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

---

## Deployment Checklist

- [ ] PostgreSQL database created and migrations run
- [ ] Redis (Upstash) database created
- [ ] AWS S3 bucket configured or Cloudflare R2 setup
- [ ] Environment variables configured on each service
- [ ] API deployed and running on Render
- [ ] Web app connected and deployed on Vercel
- [ ] Database backups enabled on Render
- [ ] Redis backups enabled on Upstash

## Monitoring

- **Render:** Check application logs in dashboard
- **Vercel:** Check deployments and analytics at https://vercel.com/dashboard
- **Upstash:** Monitor dashboard for connection stats and performance

## Security Considerations

1. **Never commit `.env` files** to git
2. **Use Vercel Sensitive toggle** for API keys and tokens
3. **Rotate secrets regularly** (JWT, API keys, DB passwords)
4. **Restrict domain access** via WAF rules if needed
5. **Enable security headers** in `next.config.ts` if required

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

### Vercel Deployment Issues
- Check Vercel logs: Dashboard > Deployments > Logs
- Review build command and environment variables
- Test locally with `pnpm dev` and `pnpm build`
- Verify GitHub Actions/CI pipeline status

## Performance Optimization

### Next.js Built-in Features
- Image optimization with `next/image`
- Automatic code splitting
- CSS module support
- Tree-shaking of unused code
- Static generation (ISG) where possible

### Vercel Edge Network
- Global CDN for fast content delivery
- Automatic caching of static assets
- Vercel Edge Functions for serverless API routes

### Recommended Optimizations
1. Use `next/image` for all images
2. Implement `<Suspense>` for streaming responses
3. Optimize Core Web Vitals
4. Consider incremental static regeneration for dynamic routes

## References

- [Next.js Documentation](https://nextjs.org/docs)
- [Vercel Deployment Guide](https://vercel.com/docs/concepts/deployments/overview)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Next.js Image Optimization](https://nextjs.org/docs/app/building-your-application/optimizing/images)

---

**Last Updated:** 2026-05-27  
**Documentation Version:** 1.1

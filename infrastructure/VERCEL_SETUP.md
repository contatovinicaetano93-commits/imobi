# Vercel Deployment Setup Guide

This guide walks you through deploying the **imobi** Next.js frontend to Vercel. The deployment is fully automated after initial setup.

## Prerequisites

- GitHub account (repository: `contatovinicaetano93-commits/imobi`)
- Vercel account (free tier supported)
- Access to API server URL (for environment variables)
- Access to AWS S3 bucket configuration

## Phase 2 Architecture

```
GitHub (contatovinicaetano93-commits/imobi)
    ↓
Vercel (Next.js frontend)
    ├─ Preview: Each PR gets automatic preview deployment
    └─ Production: main branch → https://yourdomain.vercel.app

API (NestJS, Phase 3 - ECS Fargate)
    ↓
PostgreSQL (Phase 2 - RDS)
Redis Cache (Phase 2 - ElastiCache)
```

## Step 1: Sign Up for Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click **"Sign Up"**
3. Choose **"Continue with GitHub"**
4. Authorize Vercel to access your GitHub account
5. Complete the account setup

## Step 2: Import Project to Vercel

### 2.1 Start the Import Process

1. In Vercel Dashboard, click **"Add New..."** → **"Project"**
2. Search for repository: `imobi`
3. Click **"Import"** next to the `contatovinicaetano93-commits/imobi` repository

### 2.2 Configure Project Settings

Vercel will auto-detect the Next.js project. Verify these settings:

**Framework Preset:** Next.js ✓ (auto-detected)

**Root Directory:** `apps/web`
- Click **"Edit"** if needed
- Set to: `apps/web`
- This tells Vercel where the Next.js app is located

**Build Command:** `cd ../.. && pnpm build --filter=@imbobi/web`
- Vercel may suggest: `pnpm run build`
- **Override with**: `cd ../.. && pnpm build --filter=@imbobi/web`
- Reason: Monorepo requires installing workspace dependencies first

**Output Directory:** `.next`
- This is auto-detected by Vercel for Next.js
- Leave as-is (default)

**Install Command:** `pnpm install --frozen-lockfile`
- Vercel auto-detects pnpm
- Should be auto-set correctly

### 2.3 Review Project Settings

- **Project Name**: `imbobi` (or your preference)
- **Build & Development Settings**: Verified above
- Click **"Deploy"** *(we'll add environment variables before this)*

**WAIT** — Before clicking Deploy, go to Step 3 first.

## Step 3: Set Environment Variables

### 3.1 In Vercel Dashboard (Before Deployment)

1. After clicking **"Deploy"**, you'll see the **"Environment Variables"** section
2. Add these variables:

| Variable | Value | Type |
|----------|-------|------|
| `NEXT_PUBLIC_API_URL` | `https://api.yourdomain.com` | Public |
| `NEXT_PUBLIC_S3_BUCKET` | `imbobi-prod` | Public |
| `NODE_ENV` | `production` | Public |

**For Development/Staging:**
- Create separate environment variables for each deployment (see section 3.3)

### 3.2 Environment Variables Reference

See `apps/web/vercel.env.example` for detailed descriptions of each variable.

**Key Points:**
- **NEXT_PUBLIC_API_URL**: Production API URL
  - Development: `http://localhost:4000`
  - Staging: `https://api-staging.yourdomain.com`
  - Production: `https://api.yourdomain.com`
  - Must match API server's `CORS_ORIGIN` configuration

- **NEXT_PUBLIC_S3_BUCKET**: AWS S3 bucket name
  - Must match the bucket used by the API
  - Default: `imbobi-prod`

### 3.3 Branch-Specific Environment Variables (Optional)

For different environments (staging, preview, production):

1. Go to **Settings** → **Environment Variables**
2. Add variable
3. Fill in details:
   - **Name**: `NEXT_PUBLIC_API_URL`
   - **Value**: `https://api-staging.yourdomain.com`
   - **Environments**: Select **Preview** (for non-main branches)
4. Click **"Save"**

Repeat for each branch you want different settings.

### 3.4 Secrets (If Needed)

If you need to store secrets (API keys, tokens):
1. Go to **Settings** → **Environment Variables**
2. Add variable (do NOT prefix with `NEXT_PUBLIC_`)
3. Mark as **Secret** (toggle)
4. Set for appropriate environments

Example: `SENTRY_AUTH_TOKEN` (if using Sentry for error tracking)

## Step 4: Deploy

### 4.1 Complete Initial Deployment

1. Review all settings in Vercel Dashboard
2. Click **"Deploy"**
3. Wait for deployment to complete (2-5 minutes)
4. You'll see:
   - Build logs
   - Preview URL (once complete)
   - Production URL (for main branch)

### 4.2 First Deployment Checklist

- [ ] Build completed successfully
- [ ] No errors in build logs
- [ ] Preview URL is accessible
- [ ] API connectivity works (check browser console for errors)
- [ ] Environment variables are set correctly

## Step 5: GitHub Integration & Branch Protection

### 5.1 Enable Preview Deployments

1. Go to **Settings** → **Git**
2. Verify these are enabled:
   - **Vercel for GitHub** is connected ✓
   - **Deploy on push** is enabled ✓
   - **Deploy on pull request** is enabled ✓

### 5.2 Configure Branch Deployments

1. Go to **Settings** → **Git**
2. Set **Production Branch**: `main`
   - This ensures only `main` goes to production URL
   - All other branches get preview URLs

### 5.3 Add GitHub Status Checks (Recommended)

In your GitHub repository settings:

1. Go to **Settings** → **Branches** → **Branch protection rules**
2. Edit the `main` branch rule
3. Under **Require status checks to pass before merging**:
   - Enable **Vercel deployment check**
   - This prevents merging PRs with failed deployments

## Step 6: Enable Analytics & Monitoring

### 6.1 Vercel Web Analytics (Built-in)

1. Go to **Analytics** tab in Vercel Dashboard
2. Click **"Enable Web Analytics"**
3. This provides:
   - Page load times
   - Core Web Vitals (CLS, LCP, FID)
   - Real user data

### 6.2 Error Tracking (Optional)

For advanced error tracking, set up Sentry:

1. Create account at [sentry.io](https://sentry.io)
2. Create a Next.js project
3. Get your DSN (Data Source Name)
4. In Vercel, add environment variable:
   - **Name**: `NEXT_PUBLIC_SENTRY_DSN`
   - **Value**: Your Sentry DSN
5. Redeploy to pick up the variable

## Step 7: Custom Domain (Optional - Phase 3)

Once you have a domain, add it to Vercel:

1. Go to **Settings** → **Domains**
2. Click **"Add Domain"**
3. Enter your domain (e.g., `yourdomain.com`)
4. Vercel will provide DNS configuration
5. Update your domain registrar's DNS settings
6. Vercel auto-provisions SSL certificate (Let's Encrypt)

## Post-Deployment Checklist

- [ ] Production deployment successful
- [ ] API connectivity verified
- [ ] Environment variables set correctly
- [ ] GitHub branch protection configured
- [ ] Preview deployments working on PRs
- [ ] Web Analytics enabled
- [ ] Team members added to Vercel project
- [ ] Rollback plan documented (see VERCEL_CI_CD.md)

## Troubleshooting

### Build Fails with "pnpm not found"

**Solution**: Vercel should auto-detect pnpm. If not:
1. Go to **Settings** → **Build & Development Settings**
2. Set **Build Command** to: `cd ../.. && pnpm build --filter=@imbobi/web`
3. Ensure **Root Directory** is set to `apps/web`

### Environment Variables Not Working

**Solution**:
1. Verify variables are set in Vercel Dashboard
2. Confirm prefix: `NEXT_PUBLIC_*` for browser-accessible vars
3. Redeploy to pick up new variables
4. Check browser console for API errors

### API Connection Issues

**Check**:
1. `NEXT_PUBLIC_API_URL` is correct in Vercel Dashboard
2. API server's CORS configuration includes Vercel domain
3. API server is running and accessible from the internet

### Deployment Too Slow

**Optimization**:
1. Check build logs for bottlenecks
2. Verify dependencies (especially `@imbobi/ui`, `@imbobi/core`)
3. Consider caching strategies in `next.config.js`

## Next Steps

1. **Implement API Phase 2 (ECS Fargate)** — `infrastructure/DEPLOYMENT.md`
2. **Add Database Phase 2 (RDS)** — `infrastructure/DEPLOYMENT.md`
3. **Configure Custom Domain** — After domain is ready
4. **Set up Monitoring** — `infrastructure/MONITORING.md`

## Useful Links

- [Vercel Docs](https://vercel.com/docs)
- [Next.js on Vercel](https://vercel.com/docs/frameworks/nextjs)
- [Environment Variables Guide](https://vercel.com/docs/projects/environment-variables)
- [Deployment Basics](https://vercel.com/docs/deployments/overview)
- [GitHub Integration](https://vercel.com/docs/git/github)

## Support

For issues:
1. Check **Deployment Logs** in Vercel Dashboard
2. Review **Infrastructure** → **TROUBLESHOOTING.md**
3. Check **Vercel Status** at [status.vercel.com](https://status.vercel.com)
4. Contact Vercel support (free tier gets community support)

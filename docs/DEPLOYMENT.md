# Vercel Deployment Guide

## Overview

This document outlines the setup and deployment process for the **alagami-site** Next.js 14 web application on Vercel for staging and production environments.

## Deployment Architecture

- **Platform**: Vercel
- **Repository**: [contatovinicaetano93-commits/alagami-site](https://github.com/contatovinicaetano93-commits/alagami-site)
- **Framework**: Next.js 14 (App Router)
- **Root Directory**: `apps/web`
- **Package Manager**: pnpm

## Initial Setup

### 1. Connect Repository to Vercel

1. Go to [https://vercel.com/new](https://vercel.com/new)
2. Click "Continue with GitHub"
3. Select repository: **contatovinicaetano93-commits/alagami-site**
4. Click "Import"

### 2. Configure Build Settings

During the import process, configure:

| Setting | Value |
|---------|-------|
| **Framework Preset** | Next.js |
| **Project Name** | alagami-site (or your preference) |
| **Root Directory** | `apps/web` |
| **Build Command** | `pnpm build` |
| **Install Command** | `pnpm install` |
| **Output Directory** | `.next` (auto-detected) |

### 3. Environment Variables

Add the following environment variables to the Vercel dashboard under **Settings > Environment Variables**:

#### Required for Staging

```
NEXT_PUBLIC_API_URL=https://alagami-api-staging.onrender.com
```

#### Optional (if needed for image optimization)

These are configured in `next.config.ts` for AWS S3 and Cloudflare R2:
- Remote image patterns are pre-configured for `*.amazonaws.com` and `*.r2.cloudflarestorage.com`

### 4. Deploy

Click the **Deploy** button to trigger the first deployment. Vercel will:
1. Install dependencies via `pnpm install`
2. Build the project with `pnpm build`
3. Generate the `.next` output directory
4. Deploy to the edge network

## Post-Deployment

### Vercel URL

Once deployment is successful, you'll receive a URL in the format:
```
https://alagami-site.vercel.app
```

(Actual URL will be available in the Vercel dashboard after first deployment)

### Domain Configuration

To add a custom domain:
1. Go to Vercel Dashboard > Settings > Domains
2. Add your custom domain
3. Update DNS records as shown by Vercel

## Automatic Deployments

### Trigger Rules

- **Automatic**: Every push to connected branch
- **Manual**: Available in Vercel Dashboard > Deployments > Redeploy

### Branch Deployments

By default, Vercel creates preview deployments for:
- All pull requests
- Non-main branches (if configured)

Configure in **Settings > Git > Deploy Contexts**:
- **Production Branch**: `main` or `develop` (as per your workflow)
- **Preview Branches**: All others (default)

## Environment Configuration

### Environment Variable Management

1. **Development** (local)
   ```bash
   # .env.local (git-ignored)
   NEXT_PUBLIC_API_URL=http://localhost:4000
   ```

2. **Staging** (Vercel)
   ```
   NEXT_PUBLIC_API_URL=https://alagami-api-staging.onrender.com
   ```

3. **Production** (Vercel)
   ```
   NEXT_PUBLIC_API_URL=https://api.alagami.com  # Update when ready
   ```

### Sensitive Variables

- Use Vercel's **Sensitive** toggle for tokens and keys
- Never commit `.env` files to git
- Reference template: `.env.example`

## Build and Deployment Process

### What Happens During Deploy

1. **Install Phase**
   - `pnpm install` installs all workspace dependencies
   - Includes: `@imbobi/core`, `@imbobi/schemas`, `@imbobi/ui`

2. **Build Phase**
   - `pnpm build` from `apps/web` directory
   - TypeScript compilation
   - Next.js optimization and bundling
   - Tailwind CSS processing

3. **Output Phase**
   - `.next` directory uploaded to Vercel's edge network
   - Static assets optimized and cached

### Build Duration

- Expected: 2-5 minutes for initial deployment
- Subsequent builds: 1-3 minutes (with cache)

## Troubleshooting

### Common Issues

#### 1. Build Fails: "Cannot find module @imbobi/..."

**Solution**: Ensure monorepo workspace resolution works
- Check `pnpm-workspace.yaml` exists at root
- Verify package paths in root `package.json`
- Run `pnpm install` locally to test

#### 2. API Calls Fail (CORS errors)

**Solution**: Verify environment variable is set
```bash
# Check Vercel Dashboard > Settings > Environment Variables
NEXT_PUBLIC_API_URL=https://alagami-api-staging.onrender.com
```

#### 3. Image Optimization Errors

**Solution**: Remote image patterns are configured for:
- AWS S3: `*.amazonaws.com`
- Cloudflare R2: `*.r2.cloudflarestorage.com`

Add additional patterns in `apps/web/next.config.ts` if needed:
```typescript
images: {
  remotePatterns: [
    { protocol: "https", hostname: "**.example.com" },
  ],
}
```

#### 4. Workspace Dependencies Not Found

**Solution**: Verify monorepo structure
```bash
# Root directory structure
- apps/web        # Next.js app
- apps/mobile     # Expo app
- packages/       # Shared packages
- services/       # Backend services
```

### View Logs

1. Vercel Dashboard > Deployments > [Deployment] > Logs
2. Check Build, Preview, and Production logs
3. Download full logs if needed

### Rollback

To rollback to a previous deployment:
1. Vercel Dashboard > Deployments
2. Find previous successful deployment
3. Click the three dots > Promote to Production

## Monitoring

### After Deployment

1. **Check Deployment Status**: Vercel Dashboard > Deployments
2. **View Analytics**: Settings > Analytics (if enabled)
3. **Monitor Performance**: Vercel Metrics dashboard
4. **Check Logs**: Settings > Runtime Logs

### Health Check

After deployment, verify:
```bash
# Check application loads
curl https://alagami-site.vercel.app/

# Check API connectivity (should have NEXT_PUBLIC_API_URL configured)
# Open browser console and check network requests
```

## Security Considerations

1. **Never commit `.env` files** to git
2. **Use sensitive toggle** in Vercel for secrets
3. **Rotate secrets regularly** (JWT, API keys)
4. **Restrict domain access** if needed via WAF rules
5. **Enable security headers** in `next.config.ts` if required

## Performance Optimization

### Next.js Built-in Features (Enabled by Default)

- ✅ Image optimization with `next/image`
- ✅ Automatic code splitting
- ✅ CSS module support
- ✅ Tree-shaking of unused code
- ✅ Static generation (ISG) where possible

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

## Support

For deployment issues:
1. Check Vercel logs: Dashboard > Deployments > Logs
2. Review build command and environment variables
3. Test locally with `pnpm dev` and `pnpm build`
4. Check GitHub Actions or CI/CD pipeline status

---

**Last Updated**: 2026-05-27  
**Documentation Version**: 1.0

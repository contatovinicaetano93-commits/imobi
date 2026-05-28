# Vercel Production Deployment Checklist

## Pre-Deployment Setup

### 1. Vercel Account & Project

- [ ] Vercel account created (https://vercel.com)
- [ ] Organization created for imbobi
- [ ] GitHub repository connected
- [ ] Repository access granted to Vercel

### 2. Project Configuration

**In Vercel Dashboard:**

- [ ] Create new project
- [ ] Select GitHub repository: `alagami-site`
- [ ] Framework: Next.js
- [ ] Root directory: `apps/web`
- [ ] Build command: `pnpm build`
- [ ] Install command: `pnpm install`
- [ ] Output directory: `.next`
- [ ] Node.js version: 20.x

### 3. Environment Variables

**Add in Vercel Project Settings:**

```
NEXT_PUBLIC_API_URL=https://api.imbobi.com
NEXT_PUBLIC_ENVIRONMENT=production
```

**For API proxying (if needed):**
```
API_URL=https://api.imbobi.com
```

### 4. Domains & DNS

**Setup Custom Domain:**

- [ ] Domain registered: `app.imbobi.com`
- [ ] Add domain in Vercel: Dashboard → Settings → Domains
- [ ] Update DNS records at registrar:
  - Type: CNAME
  - Name: app
  - Value: cname.vercel-dns.com
  - TTL: 3600

**Alternative Root Domain:**

- [ ] Domain: `imbobi.com`
- [ ] Option A: CNAME to `app.imbobi.com`
- [ ] Option B: A record to Vercel IP (less recommended)

### 5. SSL/TLS Certificate

- [ ] Vercel auto-provisions Let's Encrypt certificate
- [ ] HTTPS enforced automatically
- [ ] Certificate auto-renewal enabled
- [ ] Verify: https://app.imbobi.com

### 6. Build & Deployment Settings

**Advanced Settings:**

- [ ] Build caching: Enabled
- [ ] Serverless Function timeout: 60 seconds (adjust if needed)
- [ ] Memory: 1024 MB (default)
- [ ] Source branch: `main`
- [ ] Preview branch deployments: Enabled
- [ ] Production deployment approval: Optional

### 7. Security Headers

**Vercel automatically includes:**

- [ ] X-Frame-Options: DENY
- [ ] X-Content-Type-Options: nosniff
- [ ] X-XSS-Protection: 1; mode=block
- [ ] Referrer-Policy: strict-origin-when-cross-origin

**Custom Headers (if needed):**

Create `vercel.json` in `apps/web/`:

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=31536000; includeSubDomains"
        },
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline' https://api.imbobi.com; connect-src 'self' https://api.imbobi.com https://*.sentry.io"
        }
      ]
    }
  ]
}
```

### 8. Analytics & Monitoring

- [ ] Vercel Analytics enabled (optional)
- [ ] Real Experience Score (RES) enabled
- [ ] Web Vitals monitoring enabled
- [ ] Error tracking configured

### 9. Redirects & Rewrites

Create `vercel.json` in `apps/web/`:

```json
{
  "redirects": [
    {
      "source": "/sitemap.xml",
      "destination": "/sitemap-index.xml"
    }
  ],
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://api.imbobi.com/api/:path*"
    }
  ]
}
```

---

## Deployment Process

### 1. Pre-Deployment Validation

```bash
# In apps/web directory

# Install dependencies
pnpm install

# Run linting
pnpm lint

# Run type checking
pnpm type-check

# Build locally
pnpm build

# Test build
pnpm start
```

### 2. Create Git Tag

```bash
# From root directory
git tag -a v1.0.0 -m "Production release v1.0.0"
git push origin v1.0.0
```

### 3. Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy to production (from root)
vercel --prod

# Or specific app
cd apps/web
vercel --prod
```

### 4. Deploy via GitHub

**Automatic:**
- [ ] Push to `main` branch
- [ ] Vercel automatically deploys to production
- [ ] Watch deployment progress in Vercel Dashboard

**Manual:**
- [ ] Go to Vercel Dashboard
- [ ] Select project: `alagami-site`
- [ ] Click "Deployments" tab
- [ ] Find desired commit
- [ ] Click "Promote to Production"

### 5. Monitor Deployment

```bash
# Check deployment status
vercel status

# View logs
vercel logs --prod

# Check health
curl -I https://app.imbobi.com
```

---

## Post-Deployment Validation

### 1. Website Access

- [ ] https://app.imbobi.com loads successfully
- [ ] No 404 errors on landing page
- [ ] CSS and JavaScript load properly
- [ ] Images load correctly

### 2. API Connectivity

- [ ] Browser console shows no errors
- [ ] API endpoints responding (check Network tab)
- [ ] CORS headers correct
- [ ] Authentication working

### 3. Key Pages

Test these critical pages:

- [ ] Landing page: https://app.imbobi.com/
- [ ] Signup page: https://app.imbobi.com/auth/signup
- [ ] Login page: https://app.imbobi.com/auth/login
- [ ] Dashboard: https://app.imbobi.com/dashboard (requires auth)

### 4. Mobile Responsiveness

- [ ] Test on mobile (iPhone, Android)
- [ ] Test on tablet (iPad)
- [ ] Verify Touch interactions work
- [ ] Check hamburger menu/navigation

### 5. Performance

```bash
# Check Core Web Vitals
curl https://app.imbobi.com | grep "Core Web Vitals"

# Test with Lighthouse (local)
npm install -g lighthouse
lighthouse https://app.imbobi.com --view

# Check in Vercel Analytics
# Dashboard → Analytics → Web Vitals
```

### 6. SSL/TLS

```bash
# Verify SSL certificate
openssl s_client -connect app.imbobi.com:443 -showcerts

# Check HSTS header
curl -I https://app.imbobi.com | grep "Strict-Transport-Security"

# Expected: max-age=31536000
```

### 7. Browser Compatibility

- [ ] Chrome/Edge: Latest version
- [ ] Firefox: Latest version
- [ ] Safari: Latest version
- [ ] Mobile browsers: Latest versions

### 8. Functionality Testing

- [ ] Form submission works
- [ ] File uploads work (if applicable)
- [ ] Authentication flow complete
- [ ] Navigation working
- [ ] Search functionality (if applicable)

### 9. Error Handling

- [ ] 404 page displays correctly
- [ ] 500 error page displays correctly
- [ ] Network error handling works
- [ ] Timeout handling works

### 10. Analytics & Tracking

- [ ] Google Analytics tag fires
- [ ] Sentry error tracking active
- [ ] Custom events tracking work
- [ ] UTM parameters parsed correctly

---

## Performance Optimization

### 1. Image Optimization

```json
{
  "images": {
    "domains": ["imbobi-evidencias-prod.s3.amazonaws.com"],
    "formats": ["image/avif", "image/webp"],
    "remotePatterns": [
      {
        "protocol": "https",
        "hostname": "**"
      }
    ]
  }
}
```

### 2. Code Splitting

- [ ] Dynamic imports for large components
- [ ] Route-based code splitting configured
- [ ] Bundle size < 250KB (gzipped)

### 3. Caching

- [ ] Static pages cached (ISR)
- [ ] Cache headers set appropriately
- [ ] CDN cache working

### 4. Web Fonts

- [ ] Fonts self-hosted (not external CDN)
- [ ] Font subsetting implemented
- [ ] `font-display: swap` configured

---

## Rollback Procedure

### If Deployment Fails

```bash
# Option 1: Rollback via Vercel CLI
vercel rollback

# Option 2: Redeploy previous version
git checkout v1.0.0-previous
vercel --prod

# Option 3: Via Dashboard
# Dashboard → Deployments → Select previous → Promote to Production
```

### If Post-Deployment Issues Found

```bash
# 1. Check logs for errors
vercel logs --prod

# 2. Check environment variables are correct
vercel env list

# 3. Verify API connectivity
curl https://api.imbobi.com/api/v1/health

# 4. Clear Vercel cache if needed
vercel env pull   # Pull latest env vars
vercel --prod --force  # Force new deployment
```

---

## Monitoring & Alerts

### 1. Vercel Dashboard

- [ ] Check deployment status regularly
- [ ] Monitor build times
- [ ] Watch for deployment errors
- [ ] Review Performance metrics

### 2. Third-Party Monitoring

```bash
# Setup Sentry alerts
# https://sentry.io → Settings → Alerts → Create

# Setup Uptime Monitoring
# https://uptimerobot.com → Add Monitor
# URL: https://app.imbobi.com
# Monitor type: HTTPS
# Interval: 5 minutes
```

### 3. Email Notifications

- [ ] Enable Vercel email notifications
- [ ] Subscribe to deployment notifications
- [ ] Setup failure alerts

---

## Maintenance

### Regular Tasks

- [ ] Monitor build times (target: < 5 min)
- [ ] Review analytics weekly
- [ ] Check Core Web Vitals monthly
- [ ] Update dependencies quarterly
- [ ] Review security headers monthly
- [ ] Audit third-party scripts monthly

### Scheduled Updates

- [ ] Update Next.js when new minor version available
- [ ] Update dependencies when security patches available
- [ ] Review Vercel best practices quarterly
- [ ] Audit performance quarterly

---

## Troubleshooting

### Build Failures

**Issue: Build timeout**
```bash
# Increase build timeout in vercel.json
{
  "buildCommand": "pnpm build",
  "env": {
    "NODE_OPTIONS": "--max-old-space-size=3072"
  }
}
```

**Issue: Missing dependencies**
```bash
# Ensure all dependencies are in package.json
pnpm add --save <package>
git add pnpm-lock.yaml package.json
```

### Runtime Errors

**Issue: API endpoint 404**
- Check NEXT_PUBLIC_API_URL is set correctly
- Verify API server is running

**Issue: Authentication failing**
- Check JWT token generation
- Verify CORS headers are correct
- Check database connection

### Performance Issues

**Issue: Slow page load**
- Check image sizes
- Verify bundle size
- Review network requests
- Check Sentry for JavaScript errors

---

## Deployment Checklist Template

**Date:** ________________  
**Deployed By:** ________________  
**Version:** ________________

### Pre-Deployment
- [ ] All tests passing locally
- [ ] Code review completed
- [ ] Security audit passed
- [ ] Environment variables set in Vercel

### Deployment
- [ ] Git push to main completed
- [ ] Vercel deployment triggered
- [ ] Deployment succeeded
- [ ] No build errors

### Post-Deployment
- [ ] Website loads without errors
- [ ] API connectivity working
- [ ] Key pages functional
- [ ] SSL certificate valid
- [ ] Performance metrics acceptable
- [ ] No error spikes in Sentry

### Sign-Off
- [ ] QA validation complete
- [ ] Product team approved
- [ ] On-call team aware

**Sign-Off:** ________________  
**Time:** ________________

---

## Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/learn/foundations/how-nextjs-works/deployment)
- [Vercel CLI Reference](https://vercel.com/cli)
- [Web Vitals Guide](https://web.dev/vitals/)

---

**Last Updated:** 2026-05-28  
**Version:** 1.0.0

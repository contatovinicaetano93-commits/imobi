# Render Deployment Documentation for imobi Web

This directory contains comprehensive guides for deploying the imobi Next.js web frontend to Render.

## Available Guides

### 1. **RENDER_DEPLOYMENT_WEB_GUIDE.md** (MAIN GUIDE)
**Start here!** The most comprehensive guide covering:
- Complete step-by-step service creation
- Build and start commands with explanation
- Environment variables configuration
- Deployment settings (instance types, regions, auto-deploy)
- Post-deployment verification (5-step verification process)
- Monitoring and troubleshooting
- Domain configuration
- Workflow for deploying updates
- Scaling and cost estimation

**Length:** ~25KB, 15-20 min read  
**Best for:** First-time deployers, complete understanding

### 2. **RENDER_QUICK_REFERENCE.md** (QUICK CARD)
One-page reference for quick lookup:
- 5-minute setup summary (settings table)
- Required environment variables
- Verification checklist
- Common issues and fixes
- URLs quick reference

**Length:** ~3.5KB, 2-3 min read  
**Best for:** Quick lookup, during deployment

### 3. **RENDER_DEPLOYMENT_GUIDE.md**
The original API deployment guide (if deploying NestJS backend)
**Note:** For web frontend, use RENDER_DEPLOYMENT_WEB_GUIDE.md instead

---

## Quick Start (TL;DR)

### Service Creation
1. Go to https://dashboard.render.com
2. Create new "Web Service"
3. Connect GitHub repo: `contatovinicaetano93-commits/imobi`
4. Set branch: `claude/happy-goldberg-AFQPj`

### Configuration
| Setting | Value |
|---------|-------|
| Name | `imbobi-web-staging` |
| Build | `pnpm build` |
| Start | `pnpm --filter @imbobi/web start` |
| Region | `us-east-1` |
| Instance | Free (or Starter $7) |

### Environment Variables
```
NEXT_PUBLIC_API_URL = https://api.staging.imbobi.com/api/v1
NODE_ENV = staging
```

### Expected URLs
- Web: https://imbobi-web-staging.onrender.com
- API: https://api.staging.imbobi.com/api/v1

---

## Deployment Steps

### Step 1: Create Web Service
See section "Step-by-Step Service Creation" in RENDER_DEPLOYMENT_WEB_GUIDE.md

Expected time: 3-5 minutes for first deployment

### Step 2: Verify Deployment
1. Wait for "Service is live" in Render logs
2. Visit https://imbobi-web-staging.onrender.com
3. Check 5-point verification checklist below

### Step 3: Verify Functionality
- Landing page loads
- Click /cadastro link
- Visit /dashboard (should redirect to /login)
- Open DevTools (F12) → Network tab
- Verify API calls go to api.staging.imbobi.com

---

## Verification Checklist

```
✓ Service shows "Service is live"
✓ Can access https://imbobi-web-staging.onrender.com
✓ Landing page shows hero section with CTA
✓ /cadastro link works (registration form)
✓ /dashboard redirects to /login
✓ DevTools Network tab shows API calls to correct endpoint
✓ No CORS errors in console
```

---

## Common Issues

| Issue | Solution |
|-------|----------|
| Blank page / 404 | Check build logs. Try: `cd apps/web && npm start` |
| `pnpm not found` | Use alternative start command above |
| API calls fail | Check `NEXT_PUBLIC_API_URL` environment variable |
| Slow builds | Upgrade instance to Starter ($7/month) |

See full troubleshooting section in RENDER_DEPLOYMENT_WEB_GUIDE.md

---

## Important Notes

### For the Web App
- **What you need:** Git repo, GitHub account, Render account
- **What you DON'T need:** Database, Redis, AWS credentials (API handles these)
- **Environment variables:** Only 2 required (NEXT_PUBLIC_API_URL, NODE_ENV)

### Monorepo Structure
```
imobi/
├── apps/web/         ← This gets deployed
├── apps/mobile/
├── packages/         ← Dependencies of web app
└── services/api/     ← Separate deployment
```

The build command (`pnpm build`) handles workspace dependencies automatically.

### Auto-Deploy
- Enabled by default
- Every push to `claude/happy-goldberg-AFQPj` auto-deploys
- Takes 1-3 minutes per deploy
- Can disable in Render settings if preferred

---

## Deployment Updates

### Push Code Update
```bash
git commit -m "update: feature X"
git push origin claude/happy-goldberg-AFQPj
# → Auto-deploys (if enabled)
```

### Manual Redeploy
1. Render dashboard → Select service
2. Click "Redeploy" button
3. Wait for "Service is live"

### Rollback
1. Render dashboard → "Deployments" tab
2. Click previous deployment
3. Click "Redeploy"

---

## File Locations

All guides are in the repository root:
- `/home/user/imobi/RENDER_DEPLOYMENT_WEB_GUIDE.md` ← **MAIN GUIDE**
- `/home/user/imobi/RENDER_QUICK_REFERENCE.md` ← **QUICK CARD**
- `/home/user/imobi/RENDER_DEPLOYMENT_GUIDE.md` (API deployment)

---

## Support

### For Deployment Help
- **Render Docs:** https://render.com/docs
- **Render Status:** https://status.render.com
- **This guide:** RENDER_DEPLOYMENT_WEB_GUIDE.md

### For Application Issues
- **Next.js Docs:** https://nextjs.org/docs
- **Project Guide:** CLAUDE.md
- **Source Code:** apps/web/

---

## Cost

| Tier | Price | CPU | RAM | Use |
|------|-------|-----|-----|-----|
| Free | $0 | 0.5 | 512MB | Development |
| Starter | $7/mo | 1 | 512MB | Staging (recommended) |
| Standard | $12/mo | 1 | 1GB | Production staging |

For staging: Start with **Free**, upgrade to **Starter** if performance needed.

---

## Next Steps

1. Read RENDER_DEPLOYMENT_WEB_GUIDE.md (sections 1-5)
2. Create web service on Render (sections 1-9)
3. Verify deployment works (section 10)
4. Test landing page, registration, login flows
5. Monitor first 24 hours in Render dashboard

---

**Created:** June 2, 2026  
**For:** imobi Next.js Web Frontend Deployment  
**Environment:** Staging (claude/happy-goldberg-AFQPj branch)  
**Status:** Ready for non-technical deployment

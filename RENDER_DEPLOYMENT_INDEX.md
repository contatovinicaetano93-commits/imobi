# Render Deployment Documentation Index

## Overview
Complete deployment guides for imobi Next.js web frontend to Render.  
**Target:** Staging environment on branch `claude/happy-goldberg-AFQPj`  
**Created:** June 2, 2026

---

## Document Quick Navigation

### Start Here
1. **RENDER_DEPLOYMENT_README.md** — Overview and quick start
2. **RENDER_QUICK_REFERENCE.md** — One-page cheat sheet

### Main Deployment Guide
3. **RENDER_DEPLOYMENT_WEB_GUIDE.md** — COMPREHENSIVE GUIDE (28KB)
   - Full step-by-step instructions
   - Technical explanations
   - Troubleshooting
   - All deployment scenarios

### Additional Resources
- **RENDER_QUICK_START.md** — 5-minute quick start
- **RENDER_STEP_BY_STEP.md** — Visual step-by-step guide
- **RENDER_DEPLOYMENT_CHECKLIST.md** — Pre/post deployment checklist
- **RENDER_DEPLOYMENT_SETUP.md** — Service configuration details
- **RENDER_CONFIG_REFERENCE.md** — Configuration reference
- **RENDER_TECHNICAL_CONFIG.md** — Technical configuration

---

## Documentation Map

```
START
  ↓
RENDER_DEPLOYMENT_README.md (overview)
  ↓
Choose your path:
  ├─ Quick? → RENDER_QUICK_REFERENCE.md (1 page)
  ├─ Visual? → RENDER_STEP_BY_STEP.md (12KB)
  └─ Complete? → RENDER_DEPLOYMENT_WEB_GUIDE.md (28KB) ← RECOMMENDED
  ↓
Deploy to Render
  ↓
Verify: RENDER_DEPLOYMENT_CHECKLIST.md
  ↓
DONE!
```

---

## When to Use Each Document

| Document | Purpose | Read Time | Best For |
|----------|---------|-----------|----------|
| **RENDER_DEPLOYMENT_README.md** | Overview, quick start | 3 min | Entry point |
| **RENDER_QUICK_REFERENCE.md** | One-page cheat sheet | 2 min | During deployment |
| **RENDER_QUICK_START.md** | 5-minute setup | 5 min | Experienced users |
| **RENDER_DEPLOYMENT_WEB_GUIDE.md** | Complete guide | 15 min | First-time deployers |
| **RENDER_STEP_BY_STEP.md** | Visual step-by-step | 10 min | Visual learners |
| **RENDER_DEPLOYMENT_SETUP.md** | Service configuration | 10 min | Configuration details |
| **RENDER_DEPLOYMENT_CHECKLIST.md** | Pre/post verification | 5 min | Verification |
| **RENDER_CONFIG_REFERENCE.md** | Config details | 10 min | Reference lookup |
| **RENDER_TECHNICAL_CONFIG.md** | Technical deep-dive | 10 min | Technical users |

---

## Key Information (At a Glance)

### Service Details
```
Name:               imbobi-web-staging
GitHub Repo:        contatovinicaetano93-commits/imobi
Branch:             claude/happy-goldberg-AFQPj
Build Command:      pnpm build
Start Command:      pnpm --filter @imbobi/web start
Region:             us-east-1
Instance Type:      Free (or Starter $7/month)
```

### Environment Variables (Required)
```
NEXT_PUBLIC_API_URL=https://api.staging.imbobi.com/api/v1
NODE_ENV=staging
```

### Expected URLs
```
Web App:     https://imbobi-web-staging.onrender.com
API:         https://api.staging.imbobi.com/api/v1
Dashboard:   https://dashboard.render.com
```

### Verification
```
✓ "Service is live" appears in logs
✓ Landing page loads
✓ /cadastro (registration) works
✓ /dashboard redirects to /login
✓ API calls go to correct endpoint
```

---

## Recommended Reading Path

### For Non-Technical Deployment
1. RENDER_DEPLOYMENT_README.md (overview)
2. RENDER_DEPLOYMENT_WEB_GUIDE.md (sections 1-9: up to "verification")
3. RENDER_DEPLOYMENT_CHECKLIST.md (verify after deployment)

**Estimated Time:** 20 minutes

### For Quick Deployment
1. RENDER_QUICK_REFERENCE.md (5 min)
2. Deploy to Render (5-10 min)
3. Check verification checklist (2 min)

**Estimated Time:** 15 minutes

### For Technical Review
1. RENDER_DEPLOYMENT_WEB_GUIDE.md (full read)
2. RENDER_TECHNICAL_CONFIG.md (optional)
3. Deploy and verify

**Estimated Time:** 25 minutes

---

## Common Questions Answered In

| Question | Document | Section |
|----------|----------|---------|
| How do I create the service? | RENDER_DEPLOYMENT_WEB_GUIDE.md | Step-by-Step Service Creation |
| What build command do I use? | RENDER_QUICK_REFERENCE.md | Service Settings |
| What environment variables are needed? | RENDER_DEPLOYMENT_README.md | Environment Variables |
| How do I verify it works? | RENDER_DEPLOYMENT_WEB_GUIDE.md | Post-Deployment Verification |
| What if deployment fails? | RENDER_DEPLOYMENT_WEB_GUIDE.md | Troubleshooting |
| How do I deploy updates? | RENDER_DEPLOYMENT_WEB_GUIDE.md | Workflow: Deploying Updates |
| How much does it cost? | RENDER_DEPLOYMENT_README.md | Cost |
| Can I use a custom domain? | RENDER_DEPLOYMENT_WEB_GUIDE.md | Domain Configuration |

---

## File Sizes & Content Summary

| File | Size | Content |
|------|------|---------|
| RENDER_DEPLOYMENT_WEB_GUIDE.md | 28KB | Main guide, all sections covered |
| RENDER_CONFIG_REFERENCE.md | 20KB | Configuration reference |
| RENDER_DEPLOYMENT_SETUP.md | 20KB | Detailed setup instructions |
| RENDER_STEP_BY_STEP.md | 12KB | Visual step-by-step guide |
| RENDER_DEPLOYMENT_CHECKLIST.md | 8KB | Pre/post deployment checklist |
| RENDER_DEPLOYMENT_README.md | 8KB | Overview document |
| RENDER_DEPLOYMENT_SUMMARY.md | 8KB | Quick summary |
| RENDER_QUICK_START.md | 8KB | 5-minute quick start |
| RENDER_TECHNICAL_CONFIG.md | 16KB | Technical configuration details |
| RENDER_QUICK_REFERENCE.md | 4KB | One-page cheat sheet |

**Total:** 132KB of documentation

---

## Key Topics Covered Across Guides

### Service Creation
- Creating web service on Render
- Connecting GitHub repository
- Configuring git branch
- Selecting region and instance type

### Build & Deployment
- Understanding monorepo build process
- Build command explanation (`pnpm build`)
- Start command explanation (`pnpm --filter @imbobi/web start`)
- Troubleshooting build failures
- Alternative start commands

### Configuration
- Environment variables (only 2 required for web)
- Next.js specific settings
- Auto-deploy settings
- Instance type selection and scaling

### Verification
- Landing page verification
- Route verification (/cadastro, /dashboard)
- API connectivity verification
- DevTools inspection
- Log review

### Troubleshooting
- Blank page / 404 errors
- pnpm command not found
- API call failures
- Performance issues
- Memory/CPU issues

### Operations
- Monitoring deployments
- Viewing logs
- Checking metrics
- Deploying updates
- Rolling back deployments
- Custom domain setup

---

## Next Steps

1. **Read RENDER_DEPLOYMENT_README.md** (3 min)
   - Get overview
   - Understand what you're deploying

2. **Choose your path:**
   - Quick? → Use RENDER_QUICK_REFERENCE.md
   - Thorough? → Use RENDER_DEPLOYMENT_WEB_GUIDE.md
   - Visual? → Use RENDER_STEP_BY_STEP.md

3. **Create service on Render** (5-10 min)
   - Follow step-by-step instructions
   - Set all configuration values

4. **Wait for deployment** (3-5 min)
   - Watch for "Service is live"

5. **Verify functionality** (5 min)
   - Use RENDER_DEPLOYMENT_CHECKLIST.md
   - Test all endpoints

6. **Monitor first 24 hours**
   - Check logs in Render dashboard
   - Test user flows

---

## Support & Help

### Documentation Issues
If documentation is unclear:
- Check RENDER_DEPLOYMENT_WEB_GUIDE.md for more details
- Review RENDER_TECHNICAL_CONFIG.md for technical specifics
- See CLAUDE.md for project architecture

### Deployment Issues
- Check logs in Render dashboard
- Review troubleshooting section in RENDER_DEPLOYMENT_WEB_GUIDE.md
- Check Render status page: https://status.render.com

### Application Issues
- Check browser DevTools (F12)
- Verify environment variables in Render dashboard
- Review CLAUDE.md for project structure

---

## Version & Maintenance

- **Created:** June 2, 2026
- **For:** imobi Next.js Web Frontend
- **Environment:** Staging (claude/happy-goldberg-AFQPj)
- **Status:** Ready for deployment
- **Maintained by:** Claude Code Assistant

---

## TL;DR (30 seconds)

1. Go to render.com, create Web Service
2. Connect GitHub: contatovinicaetano93-commits/imobi
3. Branch: claude/happy-goldberg-AFQPj
4. Build: `pnpm build`
5. Start: `pnpm --filter @imbobi/web start`
6. Env vars:
   - NEXT_PUBLIC_API_URL=https://api.staging.imbobi.com/api/v1
   - NODE_ENV=staging
7. Deploy
8. Verify: landing page, /cadastro, /dashboard, API calls

**Estimated total time:** 20 minutes

**Full guide:** RENDER_DEPLOYMENT_WEB_GUIDE.md

---

**Last Updated:** June 2, 2026  
**Questions?** See CLAUDE.md or contact project lead

# Web Staging Deployment — Quick Start

**Status:** ✅ Pronto para deploy  
**Last Updated:** 2026-06-02  
**Next Blocker:** ⏳ API Staging URL (Agent 3)

---

## One-Page Quick Reference

### Files You Need to Know

| File | Purpose | Status |
|------|---------|--------|
| `apps/web/.env.staging.example` | Environment template | ✅ Created |
| `apps/web/DEPLOYMENT.md` | Full deployment guide (3 options) | ✅ 310 lines |
| `apps/web/STAGING_SETUP.md` | Setup checklist & next steps | ✅ 244 lines |
| `.github/workflows/deploy-web-staging.yml` | Auto-deploy workflow | ✅ Ready |
| `apps/web/e2e/staging-validation.spec.ts` | E2E tests | ✅ 9 test cases |
| `WEB_STAGING_SUMMARY.md` | Full sprint summary | ✅ 449 lines |

### Build Status

```
✓ pnpm type-check    [7 packages, 0 errors]
✓ pnpm build         [39 pages, 87.5kB bundle]
✓ Standalone mode    [.next/standalone/server.js]
```

---

## Deployment Timeline

### When Agent 3 Provides API URL

```
1. Copy template (30 sec)
   cp apps/web/.env.staging.example apps/web/.env.staging

2. Edit with API URL (30 sec)
   # Add: NEXT_PUBLIC_API_URL=https://api-staging.imbobi.com

3. Deploy to Vercel (2 min)
   vercel --prod
   
   OR EC2 (5 min)
   docker build -f Dockerfile.staging -t imbobi-web:staging .
   docker run -p 80:3000 imbobi-web:staging
   
   OR Amplify (5 min)
   GitHub → Amplify Console → Auto-deploy

4. Validate (2 min)
   Run E2E tests:
   STAGING_URL=https://imbobi-staging.vercel.app \
     pnpm exec playwright test e2e/staging-validation.spec.ts

5. Setup auto-deploy (3 min)
   gh secret set VERCEL_TOKEN --body "<token>"
   gh secret set STAGING_API_URL --body "<url>"

TOTAL: < 10 minutes
```

---

## Which Deployment Option?

### Use Vercel if:
- Want zero configuration
- Need auto-deploy on push
- Like free tier with CDN
- → Recommended ⭐

### Use EC2 if:
- Need full control
- Want same host as API
- Like Docker
- → Advanced option

### Use Amplify if:
- Like managed services
- Want GitHub integration
- Prefer AWS ecosystem
- → Good option

---

## GitHub Secrets Needed

```bash
# If using Vercel (recommended)
gh secret set VERCEL_TOKEN --body "<vercel-token>"
gh secret set VERCEL_ORG_ID --body "<vercel-org-id>"
gh secret set VERCEL_PROJECT_ID --body "<vercel-project-id>"
gh secret set STAGING_API_URL --body "<api-staging-url>"
```

How to get tokens: See `.github/DEPLOYMENT_SECRETS.md`

---

## Validation Checklist

After deployment, verify:

```
☐ curl https://<staging-url> returns 200
☐ Landing page loads in browser
☐ Navigation links work
☐ DevTools: fetch('/api/auth/me') connects to API
☐ No CORS errors
☐ Responsive on mobile/tablet/desktop
☐ Meta tags present (viewport, description)
```

Run full E2E tests:
```bash
STAGING_URL=https://<your-url> \
  pnpm exec playwright test e2e/staging-validation.spec.ts
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| CORS error | Add web origin to API CORS config |
| Port conflict | Change NODE_PORT=3001 |
| Build fails | Run `pnpm type-check` to diagnose |
| Secrets not working | Check `.github/workflows/deploy-web-staging.yml` |
| API unreachable | Verify NEXT_PUBLIC_API_URL is correct |

---

## Documentation Map

```
Quick Start (you are here)
    ↓
apps/web/DEPLOYMENT.md ← Detailed guide (3 options)
    ↓
apps/web/STAGING_SETUP.md ← Checklist
    ↓
.github/DEPLOYMENT_SECRETS.md ← Secrets setup
    ↓
WEB_STAGING_SUMMARY.md ← Full report
```

---

## Git Commits Made

```
060c148 docs: add comprehensive web staging deployment summary report
95451d6 test: add E2E tests for staging validation
76ae1ce docs: add staging setup summary with checklist and next steps
f2dd029 ci: add GitHub Actions workflow for web staging auto-deploy
9c3ec68 docs: add comprehensive web deployment guide (Vercel, EC2, Amplify)
716fc0c config: add .env.staging.example template for web frontend
3dd8e8d web: enable standalone mode for staging deployment
```

---

## What's Ready Now

- ✅ Build artifacts (.next/standalone/)
- ✅ Environment configuration template
- ✅ 3 deployment options documented
- ✅ E2E tests implemented
- ✅ GitHub Actions workflow ready
- ✅ Auto-deploy configured

## What's Waiting

- ⏳ API staging URL from Agent 3
- ⏳ GitHub Secrets configuration
- ⏳ Actual deployment execution

---

**Status:** Ready to deploy  
**Time to Deploy (after Agent 3):** < 10 minutes  
**Recommendation:** Use Vercel (easiest, fastest)

For full details, read:
- `apps/web/DEPLOYMENT.md` — Complete guide
- `WEB_STAGING_SUMMARY.md` — Full report

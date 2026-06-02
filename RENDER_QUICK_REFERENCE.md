# Render Web Deployment — Quick Reference Card

**For:** imobi Next.js Web Frontend  
**Branch:** claude/happy-goldberg-AFQPj  
**Created:** June 2, 2026

---

## 5-Minute Setup Summary

### Service Settings
| Field | Value |
|-------|-------|
| Service Name | `imbobi-web-staging` |
| GitHub Repo | `contatovinicaetano93-commits/imobi` |
| Branch | `claude/happy-goldberg-AFQPj` |
| Build Command | `pnpm build` |
| Start Command | `pnpm --filter @imbobi/web start` |
| Region | `us-east-1` |
| Instance | Free tier (or Starter $7/month) |

### Environment Variables (Required)
```
NEXT_PUBLIC_API_URL = https://api.staging.imbobi.com/api/v1
NODE_ENV = staging
```

### Expected Result
```
✓ Web app live at: https://imbobi-web-staging.onrender.com
✓ Landing page loads
✓ /cadastro works
✓ /dashboard redirects to /login
✓ API calls go to api.staging.imbobi.com
```

---

## Verification Checklist

After deployment completes, check:

```
□ "Service is live" message appears in Render logs
□ Can access https://imbobi-web-staging.onrender.com (landing page)
□ Landing page shows hero section and CTA buttons
□ Click "Cadastro" button → loads /cadastro (registration form)
□ Manually visit /dashboard → redirects to /login (shows login form)
□ Open DevTools (F12) → Network tab → try login
  - Verify requests to https://api.staging.imbobi.com/api/v1
  - Response should be 200/201 or 400/401 (not connection error)
```

---

## Deployment Commands (Local Testing)

```bash
# Full build (monorepo)
pnpm build

# Start web app only
cd apps/web && npm start

# Or with pnpm workspace filter
pnpm --filter @imbobi/web start
```

---

## Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| Blank page / 404 | Check build logs. Try alt start: `cd apps/web && npm start` |
| `pnpm: command not found` | Use alt start command above |
| API calls fail | Verify `NEXT_PUBLIC_API_URL` in Env Variables |
| Slow builds (>10 min) | Upgrade to Starter instance tier |
| Module not found errors | Add env var: `PNPM_VERSION=9.0.0` and redeploy |

---

## Deploy Updates

**If auto-deploy enabled:**
```bash
git push origin claude/happy-goldberg-AFQPj
# → Render auto-deploys (3-5 min)
```

**If auto-deploy disabled:**
1. Render dashboard → Select service
2. Click "Redeploy" button
3. Wait for "Service is live"

**Hard refresh in browser:** Ctrl+Shift+R (or Cmd+Shift+R on Mac)

---

## URLs

| Service | URL |
|---------|-----|
| Web Frontend | `https://imbobi-web-staging.onrender.com` |
| Landing Page | `https://imbobi-web-staging.onrender.com` |
| Registration | `https://imbobi-web-staging.onrender.com/cadastro` |
| Login | `https://imbobi-web-staging.onrender.com/login` |
| API | `https://api.staging.imbobi.com/api/v1` |
| Render Dashboard | `https://dashboard.render.com` |

---

## Scaling

| Need | Action |
|------|--------|
| Better performance | Upgrade instance to Starter ($7/month) |
| Check metrics | Dashboard → "Metrics" tab |
| Rollback broken deploy | Dashboard → "Deployments" → click previous → "Redeploy" |
| Disable auto-deploy | Dashboard → "Settings" → toggle "Auto-Deploy" to No |

---

## Next Steps

1. ✓ Create Web Service on Render (follow main guide)
2. ✓ Verify all 5 checks above pass
3. Test critical user flows:
   - [ ] Sign up / registration
   - [ ] Login
   - [ ] View dashboard
4. Monitor first 24 hours in Render dashboard
5. (Optional) Configure custom domain `staging.imbobi.com`

---

**Full Guide:** See `RENDER_DEPLOYMENT_WEB_GUIDE.md`  
**Project Info:** See `CLAUDE.md`

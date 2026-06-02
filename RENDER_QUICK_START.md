# Render Deployment — Quick Start (5 Minutes)

This is the condensed version. For detailed explanations, see [RENDER_DEPLOYMENT_GUIDE.md](./RENDER_DEPLOYMENT_GUIDE.md).

---

## In 5 Easy Steps

### Step 1: Go to Render
- Visit [dashboard.render.com](https://dashboard.render.com)
- Sign in (create account if needed)
- Click **"New +"** → **"Web Service"**

### Step 2: Connect Repository
- Click **"GitHub"** (recommended) or paste public URL
- Search: `imobi`
- Click **"Connect"**

### Step 3: Configure Service
| Field | Value |
|-------|-------|
| Name | `imbobi-staging` |
| Branch | `claude/happy-goldberg-AFQPj` |
| Root Directory | `apps/web` |
| Build Command | `pnpm install && pnpm build` |
| Start Command | `pnpm --filter @imbobi/web start` |
| Region | `us-east-1` |
| Instance | `Starter` ($7/month) |

### Step 4: Add Environment Variables
| Name | Value |
|------|-------|
| `NEXT_PUBLIC_API_URL` | `https://api.staging.imbobi.com/api/v1` |
| `NODE_ENV` | `staging` |

Click **"Add"** for each variable.

### Step 5: Deploy
- Click **"Create Web Service"** (blue button)
- Wait for logs to show **"Service running"**
- Your app is live! 🎉

---

## After Deployment

| What | How to Check |
|------|--------------|
| **Service URL** | Top of dashboard (e.g., `imbobi-staging.onrender.com`) |
| **Landing Page** | Open `https://imbobi-staging.onrender.com` in browser |
| **Registration** | Go to `/cadastro` (e.g., `https://imbobi-staging.onrender.com/cadastro`) |
| **Dashboard** | Go to `/dashboard` (should redirect to `/login` if not authenticated) |
| **API Working** | Open browser console (F12) → Network tab → check API requests to `api.staging.imbobi.com` have status 200 |

---

## Troubleshooting (Quick Fixes)

| Problem | Fix |
|---------|-----|
| **Build fails: "pnpm not found"** | Change build command to: `npm install -g pnpm && pnpm install && pnpm build` |
| **Blank page / 500 error** | Check environment variable `NEXT_PUBLIC_API_URL` is correct |
| **Styles look broken** | Click **"Trigger deploy"** button to rebuild |
| **Page won't load** | Check API is running at `https://api.staging.imbobi.com/api/v1` |
| **API connection errors** | API must have CORS enabled for your Render URL (e.g., `https://imbobi-staging.onrender.com`) |

---

## Settings Reference

### Recommended Configuration
- **Runtime**: Node.js
- **Region**: us-east-1
- **Instance**: Starter (staging) or Standard (production)
- **Auto-deploy**: ON (if using GitHub)

### Build & Start Commands Breakdown
```bash
# Build: installs deps + builds all workspaces
pnpm install && pnpm build

# Start: runs only the web app
pnpm --filter @imbobi/web start
```

### Why These Commands?
- **Monorepo structure**: Uses pnpm workspaces
- **Build command** needs to install shared packages (`@imbobi/core`, `@imbobi/schemas`, `@imbobi/ui`)
- **Start command** uses `--filter` to run only the web app (faster than starting everything)

---

## Key URLs

| Environment | Web App | API |
|-------------|---------|-----|
| **Staging** | `https://imbobi-staging.onrender.com` | `https://api.staging.imbobi.com/api/v1` |
| **Production** | `https://imbobi.onrender.com` | `https://api.imbobi.com.br/api/v1` |

---

## What Gets Deployed

✅ **What is deployed**:
- Next.js web application
- All pages, components, styling (Tailwind CSS)
- Client-side code and assets

❌ **What is NOT deployed**:
- Database (PostgreSQL) — managed separately
- API — deployed to different service
- Redis/cache — managed separately
- Environment variables — configured in Render dashboard

---

## File Locations in Monorepo

For reference:
```
imobi/
├── apps/web/              ← This gets deployed to Render
│   ├── package.json       ← Web app dependencies
│   ├── next.config.js     ← Next.js configuration
│   ├── app/               ← App Router (pages)
│   └── ...
├── packages/              ← Shared packages (built during `pnpm build`)
│   ├── @imbobi/core
│   ├── @imbobi/schemas
│   └── @imbobi/ui
├── services/              ← API (deployed separately, not here)
│   └── api/
└── package.json           ← Monorepo root
```

---

## Deployment Timeline

| Stage | Time | What's Happening |
|-------|------|------------------|
| Preparation | < 1 min | Repository cloning, branch checkout |
| Install | 1-2 min | Dependencies downloaded via pnpm |
| Build | 2-3 min | TypeScript compilation, Next.js build |
| Start | < 1 min | Next.js server starting |
| **Total** | **3-5 min** | Service is live |

---

## After Going Live

1. **Test**: Verify landing page, registration, login pages work
2. **Share**: Send Render URL to team
3. **Monitor**: Check logs for errors (Logs tab)
4. **Monitor**: Watch Metrics tab for CPU/memory usage
5. **Update API**: If API URL changes, update `NEXT_PUBLIC_API_URL` in environment variables and trigger a redeploy

---

## Still Need Help?

- **Full guide**: See [RENDER_DEPLOYMENT_GUIDE.md](./RENDER_DEPLOYMENT_GUIDE.md)
- **Render docs**: [render.com/docs](https://render.com/docs)
- **imobi repo**: [GitHub](https://github.com/contatovinicaetano93-commits/imobi)

---

**This is a 5-minute deployment. You've got this!** ✨

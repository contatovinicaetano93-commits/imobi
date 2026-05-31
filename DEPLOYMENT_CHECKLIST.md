# 🚀 Deployment Checklist — Ready to Deploy

**Status:** ✅ Application Production-Ready  
**Date:** 31 de Maio de 2026  
**Branch:** `claude/happy-goldberg-AFQPj`  
**Estimated Time:** 30 minutes total

---

## 📋 Quick Summary

Your application has passed all E2E tests and is ready to deploy. All configuration files are prepared. You just need to:

1. **Create accounts** (Vercel + Railway) — 5 minutes
2. **Connect your GitHub repository** — 5 minutes  
3. **Configure environment variables** — 5 minutes
4. **Deploy frontend and backend** — 10 minutes
5. **Test production environment** — 5 minutes

---

## 🎯 STEP-BY-STEP DEPLOYMENT

### STEP 1: Create Vercel Account (Frontend Hosting)

**Time:** 2 minutes

1. Go to [vercel.com](https://vercel.com)
2. Click **"Sign Up"** → Use GitHub authentication
3. Authorize Vercel access to your GitHub account
4. ✅ **Done** — Vercel account ready

---

### STEP 2: Create Railway Account (Backend Hosting)

**Time:** 2 minutes

1. Go to [railway.app](https://railway.app)
2. Click **"Get Started"** → Use GitHub authentication
3. Authorize Railway access to your GitHub account
4. ✅ **Done** — Railway account ready

---

### STEP 3: Deploy Frontend to Vercel

**Time:** 5 minutes

1. In Vercel dashboard, click **"New Project"**
2. Select your GitHub repository (`contatovinicaetano93-commits/imobi`)
3. Select branch: **`claude/happy-goldberg-AFQPj`**
4. Click **"Configure Project"**
5. **Root Directory:** Leave empty (Vercel auto-detects)
6. Click **"Deploy"** → Vercel builds automatically

**Environment Variables:**
- Add variable: `NEXT_PUBLIC_API_URL`
- Value: `https://imobi-api.railway.app` (you'll get this URL from Railway in Step 4)

**Result:** Frontend deployed to `https://seu-projeto.vercel.app`

---

### STEP 4: Deploy Backend to Railway

**Time:** 10 minutes

#### 4.1 Create Railway Project

1. In Railway dashboard, click **"New Project"**
2. Select **"Deploy from GitHub"**
3. Select your repository and branch: `claude/happy-goldberg-AFQPj`
4. Railway will detect NestJS in `services/api`

#### 4.2 Add PostgreSQL Database

1. Click **"Add Service"** in project
2. Select **"PostgreSQL"** (version 14+)
3. Railway automatically adds `DATABASE_URL` environment variable ✅

#### 4.3 Add Redis Cache

1. Click **"Add Service"**
2. Select **"Redis"** (version 7+)  
3. Railway automatically adds `REDIS_HOST` and `REDIS_PORT` ✅

#### 4.4 Add Environment Variables

In Railway project settings, add:

```
NODE_ENV=production
PORT=3000
JWT_SECRET=<generate-below>
ENCRYPTION_KEY=<generate-below>
CORS_ORIGIN=https://seu-projeto.vercel.app
```

**Generate secure secrets:**

```bash
# JWT_SECRET (must be >64 characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# ENCRYPTION_KEY (base64)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

#### 4.5 Deploy

1. Click **"Deploy"** button in Railway
2. Monitor logs — takes ~2-3 minutes
3. When ready, you'll see: **"Deployment successful"**

**Result:** Backend deployed to `https://imobi-api.railway.app` (Railway generates this URL)

---

### STEP 5: Run Database Migrations

**Time:** 2 minutes

After Railway backend deploys:

1. In Railway, select API service
2. Click **"Shell"** tab
3. Run: `pnpm db:migrate`
4. Wait for migrations to complete ✅

---

### STEP 6: Update Frontend API URL

**Time:** 2 minutes

1. Go to Vercel project settings
2. Environment Variables → Edit `NEXT_PUBLIC_API_URL`
3. Set to: `https://imobi-api.railway.app`
4. Click **"Redeploy"** (or wait for auto-redeploy)

---

## 🧪 Test Production Environment

### Health Check

```bash
curl https://imobi-api.railway.app/api/v1/health
```

Expected response:
```json
{
  "status": "healthy",
  "database": "connected",
  "redis": "connected"
}
```

### Test Login Flow

1. Go to: `https://seu-projeto.vercel.app/cadastro`
2. **Signup** or use existing account:
   - Email: `test-1780239121@example.com`
   - Password: `TestPassword123!`
3. ✅ Should redirect to dashboard
4. Dashboard should load user profile
5. Click KYC Profile tab → should load
6. Click Crédito (Credit) tab → simulator should work

---

## 📊 Cost Estimate

| Service | Price | Notes |
|---------|-------|-------|
| **Vercel** | **Free** | Unlimited Next.js deployments |
| **Railway API** | **$5-10/mo** | After $5 monthly free tier |
| **Railway Database** | **Included** | PostgreSQL included in Railway |
| **Railway Redis** | **Included** | Redis included in Railway |
| **Total** | **~$7-10/mo** | Very affordable! |

---

## ⚠️ Troubleshooting

### "Cannot connect to API" or CORS error

**Fix:**
1. Verify `CORS_ORIGIN` in Railway matches Vercel URL exactly
2. Verify `NEXT_PUBLIC_API_URL` in Vercel is correct Railway URL
3. Check health endpoint: `curl https://api-url/api/v1/health`

### "Database connection failed"

**Fix:**
1. Check migrations ran: `pnpm db:migrate`
2. Verify `DATABASE_URL` in Railway is populated
3. Check Railway logs for errors

### "Build failed"

**Fix:**
1. Check Vercel build logs
2. Verify branch is `claude/happy-goldberg-AFQPj`
3. Ensure `pnpm install` completes

---

## ✅ Final Checklist

```
FRONTEND (Vercel):
├─ [  ] Vercel account created
├─ [  ] Repository connected
├─ [  ] Branch: claude/happy-goldberg-AFQPj selected
├─ [  ] NEXT_PUBLIC_API_URL configured
├─ [  ] Deploy completed
└─ [  ] Frontend accessible at vercel URL

BACKEND (Railway):
├─ [  ] Railway account created
├─ [  ] Project created with GitHub
├─ [  ] PostgreSQL service added
├─ [  ] Redis service added
├─ [  ] Environment variables configured
├─ [  ] Deploy completed
├─ [  ] Migrations ran successfully
└─ [  ] Health check returns 200 OK

INTEGRATION:
├─ [  ] Frontend can reach backend API
├─ [  ] Login works end-to-end
├─ [  ] Dashboard loads user profile
├─ [  ] KYC profile page accessible
└─ [  ] Credit simulator works
```

---

## 📞 Need Help?

**Detailed guide:** See `DEPLOY_GUIDE.md` for comprehensive step-by-step instructions

**Test report:** See `CHECKPOINT_3_REPORT.md` for verification of all features

**Deployment config:** 
- `vercel.json` — Frontend settings
- `railway.json` — Backend settings
- `.env.production.example` — Environment template

---

## 🎉 You're Ready!

Your application is fully tested and production-ready. The deployment process is straightforward and should take about 30 minutes total.

**Once deployed:**
1. Your web app will be live at `https://seu-projeto.vercel.app`
2. Your API will be live at `https://imobi-api.railway.app`
3. Everything will be automatically secured with HTTPS, rate limiting, and security headers

**Good luck! 🚀**

---

*Branch:* `claude/happy-goldberg-AFQPj`  
*Last Updated:* 2026-05-31  
*Status:* ✅ Ready for Production Deployment

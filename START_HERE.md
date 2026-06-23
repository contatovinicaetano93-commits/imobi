# 🚀 START HERE - Deployment in 3 Steps

**You are here**: All code ready, all scripts prepared, just need Railway URL

**Time estimate**: 75 minutes total (20 min manual + 45 min automated + 10 min testing)

---

## STEP 1: Create Railway Project (Manual - 20 minutes)

**What to do:**
1. Go to https://railway.app
2. Sign up / Login
3. Click "New Project"
4. Select "Deploy from GitHub"
5. Authorize GitHub & select: **contatovinicaetano93-commits/imobi**
6. Select branch: **claude/imobi-mvp-fintech-status-jrr2ab**
7. Add PostgreSQL database (wait for "Connected")
8. Add Redis cache (wait for "Connected")
9. Click on imobi-api service
10. Configure build: `pnpm install --frozen-lockfile && pnpm build --filter @imbobi/api`
11. Configure start: `node dist/main.js`
12. Click "Deploy"
13. **Copy your API URL** (looks like: `https://imobi-api-xyz.railway.app`)

**Details**: See `RAILWAY_QUICK_START.md` if you get stuck

---

## STEP 2: Run Automated Deployment (Automatic - 45 minutes)

**Once you have your Railway API URL**, run this ONE command:

```bash
bash scripts/deploy-orchestrator.sh
```

This will automatically:
- ✅ Verify API is responding
- ✅ Apply database migrations
- ✅ Run post-deployment verification (15 checks)
- ✅ Configure frontend with API URL
- ✅ Test authentication flow end-to-end

**That's it!** Everything else is automated.

---

## STEP 3: Verify & Go Live (Automatic - 10 minutes)

Once orchestrator completes successfully:

```bash
bash scripts/launch-checklist.sh https://<your-api-url>
```

This runs 30 comprehensive pre-launch checks.

**If all pass**: You're ready to go live! 🎉

**If any fail**: Check the error message and troubleshooting section in `EXECUTE_DEPLOYMENT.md`

---

## 📋 What Happens During `deploy-orchestrator.sh`

The script will:

1. **Check API is responding**
   ```
   ⏳ Verifying API URL...
   ✓ API is responding
   ```

2. **Ask you to run migrations** (manual step, 1 command)
   ```
   Go to Railway shell and run:
   cd services/api
   npx prisma migrate deploy --schema prisma/schema.prisma
   ```

3. **Run verification tests** (automated)
   ```
   ✓ Health check
   ✓ Database connected
   ✓ Redis connected
   ... (15 more checks)
   ```

4. **Create frontend config** (automated)
   ```
   ✓ Created apps/web/.env.local
   ```

5. **Test auth flow** (automated)
   ```
   ✓ Registration successful
   ✓ Login successful
   ✓ Protected endpoints working
   ```

6. **Show success summary** (if all passes)
   ```
   ✨ DEPLOYMENT COMPLETE
   
   API URL: https://imobi-api-xyz.railway.app
   Frontend Config: apps/web/.env.local
   
   Next: pnpm dev && open http://localhost:3001
   ```

---

## 🎯 Three Simple Commands

That's all you need to run:

```bash
# After Railway project is created:
bash scripts/deploy-orchestrator.sh

# After it completes:
bash scripts/launch-checklist.sh https://<your-api-url>

# If all checks pass:
cd apps/web && pnpm dev
```

Then open browser at http://localhost:3001 and test!

---

## ✅ Success Checklist

- [ ] Railway project created at https://railway.app
- [ ] PostgreSQL database connected
- [ ] Redis cache connected
- [ ] API service deployed (shows green)
- [ ] API URL copied (example: `https://imobi-api-xyz.railway.app`)
- [ ] `bash scripts/deploy-orchestrator.sh` ran successfully
- [ ] Migrations completed in Railway shell
- [ ] `bash scripts/launch-checklist.sh <url>` shows all green ✓
- [ ] Frontend starts: `cd apps/web && pnpm dev`
- [ ] Can register, login, and see dashboard

**All checked?** → 🎉 **You're live!**

---

## 🆘 If You Get Stuck

1. **API not responding?**
   - Check Railway dashboard → imobi-api → Logs
   - Verify DATABASE_URL, REDIS_HOST, JWT_SECRET are set
   - Wait for build to complete (green checkmark)

2. **Migrations failed?**
   - Check PostgreSQL is "Connected" in Railway
   - Run migration command again from Railway shell
   - Check for Prisma schema errors

3. **Launch checklist failing?**
   - See error message
   - Check EXECUTE_DEPLOYMENT.md troubleshooting section
   - Run: `curl https://<api-url>/health` to debug

4. **Frontend not connecting?**
   - Verify `apps/web/.env.local` has correct API URL
   - Check browser console (F12) for errors
   - See FRONTEND_API_INTEGRATION.md for debugging

---

## 📚 Reference Guides

**If you need detailed info:**
- Overall status: `MVP_STATUS_SNAPSHOT.md`
- Full execution guide: `EXECUTE_DEPLOYMENT.md`
- Railway setup details: `RAILWAY_QUICK_START.md`
- Frontend integration: `FRONTEND_API_INTEGRATION.md`
- Detailed deployment: `DEPLOYMENT_PLAYBOOK.md`
- Post-launch monitoring: `setup-monitoring.sh`

---

## ⏱️ Timeline

```
RIGHT NOW:
  Go to https://railway.app
  Create project
  Add databases
  Deploy API
  Time: ~20 minutes

THEN:
  Run: bash scripts/deploy-orchestrator.sh
  Time: ~45 minutes

FINALLY:
  Run: bash scripts/launch-checklist.sh <url>
  Time: ~5 minutes

RESULT:
  🚀 Production deployment live!
```

---

## 🎉 Ready?

1. **Go to Railway**: https://railway.app
2. **Create your project** (follow steps above, ~20 min)
3. **Copy the API URL**
4. **Run one command**: `bash scripts/deploy-orchestrator.sh`
5. **Celebrate! 🎉**

---

**Status**: 🟢 Ready to deploy  
**Next action**: Create Railway project  
**Questions?** Check `EXECUTE_DEPLOYMENT.md`  

**Let's go! 🚀**

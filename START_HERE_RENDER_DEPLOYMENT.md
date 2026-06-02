# START HERE - Render Deployment for imobi NestJS API

## What You Need

A comprehensive guide for deploying the **imobi NestJS API** (backend) to Render has been created.

### Key Documents (Use in This Order)

1. **START_HERE_RENDER_DEPLOYMENT.md** (this file)
   - You are here. High-level overview.

2. **RENDER_DEPLOYMENT_INDEX.md** (choose your path)
   - Navigation guide. Pick your deployment scenario.
   - Use this if: Unsure which guide to follow.

3. **RENDER_DEPLOYMENT_SUMMARY.md** (5-minute overview)
   - Quick facts and next steps.
   - Use this if: You want the 5-minute version before diving in.

4. **RENDER_DEPLOYMENT_GUIDE.md** (comprehensive, 20 min read)
   - Full step-by-step instructions with detailed explanations.
   - Use this if: First time deploying or want to understand everything.

5. **RENDER_DEPLOYMENT_CHECKLIST.md** (actionable, during deployment)
   - Checkbox-friendly task list with quick links.
   - Use this if: You're ready to deploy and want to track progress.

6. **RENDER_ENV_TEMPLATE.txt** (copy-paste variables)
   - Environment variable template with placeholders.
   - Use this when: In Render dashboard entering environment variables.

---

## Quick Facts

| Item | Value |
|------|-------|
| **Service to Deploy** | NestJS API Backend |
| **Repository** | contatovinicaetano93-commits/imobi |
| **Branch** | claude/happy-goldberg-AFQPj |
| **Service Path** | services/api |
| **Framework** | NestJS + Fastify |
| **Runtime** | Node.js 20+ |
| **Database** | PostgreSQL |
| **Cache** | Redis |
| **Expected URL** | https://imbobi-api-staging.onrender.com |

---

## Three Ways to Use These Guides

### Path A: First-Time Deployer
You're deploying this API to Render for the first time.

1. Read: RENDER_DEPLOYMENT_SUMMARY.md (5 min)
2. Read: RENDER_DEPLOYMENT_GUIDE.md (20 min)
3. During deployment: Use RENDER_DEPLOYMENT_CHECKLIST.md
4. Reference: RENDER_ENV_TEMPLATE.txt (for env variables)

**Total time:** ~40 minutes including deployment

---

### Path B: Quick Deployer
You've done this before, just need reminders.

1. Use: RENDER_DEPLOYMENT_CHECKLIST.md (follow each checkbox)
2. Reference: RENDER_ENV_TEMPLATE.txt (copy variables)

**Total time:** ~15 minutes

---

### Path C: Just the Template
You know how Render works, just need the variable template.

1. Use: RENDER_ENV_TEMPLATE.txt (copy-paste into Render dashboard)

**Total time:** ~5 minutes

---

## What Happens When You Deploy

1. **Create Render Web Service** (5 min)
   - Connect GitHub repo
   - Set build and start commands
   - Configure root directory

2. **Add Environment Variables** (10 min)
   - Generate secrets
   - Configure database, Redis, AWS, CORS
   - Save variables (service auto-restarts)

3. **Deploy** (5-10 min)
   - Click Deploy button
   - Watch build logs
   - Service goes live

4. **Verify** (5 min)
   - Test health endpoint
   - Check CORS headers
   - Verify no errors in logs

5. **Update Web/Mobile Apps** (5 min)
   - Set API URL in web app
   - Set API URL in mobile app
   - Redeploy web and mobile

**Total time:** ~40 minutes

---

## Before You Start

Gather these items (you'll need them):

### Database
- PostgreSQL host (e.g., `my-db.rds.amazonaws.com`)
- Username
- Password
- Database name (e.g., `imobi_staging`)

### Redis
- Host (e.g., `my-redis.elasticache.amazonaws.com`)
- Port (usually `6379`)
- Password

### AWS S3
- S3 bucket name
- AWS Access Key ID
- AWS Secret Access Key

### Secrets to Generate
```bash
# Run this twice, copy each output
openssl rand -base64 32
```
- First output → JWT_SECRET
- Second output → ENCRYPTION_KEY

### Domains
- Web app URL (for CORS_ORIGIN)
- Mobile app URL (for CORS_ORIGIN)

---

## The Build & Start Commands

**Build Command:**
```bash
cd services/api && npm install && npm run build
```

**Start Command:**
```bash
cd services/api && npm start
```

These are provided in RENDER_DEPLOYMENT_GUIDE.md Step 1.4

---

## After Deployment

### Verify It Works
```bash
# Test health endpoint
curl https://imbobi-api-staging.onrender.com/api/v1/health

# Should return:
# {"status":"ok","timestamp":"2026-06-02T..."}
```

### Update Your Apps
- Web: `NEXT_PUBLIC_API_URL=https://imbobi-api-staging.onrender.com/api/v1`
- Mobile: `EXPO_PUBLIC_API_URL=https://imbobi-api-staging.onrender.com/api/v1`

### Monitor
- Watch logs for 24 hours
- Check for any ERROR or EXCEPTION messages

---

## Still Unsure?

### "Which guide should I use?"
→ Read **RENDER_DEPLOYMENT_INDEX.md** (it will guide you)

### "Give me 5-minute version"
→ Read **RENDER_DEPLOYMENT_SUMMARY.md**

### "I'm ready to deploy, step by step"
→ Use **RENDER_DEPLOYMENT_CHECKLIST.md**

### "I need environment variables"
→ Reference **RENDER_ENV_TEMPLATE.txt**

### "Something went wrong"
→ Read **RENDER_DEPLOYMENT_GUIDE.md** "Troubleshooting" section

### "I need every detail"
→ Read **RENDER_DEPLOYMENT_GUIDE.md** (comprehensive)

---

## Important Reminders

- **Never commit secrets to git** (.env files should not be in repo)
- **Generate new secrets** for production (never reuse staging)
- **JWT_SECRET must be 64+ characters** for production
- **CORS_ORIGIN** must include all domains calling the API
- **Database backups** should be enabled before production
- **Monitor logs** for 24 hours after deployment

---

## Support

- **Full Render Docs:** https://render.com/docs
- **NestJS Docs:** https://docs.nestjs.com
- **Project Repo:** https://github.com/contatovinicaetano93-commits/imobi
- **Questions:** contato.vinicaetano93@gmail.com

---

## Your Next Step

Choose one:

- **First time?** → Read `RENDER_DEPLOYMENT_SUMMARY.md`
- **In a hurry?** → Use `RENDER_DEPLOYMENT_CHECKLIST.md`
- **Need full details?** → Read `RENDER_DEPLOYMENT_GUIDE.md`
- **Just need variables?** → Reference `RENDER_ENV_TEMPLATE.txt`

---

**Created:** June 2, 2026  
**Status:** Ready to deploy  
**Contact:** contato.vinicaetano93@gmail.com

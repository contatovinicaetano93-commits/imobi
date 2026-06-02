# imobi on Render — Quick Reference Card

**Print this card and keep it while deploying!**

---

## The 5 Services You're Creating

```
┌─────────────────────────────────────────────────────────┐
│ 1. PostgreSQL Database                                  │
│    Name: imobi-staging-db                               │
│    Database: imobi_staging                              │
│    Region: Ohio (or your choice)                        │
│    Version: 14+                                         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 2. Redis Cache                                          │
│    Name: imobi-staging-cache                            │
│    Region: Ohio (SAME as PostgreSQL)                    │
│    Version: 7+                                          │
│    Policy: allkeys-lru                                  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 3. API Web Service (Backend)                            │
│    Name: imbobi-api-staging                             │
│    Branch: claude/happy-goldberg-AFQPj                  │
│    Root: services/api                                   │
│    Build: npm install -g pnpm && pnpm install && pnpm  │
│            build                                        │
│    Start: pnpm --filter @imbobi/api start               │
│    Plan: Starter ($7)                                   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 4. Web Web Service (Frontend)                           │
│    Name: imbobi-web-staging                             │
│    Branch: claude/happy-goldberg-AFQPj                  │
│    Root: apps/web                                       │
│    Build: npm install -g pnpm && pnpm install && pnpm  │
│            build                                        │
│    Start: pnpm --filter @imbobi/web start               │
│    Plan: Starter ($7)                                   │
└─────────────────────────────────────────────────────────┘
```

---

## Critical Environment Variables

### API Service Variables

```
NODE_ENV=staging
PORT=4000

DATABASE_URL=[copy from PostgreSQL Connections section]
REDIS_URL=[copy from Redis Connections section]

JWT_SECRET=[run: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"]
ENCRYPTION_KEY=[run same command again with different output]

CORS_ORIGIN=https://imbobi-web-staging.onrender.com,http://localhost:3000

AWS_REGION=us-east-1
AWS_S3_BUCKET=imobi-staging-assets
AWS_ACCESS_KEY_ID=[from AWS IAM]
AWS_SECRET_ACCESS_KEY=[from AWS IAM]

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=[your email]
SMTP_PASS=[app password]
SMTP_FROM=noreply@imbobi.com
```

### Web Service Variables

```
NEXT_PUBLIC_API_URL=https://imbobi-api-staging.onrender.com/api/v1
NODE_ENV=staging
```

---

## Menu Navigation Paths

### Create PostgreSQL
```
Dashboard → New + → PostgreSQL → Fill Form → Create Database
```

### Create Redis
```
Dashboard → New + → Redis → Fill Form → Create Redis
```

### Create API Service
```
Dashboard → New + → Web Service → GitHub Connect → Fill Form → Create Web Service
```

### Create Web Service
```
Dashboard → New + → Web Service → GitHub Connect → Fill Form → Create Web Service
```

### Add Environment Variables
```
Service Page → Environment Tab → Key Field → Value Field → Add → Save
```

### Check Deployment Status
```
Service Page → Logs Tab → Look for "Service running" (green)
```

### Restart Service
```
Service Page → Settings Tab → Restart Service
```

---

## Values to Copy & Save

**When PostgreSQL is "Available":**
```
From: Connections section
Copy: Internal Database URL
Save as: DATABASE_URL = ___________________________________
```

**When Redis is "Available":**
```
From: Connections section
Copy: Internal Redis URL
Save as: REDIS_URL = ___________________________________
```

**After Services Deployed:**
```
API URL: https://imbobi-api-staging.onrender.com
Web URL: https://imbobi-web-staging.onrender.com
```

---

## What Status Means

| Status | Meaning | Next Step |
|--------|---------|-----------|
| Creating... | Building resource | Wait (2-5 min) |
| Available | Ready to use | Copy connection strings |
| Building | Compiling code | Wait (2-5 min) |
| Deploying | Starting service | Wait (1 min) |
| Live | ✅ Running | Test it! |
| Failed | ❌ Error occurred | Check logs for error |

---

## Good Signs in Logs

✅ "pnpm install" completed  
✅ "npm run build" succeeded  
✅ "Database connection successful"  
✅ "Redis connection successful"  
✅ "NestJS running on port 4000" (API)  
✅ "ready - started server on" (Web)  
✅ "Service running"  

---

## Bad Signs in Logs

❌ "pnpm: command not found"  
❌ "Cannot find module @imbobi/schemas"  
❌ "DATABASE_URL not set"  
❌ "Error: connect ECONNREFUSED"  
❌ "Error: connect ETIMEDOUT"  

**Fix**: Check environment variables are set correctly

---

## Critical Checks Before Going Live

- [ ] PostgreSQL status: "Available"
- [ ] Redis status: "Available"
- [ ] API service status: "Live"
- [ ] Web service status: "Live"
- [ ] API health endpoint responds: `/api/v1/health`
- [ ] Web app loads in browser
- [ ] All environment variables saved
- [ ] No red errors in logs
- [ ] Can register test user
- [ ] Can log in with test user

---

## Costs

| Service | Plan | Monthly Cost |
|---------|------|--------------|
| PostgreSQL | Starter | Free |
| Redis | Starter | Free |
| API | Starter | $7 |
| Web | Starter | $7 |
| **Total** | | **$14/month** |

*Upgrade to Standard ($25 each) for production*

---

## Your Service Names & URLs

Write these down when created:

```
API Service Name: imbobi-api-staging
API Service URL:  https://imbobi-api-staging.onrender.com
API Health Check: https://imbobi-api-staging.onrender.com/api/v1/health

Web Service Name: imbobi-web-staging
Web Service URL:  https://imbobi-web-staging.onrender.com
```

---

## Common Fixes (TL;DR)

| Problem | Fix |
|---------|-----|
| Build fails: "pnpm not found" | Add to build: `npm install -g pnpm &&` |
| Can't find module error | Set Root Directory to `services/api` or `apps/web` |
| DATABASE_URL error | Add to Environment: `DATABASE_URL=[your-db-url]` |
| Blank page / 500 error | Check `NEXT_PUBLIC_API_URL` is correct |
| Connection timeout | Check regions match (DB and service) |
| CORS error | Add to CORS_ORIGIN: your web service URL |
| Service keeps restarting | Check logs for error messages |

---

## Commands You Need

### Generate JWT_SECRET
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Generate ENCRYPTION_KEY
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Test API Health
```bash
curl https://imbobi-api-staging.onrender.com/api/v1/health
```

---

## Emergency Contacts

| Issue | Resource |
|-------|----------|
| Render Help | https://render.com/docs |
| GitHub Issues | https://github.com/contatovinicaetano93-commits/imobi |
| NestJS Docs | https://docs.nestjs.com |
| Next.js Docs | https://nextjs.org/docs |

---

**Print this. Tape it to your monitor. Deploy with confidence!** 🚀

---

**Last Updated**: June 2, 2026  
**Repository**: imobi (Monorepo)  
**Status**: Ready to Deploy

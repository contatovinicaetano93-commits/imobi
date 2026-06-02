# iMobi Render Deployment Package

Complete deployment documentation and tools for iMobi on Render.

## Files Included

### 1. QUICK_REFERENCE.md (4 KB)
**Start here!** Condensed command reference with copy-paste commands.

**Best for:** Quick lookups, getting started fast
- Security credential generation
- Environment variable templates
- Common health check commands
- Test credentials
- File locations

**Reading time:** 5-10 minutes

---

### 2. DEPLOYMENT_COMMANDS.md (21 KB)
Comprehensive deployment guide with detailed explanations.

**Best for:** First-time deployment, understanding the full process
- Complete security credentials explanation
- Full environment variables reference table
- Database setup (PostgreSQL + PostGIS)
- Migration commands
- Seed data documentation
- 6 health check types
- 12 troubleshooting scenarios
- Performance tuning

**Reading time:** 20-30 minutes

**Sections:**
```
1. Generate Security Credentials
2. Environment Variables Reference
3. Pre-Deployment Checklist
4. Render Service Configuration
5. Database Setup
6. Seed Data
7. Health Checks
8. Troubleshooting
```

---

### 3. verify-deployment.sh (13 KB)
Automated health check script for validating deployment.

**Best for:** Post-deployment verification, monitoring
- Interactive and automatic modes
- 9 automated tests
- Color-coded output
- Pass/fail statistics
- SSL certificate validation
- Response time measurement

**Usage:**
```bash
# Interactive (prompts for URLs)
./verify-deployment.sh

# Automatic (with URLs)
./verify-deployment.sh https://api-xxx.render.com https://web-xxx.render.com

# Show help
./verify-deployment.sh --help
```

**Tests performed:**
1. API health endpoint
2. API connectivity
3. API version endpoint
4. API authentication
5. CORS configuration
6. Response times
7. Web service health
8. SSL certificate
9. Environment variables

---

## Recommended Reading Order

### For First-Time Deployment:

1. **QUICK_REFERENCE.md** (5 min)
   - Get overview of what's needed
   - Generate credentials

2. **DEPLOYMENT_COMMANDS.md** (20 min)
   - Read sections 1-3 (Credentials, Variables, Checklist)
   - Read section 4 (Render Configuration)

3. **Create Render Services**
   - PostgreSQL
   - Redis
   - API service
   - Web service

4. **Set Environment Variables**
   - Use tables from DEPLOYMENT_COMMANDS.md
   - Reference QUICK_REFERENCE.md for values

5. **Deploy**
   - Push to GitHub
   - Render auto-deploys

6. **Run Migrations & Seed**
   - Follow DEPLOYMENT_COMMANDS.md section 5-6

7. **Verify Deployment**
   - Run `./verify-deployment.sh`

---

### For Troubleshooting:

1. Check **verify-deployment.sh** output
   - See which test failed

2. Go to **DEPLOYMENT_COMMANDS.md** → Troubleshooting
   - Find issue by name
   - Follow fix steps

3. Check **QUICK_REFERENCE.md** → Health Checks
   - Run manual verification command

---

### For Reference:

- **Environment variables:** DEPLOYMENT_COMMANDS.md or QUICK_REFERENCE.md
- **Health checks:** verify-deployment.sh or DEPLOYMENT_COMMANDS.md
- **Commands:** QUICK_REFERENCE.md (concise) or DEPLOYMENT_COMMANDS.md (detailed)
- **Troubleshooting:** DEPLOYMENT_COMMANDS.md section 8

---

## Quick Command Summary

```bash
# 1. Generate credentials (run on local machine)
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# 2. Run migrations (after API is live)
DATABASE_URL="postgresql://..." pnpm db:migrate

# 3. Seed database (optional)
DATABASE_URL="postgresql://..." pnpm --filter @imbobi/api seed

# 4. Verify everything works
./verify-deployment.sh https://api-xxx.render.com https://web-xxx.render.com

# 5. Test health
curl https://api-xxx.render.com/api/v1/health
```

---

## Environment Variables Checklist

Copy to Render Environment Variables section:

### Database & Core
- [ ] DATABASE_URL (from PostgreSQL service)
- [ ] NODE_ENV=production
- [ ] PORT=4000

### Security (Generate these)
- [ ] JWT_SECRET (generate with node command)
- [ ] JWT_EXPIRES_IN=15m
- [ ] JWT_REFRESH_EXPIRES_IN=7d
- [ ] ENCRYPTION_KEY (generate with node command)

### Cache & Queue
- [ ] REDIS_HOST (from Redis service)
- [ ] REDIS_PORT=6379
- [ ] REDIS_PASSWORD (from Redis service)

### API Configuration
- [ ] CORS_ORIGIN=https://[your-web-domain]

### Storage
- [ ] AWS_REGION=us-east-1
- [ ] AWS_ACCESS_KEY_ID (from AWS IAM)
- [ ] AWS_SECRET_ACCESS_KEY (from AWS IAM)
- [ ] S3_BUCKET=imbobi-evidencias-prod

### Email (Choose ONE provider)
- [ ] EMAIL_PROVIDER=sendgrid (or ses or smtp)
- [ ] SENDGRID_API_KEY (or AWS/SMTP config)

### Notifications
- [ ] FIREBASE_PROJECT_ID (from Firebase)
- [ ] FIREBASE_PRIVATE_KEY (from Firebase JSON)
- [ ] FIREBASE_CLIENT_EMAIL (from Firebase JSON)

### Web Service
- [ ] NEXT_PUBLIC_API_URL=https://[your-api-domain]

---

## Support & Documentation

### Internal References
- Project guide: `CLAUDE.md`
- API config: `services/api/.env.example`
- Dockerfiles: `services/api/Dockerfile`, `apps/web/Dockerfile`
- Seed data: `services/api/src/seeds/seed.ts`

### External Resources
- Render Docs: https://render.com/docs
- Prisma Migration: https://www.prisma.io/docs/orm/prisma-migrate
- PostGIS: https://postgis.net/documentation
- NestJS: https://docs.nestjs.com/deployment
- Next.js: https://nextjs.org/docs/deployment

### Questions?
Contact: contato.vinicaetano93@gmail.com

---

## Deployment Checklist

- [ ] Read QUICK_REFERENCE.md
- [ ] Generate JWT_SECRET and ENCRYPTION_KEY
- [ ] Create PostgreSQL database in Render
- [ ] Create Redis instance in Render
- [ ] Create API service in Render
- [ ] Create Web service in Render
- [ ] Set all environment variables (see checklist above)
- [ ] Push to GitHub (Render auto-deploys)
- [ ] Wait for build to complete
- [ ] Run database migrations
- [ ] Seed database (optional)
- [ ] Run `./verify-deployment.sh` to verify
- [ ] Check API health endpoint with curl
- [ ] Test login with seed credentials
- [ ] Verify photos upload to S3
- [ ] Verify emails are sent
- [ ] Monitor logs for errors

---

**Created:** 2026-06-02
**Stack:** Turborepo + Next.js 14 + NestJS + PostgreSQL + Redis + Render
**Status:** Production-ready

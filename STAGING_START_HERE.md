# START HERE - Staging Deployment Guide for imbobi

**Project:** imbobi Fintech Platform  
**Date:** 2026-05-27  
**Status:** Production Ready

---

## Pick Your Path

### I'm in a hurry (5 min)
1. Read: **STAGING_README.md**
2. Run: `bash scripts/staging-init.sh`
3. Run: `bash scripts/staging-deploy.sh`
4. Run: `bash scripts/staging-health-check.sh`

### I want step-by-step (30 min)
Follow: **STAGING_EXECUTION_GUIDE.md**
- Every command is copy/paste ready
- Includes environment setup
- Troubleshooting for each step

### I need a checklist (to print)
Use: **STAGING_DEPLOYMENT_CHECKLIST.md**
- Pre-deployment checklist
- Deployment verification steps
- Post-deployment validation
- Rollback procedures

### I need quick reference
Run: `bash STAGING_QUICK_REFERENCE.sh`
- Interactive command reference
- All commands in one place

### I want deep technical knowledge
Read: **STAGING_DEPLOYMENT_PLAN.md**
- 1100+ lines of complete procedures
- All configuration details
- Advanced monitoring & troubleshooting

---

## The 7-Step Deployment Process

```
1. Create .env.staging (with AWS, Firebase, SendGrid credentials)
                ↓
2. bash scripts/staging-init.sh (validate infrastructure)
                ↓
3. bash scripts/staging-deploy.sh (build, migrate, deploy)
                ↓
4. bash scripts/staging-health-check.sh (verify services)
                ↓
5. bash scripts/staging-e2e.sh (run full test suite)
                ↓
6. Manual testing (open https://staging-app.imbobi.com)
                ↓
7. Monitor logs (30 minutes - docker logs -f imbobi-api-staging)
```

---

## Essential Files

| File | Size | Purpose |
|------|------|---------|
| STAGING_README.md | 11 KB | Master index & quick start |
| STAGING_EXECUTION_GUIDE.md | 15 KB | Copy/paste commands |
| STAGING_DEPLOYMENT_CHECKLIST.md | 9.4 KB | Printable checklist |
| STAGING_QUICK_REFERENCE.sh | 13 KB | Interactive reference |
| STAGING_DEPLOYMENT_PLAN.md | 35 KB | Complete procedures |

---

## Essential Scripts

| Script | Purpose |
|--------|---------|
| `staging-init.sh` | Validate infrastructure (AWS S3, RDS, Redis, Firebase, SendGrid) |
| `staging-deploy.sh` | Build → Migrate DB → Deploy Docker container |
| `staging-health-check.sh` | Test API, DB, Redis, Email, Firebase, S3 |
| `staging-e2e.sh` | Complete user flow tests |
| `staging-rollback.sh` | Automated rollback procedure |

---

## Critical Environment Variables

Create `.env.staging` file with:

```bash
# Core
PORT=4000
NODE_ENV=staging

# Database (RDS PostgreSQL 15 + PostGIS)
DATABASE_URL=postgresql://imbobi_staging:PASSWORD@staging-db...

# Cache (Redis)
REDIS_HOST=staging-redis...
REDIS_PORT=6379

# Security (generate: openssl rand -base64 32)
JWT_SECRET=<64-chars>
JWT_REFRESH_SECRET=<64-chars>
ENCRYPTION_SECRET=<32-chars>

# AWS S3
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET=imbobi-staging-evidencias

# Email (SendGrid)
SENDGRID_API_KEY=...
SMTP_FROM=noreply-staging@imbobi.com

# Firebase
FIREBASE_PROJECT_ID=imbobi-staging
FIREBASE_PRIVATE_KEY=...
FIREBASE_CLIENT_EMAIL=...

# External APIs
UNICO_API_KEY=...
SERPRO_TOKEN=...

# Frontends
NEXT_PUBLIC_API_URL=https://staging-api.imbobi.com
EXPO_PUBLIC_API_URL=https://staging-api.imbobi.com
```

**WARNING:** Do NOT commit `.env.staging` - it contains secrets!

---

## Health Check Endpoints

After deployment, verify all services:

```bash
# All services
curl -s https://staging-api.imbobi.com/api/v1/health | jq .

# API
curl -s https://staging-api.imbobi.com/api/v1/status | jq .

# Database
curl -s https://staging-api.imbobi.com/api/v1/health/database | jq .

# Redis
curl -s https://staging-api.imbobi.com/api/v1/health/redis | jq .

# Email
curl -s https://staging-api.imbobi.com/api/v1/health/email | jq .

# Firebase
curl -s https://staging-api.imbobi.com/api/v1/health/firebase | jq .

# S3
curl -s https://staging-api.imbobi.com/api/v1/health/s3 | jq .
```

Expected: HTTP 200 with `status: ok`

---

## E2E Test Coverage

Runs 5 complete tests:
1. User registration & login
2. User profile retrieval
3. File upload to S3
4. Credit simulation (with GPS)
5. Rate limiting validation

```bash
bash scripts/staging-e2e.sh https://staging-api.imbobi.com
```

---

## If Something Breaks

### Soft Rollback (Code Only)
```bash
docker stop imbobi-api-staging
docker run -d --name imbobi-api-staging ... imbobi-api:staging-<previous-sha>
curl -f https://staging-api.imbobi.com/api/v1/health
```

### Full Rollback (Code + Database)
```bash
bash scripts/staging-rollback.sh
```

### Emergency Stop (All Services)
```bash
docker stop imbobi-api-staging imbobi-postgres-staging imbobi-redis-staging
docker logs imbobi-api-staging | tail -100
```

---

## Monitoring

**View live logs:**
```bash
docker logs -f imbobi-api-staging
```

**Automated health checks (every 5 min):**
```bash
(crontab -l 2>/dev/null; echo "*/5 * * * * bash /home/user/alagami-site/scripts/staging-health-check.sh") | crontab -
```

---

## Quick Troubleshooting

| Issue | Fix |
|-------|-----|
| API not responding | `docker logs imbobi-api-staging \| tail -50` |
| Database error | Verify DATABASE_URL, check RDS security group |
| Redis timeout | Verify REDIS_HOST, check ElastiCache status |
| Email down | Verify SENDGRID_API_KEY, test health endpoint |
| Firebase failing | Verify FIREBASE_PROJECT_ID & FIREBASE_PRIVATE_KEY |

---

## Support

- **Backend Issues:** Slack #imbobi-backend
- **Database Issues:** Slack #imbobi-dba
- **AWS Issues:** Slack #imbobi-cloud
- **Deployment Stuck:** Slack @devops-oncall
- **Critical Outage:** Slack @incident-commander

---

## What's Next?

1. ✅ Read this file (you're here!)
2. ✅ Choose your path above
3. ✅ Create `.env.staging`
4. ✅ Run `bash scripts/staging-init.sh`
5. ✅ Run `bash scripts/staging-deploy.sh`
6. ✅ Verify with health checks
7. ✅ Run E2E tests
8. ✅ Test manually
9. ✅ Monitor logs
10. ✅ Post in Slack

---

**Questions?** Check the relevant guide or contact your DevOps team.

**Version:** 1.0  
**Status:** Production Ready  
**Last Updated:** 2026-05-27

# 🚀 Quick Start: One-Click Staging Deployment

Deploy imobi to staging in 2 simple steps.

---

## Prerequisites

Before you start, you'll need:

- **Docker** (Desktop or Server) — [Install](https://docs.docker.com/get-docker/)
- **Node.js 20+** — [Install](https://nodejs.org/)
- **pnpm 9.0+** — `npm install -g pnpm`
- **Git** — [Install](https://git-scm.com/)

**Infrastructure credentials:**
- AWS S3 bucket (for photos)
- Email service (SendGrid/SES/SMTP)
- Firebase project (for push notifications)

---

## Step 1: Set Up Credentials (5 minutes)

```bash
# Clone or navigate to the repository
git clone https://github.com/contatovinicaetano93-commits/imobi.git
cd imobi

# Checkout the staging branch
git checkout claude/happy-goldberg-AFQPj

# Run the interactive credentials setup
bash SETUP_CREDENTIALS.sh
```

This script will:
- Generate secure JWT and encryption keys
- Ask for your AWS S3 credentials
- Ask for your email provider (SendGrid/SES/SMTP)
- Ask for your Firebase project details
- Automatically configure `.env.staging` with all credentials

**What you'll need ready:**
- AWS Access Key ID & Secret
- S3 bucket name
- Email provider API key or SMTP credentials
- Firebase project ID, client email, and private key

---

## Step 2: Deploy (10 minutes)

```bash
# Run the automated deployment script
bash DEPLOY.sh
```

This script will:
1. ✅ Check prerequisites
2. ✅ Install dependencies
3. ✅ Type-check all packages
4. ✅ Build production artifacts
5. ✅ Start Docker infrastructure (PostgreSQL + Redis)
6. ✅ Run database migrations
7. ✅ Start API and Web servers
8. ✅ Run security validation tests
9. ✅ Display access information

**Total time: ~10 minutes**

---

## Access Your Staging Environment

Once the deployment completes, you'll see:

```
Web:  http://localhost:3000
API:  http://localhost:4000
Docs: http://localhost:4000/api/docs
```

---

## What Gets Deployed

### Web Application (Next.js)
- User dashboard
- KYC management
- Credit simulator
- Construction project tracking

### API (NestJS)
- User authentication
- KYC document management
- Project management
- Evidence tracking

### Database
- PostgreSQL 16 with PostGIS
- Automatic migrations applied
- All schema initialized

### Cache & Queue
- Redis 7
- Automatic caching setup
- Job queue ready for background tasks

---

## Testing Your Deployment

### 1. Test User Registration
```bash
curl -X POST http://localhost:4000/api/v1/auth/cadastro \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Test User",
    "email": "test@staging.local",
    "cpf": "12345678901",
    "telefone": "11999999999",
    "senha": "SecurePassword123!"
  }'
```

### 2. Test Web Frontend
Open http://localhost:3000 in your browser
- Try registration
- Try login
- Navigate dashboards

### 3. Run Security Validation
```bash
bash tests/security-validation.sh
```

---

## Troubleshooting

### "Docker not found"
```bash
# Install Docker from https://docs.docker.com/get-docker/
docker --version  # Verify installation
```

### "Cannot connect to database"
```bash
# Verify Docker containers are running
docker compose -f docker-compose.staging.yml ps

# Check database credentials in .env.staging
grep DATABASE_URL .env.staging

# Test connection manually
psql $(grep DATABASE_URL .env.staging | cut -d'=' -f2-)
```

### "Services failed to start"
```bash
# Check API logs
tail -f /tmp/api.log

# Check Web logs
tail -f /tmp/web.log

# Check Docker logs
docker compose -f docker-compose.staging.yml logs
```

### "Port already in use"
If port 3000 or 4000 is already in use:
```bash
# Change ports in .env.staging
PORT=4001  # for API
# Then restart services
```

---

## Management Commands

### View Logs
```bash
# API logs
tail -f /tmp/api.log

# Web logs
tail -f /tmp/web.log

# Docker logs
docker compose -f docker-compose.staging.yml logs -f
```

### Stop Services
```bash
# Stop API and Web (they're running as background processes)
pkill -f "pnpm.*start:prod"
pkill -f "pnpm.*@imbobi/web"

# Stop Docker containers
docker compose -f docker-compose.staging.yml down
```

### Restart Services
```bash
# Start only services (keep Docker containers running)
NODE_ENV=staging pnpm --filter @imbobi/api start:prod &
NODE_ENV=staging pnpm --filter @imbobi/web start &

# Or full deployment
bash DEPLOY.sh
```

### Reset Everything
```bash
# Stop all services and containers
pkill -f pnpm
docker compose -f docker-compose.staging.yml down -v

# Run deployment again
bash DEPLOY.sh
```

---

## Environment Variables

All variables are configured in `.env.staging` by the setup script.

Key variables:
- `NODE_ENV=staging`
- `JWT_SECRET` — Token signing key (>64 chars)
- `ENCRYPTION_KEY` — Token encryption key
- `DATABASE_URL` — PostgreSQL connection
- `REDIS_HOST` — Redis server
- `AWS_ACCESS_KEY_ID` — S3 access
- `EMAIL_PROVIDER` — Email service type
- `FIREBASE_PROJECT_ID` — Push notifications

See `.env.staging.example` for complete list.

---

## Detailed Documentation

For more information, see:
- **STAGING_DEPLOYMENT_GUIDE.md** — Complete step-by-step guide
- **DEPLOYMENT_STATUS.md** — Full status & checklist
- **SECURITY_SUMMARY.md** — 20/20 OWASP vulnerabilities documented

---

## Support

**If deployment fails:**
1. Check logs (see Troubleshooting above)
2. Verify prerequisites are installed
3. Ensure `.env.staging` is properly configured
4. Review Docker container status
5. Check that required ports (3000, 4000) are available

**Common issues:**
- Missing environment variables → Run `SETUP_CREDENTIALS.sh` again
- Docker not running → Start Docker Desktop
- Port conflicts → Change PORT in `.env.staging`
- Database not connecting → Verify DATABASE_URL

---

## Next Steps

After successful deployment:

1. **Test all features**
   - User registration & login
   - KYC document upload
   - Credit simulator calculations
   - Evidence photo upload

2. **Monitor performance**
   - Check Redis caching (scores, obras)
   - Verify database query performance
   - Monitor API response times

3. **Prepare for production**
   - Set up production infrastructure
   - Configure production credentials
   - Run full security audit
   - Plan rollout strategy

---

**Status**: ✅ Ready for deployment

**Deploy**: `bash DEPLOY.sh`

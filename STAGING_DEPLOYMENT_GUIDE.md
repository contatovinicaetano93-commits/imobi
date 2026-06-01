# imobi Staging Deployment Guide

**Version**: 1.0  
**Date**: May 28, 2026  
**Status**: 🟢 Ready for Staging Deployment

---

## Overview

This guide walks through deploying the imobi fintech platform to a staging environment. The staging deployment includes:

- **Web Application**: Next.js 14 (App Router)
- **Mobile Application**: Expo 51 with Expo Router
- **API Backend**: NestJS + Fastify
- **Database**: PostgreSQL 16 with PostGIS extension
- **Cache/Queue**: Redis 7 with BullMQ
- **Storage**: AWS S3 for evidence photos

All 20/20 OWASP Top 10 security vulnerabilities have been hardened and tested. Type checking passes across all 5 packages.

---

## Prerequisites

### Infrastructure Requirements

1. **Docker & Docker Compose** (v2.0+)
   ```bash
   docker --version
   docker compose version
   ```

2. **Node.js & pnpm**
   - Node.js 20+ (v22.22.2 recommended)
   - pnpm 9.0.0+
   ```bash
   node --version
   pnpm --version
   ```

3. **Git**
   ```bash
   git --version
   ```

### External Services (if not using Docker)

If you prefer managed services instead of Docker containers:

- **PostgreSQL 14+** with PostGIS extension enabled
- **Redis 7+** instance
- **AWS S3** bucket for evidence storage
- **SMTP/Email Service** (SendGrid, AWS SES, or SMTP)
- **Firebase Project** for push notifications

### Required Credentials

Gather these before starting deployment:

- AWS S3 bucket access keys
- Email service credentials (SendGrid API key or SMTP credentials)
- Firebase service account JSON
- (Optional) Unico API key for KYC validation
- (Optional) SERPRO token for digital verification

---

## Step 1: Environment Setup

### 1.1 Create Staging Environment Configuration

```bash
cd /path/to/imobi
cp .env.staging.example .env.staging
```

### 1.2 Generate Secure Keys

```bash
# Generate JWT_SECRET (64+ characters)
openssl rand -base64 48

# Generate ENCRYPTION_KEY (32 characters for AES-256)
openssl rand -base64 32
```

### 1.3 Configure .env.staging

Edit `.env.staging` and fill in:

```env
# API Configuration
NODE_ENV=staging
PORT=4000
CORS_ORIGIN=http://staging.imbobi.local:3000,http://localhost:3000

# Database
DATABASE_URL=postgresql://imobi:staging_password_secure_12345@localhost:5433/imobi_staging

# Redis
REDIS_HOST=localhost
REDIS_PORT=6380

# Security Keys (from Step 1.2)
JWT_SECRET=<your-64-char-random-string>
ENCRYPTION_KEY=<your-32-char-random-string>

# AWS S3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<your-access-key>
AWS_SECRET_ACCESS_KEY=<your-secret-key>
S3_BUCKET=imbobi-evidencias-staging

# Email
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=<your-sendgrid-key>

# Firebase
FIREBASE_PROJECT_ID=imbobi-staging
FIREBASE_PRIVATE_KEY=<your-private-key-json>
FIREBASE_CLIENT_EMAIL=<your-firebase-email>
```

**Never commit `.env.staging` to git.** It's already in `.gitignore`.

---

## Step 2: Infrastructure Setup

### 2.1 Start Docker Containers (Using Docker Compose)

```bash
docker compose -f docker-compose.staging.yml up -d
```

This starts:
- **PostgreSQL 16** on port 5433
- **Redis 7** on port 6380

Verify services are running:
```bash
docker compose -f docker-compose.staging.yml ps
```

Expected output:
```
NAME                            STATUS
imobi-staging-postgres          Up (healthy)
imobi-staging-redis             Up (healthy)
```

### 2.2 Verify Database Connection

```bash
psql postgresql://imobi:staging_password_secure_12345@localhost:5433/imobi_staging -c "SELECT version();"
```

### 2.3 Enable PostGIS Extension

```bash
psql postgresql://imobi:staging_password_secure_12345@localhost:5433/imobi_staging -c "CREATE EXTENSION IF NOT EXISTS postgis;"
```

### 2.4 Verify Redis Connection

```bash
redis-cli -p 6380 ping
# Expected: PONG
```

---

## Step 3: Build & Deploy Application

### 3.1 Install Dependencies

```bash
pnpm install
```

### 3.2 Generate Prisma Client

```bash
pnpm db:generate
```

### 3.3 Run Database Migrations

```bash
NODE_ENV=staging pnpm db:migrate
```

This applies all pending migrations from `services/api/prisma/migrations/`.

### 3.4 Build Production Artifacts

```bash
pnpm build
```

This builds:
- API: `dist/services/api/src/main.js`
- Web: `.next/` directory
- Mobile: Expo bundles (optional for staging)

### 3.5 Verify Type Checking

```bash
pnpm type-check
```

All 5 packages should pass:
- ✅ @imbobi/api
- ✅ @imbobi/web
- ✅ @imbobi/mobile
- ✅ @imbobi/core
- ✅ @imbobi/schemas

---

## Step 4: Start Services

### 4.1 Start API Server (in one terminal)

```bash
NODE_ENV=staging pnpm --filter @imbobi/api start:prod
```

Expected output:
```
[NestFactory] Starting NestApplication
[InstanceLoader] AppModule dependencies initialized
[RoutesResolver] AppModule routes resolved
[NestApplication] Nest application successfully started on port 4000
```

### 4.2 Start Web Server (in another terminal)

```bash
NODE_ENV=staging pnpm --filter @imbobi/web start
```

Expected output:
```
> @imbobi/web@0.0.1 start
> next start
  ▲ Next.js 14.2.35
  - Local:        http://localhost:3000
  ✓ Ready in Xs
```

---

## Step 5: Security Validation

### 5.1 Run Automated Security Tests

```bash
bash tests/security-validation.sh
```

This validates:
- ✅ Authorization enforcement (401 on missing token)
- ✅ CORS headers presence
- ✅ Helmet security headers (X-Frame-Options, etc.)
- ✅ Secure cookie configuration
- ✅ JWT secret validation (>64 chars)
- ✅ Encryption service implementation

### 5.2 Manual Security Checks

#### Check Authorization
```bash
# Without token - should return 401
curl -X GET http://localhost:4000/api/v1/obras

# Expected: {"statusCode":401,"message":"Unauthorized",...}
```

#### Check JWT Secret Strength
```bash
# Verify JWT_SECRET is >64 characters
echo -n "YOUR_JWT_SECRET" | wc -c
# Expected: > 64
```

#### Check Encryption Service
```bash
# Verify encryption.service.ts exists and uses AES-256-GCM
grep -r "aes-256-gcm" services/api/src/common/
```

#### Check CORS Configuration
```bash
curl -X OPTIONS http://localhost:4000/api/v1/health \
  -H "Origin: http://localhost:3000"
# Expected: Access-Control-Allow-Origin header present
```

---

## Step 6: Health Checks

### 6.1 API Health Check

```bash
curl -s http://localhost:4000/api/v1/health | jq .
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-05-28T...",
  "database": "connected",
  "redis": "connected"
}
```

### 6.2 Web Health Check

```bash
curl -s http://localhost:3000/health | jq .
```

Expected: 200 response with status information.

### 6.3 Database Connectivity

```bash
# Check Prisma can connect
NODE_ENV=staging pnpm db:status
```

### 6.4 Redis Connectivity

```bash
# Verify Redis is operational
redis-cli -p 6380 INFO stats
```

---

## Step 7: Feature Testing

### 7.1 Test User Registration

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

### 7.2 Test User Login

```bash
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@staging.local",
    "senha": "SecurePassword123!"
  }'
```

Expected response includes `accessToken` and `refreshToken`.

### 7.3 Test Authenticated Endpoint

```bash
curl -X GET http://localhost:4000/api/v1/obras \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_FROM_STEP_7.2"
```

---

## Monitoring & Troubleshooting

### Container Issues

**PostgreSQL not starting:**
```bash
docker logs imobi-staging-postgres
# Check disk space, permissions, port conflicts
```

**Redis not starting:**
```bash
docker logs imobi-staging-redis
# Verify port 6380 is available
```

### API Not Responding

```bash
# Check API logs
NODE_ENV=staging pnpm --filter @imbobi/api start:prod
# Look for startup errors, port conflicts, or missing environment variables
```

### Database Migration Failures

```bash
# Check migration status
NODE_ENV=staging pnpm db:status

# Verify DATABASE_URL is correct
echo $DATABASE_URL

# Manually check database
psql $DATABASE_URL -c "\dt"
```

### Security Test Failures

```bash
# Re-run with verbose output
bash tests/security-validation.sh

# Check Helmet configuration in main.ts
grep -A 20 "helmet(" services/api/src/main.ts
```

---

## Rollback Procedures

### Roll Back Services

If a deployment fails, rollback by:

```bash
# 1. Stop services (Ctrl+C in terminal windows)

# 2. Rollback database (if migrations failed)
NODE_ENV=staging pnpm db:reset  # ⚠ WARNING: Deletes all staging data

# 3. Or, revert to previous stable commit
git checkout <stable-commit-sha>
pnpm db:migrate
pnpm build
```

### Roll Back Docker Infrastructure

```bash
# Stop all containers
docker compose -f docker-compose.staging.yml down

# Remove volumes (⚠ WARNING: Deletes all data)
docker compose -f docker-compose.staging.yml down -v

# Restart with fresh database
docker compose -f docker-compose.staging.yml up -d
```

---

## Performance Tuning

### Enable Redis Caching

The API automatically caches:
- User scores (5 min TTL)
- Obras listings (5 min TTL)
- Progress tracking (30 min TTL)

Verify caching is working:
```bash
redis-cli -p 6380 KEYS "*"
# Should show cached keys after API requests
```

### Database Query Optimization

PostgreSQL indexes are automatically created during migrations:
- `usuarios(email)` — for fast user lookup
- `obras(gestorId)` — for obra filtering
- `evidencias(obraId, criadoEm)` — for evidence queries
- `kycDocumentos(usuarioId, status)` — for KYC status

---

## Post-Deployment Checklist

- [ ] Docker containers running and healthy
- [ ] PostgreSQL database migrations applied
- [ ] Redis connected and caching operational
- [ ] API responding to health checks
- [ ] Web frontend loading at http://localhost:3000
- [ ] Security validation tests passing
- [ ] User registration/login workflow verified
- [ ] KYC document upload tested
- [ ] Crédito simulator calculations verified
- [ ] Evidências GPS validation working
- [ ] Email notifications sending (if configured)
- [ ] Firebase push notifications working (if configured)

---

## Next Steps

### Production Deployment

When staging is validated and tested:

1. **Set up production infrastructure**
   - Managed PostgreSQL (e.g., RDS, CloudSQL)
   - Managed Redis (e.g., ElastiCache, Memorystore)
   - Production AWS S3 bucket
   - Production email service credentials
   - Production Firebase project

2. **Generate production environment**
   ```bash
   cp .env.example .env.production
   # Fill in production credentials
   ```

3. **Deploy to production**
   - Use the same deployment scripts
   - Point to production infrastructure
   - Run security validation on production
   - Monitor logs and performance

### Monitoring & Alerting

Set up monitoring for:
- API response times
- Database connection pool
- Redis memory usage
- Error rates (5xx responses)
- JWT token generation/validation timing

---

## Support & Documentation

- **Security Summary**: See `SECURITY_SUMMARY.md` for all 20 OWASP fixes
- **Architecture**: See `CLAUDE.md` for project structure and rules
- **API Documentation**: Available at `/api/docs` (Swagger) when API is running

---

**Deployment Status**: ✅ Ready for Staging
**Last Updated**: May 28, 2026

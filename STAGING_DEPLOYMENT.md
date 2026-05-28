# Staging Deployment Guide — imbobi

**Status:** Ready for staging validation (20/20 security fixes)  
**Branch:** `claude/happy-goldberg-AFQPj`  
**Last Updated:** May 28, 2026

## Pre-Deployment Checklist

### Security Validation ✅
- [x] 20/20 OWASP vulnerabilities fixed
- [x] All type checking passed
- [x] Code compiles without errors
- [x] Refresh tokens encrypted (AES-256-GCM)
- [x] Rate limiting configured
- [x] CSRF protection implemented
- [x] SQL injection prevention verified
- [x] Sensitive data not exposed in responses

### Infrastructure Requirements

```
✓ PostgreSQL 14+ with PostGIS extension
✓ Redis 7+ (for caching & job queues)
✓ Node.js 20+
✓ AWS S3 bucket (for obra photos)
✓ SMTP server (email notifications)
✓ Firebase Admin SDK (push notifications)
```

## Deployment Steps

### 1. Prepare Staging Server

```bash
# Clone repository
git clone <repo-url> /opt/imbobi
cd /opt/imbobi
git checkout claude/happy-goldberg-AFQPj

# Install dependencies
pnpm install

# Build production
pnpm build
```

### 2. Configure Environment

```bash
# Copy template and fill with staging values
cp .env.staging.example /opt/imbobi/.env.staging

# Required fields to populate:
# - DATABASE_URL (staging PostgreSQL)
# - REDIS_HOST/PORT (staging Redis)
# - JWT_SECRET (64+ chars, random)
# - ENCRYPTION_KEY (32 bytes, base64)
# - CORS_ORIGIN (staging domain)
# - AWS credentials
# - SMTP credentials
# - Firebase credentials
```

**Generating Secure Secrets:**

```bash
# JWT_SECRET (64+ chars)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# ENCRYPTION_KEY (32 bytes, base64)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 3. Database Setup

```bash
# Run migrations
DATABASE_URL=<staging-db-url> pnpm db:migrate

# Seed test data (optional)
DATABASE_URL=<staging-db-url> pnpm seed
```

### 4. Start Services

```bash
# Production API (port 4000)
NODE_ENV=production \
  DATABASE_URL=<staging-db> \
  REDIS_HOST=staging-redis \
  JWT_SECRET=<64-char-secret> \
  ENCRYPTION_KEY=<base64-key> \
  node /opt/imbobi/services/api/dist/services/api/src/main.js

# Or with PM2
pm2 start /opt/imbobi/services/api/dist/services/api/src/main.js --name imbobi-api
```

### 5. Health Checks

```bash
# API health
curl https://staging-api.imbobi.com.br/api/v1/health

# Expected: 200 OK
```

## Testing Security Fixes in Staging

### Authorization Tests

```bash
# 1. Test role-based access (KYC pendentes)
# Should fail for non-admin user
curl -H "Authorization: Bearer <user-token>" \
  https://staging-api.imbobi.com.br/api/v1/kyc/pendentes
# Expected: 403 Forbidden

# Should succeed for ADMIN/GESTOR_OBRA
curl -H "Authorization: Bearer <admin-token>" \
  https://staging-api.imbobi.com.br/api/v1/kyc/pendentes
# Expected: 200 OK
```

### IDOR Prevention Tests

```bash
# 2. Test ownership validation (crédito)
# User A tries to access User B's credit
curl -H "Authorization: Bearer <user-a-token>" \
  https://staging-api.imbobi.com.br/api/v1/credito/<user-b-credit-id>/extrato
# Expected: 403 Forbidden

# Same user accessing own credit
curl -H "Authorization: Bearer <user-a-token>" \
  https://staging-api.imbobi.com.br/api/v1/credito/<user-a-credit-id>/extrato
# Expected: 200 OK
```

### Rate Limiting Tests

```bash
# 3. Test rate limits
# Send 11 requests to auth endpoint (limit: 10/min)
for i in {1..11}; do
  curl -X POST https://staging-api.imbobi.com.br/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","senha":"test"}'
done
# Requests 11+ should return 429 Too Many Requests
```

### Data Exposure Tests

```bash
# 4. Verify CPF not exposed
curl -H "Authorization: Bearer <admin-token>" \
  https://staging-api.imbobi.com.br/api/v1/kyc/pendentes | jq '.[] | .usuario'
# Expected: No "cpf" field in response
```

### Encryption Tests

```bash
# 5. Verify refresh token encryption
# Login and get refresh token
curl -X POST https://staging-api.imbobi.com.br/api/v1/auth/login \
  -d '{"email":"user@test.com","senha":"password"}'

# Token in database should be encrypted (not plain JWT)
# Check database:
SELECT refreshToken FROM "SessaoToken" LIMIT 1;
# Should show encrypted hex string, not JWT format
```

## Rollback Plan

If critical issues found in staging:

```bash
# 1. Stop current deployment
pm2 stop imbobi-api

# 2. Revert to previous stable version (if needed)
git checkout <previous-commit>
pnpm build

# 3. Restart with previous code
pm2 start imbobi-api
```

## Monitoring

```bash
# API logs
pm2 logs imbobi-api

# Database connections
SELECT count(*) FROM pg_stat_activity;

# Redis memory
redis-cli INFO memory
```

## Success Criteria

- [ ] API starts without errors
- [ ] All security tests pass (auth, IDOR, rate limits, data exposure)
- [ ] Database migrations succeed
- [ ] Refresh tokens stored encrypted
- [ ] No type errors or crashes after 1 hour load
- [ ] Encryption key is properly enforced in production mode

## Next Steps

1. ✅ **Staging validation** (you are here)
2. **Mobile feature parity** — Implement KYC upload, crédito simulator on mobile
3. **Production deployment** — After staging validation passes

---

**Support:** For deployment issues, check logs at `/var/log/imbobi/api.log`

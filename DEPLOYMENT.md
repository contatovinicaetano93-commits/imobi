# 🚀 Deployment Guide — imbobi

## Overview

This guide covers deploying the imbobi fintech platform (web, mobile, API) to staging and production environments.

**Stack:**
- API: NestJS + Fastify on Docker
- Web: Next.js 14 on Vercel or self-hosted
- Mobile: Expo on Google Play & Apple App Store
- Database: PostgreSQL 15 + PostGIS
- Cache: Redis 7
- Queue: BullMQ

**Security Features:**
- CSRF protection with token-based validation
- Rate limiting on all state-changing endpoints
- JWT access & refresh tokens with HttpOnly cookies
- AES-256-GCM encryption for sensitive data
- Helmet.js security headers
- Role-based access control (RBAC)

---

## Pre-Deployment Checklist

### Environment Variables

**Complete environment variable checklist** (all required):

```bash
# Core Configuration
NODE_ENV=production
PORT=4000

# Database
DATABASE_URL=postgresql://user:pass@db.internal:5432/imbobi_prod?sslmode=require
DATABASE_POOL_SIZE=20

# JWT Tokens (must be >64 characters, cryptographically random)
JWT_SECRET=<min 64 chars - generate with: openssl rand -base64 48>
JWT_REFRESH_SECRET=<min 64 chars - generate with: openssl rand -base64 48>
JWT_EXPIRATION=900
JWT_REFRESH_EXPIRATION=604800

# Encryption (must be >32 characters)
ENCRYPTION_SECRET=<min 32 chars - generate with: openssl rand -base64 24>

# Redis (for BullMQ and caching)
REDIS_HOST=redis.internal
REDIS_PORT=6379
REDIS_PASSWORD=<strong-password-if-required>
REDIS_DB=0

# CORS (whitelist specific domains)
CORS_ORIGIN=https://app.imbobi.com,https://www.imbobi.com

# External Services
SENDGRID_API_KEY=SG.<your-key>
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<AWS IAM key>
AWS_SECRET_ACCESS_KEY=<AWS secret>
S3_BUCKET=imbobi-evidencias-prod

# Firebase Cloud Messaging
FIREBASE_PROJECT_ID=imbobi-production
FIREBASE_PRIVATE_KEY=<service account private key>
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@imbobi-production.iam.gserviceaccount.com

# Monitoring & Logging
SENTRY_DSN=https://<key>@sentry.io/projectid
LOG_LEVEL=info
```

**Web Application** (.env.production):
```bash
NEXT_PUBLIC_API_URL=https://api.imbobi.com
NEXT_PUBLIC_ENVIRONMENT=production
```

**Mobile Application** (eas.json):
```json
{
  "build": {
    "production": {
      "env": {
        "EXPO_PUBLIC_API_URL": "https://api.imbobi.com",
        "EXPO_PUBLIC_ENVIRONMENT": "production"
      }
    }
  }
}
```

### Security Checklist

**Secrets & Keys:**
- [ ] JWT_SECRET is >64 characters and cryptographically random
- [ ] JWT_REFRESH_SECRET is >64 characters and cryptographically random
- [ ] ENCRYPTION_SECRET is >32 characters and cryptographically random
- [ ] All secrets generated using `openssl rand -base64` (not placeholder values)
- [ ] Secrets stored in secure key management (AWS Secrets Manager, HashiCorp Vault, etc.)
- [ ] No secrets committed to Git (use `.env.example` instead)

**CORS & Network:**
- [ ] CORS_ORIGIN contains only production domains (no wildcards, no localhost)
- [ ] DATABASE_URL uses SSL connection (`sslmode=require`)
- [ ] Redis only accessible from internal network (not internet-facing)
- [ ] API endpoints protected by rate limiting (see Rate Limiting Tiers section)

**Infrastructure:**
- [ ] HTTPS enforced everywhere (HTTP redirects to HTTPS)
- [ ] Database backups configured and tested (daily minimum)
- [ ] Redis persistence enabled (AOF or RDB snapshots)
- [ ] Database connection pooling configured (POOL_SIZE=20+)
- [ ] Automated health checks configured on load balancer

**Application:**
- [ ] All tests passing (`pnpm test`)
- [ ] Type checking passing (`pnpm type-check`)
- [ ] No console.log statements logging sensitive data
- [ ] CSRF endpoint accessible (`GET /api/v1/auth/csrf-token`)
- [ ] Rate limits tuned for production load

---

## 1. API Deployment (NestJS + Docker)

### Option A: Docker (Recommended)

**Build image:**
```bash
docker build -f services/api/Dockerfile -t imbobi-api:latest .
```

**Push to registry:**
```bash
docker tag imbobi-api:latest gcr.io/PROJECT_ID/imbobi-api:latest
docker push gcr.io/PROJECT_ID/imbobi-api:latest
```

**Deploy to Cloud Run / K8s:**
```bash
gcloud run deploy imbobi-api \
  --image gcr.io/PROJECT_ID/imbobi-api:latest \
  --port 4000 \
  --set-env-vars NODE_ENV=production,DATABASE_URL=$DB_URL,...
```

### Option B: Self-Hosted (AWS EC2 / DigitalOcean)

**SSH into server:**
```bash
ssh ubuntu@api.imbobi.com
```

**Pull & run:**
```bash
cd /app/imbobi-api
git pull origin main
docker-compose up -d
```

**Health check:**
```bash
curl https://api.imbobi.com/api/v1/health
```

---

## 2. Web Deployment (Next.js)

### Option A: Vercel (Recommended)

**Install CLI:**
```bash
npm i -g vercel
```

**Deploy:**
```bash
vercel --prod
# Sets NEXT_PUBLIC_API_URL automatically from project settings
```

**Environment variables:** Set in Vercel dashboard → Settings → Environment Variables

### Option B: Self-Hosted

**Build:**
```bash
cd apps/web
pnpm build
```

**Start:**
```bash
pnpm start
# Runs on port 3000
```

**Nginx reverse proxy:**
```nginx
server {
  listen 443 ssl;
  server_name app.imbobi.com;
  
  location / {
    proxy_pass http://localhost:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }
}
```

---

## 3. Mobile Deployment (Expo)

### Build & Release

**Install EAS CLI:**
```bash
npm install -g eas-cli
eas login
```

**Build for iOS:**
```bash
cd apps/mobile
eas build --platform ios --auto-submit
```

**Build for Android:**
```bash
eas build --platform android --auto-submit
```

**Submit to stores:**
```bash
eas submit --platform ios --latest
eas submit --platform android --latest
```

### Environment

Set in `eas.json`:
```json
{
  "build": {
    "production": {
      "env": {
        "EXPO_PUBLIC_API_URL": "https://api.imbobi.com"
      }
    }
  }
}
```

---

## 4. Database Migration

### Backup existing database
```bash
pg_dump -h production.db.amazonaws.com -U imbobi imbobi_prod > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Run migrations
```bash
DATABASE_URL="postgresql://..." pnpm db:migrate:deploy
```

### Verify
```bash
psql $DATABASE_URL -c "SELECT version();"
```

---

## 5. Redis Setup

### Docker with Persistence

```bash
docker run -d --name imbobi-redis \
  -p 6379:6379 \
  -v redis-data:/data \
  -e REDIS_PASSWORD=<strong-password> \
  redis:7-alpine \
  redis-server \
    --appendonly yes \
    --requirepass <strong-password> \
    --maxmemory 2gb \
    --maxmemory-policy allkeys-lru
```

### AWS ElastiCache (Recommended for production)

```bash
# Create ElastiCache Redis cluster
aws elasticache create-cache-cluster \
  --cache-cluster-id imbobi-redis \
  --cache-node-type cache.r6g.xlarge \
  --engine redis \
  --engine-version 7.0 \
  --num-cache-nodes 1 \
  --parameter-group-name default.redis7 \
  --port 6379 \
  --automatic-failover-enabled \
  --multi-az-enabled
```

### Verification & Monitoring

```bash
# Test connection
redis-cli -h redis.internal -p 6379 ping
# Output: PONG

# Monitor memory
redis-cli -h redis.internal INFO memory

# Check persistence
redis-cli -h redis.internal BGSAVE
redis-cli -h redis.internal LASTSAVE
```

**BullMQ Queue Configuration:**
- Ensure Redis is accessible to API container
- Set `REDIS_HOST` and `REDIS_PORT` environment variables
- Enable AOF persistence for queue reliability
- Monitor queue depth: `redis-cli LLEN "bull:*"`

---

## 6. CSRF Protection & Security Headers

### CSRF Token Endpoint

All clients must obtain a CSRF token before state-changing requests:

```bash
# 1. Get CSRF token
curl -X GET https://api.imbobi.com/api/v1/auth/csrf-token

# Response:
# {
#   "csrfToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
#   "expiresAt": "2026-05-28T10:15:00Z"
# }

# 2. Use token in POST request
curl -X POST https://api.imbobi.com/api/v1/auth/login \
  -H "X-CSRF-Token: <csrf-token-from-step-1>" \
  -d '{"email": "...", "senha": "..."}'
```

### Security Headers Verification

Verify all security headers are present:

```bash
curl -i https://api.imbobi.com/api/v1/health | grep -E "Content-Security-Policy|X-Content-Type|Strict-Transport"

# Expected output:
# Content-Security-Policy: default-src 'self'
# X-Content-Type-Options: nosniff
# X-XSS-Protection: 1; mode=block
# Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

---

## 7. Monitoring & Logging

### Application Metrics

**Key metrics to monitor:**
- API response time (p50, p95, p99)
- Database query duration
- Redis cache hit rate
- Queue depth and processing time
- JWT token refresh rate

### Sentry (Error tracking)

Configuration already in `services/api/src/main.ts`:

```typescript
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
});
```

**Setup**:
1. Create Sentry project at https://sentry.io
2. Set `SENTRY_DSN` environment variable
3. Configure alerts for critical errors
4. Monitor authentication failures (potential attacks)

### Structured Logging

**Log all critical events:**
```bash
# Authentication
- User login (success/failure)
- JWT token refresh
- Password reset requests
- Rate limit violations

# Security
- CSRF token validation failures
- Unauthorized access attempts
- SQL injection attempts (blocked)
- DDoS-like patterns

# Performance
- Slow queries (>500ms)
- Large responses (>1MB)
- Queue processing delays

# Infrastructure
- Database connection issues
- Redis connection issues
- Disk space warnings
- Memory usage spikes
```

**Log aggregation:**
- Use CloudWatch, Datadog, or ELK stack
- Set log retention to 30 days minimum
- Create alerts for error rate >1%
- Create alerts for rate limit violations >10/hour

### Health Checks

```bash
# API health endpoint
curl https://api.imbobi.com/api/v1/health
# Response: { "status": "ok", "database": "connected", "redis": "connected" }

# Detailed diagnostics
curl https://api.imbobi.com/api/v1/health/detailed
# Response includes: DB latency, Redis latency, queue depth, memory usage

# Configure in load balancer
# Health check path: /api/v1/health
# Check interval: 30 seconds
# Unhealthy threshold: 3 consecutive failures
# Healthy threshold: 2 consecutive successes
```

---

## 8. Rate Limiting Tiers

All endpoints use rate limiting to prevent abuse and ensure fair resource allocation.

### Rate Limit Configuration

| Endpoint | Limit | Window | Guard | Purpose |
|----------|-------|--------|-------|---------|
| `POST /auth/login` | 5 attempts | 15 min | IP | Brute force protection |
| `POST /auth/registrar` | 3 attempts | 1 hour | IP | Account enumeration prevention |
| `POST /auth/renovar` | 10 attempts | 1 hour | User | Token refresh DoS protection |
| `POST /credito/simular` | 20 requests | 1 hour | User | Expensive computation protection |
| `POST /evidencias/upload` | 30 uploads | 24 hours | User | Storage quota protection |
| **Global default** | 100 req | 60 sec | IP | General DoS protection |

### Monitoring Rate Limits

```bash
# Check rate limit status in Redis
redis-cli KEYS "throttle:*"

# Get current limit counter for IP
redis-cli GET "throttle:login:192.168.1.1"

# Monitor rate limit violations in logs
grep "429" /var/log/api/access.log | wc -l

# Alert if rate limit violations exceed threshold
# Set alert: > 100 violations per hour = potential attack
```

### Tuning for Production Load

If you experience rate limit issues in production:

```typescript
// In app.module.ts, adjust limits based on expected load:
{
  ttl: 900000,        // 15 minutes
  limit: 10,          // Increase from 5 if legitimate users blocked
  name: "login",
}
```

**Scaling strategy:**
- Monitor rate limit hits per user/IP
- Increase limits if >2% legitimate users are blocked
- Decrease limits if attack traffic detected
- Use stricter limits for `/registrar` (new accounts are abuse vector)

---

## 9. Rollback Plan

### Immediate Actions

When deployment fails or introduces critical issues:

```bash
# 1. Get current deployment revision
gcloud run revisions list --service imbobi-api

# 2. Get previous stable revision
PREV_REVISION=$(gcloud run revisions list --format='value(name)' --limit=2 \
  | tail -1)

# 3. Route traffic to previous revision
gcloud run deploy imbobi-api \
  --image gcr.io/PROJECT_ID/imbobi-api:$PREV_REVISION
```

### API Rollback

```bash
# Option 1: Immediate rollback (Cloud Run)
gcloud run deploy imbobi-api \
  --image gcr.io/PROJECT_ID/imbobi-api:v1.2.3 \
  --no-traffic-upgrade

# Option 2: Gradual rollback (canary deployment)
gcloud run deploy imbobi-api \
  --image gcr.io/PROJECT_ID/imbobi-api:v1.2.3 \
  --traffic previous=100  # 100% to previous version
```

### Web Rollback

```bash
# Vercel automatic rollback
vercel rollback

# Or manually deploy previous commit
git checkout v1.2.3
vercel --prod
```

### Database Rollback

**For failed migrations:**

```bash
# 1. Stop the API immediately (to prevent further writes)
gcloud run deploy imbobi-api --no-traffic

# 2. Restore database from backup
pg_restore --no-owner --role=imbobi \
  -h production.db.internal \
  -U imbobi \
  -d imbobi_prod \
  backup_20260528_120000.sql

# 3. Verify restore success
psql $DATABASE_URL -c "SELECT COUNT(*) FROM usuario;"

# 4. Re-enable API
gcloud run deploy imbobi-api \
  --image gcr.io/PROJECT_ID/imbobi-api:v1.2.2
```

### Monitoring Rollback Status

```bash
# Check API health after rollback
while true; do
  curl -s https://api.imbobi.com/api/v1/health | jq .
  sleep 5
done

# Verify database connectivity
psql $DATABASE_URL -c "SELECT version();"

# Check error rates in Sentry
# Alert when error rate < 0.1% (normal)
```

---

## 10. Post-Deployment Validation

**Critical Endpoints:**

```bash
# 1. CSRF token endpoint (must be accessible)
curl -X GET https://api.imbobi.com/api/v1/auth/csrf-token
# Expected: { "csrfToken": "...", "expiresAt": "..." }

# 2. Login endpoint (validate rate limiting)
CSRF=$(curl -s https://api.imbobi.com/api/v1/auth/csrf-token | jq -r .csrfToken)
curl -X POST https://api.imbobi.com/api/v1/auth/login \
  -H "X-CSRF-Token: $CSRF" \
  -d '{"email": "test@example.com", "senha": "WrongPass"}' 
# Expected: 401 (invalid credentials) or 429 (rate limit)

# 3. Protected endpoint (validate authentication)
curl -X GET https://api.imbobi.com/api/v1/auth/me
# Expected: 401 (no token)

# 4. Database connectivity
psql $DATABASE_URL -c "SELECT COUNT(*) FROM usuario;"
# Expected: connection successful, table exists

# 5. Redis connectivity
redis-cli -h $REDIS_HOST -p $REDIS_PORT ping
# Expected: PONG

# 6. Security headers present
curl -i https://api.imbobi.com/api/v1/health | grep -E "Content-Security-Policy|X-Frame-Options"
# Expected: security headers present
```

**Validation Checklist:**

```bash
# Run comprehensive validation script
cat > validate_deployment.sh << 'EOF'
#!/bin/bash

set -e

API_URL="https://api.imbobi.com/api/v1"
echo "Validating deployment at $API_URL..."

# 1. CSRF endpoint
echo "✓ Testing CSRF endpoint..."
CSRF=$(curl -s $API_URL/auth/csrf-token | jq -r .csrfToken)
[ -n "$CSRF" ] && echo "  CSRF token obtained: ${CSRF:0:20}..."

# 2. Health check
echo "✓ Testing health endpoint..."
curl -s $API_URL/health | jq . | head -5

# 3. Security headers
echo "✓ Checking security headers..."
curl -s -I $API_URL/health | grep -i "content-security-policy" && echo "  CSP header present"
curl -s -I $API_URL/health | grep -i "strict-transport" && echo "  HSTS header present"

# 4. Rate limiting
echo "✓ Testing rate limits..."
for i in {1..6}; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST $API_URL/auth/login \
    -H "X-CSRF-Token: $CSRF" -d '{"email":"test","senha":"test"}')
  echo "  Attempt $i: HTTP $STATUS"
done

# 5. Database
echo "✓ Testing database..."
psql $DATABASE_URL -c "SELECT version();" | head -1

# 6. Redis
echo "✓ Testing Redis..."
redis-cli -h $REDIS_HOST ping

echo ""
echo "✅ Deployment validation complete!"
EOF

chmod +x validate_deployment.sh
./validate_deployment.sh
```

---

## 11. Incident Response

### API Down or Unresponsive

```bash
# 1. Check service status
gcloud run services describe imbobi-api
kubectl get pods -l app=imbobi-api  # if K8s

# 2. Check logs
gcloud run logs read imbobi-api --limit 50
docker logs imbobi-api  # if Docker

# 3. Check connectivity
curl -v https://api.imbobi.com/api/v1/health
telnet api.imbobi.com 443

# 4. Check dependencies
psql $DATABASE_URL -c "SELECT 1;"
redis-cli -h $REDIS_HOST ping

# 5. Rollback if needed (see Rollback Plan)
gcloud run deploy imbobi-api --image gcr.io/PROJECT_ID/imbobi-api:v1.2.2
```

### Database Issues

```bash
# 1. Check disk space
df -h /var/lib/postgresql

# 2. Check connections
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"
# If > 100, likely connection leak

# 3. Check slow queries
psql $DATABASE_URL -c "SELECT query, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"

# 4. Check replication lag (if replicated)
psql $DATABASE_URL -c "SELECT EXTRACT(EPOCH FROM (NOW() - pg_last_xact_replay_timestamp())) AS replication_lag_seconds;"

# 5. Restore from backup if corrupt
pg_restore --no-owner -h production.db.internal -U imbobi -d imbobi_prod backup_latest.sql
```

### Redis Connection Issues

```bash
# 1. Check Redis status
redis-cli -h $REDIS_HOST info server

# 2. Check memory usage
redis-cli -h $REDIS_HOST info memory

# 3. Monitor active connections
redis-cli -h $REDIS_HOST client list | wc -l

# 4. Check for blocked commands
redis-cli -h $REDIS_HOST slowlog get 10

# 5. Flush if corrupted (warning: clears cache)
redis-cli -h $REDIS_HOST FLUSHALL
redis-cli -h $REDIS_HOST CONFIG REWRITE
```

### DDoS / Rate Limit Attacks

```bash
# 1. Monitor attack patterns
tail -f /var/log/api/access.log | grep "429" | awk '{print $1}' | sort | uniq -c | sort -rn

# 2. Check rate limit status
redis-cli KEYS "throttle:*" | wc -l  # Number of throttled clients

# 3. Block attacker IP (if on-prem)
iptables -A INPUT -s <ATTACKER_IP> -j DROP

# 4. Enable CloudFlare / AWS Shield DDoS protection
# Or scale API horizontally:
gcloud run deploy imbobi-api --max-instances 100

# 5. Monitor success
curl -s https://api.imbobi.com/api/v1/health | jq .
```

---

## 12. Scaling Strategy

### Horizontal Scaling
```bash
# If single instance is maxed:
# 1. Replicate API to multiple Cloud Run instances
# 2. Load balance with GCP Cloud Load Balancer
# 3. Scale database with read replicas

gcloud run deploy imbobi-api --max-instances 10
```

### Database Optimization
```bash
# Add indexes for common queries
CREATE INDEX idx_usuario_email ON usuario(email);
CREATE INDEX idx_obra_status ON obra(status);
CREATE INDEX idx_etapa_obraId ON etapa("obraId");
```

### Caching Strategy
- Redis cache for: user profiles, scores, work lists
- Set TTL: 15 min for volatile data, 1 hour for stable data

---

## Support & Escalation

**Deployment issues?** Contact DevOps team at devops@imbobi.com

**Database issues?** Database admin: dba@imbobi.com

**API issues?** Backend team: backend@imbobi.com

---

## Appendix: Environment Variables Reference

| Variable | Min Length | Description |
|----------|-----------|-------------|
| JWT_SECRET | 64 chars | Signing key for access tokens |
| JWT_REFRESH_SECRET | 64 chars | Signing key for refresh tokens |
| ENCRYPTION_SECRET | 32 chars | AES-256-GCM key for data encryption |
| DATABASE_URL | - | PostgreSQL connection string |
| REDIS_HOST | - | Redis server hostname |
| CORS_ORIGIN | - | Comma-separated allowed origins |
| SENDGRID_API_KEY | - | SendGrid email service key |
| AWS_ACCESS_KEY_ID | - | AWS S3 credentials |
| FIREBASE_PRIVATE_KEY | - | Firebase Cloud Messaging key |

---

**Last Updated:** May 27, 2026  
**Maintained By:** DevOps Team

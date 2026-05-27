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

---

## Pre-Deployment Checklist

### Environment Variables
```bash
# API (.env)
NODE_ENV=production
DATABASE_URL=postgresql://...
REDIS_HOST=redis.internal
REDIS_PORT=6379
JWT_SECRET=<min 64 chars>
JWT_REFRESH_SECRET=<min 64 chars>
ENCRYPTION_SECRET=<min 32 chars>
CORS_ORIGIN=https://app.imbobi.com
SENDGRID_API_KEY=<key>
AWS_ACCESS_KEY_ID=<key>
AWS_SECRET_ACCESS_KEY=<key>
FIREBASE_PROJECT_ID=<id>
FIREBASE_PRIVATE_KEY=<key>
FIREBASE_CLIENT_EMAIL=<email>

# Web (.env.production)
NEXT_PUBLIC_API_URL=https://api.imbobi.com

# Mobile (EAS)
EXPO_PUBLIC_API_URL=https://api.imbobi.com
```

### Security Checks
- [ ] All secrets >64 chars (JWT) or >32 chars (encryption)
- [ ] CORS_ORIGIN is restrictive (no wildcard in production)
- [ ] Rate limiting enabled (5 req/15min login, 3 req/hour register)
- [ ] HTTPS enforced everywhere
- [ ] Database backups configured
- [ ] Redis persistence enabled

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

### Docker
```bash
docker run -d --name imbobi-redis \
  -p 6379:6379 \
  -v redis-data:/data \
  redis:7 redis-server --appendonly yes
```

### Verify
```bash
redis-cli ping
# Output: PONG
```

---

## 6. Monitoring & Logging

### Sentry (Error tracking)
```bash
# In API main.ts
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
});
```

### CloudWatch / Datadog (Logs)
```bash
# All services should stream logs to centralized logging
# Configure in docker-compose.yml or deployment manifests
```

### Health Checks
```bash
# API
curl https://api.imbobi.com/api/v1/health

# Web (Next.js health check endpoint)
curl https://app.imbobi.com/api/health
```

---

## 7. Rollback Plan

### API
```bash
# If deployment fails:
gcloud run deploy imbobi-api --image gcr.io/PROJECT_ID/imbobi-api:previous
```

### Web
```bash
# Vercel automatic rollback:
vercel rollback
# or manually deploy previous commit
```

### Database
```bash
# Restore from backup if migration fails
psql $DATABASE_URL < backup_20260527_120000.sql
```

---

## 8. Post-Deployment Validation

```bash
# 1. Smoke tests
pnpm test:smoke

# 2. Check all critical endpoints
curl https://api.imbobi.com/api/v1/auth/me (should 401)
curl https://api.imbobi.com/api/v1/obras (should 401)

# 3. Mobile app connects
# Test login flow in mobile app

# 4. Database connections
psql $DATABASE_URL -c "SELECT COUNT(*) FROM usuario;"

# 5. Redis cache
redis-cli ping
redis-cli GET "some:key"
```

---

## 9. Incident Response

### API down
1. Check Docker logs: `docker logs imbobi-api`
2. Check database: `psql $DATABASE_URL`
3. Check Redis: `redis-cli ping`
4. Rollback to previous version
5. Open incident on Sentry/monitoring

### Database issues
1. Check disk space: `df -h`
2. Check connections: `SELECT count(*) FROM pg_stat_activity;`
3. Check replication lag (if replicated)
4. Restore from backup if corrupt

### DDoS / Rate limit attacks
1. Rate limiting guards are active (login: 5/15min, register: 3/hour)
2. CloudFlare DDoS protection (if configured)
3. Scale API horizontally if needed

---

## 10. Scaling Strategy

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

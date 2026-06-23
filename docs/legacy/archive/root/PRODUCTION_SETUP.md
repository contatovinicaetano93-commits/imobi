# Production Setup Guide

Complete guide to deploying and maintaining Imobi in production environments.

## Quick Start (5 minutes)

### 1. Prepare Environment Variables
```bash
# Copy template
cp .env.production.example .env.production

# Fill in your credentials
nano .env.production
```

Required variables:
- `DATABASE_URL` — PostgreSQL connection
- `REDIS_URL` or (`REDIS_HOST` + `REDIS_PORT`) — Cache/Queue
- `SENDGRID_API_KEY` (or SES/SMTP config) — Email
- `FIREBASE_*` credentials — Push notifications
- `AWS_S3_*` — Evidence storage

### 2. Deploy Application
```bash
# Option 1: Vercel
vercel env add DATABASE_URL "postgresql://..."
vercel env add REDIS_URL "redis://..."
# ... add other env vars
vercel deploy --prod

# Option 2: Railway
railway variables set DATABASE_URL "postgresql://..."
railway variables set REDIS_URL "redis://..."
# ... add other env vars
railway deploy

# Option 3: Docker
docker build -t imobi-api .
docker run -e DATABASE_URL="..." -e REDIS_URL="..." imobi-api
```

### 3. Verify Health
```bash
curl https://your-api.com/api/v1/health
# Should return: {"status":"ok","redis":{"status":"connected"},...}
```

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Web Browser / Mobile App                 │
├─────────────────────────────────────────────────────────────┤
│                    Load Balancer / CDN                       │
│                   (Vercel / Railway)                         │
├──────────────────────────┬──────────────────────────────────┤
│   Next.js Web App        │    NestJS API Server             │
│   (apps/web)             │    (services/api)                │
│                          ├──────────────────────────────────┤
│  - Dashboard             │  Middleware:                     │
│  - Mobile Web            │  • Production Middleware         │
│  - Auth Pages            │  • ThrottleGuard (Rate limit)    │
│  - Marketplace           │  • CacheInterceptor              │
└──────────────────────────┼──────────────────────────────────┘
                           │
            ┌──────────────┼──────────────┐
            │              │              │
       ┌────▼────┐    ┌────▼────┐   ┌────▼────┐
       │PostgreSQL│    │  Redis  │   │BullMQ   │
       │ PostGIS  │    │ (Cache) │   │ (Queue) │
       │ (Data)   │    │         │   │ (Jobs)  │
       └──────────┘    └─────────┘   └─────────┘
            │
    ┌───────┼───────┬──────────┬──────────┐
    │       │       │          │          │
┌───▼──┐ ┌──▼───┐ ┌─▼──────┐ ┌┴────────┐ │
│ S3   │ │Email │ │Firebase│ │Services │
│      │ │      │ │  Admin │ │         │
└──────┘ └──────┘ └────────┘ └─────────┘
```

## Configuration Files & Documentation

### Essential Reading
1. **[.env.production.example](./.env.production.example)** — Environment variables template
2. **[services/api/PRODUCTION_VALIDATION.md](./services/api/PRODUCTION_VALIDATION.md)** — Setup & validation
3. **[services/api/MONITORING.md](./services/api/MONITORING.md)** — Observability & logging
4. **[SECRETS_MANAGEMENT.md](./SECRETS_MANAGEMENT.md)** — Credential handling

### Implementation Files
- **services/api/src/common/config/redis.config.ts** — Redis URL parsing
- **services/api/src/common/config/env.validator.ts** — Environment validation
- **services/api/src/common/config/email.config.ts** — Email provider setup
- **services/api/src/common/config/firebase.config.ts** — Firebase credentials
- **services/api/src/common/config/s3.config.ts** — AWS S3 configuration
- **services/api/src/common/middleware/production.middleware.ts** — Security headers
- **services/api/src/common/logger/structured-logger.ts** — JSON logging
- **services/api/src/common/health.controller.ts** — Health checks

## Deployment Flow

### Pre-Deployment Checklist

#### Database
- [ ] PostgreSQL cluster provisioned
- [ ] PostGIS extension installed
- [ ] Migrations applied: `pnpm db:migrate`
- [ ] Backups configured (daily)
- [ ] Connection string tested from API server
- [ ] SSL/TLS enabled (`sslmode=require`)

#### Redis
- [ ] Redis instance provisioned (Upstash, Render, etc.)
- [ ] Connection tested
- [ ] Password set
- [ ] Eviction policy: `allkeys-lru`
- [ ] Persistence enabled (RDB snapshots)

#### Email
- [ ] Provider chosen (SendGrid / SES / SMTP)
- [ ] API key/credentials obtained
- [ ] Test email sent successfully
- [ ] Sender email verified
- [ ] Bounce/complaint handling configured

#### Firebase
- [ ] Firebase project created
- [ ] Service account created
- [ ] Private key downloaded
- [ ] Test notification sent
- [ ] Cloud Messaging enabled

#### AWS S3
- [ ] S3 bucket created
- [ ] CORS configured:
  ```json
  [
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST"],
      "AllowedOrigins": ["https://app.imobi.com.br"],
      "MaxAgeSeconds": 3000
    }
  ]
  ```
- [ ] Versioning enabled (disaster recovery)
- [ ] Lifecycle policy set (archive after 90 days)
- [ ] IAM user created with minimal permissions

#### Platform Setup
- [ ] Domain configured
- [ ] SSL certificate installed
- [ ] CORS origins configured
- [ ] Environment variables set
- [ ] Build cache configured (if available)
- [ ] Log streaming enabled

### Deployment Steps

#### 1. Run Validation
```bash
# Verify configuration is correct
cd services/api
NODE_ENV=production npm run start

# Check health endpoint
curl http://localhost:4000/api/v1/health
```

#### 2. Deploy
Choose your platform:

**Vercel (Recommended for Full-Stack)**
```bash
# Push to main branch
git push origin main

# Vercel auto-deploys
# Check: Deployments tab for status
```

**Railway**
```bash
# Connect GitHub repo, Railway auto-deploys on push
# Or manual deploy via CLI:
railway deploy --service api
```

**Docker (Self-Hosted)**
```bash
# Build image
docker build -t imobi-api:v1.0.0 .

# Push to registry
docker push myregistry/imobi-api:v1.0.0

# Deploy to Kubernetes or Docker Swarm
kubectl set image deployment/api api=myregistry/imobi-api:v1.0.0
```

#### 3. Verify Deployment
```bash
# Check health
curl https://api.imobi.com/api/v1/health

# Check logs
# Platform-specific (see MONITORING.md)

# Test core functionality
# 1. User login
# 2. Create obra
# 3. Upload evidence
# 4. Test notifications
```

### Post-Deployment Checklist

- [ ] Health endpoint returns `status: ok`
- [ ] No error logs in first 5 minutes
- [ ] Database connections stable
- [ ] Redis cache functional
- [ ] Email sending works (test user signup)
- [ ] Push notifications work (test login)
- [ ] File uploads work (test evidence)
- [ ] All external services responding
- [ ] Monitoring/alerts active

## Environment-Specific Configuration

### Development (NODE_ENV=development)
- Redis: defaults to localhost:6379
- Database: local PostgreSQL (optional)
- Email: disabled (logged to console)
- Firebase: mocked
- S3: local file storage (optional)

### Staging (NODE_ENV=staging)
- All external services: real
- Database: staging PostgreSQL
- Redis: staging Redis
- Email: real (with staging domain)
- Notifications: real
- Backup: daily

### Production (NODE_ENV=production)
- All services: real and critical
- Database: production PostgreSQL with HA
- Redis: production cluster
- Email: real (production domain)
- Notifications: real
- Backup: hourly
- Monitoring: comprehensive
- SLA: 99.9%

## Critical Operations

### Database Backup & Restore

**Automatic Backup** (configured during setup):
- PostgreSQL: WAL archiving to S3
- Frequency: hourly
- Retention: 30 days
- Recovery: < 5 minutes

**Manual Backup**:
```bash
# Backup
pg_dump $DATABASE_URL > backup.sql.gz

# Restore
psql $DATABASE_URL < backup.sql.gz
```

### Scaling

**Horizontal Scaling**:
- Stateless API, can scale horizontally
- Load balancer distributes traffic
- Redis/Database: centralized

**Vertical Scaling**:
- If single API instance hits resource limits:
  - Vercel: automatic with more concurrency
  - Self-hosted: upgrade machine

**Auto-Scaling**:
```yaml
# Kubernetes
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

### Database Migrations

```bash
# Apply pending migrations
pnpm db:migrate:deploy

# Rollback last migration (dev only)
pnpm db:migrate:resolve

# Create new migration
pnpm db:migrate:dev --name add_new_column
```

### Credential Rotation

Monthly rotation schedule:
```bash
# Month 1: API keys (SendGrid, AWS)
# Month 2: Database password
# Month 3: Firebase service account
# Repeat monthly

# Steps
1. Generate new credential
2. Update in deployment platform
3. Redeploy application
4. Verify functionality
5. Revoke old credential
```

### Incident Response

**Database Unavailable**:
```
1. Check health endpoint: /api/v1/health
2. Verify DATABASE_URL in production
3. Check PostgreSQL connection from API server
4. Review database logs
5. If needed: failover to replica
6. Update status page
```

**Redis Unavailable**:
```
1. Check health endpoint
2. API continues but cache/queue disabled
3. Check REDIS_URL/password
4. Restart Redis cluster
5. Rebuild cache (automatic on recovery)
```

**Email Service Down**:
```
1. Switchover to secondary provider
2. Update EMAIL_PROVIDER and credentials
3. Redeploy
4. Monitor queue depth for pending emails
5. Process queue once service recovers
```

**Data Corruption**:
```
1. Take database offline (read-only)
2. Create full backup
3. Review logs to identify issue
4. Restore from backup
5. Reapply transactions post-recovery
```

## Monitoring & Alerts

### Real-Time Monitoring
- Health endpoint: `GET /api/v1/health`
- Logs: Platform-specific (Vercel, Railway, CloudWatch)
- Metrics: Request rate, error rate, latency

### Alert Configuration
```
Critical (Immediate):
  - Error rate > 5%
  - Database unreachable
  - Redis unavailable
  - Response time P95 > 2000ms

Warning (30 minutes):
  - Error rate > 1%
  - Queue depth growing
  - Cache hit rate < 80%
  - Disk usage > 80%

Info (Daily digest):
  - Deployment completed
  - Backup completed
  - Users: N, Transactions: N
```

## Rollback Plan

**Blue-Green Deployment**:
```
1. Deploy v2 to green environment
2. Run smoke tests
3. Route 10% traffic to green
4. Monitor for 30 minutes
5. Route 100% traffic to green
6. Keep blue as fallback (1 hour)
7. Rollback: switch back to blue if needed
```

**Commands**:
```bash
# Vercel: automatic version rollback
vercel rollback

# Railway: revert to previous deployment
railway rollback

# Manual: tag releases
git tag -a v1.2.3 -m "Release 1.2.3"
git push origin v1.2.3
```

## Maintenance Windows

**Planned Maintenance**:
- Schedule: Second Sunday of month, 2:00 UTC
- Duration: 30 minutes maximum
- Notification: Email to users 24h before
- Status page: Updated before/after
- Runbooks: Prepared in advance

**Emergency Maintenance**:
- Unplanned security patches
- Database repairs
- Service recovery
- Notification: Within 15 minutes of incident

## Compliance & Security

### Data Protection
- Encryption at rest (database, S3)
- Encryption in transit (HTTPS/TLS)
- Regular backups (tested monthly)
- GDPR compliant (data retention policies)

### Access Control
- API keys: rate limited per user
- Admin endpoints: IP whitelist + token auth
- Database: strong passwords + SSL required
- Logs: access restricted to operations team

### Security Headers
```
Strict-Transport-Security: max-age=31536000
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Content-Security-Policy: default-src 'self'
X-XSS-Protection: 1; mode=block
```

### Audit Logging
- User logins
- Financial transactions
- API errors
- Configuration changes
- Access to sensitive data
- Retention: 90 days minimum

## Support & Runbooks

Runbooks for common issues (links):
- [Database Connection Failed](./docs/runbooks/database-failed.md)
- [Redis Unavailable](./docs/runbooks/redis-failed.md)
- [Email Queue Backlog](./docs/runbooks/email-queue.md)
- [High Error Rate](./docs/runbooks/high-errors.md)
- [Out of Memory](./docs/runbooks/oom.md)

## Cost Optimization

### Service Costs
| Service | Free Tier | Production Cost | Notes |
|---------|-----------|-----------------|-------|
| PostgreSQL | 5GB | $50-200/mo | Managed DB recommended |
| Redis | - | $20-100/mo | Upstash recommended |
| Email | 100/mo | $0.01 per email | SendGrid + volume discount |
| Firebase | Limited | Pay-per-use | ~$5/mo for typical usage |
| S3 | 5GB first yr | $0.023/GB + transfer | Evidence storage |
| **Total** | - | **~$100-150/mo** | Scales with usage |

### Optimization Tips
1. Use Reserved Instances for database (30% savings)
2. Set S3 lifecycle policies (archive → Glacier)
3. Configure Redis eviction (LRU)
4. Enable database query logging (identify slow queries)
5. Use CDN for static assets (Vercel handles)

## Next Steps

1. **Week 1: Setup**
   - [ ] Provision all services
   - [ ] Configure environments
   - [ ] Deploy to staging
   - [ ] Run load tests

2. **Week 2: Testing**
   - [ ] End-to-end testing
   - [ ] Failover testing
   - [ ] Security audit
   - [ ] Performance tuning

3. **Week 3: Launch**
   - [ ] Deploy to production
   - [ ] Monitor 24/7 first week
   - [ ] Gradual traffic increase
   - [ ] Document learnings

4. **Ongoing**
   - [ ] Monitor health metrics daily
   - [ ] Rotate credentials monthly
   - [ ] Review logs weekly
   - [ ] Update runbooks quarterly
   - [ ] Test backups monthly
   - [ ] Plan capacity for growth

---

**Last Updated**: 2024-01-01  
**Document Version**: 1.0  
**Maintained By**: Engineering Team  
**Contact**: ops@imobi.com.br

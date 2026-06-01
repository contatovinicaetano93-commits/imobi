# imobi - Complete Deployment Plan

## Overview

This document outlines the complete deployment strategy for imobi platform across Staging and Production environments.

## Environment Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Development                           │
│  (localhost:3000 / localhost:4000)                      │
└──────────────────┬──────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────┐
│                    Staging                               │
│  (staging.imbobi.com.br / staging-api.imbobi.com.br)    │
│  Resources: 2 CPU, 4GB RAM                              │
│  Database: PostgreSQL 14 (1GB storage)                  │
│  Cache: Redis 7 (512MB)                                 │
└──────────────────┬──────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────┐
│                    Production                            │
│  (imbobi.com.br / api.imbobi.com.br)                    │
│  Resources: 4 CPU, 8GB RAM (Auto-scaling 2-8)           │
│  Database: PostgreSQL 14 RDS (20GB with backups)        │
│  Cache: Redis Elasticache (2GB)                         │
│  CDN: CloudFront for static assets                      │
└─────────────────────────────────────────────────────────┘
```

## Pre-Deployment Checklist

### Code Quality
- [ ] All tests passing: `pnpm test`
- [ ] Type checking passed: `pnpm type-check`
- [ ] No linting errors: `pnpm lint`
- [ ] No security vulnerabilities: `pnpm audit`
- [ ] All commits signed

### Infrastructure
- [ ] Staging infrastructure ready
- [ ] All environment variables configured
- [ ] Database migrations tested
- [ ] Redis cache configured
- [ ] S3 buckets created and configured
- [ ] SSL certificates valid
- [ ] Monitoring/alerting configured

### Documentation
- [ ] Release notes prepared
- [ ] API changes documented
- [ ] Database migration guide prepared
- [ ] Rollback plan documented
- [ ] Incident response procedures ready

## Staging Deployment

### 1. Build Applications

```bash
# Clean build
pnpm clean
pnpm install --frozen-lockfile

# Build all packages
pnpm build

# Verify builds
ls -la services/api/dist/
ls -la apps/web/.next/
ls -la apps/mobile/build/
```

### 2. Deploy to Staging Environment

#### Option A: Docker Compose

```bash
# Build Docker images
docker-compose build

# Pull latest images
docker-compose pull

# Start services
docker-compose up -d

# Run migrations
docker exec imbobi-api pnpm db:migrate

# Verify services
curl http://localhost:3000
curl http://localhost:4000/api/v1/health
```

#### Option B: Kubernetes

```bash
# Build and push images
docker build -t registry.imbobi.com.br/api:staging -f services/api/Dockerfile .
docker build -t registry.imbobi.com.br/web:staging -f apps/web/Dockerfile .
docker push registry.imbobi.com.br/api:staging
docker push registry.imbobi.com.br/web:staging

# Deploy to Kubernetes
kubectl apply -f k8s/staging/

# Wait for rollout
kubectl rollout status deployment/imbobi-api -n staging

# Run migrations
kubectl exec -it deployment/imbobi-api -n staging -- pnpm db:migrate
```

### 3. Smoke Testing

```bash
# Health checks
curl -f https://staging-api.imbobi.com.br/api/v1/health
curl -f https://staging.imbobi.com.br/

# Test critical flows
./API_TESTS.sh https://staging-api.imbobi.com.br/api/v1

# Manual testing checklist
- [ ] Sign up with test account
- [ ] Login and access dashboard
- [ ] KYC upload functionality
- [ ] Credit simulator calculation
- [ ] Work creation and evidence upload
- [ ] Payment simulation
- [ ] Mobile app connectivity
```

### 4. Load Testing

```bash
# Run load test (using k6)
k6 run load-test.js \
  --vus 100 \
  --duration 5m \
  --rps 1000

# Expected results
- Response time p95: < 500ms
- Error rate: < 0.1%
- Database connections: < 80% of pool
```

### 5. Security Testing

```bash
# Run security tests
./security-tests.sh

# OWASP Top 10 Verification
- [ ] Injection prevention (SQL, Command)
- [ ] Authentication bypass prevention
- [ ] Sensitive data exposure prevention
- [ ] XML External Entities (XXE) prevention
- [ ] Broken Access Control prevention
- [ ] Security misconfiguration prevention
- [ ] XSS prevention
- [ ] Insecure deserialization prevention
- [ ] Using components with known vulnerabilities prevention
- [ ] Insufficient logging prevention

# Manual penetration testing
- [ ] CSRF token validation
- [ ] IDOR prevention
- [ ] Rate limiting verification
- [ ] Encryption validation
```

### 6. Performance Testing

```bash
# Database query analysis
EXPLAIN ANALYZE SELECT * FROM obra WHERE usuario_id = $1;

# Check slow query log
SELECT * FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;

# Cache hit rate
redis-cli INFO stats | grep hit_rate

# Expected metrics
- API response: < 200ms (cached)
- Database query: < 100ms (with index)
- Cache hit rate: > 90%
```

## Production Deployment

### 1. Pre-Production Review

```bash
# Tag release
git tag -a v1.0.0 -m "Release 1.0.0"
git push origin v1.0.0

# Create release notes
gh release create v1.0.0 --draft

# Notify stakeholders
# - Send deployment plan to team lead
# - Notify support team
# - Post in #releases Slack channel
```

### 2. Blue-Green Deployment

```bash
# Deploy to "Green" (new) environment
kubectl apply -f k8s/production/green/ --namespace=production

# Run smoke tests on green environment
./API_TESTS.sh https://staging-api.imbobi.com.br/api/v1

# Switch traffic to green
kubectl patch service imbobi-api -p '{"spec":{"selector":{"version":"green"}}}'

# Monitor error rate
# If error rate > 1% for 5 minutes, switch back to blue
kubectl patch service imbobi-api -p '{"spec":{"selector":{"version":"blue"}}}'
```

### 3. Database Migration

```bash
# Backup production database
pg_dump $PRODUCTION_DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Test migrations on staging
docker exec staging-api pnpm db:migrate

# Run migrations in production (with fallback)
kubectl exec -it deployment/imbobi-api -n production -- pnpm db:migrate

# Verify migration
SELECT version FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 1;
```

### 4. Canary Deployment (Gradual Rollout)

```bash
# Deploy to 10% of traffic
kubectl set image deployment/imbobi-api \
  imbobi-api=registry.imbobi.com.br/api:v1.0.0 \
  --record

# Monitor canary metrics
- Error rate
- Response time
- Database load
- Redis memory

# Increase to 50% after 15 minutes if metrics are good
kubectl patch deployment imbobi-api -p \
  '{"spec":{"strategy":{"rollingUpdate":{"maxSurge":"50%"}}}}'

# Complete rollout to 100%
kubectl set image deployment/imbobi-api \
  imbobi-api=registry.imbobi.com.br/api:v1.0.0 \
  --all-containers
```

### 5. Post-Deployment Monitoring

```bash
# Monitor error rates
kubectl logs -f deployment/imbobi-api -n production --tail=100

# Check database connections
psql $PRODUCTION_DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"

# Verify cache performance
redis-cli --ssl --cacert /path/to/cert INFO stats

# Check external service connectivity
- [ ] AWS S3: ListBucket permission
- [ ] SMTP: Send test email
- [ ] Firebase: Token verification
```

### 6. Rollback Plan

```bash
# If critical issues detected:

# Option 1: Immediate rollback
kubectl rollout undo deployment/imbobi-api -n production

# Option 2: Switch back to blue (if blue-green)
kubectl patch service imbobi-api -p '{"spec":{"selector":{"version":"blue"}}}'

# Restore database from backup
psql $PRODUCTION_DATABASE_URL < backup_20260529_100000.sql

# Notify team
# Post in #incidents Slack channel with:
# - Issue description
# - Time to rollback
# - Next steps
```

## Continuous Deployment Pipeline

### GitHub Actions Workflow

```yaml
name: Deploy
on:
  push:
    tags: 'v*'

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      
      - name: Build images
        run: docker-compose build
      
      - name: Push to registry
        run: |
          docker login -u ${{ secrets.DOCKER_USERNAME }} -p ${{ secrets.DOCKER_PASSWORD }}
          docker-compose push
      
      - name: Deploy to staging
        run: docker-compose -f docker-compose.prod.yml up -d
      
      - name: Run tests
        run: pnpm test:e2e
      
      - name: Deploy to production
        if: success()
        run: |
          kubectl apply -f k8s/production/
          kubectl rollout status deployment/imbobi-api
```

## Monitoring & Observability

### Key Metrics to Track

- **Availability**: Target 99.9% uptime
- **Response Time**: p95 < 500ms
- **Error Rate**: < 0.5%
- **Database**: Connection pool usage, slow queries
- **Cache**: Hit rate > 90%
- **Infrastructure**: CPU < 70%, Memory < 80%, Disk < 85%

### Incident Response

**Severity Levels:**
- P1 (Critical): Service down, data loss
- P2 (High): Significant degradation
- P3 (Medium): Minor issues
- P4 (Low): Non-urgent

**Response Times:**
- P1: 15 min to mitigation
- P2: 30 min to mitigation
- P3: 2 hours to mitigation
- P4: Within business hours

## Disaster Recovery

### RTO & RPO Targets

- RTO: 30 minutes
- RPO: 15 minutes
- Backup frequency: Every 6 hours
- Retention: 30 days

### Backup Strategy

```bash
# Automated daily backups
0 2 * * * pg_dump $DATABASE_URL | gzip > /backups/daily_$(date +\%Y\%m\%d).sql.gz

# AWS S3 backup
aws s3 cp /backups/daily_$(date +%Y%m%d).sql.gz \
  s3://imbobi-backups/daily_$(date +%Y%m%d).sql.gz
```

### Data Recovery

```bash
# List available backups
ls -lah /backups/ | tail -20

# Restore from specific backup
gunzip < /backups/daily_20260529.sql.gz | psql $DATABASE_URL

# Verify recovery
psql $DATABASE_URL -c "SELECT COUNT(*) FROM usuario;"
```

## Release Schedule

- **Hotfixes**: On-demand (same day)
- **Patch releases**: Weekly (Thursdays 14:00 UTC)
- **Minor releases**: Bi-weekly (Thursdays 14:00 UTC)
- **Major releases**: Monthly (first Thursday 14:00 UTC)

## Success Criteria

Deployment is considered successful when:
- [ ] All services are running and healthy
- [ ] Error rate < 0.5% for 30 minutes
- [ ] Response times meet SLA
- [ ] All smoke tests pass
- [ ] No critical alerts triggered
- [ ] Database migrations completed successfully
- [ ] Cache is warming up properly

## Post-Deployment

1. **Documentation Update**: Update API docs, deployment runbooks
2. **Monitoring**: Set up alerts for new metrics
3. **Team Notification**: Post deployment summary in Slack
4. **Feedback**: Gather feedback from users and support team
5. **Metrics**: Review deployment success metrics

## Support Contacts

- **On-Call**: Page on-call engineer from PagerDuty
- **Team Lead**: @team-lead in Slack
- **Database Admin**: @dba in Slack
- **Infrastructure**: @devops in Slack

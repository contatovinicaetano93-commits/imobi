# Production Dashboards & Monitoring URLs

**Date**: 2026-05-30  
**Environment**: Production  
**Status**: Ready for Go-Live

---

## Monitoring & Alerting Dashboards

### 1. Sentry Error Tracking
- **Dashboard**: https://sentry.io/organizations/imobi/
- **Project**: https://sentry.io/projects/imobi
- **Performance**: https://sentry.io/projects/imobi/performance/
- **Alerts**: https://sentry.io/organizations/imobi/alerts/

**Configuration Status**:
- API: Sentry initialized ✅
- Web: Sentry initialized ✅
- DSN variables: Configured ✅
- Exception filter: Captures errors ✅
- User context: Enabled ✅
- Breadcrumbs: Logging actions ✅

**Next Action**: Create alert rules in Sentry dashboard

### 2. Vercel Analytics
- **Project Dashboard**: https://vercel.com/contatovinicaetano93-commits/imobi
- **Analytics**: https://vercel.com/contatovinicaetano93-commits/imobi/analytics
- **Deployments**: https://vercel.com/contatovinicaetano93-commits/imobi/deployments

**Configuration Status**:
- Package installed: @vercel/analytics ✅
- Component integrated: Root layout ✅
- Web Vitals: Enabled ✅
- Performance metrics: Auto-tracking ✅

**Metrics Tracked**:
- First Contentful Paint (FCP)
- Largest Contentful Paint (LCP)
- Cumulative Layout Shift (CLS)
- Response time
- Custom events

### 3. Health Check Endpoint
- **Endpoint**: https://api.imbobi.com.br/api/v1/health
- **Expected Response**:
```json
{
  "status": "ok",
  "timestamp": "2026-05-30T10:00:00.000Z",
  "redis": true,
  "email": true,
  "firebase": true,
  "database": true
}
```

**Health Checks Included**:
- ✅ Redis connection
- ✅ Email provider (SendGrid)
- ✅ Firebase configuration
- ✅ Database connection (PostgreSQL)

### 4. External Uptime Monitoring (To Configure)
- **UptimeRobot**: https://uptimerobot.com
  - Monitor Type: HTTP(s)
  - URL: https://api.imbobi.com.br/api/v1/health
  - Interval: 5 minutes
  - Keyword: "ok"
  - Notifications: Email + Slack

- **Pingdom**: https://www.pingdom.com
  - Similar configuration
  - Check interval: 5 minutes
  - Response code: 200

---

## Application URLs

### Web Application
- **Production**: https://imobi.vercel.app
- **Custom Domain**: https://imbobi.com.br (when configured)
- **Git Repository**: https://github.com/[owner]/imobi

### API Service
- **Base URL**: https://api.imbobi.com.br
- **Health Check**: https://api.imbobi.com.br/api/v1/health
- **API Documentation**: https://api.imbobi.com.br/api
- **Swagger Docs** (if enabled): https://api.imbobi.com.br/api/docs

---

## Database & Infrastructure

### PostgreSQL
- **Type**: PostgreSQL 14+ with PostGIS
- **Backups**: Stored in S3 (s3://imbobi-backups/postgres/)
- **Restore Procedure**: See `DISASTER_RECOVERY.md`

### Redis
- **Cache**: Configured for API responses
- **Queues**: BullMQ for payment processing
- **Persistence**: RDB snapshots enabled

### AWS S3
- **Bucket**: imbobi-evidencias-prod
- **Use**: Obra photos and evidence storage
- **CDN**: CloudFront distribution configured
- **Region**: us-east-1

---

## Monitoring Command Reference

### Test Health Check
```bash
curl -s https://api.imbobi.com.br/api/v1/health | jq .
```

### Check Redis
```bash
redis-cli -h $REDIS_HOST -p $REDIS_PORT ping
```

### PostgreSQL Connection
```bash
psql -c "SELECT version();" -h $DB_HOST -U $DB_USER -d $DB_NAME
```

### Sentry CLI (if installed)
```bash
sentry-cli releases list
sentry-cli issues list
sentry-cli issues show <issue-id>
```

---

## Alert Contacts & Escalation

| Component | Slack Channel | Email | On-Call |
|-----------|---------------|-------|---------|
| **Sentry Errors** | #alerts-critical | ops@imbobi.com | @on-call |
| **Performance Issues** | #alerts-performance | ops@imbobi.com | @on-call |
| **Downtime** | #alerts-critical | ops@imbobi.com | @page-on-call |
| **Backups** | #ops | backup-team@imbobi.com | — |

---

## Post-Launch Monitoring Tasks

### Day 1 (2026-06-02)
- [ ] Verify Sentry dashboard receiving errors
- [ ] Check Vercel Analytics data
- [ ] Test health check endpoint
- [ ] Monitor error rates (target: < 0.1%)
- [ ] Verify database backups executed

### Week 1
- [ ] Review error patterns in Sentry
- [ ] Analyze performance metrics (Vercel)
- [ ] Establish baseline metrics
- [ ] Tune alert thresholds
- [ ] Complete incident response drill

### Month 1
- [ ] Review uptime percentage (target: 99.9%)
- [ ] Analyze load test results
- [ ] Optimize slow endpoints
- [ ] Update documentation
- [ ] Plan scaling improvements

---

## Useful Resources

- **Sentry Docs**: https://docs.sentry.io/
- **Vercel Docs**: https://vercel.com/docs
- **NestJS Docs**: https://docs.nestjs.com/
- **Next.js Docs**: https://nextjs.org/docs
- **Prisma Docs**: https://www.prisma.io/docs/
- **PostgreSQL Docs**: https://www.postgresql.org/docs/
- **Redis Docs**: https://redis.io/docs/

---

## Support & Troubleshooting

See `MONITORING_SETUP_FINALIZATION.md` for:
- Troubleshooting common issues
- Backup restore procedures
- Alert configuration steps
- Health monitoring setup

---

**Document Version**: 1.0  
**Last Updated**: 2026-05-30  
**Status**: Production Ready

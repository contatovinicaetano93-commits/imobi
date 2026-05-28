# 📋 Post-Deployment Verification Checklist

**Deployment Date:** ___________  
**Deployed By:** ___________  
**Environment:** Production  
**Duration:** ___________  

---

## Pre-Deployment (T-1 hour)

- [ ] All feature branches merged to main
- [ ] Latest commits tested in staging environment
- [ ] Database migrations tested with backup restore
- [ ] Sentry source maps uploaded
- [ ] Monitoring dashboards ready
- [ ] On-call team notified
- [ ] Rollback procedure documented
- [ ] API health check endpoint verified
- [ ] Database backups fresh
- [ ] SSL certificates valid (90+ days remaining)

---

## Immediate Post-Deployment (T+0 to T+30 min)

### Basic Connectivity

- [ ] API service responding (curl https://api.imbobi.com/health)
- [ ] Web application loads (https://app.imbobi.com)
- [ ] Mobile app connecting to API
- [ ] Database connections established
- [ ] Redis cache operational
- [ ] S3 file uploads working

### Smoke Tests - Critical Flows

#### 1. User Registration & Authentication

```bash
# Test signup
curl -X POST https://api.imbobi.com/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@imbobi.com",
    "password": "Test123!@#",
    "name": "Test User"
  }'
```

- [ ] Signup successful (201 Created)
- [ ] Token returned
- [ ] Email verification sent (check logs)

```bash
# Test login
curl -X POST https://api.imbobi.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@imbobi.com",
    "password": "Test123!@#"
  }'
```

- [ ] Login successful (200 OK)
- [ ] Access token received
- [ ] Refresh token in HttpOnly cookie

#### 2. Evidence Upload

```bash
curl -X POST https://api.imbobi.com/api/v1/evidences/upload \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -F "file=@test-image.jpg"
```

- [ ] Upload successful (200 OK)
- [ ] S3 URL returned
- [ ] File accessible via URL
- [ ] Metadata stored in database

#### 3. Location Tracking (PostGIS)

```bash
curl -X POST https://api.imbobi.com/api/v1/locations \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": -23.5505,
    "longitude": -46.6333,
    "accuracy": 10
  }'
```

- [ ] Location saved (201 Created)
- [ ] PostGIS validation passed
- [ ] Location queryable by proximity

#### 4. Push Notifications

- [ ] Firebase configuration loaded
- [ ] Device tokens accepted
- [ ] Test notification delivered to mobile app
- [ ] Notification appears on lock screen

#### 5. Payment Processing (if applicable)

```bash
curl -X POST https://api.imbobi.com/api/v1/payments \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 10.00,
    "currency": "BRL",
    "installments": 1
  }'
```

- [ ] Payment initiated (200 OK)
- [ ] Payment URL generated
- [ ] Test transaction processed
- [ ] Webhook received from payment processor

### Error Monitoring

- [ ] Sentry receiving errors
- [ ] No spike in error rate
- [ ] Error rate < 0.5%
- [ ] Alert thresholds reasonable
- [ ] Notification channels working

### Performance Baseline

```bash
# Check response times
curl -w "Response time: %{time_total}s\n" https://api.imbobi.com/api/v1/health
```

- [ ] API response time < 100ms (p50)
- [ ] No unusual database query times
- [ ] Redis responding normally
- [ ] CPU utilization < 50%
- [ ] Memory utilization < 60%
- [ ] Network latency acceptable

---

## First Hour Post-Deployment (T+30 to T+60 min)

### Monitor Key Metrics

**Check every 10 minutes:**

```bash
# API Error Rate
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApplicationELB \
  --metric-name HTTPCode_Target_5XX_Count \
  --dimensions Name=LoadBalancer,Value=app/imbobi-alb/123456 \
  --start-time $(date -u -d '10 minutes ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 60 \
  --statistics Sum

# API Response Time
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApplicationELB \
  --metric-name TargetResponseTime \
  --dimensions Name=LoadBalancer,Value=app/imbobi-alb/123456 \
  --start-time $(date -u -d '10 minutes ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 60 \
  --statistics Average,Maximum
```

**Metrics Dashboard:**

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Error Rate | < 0.5% | ___% | ☐ |
| Response Time (p50) | < 100ms | ___ms | ☐ |
| Response Time (p95) | < 500ms | ___ms | ☐ |
| CPU Utilization | < 70% | __% | ☐ |
| Memory Utilization | < 75% | __% | ☐ |
| Active Connections | Stable | ___ | ☐ |
| Database Queries | Normal | ___ | ☐ |
| Cache Hit Rate | > 80% | __% | ☐ |

### User Activity Monitoring

- [ ] Check admin dashboard for active users
- [ ] Monitor transaction volume
- [ ] Verify data is being persisted correctly
- [ ] Check webhook deliveries (payments, notifications)
- [ ] Monitor email delivery (SendGrid dashboard)

### Log Analysis

```bash
# Check API logs
aws logs tail /ecs/imbobi-api-prod --follow --since 1h

# Filter for errors
aws logs filter-log-events \
  --log-group-name /ecs/imbobi-api-prod \
  --filter-pattern "[ERROR]" \
  --start-time $(date -d '1 hour ago' +%s)000
```

- [ ] No unexpected error patterns
- [ ] No database connection errors
- [ ] No authentication failures
- [ ] No file upload errors
- [ ] No external API failures

---

## First Day Post-Deployment (T+24 hours)

### Data Integrity Checks

```sql
-- Check for orphaned records
SELECT 'evidences' as table_name, COUNT(*) FROM evidences WHERE created_at > NOW() - INTERVAL '24 hours';
SELECT 'transactions' as table_name, COUNT(*) FROM transactions WHERE created_at > NOW() - INTERVAL '24 hours';
SELECT 'locations' as table_name, COUNT(*) FROM locations WHERE created_at > NOW() - INTERVAL '24 hours';

-- Check for duplicate data
SELECT COUNT(*) FROM (SELECT id, COUNT(*) FROM evidences GROUP BY id HAVING COUNT(*) > 1);

-- Verify PostGIS geometry
SELECT COUNT(*) FROM locations WHERE ST_IsValid(geom) = false;
```

- [ ] No orphaned records
- [ ] No duplicate data
- [ ] PostGIS geometries valid
- [ ] Foreign key constraints satisfied
- [ ] Indexes being used properly

### Feature Verification (Extended)

**User Management:**
- [ ] User registration working
- [ ] Email confirmations sent
- [ ] Password reset functional
- [ ] Profile updates saved
- [ ] User deletion soft-deletes properly

**Evidence Management:**
- [ ] Photos upload and display
- [ ] Metadata extracted correctly
- [ ] S3 storage working
- [ ] CDN caching active
- [ ] File permissions correct

**Location Services:**
- [ ] GPS tracking functional
- [ ] PostGIS queries fast (< 100ms)
- [ ] Proximity searches accurate
- [ ] Map display correct
- [ ] Offline sync working (mobile)

**Notifications:**
- [ ] Push notifications delivering
- [ ] Email notifications sent
- [ ] In-app notifications displayed
- [ ] Notification preferences respected
- [ ] No duplicate notifications

**External Integrations:**
- [ ] KYC verification (UNICO/SERPRO) working
- [ ] Payment processor connected
- [ ] Firebase Cloud Messaging functional
- [ ] SMS delivery (if applicable)
- [ ] Webhook parsing correct

### Performance Analysis

```bash
# Generate performance report
pnpm perf:report

# Analyze bundle size
ANALYZE=true pnpm build

# Check database query performance
# Enable slow query log
# Query log analysis
```

- [ ] Bundle size < 200KB (gzipped)
- [ ] Largest route < 100KB
- [ ] No unused dependencies
- [ ] Tree-shaking working
- [ ] Code splitting optimal
- [ ] Images optimized
- [ ] Critical CSS inlined

### Security Verification

- [ ] SSL/TLS certificates valid
- [ ] HSTS header present
- [ ] CSP headers restrictive
- [ ] No sensitive data in logs
- [ ] API rate limiting working
- [ ] CORS configured correctly
- [ ] SQL injection prevention verified
- [ ] XSS protection active

### Backup Validation

```bash
# Test backup restoration to staging
bash scripts/restore-db.sh /path/to/backup.sql.gz
```

- [ ] RDS backups exist (30-day retention)
- [ ] S3 versioning enabled
- [ ] Cross-region replication working
- [ ] Backup restoration tested
- [ ] Backup validation script passed

---

## First Week Post-Deployment

### Stability Assessment

- [ ] Zero critical incidents
- [ ] Error rate stable < 0.3%
- [ ] No performance degradation
- [ ] No unplanned restarts
- [ ] Uptime > 99.9%

### User Feedback Collection

- [ ] Monitor support channels
- [ ] Track bug reports
- [ ] Collect user feedback
- [ ] Note feature requests
- [ ] Document issues found

### Logs & Monitoring Review

```bash
# Weekly report
aws logs describe-log-groups
aws cloudwatch list-metrics
```

- [ ] Review all error logs
- [ ] Check for warning patterns
- [ ] Analyze slow queries
- [ ] Review CloudWatch alarms
- [ ] Update alert thresholds if needed

### Team Review

- [ ] Engineering team debrief
- [ ] Document deployment notes
- [ ] Update runbooks based on findings
- [ ] Share lessons learned
- [ ] Plan improvements

---

## Rollback Criteria (Auto-Triggered)

**Immediate Rollback if:**

- [ ] Error rate > 5% for 5 consecutive minutes
- [ ] API response time > 2s (p95) for 10 consecutive minutes
- [ ] Database connection pool exhausted
- [ ] Critical data corruption detected
- [ ] Major feature completely non-functional
- [ ] Security vulnerability discovered

**Rollback Procedure:**

```bash
# 1. Alert team
# 2. Identify last good revision
PREVIOUS_REVISION=$((CURRENT_REVISION - 1))

# 3. Update service
aws ecs update-service \
  --cluster imbobi-prod \
  --service imbobi-api-prod \
  --task-definition imbobi-api-prod:$PREVIOUS_REVISION

# 4. Monitor
watch -n 1 'aws ecs describe-services --cluster imbobi-prod --services imbobi-api-prod'

# 5. Verify
curl https://api.imbobi.com/health
```

- [ ] Rollback initiated
- [ ] Previous version stable
- [ ] Error rate returns to normal
- [ ] Performance metrics normalized
- [ ] Post-incident analysis started

---

## Sign-Off

| Role | Name | Signature | Date | Time |
|------|------|-----------|------|------|
| Deployment Lead | __________ | __________ | __________ | __________ |
| SRE/DevOps | __________ | __________ | __________ | __________ |
| Engineering Manager | __________ | __________ | __________ | __________ |

---

## Notes & Issues

**Issues Found:**

1. ___________________________________________
   - Resolution: ________________________________________
   - Status: ☐ Open  ☐ In Progress  ☐ Resolved

2. ___________________________________________
   - Resolution: ________________________________________
   - Status: ☐ Open  ☐ In Progress  ☐ Resolved

3. ___________________________________________
   - Resolution: ________________________________________
   - Status: ☐ Open  ☐ In Progress  ☐ Resolved

**Post-Deployment Observations:**

_________________________________________________________________

_________________________________________________________________

_________________________________________________________________

---

## Follow-Up Actions

- [ ] Action: __________________ Owner: __________ Due: __________
- [ ] Action: __________________ Owner: __________ Due: __________
- [ ] Action: __________________ Owner: __________ Due: __________

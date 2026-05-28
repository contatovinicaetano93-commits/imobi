# Alerts & Monitoring Configuration Guide

## Overview
This document configures proactive alerting across deployment, application performance, and error tracking systems. All alerts route to appropriate channels for rapid incident response.

---

## 1. Vercel Deployment Alerts

### 1.1 Enable Deployment Notifications

**Dashboard Configuration**:
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Settings → Notifications
4. Enable "Deployment Events"

### 1.2 Failed Build Alerts

**Configuration**:
- **Trigger**: Build failure (any step)
- **Routes**:
  - Email: team@imbobi.dev (project owner)
  - Slack: #deployments (via integration)
- **Expected Response Time**: < 5 minutes

**Alert Details**:
- Includes build logs
- Links to PR and commit
- Retry action available

**Integration Setup**:
1. Settings → Integrations
2. Search "Slack"
3. Select Slack workspace
4. Grant permissions
5. Choose #deployments channel for build failures

### 1.3 Successful Deployment Alerts

**Configuration**:
- **Trigger**: Deployment success to production
- **Route**: Slack #deployments channel
- **Message Includes**:
  - Deployment timestamp
  - Git commit hash
  - Branch (main/develop)
  - Vercel deployment URL

**Notification Format**:
```
✅ Deployment Success
Project: imbobi-web
Branch: main
Commit: abc1234 - feat: new feature
Deploy URL: https://imbobi-prod.vercel.app
Time: 2024-05-28 14:32 UTC
```

---

## 2. APM (Application Performance Monitoring) Alerts

When APM is configured (Datadog, New Relic, or similar), implement these thresholds:

### 2.1 Latency Alerts

**Metric**: Response latency (p95)  
**Threshold**: > 1000ms (1 second)  
**Duration**: Sustained for 5 minutes  
**Route**: Email to ops-team@imbobi.dev

**Alert Message**:
```
Critical Latency Alert
Service: API Gateway
P95 Latency: 1,245ms (threshold: 1,000ms)
Affected Endpoints: /works/*, /estimates/*
Duration: 8 minutes
Recommendation: Check database query performance, cache hit rates
```

**Response Steps**:
1. Check database slow query logs
2. Verify cache hit rates
3. Check external API dependencies (payment processor, file uploads)
4. Monitor CPU/memory on API instances

### 2.2 Error Rate Alerts

**Metric**: Error rate percentage  
**Threshold**: > 5%  
**Duration**: Sustained for 3 minutes  
**Route**: Slack #critical-errors channel

**Alert Message**:
```
:warning: Error Rate Critical
Service: API
Error Rate: 7.3% (threshold: 5%)
Error Type: Database connection timeouts
Affected Endpoints: /works/*, /estimates/*
Last 5 min: 287 errors out of 3,920 requests
```

**Escalation**:
- Automatically create incident in on-call rotation
- Notify Slack @ops-oncall
- Pin message in #critical-errors

### 2.3 CPU/Memory Alerts

**Metric**: CPU usage  
**Threshold**: > 80%  
**Duration**: Sustained for 10 minutes  
**Route**: Slack #infra channel

**Metric**: Memory usage  
**Threshold**: > 90%  
**Duration**: Sustained for 5 minutes  
**Route**: Slack #infra channel

**Alert Message**:
```
Resource Alert - CPU High
Service: API instances (prod-api-1, prod-api-2)
CPU Usage: 84% (threshold: 80%)
Memory: 62%
Duration: 12 minutes
Action: Review auto-scaling metrics, consider horizontal scaling
```

---

## 3. Error Tracking (Sentry) Alerts

### 3.1 New Error Type Alerts

**Configuration** (in Sentry):
1. Go to Alerts → Create Alert Rule
2. **Trigger**: `event.level:error AND first-release:true` (new errors)
3. **Actions**:
   - Send email to team@imbobi.dev
   - Post to Slack #errors channel

**Alert Details**:
```
New Error Type Detected
Error: TypeError: Cannot read property 'geoLocation' of undefined
Project: @imbobi/api
Release: v1.2.3
First Occurrence: 2024-05-28 14:32 UTC
Affected Users: 3
Stack Trace: [linked]
```

### 3.2 Critical Error Alerts

**Configuration**:
1. Go to Alerts → Create Alert Rule
2. **Trigger**: `event.level:error AND tags.severity:critical`
3. **Actions**:
   - Post to Slack #critical-errors
   - Send email to ops-team@imbobi.dev
   - Create incident alert

**Critical Error Tags** (auto-applied):
- Database connection failures
- Authentication service down
- Payment processor errors
- S3/storage failures
- Unhandled promise rejections

**Alert Message**:
```
:fire: CRITICAL ERROR
Service: @imbobi/api
Error: Database connection pool exhausted
Severity: Critical
Status: Active (15 minutes)
Affected Users: 247
Action: Auto-escalate to on-call engineer
```

### 3.3 Error Spike Alerts

**Configuration**:
1. Alerts → Create Alert Rule
2. **Trigger**: Error rate increases 10x from baseline
3. **Time Window**: Last 10 minutes vs. previous hour
4. **Route**: Slack #critical-errors + email

---

## 4. Alert Routing Matrix

### By Severity

| Severity | Channel | Recipients | Response Time |
|----------|---------|------------|---|
| **Critical** | Slack #critical-errors | ops-oncall, team-lead | < 5 min |
| **High** | Slack #deployments | dev-team, ops | < 15 min |
| **Medium** | Email | team@imbobi.dev | < 1 hour |
| **Low** | Slack #general | engineering | < 24 hours |

### By Type

| Alert Type | Channel | Threshold | Action |
|-----------|---------|-----------|--------|
| Failed Builds | #deployments | Any failure | Block merge, fix required |
| Deployment Success | #deployments | Every deploy | FYI, no action |
| High Latency | Email + #infra | > 1s p95 | Investigate performance |
| Error Rate Spike | #critical-errors | > 5% | Page on-call |
| New Error Type | #errors | First occurrence | Investigate, may need fix |
| Critical Error | #critical-errors | Severity flag | Page on-call immediately |

---

## 5. Integration Steps

### Vercel + Slack Integration
```
1. Vercel Dashboard → Settings → Integrations
2. Connect Slack workspace
3. Authorize permissions
4. Select channels:
   - #deployments (for build/deploy events)
   - #errors (for error alerts)
```

### Sentry + Slack Integration
```
1. Sentry → Settings → Integrations
2. Install Slack integration
3. Authorize Slack workspace
4. Configure alert rules with Slack actions
5. Test with: Issue → Actions → Send test notification
```

### Email Configuration
```
1. GitHub Settings → Notifications → Email address
2. Vercel → Settings → Email notifications
3. Sentry → Settings → Email configuration
4. Use team@imbobi.dev for group alerts
```

---

## 6. Incident Response Workflow

### When Alert Fires

1. **Immediate**: Verify alert is real (not flaky test/transient)
2. **First 5 min**: Check dashboard, review logs, assess impact
3. **Within 15 min**: Communicate status in Slack thread
4. **Within 30 min**: Begin remediation or rollback
5. **Post-incident**: Document root cause, update runbook

### Alert Escalation

```
Alert fires
    ↓
Slack notification posted
    ↓
No response in 10 min?
    ↓
Escalate to ops-oncall
    ↓
No response in 5 min?
    ↓
Page on-call engineer (PagerDuty)
```

---

## 7. Testing & Validation

### Test Alerts

**Vercel**: 
- Manual trigger: Settings → Deployments → Retry failed build

**Sentry**:
- Manual trigger: Issue → Test notification

**APM (if configured)**:
- Manual trigger: Alert rules → Test alert

### Monthly Drill
- 1st of each month: Trigger test alerts to verify routing
- Confirm notifications reach intended recipients
- Update routing if channels/emails change

---

## 8. Monitoring Dashboard Setup

### Recommended Dashboards

1. **Operations Dashboard** (shared by team):
   - Deployment status (Vercel)
   - Error rate (Sentry)
   - Latency metrics (APM)
   - Active incidents

2. **On-Call Dashboard** (for on-call rotation):
   - Critical errors
   - Resource utilization
   - Recent deployments
   - Active alerts

3. **Development Dashboard** (per engineer):
   - Your project's build status
   - Your service's errors
   - Your feature's performance

---

## 9. Checklist: Alert Setup Verification

- [ ] Vercel notifications enabled in project settings
- [ ] Slack integration connected (Vercel)
- [ ] Slack #deployments channel created
- [ ] Slack #critical-errors channel created
- [ ] Sentry account configured
- [ ] Sentry Slack integration configured
- [ ] APM platform selected (if using)
- [ ] Email notifications configured
- [ ] Alert rules created for all thresholds
- [ ] Test alerts sent successfully
- [ ] Team notified of alert channels
- [ ] On-call rotation setup in PagerDuty (if using)

---

## 10. References

- [Vercel Notifications Docs](https://vercel.com/docs/concepts/integrations/notifications)
- [Sentry Alert Rules Docs](https://docs.sentry.io/product/alerts/)
- [Slack Integration Docs](https://api.slack.com/messaging)

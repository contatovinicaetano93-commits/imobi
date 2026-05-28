# Imobi Beta Launch - Quick Reference Card

Print this page and keep at your desk during beta launch.

---

## Key Contacts

| Role | Name | Email | Phone | On-Call |
|------|------|-------|-------|---------|
| **Product Lead** | [Name] | contato.vinicaetano93@gmail.com | [+55] | YES |
| **DevOps** | [Name] | [email] | [phone] | |
| **Engineering** | [Name] | [email] | [phone] | |
| **Support** | [Name] | [email] | [phone] | |

---

## Dashboard URLs (Bookmark These!)

```
Vercel Analytics:
https://vercel.com/contatovinicaetano93-commits/imobi/analytics

Sentry Issues:
https://sentry.io → Your Project → Issues

API Health:
https://api.imobi.com/api/v1/health

Web App:
https://imobi.vercel.app

Slack Channel:
#imobi-incidents
```

---

## Health Check (First Thing - Every Shift)

```bash
# 1. API Health
curl -s https://api.imobi.com/api/v1/health | jq .
# Expected: HTTP 200, { "status": "ok" }

# 2. Web App Access
# Open https://imobi.vercel.app in browser
# Expected: Login page loads <2s

# 3. Test Account Login
# Try login with: beta-construtora-1@imobi.test / BetaPass123!
# Expected: Dashboard loads
```

---

## Critical Alert Thresholds

| Metric | Warning | Alert | Action |
|--------|---------|-------|--------|
| **LCP (Page Load)** | 2.5s | 4s | Check Vercel Analytics |
| **Error Rate** | 0.5% | 1% | Check Sentry |
| **API Response Time** | 500ms | 1s | Check API logs |
| **Queue Depth** | 100 jobs | 1000 jobs | Check BullMQ status |
| **DB Connection Pool** | 80% | 95% | Restart workers |
| **API Down** | ANY | ANY | Page on-call |

---

## Escalation Path

**P0 (CRITICAL)** → Page on-call immediately
- API completely down
- Authentication broken
- Database unreachable
- Security incident

**P1 (HIGH)** → Respond within 15 min
- Error rate >5%
- Feature completely broken
- Performance degraded >50%

**P2 (MEDIUM)** → Respond within 1 hour
- Error rate 1-5%
- Non-critical feature broken

**P3 (LOW)** → Next business day
- Minor UX issues
- Feature request

---

## Test Accounts (Reference)

| Role | Email | Password |
|------|-------|----------|
| **Construtora** | beta-construtora-1@imobi.test | BetaPass123! |
| **Gestor** | beta-gestor-1@imobi.test | BetaPass123! |
| **Engenheiro** | beta-engenheiro-1@imobi.test | BetaPass123! |
| **Parceiro** | beta-parceiro-1@imobi.test | BetaPass123! |

All accounts login: https://imobi.vercel.app/login

---

## Key Metrics to Monitor (Every 15 min - First 2 hrs)

**Green (OK)**
- [ ] Error rate <0.5%
- [ ] LCP <2.5s
- [ ] API response <1s
- [ ] Queue depth <100
- [ ] Database responsive

**Yellow (Warning)**
- [ ] Error rate 0.5-1%
- [ ] LCP 2.5-4s
- [ ] API response 1-2s
- [ ] Queue depth 100-1000
- [ ] High CPU/memory

**Red (Critical)**
- [ ] Error rate >1%
- [ ] LCP >4s
- [ ] API response >2s
- [ ] Queue depth >1000
- [ ] Service down

---

## Monitoring Checklist (Daily)

### Morning (9 AM)
- [ ] Open dashboards
- [ ] Check overnight error spikes
- [ ] Verify test accounts accessible
- [ ] Review Sentry for new issues
- [ ] Brief team on status

### Hourly (Business Hours)
- [ ] Spot-check error rate
- [ ] Verify page load times
- [ ] Check queue depth
- [ ] Review recent Sentry errors
- [ ] Monitor user signups

### Evening (5 PM)
- [ ] Daily metrics summary
- [ ] Document any incidents
- [ ] Plan next day
- [ ] Ensure alerts still active
- [ ] Pass to on-call engineer

---

## Incident Response (If Alert Fires)

1. **Identify Severity** → P0/P1/P2/P3
2. **Check Dashboard** → What's the actual metric?
3. **Investigate** → Error? Performance? Infrastructure?
4. **Communicate** → Post to #imobi-incidents
5. **Fix** → Apply solution or hotfix
6. **Verify** → Confirm resolution
7. **Document** → Log in incident tracker

---

## Quick Commands

**Check API Status**
```bash
curl -s https://api.imobi.com/api/v1/health | jq .
```

**Test Authentication**
```bash
curl -X POST https://api.imobi.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"beta-construtora-1@imobi.test","senha":"BetaPass123!"}'
```

**Check Web App**
```bash
curl -s -o /dev/null -w "HTTP %{http_code}" https://imobi.vercel.app
# Expected: HTTP 200
```

**Database Connection Test**
```bash
# From API shell/Docker:
npx prisma db execute --stdin
# Type: SELECT 1;
# Expected: Success
```

---

## Common Issues & Quick Fixes

| Issue | Check | Fix |
|-------|-------|-----|
| **Login fails** | API health | Restart API container |
| **Slow pages** | LCP metric | Check CDN, clear cache |
| **High errors** | Sentry | Check recent deployment |
| **Queue backlog** | Queue depth | Restart workers |
| **DB slow** | Query times | Check slow query log |

---

## Documentation Files (Reference)

```
/home/user/imobi/BETA_TEST_ACCOUNTS.md
  → Credentials and account info

/home/user/imobi/BETA_MONITORING_GUIDE.md
  → Detailed monitoring procedures

/home/user/imobi/BETA_LAUNCH_ANNOUNCEMENT.md
  → Message for beta testers

/home/user/imobi/BETA_LAUNCH_CHECKLIST.md
  → Pre-launch verification items

/home/user/imobi/BETA_LAUNCH_README.md
  → Master index of all docs

/home/user/imobi/BETA_LAUNCH_STATUS_REPORT.md
  → Preparation status and next steps

/home/user/imobi/BETA_QUICK_REFERENCE.md
  → This quick reference (you are here)
```

---

## Communication Templates

**Status Update Post**
```
@channel Launch status update:
- API Health: OK
- Error Rate: 0.03%
- Active Users: X
- Incidents: None
- Next update: [time]
```

**Incident Alert Post**
```
@channel INCIDENT ALERT
- Severity: [P0/P1/P2]
- Issue: [Description]
- Impact: [Affected feature/users]
- ETA: [Estimated resolution time]
- Updates: [Every 5 min]
```

**Resolution Post**
```
@channel RESOLVED
- Issue: [What was fixed]
- Root Cause: [Why it happened]
- Solution: [What we did]
- Duration: [Total time down]
- Post-mortem: [Scheduled for date/time]
```

---

## Go/No-Go Criteria (Pre-Launch)

**GO if:**
- [ ] API health: 200 OK
- [ ] Auth flow: Working
- [ ] All test accounts: Created
- [ ] Monitoring: Active
- [ ] No critical security issues
- [ ] Team ready
- [ ] Rollback plan documented

**NO-GO if:**
- [ ] Any service down
- [ ] Auth broken
- [ ] Critical vulnerability found
- [ ] Monitoring not working
- [ ] Team not ready

---

## Key Numbers to Remember

| Metric | Target |
|--------|--------|
| **Uptime** | >99.5% |
| **Error Rate** | <0.1% |
| **Page Load (p95)** | <2.5s |
| **API Response (p95)** | <1s |
| **Test Accounts** | 8 total |
| **Support Response** | <24 hours |
| **Critical Response** | <15 min |

---

## Launch Day Timeline

```
T-24h    → Final verification checklist
T-12h    → Team briefing + test accounts verified
T-6h     → Launch announcement prepared
T-2h     → Dashboards open, monitoring active
T-0      → LAUNCH
T+5m     → Check first metrics
T+15m    → Check error rate
T+30m    → Full dashboard review
T+1h     → Brief team on launch status
T+2h     → Reduce monitoring frequency
```

---

## Post-Launch Timeline

```
Day 1    → Monitor every 15 min (business hours)
Day 2-7  → Monitor every hour, daily summary
Week 2   → Daily monitoring review + metrics
Week 3   → Weekly review only
Week 4+  → Ongoing monitoring with weekly review
```

---

## Important Reminders

✓ Keep dashboards open during business hours  
✓ Respond to alerts promptly  
✓ Document all incidents  
✓ Check Sentry daily for error patterns  
✓ Verify test accounts still accessible  
✓ Support team monitors email  
✓ On-call engineer on standby  
✓ Rollback plan is ready  
✓ Data backups recent  
✓ Keep team informed  

---

**Printed**: [Date]  
**Valid Until**: [30 days or until GA launch]  
**Last Updated**: May 28, 2026  

Keep at desk. Reference frequently. Update as needed.

---

## Notes Section

```
[Space for handwritten notes during launch]
```


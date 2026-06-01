# PHASE 9: On-Call Setup — imobi Operations Team

**Document Version:** 1.0  
**Created:** 2026-05-31  
**Effective Date:** 2026-06-02, 02:00 UTC (Launch Day)  
**Owner:** DevOps Lead + HR/Operations  
**Scope:** Week 1 intensive monitoring + ongoing on-call rotation  
**Audience:** All engineers, Tech Lead, DevOps Lead, Operations team

---

## Table of Contents

1. [On-Call Rotation Schedule](#on-call-rotation-schedule)
2. [On-Call Responsibilities](#on-call-responsibilities)
3. [Notification Configuration](#notification-configuration)
4. [On-Call Tools & Access](#on-call-tools--access)
5. [Handoff Procedures](#handoff-procedures)
6. [Escalation Contacts](#escalation-contacts)
7. [Compensation & Time-Off](#compensation--time-off)

---

## ON-CALL ROTATION SCHEDULE

### Week 1: Intensive Monitoring (June 2-8, 2026)

**Critical: 24/7 coverage with primary + secondary on-call**

```
WEEK 1 ROTATION (June 2-8, 2026)
Day | Primary On-Call         | Secondary On-Call      | Coverage Hours | Max Consecutive
Mon | Tech Lead (24h)         | DevOps Lead (backup)   | 24:00 UTC      | N/A (critical week)
Tue | Tech Lead (first 12h)   | DevOps Lead (12h+12h)  | 12:00 + 12:00  | 12 hours
    | DevOps Lead (second 12h)|                        |                |
Wed | Senior Dev A (8:00-16:00)| Senior Dev B (16:00-00:00) | 16 hours | 8 hours
    | Senior Dev B (00:00-08:00)|                       | + 8 hours      | 8 hours
Thu | Senior Dev C (8:00-16:00)| Senior Dev D (16:00-00:00) | 16 hours | 8 hours
    | Senior Dev D (00:00-08:00)|                       | + 8 hours      | 8 hours
Fri | DevOps Lead (24h)       | Tech Lead (backup)     | 24:00 UTC      | 24 hours
Sat | Tech Lead (24h)         | DevOps Lead (backup)   | 24:00 UTC      | 24 hours
Sun | Senior Dev A (8:00-16:00)| Senior Dev B (16:00-00:00) | 16 hours | 8 hours
    | Senior Dev B (00:00-08:00)|                       | + 8 hours      | 8 hours
```

**Key Rules for Week 1:**
- Primary on-call: Actively monitor and respond to all incidents
- Secondary on-call: Available for escalation (not active unless primary unreachable)
- Max 4 consecutive hours per person (except critical days Mon/Fri/Sat)
- Daily handoff meeting at 08:00 UTC (15 minutes)
- After-hours response time: Phone call within 2 minutes

---

### Week 2+ Standard Rotation (June 9+)

**Format: 7-day rotations, one team per week**

```
STANDARD ROTATION (Weekly)
Week Starting | Primary On-Call Team      | Schedule
June 9        | Team A (Tech Lead + 2 devs)| Mon-Sun, 24/7
June 16       | Team B (DevOps Lead + 2 devs) | Mon-Sun, 24/7
June 23       | Team C (New senior devs)  | Mon-Sun, 24/7
June 30       | Rotation repeats          | ...
```

**Team Composition:**
- **Team A:** Tech Lead + Senior Dev A + Senior Dev B
  - Tech Lead: Primary (all P1/P2 decisions)
  - Dev A/B: Rotate 12-hour shifts (alternating days)

- **Team B:** DevOps Lead + Senior Dev C + Senior Dev D
  - DevOps Lead: Primary (infrastructure)
  - Dev C/D: Rotate 12-hour shifts

- **Team C:** New senior devs + rotating support
  - Junior on-call training program

**Shift Schedule (Daily, 3-shift rotation):**
```
Night Shift:   00:00-08:00 UTC (Europe sleeping, Americas asleep)
Day Shift:     08:00-16:00 UTC (Brazil working hours)
Evening Shift: 16:00-00:00 UTC (Evening support)

Overlaps:      
- Day-to-Evening overlap: 15:00-16:00 (1 hour handoff)
- Evening-to-Night overlap: 23:00-00:00 (1 hour handoff)
```

---

## ON-CALL RESPONSIBILITIES

### Monitoring & Response Duties

**During Shift (All Times):**

1. **Active Monitoring** (every 5 minutes)
   - Watch Slack #ops-critical for alerts
   - Monitor Sentry dashboard (tab open)
   - Monitor CloudWatch dashboard (tab open)
   - Respond to alerts within 2 minutes (P1/P2) or 15 minutes (P3)

2. **Response Actions**
   - Acknowledge incident in Slack with timestamp
   - Gather initial data (what, when, impact)
   - Assign severity (P1/P2/P3/P4)
   - Page escalation contacts if severity escalates
   - Investigate and mitigate issue
   - Communicate status every 5 min (P1) or 30 min (P2)

3. **Decision Authority**
   - **P1 incidents:** Can approve rollback without CTO approval
   - **P2 incidents:** Can scale resources, restart pods, clear cache
   - **P3 incidents:** Can create tickets, schedule fixes in backlog
   - **Escalation:** If uncertain, page Tech Lead or CTO

4. **Documentation**
   - Log all incidents in GitHub Issues
   - Record resolution time
   - Update runbooks if procedure needed improvement
   - Prepare incident summary for postmortem

---

### Incident Response SLAs

| Severity | Response Time | Resolution SLA | Escalation |
|----------|---|---|---|
| P1 | < 2 minutes | < 1 hour | Immediate to Tech Lead |
| P2 | < 5 minutes | < 4 hours | Page Tech Lead if > 15 min |
| P3 | < 15 minutes | < 1 day | Ticket for review |
| P4 | < 1 business day | < 1 sprint | Backlog |

**Response Time = Time to acknowledge + investigate**  
**Resolution SLA = Time to restore service (may require postmortem)**

---

### Communication Requirements

**P1 Incident (every 5 minutes):**
```
Timeline 00:00 - 00:05
🚨 P1 Incident Declared
Service: API down
Impact: All endpoints returning 5xx (100% traffic affected)
Start time: 2026-06-02 02:15 UTC
Team paged: Tech Lead + DevOps Lead
Next update: 00:05

Timeline 00:05 - 00:10
Initial Investigation
Root cause: Recent deployment (v2.0.1) caused startup error
Action: Executing rollback to v2.0.0
ETA: 2 minutes
Next update: 00:10
```

**P2 Incident (every 30 minutes):**
```
⚠️ P2 Incident Open
Service: Payment processing slow
Impact: 5% of users seeing > 2s response time
Start time: 2026-06-02 04:30 UTC
Status: Investigating database query performance
ETA: Resolution in 30 minutes or escalation to Tech Lead
Next update: 05:00
```

**Stakeholder Notification (P1/P2):**
- Slack #announcements: Incident declared + ETA
- Email to CTO + Product Manager: Detailed summary
- Slack @here in #ops-critical: Immediate team activation

---

## NOTIFICATION CONFIGURATION

### Slack Alerts (Real-Time)

**Channels Setup:**

```
#ops-critical
├─ P1 Incident alerts (auto-posted from Sentry + CloudWatch)
├─ P1 Incident responses (on-call team)
└─ Status updates (every 5 min P1, every 30 min P2)

#ops-general
├─ P2/P3 incident alerts
├─ Deployment notifications
├─ Daily health check summary
└─ Team standups (8:00, 14:00, 20:00 UTC)

#announcements
├─ Customer-facing incident notifications
├─ Go-live announcements
└─ Major deployment announcements
```

**Sentry → Slack Integration:**

```bash
# Configure Sentry webhook to #ops-critical
# Rules that trigger alerts:

1. Error Rate Spike
   - If error rate > 5% in 5 minutes
   - Send: "CRITICAL: Error rate spike to X%"
   - Page: @ops-on-call

2. Transaction Processing Failures
   - If parcela release failures > 10 per minute
   - Send: "CRITICAL: Payment processing failures increasing"
   - Page: @ops-on-call + @payment-team

3. Database Connection Errors
   - If connection timeout errors > 5 per minute
   - Send: "CRITICAL: Database connection pool exhausted"
   - Page: @ops-on-call + Tech Lead

4. Unhandled Exceptions (Select modules only)
   - From: services/api/modules/parceiros/*
   - Send: "ERROR: Transaction module crash"
   - Page: @ops-on-call
```

---

### CloudWatch Alerts (Email + SMS)

**Setup SNS Topics:**

```bash
# Create SNS topics
aws sns create-topic --name imobi-p1-incidents
aws sns create-topic --name imobi-p2-incidents

# Subscribe email
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:ACCOUNT_ID:imobi-p1-incidents \
  --protocol email \
  --notification-endpoint tech-lead@imobi.app

# Subscribe SMS (if available)
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:ACCOUNT_ID:imobi-p1-incidents \
  --protocol sms \
  --notification-endpoint +55XXXXXXXXXX
```

**Alert Rules:**

| Metric | Threshold | Topic | Action |
|--------|-----------|-------|--------|
| Error Rate > 5% | 2 min | P1 | SMS + Slack |
| API Latency p95 > 2s | 5 min | P1 | Email + Slack |
| Database Connections > 40 | 1 min | P1 | SMS + Slack |
| Payment Failures > 10/min | 1 min | P1 | SMS + Slack |
| Redis Memory > 90% | 5 min | P2 | Email + Slack |
| Disk Space < 10 GB | 1 min | P1 | Email + SMS |

---

### Phone Escalation

**Phone Call Flow (P1 Only):**

```
Incident declared (Slack #ops-critical)
    ↓ (2 min if no response)
Page on-call via Opsgenie/PagerDuty
    ↓ (2 min if no response)
Phone call to primary on-call (mobile number)
    ↓ (2 min if no response)
Phone call to secondary on-call
    ↓ (2 min if no response)
Phone call to CTO (escalation)
```

**On-Call Phone Numbers (Private, Non-Shared):**

```
Stored in: 1Password vault "imobi-on-call-contacts"
Access: Only Tech Lead + DevOps Lead can view
Rotation: Update weekly before new rotation starts
```

**Phone Call Script:**

```
"Hi [Name], imobi P1 incident declared at [TIME].
Service: [SERVICE]
Impact: [IMPACT]
Status: [STATUS]
Response time: [MINUTES]
Acknowledge? (Press 1 to acknowledge, 2 for voicemail)"
```

---

## ON-CALL TOOLS & ACCESS

### Dashboard Access Requirements

**All on-call must have access to:**

| Tool | Purpose | Access URL | Authentication |
|------|---------|-----------|---|
| Railway | Restart API | https://railway.app | OAuth login |
| Vercel | Rollback web | https://vercel.com | OAuth login |
| AWS Console | CloudWatch, RDS | https://console.aws.amazon.com | IAM + MFA |
| Sentry | Error tracking | https://sentry.io | OAuth login |
| PostgreSQL | Emergency queries | psql -h $PGHOST | VPN + password |
| Redis | Cache debugging | redis-cli -h $REDIS_HOST | VPN + password |
| GitHub | Hotfix deployment | https://github.com/imobi | OAuth login |

**Verification (Execute before Week 1 starts):**

```bash
# 1. Railway access
curl -H "Authorization: Bearer $RAILWAY_API_TOKEN" \
  https://api.railway.app/graphql

# 2. Vercel access
curl -H "Authorization: Bearer $VERCEL_TOKEN" \
  https://api.vercel.com/v1/projects

# 3. AWS CLI
aws sts get-caller-identity

# 4. Sentry API
curl -H "Authorization: Bearer $SENTRY_TOKEN" \
  https://sentry.io/api/0/organizations/imobi/

# 5. Database access
psql -U $PGUSER -h $PGHOST -d imbobi_prod -c "SELECT version();"

# 6. Redis access
redis-cli -h $REDIS_HOST -p 6379 PING

# 7. GitHub API
curl -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/user
```

---

### Credentials & Secrets Management

**Storage Location:** 1Password (Company vault)

**On-Call Credentials Set:**
```
imbobi-on-call-production
├─ AWS: Root credentials (for emergency access)
├─ Railway: API token
├─ Vercel: API token
├─ PostgreSQL: Master password
├─ Redis: Master password
├─ Sentry: API token
├─ GitHub: Personal access token
└─ PagerDuty: API key (if using)
```

**Access Rules:**
- Only Tech Lead + DevOps Lead have permanent access
- On-call engineers: Get temporary access for their shift (12 or 24 hours)
- After shift: Access automatically revoked (if possible) or documented

**Rotation of Secrets:**
- Monthly: Change all passwords
- Quarterly: Rotate API tokens
- After any team member departure: Change immediately

---

### Command Reference (Quick Copy-Paste)

**Emergency API Restart:**
```bash
# Via Railway CLI
railway up --service imobi-api --select
# Or via dashboard: imobi-api → Settings → Redeploy

# Via kubectl (if self-hosted)
kubectl rollout restart deployment/imobi-api
```

**Emergency Web Rollback:**
```bash
# Via Vercel dashboard
# Deployments tab → Find last working deployment → Rollback

# Via Vercel CLI
vercel rollback --yes
```

**Database Connection Check:**
```bash
psql -U $PGUSER -h $PGHOST -d imbobi_prod \
  -c "SELECT version(); SELECT datname, numbackends FROM pg_stat_database WHERE datname='imbobi_prod';"
```

**Redis Status:**
```bash
redis-cli -h $REDIS_HOST -p 6379 \
  MEMORY STATS | grep peak.allocated
```

**Error Rate Check:**
```bash
# Via Sentry API
curl -s "https://sentry.io/api/0/organizations/imobi/stats/" \
  -H "Authorization: Bearer $SENTRY_TOKEN" | jq '.[] | select(.group=="errors") | .stats'
```

---

## HANDOFF PROCEDURES

### Daily Handoff Meeting (08:00 UTC)

**Duration:** 15 minutes  
**Attendees:** Outgoing on-call + Incoming on-call + Tech Lead (observer)  
**Location:** Zoom call (recorded for documentation)  
**Cadence:** Every morning, even if no incidents

**Agenda:**

```
1. INCIDENT SUMMARY (5 min)
   - Any incidents during shift?
   - Severity, duration, resolution
   - Root cause identified?
   - Any followup required?

2. METRICS SNAPSHOT (3 min)
   - Error rate (current vs. baseline)
   - API latency (p95)
   - Payment processing (success rate)
   - Customer complaints (any emails, tickets)?

3. CONCERNS & OBSERVATIONS (3 min)
   - Any anomalies noticed?
   - Any flaky alerts?
   - Performance degradation?
   - Team member concerns (fatigue, technical blockers)?

4. ACTION ITEMS (2 min)
   - Tasks for next shift
   - Priorities to watch
   - Escalations pending resolution
   - Follow-up tickets created?
   - Next handoff: Any known risks?

5. SIGN-OFF (2 min)
   - Incoming on-call acknowledges readiness
   - Outgoing: "Shift status GREEN / YELLOW / RED"
   - Record: Handoff timestamp in Slack #handoffs channel
```

**Handoff Template (Slack post):**

```
🔄 HANDOFF COMPLETE
Start: 2026-06-02 08:00 UTC
Outgoing: [Name] (Evening Shift)
Incoming: [Name] (Day Shift)

Incidents:
- P2 at 22:30 UTC: Payment processing slow (resolved in 15 min)

Metrics:
- Error rate: 0.3% (normal)
- API p95: 250ms (good)
- Payment success: 99.8% (target met)

Status: 🟢 GREEN - All systems normal

Follow-ups:
- Database performance tuning (non-urgent)
- Sentry alert threshold adjustment needed

Slack thread: [link to incident details]
```

---

### Weekly Retrospective (Every Monday 10:00 UTC)

**Duration:** 30 minutes  
**Attendees:** All on-call from past week + Tech Lead + DevOps Lead  
**Purpose:** Review performance, identify improvements

**Topics:**
1. Response times: Did we meet SLAs?
2. Escalations: Were they appropriate?
3. False positives: Any unnecessary alerts?
4. Runbook improvements: What needed updating?
5. Team health: Fatigue, knowledge gaps, training needs?

**Output:** Action items for next week, runbook updates

---

## ESCALATION CONTACTS

### Primary Escalation Path (P1 Incidents)

```
Minute 0-5:   On-call detects issue, declares incident in Slack
              ↓
Minute 5-10:  On-call investigates, gathers data
              ↓
Minute 10-15: If unresolved, page Tech Lead (phone call)
              ↓
Minute 15-30: If unresolved, page CTO (phone call)
              ↓
Minute 30+:   CTO makes go/no-go decision (escalate business operations?)
```

**Escalation Contact List:**

| Role | Primary Contact | Phone | Email | Backup |
|------|---|---|---|---|
| **Tech Lead** | [Name] | +55-XXXX-XXXX | tech-lead@imobi.app | [Backup Name] |
| **DevOps Lead** | [Name] | +55-XXXX-XXXX | devops-lead@imobi.app | [Backup Name] |
| **CTO** | [Name] | +55-XXXX-XXXX | cto@imobi.app | Tech Lead |
| **CEO** | [Name] | +55-XXXX-XXXX | ceo@imobi.app | CTO |
| **Customer Success Manager** | [Name] | +55-XXXX-XXXX | cs@imobi.app | [Backup Name] |

**Notification Rules:**

| Situation | Who to Page | Method | Timeline |
|-----------|---|---|---|
| API down > 5 min | Tech Lead | Phone | Immediate |
| Payment failures > 10% | Tech Lead + Payment team | Phone | Immediate |
| Data loss detected | CTO | Phone | Immediate |
| Revenue impact > 1h | CTO + CEO | Phone | After 30 min P1 |
| Security incident | CTO | Phone | Immediate |

---

## COMPENSATION & TIME-OFF

### On-Call Compensation (Week 1 Intensive)

**For 24-hour shifts (June 2, 5, 6):**
- Compensation: 1.5x hourly rate (or 1.5 days off-in-lieu)
- Sleep allowance: Provided hotel room near office (optional)
- Food: Provided for all meals during shift

**For 12-hour shifts (June 3, 4, 7, 8):**
- Compensation: 1x hourly rate + 4 hours comp time
- No additional perks

**For 8-hour shifts (June 3, 4, 7, 8):**
- Compensation: Normal rate + 2 hours comp time
- No additional perks

### Ongoing On-Call Compensation (Week 2+)

**For weekly on-call (7-day rotation):**
- Compensation: R$2,000/week flat rate (covers all shifts)
- OR: 1 day off-in-lieu per week of on-call
- Escalation bonus: +50% if handling P1 incident (capped R$500/week)

**Exclusions from compensation:**
- Short (<5 min) alert responses during normal hours (covered by salary)
- After-hours on-call availability (covered by flat rate)

### Time-Off & Recovery

**Policy:**
- After intensive on-call week (June 2-8): 2 days mandatory off (June 9-10)
- After standard on-call rotation (7 days): 2 days flex time within 2 weeks
- Burnout risk: If on-call for > 2 consecutive weeks, schedule 1-week break

**Process:**
- Swap shifts with permission from Tech Lead
- Cannot swap during incident (< 24h notice not allowed)
- Documented in shared calendar

---

## ON-CALL READINESS CHECKLIST

**Complete 1 week before start of rotation:**

- [ ] All dashboard access verified (Railway, Vercel, AWS, Sentry)
- [ ] Phone number updated in 1Password
- [ ] Phone alert test completed (received test alert)
- [ ] Critical contact numbers saved to phone
- [ ] Runbooks reviewed and printed (or bookmarked)
- [ ] VPN client installed and tested
- [ ] SSH keys configured for database/Redis access
- [ ] Handoff meeting attended (learned from previous rotation)
- [ ] Incident simulation dry-run completed
- [ ] Tech Lead/DevOps Lead confirmed availability
- [ ] Email/Slack status updated ("On-call starting [DATE]")
- [ ] Calendar blocked for shift hours
- [ ] Backup phone charging cable available

**On First Day of Rotation:**

- [ ] Morning handoff meeting (08:00 UTC)
- [ ] 15-min tech review of recent incidents/changes
- [ ] Verify all alerts arriving in Slack
- [ ] Test phone escalation (ping Tech Lead: "Test alert received at [TIME]")
- [ ] Get familiar with current system state (load, error rate, metrics)

---

## TEAM HEALTH & SUPPORT

### Mental Health & Fatigue Management

**Red Flags:**
- Delayed response times (>5 min for P1)
- Missing handoff meeting
- Short-tempered responses in Slack
- Mistakes in incident handling
- Requesting early relief from shift

**Support Options:**
- Talk to Tech Lead about concerns (always available)
- Swap shifts if fatigued (48h notice)
- Debrief after difficult incident (mandatory postmortem)
- Counseling services available (company benefit)
- Stretch goals: End-of-shift debrief (30 min personal reflection)

### Knowledge Transfer

**For new team members:**
- Shadow a full rotation before going on-call (1 week observation)
- Then: Pair with senior on-call (split responsibility first shift)
- Finally: Solo after senior confirms readiness

**Continuous Learning:**
- Monthly incident postmortems (lessons learned)
- Quarterly runbook reviews (keep docs current)
- Annual security review (access, credentials, procedures)

---

## DOCUMENT VERSION HISTORY

| Version | Date | Changes | Owner |
|---------|------|---------|-------|
| 1.0 | 2026-05-31 | Initial creation for Phase 9 | DevOps Lead |

---

**Last Updated:** 2026-05-31  
**Effective Date:** 2026-06-02 02:00 UTC  
**Owner:** DevOps Lead + Operations  
**Questions?** Contact tech-lead@imobi.app

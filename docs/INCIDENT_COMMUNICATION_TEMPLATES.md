# Incident Communication Templates

**Usage:** Copy & paste templates, customize with actual incident details  
**Key Principle:** Honest, transparent, action-oriented communication  
**Audience:** Users, leadership, engineers, partners

---

## 1. Initial Alert (#ops-critical)

Use immediately when P1/P2 incident detected.

### Template A: Service Down

```markdown
🚨 **P1 INCIDENT: API Service Degradation**

**Start Time:** 2026-05-29T14:23:45Z BRT
**Duration:** 2 minutes (and counting)
**Owner:** @devops-oncall
**Status:** INVESTIGATING

**Severity:** P1 (Critical)
**Impact:** ~500 users unable to process transactions

**Affected Services:**
- API (returning 5xx errors)
- Transaction submission
- Parcel release processing

**Root Cause:** Unknown (investigating)

**Initial Findings:**
- Error rate spiked from 0.1% → 8% at 14:23 BRT
- Top error: `DatabaseError: FATAL: too many connections`
- Sentry: 200+ occurrences in last 2 minutes
- CloudWatch: Database connections at 99/100

**Actions Underway:**
- [ ] Investigating database connection pool exhaustion
- [ ] Evaluating rollback option
- [ ] Checking recent deployments

**Next Update:** 14:28 BRT (5 min from now)

**Questions?** Reply in thread.
```

### Template B: Feature Degraded

```markdown
⚠️ **P2 INCIDENT: Photo Upload Timeout**

**Start Time:** 2026-05-29T15:10:30Z BRT
**Duration:** 8 minutes
**Owner:** @devops-oncall
**Status:** INVESTIGATING

**Severity:** P2 (High)
**Impact:** Photo uploads timing out (30% failure rate)

**Affected Users:**
- Desktop users uploading obra photos
- Mobile (Expo) not affected

**Root Cause:** Likely S3 upload slowness

**Initial Findings:**
- S3 PutObject latency increased from 2s → 8s
- AWS status page shows no outages
- API logs show S3 timeouts (30s limit)

**Workaround:** Use mobile app (direct S3 upload working)

**Actions Underway:**
- [ ] Investigating S3 regional performance
- [ ] Checking CORS configuration
- [ ] Monitoring S3 metrics

**ETA Resolution:** 15:20 BRT

**Next Update:** 15:15 BRT
```

---

## 2. Status Updates (Every 5-10 minutes during incident)

### Template A: Still Investigating (No progress yet)

```markdown
⏳ **UPDATE @ 14:28 BRT** (5 min into incident)

**Status:** Still investigating, no resolution yet

**Latest Findings:**
- Database connections: 98/100 (slightly decreased)
- Last deploy 5 min ago included parceiros.service.ts refactor
- New code uses Prisma.findMany() without include → triggers N+1 queries

**Hypothesis:** Deploy introduced N+1 query pattern
- Each parcel lookup fires separate obras query
- 1000 concurrent users = 1000 database connections exhausted

**Next Steps:**
1. Confirm N+1 pattern with code review
2. Decide: Rollback vs. hotfix
3. If rollback: Execute within 2 minutes

**ETA Update:** 14:33 BRT
```

### Template B: Taking Action

```markdown
✅ **UPDATE @ 14:28 BRT** (5 min into incident)

**Status:** TAKING ACTION — Rollback initiated

**What We Found:**
- Root cause confirmed: N+1 query bug in parceiros.service.ts
- Deploy @ 14:10 BRT introduced the issue
- Database queries increased from 10 per request → 1000

**Action Being Taken:**
- Rolling back to previous version
- ETA deployment: 14:32 BRT

**Expected Result:**
- API error rate should drop from 8% → 0.1% within 30s
- Transactions resume processing

**If rollback fails:**
- Fallback: Restart database connection pool
- Manual connection cleanup

**Next Update:** 14:33 BRT (post-rollback verification)
```

### Template C: Resolved

```markdown
✅ **RESOLVED @ 14:35 BRT** (12 min duration)

**Incident ID:** INC-20260529-1423
**Severity:** P1
**Root Cause:** Code bug (N+1 queries)

**What Happened:**
- 14:10 BRT: Deployed refactored parceiros.service.ts
- 14:23 BRT: N+1 query pattern exhausted database connections
- Error rate spike: 0.1% → 8%
- Transaction processing stopped for ~12 minutes
- ~500 concurrent users affected

**What We Did:**
- 14:23 BRT: Alert fired (Sentry), on-call acknowledged
- 14:25 BRT: Root cause identified (code review)
- 14:30 BRT: Rollback initiated (Render)
- 14:32 BRT: Rollback completed
- 14:35 BRT: All metrics normalized

**Recovery Metrics:**
- Error rate: 8% → 0.1% ✅
- API latency p95: 450ms → 85ms ✅
- Database connections: 98 → 45 ✅
- Transaction backlog: Cleared in ~3 min ✅

**Impact Summary:**
- Downtime: 12 minutes
- Users affected: ~500
- Estimated transactions lost: ~2,000
- Estimated revenue impact: ~$85,000

**Post-Mortem:**
- RCA meeting: Tomorrow 10:00 BRT
- Action items: Will be shared in #engineering-general
- Incident doc: [Link to Google Doc]

**Thank you** for your patience. We're committed to preventing this again.
```

---

## 3. User Communications (#product)

Use to keep product/support team informed for external communication.

### Template A: Issue Detected

```markdown
⚠️ **Service Alert — Investigating**

We are aware of intermittent errors on the transaction system.

**What's Happening:**
- Transaction submissions: 5% failure rate (returned at 14:23 BRT)
- Parcel processing: Delayed
- Photo uploads: Working normally

**What We're Doing:**
- Root cause analysis underway
- Investigation started 2 minutes ago
- Will update every 5 minutes

**ETA for Update:** 14:28 BRT

**Meanwhile:**
- Try submitting transaction again (may succeed on retry)
- Use mobile app if available
- Screenshots of errors help us debug

Thank you for your patience!
```

### Template B: Known Workaround

```markdown
⚠️ **Service Issue — Workaround Available**

We're experiencing delays with file uploads on the desktop web app.

**What's Affected:**
- Photo uploads via web: ~30% timeout
- Mobile uploads: Working normally ✅
- Everything else: Normal ✅

**Workaround:**
Use the mobile app (Expo) to upload photos — direct upload working fine.

**What We're Doing:**
- Investigating cloud storage (S3) slowness
- ETA fix: 15:20 BRT

**Questions?** Reply here or contact support.
```

### Template C: All Clear

```markdown
✅ **Issue Resolved**

The transaction system issue has been resolved as of 14:35 BRT.

**What Happened:**
A code deployment introduced a performance issue that temporarily affected transaction processing.

**Impact:**
- Approximately 12 minutes of intermittent errors
- Some transactions completed after automatic retry
- No data loss

**What's Fixed:**
- Rolled back to previous stable version
- All systems operating normally
- Error rate back to baseline (< 0.1%)

**Thank You**
Thank you for your patience while we resolved this. We're investigating how this slipped through to production and making process improvements.

For any concerns, contact: support@imobi.com.br
```

---

## 4. Internal Engineering Updates (#engineering-general)

### Template A: Incident Summary (12 hours after resolution)

```markdown
📋 **INCIDENT POSTMORTEM: Transaction System Downtime**

**Incident ID:** INC-20260529-1423
**Date:** 2026-05-29
**Duration:** 12 minutes (14:23-14:35 BRT)
**Severity:** P1

---

## Summary

Deploying a refactored parcel fetching service introduced an N+1 query pattern that exhausted our database connection pool, causing transaction processing to fail for 12 minutes.

---

## Timeline

| Time | Event |
|------|-------|
| 14:10 | Deploy: services/api/src/modules/parceiros/parceiros.service.ts refactor |
| 14:23 | Error rate spike detected (Sentry: 8%) |
| 14:24 | On-call acknowledged; initial investigation started |
| 14:25 | Root cause identified via code review |
| 14:30 | Rollback decision made (approved by Tech Lead) |
| 14:32 | Rollback deployed successfully |
| 14:35 | Service fully recovered; metrics normalized |

---

## Root Cause

**Refactored Code (Bad):**
```typescript
// services/api/src/modules/parceiros/parceiros.service.ts
async findWithObras(filter: Filter) {
  const parceiros = await this.db.parceiros.findMany(filter)
  
  // N+1 PROBLEM: Each parceiro fires separate DB query
  for (const p of parceiros) {
    p.obras = await this.db.obras.findMany({ 
      where: { parceiroId: p.id } 
    })
  }
  
  return parceiros
}
```

With 1000 concurrent users × 1000 parceiros each, this triggers:
- 1 query to fetch parceiros
- +1,000,000 queries to fetch obras (one per parceiro)
- Result: Database connection pool exhausted in seconds

**Should Have Been:**
```typescript
// Use Prisma include for single JOIN query
const parceiros = await this.db.parceiros.findMany({
  ...filter,
  include: { obras: true }  // ← Single efficient query
})
```

---

## Contributing Factors

1. **Code Review Gap**
   - Reviewer didn't catch query performance pattern
   - N+1 detection not part of review checklist

2. **Testing Gap**
   - Unit tests passed (they test small datasets)
   - No integration test with 1000+ records
   - No load testing before production deploy

3. **Monitoring Gap**
   - Database connection pool not monitored
   - No slow query alerts
   - No pre-deployment performance test

4. **Process Gap**
   - No mandatory code review for query optimization
   - No pre-production load test gate

---

## What Went Well

✅ **Fast Detection:** Sentry alert fired within 30 seconds  
✅ **Quick Response:** On-call acknowledged in 1 minute  
✅ **Clear Diagnosis:** Code review confirmed root cause in 2 minutes  
✅ **Safe Rollback:** Previous version available and working  
✅ **Smooth Recovery:** Service back online in 12 minutes  
✅ **Transparent Communication:** Kept users and stakeholders updated  

**MTTD (Mean Time To Detect):** 2 min ✅  
**MTTR (Mean Time To Resolve):** 12 min ✅ (target: < 15 min)

---

## Action Items (Prevention)

| Priority | Item | Owner | Deadline | Status |
|----------|------|-------|----------|--------|
| P1 | Add N+1 query detection to code review checklist | Tech Lead | 2026-06-05 | Open |
| P1 | Implement integration tests with 1000+ records | Dev Team | 2026-06-12 | Open |
| P1 | Add database connection pool monitoring alert | DevOps | 2026-06-02 | Open |
| P1 | Fix parceiros.service.ts with proper Prisma include | Dev | 2026-05-30 | Open |
| P2 | Add slow query alerts (> 100ms) | DevOps | 2026-06-09 | Open |
| P2 | Implement pre-production load testing (minimum 1000 users) | QA | 2026-06-16 | Open |
| P2 | Document query best practices in CONTRIBUTING.md | Tech Lead | 2026-06-15 | Open |
| P3 | Review all services for similar N+1 patterns | Dev Team | 2026-06-20 | Open |

---

## Metrics & Trends

```
Incident Frequency:
- May 26: 1 P1 (uptime: 99.99%)
- May 27: 0 P1 (uptime: 100%)
- May 28: 2 P1 (uptime: 99.97%)
- May 29: 1 P1 (uptime: 99.98%)

Trend: Stable, but need to reduce P1 to < 0.5/month

Response Time Improvements:
- MTTD: 12 min → 7 min → 6 min → 2 min (GOOD)
- MTTR: 22 min → 18 min → 16 min → 12 min (GOOD)
```

---

## Lessons Learned

1. **Test with Real Data Volume**
   - Unit tests on 10 records won't catch N+1 with 1000+ records
   - Load test MUST use production-scale datasets

2. **Monitor Connection Pools**
   - Database connections are finite resource
   - Monitor usage trending toward limit
   - Alert at 80% to prevent exhaustion

3. **Optimize Before Deploy**
   - EXPLAIN ANALYZE every slow query
   - Code review should include query analysis
   - Prefer JOINs over application-level loops

4. **Rollback Must Be Safe**
   - Previous version was safe to return to
   - Glad we had immediate rollback path
   - Database schema changes complicate this

---

## Follow-up Actions

- [ ] Action items tracked in Jira: [link]
- [ ] Team meeting scheduled: 2026-05-30 10:00 BRT
- [ ] Full N+1 pattern audit: [link to task]
- [ ] Playbook updated: [link]
- [ ] Process improvements added: code-review-checklist.md

---

**Postmortem Owner:** [Name]  
**Review Date:** 2026-06-05  
**Distribution:** #engineering-general, team.engineering@imobi.com
```

---

## 5. Leadership Email (Immediate P1 notification)

**Subject:** INCIDENT REPORT — imobi Production [14:23 BRT]  
**To:** CTO, PO, CEO

```
INCIDENT ALERT
──────────────
Severity: P1 (Critical)
Service: Transaction system (imobi API)
Start: 2026-05-29 14:23 BRT
Duration: 12 minutes (RESOLVED)

WHAT HAPPENED
─────────────
Code deployment introduced a performance bug that exhausted our database 
connection pool, causing transaction processing to fail for 12 minutes.

Users were unable to:
- Submit transactions for ~12 minutes
- Process parcel releases during incident
- Upload photos (intermittent)

USER IMPACT
──────────
- Affected: ~500 concurrent users
- Failed transactions: Estimated 2,000
- Revenue impact: ~$85,000 (estimated)

CURRENT STATUS
──────────────
✅ RESOLVED at 14:35 BRT
- Service recovered to 100% normal
- All systems operational
- No data loss

ROOT CAUSE
──────────
Code bug (N+1 query pattern) in parcel fetching service deployed at 14:10 BRT.
Bug caused 1,000x more database queries than expected, exhausting connection pool.

WHAT WE DID
────────────
1. Detected: Sentry alert (14:23, within 30 seconds of failure)
2. Diagnosed: Code review identified N+1 pattern (14:25)
3. Action: Rolled back to previous stable version (14:30)
4. Recovery: Service back online within 2 minutes of rollback (14:32)

Root cause was fixable via rollback because no database schema changes 
were included in deploy.

PREVENTION
──────────
This incident could have been prevented with:
1. Integration tests using realistic data volume (1000+ records)
2. Pre-production load testing
3. Code review checklist for query performance

Action items assigned to engineering team with completion dates.
Full postmortem will be shared within 24 hours.

NEXT STEPS
──────────
1. RCA (Root Cause Analysis): 2026-05-30 10:00 BRT
2. Action items: Track in Jira, target completion 2026-06-05
3. Process improvements: Implement by 2026-06-12
4. Follow-up incident: Review metrics 2026-08-29

Questions? Contact: @cto or ops@imobi.com
```

---

## 6. Partner/Customer Communication

### High-Value Account

**Subject:** Service Issue on 2026-05-29 — We've Resolved It

```
Hi [Customer Name],

We experienced a brief service issue on our platform this afternoon that 
temporarily affected transaction processing.

WHAT HAPPENED
─────────────
At 2:23 PM BRT, a software deployment introduced a performance issue that 
prevented new transactions from being submitted for 12 minutes.

IMPACT
──────
You may have experienced:
- Transaction submission failures or timeouts
- Delayed parcel release processing
- Retried transactions that eventually succeeded

We've confirmed that failed transactions were automatically retried and 
most completed successfully during the recovery period.

RESOLUTION
──────────
At 2:35 PM BRT, our team rolled back the problematic code change, 
and all systems returned to normal operation within minutes.

We have no reports of data loss.

PREVENTION
──────────
We're implementing several improvements to prevent this type of issue:
1. More rigorous pre-production testing
2. Monitoring improvements for early detection
3. Code review process enhancements

NEXT STEPS
──────────
Our engineering team is conducting a detailed analysis and will share 
findings with our partners. We're committed to preventing similar issues.

If you have any concerns about your data or transactions, please 
contact our support team: support@imobi.com.br

Thank you for your patience and partnership.

Regards,  
imobi Operations Team
```

---

## 7. Post-Incident Email (24 hours after)

**Subject:** Incident Postmortem — What We Learned

```
Team,

We've completed the analysis of yesterday's incident. Here are the findings:

INCIDENT SUMMARY
────────────────
- Severity: P1 (Critical)
- Duration: 12 minutes
- Root Cause: Code bug (N+1 query pattern)
- Data Loss: None
- Revenue Impact: ~$85,000

WHAT WENT WELL
──────────────
✅ Detection: Alert within 30 seconds
✅ Diagnosis: Root cause identified in 2 minutes
✅ Recovery: Rollback safely executed in 12 minutes total
✅ Communication: Transparent updates to all stakeholders

WHAT WE'RE FIXING
──────────────────
1. Code review checklist: Add query performance review
2. Testing: Implement integration tests with 1000+ records
3. Monitoring: Add database connection pool alerts
4. Process: Require load testing before production deploy

ACTION ITEMS
────────────
All assigned in Jira with completion dates (next 2 weeks).

POSTMORTEM DOC
──────────────
Full analysis: [Link to doc]

Thank you for your patience during the incident. Questions?
Reply here or contact engineering team.
```

---

## 8. Escalation Notifications

### To Tech Lead (P1)

```
🚨 P1 INCIDENT DETECTED

Severity: P1 (Critical)
Start: 14:23 BRT
Status: Investigating

Service: API (transaction system)
Error: DatabaseError: too many connections
Rate: 8% (threshold: 5%)

DevOps on-call activated.
Your input needed on rollback decision (if unresolved by 14:33).

Sentry: [link]
Incident thread: #ops-critical (pinned)
```

### To CTO (P1 after 10 min)

```
🚨 P1 INCIDENT — 10 MINUTES UNRESOLVED

Severity: P1 (Critical)
Status: Investigating
Duration: 10 minutes

Service Down: Transaction system (API)
Impact: ~500 users, revenue at risk
Root Cause: Unknown (under investigation)

Tech Lead notified and investigating.
Your approval needed for major infrastructure changes (if required).

Options being evaluated:
- Rollback (5 min deployment)
- Database restart (2 min, risk of data loss)
- Scale database (10 min, may not solve)

ETA decision: 14:35 BRT

Incident: #ops-critical
```

---

## Tips for Effective Communication

1. **Be Honest**
   - Don't hide bad news or speculate
   - Share what you know and don't know
   - Update frequently with concrete data

2. **Be Clear**
   - Avoid technical jargon for non-technical audience
   - Use plain language: "database out of space" not "IOPS exhausted"
   - Include exact impact numbers

3. **Be Action-Oriented**
   - State what you're doing (not just what went wrong)
   - Give ETA for next update
   - Share next steps after resolution

4. **Be Respectful of Time**
   - Keep summaries concise (under 200 words)
   - Link to detailed docs instead of pasting
   - Update in threads, not floods of messages

5. **Be Transparent About Severity**
   - Own mistakes (we introduced a bug)
   - Explain contributing factors
   - Commit to prevention measures

---

## Template Variables (Customize for Your Incident)

```
[START_TIME]         = 14:23 BRT
[DURATION]           = 12 minutes
[SEVERITY]           = P1 / P2 / P3 / P4
[SERVICE_DOWN]       = API / Database / Redis / Worker
[ERROR_RATE]         = 8%
[USERS_AFFECTED]     = ~500
[ROOT_CAUSE]         = [Brief explanation]
[ACTION_TAKEN]       = Rollback / Scaling / Restart / etc
[TIME_TO_RECOVER]    = 12 minutes
[REVENUE_IMPACT]     = $85,000
[INCIDENT_ID]        = INC-20260529-1423
[NEXT_STEPS]         = RCA, action items, follow-up
```

---

**Last Updated:** 2026-05-29  
**Owner:** Communications Lead + DevOps  
**Review Date:** 2026-08-29

# Pre-Deployment Test Checklist — 2026-06-01 (Day Before Cutover)

## Quick Health Check (15 min)

### Build Validation ✅
```bash
pnpm type-check  # Must show: 5/5 successful
pnpm build       # Must complete in < 60s with 0 errors
```

### Local Smoke Tests (5 min)
```bash
pnpm dev
# Open http://localhost:3000/dashboard/gestor/etapas
# - [ ] Page loads without errors
# - [ ] Filters dropdown appears
# - [ ] GPS map toggle works (if visible)
# - [ ] Bulk action buttons disabled when no selection
```

---

## Critical User Flows (30 min)

### 1. Manager Dashboard - Etapas List
**Accounts**: manager@imobi.test / password

- [ ] Login succeeds (JWT token generated)
- [ ] Dashboard loads with KPI summary
- [ ] Etapas list displays 20 items per page
- [ ] Status filter works (todas/aguardando/approved/rejected)
- [ ] Priority filter works (todas/urgente/intermediaria/normal)
- [ ] Date range filter works
- [ ] Search by obra type works
- [ ] Pagination works (next/previous buttons)
- [ ] "Revisar" button navigates to detail page

### 2. Manager Dashboard - Detail Page
**Flow**: List → Click "Revisar" on any etapa

- [ ] Detail page loads etapa information
- [ ] GPS validation map displays (Leaflet)
  - Orange marker shows obra center
  - Green/red markers show valid/invalid GPS points
  - Zoom to fit all points works
- [ ] Approval audit trail visible (timeline with approvals)
- [ ] Rejection reason dropdown populated (5 preset reasons)
- [ ] Approve button works
- [ ] Reject button shows reason modal

### 3. Manager Dashboard - Bulk Actions
**Flow**: List → Select multiple checkboxes → Bulk action buttons

- [ ] "Select all" checkbox selects all visible items
- [ ] Bulk approve button enabled when items selected
- [ ] Bulk reject button enabled when items selected
- [ ] Bulk approve processes all selected (status changes)
- [ ] Bulk reject shows reason modal
- [ ] Success message appears post-action
- [ ] Selected items cleared after action

### 4. Engineer Portal - Submission
**Accounts**: engenheiro@imobi.test / password

- [ ] Engineer can view assigned obras
- [ ] Engineer can start vistoria (inspection)
- [ ] GPS validation enforces accuracy threshold
  - Invalid GPS shows error message
  - Valid GPS allows submission
- [ ] Photo upload works (with GPS metadata)
- [ ] Form validation shows required field errors

### 5. Payment Processing (Critical!)
**Flow**: Manager approves stage → Payment queued → BullMQ worker processes

- [ ] API endpoint `/manager/etapas/{id}/approve` returns success
- [ ] Database record updates (status = APROVADA)
- [ ] BullMQ job created for payment processing
  - Check Redis: `KEYS *payment*`
  - Check queue: Bull Admin dashboard (if available)
- [ ] Payment notification queued
- [ ] Engineer receives notification (if webhook configured)

---

## Database & Cache Validation (10 min)

### PostgreSQL
```sql
-- Verify tables exist
SELECT COUNT(*) FROM obras;
SELECT COUNT(*) FROM etapas;
SELECT COUNT(*) FROM evidencias;

-- Verify latest records have correct status
SELECT etapaId, status, criadoEm FROM etapas 
ORDER BY criadoEm DESC LIMIT 5;
```

### Redis
```bash
# Check connection
redis-cli PING  # Should return PONG

# Verify cache keys exist
redis-cli KEYS "*etapas*"
redis-cli KEYS "*manager*"

# Check queue (BullMQ)
redis-cli KEYS "*bull*"
```

---

## Performance Baseline (10 min)

### Response Times
Test with real data using k6 or Postman:

```bash
# Manager list endpoint
curl -H "Authorization: Bearer <token>" \
  https://api.imobi.com/manager/etapas-pendentes?limit=20

# Expected: < 500ms
# Check: Grafana dashboard for response time graph
```

### Database Queries
```bash
# Check slow query log
tail -f /var/log/postgresql/slow.log

# Expected: No queries > 1 second
```

---

## API Endpoints Validation (15 min)

| Endpoint | Method | Test Data | Expected Status |
|----------|--------|-----------|-----------------|
| `/auth/login` | POST | valid credentials | 200, JWT token |
| `/manager/etapas-pendentes` | GET | page=0, limit=20 | 200, array |
| `/manager/etapas/{id}` | GET | real etapa ID | 200, object |
| `/manager/etapas/{id}/approve` | POST | with JWT | 200, status=APROVADA |
| `/manager/etapas/{id}/reject` | POST | with reason | 200, status=REJEITADA |
| `/engenheiro/obras/{id}/vistoria` | POST | with GPS + photos | 200, vistoria created |
| `/health` | GET | none | 200, healthy |

---

## Security Checks (10 min)

- [ ] CORS headers present in responses
- [ ] JWT tokens expire after 15 minutes
- [ ] Refresh tokens rotate correctly
- [ ] Rate limiting enforced (100 req/min general, 10 req/min auth)
- [ ] SQL injection prevention (Prisma ORM verified)
- [ ] XSS protection (CSP headers present)
- [ ] CSRF protection active

---

## Monitoring & Alerting (5 min)

### Grafana Dashboard
- [ ] Error rate graph visible
- [ ] Response time percentiles (p50, p95, p99)
- [ ] Database connection pool status
- [ ] Redis memory usage
- [ ] CPU/Memory utilization

### Sentry Integration
- [ ] No critical errors in last 24h
- [ ] Error threshold alert configured (> 5 errors/min)
- [ ] Notification webhook active

### Alert Rules
- [ ] Error rate spike > 1%
- [ ] Database connectivity lost
- [ ] Payment processing > 5 min delay
- [ ] Memory usage > 80%
- [ ] CPU > 90%

---

## Final Sign-Off

| Role | Name | Checklist Complete | Date/Time | Signature |
|------|------|-------------------|-----------|-----------|
| **QA Lead** | _____ | [ ] | _____ | _____ |
| **Eng Lead** | _____ | [ ] | _____ | _____ |
| **CTO** | _____ | [ ] | _____ | _____ |

---

## Go/No-Go Decision

**Pre-Deployment Check Results**:
- [ ] All critical flows passed
- [ ] Database integrity verified
- [ ] Performance within baseline
- [ ] Security checks passed
- [ ] Monitoring & alerting active
- [ ] All sign-offs collected

**Decision**: 
- [ ] **GO** → Proceed to cutover (2026-06-02, 02:00 UTC)
- [ ] **NO-GO** → Identify blockers below and reschedule

**Blocker Issues (if NO-GO)**:
```
1. 
2. 
3. 
```

**Approved by CTO**: _____ Date: _____ Time: _____

---

**Timeline**: 
- Checklist start: 2026-06-01 14:00 UTC (11:00 Brazil)
- Go/No-Go decision: 2026-06-01 20:00 UTC (17:00 Brazil)
- Cutover window: 2026-06-02 02:00-04:00 UTC

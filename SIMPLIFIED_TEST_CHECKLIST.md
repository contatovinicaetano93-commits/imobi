# Pre-Deployment Test Checklist (Simplified)
**Date**: 2026-06-01 | **Target**: 2-hour execution | **Cutover**: 2026-06-02 02:00 UTC

---

## HEALTH CHECKS (15 min) ⏱️

| Test | Action | Expected Result | ✅/❌ |
|------|--------|-----------------|-------|
| **Type Check** | `pnpm type-check` | 0 errors, all packages pass | |
| **Build** | `pnpm build` | Completes < 60s, 0 errors | |
| **API Health** | `curl http://localhost:3001/health` | `{"status":"ok"}` | |
| **DB Connection** | `psql -c "SELECT 1"` | Returns 1 | |
| **Redis Ping** | `redis-cli PING` | PONG | |

---

## CRITICAL USER FLOWS (45 min) ⏱️

### Manager Dashboard (15 min)
**Account**: manager@imobi.test / password

| Test | Action | Expected Result | ✅/❌ |
|------|--------|-----------------|-------|
| **Login** | Go to `/login`, enter credentials | JWT token generated, redirected to dashboard | |
| **List Load** | Navigate to `/dashboard/gestor/etapas` | Page loads, 20 items displayed | |
| **Filters** | Apply status/priority/date filters | Results update correctly | |
| **Pagination** | Click next/previous | Pages change correctly | |
| **Revisar Button** | Click on any etapa | Detail page loads | |

### Detail & Approval (15 min)
**Flow**: Dashboard list → Click "Revisar"

| Test | Action | Expected Result | ✅/❌ |
|------|--------|-----------------|-------|
| **Detail Load** | View etapa details | All fields display (status, approvals, GPS map) | |
| **GPS Map** | Verify Leaflet map | Orange center marker, green/red GPS points visible | |
| **Approve** | Click approve button | Status changes to APROVADA, BullMQ job queued | |
| **Reject** | Click reject, select reason | Status changes to REJEITADA, reason saved | |
| **Audit Trail** | Scroll to timeline | All approvals/rejections visible with timestamps | |

### Bulk Actions (15 min)
**Flow**: List → Select checkboxes → Use bulk buttons

| Test | Action | Expected Result | ✅/❌ |
|------|--------|-----------------|-------|
| **Select All** | Click "select all" checkbox | All visible items selected | |
| **Bulk Approve** | Click bulk approve | All selected status → APROVADA, jobs queued | |
| **Bulk Reject** | Click bulk reject | Modal appears, selection clears after action | |
| **Success Message** | After action | Toast notification appears | |

---

## DATABASE & CACHE (10 min) ⏱️

| Test | Command | Expected Result | ✅/❌ |
|------|---------|-----------------|-------|
| **Table Check** | `SELECT COUNT(*) FROM obras;` | Returns number > 0 | |
| **Etapas Status** | `SELECT etapaId, status FROM etapas ORDER BY criadoEm DESC LIMIT 5;` | Recent records show expected statuses | |
| **Cache Keys** | `redis-cli KEYS "*etapas*"` | Keys exist | |
| **Queue Jobs** | `redis-cli KEYS "*bull*"` | BullMQ keys exist | |
| **Slow Queries** | `SELECT query, mean_time FROM pg_stat_statements WHERE mean_time > 1000 LIMIT 5;` | None or acceptable | |

---

## API ENDPOINTS (15 min) ⏱️

| Endpoint | Method | Test | Expected | ✅/❌ |
|----------|--------|------|----------|-------|
| `/auth/login` | POST | `{"email":"mgr@imobi.test","password":"pwd"}` | 200, JWT token | |
| `/manager/etapas-pendentes` | GET | `?limit=20&page=0` with token | 200, array | |
| `/manager/etapas/{id}` | GET | Real ID with token | 200, etapa object | |
| `/manager/etapas/{id}/approve` | POST | Real ID with token | 200, status=APROVADA | |
| `/manager/etapas/{id}/reject` | POST | Real ID + reason | 200, status=REJEITADA | |
| `/engenheiro/obras/{id}/vistoria` | POST | GPS + photos + token | 200, vistoria created | |
| `/health` | GET | No auth | 200, healthy | |

---

## SECURITY CHECKS (10 min) ⏱️

| Check | Test | Expected | ✅/❌ |
|-------|------|----------|-------|
| **CORS** | Check response headers | `Access-Control-Allow-Origin` present | |
| **JWT Expiry** | Generate token, wait 15 min | Token becomes invalid | |
| **Rate Limiting** | 150 requests to `/auth/login` in 1 min | 10+ requests rejected (429) | |
| **CSP Headers** | `curl -i http://localhost:3001` | `Content-Security-Policy` header present | |
| **SQL Injection** | Prisma ORM in use | Parameterized queries verified | |
| **Auth Validation** | No token in request | 401 Unauthorized returned | |

---

## MONITORING & ALERTING (5 min) ⏱️

| Check | Expected | ✅/❌ |
|-------|----------|-------|
| **Sentry Dashboard** | No critical errors in last 24h | |
| **Grafana Dashboard** | Error rate < 1%, p95 < 500ms | |
| **Alert Rules** | Error spike, DB, Payment queue, Memory/CPU alerts configured | |
| **Notification Webhook** | Active and tested | |

---

## PAYMENT PROCESSING (Critical!) (10 min) ⏱️

| Test | Action | Expected | ✅/❌ |
|------|--------|----------|-------|
| **Approve Triggers Job** | Manager approves etapa via API | BullMQ job created in Redis | |
| **Job Queued** | Check queue depth | `redis-cli LLEN bull:liberacao-parcela:wait` > 0 | |
| **Worker Processes** | Monitor worker logs | Jobs dequeued and processed | |
| **Status Update** | Check DB after job | Payment status updated correctly | |
| **Notification** | Engineer receives notification | Webhook/email sent successfully | |

---

## SIGN-OFF

| Role | Name | Date/Time | Signature | Pass? |
|------|------|-----------|-----------|-------|
| **QA Lead** | _____ | _____ | _____ | ☐ |
| **Eng Lead** | _____ | _____ | _____ | ☐ |
| **CTO** | _____ | _____ | _____ | ☐ |

**Checklist Started**: _____________  
**Checklist Completed**: _____________  
**Total Time Elapsed**: _____________

---

**TOTAL ESTIMATED TIME: 2 hours max**  
- Health Checks: 15 min  
- Critical Flows: 45 min  
- Database/Cache: 10 min  
- API Endpoints: 15 min  
- Security: 10 min  
- Monitoring: 5 min  
- Payment Processing: 10 min  
- **Buffer**: 10 min  

**GO/NO-GO DECISION MADE AT**: _____ (by CTO)

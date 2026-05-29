# Simplified Pre-Deployment Testing Checklist
**Target: Complete in 2 hours | Date: 2026-06-01 | Decision by 17:00 Brazil time**

---

## 1. BUILD & TYPE CHECKS (10 min) ⏱️

| Test | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| TypeScript Check | `pnpm type-check` | All 5 packages: ✅ 0 errors | [ ] |
| Build Success | `pnpm build` | Completes < 60s, 0 errors | [ ] |
| Local Dev Start | `pnpm dev` | http://localhost:3000 loads | [ ] |

---

## 2. HEALTH CHECKS (10 min) ⏱️

| Test | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| API Health | `curl http://localhost:3001/health` | Status 200 | [ ] |
| Dashboard Access | Open http://localhost:3000/dashboard/gestor/etapas | Page loads, no errors | [ ] |
| Page Renders | Check for React errors in console | No red errors | [ ] |

---

## 3. CRITICAL USER FLOWS (45 min) ⏱️

### 3.1 Manager Dashboard (15 min)
**Credentials**: manager@imobi.test / password

| Test | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| Login | Enter credentials → Submit | JWT token generated, redirected to dashboard | [ ] |
| List Load | Navigate to `/dashboard/gestor/etapas` | 20+ etapas displayed with pagination | [ ] |
| Filter Status | Select filter: "Aguardando" | List updates, shows only pending items | [ ] |
| Filter Priority | Select filter: "Urgente" | List updates, shows only urgent items | [ ] |
| Search | Type obra name in search | Results filtered in real-time | [ ] |
| Pagination | Click "Next" button | New page loads with different items | [ ] |

### 3.2 Detail Page & Approval (15 min)
**Flow**: List → Click "Revisar" on any etapa

| Test | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| Load Detail | Click "Revisar" button | Detail page loads, etapa info visible | [ ] |
| GPS Map | Scroll to map section | Leaflet map displays with markers | [ ] |
| Map Markers | Verify marker colors | Orange=center, Green=valid GPS, Red=invalid | [ ] |
| Approval Trail | Scroll to timeline | Previous approvals/rejections visible | [ ] |
| Approve Button | Click "Aprovar" | Status changes to APROVADA, success message | [ ] |
| Reject Button | Click "Rejeitar" → Select reason | Modal shows, status changes to REJEITADA | [ ] |

### 3.3 Bulk Actions (15 min)
**Flow**: List → Select multiple → Bulk actions

| Test | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| Select All | Click "Select all" checkbox | All visible items checked | [ ] |
| Bulk Approve | Select 3+ items → Click "Aprovar selecionados" | All items status=APROVADA, success message | [ ] |
| Bulk Reject | Select 3+ items → Click "Rejeitar selecionados" | Modal for reason shows, items rejected | [ ] |
| Clear Selection | Click bulk action → Complete | Selection cleared automatically | [ ] |

### 3.4 Engineer Portal (10 min)
**Credentials**: engenheiro@imobi.test / password

| Test | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| View Obras | Login as engineer, navigate to obras | Assigned obras displayed | [ ] |
| Start Vistoria | Click "Iniciar vistoria" on any obra | Vistoria form opens | [ ] |
| GPS Validation | Enter invalid GPS (too far) → Submit | Error: "GPS fora do raio" | [ ] |
| GPS Valid | Enter valid GPS (within 100m) → Submit | Form accepts, continues to photos | [ ] |
| Photo Upload | Upload photo with GPS metadata | Photo stored, GPS metadata attached | [ ] |

---

## 4. DATABASE & CACHE VALIDATION (10 min) ⏱️

### PostgreSQL Queries
| Test | Command | Expected Result | Pass |
|------|---------|-----------------|------|
| Connect | `psql -U postgres -d imobi_prod` | Connected, no errors | [ ] |
| Tables Exist | `SELECT COUNT(*) FROM obras, etapas, evidencias;` | All tables return row counts > 0 | [ ] |
| Recent Records | `SELECT id, status FROM etapas ORDER BY criadoEm DESC LIMIT 5;` | Last 5 records visible, status in [AGUARDANDO, APROVADA, REJEITADA] | [ ] |
| PostGIS Working | `SELECT ST_Distance(geom1, geom2) FROM test_gps LIMIT 1;` | Returns distance value > 0 | [ ] |

### Redis Verification
| Test | Command | Expected Result | Pass |
|------|---------|-----------------|------|
| Redis Ping | `redis-cli PING` | Returns PONG | [ ] |
| Cache Keys | `redis-cli KEYS "*etapas*" | wc -l` | Returns > 10 keys | [ ] |
| Queue Jobs | `redis-cli KEYS "*bull*manager*" | wc -l` | Returns >= 0 (queue exists even if empty) | [ ] |

---

## 5. PAYMENT PIPELINE (10 min) ⏱️

| Test | Action | Expected Result | Pass |
|------|--------|-----------------|------|
| Approve Etapa | POST `/manager/etapas/{id}/approve` with JWT | Status 200, db updates to APROVADA | [ ] |
| Job Created | Check Redis after approval | `KEYS *payment*` returns new job | [ ] |
| Worker Processes | Wait 2-3 seconds, check job status | Job moves to "completed" or "processing" | [ ] |
| Notification Queued | Check BullMQ queue | Engineer notification job exists | [ ] |

**Test Curl Example**:
```bash
curl -X POST http://localhost:3001/api/manager/etapas/{id}/approve \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json"
```

---

## 6. API ENDPOINT VALIDATION (10 min) ⏱️

| Endpoint | Method | Test | Expected | Pass |
|----------|--------|------|----------|------|
| `/auth/login` | POST | Valid creds | 200, JWT returned | [ ] |
| `/manager/etapas-pendentes` | GET | With JWT | 200, array of etapas | [ ] |
| `/manager/etapas/{id}` | GET | Real etapa ID | 200, object with all fields | [ ] |
| `/manager/etapas/{id}/approve` | POST | With JWT | 200, status=APROVADA | [ ] |
| `/health` | GET | No auth | 200, healthy | [ ] |

---

## 7. SECURITY CHECKS (5 min) ⏱️

| Check | How to Verify | Expected Result | Pass |
|-------|---------------|-----------------|------|
| CORS Headers | `curl -i http://localhost:3001/health | grep -i "access-control"` | Headers present | [ ] |
| JWT Expiry | Get token, wait 16 min, use token | Token rejected after 15 min | [ ] |
| Rate Limiting | POST to `/auth/login` 15 times rapid-fire | 15th request returns 429 | [ ] |
| SQL Injection | Try `name=' OR '1'='1` in any input | Request sanitized, no DB error | [ ] |
| XSS Protection | View page source, check CSP header | CSP header present | [ ] |

---

## 8. MONITORING & ALERTS (5 min) ⏱️

| Check | Location | Expected Result | Pass |
|-------|----------|-----------------|------|
| Grafana Accessible | Open http://localhost:3000/grafana | Dashboard loads, metrics visible | [ ] |
| Error Graph | Grafana > Errors panel | Error rate = 0 or < 1% | [ ] |
| Response Time | Grafana > Latency panel | p95 < 500ms, p99 < 1s | [ ] |
| Sentry Errors | Check Sentry dashboard | No critical errors in last 24h | [ ] |
| Alerts Active | Verify alert rules in monitoring | All critical alerts enabled | [ ] |

---

## SUMMARY

**Total Tests**: 50+ checks
**Estimated Time**: 2 hours (110 minutes)
**All Must Pass**: YES

| Category | Status | Time |
|----------|--------|------|
| Build & Type Checks | [ ] Pass | 10 min |
| Health Checks | [ ] Pass | 10 min |
| User Flows | [ ] Pass | 45 min |
| Database & Cache | [ ] Pass | 10 min |
| Payment Pipeline | [ ] Pass | 10 min |
| API Endpoints | [ ] Pass | 10 min |
| Security | [ ] Pass | 5 min |
| Monitoring | [ ] Pass | 5 min |

---

## TESTER SIGN-OFF

| Role | Name | All Passed? | Time Completed | Signature |
|------|------|-------------|-----------------|-----------|
| **QA Lead** | _________ | [ ] Yes | _________ | _________ |
| **Eng Lead** | _________ | [ ] Yes | _________ | _________ |

**Testing Started**: _________ (2026-06-01 14:00 UTC / 11:00 Brazil)
**Testing Completed**: _________ 
**Go/No-Go Decision**: _________ by CTO at _________ UTC

---

**NEXT**: Review GO_NO_GO_DECISION.md for approval criteria

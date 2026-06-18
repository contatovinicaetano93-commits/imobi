# iMobi MVP - QA Test Plan (30/05-01/06/2026)

**Test Timeline:** 4-6 hours total | **Success Criteria:** 100% pass, <5 minor issues | **Tester:** Contract QA Engineer

---

## Overview

This QA test plan validates iMobi's MVP features before production cutover. Focus areas: Dashboard filtering, bulk reject operations, GPS validation, KYC approval flows, audit trails, and rate limiting under load.

**Test Environment:**
- URL: https://app.imbobi.com.br (or staging link)
- Browsers: Chrome (latest), Safari (macOS)
- Mobile: iOS 16+ (Testflight), Android 11+ (internal build)
- Credentials: 3x test accounts (Tomador, Gestor, Admin)

---

## Test Case Groups & Execution

### GROUP 1: Manager Dashboard (30 mins)

#### TC-001: Dashboard Load & Stats Display
- **Steps:**
  1. Login as ENGENHEIRO user
  2. Navigate to `/dashboard/gestor`
  3. Wait for page to fully load
  4. Verify all stat cards appear (Fila Aprovações, Fila KYC, Créditos Ativos, Obras Ativas)
- **Expected:** Page loads in <2s, all 4 stats display correct numbers, no console errors
- **Pass/Fail:** ___

#### TC-002: Stats Card Click Navigation
- **Steps:**
  1. From dashboard, click "Fila Aprovações" card (red stat)
  2. Verify redirect to `/dashboard/gestor/etapas`
  3. Click "Fila KYC" card (yellow stat)
  4. Verify redirect to `/dashboard/gestor/kyc`
- **Expected:** Correct page navigation with data pre-loaded
- **Pass/Fail:** ___

#### TC-003: Dashboard Cache Hit (Performance)
- **Steps:**
  1. Load dashboard
  2. Wait 5 seconds
  3. Reload page (F5)
  4. Check Network tab (DevTools) for stats endpoint
- **Expected:** Cache hit evident, response time <300ms on reload
- **Pass/Fail:** ___

#### TC-004: Error Handling - Unauthorized Access
- **Steps:**
  1. Logout and delete JWT token from localStorage
  2. Manually navigate to `/dashboard/gestor`
  3. Verify redirect to login page
- **Expected:** User cannot access manager portal without auth, error message displays
- **Pass/Fail:** ___

---

### GROUP 2: Etapas (Stage) Filtering (45 mins)

#### TC-005: Filter by Status "Pendente"
- **Steps:**
  1. Login as ENGENHEIRO
  2. Go to `/dashboard/gestor/etapas`
  3. Click filter dropdown → select "Pendente"
  4. Observe table updates
- **Expected:** Only stages with status AGUARDANDO_VISTORIA display, count accurate
- **Pass/Fail:** ___

#### TC-006: Filter by Date Range
- **Steps:**
  1. Click date filter
  2. Select "dataInicio" = today - 7 days
  3. Select "dataFim" = today
  4. Apply filter
- **Expected:** Table shows only stages created in last 7 days, total count updates
- **Pass/Fail:** ___

#### TC-007: Filter by Obra Type
- **Steps:**
  1. Click "Obra Type" dropdown
  2. Select "REFORMA_RESIDENCIAL"
  3. Observe table
- **Expected:** Only stages from reforma projects appear, other types filtered out
- **Pass/Fail:** ___

#### TC-008: Filter by Priority "Urgente"
- **Steps:**
  1. Click priority filter → select "Urgente"
  2. Observe table updates (should show only stages >24h old)
- **Expected:** Only stages created >24 hours ago display, "Intermediaria" and "Normal" filtered out
- **Pass/Fail:** ___

#### TC-009: Multi-Filter Combination
- **Steps:**
  1. Apply Status="Pendente" + Priority="Urgente" + Obra Type="REFORMA"
  2. Verify table updates correctly
  3. Verify total count reflects all filters
- **Expected:** All three filters apply simultaneously, count is accurate
- **Pass/Fail:** ___

#### TC-010: Clear All Filters
- **Steps:**
  1. With multiple filters applied, click "Limpar Filtros" button
  2. Verify all filters reset to default
- **Expected:** Filters clear, full list displays, counts reset
- **Pass/Fail:** ___

#### TC-011: Pagination Works with Filters
- **Steps:**
  1. Apply Status="Pendente" filter
  2. Click next page button
  3. Verify filter still applied, different rows display
- **Expected:** Pagination respects active filters, seamless navigation
- **Pass/Fail:** ___

#### TC-012: Filter Cache Consistency
- **Steps:**
  1. Apply Status filter
  2. Refresh page (F5)
  3. Verify filter state persists (check URL query params)
- **Expected:** URL contains filter params, page reloads with same filters applied
- **Pass/Fail:** ___

---

### GROUP 3: Bulk Reject Operations (30 mins)

#### TC-013: Single Reject with Reason
- **Steps:**
  1. Go to etapas list
  2. Click "Rejeitar" button on a PENDENTE stage
  3. Enter motivo: "Evidências insuficientes"
  4. Submit
- **Expected:** Stage status changes to REPROVADA, notification sent to user, audit log created
- **Pass/Fail:** ___

#### TC-014: Bulk Reject Multiple Stages
- **Steps:**
  1. Select 3 stages (checkboxes)
  2. Click "Rejeitar Selecionadas" button
  3. Enter reason: "Foto de má qualidade"
  4. Confirm
- **Expected:** All 3 stages change to REPROVADA, 3 notifications sent, 3 audit logs created
- **Pass/Fail:** ___

#### TC-015: Reject Validation - Non-Pending Stage
- **Steps:**
  1. Try to reject a stage already in CONCLUIDA or REPROVADA status
- **Expected:** Error message: "Etapa não está aguardando vistoria", stage not modified
- **Pass/Fail:** ___

#### TC-016: Reject Audit Trail Entry
- **Steps:**
  1. Reject a stage
  2. Click stage detail
  3. Scroll to "Histórico de Auditoria" section
- **Expected:** Latest entry shows: REJEITADA action, timestamp, manager name, reason visible
- **Pass/Fail:** ___

#### TC-017: User Notification After Reject
- **Steps:**
  1. Login as TOMADOR (stage owner)
  2. Go to notifications (bell icon)
  3. Verify notification: "Etapa reprovada: [Etapa Nome]"
- **Expected:** Notification appears immediately with stage name and reason
- **Pass/Fail:** ___

#### TC-018: Reject Reason Required Validation
- **Steps:**
  1. Click reject button
  2. Leave motivo empty
  3. Try to submit
- **Expected:** Validation error: "Motivo é obrigatório", form does not submit
- **Pass/Fail:** ___

---

### GROUP 4: Approval Flow & Payment Release (40 mins)

#### TC-019: Approve Stage with Valid Evidence
- **Steps:**
  1. Go to etapas list
  2. Click a PENDENTE stage with at least 1 validated evidence
  3. Click "Aprovar"
  4. Verify confirmation dialog
  5. Confirm approval
- **Expected:** Status changes to CONCLUIDA, user notified, BullMQ job enqueued
- **Pass/Fail:** ___

#### TC-020: Approve Validation - No Validated Evidence
- **Steps:**
  1. Find a stage with 0 validated evidence
  2. Try to approve
- **Expected:** Error: "Etapa precisa ter ao menos uma evidência validada"
- **Pass/Fail:** ___

#### TC-021: Approval Creates Audit Log
- **Steps:**
  1. Approve a stage
  2. Click stage detail
  3. Check audit history
- **Expected:** Log entry: APROVADA, timestamp, manager name, observacao (if provided)
- **Pass/Fail:** ___

#### TC-022: Payment Release Triggers Async Job
- **Steps:**
  1. Approve a stage with active credit (status=ATIVO)
  2. Check Redis/BullMQ queue (admin panel or logs)
  3. Verify `liberacao-parcela.worker` job enqueued
- **Expected:** Job added to QUEUE_LIBERACAO, valor=etapa.percentualObra × credito.valorAprovado
- **Pass/Fail:** ___

#### TC-023: Stage Approval Email Notification
- **Steps:**
  1. Approve a stage
  2. Check test email inbox
  3. Verify email from noreply@imbobi.com.br
- **Expected:** Email subject: "Etapa Aprovada: [Nome]", body shows value, due date estimate
- **Pass/Fail:** ___

#### TC-024: Push Notification on Approval (Mobile)
- **Steps:**
  1. Open iOS/Android app with same account
  2. Keep app in foreground
  3. Approve a stage from web
  4. Observe mobile screen
- **Expected:** Push notification arrives within 2s with stage name
- **Pass/Fail:** ___

#### TC-025: Approval with Observacao (Optional Field)
- **Steps:**
  1. Approve stage and enter observacao: "Fotos claras, evidências excelentes"
  2. Verify observacao saves in audit log
- **Expected:** Observacao displays in audit trail, visible to all future viewers
- **Pass/Fail:** ___

---

### GROUP 5: KYC Approval Portal (30 mins)

#### TC-026: List Pending KYC Documents
- **Steps:**
  1. Go to `/dashboard/gestor/kyc`
  2. Verify list shows only documents with status=PENDENTE
- **Expected:** Page loads, displays CPF, Nome, data submission for each doc
- **Pass/Fail:** ___

#### TC-027: KYC Detail View
- **Steps:**
  1. Click on a pending KYC document
  2. Go to `/dashboard/gestor/kyc/[id]`
  3. Verify all fields display: CPF, RG, Endereço, selfie, document images
- **Expected:** Detail page loads, images display correctly, no 404 errors
- **Pass/Fail:** ___

#### TC-028: Approve KYC Document
- **Steps:**
  1. From KYC detail, click "Aprovar"
  2. Confirm dialog
- **Expected:** Status changes to APROVADO, user notified, kycStatus updates to APROVADO
- **Pass/Fail:** ___

#### TC-029: Reject KYC with Reason
- **Steps:**
  1. Click "Rejeitar" button
  2. Enter motivo: "Selfie não é clara"
  3. Submit
- **Expected:** Status=REJEITADO, motivo saved, notification sent to user
- **Pass/Fail:** ___

#### TC-030: KYC Audit Log Creation
- **Steps:**
  1. Reject a KYC document
  2. Scroll to audit section
- **Expected:** New log entry with REJEITADA action, reason visible, timestamp correct
- **Pass/Fail:** ___

#### TC-031: Bulk KYC Approval
- **Steps:**
  1. Select 2-3 pending KYC documents
  2. Click "Aprovar Selecionadas"
  3. Confirm
- **Expected:** All selected docs change to APROVADO, 3 notifications sent, 3 audit logs created
- **Pass/Fail:** ___

---

### GROUP 6: GPS Validation (25 mins)

#### TC-032: GPS Coordinates Validation (Client-side)
- **Steps:**
  1. Open mobile app (iOS or Android)
  2. Go to create obra form
  3. Try to enter invalid GPS: "999.99, 999.99"
  4. Attempt submit
- **Expected:** Client-side error: "GPS inválido", form does not submit
- **Pass/Fail:** ___

#### TC-033: GPS Validation (Server-side PostGIS)
- **Steps:**
  1. Intercept network request (mobile DevTools or Fiddler)
  2. Modify GPS to invalid coords: "0.0, 0.0"
  3. Submit request directly to API
- **Expected:** Server responds with 400: "GPS validation failed", record not created
- **Pass/Fail:** ___

#### TC-034: Valid GPS Acceptance
- **Steps:**
  1. Create obra with valid São Paulo GPS: "-23.5505, -46.6333"
  2. Submit
- **Expected:** Record created, map displays pin correctly, no validation errors
- **Pass/Fail:** ___

#### TC-035: GPS Distance Validation (if implemented)
- **Steps:**
  1. Create two obras with GPS >500km apart
  2. Verify both accept (or check business rules)
- **Expected:** Both records save (or error if distance rule exists), behavior is consistent
- **Pass/Fail:** ___

---

### GROUP 7: Audit Trail Integrity (20 mins)

#### TC-036: Etapa Audit Log Completeness
- **Steps:**
  1. From etapa detail, review full audit history
  2. Verify each log entry has: acaoTipo, gerenciador, timestamp, observacoes
- **Expected:** All required fields populated, timestamps in chronological order
- **Pass/Fail:** ___

#### TC-037: KYC Audit Log Completeness
- **Steps:**
  1. Review KYC audit history after approval/rejection
  2. Verify: acaoTipo, gerenciador, timestamp, motivo
- **Expected:** All fields present, motivo text fully visible (not truncated)
- **Pass/Fail:** ___

#### TC-038: Audit Log Ordering (Newest First)
- **Steps:**
  1. Make 3 sequential actions on same etapa (e.g., create, approve, close)
  2. Check audit trail
- **Expected:** Newest action at top, ordering by criadoEm DESC
- **Pass/Fail:** ___

#### TC-039: No Audit Log Modification
- **Steps:**
  1. Attempt to edit past audit log entry (via DevTools or API)
- **Expected:** 403 Forbidden or read-only error, log entry unchanged
- **Pass/Fail:** ___

---

### GROUP 8: Rate Limiting & Performance (20 mins)

#### TC-040: Rate Limit on List Endpoints
- **Steps:**
  1. Write script to call `/api/manager/etapas` 100 times in 10 seconds
  2. Monitor response codes
- **Expected:** After ~30-50 requests, 429 (Too Many Requests) returned, backoff works
- **Pass/Fail:** ___

#### TC-041: Dashboard Response Time <2s
- **Steps:**
  1. Open network tab (DevTools)
  2. Load `/dashboard/gestor` with cache disabled
  3. Measure API response for stats endpoint
- **Expected:** Response received in <2s, all data loaded
- **Pass/Fail:** ___

#### TC-042: Filter Performance with Large Dataset
- **Steps:**
  1. Database has 1000+ pending etapas
  2. Apply Status="Pendente" filter
  3. Measure response time
- **Expected:** Response in <3s, pagination works, no timeout errors
- **Pass/Fail:** ___

#### TC-043: Cache TTL Validation (120 seconds)
- **Steps:**
  1. Load dashboard
  2. Record stats numbers
  3. Create new stage in DB (backend)
  4. Refresh dashboard immediately (<5s)
- **Expected:** Stats unchanged (cache hit), after 120s refresh shows updated count
- **Pass/Fail:** ___

#### TC-044: Mobile App Performance - KYC List Load
- **Steps:**
  1. Open KYC list on iOS/Android on 4G network
  2. Measure load time
- **Expected:** List loads in <3s, images lazy-load, no app crash
- **Pass/Fail:** ___

---

### GROUP 9: Cross-Browser & Mobile Compatibility (20 mins)

#### TC-045: Chrome Desktop - Dashboard Full Feature Test
- **Steps:**
  1. Test TC-001, TC-005, TC-013 in Chrome (latest)
  2. Verify no console errors
- **Expected:** All features work, UI renders correctly, no broken styles
- **Pass/Fail:** ___

#### TC-046: Safari Desktop - Responsive Layout
- **Steps:**
  1. Open dashboard in Safari (macOS 12+)
  2. Resize to 1024x768, 320x568
  3. Test filters, navigation, clicks
- **Expected:** Layout responsive, readable, buttons clickable, no layout breaks
- **Pass/Fail:** ___

#### TC-047: iOS Mobile - KYC Approval Workflow
- **Steps:**
  1. Open web app in Safari on iPad/iPhone
  2. Login as gestor
  3. Approve a KYC document
- **Expected:** Touch targets ≥44x44px, no horizontal scroll, submission works
- **Pass/Fail:** ___

#### TC-048: Android Mobile - Etapa Filter Test
- **Steps:**
  1. Open web app in Chrome Android
  2. Apply Status + Date filters
  3. Verify pagination
- **Expected:** Filters apply, pagination works, no performance lag
- **Pass/Fail:** ___

---

### GROUP 10: Error Handling & Edge Cases (25 mins)

#### TC-049: Network Timeout Recovery
- **Steps:**
  1. Open DevTools
  2. Go to Network tab, throttle to "Slow 4G"
  3. Load dashboard
  4. Wait for timeout or completion
- **Expected:** Either loads gracefully or shows "Connection timeout" error with retry option
- **Pass/Fail:** ___

#### TC-050: Empty Dataset Handling
- **Steps:**
  1. Filter etapas to criteria that returns 0 results
  2. Observe page
- **Expected:** "Nenhuma etapa encontrada" message displays, not blank page or crash
- **Pass/Fail:** ___

#### TC-051: Malformed Input in Reject Reason
- **Steps:**
  1. Reject with motivo containing: "<script>alert('xss')</script>"
  2. Check if script executes
- **Expected:** Input sanitized, stored as text, no script execution
- **Pass/Fail:** ___

#### TC-052: Double-Click Approval Prevention
- **Steps:**
  1. Double-click "Aprovar" button rapidly
  2. Verify only 1 approval processed
- **Expected:** Button disabled after first click or idempotent endpoint returns same result
- **Pass/Fail:** ___

#### TC-053: Session Expiry Handling
- **Steps:**
  1. Login and let session expire (JWT token expires after ~24h)
  2. Try to approve a stage
- **Expected:** 401 Unauthorized, user redirected to login, clear error message
- **Pass/Fail:** ___

---

## Timeline Breakdown (4 hours)

| Group | Feature | Time | Tests |
|-------|---------|------|-------|
| 1 | Dashboard | 30m | TC-001-004 |
| 2 | Filtering | 45m | TC-005-012 |
| 3 | Bulk Reject | 30m | TC-013-018 |
| 4 | Approvals | 40m | TC-019-025 |
| 5 | KYC Portal | 30m | TC-026-031 |
| 6 | GPS | 25m | TC-032-035 |
| 7 | Audit Trail | 20m | TC-036-039 |
| 8 | Performance | 20m | TC-040-044 |
| 9 | Cross-Browser | 20m | TC-045-048 |
| 10 | Error Handling | 25m | TC-049-053 |
| **TOTAL** | | **285 mins (4.75h)** | **53 tests** |

---

## Equipment Required

- **Browsers:** Chrome (≥v120), Safari (≥v16)
- **Mobile:** iOS 16+ (Testflight link), Android 11+ (APK provided)
- **Network:** Standard broadband, also test on 4G via mobile hotspot
- **Tools:** DevTools (Chrome/Safari), Fiddler or Charles Proxy (for network interception)
- **Test Accounts:** 
  - 1x TOMADOR (obra owner)
  - 1x ENGENHEIRO (stage approver)
  - 1x ADMIN (full access)

---

## Success Criteria

1. **Pass Rate:** ≥95% (max 3 failed tests out of 53)
2. **Critical Issues:** 0 blockers (approval fails, filters broken, data loss)
3. **Major Issues:** ≤1 (pagination doesn't work, auth broken)
4. **Minor Issues:** ≤5 (UI typos, slow cache, missing labels)
5. **Performance:** Dashboard <2s, filters <3s, mobile <3s
6. **No Data Loss:** Approvals/rejections persist across sessions
7. **Audit Trail:** 100% completeness for every action
8. **No XSS/Injection:** Malformed inputs sanitized

---

## Bug Reporting Template

**Issue: [Title]**

```
Status: [Critical/Major/Minor]
Test Case: TC-###
Environment: [Chrome/Safari/iOS/Android]
Severity: [Blocker/High/Medium/Low]

Steps to Reproduce:
1. 
2. 
3. 

Expected:


Actual:


Screenshot/Video: [Attached]

Impacted Flow: [Dashboard / Filtering / Approvals / etc]
```

---

## Sign-Off

- **Tester:** _______________________
- **Date:** _______________________
- **Pass/Fail:** _______________________
- **Total Issues Found:** _______________________
  - Critical: ___
  - Major: ___
  - Minor: ___

---

## Notes for Tester

- **Start with TC-001-004** to validate environment and auth
- **Prioritize TC-013, TC-019, TC-026** (core business flows)
- **GPS tests (TC-032-035)** require DB access to verify server-side validation
- **Cache/Performance tests (TC-040-044)** can be skipped if time-constrained; prioritize functional tests
- **Report daily:** Send screenshots + bug list to vinicaetano93@gmail.com by EOD
- **Feedback:** If any test is unclear, ask immediately—don't guess expected behavior


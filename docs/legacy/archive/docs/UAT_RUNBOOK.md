# UAT Runbook — imobi Staging
**Execution Date**: _______ | **Operator**: _______ | **Duration**: 2 hours

---

## Suite A: Authentication & Access Control

### Test A1: Manager Login Success ✅

**Objective**: Verify manager can login and access dashboard

**Steps**:
1. Navigate to `http://localhost:3000/login`
2. Enter email: `manager@imobi.test`
3. Enter password: `senha123!@#`
4. Click "Login"
5. Verify redirected to `/dashboard`
6. Verify dashboard shows "Gestor de Etapas" panel

**Expected Result**: Login successful, dashboard displays

**Actual Result**: _________________  
**Status**: ☐ PASS ☐ FAIL  
**Notes**: _________________

---

### Test A2: Engineer Access Denied to Manager Routes ✅

**Objective**: Verify engineer cannot access `/dashboard/gestor` pages

**Steps**:
1. Login as: `engenheiro@imobi.test` / `senha123!@#`
2. Navigate to `http://localhost:3000/dashboard/gestor/etapas`
3. Verify redirected to `/dashboard` or access denied

**Expected Result**: Access denied, redirected to safe page

**Actual Result**: _________________  
**Status**: ☐ PASS ☐ FAIL  
**Notes**: _________________

---

### Test A3: Session Timeout ✅

**Objective**: Verify user session expires after inactivity

**Steps**:
1. Login as manager
2. Note login time
3. Wait 30 minutes OR manually invalidate JWT in localStorage
4. Try to access `/dashboard`
5. Verify redirected to login page

**Expected Result**: Session expired, redirected to login

**Actual Result**: _________________  
**Status**: ☐ PASS ☐ FAIL  
**Notes**: _________________

---

## Suite B: Manager Approvals & Rejections

### Test B1: Approve Single Etapa ✅

**Objective**: Manager can approve construction stage

**Steps**:
1. Login as manager (`manager@imobi.test`)
2. Navigate to `/dashboard/gestor/etapas`
3. Find etapa with status "PENDENTE_APROVACAO"
4. Click etapa to open detail view
5. Click "Aprovar" button
6. Verify etapa status changes to "APROVADA"
7. Verify success notification appears

**Expected Result**: Etapa approved, status updated

**Actual Result**: _________________  
**Status**: ☐ PASS ☐ FAIL  
**Notes**: _________________

---

### Test B2: Reject Etapa with Reason ✅

**Objective**: Manager can reject stage with reason

**Steps**:
1. Login as manager
2. Navigate to `/dashboard/gestor/etapas`
3. Find etapa with status "PENDENTE_APROVACAO"
4. Click "Rejeitar" button
5. Enter rejection reason: "Documentação incompleta"
6. Click "Confirmar Rejeição"
7. Verify etapa status changes to "REJEITADA"
8. Verify reason is saved

**Expected Result**: Etapa rejected with reason stored

**Actual Result**: _________________  
**Status**: ☐ PASS ☐ FAIL  
**Notes**: _________________

---

### Test B3: Bulk Approval ✅

**Objective**: Manager can approve multiple etapas at once

**Steps**:
1. Login as manager
2. Navigate to `/dashboard/gestor/etapas`
3. Select 3 etapas (checkbox)
4. Click "Aprovar Selecionadas" button
5. Verify all 3 etapas status change to "APROVADA"
6. Verify success notification shows "3 etapas aprovadas"

**Expected Result**: All selected etapas approved in bulk

**Actual Result**: _________________  
**Status**: ☐ PASS ☐ FAIL  
**Notes**: _________________

---

## Suite C: Payment Processing Integration

### Test C1: Payment Initiates on Approval ✅

**Objective**: Payment processing triggered when stage approved

**Steps**:
1. Login as manager
2. Navigate to `/dashboard/gestor/etapas`
3. Find etapa with payment pending (status: "PENDENTE_PAGAMENTO")
4. Click "Aprovar"
5. Verify status changes to "PAGAMENTO_PROCESSANDO"
6. Wait 5 seconds
7. Refresh page
8. Verify status changed to "PAGO" or similar

**Expected Result**: Payment processes automatically after approval

**Actual Result**: _________________  
**Status**: ☐ PASS ☐ FAIL  
**Notes**: _________________

---

### Test C2: Payment Error Handling ✅

**Objective**: System handles payment failure gracefully

**Steps**:
1. Create scenario: Etapa with invalid payment data (missing account)
2. Approve the etapa
3. Verify status shows "PAGAMENTO_ERRO" or similar
4. Verify error message appears on dashboard
5. Verify etapa can be retried

**Expected Result**: Error handled without crash, retry available

**Actual Result**: _________________  
**Status**: ☐ PASS ☐ FAIL  
**Notes**: _________________

---

### Test C3: Payment Notification Sent ✅

**Objective**: User receives notification when payment processed

**Steps**:
1. Login as manager
2. Approve etapa with payment
3. Check notification center (`/dashboard/notificacoes`)
4. Verify notification: "Pagamento de parcela #X processado"
5. Click notification to view details

**Expected Result**: Notification appears and is readable

**Actual Result**: _________________  
**Status**: ☐ PASS ☐ FAIL  
**Notes**: _________________

---

## Suite D: Engineer Workflows

### Test D1: Engineer Submit Vistoria (Site Visit Report) ✅

**Objective**: Engineer can submit construction stage visit report

**Steps**:
1. Login as engineer (`engenheiro@imobi.test`)
2. Navigate to `/dashboard/engenheiro/vistorias`
3. Find open vistoria (status: "AGENDADA")
4. Click "Iniciar Vistoria"
5. Upload 3 site photos (JPG/PNG)
6. Enter observation: "Estrutura conforme projeto"
7. Mark stage as "Completa"
8. Click "Enviar Vistoria"
9. Verify status changes to "ENVIADA"

**Expected Result**: Vistoria submitted with photos and notes

**Actual Result**: _________________  
**Status**: ☐ PASS ☐ FAIL  
**Notes**: _________________

---

### Test D2: Engineer View Assigned Works ✅

**Objective**: Engineer can see all assigned construction projects

**Steps**:
1. Login as engineer
2. Navigate to `/dashboard/engenheiro/obras`
3. Verify list shows: Obra name, address, current stage, next milestone
4. Click one obra to view details
5. Verify stage timeline visible

**Expected Result**: Obras list displays correctly with relevant details

**Actual Result**: _________________  
**Status**: ☐ PASS ☐ FAIL  
**Notes**: _________________

---

### Test D3: Schedule Vistoria ✅

**Objective**: Engineer can schedule site visit

**Steps**:
1. Login as engineer
2. Navigate to `/dashboard/engenheiro/vistorias`
3. Click "Agendar Nova Vistoria"
4. Select obra from list
5. Select stage from dropdown
6. Pick date/time: tomorrow at 10:00 AM
7. Add note: "Verificar fundações"
8. Click "Confirmar Agendamento"
9. Verify vistoria appears in calendar

**Expected Result**: Vistoria scheduled and visible

**Actual Result**: _________________  
**Status**: ☐ PASS ☐ FAIL  
**Notes**: _________________

---

### Test D4: Upload Evidence Photos ✅

**Objective**: Engineer can attach evidence photos to vistoria

**Steps**:
1. Login as engineer
2. Start a vistoria (as in D1)
3. Click "Adicionar Fotos"
4. Upload 5 photos in sequence
5. Verify all 5 appear in gallery
6. Click one photo to preview (full screen)
7. Submit vistoria
8. Verify photos saved

**Expected Result**: All photos uploaded, stored, and retrievable

**Actual Result**: _________________  
**Status**: ☐ PASS ☐ FAIL  
**Notes**: _________________

---

## Suite E: Obra & GPS Validation

### Test E1: GPS Coordinate Validation ✅

**Objective**: GPS coordinates are validated server-side within acceptable radius

**Steps**:
1. Login as engineer
2. Navigate to submit vistoria form
3. Note GPS coordinates shown (e.g., -23.550, -46.633)
4. Verify "GPS VÁLIDO" badge appears
5. Try entering invalid GPS (e.g., -90.00, -180.00)
6. Verify error message appears
7. Correct GPS back to valid value
8. Verify badge returns to "VÁLIDO"

**Expected Result**: GPS validation enforced, invalid coords rejected

**Actual Result**: _________________  
**Status**: ☐ PASS ☐ FAIL  
**Notes**: _________________

---

### Test E2: Obra Location Map ✅

**Objective**: Obra location visible on interactive map

**Steps**:
1. Login as manager
2. Navigate to `/dashboard/gestor/etapas`
3. Click etapa to view detail
4. Scroll to "Localização da Obra" section
5. Verify interactive map displays
6. Verify marker shows obra location
7. Verify map is responsive (zoom, pan works)

**Expected Result**: Map displays with obra location marked

**Actual Result**: _________________  
**Status**: ☐ PASS ☐ FAIL  
**Notes**: _________________

---

### Test E3: Distance Validation on Vistoria ✅

**Objective**: System ensures vistoria submitted from work site (within 100m)

**Steps**:
1. Setup: Have engineer device with GPS enabled
2. Engineer navigates to vistoria submission form
3. Current GPS location checked (must be within 100m of obra)
4. If outside radius: Error message shown
5. If inside radius: Allow submission
6. Submit vistoria
7. Verify submission succeeds

**Expected Result**: Distance validated, submission allowed if nearby

**Actual Result**: _________________  
**Status**: ☐ PASS ☐ FAIL  
**Notes**: _________________

---

## Summary

**Total Tests**: 16  
**Passed**: ____  
**Failed**: ____  
**Pass Rate**: ____%

### Critical Failures (if any):
1. _________________
2. _________________
3. _________________

### Non-Critical Issues (for post-UAT refinement):
1. _________________
2. _________________

### Notes for Engineering Team:
_________________________________

**Operator Signature**: _________________ | **Date**: _________ | **Time**: _________

**QA Lead Review**: _________________ | **Approved for Production**: ☐ YES ☐ NO

---

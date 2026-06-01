# Smoke Test Checklist - Happy Path Validation

**Status**: Phase 7 - Staging Deployment & E2E Validation  
**Environment**: Staging (after deployment)  
**Purpose**: Validate 15-20 critical user flows work end-to-end  
**Estimated Duration**: 30-45 minutes (manual + automated)

---

## Quick Reference

| # | Test | Description | Status |
|---|------|-------------|--------|
| 1 | Auth Login | Login → JWT → Dashboard | [ ] |
| 2 | Logout | Logout → Token invalidated | [ ] |
| 3 | Create Obra | Create project → List → Details | [ ] |
| 4 | GPS Validation | Valid/Invalid GPS tested | [ ] |
| 5 | Upload Evidence | Image → S3 → CDN URL | [ ] |
| 6 | Engineer Assignment | Manager assigns → Notification | [ ] |
| 7 | Create Parcela | Create payment → Status tracking | [ ] |
| 8 | Liberar Parcela | Approve → BullMQ async → Release | [ ] |
| 9 | Notifications | Create → Firebase → Read | [ ] |
| 10 | KYC Upload | Document → Validation → Approval | [ ] |
| 11 | Manager Approval | Approve/Reject etapas | [ ] |
| 12 | Rate Limiting | 100 ok, 101st = 429 | [ ] |
| 13 | Caching | Query 2x → 2nd from Redis | [ ] |
| 14 | Error Recovery | Redis down → Graceful fallback | [ ] |
| 15 | Concurrency | 5 concurrent ops → No races | [ ] |
| 16 | LGPD Export | Export all user data | [ ] |
| 17 | LGPD Delete | Account deletion 30-day grace | [ ] |

---

## Test 1: Authentication Flow

**Expected**: Login → JWT token → Dashboard access

**Steps**:
1. Go to https://staging.imbobi.com.br/login
2. Enter test@imbobi.com.br / Test123456!
3. Click "Entrar"
4. Verify: Redirected to /dashboard
5. Check DevTools: JWT token in cookies

**Result**: [ ] PASS [ ] FAIL  
**Time**: [ ] ms

---

## Test 2: Logout & Token Invalidation

**Expected**: Logout → Redirected to login → Protected routes blocked

**Steps**:
1. From dashboard, click menu → "Sair"
2. Verify: Redirected to /login
3. Try /dashboard directly
4. Verify: Redirected to /login again

**Result**: [ ] PASS [ ] FAIL

---

## Test 3: Create Obra

**Expected**: Create project → Appears in list → Details accessible

**Steps**:
1. Login (Test 1)
2. Go to "Minhas Obras"
3. Click "+ Criar Obra"
4. Fill: Nome="Test Obra", CEP="01310100"
5. Click "Criar"
6. Verify: 200 OK
7. Verify: Obra in list
8. Click on obra → Details load

**Result**: [ ] PASS [ ] FAIL  
**Response Time**: [ ] ms  
**Cleanup**: [ ] Delete test obra

---

## Test 4: GPS Validation (PostGIS)

**Expected**: Valid GPS accepted, invalid rejected

**Steps**:
1. From obra, click "Adicionar GPS"
2. Allow location
3. Submit: Lat -23.5505, Lon -46.6333
4. Verify: 200 OK, { valid: true }
5. Try invalid: Lat -50, Lon -100
6. Verify: 400 Bad Request

**Result**: [ ] PASS [ ] FAIL  
**Valid GPS time**: [ ] ms  
**Invalid GPS time**: [ ] ms

---

## Test 5: Upload Evidence Image

**Expected**: Upload → S3 stored → CDN URL returned

**Steps**:
1. From obra, click "Adicionar Evidência"
2. Select image (< 5MB)
3. Click upload
4. Verify: 200 OK, { url, key }
5. Click URL → Image opens in browser
6. Verify: Encrypted (AES-256)

**Result**: [ ] PASS [ ] FAIL  
**Upload time**: [ ] s  
**S3 URL accessible**: [ ] YES [ ] NO

---

## Test 6: Engineer Assignment

**Expected**: Manager assigns → Engineer notified → Can access

**Steps**:
1. Login as manager
2. Go to obra
3. Click "Atribuir Engenheiro"
4. Select engineer
5. Verify: 200 OK
6. Login as engineer
7. Check notifications: Assignment visible
8. Click → Obra loads

**Result**: [ ] PASS [ ] FAIL  
**Notification time**: [ ] s (Firebase FCM)

---

## Test 7: Create Parcela

**Expected**: Create payment → DB updated → Status pending_approval

**Steps**:
1. Login as admin
2. Go to "Crédito" → "Parcelas"
3. Click "+ Criar"
4. Fill: Valor=5000, Vencimento=30d
5. Click "Criar"
6. Verify: 200 OK, ID returned

**Result**: [ ] PASS [ ] FAIL  
**Response time**: [ ] ms

---

## Test 8: Liberar Parcela (Async Job)

**Expected**: Approve → Job queued → Status updates → Email sent

**Steps**:
1. From Parcelas, find test parcela
2. Click "Aprovar e Liberar"
3. Verify: 200 OK (< 500ms)
4. Status: "liberando" → wait 5s → "liberada"
5. Check email: SendGrid sandbox

**Result**: [ ] PASS [ ] FAIL  
**Approve time**: [ ] ms  
**Job completion**: [ ] s  
**Email received**: [ ] YES [ ] NO

---

## Test 9: Notifications (Firebase FCM)

**Expected**: Create → Send → User reads

**Steps**:
1. Create notification: "Test message"
2. Send to user
3. Verify: 200 OK
4. Login as recipient
5. Check: Push notification received
6. Click → Marked as read
7. List: unread count decrements

**Result**: [ ] PASS [ ] FAIL  
**Delivery time**: [ ] s

---

## Test 10: KYC Document Upload

**Expected**: Upload → Validation → Approval

**Steps**:
1. Login as user
2. Go to "Perfil" → "Validação"
3. Upload ID image
4. Verify: 200 OK
5. Wait: Unico API (sandbox) validates
6. Verify: Status updates (approved/rejected)

**Result**: [ ] PASS [ ] FAIL  
**Validation time**: [ ] s

---

## Test 11: Manager Dashboard Approval

**Expected**: View pending → Approve → Audit logged → User notified

**Steps**:
1. Login as manager
2. Go to "Manager Portal"
3. Find pending etapa
4. Click "Revisar"
5. Click "Aprovar"
6. Verify: Status = "approved"
7. Check audit trail: Logged with timestamp
8. Verify: User notified

**Result**: [ ] PASS [ ] FAIL  
**Response time**: [ ] ms

---

## Test 12: Rate Limiting (100/min)

**Expected**: Requests 1-100 ok, #101 = 429

**Bash**:
```bash
for i in {1..101}; do
  curl https://api-staging.railway.app/health \
    -H "Authorization: Bearer $TOKEN" \
    --write-out "%{http_code}\n"
done | tail -5
```

**Expected**: 200 200 200 ... 429

**Result**: [ ] PASS [ ] FAIL

---

## Test 13: Caching (5 min TTL)

**Expected**: 2nd query from Redis (10x faster)

**Bash**:
```bash
time curl https://api-staging.railway.app/obras?page=1  # ~200ms, X-Cache: MISS
time curl https://api-staging.railway.app/obras?page=1  # ~20ms, X-Cache: HIT
```

**Result**: [ ] PASS [ ] FAIL  
**First query**: [ ] ms  
**Cache hit**: [ ] ms

---

## Test 14: Error Recovery (Redis Down)

**Expected**: API continues without Redis, with warnings

**Steps**:
1. In Railway, scale Redis to 0
2. Try: curl https://api-staging.railway.app/health
3. Verify: Still 200 OK (< 3s)
4. Check Sentry: Warning logged
5. Restart Redis
6. Verify recovery: Cache operational

**Result**: [ ] PASS [ ] FAIL  
**Degraded response time**: [ ] ms

---

## Test 15: Concurrency (No Race Conditions)

**Expected**: 5 concurrent operations succeed without corruption

**Bash**:
```bash
for i in {1..5}; do
  curl -X POST https://api-staging.railway.app/credito/liberar \
    -H "Authorization: Bearer $TOKEN" \
    -d "{\"parcelaId\": \"$ID_$i\"}" &
done
wait
```

**Result**: [ ] PASS [ ] FAIL  
**All 5 jobs queued**: [ ] YES [ ] NO

---

## Test 16: LGPD Data Export

**Expected**: Request → ZIP emailed → All data included

**Steps**:
1. Login as user
2. Go to "Privacidade"
3. Click "Exportar Meus Dados"
4. Confirm
5. Check email: ZIP within 2 minutes
6. Download & verify: usuario.json, credito.json, obras.json

**Result**: [ ] PASS [ ] FAIL  
**Email time**: [ ] minutes

---

## Test 17: LGPD Account Deletion

**Expected**: Request → 30-day grace → Auto-delete

**Steps**:
1. Login as user
2. Go to "Privacidade"
3. Click "Deletar Conta"
4. Confirm with password
5. Verify: 200 OK
6. Try login: Still works, warning shown
7. After 30 days: Account hard-deleted (verify)

**Result**: [ ] PASS [ ] FAIL  
**Soft-delete recorded**: [ ] YES [ ] NO

---

## Summary

**Pass Rate**: [ ] / 17 = [ ]%

**Critical Issues** (blocks deployment):
```
[ ] None
[ ] (list if any)
```

**Final Decision**: 
[ ] 🟢 GO - Deploy to production
[ ] 🔴 NO-GO - Fix issues and re-test

**Tested By**: [ ] Name  
**Date**: [ ] 2026-05-30  
**Time**: [ ] 45 min

---

**Version**: 1.0 | **Status**: Ready | **Created**: 2026-05-30

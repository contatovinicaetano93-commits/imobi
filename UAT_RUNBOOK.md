# UAT Runbook - Step-by-Step Execution Guide

**Date Prepared**: 2026-05-29  
**Environment**: Staging (Full Stack)  
**Operator**: [Your Name]  
**Start Time**: _______________  

---

## Section A: Pre-Test Setup (Do This First!)

### A.1 System Readiness Check

**Task**: Verify all prerequisites are met

```bash
# Terminal Window 1: Navigate to project
cd /home/user/imobi

# Check Git status
git status
# Expected: "nothing to commit, working tree clean"

# Verify Docker is running
docker ps
# Expected: List of containers should be visible

# Check Docker Compose version
docker-compose --version
# Expected: version 1.29+ or Docker Compose V2
```

**Result**: [ ] PASS [ ] FAIL  
**Notes**: _______________________________________________

---

### A.2 Start Services

```bash
# Terminal Window 1: Start full stack
docker-compose up -d

# Wait for containers to boot
echo "Waiting for services to start..."
sleep 15

# Check container status
docker-compose ps
# Expected: All containers showing "healthy" or "running"
```

**Service Status**:
- [ ] postgres: running/healthy
- [ ] redis: running/healthy
- [ ] api: running/healthy
- [ ] web: running/healthy

---

### A.3 Verify Database & Cache

```bash
# Test database connection
psql $DATABASE_URL -c "SELECT NOW();"
# Expected: Current timestamp returned

# Test Redis
redis-cli ping
# Expected: PONG

# Run migrations (if needed)
cd /home/user/imobi/services/api
npm run db:migrate
# Expected: "Database is up to date" or "Applied X migrations"
```

**Result**: [ ] All services healthy

---

### A.4 Create Test Data

```bash
# Engineer Test Account
curl -X POST http://localhost:4000/api/v1/auth/registrar \
  -H "Content-Type: application/json" \
  -d '{
    "email": "engineer.uat.'"$(date +%s)"'@imbobi.com.br",
    "nome": "Engineer UAT",
    "cpf": "12345678901",
    "telefone": "11999999999",
    "senha": "TestPass123!"
  }' | jq '.usuarioId'
# Save the usuarioId returned

# Manager Test Account
curl -X POST http://localhost:4000/api/v1/auth/registrar \
  -H "Content-Type: application/json" \
  -d '{
    "email": "manager.uat.'"$(date +%s)"'@imbobi.com.br",
    "nome": "Manager UAT",
    "cpf": "98765432101",
    "telefone": "1133334444",
    "senha": "ManagerPass123!"
  }' | jq '.usuarioId'
# Save the usuarioId returned

# Promote manager in database
MANAGER_EMAIL="manager.uat.$(date +%s)@imbobi.com.br"
psql $DATABASE_URL -c "UPDATE usuario SET tipo='GESTOR_OBRA' WHERE email='$MANAGER_EMAIL';"
```

**Test Accounts Created**:
- Engineer Email: _______________________________
- Manager Email: _______________________________

**Status**: [ ] Test data ready

---

## Section B: Manual Test Execution (90-120 minutes)

### Test Group 1: Authentication (25 minutes)

#### TC 1.1: User Registration & Login (5 min)

**Precondition**: Fresh browser session, no prior login

**Steps**:
1. Open browser → http://localhost:3000
2. Click "Registrar" button
3. Fill registration form:
   - Nome: "João UAT Test"
   - Email: "joao.uat.nnnnnn@imbobi.com.br" (use unique timestamp)
   - CPF: "12345678901"
   - Telefone: "11988776655"
   - Senha: "TestPass123!"
4. Click "Registrar"
5. Wait for redirect (observe URL)
6. Open browser DevTools → Application → Cookies
7. Look for "refreshToken" cookie

**Observations**:
- Registration response time: ______ ms
- Redirect URL: ___________________________________________
- JWT in response: [ ] YES [ ] NO
- Refresh token cookie present: [ ] YES [ ] NO
- Console errors: [ ] YES [ ] NO

**Result**: [ ] PASS [ ] FAIL

**Next Step**: DO NOT LOGOUT. Proceed to TC 1.2.

---

#### TC 1.2: JWT Token Refresh (10 min)

**Precondition**: You are logged in from TC 1.1

**Steps**:
1. Open DevTools → Network tab → Filter by "renovar" or "refresh"
2. Wait 15 minutes (or simulate token expiration)
   - Open DevTools → Console
   - Run: `localStorage.removeItem('access_token'); location.reload();`
3. Click any button that requires authentication (e.g., "Minhas Obras")
4. Watch Network tab for automatic token refresh call
5. Verify new token issued

**Observations**:
- Auto-refresh attempted: [ ] YES [ ] NO
- New token received: [ ] YES [ ] NO
- Still logged in after refresh: [ ] YES [ ] NO

**Result**: [ ] PASS [ ] FAIL

---

#### TC 1.3: Invalid Credentials (5 min)

**Precondition**: Logout from previous tests

**Steps**:
1. Logout (click user menu → Sair)
2. Open login page
3. Enter: Email: "invalid@example.com"
4. Enter: Password: "WrongPassword123!"
5. Click "Entrar"
6. Observe error message
7. Check DevTools → Network → Response for status code

**Observations**:
- Response status code: _______
- Error message displayed: _______________________________
- No token issued: [ ] YES [ ] NO

**Result**: [ ] PASS [ ] FAIL

---

#### TC 1.4: Session Persistence (5 min)

**Precondition**: You are logged in

**Steps**:
1. Navigate to http://localhost:3000/obras
2. Verify you see "Minhas Obras" list
3. Close browser COMPLETELY (all tabs and windows)
4. Clear browser cache (DevTools → Application → Clear storage)
5. Wait 5 seconds
6. Reopen browser
7. Go to http://localhost:3000
8. Verify you are automatically logged in (no login page redirect)
9. Click on a work to verify access works

**Observations**:
- Auto-logged in: [ ] YES [ ] NO
- Dashboard loaded: [ ] YES [ ] NO
- Can access protected resources: [ ] YES [ ] NO

**Result**: [ ] PASS [ ] FAIL

---

#### TC 1.5: Rate Limiting (5 min)

**Precondition**: Any browser, any login state

**Steps**:
1. Open DevTools → Console
2. Paste and run this script:

```javascript
async function testRateLimit() {
  const results = [];
  for (let i = 0; i < 15; i++) {
    try {
      const res = await fetch('http://localhost:4000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'nonexistent@test.com',
          password: 'test'
        })
      });
      results.push({ attempt: i + 1, status: res.status });
      console.log(`Request ${i + 1}: ${res.status}`);
    } catch (e) {
      console.error(`Request ${i + 1} failed:`, e);
    }
  }
  console.table(results);
}
testRateLimit();
```

3. Observe console output

**Observations**:
- Requests 1-10: Status codes __________________________
- Requests 11-15: Status codes __________________________
- 429 (rate limited) appears at request: ______
- Rate limit enforced: [ ] YES [ ] NO

**Result**: [ ] PASS [ ] FAIL

---

### Test Group 2: Dashboard & Works (35 minutes)

#### TC 2.1: Works List Load Time (10 min)

**Precondition**: Logged in

**Steps**:
1. Open DevTools → Network tab
2. Open Performance tab
3. Click on "Minhas Obras" (or reload if already there)
4. In Network tab, note:
   - Time to first request completion
   - Total page load time
5. Check X-Cache header in response
6. Apply filter: Status = "Em Andamento"
7. Note filter response time

**Observations**:
- DOMContentLoaded: ______ ms
- Total page load: ______ ms
- X-Cache header value: _______________________________
- Cache hit (HIT in header): [ ] YES [ ] NO
- Filter response: ______ ms

**Result**: [ ] PASS [ ] FAIL

---

#### TC 2.2: Create Obra (10 min)

**Precondition**: Logged in, on "Minhas Obras" page

**Steps**:
1. Click "+ Nova Obra" button
2. Fill form:
   - Nome: "Test Obra UAT"
   - Logradouro: "Rua Test"
   - Número: "123"
   - Bairro: "Centro"
   - Cidade: "Campinas"
   - UF: "SP"
   - CEP: "13010100"
   - Latitude: -22.9082
   - Longitude: -47.0654
   - Raio Validação: 80
   - Área: 150
   - Data Conclusão: 2026-08-29
3. Click "Criar Obra"
4. Measure time to response
5. Verify redirect to obra detail
6. Go back to "Minhas Obras" and verify it appears in list

**Observations**:
- Create response time: ______ ms
- New obra ID: _______________________________
- Appears in list: [ ] YES [ ] NO
- GPS coordinates stored: [ ] YES [ ] NO

**Result**: [ ] PASS [ ] FAIL

---

#### TC 2.3: Credit Status (5 min)

**Precondition**: Logged in

**Steps**:
1. Navigate to "Crédito" section
2. View "Saldo Disponível" (Available Balance)
3. Note the values displayed:
   - Total Credit Granted: R$ _______________
   - Total Released: R$ _______________
   - Available: R$ _______________
4. Verify math: Total - Released = Available

**Observations**:
- Balance displayed: [ ] YES [ ] NO
- Calculation correct: [ ] YES [ ] NO
- Response time: ______ ms

**Result**: [ ] PASS [ ] FAIL

---

#### TC 2.4: Mobile Responsive (10 min)

**Precondition**: Any logged-in state

**Steps**:
1. Open DevTools → Device Toolbar (Ctrl+Shift+M or Cmd+Shift+M)
2. Select "iPhone 12" preset
3. Navigate through pages:
   - Minhas Obras
   - Obra Detail (click one)
   - Crédito
   - User Profile (if available)
4. Check for each page:
   - No horizontal scrolling needed
   - Text is readable (no zoom needed)
   - Buttons are tappable (> 44px)
   - Images scale properly
5. Test touch interactions

**Observations**:
- Layout renders correctly: [ ] YES [ ] NO
- All pages responsive: [ ] YES [ ] NO
- Touch targets adequate: [ ] YES [ ] NO
- No horizontal scrolling: [ ] YES [ ] NO

**Result**: [ ] PASS [ ] FAIL

---

### Test Group 3: Manager Portal (30 minutes)

#### TC 3.1: Manager Login (5 min)

**Precondition**: Use manager account created in Section A

**Steps**:
1. Logout from engineer account
2. Login with manager account:
   - Email: manager.uat.nnnnnn@imbobi.com.br
   - Senha: ManagerPass123!
3. Verify redirect to Manager Dashboard
4. Look for "Etapas Pendentes" section
5. Check available filters

**Observations**:
- Login successful: [ ] YES [ ] NO
- Dashboard loads: [ ] YES [ ] NO
- Load time: ______ ms
- Filters visible: [ ] YES [ ] NO

**Result**: [ ] PASS [ ] FAIL

---

#### TC 3.2: Approve Evidence (15 min)

**Note**: You need evidence uploaded first. Skip if no evidence available, or create one manually via API.

**Precondition**: Manager logged in, evidence exists

**Steps**:
1. From Manager Dashboard, find a pending etapa
2. Click to open detail view
3. Scroll to "Evidências" section
4. Click evidence to view it
5. Verify GPS map displays location
6. Click "Aprovar" button
7. Type observation: "Approved - UAT Test"
8. Click "Confirmar Aprovação"
9. Wait for response
10. Verify status changed to "APROVADA"

**Observations**:
- Evidence displayed: [ ] YES [ ] NO
- Map shows location: [ ] YES [ ] NO
- Status changed to APROVADA: [ ] YES [ ] NO
- Response time: ______ ms
- Observation saved: [ ] YES [ ] NO

**Result**: [ ] PASS [ ] FAIL

---

#### TC 3.3: Reject Evidence (10 min)

**Precondition**: Manager logged in, different evidence available

**Steps**:
1. Find another pending etapa
2. Click evidence to view
3. Click "Rejeitar" button
4. Enter reason: "Need higher quality photo. Please retake."
5. Click "Confirmar Rejeição"
6. Verify status changed to "REJEITADA"
7. Verify reason is visible

**Observations**:
- Reject button works: [ ] YES [ ] NO
- Status changed to REJEITADA: [ ] YES [ ] NO
- Reason saved: [ ] YES [ ] NO
- Response time: ______ ms

**Result**: [ ] PASS [ ] FAIL

---

### Test Group 4: GPS Validation (20 minutes)

#### TC 4.1: Valid GPS Upload (10 min)

**Note**: This requires mobile app (Expo). If testing on web only, SKIP this section.

**Precondition**: Mobile app running, engineer logged in, obra created

**Steps** (on Expo mobile app):
1. Navigate to the obra created in TC 2.2
2. Click "Adicionar Etapa"
3. Fill:
   - Nome: "Foundation Phase"
   - Descrição: "Excavation and foundation"
   - Ordem: 1
   - Percentual: 10
   - Data: 2026-06-15
4. Click "Criar Etapa"
5. Click "Enviar Evidência" (Upload Evidence)
6. App requests GPS permission → ALLOW
7. Take a photo or select from device
8. Confirm upload
9. Observe GPS distance display

**Observations**:
- GPS permission granted: [ ] YES [ ] NO
- Coordinates captured: [ ] YES [ ] NO
- Distance displayed: ______ m
- Within 80m radius: [ ] YES [ ] NO
- Evidence uploaded: [ ] YES [ ] NO

**Result**: [ ] PASS [ ] FAIL

---

#### TC 4.2: Invalid GPS Rejection (10 min)

**Precondition**: Mobile app, different location

**Steps** (on Expo mobile app):
1. From same etapa, try "Enviar Evidência" again
2. This time, simulate a location OUTSIDE the 80m radius
   - Option A: Change device location to São Paulo (-23.5505, -46.6333)
   - Option B: Use network proxy to intercept and modify coordinates
3. Attempt upload
4. Observe error message

**Observations**:
- Error message displayed: [ ] YES [ ] NO
- Error text: _______________________________
- Distance in error: ______ m
- Evidence NOT uploaded: [ ] YES [ ] NO

**Result**: [ ] PASS [ ] FAIL

---

### Test Group 5: Payment Processing (15 minutes)

#### TC 5.1: Request Credit (5 min)

**Precondition**: Logged in as engineer

**Steps**:
1. Navigate to "Crédito" (Credit)
2. Click "+ Solicitar Crédito" (Request Credit)
3. Fill form:
   - Obra: Select from dropdown
   - Tipo: "Construção"
   - Valor Solicitado: 50000
   - Juros Esperados: 1.5
4. Click "Solicitar"
5. Observe response

**Observations**:
- Request created: [ ] YES [ ] NO
- Status = PENDENTE: [ ] YES [ ] NO
- Request ID assigned: [ ] YES [ ] NO
- Response time: ______ ms

**Result**: [ ] PASS [ ] FAIL

---

#### TC 5.2: Async Payment Release (10 min)

**Precondition**: Manager logged in, approved credit exists

**Steps**:
1. Manager navigates to "Crédito Aprovado" (Approved Credit)
2. Find a credit request (from TC 5.1 or existing)
3. Click "Liberar Pagamento" (Release Payment)
4. Confirm dialog
5. Measure response time
6. Verify immediate response (should be very fast)
7. Check Redis queue in another terminal:

```bash
# Terminal 2 (separate from test)
redis-cli KEYS "bull:liberacao*"
# Should show pending job
```

8. Monitor logs:

```bash
# Terminal 2 (separate from test)
tail -f logs/worker.log | grep "liberacao"
# Should show job processing
```

**Observations**:
- HTTP response status: _______
- Response time: ______ ms (should be < 100ms)
- Job enqueued in Redis: [ ] YES [ ] NO
- Job processed within 5s: [ ] YES [ ] NO
- Email notification sent: [ ] YES [ ] NO

**Result**: [ ] PASS [ ] FAIL

---

## Section C: Load Testing (30 minutes)

### C.1 Prepare Load Test

```bash
# Terminal 1: Navigate to API
cd /home/user/imobi/services/api

# Verify test file exists
ls -la src/test/load.spec.ts
# Expected: File should exist and be readable
```

**Status**: [ ] Ready

---

### C.2 Execute Load Test

```bash
# Terminal 1: Run load tests (this will take ~30 minutes)
npm run test -- --testPathPattern=load.spec.ts

# Expected output will show:
# ✓ Scenario 1: Authentication Bottleneck
# ✓ Scenario 2: Manager Dashboard Load
# ✓ Scenario 3: List Obras
# ✓ Scenario 4: Etapa Approval Workflow
# ✓ Scenario 5: Rate Limit Validation
# ✓ Performance Report
```

**Execution Start**: _______________  
**Execution End**: _______________  
**Duration**: _______________

---

### C.3 Capture Performance Metrics

From the console output, record these values:

**Scenario 1: Auth Bottleneck (100 concurrent users)**
- p50: ______ ms
- p95: ______ ms
- p99: ______ ms
- Error count: _____
- Error rate: _____%

**Scenario 2: Manager Dashboard (50 concurrent users)**
- p95: ______ ms
- Cache hit rate: _____%
- Error rate: _____%

**Scenario 3: List Obras (75 concurrent users)**
- p95: ______ ms
- Error rate: _____%

**Scenario 4: Etapa Approval (10 concurrent users)**
- p95: ______ ms

**Scenario 5: Rate Limiting**
- 429 responses received: [ ] YES [ ] NO

---

### C.4 Verify Load Test Results

```bash
# Performance passed criteria:
[ ] Scenario 1 p95 < 200ms
[ ] Scenario 2 p95 < 500ms and cache > 80%
[ ] Scenario 3 p95 < 800ms
[ ] Scenario 4 p95 < 800ms
[ ] Scenario 5 rate limiting enforced

Overall Load Test: [ ] PASS [ ] FAIL
```

---

## Section D: Security Spot Checks (15 minutes)

### D.1 JWT Configuration

```bash
# Terminal 1: Check JWT expiry settings
grep -r "expiresIn\|refreshTokenTtl" /home/user/imobi/services/api/src/modules/auth/

# Look for:
# - expiresIn: '15m' (access token)
# - refresh: '7d' (refresh token)
```

**Result**:
- Access token TTL: ______
- Refresh token TTL: ______
- Correct: [ ] YES [ ] NO

---

### D.2 Security Headers

```bash
# Terminal 1: Check response headers
curl -I http://localhost:4000/api/v1/health

# Look for these headers in response:
# X-Frame-Options: DENY
# X-Content-Type-Options: nosniff
# Strict-Transport-Security: max-age=31536000
# Content-Security-Policy: default-src 'self'
```

**Headers Found**:
- [ ] X-Frame-Options: DENY
- [ ] X-Content-Type-Options: nosniff
- [ ] Strict-Transport-Security
- [ ] Content-Security-Policy

**Result**: [ ] PASS [ ] FAIL

---

### D.3 Rate Limiting

Verify from TC 1.5 (already tested)

**Result**: [ ] PASS (enforced at 10 req/min)

---

### D.4 GPS Validation

Verify from TC 4.2 (already tested)

**Result**: [ ] PASS (server-side enforcement)

---

## Section E: Compile Results

### E.1 Summary Statistics

**Manual Tests**:
- Total cases executed: ____
- Total cases passed: ____
- Total cases failed: ____
- Pass rate: _____%

**Load Tests**:
- All 5 scenarios executed: [ ] YES [ ] NO
- Performance targets met: [ ] YES [ ] NO

**Security Checks**:
- All critical controls verified: [ ] YES [ ] NO

---

### E.2 Issues Found

**Critical Issues** (if any):
1. ___________________________________________________________________
2. ___________________________________________________________________

**High Issues** (if any):
1. ___________________________________________________________________
2. ___________________________________________________________________

**Medium Issues** (if any):
1. ___________________________________________________________________

---

### E.3 Overall Assessment

**Overall Status**: [ ] PASS [ ] FAIL

**Recommendation**: 
[ ] GO TO PRODUCTION
[ ] HOLD FOR FIXES

**Reason**: ___________________________________________________________________

---

## Section F: Documentation

### F.1 Update Test Results Document

```bash
# Open the results document
nano /home/user/imobi/UAT_TEST_RESULTS.md

# Fill in:
# - Execution date/time
# - Test case results (pass/fail)
# - Performance metrics
# - Issues found
# - Sign-offs

# Save and exit (Ctrl+X, Y, Enter)
```

**Status**: [ ] Updated

---

### F.2 Commit Results

```bash
# Terminal 1: Commit test results
cd /home/user/imobi

git add UAT_TEST_RESULTS.md UAT_EXECUTION_REPORT.md
git commit -m "UAT Results - $(date +%Y-%m-%d) - Pass Rate: ___%"
git push origin main

# Verify push successful
git log --oneline | head -3
```

**Status**: [ ] Committed to git

---

## Section G: Sign-Offs

### G.1 QA Lead Sign-Off

**Print this section and have QA Lead fill it out:**

```
QA LEAD SIGN-OFF

Test Execution Completed: [ ] YES [ ] NO
Total Test Cases Passed: ____ / 16
Overall Pass Rate: _____%

Blockers Found:
[ ] None
[ ] Minor (< 2 issues)
[ ] Significant (2-5 issues)
[ ] Critical (> 5 issues)

QA Status: [ ] APPROVED [ ] NEEDS FIXES

QA Lead Name: _______________________________
Date: _______________________________
Signature: _______________________________
```

**Status**: [ ] Signed

---

### G.2 Engineering Lead Sign-Off

**Print this section and have Engineering Lead fill it out:**

```
ENGINEERING LEAD SIGN-OFF

Code Quality Review: [ ] PASS [ ] FAIL
Test Coverage Adequate: [ ] YES [ ] NO
Performance Acceptable: [ ] YES [ ] NO

Engineering Status: [ ] APPROVED [ ] NEEDS FIXES

Engineering Lead Name: _______________________________
Date: _______________________________
Signature: _______________________________
```

**Status**: [ ] Signed

---

### G.3 CTO Final Sign-Off

**Print this section and have CTO fill it out:**

```
CTO FINAL SIGN-OFF

Overall Technical Assessment: [ ] READY [ ] NOT READY
Security Review: [ ] PASS [ ] FAIL
Production Readiness: [ ] GO [ ] NO-GO

Critical Blockers: [ ] NONE [ ] PRESENT (list: _______)

CTO Decision: [ ] APPROVED FOR PRODUCTION [ ] REJECTED

CTO Name: _______________________________
Date: _______________________________
Signature: _______________________________
```

**Status**: [ ] Signed

---

## Section H: Cleanup

### H.1 Optional: Clean Test Data

```bash
# Remove test users from database (optional)
psql $DATABASE_URL -c "DELETE FROM usuario WHERE email LIKE '%uat%';"

# Verify
psql $DATABASE_URL -c "SELECT COUNT(*) FROM usuario WHERE email LIKE '%uat%';"
# Expected: 0
```

---

### H.2 Stop Services (Optional)

```bash
# When done testing, optionally stop services
docker-compose down

# Verify
docker-compose ps
# Expected: No containers running
```

---

## Final Checklist

**Before declaring UAT complete:**

- [ ] All 16 test cases executed at least once
- [ ] >= 14 test cases passed (87.5%)
- [ ] Load test p95 < 500ms
- [ ] Load test error rate < 0.1%
- [ ] No unresolved critical issues
- [ ] Security checks PASS
- [ ] QA sign-off obtained
- [ ] Engineering sign-off obtained
- [ ] CTO go-ahead received
- [ ] Test results committed to git
- [ ] Runbook sections A-G completed

---

**UAT Execution Status**: 

**Started**: _______________  
**Completed**: _______________  
**Duration**: _______________  

**Operator Signature**: _______________________________  

**Next Phase**: 
[ ] GO TO PRODUCTION DEPLOYMENT
[ ] HOLD FOR ISSUE REMEDIATION
[ ] SCHEDULE RETRY UAT

---

**Questions or Issues During UAT?**
- Consult: `/home/user/imobi/UAT_EXECUTION_REPORT.md` (detailed procedures)
- Quick Ref: `/home/user/imobi/UAT_QUICK_REFERENCE.md` (quick lookup)
- Debug: `/home/user/imobi/UAT_RUNBOOK.md` Troubleshooting section (this file, Section H)


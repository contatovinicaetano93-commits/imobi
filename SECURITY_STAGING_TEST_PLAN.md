# Security Staging Validation Test Plan — imbobi
**Date:** May 30, 2026  
**Status:** Ready for Execution  
**Test Environment:** Staging (HTTP/HTTPS)

---

## Executive Summary

This document provides comprehensive security validation tests for the imobi API on staging. All 20 OWASP vulnerabilities have been fixed in the codebase. This test plan validates that:

1. **CSRF Protection** is enforced on state-changing requests
2. **Rate Limiting** prevents brute force attacks (10 req/min on auth)
3. **Encryption** protects sensitive data (AES-256-GCM)
4. **IDOR Prevention** ensures users cannot access other users' data
5. **Authorization** is properly enforced by role and ownership
6. **Input Validation** prevents injection attacks
7. **Security Headers** are correctly configured
8. **Token Management** invalidates tokens on logout

---

## Test Environment Setup

### Prerequisites
```bash
# 1. Staging API must be running
STAGING_URL=http://staging.imbobi.local:4000
# OR
STAGING_URL=https://api.staging.imbobi.com.br

# 2. Test tools available:
# - curl (HTTP client)
# - jq (JSON parser - optional)
# - Postman (for visual testing)

# 3. Test data:
# - Valid CPF: 11144477735 (real valid format)
# - Valid CNPJ: 11222333000181 (real valid format)
# - Test user email pattern: {test-type}-{timestamp}@test.com
```

### Health Check
```bash
curl -X GET http://staging.imbobi.local:4000/api/v1/health
# Expected: {"status":"ok","timestamp":"..."}
```

---

## TEST 1: CSRF PROTECTION

### Purpose
Verify that Cross-Site Request Forgery attacks are prevented via CSRF token validation or SameSite cookie flags.

### Test 1.1: CSRF Token Endpoint
**Command:**
```bash
curl -X GET \
  http://staging.imbobi.local:4000/api/v1/csrf-token
```

**Expected Response:**
- Status: 200 OK
- Body contains `token` field with 64+ character hex string
- OR: 404 if not exposed publicly (acceptable - can use SameSite)

**Severity:** MEDIUM - If no CSRF protection, risk of cross-site attacks

---

### Test 1.2: POST Without CSRF Token
**Command:**
```bash
# Attempt to login without CSRF token (public endpoint may not require)
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test@test.com",
    "senha":"testpass"
  }' \
  http://staging.imbobi.local:4000/api/v1/auth/login
```

**Expected Response:**
- Status: 200/401 (login may succeed if credentials wrong, or CSRF protected)
- OR: 403 if CSRF token required
- Response should NOT contain raw JWT or sensitive data

**Pass Criteria:**
- If 403: CSRF protection confirmed
- If 200/401: SameSite=Strict cookie is sufficient defense

---

### Test 1.3: PATCH/DELETE Without CSRF (State-Changing)
**Command:**
```bash
curl -X PATCH \
  -H "Content-Type: application/json" \
  -d '{"status":"EM_PROGRESSO"}' \
  http://staging.imbobi.local:4000/api/v1/etapas/123/status
```

**Expected Response:**
- Status: 401 (no auth header) or 403 (CSRF failure)
- Should NOT be 200 OK without proper authentication

**Severity:** CRITICAL - PATCH/DELETE must be protected

---

## TEST 2: RATE LIMITING

### Purpose
Verify rate limiting prevents brute force attacks on auth endpoints.

### Test 2.1: Login Rate Limit (10 req/min)
**Command:**
```bash
#!/bin/bash
# Send 15 rapid login attempts
for i in {1..15}; do
  echo "Attempt $i:"
  curl -s -X POST \
    -H "Content-Type: application/json" \
    -d "{
      \"email\":\"nonexistent-$i@test.com\",
      \"senha\":\"wrongpass\"
    }" \
    http://staging.imbobi.local:4000/api/v1/auth/login | jq '.statusCode // .status'
  sleep 0.1  # 100ms between requests
done
```

**Expected Behavior:**
- Requests 1-10: Status 401 (invalid credentials)
- Request 11+: Status 429 (Too Many Requests) **REQUIRED**
- Response includes `Retry-After: 60` header

**Pass Criteria:** At least one 429 response within 15 rapid requests

**Severity:** ALTO - Without rate limiting, attackers can brute force passwords

---

### Test 2.2: Registration Rate Limit (10 req/min)
**Command:**
```bash
#!/bin/bash
for i in {1..15}; do
  curl -s -X POST \
    -H "Content-Type: application/json" \
    -d "{
      \"nome\":\"Test User $i\",
      \"email\":\"register-test-$i-$(date +%s)@test.com\",
      \"cpf\":\"1114447773$((i % 10))\",
      \"telefone\":\"1199999999$((i % 10))\",
      \"senha\":\"TestPass123!\"
    }" \
    http://staging.imbobi.local:4000/api/v1/auth/registrar | jq '.statusCode // .status'
done
```

**Expected:** 429 within 15 requests

**Pass Criteria:** Rate limit triggered

---

### Test 2.3: Rate Limit Response Headers
**Command:**
```bash
curl -i -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","senha":"pass"}' \
  http://staging.imbobi.local:4000/api/v1/auth/login | grep -i "retry-after\|x-ratelimit"
```

**Expected Headers:**
- `Retry-After: 60` (seconds to wait)
- `X-RateLimit-Limit: 10` (requests per window)
- `X-RateLimit-Remaining: X` (requests left)

**Pass Criteria:** Retry-After header present on 429 response

---

## TEST 3: ENCRYPTION VERIFICATION

### Purpose
Verify sensitive data is encrypted and not exposed in API responses.

### Test 3.1: Auth Response Does Not Contain Plaintext Password
**Command:**
```bash
curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "nome":"Encryption Test",
    "email":"encrypt-'$(date +%s)'@test.com",
    "cpf":"11144477735",
    "telefone":"11999999999",
    "senha":"TestPass123!"
  }' \
  http://staging.imbobi.local:4000/api/v1/auth/registrar | jq '.'
```

**Verify Response Does NOT Contain:**
- `"senha"` field
- `"password"` field
- `"TestPass123!"` (plaintext password)
- `"refreshToken"` in body (should be in HttpOnly cookie only)

**Expected Response:**
```json
{
  "usuario": {
    "id": "uuid",
    "email": "...",
    "nome": "...",
    "cpf": "***hidden***" // or completely omitted
  },
  "accessToken": "eyJhbGc..."
}
```

**Severity:** CRITICAL - Password exposure would allow account hijacking

---

### Test 3.2: Verify Access Token is Returned
**Command:**
```bash
# Same as above, check for accessToken
curl -s -X POST ... | jq '.accessToken'
# Expected: "eyJhbGc..." (valid JWT)
```

**Pass Criteria:** accessToken present and matches JWT format

---

### Test 3.3: Refresh Token Uses HttpOnly Cookie
**Command:**
```bash
curl -i -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "nome":"Cookie Test",
    "email":"cookie-'$(date +%s)'@test.com",
    "cpf":"11144477735",
    "telefone":"11999999999",
    "senha":"TestPass123!"
  }' \
  http://staging.imbobi.local:4000/api/v1/auth/registrar | grep -i "set-cookie"
```

**Expected Set-Cookie Header:**
```
Set-Cookie: refreshToken=eyJhbGc...; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=604800
```

**Must Include:**
- `HttpOnly` (prevents XSS token theft)
- `Secure` (HTTPS only in production)
- `SameSite=Strict` (prevents CSRF)

**Severity:** ALTO - Missing HttpOnly allows XSS token theft

---

## TEST 4: IDOR (Insecure Direct Object Reference) PREVENTION

### Purpose
Verify users cannot access resources they don't own.

### Test 4.1: Multi-User Isolation
**Step 1: Create User 1**
```bash
USER1_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "nome":"User 1",
    "email":"user1-'$(date +%s)'@test.com",
    "cpf":"11144477735",
    "telefone":"11999999999",
    "senha":"TestPass123!"
  }' \
  http://staging.imbobi.local:4000/api/v1/auth/registrar)

USER1_TOKEN=$(echo "$USER1_RESPONSE" | jq -r '.accessToken')
echo "User 1 Token: $USER1_TOKEN"
```

**Step 2: Create User 2**
```bash
USER2_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "nome":"User 2",
    "email":"user2-'$(date +%s)'@test.com",
    "cpf":"12345678902",
    "telefone":"11999999998",
    "senha":"TestPass123!"
  }' \
  http://staging.imbobi.local:4000/api/v1/auth/registrar)

USER2_TOKEN=$(echo "$USER2_RESPONSE" | jq -r '.accessToken')
echo "User 2 Token: $USER2_TOKEN"
```

**Step 3: User 1 Creates an Obra**
```bash
OBRA_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER1_TOKEN" \
  -d '{
    "titulo":"User 1 Obra",
    "descricao":"This obra belongs to User 1",
    "latitude":-23.5505,
    "longitude":-46.6333
  }' \
  http://staging.imbobi.local:4000/api/v1/obras)

OBRA_ID=$(echo "$OBRA_RESPONSE" | jq -r '.id')
echo "Obra ID: $OBRA_ID"
```

**Step 4: User 2 Attempts to Access User 1's Obra**
```bash
curl -s -X GET \
  -H "Authorization: Bearer $USER2_TOKEN" \
  http://staging.imbobi.local:4000/api/v1/obras/$OBRA_ID | jq '.'
```

**Expected Response:**
- Status: 403 Forbidden (proper IDOR protection)
- OR: 404 Not Found (works too - data hidden)
- NEVER: 200 OK with data (CRITICAL vulnerability)

**Error Message Should Be:**
```json
{
  "statusCode": 403,
  "message": "Forbidden",
  "error": "You don't have permission to access this resource"
}
```

**Severity:** CRITICAL - IDOR allows unauthorized data access

---

### Test 4.2: Credit Data Ownership
**Command:**
```bash
# User 2 tries to access User 1's credit info
curl -s -X GET \
  -H "Authorization: Bearer $USER2_TOKEN" \
  http://staging.imbobi.local:4000/api/v1/credito/USER1_ID/extrato | jq '.'
```

**Expected:** 403 or 404 (not 200)

---

## TEST 5: AUTHORIZATION & ROLE-BASED ACCESS

### Purpose
Verify role-based access control (RBAC) and proper authentication enforcement.

### Test 5.1: Unauthenticated Access (No Token)
**Command:**
```bash
curl -s -X GET \
  http://staging.imbobi.local:4000/api/v1/obras | jq '.'
```

**Expected Response:**
```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Missing or invalid authentication token"
}
```

**Severity:** CRITICAL - All protected endpoints must require auth

---

### Test 5.2: Invalid JWT Token
**Command:**
```bash
curl -s -X GET \
  -H "Authorization: Bearer invalid.token.here" \
  http://staging.imbobi.local:4000/api/v1/obras | jq '.'
```

**Expected:** Status 401

---

### Test 5.3: Admin-Only Endpoints (ADMIN/GESTOR Only)
**Create a regular TOMADOR user:**
```bash
TOMADOR=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "nome":"Regular Tomador",
    "email":"tomador-'$(date +%s)'@test.com",
    "cpf":"11144477735",
    "telefone":"11999999999",
    "senha":"TestPass123!"
  }' \
  http://staging.imbobi.local:4000/api/v1/auth/registrar)

TOMADOR_TOKEN=$(echo "$TOMADOR" | jq -r '.accessToken')
```

**Try to access KYC pending (ADMIN/GESTOR only):**
```bash
curl -s -X GET \
  -H "Authorization: Bearer $TOMADOR_TOKEN" \
  http://staging.imbobi.local:4000/api/v1/kyc/pendentes | jq '.'
```

**Expected:** Status 403 (not 200 with data)

**Pass Criteria:** Non-admin user rejected from admin endpoints

**Severity:** ALTO - Role bypass allows unauthorized operations

---

## TEST 6: INPUT VALIDATION

### Purpose
Verify server-side validation prevents injection attacks and malformed data.

### Test 6.1: Invalid CPF Format
**Command:**
```bash
curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "nome":"Invalid CPF",
    "email":"invalid-'$(date +%s)'@test.com",
    "cpf":"invalid-cpf-number",
    "telefone":"11999999999",
    "senha":"TestPass123!"
  }' \
  http://staging.imbobi.local:4000/api/v1/auth/registrar | jq '.'
```

**Expected Response:**
```json
{
  "statusCode": 400,
  "message": "Bad Request",
  "error": "CPF must be a valid Brazilian CPF number",
  "details": [...]
}
```

**Pass Criteria:** Status 400, error message clear

---

### Test 6.2: Weak Password
**Command:**
```bash
curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "nome":"Weak Pass",
    "email":"weak-'$(date +%s)'@test.com",
    "cpf":"11144477735",
    "telefone":"11999999999",
    "senha":"123"
  }' \
  http://staging.imbobi.local:4000/api/v1/auth/registrar | jq '.'
```

**Expected:** Status 400 (password too short)

**Requirements:**
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 number
- At least 1 special character

---

### Test 6.3: XSS Prevention (Script Tags)
**Command:**
```bash
curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "nome":"<script>alert(\"xss\")</script>",
    "email":"xss-'$(date +%s)'@test.com",
    "cpf":"11144477735",
    "telefone":"11999999999",
    "senha":"TestPass123!"
  }' \
  http://staging.imbobi.local:4000/api/v1/auth/registrar | jq '.'
```

**Expected:**
- Status 201 (if accepted and sanitized) → Check `nome` field is sanitized
- OR: Status 400 (if rejected)
- NEVER: Status 201 with `<script>` tags in response

**Verify:**
```bash
# If 201, check that <script> tags are removed
curl ... | jq '.usuario.nome' | grep -i "<script>" 
# Should return empty (not found)
```

---

### Test 6.4: SQL Injection Prevention
**Command:**
```bash
curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "nome":"SQL Injection Test\"; DROP TABLE usuarios; --",
    "email":"sql-'$(date +%s)'@test.com",
    "cpf":"11144477735",
    "telefone":"11999999999",
    "senha":"TestPass123!"
  }' \
  http://staging.imbobi.local:4000/api/v1/auth/registrar | jq '.'
```

**Expected:**
- Status 201 (sanitized) or 400 (rejected)
- Database still exists (not dropped)

**Verify Database Integrity:**
```bash
# Connect to staging DB and verify usuarios table still exists
psql -U $DB_USER -d imobi_staging -c "SELECT COUNT(*) FROM usuarios;"
# Should return a number, not error
```

---

## TEST 7: SECURITY HEADERS

### Purpose
Verify HTTP security headers prevent common attacks.

### Test 7.1: Content-Security-Policy (CSP)
**Command:**
```bash
curl -i -X GET \
  http://staging.imbobi.local:4000/api/v1/health | grep -i "content-security-policy"
```

**Expected Header:**
```
content-security-policy: default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'
```

**Verify:**
- ✓ No `unsafe-inline`
- ✓ No `unsafe-eval`
- ✓ `default-src 'self'`

**Severity:** MEDIO - Weak CSP allows XSS

---

### Test 7.2: X-Content-Type-Options
**Command:**
```bash
curl -i -X GET \
  http://staging.imbobi.local:4000/api/v1/health | grep -i "x-content-type-options"
```

**Expected:**
```
x-content-type-options: nosniff
```

**Purpose:** Prevents MIME sniffing attacks

---

### Test 7.3: X-Frame-Options
**Command:**
```bash
curl -i -X GET \
  http://staging.imbobi.local:4000/api/v1/health | grep -i "x-frame-options"
```

**Expected:**
```
x-frame-options: DENY
```

**Purpose:** Prevents clickjacking attacks

---

### Test 7.4: HSTS (HTTP Strict-Transport-Security)
**Command:**
```bash
curl -i -X GET \
  https://api.staging.imbobi.com.br/api/v1/health | grep -i "strict-transport-security"
```

**Expected (HTTPS only):**
```
strict-transport-security: max-age=31536000; includeSubDomains
```

**Required for:** Production (HTTPS) only

---

## TEST 8: TOKEN MANAGEMENT

### Purpose
Verify tokens are properly invalidated on logout.

### Test 8.1: Token Invalidation After Logout
**Step 1: Register and login**
```bash
LOGIN=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "nome":"Logout Test",
    "email":"logout-'$(date +%s)'@test.com",
    "cpf":"11144477735",
    "telefone":"11999999999",
    "senha":"TestPass123!"
  }' \
  http://staging.imbobi.local:4000/api/v1/auth/registrar)

TOKEN=$(echo "$LOGIN" | jq -r '.accessToken')
```

**Step 2: Verify token works**
```bash
curl -s -X GET \
  -H "Authorization: Bearer $TOKEN" \
  http://staging.imbobi.local:4000/api/v1/obras | jq '.statusCode'
# Expected: No 401 error
```

**Step 3: Logout**
```bash
curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  http://staging.imbobi.local:4000/api/v1/auth/logout | jq '.'
# Expected: {"statusCode":200} or {"statusCode":204}
```

**Step 4: Try to use token after logout**
```bash
curl -s -X GET \
  -H "Authorization: Bearer $TOKEN" \
  http://staging.imbobi.local:4000/api/v1/obras | jq '.statusCode'
# Expected: 401 (token invalidated)
```

**Pass Criteria:** Status changes from valid to 401 after logout

**Severity:** ALTO - Token reuse allows account hijacking

---

## Automated Test Scripts

### Run All Tests (Bash Script)
```bash
# Make executable
chmod +x test-security-validation.sh

# Run against staging
./test-security-validation.sh http://staging.imbobi.local:4000

# Output: security-test-results-[timestamp].txt
```

### Import to Postman
```bash
# 1. Open Postman
# 2. Import: File > Import > security-tests.postman.json
# 3. Set variables:
#    - base_url: http://staging.imbobi.local:4000
# 4. Run Collection > Run
```

---

## Scoring & Pass/Fail Criteria

### Overall Security Score
```
Score = (Passed Tests / Total Tests) × 100
```

| Score | Status | Recommendation |
|-------|--------|-----------------|
| 95-100% | PASS - Deploy to Production | No blockers |
| 80-94% | CONDITIONAL PASS | Fix critical issues, test again |
| <80% | FAIL - Do Not Deploy | Multiple vulnerabilities found |

### By Test Category

| Test | Weight | Pass Criteria |
|------|--------|-----|
| CSRF Protection | 10% | At least 1 protection mechanism |
| Rate Limiting | 15% | 429 within 15 requests |
| Encryption | 15% | No plaintext passwords in responses |
| IDOR Prevention | 20% | 403/404 on cross-user access |
| Authorization | 15% | 401 on unauthenticated, 403 on unauthorized |
| Input Validation | 10% | 400 on invalid input |
| Security Headers | 10% | CSP, X-Frame-Options, X-Content-Type present |
| Token Mgmt | 5% | 401 after logout |

---

## Known Limitations & Workarounds

### 1. CSRF Token Storage (In-Memory)
**Issue:** CSRF tokens stored in server memory only  
**Workaround:** SameSite=Strict cookie provides defense-in-depth  
**Production Fix:** Move to Redis-backed CSRF token store

### 2. Rate Limiting (X-Forwarded-For)
**Issue:** Can be spoofed if proxy not properly configured  
**Workaround:** Also rate limit by user ID (username/email)  
**Verify:** Staging proxy properly strips untrusted headers

### 3. Refresh Token Encryption Performance
**Issue:** Decrypt on every token lookup (~2-5ms overhead)  
**Workaround:** Acceptable for background operations  
**Production:** Monitor latency on token refresh endpoint

---

## Post-Test Actions

### If All Tests PASS
1. ✓ Document results in security log
2. ✓ Proceed to production deployment
3. ✓ Monitor logs for security events
4. ✓ Schedule security audit (every 6-12 months)

### If Tests FAIL
1. Identify failed test number
2. Review error message for root cause
3. Check SECURITY_SUMMARY.md for implementation
4. File issue in GitHub with test name + error
5. Fix in code → Re-deploy to staging → Re-test
6. Document finding + fix in security log

### Critical Failures (Must Fix Before Deploy)
- **IDOR Access Granted** (Test 4.1)
- **Unauthorized Access Allowed** (Test 5.1, 5.3)
- **Plaintext Password in Response** (Test 3.1)
- **Rate Limit Not Enforced** (Test 2.1)
- **SQL/XSS Injection Not Prevented** (Test 6.3, 6.4)

---

## Testing Checklist

```
CSRF Protection:
  [ ] 1.1 CSRF token endpoint responds
  [ ] 1.2 POST without CSRF token handled
  [ ] 1.3 PATCH/DELETE require CSRF or auth

Rate Limiting:
  [ ] 2.1 Login rate limit (429 at 10+)
  [ ] 2.2 Registration rate limit (429 at 10+)
  [ ] 2.3 Retry-After header present

Encryption:
  [ ] 3.1 No plaintext password in auth response
  [ ] 3.2 Access token returned
  [ ] 3.3 HttpOnly cookie on refresh token

IDOR Prevention:
  [ ] 4.1 User 2 cannot access User 1's obra
  [ ] 4.2 Credit data ownership enforced

Authorization:
  [ ] 5.1 No token → 401
  [ ] 5.2 Invalid token → 401
  [ ] 5.3 Non-admin → 403 on admin endpoint

Input Validation:
  [ ] 6.1 Invalid CPF → 400
  [ ] 6.2 Weak password → 400
  [ ] 6.3 XSS tags sanitized
  [ ] 6.4 SQL injection prevented

Security Headers:
  [ ] 7.1 CSP header present (no unsafe-inline)
  [ ] 7.2 X-Content-Type-Options: nosniff
  [ ] 7.3 X-Frame-Options: DENY
  [ ] 7.4 HSTS header present (HTTPS)

Token Management:
  [ ] 8.1 Token invalid after logout
```

---

## Support & Escalation

**Security Issues Found?**
1. Document the vulnerability clearly
2. Email: security@imbobi.com.br
3. Include: Test name, command, unexpected response
4. Do NOT commit to public repository
5. Expected response time: 24 hours

**Test Failures?**
1. Check SECURITY_VALIDATION_REPORT.md
2. Review SECURITY_SUMMARY.md
3. File GitHub issue with test name + environment
4. Provide curl command + actual response

---

**Report prepared:** May 30, 2026  
**Next review:** June 30, 2026 (monthly)  
**Annual audit:** Once per year

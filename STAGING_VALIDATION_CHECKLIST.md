# iMobi Staging Validation Checklist

**Environment:** Docker (PostgreSQL 16 + Redis 7) on localhost  
**API Base URL:** `http://localhost:4000/api/v1`  
**Web Base URL:** `http://localhost:3000`  
**Created:** 2026-05-29  
**Status:** Ready for execution (awaiting API module resolution fix)

---

## Table of Contents

1. [Prerequisites & Environment Setup](#prerequisites--environment-setup)
2. [API Health & Infrastructure](#api-health--infrastructure)
3. [Security Headers & CORS Validation](#security-headers--cors-validation)
4. [Authentication Flow Tests](#authentication-flow-tests)
5. [OWASP Security Tests](#owasp-security-tests)
6. [Business Feature Validation](#business-feature-validation)
7. [Database & Cache Validation](#database--cache-validation)
8. [Rate Limiting & Throttling Tests](#rate-limiting--throttling-tests)
9. [Known Issues & Troubleshooting](#known-issues--troubleshooting)

---

## Prerequisites & Environment Setup

### Database & Cache
- PostgreSQL 16 running on port 5433 (staging)
- Redis 7 running on port 6380 (staging)
- `STAGING_VALIDATION_CHECKLIST.md` this document

### Required Environment Variables
```bash
PORT=4000
NODE_ENV=staging
CORS_ORIGIN=http://localhost:3000
DATABASE_URL=postgresql://imobi:staging_password_secure_12345@localhost:5433/imobi_staging
REDIS_HOST=localhost
REDIS_PORT=6380
JWT_SECRET=[min 64 chars, base64 encoded]
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
ENCRYPTION_KEY=[base64 encoded 32 bytes]
EMAIL_PROVIDER=smtp
SMTP_HOST=localhost
SMTP_PORT=1025
FIREBASE_PROJECT_ID=imobi-staging
FIREBASE_PRIVATE_KEY=[Firebase key]
FIREBASE_CLIENT_EMAIL=[Firebase email]
```

### Docker Compose Staging Startup
```bash
# Start infrastructure (PostgreSQL + Redis)
docker-compose -f docker-compose.staging.yml up -d

# Verify containers
docker ps | grep imobi-staging

# Run database migrations
pnpm db:migrate

# Generate Prisma client
pnpm db:generate

# Start API server
cd services/api && pnpm dev
# API should be running on http://localhost:4000

# In another terminal, start Web
cd apps/web && pnpm dev
# Web should be running on http://localhost:3000
```

### Health Checks
```bash
# PostgreSQL connection
psql -U imobi -d imobi_staging -h localhost -p 5433 -c "SELECT version();"

# Redis connection
redis-cli -p 6380 PING
# Expected output: PONG

# API Health
curl http://localhost:4000/api/v1/health
```

---

## API Health & Infrastructure

### 1. Health Check Endpoint
**Endpoint:** `GET /api/v1/health`  
**Method:** GET  
**Authentication:** None  
**Rate Limit:** No (public endpoint)

**Test Case:**
```bash
curl -X GET http://localhost:4000/api/v1/health \
  -H "Content-Type: application/json"
```

**Expected Response (200 OK):**
```json
{
  "status": "ok|degraded|error",
  "timestamp": "2026-05-29T12:00:00.000Z",
  "redis": {
    "status": "connected",
    "host": "localhost",
    "port": 6380
  },
  "email": {
    "provider": "smtp",
    "configured": true
  },
  "firebase": {
    "configured": true
  },
  "database": {
    "configured": true
  }
}
```

**Success Criteria:**
- [ ] Status code is 200 OK
- [ ] Response includes all required fields
- [ ] Database, Redis, Email, and Firebase report `configured: true` or `status: connected`
- [ ] Timestamp is valid ISO 8601 format
- [ ] Overall status is `ok` (all services configured) or `degraded` (some services missing)

**Troubleshooting:**
- If `database.configured = false`: Check `DATABASE_URL` env var
- If `redis.status != connected`: Check Redis container and `REDIS_HOST`/`REDIS_PORT`
- If `email.configured = false`: Check email provider env vars (SENDGRID_API_KEY, SMTP_HOST, etc.)

---

## Security Headers & CORS Validation

### 1. Helmet Security Headers
**Endpoint:** Any authenticated endpoint (e.g., `GET /api/v1/usuarios/meu-perfil`)  
**Method:** GET  
**Purpose:** Verify Helmet.js security headers are present

**Test Case - Register First (to get token):**
```bash
# Register a test user
curl -X POST http://localhost:4000/api/v1/auth/registrar \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Security Test User",
    "email": "security-test-'$(date +%s)'@imbobi.com",
    "cpf": "11144477735",
    "telefone": "11999999999",
    "senha": "Senha@123"
  }' | jq '.accessToken' > /tmp/token.txt

TOKEN=$(cat /tmp/token.txt | tr -d '"')

# Check headers
curl -I -X GET http://localhost:4000/api/v1/usuarios/meu-perfil \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Security Headers:**
```
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: no-referrer
```

**Success Criteria:**
- [ ] `Strict-Transport-Security` header present with `max-age=31536000`
- [ ] `Content-Security-Policy` header present with correct directives
- [ ] `X-Content-Type-Options: nosniff` present
- [ ] `X-Frame-Options: DENY` present
- [ ] No information leakage in headers

### 2. CORS Headers Validation
**Test Case:**
```bash
# Request from allowed origin (localhost:3000)
curl -X OPTIONS http://localhost:4000/api/v1/auth/login \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST" \
  -v 2>&1 | grep -i "access-control"

# Request from disallowed origin
curl -X OPTIONS http://localhost:4000/api/v1/auth/login \
  -H "Origin: http://evil.com" \
  -v 2>&1 | grep -i "access-control"
```

**Expected CORS Headers (Allowed Origin):**
```
Access-Control-Allow-Origin: http://localhost:3000
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Max-Age: 3600
```

**Expected CORS Headers (Disallowed Origin):**
```
[No Access-Control-Allow-Origin header]
```

**Success Criteria:**
- [ ] Allowed origin (`localhost:3000`) receives correct CORS headers
- [ ] Disallowed origins do NOT receive `Access-Control-Allow-Origin` header
- [ ] Credentials flag is `true` (for cookies)
- [ ] Methods list matches configuration
- [ ] Preflight caching set to 3600 seconds

### 3. HttpOnly Cookie Validation
**Test Case:**
```bash
# Perform login and capture Set-Cookie header
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "'$(cat /tmp/test_email.txt)'",
    "senha": "Senha@123"
  }' \
  -v 2>&1 | grep -i "set-cookie"
```

**Expected Set-Cookie Header:**
```
Set-Cookie: refreshToken=<jwt_token>; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=604800
```

**Success Criteria:**
- [ ] `refreshToken` cookie present in response
- [ ] `HttpOnly` flag set (prevents JavaScript access)
- [ ] `SameSite=Strict` (prevents CSRF via cookies)
- [ ] `Secure` flag set in production (HTTPS only)
- [ ] `Max-Age=604800` (7 days)
- [ ] `Path=/` (available site-wide)

---

## Authentication Flow Tests

### 1. User Registration
**Endpoint:** `POST /api/v1/auth/registrar`  
**Rate Limit:** 10 requests/minute  
**Authentication:** None

**Valid Registration Test:**
```bash
TIMESTAMP=$(date +%s)
curl -X POST http://localhost:4000/api/v1/auth/registrar \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Valid Test User",
    "email": "valid-test-'$TIMESTAMP'@imbobi.com",
    "cpf": "11144477735",
    "telefone": "11999999999",
    "senha": "Senha@123"
  }' | jq .
```

**Expected Response (201 Created):**
```json
{
  "usuario": {
    "usuarioId": "uuid-string",
    "nome": "Valid Test User",
    "email": "valid-test-xxx@imbobi.com",
    "tipo": "TOMADOR",
    "kycStatus": "PENDENTE"
  },
  "accessToken": "eyJhbGc..."
}
```

**Plus Set-Cookie:** `refreshToken=...` (HttpOnly)

**Test Cases for Invalid Registration:**
```bash
# Missing email
curl -X POST http://localhost:4000/api/v1/auth/registrar \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Test User",
    "cpf": "11144477735",
    "telefone": "11999999999",
    "senha": "Senha@123"
  }'
# Expected: 400 Bad Request with validation error

# Invalid CPF
curl -X POST http://localhost:4000/api/v1/auth/registrar \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Test User",
    "email": "test@imbobi.com",
    "cpf": "11111111111",
    "telefone": "11999999999",
    "senha": "Senha@123"
  }'
# Expected: 400 Bad Request - "CPF inválido"

# Weak password (no uppercase letter)
curl -X POST http://localhost:4000/api/v1/auth/registrar \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Test User",
    "email": "test@imbobi.com",
    "cpf": "11144477735",
    "telefone": "11999999999",
    "senha": "senha@123"
  }'
# Expected: 400 Bad Request - "Deve conter ao menos uma letra maiúscula"

# Duplicate email
curl -X POST http://localhost:4000/api/v1/auth/registrar \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Another User",
    "email": "valid-test-'$TIMESTAMP'@imbobi.com",
    "cpf": "22255588844",
    "telefone": "11988888888",
    "senha": "Senha@123"
  }'
# Expected: 409 Conflict - "E-mail ou CPF já cadastrado."
```

**Success Criteria:**
- [ ] Valid registration returns 201 with user and tokens
- [ ] RefreshToken cookie is HttpOnly
- [ ] Missing required fields return 400
- [ ] Invalid CPF format returns 400 with specific error
- [ ] Weak password returns 400 with specific requirement
- [ ] Duplicate email returns 409 Conflict
- [ ] Response does NOT include passwordHash or sensitive data

### 2. User Login
**Endpoint:** `POST /api/v1/auth/login`  
**Rate Limit:** 10 requests/minute  
**Authentication:** None  
**HTTP Method:** POST (with 200 response code, not 201)

**Valid Login Test:**
```bash
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "valid-test-'$TIMESTAMP'@imbobi.com",
    "senha": "Senha@123"
  }' -w "\nHTTP Status: %{http_code}\n" | jq .
```

**Expected Response (200 OK):**
```json
{
  "usuario": {
    "usuarioId": "uuid-string",
    "nome": "Valid Test User",
    "email": "valid-test-xxx@imbobi.com",
    "tipo": "TOMADOR"
  },
  "accessToken": "eyJhbGc..."
}
```

**Plus Set-Cookie:** `refreshToken=...` (HttpOnly)

**Invalid Login Tests:**
```bash
# Non-existent email
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "nonexistent@imbobi.com",
    "senha": "Senha@123"
  }'
# Expected: 401 Unauthorized - "Credenciais inválidas."

# Wrong password
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "valid-test-'$TIMESTAMP'@imbobi.com",
    "senha": "WrongPassword@123"
  }'
# Expected: 401 Unauthorized - "Credenciais inválidas."
```

**Success Criteria:**
- [ ] Valid credentials return 200 (not 201)
- [ ] Response includes usuario object and accessToken
- [ ] RefreshToken cookie is HttpOnly
- [ ] Non-existent email returns 401 with generic message
- [ ] Wrong password returns 401 with generic message
- [ ] Generic error messages prevent user enumeration

### 3. Token Refresh Flow
**Endpoint:** `POST /api/v1/auth/renovar`  
**Rate Limit:** 10 requests/minute  
**Authentication:** Cookie-based (refreshToken cookie)

**Valid Token Refresh Test:**
```bash
# 1. Login to get tokens
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "valid-test-'$TIMESTAMP'@imbobi.com",
    "senha": "Senha@123"
  }')

REFRESH_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.refreshToken')
OLD_ACCESS_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.accessToken')

# 2. Wait a moment to ensure token difference
sleep 1

# 3. Refresh the token
REFRESH_RESPONSE=$(curl -s -X POST http://localhost:4000/api/v1/auth/renovar \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\": \"$REFRESH_TOKEN\"}")

NEW_ACCESS_TOKEN=$(echo $REFRESH_RESPONSE | jq -r '.accessToken')

# 4. Verify new token is different
if [ "$OLD_ACCESS_TOKEN" != "$NEW_ACCESS_TOKEN" ]; then
  echo "Token refresh successful"
else
  echo "ERROR: New token identical to old token"
fi
```

**Expected Response (200 OK):**
```json
{
  "accessToken": "eyJhbGc..."
}
```

**Plus Set-Cookie:** New `refreshToken=...` (rotated)

**Invalid Token Refresh Tests:**
```bash
# Invalid/expired refresh token
curl -X POST http://localhost:4000/api/v1/auth/renovar \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "invalid.jwt.token"}'
# Expected: 401 Unauthorized - "Token inválido."

# Revoked token (use old token after logout)
# Logout first
curl -X POST http://localhost:4000/api/v1/auth/logout \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\": \"$REFRESH_TOKEN\"}"

# Try to use revoked token
curl -X POST http://localhost:4000/api/v1/auth/renovar \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\": \"$REFRESH_TOKEN\"}"
# Expected: 401 Unauthorized - "Sessão inválida ou expirada."
```

**Success Criteria:**
- [ ] Refresh with valid token returns 200
- [ ] New accessToken is generated and different from old one
- [ ] New refreshToken is rotated (set in cookie)
- [ ] Old token is invalidated for future use
- [ ] Invalid token returns 401 with specific message
- [ ] Revoked token returns 401 with different message

### 4. Logout & Token Revocation
**Endpoint:** `POST /api/v1/auth/logout`  
**Rate Limit:** General (100 req/min)  
**Authentication:** None (refresh token in body)

**Logout Test:**
```bash
# Logout
curl -X POST http://localhost:4000/api/v1/auth/logout \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\": \"$REFRESH_TOKEN\"}" \
  -w "\nHTTP Status: %{http_code}\n"
```

**Expected Response (204 No Content):**
```
[Empty body]
```

**Plus Set-Cookie:** `refreshToken=; Max-Age=0` (cleared)

**Verification - Token Should Not Work After Logout:**
```bash
# Try to use accessToken after logout (it's still valid until expiration)
# The refreshToken should be invalidated
curl -X POST http://localhost:4000/api/v1/auth/renovar \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\": \"$REFRESH_TOKEN\"}"
# Expected: 401 Unauthorized - "Sessão inválida ou expirada."
```

**Success Criteria:**
- [ ] Logout returns 204 No Content
- [ ] RefreshToken cookie is cleared (Max-Age=0)
- [ ] Session record is marked as revoked in database
- [ ] Token cannot be used to refresh after logout
- [ ] Old accessToken still works until natural expiration (design choice)

### 5. JWT Structure Validation
**Test Case - Decode Access Token:**
```bash
# Get a token
TOKEN=$(curl -s -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "valid-test-'$TIMESTAMP'@imbobi.com",
    "senha": "Senha@123"
  }' | jq -r '.accessToken')

# Decode (base64 decode the payload - middle section)
echo $TOKEN | awk -F'.' '{print $2}' | base64 -d | jq .
```

**Expected JWT Payload:**
```json
{
  "sub": "usuario-uuid",
  "iat": 1234567890,
  "exp": 1234567890
}
```

**Success Criteria:**
- [ ] Token has 3 parts (header.payload.signature)
- [ ] Payload contains `sub` (usuario ID)
- [ ] Payload contains `iat` (issued at timestamp)
- [ ] Payload contains `exp` (expiration timestamp)
- [ ] No sensitive data in payload (password, tokens, etc.)
- [ ] Expiration is ~15 minutes in future for accessToken
- [ ] Refresh token has `type: "refresh"` and ~7 day expiration

---

## OWASP Security Tests

### 1. SQL Injection Protection
**Test Endpoint:** `POST /api/v1/auth/login`  
**Purpose:** Verify prepared statements prevent SQL injection

**SQL Injection Attempt 1 - Boolean Logic:**
```bash
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@imbobi.com\" OR \"1\"=\"1",
    "senha": "anything"
  }'
# Expected: 401 Unauthorized (email not found)
# NOT: Any authenticated access or database error
```

**SQL Injection Attempt 2 - Comment Bypass:**
```bash
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@imbobi.com\"; --",
    "senha": "anything"
  }'
# Expected: 401 Unauthorized
# NOT: Authenticated access or SQL syntax error
```

**SQL Injection Attempt 3 - UNION-based:**
```bash
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@imbobi.com\" UNION SELECT * FROM usuarios --",
    "senha": "anything"
  }'
# Expected: 401 Unauthorized
# NOT: Database structure revealed or data extraction
```

**Success Criteria:**
- [ ] All injection attempts return 401/400, never 500 with SQL error
- [ ] No database error messages leaked to client
- [ ] No unexpected data access or behavior changes
- [ ] Prisma ORM using parameterized queries prevents injection

### 2. IDOR Prevention (Insecure Direct Object References)
**Test Endpoint:** `GET /api/v1/credito/:id/extrato`  
**Purpose:** Verify users can only access their own resources

**Setup:**
```bash
# Create User A
USER_A_RESPONSE=$(curl -s -X POST http://localhost:4000/api/v1/auth/registrar \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "User A",
    "email": "user-a-'$(date +%s)'@imbobi.com",
    "cpf": "11144477735",
    "telefone": "11999999999",
    "senha": "Senha@123"
  }')

USER_A_TOKEN=$(echo $USER_A_RESPONSE | jq -r '.accessToken')
USER_A_ID=$(echo $USER_A_RESPONSE | jq -r '.usuario.usuarioId')

# Create User B
USER_B_RESPONSE=$(curl -s -X POST http://localhost:4000/api/v1/auth/registrar \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "User B",
    "email": "user-b-'$(date +%s)'@imbobi.com",
    "cpf": "22255588844",
    "telefone": "11988888888",
    "senha": "Senha@123"
  }')

USER_B_TOKEN=$(echo $USER_B_RESPONSE | jq -r '.accessToken')

# Create a credit for User A
CREDIT_RESPONSE=$(curl -s -X POST http://localhost:4000/api/v1/credito/solicitar \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER_A_TOKEN" \
  -d '{
    "valorSolicitado": 50000,
    "prazoMeses": 36,
    "tipoObra": "RESIDENCIAL",
    "finalidade": "Reforma residencial",
    "rendaMensalDeclarada": 5000
  }')

CREDIT_ID=$(echo $CREDIT_RESPONSE | jq -r '.creditoId')
```

**IDOR Attack - User B Tries to Access User A's Credit:**
```bash
curl -X GET "http://localhost:4000/api/v1/credito/$CREDIT_ID/extrato" \
  -H "Authorization: Bearer $USER_B_TOKEN"
# Expected: 403 Forbidden - "Acesso negado a este crédito."
# NOT: 200 OK with User A's sensitive credit data
```

**Verification - User A Can Access Own Credit:**
```bash
curl -X GET "http://localhost:4000/api/v1/credito/$CREDIT_ID/extrato" \
  -H "Authorization: Bearer $USER_A_TOKEN"
# Expected: 200 OK with credit details
```

**Success Criteria:**
- [ ] Unauthorized user gets 403 Forbidden
- [ ] Error message does not reveal resource existence
- [ ] Owner gets 200 with correct data
- [ ] All user-owned resource endpoints check `usuarioId` ownership

### 3. Authorization Enforcement (Role-Based Access Control)
**Test Endpoint:** `GET /api/v1/kyc/pendentes` (requires ADMIN or GESTOR_OBRA)  
**Purpose:** Verify role-based restrictions work

**Setup - Create Admin User:**
```bash
# Normal TOMADOR user
TOMADOR_RESPONSE=$(curl -s -X POST http://localhost:4000/api/v1/auth/registrar \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Regular Tomador",
    "email": "tomador-'$(date +%s)'@imbobi.com",
    "cpf": "11144477735",
    "telefone": "11999999999",
    "senha": "Senha@123"
  }')

TOMADOR_TOKEN=$(echo $TOMADOR_RESPONSE | jq -r '.accessToken')
```

**Unauthorized Access - TOMADOR tries to list pending KYC (admin only):**
```bash
curl -X GET http://localhost:4000/api/v1/kyc/pendentes \
  -H "Authorization: Bearer $TOMADOR_TOKEN"
# Expected: 403 Forbidden - "Acesso restrito apenas para ADMIN e GESTOR_OBRA."
```

**Success Criteria:**
- [ ] Non-authorized role receives 403 Forbidden
- [ ] Error message clearly explains requirement
- [ ] Authorized roles (set in database) can access endpoint
- [ ] Role checks occur before business logic

### 4. Rate Limiting per Endpoint
**Purpose:** Verify different endpoints have correct rate limits

**Authentication Endpoints - 10 req/min:**
```bash
# Script to test rate limiting
for i in {1..11}; do
  curl -X POST http://localhost:4000/api/v1/auth/registrar \
    -H "Content-Type: application/json" \
    -d '{
      "nome": "Rate Test User '$i'",
      "email": "rate-test-'$i'-'$(date +%s)'@imbobi.com",
      "cpf": "1114447773'$(printf '%d' $((i % 10)))'",
      "telefone": "1199999999'$(printf '%d' $((i % 10)))'",
      "senha": "Senha@123"
    }' -w "\n[Request $i] HTTP Status: %{http_code}\n"
  sleep 0.5
done
```

**Expected Results:**
- [ ] Requests 1-10: 201 Created (or 400 for invalid data)
- [ ] Request 11+: 429 Too Many Requests

**Evidence Upload - 5 req/min:**
```bash
# Attempt 6 uploads within 1 minute
for i in {1..6}; do
  curl -X POST http://localhost:4000/api/v1/evidencias \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{
      "etapaId": "some-uuid",
      "latitude": -23.5505,
      "longitude": -46.6333,
      "accuracyMetros": 5,
      "timestampCaptura": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
      "descricao": "Upload test"
    }' -w "\n[Upload $i] HTTP Status: %{http_code}\n"
  sleep 2
done
```

**Expected Results:**
- [ ] Uploads 1-5: 200 OK or 400 Bad Request
- [ ] Upload 6+: 429 Too Many Requests

**General Endpoint - 100 req/min:**
```bash
# Most endpoints have general limit
# Should allow 100 requests per minute
```

**Success Criteria:**
- [ ] Auth endpoints limited to 10 req/min
- [ ] Upload endpoints limited to 5 req/min
- [ ] General endpoints limited to 100 req/min
- [ ] 429 Too Many Requests returned when exceeded
- [ ] Rate limit resets after TTL (60 seconds)

### 5. CSRF Token Validation
**Endpoint:** Any POST/PATCH/PUT endpoint  
**Purpose:** Verify CSRF token is generated and validated

**CSRF Token Check:**
```bash
# GET request to protected endpoint (if it returns CSRF token)
curl -X GET http://localhost:4000/api/v1/usuarios/meu-perfil \
  -H "Authorization: Bearer $TOKEN" \
  -v 2>&1 | grep -i csrf

# Or check if POST requires CSRF token
curl -X POST http://localhost:4000/api/v1/usuarios/meu-perfil \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"nome": "Updated Name"}' \
  -w "\nHTTP Status: %{http_code}\n"
# Note: Current implementation relies on SameSite cookies + JWT
# Explicit CSRF tokens may not be required, but should be validated if present
```

**Success Criteria:**
- [ ] SameSite=Strict cookies prevent CSRF for cookie-based auth
- [ ] JWT Bearer token is immune to CSRF
- [ ] If explicit CSRF tokens are used, validation is enforced
- [ ] No state-changing operations (POST/PATCH) via GET

### 6. Sensitive Data Masking in Responses
**Test Case - Login Response:**
```bash
curl -s -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "valid-test-'$TIMESTAMP'@imbobi.com",
    "senha": "Senha@123"
  }' | jq .
```

**Response Verification:**
```json
{
  "usuario": {
    "usuarioId": "uuid",
    "nome": "Name",
    "email": "email@imbobi.com",
    "tipo": "TOMADOR",
    "kycStatus": "PENDENTE"
  },
  "accessToken": "eyJhbGc..."
}
```

**Success Criteria:**
- [ ] passwordHash NOT in response
- [ ] refresh token NOT in response body (only in HttpOnly cookie)
- [ ] kycStatus included (public information)
- [ ] tipo (user type) included (public information)
- [ ] No internal database IDs exposed (unless intended)
- [ ] No timestamps of last login/password change

**Profile Endpoint Response:**
```bash
curl -s -X GET http://localhost:4000/api/v1/usuarios/meu-perfil \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**Success Criteria:**
- [ ] No passwordHash
- [ ] No refresh tokens or session data
- [ ] No other users' data
- [ ] User's public profile fields only

---

## Business Feature Validation

### 1. KYC (Know Your Customer) - Upload & Status Tracking

**Endpoint:** `POST /api/v1/kyc/upload`  
**Authentication:** Required (Bearer token)  
**Rate Limit:** General (100 req/min)

**KYC Upload Test:**
```bash
curl -X POST http://localhost:4000/api/v1/kyc/upload \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "tipo": "RG",
    "url": "https://s3.amazonaws.com/imbobi-kyc/user123/rg.pdf"
  }'
```

**Expected Response (200 OK):**
```json
{
  "documentoId": "uuid",
  "usuarioId": "uuid",
  "tipo": "RG",
  "url": "https://s3.amazonaws.com/imbobi-kyc/user123/rg.pdf",
  "status": "PENDENTE",
  "uploadedAt": "2026-05-29T12:00:00.000Z"
}
```

**Success Criteria:**
- [ ] Document uploaded successfully
- [ ] Status initially set to PENDENTE
- [ ] Document ID returned
- [ ] Timestamp recorded
- [ ] Linked to correct user

**List Documents Endpoint:**
```bash
curl -X GET http://localhost:4000/api/v1/kyc/documentos \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response (200 OK):**
```json
[
  {
    "documentoId": "uuid",
    "tipo": "RG",
    "url": "https://...",
    "status": "PENDENTE",
    "uploadedAt": "2026-05-29T12:00:00.000Z"
  }
]
```

**Success Criteria:**
- [ ] Returns array of user's documents
- [ ] Does not include other users' documents
- [ ] Status field accurate

**KYC Status Endpoint:**
```bash
curl -X GET http://localhost:4000/api/v1/kyc/status \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response (200 OK):**
```json
{
  "kycStatus": "PENDENTE|APROVADO|REJEITADO|EM_ANALISE",
  "documentos": [
    {
      "tipo": "RG",
      "status": "PENDENTE"
    },
    {
      "tipo": "Comprovante de Renda",
      "status": "APROVADO"
    }
  ],
  "ultimaAtualizacao": "2026-05-29T12:00:00.000Z"
}
```

**Success Criteria:**
- [ ] Overall KYC status reflects all documents
- [ ] APPROVED only when all required documents approved
- [ ] Last update timestamp accurate

**Verify KYC Complete Endpoint:**
```bash
curl -X GET http://localhost:4000/api/v1/kyc/verificar \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response (200 OK):**
```json
{
  "completo": true|false,
  "faltando": ["RG", "Comprovante de Renda"]
}
```

**Success Criteria:**
- [ ] Returns boolean for completion status
- [ ] Lists missing documents if incomplete
- [ ] Accurate to database state

### 2. Crédito (Credit) Simulator

**Endpoint:** `POST /api/v1/credito/simular`  
**Authentication:** NOT required  
**Rate Limit:** General (100 req/min)

**Valid Credit Simulation:**
```bash
curl -X POST http://localhost:4000/api/v1/credito/simular \
  -H "Content-Type: application/json" \
  -d '{
    "valorSolicitado": 100000,
    "prazoMeses": 36,
    "tipoObra": "RESIDENCIAL"
  }'
```

**Expected Response (200 OK):**
```json
{
  "valorSolicitado": 100000,
  "taxaMensal": 0.0125,
  "valorMensal": 3500.50,
  "valorTotal": 126018,
  "prazoMeses": 36,
  "tipoObra": "RESIDENCIAL",
  "simuladoEm": "2026-05-29T12:00:00.000Z"
}
```

**Test Invalid Amounts:**
```bash
# Below minimum (< 10,000)
curl -X POST http://localhost:4000/api/v1/credito/simular \
  -H "Content-Type: application/json" \
  -d '{
    "valorSolicitado": 5000,
    "prazoMeses": 36,
    "tipoObra": "RESIDENCIAL"
  }'
# Expected: 400 Bad Request - "Valor mínimo R$ 10.000"

# Above maximum (> 5,000,000)
curl -X POST http://localhost:4000/api/v1/credito/simular \
  -H "Content-Type: application/json" \
  -d '{
    "valorSolicitado": 10000000,
    "prazoMeses": 36,
    "tipoObra": "RESIDENCIAL"
  }'
# Expected: 400 Bad Request - "Valor máximo R$ 5.000.000"

# Invalid prazo
curl -X POST http://localhost:4000/api/v1/credito/simular \
  -H "Content-Type: application/json" \
  -d '{
    "valorSolicitado": 100000,
    "prazoMeses": 6,
    "tipoObra": "RESIDENCIAL"
  }'
# Expected: 400 Bad Request - "Prazo mínimo 12 meses"
```

**Success Criteria:**
- [ ] Simulation available without authentication (public endpoint)
- [ ] Calculation mathematically correct
- [ ] Returns all necessary fields
- [ ] Validates minimum/maximum amounts
- [ ] Validates prazo ranges
- [ ] No credit request created from simulation

### 3. Obras (Works) - Listing & Filtering

**Endpoint:** `GET /api/v1/obras`  
**Authentication:** Required  
**Rate Limit:** General (100 req/min)  
**Caching:** 5 minutes

**List Own Works:**
```bash
curl -X GET http://localhost:4000/api/v1/obras \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response (200 OK):**
```json
[
  {
    "obraId": "uuid",
    "nome": "Obra de Casa",
    "localizacao": {
      "latitude": -23.5505,
      "longitude": -46.6333,
      "endereco": "Rua Test, 123"
    },
    "tipo": "RESIDENCIAL",
    "status": "ATIVA",
    "criadoEm": "2026-05-29T12:00:00.000Z"
  }
]
```

**Success Criteria:**
- [ ] Returns only user's own obras
- [ ] Cached for 5 minutes
- [ ] Includes all required fields
- [ ] IDOR prevention: user cannot see others' obras

**Get Single Work:**
```bash
curl -X GET http://localhost:4000/api/v1/obras/$OBRA_ID \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response (200 OK):**
```json
{
  "obraId": "uuid",
  "nome": "Obra de Casa",
  "usuarioId": "uuid",
  "localizacao": {...},
  "tipo": "RESIDENCIAL",
  "status": "ATIVA",
  "descricao": "Reforma completa",
  "criadoEm": "2026-05-29T12:00:00.000Z"
}
```

**Unauthorized Access Test:**
```bash
# USER_B tries to access USER_A's obra
curl -X GET http://localhost:4000/api/v1/obras/$USER_A_OBRA_ID \
  -H "Authorization: Bearer $USER_B_TOKEN"
# Expected: 403 Forbidden or 404 Not Found (don't reveal existence)
```

**Success Criteria:**
- [ ] Owners can access their works
- [ ] Non-owners cannot access others' works
- [ ] Error doesn't reveal whether work exists

**Trabalho Progress Endpoint:**
```bash
curl -X GET http://localhost:4000/api/v1/obras/$OBRA_ID/progresso \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response (200 OK):**
```json
{
  "obraId": "uuid",
  "progressoPercentual": 45,
  "etapas": {
    "total": 10,
    "completas": 4,
    "emProgresso": 1,
    "pendentes": 5
  },
  "proximaEtapa": {
    "etapaId": "uuid",
    "nome": "Fundação",
    "dataInicio": "2026-05-30T00:00:00.000Z"
  }
}
```

**Success Criteria:**
- [ ] Progress calculation accurate
- [ ] Stage counts correct
- [ ] Next stage properly identified
- [ ] Returns percentage and counts

### 4. Evidence Upload with GPS Validation

**Endpoint:** `POST /api/v1/evidencias`  
**Authentication:** Required  
**Rate Limit:** 5 requests/minute (upload limit)

**Valid Evidence Upload:**
```bash
curl -X POST http://localhost:4000/api/v1/evidencias \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "etapaId": "'$ETAPA_UUID'",
    "latitude": -23.5505,
    "longitude": -46.6333,
    "accuracyMetros": 10,
    "timestampCaptura": "2026-05-29T12:00:00Z",
    "descricao": "Fundação concluída"
  }'
```

**Expected Response (200 OK):**
```json
{
  "evidenciaId": "uuid",
  "etapaId": "uuid",
  "usuarioId": "uuid",
  "localizacao": {
    "latitude": -23.5505,
    "longitude": -46.6333,
    "accuracyMetros": 10
  },
  "url": "https://s3.amazonaws.com/...",
  "status": "PENDENTE_VALIDACAO",
  "uploadedAt": "2026-05-29T12:00:00.000Z"
}
```

**GPS Accuracy Validation - Too Imprecise:**
```bash
curl -X POST http://localhost:4000/api/v1/evidencias \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "etapaId": "'$ETAPA_UUID'",
    "latitude": -23.5505,
    "longitude": -46.6333,
    "accuracyMetros": 20,
    "timestampCaptura": "2026-05-29T12:00:00Z",
    "descricao": "Fundação concluída"
  }'
# Expected: 400 Bad Request - "Precisão GPS insuficiente. Aguarde sinal melhor."
```

**Invalid GPS Coordinates:**
```bash
# Latitude out of range
curl -X POST http://localhost:4000/api/v1/evidencias \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "etapaId": "'$ETAPA_UUID'",
    "latitude": 95.5505,
    "longitude": -46.6333,
    "accuracyMetros": 10,
    "timestampCaptura": "2026-05-29T12:00:00Z"
  }'
# Expected: 400 Bad Request - validation error for latitude range

# Longitude out of range
curl -X POST http://localhost:4000/api/v1/evidencias \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "etapaId": "'$ETAPA_UUID'",
    "latitude": -23.5505,
    "longitude": -200.6333,
    "accuracyMetros": 10,
    "timestampCaptura": "2026-05-29T12:00:00Z"
  }'
# Expected: 400 Bad Request - validation error for longitude range
```

**List Evidence by Stage:**
```bash
curl -X GET http://localhost:4000/api/v1/evidencias/etapa/$ETAPA_UUID \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response (200 OK):**
```json
[
  {
    "evidenciaId": "uuid",
    "etapaId": "uuid",
    "localizacao": {...},
    "status": "PENDENTE_VALIDACAO|APROVADA|REJEITADA",
    "uploadedAt": "2026-05-29T12:00:00.000Z",
    "validadaPor": "uuid|null",
    "validadaEm": "2026-05-29T12:30:00.000Z|null"
  }
]
```

**Success Criteria:**
- [ ] Valid evidence uploaded and stored
- [ ] GPS accuracy validated (max 15m)
- [ ] Invalid coordinates rejected at client and server
- [ ] Evidence listed by stage
- [ ] Status tracking accurate
- [ ] Only user's own evidence returned

### 5. Approval Workflows

**Endpoint:** `PATCH /api/v1/kyc/:id/aprovar` (Admin/Gestor only)

**Admin Approves KYC Document:**
```bash
# Using ADMIN_TOKEN (created in database or via seed)
curl -X PATCH http://localhost:4000/api/v1/kyc/$DOCUMENTO_ID/aprovar \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Expected Response (200 OK):**
```json
{
  "documentoId": "uuid",
  "status": "APROVADO",
  "aprovadoPor": "uuid",
  "aprovadoEm": "2026-05-29T12:00:00.000Z"
}
```

**Admin Rejects KYC Document:**
```bash
curl -X PATCH http://localhost:4000/api/v1/kyc/$DOCUMENTO_ID/rejeitar \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "motivo": "Documento ilegível"
  }'
```

**Expected Response (200 OK):**
```json
{
  "documentoId": "uuid",
  "status": "REJEITADO",
  "rejeitadoPor": "uuid",
  "rejeitadoEm": "2026-05-29T12:00:00.000Z",
  "motivo": "Documento ilegível"
}
```

**Non-Admin Cannot Approve:**
```bash
curl -X PATCH http://localhost:4000/api/v1/kyc/$DOCUMENTO_ID/aprovar \
  -H "Authorization: Bearer $TOMADOR_TOKEN"
# Expected: 403 Forbidden
```

**Success Criteria:**
- [ ] Admins can approve/reject
- [ ] Non-admins cannot approve/reject
- [ ] Approver ID recorded
- [ ] Timestamp recorded
- [ ] Rejection reason stored (if applicable)
- [ ] User notified of approval/rejection

---

## Database & Cache Validation

### 1. PostgreSQL Connectivity & Migrations

**Direct Database Connection Test:**
```bash
psql -U imobi -d imobi_staging -h localhost -p 5433 << EOF
-- Check PostGIS extension
SELECT version();

-- Verify PostGIS installed
SELECT postgis_version();

-- Count usuarios table
SELECT COUNT(*) FROM "Usuario";

-- Check migrations applied
SELECT version, name, installed_on FROM schema_migrations ORDER BY installed_on DESC LIMIT 5;
EOF
```

**Expected Output:**
- [ ] PostgreSQL version 16.x returned
- [ ] PostGIS extension available
- [ ] Usuarios table accessible
- [ ] Latest migrations show recent timestamps

**Prisma Migrations Status:**
```bash
cd services/api && pnpm prisma migrate status
```

**Expected Output:**
```
Migrations to apply: 0
[Success] All migrations have been applied
```

**Success Criteria:**
- [ ] No pending migrations
- [ ] All migrations successfully applied
- [ ] Database schema matches Prisma schema

### 2. Redis Cache Functionality

**Redis Connection Test:**
```bash
redis-cli -p 6380 PING
# Expected: PONG

redis-cli -p 6380 INFO server
# Shows Redis version and uptime
```

**Cache Set/Get Test:**
```bash
# Set a value
redis-cli -p 6380 SET test_key "test_value" EX 300

# Verify it was set
redis-cli -p 6380 GET test_key
# Expected: "test_value"

# Check TTL
redis-cli -p 6380 TTL test_key
# Expected: Time in seconds remaining (< 300)

# Clean up
redis-cli -p 6380 DEL test_key
```

**Cache Integration Test:**
```bash
# First request should hit database/compute
time curl -s -X GET http://localhost:4000/api/v1/usuarios/meu-perfil \
  -H "Authorization: Bearer $TOKEN" | jq .

# Second request should hit cache (faster)
time curl -s -X GET http://localhost:4000/api/v1/usuarios/meu-perfil \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**Expected Results:**
- [ ] First request takes longer (database query)
- [ ] Second request faster (cache hit)
- [ ] Data identical in both responses

**Cache TTL Verification (for /usuarios/meu-perfil):**
- Configured TTL: 600 seconds (10 minutes)

**Success Criteria:**
- [ ] Redis connection successful
- [ ] Values set and retrieved correctly
- [ ] TTL works (values expire)
- [ ] Cache integration reduces response times
- [ ] Cache invalidated on profile updates

### 3. Data Persistence Verification

**User Registration Data Persistence:**
```bash
# Register a user
REGISTRATION=$(curl -s -X POST http://localhost:4000/api/v1/auth/registrar \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Persistence Test User",
    "email": "persist-test-'$(date +%s)'@imbobi.com",
    "cpf": "11144477735",
    "telefone": "11999999999",
    "senha": "Senha@123"
  }')

USER_ID=$(echo $REGISTRATION | jq -r '.usuario.usuarioId')
USER_EMAIL=$(echo $REGISTRATION | jq -r '.usuario.email')

# Query database directly
psql -U imobi -d imobi_staging -h localhost -p 5433 -c \
  "SELECT usuarioId, email, tipo, kycStatus FROM \"Usuario\" WHERE usuarioId = '$USER_ID';"
```

**Expected Output:**
```
                  usuarioId                  |         email          |   tipo   | kycStatus
--------------------------------------------+------------------------+----------+-----------
 <uuid-same-as-USER_ID>                     | persist-test-xxx@...   | TOMADOR  | PENDENTE
```

**Session Token Persistence:**
```bash
# After login, check session in database
psql -U imobi -d imobi_staging -h localhost -p 5433 << EOF
SELECT sessionId, usuarioId, revogadoEm, expiresAt 
FROM "SessaoToken" 
WHERE usuarioId = '$USER_ID' 
ORDER BY criadoEm DESC 
LIMIT 1;
EOF
```

**Expected Output:**
- [ ] Session record exists
- [ ] revogadoEm is NULL (not revoked)
- [ ] expiresAt is in the future
- [ ] usuarioId matches logged-in user

**Success Criteria:**
- [ ] Data written to PostgreSQL successfully
- [ ] Data readable after server restart
- [ ] Transactions work (all or nothing)
- [ ] Foreign key constraints enforced
- [ ] Indexes present for performance

---

## Rate Limiting & Throttling Tests

### 1. Auth Endpoints Rate Limit (10 req/min)

**Test Script:**
```bash
#!/bin/bash
echo "Testing auth endpoint rate limiting (10 req/min)..."

for i in {1..12}; do
  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST http://localhost:4000/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{
      "email": "test-'$i'@imbobi.com",
      "senha": "Test@123"
    }')
  
  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  TIMESTAMP=$(date '+%H:%M:%S')
  
  if [ "$HTTP_CODE" = "429" ]; then
    echo "[$TIMESTAMP] Request $i: 429 Too Many Requests (RATE LIMITED)"
  elif [ "$HTTP_CODE" = "401" ]; then
    echo "[$TIMESTAMP] Request $i: 401 Unauthorized (credentials invalid)"
  else
    echo "[$TIMESTAMP] Request $i: $HTTP_CODE"
  fi
  
  sleep 0.5
done
```

**Expected Behavior:**
- [ ] First 10 requests: 401 (invalid credentials) or 201/200 (if valid)
- [ ] Request 11+: 429 Too Many Requests
- [ ] After 60 seconds: Reset, can make 10 more requests

### 2. Upload Endpoints Rate Limit (5 req/min)

**Test Script:**
```bash
echo "Testing upload endpoint rate limiting (5 req/min)..."

for i in {1..7}; do
  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST http://localhost:4000/api/v1/evidencias \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{
      "etapaId": "'$ETAPA_UUID'",
      "latitude": -23.5505,
      "longitude": -46.6333,
      "accuracyMetros": 10,
      "timestampCaptura": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
      "descricao": "Test $i"
    }')
  
  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  
  if [ "$HTTP_CODE" = "429" ]; then
    echo "Upload $i: 429 Too Many Requests (RATE LIMITED)"
  elif [ "$HTTP_CODE" = "200" ]; then
    echo "Upload $i: 200 OK"
  elif [ "$HTTP_CODE" = "400" ]; then
    echo "Upload $i: 400 Bad Request (validation)"
  else
    echo "Upload $i: $HTTP_CODE"
  fi
  
  sleep 5
done
```

**Expected Behavior:**
- [ ] Uploads 1-5: 200 OK (or 400 if validation fails)
- [ ] Upload 6+: 429 Too Many Requests
- [ ] Limit resets after 60 seconds

### 3. Manager Endpoints Rate Limit (20 req/min)

**Similar to above but with 20 requests allowed per minute**

---

## Known Issues & Troubleshooting

### Issue 1: API Module Resolution Error
**Status:** Currently blocking API startup  
**Expected Fix:** Module resolution configuration update

**Symptom:**
```
Cannot find module '@imbobi/schemas' from '/home/user/imobi/services/api/...'
```

**Workaround (before fix):**
```bash
# Regenerate module references
pnpm db:generate
pnpm type-check

# Clear cache
rm -rf services/api/dist
pnpm build
```

### Issue 2: Database Connection Refused
**Symptom:**
```
Error: connect ECONNREFUSED 127.0.0.1:5433
```

**Solution:**
```bash
# Check if PostgreSQL container is running
docker ps | grep imobi-staging-postgres

# If not, start it
docker-compose -f docker-compose.staging.yml up postgres

# Verify connection
psql -U imobi -d imobi_staging -h localhost -p 5433 -c "SELECT 1;"
```

### Issue 3: Redis Connection Timeout
**Symptom:**
```
Error: Redis connection timeout at localhost:6380
```

**Solution:**
```bash
# Start Redis container
docker-compose -f docker-compose.staging.yml up redis

# Test connection
redis-cli -p 6380 PING

# Verify environment variables
echo $REDIS_HOST $REDIS_PORT
```

### Issue 4: JWT Secret Not Configured
**Symptom:**
```
Error: CRITICAL: JWT_SECRET not set or too short (must be 64+ characters)
```

**Solution:**
```bash
# Generate new JWT secret
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"

# Set in .env
echo "JWT_SECRET=$(node -e 'console.log(require(\"crypto\").randomBytes(48).toString(\"base64\"))')" >> .env.local

# Restart API
pnpm dev
```

### Issue 5: CORS Errors from Web
**Symptom:**
```
Cross-Origin Request Blocked (CORS policy)
```

**Verification:**
```bash
# Check CORS origin matches web URL
echo $CORS_ORIGIN
# Should be: http://localhost:3000

# If not, update:
export CORS_ORIGIN="http://localhost:3000"

# Restart API
pnpm dev
```

### Issue 6: Rate Limiting Not Working
**Symptom:**
```
Receiving responses beyond rate limit thresholds
```

**Verification:**
```bash
# Check if ThrottlerGuard is registered in AppModule
grep -n "ThrottlerGuard" services/api/src/app.module.ts

# Check if requests have X-RateLimit headers
curl -I http://localhost:4000/api/v1/health | grep -i ratelimit
```

### Issue 7: Cache Not Invalidating
**Symptom:**
```
Old data returned after profile update
```

**Solution:**
```bash
# Manually clear Redis cache
redis-cli -p 6380 FLUSHDB

# Or clear specific key
redis-cli -p 6380 DEL "cache:usuarios:meu-perfil:$USER_ID"

# Restart application
pnpm dev
```

### Issue 8: PostGIS Extension Missing
**Symptom:**
```
ERROR: function st_distance does not exist
```

**Solution:**
```bash
# Connect to database and enable PostGIS
psql -U imobi -d imobi_staging -h localhost -p 5433 << EOF
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
SELECT postgis_version();
EOF
```

### Issue 9: Migrations Failed
**Symptom:**
```
Migration failed: constraint violation
```

**Solution:**
```bash
# Check migration status
pnpm prisma migrate status

# View migration history
pnpm prisma migrate resolve --help

# If needed, reset (warning: data loss!)
pnpm prisma migrate reset  # Warns and requires confirmation

# Or manually review failed migration
cat services/api/prisma/migrations/<migration_name>/migration.sql
```

### Issue 10: S3 Bucket Not Accessible
**Symptom:**
```
Error: Access Denied to S3 bucket
```

**Verification:**
```bash
# Check AWS credentials
echo $AWS_ACCESS_KEY_ID $AWS_SECRET_ACCESS_KEY

# Check S3 bucket permissions
aws s3 ls s3://imbobi-evidencias-staging --region us-east-1

# Update bucket configuration if needed
```

---

## Post-Validation Sign-Off

### Checklist Completion
Once tests are executed, mark completion:

- [ ] All API Health tests passed
- [ ] All Security Headers validated
- [ ] All CORS validations successful
- [ ] All Authentication flows working
- [ ] All OWASP tests passed
- [ ] All Business features functional
- [ ] Database & Cache working
- [ ] Rate limiting enforced correctly
- [ ] No known blockers in troubleshooting section
- [ ] API uptime stable (>99.9%)
- [ ] Web integration successful
- [ ] Ready for QA/Staging sign-off

### Sign-Off
**Validated By:** [Name]  
**Date:** [YYYY-MM-DD]  
**Time:** [HH:MM UTC]  
**Environment:** Docker Staging (localhost)  
**Status:** ✓ PASS / ⚠ PASS WITH ISSUES / ✗ FAIL

**Notes:**
```
[Add any observations, issues, or special notes]
```

---

## Quick Reference: Curl Command Templates

### Authentication Flow
```bash
# Register
curl -X POST http://localhost:4000/api/v1/auth/registrar \
  -H "Content-Type: application/json" \
  -d '{"nome":"User","email":"user@imbobi.com","cpf":"11144477735","telefone":"11999999999","senha":"Senha@123"}'

# Login
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@imbobi.com","senha":"Senha@123"}'

# Refresh Token
curl -X POST http://localhost:4000/api/v1/auth/renovar \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<token>"}'

# Logout
curl -X POST http://localhost:4000/api/v1/auth/logout \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<token>"}'
```

### Authenticated Endpoints
```bash
# Get profile
curl -X GET http://localhost:4000/api/v1/usuarios/meu-perfil \
  -H "Authorization: Bearer <access_token>"

# List works
curl -X GET http://localhost:4000/api/v1/obras \
  -H "Authorization: Bearer <access_token>"

# Simulate credit
curl -X POST http://localhost:4000/api/v1/credito/simular \
  -H "Content-Type: application/json" \
  -d '{"valorSolicitado":100000,"prazoMeses":36,"tipoObra":"RESIDENCIAL"}'
```

### Health & Debug
```bash
# Health check
curl http://localhost:4000/api/v1/health

# Check headers
curl -I http://localhost:4000/api/v1/health

# PostgreSQL
psql -U imobi -d imobi_staging -h localhost -p 5433 -c "SELECT 1;"

# Redis
redis-cli -p 6380 PING
```

---

**Document Version:** 1.0  
**Last Updated:** 2026-05-29  
**Next Review:** After first staging deployment  
**Contact:** DevOps Team / Architecture Lead

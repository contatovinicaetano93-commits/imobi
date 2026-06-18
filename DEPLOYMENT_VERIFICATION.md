# Deployment Verification Checklist

This document provides step-by-step instructions to verify that the imobi application has been successfully deployed and is functioning correctly across all critical systems.

**Date**: 2026-05-28  
**Environment**: Production  
**Verifier**: [DevOps/QA Team]

---

## Pre-Deployment Checks

- [ ] **Database**: PostgreSQL instance is running and accessible
- [ ] **Redis**: Cache/queue service is running
- [ ] **S3**: AWS S3 bucket for obra photos is configured
- [ ] **Firebase**: Firebase project is configured for push notifications
- [ ] **Email Service**: SMTP or SendGrid credentials are set
- [ ] **Environment Variables**: All `.env` files are properly configured (check `.env.example`)

---

## 1. Health Check Endpoint

### Objective
Verify that the API server is running and all critical services are connected.

### Steps

**1.1 GET /api/v1/health**

```bash
curl -X GET https://api.imobi.com.br/health
```

**Expected Response** (Status 200):
```json
{
  "status": "ok",
  "timestamp": "2026-05-28T14:30:00Z",
  "redis": {
    "status": "connected",
    "host": "redis.internal",
    "port": 6379
  },
  "email": {
    "provider": "sendgrid",
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

**Verification Criteria**:
- ✅ HTTP Status Code: **200 OK**
- ✅ `status` field: **"ok"** (not "error" or "degraded")
- ✅ `redis.status`: **"connected"**
- ✅ `email.configured`: **true**
- ✅ `firebase.configured`: **true**
- ✅ `database.configured`: **true**

### Failure Scenarios

| Response | Meaning | Action |
|----------|---------|--------|
| Status 503 | Service unavailable | Check if API container is running: `docker ps` |
| `status: "error"` | Critical service down | Check logs: `docker logs api-container` |
| `redis.status: "error"` | Redis not connected | Verify Redis is running and accessible |
| `email.configured: false` | Email not configured | Check SENDGRID_API_KEY or SMTP env vars |
| `firebase.configured: false` | Firebase not configured | Check FIREBASE_PROJECT_ID env vars |

---

## 2. Authentication Flow

### Objective
Verify that user registration and JWT token generation are working correctly.

### 2.1 POST /api/v1/auth/registrar (User Registration)

**Create Test Account**

```bash
curl -X POST https://api.imobi.com.br/auth/registrar \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Construtora Teste",
    "cpf": "12345678901",
    "email": "teste@imobi.com.br",
    "telefone": "11987654321",
    "senha": "SenhaSegura@123",
    "tipo": "TOMADOR"
  }'
```

**Expected Response** (Status 201):
```json
{
  "usuarioId": "uuid-string-here",
  "nome": "Construtora Teste",
  "email": "teste@imobi.com.br",
  "tipo": "TOMADOR",
  "kycStatus": "PENDENTE"
}
```

**Verification Criteria**:
- ✅ HTTP Status Code: **201 Created**
- ✅ Response contains `usuarioId` (UUID format)
- ✅ User type matches request: `"tipo": "TOMADOR"`
- ✅ KYC status defaults to: `"PENDENTE"`
- ✅ No password returned in response (security check)

### 2.2 POST /api/v1/auth/login (User Login)

**Login with Test Account**

```bash
curl -X POST https://api.imobi.com.br/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teste@imobi.com.br",
    "senha": "SenhaSegura@123"
  }'
```

**Expected Response** (Status 200):
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "refresh-token-uuid-here",
  "expiresIn": 3600,
  "usuario": {
    "usuarioId": "uuid-string-here",
    "nome": "Construtora Teste",
    "email": "teste@imobi.com.br",
    "tipo": "TOMADOR",
    "kycStatus": "PENDENTE"
  }
}
```

**Verification Criteria**:
- ✅ HTTP Status Code: **200 OK**
- ✅ Response contains `accessToken` (JWT format)
- ✅ Response contains `refreshToken` (UUID format)
- ✅ `expiresIn` is a positive number (e.g., 3600 for 1 hour)
- ✅ User data matches registered account

### 2.3 JWT Token Validation

**Decode Access Token** (using jwt.io or similar tool):

```javascript
// Decoded JWT should contain:
{
  "sub": "uuid-string-here",
  "email": "teste@imobi.com.br",
  "tipo": "TOMADOR",
  "iat": 1685267400,
  "exp": 1685271000
}
```

**Verification Criteria**:
- ✅ Token contains `sub` (subject = usuarioId)
- ✅ Token contains `email`
- ✅ Token contains `tipo` (user role)
- ✅ Token has valid `exp` (expiration time)
- ✅ Token is digitally signed

### Failure Scenarios

| Response | Meaning | Action |
|----------|---------|--------|
| Status 400 | Invalid input (validation failed) | Check field requirements (CPF: 11 digits, email format, password complexity) |
| Status 409 | Email already exists | Use different email in test |
| Status 401 | Wrong password | Verify credentials |
| No `accessToken` returned | Auth service error | Check auth service logs |

---

## 3. Core Feature Check - Obras (Projects)

### Objective
Verify that authenticated users can perform core business operations (creating and listing obras).

### 3.1 POST /api/v1/obras (Create Obra)

**Use JWT token from login response**

```bash
curl -X POST https://api.imobi.com.br/obras \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE" \
  -d '{
    "titulo": "Construção - Edifício Residencial A",
    "descricao": "Prédio de 10 andares com 40 unidades",
    "endereco": "Rua das Flores, 123, São Paulo, SP",
    "latitude": -23.5505,
    "longitude": -46.6333,
    "valorTotalOrcado": 500000.00,
    "dataInicio": "2026-06-01",
    "dataPrevisaoFim": "2027-12-31"
  }'
```

**Expected Response** (Status 201):
```json
{
  "obraId": "obra-uuid-here",
  "titulo": "Construção - Edifício Residencial A",
  "descricao": "Prédio de 10 andares com 40 unidades",
  "endereco": "Rua das Flores, 123, São Paulo, SP",
  "latitude": -23.5505,
  "longitude": -46.6333,
  "valorTotalOrcado": 500000.00,
  "status": "PLANEJAMENTO",
  "dataInicio": "2026-06-01",
  "dataPrevisaoFim": "2027-12-31",
  "criadoEm": "2026-05-28T14:35:00Z"
}
```

**Verification Criteria**:
- ✅ HTTP Status Code: **201 Created**
- ✅ Response contains `obraId` (UUID format)
- ✅ Location header contains obra URL
- ✅ Status defaults to: `"PLANEJAMENTO"`
- ✅ Timestamp fields are ISO 8601 format
- ✅ GPS coordinates are preserved exactly as sent

### 3.2 GET /api/v1/obras (List Obras)

**List all obras for authenticated user**

```bash
curl -X GET https://api.imobi.com.br/obras \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

**Expected Response** (Status 200):
```json
{
  "obras": [
    {
      "obraId": "obra-uuid-here",
      "titulo": "Construção - Edifício Residencial A",
      "descricao": "Prédio de 10 andares com 40 unidades",
      "endereco": "Rua das Flores, 123, São Paulo, SP",
      "latitude": -23.5505,
      "longitude": -46.6333,
      "status": "PLANEJAMENTO",
      "dataInicio": "2026-06-01",
      "dataPrevisaoFim": "2027-12-31",
      "progressoPercentual": 0
    }
  ],
  "total": 1
}
```

**Verification Criteria**:
- ✅ HTTP Status Code: **200 OK**
- ✅ Response contains `obras` array
- ✅ Created obra appears in list
- ✅ Each obra has required fields
- ✅ `total` count is accurate
- ✅ Results are paginated (if applicable)

### 3.3 GET /api/v1/obras/:id (Get Specific Obra)

**Retrieve obra details**

```bash
curl -X GET https://api.imobi.com.br/obras/OBRA_ID_HERE \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

**Expected Response** (Status 200):
```json
{
  "obraId": "obra-uuid-here",
  "titulo": "Construção - Edifício Residencial A",
  "descricao": "Prédio de 10 andares com 40 unidades",
  "endereco": "Rua das Flores, 123, São Paulo, SP",
  "latitude": -23.5505,
  "longitude": -46.6333,
  "valorTotalOrcado": 500000.00,
  "status": "PLANEJAMENTO",
  "dataInicio": "2026-06-01",
  "dataPrevisaoFim": "2027-12-31",
  "criadoEm": "2026-05-28T14:35:00Z",
  "etapas": [],
  "liberacoesParcelas": []
}
```

**Verification Criteria**:
- ✅ HTTP Status Code: **200 OK**
- ✅ Response matches created obra
- ✅ GPS coordinates are persisted correctly
- ✅ Status is maintained
- ✅ Relationships (etapas, liberações) are included

### Failure Scenarios

| Response | Meaning | Action |
|----------|---------|--------|
| Status 401 | Missing or invalid token | Check Authorization header format |
| Status 403 | User doesn't have permission | Verify user role has obra access |
| Status 400 | GPS validation failed | Check latitude/longitude are valid (PostGIS validation) |
| Status 404 | Obra not found | Verify obra ID is correct |

---

## 4. Permission-Based Access Control

### Objective
Verify that different user roles can only access appropriate resources.

### 4.1 Test ENGENHEIRO Access

**Create and login as ENGENHEIRO user**

1. Register GESTOR user:
```bash
curl -X POST https://api.imobi.com.br/auth/registrar \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Gestor Obra Test",
    "cpf": "98765432101",
    "email": "gestor@imobi.com.br",
    "telefone": "11987654322",
    "senha": "SenhaSegura@123",
    "tipo": "ENGENHEIRO"
  }'
```

2. Login and attempt to create obra:
```bash
curl -X POST https://api.imobi.com.br/obras \
  -H "Authorization: Bearer GESTOR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{...}'
```

**Expected Result**:
- ✅ ENGENHEIRO should **NOT** be able to create obras (403 Forbidden or similar)
- ✅ ENGENHEIRO should be able to list obras assigned to them
- ✅ ENGENHEIRO should be able to upload evidence

### Failure Scenarios

| Issue | Meaning | Action |
|-------|---------|--------|
| GESTOR can create obras | Permission control broken | Check role-based access control in code |
| User can access others' obras | Data isolation broken | Verify query filters by userId |
| No error message for denied access | Poor UX/debugging | Check API returns 403 with reason |

---

## 5. Data Persistence Check

### Objective
Verify that data is correctly persisted to the database.

### 5.1 Query Database Directly

**Connect to PostgreSQL and verify data**

```sql
-- Check user was created
SELECT usuarioId, nome, email, tipo FROM "Usuario" 
WHERE email = 'teste@imobi.com.br';

-- Check obra was created
SELECT obraId, titulo, "usuarioId", latitude, longitude 
FROM "Obra" WHERE titulo LIKE '%Residencial%';

-- Verify PostGIS integration
SELECT obraId, ST_AsText(localizacao) FROM "Obra" LIMIT 1;
```

**Verification Criteria**:
- ✅ User record exists with correct data
- ✅ Obra record linked to correct user
- ✅ GPS coordinates stored in PostGIS format
- ✅ Timestamps are in UTC

---

## 6. Mobile API Compatibility

### Objective
Verify that mobile endpoints are accessible and return correct data formats.

### 6.1 Headers and Content-Type

**All endpoints should accept**:
- ✅ `Content-Type: application/json`
- ✅ `User-Agent: imobi-mobile/1.0` or similar
- ✅ Custom headers: `X-Device-Id`, `X-App-Version` (if applicable)

### 6.2 Test with Mobile User-Agent

```bash
curl -X GET https://api.imobi.com.br/obras \
  -H "Authorization: Bearer TOKEN_HERE" \
  -H "User-Agent: imobi-mobile/1.0"
```

**Verification Criteria**:
- ✅ Status 200 (same as web)
- ✅ Response is valid JSON
- ✅ No HTML error pages returned

---

## 7. Performance Baseline

### Objective
Establish baseline performance metrics for monitoring.

### 7.1 Response Times

**Measure typical response times**:

```bash
# Health check should be <100ms
curl -w "\nTime: %{time_total}s\n" https://api.imobi.com.br/health

# Login should be <500ms
curl -w "\nTime: %{time_total}s\n" -X POST https://api.imobi.com.br/auth/login ...

# List obras should be <1s
curl -w "\nTime: %{time_total}s\n" -H "Authorization: Bearer TOKEN" https://api.imobi.com.br/obras
```

**Target Baselines**:
- ✅ Health check: **< 100ms**
- ✅ Auth (login): **< 500ms**
- ✅ List query: **< 1000ms**
- ✅ GET single resource: **< 500ms**

---

## 8. Error Handling Verification

### Objective
Verify that API returns appropriate error responses.

### 8.1 Test Invalid Requests

**Missing required field**:
```bash
curl -X POST https://api.imobi.com.br/auth/registrar \
  -H "Content-Type: application/json" \
  -d '{"nome": "Test"}'  # Missing other fields
```

**Expected**: Status 400 with validation errors

**Invalid JWT token**:
```bash
curl -X GET https://api.imobi.com.br/obras \
  -H "Authorization: Bearer invalid_token_here"
```

**Expected**: Status 401 Unauthorized

**Verification Criteria**:
- ✅ Status 400 for validation errors
- ✅ Response includes field-level error messages
- ✅ Status 401 for auth failures
- ✅ Status 403 for permission issues
- ✅ Status 404 for not found
- ✅ Status 429 for rate limiting (if enabled)

---

## 9. Monitoring and Logging

### Objective
Verify that critical events are logged for monitoring.

### 9.1 Check Application Logs

```bash
# Docker logs
docker logs imobi-api-container | tail -100

# Check for errors
docker logs imobi-api-container | grep -i error
```

**Should see logs for**:
- ✅ Server startup: "Application listening on port 3000"
- ✅ Database connection: "Connected to PostgreSQL"
- ✅ Redis connection: "Redis client connected"
- ✅ API requests: "POST /auth/registrar - 201"

### 9.2 Check Sentry Integration (Once Configured)

- [ ] Sentry DSN is configured in `SENTRY_DSN_API` env var
- [ ] Test event sent to Sentry from code
- [ ] Errors from production are appearing in Sentry dashboard

---

## 10. Final Verification Checklist

- [ ] All health check endpoints return "ok"
- [ ] User registration works for all role types
- [ ] JWT token generation and validation works
- [ ] Authenticated users can create recursos
- [ ] Cross-role access control is enforced
- [ ] Data persists correctly in PostgreSQL
- [ ] GPS/PostGIS validation is working
- [ ] Response times meet baseline targets
- [ ] Error messages are appropriate and helpful
- [ ] Logs show no critical errors
- [ ] Mobile API is compatible
- [ ] Redis cache is functioning
- [ ] S3 integration is ready (for file uploads)
- [ ] Email service is configured

---

## Success Criteria

**Deployment is verified successfully when**:
1. ✅ Health check returns `status: "ok"`
2. ✅ All 4 user types can register and login
3. ✅ Authenticated users can create and list obras
4. ✅ Permission controls are enforced (roles can only access appropriate resources)
5. ✅ No critical errors in logs
6. ✅ Response times are within acceptable range
7. ✅ Data is persisted and retrievable

---

## Troubleshooting Guide

### Scenario: Health check returns `redis.status: "error"`

1. Check Redis is running: `docker ps | grep redis`
2. Verify Redis host/port in `.env`: `REDIS_HOST`, `REDIS_PORT`
3. Test Redis connection: `redis-cli -h REDIS_HOST ping`
4. Restart Redis if needed: `docker restart redis-container`

### Scenario: User registration fails with "Email already exists"

- This is expected if retesting — either:
  - Use a different email address
  - Clear test data from database: `DELETE FROM "Usuario" WHERE email = 'test@imobi.com.br'`

### Scenario: JWT token returns 401 "Invalid token"

1. Verify token format in Authorization header: `Authorization: Bearer <token>`
2. Check token hasn't expired
3. Verify JWT secret is consistent between auth service and api

### Scenario: Obras creation fails with GPS validation error

1. Verify latitude is between -90 and 90
2. Verify longitude is between -180 and 180
3. This is a PostGIS validation — it's intentional for data integrity

---

**Deployment Status**: [PASS/FAIL]  
**Verified By**: ___________________  
**Date/Time**: ___________________  
**Notes**: 

---

For issues or questions, contact: devops@imobi.com.br

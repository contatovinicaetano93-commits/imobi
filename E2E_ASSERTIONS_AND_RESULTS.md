# E2E Test Assertions & Expected Results

Detailed reference for all test assertions, expected responses, and validation criteria.

**Document Version**: 1.0  
**Last Updated**: 2026-06-22  
**Total Test Cases**: 58+  
**Success Threshold**: ≥ 95% assertions pass

---

## Phase 1: API Health Check

### Test 1.1: Health Endpoint Responds

**Endpoint**: `GET /api/v1/health`

**Assertion Set**:
```javascript
[
  {
    id: "1.1.1",
    assertion: "HTTP status code = 200",
    method: "assert_status",
    expected: 200,
    critical: true
  },
  {
    id: "1.1.2",
    assertion: "Response contains 'status' field",
    method: "assert_json_property",
    property: "status",
    critical: true
  },
  {
    id: "1.1.3",
    assertion: "status value = 'ok'",
    method: "assert_json_value",
    property: "status",
    expected: "ok",
    critical: true
  },
  {
    id: "1.1.4",
    assertion: "Response time < 2000ms",
    method: "assert_response_time",
    threshold: 2000,
    critical: false
  }
]
```

**Expected Response**:
```json
{
  "status": "ok",
  "timestamp": "2026-06-22T10:30:45.123Z",
  "redis": {
    "status": "connected",
    "host": "redis.example.com",
    "port": 6379
  },
  "database": {
    "configured": true
  },
  "email": {
    "provider": "sendgrid",
    "configured": true
  },
  "firebase": {
    "configured": true
  }
}
```

**Failure Scenarios**:
| Scenario | HTTP | Response | Recovery |
|----------|------|----------|----------|
| API offline | 000 | No response | Start API server |
| Redis down | 200 | `"redis": {"status": "error"}` | Start Redis service |
| DB offline | 200 | `"database": {"configured": false}` | Start PostgreSQL |
| Timeout | 504 | Gateway timeout | Check network |

---

## Phase 2: Authentication Flow

### Test 2.1: User Registration

**Endpoint**: `POST /api/v1/auth/registrar`

**Request**:
```json
{
  "email": "constructor-e2e-1719056445@imbobi.test",
  "password": "TempPassword123!",
  "nome": "Test Constructor"
}
```

**Assertion Set**:
```javascript
[
  {
    id: "2.1.1",
    assertion: "HTTP status code = 201",
    expected: 201,
    critical: true
  },
  {
    id: "2.1.2",
    assertion: "Response contains 'usuarioId'",
    property: "usuarioId",
    critical: true
  },
  {
    id: "2.1.3",
    assertion: "Response contains 'email'",
    property: "email",
    critical: false
  },
  {
    id: "2.1.4",
    assertion: "Response contains 'nome'",
    property: "nome",
    critical: false
  },
  {
    id: "2.1.5",
    assertion: "usuarioId is non-empty string",
    pattern: ".{10,}",
    critical: true
  },
  {
    id: "2.1.6",
    assertion: "Email matches request",
    property: "email",
    expected: "constructor-e2e-1719056445@imbobi.test",
    critical: true
  }
]
```

**Expected Response**:
```json
{
  "usuarioId": "clxxxxxxxxxxxxxxxxxx",
  "email": "constructor-e2e-1719056445@imbobi.test",
  "nome": "Test Constructor",
  "createdAt": "2026-06-22T10:30:45.123Z"
}
```

**Failure Scenarios**:
| Scenario | HTTP | Error | Root Cause |
|----------|------|-------|-----------|
| Duplicate email | 409 | "Email already registered" | Previous test didn't cleanup |
| Invalid email | 400 | "Invalid email format" | Email format validation |
| Weak password | 400 | "Password too weak" | Password strength requirement |
| Missing field | 400 | "Field required: name" | Schema validation |
| DB error | 500 | "Internal server error" | Database connection issue |

---

### Test 2.2: User Login

**Endpoint**: `POST /api/v1/auth/login`

**Request**:
```json
{
  "email": "constructor-e2e-1719056445@imbobi.test",
  "password": "TempPassword123!"
}
```

**Assertion Set**:
```javascript
[
  {
    id: "2.2.1",
    assertion: "HTTP status code = 200",
    expected: 200,
    critical: true
  },
  {
    id: "2.2.2",
    assertion: "Response contains 'access_token'",
    property: "access_token",
    critical: true
  },
  {
    id: "2.2.3",
    assertion: "access_token is non-empty string",
    pattern: ".{50,}",
    critical: true
  },
  {
    id: "2.2.4",
    assertion: "JWT token has 3 parts (header.payload.signature)",
    pattern: "^[\\w-]*\\.[\\w-]*\\.[\\w-]*$",
    critical: true
  },
  {
    id: "2.2.5",
    assertion: "Response time < 500ms",
    threshold: 500,
    critical: false
  }
]
```

**Expected Response**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbHh4eHh4IiwiZW1haWwiOiJ0ZXN0QGltYm9iaS50ZXN0IiwiaWF0IjoxNjE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
  "refresh_token": "ref_xxxxxxxxxxxxxxxxx",
  "usuario": {
    "usuarioId": "clxxxxxxxxxxxxxxxxxx",
    "email": "constructor-e2e-1719056445@imbobi.test",
    "nome": "Test Constructor"
  }
}
```

**Failure Scenarios**:
| Scenario | HTTP | Error | Root Cause |
|----------|------|-------|-----------|
| Wrong password | 401 | "Invalid credentials" | Authentication failure |
| Non-existent user | 401 | "User not found" | Wrong email |
| Account locked | 403 | "Account locked" | Security lockout |
| Rate limited | 429 | "Too many attempts" | Auth throttling |

---

### Test 2.3: Profile Access with Valid Token

**Endpoint**: `GET /api/v1/usuarios/meu-perfil`

**Headers**:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Assertion Set**:
```javascript
[
  {
    id: "2.3.1",
    assertion: "HTTP status code = 200",
    expected: 200,
    critical: true
  },
  {
    id: "2.3.2",
    assertion: "Response contains 'usuarioId'",
    property: "usuarioId",
    critical: true
  },
  {
    id: "2.3.3",
    assertion: "Response contains 'email'",
    property: "email",
    critical: true
  },
  {
    id: "2.3.4",
    assertion: "usuarioId matches login response",
    comparison: "login.body.usuario.usuarioId",
    critical: true
  },
  {
    id: "2.3.5",
    assertion: "Response time < 300ms",
    threshold: 300,
    critical: false
  }
]
```

**Expected Response**:
```json
{
  "usuarioId": "clxxxxxxxxxxxxxxxxxx",
  "email": "constructor-e2e-1719056445@imbobi.test",
  "nome": "Test Constructor",
  "avatar": null,
  "createdAt": "2026-06-22T10:30:45.123Z",
  "updatedAt": "2026-06-22T10:30:45.123Z"
}
```

---

### Test 2.4: Profile Access with Invalid Token

**Endpoint**: `GET /api/v1/usuarios/meu-perfil`

**Headers**:
```
Authorization: Bearer invalid.token.here
```

**Assertion Set**:
```javascript
[
  {
    id: "2.4.1",
    assertion: "HTTP status code = 401",
    expected: 401,
    critical: true
  },
  {
    id: "2.4.2",
    assertion: "Response contains error message",
    property: "message",
    critical: true
  },
  {
    id: "2.4.3",
    assertion: "Error message indicates authentication issue",
    contains: ["Invalid", "Unauthorized", "token"],
    critical: false
  }
]
```

**Expected Response**:
```json
{
  "message": "Invalid or expired token",
  "statusCode": 401,
  "error": "Unauthorized"
}
```

---

## Phase 3: Core Features

### Test 3.1: List Obras

**Endpoint**: `GET /api/v1/obras?limit=10&offset=0`

**Headers**:
```
Authorization: Bearer <valid-constructor-token>
```

**Assertion Set**:
```javascript
[
  {
    id: "3.1.1",
    assertion: "HTTP status code = 200",
    expected: 200,
    critical: true
  },
  {
    id: "3.1.2",
    assertion: "Response contains 'data' array",
    property: "data",
    type: "array",
    critical: true
  },
  {
    id: "3.1.3",
    assertion: "Response contains pagination info",
    properties: ["total", "limit", "offset"],
    critical: true
  },
  {
    id: "3.1.4",
    assertion: "Response time < 500ms",
    threshold: 500,
    critical: false
  }
]
```

**Expected Response**:
```json
{
  "data": [
    {
      "obraId": "clxxxxxxxxxxxxxxxxxx",
      "nome": "Obra E2E Test",
      "endereco": "Rua Test 123, São Paulo, SP",
      "status": "ATIVA",
      "createdAt": "2026-06-22T10:30:45.123Z"
    }
  ],
  "total": 1,
  "limit": 10,
  "offset": 0
}
```

---

### Test 3.2: Create Obra

**Endpoint**: `POST /api/v1/obras`

**Request**:
```json
{
  "nome": "Obra E2E Test",
  "endereco": "Rua Test 123, São Paulo, SP",
  "cep": "01310100",
  "latitude": -23.5505,
  "longitude": -46.6333
}
```

**Assertion Set**:
```javascript
[
  {
    id: "3.2.1",
    assertion: "HTTP status code = 201",
    expected: 201,
    critical: true
  },
  {
    id: "3.2.2",
    assertion: "Response contains 'obraId'",
    property: "obraId",
    critical: true
  },
  {
    id: "3.2.3",
    assertion: "Nome matches request",
    property: "nome",
    expected: "Obra E2E Test",
    critical: true
  },
  {
    id: "3.2.4",
    assertion: "GPS coordinates stored correctly",
    properties: ["latitude", "longitude"],
    critical: false
  },
  {
    id: "3.2.5",
    assertion: "Status is ATIVA initially",
    property: "status",
    expected: "ATIVA",
    critical: true
  }
]
```

**Expected Response**:
```json
{
  "obraId": "clxxxxxxxxxxxxxxxxxx",
  "nome": "Obra E2E Test",
  "endereco": "Rua Test 123, São Paulo, SP",
  "cep": "01310100",
  "latitude": -23.5505,
  "longitude": -46.6333,
  "status": "ATIVA",
  "usuarioId": "clxxxxxxxxxxxxxxxxxx",
  "createdAt": "2026-06-22T10:30:45.123Z"
}
```

---

### Test 3.3: List Notifications

**Endpoint**: `GET /api/v1/notificacoes?limit=20`

**Headers**:
```
Authorization: Bearer <valid-constructor-token>
```

**Assertion Set**:
```javascript
[
  {
    id: "3.3.1",
    assertion: "HTTP status code = 200",
    expected: 200,
    critical: true
  },
  {
    id: "3.3.2",
    assertion: "Response contains 'data' array",
    property: "data",
    type: "array",
    critical: true
  },
  {
    id: "3.3.3",
    assertion: "Response contains pagination",
    properties: ["total", "limit", "offset"],
    critical: true
  },
  {
    id: "3.3.4",
    assertion: "Each notification has required fields",
    requires: ["id", "tipo", "titulo", "conteudo", "lida"],
    critical: false
  }
]
```

**Expected Response**:
```json
{
  "data": [],
  "total": 0,
  "limit": 20,
  "offset": 0
}
```

---

## Phase 4: Manager Portal

### Test 4.1: Manager Dashboard Access

**Endpoint**: `GET /api/v1/manager/dashboard`

**Headers** (Manager):
```
Authorization: Bearer <valid-manager-token>
```

**Assertion Set**:
```javascript
[
  {
    id: "4.1.1",
    assertion: "HTTP status code = 200",
    expected: 200,
    critical: true
  },
  {
    id: "4.1.2",
    assertion: "Response contains KPI metrics",
    properties: ["etapasAguardando", "kycAguardando", "emVistoria"],
    critical: true
  },
  {
    id: "4.1.3",
    assertion: "All KPI values are non-negative integers",
    type: "number",
    constraint: ">= 0",
    critical: true
  },
  {
    id: "4.1.4",
    assertion: "Response contains recentApprovals",
    property: "recentApprovals",
    type: "array",
    critical: false
  }
]
```

**Expected Response**:
```json
{
  "etapasAguardando": 0,
  "kycAguardando": 0,
  "emVistoria": 0,
  "recentApprovals": [],
  "kpis": {
    "totalObras": 0,
    "totalUsuarios": 2,
    "totalCreditos": 0,
    "taxaAprovacao": 0
  }
}
```

---

### Test 4.2: Manager Dashboard Access Denied (Constructor)

**Endpoint**: `GET /api/v1/manager/dashboard`

**Headers** (Constructor):
```
Authorization: Bearer <valid-constructor-token>
```

**Assertion Set**:
```javascript
[
  {
    id: "4.2.1",
    assertion: "HTTP status code is 403 or 401",
    expected: [403, 401],
    critical: true
  },
  {
    id: "4.2.2",
    assertion: "Response indicates access denied",
    contains: ["denied", "forbidden", "unauthorized"],
    critical: true
  },
  {
    id: "4.2.3",
    assertion: "Error message is descriptive",
    property: "message",
    critical: false
  }
]
```

**Expected Response**:
```json
{
  "message": "Access denied. Manager role required.",
  "statusCode": 403,
  "error": "Forbidden"
}
```

---

### Test 4.3: Pending Etapas List

**Endpoint**: `GET /api/v1/manager/etapas-pendentes?limit=10&offset=0`

**Headers** (Manager):
```
Authorization: Bearer <valid-manager-token>
```

**Assertion Set**:
```javascript
[
  {
    id: "4.3.1",
    assertion: "HTTP status code = 200",
    expected: 200,
    critical: true
  },
  {
    id: "4.3.2",
    assertion: "Response is paginated array",
    properties: ["data", "total", "limit", "offset"],
    critical: true
  },
  {
    id: "4.3.3",
    assertion: "Can handle limit and offset parameters",
    test: "Pass different limit/offset values",
    critical: false
  }
]
```

**Expected Response**:
```json
{
  "data": [],
  "total": 0,
  "limit": 10,
  "offset": 0
}
```

---

## Phase 5: Performance & Load

### Test 5.1: Response Time Benchmarks

**Endpoint**: `GET /api/v1/obras?limit=5` (10 sequential requests)

**Assertion Set**:
```javascript
[
  {
    id: "5.1.1",
    assertion: "Average response time < 800ms",
    threshold: 800,
    aggregation: "average",
    critical: true
  },
  {
    id: "5.1.2",
    assertion: "No request times out (< 30s)",
    threshold: 30000,
    aggregation: "max",
    critical: true
  },
  {
    id: "5.1.3",
    assertion: "Error rate < 10%",
    threshold: 10,
    aggregation: "error_rate",
    critical: true
  },
  {
    id: "5.1.4",
    assertion: "Min response time > 50ms",
    threshold: 50,
    aggregation: "min",
    critical: false
  }
]
```

**Sample Metrics**:
```
Request 1:  350ms (PASS)
Request 2:  280ms (PASS)
Request 3:  420ms (PASS)
Request 4:  310ms (PASS)
Request 5:  380ms (PASS)
Request 6:  290ms (PASS)
Request 7:  350ms (PASS)
Request 8:  360ms (PASS)
Request 9:  400ms (PASS)
Request 10: 370ms (PASS)

Min:  280ms
Avg:  350ms
Max:  420ms
StdDev: 45ms
ErrorRate: 0%

Result: ✓ PASS (avg 350ms < 800ms threshold)
```

---

### Test 5.2: Error Rate

**Assertion Set**:
```javascript
[
  {
    id: "5.2.1",
    assertion: "5xx error rate < 1%",
    threshold: 1,
    critical: true
  },
  {
    id: "5.2.2",
    assertion: "4xx error rate < 5%",
    threshold: 5,
    critical: false
  },
  {
    id: "5.2.3",
    assertion: "No request hangs > 30s",
    threshold: 30000,
    critical: true
  }
]
```

---

### Test 5.3: Rate Limiting

**Endpoint**: `POST /api/v1/auth/login` (15 rapid requests)

**Assertion Set**:
```javascript
[
  {
    id: "5.3.1",
    assertion: "First 10 requests return 200 or 401",
    expected: [200, 401],
    count: 10,
    critical: true
  },
  {
    id: "5.3.2",
    assertion: "Request 11+ return 429 (Too Many Requests)",
    expected: 429,
    count: 1,
    critical: true
  },
  {
    id: "5.3.3",
    assertion: "429 response includes Retry-After header",
    header: "Retry-After",
    critical: false
  }
]
```

**Sample Output**:
```
Request 1:  401 (credentials invalid, but allowed)
Request 2:  401
Request 3:  401
Request 4:  401
Request 5:  401
Request 6:  401
Request 7:  401
Request 8:  401
Request 9:  401
Request 10: 401
Request 11: 429 (rate limit exceeded) ✓
Request 12: 429
Request 13: 429
Request 14: 429
Request 15: 429

Result: ✓ PASS (rate limiting detected)
```

---

### Test 5.4: Invalid Query Parameters

**Endpoint**: `GET /api/v1/obras?limit=invalid`

**Assertion Set**:
```javascript
[
  {
    id: "5.4.1",
    assertion: "HTTP status code = 400",
    expected: 400,
    critical: true
  },
  {
    id: "5.4.2",
    assertion: "Response contains error message",
    property: "message",
    critical: true
  },
  {
    id: "5.4.3",
    assertion: "Error message indicates invalid input",
    contains: ["invalid", "invalid parameter", "bad request"],
    critical: false
  }
]
```

**Expected Response**:
```json
{
  "message": "Invalid query parameter: limit must be a number",
  "statusCode": 400,
  "error": "Bad Request"
}
```

---

### Test 5.5: Missing Authorization

**Endpoint**: `GET /api/v1/obras?limit=10` (no Authorization header)

**Assertion Set**:
```javascript
[
  {
    id: "5.5.1",
    assertion: "HTTP status code = 401",
    expected: 401,
    critical: true
  },
  {
    id: "5.5.2",
    assertion: "Response indicates authentication required",
    contains: ["unauthorized", "token required"],
    critical: true
  }
]
```

**Expected Response**:
```json
{
  "message": "Authentication required. Please provide a valid JWT token.",
  "statusCode": 401,
  "error": "Unauthorized"
}
```

---

## Critical vs Non-Critical Assertions

### Critical Assertions (Must Pass)
- Authentication flow completeness
- HTTP status codes
- Required field presence in responses
- Authorization checks
- Database connectivity

### Non-Critical Assertions (Warnings if Fail)
- Response time thresholds
- Pagination field names
- Optional response fields
- Timestamp formats
- Avatar/profile images

**Scoring**:
- All critical assertions pass: **✓ GREEN (GO)**
- ≤ 2 non-critical failures: **⚠ YELLOW (HOLD)**
- ≥ 3 failures or any critical: **✗ RED (NO-GO)**

---

## Response Time Benchmarks

### Acceptable Ranges by Endpoint Type

| Endpoint Type | p50 | p95 | p99 | Max |
|---------------|-----|-----|-----|-----|
| Health check | <200ms | <300ms | <500ms | <2s |
| Auth (register) | <300ms | <500ms | <800ms | <3s |
| Auth (login) | <300ms | <500ms | <800ms | <3s |
| Read (list) | <200ms | <800ms | <1200ms | <3s |
| Read (detail) | <200ms | <500ms | <1000ms | <3s |
| Write (create) | <300ms | <800ms | <1200ms | <5s |
| Manager endpoints | <300ms | <800ms | <1200ms | <3s |

**P95 Overall Target**: < 800ms

---

## Common Assertion Patterns

### Pattern 1: Status Code Validation
```bash
# Check HTTP status is exactly X
assert_status "$response" 200 "Endpoint returns 200 OK"
```

### Pattern 2: JSON Field Presence
```bash
# Check JSON contains field
assert_json_property "$response" "usuarioId" "Response has usuarioId"
```

### Pattern 3: JSON Value Equality
```bash
# Check JSON field equals specific value
assert_json_value "$response" "status" "ok" "Status is 'ok'"
```

### Pattern 4: Response Time
```bash
# Check request took < X ms
assert_response_time "$time_ms" 800 "Response time under 800ms"
```

---

## Failure Recovery Guide

| Assertion ID | Failure | Check | Fix |
|--------------|---------|-------|-----|
| 1.1.1 | Health → not 200 | API running? | Start API |
| 2.1.1 | Register → not 201 | DB accessible? | Check migrations |
| 2.2.1 | Login → not 200 | User exists? | Register first |
| 2.3.1 | Profile → not 200 | Token valid? | Recheck login |
| 3.1.1 | List obras → not 200 | Auth header? | Add token |
| 4.1.1 | Manager → not 200 | Is manager? | Assign role |
| 4.2.1 | Manager deny → not 401/403 | Auth check? | Verify guards |
| 5.1.1 | Slow response | DB slow? | Check indices |
| 5.3.1 | No rate limit | Throttling on? | Enable decorator |
| 5.4.1 | Invalid → not 400 | Validation? | Add schema check |

---

## References

- Full test script: `PRODUCTION_E2E_VALIDATION_SCRIPT.sh`
- Validation guide: `E2E_VALIDATION_GUIDE.md`
- Configuration: `services/api/PRODUCTION_VALIDATION.md`

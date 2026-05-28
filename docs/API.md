# API Documentation — imbobi Platform

**Base URL**: `https://api.imbobi.com/api/v1` (production) or `http://localhost:4000/api/v1` (development)

**Status**: Production-ready v1.0  
**Last Updated**: May 28, 2026

---

## Table of Contents

1. [Authentication Endpoints](#authentication-endpoints)
2. [Rate Limiting](#rate-limiting)
3. [CSRF Protection](#csrf-protection)
4. [Error Handling](#error-handling)
5. [Security Headers](#security-headers)

---

## Authentication Endpoints

### GET /auth/csrf-token

Retrieve a CSRF token for state-changing requests. **All POST requests must include the returned token.**

**Request**:
```http
GET /auth/csrf-token
```

**Response** (200 OK):
```json
{
  "csrfToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresAt": "2026-05-28T10:15:00Z"
}
```

**cURL Example**:
```bash
curl -X GET https://api.imbobi.com/api/v1/auth/csrf-token \
  -H "Content-Type: application/json"
```

**Uses**:
- Must be obtained before `/login`, `/registrar`, or any state-changing endpoint
- Token expires in 15 minutes
- Include in request headers as `x-csrf-token` or in POST body

---

### POST /auth/registrar

Register a new user account.

**Request**:
```http
POST /auth/registrar
Content-Type: application/json
X-CSRF-Token: <csrf-token>

{
  "email": "usuario@example.com",
  "senha": "SecurePass123!",
  "nome": "João Silva",
  "telefone": "+5511987654321",
  "cpf": "12345678900",
  "termosConcordados": true
}
```

**Response** (201 Created):
```json
{
  "usuario": {
    "id": "usr_abc123xyz",
    "email": "usuario@example.com",
    "nome": "João Silva",
    "cpf": "12345678900" (encrypted)
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "ref_xyz789abc",
  "csrfToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Rate Limit**: 3 requests per hour per IP address  
**Status Codes**:
- `201` — Registration successful
- `400` — Invalid input (email format, password strength, etc.)
- `409` — Email already registered
- `429` — Rate limit exceeded (wait 1 hour)

**Password Requirements**:
- Minimum 8 characters
- At least one uppercase letter
- At least one number
- At least one special character (!@#$%^&*)

**cURL Example**:
```bash
# Step 1: Get CSRF token
CSRF=$(curl -s https://api.imbobi.com/api/v1/auth/csrf-token | jq -r .csrfToken)

# Step 2: Register with token
curl -X POST https://api.imbobi.com/api/v1/auth/registrar \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF" \
  -d '{
    "email": "usuario@example.com",
    "senha": "SecurePass123!",
    "nome": "João Silva",
    "telefone": "+5511987654321",
    "cpf": "12345678900",
    "termosConcordados": true
  }'
```

---

### POST /auth/login

Authenticate user and obtain access token.

**Request**:
```http
POST /auth/login
Content-Type: application/json
X-CSRF-Token: <csrf-token>

{
  "email": "usuario@example.com",
  "senha": "SecurePass123!"
}
```

**Response** (200 OK):
```json
{
  "usuario": {
    "id": "usr_abc123xyz",
    "email": "usuario@example.com",
    "nome": "João Silva",
    "role": "TOMADOR"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "ref_xyz789abc",
  "expiresIn": 900,
  "csrfToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Rate Limit**: 5 requests per 15 minutes per IP address  
**Status Codes**:
- `200` — Login successful
- `400` — Missing email or password
- `401` — Invalid credentials
- `429` — Rate limit exceeded (wait 15 minutes)

**Token Details**:
- `accessToken` — Expires in 15 minutes (900 seconds)
- `refreshToken` — Expires in 7 days (revocable)
- Both tokens are **HttpOnly cookies** for security

**cURL Example**:
```bash
# Step 1: Get CSRF token
CSRF=$(curl -s https://api.imbobi.com/api/v1/auth/csrf-token | jq -r .csrfToken)

# Step 2: Login with token
curl -X POST https://api.imbobi.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF" \
  -d '{
    "email": "usuario@example.com",
    "senha": "SecurePass123!"
  }' \
  -c cookies.txt
```

---

### POST /auth/renovar

Refresh access token using refresh token.

**Request**:
```http
POST /auth/renovar
Content-Type: application/json

{
  "refreshToken": "ref_xyz789abc"
}
```

**Response** (200 OK):
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "ref_newtoken123",
  "expiresIn": 900
}
```

**Rate Limit**: 10 requests per hour per user  
**Status Codes**:
- `200` — Token refreshed successfully
- `401` — Invalid or expired refresh token
- `429` — Rate limit exceeded (wait 1 hour)

**Token Rotation**:
- Each refresh request returns a **new refresh token** (old token is invalidated)
- This prevents token replay attacks
- Refresh tokens are database-tracked and revocable

**cURL Example**:
```bash
curl -X POST https://api.imbobi.com/api/v1/auth/renovar \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "ref_xyz789abc"
  }' \
  -b cookies.txt
```

---

### POST /auth/logout

Revoke refresh token and end session.

**Request**:
```http
POST /auth/logout
Content-Type: application/json

{
  "refreshToken": "ref_xyz789abc"
}
```

**Response** (204 No Content):
```
(empty body)
```

**Status Codes**:
- `204` — Logout successful (token revoked)
- `400` — Missing refresh token
- `401` — Invalid token

**cURL Example**:
```bash
curl -X POST https://api.imbobi.com/api/v1/auth/logout \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "ref_xyz789abc"
  }' \
  -b cookies.txt
```

---

## Rate Limiting

All endpoints are protected by rate limiting to prevent abuse, brute force attacks, and resource exhaustion.

### Rate Limiting Tiers

| Endpoint Category | Limit | Window | Guard Type | Purpose |
|---|---|---|---|---|
| **Login** (`POST /auth/login`) | 5 attempts | 15 minutes | IP-based | Brute force protection |
| **Registration** (`POST /auth/registrar`) | 3 attempts | 1 hour | IP-based | Account enumeration prevention |
| **Token Refresh** (`POST /auth/renovar`) | 10 attempts | 1 hour | User-based | DoS protection |
| **Credit Simulation** (`POST /credito/simular`) | 20 requests | 1 hour | User-based | Expensive computation protection |
| **Evidence Upload** (`POST /evidencias/upload`) | 30 uploads | 24 hours | User-based | Storage quota protection |
| **Global Default** | 100 requests | 60 seconds | IP-based | General DoS protection |

### Rate Limit Response

When rate limit is exceeded:

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
Retry-After: 900

{
  "statusCode": 429,
  "message": "Rate limit exceeded. Try again in 15 minutes.",
  "retryAfter": 900
}
```

**Headers**:
- `Retry-After` — Seconds until rate limit resets
- `X-RateLimit-Limit` — Maximum requests allowed
- `X-RateLimit-Remaining` — Requests remaining in current window
- `X-RateLimit-Reset` — Unix timestamp when limit resets

### Strategies

- **IP-based guards** (`IpThrottlerGuard`) — Identify user by IP address
  - Applies to: login, registration
  - Prevents attacks from single IP
  
- **User-based guards** (`UserThrottlerGuard`) — Identify user by JWT token
  - Applies to: token refresh, credit simulation, evidence upload
  - Prevents attacks by authenticated users

---

## CSRF Protection

Cross-Site Request Forgery (CSRF) is prevented via CSRF tokens and SameSite cookies.

### How CSRF Works in imbobi

1. **Client obtains token** from `GET /auth/csrf-token`
2. **Client includes token** in POST request header (`X-CSRF-Token`) or body (`csrfToken`)
3. **Server validates token** before processing state-changing request
4. **Token expires** after 15 minutes

### Protected Endpoints

All `POST`, `PUT`, `DELETE` endpoints require valid CSRF token:
- `/auth/login`
- `/auth/registrar`
- `/obras/*` (create, update)
- `/etapas/*` (create, update)
- `/evidencias/upload`
- `/credito/simular`
- All other state-changing operations

### Exempt Endpoints

`GET` endpoints are exempt (idempotent, no state changes):
- `/auth/csrf-token`
- `/auth/me`
- `/obras` (list)
- `/etapas` (list)
- etc.

### Token Format

Tokens are JWT-encoded and include:
```json
{
  "sub": "csrf_session_id",
  "iat": 1716854700,
  "exp": 1716855600,
  "iss": "imbobi-api"
}
```

---

## Error Handling

### Error Response Format

All errors follow this standard format:

```json
{
  "statusCode": 400,
  "message": "Validation error",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    },
    {
      "field": "senha",
      "message": "Password must be at least 8 characters"
    }
  ]
}
```

### Common Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| `200` | OK | Request successful |
| `201` | Created | Resource created successfully |
| `204` | No Content | Successful action, no content to return |
| `400` | Bad Request | Invalid input (check `errors` array) |
| `401` | Unauthorized | Missing or invalid token |
| `403` | Forbidden | Insufficient permissions |
| `404` | Not Found | Resource not found |
| `409` | Conflict | Resource already exists (e.g., email taken) |
| `429` | Too Many Requests | Rate limit exceeded |
| `500` | Server Error | Internal error (report to support) |

### Validation Errors (400)

Missing or invalid fields return detailed error messages:

```bash
curl -X POST https://api.imbobi.com/api/v1/auth/registrar \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF" \
  -d '{
    "email": "invalid-email",
    "senha": "weak"
  }'
```

Response:
```json
{
  "statusCode": 400,
  "message": "Validation error",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format. Expected: user@example.com"
    },
    {
      "field": "senha",
      "message": "Password must contain uppercase, number, and special character"
    }
  ]
}
```

---

## Security Headers

All API responses include security headers:

```http
Content-Security-Policy: default-src 'self'
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
```

### Header Meanings

- **Content-Security-Policy** — Prevents XSS and injection attacks
- **X-Content-Type-Options** — Prevents MIME type sniffing
- **X-XSS-Protection** — Legacy XSS protection (browsers)
- **HSTS** — Forces HTTPS for 1 year
- **X-Frame-Options** — Prevents clickjacking
- **Referrer-Policy** — Controls referrer information sent to other sites

---

## Authentication & Authorization

### Header Format

Include token in HTTP header:

```http
Authorization: Bearer <accessToken>
```

Or use HttpOnly cookie (automatic in browsers):

```http
Cookie: accessToken=<token>
```

### Roles

Users have roles that determine permissions:

| Role | Permissions |
|------|-------------|
| `TOMADOR` | Create obras, upload evidencias, simulate credit |
| `GESTOR_OBRA` | Manage work stages and evidence validation |
| `ADMIN` | Full system access, user management |

---

## Code Examples

### JavaScript/TypeScript (Fetch API)

```typescript
// 1. Get CSRF token
const csrfResponse = await fetch('https://api.imbobi.com/api/v1/auth/csrf-token');
const { csrfToken } = await csrfResponse.json();

// 2. Login with CSRF protection
const loginResponse = await fetch('https://api.imbobi.com/api/v1/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrfToken,
  },
  credentials: 'include', // Include cookies
  body: JSON.stringify({
    email: 'usuario@example.com',
    senha: 'SecurePass123!',
  }),
});

const { accessToken, refreshToken } = await loginResponse.json();
```

### Python (requests)

```python
import requests

# 1. Get CSRF token
csrf_response = requests.get('https://api.imbobi.com/api/v1/auth/csrf-token')
csrf_token = csrf_response.json()['csrfToken']

# 2. Login with CSRF protection
session = requests.Session()
login_response = session.post(
    'https://api.imbobi.com/api/v1/auth/login',
    headers={
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrf_token,
    },
    json={
        'email': 'usuario@example.com',
        'senha': 'SecurePass123!',
    }
)

tokens = login_response.json()
access_token = tokens['accessToken']
```

### cURL

```bash
#!/bin/bash

# 1. Get CSRF token
CSRF=$(curl -s https://api.imbobi.com/api/v1/auth/csrf-token | jq -r .csrfToken)

# 2. Login with CSRF token
curl -X POST https://api.imbobi.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF" \
  -d '{
    "email": "usuario@example.com",
    "senha": "SecurePass123!"
  }' \
  -c cookies.txt

# 3. Use token in subsequent requests
curl -X GET https://api.imbobi.com/api/v1/auth/me \
  -b cookies.txt
```

---

## Pagination

List endpoints support pagination:

```http
GET /api/v1/obras?page=1&limit=20&sortBy=createdAt&order=desc
```

**Parameters**:
- `page` — Page number (default: 1)
- `limit` — Items per page (default: 20, max: 100)
- `sortBy` — Field to sort by (default: createdAt)
- `order` — `asc` or `desc` (default: desc)

**Response**:
```json
{
  "data": [
    { "id": "obra_1", "nome": "Obra A", ... },
    { "id": "obra_2", "nome": "Obra B", ... }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

---

## Support

**API Issues?** Contact backend@imbobi.com

**Security Issues?** Report to security@imbobi.com

**Documentation Issues?** Open issue on GitHub or contact devops@imbobi.com

---

**Last Updated**: May 28, 2026  
**Version**: 1.0  
**Maintained by**: imbobi API Team

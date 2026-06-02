# API Documentation — imbobi

**Base URL:** `{NEXT_PUBLIC_API_URL}/api/v1`  
**Default (Local):** `http://localhost:4000/api/v1`  
**Swagger Docs:** `http://localhost:4000/docs`  
**Authentication:** JWT Bearer Token  
**Last Updated:** 2026-06-02

---

## Table of Contents
1. [Authentication](#authentication)
2. [Error Handling](#error-handling)
3. [Rate Limiting](#rate-limiting)
4. [Endpoints by Module](#endpoints-by-module)
5. [Schemas (Zod)](#schemas-zod)
6. [Examples](#examples)

---

## Authentication

### JWT Bearer Token

All endpoints (except auth/public) require:

```http
Authorization: Bearer <access-token>
```

**Token Format:**
- Access Token: 15 minutes expiry
- Refresh Token: 7 days expiry
- Encryption: Refresh tokens stored encrypted (AES-256-GCM)

### Token Refresh Flow

```
1. Call POST /auth/registrar or /auth/login
2. Receive accessToken + refreshToken
3. Use accessToken in Authorization header
4. When token expires (after 15m):
   POST /auth/renovar { refreshToken }
5. Get new accessToken + refreshToken
6. Continue using new accessToken
```

---

## Error Handling

### Response Format

All errors follow this schema:

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "BAD_REQUEST",
  "details": {
    "field": "email",
    "reason": "Invalid email format"
  }
}
```

### Common Error Codes

| Code | HTTP | Meaning |
|------|------|---------|
| `VALIDATION_ERROR` | 400 | Invalid input data (Zod schema) |
| `UNAUTHORIZED` | 401 | Missing or invalid JWT token |
| `FORBIDDEN` | 403 | Insufficient permissions (role-based) |
| `NOT_FOUND` | 404 | Resource does not exist |
| `CONFLICT` | 409 | Resource already exists (e.g., email taken) |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error (check logs) |

### Example Error Response

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "statusCode": 400,
  "message": "CPF validation failed",
  "error": "VALIDATION_ERROR",
  "details": {
    "field": "cpf",
    "reason": "Invalid CPF checksum"
  }
}
```

---

## Rate Limiting

Applied per IP address and per user. Returns `Retry-After` header.

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/auth/registrar` | 10 | per minute |
| `/auth/login` | 10 | per minute |
| `/auth/renovar` | 20 | per minute |
| File uploads | 5 | per minute |
| Manager operations | 20 | per minute |
| Other endpoints | 100 | per minute |

**Rate Limit Headers:**

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1234567890
Retry-After: 60
```

---

## Endpoints by Module

### Authentication Module

#### Register User

```http
POST /auth/registrar
Content-Type: application/json
```

**Schema:** `CadastroUsuarioSchema`

```json
{
  "nome": "João Silva",
  "email": "joao@example.com",
  "cpf": "12345678901",
  "telefone": "+5511999999999",
  "senha": "SenhaForte@123"
}
```

**Response (201 Created):**

```json
{
  "usuario": {
    "usuarioId": "uuid",
    "nome": "João Silva",
    "email": "joao@example.com",
    "tipo": "construtor",
    "kycStatus": "pendente"
  },
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "expiresIn": 900
}
```

**Validation Rules:**
- Email: RFC 5322 compliant + unique
- CPF: Modulo 11 checksum + unique
- Senha: Min 8 chars, 1 uppercase, 1 number, 1 special
- Telefone: E.164 format (+55...)

---

#### Login

```http
POST /auth/login
Content-Type: application/json
```

**Schema:** `LoginSchema`

```json
{
  "email": "joao@example.com",
  "senha": "SenhaForte@123"
}
```

**Response (200 OK):**

```json
{
  "usuario": {
    "usuarioId": "uuid",
    "nome": "João Silva",
    "email": "joao@example.com",
    "tipo": "construtor",
    "kycStatus": "pendente"
  },
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "expiresIn": 900
}
```

---

#### Refresh Token

```http
POST /auth/renovar
Content-Type: application/json
```

```json
{
  "refreshToken": "eyJhbGc..."
}
```

**Response (200 OK):**

```json
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "expiresIn": 900
}
```

---

### KYC Module

#### List Pending KYC Approvals

```http
GET /kyc/pendentes
Authorization: Bearer <token>
```

**Role Required:** `ADMIN` or `GESTOR_OBRA`

**Response (200 OK):**

```json
{
  "items": [
    {
      "kycId": "uuid",
      "usuarioId": "uuid",
      "usuario": {
        "nome": "João Silva",
        "email": "joao@example.com",
        "cpf": "***45678901"  // Masked
      },
      "status": "pendente",
      "submittedAt": "2026-06-01T10:00:00Z",
      "expiresAt": "2026-06-15T10:00:00Z"
    }
  ],
  "total": 5,
  "page": 1,
  "limit": 20
}
```

**Notes:**
- CPF is masked for privacy
- Only ADMIN/GESTOR_OBRA can access
- Expires after 14 days

---

#### Approve KYC

```http
POST /kyc/aprovar/:kycId
Authorization: Bearer <token>
```

**Role Required:** `ADMIN`

**Response (200 OK):**

```json
{
  "kycId": "uuid",
  "status": "aprovado",
  "approvedAt": "2026-06-02T14:30:00Z",
  "approvedBy": "gestor@example.com"
}
```

---

### Credit (Crédito) Module

#### Get Credit Simulator

```http
GET /credito/simulador?amount=10000&months=12&tipo=construtor
Authorization: Bearer <token>
```

**Query Parameters:**
- `amount` (number, required): Amount in BRL
- `months` (number, required): Loan term in months
- `tipo` (string, optional): User type filter

**Response (200 OK):**

```json
{
  "simulacao": {
    "amount": 10000,
    "months": 12,
    "interestRate": 0.015,
    "monthlyPayment": 879.16,
    "totalInterest": 549.92,
    "totalAmount": 10549.92
  },
  "eligibility": {
    "eligible": true,
    "maxAmount": 50000,
    "reason": "Elegível com histórico"
  }
}
```

---

#### Get Credit Statement (Extrato)

```http
GET /credito/:creditoId/extrato
Authorization: Bearer <token>
```

**Authorization:**
- User must own the credit OR be ADMIN/GESTOR_OBRA

**Response (200 OK):**

```json
{
  "credito": {
    "creditoId": "uuid",
    "usuarioId": "uuid",
    "amount": 10000,
    "status": "ativo",
    "createdAt": "2026-05-01T10:00:00Z"
  },
  "parcelas": [
    {
      "parcelaId": "uuid",
      "number": 1,
      "dueDate": "2026-06-01",
      "amount": 879.16,
      "status": "paga",
      "paidAt": "2026-06-01T10:00:00Z"
    },
    {
      "parcelaId": "uuid",
      "number": 2,
      "dueDate": "2026-07-01",
      "amount": 879.16,
      "status": "pendente",
      "daysOverdue": 2
    }
  ]
}
```

---

### Works (Obras) Module

#### List User Works

```http
GET /obras?page=1&limit=20
Authorization: Bearer <token>
```

**Response (200 OK):**

```json
{
  "items": [
    {
      "obraId": "uuid",
      "nome": "Construção Residencial",
      "address": {
        "street": "Rua A",
        "city": "São Paulo",
        "state": "SP",
        "zipCode": "01234-567",
        "coordinates": {
          "latitude": -23.5505,
          "longitude": -46.6756
        }
      },
      "status": "em_andamento",
      "createdAt": "2026-05-01T10:00:00Z"
    }
  ],
  "total": 3,
  "page": 1,
  "limit": 20
}
```

---

#### Create Work

```http
POST /obras
Authorization: Bearer <token>
Content-Type: application/json
```

**Schema:** `CreateObraSchema`

```json
{
  "nome": "Construção Residencial",
  "address": {
    "street": "Rua A, 123",
    "number": "123",
    "city": "São Paulo",
    "state": "SP",
    "zipCode": "01234-567",
    "latitude": -23.5505,
    "longitude": -46.6756
  },
  "estimatedBudget": 100000
}
```

**Response (201 Created):**

```json
{
  "obraId": "uuid",
  "nome": "Construção Residencial",
  "status": "criada",
  "createdAt": "2026-06-02T14:30:00Z"
}
```

---

### Stages (Etapas) Module

#### List Work Stages

```http
GET /etapas/obra/:obraId
Authorization: Bearer <token>
```

**Authorization:** User must own obra OR be ADMIN/GESTOR_OBRA

**Response (200 OK):**

```json
{
  "items": [
    {
      "etapaId": "uuid",
      "obraId": "uuid",
      "nome": "Fundação",
      "description": "Escavação e alicerce",
      "estimatedBudget": 15000,
      "status": "concluida",
      "completedAt": "2026-05-15T10:00:00Z",
      "order": 1
    },
    {
      "etapaId": "uuid",
      "obraId": "uuid",
      "nome": "Estrutura",
      "description": "Pilares e vigas",
      "estimatedBudget": 30000,
      "status": "em_andamento",
      "order": 2
    }
  ]
}
```

---

#### Update Stage Status

```http
PATCH /etapas/:etapaId/status
Authorization: Bearer <token>
Content-Type: application/json
```

**Role Required:** `ADMIN` or `GESTOR_OBRA`

```json
{
  "status": "concluida"
}
```

**Valid Statuses:**
- `planejada`
- `em_andamento`
- `concluida`
- `pausada`
- `cancelada`

**Response (200 OK):**

```json
{
  "etapaId": "uuid",
  "status": "concluida",
  "completedAt": "2026-06-02T14:30:00Z"
}
```

---

### Evidence Photos Module

#### Upload Evidence Photo

```http
POST /evidencias/etapa/:etapaId/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Form Data:**
- `file` (binary, required): Image file (JPG/PNG, max 5MB)
- `description` (string, optional): Photo description
- `date` (ISO 8601, optional): Photo date

**Response (201 Created):**

```json
{
  "evidenciaId": "uuid",
  "etapaId": "uuid",
  "url": "https://s3.amazonaws.com/imobi-evidencias-prod/...",
  "uploadedAt": "2026-06-02T14:30:00Z",
  "size": 2048576
}
```

---

#### List Stage Evidence

```http
GET /evidencias/etapa/:etapaId
Authorization: Bearer <token>
```

**Authorization:** User must own obra OR be ADMIN/GESTOR_OBRA

**Response (200 OK):**

```json
{
  "items": [
    {
      "evidenciaId": "uuid",
      "etapaId": "uuid",
      "url": "https://s3.amazonaws.com/...",
      "description": "Fundação concluída",
      "uploadedAt": "2026-06-01T10:00:00Z",
      "uploadedBy": "joao@example.com"
    }
  ],
  "total": 5
}
```

---

### Health & System Endpoints

#### Health Check

```http
GET /api/v1/health
```

**Response (200 OK):**

```json
{
  "status": "ok",
  "uptime": 1234.56,
  "timestamp": "2026-06-02T14:30:00Z"
}
```

---

#### Liveness Probe

```http
GET /api/v1/health/live
```

**Response (200 OK):**

```json
{
  "status": "ok"
}
```

---

#### Readiness Probe

```http
GET /api/v1/health/ready
```

**Response (200 OK):**

```json
{
  "status": "ready",
  "database": "connected",
  "redis": "connected"
}
```

---

## Schemas (Zod)

All request validation uses Zod schemas from `@imbobi/schemas`:

### CadastroUsuarioSchema

```typescript
{
  nome: string,          // Min 3, max 100 chars
  email: string,         // Valid email, unique
  cpf: string,          // 11 digits, valid checksum, unique
  telefone: string,     // E.164 format
  senha: string,        // Min 8, 1 uppercase, 1 number, 1 special
}
```

### LoginSchema

```typescript
{
  email: string,        // Valid email
  senha: string,        // Min 8 chars
}
```

### CreateObraSchema

```typescript
{
  nome: string,         // Min 3, max 200 chars
  address: {
    street: string,
    number: string,
    city: string,
    state: string,      // 2-char state code
    zipCode: string,    // XXXXX-XXX format
    latitude: number,   // PostGIS validation
    longitude: number,  // PostGIS validation
  },
  estimatedBudget?: number,  // Min 1000, max 1000000
}
```

---

## Examples

### Full Login Flow

```bash
# 1. Register
curl -X POST http://localhost:4000/api/v1/auth/registrar \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "João Silva",
    "email": "joao@example.com",
    "cpf": "12345678901",
    "telefone": "+5511999999999",
    "senha": "SenhaForte@123"
  }'

# Response:
# {
#   "usuario": { ... },
#   "accessToken": "eyJhbGc...",
#   "refreshToken": "eyJhbGc..."
# }

# 2. Use accessToken in next requests
export TOKEN="eyJhbGc..."

curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:4000/api/v1/obras

# 3. When token expires (15m), refresh
curl -X POST http://localhost:4000/api/v1/auth/renovar \
  -H "Content-Type: application/json" \
  -d '{ "refreshToken": "eyJhbGc..." }'
```

### Create Work with Evidence

```bash
# 1. Create work
curl -X POST http://localhost:4000/api/v1/obras \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Casa Nova",
    "address": {
      "street": "Rua A",
      "number": "123",
      "city": "São Paulo",
      "state": "SP",
      "zipCode": "01234-567",
      "latitude": -23.5505,
      "longitude": -46.6756
    }
  }'

# Response: { "obraId": "uuid", ... }
export OBRA_ID="uuid"

# 2. Get etapas (stages) for this work
curl "http://localhost:4000/api/v1/etapas/obra/$OBRA_ID" \
  -H "Authorization: Bearer $TOKEN"

# Response: { "items": [ { "etapaId": "uuid", ... } ] }
export ETAPA_ID="uuid"

# 3. Upload evidence photo
curl -X POST "http://localhost:4000/api/v1/evidencias/etapa/$ETAPA_ID/upload" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@photo.jpg" \
  -F "description=Fundação pronta"

# 4. Get evidence list
curl "http://localhost:4000/api/v1/evidencias/etapa/$ETAPA_ID" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Related Documentation

- **README.md** — Project overview
- **DEPLOYMENT.md** — Deployment & infrastructure
- **SECURITY.md** — Security guidelines and OWASP checklist
- **CLAUDE.md** — Architecture & project structure
- **docs/API_ENDPOINTS.md** — Detailed endpoint reference
- **Swagger UI:** http://localhost:4000/docs

---

## Support

- **API Issues:** Create GitHub issue with `[api]` tag
- **Schema Questions:** Check `packages/schemas/src`
- **Contact:** contato.vinicaetano93@gmail.com

# 📚 API Documentation — imobi Backend

**Date:** 31 de Maio de 2026  
**Version:** 1.0.0  
**Base URL:** `http://localhost:4000/api/v1` (dev) | `https://imobi-api.railway.app/api/v1` (prod)  
**Status:** ✅ Production Ready

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Health Endpoints](#health-endpoints)
4. [Authentication Endpoints](#authentication-endpoints)
5. [User Endpoints](#user-endpoints)
6. [Credit Endpoints](#credit-endpoints)
7. [KYC Endpoints](#kyc-endpoints)
8. [Works (Obras) Endpoints](#works-obras-endpoints)
9. [Stages (Etapas) Endpoints](#stages-etapas-endpoints)
10. [Evidence Endpoints](#evidence-endpoints)
11. [Error Codes](#error-codes)
12. [Rate Limiting](#rate-limiting)
13. [Authentication & Authorization](#authentication--authorization)

---

## Overview

### API Characteristics

- **Framework:** NestJS + Fastify
- **Database:** PostgreSQL with Prisma ORM
- **Cache:** Redis (10-min TTL on profile, 5-min on works)
- **Authentication:** JWT Bearer tokens + HttpOnly cookies
- **Security:** CORS, CSP, HSTS headers enabled
- **Rate Limiting:** Per-endpoint configuration (10-30 req/60sec)

### Base Response Structure

All responses follow this pattern:

```json
{
  "statusCode": 200,
  "data": {},
  "message": "Success message (optional)",
  "timestamp": "2026-05-31T14:52:02.079Z"
}
```

Error responses:

```json
{
  "statusCode": 400,
  "message": "Error description",
  "error": "ERROR_CODE"
}
```

---

## Authentication

### Token Flow

1. User registers or logs in → receives `accessToken` (JWT)
2. `refreshToken` stored as HttpOnly cookie (7-day expiry)
3. Access protected endpoints with `Authorization: Bearer <accessToken>`
4. Token expires after 24 hours
5. Use `POST /auth/renovar` to refresh tokens

### JWT Token Structure

```
Header: { alg: "HS256", typ: "JWT" }
Payload: { 
  sub: "userId",
  email: "user@example.com",
  iat: 1234567890,
  exp: 1234671490
}
Signature: HMACSHA256(base64UrlEncode(header) + "." + base64UrlEncode(payload))
```

### Security Notes

- ✅ Access tokens valid for 24 hours
- ✅ Refresh tokens valid for 7 days
- ✅ Tokens are encrypted when stored
- ✅ All requests over HTTPS in production
- ✅ CORS origin validation required
- ✅ Rate limiting on auth endpoints

---

## Health Endpoints

### Get Health Status

```http
GET /health
```

**No authentication required**

**Response (200 OK):**
```json
{
  "statusCode": 200,
  "status": "healthy",
  "database": "connected",
  "redis": "connected",
  "uptime": 1234.56
}
```

### Get Liveness

```http
GET /health/live
```

**Returns:** `200 OK` if API is running

### Get Readiness

```http
GET /health/ready
```

**Returns:** `200 OK` if API and dependencies are ready  
**Returns:** `503 Service Unavailable` if not ready

---

## Authentication Endpoints

### Register New User

```http
POST /auth/registrar
Content-Type: application/json
```

**Request Body:**
```json
{
  "nome": "João Silva",
  "cpf": "11144477735",
  "telefone": "11999999999",
  "email": "joao@example.com",
  "senha": "SecurePass123!",
  "tipo": "TOMADOR"
}
```

**Validation Rules:**
- `nome`: String, min 3 chars
- `cpf`: Valid Brazilian CPF (modulo-11 checksum)
- `telefone`: Valid phone format (11 digits)
- `email`: Valid email, must be unique
- `senha`: Min 8 chars, uppercase, number, special char
- `tipo`: One of `TOMADOR`, `GESTOR_OBRA`, `ADMIN`

**Response (201 Created):**
```json
{
  "statusCode": 201,
  "usuario": {
    "id": "10a758e0-98e0-4499-a472-41d236f4151e",
    "nome": "João Silva",
    "email": "joao@example.com"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Headers:** 
- `Set-Cookie: refreshToken=...` (HttpOnly, Secure, SameSite=strict)

**Error Responses:**
- `400 Bad Request` — Validation failed (invalid CPF, duplicate email, etc)
- `429 Too Many Requests` — Rate limit exceeded (10 requests/60sec)

---

### Login

```http
POST /auth/login
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "joao@example.com",
  "senha": "SecurePass123!"
}
```

**Response (200 OK):**
```json
{
  "statusCode": 200,
  "usuario": {
    "id": "10a758e0-98e0-4499-a472-41d236f4151e",
    "nome": "João Silva",
    "email": "joao@example.com",
    "tipo": "TOMADOR"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Headers:**
- `Set-Cookie: refreshToken=...` (HttpOnly, Secure, SameSite=strict)

**Error Responses:**
- `401 Unauthorized` — Invalid credentials or user not found
- `429 Too Many Requests` — Rate limit exceeded (10 attempts/60sec)

---

### Refresh Tokens

```http
POST /auth/renovar
Content-Type: application/json
Authorization: Bearer <accessToken>
```

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

*Alternative: refreshToken can be sent as HttpOnly cookie*

**Response (200 OK):**
```json
{
  "statusCode": 200,
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Headers:**
- `Set-Cookie: refreshToken=...` (rotated, same 7-day expiry)

**Error Responses:**
- `401 Unauthorized` — Invalid or expired refresh token
- `429 Too Many Requests` — Rate limit exceeded (10 requests/60sec)

---

### Logout

```http
POST /auth/logout
Content-Type: application/json
Authorization: Bearer <accessToken>
```

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (204 No Content):**
```
[No body]
```

**Headers:**
- `Set-Cookie: refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC;` (deleted)

**Effect:**
- RefreshToken is revoked
- User cannot renew access tokens
- Must login again to get new tokens

---

## User Endpoints

### Get User Profile

```http
GET /usuarios/meu-perfil
Authorization: Bearer <accessToken>
```

**Authentication:** Required ✅

**Cache:** 10 minutes (Redis)

**Response (200 OK):**
```json
{
  "statusCode": 200,
  "usuarioId": "10a758e0-98e0-4499-a472-41d236f4151e",
  "nome": "João Silva",
  "email": "joao@example.com",
  "tipo": "TOMADOR",
  "cpf": "11144477735",
  "telefone": "11999999999",
  "kycStatus": "PENDENTE",
  "criadoEm": "2026-05-31T14:52:02.079Z",
  "atualizadoEm": "2026-05-31T14:52:02.079Z"
}
```

**Status Values:**
- `PENDENTE` — No documents uploaded yet
- `ENVIADO` — Documents submitted, awaiting review
- `APROVADO` — KYC approved, user can request credit
- `REJEITADO` — Documents rejected, resubmission required

**Error Responses:**
- `401 Unauthorized` — Invalid or missing token
- `404 Not Found` — User not found

---

### Update User Profile

```http
PATCH /usuarios/meu-perfil
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Request Body:**
```json
{
  "nome": "João da Silva",
  "telefone": "11988888888"
}
```

**Response (200 OK):**
```json
{
  "statusCode": 200,
  "usuarioId": "10a758e0-98e0-4499-a472-41d236f4151e",
  "nome": "João da Silva",
  "telefone": "11988888888",
  "email": "joao@example.com"
}
```

**Updatable Fields:**
- `nome` — User's full name
- `telefone` — Phone number (validation applied)

**Error Responses:**
- `400 Bad Request` — Invalid phone format
- `401 Unauthorized` — Invalid or missing token

---

## Credit Endpoints

### Simulate Credit

```http
POST /credito/simular
Content-Type: application/json
```

**No authentication required**

**Request Body:**
```json
{
  "valorSolicitado": 50000,
  "prazoMeses": 24,
  "tipoObra": "RESIDENCIAL"
}
```

**Validation:**
- `valorSolicitado`: Number, min 10000, max 1000000
- `prazoMeses`: Integer, min 12, max 180 (months)
- `tipoObra`: One of `RESIDENCIAL`, `COMERCIAL`, `INDUSTRIAL`

**Response (200 OK):**
```json
{
  "statusCode": 200,
  "parcelaMensal": 2350.8726300335097,
  "totalPago": 56420.94312080424,
  "totalJuros": 6420.943120804237,
  "cet": 6.227061637611198
}
```

**Calculation Details:**
- Uses different interest rates per work type
- CET (Custo Efetivo Total) includes all fees
- Results are real-time, based on current rates

**Example Scenarios:**

| Value | Term | Type | Monthly | Total | CET |
|-------|------|------|---------|-------|-----|
| R$50k | 24mo | Residential | R$2,350.87 | R$56,420 | 6.23% |
| R$200k | 48mo | Commercial | R$5,254.99 | R$252,240 | 5.97% |
| R$100k | 36mo | Industrial | R$2,987.65 | R$107,555 | 6.45% |

---

### Request Credit

```http
POST /credito/solicitar
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Authentication:** Required ✅

**Request Body:**
```json
{
  "valorSolicitado": 50000,
  "prazoMeses": 24,
  "tipoObra": "RESIDENCIAL",
  "obraId": "obra-uuid"
}
```

**Response (201 Created):**
```json
{
  "statusCode": 201,
  "creditoId": "credito-uuid",
  "usuarioId": "user-uuid",
  "valorSolicitado": 50000,
  "status": "PENDENTE_ANALISE",
  "parcelaMensal": 2350.87,
  "criadoEm": "2026-05-31T14:52:02.079Z"
}
```

**Status Values:**
- `PENDENTE_ANALISE` — Awaiting credit analyst review
- `APROVADO` — Credit approved, awaiting disbursement
- `ATIVO` — Credit granted, payments active
- `QUITADO` — Credit fully paid off
- `REJEITADO` — Application denied

**Error Responses:**
- `400 Bad Request` — Invalid parameters
- `401 Unauthorized` — User not authenticated
- `403 Forbidden` — User KYC not approved
- `409 Conflict` — Credit already exists for this work

---

### Get User Credits

```http
GET /credito/meus
Authorization: Bearer <accessToken>
```

**Authentication:** Required ✅

**Response (200 OK):**
```json
{
  "statusCode": 200,
  "creditos": [
    {
      "creditoId": "credito-uuid",
      "valorSolicitado": 50000,
      "status": "ATIVO",
      "parcelaMensal": 2350.87,
      "criadoEm": "2026-05-31T14:52:02.079Z"
    }
  ]
}
```

---

### Get Credit Statement (Extrato)

```http
GET /credito/{creditoId}/extrato
Authorization: Bearer <accessToken>
```

**Authentication:** Required ✅

**Parameters:**
- `creditoId` — UUID of the credit

**Cache:** 5 minutes (Redis)

**Response (200 OK):**
```json
{
  "statusCode": 200,
  "creditoId": "credito-uuid",
  "valorOriginal": 50000,
  "valorPago": 7076.10,
  "valorRestante": 42923.90,
  "parcelasMensais": [
    {
      "numero": 1,
      "dataPagamento": "2026-06-30",
      "valor": 2350.87,
      "status": "PAGO"
    },
    {
      "numero": 2,
      "dataPagamento": "2026-07-30",
      "valor": 2350.87,
      "status": "PENDENTE"
    }
  ]
}
```

**Error Responses:**
- `401 Unauthorized` — User not authenticated
- `403 Forbidden` — Access denied (not owner of credit)
- `404 Not Found` — Credit not found

---

## KYC Endpoints

### Upload Document

```http
POST /kyc/upload
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Authentication:** Required ✅

**Request Body:**
```json
{
  "tipo": "IDENTIDADE",
  "url": "https://s3.amazonaws.com/bucket/documento.pdf"
}
```

**Accepted Types:**
- `IDENTIDADE` — ID document (CPF, RG, or Passport)
- `COMPROVANTE_RENDA` — Proof of income
- `COMPROVANTE_ENDERECO` — Proof of address
- `DOCUMENTACAO_OBRA` — Work-related documentation

**Response (201 Created):**
```json
{
  "statusCode": 201,
  "documentoId": "doc-uuid",
  "tipo": "IDENTIDADE",
  "status": "PENDENTE_ANALISE",
  "url": "https://s3.amazonaws.com/bucket/documento.pdf",
  "criadoEm": "2026-05-31T14:52:02.079Z"
}
```

**Document Status Values:**
- `PENDENTE_ANALISE` — Awaiting review
- `APROVADO` — Document approved
- `REJEITADO` — Document rejected (see `motivoRejeicao`)

---

### List Documents

```http
GET /kyc/documentos
Authorization: Bearer <accessToken>
```

**Authentication:** Required ✅

**Response (200 OK):**
```json
{
  "statusCode": 200,
  "documentos": [
    {
      "documentoId": "doc-uuid",
      "tipo": "IDENTIDADE",
      "status": "APROVADO",
      "url": "https://s3.amazonaws.com/bucket/documento.pdf",
      "criadoEm": "2026-05-31T14:52:02.079Z"
    }
  ]
}
```

---

### Get KYC Status

```http
GET /kyc/status
Authorization: Bearer <accessToken>
```

**Authentication:** Required ✅

**Response (200 OK):**
```json
{
  "statusCode": 200,
  "usuarioId": "user-uuid",
  "status": "PENDENTE",
  "documentos": [
    {
      "tipo": "IDENTIDADE",
      "status": "APROVADO"
    }
  ],
  "resumo": {
    "pendentes": 2,
    "aprovados": 1,
    "rejeitados": 0
  }
}
```

**Overall Status:**
- `NENHUM` — No documents uploaded yet
- `PENDENTE` — Documents uploaded, some pending review
- `APROVADO` — All required documents approved
- `REJEITADO` — One or more documents rejected

---

### Verify KYC Complete

```http
GET /kyc/verificar
Authorization: Bearer <accessToken>
```

**Authentication:** Required ✅

**Response (200 OK):**
```json
{
  "statusCode": 200,
  "completo": true,
  "mensagem": "KYC verification complete"
}
```

**or**

```json
{
  "statusCode": 200,
  "completo": false,
  "faltam": ["COMPROVANTE_RENDA", "COMPROVANTE_ENDERECO"],
  "mensagem": "Missing documents"
}
```

---

### List Pending Documents (Admin/Manager only)

```http
GET /kyc/pendentes
Authorization: Bearer <accessToken>
```

**Authentication:** Required ✅  
**Authorization:** ADMIN or GESTOR_OBRA only

**Response (200 OK):**
```json
{
  "statusCode": 200,
  "documentos": [
    {
      "documentoId": "doc-uuid",
      "usuarioId": "user-uuid",
      "usuarioNome": "João Silva",
      "tipo": "IDENTIDADE",
      "status": "PENDENTE_ANALISE",
      "criadoEm": "2026-05-31T14:52:02.079Z"
    }
  ]
}
```

---

### Approve Document (Admin/Manager only)

```http
PATCH /kyc/{documentoId}/aprovar
Authorization: Bearer <accessToken>
```

**Authentication:** Required ✅  
**Authorization:** ADMIN or GESTOR_OBRA only

**Response (200 OK):**
```json
{
  "statusCode": 200,
  "documentoId": "doc-uuid",
  "status": "APROVADO",
  "aprovadoPor": "admin-user-id",
  "dataAprovacao": "2026-05-31T14:52:02.079Z"
}
```

---

### Reject Document (Admin/Manager only)

```http
PATCH /kyc/{documentoId}/rejeitar
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Request Body:**
```json
{
  "motivo": "Documento ilegível, favor reenviar"
}
```

**Response (200 OK):**
```json
{
  "statusCode": 200,
  "documentoId": "doc-uuid",
  "status": "REJEITADO",
  "motivoRejeicao": "Documento ilegível, favor reenviar",
  "rejeitadoPor": "admin-user-id"
}
```

---

## Works (Obras) Endpoints

### Create Work

```http
POST /obras
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Authentication:** Required ✅

**Request Body:**
```json
{
  "nome": "Reforma Residencial - Apto 101",
  "endereco": "Rua das Flores, 123 - São Paulo, SP",
  "tipo": "RESIDENCIAL",
  "dataInicio": "2026-06-01",
  "dataFim": "2026-12-31",
  "latitude": -23.5505,
  "longitude": -46.6333,
  "descricao": "Reforma completa de apartamento"
}
```

**Response (201 Created):**
```json
{
  "statusCode": 201,
  "obraId": "obra-uuid",
  "nome": "Reforma Residencial - Apto 101",
  "status": "ATIVA",
  "criadoEm": "2026-05-31T14:52:02.079Z"
}
```

---

### List Works

```http
GET /obras
Authorization: Bearer <accessToken>
```

**Authentication:** Required ✅

**Cache:** 5 minutes (Redis)

**Response (200 OK):**
```json
{
  "statusCode": 200,
  "obras": [
    {
      "obraId": "obra-uuid",
      "nome": "Reforma Residencial - Apto 101",
      "tipo": "RESIDENCIAL",
      "status": "ATIVA",
      "dataInicio": "2026-06-01",
      "dataFim": "2026-12-31",
      "criadoEm": "2026-05-31T14:52:02.079Z"
    }
  ]
}
```

---

### Get Work Details

```http
GET /obras/{obraId}
Authorization: Bearer <accessToken>
```

**Authentication:** Required ✅

**Response (200 OK):**
```json
{
  "statusCode": 200,
  "obraId": "obra-uuid",
  "nome": "Reforma Residencial - Apto 101",
  "endereco": "Rua das Flores, 123 - São Paulo, SP",
  "tipo": "RESIDENCIAL",
  "status": "ATIVA",
  "dataInicio": "2026-06-01",
  "dataFim": "2026-12-31",
  "latitude": -23.5505,
  "longitude": -46.6333,
  "progresso": 35,
  "etapas": 5
}
```

---

### Get Work Progress

```http
GET /obras/{obraId}/progresso
```

**No authentication required**

**Response (200 OK):**
```json
{
  "statusCode": 200,
  "obraId": "obra-uuid",
  "progresso": 35,
  "etapasTotal": 5,
  "etapasCompletas": 2,
  "ultimaAtualizacao": "2026-05-31T14:52:02.079Z"
}
```

---

## Stages (Etapas) Endpoints

### List Work Stages

```http
GET /etapas/obra/{obraId}
Authorization: Bearer <accessToken>
```

**Authentication:** Required ✅

**Response (200 OK):**
```json
{
  "statusCode": 200,
  "etapas": [
    {
      "etapaId": "etapa-uuid",
      "obraId": "obra-uuid",
      "numero": 1,
      "nome": "Demolição e Limpeza",
      "status": "COMPLETA",
      "dataInicio": "2026-06-01",
      "dataFim": "2026-06-15",
      "criadoEm": "2026-05-31T14:52:02.079Z"
    }
  ]
}
```

**Stage Status Values:**
- `PLANEJADA` — Scheduled, not started
- `EM_PROGRESSO` — Currently in progress
- `COMPLETA` — Finished and approved
- `REJEITADA` — Failed validation, needs redo

---

### Approve Stage

```http
PATCH /etapas/{etapaId}/aprovar
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Authentication:** Required ✅

**Request Body:**
```json
{
  "observacao": "Etapa concluída conforme especificado"
}
```

**Response (200 OK):**
```json
{
  "statusCode": 200,
  "etapaId": "etapa-uuid",
  "status": "COMPLETA",
  "aprovadoPor": "user-uuid",
  "dataAprovacao": "2026-05-31T14:52:02.079Z"
}
```

---

### Update Stage Status (Admin/Manager only)

```http
PATCH /etapas/{etapaId}/status
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Authentication:** Required ✅  
**Authorization:** ADMIN or GESTOR_OBRA only

**Request Body:**
```json
{
  "status": "EM_PROGRESSO"
}
```

**Response (200 OK):**
```json
{
  "statusCode": 200,
  "etapaId": "etapa-uuid",
  "status": "EM_PROGRESSO"
}
```

---

## Evidence Endpoints

### Upload Evidence

```http
POST /evidencias
Authorization: Bearer <accessToken>
Content-Type: multipart/form-data
```

**Authentication:** Required ✅

**Rate Limit:** 5 uploads per 60 seconds

**Form Data:**
```
etapaId: "etapa-uuid"
latitude: "-23.5505"
longitude: "-46.6333"
descricao: "Photo of completed foundation"
imagem: [binary image file]
```

**Response (201 Created):**
```json
{
  "statusCode": 201,
  "evidenciaId": "evidencia-uuid",
  "etapaId": "etapa-uuid",
  "status": "PENDENTE_VALIDACAO",
  "url": "https://s3.amazonaws.com/bucket/evidencia.jpg",
  "criadoEm": "2026-05-31T14:52:02.079Z"
}
```

**Evidence Status Values:**
- `PENDENTE_VALIDACAO` — Awaiting location validation
- `VALIDADA` — GPS location confirmed
- `REJEITADA` — Not close enough to work site
- `APROVADA` — Approved by manager

---

### List Evidence by Stage

```http
GET /evidencias/etapa/{etapaId}
Authorization: Bearer <accessToken>
```

**Authentication:** Required ✅

**Response (200 OK):**
```json
{
  "statusCode": 200,
  "evidencias": [
    {
      "evidenciaId": "evidencia-uuid",
      "etapaId": "etapa-uuid",
      "status": "VALIDADA",
      "url": "https://s3.amazonaws.com/bucket/evidencia.jpg",
      "latitude": -23.5505,
      "longitude": -46.6333,
      "distanciaDoLocal": 15.3,
      "criadoEm": "2026-05-31T14:52:02.079Z"
    }
  ]
}
```

**distanciaDoLocal:** Distance in meters from work site center

---

### Validate Evidence

```http
PATCH /evidencias/{evidenciaId}/validar
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Authentication:** Required ✅

**Request Body:**
```json
{
  "aprovado": true,
  "observacao": "Localização confirmada, distância 12m do local"
}
```

**Response (200 OK):**
```json
{
  "statusCode": 200,
  "evidenciaId": "evidencia-uuid",
  "status": "APROVADA",
  "validadoPor": "user-uuid",
  "dataValidacao": "2026-05-31T14:52:02.079Z"
}
```

---

## Error Codes

### HTTP Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 204 | No Content | Success with no body (logout) |
| 400 | Bad Request | Invalid parameters |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource already exists |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Server Error | Internal server error |
| 503 | Service Unavailable | Database or service down |

### Error Response Example

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "INVALID_CPF",
  "details": {
    "field": "cpf",
    "value": "00000000000",
    "reason": "Invalid CPF checksum"
  }
}
```

### Common Error Codes

| Code | Description |
|------|-------------|
| `INVALID_CPF` | CPF failed modulo-11 validation |
| `DUPLICATE_EMAIL` | Email already registered |
| `INVALID_PASSWORD` | Password doesn't meet requirements |
| `INVALID_PHONE` | Phone format incorrect |
| `USER_NOT_FOUND` | User doesn't exist |
| `INVALID_TOKEN` | JWT token invalid or expired |
| `INSUFFICIENT_PERMISSIONS` | User role lacks required permission |
| `RATE_LIMIT_EXCEEDED` | Too many requests on this endpoint |
| `RESOURCE_NOT_FOUND` | Requested resource doesn't exist |
| `DATABASE_ERROR` | Database operation failed |

---

## Rate Limiting

### Per-Endpoint Configuration

| Endpoint | Limit | Window |
|----------|-------|--------|
| `POST /auth/registrar` | 10 | 60 sec |
| `POST /auth/login` | 10 | 60 sec |
| `POST /auth/renovar` | 10 | 60 sec |
| `POST /evidencias` | 5 | 60 sec |
| `PATCH /kyc/:id/aprovar` | 30 | 60 sec |
| `PATCH /kyc/:id/rejeitar` | 30 | 60 sec |

### Rate Limit Headers

```http
HTTP/1.1 200 OK
RateLimit-Limit: 10
RateLimit-Remaining: 9
RateLimit-Reset: 1685632320
```

### When Limit Exceeded

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
Retry-After: 45

{
  "statusCode": 429,
  "message": "Too many requests, please try again later",
  "error": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 45
}
```

---

## Authentication & Authorization

### User Roles

| Role | Permission |
|------|------------|
| `TOMADOR` | Request credit, upload documents, view own data |
| `GESTOR_OBRA` | Manage works, approve stages, validate evidence |
| `ADMIN` | Full system access, approve documents |

### Protected Endpoints

All endpoints except these require authentication:

**Public Endpoints:**
- `POST /auth/registrar` — Register
- `POST /auth/login` — Login
- `POST /credito/simular` — Credit simulation
- `GET /health` — Health check
- `GET /health/live` — Liveness
- `GET /health/ready` — Readiness
- `GET /obras/{id}/progresso` — Work progress

**All Other Endpoints:** Require valid JWT token in `Authorization: Bearer <token>` header

### Authorization Rules

| Endpoint | TOMADOR | GESTOR_OBRA | ADMIN |
|----------|---------|-------------|-------|
| `GET /usuarios/meu-perfil` | ✅ Own | ✅ Own | ✅ Own |
| `PATCH /usuarios/meu-perfil` | ✅ Own | ✅ Own | ✅ Own |
| `POST /credito/solicitar` | ✅ | ❌ | ❌ |
| `POST /kyc/upload` | ✅ Own | ✅ | ✅ |
| `POST /obras` | ✅ | ✅ | ✅ |
| `GET /kyc/pendentes` | ❌ | ✅ | ✅ |
| `PATCH /kyc/:id/aprovar` | ❌ | ✅ | ✅ |
| `PATCH /etapas/:id/status` | ❌ | ✅ | ✅ |

### Ownership Validation (IDOR Prevention)

Endpoints validate that users can only access their own resources:

```typescript
// Example: Get credit statement
if (credito.usuarioId !== user.id && user.tipo !== 'ADMIN') {
  throw new ForbiddenException('Access denied');
}
```

---

## API Testing Guide

### Using cURL

**Register:**
```bash
curl -X POST http://localhost:4000/api/v1/auth/registrar \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Test User",
    "cpf": "11144477735",
    "email": "test@example.com",
    "telefone": "11999999999",
    "senha": "TestPass123!",
    "tipo": "TOMADOR"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "senha": "TestPass123!"
  }'
```

**Get Profile (with token):**
```bash
curl -X GET http://localhost:4000/api/v1/usuarios/meu-perfil \
  -H "Authorization: Bearer eyJhbGc..."
```

**Simulate Credit:**
```bash
curl -X POST http://localhost:4000/api/v1/credito/simular \
  -H "Content-Type: application/json" \
  -d '{
    "valorSolicitado": 50000,
    "prazoMeses": 24,
    "tipoObra": "RESIDENCIAL"
  }'
```

### Using Postman/Insomnia

1. Import base URL: `http://localhost:4000/api/v1`
2. Setup environment variables:
   - `{{base_url}}` = API base URL
   - `{{token}}` = JWT access token
   - `{{user_id}}` = Current user ID
3. Use `Authorization: Bearer {{token}}` in headers
4. Test endpoints in order (register → login → protected endpoints)

---

## Swagger Documentation

**Live Documentation Available at:**
- Development: `http://localhost:4000/api/docs`
- Production: `https://imobi-api.railway.app/api/docs`

Interactive API documentation with live testing capabilities.

---

## Support & Changelog

**API Version:** 1.0.0  
**Last Updated:** 2026-05-31  
**Status:** ✅ Production Ready

**For Issues or Questions:**
- Report via GitHub Issues
- Contact: contato.vinicaetano93@gmail.com

---

**End of API Documentation**

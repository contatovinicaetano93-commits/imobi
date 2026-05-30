# imobi API Documentation

**Version:** 1.0.0 | **Status:** 🟢 Production Ready | **Last Updated:** May 2026

## Quick Links

- **Swagger/OpenAPI UI:** `/api/v1/docs` (interactive testing)
- **Postman Collection:** `dist/imbobi-api.postman_collection.json` (import into Postman)
- **GitHub Repository:** [imobi](https://github.com/contatovinicaetano93-commits/imobi)

## Base URLs

| Environment | URL |
|---|---|
| **Production** | `https://api.imbobi.com/api/v1` |
| **Staging** | `https://api-staging.imbobi.com/api/v1` |
| **Development** | `http://localhost:4000/api/v1` |

## Authentication & Authorization

### Token Types

**AccessToken (JWT Bearer)**
- **Duration:** 15 minutes
- **Format:** `Authorization: Bearer <token>`
- **Header:** Sent with every authenticated request

**RefreshToken (HttpOnly Cookie)**
- **Duration:** 7 days
- **Storage:** Automatic (HttpOnly, Secure, SameSite=Strict)
- **Renewal:** Use `/auth/renovar` endpoint
- **Rotation:** New token issued on every refresh

### Authentication Flow

```
1. POST /auth/registrar or /auth/login
   ↓
   ← Returns: accessToken (body) + refreshToken (cookie)
   
2. Store: accessToken in memory, refreshToken in cookie (automatic)
   
3. For each request:
   GET /protected
   Headers: Authorization: Bearer <accessToken>
   Cookies: refreshToken=<token> (sent automatically)
   
4. If 401 (token expired):
   POST /auth/renovar
   ← Returns: new accessToken
   
5. On logout:
   POST /auth/logout
   ← Clear tokens and cookies
```

## Error Responses

All errors follow this standard format:

```json
{
  "statusCode": 400,
  "message": "Human-readable error message",
  "error": "ErrorType"
}
```

**Example - Validation Error:**
```json
{
  "statusCode": 400,
  "message": "Validação falhou",
  "error": "Bad Request",
  "details": {
    "email": "Email já registrado",
    "cpf": "CPF inválido"
  }
}
```

## Endpoints

### Authentication

#### Register User
```
POST /auth/registrar
Content-Type: application/json

{
  "nome": "João da Silva",
  "cpf": "12345678901",
  "telefone": "11999999999",
  "email": "joao@example.com",
  "senha": "senha@123",
  "tipo": "TOMADOR"
}

Response:
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc..."
}
```

#### Login
```
POST /auth/login
Content-Type: application/json

{
  "email": "joao@example.com",
  "senha": "senha@123"
}

Response:
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc..."
}
```

#### Refresh Token
```
POST /auth/refresh
Content-Type: application/json
Authorization: Bearer <refreshToken>

Response:
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc..."
}
```

#### Logout
```
POST /auth/logout
Authorization: Bearer <accessToken>
```

### KYC (Know Your Customer)

#### Get KYC Status
```
GET /kyc/status
Authorization: Bearer <accessToken>

Response:
{
  "status": "NENHUM | ENVIADO | APROVADO | REJEITADO",
  "documents": [
    {
      "id": "uuid",
      "type": "RG | CPF | COMPROVANTE_ENDERECO",
      "url": "s3://...",
      "uploadedAt": "2026-05-29T10:00:00Z",
      "status": "PENDENTE | APROVADO | REJEITADO",
      "rejectionReason": "Optional rejection reason"
    }
  ]
}
```

#### Upload KYC Document
```
POST /kyc/upload
Authorization: Bearer <accessToken>
Content-Type: multipart/form-data

Form Data:
- file: <image file>
- documentType: "RG" | "CPF" | "COMPROVANTE_ENDERECO"

Response:
{
  "id": "uuid",
  "type": "RG",
  "url": "s3://...",
  "uploadedAt": "2026-05-29T10:00:00Z"
}
```

### Credit Simulator

#### Get Credit Terms
```
GET /credito/simular?valor=100000&prazo=60
Authorization: Bearer <accessToken>

Response:
{
  "valor": 100000,
  "prazo": 60,
  "taxaMensal": 0.0145,
  "jurosTotal": 45000,
  "cet": 0.1750,
  "parcelas": [
    {
      "numero": 1,
      "valor": 1733.33,
      "juros": 1450
    }
  ]
}
```

### Work Management

#### List Works
```
GET /obras?page=1&limit=10
Authorization: Bearer <accessToken>

Response:
{
  "data": [
    {
      "id": "uuid",
      "titulo": "Reforma da Casa",
      "localizacao": {
        "latitude": -23.5505,
        "longitude": -46.6333
      },
      "valor": 50000,
      "status": "EM_ANDAMENTO | CONCLUIDA"
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 10
}
```

#### Get Work Details
```
GET /obras/:id
Authorization: Bearer <accessToken>

Response:
{
  "id": "uuid",
  "titulo": "Reforma da Casa",
  "descricao": "...",
  "localizacao": {
    "latitude": -23.5505,
    "longitude": -46.6333
  },
  "valor": 50000,
  "status": "EM_ANDAMENTO",
  "dataCriacao": "2026-05-29T10:00:00Z"
}
```

### Evidence Upload

#### Upload Evidence
```
POST /evidencias
Authorization: Bearer <accessToken>
Content-Type: multipart/form-data

Form Data:
- file: <image file>
- obraId: "uuid"
- latitude: -23.5505
- longitude: -46.6333
- accuracy: 15.0

Response:
{
  "id": "uuid",
  "obraId": "uuid",
  "url": "s3://...",
  "localizacao": {
    "latitude": -23.5505,
    "longitude": -46.6333
  },
  "uploadedAt": "2026-05-29T10:00:00Z"
}
```

#### List Evidence for Work
```
GET /evidencias/:obraId
Authorization: Bearer <accessToken>

Response:
{
  "data": [
    {
      "id": "uuid",
      "url": "s3://...",
      "uploadedAt": "2026-05-29T10:00:00Z",
      "localizacao": {
        "latitude": -23.5505,
        "longitude": -46.6333
      }
    }
  ]
}
```

### Installments

#### Get Installments
```
GET /parcelas/:obraId
Authorization: Bearer <accessToken>

Response:
{
  "data": [
    {
      "id": "uuid",
      "numero": 1,
      "valor": 5000,
      "dataPagamento": "2026-06-29",
      "status": "ABERTA | PAGA | VENCIDA",
      "dataLiberacao": "2026-06-29T10:00:00Z"
    }
  ]
}
```

#### Pay Installment
```
POST /parcelas/:parcelaId/pagar
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "metodo": "PIX | CARTAO",
  "referencia": "pix-key-or-token"
}

Response:
{
  "id": "uuid",
  "status": "PROCESSANDO",
  "dataProcessamento": "2026-05-29T10:00:00Z"
}
```

## Rate Limiting

All endpoints are rate-limited as follows:
- Authentication endpoints: 5 requests/minute per IP
- KYC endpoints: 10 requests/minute per user
- General endpoints: 100 requests/minute per user
- Worker endpoints: 1000 requests/minute per IP

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1685364000
```

## Security

### CORS
Allowed origins are configured via `CORS_ORIGIN` environment variable.

### CSRF
All state-changing requests (POST, PUT, DELETE, PATCH) require a valid CSRF token.

### Data Encryption
Sensitive fields are encrypted with AES-256-GCM:
- Refresh tokens
- CPF/CNPJ
- Phone numbers
- Bank account information

## Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK |
| 201 | Created |
| 204 | No Content |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 429 | Too Many Requests |
| 500 | Internal Server Error |

## Pagination

Endpoints returning lists support pagination:
```
GET /endpoint?page=1&limit=10&sort=-dataCriacao
```

Parameters:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10, max: 100)
- `sort`: Sort field with optional `-` prefix for descending

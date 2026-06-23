# Imobi API — OpenAPI 3.0 Specification

**Status**: Production Ready  
**API Version**: 1.0.0 (v1) & 2.0.0 (v2 coming soon)  
**Last Updated**: June 2026

---

## API Architecture

The Imobi API follows an **API-First** design with:
- ✅ OpenAPI 3.0.0 specification
- ✅ Semantic versioning (v1, v2, v3)
- ✅ Backwards-compatible defaults
- ✅ Tiered rate limiting (FREE/PREMIUM/ENTERPRISE)
- ✅ Structured error responses
- ✅ Full observability (metrics, tracing, logging)

---

## Base URLs

```
Development:  http://localhost:3000/api/v1
Staging:      https://staging-api.imobi.com/api/v1
Production:   https://api.imobi.com/api/v1

Documentation: /docs (Swagger UI, staging/dev only)
Metrics:       /api/v1/metrics (Prometheus format)
Health:        /api/v1/health
```

---

## Authentication

### JWT Bearer Token
```
Authorization: Bearer <jwt_token>
```

All authenticated endpoints require a valid JWT token with:
- **Issuer**: imobi-api
- **Expiry**: 15 minutes (renovável via refresh token)
- **Algorithm**: HS256

### Refresh Token
```json
POST /auth/renovar
{
  "refreshToken": "eyJhbGc..."
}
```

### API Key (Service-to-Service)
```
X-API-Key: <api-key>
```

---

## Rate Limiting

Rate limits are enforced per user tier across all API endpoints.

### Tier Configurations

| Tier | Requests/min | Auth | Upload | Manager | Notes |
|------|-------------|------|--------|---------|-------|
| **FREE** | 100 | 10 | 5 | 20 | Personal use |
| **PREMIUM** | 1,000 | 50 | 50 | 200 | Production use |
| **ENTERPRISE** | 10,000 | 500 | 500 | 2,000 | Large scale |

### Rate Limit Headers
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1624742400
```

### When Limited (HTTP 429)
```json
{
  "statusCode": 429,
  "message": "Too Many Requests",
  "error": "Rate limit exceeded. Retry after 60 seconds.",
  "retryAfter": 60
}
```

---

## Core Endpoints (v1)

### Authentication Module

#### Register User
```
POST /auth/registrar
Content-Type: application/json

{
  "nome": "João Silva",
  "email": "joao@example.com",
  "senha": "SecurePassword123!",
  "tipoConta": "PF" | "PJ"
}

Response 201:
{
  "id": "uuid",
  "email": "joao@example.com",
  "nome": "João Silva",
  "token": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "expiresIn": 900
}
```

#### Login
```
POST /auth/login
Content-Type: application/json

{
  "email": "joao@example.com",
  "senha": "SecurePassword123!"
}

Response 200:
{
  "id": "uuid",
  "token": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "expiresIn": 900,
  "usuario": { ... }
}
```

#### Logout
```
POST /auth/logout
Authorization: Bearer <token>
Content-Type: application/json

{
  "refreshToken": "eyJhbGc..."
}

Response 204 (No Content)
```

---

### User Management

#### Get User Profile
```
GET /usuarios/perfil
Authorization: Bearer <token>

Response 200:
{
  "id": "uuid",
  "nome": "João Silva",
  "email": "joao@example.com",
  "dataNascimento": "1990-01-15",
  "cpf": "11111111111",
  "estadoCivil": "SOLTEIRO",
  "telefone": "11999999999",
  "endereco": { ... },
  "tier": "PREMIUM",
  "ativo": true,
  "criadoEm": "2024-01-01T00:00:00Z"
}
```

#### Update User Profile
```
PUT /usuarios/perfil
Authorization: Bearer <token>
Content-Type: application/json

{
  "nome": "João Silva",
  "telefone": "11999999999",
  "endereco": { ... }
}

Response 200:
{ ... updated user ... }
```

---

### Credit Operations

#### Create Credit Application
```
POST /credito/solicitar
Authorization: Bearer <token>
Content-Type: application/json

{
  "obraId": "uuid",
  "valorSolicitado": 500000.00,
  "prazo": 180,
  "finalidade": "Reforma"
}

Response 201:
{
  "id": "uuid",
  "usuarioId": "uuid",
  "obraId": "uuid",
  "valorSolicitado": 500000.00,
  "valorAprovado": null,
  "status": "PENDENTE_ANALISE",
  "criadoEm": "2024-06-22T12:00:00Z"
}
```

#### Get Credit Status
```
GET /credito/:creditoId
Authorization: Bearer <token>

Response 200:
{
  "id": "uuid",
  "status": "APROVADO",
  "valorAprovado": 450000.00,
  "parcelas": [
    {
      "numero": 1,
      "valor": 45000.00,
      "dataVencimento": "2024-07-22",
      "status": "PENDENTE"
    },
    ...
  ]
}
```

---

### Document Management

#### Upload Document
```
POST /documentos/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

Form fields:
- file: <binary>
- tipoDocumento: "RG" | "CPF" | "COMPROVANTE_RENDA" | "ESCRITURA" | ...
- creditoId: "uuid" (optional)

Response 201:
{
  "id": "uuid",
  "nomeArquivo": "rg-scan.pdf",
  "tipoDocumento": "RG",
  "tamanho": 2048576,
  "urlArmazenamento": "https://s3.amazonaws.com/...",
  "status": "VERIFICANDO",
  "criadoEm": "2024-06-22T12:00:00Z"
}
```

#### List Documents
```
GET /documentos?creditoId=uuid&status=VERIFICADO
Authorization: Bearer <token>

Response 200:
{
  "items": [
    { ... document ... },
    ...
  ],
  "total": 5,
  "page": 1,
  "pageSize": 20
}
```

---

## Error Responses

All errors follow a consistent format:

```json
{
  "statusCode": 400,
  "message": "Validation error",
  "error": "BAD_REQUEST",
  "timestamp": "2024-06-22T12:00:00Z",
  "path": "/api/v1/auth/login",
  "details": [
    {
      "field": "email",
      "issue": "must be a valid email"
    }
  ]
}
```

### Common Status Codes

| Code | Meaning | Retry? |
|------|---------|--------|
| 200 | OK | No |
| 201 | Created | No |
| 400 | Bad Request | No |
| 401 | Unauthorized | No |
| 403 | Forbidden | No |
| 404 | Not Found | No |
| 409 | Conflict | No |
| 422 | Unprocessable Entity | No |
| 429 | Too Many Requests | Yes (after delay) |
| 500 | Internal Server Error | Yes (exponential backoff) |
| 502 | Bad Gateway | Yes (exponential backoff) |
| 503 | Service Unavailable | Yes (exponential backoff) |

---

## API Versioning Strategy

### v1 (Current - Stable)
- All endpoints at `/api/v1/*`
- Production-ready
- Backwards compatible by default
- Security: Full implementation

### v2 (Coming Soon)
- All endpoints at `/api/v2/*`
- Enhanced response envelope (includes version, timestamp, metadata)
- GraphQL experimental support
- Advanced filtering and sorting
- Webhooks for long-running operations

### Deprecation Policy
- Major versions are supported for minimum 12 months
- Deprecation notice provided 6 months before removal
- Response headers indicate deprecation status

```
Deprecation: true
Sunset: Wed, 22 Jun 2025 12:00:00 GMT
Link: </api/v2/...>; rel="successor-version"
```

---

## Rate Limiting Implementation

The API uses a **tiered rate limiting strategy**:

1. **Identify User Tier**: From JWT token or API key
2. **Get Tier Config**: Look up limit for endpoint and tier
3. **Check Rate**: Query Redis for request count in current window
4. **Increment Counter**: Add 1 to counter (expires after TTL)
5. **Return Headers**: Always include `X-RateLimit-*` headers

### Configuration (in TieredRateLimitService)

```typescript
this.tierConfigs: Record<UserTier, RateLimitConfig> = {
  FREE: { limit: 100, ttl: 60000, name: 'free' },
  PREMIUM: { limit: 1000, ttl: 60000, name: 'premium' },
  ENTERPRISE: { limit: 10000, ttl: 60000, name: 'enterprise' },
};

// Endpoint-specific overrides
this.endpointTierConfigs: Record<string, Record<UserTier, RateLimitConfig>> = {
  '/auth/registrar': {
    FREE: { limit: 10, ttl: 60000, name: 'free-auth' },
    PREMIUM: { limit: 50, ttl: 60000, name: 'premium-auth' },
    ENTERPRISE: { limit: 500, ttl: 60000, name: 'enterprise-auth' },
  },
  // ... more endpoints
};
```

---

## Pagination

List endpoints support pagination:

```
GET /documentos?page=1&pageSize=20&sortBy=criadoEm&sortOrder=DESC

Response:
{
  "items": [ ... ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

## Filtering & Searching

List endpoints support filtering:

```
GET /credito?status=APROVADO&usuarioId=uuid&valorMin=100000&valorMax=500000

Response:
{
  "items": [ ... ],
  "filters": {
    "status": "APROVADO",
    "usuarioId": "uuid",
    "valorRange": [100000, 500000]
  },
  "pagination": { ... }
}
```

---

## Observability

### Structured Logging
All requests and responses are logged as JSON:

```json
{
  "timestamp": "2024-06-22T12:00:00.000Z",
  "level": "INFO",
  "service": "imobi-api",
  "version": "1.0.0",
  "hostname": "api-server-01",
  "pid": 12345,
  "requestId": "req-1719052800000",
  "method": "POST",
  "url": "/api/v1/auth/login",
  "statusCode": 200,
  "duration": 245,
  "context": {
    "email": "joao@example.com",
    "tier": "PREMIUM"
  }
}
```

### Metrics Endpoint
```
GET /metrics

Returns: Prometheus format metrics including:
- http_request_duration_seconds
- http_requests_total
- database_query_duration_seconds
- circuit_breaker_state_changes_total
- cache_hits_total
- ... more
```

### Distributed Tracing
All requests include tracing context:

```
traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
tracestate: [vendor-specific data]
```

---

## Best Practices for API Consumers

### 1. Use Circuit Breaker Client-Side
```typescript
const client = new ImobiApiClient({
  baseUrl: 'https://api.imobi.com',
  token: 'your-jwt-token',
  circuitBreaker: {
    failureThreshold: 5,
    resetTimeout: 60000,
  },
});
```

### 2. Handle Rate Limiting Gracefully
```typescript
try {
  await client.post('/credito/solicitar', { ... });
} catch (error) {
  if (error.status === 429) {
    const retryAfter = parseInt(error.headers['retry-after'] || '60');
    setTimeout(() => retry(), retryAfter * 1000);
  }
}
```

### 3. Use Idempotency Keys for Critical Operations
```
POST /credito/liberar-parcela
Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000

Guarantees: If same key is sent again, result is cached (no double-debit)
```

### 4. Monitor Observability Headers
```
X-Request-ID: [unique ID for tracking]
X-RateLimit-Remaining: [requests left]
X-Response-Time-Ms: [latency]
```

---

## Swagger/OpenAPI Documentation

Interactive API documentation available at:

**Development**: http://localhost:3000/api/docs  
**Production**: https://api.imobi.com/api/docs

All endpoints are fully documented with:
- Request/response schemas
- Example payloads
- Error cases
- Rate limits
- Authentication requirements

---

## Webhook Events (v2 Roadmap)

Future support for webhooks on critical events:

```json
POST https://yourapp.com/webhooks/imobi
{
  "event": "credito.aprovado",
  "timestamp": "2024-06-22T12:00:00Z",
  "data": {
    "creditoId": "uuid",
    "usuarioId": "uuid",
    "valorAprovado": 450000
  }
}
```

---

## Support & Contact

- **API Issues**: api-support@imobi.com
- **Documentation**: https://docs.imobi.com
- **Status Page**: https://status.imobi.com
- **Community**: https://community.imobi.com

---

**Version**: 1.0.0  
**Last Updated**: June 2026  
**Next Review**: July 2026

# Structured Logging Strategy — imobi API

**Last Updated:** May 30, 2026  
**Status:** 🟢 Production Ready

## Overview

The imobi API implements a comprehensive structured logging system designed for production observability, debugging, and monitoring. All logs are JSON-formatted with rich contextual metadata, sensitive data redaction, and intelligent error categorization.

## Architecture

```
Request → RequestIdMiddleware → Controller → Service → Database
   ↓
   ├─ Generates unique request ID & trace ID
   ├─ Timestamps request start
   └─ Attaches context to Express Request object
       │
       ├─ StructuredLoggingInterceptor
       │  ├─ Logs successful responses with duration & size
       │  └─ Logs errors with categorization & severity
       │
       └─ StructuredExceptionFilter
          ├─ Catches uncaught exceptions
          ├─ Categorizes errors (Validation, Auth, Database, etc.)
          ├─ Redacts sensitive data
          └─ Returns structured JSON error response
```

## Key Components

### 1. Request ID Middleware

**Location:** `/src/common/middleware/request-id.middleware.ts`

Generates and injects request tracing information:

```typescript
// Generates unique identifiers for request tracing
- request.id: UUID or from x-request-id header
- request.traceId: UUID or from x-trace-id header
- request.startTime: Timestamp for duration calculation

// Response headers include:
- x-request-id: For client-side correlation
- x-trace-id: For distributed tracing
```

**Usage Example:**

```bash
# Client can optionally provide trace IDs
curl http://localhost:4000/api/v1/auth/login \
  -H "x-request-id: my-custom-id" \
  -H "x-trace-id: my-trace-id"

# Response includes trace IDs
x-request-id: my-custom-id
x-trace-id: my-trace-id
```

### 2. Data Redaction Utility

**Location:** `/src/common/utils/data-redaction.util.ts`

Automatically redacts sensitive information from logs:

**Sensitive Fields:**
- `senha`, `password`
- `token`, `refreshToken`, `accessToken`
- `cpf`, `cnpj`
- `creditCard`, `bankAccount`
- `apiKey`, `secret`

**Example:**

```typescript
// Input
{
  user: 'john@example.com',
  password: 'SecurePass123',
  cpf: '12345678901'
}

// Output (after redaction)
{
  user: 'john@example.com',
  password: '***REDACTED***',
  cpf: '***REDACTED***'
}
```

### 3. Error Categorizer

**Location:** `/src/common/utils/error-categorizer.util.ts`

Classifies errors for intelligent routing and alerting:

```typescript
enum ErrorCategory {
  VALIDATION = 'VALIDATION',          // 400 validation errors
  AUTHENTICATION = 'AUTHENTICATION',  // 401 auth failures
  AUTHORIZATION = 'AUTHORIZATION',   // 403 permission denied
  NOT_FOUND = 'NOT_FOUND',           // 404 resource not found
  CONFLICT = 'CONFLICT',             // 409 data conflicts
  RATE_LIMIT = 'RATE_LIMIT',         // 429 throttled
  EXTERNAL_SERVICE = 'EXTERNAL_SERVICE', // External API failures
  DATABASE = 'DATABASE',             // Database errors
  UNKNOWN = 'UNKNOWN'                // Unclassified
}

enum Severity {
  'low'      // Validation, not found → debug level
  'medium'   // Auth, rate limit → warn level
  'high'     // Database, external → error level
  'critical' // Unhandled system → error level
}
```

### 4. Structured Logging Interceptor

**Location:** `/src/common/interceptors/structured-logging.interceptor.ts`

Logs all successful and failed HTTP requests with context:

```typescript
// Successful response log:
{
  "message": "GET /api/v1/obras - 200",
  "context": "HTTP",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "traceId": "123e4567-e89b-12d3-a456-426614174000",
  "method": "GET",
  "url": "/api/v1/obras",
  "statusCode": 200,
  "duration": "45ms",
  "responseSize": 1024,
  "userId": "user-123",
  "ip": "192.168.1.1"
}

// Error response log:
{
  "message": "Error in POST /auth/login",
  "context": "HTTP",
  "severity": "medium",
  "category": "AUTHENTICATION",
  "retryable": false,
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "statusCode": 401,
  "error": "Invalid credentials",
  "duration": "23ms"
}
```

### 5. Structured Exception Filter

**Location:** `/src/common/filters/structured-exception.filter.ts`

Catches unhandled exceptions and returns structured responses:

```json
{
  "statusCode": 400,
  "message": "Validação falhou",
  "error": {
    "email": "Email já registrado",
    "cpf": "CPF inválido"
  },
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "traceId": "123e4567-e89b-12d3-a456-426614174000",
  "timestamp": "2026-05-30T10:30:00.000Z"
}
```

## Log Levels

Determined automatically based on error severity:

| Severity | HTTP Status | Log Level | Example |
|----------|------------|-----------|---------|
| **low** | 400, 404 | `debug` | Validation errors, not found |
| **medium** | 401, 403, 429 | `warn` | Auth failures, rate limited |
| **high** | 500+ (DB/external) | `error` | Database connection failed |
| **critical** | 500+ (unknown) | `error` | Unhandled exception |

## Usage Examples

### Example 1: Successful Request

```typescript
// Request
GET /api/v1/obras?page=1&limit=10
Authorization: Bearer <token>

// Log Output (info level)
{
  "message": "GET /api/v1/obras - 200",
  "context": "HTTP",
  "requestId": "abc-123",
  "traceId": "xyz-789",
  "statusCode": 200,
  "duration": "45ms",
  "userId": "user-456"
}
```

### Example 2: Validation Error

```typescript
// Request
POST /auth/registrar
{
  "email": "invalid-email",
  "cpf": "00000000000"
}

// Response (400)
{
  "statusCode": 400,
  "message": "Validação falhou",
  "error": {
    "email": "Email inválido",
    "cpf": "CPF inválido"
  },
  "requestId": "abc-123",
  "timestamp": "2026-05-30T10:30:00Z"
}

// Log Output (debug level - low severity)
{
  "message": "VALIDATION: Email inválido",
  "context": "Exception",
  "severity": "low",
  "category": "VALIDATION",
  "requestId": "abc-123",
  "statusCode": 400
}
```

### Example 3: Authentication Error

```typescript
// Request
POST /auth/login
{
  "email": "user@example.com",
  "senha": "wrongpassword"
}

// Response (401)
{
  "statusCode": 401,
  "message": "Email ou senha incorretos",
  "requestId": "abc-123",
  "timestamp": "2026-05-30T10:30:00Z"
}

// Log Output (warn level - medium severity)
{
  "message": "AUTHENTICATION: Email ou senha incorretos",
  "context": "Exception",
  "severity": "medium",
  "category": "AUTHENTICATION",
  "retryable": false,
  "requestId": "abc-123",
  "statusCode": 401,
  "userId": null
}
```

### Example 4: Database Error (with redaction)

```typescript
// Request causes database connection failure
GET /api/v1/obras

// Internal error (not sent to client in production)
// Log Output (error level - high severity)
{
  "message": "DATABASE: connect ECONNREFUSED 127.0.0.1:5432",
  "context": "Exception",
  "severity": "high",
  "category": "DATABASE",
  "retryable": true,
  "requestId": "abc-123",
  "statusCode": 500,
  "error": "connect ECONNREFUSED"
}

// Response to client (generic)
{
  "statusCode": 500,
  "message": "Internal server error",
  "requestId": "abc-123",
  "timestamp": "2026-05-30T10:30:00Z"
}
```

## Integration with Monitoring

### Log Aggregation (ELK Stack, Datadog, Cloudwatch)

All logs include structured fields for easy filtering and aggregation:

```bash
# Filter by severity
filter: severity="high" OR severity="critical"

# Filter by category
filter: category="DATABASE" OR category="EXTERNAL_SERVICE"

# Filter by user
filter: userId="user-123"

# Filter by request
filter: requestId="abc-123"

# Filter by response time
filter: duration > 1000  # milliseconds
```

### Alert Rules

```yaml
# Example: Alert on high error rate
alert: HighErrorRate
expr: rate(errors[category="AUTHENTICATION"][5m]) > 0.1
severity: warning

# Example: Alert on database failures
alert: DatabaseErrors
expr: count(errors[category="DATABASE"][5m]) > 5
severity: critical

# Example: Alert on external service failures
alert: ExternalServiceFailure
expr: errors[category="EXTERNAL_SERVICE"] > 0
severity: warning
```

## Request Tracing

All logs from a single request share the same `requestId` and `traceId`, enabling full request tracing across service boundaries:

```
Client Request
  ├─ x-request-id: abc-123 (from client)
  ├─ x-trace-id: xyz-789 (from client)
  │
  ├─→ API Server receives & logs (requestId: abc-123, traceId: xyz-789)
  │    ├─ RequestIdMiddleware: Inject IDs into context
  │    ├─ StructuredLoggingInterceptor: Log request start
  │    ├─ AuthController: log("Logging in user", "Auth", { requestId, traceId })
  │    └─ StructuredLoggingInterceptor: Log response (requestId, traceId)
  │
  └─→ Client Response
       ├─ x-request-id: abc-123
       ├─ x-trace-id: xyz-789
       └─ body.requestId: abc-123 (for tracking in client logs)
```

## Performance Considerations

### Logging Overhead

- **Redaction**: Occurs on every log, but only deep-scans objects with sensitive fields (~1-2ms per log)
- **Serialization**: JSON.stringify is fast for most objects (<1ms)
- **Network**: Logs are buffered by the logging service (Winston/Pino) before sending

### Optimization Tips

1. **Don't log large objects** - Log only relevant fields
2. **Use appropriate log levels** - Only debug-level logs are expensive in production
3. **Batch log sends** - Configure Winston/ELK to batch logs

## Configuration

### Environment Variables

```bash
# Logging level (default: info)
LOG_LEVEL=debug|info|warn|error

# Enable detailed stack traces (dev only)
NODE_ENV=development

# Request ID header (optional)
REQUEST_ID_HEADER=x-request-id

# Trace ID header (optional)
TRACE_ID_HEADER=x-trace-id
```

### Development Mode

```bash
# Enable verbose logging
NODE_ENV=development
LOG_LEVEL=debug

# Logs will include stack traces and detailed context
```

### Production Mode

```bash
# Production settings
NODE_ENV=production
LOG_LEVEL=info

# Logs exclude stack traces (for client-side errors)
# Only errors & warnings logged to reduce I/O
```

## Best Practices

1. **Always include request context**
   ```typescript
   this.logger.log('Payment processed', 'PaymentService', {
     requestId: req.id,
     userId: user.id,
     amount: 1000,
     // Don't include: creditCard, password, tokens
   });
   ```

2. **Use appropriate log levels**
   ```typescript
   this.logger.debug('Cache hit', 'ScoreService');      // Dev only
   this.logger.log('Score updated', 'ScoreService');    // Info
   this.logger.warn('Cache miss rate high', 'Cache');   // Warning
   this.logger.error('Database timeout', 'DB');         // Error
   ```

3. **Let filters handle exceptions**
   ```typescript
   // Don't catch and manually log
   // ❌ DO NOT DO THIS
   try {
     await service.doSomething();
   } catch (err) {
     this.logger.error(err.message);
     throw err;
   }

   // ✅ DO THIS - Let filter catch it
   await service.doSomething(); // Exception automatically logged
   ```

4. **Don't log sensitive data**
   ```typescript
   // ❌ Wrong
   this.logger.log('User login', 'Auth', { email, password });

   // ✅ Correct
   this.logger.log('User login', 'Auth', { email });
   ```

## Troubleshooting

### Logs not appearing?

1. Check `LOG_LEVEL` environment variable
2. Verify Winston/Pino transport configuration
3. Check console output in development: `NODE_ENV=development`

### Sensitive data not redacted?

1. Add field name to `SENSITIVE_FIELDS` array in `DataRedactionUtil`
2. Ensure field is being logged (not filtered earlier)
3. Check field name is lowercase in the object

### Missing request IDs?

1. Ensure `RequestIdMiddleware` is registered first in `main.ts`
2. Check client is receiving response headers with `x-request-id`
3. Verify database is storing the `requestId` field (if persisting logs)

## Future Enhancements

1. **Distributed Tracing**: Integrate with Jaeger or Zipkin for cross-service tracing
2. **Metrics Export**: Add Prometheus metrics export alongside logs
3. **Real-time Alerting**: Integrate with PagerDuty for critical errors
4. **Custom Samplers**: Log only X% of requests in high-traffic scenarios
5. **Async Logging**: Use worker threads to prevent blocking on log writes

## References

- [Winston Logger Documentation](https://github.com/winstonjs/winston)
- [Structured Logging Best Practices](https://kartar.net/2015/12/structured-logging/)
- [OpenTelemetry](https://opentelemetry.io/)
- [ELK Stack Documentation](https://www.elastic.co/what-is/elk-stack)

---

**Last Updated:** May 30, 2026  
**Author:** Claude Code  
**Status:** 🟢 Ready for Production

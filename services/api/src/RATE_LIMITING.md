# Rate Limiting Implementation

## Overview

This document describes the rate limiting (throttling) implementation in the IMBOBI API using `@nestjs/throttler` to protect critical endpoints from abuse and overload.

## Configuration

### Global Configuration

The rate limiting is configured in `app.module.ts` with multiple profiles:

```typescript
ThrottlerModule.forRoot([
  {
    ttl: 60000,      // 60 seconds
    limit: 100,      // 100 requests per TTL
  },
  // Additional profiles for specific endpoints...
])
```

### Rate Limiting Profiles

| Profile | TTL | Limit | Use Case |
|---------|-----|-------|----------|
| **default** | 60s | 100 req | Global fallback |
| **login** | 15min | 5 req | POST /auth/login - IP-based |
| **register** | 1h | 3 req | POST /auth/registrar - IP-based |
| **renovar** | 1h | 10 req | POST /auth/renovar - User-based |
| **simular** | 1h | 20 req | POST /credito/simular - User-based |
| **evidencias** | 24h | 30 req | POST /evidencias - User-based |

## Implementation

### Guards

#### 1. CustomThrottlerGuard
**Location**: `src/common/guards/throttler.guard.ts`

Base guard that extracts the client IP from requests, handling both direct connections and proxied requests:

```typescript
async getTracker(req: Record<string, any>): Promise<string> {
  return req.ip ?? req.headers?.["x-forwarded-for"] ?? "unknown";
}
```

#### 2. IpThrottlerGuard
**Location**: `src/common/guards/ip-throttler.guard.ts`

IP-based rate limiter for public endpoints (no authentication required):
- Tracks requests exclusively by client IP
- Suitable for endpoints like login, register, and public simulations
- Uses `X-Forwarded-For` header for proxied requests

```typescript
async getTracker(req: Record<string, any>): Promise<string> {
  const ip = req.ip ?? req.headers?.["x-forwarded-for"] ?? "unknown";
  return `ip-${ip}`;
}
```

#### 3. UserThrottlerGuard
**Location**: `src/common/guards/user-throttler.guard.ts`

User-based rate limiter for authenticated endpoints:
- Tracks by User ID if authenticated
- Falls back to IP tracking for unauthenticated requests
- Ensures authenticated users have separate rate limit windows

```typescript
async getTracker(req: Record<string, any>): Promise<string> {
  const userId = req.user?.id;
  if (userId) {
    return `user-${userId}`;
  }
  const ip = req.ip ?? req.headers?.["x-forwarded-for"] ?? "unknown";
  return `ip-${ip}`;
}
```

### Decorator

#### Throttle Decorator
**Location**: `src/common/decorators/throttle.decorator.ts`

Custom decorator to apply specific rate limits to endpoints:

```typescript
@Post("login")
@UseGuards(IpThrottlerGuard)
@Throttle(5, 900000) // 5 requests per 15 minutes
login(@Body(new ZodPipe(LoginSchema)) body: unknown) {
  return this.auth.login(body as never);
}
```

## Protected Endpoints

### Authentication Endpoints

#### POST /auth/login
- **Guard**: IpThrottlerGuard
- **Limit**: 5 requests per 15 minutes per IP
- **Purpose**: Prevent brute force attacks on login
- **Status Code**: 429 Too Many Requests when exceeded

#### POST /auth/registrar
- **Guard**: IpThrottlerGuard
- **Limit**: 3 requests per hour per IP
- **Purpose**: Prevent user registration abuse
- **Status Code**: 429 Too Many Requests when exceeded

#### POST /auth/renovar
- **Guard**: UserThrottlerGuard
- **Limit**: 10 requests per hour per user
- **Purpose**: Prevent token renewal abuse
- **Status Code**: 429 Too Many Requests when exceeded

### Business Logic Endpoints

#### POST /credito/simular
- **Guard**: UserThrottlerGuard
- **Limit**: 20 requests per hour per user
- **Purpose**: Prevent excessive credit simulation requests
- **Status Code**: 429 Too Many Requests when exceeded

#### POST /evidencias
- **Guard**: UserThrottlerGuard
- **Limit**: 30 requests per day per user
- **Purpose**: Prevent evidence upload spam
- **Status Code**: 429 Too Many Requests when exceeded

## How Rate Limiting Works

1. **Request arrives** at a protected endpoint
2. **Guard extracts tracker** (IP or User ID) from the request
3. **Redis key is generated**: `throttle:Controller:Method:Tracker:Limit:TTL`
4. **Counter is incremented** in Redis
5. **TTL is set** on first request to the endpoint
6. **Check is performed**:
   - If counter ≤ limit → Request allowed, response 200/201
   - If counter > limit → Rate limited, response 429

7. **Counter expires** after TTL and resets

## Response Codes

| Status | Meaning | Example |
|--------|---------|---------|
| 200 | Request successful | Authentication successful |
| 201 | Resource created | User registered |
| 400 | Bad request | Invalid input data |
| 401 | Unauthorized | Missing/invalid JWT token |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Server error | Unexpected error |

### Rate Limit Response Headers

When a request is throttled (429), the response includes:

```
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1234567890
Content-Type: application/json

{
  "statusCode": 429,
  "message": "ThrottlerException: Too Many Requests"
}
```

## Testing

### Unit Tests
Run the test suite to verify rate limiting behavior:

```bash
npm test -- throttler.guard.spec.ts
```

Tests cover:
- IP-based rate limiting
- User-based rate limiting
- Different IPs having separate limits
- X-Forwarded-For header handling

### Integration Testing
Use the provided shell script to test endpoints:

```bash
bash scripts/test-rate-limiting.sh http://localhost:3000
```

This script:
- Tests login endpoint (5 per 15min per IP)
- Tests register endpoint (3 per hour per IP)
- Tests credit simulation (20 per hour per user)
- Verifies IP isolation
- Generates colored output for easy interpretation

### Manual Testing with curl

**Test login endpoint:**
```bash
for i in {1..6}; do
  echo "Request $i:"
  curl -X POST http://localhost:3000/auth/login \
    -H "Content-Type: application/json" \
    -H "X-Forwarded-For: 192.168.1.1" \
    -d '{"email":"test@example.com","senha":"Pass123!"}'
  echo
  sleep 1
done
```

Expected: First 5 requests succeed (200), 6th fails with 429.

## Troubleshooting

### Rate Limiting Not Working

1. **Check Redis connection**:
   ```bash
   redis-cli ping
   ```
   Should return `PONG`

2. **Verify guards are applied**:
   - Check controller decorators: `@UseGuards(IpThrottlerGuard)` or `@UseGuards(UserThrottlerGuard)`
   - Check `@Throttle(limit, ttl)` decorator is present

3. **Check Redis keys**:
   ```bash
   redis-cli KEYS "throttle:*"
   ```

4. **Review logs**:
   - Look for `ThrottlerException` in API logs
   - Check Redis connection logs

### False Positives (Legitimate Requests Being Blocked)

1. **IP address issues**:
   - Verify X-Forwarded-For header is being set correctly
   - Check if requests are coming through a proxy/load balancer

2. **User tracking issues**:
   - Ensure JWT token includes `user.id`
   - Verify `req.user` is populated correctly

3. **Adjust limits**:
   - Modify TTL or limit values in `app.module.ts`
   - Consider user feedback on limits

## Architecture Decisions

### Why Three Guards?

1. **CustomThrottlerGuard**: Default behavior for any endpoint using Throttle decorator
2. **IpThrottlerGuard**: Public endpoints tracking by IP (login, register)
3. **UserThrottlerGuard**: Authenticated endpoints tracking by user ID

This separation allows:
- Different tracking strategies per endpoint type
- Flexibility for future requirements
- Clean, testable code

### Why Redis?

The throttler uses Redis (via BullMQ) because:
- **Distributed**: Works across multiple API instances
- **Fast**: In-memory operations
- **Ephemeral**: TTL automatically expires keys
- **Already in use**: Reduces operational overhead

### Why Different TTLs?

Different time windows reflect:
- **15 minutes (login)**: Standard security practice for authentication
- **1 hour (register, renovar, simular)**: Sufficient for business operations
- **24 hours (evidencias)**: Evidence uploads are less frequent

## Security Considerations

1. **Brute Force Protection**: Login/register limits prevent credential stuffing
2. **Resource Protection**: Credit simulation and evidence limits prevent resource exhaustion
3. **DDoS Mitigation**: Global limit (100 req/min) provides baseline protection
4. **IP Spoofing**: Limits reliance on IP alone, uses UserThrottlerGuard for authenticated endpoints

## Performance Impact

- **Minimal**: Most operations are cached in Redis
- **Transparent**: No impact on request processing time
- **Scalable**: Works with any number of API instances

## Future Improvements

1. **Dynamic Rate Limits**: Adjust limits based on user tier/subscription
2. **Distributed Rate Limiting**: Support for rate limiting across multiple regions
3. **Custom Error Messages**: More informative 429 responses
4. **Rate Limit Metrics**: Prometheus metrics for monitoring
5. **Whitelist/Blacklist**: IP-based or user-based exclusions

## References

- [@nestjs/throttler Documentation](https://docs.nestjs.com/security/rate-limiting)
- [OWASP Rate Limiting Guidelines](https://cheatsheetseries.owasp.org/cheatsheets/Throttling_Cheat_Sheet.html)
- [Redis Key Expiration](https://redis.io/commands/expire)

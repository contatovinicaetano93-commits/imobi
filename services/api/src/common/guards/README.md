# Rate Limiting Guards

This directory contains the implementation of three specialized guards for rate limiting (throttling) requests to the IMBOBI API.

## Quick Reference

### Guards Overview

| Guard | Purpose | Tracking | Use Case |
|-------|---------|----------|----------|
| `CustomThrottlerGuard` | Base guard with IP extraction | Client IP | Default for all endpoints |
| `IpThrottlerGuard` | IP-based rate limiting | Client IP | Public endpoints (login, register) |
| `UserThrottlerGuard` | User-based rate limiting | User ID or IP | Authenticated endpoints |

## Usage Examples

### Protecting a Public Endpoint (IP-based)

```typescript
import { IpThrottlerGuard } from "../../common/guards/ip-throttler.guard";
import { Throttle } from "../../common/decorators/throttle.decorator";

@Controller("auth")
export class AuthController {
  @Post("login")
  @UseGuards(IpThrottlerGuard)
  @Throttle(5, 900000) // 5 requests per 15 minutes per IP
  login(@Body() body: LoginDTO) {
    return this.authService.login(body);
  }
}
```

### Protecting an Authenticated Endpoint (User-based)

```typescript
import { UserThrottlerGuard } from "../../common/guards/user-throttler.guard";
import { Throttle } from "../../common/decorators/throttle.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";

@Controller("credito")
export class CreditoController {
  @Post("simular")
  @UseGuards(UserThrottlerGuard)
  @Throttle(20, 3600000) // 20 requests per hour per user
  simular(@Body() body: SimulacaoDTO) {
    return this.creditoService.simular(body);
  }
}
```

## How They Work

### 1. Request Flow

```
Request arrives
    ↓
Guard's getTracker() extracts identifier (IP or User ID)
    ↓
Redis key generated: throttle:{Controller}:{Method}:{Tracker}:{Limit}:{TTL}
    ↓
Redis counter incremented
    ↓
Check performed:
  - counter ≤ limit → Allowed (200/201)
  - counter > limit → Throttled (429)
    ↓
Response sent
    ↓
Counter expires after TTL (automatic Redis expiration)
```

### 2. IP Extraction Logic

All guards follow this IP extraction pattern:

```
1. Try: req.ip (direct connection)
2. Try: req.headers['x-forwarded-for'] (proxied request)
3. Fallback: 'unknown' (if neither available)
```

This ensures the guard works both with direct connections and through load balancers/proxies.

### 3. User ID Extraction Logic

UserThrottlerGuard:

```
1. Try: req.user?.id (from JWT payload)
2. Fallback: req.ip (or X-Forwarded-For) if no user ID
```

This allows:
- Authenticated users: Tracked individually by User ID
- Unauthenticated requests: Tracked by IP (graceful degradation)

## Configuration

### Adding a New Rate Limited Endpoint

**Step 1**: Add a profile to `app.module.ts`:

```typescript
{
  ttl: 3600000,  // 1 hour in milliseconds
  limit: 25,     // 25 requests
  name: "myendpoint",  // Name of the profile
}
```

**Step 2**: Apply guards and decorator to controller:

```typescript
@Post("myendpoint")
@UseGuards(UserThrottlerGuard)  // or IpThrottlerGuard
@Throttle(25, 3600000)
myEndpoint(@Body() body: MyDTO) {
  return this.service.handle(body);
}
```

### Adjusting Rate Limits

Edit limits in `app.module.ts` ThrottlerModule configuration:

```typescript
{
  ttl: 900000,    // Change TTL (time window in ms)
  limit: 10,      // Change limit (requests per TTL)
  name: "login",
}
```

Then update the decorator on the endpoint:

```typescript
@Throttle(10, 900000)  // Match the profile configuration
```

## Testing

### Unit Tests

Run tests to verify guard behavior:

```bash
npm test -- throttler.guard.spec.ts
```

Tests validate:
- Request counting within limits
- Rejection when limits exceeded
- IP isolation
- User ID tracking
- Fallback behavior

### Integration Testing

Use the shell script to test with actual HTTP requests:

```bash
bash scripts/test-rate-limiting.sh http://localhost:3000
```

### Manual Testing with curl

Test login endpoint (5 per 15 min per IP):

```bash
# First 5 requests should succeed
for i in {1..5}; do
  curl -X POST http://localhost:3000/auth/login \
    -H "X-Forwarded-For: 192.168.1.100" \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","senha":"Pass123!"}'
  echo "Request $i done"
  sleep 1
done

# 6th request should be rate limited (429)
curl -X POST http://localhost:3000/auth/login \
  -H "X-Forwarded-For: 192.168.1.100" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","senha":"Pass123!"}'
```

## Response Format

### Successful Request (200/201)

```
HTTP/1.1 200 OK
Content-Type: application/json

{
  "data": {...}
}
```

### Rate Limited Request (429)

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

## Troubleshooting

### Guards not being applied

Check:
1. `@UseGuards(...)` decorator is present on the method
2. `@Throttle(...)` decorator is present with correct limit and TTL
3. Guard import path is correct

### Rate limiting not working

Check:
1. Redis connection: `redis-cli ping` returns `PONG`
2. Throttler module imported in `app.module.ts`
3. `CustomThrottlerGuard` registered as `APP_GUARD`

### Redis keys not appearing

Check:
1. Run: `redis-cli KEYS "throttle:*"`
2. Check if any keys exist (should appear during active requests)
3. Keys expire automatically, so may not be visible between requests

### User ID not being tracked

Possible causes:
1. JWT token not included in Authorization header
2. JWT token doesn't contain user ID in payload
3. User ID field in JWT payload is not `id` or `sub`

Check JWT strategy in `modules/auth/jwt.strategy.ts` for the field mapping.

## Advanced Usage

### Custom Tracking Keys

Extend UserThrottlerGuard for custom behavior:

```typescript
export class CustomUserThrottlerGuard extends UserThrottlerGuard {
  protected getKey(
    context: ExecutionContext,
    limit: number,
    ttl: number
  ): string {
    const req = context.switchToHttp().getRequest();
    const userId = req.user?.id;
    const customTracker = userId 
      ? `user-${userId}-${req.user.tier}` // Include user tier
      : `ip-${req.ip}`;
    
    return `throttle:${context.getClass().name}:${context.getHandler().name}:${customTracker}:${limit}:${ttl}`;
  }
}
```

### Combining Guards

Some endpoints might need both IP and user-based tracking:

```typescript
@Post("important")
@UseGuards(IpThrottlerGuard, JwtAuthGuard, UserThrottlerGuard)
@Throttle(10, 3600000)
importantAction(@Body() body: ImportantDTO) {
  return this.service.handle(body);
}
```

This ensures:
1. Check IP limit first (public protection)
2. Verify JWT token
3. Check per-user limit (for authenticated users)

## Performance Considerations

- **Redis Overhead**: Minimal (single-digit millisecond latency)
- **Memory Usage**: ~100 bytes per tracked identifier per TTL period
- **Scalability**: Works seamlessly across multiple API instances
- **No Database Hits**: All tracking done in Redis

## Security Best Practices

1. **Always use UserThrottlerGuard for authenticated endpoints** to prevent per-user abuse
2. **Set conservative limits** that allow legitimate usage but prevent abuse
3. **Monitor rate limit hits** to detect attack patterns
4. **Use X-Forwarded-For** when behind a proxy to track real client IPs
5. **Don't rely solely on rate limiting** - combine with other security measures

## References

- [NestJS Throttler Documentation](https://docs.nestjs.com/security/rate-limiting)
- [Redis TTL/Expiration](https://redis.io/commands/expire)
- [OWASP Rate Limiting Guidelines](https://cheatsheetseries.owasp.org/cheatsheets/Throttling_Cheat_Sheet.html)

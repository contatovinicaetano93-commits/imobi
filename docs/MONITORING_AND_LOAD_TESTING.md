# Monitoring & Load Testing Guide for imbobi

## Step 8: Monitoring & Alerting Setup

### Current Status

#### ✅ Health Check Endpoint
- **Status**: Already implemented
- **Location**: `/home/user/imobi/services/api/src/common/health.controller.ts`
- **Endpoint**: `GET /api/v1/health`
- **Features**:
  - Redis connection status
  - Email provider configuration check
  - Firebase configuration check
  - Database connection check
  - Returns `ok`, `degraded`, or `error` status
  - Timestamp in ISO format

#### ❌ Sentry (Error Tracking)
- **Status**: Not configured
- **Required for production**: Yes
- **What's needed**:
  - Install: `pnpm add @sentry/nest @sentry/tracing`
  - Set environment variable: `SENTRY_DSN=https://your-key@sentry.io/your-project-id`
  - Initialize in `main.ts` (see implementation section below)
  - Configure exception filter to capture errors

#### ❌ Vercel Analytics
- **Status**: Not configured
- **Required for production**: Yes (for Web app)
- **What's needed**:
  - Install: `pnpm add @vercel/analytics`
  - Import in root layout: `import { Analytics } from '@vercel/analytics/react'`
  - Add component to page tree
  - Tracks Web Vitals and page performance

### Implementation Guide

#### 1. Installing and Configuring Sentry

**Step 1.1: Install Sentry packages**
```bash
cd /home/user/imobi/services/api
pnpm add @sentry/nest @sentry/tracing
```

**Step 1.2: Update `.env.example`**
Add to the API section:
```bash
# Sentry Error Tracking (Production)
SENTRY_DSN=https://your-key@sentry.io/your-project-id
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1
```

**Step 1.3: Initialize Sentry in `main.ts`**

Replace your `services/api/src/main.ts` bootstrap function with:

```typescript
import * as Sentry from '@sentry/nest';

async function bootstrap() {
  validateEnvironmentOrThrow();

  // Initialize Sentry
  if (process.env['SENTRY_DSN']) {
    Sentry.init({
      dsn: process.env['SENTRY_DSN'],
      environment: process.env['SENTRY_ENVIRONMENT'] || 'development',
      tracesSampleRate: parseFloat(process.env['SENTRY_TRACES_SAMPLE_RATE'] || '0.1'),
      enabled: process.env['NODE_ENV'] === 'production',
    });
  }

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: process.env['NODE_ENV'] !== 'production' })
  );

  // Sentry request handler
  if (process.env['SENTRY_DSN']) {
    app.use(Sentry.Handlers.requestHandler());
  }

  // ThrottlerGuard is registered via AppModule providers
  app.useGlobalFilters(new HttpExceptionFilter());
  app.setGlobalPrefix('api/v1');

  const nodeEnv = process.env['NODE_ENV'] || 'development';
  const corsOrigins = process.env['CORS_ORIGIN']?.split(',');

  if (nodeEnv === 'production' && !corsOrigins) {
    throw new Error('CORS_ORIGIN is required in production mode.');
  }

  app.enableCors({
    origin: corsOrigins ?? ['http://localhost:3000'],
    credentials: true,
  });

  // Sentry error handler (must be last)
  if (process.env['SENTRY_DSN']) {
    app.use(Sentry.Handlers.errorHandler());
  }

  const port = Number(process.env['PORT'] ?? 4000);
  await app.listen(port, '0.0.0.0');
  console.log(`imbobi API running on port ${port}`);
}
```

**Step 1.4: Update exception filter to capture errors**

Update `services/api/src/common/filters/http-exception.filter.ts`:

```typescript
import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import * as Sentry from '@sentry/nest';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const reply = ctx.getResponse<{ status: (code: number) => { send: (body: unknown) => void } }>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Erro interno do servidor';
    let errors: unknown = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const response = exception.getResponse();
      if (typeof response === 'object' && response !== null) {
        const obj = response as Record<string, unknown>;
        message = (obj.message as string) || exception.message;
        errors = obj.error;
      } else {
        message = exception.message;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      // Capture non-HTTP errors to Sentry
      if (process.env['SENTRY_DSN']) {
        Sentry.captureException(exception);
      }
    }

    reply.status(status).send({
      statusCode: status,
      message,
      error: errors,
      timestamp: new Date().toISOString(),
    });
  }
}
```

#### 2. Installing Vercel Analytics

**Step 2.1: Install package**
```bash
cd /home/user/imobi/apps/web
pnpm add @vercel/analytics @vercel/web-vitals
```

**Step 2.2: Update `.env.example`**
No environment variables needed - Analytics works automatically on Vercel deployment.

**Step 2.3: Add Analytics to root layout**

Update `apps/web/src/app/layout.tsx`:

```typescript
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <head>
        {/* existing head content */}
      </head>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

### Health Check Script

A health check script has been created at: `/home/user/imobi/scripts/health-check.sh`

**Features**:
- Pings `/api/v1/health` endpoint
- Logs results with timestamp to `/tmp/health-check.log`
- Returns HTTP status code, API status, and Redis status
- Automatically rotates logs (keeps 10,000 lines = ~7 days)
- Timeout: 10 seconds per request

**Usage**:

1. **Manual run**:
   ```bash
   bash /home/user/imobi/scripts/health-check.sh
   ```

2. **Set as cron job (every minute)**:
   ```bash
   # Edit crontab
   crontab -e

   # Add this line:
   * * * * * /home/user/imobi/scripts/health-check.sh

   # Or with custom API URL:
   * * * * * API_URL=https://api.imbobi.com.br /home/user/imobi/scripts/health-check.sh
   ```

3. **Monitor logs in real-time**:
   ```bash
   tail -f /tmp/health-check.log
   ```

**Environment variables**:
- `API_URL`: API base URL (default: `http://localhost:4000`)
- `LOG_FILE`: Log file path (default: `/tmp/health-check.log`)
- `TIMEOUT`: Curl timeout in seconds (default: `10`)

---

## Step 9: Load Testing Setup

### Current Status

#### ❌ k6 Installation
- **Status**: Not installed globally
- **Required**: Yes, for production baseline testing

### Installation & Setup

#### 1. Install k6

**Option 1: Linux (Debian/Ubuntu)**
```bash
sudo apt-get install k6
```

**Option 2: macOS (Homebrew)**
```bash
brew install k6
```

**Option 3: Docker**
```bash
docker run --rm -i grafana/k6 run - < load-test.js
```

**Option 4: From binary**
Visit https://k6.io/docs/getting-started/installation/ for latest releases.

#### 2. Load Test Script

A load test script has been created at: `/home/user/imobi/load-test.js`

**Configuration**:
- **Stages**:
  - 0-1 min: Ramp up to 50 concurrent users
  - 1-4 min: Sustain 50 concurrent users
  - 4-5 min: Ramp down to 0 users
- **Duration**: 5 minutes total
- **Endpoint**: `GET /api/v1/health`
- **Metrics tracked**:
  - Response time (min, max, avg, p50, p95, p99)
  - Total requests and request rate
  - Failed requests and error rate
  - Concurrent users

**Thresholds (Pass/Fail criteria)**:
- p95 response time < 800ms
- p99 response time < 1000ms
- Error rate < 10%

### Usage

**1. Local testing (against localhost:4000)**:
```bash
k6 run /home/user/imobi/load-test.js
```

**2. Production testing**:
```bash
API_URL=https://api.imbobi.com.br k6 run /home/user/imobi/load-test.js
```

**3. Custom configuration**:
```bash
# Adjust for your environment
k6 run --vus 100 --duration 10m /home/user/imobi/load-test.js
```

**4. With Docker**:
```bash
docker run --rm -v $PWD:/scripts grafana/k6 run /scripts/load-test.js
```

**5. Export results to JSON**:
```bash
k6 run --out json=/tmp/load-test-results.json /home/user/imobi/load-test.js
```

### Interpreting Results

After running the load test, you'll see output like:

```
=== Load Test Results ===

Response Time:
  Min: 45.23ms
  Max: 2341.12ms
  Avg: 234.56ms
  p(50): 180.34ms
  p(95): 678.90ms
  p(99): 1234.56ms

Requests:
  Total: 4500
  Rate: 15.00 req/s

Errors:
  Failed requests: 45
  Error rate: 1.00%

Iterations:
  Total: 4500
  Rate: 15.00 iter/s
```

**Baseline expectations** (for healthy API):
- p95 response time: < 800ms
- p99 response time: < 1000ms
- Error rate: < 5%
- CPU usage: 20-40% on moderate infrastructure
- Memory usage: < 500MB

### Next Steps

1. **Run baseline test** on current production infrastructure
2. **Compare against thresholds** - identify bottlenecks
3. **Profile slow requests** - use Sentry + APM if available
4. **Optimize** - cache, database indexes, API response sizes
5. **Re-test** after optimizations
6. **Set up continuous load testing** in CI/CD pipeline

### Advanced Configuration

For more detailed load testing:
- **Ramping VUs**: Different user ramp-up patterns
- **Thresholds**: Custom metrics and pass/fail criteria
- **Custom metrics**: Track specific endpoints or business metrics
- **Think time**: Realistic delays between requests
- **Scenarios**: Multiple concurrent flows (login, browse, purchase)
- **Spike testing**: Sudden traffic spikes
- **Stress testing**: Gradually increase load until system breaks

See k6 documentation: https://k6.io/docs/

---

## Monitoring Stack Summary

| Component | Status | Purpose |
|-----------|--------|---------|
| Health Check Endpoint | ✅ Ready | Basic system status |
| Health Check Script | ✅ Ready | Automated health monitoring |
| Sentry | ❌ Not configured | Production error tracking |
| Vercel Analytics | ❌ Not configured | Web Vitals + Performance |
| k6 Load Testing | ❌ Not installed | Baseline performance testing |

## Deployment Checklist

Before moving to production:

- [ ] Sentry configured and SENTRY_DSN set in production environment
- [ ] Vercel Analytics installed in web app
- [ ] Health check cron job running (or equivalent monitoring)
- [ ] Load test baseline established (p95 < 800ms)
- [ ] Database indexes optimized
- [ ] Redis configured and healthy
- [ ] S3 bucket configured and accessible
- [ ] Email provider tested (SendGrid/SES/SMTP)
- [ ] Firebase Cloud Messaging tested
- [ ] CORS origins properly configured
- [ ] Rate limiting enabled (ThrottlerModule is already configured)
- [ ] API documentation accessible at `/api`

## Support

- **Sentry Documentation**: https://docs.sentry.io/platforms/javascript/guides/node/
- **Vercel Analytics**: https://vercel.com/docs/analytics
- **k6 Documentation**: https://k6.io/docs/
- **NestJS Error Handling**: https://docs.nestjs.com/exception-filters

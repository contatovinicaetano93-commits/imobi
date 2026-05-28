# Monitoring and Load Testing Guide

This document covers the production monitoring infrastructure for imobi API, including error tracking, performance monitoring, and load testing.

## Stack Overview

- **Error Tracking**: Sentry (real-time error monitoring and performance metrics)
- **Web Analytics**: Vercel Analytics (page performance and user metrics)
- **Load Testing**: k6 (cloud-native load and performance testing)

---

## 1. Sentry Error Tracking

### Setup

Sentry provides real-time error tracking, performance monitoring, and release tracking for the API.

#### Installation

Sentry packages are already installed:
```bash
pnpm add -F @imbobi/api @sentry/node @sentry/tracing
```

#### Configuration

**Location**: `/services/api/src/common/config/sentry.config.ts`

The configuration includes:
- HTTP request tracing
- Uncaught exception handling
- Unhandled promise rejection handling
- Health check request filtering (to reduce noise)
- Automatic user context tracking

#### Environment Variables

Required (production):
```bash
SENTRY_DSN=https://your_public_key@o123456.ingest.sentry.io/123456
```

Optional:
```bash
SENTRY_RELEASE=1.0.0
SENTRY_ENABLE_PROFILER=false  # Set to true for profiling
```

#### How to Use

1. **Sign up at**: https://sentry.io/signup
2. **Create a project** for "Node.js" platform
3. **Get your DSN** from Project Settings → Client Keys (DSN)
4. **Add to environment**:
   ```bash
   export SENTRY_DSN="your_dsn_here"
   ```

#### Verifying Sentry Integration

The API health endpoint includes Sentry status. To verify it's working:

```bash
curl http://localhost:4000/api/v1/health
```

Response includes service configuration status.

#### Triggering Test Error (for verification)

**Create a test endpoint** in API (optional):

```typescript
// services/api/src/app.controller.ts
import { captureException } from './common/config';

@Get('test-sentry')
testSentry() {
  try {
    throw new Error('Test Sentry integration');
  } catch (error) {
    captureException(error as Error, { endpoint: 'test-sentry' });
    throw error;
  }
}
```

Then trigger: `curl http://localhost:4000/api/v1/test-sentry`

The error will appear in your Sentry dashboard immediately.

#### Dashboard Features

- **Issues**: Real-time errors with stack traces
- **Performance**: Transaction timings and slow endpoints
- **Release Tracking**: Monitor which releases introduced errors
- **Alerts**: Set up notifications for critical errors
- **Team Collaboration**: Assign issues, comment, and track resolution

### Production Configuration

For production:
1. Set `SENTRY_DSN` in `.env.production`
2. Set `SENTRY_RELEASE` to your release version (e.g., "1.0.0")
3. Optionally enable profiling: `SENTRY_ENABLE_PROFILER=true`
4. Configure Sentry alerts in dashboard for critical errors

---

## 2. Vercel Web Analytics

### Setup

Vercel Analytics tracks page performance, Core Web Vitals, and user metrics for the Next.js web app.

#### Installation

Analytics package installed:
```bash
pnpm add -F @imbobi/web @vercel/analytics
```

#### Configuration

**Location**: `/apps/web/app/layout.tsx`

The Analytics component automatically:
- Sends Web Vitals to Vercel
- Tracks page performance
- Monitors Core Web Vitals (LCP, FID, CLS)
- Works only when deployed to Vercel

#### How to Use

1. Deploy your Next.js app to Vercel
2. Go to Vercel Dashboard → Project → Analytics
3. View real-time metrics:
   - Page load times
   - Core Web Vitals
   - Slowest pages
   - User traffic patterns

#### What Gets Tracked

- **LCP (Largest Contentful Paint)**: How quickly main content renders
- **FID (First Input Delay)**: Responsiveness to user interaction
- **CLS (Cumulative Layout Shift)**: Visual stability during page load
- **Page Load Time**: Total time to fully load
- **Request Count**: API calls per page

#### Development Notes

- Analytics component is safe in production only (doesn't track locally)
- No additional configuration needed
- Uses Vercel's proprietary measurement
- No third-party tracking libraries added

---

## 3. k6 Load Testing

### Installation

k6 is installed and available in PATH:
```bash
k6 version  # v1.7.1
```

### Load Test Script

**Location**: `/load-test.js`

The load test simulates production traffic:
- **Duration**: 5 minutes
- **Stages**:
  - Ramp up: 1 minute to 50 concurrent users
  - Sustain: 3 minutes at 50 concurrent users
  - Ramp down: 1 minute back to 0

**Targets**: 
- Health check endpoint: `/api/v1/health`
- Base URL: `http://localhost:4000` (configurable via `API_URL` env var)

### Running Load Tests

#### Local Development
```bash
# Start API first
pnpm dev

# In another terminal, run baseline test
export PATH="$HOME/go/bin:$PATH"
k6 run load-test.js
```

#### Against Production
```bash
k6 run --env API_URL=https://api.imbobi.com.br load-test.js
```

#### Custom Test Duration
```bash
# Modify load-test.js stages or use k6 options
k6 run load-test.js \
  --vus 100 \
  --duration 10m
```

### Results

The test outputs:
- **p95/p99 Latencies**: 95th and 99th percentile response times
- **Error Rate**: Percentage of failed requests
- **Throughput**: Requests per second
- **Success Rate**: Percentage of successful requests

**Thresholds** (test passes/fails):
- p95 latency < 800ms
- p99 latency < 1000ms
- Error rate < 10%

### Sample Output

```
=== Load Test Summary ===
Total HTTP requests: 14400
Failed requests: 0
Success rate: 100.00%

Response Time:
  Min: 10.23ms
  Max: 850.45ms
  Avg: 125.67ms
  p(50): 98.45ms
  p(95): 650.34ms
  p(99): 820.12ms

Requests:
  Total: 14400
  Rate: 48.00 req/s
```

### Load Test Metrics

The script tracks custom metrics:
- `errors`: Custom error rate
- `response_time`: Response time trend
- `health_check_success`: Successful health checks
- `health_check_failed`: Failed health checks
- `concurrent_users`: Virtual users gauge

### Continuous Integration

For CI/CD pipelines, use:
```bash
k6 run load-test.js \
  --out json=results.json \
  --summary-export=summary.json
```

Then parse the JSON results for CI reporting.

---

## 4. Monitoring Dashboard Setup

### Services Monitored

| Service | Monitoring | Access |
|---------|-----------|--------|
| **API Errors** | Sentry | https://sentry.io/organizations/{org}/issues/ |
| **Web Performance** | Vercel Analytics | https://vercel.com/dashboard/projects |
| **API Health** | Built-in endpoint | `GET /api/v1/health` |
| **Load Testing** | k6 results | Local results.json |

### Production Setup Checklist

- [ ] Sentry DSN configured in `.env.production`
- [ ] API deployed with Sentry integration
- [ ] Web app deployed to Vercel with Analytics enabled
- [ ] k6 baseline test run and results recorded
- [ ] Team members added to Sentry organization
- [ ] Sentry alerts configured for critical errors
- [ ] Error notification channels set up (email, Slack, etc.)
- [ ] Load test scheduled for regular baseline measurements

### Access & Permissions

**Sentry**:
- Members can be added from Organization Settings
- Assign roles: Owner, Manager, Member, Restricted Member
- Team emails: Check existing members in Sentry dashboard

**Vercel Analytics**:
- Visible to all team members with project access
- No additional setup required once deployed

**k6 Results**:
- Store in Git or CI artifacts
- Compare against baseline for regression detection

---

## 5. Troubleshooting

### Sentry Not Capturing Errors

**Check**:
1. `SENTRY_DSN` is set: `echo $SENTRY_DSN`
2. API logs show "Sentry initialized in production mode"
3. Health check endpoint returns without DSN errors
4. Error actually occurred (check logs for stack trace)

**Solution**:
```bash
# Verify initialization
pnpm dev  # Look for "Sentry initialized..." in logs

# Check DSN format
# Should be: https://key@organization.ingest.sentry.io/projectid
```

### Load Test Failures

**High Error Rate**:
- Increase API timeout: `--env API_TIMEOUT=10000`
- Reduce VU count: `--vus 20`
- Check API logs for errors

**Timeout Issues**:
- Verify API is running: `curl http://localhost:4000/api/v1/health`
- Check network connectivity: `ping localhost`

**Performance Below Threshold**:
- Profile API: Check database query performance
- Review slow endpoints in logs
- Increase hardware resources

### Vercel Analytics Not Showing

- App must be deployed to Vercel (not localhost)
- Wait 5-10 minutes for data to appear
- Check Vercel dashboard → Project → Analytics tab
- Verify Analytics component is imported in layout.tsx

---

## 6. Performance Targets

### API Response Time Goals

| Endpoint | p95 | p99 | Notes |
|----------|-----|-----|-------|
| Health Check | <100ms | <200ms | Lightweight status check |
| List API | <500ms | <800ms | Database query |
| Create API | <1000ms | <1500ms | File upload + processing |

### Web Performance Goals

| Metric | Target | Measurement |
|--------|--------|-------------|
| LCP (Largest Contentful Paint) | < 2.5s | User perception |
| FID (First Input Delay) | < 100ms | Responsiveness |
| CLS (Cumulative Layout Shift) | < 0.1 | Visual stability |

### Error Rate Goals

- **Production**: < 0.1% (1 error per 1000 requests)
- **Staging**: < 1% (acceptable for testing)

---

## 7. Maintenance & Monitoring

### Regular Tasks

**Daily**:
- Check Sentry dashboard for new critical issues
- Review error trends

**Weekly**:
- Run baseline load test
- Compare results against previous week
- Review Web Vitals trends in Vercel Analytics

**Monthly**:
- Archive resolved issues in Sentry
- Review and adjust error alert thresholds
- Plan performance optimizations

### Creating Custom Sentry Context

```typescript
// In API handlers where user is known
import { setUserContext } from './common/config';

setUserContext(userId, userEmail);

// Sentry will tag all errors from this request with user ID
```

### Sentry Release Tracking

```bash
# During deployment
export SENTRY_RELEASE="v1.2.3"

# Sentry will show which release introduced errors
# Enables quick rollback decisions
```

---

## 8. Useful Links

- **Sentry Docs**: https://docs.sentry.io/product/
- **k6 Docs**: https://k6.io/docs/
- **Vercel Analytics**: https://vercel.com/docs/product/analytics
- **k6 Dashboard Integration**: https://k6.io/docs/results-output/overview/
- **Best Practices**: https://sentry.io/for/devops/

---

## Support

For issues or questions:
1. Check Sentry error details for stack traces
2. Review API logs: `pnpm dev` (watch console)
3. Run health check: `curl http://localhost:4000/api/v1/health`
4. Contact: contato.vinicaetano93@gmail.com

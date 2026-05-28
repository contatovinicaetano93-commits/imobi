# Production Monitoring & Observability Guide

## Overview

This guide covers production monitoring setup, alerting thresholds, and runbooks for the imbobi platform.

## Monitoring Stack

### Recommended Tools

#### 1. Application Performance Monitoring (APM)

**Recommendation: New Relic OR DataDog**

**New Relic Setup:**
```bash
npm install @newrelic/node-agent
```

Environment variables for API:
```env
NEW_RELIC_ENABLED=true
NEW_RELIC_APP_NAME=imbobi-api
NEW_RELIC_LICENSE_KEY=<your-license-key>
NEW_RELIC_LOG_LEVEL=info
```

**DataDog Setup:**
```bash
npm install dd-trace
```

Environment variables:
```env
DD_ENABLED=true
DD_SERVICE=imbobi-api
DD_AGENT_HOST=localhost
DD_AGENT_PORT=8126
DD_TRACE_SAMPLE_RATE=1.0
DD_LOGS_INJECTION=true
```

Initialize in `services/api/src/main.ts`:
```typescript
// For DataDog
import tracer from 'dd-trace';
tracer.init();

// For New Relic
require('@newrelic/node-agent');
```

#### 2. Error Tracking

**Sentry Setup:**

1. Create Sentry account and project at https://sentry.io

2. Install Sentry SDK:
```bash
npm install @sentry/node @sentry/tracing --save
```

3. Initialize in API (services/api/src/main.ts):
```typescript
import * as Sentry from '@sentry/node';
import * as Tracing from '@sentry/tracing';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
  integrations: [
    new Tracing.Http({ request: true }),
    new Sentry.Integrations.OnUncaughtException(),
    new Sentry.Integrations.OnUnhandledRejection(),
  ],
});
```

4. Environment variables:
```env
SENTRY_DSN=https://<key>@sentry.io/<project>
SENTRY_ENVIRONMENT=production
```

#### 3. Logging

**Structured Logging with Winston/Pino:**

Current setup uses NestJS logger. Enhance with:
- Correlation IDs for request tracing
- Structured JSON logs for better searchability
- Log aggregation to CloudWatch, DataDog, or Splunk

## Alert Configuration

### Performance Alerts

**Latency Threshold: >1000ms (1 second)**

Configure in your monitoring tool:

**New Relic:**
- Go to Alerts & AI → Notification channels
- Create condition: `average(duration) > 1000ms` over 5 minutes
- Actions: Slack notification + PagerDuty escalation

**DataDog:**
- Create metric alert: `avg:trace.web.request.duration{service:imbobi-api} > 1000`
- Evaluation window: 5 minutes
- Notify: #alerts Slack channel

**Sentry:**
- Performance Monitoring → Create Alert Rule
- Threshold: Transaction duration > 1000ms
- Actions: Email team lead

### Error Rate Alerts

**Error Threshold: >5% error rate**

**New Relic:**
- Condition: `error_rate() > 5%` over 10 minutes
- Critical: Send PagerDuty alert
- Notify ops team immediately

**DataDog:**
- Alert: `avg:trace.web.request.errors{service:imbobi-api} > 5`
- Notify: ops-on-call@company.com

**Sentry:**
- Release Health → New issue alert
- Threshold: 5% error rate increase
- Actions: Slack → #incidents

### Database Performance

- Connection pool exhaustion
- Query execution time > 5s
- Replica lag > 10s (if using read replicas)

### Redis/Cache Health

- Connection failures
- Key eviction rate > 10%
- Memory usage > 85%

## Dashboards

### Key Metrics to Track

1. **API Health**
   - Request rate (req/s)
   - Error rate (%)
   - P50/P95/P99 latency (ms)
   - Database connection pool usage

2. **Business Metrics**
   - Obra creation rate
   - Parcela release requests
   - User authentication success rate
   - File upload success rate (S3)

3. **Infrastructure**
   - CPU usage (%)
   - Memory usage (%)
   - Disk I/O
   - Network throughput

4. **Queue Health** (BullMQ)
   - Pending jobs count
   - Failed jobs count
   - Processing time per job

## Runbooks

### Issue: Build Timeout

**Symptoms:**
- GitHub Actions workflow fails with "Job exceeded maximum execution time"
- Build hangs on `pnpm build` step

**Investigation:**
```bash
# Check which package is slow
pnpm build --reporter=verbose

# Profile Next.js build
cd apps/web
npm run build -- --debug

# Check node_modules size
du -sh node_modules/
```

**Resolution:**

1. **Optimize Next.js Build:**
   - Enable SWC minification in `next.config.js`:
   ```javascript
   swcMinify: true,
   ```
   - Increase build timeout in CI:
   ```yaml
   timeout-minutes: 30  # Increase from default 360
   ```

2. **Dependency Review:**
   ```bash
   # Find large packages
   npm ls --depth=0 | sort -k2 -rn | head -20
   
   # Remove unused dependencies
   pnpm audit
   pnpm prune
   ```

3. **Cache Optimization:**
   - Ensure pnpm cache is configured:
   ```yaml
   - uses: actions/setup-node@v4
     with:
       cache: 'pnpm'
   ```
   - Clear cache if corrupt: Settings → Actions → General → Clear caches

4. **Parallel Builds:**
   - Use Turbo's parallel execution:
   ```bash
   turbo run build --parallel --concurrency=4
   ```

### Issue: Test Failure (Critical E2E)

**Symptoms:**
- `critical-flows.e2e.spec.ts` fails intermittently
- Database/Redis connection errors in test logs

**Investigation:**
```bash
# Run test locally with full output
pnpm -F @imbobi/api test -- critical-flows.e2e.spec.ts --verbose

# Check test database state
psql postgresql://test:test@localhost:5432/imbobi_test -c "SELECT count(*) FROM pg_tables;"

# View recent test logs
tail -f critical-flows.log
```

**Resolution:**

1. **Database Issues:**
   - Ensure migrations run before tests:
   ```yaml
   - name: Run migrations
     run: pnpm db:generate && pnpm db:migrate
   ```
   - Check for test data cleanup:
   ```typescript
   afterAll(async () => {
     await db.cleanup();
   });
   ```

2. **Service Connectivity:**
   - Verify Redis is running: `redis-cli ping` → PONG
   - Verify PostgreSQL is running: `pg_isready -h localhost`
   - Check environment variables in test setup

3. **Flaky Tests:**
   - Add retry logic:
   ```yaml
   - name: Run E2E Tests
     run: npm test -- --retry=2
   ```
   - Increase timeout for PostGIS queries (GPS validation can be slow)

4. **Isolated Reproduction:**
   ```bash
   # Run single test
   pnpm -F @imbobi/api test -- critical-flows.e2e.spec.ts -t "should validate GPS"
   
   # Run with specific database
   DATABASE_URL=postgresql://test:test@localhost:5432/imbobi_test pnpm test
   ```

### Issue: Deployment Rollback

**Scenario:** Production deployment fails or introduces critical bugs

**Pre-Rollback Checklist:**
1. Assess impact: Check error rate, affected users, critical service status
2. Communication: Notify stakeholders immediately on #incidents Slack
3. Decision: Review rollback policy (automatic after 10% error rate)

**Rollback Procedure:**

1. **Identify Last Good Deployment:**
   ```bash
   git log --oneline | head -10
   git tag -l "release-*" | sort -V | tail -5
   ```

2. **Revert in Production:**
   ```bash
   # Option A: Revert commit
   git revert <bad-commit-sha>
   git push origin main
   
   # Option B: Checkout previous tag
   git checkout release-1.2.3
   git push origin main --force-with-lease
   ```

3. **Redeploy:**
   ```bash
   # Deploy will trigger automatically via CI/CD
   # Monitor deployment in GitHub Actions
   ```

4. **Verify Rollback:**
   ```bash
   # Check health endpoint
   curl https://api.imbobi.com/health
   
   # Monitor error rate in Sentry/DataDog
   # Error rate should drop below 1%
   
   # Check application logs
   tail -f /var/log/imbobi-api/app.log
   ```

5. **Post-Rollback Review:**
   - Create incident report
   - Root cause analysis (RCA)
   - Add regression test to prevent recurrence
   - Schedule post-mortem meeting

**Automated Rollback (if supported):**
```yaml
deploy:
  on_failure:
    # Automatically rollback if deployment fails
    - trigger: 'deployment_failed'
      action: 'rollback_to_previous'
      notify: 'ops-team@company.com'
```

## Health Check Endpoints

Configure health checks for each service:

**API Health Endpoint:**
```typescript
// services/api/src/health/health.controller.ts
@Controller('health')
export class HealthController {
  @Get()
  health(@Inject(PrismaService) db: PrismaService) {
    // Check database connection
    await db.$queryRaw`SELECT 1`;
    
    // Check Redis connection
    await redis.ping();
    
    return { status: 'ok', timestamp: new Date() };
  }
}
```

**Monitoring Configuration:**
```yaml
# In your monitoring tool (New Relic, DataDog, etc.)
health_check:
  endpoint: https://api.imbobi.com/health
  interval: 30s
  timeout: 5s
  expected_status: 200
  alerts:
    - condition: failed_checks > 2  # 2 consecutive failures
      action: notify_ops
```

## Incident Response

### Severity Levels

- **SEV-1 (Critical):** Complete service outage, data loss, or security breach
- **SEV-2 (High):** Partial outage or significant degradation (>50% error rate)
- **SEV-3 (Medium):** Limited impact, workaround available
- **SEV-4 (Low):** Minor issues, no user-facing impact

### Escalation Path

1. Alert triggers in monitoring system
2. Auto-notification to on-call engineer (PagerDuty)
3. If not acknowledged within 5 min → Escalate to team lead
4. SEV-1 → Declare incident, notify full team
5. Conduct real-time triage in #incidents Slack channel

## Useful Commands

```bash
# View logs from all services
docker compose logs -f

# Check database migrations status
pnpm db:migrate:status

# Monitor queue jobs
redis-cli
> KEYS bullmq:*
> LLEN bullmq:jobs:<job-name>

# Profile API performance
curl -H "X-Debug: true" https://api.imbobi.com/api/endpoint

# Export metrics for analysis
curl https://api.imbobi.com/metrics | tee metrics.json
```

## References

- [New Relic Node.js Agent](https://docs.newrelic.com/docs/apm/agents/nodejs-agent/)
- [DataDog Node.js Tracing](https://docs.datadoghq.com/tracing/trace_collection/dd_libraries/nodejs/)
- [Sentry Error Tracking](https://docs.sentry.io/platforms/node/)
- [BullMQ Documentation](https://docs.bullmq.io/)
- [Prisma Performance](https://www.prisma.io/docs/guides/performance-and-optimization)

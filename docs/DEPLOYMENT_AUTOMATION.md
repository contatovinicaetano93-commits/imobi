# Deployment Automation — Phase 3F

**Status**: Production-Ready Strategies Provided  
**Branch**: `claude/imobi-mvp-fintech-status-jrr2ab`  
**Date**: June 2026

---

## Overview

Phase 3F implements zero-downtime deployment strategies for Imobi API:

1. **Blue-Green Deployment** — Two identical production environments
2. **Canary Releases** — Gradual rollout with automatic rollback
3. **Feature Flags** — Runtime feature toggling without redeploy
4. **Health Checks & Rollback** — Automatic revert on failure

These strategies enable safe, frequent deployments (multiple per day) with confidence.

---

## 1. Blue-Green Deployment

### Strategy

Maintain two identical production environments:
- **Blue**: Current production (receiving 100% traffic)
- **Green**: New deployment (receiving 0% traffic initially)

### Process

```
1. Green deployed (new version)
2. Green health checks pass
3. All traffic switched to Green
4. Blue becomes standby
5. If issues: Instant switch back to Blue
6. After confidence period: Blue can be updated
```

### Zero-Downtime Benefit

- No traffic lost during switch (instant, atomic)
- Easy rollback (one switch back to Blue)
- Full testing possible before cutover
- Database migration can happen gradually

### Implementation: Kubernetes

```yaml
apiVersion: v1
kind: Service
metadata:
  name: imobi-api
spec:
  selector:
    app: imobi-api
    deployment: blue  # Can be switched to "green"
  ports:
  - port: 80
    targetPort: 3000

---
# Blue deployment (current production)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: imobi-api-blue
spec:
  replicas: 3
  selector:
    matchLabels:
      app: imobi-api
      deployment: blue
  template:
    metadata:
      labels:
        app: imobi-api
        deployment: blue
        version: "1.2.3"  # Current production version
    spec:
      containers:
      - name: api
        image: imobi-api:1.2.3

---
# Green deployment (new version, not receiving traffic yet)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: imobi-api-green
spec:
  replicas: 3
  selector:
    matchLabels:
      app: imobi-api
      deployment: green
  template:
    metadata:
      labels:
        app: imobi-api
        deployment: green
        version: "1.3.0"  # New version
    spec:
      containers:
      - name: api
        image: imobi-api:1.3.0
```

### Traffic Switch

```bash
# Deploy Green with new version
kubectl apply -f green-deployment.yaml

# Wait for Green pods to be healthy
kubectl wait --for=condition=Ready pod \
  -l deployment=green -n imobi --timeout=300s

# Run smoke tests against Green
./test/smoke-tests.sh http://green.internal:3000

# If tests pass: Switch traffic to Green
kubectl patch service imobi-api -p \
  '{"spec":{"selector":{"deployment":"green"}}}'

# Monitor Green in production
kubectl logs -l deployment=green -f --tail=100

# If issues: Instant rollback to Blue
kubectl patch service imobi-api -p \
  '{"spec":{"selector":{"deployment":"blue"}}}'
```

### Database Migrations

For schema changes:

```bash
# Before deploying Green
./bin/migrate.sh up  # Apply migrations

# Deploy Green (uses new schema)
kubectl apply -f green-deployment.yaml

# After Green is stable (hours/days)
# Blue can be safely retired (uses new schema too)

# Rollback strategy: Keep migrations backward-compatible
# Old Blue version can still read new schema
# This allows rollback without schema revert
```

---

## 2. Canary Releases

### Strategy

Gradually shift traffic to new version, monitoring for errors:

```
100% Blue (0% Green) → 5% Green → 25% Green → 50% Green → 100% Green
  ↓          ↓           ↓          ↓          ↓          ↓
 OK        Metrics    Metrics   Metrics    Metrics     Done
           OK         OK         OK         OK

If error rate > 1%: ROLLBACK instantly
```

### Implementation: Istio VirtualService

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: imobi-api
spec:
  hosts:
  - api.imobi.com
  http:
  - match:
    - uri:
        prefix: /
    route:
    - destination:
        host: imobi-api-blue
        port:
          number: 3000
      weight: 95  # 95% traffic to Blue
    - destination:
        host: imobi-api-green
        port:
          number: 3000
      weight: 5   # 5% traffic to Green (canary)
    timeout: 30s
    retries:
      attempts: 3
      perTryTimeout: 10s
```

### Canary Release Script

```bash
#!/bin/bash
set -e

VERSION=$1  # e.g., "1.3.0"
DEPLOYMENT="imobi-api"

echo "[CANARY] Starting canary release for version $VERSION"

# Deploy Green
kubectl set image deployment/$DEPLOYMENT-green \
  api=imobi-api:$VERSION

# Wait for rollout
kubectl rollout status deployment/$DEPLOYMENT-green

# Canary progression
WEIGHTS=(5 25 50 75 100)
DURATION_PER_STEP=300  # 5 minutes per step

for WEIGHT in "${WEIGHTS[@]}"; do
  echo "[CANARY] Shifting $WEIGHT% traffic to Green"
  
  # Update traffic split
  kubectl patch vs $DEPLOYMENT --type merge -p \
    "{\"spec\":{\"http\":[{\"route\":[
      {\"destination\":{\"host\":\"$DEPLOYMENT-blue\"},\"weight\":$((100-WEIGHT))},
      {\"destination\":{\"host\":\"$DEPLOYMENT-green\"},\"weight\":$WEIGHT}
    ]}]}}"

  # Monitor for 5 minutes
  ERROR_RATE=$(kubectl logs -l deployment=imobi-api-green \
    --tail=10000 | grep -c "ERROR" || true)
  ERROR_PERCENTAGE=$((ERROR_RATE / 100))  # Rough estimate

  if [ $ERROR_PERCENTAGE -gt 1 ]; then
    echo "[CANARY] Error rate > 1%, ROLLING BACK!"
    kubectl patch vs $DEPLOYMENT --type merge -p \
      '{"spec":{"http":[{"route":[
        {"destination":{"host":"imobi-api-blue"},"weight":100},
        {"destination":{"host":"imobi-api-green"},"weight":0}
      ]}]}}'
    exit 1
  fi

  sleep $DURATION_PER_STEP
done

echo "[CANARY] Canary release successful, 100% on Green"
```

### Canary Rollback Triggers

```typescript
// Automatic rollback if:
error_rate > 1%                           // Error rate threshold
latency_p99 > 1000ms                      // Latency threshold
heap_memory > 80%                         // Resource threshold
circuit_breaker_open_count > 5            // Resilience threshold
```

---

## 3. Feature Flags

### Strategy

Toggle features without redeploying:
- A/B testing (50% users see feature A, 50% see B)
- Gradual rollout (1% → 25% → 100%)
- Kill switch (disable feature instantly if broken)
- Tenant-specific features

### Implementation: LaunchDarkly Example

```typescript
import { LDClient } from '@launchdarkly/node-server-sdk';

@Injectable()
export class FeatureFlagService {
  private ldClient: LDClient;

  constructor() {
    this.ldClient = new LDClient(process.env.LAUNCHDARKLY_SDK_KEY);
  }

  async isFeatureEnabled(
    featureName: string,
    userId: string,
    attributes?: Record<string, any>,
  ): Promise<boolean> {
    const user = {
      key: userId,
      ...attributes,  // Can include: email, tier, country, etc
    };

    return await this.ldClient.variation(featureName, user, false);
  }

  async getFeatureValue<T>(
    featureName: string,
    userId: string,
    defaultValue: T,
  ): Promise<T> {
    const user = { key: userId };
    return await this.ldClient.variation(featureName, user, defaultValue);
  }
}
```

### Usage in Controller

```typescript
@Post('/credito/solicitar')
async solicitarCredito(
  @Req() req: Request,
  @Body() body: SolicitarCreditoDto,
) {
  const usuarioId = req.user.id;

  // Check if advanced credit scoring enabled
  const useAdvancedScoring = await this.featureFlag.isFeatureEnabled(
    'advanced-credit-scoring',
    usuarioId,
  );

  let score: number;
  if (useAdvancedScoring) {
    // New algorithm (being rolled out)
    score = await this.creditoService.calculateScoreV2(usuarioId);
  } else {
    // Legacy algorithm (stable)
    score = await this.creditoService.calculateScoreV1(usuarioId);
  }

  // ... continue with credit approval
}
```

### Feature Flag Targeting

```
Feature: "advanced-credit-scoring"

Enable for:
  - Tier: PREMIUM, ENTERPRISE (not FREE)
  - Country: BR (Brazil only)
  - Custom attribute: "beta_tester" = true
  - Percentage rollout: 25% of eligible users
```

### Feature Flag Strategy

```
Day 1:  0% (disabled, development complete)
Day 2:  5% (canary, beta testers)
Day 3: 10% (expanding, monitor metrics)
Day 4: 25% (wider rollout)
Day 5: 50% (half of users)
Day 7: 100% (all users, kill switch ready)
```

---

## 4. Health Checks & Automatic Rollback

### Liveness & Readiness Probes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: imobi-api
spec:
  template:
    spec:
      containers:
      - name: api
        image: imobi-api:latest
        ports:
        - containerPort: 3000
        
        # Readiness: Can accept traffic?
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
          successThreshold: 1
          failureThreshold: 3
        
        # Liveness: Restart if stuck?
        livenessProbe:
          httpGet:
            path: /health/live
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 3
          failureThreshold: 3
```

### Health Check Endpoints

```typescript
@Controller('health')
export class HealthController {
  constructor(
    private db: PrismaService,
    private redis: RedisService,
  ) {}

  /**
   * Readiness: Can this instance serve traffic?
   * Returns 200 if ready, 503 if not
   */
  @Get('ready')
  async ready(): Promise<{ status: 'ready' | 'notready' }> {
    try {
      // Check critical dependencies
      await this.db.$queryRaw`SELECT 1`;
      await this.redis.ping();

      return { status: 'ready' };
    } catch (error) {
      throw new ServiceUnavailableException('Dependencies not ready');
    }
  }

  /**
   * Liveness: Is this instance alive (not deadlocked)?
   * Returns 200 if alive, 503 if not
   */
  @Get('live')
  async live(): Promise<{ status: 'live' | 'dead' }> {
    // Quick check: just return if memory usage normal
    const memory = process.memoryUsage();
    const heapUsedPercent = (memory.heapUsed / memory.heapTotal) * 100;

    if (heapUsedPercent > 90) {
      throw new ServiceUnavailableException('Heap memory critical');
    }

    return { status: 'live' };
  }

  /**
   * Full diagnostics (not used for deployment decisions)
   */
  @Get()
  async diagnostic(): Promise<{
    version: string;
    uptime: number;
    memory: NodeJS.MemoryUsage;
    database: boolean;
    cache: boolean;
  }> {
    return {
      version: '1.3.0',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      database: await this.checkDatabase(),
      cache: await this.checkCache(),
    };
  }

  private async checkDatabase(): Promise<boolean> {
    try {
      await this.db.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  private async checkCache(): Promise<boolean> {
    try {
      await this.redis.ping();
      return true;
    } catch {
      return false;
    }
  }
}
```

### Automatic Rollback on Failure

```bash
#!/bin/bash
# Deployment script with automatic rollback

set -e

VERSION=$1
DEPLOYMENT="imobi-api-green"
TIMEOUT=300  # 5 minutes to stabilize

echo "[DEPLOY] Deploying version $VERSION"

# 1. Deploy new version
kubectl set image deployment/$DEPLOYMENT \
  api=imobi-api:$VERSION

# 2. Wait for rollout
kubectl rollout status deployment/$DEPLOYMENT --timeout=${TIMEOUT}s

# 3. Run smoke tests
HEALTH_CHECK_URL="http://imobi-api-green.default.svc.cluster.local:3000/health/ready"
RETRIES=30
RETRY_DELAY=5

for i in $(seq 1 $RETRIES); do
  if curl -f $HEALTH_CHECK_URL > /dev/null 2>&1; then
    echo "[DEPLOY] Health check passed"
    break
  fi
  
  if [ $i -eq $RETRIES ]; then
    echo "[DEPLOY] Health check failed after $TIMEOUT seconds, ROLLING BACK"
    kubectl rollout undo deployment/$DEPLOYMENT
    kubectl rollout status deployment/$DEPLOYMENT
    exit 1
  fi
  
  sleep $RETRY_DELAY
done

# 4. Monitor error rate for 2 minutes
echo "[DEPLOY] Monitoring error rate..."
ERROR_BASELINE=$(kubectl logs -l deployment=$DEPLOYMENT \
  --tail=1000 | grep -c "ERROR" || true)
BASELINE_PERCENTAGE=$((ERROR_BASELINE / 10))

sleep 120

ERROR_AFTER=$(kubectl logs -l deployment=$DEPLOYMENT \
  --tail=1000 | grep -c "ERROR" || true)
AFTER_PERCENTAGE=$((ERROR_AFTER / 10))

if [ $AFTER_PERCENTAGE -gt $((BASELINE_PERCENTAGE + 5)) ]; then
  echo "[DEPLOY] Error rate spiked, ROLLING BACK"
  kubectl rollout undo deployment/$DEPLOYMENT
  kubectl rollout status deployment/$DEPLOYMENT
  exit 1
fi

echo "[DEPLOY] Deployment successful!"
```

---

## Deployment Checklist

### Before Deployment

- [ ] All tests passing (unit, integration, E2E)
- [ ] Code reviewed and approved (2+ reviewers)
- [ ] Type checking: 0 errors
- [ ] Linting: 0 errors
- [ ] Build successful (full production build)
- [ ] Security scan passed (no CVEs)
- [ ] Performance benchmarks acceptable
- [ ] Database migrations tested (and backward-compatible)
- [ ] Documentation updated
- [ ] Changelog updated
- [ ] Release notes prepared

### During Deployment

- [ ] Backup current database state
- [ ] Monitor error logs in real-time
- [ ] Monitor metrics (latency, error rate, CPU, memory)
- [ ] Have rollback plan ready
- [ ] Team available for issues

### After Deployment

- [ ] Monitor new version for 24 hours
- [ ] Check for anomalies in logs
- [ ] Verify user-facing features work
- [ ] Performance metrics match baseline
- [ ] Error rate normal (< 0.1%)
- [ ] Document any issues and resolutions

---

## GitHub Actions CI/CD

### Build & Test Pipeline

```yaml
name: CI/CD

on:
  push:
    branches: [main, claude/imobi-mvp-*]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
    - uses: actions/checkout@v3
    
    - uses: pnpm/action-setup@v2
    - uses: actions/setup-node@v3
      with:
        node-version: 18
        cache: 'pnpm'
    
    - run: pnpm install
    - run: pnpm type-check
    - run: pnpm lint
    - run: pnpm build
    - run: pnpm test
    - run: pnpm test:e2e

  security:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Run security scan
      run: npm audit --production
    - name: SAST scan
      uses: github/super-linter@v4

  deploy:
    needs: [test, security]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Build Docker image
      run: docker build -t imobi-api:${{ github.sha }} .
    
    - name: Push to registry
      run: docker push registry.example.com/imobi-api:${{ github.sha }}
    
    - name: Deploy to production
      run: |
        kubectl set image deployment/imobi-api-green \
          api=registry.example.com/imobi-api:${{ github.sha }}
        ./scripts/canary-release.sh
```

---

## Monitoring & Alerts

### Metrics to Monitor

| Metric | Baseline | Alert If |
|--------|----------|----------|
| Error rate | < 0.1% | > 0.5% (5x) |
| p99 latency | 500ms | > 2000ms (4x) |
| p95 latency | 200ms | > 1000ms (5x) |
| Database latency | 50ms | > 200ms (4x) |
| Cache hit rate | 85% | < 70% (drop) |
| Heap memory | 500MB | > 800MB (increase) |
| CPU usage | 40% | > 80% (increase) |
| Requests/sec | 5000 | > 8000 (increase) |

### Deployment Blast Radius

```
LOW RISK (<0.1% users):
- Features behind feature flags (disabled by default)
- Backend refactors (no API changes)
- Dependency updates (patch versions)

MEDIUM RISK (1-5% users):
- Minor API changes (backward compatible)
- Database schema additions
- Configuration changes

HIGH RISK (>5% users):
- API breaking changes
- Major version upgrades
- Database schema removals
```

---

## Post-Incident Review

After any production incident:

1. **Timeline**: When did it start? When detected? When resolved?
2. **Root cause**: Why did it happen?
3. **Detection**: How was it discovered? Could it have been automated?
4. **Recovery**: How was it fixed? How long did it take?
5. **Prevention**: What changes prevent recurrence?

Example:

```
INCIDENT: Error rate spiked to 5% for 15 minutes

TIMELINE:
  14:05 - Deployment started (v1.3.0)
  14:08 - New version deployed, 5% canary
  14:12 - Error rate spiked to 5%, auto-rollback triggered
  14:13 - Rollback complete, error rate normal
  Total incident duration: 8 minutes

ROOT CAUSE:
  - New JWT verification logic had bug with malformed tokens
  - Affecting ~2% of users with old client versions

PREVENTION:
  - Add pre-deployment test for legacy token validation
  - Canary monitoring caught issue before full rollout (good!)
  - Reduce canary wait time if auto-rollback available
```

---

## Success Metrics

- **Deployment frequency**: Multiple per day (safe)
- **Lead time for changes**: < 1 day
- **Mean time to recovery (MTTR)**: < 5 minutes (auto-rollback)
- **Change failure rate**: < 5%
- **Incident response**: < 15 minutes

---

**Status**: Ready for Production  
**Phase**: 3F — Deployment Automation  
**Next**: Ongoing improvements and monitoring

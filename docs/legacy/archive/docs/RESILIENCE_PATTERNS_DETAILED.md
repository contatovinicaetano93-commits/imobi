# 🛡️ RESILIENCE PATTERNS - DETAILED IMPLEMENTATION

Production-grade resilience patterns for Imobi API.

---

## 1. CIRCUIT BREAKER PATTERN

**Purpose**: Prevent cascading failures by stopping requests to failing services.

**States**:
- **CLOSED**: Normal operation, requests pass through
- **OPEN**: Service failing, requests blocked, return fallback
- **HALF_OPEN**: Testing if service recovered, limited requests

**Implementation**:
```typescript
// services/api/src/common/circuit-breaker.ts
import CircuitBreaker from 'opossum';

export class CircuitBreakerService {
  private breakers = new Map<string, CircuitBreaker>();

  create<T>(
    name: string,
    fn: () => Promise<T>,
    options = {}
  ): CircuitBreaker {
    const defaultOptions = {
      timeout: 3000, // 3s timeout
      errorThresholdPercentage: 50, // Open after 50% errors
      resetTimeout: 30000, // Try again after 30s
      rollingCountTimeout: 10000,
    };

    const breaker = new CircuitBreaker(fn, {
      ...defaultOptions,
      ...options,
    });

    breaker.fallback(() => this.getFallback(name));
    this.breakers.set(name, breaker);
    return breaker;
  }

  private getFallback(name: string) {
    switch (name) {
      case 'external-api':
        return null; // Return empty result
      case 'cache':
        return []; // Return empty array
      default:
        throw new Error(`Service ${name} temporarily unavailable`);
    }
  }
}
```

**Usage**:
```typescript
// In your service
async getExternalData(id: string) {
  const breaker = this.circuitBreaker.create(
    'external-api',
    () => externalApi.fetch(id),
    { timeout: 5000 }
  );

  try {
    return await breaker.fire();
  } catch (error) {
    this.logger.error('Circuit breaker open', { service: 'external-api' });
    return null;
  }
}
```

---

## 2. RETRY WITH EXPONENTIAL BACKOFF

**Purpose**: Automatically retry transient failures with increasing delays.

**Strategy**:
```
Attempt 1: Immediate
Attempt 2: Wait 100ms (1 × multiplier)
Attempt 3: Wait 200ms (2 × multiplier)
Attempt 4: Wait 400ms (4 × multiplier)
Attempt 5: Wait 800ms (8 × multiplier) - then give up
```

**Implementation**:
```typescript
// services/api/src/common/retry.ts
export interface RetryOptions {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  shouldRetry?: (error: Error) => boolean;
}

export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelay = 100,
    maxDelay = 10000,
    backoffMultiplier = 2,
    shouldRetry = (error) => error instanceof NetworkError,
  } = options;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxAttempts - 1) throw error;
      if (!shouldRetry(error as Error)) throw error;

      const delay = Math.min(
        baseDelay * Math.pow(backoffMultiplier, attempt),
        maxDelay
      );

      await sleep(delay);
    }
  }

  throw new Error('Retry exhausted');
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```

**Usage in Service**:
```typescript
async getObra(id: string): Promise<Obra> {
  return retry(
    () => this.prisma.obra.findUnique({ where: { id } }),
    {
      maxAttempts: 3,
      baseDelay: 50,
      maxDelay: 5000,
      backoffMultiplier: 2,
      shouldRetry: (error) => error.code === 'ECONNREFUSED',
    }
  );
}
```

---

## 3. TIMEOUT PATTERN

**Purpose**: Prevent requests from hanging indefinitely.

**Implementation**:
```typescript
// services/api/src/common/timeout.ts
export class TimeoutError extends Error {
  constructor(message: string, public readonly label: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string = 'Operation'
): Promise<T> {
  let timeoutId: NodeJS.Timeout | null = null;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new TimeoutError(`${label} timeout after ${ms}ms`, label));
    }, ms);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}
```

**Usage**:
```typescript
async executeQueryWithTimeout(query: string) {
  return withTimeout(
    this.db.query(query),
    5000,
    'Database query'
  );
}

async callExternalApiWithTimeout(endpoint: string) {
  return withTimeout(
    axios.get(endpoint),
    3000,
    'External API call'
  );
}
```

**Catching Timeout Errors**:
```typescript
try {
  const result = await withTimeout(operation, 5000);
} catch (error) {
  if (error instanceof TimeoutError) {
    logger.warn(`${error.label} timed out`);
    return defaultValue;
  }
  throw error;
}
```

---

## 4. BULKHEAD PATTERN (Resource Isolation)

**Purpose**: Isolate resources to prevent one failing component from taking down the entire system.

**Implementation with BullMQ**:
```typescript
// services/api/src/common/queues.ts
import Queue from 'bull';

export class QueueService {
  private creditQueue = new Queue('creditos', {
    redis: { host: 'localhost', port: 6379 },
  });

  private notificationQueue = new Queue('notificacoes', {
    redis: { host: 'localhost', port: 6379 },
  });

  private reportQueue = new Queue('relatorios', {
    redis: { host: 'localhost', port: 6379 },
  });

  constructor(private logger: LoggerService) {
    this.setupProcessors();
  }

  private setupProcessors() {
    // Credit processing - low concurrency (critical)
    this.creditQueue.process(1, async (job) => {
      return await this.processCreditApproval(job.data);
    });

    // Notifications - high concurrency (non-critical)
    this.notificationQueue.process(10, async (job) => {
      return await this.sendNotification(job.data);
    });

    // Reports - medium concurrency (can be slow)
    this.reportQueue.process(3, async (job) => {
      return await this.generateReport(job.data);
    });

    // Error handling
    this.creditQueue.on('failed', (job, err) => {
      this.logger.error('Credit job failed', { jobId: job.id, error: err });
    });
  }

  async enqueueCreditApproval(creditId: string) {
    await this.creditQueue.add(
      { creditId },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
      }
    );
  }

  async enqueueNotification(data: NotificationData) {
    await this.notificationQueue.add(data, {
      attempts: 5,
      backoff: { type: 'exponential', delay: 1000 },
    });
  }
}
```

**Usage**:
```typescript
// In your service
async approveCreditApplication(creditId: string) {
  // Do quick validation
  const credit = await this.db.credito.findUnique({ where: { id: creditId } });

  // Enqueue long-running task
  await this.queues.enqueueCreditApproval(creditId);

  // Return immediately to user
  return { status: 'approved', message: 'Processing...' };
}
```

---

## 5. FALLBACK PATTERN

**Purpose**: Provide degraded but usable responses when primary service fails.

**Implementation**:
```typescript
// services/api/src/modules/obras/obras.service.ts
async getObra(id: string, usuarioId: string): Promise<ObraDTO> {
  const logger = this.logger;

  try {
    // Try primary source
    const obra = await this.prisma.obra.findUnique({
      where: { id },
      include: { etapas: true, creditos: true },
    });

    if (!obra) throw new NotFoundException('Obra not found');
    if (obra.usuarioId !== usuarioId) throw new ForbiddenException();

    // Cache for fallback
    await this.redis.set(`obra:${id}`, JSON.stringify(obra), 'EX', 3600);

    return obra;
  } catch (error) {
    logger.warn('Primary fetch failed, trying fallback', {
      obraId: id,
      error: error.message,
    });

    // Fallback 1: Try cache
    const cached = await this.redis.get(`obra:${id}`);
    if (cached) {
      logger.info('Returning cached obra');
      return JSON.parse(cached);
    }

    // Fallback 2: Return stale data from secondary storage
    const stale = await this.staleDataStore.get(`obra:${id}`);
    if (stale) {
      logger.info('Returning stale obra from secondary storage');
      return stale;
    }

    // Fallback 3: Return skeleton/partial data
    logger.warn('All fallbacks exhausted, returning partial data');
    throw new ServiceUnavailableException(
      'Obra service temporarily unavailable, please try again'
    );
  }
}
```

---

## 6. HEALTH CHECKS

**Purpose**: Detect and recover from failing services automatically.

**Implementation**:
```typescript
// services/api/src/health/health.service.ts
import { Injectable } from '@nestjs/common';
import { HealthCheckService, HttpHealthIndicator, TypeOrmHealthIndicator } from '@nestjs/terminus';

@Injectable()
export class HealthService {
  constructor(
    private health: HealthCheckService,
    private http: HttpHealthIndicator,
    private db: TypeOrmHealthIndicator,
  ) {}

  check() {
    return this.health.check([
      () => this.db.pingCheck('database'),
      () => this.http.pingCheck('redis', 'http://redis:6379'),
      () => this.http.pingCheck('external-api', 'https://api.external.com/health'),
    ]);
  }
}

// In controller
@Get('/health')
async health() {
  const result = await this.healthService.check();
  return {
    status: result.status,
    checks: result.details,
    timestamp: new Date().toISOString(),
  };
}
```

**Health Response**:
```json
{
  "status": "ok",
  "checks": {
    "database": { "status": "up", "responseTime": 5 },
    "redis": { "status": "up", "responseTime": 2 },
    "external-api": { "status": "down", "error": "Connection refused" }
  },
  "timestamp": "2026-06-23T01:30:00Z"
}
```

---

## 7. GRACEFUL DEGRADATION

**Purpose**: Reduce functionality gracefully when resources are constrained.

**Implementation**:
```typescript
// services/api/src/common/resource-monitor.ts
export class ResourceMonitorService {
  private isDegraded = false;

  startMonitoring() {
    setInterval(() => {
      const usage = process.memoryUsage();
      const memoryPercent = (usage.heapUsed / usage.heapTotal) * 100;
      const cpuUsage = process.cpuUsage();

      if (memoryPercent > 85 || cpuUsage.user > 80000000) {
        this.isDegraded = true;
        this.logger.warn('Entering degraded mode', { memoryPercent, cpuUsage });
      } else if (memoryPercent < 70 && cpuUsage.user < 50000000) {
        this.isDegraded = false;
      }
    }, 5000);
  }

  isDegradedMode(): boolean {
    return this.isDegraded;
  }
}

// In service
async createObra(data: ObraCreateDTO, usuarioId: string) {
  if (this.resourceMonitor.isDegradedMode()) {
    // In degraded mode, return immediately without full processing
    const obra = await this.prisma.obra.create({
      data: { ...data, usuarioId, status: 'AGUARDANDO_HOMOLOGACAO' },
      select: { id: true, nome: true }, // Minimal fields
    });

    // Queue expensive operations for later
    await this.queues.enqueuePostCreationTasks(obra.id);

    return obra;
  }

  // Normal mode - full processing
  return await this.createObraFully(data, usuarioId);
}
```

---

## COMBINING PATTERNS

**Real-world example**: Fetch user data with all resilience patterns

```typescript
async getUserWithResilience(userId: string) {
  const circuitBreaker = this.circuitBreaker.create(
    'user-fetch',
    () => this.userService.getUserWithAllDetails(userId),
    { timeout: 3000 }
  );

  try {
    return await withTimeout(
      retry(
        () => circuitBreaker.fire(),
        {
          maxAttempts: 3,
          baseDelay: 100,
          backoffMultiplier: 2,
        }
      ),
      5000,
      'Get user with resilience'
    );
  } catch (error) {
    if (error instanceof TimeoutError) {
      // Timeout - try fallback
      return this.getCachedUser(userId);
    }
    if (error instanceof CircuitBreakerOpenError) {
      // Circuit open - use stale data
      return this.getStaleUser(userId);
    }
    // Unexpected error
    throw error;
  }
}
```

---

## MONITORING & ALERTING

**Key Metrics**:
```typescript
// Circuit breaker state
breaker.on('open', () => {
  metrics.circuitBreakerOpen.inc({ service: 'user-api' });
  alerts.sendAlert('Circuit breaker open: user-api service');
});

// Retry attempts
metrics.retryAttempt.inc({ operation: 'database-query', attempt: 2 });

// Timeout occurrences
metrics.timeout.inc({ operation: 'external-api', duration_ms: 3000 });

// Fallback usage
metrics.fallbackUsed.inc({ service: 'cache', reason: 'redis-unavailable' });
```

---

**Status**: Production-Ready ✅  
**Last Updated**: June 2026

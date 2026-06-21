type State = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  threshold?: number;   // consecutive failures before opening (default 5)
  timeoutMs?: number;   // time to wait before trying again (default 60s)
}

/**
 * Simple in-process circuit breaker.
 * Create one instance per external service (email, S3, FCM, webhook delivery).
 * Thread-safe enough for Node.js single-threaded event loop.
 */
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: State = 'CLOSED';
  private readonly threshold: number;
  private readonly timeoutMs: number;

  constructor(opts: CircuitBreakerOptions = {}) {
    this.threshold = opts.threshold ?? 5;
    this.timeoutMs = opts.timeoutMs ?? 60_000;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime >= this.timeoutMs) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker OPEN — service temporarily unavailable');
      }
    }

    try {
      const result = await fn();
      if (this.state === 'HALF_OPEN') this.reset();
      return result;
    } catch (err) {
      this.failures++;
      this.lastFailureTime = Date.now();
      if (this.failures >= this.threshold) this.state = 'OPEN';
      throw err;
    }
  }

  get isOpen(): boolean {
    return this.state === 'OPEN';
  }

  private reset() {
    this.failures = 0;
    this.state = 'CLOSED';
  }
}

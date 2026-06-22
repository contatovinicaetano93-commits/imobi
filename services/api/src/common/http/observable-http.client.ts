import { Injectable } from '@nestjs/common';
import { CircuitBreakerService, RetryPolicyService, withTimeoutAndFallback } from '../resilience';
import { StructuredLoggerService } from '../logging/structured-logger.service';

@Injectable()
export class ObservableHttpClient {
  private circuitBreakers: Map<string, CircuitBreakerService> = new Map();
  private retryPolicies: Map<string, RetryPolicyService> = new Map();

  constructor(private logger: StructuredLoggerService) {}

  private getCircuitBreaker(serviceName: string): CircuitBreakerService {
    if (!this.circuitBreakers.has(serviceName)) {
      this.circuitBreakers.set(
        serviceName,
        new CircuitBreakerService({
          name: serviceName,
          failureThreshold: 5,
          resetTimeout: 60000,
          monitorInterval: 10000,
        }),
      );
    }
    return this.circuitBreakers.get(serviceName)!;
  }

  private getRetryPolicy(serviceName: string): RetryPolicyService {
    if (!this.retryPolicies.has(serviceName)) {
      this.retryPolicies.set(
        serviceName,
        new RetryPolicyService({
          name: serviceName,
          maxAttempts: 3,
          initialDelayMs: 100,
          maxDelayMs: 5000,
          multiplier: 2,
        }),
      );
    }
    return this.retryPolicies.get(serviceName)!;
  }

  async get<T>(
    serviceName: string,
    url: string,
    options?: RequestInit,
  ): Promise<T> {
    const start = Date.now();
    const circuitBreaker = this.getCircuitBreaker(serviceName);
    const retryPolicy = this.getRetryPolicy(serviceName);

    try {
      const result = await circuitBreaker.execute(
        () =>
          retryPolicy.execute(() =>
            withTimeoutAndFallback(
              fetch(url, { ...options, method: 'GET' }).then((res) => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.json();
              }),
              5000,
              () => this.getFallbackValue(),
            ),
          ),
        () => this.getFallbackValue(),
      );

      const duration = Date.now() - start;
      this.logger.logPerformance(`${serviceName} GET ${url}`, duration, {
        status: 'success',
      });

      return result;
    } catch (error) {
      const duration = Date.now() - start;
      this.logger.error(`Failed to GET ${url} from ${serviceName}`, {
        error: error instanceof Error ? error.message : String(error),
        duration,
        circuitState: circuitBreaker.getState(),
      });
      throw error;
    }
  }

  async post<T>(
    serviceName: string,
    url: string,
    body: any,
    options?: RequestInit,
  ): Promise<T> {
    const start = Date.now();
    const circuitBreaker = this.getCircuitBreaker(serviceName);
    const retryPolicy = this.getRetryPolicy(serviceName);

    try {
      const result = await circuitBreaker.execute(
        () =>
          retryPolicy.execute(() =>
            withTimeoutAndFallback(
              fetch(url, {
                ...options,
                method: 'POST',
                body: JSON.stringify(body),
                headers: { 'Content-Type': 'application/json' },
              }).then((res) => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.json();
              }),
              5000,
              () => this.getFallbackValue(),
            ),
          ),
      );

      const duration = Date.now() - start;
      this.logger.logPerformance(`${serviceName} POST ${url}`, duration, {
        status: 'success',
      });

      return result;
    } catch (error) {
      const duration = Date.now() - start;
      this.logger.error(`Failed to POST ${url} to ${serviceName}`, {
        error: error instanceof Error ? error.message : String(error),
        duration,
        circuitState: circuitBreaker.getState(),
      });
      throw error;
    }
  }

  private getFallbackValue(): Promise<any> {
    return Promise.resolve({
      cached: true,
      fallback: true,
      timestamp: new Date(),
    });
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { PrometheusService } from '../observability/prometheus.service';

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number;
  monitorInterval: number;
  name: string;
  prometheus?: PrometheusService;
}

@Injectable()
export class CircuitBreakerService {
  private logger = new Logger(CircuitBreakerService.name);
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime: number | null = null;
  private readonly config: CircuitBreakerConfig;

  constructor(config: CircuitBreakerConfig) {
    this.config = config;
  }

  async execute<T>(
    fn: () => Promise<T>,
    fallback?: () => Promise<T>,
  ): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (
        this.lastFailureTime &&
        Date.now() - this.lastFailureTime > this.config.resetTimeout
      ) {
        const prevState = this.state;
        this.state = CircuitState.HALF_OPEN;
        this.config.prometheus?.recordCircuitBreakerStateChange(
          this.config.name,
          prevState,
          this.state,
        );
        this.logger.warn(
          `[${this.config.name}] Circuit breaker moved to HALF_OPEN`,
        );
      } else {
        this.logger.warn(
          `[${this.config.name}] Circuit breaker is OPEN, using fallback`,
        );
        if (fallback) return fallback();
        throw new Error(
          `Circuit breaker is OPEN for ${this.config.name}. Service unavailable.`,
        );
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      // After failure, if state is OPEN, use fallback
      if (fallback && (this.state as CircuitState) === CircuitState.OPEN) {
        this.logger.warn(
          `[${this.config.name}] Executing fallback after failure`,
        );
        return fallback();
      }
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= 2) {
        const prevState = this.state;
        this.state = CircuitState.CLOSED;
        this.config.prometheus?.recordCircuitBreakerStateChange(
          this.config.name,
          prevState,
          this.state,
        );
        this.successCount = 0;
        this.logger.log(
          `[${this.config.name}] Circuit breaker closed after successful recovery`,
        );
      }
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (
      this.failureCount >= this.config.failureThreshold &&
      this.state === CircuitState.CLOSED
    ) {
      const prevState = this.state;
      this.state = CircuitState.OPEN;
      this.config.prometheus?.recordCircuitBreakerStateChange(
        this.config.name,
        prevState,
        this.state,
      );
      this.logger.error(
        `[${this.config.name}] Circuit breaker opened after ${this.failureCount} failures`,
      );
    }

    if (this.state === CircuitState.HALF_OPEN) {
      const prevState = this.state;
      this.state = CircuitState.OPEN;
      this.config.prometheus?.recordCircuitBreakerStateChange(
        this.config.name,
        prevState,
        this.state,
      );
      this.logger.warn(
        `[${this.config.name}] Circuit breaker reopened during recovery`,
      );
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.logger.log(`[${this.config.name}] Circuit breaker reset`);
  }
}

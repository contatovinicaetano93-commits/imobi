import { Injectable, Logger } from '@nestjs/common';

export interface RetryPolicyConfig {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  multiplier: number;
  name: string;
}

@Injectable()
export class RetryPolicyService {
  private logger = new Logger(RetryPolicyService.name);
  private readonly config: RetryPolicyConfig;

  constructor(config: RetryPolicyConfig) {
    this.config = config;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
      try {
        const result = await fn();
        if (attempt > 1) {
          this.logger.log(
            `[${this.config.name}] Succeeded on attempt ${attempt}/${this.config.maxAttempts}`,
          );
        }
        return result;
      } catch (error) {
        lastError = error as Error;

        if (attempt < this.config.maxAttempts) {
          const delayMs = this.calculateDelay(attempt);
          this.logger.warn(
            `[${this.config.name}] Attempt ${attempt} failed. Retrying in ${delayMs}ms...`,
            { error: error instanceof Error ? error.message : String(error) },
          );
          await this.delay(delayMs);
        } else {
          this.logger.error(
            `[${this.config.name}] All ${this.config.maxAttempts} attempts failed`,
            { error: error instanceof Error ? error.message : String(error) },
          );
        }
      }
    }

    throw lastError || new Error(`All ${this.config.maxAttempts} attempts failed`);
  }

  private calculateDelay(attempt: number): number {
    const exponentialDelay =
      this.config.initialDelayMs *
      Math.pow(this.config.multiplier, attempt - 1);
    return Math.min(exponentialDelay, this.config.maxDelayMs);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

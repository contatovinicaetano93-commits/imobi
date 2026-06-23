export type CircuitState = "closed" | "open" | "half-open";

export class CircuitBreaker {
  private failures = 0;
  private lastFailure = 0;
  private state: CircuitState = "closed";

  constructor(
    private readonly name: string,
    private readonly threshold = 5,
    private readonly resetMs = 30_000,
    private readonly onStateChange?: (state: CircuitState) => void,
  ) {}

  getState(): CircuitState {
    if (this.state === "open" && Date.now() - this.lastFailure >= this.resetMs) {
      this.state = "half-open";
    }
    return this.state;
  }

  async exec<T>(fn: () => Promise<T>): Promise<T> {
    const state = this.getState();
    if (state === "open") {
      throw new Error(`Circuit breaker open: ${this.name}`);
    }

    try {
      const result = await fn();
      this.failures = 0;
      this.state = "closed";
      return result;
    } catch (err) {
      this.failures += 1;
      this.lastFailure = Date.now();
      if (this.failures >= this.threshold && this.state !== "open") {
        this.state = "open";
        this.onStateChange?.("open");
      }
      throw err;
    }
  }
}

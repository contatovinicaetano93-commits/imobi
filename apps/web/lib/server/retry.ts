/** Retry com backoff exponencial — usado na liberação de tranche (operação crítica). */
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: { maxAttempts: number; initialDelayMs: number; maxDelayMs: number; multiplier: number },
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < opts.maxAttempts) {
        const delay = Math.min(opts.initialDelayMs * opts.multiplier ** (attempt - 1), opts.maxDelayMs);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

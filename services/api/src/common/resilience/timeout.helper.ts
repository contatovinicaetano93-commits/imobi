export class TimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Operation timed out after ${timeoutMs}ms`);
    this.name = 'TimeoutError';
  }
}

export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new TimeoutError(timeoutMs)),
        timeoutMs,
      ),
    ),
  ]);
}

export async function withTimeoutAndFallback<T>(
  promise: Promise<T>,
  timeoutMs: number,
  fallback: () => Promise<T> | T,
): Promise<T> {
  try {
    return await withTimeout(promise, timeoutMs);
  } catch (error) {
    if (error instanceof TimeoutError) {
      return fallback();
    }
    throw error;
  }
}

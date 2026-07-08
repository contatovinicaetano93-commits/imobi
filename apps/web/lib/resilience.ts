/**
 * Primitivas de resiliência compartilhadas (fonte única).
 *
 * Render (plano gratuito) pode levar ~60–90s para acordar; os helpers abaixo
 * centralizam timeout, backoff e wake para evitar cópias divergentes.
 */

/** Timeouts padronizados (ms). Mantêm os valores já usados em produção. */
export const RESILIENCE_TIMEOUTS = {
  /** Ping rápido de wake (proxy/health). */
  ping: 8_000,
  /** Chamada de dados comum. */
  request: 30_000,
  /** Busca de jornada. */
  jornada: 20_000,
  /** Login — 1º cold start do Render. */
  login: 75_000,
  /** Wake via /health. */
  wakeHealth: 25_000,
} as const;

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Backoff linear (base * tentativa) — comportamento já usado nos loops atuais. */
export function backoffDelay(attempt: number, baseMs: number): number {
  return baseMs * attempt;
}

/**
 * fetch com timeout via AbortController. Repropaga erros (inclusive abort),
 * cabe ao chamador decidir como tratar. Use `fetchOrNull` para engolir falhas.
 */
export async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Como `fetchWithTimeout`, mas retorna `null` em qualquer falha (rede/timeout). */
export async function fetchOrNull(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response | null> {
  try {
    return await fetchWithTimeout(url, init, timeoutMs);
  } catch {
    return null;
  }
}

/** Envolve qualquer promise com timeout (para chamadas que não são `fetch` direto). */
export function promiseWithTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message = "Request timeout",
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

/**
 * Acorda a API via `${apiV1Base}/health`. Nunca lança — retorna a Response ou null.
 * `apiV1Base` deve terminar em `/api/v1`.
 */
export async function wakeApiHealth(
  apiV1Base: string,
  timeoutMs: number = RESILIENCE_TIMEOUTS.wakeHealth,
): Promise<Response | null> {
  return fetchOrNull(`${apiV1Base}/health`, { cache: "no-store" }, timeoutMs);
}

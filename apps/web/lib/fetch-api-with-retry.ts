import { getApiV1Fallbacks } from '@/lib/api-base';

async function wakeApi(api: string): Promise<void> {
  await fetch(`${api}/health`, {
    cache: 'no-store',
    signal: AbortSignal.timeout(25_000),
  }).catch(() => null);
}

export type FetchApiWithRetryOptions = {
  path: string;
  method?: string;
  body?: string | FormData | ArrayBuffer | Blob;
  headers?: Record<string, string>;
  maxAttemptsPerApi?: number;
  wakeFirst?: boolean;
};

/**
 * Chamada à API com wake + retry (Render free tier demora ~60–90s para acordar).
 */
export async function fetchApiWithRetry({
  path,
  method = 'GET',
  body,
  headers = {},
  maxAttemptsPerApi = 5,
  wakeFirst = true,
}: FetchApiWithRetryOptions): Promise<Response | null> {
  const apis = getApiV1Fallbacks();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  for (const api of apis) {
    if (wakeFirst) await wakeApi(api);

    for (let attempt = 0; attempt < maxAttemptsPerApi; attempt++) {
      const hasBody =
        body !== undefined && method !== "GET" && method !== "HEAD";
      const res = await fetch(`${api}${normalizedPath}`, {
        method,
        headers,
        body: hasBody ? body : undefined,
        cache: "no-store",
        signal: AbortSignal.timeout(30_000),
      }).catch(() => null);

      if (!res) {
        await new Promise((r) => setTimeout(r, 2500 * (attempt + 1)));
        continue;
      }

      if (res.ok || res.status === 401 || res.status === 403 || res.status === 404) {
        return res;
      }

      if (res.status >= 500 || res.status === 503 || res.status === 502 || res.status === 504) {
        await wakeApi(api);
        await new Promise((r) => setTimeout(r, 3000 * (attempt + 1)));
        continue;
      }

      return res;
    }
  }

  return null;
}

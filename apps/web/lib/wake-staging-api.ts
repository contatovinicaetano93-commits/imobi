import { PRODUCTION_API_URL, STAGING_API_URL } from '@/lib/api-base';

const WAKE_URLS = ['/web-api/auth/wake', '/api/proxy/auth/wake'];
const PING_TIMEOUT_MS = 8_000;

async function ping(url: string, init: RequestInit = {}): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);
  try {
    return await fetch(url, { cache: 'no-store', ...init, signal: controller.signal });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function pingRenderDirect(): Promise<void> {
  // Staging primeiro (canônica). Prod pode estar pausada — não bloquear.
  for (const base of [STAGING_API_URL, PRODUCTION_API_URL]) {
    await ping(`${base.replace(/\/$/, '')}/api/v1/health`, { mode: 'no-cors' });
  }
}

/** Acorda a API Render antes do login. */
export async function wakeStagingApi(maxAttempts = 6): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    await pingRenderDirect();

    for (const wakePath of WAKE_URLS) {
      const res = await ping(wakePath, { redirect: 'manual' });
      if (!res) continue;
      if (res.type === 'opaqueredirect' || (res.status >= 300 && res.status < 400)) continue;
      if (!res.ok) continue;
      const data = (await res.json().catch(() => null)) as { ok?: boolean } | null;
      if (data?.ok) return true;
    }

    await new Promise((r) => setTimeout(r, 2000 * (i + 1)));
  }

  return false;
}

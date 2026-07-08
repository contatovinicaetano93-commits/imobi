import { PRODUCTION_API_URL, STAGING_API_URL } from '@/lib/api-base';
import { RESILIENCE_TIMEOUTS, fetchOrNull, sleep } from '@/lib/resilience';

const WAKE_URLS = ['/web-api/auth/wake', '/api/proxy/auth/wake'];

function ping(url: string, init: RequestInit = {}): Promise<Response | null> {
  return fetchOrNull(url, { cache: 'no-store', ...init }, RESILIENCE_TIMEOUTS.ping);
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

    await sleep(2000 * (i + 1));
  }

  return false;
}

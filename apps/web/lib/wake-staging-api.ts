import { PRODUCTION_API_URL, STAGING_API_URL } from '@/lib/api-base';

const WAKE_URLS = ['/web-api/auth/wake', '/api/proxy/auth/wake'];

async function ping(url: string): Promise<void> {
  try {
    await fetch(url, { mode: 'no-cors', cache: 'no-store' });
  } catch {
    /* ok */
  }
}

async function pingRenderDirect(): Promise<void> {
  for (const base of [PRODUCTION_API_URL, STAGING_API_URL]) {
    await ping(`${base.replace(/\/$/, '')}/api/v1/health`);
  }
}

/** Acorda a API Render antes do login. */
export async function wakeStagingApi(maxAttempts = 6): Promise<boolean> {
  await pingRenderDirect();

  for (let i = 0; i < maxAttempts; i++) {
    await pingRenderDirect();

    for (const wakePath of WAKE_URLS) {
      try {
        const res = await fetch(wakePath, { cache: 'no-store', redirect: 'manual' });
        if (res.type === 'opaqueredirect' || (res.status >= 300 && res.status < 400)) continue;
        if (!res.ok) continue;
        const data = (await res.json().catch(() => null)) as { ok?: boolean } | null;
        if (data?.ok) return true;
      } catch {
        /* retry */
      }
    }

    await new Promise((r) => setTimeout(r, 2000 * (i + 1)));
  }

  return false;
}

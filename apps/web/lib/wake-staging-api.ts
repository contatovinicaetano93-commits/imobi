import { STAGING_API_URL } from '@/lib/api-base';

const WAKE_PROXY = '/api/proxy/auth/wake';

/** Ping direto no Render (no-cors) — só acorda, não lê resposta. */
async function pingRenderDirect(): Promise<void> {
  const url = `${STAGING_API_URL.replace(/\/$/, '')}/api/v1/health`;
  try {
    await fetch(url, { mode: 'no-cors', cache: 'no-store' });
  } catch {
    /* ok — objetivo é acordar o dyno */
  }
}

/** Acorda a API Render antes do login. */
export async function wakeStagingApi(maxAttempts = 6): Promise<boolean> {
  await pingRenderDirect();

  for (let i = 0; i < maxAttempts; i++) {
    await pingRenderDirect();

    try {
      const res = await fetch(WAKE_PROXY, { cache: 'no-store', redirect: 'manual' });
      if (res.type === 'opaqueredirect' || (res.status >= 300 && res.status < 400)) {
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }
      if (!res.ok) {
        await new Promise((r) => setTimeout(r, 2000 * (i + 1)));
        continue;
      }
      const data = (await res.json().catch(() => null)) as { ok?: boolean } | null;
      if (data?.ok) return true;
    } catch {
      /* retry */
    }

    await new Promise((r) => setTimeout(r, 2000 * (i + 1)));
  }

  return false;
}

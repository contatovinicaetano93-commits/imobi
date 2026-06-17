/** Acorda a API Render (free tier) antes do login. */
export async function wakeStagingApi(maxAttempts = 4): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch('/api/proxy/health', { cache: 'no-store' });
      if (res.ok) return true;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
  }
  return false;
}

export type AuthProxyResult = {
  role?: string | null;
  nome?: string | null;
};

function isRetryableStatus(status: number) {
  return status === 408 || status === 429 || status >= 500;
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function loginWithRetry(
  credentials: { email: string; senha: string },
  signal?: AbortSignal,
  maxAttempts = 3,
): Promise<AuthProxyResult> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const res = await fetch("/api/proxy/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
        signal,
        cache: "no-store",
      });

      const json = (await res.json().catch(() => ({}))) as {
        message?: string;
        role?: string | null;
        nome?: string | null;
      };

      if (!res.ok) {
        const err = new Error(json.message ?? "Credenciais inválidas");
        if (!isRetryableStatus(res.status) || attempt === maxAttempts - 1) throw err;
        lastError = err;
        await sleep(400 * 2 ** attempt);
        continue;
      }

      return { role: json.role, nome: json.nome };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt === maxAttempts - 1) break;
      await sleep(400 * 2 ** attempt);
    }
  }

  throw lastError ?? new Error("Falha ao entrar. Tente novamente.");
}

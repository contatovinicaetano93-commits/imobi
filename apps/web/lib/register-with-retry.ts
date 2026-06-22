import type { CadastroUsuarioInput } from "@imbobi/schemas";
import type { AuthProxyResult } from "./login-with-retry";

function isRetryableStatus(status: number) {
  return status === 408 || status === 429 || status >= 500;
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function registerWithRetry(
  payload: CadastroUsuarioInput,
  signal?: AbortSignal,
  maxAttempts = 3,
): Promise<AuthProxyResult> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const res = await fetch("/api/proxy/auth/registrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal,
        cache: "no-store",
      });

      const json = (await res.json().catch(() => ({}))) as {
        message?: string;
        role?: string | null;
        nome?: string | null;
      };

      if (!res.ok) {
        const err = new Error(json.message ?? "Não foi possível criar a conta");
        if (!isRetryableStatus(res.status) || attempt === maxAttempts - 1) throw err;
        lastError = err;
        await sleep(400 * 2 ** attempt);
        continue;
      }

      return { role: json.role ?? "TOMADOR", nome: json.nome };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt === maxAttempts - 1) break;
      await sleep(400 * 2 ** attempt);
    }
  }

  throw lastError ?? new Error("Falha no cadastro. Tente novamente.");
}

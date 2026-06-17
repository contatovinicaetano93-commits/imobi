import type { LoginInput } from '@imbobi/schemas';
import { wakeStagingApi } from '@/lib/wake-staging-api';

export type LoginResult = {
  ok: true;
  role: string | null;
  nome: string | null;
  email: string | null;
};

export async function loginWithRetry(
  data: LoginInput,
  onStatus?: (msg: string) => void,
  maxAttempts = 4,
): Promise<LoginResult> {
  onStatus?.('Acordando servidor…');
  await wakeStagingApi();

  let lastError = 'Não foi possível conectar ao servidor.';

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (attempt > 1) {
      onStatus?.(`Servidor acordando… tentativa ${attempt}/${maxAttempts}`);
      await wakeStagingApi(3);
    } else {
      onStatus?.('Validando credenciais…');
    }

    try {
      const res = await fetch('/api/proxy/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'same-origin',
      });

      const json = (await res.json().catch(() => ({}))) as {
        message?: string;
        role?: string | null;
        nome?: string | null;
        email?: string | null;
        ok?: boolean;
      };

      if (res.ok && json.ok !== false) {
        return {
          ok: true,
          role: json.role ?? null,
          nome: json.nome ?? null,
          email: json.email ?? null,
        };
      }

      lastError = json.message ?? `Erro ${res.status}`;

      if (res.status === 401 || res.status === 400) {
        throw new Error(lastError);
      }

      if (res.status === 503 || res.status === 502 || res.status === 504 || res.status >= 500) {
        await new Promise((r) => setTimeout(r, 3000 * attempt));
        continue;
      }

      throw new Error(lastError);
    } catch (e) {
      if (e instanceof Error && (e.message.includes('Credenciais') || e.message.includes('inválid'))) {
        throw e;
      }
      lastError = e instanceof Error ? e.message : lastError;
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }

  throw new Error(lastError);
}

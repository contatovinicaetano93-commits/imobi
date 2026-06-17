import type { LoginInput } from '@imbobi/schemas';
import { wakeStagingApi } from '@/lib/wake-staging-api';

export type LoginResult = {
  ok: true;
  role: string | null;
  nome: string | null;
  email: string | null;
};

const LOGIN_URLS = ['/web-api/auth/login', '/api/proxy/auth/login'];

export async function loginWithRetry(
  data: LoginInput,
  onStatus?: (msg: string) => void,
  maxAttempts = 5,
): Promise<LoginResult> {
  onStatus?.('Acordando servidor… (pode levar 1 minuto)');
  await wakeStagingApi();

  let lastError = 'Não foi possível conectar ao servidor.';

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (attempt > 1) {
      onStatus?.(`Tentativa ${attempt}/${maxAttempts} — servidor acordando…`);
      await wakeStagingApi(4);
    } else {
      onStatus?.('Validando credenciais…');
    }

    for (const loginUrl of LOGIN_URLS) {
      try {
        const res = await fetch(loginUrl, {
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
      } catch (e) {
        if (e instanceof Error && (e.message.includes('inválid') || e.message.includes('Credenciais'))) {
          throw e;
        }
        lastError = e instanceof Error ? e.message : lastError;
      }
    }

    await new Promise((r) => setTimeout(r, 4000 * attempt));
  }

  throw new Error(lastError);
}

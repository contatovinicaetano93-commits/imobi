import type { LoginInput } from '@imbobi/schemas';

export type LoginResult = {
  ok: true;
  role: string | null;
  nome: string | null;
  email: string | null;
};

class InvalidCredentialsError extends Error {}

/** API é same-origin agora — sem wake, sem fallback entre hosts. */
export async function loginWithRetry(
  data: LoginInput,
  onStatus?: (msg: string) => void,
  maxAttempts = 2,
): Promise<LoginResult> {
  let lastMessage = 'Não foi possível conectar ao servidor.';

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    onStatus?.(attempt === 1 ? 'Validando credenciais…' : `Tentativa ${attempt}/${maxAttempts}…`);

    const res = await fetch('/web-api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'same-origin',
    }).catch(() => null);

    if (!res) {
      lastMessage = 'Falha de rede. Tentando novamente…';
      continue;
    }

    const json = (await res.json().catch(() => ({}))) as {
      message?: string;
      role?: string | null;
      nome?: string | null;
      email?: string | null;
      ok?: boolean;
    };

    if (res.status === 401 || res.status === 400) {
      throw new InvalidCredentialsError(json.message ?? 'Credenciais inválidas');
    }

    if (res.ok && json.ok !== false) {
      return { ok: true, role: json.role ?? null, nome: json.nome ?? null, email: json.email ?? null };
    }

    lastMessage = json.message ?? lastMessage;
  }

  throw new Error(lastMessage);
}

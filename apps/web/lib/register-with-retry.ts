import type { CadastroUsuarioInput } from '@imbobi/schemas';
import { normalizeCadastroInput } from '@/lib/normalize-cadastro';

export type RegisterResult = {
  ok: true;
  role: string | null;
  nome: string | null;
  email: string | null;
};

/** API é same-origin agora — sem wake, sem fallback entre hosts. */
export async function registerWithRetry(
  data: CadastroUsuarioInput,
  onStatus?: (msg: string) => void,
  maxAttempts = 2,
): Promise<RegisterResult> {
  const payload = JSON.stringify(normalizeCadastroInput(data));
  let lastError = 'Não foi possível criar a conta.';

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    onStatus?.(attempt === 1 ? 'Criando sua conta…' : `Tentativa ${attempt}/${maxAttempts}…`);

    const res = await fetch('/web-api/auth/registrar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      credentials: 'same-origin',
    }).catch(() => null);

    if (!res) {
      lastError = 'Falha de rede. Tentando novamente…';
      continue;
    }

    const json = (await res.json().catch(() => ({}))) as {
      message?: string;
      role?: string | null;
      nome?: string | null;
      email?: string | null;
      ok?: boolean;
    };

    if (res.status === 409) throw new Error(json.message ?? 'E-mail já cadastrado.');
    if (res.status === 400) throw new Error(json.message ?? 'Dados inválidos. Verifique o formulário.');

    if (res.ok && json.ok !== false) {
      return { ok: true, role: json.role ?? 'CLIENTE', nome: json.nome ?? null, email: json.email ?? null };
    }

    if (json.message) lastError = json.message;
  }

  throw new Error(lastError);
}

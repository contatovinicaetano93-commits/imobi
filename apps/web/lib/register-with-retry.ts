import type { CadastroUsuarioInput } from '@imbobi/schemas';
import { wakeStagingApi } from '@/lib/wake-staging-api';
import { normalizeCadastroInput } from '@/lib/normalize-cadastro';

const REGISTER_URLS = ['/web-api/auth/registrar', '/api/proxy/auth/registrar'];

export type RegisterResult = {
  ok: true;
  role: string | null;
  nome: string | null;
  email: string | null;
};

export async function registerWithRetry(
  data: CadastroUsuarioInput,
  onStatus?: (msg: string) => void,
  maxAttempts = 4,
): Promise<RegisterResult> {
  onStatus?.('Acordando servidor… (até 1 minuto na 1ª vez)');
  await wakeStagingApi(3);

  const normalized = normalizeCadastroInput(data);
  const payload = JSON.stringify({ ...normalized, consentidoEm: new Date().toISOString() });
  let lastError = 'Não foi possível criar a conta.';

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (attempt > 1) {
      onStatus?.(`Tentativa ${attempt}/${maxAttempts}…`);
      await wakeStagingApi(2);
    } else {
      onStatus?.('Criando sua conta…');
    }

    for (const url of REGISTER_URLS) {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        credentials: 'same-origin',
      });

      const json = (await res.json().catch(() => ({}))) as {
        message?: string;
        role?: string | null;
        nome?: string | null;
        email?: string | null;
        ok?: boolean;
      };

      if (res.status === 409) {
        throw new Error(json.message ?? 'E-mail ou CPF já cadastrado.');
      }
      if (res.status === 400) {
        throw new Error(json.message ?? 'Dados inválidos. Verifique o formulário.');
      }

      if (res.ok && json.ok !== false) {
        return {
          ok: true,
          role: json.role ?? 'TOMADOR',
          nome: json.nome ?? null,
          email: json.email ?? null,
        };
      }

      if (json.message) lastError = json.message;
    }

    await new Promise((r) => setTimeout(r, 4000 * attempt));
  }

  throw new Error(`${lastError} Aguarde 1 minuto e tente novamente.`);
}

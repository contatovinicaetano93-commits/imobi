import type { LoginInput } from '@imbobi/schemas';
import { PRODUCTION_API_URL, STAGING_API_URL } from '@/lib/api-base';
import { wakeStagingApi } from '@/lib/wake-staging-api';

export type LoginResult = {
  ok: true;
  role: string | null;
  nome: string | null;
  email: string | null;
};

const SERVER_LOGIN_URLS = ['/web-api/auth/login', '/api/proxy/auth/login'];
const API_BASES = [PRODUCTION_API_URL, STAGING_API_URL];

type ApiLoginJson = {
  accessToken?: string;
  refreshToken?: string;
  access_token?: string;
  refresh_token?: string;
  usuario?: { tipo?: string; nome?: string; email?: string };
  message?: string;
};

async function tryServerLogin(
  data: LoginInput,
  loginUrl: string,
): Promise<{ result: LoginResult | null; message?: string }> {
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

  if (res.status === 401 || res.status === 400) {
    throw new Error(json.message ?? 'Credenciais inválidas');
  }

  if (res.ok && json.ok !== false) {
    return {
      result: {
        ok: true,
        role: json.role ?? null,
        nome: json.nome ?? null,
        email: json.email ?? null,
      },
    };
  }

  return { result: null, message: json.message };
}

async function tryDirectApiLogin(data: LoginInput): Promise<LoginResult | null> {
  for (const base of API_BASES) {
    const url = `${base.replace(/\/$/, '')}/api/v1/auth/login`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        mode: 'cors',
      });

      if (res.status === 401 || res.status === 400) {
        const err = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(err.message ?? 'Credenciais inválidas');
      }

      if (!res.ok) continue;

      const json = (await res.json()) as ApiLoginJson;
      const accessToken = json.accessToken ?? json.access_token;
      if (!accessToken) continue;

      const role = json.usuario?.tipo ?? null;
      const nome = json.usuario?.nome ?? null;
      const email = json.usuario?.email ?? null;
      const refreshToken = json.refreshToken ?? json.refresh_token;

      const sessionRes = await fetch('/web-api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken, refreshToken, role }),
        credentials: 'same-origin',
      }).catch(() => null);

      if (!sessionRes?.ok) {
        // Fallback: cookie legível pelo middleware (sem httpOnly)
        const maxAge = 60 * 60 * 8;
        document.cookie = `access_token=${accessToken}; path=/; max-age=${maxAge}; SameSite=Lax`;
        if (role) document.cookie = `session_role=${role}; path=/; max-age=${maxAge}; SameSite=Lax`;
      }

      return { ok: true, role, nome, email };
    } catch (e) {
      if (e instanceof Error && e.message.includes('inválid')) throw e;
    }
  }
  return null;
}

export async function loginWithRetry(
  data: LoginInput,
  onStatus?: (msg: string) => void,
  maxAttempts = 5,
): Promise<LoginResult> {
  onStatus?.('Acordando servidor… (até 1 minuto na 1ª vez)');
  await wakeStagingApi();

  let lastError = 'Não foi possível conectar ao servidor.';

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (attempt > 1) {
      onStatus?.(`Tentativa ${attempt}/${maxAttempts}…`);
      await wakeStagingApi(3);
    } else {
      onStatus?.('Validando credenciais…');
    }

    for (const url of SERVER_LOGIN_URLS) {
      try {
        const { result, message } = await tryServerLogin(data, url);
        if (message) lastError = message;
        if (result) return result;
      } catch (e) {
        if (e instanceof Error) throw e;
      }
    }

    onStatus?.('Tentando conexão direta com a API…');
    try {
      const direct = await tryDirectApiLogin(data);
      if (direct) return direct;
    } catch (e) {
      if (e instanceof Error && e.message.includes('inválid')) throw e;
      lastError = e instanceof Error ? e.message : lastError;
    }

    await new Promise((r) => setTimeout(r, 4000 * attempt));
  }

  throw new Error(
    `${lastError} Aguarde 1 minuto e tente novamente — o servidor pode estar acordando.`,
  );
}

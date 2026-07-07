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
const API_BASES = [STAGING_API_URL, PRODUCTION_API_URL];

/** Cold start do Render pode levar ~50s; damos folga na 1ª tentativa. */
const LOGIN_TIMEOUT_MS = 75_000;

type ApiLoginJson = {
  accessToken?: string;
  refreshToken?: string;
  access_token?: string;
  refresh_token?: string;
  usuario?: { tipo?: string; nome?: string; email?: string };
  message?: string;
};

class InvalidCredentialsError extends Error {}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function tryServerLogin(
  data: LoginInput,
  loginUrl: string,
): Promise<{ result: LoginResult | null; message?: string }> {
  const res = await fetchWithTimeout(
    loginUrl,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'same-origin',
    },
    LOGIN_TIMEOUT_MS,
  );

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
      const res = await fetchWithTimeout(
        url,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
          mode: 'cors',
        },
        LOGIN_TIMEOUT_MS,
      );

      if (res.status === 401 || res.status === 400) {
        const err = (await res.json().catch(() => ({}))) as { message?: string };
        throw new InvalidCredentialsError(err.message ?? 'Credenciais inválidas');
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
      if (e instanceof InvalidCredentialsError) throw e;
    }
  }
  return null;
}

/**
 * Tenta uma passada completa de login (proxies do Vercel + API direta).
 * Retorna null quando é falha de rede/cold start (vale a pena repetir).
 * Lança InvalidCredentialsError quando as credenciais são inválidas.
 */
async function attemptLogin(
  data: LoginInput,
): Promise<{ result: LoginResult | null; message?: string }> {
  let message: string | undefined;

  for (const url of SERVER_LOGIN_URLS) {
    try {
      const { result, message: msg } = await tryServerLogin(data, url);
      if (msg) message = msg;
      if (result) return { result };
    } catch (e) {
      if (e instanceof InvalidCredentialsError) throw e;
      // rede/timeout — tenta o próximo caminho
    }
  }

  const direct = await tryDirectApiLogin(data);
  if (direct) return { result: direct };

  return { result: null, message };
}

export async function loginWithRetry(
  data: LoginInput,
  onStatus?: (msg: string) => void,
  maxAttempts = 3,
): Promise<LoginResult> {
  let lastMessage = 'Não foi possível conectar ao servidor.';

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    onStatus?.(
      attempt === 1
        ? 'Validando credenciais… (a 1ª vez pode levar até 1 minuto)'
        : `Tentativa ${attempt}/${maxAttempts}…`,
    );

    try {
      const { result, message } = await attemptLogin(data);
      if (result) return result;
      if (message) lastMessage = message;
    } catch (e) {
      // Credenciais inválidas: não adianta repetir.
      throw e instanceof Error ? e : new Error('Erro inesperado no login.');
    }

    if (attempt < maxAttempts) {
      onStatus?.('Acordando servidor…');
      await wakeStagingApi(2);
    }
  }

  throw new Error(
    `${lastMessage} Aguarde alguns segundos e tente novamente — o servidor pode estar iniciando.`,
  );
}

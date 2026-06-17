import { NextRequest, NextResponse } from 'next/server';
import { getApiV1Fallbacks } from '@/lib/api-base';

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env['NODE_ENV'] === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

export const maxDuration = 60;

async function wakeApi(api: string): Promise<void> {
  await fetch(`${api}/health`, { cache: 'no-store', signal: AbortSignal.timeout(20_000) }).catch(() => null);
}

async function postAuth(
  path: 'login' | 'registrar',
  body: string,
): Promise<Response | null> {
  const apis = getApiV1Fallbacks();

  for (const api of apis) {
    await wakeApi(api);
    for (let attempt = 0; attempt < 4; attempt++) {
      const res = await fetch(`${api}/auth/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        cache: 'no-store',
        signal: AbortSignal.timeout(25_000),
      }).catch(() => null);

      if (!res) {
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }
      if (res.status === 401 || res.status === 400 || res.status === 409) return res;
      if (res.ok) return res;
      if (res.status >= 500 || res.status === 503) {
        await new Promise((r) => setTimeout(r, 2500));
        continue;
      }
      return res;
    }
  }
  return null;
}

function parseAuthPayload(data: Record<string, unknown>) {
  const accessToken = (data.accessToken ?? data.access_token) as string | undefined;
  const refreshToken = (data.refreshToken ?? data.refresh_token) as string | undefined;

  let role: string | null = null;
  let nome: string | null = null;
  let email: string | null = null;

  const usuario = data.usuario as { tipo?: string; nome?: string; email?: string } | undefined;
  if (usuario?.tipo) role = usuario.tipo;
  if (usuario?.nome) nome = usuario.nome;
  if (usuario?.email) email = usuario.email;

  if (accessToken) {
    try {
      const jwtPayload = JSON.parse(
        Buffer.from(accessToken.split('.')[1], 'base64url').toString(),
      ) as { role?: string; nome?: string; email?: string };
      role = jwtPayload.role ?? role;
      nome = jwtPayload.nome ?? nome;
      email = jwtPayload.email ?? email;
    } catch {
      /* decode opcional */
    }
  }

  return { accessToken, refreshToken, role, nome, email };
}

function applyAuthCookies(
  response: NextResponse,
  tokens: { accessToken: string; refreshToken?: string; role?: string | null },
) {
  response.cookies.set('access_token', tokens.accessToken, { ...COOKIE_OPTS, maxAge: 60 * 60 * 8 });
  if (tokens.role) {
    response.cookies.set('session_role', tokens.role, { ...COOKIE_OPTS, maxAge: 60 * 60 * 8 });
  }
  if (tokens.refreshToken) {
    response.cookies.set('refresh_token', tokens.refreshToken, {
      ...COOKIE_OPTS,
      maxAge: 60 * 60 * 24 * 7,
    });
  }
}

/** Handler compartilhado — usado em /web-api e /api/proxy. */
export async function handleLoginPost(req: NextRequest): Promise<NextResponse> {
  const body = await req.json().catch(() => null);
  const payload = JSON.stringify(body);

  const res = await postAuth('login', payload);

  if (!res) {
    return NextResponse.json(
      { message: 'Servidor acordando — aguarde 30s e tente novamente.' },
      { status: 503 },
    );
  }

  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;

  if (!res.ok) {
    const apiMsg = data.message ?? data.error;
    const message =
      res.status === 503 || res.status === 502
        ? 'API acordando — aguarde 30–60s e tente de novo.'
        : res.status === 500
          ? 'Erro interno na API. Tente novamente em 1 minuto.'
          : (apiMsg ?? `Erro ${res.status}`);
    return NextResponse.json({ message }, { status: res.status });
  }

  const parsed = parseAuthPayload(data);
  if (!parsed.accessToken) {
    return NextResponse.json({ message: 'Resposta da API sem token' }, { status: 502 });
  }

  const response = NextResponse.json({
    ok: true,
    role: parsed.role,
    nome: parsed.nome,
    email: parsed.email,
  });
  applyAuthCookies(response, parsed);
  return response;
}

/** Cadastro com wake + retry — mesmo padrão do login. */
export async function handleRegisterPost(req: NextRequest): Promise<NextResponse> {
  const body = await req.json().catch(() => null);
  const payload = JSON.stringify(body);

  const res = await postAuth('registrar', payload);

  if (!res) {
    return NextResponse.json(
      { message: 'Servidor acordando — aguarde 1 minuto e tente novamente.' },
      { status: 503 },
    );
  }

  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;

  if (!res.ok) {
    const apiMsg = data.message ?? data.error;
    const message =
      res.status === 503 || res.status === 502
        ? 'API acordando — aguarde 30–60s e tente de novo.'
        : (apiMsg ?? `Erro ${res.status}`);
    return NextResponse.json({ message }, { status: res.status });
  }

  const parsed = parseAuthPayload(data);
  if (!parsed.accessToken) {
    return NextResponse.json({ message: 'Resposta da API sem token' }, { status: 502 });
  }

  const response = NextResponse.json({
    ok: true,
    role: parsed.role ?? 'TOMADOR',
    nome: parsed.nome,
    email: parsed.email,
  });
  applyAuthCookies(response, parsed);
  return response;
}

export async function handleWakeGet(): Promise<NextResponse> {
  for (const api of getApiV1Fallbacks()) {
    const res = await fetch(`${api}/health`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(25_000),
    }).catch(() => null);
    if (res?.ok) {
      return NextResponse.json({ ok: true, status: res.status });
    }
  }
  return NextResponse.json({ ok: false }, { status: 503 });
}

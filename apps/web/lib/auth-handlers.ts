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

async function postLogin(body: string): Promise<Response | null> {
  const apis = getApiV1Fallbacks();

  for (const api of apis) {
    await wakeApi(api);
    for (let attempt = 0; attempt < 4; attempt++) {
      const res = await fetch(`${api}/auth/login`, {
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
      if (res.status === 401 || res.status === 400) return res;
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

/** Handler compartilhado — usado em /web-api e /api/proxy. */
export async function handleLoginPost(req: NextRequest): Promise<NextResponse> {
  const body = await req.json().catch(() => null);
  const payload = JSON.stringify(body);

  const res = await postLogin(payload);

  if (!res) {
    return NextResponse.json(
      { message: 'Servidor acordando — aguarde 30s e tente novamente.' },
      { status: 503 },
    );
  }

  const data = await res.json().catch(() => ({}));

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

  const accessToken = data.accessToken ?? data.access_token;
  if (!accessToken) {
    return NextResponse.json({ message: 'Resposta da API sem token' }, { status: 502 });
  }

  let role: string | null = null;
  let nome: string | null = null;
  let email: string | null = null;

  const usuario = data.usuario as { tipo?: string; nome?: string; email?: string } | undefined;
  if (usuario?.tipo) role = usuario.tipo;
  if (usuario?.nome) nome = usuario.nome;
  if (usuario?.email) email = usuario.email;

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

  const response = NextResponse.json({ ok: true, role, nome, email });

  response.cookies.set('access_token', accessToken, { ...COOKIE_OPTS, maxAge: 60 * 60 * 8 });
  if (role) {
    response.cookies.set('session_role', role, { ...COOKIE_OPTS, maxAge: 60 * 60 * 8 });
  }

  const refreshToken = data.refreshToken ?? data.refresh_token;
  if (refreshToken) {
    response.cookies.set('refresh_token', refreshToken, { ...COOKIE_OPTS, maxAge: 60 * 60 * 24 * 7 });
  }

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

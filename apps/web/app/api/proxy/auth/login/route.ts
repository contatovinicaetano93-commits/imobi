import { NextRequest, NextResponse } from 'next/server';

const _base = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';
const API = _base.endsWith('/api/v1') ? _base : `${_base}/api/v1`;

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env['NODE_ENV'] === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

export const maxDuration = 60;

async function postLogin(body: string): Promise<Response | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(`${API}/auth/login`, {
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

    // Credenciais erradas — não repetir
    if (res.status === 401 || res.status === 400) return res;
    if (res.ok) return res;

    // 5xx / 503 Render — tentar de novo
    if (res.status >= 500 || res.status === 503) {
      await new Promise((r) => setTimeout(r, 2500));
      continue;
    }

    return res;
  }
  return null;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const payload = JSON.stringify(body);

  const res = await postLogin(payload);

  if (!res) {
    return NextResponse.json(
      {
        message:
          'API temporariamente indisponível (Render). Aguarde 1 minuto, clique de novo ou use login local.',
      },
      { status: 503 },
    );
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const apiMsg = data.message ?? data.error;
    const message =
      res.status === 503 || res.status === 502
        ? 'API em manutenção ou acordando — aguarde 30–60s e tente de novo.'
        : res.status === 500
          ? 'Erro interno na API (banco/migrations). Backend precisa de redeploy no Render.'
          : (apiMsg ?? `Erro ${res.status}`);
    return NextResponse.json({ message }, { status: res.status });
  }

  const accessToken = data.accessToken ?? data.access_token;
  if (!accessToken) {
    return NextResponse.json({ message: 'Resposta da API sem token de acesso' }, { status: 502 });
  }

  let role: string | null = null;
  let nome: string | null = null;
  let email: string | null = null;
  try {
    const jwtPayload = JSON.parse(
      Buffer.from(accessToken.split('.')[1], 'base64url').toString(),
    ) as { role?: string; nome?: string; email?: string };
    role = jwtPayload.role ?? null;
    nome = jwtPayload.nome ?? null;
    email = jwtPayload.email ?? null;
  } catch {
    /* decode opcional */
  }

  const response = NextResponse.json({ ok: true, role, nome, email });

  response.cookies.set('access_token', accessToken, {
    ...COOKIE_OPTS,
    maxAge: 60 * 60 * 8,
  });

  const refreshToken = data.refreshToken ?? data.refresh_token;
  if (refreshToken) {
    response.cookies.set('refresh_token', refreshToken, {
      ...COOKIE_OPTS,
      maxAge: 60 * 60 * 24 * 7,
    });
  }

  return response;
}

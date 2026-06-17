import { NextRequest, NextResponse } from 'next/server';

const _base = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';
const API = _base.endsWith('/api/v1') ? _base : `${_base}/api/v1`;

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env['NODE_ENV'] === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  }).catch(() => null);

  if (!res) {
    return NextResponse.json(
      { message: `API inacessível — verifique NEXT_PUBLIC_API_URL (tentou: ${API}/auth/login)` },
      { status: 503 },
    );
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    return NextResponse.json(
      { message: data.message ?? data.error ?? `Erro ${res.status}` },
      { status: res.status },
    );
  }

  const accessToken = data.accessToken ?? data.access_token;
  if (!accessToken) {
    return NextResponse.json({ message: 'Resposta da API sem token de acesso' }, { status: 502 });
  }

  let role: string | null = null;
  let nome: string | null = null;
  let email: string | null = null;
  try {
    const payload = JSON.parse(
      Buffer.from(accessToken.split('.')[1], 'base64url').toString(),
    ) as { role?: string; nome?: string; email?: string };
    role = payload.role ?? null;
    nome = payload.nome ?? null;
    email = payload.email ?? null;
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

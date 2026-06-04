import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const _base = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';
const API = _base.endsWith('/api/v1') ? _base : `${_base}/api/v1`;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  }).catch(() => null);

  if (!res) return NextResponse.json({ message: 'Erro de conexão' }, { status: 503 });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    return NextResponse.json({ message: data.message ?? 'Credenciais inválidas' }, { status: res.status });
  }

  const jar = await cookies();
  jar.set('access_token', data.accessToken, {
    httpOnly: true,
    secure: process.env['NODE_ENV'] === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 15,
  });
  if (data.refreshToken) {
    jar.set('refresh_token', data.refreshToken, {
      httpOnly: true,
      secure: process.env['NODE_ENV'] === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });
  }

  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const _base = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';
const API = _base.endsWith('/api/v1') ? _base : `${_base}/api/v1`;

export async function POST(_req: NextRequest) {
  const jar = await cookies();
  const refreshToken = jar.get('refresh_token')?.value;
  if (!refreshToken) {
    return NextResponse.json({ message: 'Sessão expirada' }, { status: 401 });
  }

  const res = await fetch(`${API}/auth/renovar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
    cache: 'no-store',
  }).catch(() => null);

  if (!res) return NextResponse.json({ message: 'API inacessível' }, { status: 503 });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    jar.delete('access_token');
    jar.delete('refresh_token');
    return NextResponse.json({ message: data.message ?? 'Sessão expirada' }, { status: res.status });
  }

  jar.set('access_token', data.accessToken, {
    httpOnly: true,
    secure: process.env['NODE_ENV'] === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8,
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

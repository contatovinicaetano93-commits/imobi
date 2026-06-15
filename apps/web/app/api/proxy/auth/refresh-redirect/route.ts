import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const _base = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';
const API = _base.endsWith('/api/v1') ? _base : `${_base}/api/v1`;

export async function GET(req: NextRequest) {
  const next = req.nextUrl.searchParams.get('next') ?? '/dashboard';
  const safePath = next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';

  const jar = await cookies();
  const refreshToken = jar.get('refresh_token')?.value;

  if (!refreshToken) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('next', safePath);
    return NextResponse.redirect(loginUrl);
  }

  const res = await fetch(`${API}/auth/renovar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
    cache: 'no-store',
  }).catch(() => null);

  if (!res?.ok) {
    jar.delete('access_token');
    jar.delete('refresh_token');
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('next', safePath);
    return NextResponse.redirect(loginUrl);
  }

  const data = await res.json().catch(() => ({}));

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

  return NextResponse.redirect(new URL(safePath, req.url));
}

import { NextRequest, NextResponse } from 'next/server';
import { verifyHs256Jwt } from '@/lib/verify-hs256-jwt';

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env['NODE_ENV'] === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

/** Recebe tokens após login direto na API (fallback CORS). */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as {
    accessToken?: string;
    refreshToken?: string;
    role?: string | null;
  } | null;

  if (!body?.accessToken) {
    return NextResponse.json({ message: 'Token obrigatório' }, { status: 400 });
  }

  const accessPayload = await verifyHs256Jwt(body.accessToken);
  const refreshPayload = body.refreshToken ? await verifyHs256Jwt(body.refreshToken) : null;

  if (!accessPayload || (body.refreshToken && refreshPayload?.type !== 'refresh')) {
    return NextResponse.json({ message: 'Token inválido' }, { status: 400 });
  }

  const role = typeof accessPayload.role === 'string' ? accessPayload.role : null;
  const response = NextResponse.json({ ok: true, role });

  response.cookies.set('access_token', body.accessToken, { ...COOKIE_OPTS, maxAge: 60 * 60 * 8 });
  if (body.refreshToken) {
    response.cookies.set('refresh_token', body.refreshToken, { ...COOKIE_OPTS, maxAge: 60 * 60 * 24 * 7 });
  }

  return response;
}

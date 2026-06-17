import { NextResponse } from 'next/server';
import { getApiV1Url } from '@/lib/api-base';

const API = getApiV1Url();

export const maxDuration = 30;

/** Acorda a API Render — rota pública (prefixo /api/proxy/auth). */
export async function GET() {
  const res = await fetch(`${API}/health`, {
    cache: 'no-store',
    signal: AbortSignal.timeout(25_000),
  }).catch(() => null);

  if (!res) {
    return NextResponse.json({ ok: false, message: 'API offline' }, { status: 503 });
  }

  return NextResponse.json({ ok: true, status: res.status }, { status: 200 });
}

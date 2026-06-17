import { NextResponse } from 'next/server';
import { getApiV1Url } from '@/lib/api-base';

const API = getApiV1Url();

export const maxDuration = 30;

export async function GET() {
  const res = await fetch(`${API}/health`, {
    cache: 'no-store',
    signal: AbortSignal.timeout(25_000),
  }).catch(() => null);

  if (!res) {
    return NextResponse.json({ ok: false, message: 'API offline ou demorou para responder' }, { status: 503 });
  }

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(
    { ok: res.ok, apiStatus: (data as { status?: string }).status ?? 'unknown' },
    { status: res.ok ? 200 : 503 },
  );
}

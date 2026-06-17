import { NextResponse } from 'next/server';

const _base = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';
const API = _base.endsWith('/api/v1') ? _base : `${_base}/api/v1`;

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

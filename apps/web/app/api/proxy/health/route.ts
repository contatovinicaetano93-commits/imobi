import { NextResponse } from 'next/server';
import { fetchApiWithRetry } from '@/lib/fetch-api-with-retry';

export const maxDuration = 30;

export async function GET() {
  const res = await fetchApiWithRetry({
    path: '/health',
    wakeFirst: true,
    maxAttemptsPerApi: 3,
  });

  if (!res) {
    return NextResponse.json({ ok: false, message: 'API offline ou demorou para responder' }, { status: 503 });
  }

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(
    { ok: res.ok, apiStatus: (data as { status?: string }).status ?? 'unknown' },
    { status: res.ok ? 200 : 503 },
  );
}

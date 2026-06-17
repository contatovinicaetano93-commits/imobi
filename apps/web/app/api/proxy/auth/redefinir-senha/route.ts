import { NextRequest, NextResponse } from 'next/server';

import { getApiV1Url } from '@/lib/api-base';

const API = getApiV1Url();

export async function POST(req: NextRequest) {
  const body = await req.text();
  const res = await fetch(`${API}/auth/redefinir-senha`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    cache: 'no-store',
  }).catch(() => null);

  if (!res) return NextResponse.json({ message: 'Serviço indisponível' }, { status: 503 });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}

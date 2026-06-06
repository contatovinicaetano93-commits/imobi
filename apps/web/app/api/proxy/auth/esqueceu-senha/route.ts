import { NextRequest, NextResponse } from 'next/server';

const _base = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';
const API = _base.endsWith('/api/v1') ? _base : `${_base}/api/v1`;

export async function POST(req: NextRequest) {
  const body = await req.text();
  const res = await fetch(`${API}/auth/esqueceu-senha`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    cache: 'no-store',
  }).catch(() => null);

  if (!res) return NextResponse.json({ message: 'Serviço indisponível' }, { status: 503 });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}

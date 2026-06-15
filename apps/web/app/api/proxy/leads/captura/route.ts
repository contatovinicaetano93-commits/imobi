import { NextRequest, NextResponse } from 'next/server';

const _base = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';
const API = _base.endsWith('/api/v1') ? _base : `${_base}/api/v1`;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ message: 'Dados inválidos.' }, { status: 400 });

  const res = await fetch(`${API}/leads/captura`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  }).catch(() => null);

  if (!res) return NextResponse.json({ message: 'Serviço indisponível.' }, { status: 503 });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) return NextResponse.json({ message: data.message ?? 'Erro ao registrar.' }, { status: res.status });

  return NextResponse.json({ ok: true, leadId: data.leadId });
}

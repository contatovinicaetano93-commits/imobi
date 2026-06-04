import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const _base = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';
const API = _base.endsWith('/api/v1') ? _base : `${_base}/api/v1`;

export async function GET(_: NextRequest, { params }: { params: { etapaId: string } }) {
  const token = (await cookies()).get('access_token')?.value;
  const res = await fetch(`${API}/evidencias/etapa/${params.etapaId}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: 'no-store',
  }).catch(() => null);
  if (!res) return NextResponse.json([]);
  const body = await res.json().catch(() => []);
  return NextResponse.json(body, { status: res.status });
}

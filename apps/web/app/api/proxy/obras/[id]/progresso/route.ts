import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const token = cookies().get('access_token')?.value;
  const res = await fetch(`${API}/api/v1/obras/${params.id}/progresso`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: 'no-store',
  }).catch(() => null);
  if (!res) return NextResponse.json(0);
  const body = await res.json().catch(() => 0);
  return NextResponse.json(body, { status: res.status });
}

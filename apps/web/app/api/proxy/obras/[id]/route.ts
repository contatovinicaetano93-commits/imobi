import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const token = cookies().get('access_token')?.value;
  const res = await fetch(`${API}/api/v1/obras/${params.id}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: 'no-store',
  }).catch(() => null);
  if (!res) return NextResponse.json(null, { status: 503 });
  const body = await res.json().catch(() => null);
  return NextResponse.json(body, { status: res.status });
}

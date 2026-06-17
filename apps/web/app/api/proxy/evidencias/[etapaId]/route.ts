import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { getApiV1Url } from '@/lib/api-base';

const API = getApiV1Url();

export async function GET(_: NextRequest, { params }: { params: { etapaId: string } }) {
  const token = (await cookies()).get('access_token')?.value;
  const res = await fetch(`${API}/evidencias/etapa/${params.etapaId}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    next: { revalidate: 30 },
  }).catch(() => null);
  if (!res) return NextResponse.json([]);
  const body = await res.json().catch(() => []);
  return NextResponse.json(body, { status: res.status });
}

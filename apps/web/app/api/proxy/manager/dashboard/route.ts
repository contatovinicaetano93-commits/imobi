import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { getApiV1Url } from '@/lib/api-base';

const API = getApiV1Url();

export async function GET(_: NextRequest) {
  const token = (await cookies()).get('access_token')?.value;
  const res = await fetch(`${API}/manager/dashboard`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    next: { revalidate: 30 },
  }).catch(() => null);
  if (!res) return NextResponse.json(null, { status: 503 });
  const body = await res.json().catch(() => null);
  return NextResponse.json(body, { status: res.status });
}

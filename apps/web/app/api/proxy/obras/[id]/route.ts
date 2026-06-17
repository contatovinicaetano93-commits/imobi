import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { getApiV1Url } from '@/lib/api-base';

const API = getApiV1Url();

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const token = (await cookies()).get('access_token')?.value;
  const res = await fetch(`${API}/obras/${params.id}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    next: { revalidate: 30 },
  }).catch(() => null);
  if (!res) return NextResponse.json(null, { status: 503 });
  const body = await res.json().catch(() => null);
  return NextResponse.json(body, { status: res.status });
}

async function mutate(req: NextRequest, id: string, method: string) {
  const token = (await cookies()).get('access_token')?.value;
  const body = await req.text();
  const res = await fetch(`${API}/obras/${id}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body } : {}),
  }).catch(() => null);
  if (!res) return NextResponse.json(null, { status: 503 });
  const text = await res.text();
  return new NextResponse(text || null, {
    status: res.status,
    headers: { 'Content-Type': res.headers.get('content-type') ?? 'application/json' },
  });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  return mutate(req, params.id, 'PATCH');
}
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  return mutate(req, params.id, 'PUT');
}
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  return mutate(req, params.id, 'DELETE');
}

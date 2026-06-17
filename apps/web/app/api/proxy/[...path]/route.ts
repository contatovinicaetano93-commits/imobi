import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getApiV1Url } from '@/lib/api-base';

const API = getApiV1Url();

async function proxy(req: NextRequest, pathParts: string[], method: string) {
  const token = (await cookies()).get('access_token')?.value;
  const qs = req.nextUrl.search;
  const url = `${API}/${pathParts.join('/')}${qs}`;

  const init: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: 'no-store',
  };

  if (method !== 'GET' && method !== 'HEAD') {
    const body = await req.text();
    if (body) (init as any).body = body;
  }

  const res = await fetch(url, init).catch(() => null);
  if (!res) return NextResponse.json({ message: `API inacessível (${url})` }, { status: 503 });

  const text = await res.text();
  return new NextResponse(text || null, {
    status: res.status,
    headers: { 'Content-Type': res.headers.get('content-type') ?? 'application/json' },
  });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, (await params).path, 'GET');
}
export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, (await params).path, 'POST');
}
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, (await params).path, 'PATCH');
}
export async function PUT(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, (await params).path, 'PUT');
}
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, (await params).path, 'DELETE');
}

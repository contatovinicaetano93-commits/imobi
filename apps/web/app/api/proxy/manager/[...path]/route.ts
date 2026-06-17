import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { getApiV1Url } from '@/lib/api-base';

const API = getApiV1Url();

async function getToken() {
  return (await cookies()).get('access_token')?.value;
}

async function proxy(req: NextRequest, path: string[], method: string) {
  const token = await getToken();
  const qs = req.nextUrl.search;
  const url = `${API}/manager/${path.join('/')}${qs}`;

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
  if (!res) return NextResponse.json({ message: 'Service unavailable' }, { status: 503 });

  const body = await res.text();
  return new NextResponse(body || null, {
    status: res.status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxy(req, path, 'GET');
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxy(req, path, 'PATCH');
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxy(req, path, 'POST');
}

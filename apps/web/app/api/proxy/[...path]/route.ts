import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const _base = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';
const API = _base.endsWith('/api/v1') ? _base : `${_base}/api/v1`;

async function proxy(req: NextRequest, pathParts: string[], method: string) {
  const token = (await cookies()).get('access_token')?.value;
  const qs = req.nextUrl.search;
  const url = `${API}/${pathParts.join('/')}${qs}`;

  const contentType = req.headers.get('content-type') ?? '';
  const isMultipart = contentType.includes('multipart/form-data');

  const headers: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  // For multipart, forward the original Content-Type (includes boundary).
  // For everything else, default to JSON.
  if (isMultipart) {
    headers['Content-Type'] = contentType;
  } else {
    headers['Content-Type'] = 'application/json';
  }

  const init: RequestInit = { method, headers, cache: 'no-store' };

  if (method !== 'GET' && method !== 'HEAD') {
    if (isMultipart) {
      (init as any).body = await req.arrayBuffer();
    } else {
      const body = await req.text();
      if (body) (init as any).body = body;
    }
  }

  const res = await fetch(url, init).catch(() => null);
  if (!res) return NextResponse.json({ message: 'Service unavailable' }, { status: 503 });

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

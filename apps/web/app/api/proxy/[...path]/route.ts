import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { fetchApiWithRetry } from '@/lib/fetch-api-with-retry';

async function proxy(req: NextRequest, pathParts: string[], method: string) {
  const token = (await cookies()).get('access_token')?.value;
  const qs = req.nextUrl.search;
  const path = `/${pathParts.join('/')}${qs}`;
  const contentType = req.headers.get('content-type') ?? '';
  const isMultipart = contentType.includes('multipart/form-data');

  let body: string | ArrayBuffer | undefined;
  const headers: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  if (method !== 'GET' && method !== 'HEAD') {
    if (isMultipart) {
      body = await req.arrayBuffer();
      headers['Content-Type'] = contentType;
    } else {
      const raw = await req.text();
      if (raw) {
        body = raw;
        headers['Content-Type'] = 'application/json';
      }
    }
  }

  const res = await fetchApiWithRetry({
    path,
    method,
    body,
    headers,
    // Jornada é chamada em toda navegação — não acordar API a cada GET (evita 429).
    wakeFirst: method === 'GET' && pathParts[0] === 'jornada' ? false : true,
  });

  if (!res) {
    return NextResponse.json(
      { message: 'API indisponível no momento. Aguarde alguns segundos e tente novamente.' },
      { status: 503 },
    );
  }

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

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { fetchApiWithRetry } from '@/lib/fetch-api-with-retry';

export const maxDuration = 60;

async function getToken() {
  return (await cookies()).get('access_token')?.value;
}

async function proxy(req: NextRequest, path: string[], method: string) {
  const token = await getToken();
  const qs = req.nextUrl.search;
  const apiPath = `/manager/${path.join('/')}${qs}`;

  let body: string | undefined;
  if (method !== 'GET' && method !== 'HEAD') {
    const text = await req.text();
    if (text) body = text;
  }

  const res = await fetchApiWithRetry({
    path: apiPath,
    method,
    body,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    maxAttemptsPerApi: method === 'GET' ? 6 : 4,
  });

  if (!res) {
    return NextResponse.json(
      {
        message:
          'API indisponível no momento. O servidor Render pode levar até 1–2 minutos para acordar — tente novamente.',
      },
      { status: 503 },
    );
  }

  const text = await res.text();
  return new NextResponse(text || null, {
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

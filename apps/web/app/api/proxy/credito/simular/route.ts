import { NextRequest, NextResponse } from 'next/server';
import { fetchApiWithRetry } from '@/lib/fetch-api-with-retry';

export async function POST(req: NextRequest) {
  const body = await req.text();
  if (!body) {
    return NextResponse.json({ message: 'Dados inválidos.' }, { status: 400 });
  }

  const res = await fetchApiWithRetry({
    path: '/credito/simular',
    method: 'POST',
    body,
    wakeFirst: true,
    maxAttemptsPerApi: 6,
  });

  if (!res) {
    return NextResponse.json(
      { message: 'Serviço indisponível. A API pode estar acordando — tente novamente em 1–2 minutos.' },
      { status: 503 },
    );
  }

  const text = await res.text();
  if (!res.ok) {
    let message = 'Erro ao simular crédito';
    try {
      const parsed = JSON.parse(text) as { message?: string };
      if (parsed.message?.trim()) message = parsed.message;
    } catch {
      /* corpo não-JSON */
    }
    return NextResponse.json({ message }, { status: res.status });
  }

  return new NextResponse(text || null, {
    status: res.status,
    headers: { 'Content-Type': res.headers.get('content-type') ?? 'application/json' },
  });
}

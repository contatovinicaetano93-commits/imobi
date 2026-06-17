import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { fetchApiWithRetry } from '@/lib/fetch-api-with-retry';

export const maxDuration = 60;

export async function GET(_: NextRequest) {
  const token = (await cookies()).get('access_token')?.value;
  const res = await fetchApiWithRetry({
    path: '/manager/dashboard',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    maxAttemptsPerApi: 6,
  });

  if (!res) {
    return NextResponse.json(
      {
        message:
          'API indisponível no momento. O servidor Render pode levar até 1–2 minutos para acordar — clique em Tentar novamente.',
      },
      { status: 503 },
    );
  }

  const body = await res.json().catch(() => null);
  const payload =
    body && typeof body === 'object'
      ? body
      : {
          message: res.ok
            ? 'Resposta vazia da API'
            : 'Erro ao carregar painel do gestor',
        };

  return NextResponse.json(payload, { status: res.status });
}

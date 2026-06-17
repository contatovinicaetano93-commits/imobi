import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { getApiV1Url } from '@/lib/api-base';

const API = getApiV1Url();

export async function GET(_: NextRequest) {
  const token = (await cookies()).get('access_token')?.value;
  const res = await fetch(`${API}/manager/dashboard`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: 'no-store',
  }).catch(() => null);

  if (!res) {
    return NextResponse.json(
      { message: 'API indisponível. Aguarde ~1 minuto e tente novamente.' },
      { status: 503 },
    );
  }

  const body = await res.json().catch(() => null);
  const payload =
    body && typeof body === 'object'
      ? body
      : { message: res.ok ? 'Resposta vazia da API' : 'Erro ao carregar painel' };

  return NextResponse.json(payload, { status: res.status });
}

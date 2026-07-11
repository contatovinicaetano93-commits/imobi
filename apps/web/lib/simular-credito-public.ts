import type { CreditoSimulacao } from '@/lib/api';
import { sleep } from '@/lib/resilience';

export type SimularCreditoPublicInput = {
  valorSolicitado: number;
  prazoMeses: number;
  tipoObra: 'RESIDENCIAL' | 'COMERCIAL' | 'MISTO';
};

export function mapFaseToTipoObra(fase: string): SimularCreditoPublicInput['tipoObra'] {
  return fase === 'comprador' ? 'RESIDENCIAL' : 'COMERCIAL';
}

/** Valor aceito pela API (R$ 10k – R$ 5M). */
export function clampValorParaApi(valorFinanciavel: number): number {
  return Math.min(Math.max(Math.round(valorFinanciavel), 10_000), 5_000_000);
}

export function clampPrazoParaApi(prazoMeses: number): number {
  return Math.min(Math.max(Math.round(prazoMeses), 12), 180);
}

export async function simularCreditoPublic(
  input: SimularCreditoPublicInput,
  onStatus?: (msg: string) => void,
): Promise<CreditoSimulacao> {
  onStatus?.('Calculando simulação…');

  const payload = {
    valorSolicitado: clampValorParaApi(input.valorSolicitado),
    prazoMeses: clampPrazoParaApi(input.prazoMeses),
    tipoObra: input.tipoObra,
  };

  let lastMessage = 'Não foi possível realizar a simulação.';

  for (let attempt = 1; attempt <= 5; attempt++) {
    const res = await fetch('/api/proxy/credito/simular', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });

    if (res.ok) {
      return (await res.json()) as CreditoSimulacao;
    }

    const body = (await res.json().catch(() => ({}))) as { message?: string };
    lastMessage = body.message ?? lastMessage;

    if (res.status >= 500 || res.status === 503) {
      onStatus?.('Tentando novamente…');
      await sleep(3500 * attempt);
      continue;
    }

    throw new Error(lastMessage);
  }

  throw new Error(`${lastMessage} Tente novamente em 1–2 minutos.`);
}

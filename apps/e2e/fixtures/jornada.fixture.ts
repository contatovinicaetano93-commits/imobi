import type { Page } from '@playwright/test';

/** Tomador com obra e crédito — pode navegar obras e crédito. */
export const MOCK_JORNADA_ACOMPANHAR = {
  perfil: 'tomador',
  passoAtual: 'acompanhar',
  titulo: 'Acompanhar liberações',
  descricao: 'Veja parcelas, extrato e progresso da obra.',
  href: '/dashboard/credito',
  concluido: true,
  passosConcluidos: 5,
  totalPassos: 5,
  progressoPct: 100,
};

export const MOCK_JORNADA_GESTOR_ETAPAS = {
  perfil: 'gestor',
  passoAtual: 'gestor_etapas',
  titulo: 'Analisar etapas de obra',
  descricao: '1 etapa(s) aguardando vistoria',
  href: '/dashboard/gestor/etapas',
  concluido: false,
  passosConcluidos: 1,
  totalPassos: 2,
  progressoPct: 50,
  fila: { kyc: 0, etapas: 1 },
};

export async function mockJornada(page: Page, jornada: Record<string, unknown> = MOCK_JORNADA_ACOMPANHAR) {
  await page.route('**/api/proxy/jornada**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(jornada),
    }),
  );
}

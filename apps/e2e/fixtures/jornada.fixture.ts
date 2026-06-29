import type { Page } from '@playwright/test';

/** Cliente no passo KYC (login MVP). */
export const MOCK_JORNADA_KYC = {
  perfil: 'tomador',
  passoAtual: 'kyc',
  titulo: 'Enviar documentos (KYC)',
  descricao: 'RG, comprovante e selfie para liberar o crédito.',
  href: '/dashboard/kyc',
  concluido: false,
  passosConcluidos: 0,
  totalPassos: 6,
  progressoPct: 0,
};

/** Cliente no passo viabilidade (após KYC). */
export const MOCK_JORNADA_VIABILIDADE = {
  perfil: 'tomador',
  passoAtual: 'viabilidade',
  titulo: 'Dossiê de viabilidade',
  descricao: 'Checklist de crédito antes de cadastrar a obra.',
  href: '/dashboard/proposta-credito',
  concluido: false,
  passosConcluidos: 1,
  totalPassos: 6,
  progressoPct: 17,
};

/** Tomador com obra e crédito — pode navegar obras e crédito. */
export const MOCK_JORNADA_ACOMPANHAR = {
  perfil: 'tomador',
  passoAtual: 'acompanhar',
  titulo: 'Acompanhar liberações',
  descricao: 'Veja parcelas, extrato e progresso da obra.',
  href: '/dashboard/credito',
  concluido: true,
  passosConcluidos: 6,
  totalPassos: 6,
  progressoPct: 100,
};

export const MOCK_JORNADA_GESTOR_ETAPAS = {
  perfil: 'gestor',
  passoAtual: 'gestor_etapas',
  titulo: 'Analisar etapas de obra',
  descricao: '1 etapa(s) aguardando vistoria',
  href: '/dashboard/gestor',
  concluido: false,
  passosConcluidos: 1,
  totalPassos: 2,
  progressoPct: 50,
  fila: { kyc: 0, etapas: 1 },
};

/** Gestor abrindo /dashboard/obras/* (vistoria) — JornadaGuard exige resposta OK. */
export const MOCK_JORNADA_GESTOR_OBRAS = {
  perfil: 'gestor',
  passoAtual: 'gestor_ok',
  titulo: 'Painel de operações',
  descricao: 'Acompanhe obras e vistorias',
  href: '/dashboard/gestor',
  concluido: true,
  passosConcluidos: 2,
  totalPassos: 2,
  progressoPct: 100,
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

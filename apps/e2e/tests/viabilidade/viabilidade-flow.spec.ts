import { test, expect } from '@playwright/test';
import { TOMADOR } from '../../fixtures/auth.fixture';
import { mockJornada, MOCK_JORNADA_VIABILIDADE } from '../../fixtures/jornada.fixture';
import {
  MOCK_CHECKLIST_TEMPLATE,
  MOCK_DOSSIE_LIST,
  MOCK_DOSSIE_RASCUNHO,
} from '../../fixtures/viabilidade.fixture';

test.use({ storageState: TOMADOR.storageState });

function mockDossiesApi(page: import('@playwright/test').Page, lista = MOCK_DOSSIE_LIST) {
  return Promise.all([
    page.route('**/api/proxy/dossies/checklist-template**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_CHECKLIST_TEMPLATE),
      }),
    ),
    page.route('**/api/proxy/dossies', (route) => {
      if (route.request().method() === 'GET') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(lista),
        });
      }
      return route.continue();
    }),
    page.route(`**/api/proxy/dossies/${MOCK_DOSSIE_RASCUNHO.id}**`, (route) => {
      if (route.request().method() === 'GET') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_DOSSIE_RASCUNHO),
        });
      }
      if (route.request().method() === 'PATCH') {
        const body = route.request().postDataJSON() as {
          checklistItens?: Array<{ itemId: string; status?: string; documentoId?: string }>;
        };
        const patch = body.checklistItens?.[0];
        const atualizado = {
          ...MOCK_DOSSIE_RASCUNHO,
          checklistItens: MOCK_DOSSIE_RASCUNHO.checklistItens.map((item) =>
            item.itemId === patch?.itemId
              ? {
                  ...item,
                  status: patch.status ?? item.status,
                  documentoId: patch.documentoId ?? item.documentoId,
                }
              : item,
          ),
        };
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(atualizado),
        });
      }
      return route.continue();
    }),
  ]);
}

test.describe('Viabilidade flow', () => {
  test.beforeEach(async ({ page }) => {
    await mockJornada(page, MOCK_JORNADA_VIABILIDADE);
    await mockDossiesApi(page);
    await page.goto('/dashboard/proposta-credito');
  });

  test('renders viabilidade page with dossie checklist', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Dossiê de viabilidade' })).toBeVisible();
    await expect(page.getByText('Residencial Parque E2E')).toBeVisible();
    await expect(page.getByText('Matrícula do imóvel')).toBeVisible();
    await expect(page.getByRole('button', { name: /Anexar|Marcar enviado/ }).first()).toBeVisible();
    await expect(page.getByText('Como funciona')).toBeVisible();
  });

  test('shows progress for mandatory checklist items', async ({ page }) => {
    await expect(page.getByText(/0\/2 itens obrigatórios marcados/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Enviar para análise' })).toBeDisabled();
  });

  test('Anexar uploads document and marks item ENVIADO', async ({ page }) => {
    await page.route('**/api/proxy/documentos', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          documentoId: 'e2e-doc-viab-1',
          nome: 'matricula.pdf',
          tipo: 'OUTROS',
          url: 'uploads/e2e/matricula.pdf',
        }),
      });
    });

    const anexarBtn = page.getByRole('button', { name: 'Anexar' }).first();
    await expect(anexarBtn).toBeVisible();
    await anexarBtn.click();
    await page.locator('input[type="file"]').setInputFiles({
      name: 'matricula.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-fake'),
    });

    await expect(page.getByText('ENVIADO').first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('link', { name: 'Ver anexo' }).first()).toBeVisible();
  });

  test('empty list shows new dossie form', async ({ page }) => {
    await mockDossiesApi(page, []);
    await page.goto('/dashboard/proposta-credito');

    await expect(page.getByRole('heading', { name: 'Novo dossiê' })).toBeVisible();
    await expect(page.getByPlaceholder('Ex.: Residencial Parque Verde')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Criar dossiê' })).toBeVisible();
  });
});

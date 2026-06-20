import { test, expect } from "@playwright/test";

test.describe("Smoke — marketing funnel", () => {
  test("landing page carrega e botão Simular navega para /simulador", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/IMOBI/i);
    await page.getByRole("button", { name: /Simular crédito/i }).first().click();
    await expect(page).toHaveURL(/\/simulador/);
  });

  test("simulador carrega e step 1 exibe campo de valor", async ({ page }) => {
    await page.goto("/simulador");
    await expect(page.getByText(/valor total da obra/i)).toBeVisible();
    await expect(page.getByPlaceholder(/Ex: 3.000.000/i)).toBeVisible();
  });

  test("simulador step 1: botão Próximo desabilitado abaixo de R$100k", async ({ page }) => {
    await page.goto("/simulador");
    const next = page.getByRole("button", { name: /próximo/i });
    await expect(next).toBeDisabled();

    await page.getByPlaceholder(/Ex: 3.000.000/i).fill("50000");
    await expect(next).toBeDisabled();

    await page.getByPlaceholder(/Ex: 3.000.000/i).fill("500000");
    await expect(next).toBeEnabled();
  });

  test("simulador fluxo completo 5 etapas leva à tela de resultado", async ({ page }) => {
    await page.goto("/simulador");

    // Step 1: valor
    await page.getByPlaceholder(/Ex: 3.000.000/i).fill("5000000");
    await page.getByRole("button", { name: /próximo/i }).click();

    // Step 2: fase (default selecionado, basta avançar)
    await page.getByRole("button", { name: /próximo/i }).click();

    // Step 3: prazo
    await page.getByRole("button", { name: /próximo/i }).click();

    // Step 4: localização
    await page.getByRole("combobox").selectOption("SP");
    await page.getByPlaceholder(/sua cidade/i).fill("São Paulo");
    await page.getByRole("button", { name: /próximo/i }).click();

    // Step 5: CNPJ (opcional)
    await page.getByRole("button", { name: /ver simulação/i }).click();

    // Resultado
    await expect(page.getByText(/você pode financiar até/i)).toBeVisible();
  });

  test("simulador botão 'Criar conta' redireciona para /cadastro com params", async ({ page }) => {
    await page.goto("/simulador");
    await page.getByPlaceholder(/Ex: 3.000.000/i).fill("3000000");
    await page.getByRole("button", { name: /próximo/i }).click();
    await page.getByRole("button", { name: /próximo/i }).click();
    await page.getByRole("button", { name: /próximo/i }).click();
    await page.getByRole("combobox").selectOption("RJ");
    await page.getByPlaceholder(/sua cidade/i).fill("Rio de Janeiro");
    await page.getByRole("button", { name: /próximo/i }).click();
    await page.getByRole("button", { name: /ver simulação/i }).click();
    await page.getByRole("button", { name: /criar conta e continuar/i }).click();
    await expect(page).toHaveURL(/\/cadastro\?valor=/);
  });

  test("página /login carrega sem erro", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByPlaceholder(/seu@email/i)).toBeVisible();
  });
});

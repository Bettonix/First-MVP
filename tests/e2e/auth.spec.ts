/**
 * auth.spec.ts — Gateway de Autenticação
 *
 * Testa o fluxo de login real via UI (email + senha, 2 steps).
 * Usa credenciais de teste definidas em variáveis de ambiente:
 *   E2E_EMAIL    — ex: test@playwright.local
 *   E2E_PASSWORD — ex: playwright123
 *
 * Se as variáveis não estiverem definidas, os testes são pulados
 * graciosamente para não bloquear o CI sem credenciais configuradas.
 *
 * O storageState gerado em auth.setup.ts pode ser reutilizado por
 * outros specs via `use: { storageState: 'tests/e2e/.auth/user.json' }`.
 */

import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

const EMAIL    = process.env.E2E_EMAIL    ?? "";
const PASSWORD = process.env.E2E_PASSWORD ?? "";
const AUTH_DIR = path.join(__dirname, ".auth");

test.describe("Auth — Login Gateway", () => {
  test.skip(!EMAIL || !PASSWORD, "E2E_EMAIL / E2E_PASSWORD não definidos — pulando testes de auth real");

  test("Step 1: campo de e-mail aceita input e avança para senha", async ({ page }) => {
    await page.goto("/login");

    // Aguarda o campo de e-mail estar visível (sem waitForTimeout)
    const emailInput = page.getByLabel("E-mail");
    await expect(emailInput).toBeVisible();

    await emailInput.fill(EMAIL);
    await emailInput.press("Enter");

    // Step 2 deve aparecer: campo de senha
    const passwordInput = page.getByLabel("Senha");
    await expect(passwordInput).toBeVisible();
  });

  test("Step 2: login completo redireciona para área autenticada", async ({ page }) => {
    await page.goto("/login");

    // Step 1 — e-mail
    const emailInput = page.getByLabel("E-mail");
    await expect(emailInput).toBeVisible();
    await emailInput.fill(EMAIL);
    await emailInput.press("Enter");

    // Step 2 — senha
    const passwordInput = page.getByLabel("Senha");
    await expect(passwordInput).toBeVisible();
    await passwordInput.fill(PASSWORD);

    // Submete o formulário aguardando a navegação
    await Promise.all([
      page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15_000 }),
      passwordInput.press("Enter"),
    ]);

    // Confirma que está na área autenticada — PDV ou Dashboard
    await expect(page).not.toHaveURL(/\/login/);

    // Elemento que só existe na área autenticada
    const pdvOrDash = page.locator('[data-testid="pdv-search"], [data-testid="setup-checklist"]').first();
    await expect(pdvOrDash).toBeVisible({ timeout: 10_000 });
  });

  test("Credenciais inválidas exibem mensagem de erro sem redirecionar", async ({ page }) => {
    await page.goto("/login");

    const emailInput = page.getByLabel("E-mail");
    await expect(emailInput).toBeVisible();
    await emailInput.fill("invalido@teste.com");
    await emailInput.press("Enter");

    const passwordInput = page.getByLabel("Senha");
    await expect(passwordInput).toBeVisible();
    await passwordInput.fill("senha-errada-123");
    await passwordInput.press("Enter");

    // Deve permanecer em /login
    await expect(page).toHaveURL(/\/login/, { timeout: 8_000 });

    // Mensagem de erro deve aparecer
    const errorMsg = page.locator(".auth-err, [role='alert']").first();
    await expect(errorMsg).toBeVisible({ timeout: 8_000 });
  });

  test("storageState: salva sessão autenticada para reuso em outros specs", async ({ page, context }) => {
    await page.goto("/login");

    const emailInput = page.getByLabel("E-mail");
    await expect(emailInput).toBeVisible();
    await emailInput.fill(EMAIL);
    await emailInput.press("Enter");

    const passwordInput = page.getByLabel("Senha");
    await expect(passwordInput).toBeVisible();
    await passwordInput.fill(PASSWORD);

    await Promise.all([
      page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15_000 }),
      passwordInput.press("Enter"),
    ]);

    // Persiste o estado de autenticação para reuso
    if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true });
    await context.storageState({ path: path.join(AUTH_DIR, "user.json") });
  });
});

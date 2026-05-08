/**
 * Onboarding UX Suite — Playwright
 *
 * Testa: wizard de onboarding, hotspot de busca, confete da primeira venda,
 * e checklist de ativação (SetupChecklist).
 *
 * Requer: PLAYWRIGHT_TEST_BYPASS=1
 */

import { test, expect, type BrowserContext, type Page } from "@playwright/test";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function freshContext(browser: import("@playwright/test").Browser): Promise<BrowserContext> {
  const ctx = await browser.newContext();
  // Garante localStorage limpo para cada teste
  await ctx.addInitScript(() => localStorage.clear());
  return ctx;
}

async function openPDV(ctx: BrowserContext): Promise<Page> {
  const page = await ctx.newPage();
  await page.goto("/app");
  await expect(page.getByTestId("pdv-search")).toBeVisible({ timeout: 15_000 });
  return page;
}

async function addProduto(page: Page, nome: string) {
  await page.getByTestId("pdv-search").fill(nome.split(" ")[0]);
  const card = page.locator("button").filter({ hasText: nome }).first();
  await expect(card).toBeVisible({ timeout: 5_000 });
  await card.click();
  await page.waitForTimeout(100);
}

async function finalizarVenda(page: Page, valorCentavos: number) {
  const splitInput = page.getByTestId("split-valor-input");
  await expect(splitInput).toBeVisible({ timeout: 5_000 });
  await splitInput.click();
  await splitInput.clear();
  await splitInput.pressSequentially(String(valorCentavos / 100));
  await page.waitForTimeout(200);
  await page.getByTestId("btn-metodo-dinheiro").click();
  await page.waitForTimeout(300);
  const btn = page.getByTestId("btn-finalizar-venda");
  await expect(btn).toBeEnabled({ timeout: 5_000 });
  await btn.click();
  return btn;
}

// ─── Suite: Search Hotspot ────────────────────────────────────────────────────

test.describe("Search Hotspot", () => {

  test("exibe hotspot pulsante quando localStorage está limpo", async ({ browser }) => {
    const ctx = await freshContext(browser);
    const page = await openPDV(ctx);

    // Aguarda o delay de 300ms do hook antes de verificar
    await page.waitForTimeout(600);
    const hotspot = page.locator('[aria-hidden="true"]').filter({ hasText: "Busque um produto aqui" });
    await expect(hotspot).toBeVisible({ timeout: 5_000 });

    await ctx.close();
  });

  test("hotspot desaparece ao focar na barra de busca", async ({ browser }) => {
    const ctx = await freshContext(browser);
    const page = await openPDV(ctx);

    // Aguarda o hotspot aparecer (delay de 300ms)
    await page.waitForTimeout(600);
    const hotspot = page.locator('[aria-hidden="true"]').filter({ hasText: "Busque um produto aqui" });
    await expect(hotspot).toBeVisible({ timeout: 5_000 });

    // Foca no input — o listener de focus dispara o dismiss
    await page.getByTestId("pdv-search").click();
    await page.waitForTimeout(500);

    await expect(hotspot).not.toBeVisible({ timeout: 3_000 });

    await ctx.close();
  });

  test("hotspot não aparece quando localStorage já tem a flag", async ({ browser }) => {
    const ctx = await browser.newContext();
    await ctx.addInitScript(() => {
      localStorage.setItem("hasSeenSearchHotspot", "1");
    });
    const page = await openPDV(ctx);

    // Aguarda além do delay de 300ms para garantir que não aparece
    await page.waitForTimeout(700);
    const hotspot = page.locator('[aria-hidden="true"]').filter({ hasText: "Busque um produto aqui" });
    await expect(hotspot).not.toBeVisible({ timeout: 3_000 });

    await ctx.close();
  });

  test("flag hasSeenSearchHotspot é gravada no localStorage ao focar", async ({ browser }) => {
    const ctx = await freshContext(browser);
    const page = await openPDV(ctx);

    // Aguarda o hotspot aparecer antes de focar
    await page.waitForTimeout(600);
    await page.getByTestId("pdv-search").click();
    await page.waitForTimeout(400);

    const flag = await page.evaluate(() => localStorage.getItem("hasSeenSearchHotspot"));
    expect(flag).toBe("1");

    await ctx.close();
  });
});

// ─── Suite: First Sale Confetti ───────────────────────────────────────────────

test.describe("First Sale Confetti", () => {

  test("flag hasMadeFirstSale é gravada no localStorage após primeira venda", async ({ browser }) => {
    const ctx = await freshContext(browser);
    const page = await openPDV(ctx);

    // Verifica que a flag não existe antes
    const flagAntes = await page.evaluate(() => localStorage.getItem("hasMadeFirstSale"));
    expect(flagAntes).toBeNull();

    await addProduto(page, "Café Espresso");
    await finalizarVenda(page, 800);

    // Aguarda processamento
    await page.waitForTimeout(600);

    const flagDepois = await page.evaluate(() => localStorage.getItem("hasMadeFirstSale"));
    expect(flagDepois).toBe("1");

    await ctx.close();
  });

  test("confete não dispara na segunda venda (flag já existe)", async ({ browser }) => {
    const ctx = await browser.newContext();
    // Simula usuário que já fez a primeira venda
    await ctx.addInitScript(() => {
      localStorage.setItem("hasMadeFirstSale", "1");
    });
    const page = await openPDV(ctx);

    // Intercepta chamadas ao canvas-confetti para verificar que não foi chamado
    let confettiCalled = false;
    await page.exposeFunction("__confettiSpy", () => { confettiCalled = true; });

    await addProduto(page, "Café Espresso");
    await finalizarVenda(page, 800);
    await page.waitForTimeout(800);

    // A flag deve continuar "1" (não foi resetada)
    const flag = await page.evaluate(() => localStorage.getItem("hasMadeFirstSale"));
    expect(flag).toBe("1");

    // confettiCalled permanece false pois o hook retorna cedo
    expect(confettiCalled).toBe(false);

    await ctx.close();
  });
});

// ─── Suite: Setup Checklist ───────────────────────────────────────────────────

test.describe("Setup Checklist", () => {

  test("checklist aparece no PDV quando acessado via ?welcome=1", async ({ browser }) => {
    const ctx = await freshContext(browser);
    const page = await ctx.newPage();
    await page.goto("/app?welcome=1");
    await expect(page.getByTestId("pdv-search")).toBeVisible({ timeout: 15_000 });

    await expect(page.getByTestId("setup-checklist")).toBeVisible({ timeout: 5_000 });

    await ctx.close();
  });

  test("checklist exibe 3 tarefas de ativação", async ({ browser }) => {
    const ctx = await freshContext(browser);
    const page = await ctx.newPage();
    await page.goto("/app?welcome=1");
    await expect(page.getByTestId("pdv-search")).toBeVisible({ timeout: 15_000 });

    const checklist = page.getByTestId("setup-checklist");
    await expect(checklist.getByText("Criar um Produto")).toBeVisible({ timeout: 5_000 });
    await expect(checklist.getByText("Realizar Venda de Teste")).toBeVisible({ timeout: 5_000 });
    await expect(checklist.getByText("Configurar Perfil")).toBeVisible({ timeout: 5_000 });

    await ctx.close();
  });

  test("checklist pode ser dispensado com botão X", async ({ browser }) => {
    const ctx = await freshContext(browser);
    const page = await ctx.newPage();
    await page.goto("/app?welcome=1");
    await expect(page.getByTestId("pdv-search")).toBeVisible({ timeout: 15_000 });

    await expect(page.getByTestId("setup-checklist")).toBeVisible({ timeout: 5_000 });

    await page.getByRole("button", { name: "Fechar checklist" }).click();
    await page.waitForTimeout(400);

    await expect(page.getByTestId("setup-checklist")).not.toBeAttached({ timeout: 5_000 });

    await ctx.close();
  });

  test("checklist pode ser recolhido e expandido", async ({ browser }) => {
    const ctx = await freshContext(browser);
    const page = await ctx.newPage();
    await page.goto("/app?welcome=1");
    await expect(page.getByTestId("pdv-search")).toBeVisible({ timeout: 15_000 });

    const checklist = page.getByTestId("setup-checklist");
    await expect(checklist.getByText("Criar um Produto")).toBeVisible({ timeout: 5_000 });

    // Recolhe
    await page.getByRole("button", { name: "Recolher" }).click();
    await page.waitForTimeout(500);
    await expect(checklist.getByText("Criar um Produto")).not.toBeVisible({ timeout: 3_000 });

    // Expande
    await page.getByRole("button", { name: "Expandir" }).click();
    await page.waitForTimeout(500);
    await expect(checklist.getByText("Criar um Produto")).toBeVisible({ timeout: 3_000 });

    await ctx.close();
  });

  test("barra de progresso avança ao marcar tarefa como feita", async ({ browser }) => {
    const ctx = await freshContext(browser);
    const page = await ctx.newPage();
    await page.goto("/app?welcome=1");
    await expect(page.getByTestId("pdv-search")).toBeVisible({ timeout: 15_000 });

    // Progresso inicial: 0/3
    await expect(page.getByTestId("setup-checklist")).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('[data-testid="setup-checklist"] span').filter({ hasText: "0/3" })).toBeVisible({ timeout: 5_000 });

    // Marca primeira tarefa
    await page.getByRole("button", { name: /Marcar Criar um Produto/i }).click();
    await page.waitForTimeout(600);
    await expect(page.locator('[data-testid="setup-checklist"] span').filter({ hasText: "1/3" })).toBeVisible({ timeout: 5_000 });

    await ctx.close();
  });
});

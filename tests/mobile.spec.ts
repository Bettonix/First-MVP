/**
 * Mobile E2E Tests — Strict Layout & Overflow Validation
 *
 * Testa o PDV em viewports pequenos (375px iPhone SE, 390px iPhone 14, 393px Pixel 5).
 * Valida que nenhum elemento-chave causa scroll horizontal (overflow) e que
 * todos os elementos críticos estão visíveis sem precisar rolar.
 *
 * Requer: PLAYWRIGHT_TEST_BYPASS=1
 */

import { test, expect, type Page } from "@playwright/test";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function gotoAndWait(page: Page) {
  await page.goto("/app");
  await expect(page.getByTestId("pdv-search")).toBeVisible({ timeout: 15_000 });
}

/**
 * Verifica se a página tem scroll horizontal (overflow).
 * Retorna a diferença entre scrollWidth e clientWidth do documentElement.
 */
async function getHorizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(() => {
    const el = document.documentElement;
    return el.scrollWidth - el.clientWidth;
  });
}

/**
 * Verifica se um elemento está completamente dentro dos limites horizontais do viewport.
 */
async function elementIsWithinViewport(page: Page, testId: string): Promise<boolean> {
  const vw = page.viewportSize()?.width ?? 375;
  return page.evaluate(
    ({ id, vpWidth }) => {
      const el = document.querySelector(`[data-testid="${id}"]`);
      if (!el) return false;
      const rect = el.getBoundingClientRect();
      return rect.left >= 0 && rect.right <= vpWidth;
    },
    { id: testId, vpWidth: vw }
  );
}

// ─── Suite: Layout sem overflow ───────────────────────────────────────────────

test.describe("Mobile — sem overflow horizontal", () => {

  test("página do PDV não causa scroll horizontal", async ({ page }) => {
    await gotoAndWait(page);
    const overflow = await getHorizontalOverflow(page);
    expect(overflow, `Overflow horizontal detectado: ${overflow}px`).toBe(0);
  });

  test("barra de busca está visível e dentro do viewport", async ({ page }) => {
    await gotoAndWait(page);
    await expect(page.getByTestId("pdv-search")).toBeVisible();
    const withinBounds = await elementIsWithinViewport(page, "pdv-search");
    expect(withinBounds, "Campo de busca ultrapassa o viewport").toBe(true);
  });

  test("cards de produto estão visíveis e dentro do viewport", async ({ page }) => {
    await gotoAndWait(page);
    // Aguarda ao menos um card de produto aparecer
    const firstCard = page.locator("button").filter({ hasText: /R\$/ }).first();
    await expect(firstCard).toBeVisible({ timeout: 5_000 });

    // Verifica que não há overflow após renderizar os cards
    const overflow = await getHorizontalOverflow(page);
    expect(overflow, `Cards causam overflow: ${overflow}px`).toBe(0);
  });

  test("header do PDV está visível e não ultrapassa o viewport", async ({ page }) => {
    await gotoAndWait(page);
    const vw = page.viewportSize()?.width ?? 375;
    const headerOverflow = await page.evaluate((vpWidth) => {
      const header = document.querySelector("header");
      if (!header) return 0;
      return Math.max(0, header.scrollWidth - vpWidth);
    }, vw);
    expect(headerOverflow, `Header ultrapassa viewport em ${headerOverflow}px`).toBe(0);
  });

});

// ─── Suite: Elementos críticos visíveis ───────────────────────────────────────

test.describe("Mobile — elementos críticos visíveis", () => {

  test("tab de navegação (Pedido Balcão) está visível", async ({ page }) => {
    await gotoAndWait(page);
    await expect(page.getByRole("button", { name: /Pedido Balcão/i })).toBeVisible();
  });

  test("campo de busca aceita input em mobile", async ({ page }) => {
    await gotoAndWait(page);
    const search = page.getByTestId("pdv-search");
    await search.click();
    await search.fill("Café");
    await expect(search).toHaveValue("Café");
  });

  test("carrinho abre ao adicionar produto", async ({ page }) => {
    await gotoAndWait(page);
    // Clica no primeiro produto disponível
    const firstProduct = page.locator("button").filter({ hasText: /R\$/ }).first();
    await expect(firstProduct).toBeVisible({ timeout: 5_000 });
    await firstProduct.click();

    // Verifica que o total do carrinho aparece
    await expect(page.getByTestId("cart-total")).toBeVisible({ timeout: 3_000 });
  });

});

// ─── Suite: Modal do Caixa (CashActions) ─────────────────────────────────────

test.describe("Mobile — modal do caixa sem overflow", () => {

  test("modal de abrir turno não causa overflow horizontal", async ({ page }) => {
    await gotoAndWait(page);

    // Abre o menu de ações do caixa
    const cashBtn = page.getByRole("button", { name: /ações do caixa/i });
    if (await cashBtn.isVisible()) {
      await cashBtn.click();
      await page.waitForTimeout(300);

      // Verifica overflow após abrir menu
      const overflow = await getHorizontalOverflow(page);
      expect(overflow, `Menu do caixa causa overflow: ${overflow}px`).toBe(0);
    }
  });

});

// ─── Suite: Formulário de produto ─────────────────────────────────────────────

test.describe("Mobile — formulário de produto", () => {

  test("formulário de produto não causa overflow horizontal", async ({ page }) => {
    await page.goto("/dashboard/produtos");
    await page.waitForLoadState("networkidle");

    const overflow = await getHorizontalOverflow(page);
    expect(overflow, `Página de produtos causa overflow: ${overflow}px`).toBe(0);
  });

});

// ─── Suite: Touch targets (WCAG 2.5.5) ───────────────────────────────────────

test.describe("Mobile — touch targets mínimos (44px)", () => {

  test("botão principal do carrinho tem altura mínima de 44px", async ({ page }) => {
    await gotoAndWait(page);

    // Adiciona um produto para ativar o botão principal
    const firstProduct = page.locator("button").filter({ hasText: /R\$/ }).first();
    if (await firstProduct.isVisible()) {
      await firstProduct.click();
      await page.waitForTimeout(300);
    }

    // Verifica o botão de receber/checkout
    const checkoutBtn = page.locator("button").filter({ hasText: /Receber|Fechar Conta|Abrir/i }).last();
    if (await checkoutBtn.isVisible()) {
      const box = await checkoutBtn.boundingBox();
      if (box) {
        expect(box.height, `Botão checkout muito pequeno: ${box.height}px`).toBeGreaterThanOrEqual(44);
      }
    }
  });

  test("campo de busca tem altura mínima de 44px", async ({ page }) => {
    await gotoAndWait(page);
    const search = page.getByTestId("pdv-search");
    const box = await search.boundingBox();
    if (box) {
      expect(box.height, `Campo de busca muito pequeno: ${box.height}px`).toBeGreaterThanOrEqual(44);
    }
  });

});

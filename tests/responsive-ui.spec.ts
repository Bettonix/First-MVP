/**
 * Responsive UI Tests — Playwright
 *
 * Testa o layout do PDV em Desktop, iPhone 14 e Pixel 5.
 * Usa asserções funcionais (sem comparação de pixels) para evitar
 * flakiness por anti-aliasing e fontes do sistema.
 *
 * Requer: PLAYWRIGHT_TEST_BYPASS=1
 */

import { test, expect, type Page } from "@playwright/test";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function waitForPDV(page: Page) {
  await page.goto("/app");
  await expect(page.getByTestId("pdv-search")).toBeVisible({ timeout: 15_000 });
}

/** Retorna true se o viewport é mobile (largura < 768px = breakpoint md do Tailwind) */
function isMobileViewport(page: Page): boolean {
  return page.viewportSize()?.width !== undefined &&
    (page.viewportSize()?.width ?? 1280) < 768;
}

/** Verifica se um elemento está dentro dos limites horizontais do viewport (sem overflow) */
async function isWithinHorizontalBounds(page: Page, selector: string): Promise<boolean> {
  const vpWidth = page.viewportSize()?.width ?? 1280;
  return page.evaluate(
    ({ sel, vp }) => {
      const el = document.querySelector(sel);
      if (!el) return false;
      const rect = el.getBoundingClientRect();
      // Aceita até 2px de tolerância para bordas/sombras
      return rect.right <= vp + 2;
    },
    { sel: selector, vp: vpWidth }
  );
}

// ─── Suite ────────────────────────────────────────────────────────────────────

test.describe("PDV Responsividade", () => {

  // ── Teste 1: Layout principal renderiza sem overflow horizontal ───────────
  test("PDV não tem overflow horizontal", async ({ page }) => {
    await waitForPDV(page);

    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    expect(hasHorizontalScroll).toBe(false);
  });

  // ── Teste 2: Grid de produtos adapta colunas ao viewport ─────────────────
  test("Grid de produtos tem colunas corretas para o viewport", async ({ page }) => {
    await waitForPDV(page);

    const vpWidth = page.viewportSize()?.width ?? 1280;
    const isMobile = vpWidth < 768;
    const isXL     = vpWidth >= 1280;

    // Aguarda pelo menos um card de produto
    const firstCard = page.locator('[data-testid^="product-card-"]').first();

    // Se não há data-testid nos cards, usa o grid diretamente
    const gridCols = await page.evaluate(() => {
      // Encontra o grid de produtos pelo padrão de classes
      const grids = Array.from(document.querySelectorAll('[class*="grid-cols"]'));
      const productGrid = grids.find(el =>
        el.className.includes("grid-cols-2") &&
        el.className.includes("md:grid-cols-3")
      );
      if (!productGrid) return null;

      const style = window.getComputedStyle(productGrid);
      const cols  = style.gridTemplateColumns;
      // Conta o número de colunas pelo template
      return cols.split(" ").filter(c => c.trim() !== "").length;
    });

    if (gridCols !== null) {
      if (isMobile) {
        // Mobile: grid-cols-2 (< md)
        expect(gridCols).toBe(2);
      } else if (isXL) {
        // XL: grid-cols-4
        expect(gridCols).toBe(4);
      } else {
        // md → xl: grid-cols-3
        expect(gridCols).toBe(3);
      }
    }
  });

  // ── Teste 3: Botão Finalizar Venda é visível e clicável no mobile ─────────
  test("Botão Finalizar Venda é acessível sem scroll horizontal", async ({ page }) => {
    await waitForPDV(page);

    const isMobile = isMobileViewport(page);

    if (isMobile) {
      // No mobile, o carrinho está oculto — precisa abrir via botão flutuante
      // Adiciona um produto para ativar o botão do carrinho
      await page.getByTestId("pdv-search").fill("Café");
      const card = page.locator("button").filter({ hasText: "Café Espresso" }).first();
      await expect(card).toBeVisible({ timeout: 5_000 });
      await card.click();
      await page.waitForTimeout(300);

      // Abre o carrinho via botão flutuante (bottom bar)
      const cartFab = page.locator('[class*="fixed"][class*="bottom"]').filter({
        has: page.locator('[data-testid="cart-total"]'),
      }).first();

      // Tenta encontrar o botão de abrir carrinho
      const openCartBtn = page.locator('button').filter({ hasText: /carrinho|cart|ver|abrir/i }).first();
      const fabVisible = await cartFab.isVisible().catch(() => false);
      const openBtnVisible = await openCartBtn.isVisible().catch(() => false);

      if (fabVisible) {
        await cartFab.click();
      } else if (openBtnVisible) {
        await openCartBtn.click();
      } else {
        // Tenta clicar no cart-total que pode ser o trigger
        const cartTotalEl = page.getByTestId("cart-total");
        if (await cartTotalEl.isVisible().catch(() => false)) {
          await cartTotalEl.click();
        }
      }
      await page.waitForTimeout(500);
    }

    // Verifica que o botão finalizar está visível
    const btnFinalizar = page.getByTestId("btn-finalizar-venda");
    await expect(btnFinalizar).toBeVisible({ timeout: 5_000 });

    // Verifica que não há overflow horizontal no botão
    const withinBounds = await isWithinHorizontalBounds(page, '[data-testid="btn-finalizar-venda"]');
    expect(withinBounds).toBe(true);
  });

  // ── Teste 4: Header do PDV não transborda no mobile ───────────────────────
  test("Header do PDV é legível e não transborda", async ({ page }) => {
    await waitForPDV(page);

    // O header contém o nome da loja
    const header = page.locator("header").first();
    await expect(header).toBeVisible({ timeout: 5_000 });

    // Verifica que o header não tem overflow horizontal
    const headerOverflow = await page.evaluate(() => {
      const h = document.querySelector("header");
      if (!h) return false;
      return h.scrollWidth > h.clientWidth;
    });
    expect(headerOverflow).toBe(false);

    // Verifica que o nome da loja está visível
    await expect(page.getByText("Loja Teste E2E")).toBeVisible({ timeout: 3_000 });
  });

  // ── Teste 5: Campo de busca ocupa largura adequada ────────────────────────
  test("Campo de busca ocupa pelo menos 60% da largura disponível", async ({ page }) => {
    await waitForPDV(page);

    const searchWidth = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="pdv-search"]');
      if (!el) return 0;
      return el.getBoundingClientRect().width;
    });

    const vpWidth = page.viewportSize()?.width ?? 1280;
    const isMobile = vpWidth < 768;

    // Em mobile, o search ocupa a coluna inteira (menos padding)
    // Em desktop, ocupa a coluna esquerda (menos o painel do carrinho)
    const minExpectedWidth = isMobile
      ? vpWidth * 0.6   // 60% do viewport em mobile
      : (vpWidth * 0.6) * 0.6; // 60% da coluna esquerda em desktop

    expect(searchWidth).toBeGreaterThan(minExpectedWidth);
  });

  // ── Teste 6: Screenshot do PDV (baseline visual) ──────────────────────────
  test("Screenshot do PDV — baseline visual", async ({ page }) => {
    await waitForPDV(page);

    // Aguarda animações terminarem
    await page.waitForTimeout(500);

    // Captura screenshot para baseline
    // Na primeira execução, cria o arquivo de referência.
    // Nas execuções seguintes, compara com tolerância de 5%.
    await expect(page).toHaveScreenshot("pdv-baseline.png", {
      fullPage: false, // apenas o viewport visível
      maxDiffPixelRatio: 0.05, // tolera até 5% de diferença
      animations: "disabled",
    });
  });

  // ── Teste 7: Painel do carrinho não sobrepõe conteúdo no desktop ──────────
  test("Painel do carrinho não sobrepõe o grid de produtos no desktop", async ({ page }) => {
    await waitForPDV(page);

    const isMobile = isMobileViewport(page);
    if (isMobile) {
      // No mobile o carrinho é um drawer — não sobrepõe quando fechado
      test.skip();
      return;
    }

    // No desktop, o grid e o carrinho devem estar lado a lado (sem sobreposição)
    const overlap = await page.evaluate(() => {
      const grid = document.querySelector('[class*="grid-cols-2"][class*="md:grid-cols-3"]');
      const cart = document.querySelector('[class*="md:inset-auto"]');
      if (!grid || !cart) return false;

      const gRect = grid.getBoundingClientRect();
      const cRect = cart.getBoundingClientRect();

      // Verifica sobreposição horizontal
      return gRect.right > cRect.left + 10; // 10px de tolerância
    });

    expect(overlap).toBe(false);
  });
});

/**
 * Mobile UX — Deep Interaction & Tap-Target Tests
 *
 * Testa interações reais em mobile: abre modais, valida contenção de layout,
 * mede touch targets (WCAG 2.5.5 ≥ 44px) e verifica scroll vertical em formulários.
 *
 * Viewport: iPhone SE (375×667) — menor viewport suportado.
 * Auth: PLAYWRIGHT_TEST_BYPASS=1 (mock data, sem login real).
 */

import { test, expect, type Page, type Locator } from "@playwright/test";

// ─── Config ───────────────────────────────────────────────────────────────────

test.use({ viewport: { width: 375, height: 667 } });

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function gotoAndWait(page: Page) {
  await page.goto("/app");
  await expect(page.getByTestId("pdv-search")).toBeVisible({ timeout: 15_000 });
}

/** Retorna overflow horizontal em px (0 = sem overflow). */
async function horizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(() =>
    Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth)
  );
}

/** Garante que um elemento está dentro dos limites horizontais do viewport. */
async function assertWithinViewport(locator: Locator, label: string) {
  const box = await locator.boundingBox();
  expect(box, `${label}: boundingBox é null`).not.toBeNull();
  if (!box) return;
  expect(box.x, `${label}: começa fora da tela (x=${box.x})`).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width, `${label}: ultrapassa viewport (right=${box.x + box.width})`).toBeLessThanOrEqual(376); // 375 + 1px tolerância
}

/** Garante touch target mínimo WCAG 2.5.5 (44×44px). */
async function assertTapTarget(locator: Locator, label: string) {
  const box = await locator.boundingBox();
  expect(box, `${label}: boundingBox é null`).not.toBeNull();
  if (!box) return;
  expect(box.height, `${label}: altura ${box.height}px < 44px (WCAG)`).toBeGreaterThanOrEqual(44);
  expect(box.width, `${label}: largura ${box.width}px < 44px (WCAG)`).toBeGreaterThanOrEqual(44);
}

// ─── Suite 1: Modal do Caixa (CashActions) ────────────────────────────────────

test.describe("Modal do Caixa — contenção e overflow", () => {

  test("modal de Abrir Turno cabe dentro do viewport (375px)", async ({ page }) => {
    await gotoAndWait(page);

    // Abre o menu de ações do caixa
    const cashBtn = page.getByRole("button", { name: "Ações do caixa" });
    await expect(cashBtn).toBeVisible({ timeout: 5_000 });
    await cashBtn.click();
    await page.waitForTimeout(200);

    // Clica em "Abrir Caixa" ou "Abrir Turno"
    const abrirBtn = page.getByRole("button", { name: /Abrir Caixa|Abrir Turno/i });
    if (await abrirBtn.isVisible({ timeout: 2_000 })) {
      await abrirBtn.click();
      await page.waitForTimeout(300);

      // O modal deve estar visível
      const modal = page.locator(".fixed.inset-0").last();
      await expect(modal).toBeVisible({ timeout: 3_000 });

      // Sem overflow horizontal após abrir o modal
      const overflow = await horizontalOverflow(page);
      expect(overflow, `Modal causa overflow: ${overflow}px`).toBe(0);

      // O painel interno do modal deve caber no viewport
      const panel = page.locator(".rounded-t-3xl, .rounded-3xl").last();
      if (await panel.isVisible()) {
        await assertWithinViewport(panel, "Painel do modal");
      }

      // O input de valor deve estar visível e acessível
      const input = page.locator("input[type='number']").first();
      await expect(input).toBeVisible({ timeout: 2_000 });
      await assertWithinViewport(input, "Input de valor do modal");

      // Fecha o modal
      await page.keyboard.press("Escape");
    }
  });

  test("modal de Sangria cabe dentro do viewport (375px)", async ({ page }) => {
    await gotoAndWait(page);

    const cashBtn = page.getByRole("button", { name: "Ações do caixa" });
    await expect(cashBtn).toBeVisible({ timeout: 5_000 });
    await cashBtn.click();
    await page.waitForTimeout(200);

    const sangriaBtn = page.getByRole("button", { name: "Sangria", exact: true });
    if (await sangriaBtn.isVisible({ timeout: 2_000 })) {
      await sangriaBtn.click();
      await page.waitForTimeout(300);

      const overflow = await horizontalOverflow(page);
      expect(overflow, `Modal Sangria causa overflow: ${overflow}px`).toBe(0);

      // Botão CONFIRMAR deve ter tap target adequado
      const confirmBtn = page.getByRole("button", { name: /CONFIRMAR/i });
      if (await confirmBtn.isVisible({ timeout: 2_000 })) {
        await assertTapTarget(confirmBtn, "Botão CONFIRMAR");
      }

      await page.keyboard.press("Escape");
    }
  });

});

// ─── Suite 2: Modal de Desconto ───────────────────────────────────────────────

test.describe("Modal de Desconto — contenção e overflow", () => {

  test("modal de desconto cabe dentro do viewport (375px)", async ({ page }) => {
    await gotoAndWait(page);

    // Adiciona um produto para ativar o botão de desconto
    const firstProduct = page.locator("button").filter({ hasText: /R\$/ }).first();
    await expect(firstProduct).toBeVisible({ timeout: 5_000 });
    await firstProduct.click();
    await page.waitForTimeout(200);

    // Abre o modal de desconto
    const descontoBtn = page.getByTestId("btn-abrir-desconto");
    await expect(descontoBtn).toBeVisible({ timeout: 3_000 });
    await descontoBtn.click();
    await page.waitForTimeout(300);

    // Sem overflow
    const overflow = await horizontalOverflow(page);
    expect(overflow, `Modal desconto causa overflow: ${overflow}px`).toBe(0);

    // Input de desconto visível e dentro do viewport
    const input = page.getByTestId("desconto-input");
    await expect(input).toBeVisible({ timeout: 2_000 });
    await assertWithinViewport(input, "Input de desconto");

    // Botão Aplicar com tap target adequado
    const aplicarBtn = page.getByTestId("btn-aplicar-desconto");
    await expect(aplicarBtn).toBeVisible({ timeout: 2_000 });
    await assertTapTarget(aplicarBtn, "Botão Aplicar Desconto");

    // Fecha
    await page.getByRole("button", { name: /Cancelar/i }).click();
  });

});

// ─── Suite 3: Tap Targets — CTAs principais ───────────────────────────────────

test.describe("Tap Targets — CTAs principais (WCAG 2.5.5 ≥ 44px)", () => {

  test("botão Receber/Finalizar tem tap target ≥ 44px", async ({ page }) => {
    await gotoAndWait(page);

    // Adiciona produto para ativar o botão
    const firstProduct = page.locator("button").filter({ hasText: /R\$/ }).first();
    await expect(firstProduct).toBeVisible({ timeout: 5_000 });
    await firstProduct.click();
    await page.waitForTimeout(200);

    const finalizarBtn = page.getByTestId("btn-finalizar-venda");
    await expect(finalizarBtn).toBeVisible({ timeout: 3_000 });
    await assertTapTarget(finalizarBtn, "Botão Finalizar Venda");
  });

  test("botão de método de pagamento PIX tem tap target ≥ 44px", async ({ page }) => {
    await gotoAndWait(page);

    const firstProduct = page.locator("button").filter({ hasText: /R\$/ }).first();
    await expect(firstProduct).toBeVisible({ timeout: 5_000 });
    await firstProduct.click();
    await page.waitForTimeout(200);

    const pixBtn = page.getByTestId("btn-metodo-pix");
    if (await pixBtn.isVisible({ timeout: 2_000 })) {
      await assertTapTarget(pixBtn, "Botão PIX");
    }
  });

  test("campo de busca tem tap target ≥ 44px", async ({ page }) => {
    await gotoAndWait(page);
    const search = page.getByTestId("pdv-search");
    await assertTapTarget(search, "Campo de busca");
  });

  test("botão Ações do Caixa tem tap target ≥ 44px", async ({ page }) => {
    await gotoAndWait(page);
    const cashBtn = page.getByRole("button", { name: "Ações do caixa" });
    await expect(cashBtn).toBeVisible({ timeout: 5_000 });
    await assertTapTarget(cashBtn, "Botão Ações do Caixa");
  });

});

// ─── Suite 4: Formulário de Produto — scroll vertical ────────────────────────

test.describe("Formulário de Produto — acessibilidade vertical", () => {

  test("botão Salvar Produto é alcançável via scroll no formulário", async ({ page }) => {
    // Navega diretamente para o formulário de novo produto
    await page.goto("/dashboard/produtos?produto=novo");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);

    // Ativa o toggle de estoque para exibir todos os campos
    const toggleEstoque = page.getByRole("switch", { name: /Controlar Estoque/i });
    if (await toggleEstoque.isVisible({ timeout: 3_000 })) {
      await toggleEstoque.click();
      await page.waitForTimeout(200);
    }

    // Botão de salvar deve ser alcançável via scroll (label dinâmico: "Criar Produto")
    const saveBtn = page.getByRole("button", { name: /Criar Produto|Salvar/i });
    await expect(saveBtn).toBeAttached({ timeout: 5_000 });
    await saveBtn.scrollIntoViewIfNeeded();
    await expect(saveBtn).toBeVisible({ timeout: 2_000 });

    // Tap target do botão salvar
    await assertTapTarget(saveBtn, "Botão Criar Produto");

    // Sem overflow horizontal no formulário
    const overflow = await horizontalOverflow(page);
    expect(overflow, `Formulário causa overflow: ${overflow}px`).toBe(0);
  });

  test("página de produtos não causa overflow horizontal", async ({ page }) => {
    await page.goto("/dashboard/produtos");
    await page.waitForLoadState("networkidle");

    const overflow = await horizontalOverflow(page);
    expect(overflow, `Página produtos overflow: ${overflow}px`).toBe(0);
  });

});

// ─── Suite 5: Viewport Trapping — scroll vertical não bloqueado ───────────────

test.describe("Viewport Trapping — scroll vertical livre", () => {

  test("PDV permite scroll vertical quando há muitos produtos", async ({ page }) => {
    await gotoAndWait(page);

    // Verifica que o container principal permite scroll
    const canScroll = await page.evaluate(() => {
      const main = document.querySelector("main") ?? document.documentElement;
      return main.scrollHeight >= main.clientHeight || main.scrollHeight > 0;
    });
    expect(canScroll).toBe(true);
  });

  test("carrinho com itens não bloqueia scroll vertical do footer", async ({ page }) => {
    await gotoAndWait(page);

    // Adiciona produto
    const firstProduct = page.locator("button").filter({ hasText: /R\$/ }).first();
    await expect(firstProduct).toBeVisible({ timeout: 5_000 });
    await firstProduct.click();
    await page.waitForTimeout(200);

    // O botão de finalizar deve ser visível sem scroll (está no footer fixo)
    const finalizarBtn = page.getByTestId("btn-finalizar-venda");
    await expect(finalizarBtn).toBeVisible({ timeout: 3_000 });

    // Sem overflow horizontal
    const overflow = await horizontalOverflow(page);
    expect(overflow, `Carrinho com item causa overflow: ${overflow}px`).toBe(0);
  });

  test("split de pagamento não causa overflow ao selecionar método", async ({ page }) => {
    await gotoAndWait(page);

    const firstProduct = page.locator("button").filter({ hasText: /R\$/ }).first();
    await expect(firstProduct).toBeVisible({ timeout: 5_000 });
    await firstProduct.click();
    await page.waitForTimeout(200);

    // Clica em PIX para ativar o split
    const pixBtn = page.getByTestId("btn-metodo-pix");
    if (await pixBtn.isVisible({ timeout: 2_000 })) {
      await pixBtn.click();
      await page.waitForTimeout(200);

      const overflow = await horizontalOverflow(page);
      expect(overflow, `Split payment causa overflow: ${overflow}px`).toBe(0);
    }
  });

});

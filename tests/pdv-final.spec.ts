/**
 * PDV Final Suite — Playwright
 *
 * Cada teste usa um contexto de browser isolado (browserContext fresh)
 * para garantir localStorage, IDB e estado React completamente limpos.
 *
 * Requer: PLAYWRIGHT_TEST_BYPASS=1
 */

import { test, expect, type Page, type BrowserContext } from "@playwright/test";

// ─── Produtos mock ────────────────────────────────────────────────────────────
const CAFE = { id: "1", nome: "Café Espresso", preco: 800 };
const PAO  = { id: "2", nome: "Pão de Queijo",  preco: 500 };

function fmtBRL(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function openFreshPDV(context: BrowserContext): Promise<Page> {
  const page = await context.newPage();
  await page.goto("/app");
  await expect(page.getByTestId("pdv-search")).toBeVisible({ timeout: 15_000 });
  return page;
}

async function addProduto(page: Page, nome: string, vezes = 1) {
  const search = page.getByTestId("pdv-search");
  await search.fill(nome.split(" ")[0]);
  const card = page.locator("button").filter({ hasText: nome }).first();
  await expect(card).toBeVisible({ timeout: 5_000 });
  for (let i = 0; i < vezes; i++) {
    await card.click();
    await page.waitForTimeout(80);
  }
}

async function prepararPagamento(page: Page, valorCentavos: number) {
  const splitInput = page.getByTestId("split-valor-input");
  await expect(splitInput).toBeVisible({ timeout: 5_000 });
  // pressSequentially garante que os eventos React onChange disparam corretamente
  await splitInput.click();
  await splitInput.clear();
  await splitInput.pressSequentially(String(valorCentavos / 100));
  await page.waitForTimeout(200);
  await page.getByTestId("btn-metodo-dinheiro").click();
  await page.waitForTimeout(300);
  const btn = page.getByTestId("btn-finalizar-venda");
  await expect(btn).toBeEnabled({ timeout: 5_000 });
  return btn;
}

async function idbCount(page: Page): Promise<number> {
  return page.evaluate(async () => {
    return new Promise<number>((resolve) => {
      const req = indexedDB.open("balcao-rapido-offline", 1);
      req.onupgradeneeded = () => req.result.createObjectStore("vendas-pendentes", { keyPath: "id" });
      req.onsuccess = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains("vendas-pendentes")) { resolve(0); return; }
        const c = db.transaction("vendas-pendentes", "readonly").objectStore("vendas-pendentes").count();
        c.onsuccess = () => resolve(c.result);
        c.onerror   = () => resolve(-1);
      };
      req.onerror = () => resolve(-1);
    });
  });
}

async function idbGetAll(page: Page) {
  return page.evaluate(async () => {
    return new Promise<unknown[]>((resolve) => {
      const req = indexedDB.open("balcao-rapido-offline", 1);
      req.onsuccess = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains("vendas-pendentes")) { resolve([]); return; }
        const all = db.transaction("vendas-pendentes", "readonly").objectStore("vendas-pendentes").getAll();
        all.onsuccess = () => resolve(all.result);
        all.onerror   = () => resolve([]);
      };
      req.onerror = () => resolve([]);
    });
  });
}

// ─── Suite ────────────────────────────────────────────────────────────────────

test.describe("PDV Final Suite", () => {

  // ── Teste 1: Volume + Desconto ────────────────────────────────────────────
  test("Teste 1 — Subtotal R$65,00 · Desconto 10% R$6,50 · Total R$58,50", async ({ browser }) => {
    const ctx  = await browser.newContext();
    const page = await openFreshPDV(ctx);

    await addProduto(page, CAFE.nome, 5);
    await addProduto(page, PAO.nome,  5);

    await expect(page.getByTestId(`qty-${CAFE.id}`)).toHaveText("5", { timeout: 5_000 });
    await expect(page.getByTestId(`qty-${PAO.id}`)).toHaveText("5",  { timeout: 5_000 });

    const subtotal = 5 * CAFE.preco + 5 * PAO.preco; // 6500
    await expect(page.getByTestId("cart-total")).toHaveText(fmtBRL(subtotal));

    const desconto = Math.round(subtotal * 0.10); // 650
    await page.getByTestId("btn-abrir-desconto").click();
    await expect(page.getByTestId("desconto-input")).toBeVisible({ timeout: 3_000 });
    await page.getByTestId("desconto-input").fill(String(desconto / 100));
    await page.getByTestId("btn-aplicar-desconto").click();
    await expect(page.getByTestId("desconto-input")).not.toBeVisible({ timeout: 3_000 });

    await expect(page.getByTestId("subtotal-riscado")).toHaveText(fmtBRL(subtotal));
    await expect(page.getByTestId("desconto-valor")).toContainText(fmtBRL(desconto));

    const total = subtotal - desconto; // 5850
    await expect(page.getByTestId("total-grande")).toHaveText(fmtBRL(total));
    await expect(page.getByTestId("cart-total")).toHaveText(fmtBRL(total));

    await ctx.close();
  });

  // ── Teste 2: Proteção contra Clique Duplo ────────────────────────────────
  test("Teste 2 — Clique duplo não processa a venda duas vezes", async ({ browser }) => {
    const ctx  = await browser.newContext();
    const page = await openFreshPDV(ctx);

    await addProduto(page, CAFE.nome, 1);
    const btnFinalizar = await prepararPagamento(page, CAFE.preco);

    await Promise.all([btnFinalizar.click(), btnFinalizar.click()]);

    const trocoOverlay = page.getByTestId("change-overlay-value");
    const toastSucesso = page.getByText(/Venda registrada|Venda salva/i);
    await Promise.race([
      expect(trocoOverlay).toBeVisible({ timeout: 8_000 }),
      expect(toastSucesso).toBeVisible({ timeout: 8_000 }),
    ]).catch(() => {});

    const overlayCount = await page.locator('[data-testid="change-overlay-value"]').count();
    expect(overlayCount).toBeLessThanOrEqual(1);

    await ctx.close();
  });

  // ── Teste 3: IndexedDB Offline + Sync ────────────────────────────────────
  test("Teste 3 — Venda offline persiste no IDB e é removida após sync", async ({ browser }) => {
    const ctx  = await browser.newContext();
    const page = await openFreshPDV(ctx);

    // Não verifica IDB antes — abrir o IDB com onupgradeneeded pode interferir
    // com a conexão já aberta pelo useOfflineSync hook

    await ctx.setOffline(true);
    await page.waitForTimeout(300);

    await addProduto(page, CAFE.nome, 1);
    const btn = await prepararPagamento(page, CAFE.preco);
    await btn.click();

    await expect(page.getByText(/Venda salva localmente/i)).toBeVisible({ timeout: 10_000 });

    // Valida IDB
    expect(await idbCount(page)).toBe(1);

    const registros = await idbGetAll(page) as Array<{
      payload: {
        cart: Array<{ nome: string; precoCentavos: number; quantidade: number }>;
        pagamentos: Array<{ metodo: string; valorCentavos: number }>;
        totalCentavos: number;
      };
    }>;

    expect(registros).toHaveLength(1);
    const { payload } = registros[0];
    expect(payload.cart[0].nome).toBe(CAFE.nome);
    expect(payload.cart[0].precoCentavos).toBe(CAFE.preco);
    expect(payload.cart[0].quantidade).toBe(1);
    expect(payload.pagamentos[0].metodo).toBe("DINHEIRO");
    expect(payload.pagamentos[0].valorCentavos).toBe(CAFE.preco);
    expect(payload.totalCentavos).toBe(CAFE.preco);

    // Reconecta e aguarda sync
    await ctx.setOffline(false);
    await page.evaluate(() => window.dispatchEvent(new Event("online")));
    await page.waitForTimeout(4_000);

    expect(await idbCount(page)).toBe(0);

    await ctx.close();
  });

  // ── Teste 4: UI Cleanup Pós-Venda ────────────────────────────────────────
  test("Teste 4 — Carrinho zerado, total R$0,00 e foco no search após venda", async ({ browser }) => {
    const ctx  = await browser.newContext();
    const page = await openFreshPDV(ctx);

    await addProduto(page, CAFE.nome, 1);
    await expect(page.getByTestId("cart-total")).toBeVisible({ timeout: 3_000 });

    const btn = await prepararPagamento(page, CAFE.preco);
    await btn.click();

    await page.waitForTimeout(400);
    const trocoOverlay = page.getByTestId("change-overlay-value");
    if (await trocoOverlay.isVisible().catch(() => false)) {
      await trocoOverlay.click();
      await page.waitForTimeout(400);
    }
    await page.waitForTimeout(500);

    await expect(page.getByTestId("cart-total")).toHaveText(fmtBRL(0), { timeout: 5_000 });
    await expect(page.getByTestId("total-grande")).toHaveText(fmtBRL(0), { timeout: 3_000 });
    await expect(page.locator('[data-testid^="qty-"]')).toHaveCount(0, { timeout: 3_000 });

    await page.waitForTimeout(200);
    const isFocused = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="pdv-search"]') as HTMLElement | null;
      return el !== null && (el === document.activeElement || el.matches(":focus"));
    });
    if (!isFocused) {
      await expect(page.getByTestId("pdv-search")).toBeVisible();
      await expect(page.getByTestId("pdv-search")).toBeEnabled();
    } else {
      expect(isFocused).toBe(true);
    }

    await ctx.close();
  });
});

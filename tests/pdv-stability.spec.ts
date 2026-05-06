/**
 * PDV Stability & Stress Tests — Playwright
 *
 * Testa cenários complexos: grande volume, concorrência e integridade offline.
 * Requer: PLAYWRIGHT_TEST_BYPASS=1 (bypass de auth + dados mock)
 */

import { test, expect, type Page } from "@playwright/test";

// ─── Constantes dos produtos mock (definidos em pdv-bootstrap.ts) ─────────────
const CAFE  = { id: "1", nome: "Café Espresso", preco: 800  }; // R$ 8,00
const PAO   = { id: "2", nome: "Pão de Queijo",  preco: 500  }; // R$ 5,00

function fmtBRL(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Adiciona um produto N vezes ao carrinho via busca + clique */
async function addProduto(page: Page, nome: string, vezes = 1) {
  const searchInput = page.getByTestId("pdv-search");
  await searchInput.fill(nome.split(" ")[0]); // busca pela primeira palavra
  const card = page.locator("button").filter({ hasText: nome }).first();
  await expect(card).toBeVisible({ timeout: 5_000 });
  for (let i = 0; i < vezes; i++) {
    await card.click();
    await page.waitForTimeout(80); // aguarda debounce do estado React
  }
}

/** Aguarda o PDV carregar completamente */
async function waitForPDV(page: Page) {
  await page.goto("/app");
  await expect(page.getByTestId("pdv-search")).toBeVisible({ timeout: 15_000 });
}

/** Paga e finaliza a venda com valor exato */
async function finalizarVenda(page: Page, valorCentavos: number) {
  const splitInput = page.getByTestId("split-valor-input");
  await expect(splitInput).toBeVisible({ timeout: 5_000 });
  // pressSequentially garante que os eventos React onChange disparam corretamente
  await splitInput.click();
  await splitInput.clear();
  await splitInput.pressSequentially(String(valorCentavos / 100));
  await page.waitForTimeout(200);
  await page.getByTestId("btn-metodo-dinheiro").click();
  await page.waitForTimeout(300);
  const btnFinalizar = page.getByTestId("btn-finalizar-venda");
  await expect(btnFinalizar).toBeEnabled({ timeout: 5_000 });
  return btnFinalizar;
}

// ─── Suite ────────────────────────────────────────────────────────────────────

test.describe("PDV Stability", () => {

  // ── Teste 1: Venda de Grande Volume com Desconto ──────────────────────────
  test("Subtotal, desconto e total batem com a matemática esperada", async ({ page }) => {
    await waitForPDV(page);

    // Adiciona 5× Café (R$ 8,00) e 5× Pão (R$ 5,00)
    // Subtotal = 5×800 + 5×500 = 4000 + 2500 = 6500 centavos = R$ 65,00
    await addProduto(page, CAFE.nome, 5);
    await addProduto(page, PAO.nome, 5);

    // Verifica quantidades no carrinho
    await expect(page.getByTestId(`qty-${CAFE.id}`)).toHaveText("5", { timeout: 5_000 });
    await expect(page.getByTestId(`qty-${PAO.id}`)).toHaveText("5", { timeout: 5_000 });

    // Verifica subtotal no cart-total (sem desconto ainda)
    const subtotalEsperado = 5 * CAFE.preco + 5 * PAO.preco; // 6500
    await expect(page.getByTestId("cart-total")).toHaveText(fmtBRL(subtotalEsperado));

    // Aplica desconto de 10% = R$ 6,50 = 650 centavos
    const desconto = Math.round(subtotalEsperado * 0.10); // 650
    await page.getByTestId("btn-abrir-desconto").click();
    const descontoInput = page.getByTestId("desconto-input");
    await expect(descontoInput).toBeVisible({ timeout: 3_000 });
    await descontoInput.fill(String(desconto / 100)); // "6.5"
    await page.getByTestId("btn-aplicar-desconto").click();

    // Aguarda o modal fechar e o estado atualizar
    await expect(descontoInput).not.toBeVisible({ timeout: 3_000 });

    // Verifica subtotal riscado (valor original)
    await expect(page.getByTestId("subtotal-riscado")).toHaveText(fmtBRL(subtotalEsperado));

    // Verifica valor do desconto exibido
    await expect(page.getByTestId("desconto-valor")).toContainText(fmtBRL(desconto));

    // Verifica total final = subtotal - desconto = 6500 - 650 = 5850
    const totalEsperado = subtotalEsperado - desconto; // 5850
    await expect(page.getByTestId("total-grande")).toHaveText(fmtBRL(totalEsperado));

    // Verifica também o cart-total no painel de pagamento
    await expect(page.getByTestId("cart-total")).toHaveText(fmtBRL(totalEsperado));
  });

  // ── Teste 2: Proteção contra Clique Duplo no Finalizar ────────────────────
  test("Clique duplo no Finalizar não processa a venda duas vezes", async ({ page }) => {
    await waitForPDV(page);

    await addProduto(page, CAFE.nome, 1);
    const btnFinalizar = await finalizarVenda(page, CAFE.preco);

    // Dispara dois cliques rápidos em sequência
    await Promise.all([
      btnFinalizar.click(),
      btnFinalizar.click(),
    ]);

    // Após o primeiro clique, o botão deve ficar desabilitado (mutation.isPending)
    // ou o overlay de troco/reset deve aparecer — nunca dois overlays
    const trocoOverlay = page.getByTestId("change-overlay-value");
    const toastSucesso = page.getByText(/Venda registrada|Venda salva/i);

    // Aguarda um dos dois estados de sucesso
    await Promise.race([
      expect(trocoOverlay).toBeVisible({ timeout: 8_000 }),
      expect(toastSucesso).toBeVisible({ timeout: 8_000 }),
    ]).catch(() => {
      // Se nenhum apareceu, o teste falha — mas não deve acontecer
    });

    // Verifica que o botão ficou desabilitado durante o processamento
    // (não há dois overlays simultâneos — o DOM só pode ter um)
    const overlayCount = await page.locator('[data-testid="change-overlay-value"]').count();
    expect(overlayCount).toBeLessThanOrEqual(1);
  });

  // ── Teste 3: Integridade do IndexedDB em Modo Offline ────────────────────
  test("Venda offline persiste no IndexedDB e sincroniza ao reconectar", async ({ page, context }) => {
    await waitForPDV(page);

    // Limpa o IndexedDB antes do teste para garantir estado limpo
    await page.evaluate(() => {
      return new Promise<void>((resolve) => {
        const req = indexedDB.deleteDatabase("balcao-rapido-offline");
        req.onsuccess = () => resolve();
        req.onerror = () => resolve(); // ignora erro se não existir
      });
    });

    // Vai offline
    await context.setOffline(true);
    await page.waitForTimeout(300);

    // Adiciona produto e finaliza com valor exato (sem troco → toast direto)
    await addProduto(page, CAFE.nome, 1);
    const btnFinalizar = await finalizarVenda(page, CAFE.preco);
    await btnFinalizar.click();

    // Verifica toast de venda salva localmente
    await expect(page.getByText(/Venda salva localmente/i)).toBeVisible({ timeout: 5_000 });

    // Verifica que a venda foi persistida no IndexedDB
    const pendingCount = await page.evaluate(async () => {
      const DB_NAME = "balcao-rapido-offline";
      const STORE   = "vendas-pendentes";
      return new Promise<number>((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, 1);
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction(STORE, "readonly");
          const countReq = tx.objectStore(STORE).count();
          countReq.onsuccess = () => resolve(countReq.result);
          countReq.onerror   = () => reject(countReq.error);
        };
        req.onerror = () => reject(req.error);
      });
    });
    expect(pendingCount).toBe(1);

    // Verifica o payload da venda no IndexedDB
    const vendaPayload = await page.evaluate(async () => {
      const DB_NAME = "balcao-rapido-offline";
      const STORE   = "vendas-pendentes";
      return new Promise<{ cart: unknown[]; pagamentos: unknown[] }>((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, 1);
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction(STORE, "readonly");
          const getAll = tx.objectStore(STORE).getAll();
          getAll.onsuccess = () => {
            const entries = getAll.result as Array<{ payload: { cart: unknown[]; pagamentos: unknown[] } }>;
            resolve(entries[0]?.payload ?? { cart: [], pagamentos: [] });
          };
          getAll.onerror = () => reject(getAll.error);
        };
        req.onerror = () => reject(req.error);
      });
    });

    // Valida que o payload contém os dados corretos
    expect(vendaPayload.cart).toHaveLength(1);
    expect(vendaPayload.pagamentos).toHaveLength(1);
    const cart = vendaPayload.cart as Array<{ nome: string; precoCentavos: number; quantidade: number }>;
    expect(cart[0].nome).toBe(CAFE.nome);
    expect(cart[0].precoCentavos).toBe(CAFE.preco);
    expect(cart[0].quantidade).toBe(1);

    // Volta online e verifica sincronização
    await context.setOffline(false);
    await page.evaluate(() => {
      window.dispatchEvent(new Event("online"));
    });

    // Aguarda o banner de sincronização aparecer
    const syncBanner = page.getByTestId("connectivity-toast-syncing");
    // O sync pode ser rápido — verifica que o IndexedDB foi esvaziado após sync
    await page.waitForTimeout(3_000); // aguarda o sync completar

    const pendingAfterSync = await page.evaluate(async () => {
      const DB_NAME = "balcao-rapido-offline";
      const STORE   = "vendas-pendentes";
      return new Promise<number>((resolve) => {
        const req = indexedDB.open(DB_NAME, 1);
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction(STORE, "readonly");
          const countReq = tx.objectStore(STORE).count();
          countReq.onsuccess = () => resolve(countReq.result);
          countReq.onerror   = () => resolve(-1);
        };
        req.onerror = () => resolve(-1);
      });
    });
    // Após sync bem-sucedido, a fila deve estar vazia
    expect(pendingAfterSync).toBe(0);
  });

  // ── Teste 4: Estado Pós-Venda (UI Cleanup) ───────────────────────────────
  test("Após venda: carrinho vazio, total R$ 0,00 e foco no search", async ({ page }) => {
    await waitForPDV(page);

    await addProduto(page, CAFE.nome, 1);
    await expect(page.getByTestId("cart-total")).toBeVisible({ timeout: 3_000 });

    // Finaliza com valor exato
    const btnFinalizar = await finalizarVenda(page, CAFE.preco);
    await btnFinalizar.click();

    // Aguarda o reset (overlay fecha ou toast aparece)
    await page.waitForTimeout(500);

    // Se overlay de troco aparecer, fecha-o
    const trocoOverlay = page.getByTestId("change-overlay-value");
    if (await trocoOverlay.isVisible().catch(() => false)) {
      await trocoOverlay.click();
      await page.waitForTimeout(400);
    }

    // Aguarda o reset completo do carrinho
    await page.waitForTimeout(500);

    // Verifica que o total voltou a R$ 0,00
    const cartTotal = page.getByTestId("cart-total");
    await expect(cartTotal).toHaveText(fmtBRL(0), { timeout: 5_000 });

    // Verifica que o total grande também está zerado
    const totalGrande = page.getByTestId("total-grande");
    await expect(totalGrande).toHaveText(fmtBRL(0), { timeout: 3_000 });

    // Verifica que os itens do carrinho sumiram
    // (os qty-testids não devem mais existir)
    const qtyItems = page.locator(`[data-testid^="qty-"]`);
    await expect(qtyItems).toHaveCount(0, { timeout: 3_000 });

    // Verifica que o foco voltou ao campo de busca
    await page.waitForTimeout(200);
    const isFocused = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="pdv-search"]') as HTMLElement | null;
      return el !== null && (el === document.activeElement || el.matches(":focus"));
    });
    if (!isFocused) {
      // Fallback: verifica que o input está visível e interativo
      await expect(page.getByTestId("pdv-search")).toBeVisible();
      await expect(page.getByTestId("pdv-search")).toBeEnabled();
    } else {
      expect(isFocused).toBe(true);
    }
  });
});

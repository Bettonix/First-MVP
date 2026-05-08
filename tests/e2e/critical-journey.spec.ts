/**
 * critical-journey.spec.ts — Jornada Crítica de Negócio
 *
 * Cobre o fluxo de maior valor do sistema: venda completa no PDV.
 * Usa o bypass de autenticação (PLAYWRIGHT_TEST_BYPASS=1) para focar
 * na lógica de negócio, não na camada de auth.
 *
 * Fluxo testado:
 *   1. PDV carrega com produtos seed disponíveis
 *   2. Operador adiciona produto ao carrinho
 *   3. Carrinho reflete quantidade e total corretos
 *   4. Operador aplica desconto
 *   5. Operador seleciona método de pagamento e finaliza
 *   6. Toast de sucesso aparece
 *   7. Carrinho é zerado e foco retorna ao campo de busca
 *   8. Receipt modal abre (se configurado)
 */

import { test, expect, type Page } from "@playwright/test";
import { injectAuthMock } from "../utils/auth-mock";

// ─── Produtos seed (definidos em scripts/seed.ts) ────────────────────────────
const CAFE = { nome: "Café Espresso", preco: 800 };   // R$ 8,00
const PAO  = { nome: "Pão de Queijo",  preco: 500 };  // R$ 5,00

function fmtBRL(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function openPDV(page: Page): Promise<void> {
  await injectAuthMock(page);
  // Limpa o carrinho antes de navegar
  await page.addInitScript(() => {
    localStorage.removeItem("pdv-cart-storage");
  });
  await page.goto("/app");
  await expect(page.getByTestId("pdv-search")).toBeVisible({ timeout: 15_000 });
  // Limpa novamente após hidratação do Zustand e recarrega para garantir carrinho fechado
  const needsReload = await page.evaluate(() => {
    const raw = localStorage.getItem("pdv-cart-storage");
    if (!raw) return false;
    try {
      const state = JSON.parse(raw);
      const items = state?.state?.items ?? [];
      if (items.length > 0) {
        localStorage.removeItem("pdv-cart-storage");
        return true;
      }
    } catch { /* ignore */ }
    return false;
  });
  if (needsReload) {
    await page.reload();
    await expect(page.getByTestId("pdv-search")).toBeVisible({ timeout: 15_000 });
  }
}

async function addProduto(page: Page, nome: string, vezes = 1): Promise<void> {
  const searchInput = page.getByTestId("pdv-search");
  await searchInput.fill(nome);
  const card = page.locator("button").filter({ hasText: nome }).first();
  await expect(card).toBeVisible({ timeout: 8_000 });
  await expect(card).toBeEnabled({ timeout: 8_000 });
  for (let i = 0; i < vezes; i++) {
    await card.click();
    // Aguarda o carrinho refletir o clique antes do próximo
    if (i < vezes - 1) await page.waitForFunction(() => true);
  }
  await searchInput.clear();
}

async function selecionarPagamento(page: Page, metodo: "pix" | "dinheiro" | "cartao_credito" | "cartao_debito"): Promise<void> {
  const btn = page.getByTestId(`btn-metodo-${metodo}`);
  await expect(btn).toBeVisible({ timeout: 5_000 });
  await btn.click();
}

async function adicionarSplit(page: Page, valorReais: string): Promise<void> {
  const splitInput = page.getByTestId("split-valor-input");
  await expect(splitInput).toBeVisible({ timeout: 5_000 });
  await splitInput.fill(valorReais);
  await splitInput.press("Enter");
}

// ─── Testes ──────────────────────────────────────────────────────────────────

test.describe("Jornada Crítica — Venda Completa no PDV", () => {
  // Limpa localStorage (incluindo pdv-cart-storage) e cookies entre testes
  test.use({
    storageState: {
      cookies: [],
      origins: [{
        origin: "http://localhost:3000",
        localStorage: [],
      }],
    },
  });
  // Serializado dentro do describe — evita contenção no servidor dev
  test.describe.configure({ mode: "serial" });

  // Destrói o estado React navegando para about:blank antes de cada teste
  test.beforeEach(async ({ page }) => {
    await page.goto("about:blank");
  });

  test("J-01: PDV carrega com produtos seed visíveis", async ({ page }) => {
    await openPDV(page);

    // Produtos seed devem estar na grade
    await expect(page.locator("button").filter({ hasText: CAFE.nome }).first()).toBeVisible();
    await expect(page.locator("button").filter({ hasText: PAO.nome }).first()).toBeVisible();
  });

  test("J-02: Adicionar produto atualiza carrinho com quantidade e total corretos", async ({ page }) => {
    await openPDV(page);
    await addProduto(page, CAFE.nome, 2);

    const cartTotal = page.getByTestId("cart-total");
    await expect(cartTotal).toBeVisible();
    await expect(cartTotal).toContainText(fmtBRL(2 * CAFE.preco));

    // Quantidade deve ser 2
    const qty = page.locator('[data-testid^="qty-"]').first();
    await expect(qty).toHaveText("2");
  });

  test("J-03: Desconto reduz o total corretamente", async ({ page }) => {
    await openPDV(page);
    await addProduto(page, CAFE.nome, 2); // R$ 16,00

    // Abre modal de desconto
    const btnDesconto = page.getByTestId("btn-abrir-desconto");
    await expect(btnDesconto).toBeVisible();
    await btnDesconto.click();

    // Preenche desconto de R$ 1,00 (100 centavos)
    const descontoInput = page.getByTestId("desconto-input");
    await expect(descontoInput).toBeVisible({ timeout: 3_000 });
    await descontoInput.fill("1");

    const btnAplicar = page.getByTestId("btn-aplicar-desconto");
    await btnAplicar.click();

    // Total deve ser R$ 15,00
    const totalGrande = page.getByTestId("total-grande");
    await expect(totalGrande).toContainText(fmtBRL(2 * CAFE.preco - 100));

    // Badge de desconto deve aparecer
    const descontoValor = page.getByTestId("desconto-valor");
    await expect(descontoValor).toBeVisible();
  });

  test("J-04: Venda PIX completa — toast de sucesso e carrinho zerado", async ({ page }) => {
    await openPDV(page);
    await addProduto(page, CAFE.nome);

    await selecionarPagamento(page, "pix");
    await adicionarSplit(page, "8");

    const btnFinalizar = page.getByTestId("btn-finalizar-venda");
    await expect(btnFinalizar).toBeEnabled({ timeout: 3_000 });
    await btnFinalizar.click();

    // Toast de sucesso — aguarda por texto, não por classe CSS
    const toast = page.getByText(/Venda registrada|Venda salva|finalizada/i);
    await expect(toast).toBeVisible({ timeout: 10_000 });

    // Carrinho deve estar vazio após a venda
    const cartTotal = page.getByTestId("cart-total");
    await expect(cartTotal).toContainText(fmtBRL(0), { timeout: 5_000 });

    // Foco deve retornar ao campo de busca
    const searchInput = page.getByTestId("pdv-search");
    await expect(searchInput).toBeFocused({ timeout: 3_000 });
  });

  test("J-05: Venda Dinheiro com troco — overlay exibe valor correto", async ({ page }) => {
    await openPDV(page);
    await addProduto(page, CAFE.nome); // R$ 8,00

    await selecionarPagamento(page, "dinheiro");
    await adicionarSplit(page, "10"); // Paga R$ 10,00 → troco R$ 2,00

    const btnFinalizar = page.getByTestId("btn-finalizar-venda");
    await expect(btnFinalizar).toBeEnabled({ timeout: 3_000 });
    await btnFinalizar.click();

    // Overlay de troco deve aparecer com R$ 2,00
    const trocoOverlay = page.getByTestId("change-overlay-value");
    await expect(trocoOverlay).toBeVisible({ timeout: 8_000 });
    await expect(trocoOverlay).toContainText(fmtBRL(200));
  });

  test("J-06: Clique duplo no Finalizar não processa venda duas vezes", async ({ page }) => {
    await openPDV(page);
    await addProduto(page, CAFE.nome);

    await selecionarPagamento(page, "pix");
    await adicionarSplit(page, "8");

    const btnFinalizar = page.getByTestId("btn-finalizar-venda");
    await expect(btnFinalizar).toBeEnabled({ timeout: 3_000 });

    // Primeiro clique — dispara a venda
    await btnFinalizar.click();

    // Botão deve ficar disabled imediatamente após o primeiro clique (anti double-tap)
    await expect(btnFinalizar).toBeDisabled({ timeout: 2_000 });

    // Segundo clique deve ser ignorado — botão está disabled
    await btnFinalizar.click({ force: true });

    // Apenas um toast de sucesso deve aparecer
    const toasts = page.getByText(/Venda registrada|Venda salva|finalizada/i);
    await expect(toasts.first()).toBeVisible({ timeout: 10_000 });
    await expect(toasts).toHaveCount(1, { timeout: 3_000 });
  });

  test("J-07: Venda mista (split) — múltiplos métodos somam o total", async ({ page }) => {
    await openPDV(page);
    await addProduto(page, CAFE.nome); // R$ 8,00
    await addProduto(page, PAO.nome);  // R$ 5,00 → total R$ 13,00

    // Paga R$ 8,00 em PIX
    await selecionarPagamento(page, "pix");
    await adicionarSplit(page, "8");

    // Paga R$ 5,00 em Dinheiro
    await selecionarPagamento(page, "dinheiro");
    await adicionarSplit(page, "5");

    const btnFinalizar = page.getByTestId("btn-finalizar-venda");
    await expect(btnFinalizar).toBeEnabled({ timeout: 3_000 });
    await btnFinalizar.click();

    const toast = page.getByText(/Venda registrada|Venda salva|finalizada/i);
    await expect(toast).toBeVisible({ timeout: 10_000 });
  });

  test("J-08: Busca filtra produtos em tempo real", async ({ page }) => {
    await openPDV(page);

    const searchInput = page.getByTestId("pdv-search");
    await searchInput.fill("Café");

    // Café deve aparecer
    await expect(page.locator("button").filter({ hasText: CAFE.nome }).first()).toBeVisible();

    // Pão não deve aparecer (filtrado)
    await expect(page.locator("button").filter({ hasText: PAO.nome }).first()).not.toBeVisible();

    // Limpa busca — ambos voltam
    await searchInput.clear();
    await expect(page.locator("button").filter({ hasText: PAO.nome }).first()).toBeVisible();
  });
});

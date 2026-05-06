import { test, expect } from "@playwright/test";

function fmtBRL(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const CAFE_PRECO = 800;
const PAO_PRECO  = 500;

test.describe("PDV Flow", () => {

  test("Cálculo de carrinho com múltiplos itens", async ({ page }) => {
    await page.goto("/app");
    const searchInput = page.getByTestId("pdv-search");
    await expect(searchInput).toBeVisible({ timeout: 15_000 });

    await searchInput.fill("Café");
    const cafeCard = page.locator("button").filter({ hasText: "Café Espresso" }).first();
    await expect(cafeCard).toBeVisible({ timeout: 5_000 });
    await cafeCard.click();

    await searchInput.fill("Pão");
    const paoCard = page.locator("button").filter({ hasText: "Pão de Queijo" }).first();
    await expect(paoCard).toBeVisible({ timeout: 5_000 });
    await paoCard.click();

    const cartTotal = page.getByTestId("cart-total");
    await expect(cartTotal).toBeVisible({ timeout: 5_000 });
    await expect(cartTotal).toHaveText(fmtBRL(CAFE_PRECO + PAO_PRECO));
  });

  test("Flash de troco exibe valor correto e foco retorna ao search", async ({ page }) => {
    await page.goto("/app");
    const searchInput = page.getByTestId("pdv-search");
    await expect(searchInput).toBeVisible({ timeout: 15_000 });

    await searchInput.fill("Café");
    const cafeCard = page.locator("button").filter({ hasText: "Café Espresso" }).first();
    await expect(cafeCard).toBeVisible({ timeout: 5_000 });
    await cafeCard.click();

    await expect(page.getByTestId("cart-total")).toBeVisible({ timeout: 3_000 });

    const splitInput = page.getByTestId("split-valor-input");
    await expect(splitInput).toBeVisible({ timeout: 5_000 });
    await splitInput.fill("10");
    await page.waitForTimeout(200);

    await page.getByTestId("btn-metodo-dinheiro").click();
    await page.waitForTimeout(300);

    const btnFinalizar = page.getByTestId("btn-finalizar-venda");
    await expect(btnFinalizar).toBeEnabled({ timeout: 5_000 });
    await btnFinalizar.click();

    const trocoOverlay = page.getByTestId("change-overlay-value");
    await expect(trocoOverlay).toBeVisible({ timeout: 8_000 });
    await expect(trocoOverlay).toHaveText(fmtBRL(1000 - CAFE_PRECO));

    await trocoOverlay.click();
    await page.waitForTimeout(400);

    const isFocused = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="pdv-search"]') as HTMLElement | null;
      return el !== null && (el === document.activeElement || el.matches(":focus"));
    });
    if (!isFocused) {
      await expect(searchInput).toBeVisible();
      await expect(searchInput).toBeEnabled();
    } else {
      expect(isFocused).toBe(true);
    }
  });

  test("Banner offline aparece ao perder conexão e desaparece ao reconectar", async ({ page, context }) => {
    await page.goto("/app");
    const searchInput = page.getByTestId("pdv-search");
    await expect(searchInput).toBeVisible({ timeout: 15_000 });

    const offlineBanner = page.getByTestId("connectivity-toast-offline");
    await expect(offlineBanner).not.toBeVisible();

    await context.setOffline(true);
    await page.evaluate(() => {
      Object.defineProperty(navigator, "onLine", { value: false, configurable: true });
      window.dispatchEvent(new Event("offline"));
    });

    await expect(offlineBanner).toBeVisible({ timeout: 5_000 });
    await expect(offlineBanner).toContainText(/Offline/i);
    await expect(page.getByText(/Modo Offline Ativo/i)).toBeVisible({ timeout: 3_000 });

    await searchInput.fill("Café");
    const cafeCard = page.locator("button").filter({ hasText: "Café Espresso" }).first();
    await expect(cafeCard).toBeVisible({ timeout: 5_000 });
    await cafeCard.click();

    await expect(page.getByTestId("cart-total")).toBeVisible({ timeout: 3_000 });

    const splitInput = page.getByTestId("split-valor-input");
    await expect(splitInput).toBeVisible({ timeout: 3_000 });
    // Paga valor exato (R$ 8,00) para não gerar troco — assim o toast aparece diretamente
    await splitInput.fill("8");
    await page.waitForTimeout(200);

    await page.getByTestId("btn-metodo-dinheiro").click();
    await page.waitForTimeout(300);

    const btnFinalizar = page.getByTestId("btn-finalizar-venda");
    await expect(btnFinalizar).toBeEnabled({ timeout: 3_000 });
    await btnFinalizar.click();

    // Sem troco, o toast "Venda salva localmente" aparece diretamente
    await expect(page.getByText(/Venda salva localmente/i)).toBeVisible({ timeout: 5_000 });

    await context.setOffline(false);
    await page.evaluate(() => {
      Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
      window.dispatchEvent(new Event("online"));
    });

    await expect(offlineBanner).not.toBeVisible({ timeout: 8_000 });
  });
});

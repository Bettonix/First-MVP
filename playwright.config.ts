import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    ignoreHTTPSErrors: true,
  },
  projects: [
    // ── Desktop — roda todos os testes ───────────────────────────────────────
    {
      name: "desktop-chrome",
      use: { ...devices["Desktop Chrome"] },
      testMatch: "**/*.spec.ts",
    },
    // ── Mobile — responsividade + testes mobile específicos ──────────────────
    {
      name: "iphone-14",
      use: { ...devices["iPhone 14"] },
      testMatch: ["**/responsive-ui.spec.ts", "**/mobile.spec.ts"],
    },
    {
      name: "pixel-5",
      use: { ...devices["Pixel 5"] },
      testMatch: ["**/responsive-ui.spec.ts", "**/mobile.spec.ts"],
    },
    // ── iPhone SE (320px) — testa o menor viewport suportado ─────────────────
    {
      name: "iphone-se",
      use: { ...devices["iPhone SE"] },
      testMatch: ["**/mobile.spec.ts", "**/mobile-ux.spec.ts"],
    },
    // ── Mobile UX — testes de interação profunda (375px fixo via test.use) ────
    {
      name: "mobile-ux",
      use: { ...devices["iPhone SE"], hasTouch: true },
      testMatch: "**/mobile-ux.spec.ts",
    },
  ],
  // Não inicia o servidor automaticamente — assume `next dev` rodando
  webServer: {
    command: "PLAYWRIGHT_TEST_BYPASS=1 npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
    env: {
      PLAYWRIGHT_TEST_BYPASS: "1",
    },
  },
});

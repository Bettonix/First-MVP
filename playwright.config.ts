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
    // ── Mobile — apenas testes de responsividade ─────────────────────────────
    {
      name: "iphone-14",
      use: { ...devices["iPhone 14"] },
      testMatch: "**/responsive-ui.spec.ts",
    },
    {
      name: "pixel-5",
      use: { ...devices["Pixel 5"] },
      testMatch: "**/responsive-ui.spec.ts",
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

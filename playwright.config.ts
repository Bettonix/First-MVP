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
    // ── Desktop ──────────────────────────────────────────────────────────────
    {
      name: "desktop-chrome",
      use: { ...devices["Desktop Chrome"] },
    },
    // ── Mobile ───────────────────────────────────────────────────────────────
    {
      name: "iphone-14",
      use: { ...devices["iPhone 14"] },
    },
    {
      name: "pixel-5",
      use: { ...devices["Pixel 5"] },
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

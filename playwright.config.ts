import { defineConfig, devices } from "@playwright/test";

// Em Docker (CI=true + BASE_URL definido), o next-app já está rodando como
// service separado — não precisamos do webServer. Localmente, iniciamos o dev.
const isDocker = !!process.env.CI && !!process.env.BASE_URL;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Docker/CI: 50% dos cores. Local: 1 worker (banco seed compartilhado).
  workers: process.env.CI ? "50%" : 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: process.env.BASE_URL || "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    ignoreHTTPSErrors: true,
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    // ── Desktop — roda todos os testes ───────────────────────────────────────
    {
      name: "desktop-chrome",
      use: { ...devices["Desktop Chrome"] },
      testMatch: "**/*.spec.ts",
    },
    // ── Mobile Chrome — jornadas críticas em Android ─────────────────────────
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 5"] },
      testMatch: ["**/e2e/**/*.spec.ts", "**/responsive-ui.spec.ts", "**/mobile.spec.ts"],
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
  // Local: inicia o dev server automaticamente.
  // Docker: next-app já está rodando como service — webServer é omitido.
  ...(!isDocker && {
    webServer: {
      command: "PLAYWRIGHT_TEST_BYPASS=1 npm run dev",
      url: "http://localhost:3000",
      reuseExistingServer: true,
      timeout: 120_000,
      env: { PLAYWRIGHT_TEST_BYPASS: "1" },
    },
  }),
});

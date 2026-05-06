/**
 * auth-mock.ts
 *
 * Injeta um token JWT simulado no localStorage para contornar a camada de
 * autenticação do Supabase em testes E2E com Playwright.
 *
 * Uso:
 *   import { injectAuthMock } from "./utils/auth-mock";
 *   test.beforeEach(async ({ page }) => { await injectAuthMock(page); });
 *
 * Funcionamento:
 *   - O middleware do Supabase SSR lê cookies, não localStorage.
 *   - O bypass real é feito via PLAYWRIGHT_TEST_BYPASS=1 no servidor Next.js
 *     (ver src/lib/supabase/middleware.ts e src/lib/auth.ts).
 *   - Este script injeta o estado de sessão no localStorage do cliente para
 *     que o SDK Supabase client-side não redirecione para /login.
 *   - Deve ser chamado ANTES de page.goto().
 */

import type { Page } from "@playwright/test";

/** Payload JWT mínimo compatível com o Supabase Auth */
const MOCK_JWT_PAYLOAD = {
  sub: "test-user-id",
  email: "test@playwright.local",
  role: "authenticated",
  aud: "authenticated",
  exp: Math.floor(Date.now() / 1000) + 3600, // expira em 1h
  iat: Math.floor(Date.now() / 1000),
};

/** Gera um JWT fake (não assinado — apenas para o cliente ignorar o redirect) */
function makeFakeJWT(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body   = btoa(JSON.stringify(payload));
  return `${header}.${body}.fake-signature`;
}

/**
 * Injeta sessão mock no localStorage antes do carregamento da página.
 * Chame antes de `page.goto()`.
 */
export async function injectAuthMock(page: Page): Promise<void> {
  const jwt = makeFakeJWT(MOCK_JWT_PAYLOAD);

  await page.addInitScript(({ token, payload }) => {
    // Chave usada pelo Supabase SSR client-side
    const SESSION_KEY = "sb-auth-token";
    const session = {
      access_token: token,
      refresh_token: "mock-refresh-token",
      expires_in: 3600,
      expires_at: payload.exp,
      token_type: "bearer",
      user: {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
        aud: payload.aud,
      },
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));

    // Também injeta no formato usado pelo @supabase/ssr
    const projectRef = "mock-project";
    localStorage.setItem(
      `sb-${projectRef}-auth-token`,
      JSON.stringify(session)
    );
  }, { token: jwt, payload: MOCK_JWT_PAYLOAD });
}

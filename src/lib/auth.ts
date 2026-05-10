import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export type UserRole = "GERENTE" | "OPERADOR";

export interface SessionContext {
  authId: string;
  tenantId: string;
  role: UserRole;
}

// ── Playwright test bypass ────────────────────────────────────────────────────
// Retorna um contexto de sessão mock quando PLAYWRIGHT_TEST_BYPASS=1.
// Requer PLAYWRIGHT_TEST_TENANT_ID para identificar o tenant de teste.
// NUNCA habilitar em produção.
const TEST_BYPASS =
  process.env.PLAYWRIGHT_TEST_BYPASS === "1" &&
  process.env.NODE_ENV !== "production";

const TEST_TENANT_ID = process.env.PLAYWRIGHT_TEST_TENANT_ID ?? "test-tenant-id";

/**
 * Resolve tenantId e role do usuário logado.
 * - GERENTE: tem Vendedor com authId === user.id
 * - OPERADOR: tem Profile com vendedorId preenchido
 */
export async function getSessionContext(): Promise<SessionContext> {
  if (TEST_BYPASS) {
    return { authId: "test-user-id", tenantId: TEST_TENANT_ID, role: "GERENTE" };
  }

  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) redirect("/login");

  // Caso 1: é o gerente (dono do negócio)
  const vendedor = await prisma.vendedor.findUnique({
    where: { authId: user.id },
    select: { id: true, onboardingStep: true },
  });

  if (vendedor) {
    if (vendedor.onboardingStep < 6) redirect("/onboarding");
    return { authId: user.id, tenantId: vendedor.id, role: "GERENTE" };
  }

  // Caso 2: é um operador vinculado a um tenant
  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { vendedorId: true, role: true },
  });

  if (profile?.vendedorId) {
    return {
      authId: user.id,
      tenantId: profile.vendedorId,
      role: (profile.role as UserRole) ?? "OPERADOR",
    };
  }

  // Usuário autenticado mas sem Vendedor/Profile — precisa completar onboarding
  redirect("/onboarding");
}

/** Atalho para actions que só precisam do tenantId (mantém compatibilidade). */
export async function getTenantIdOrRedirect(): Promise<string> {
  const ctx = await getSessionContext();
  return ctx.tenantId;
}

/**
 * Garante que o usuário é GERENTE.
 * Lança erro se for OPERADOR — use no topo de Server Actions destrutivas.
 */
export async function requireGerente(): Promise<SessionContext> {
  const ctx = await getSessionContext();
  if (ctx.role !== "GERENTE") {
    throw new Error("Acesso negado. Apenas gerentes podem realizar esta ação.");
  }
  return ctx;
}

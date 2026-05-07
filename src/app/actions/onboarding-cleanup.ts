"use server";

import { prisma } from "@/lib/prisma";
import { getTenantIdOrRedirect } from "@/lib/auth";
import { revalidatePath } from "next/cache";

const SEED_PRODUCT_NAME = "Produto Exemplo";

/**
 * Remove o produto seed criado pelo wizard de onboarding e a venda de teste
 * mais recente do tenant (nas últimas 24h).
 */
export async function wipeSeedData(): Promise<{ success: boolean; error?: string }> {
  try {
    const tenantId = await getTenantIdOrRedirect();

    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Remove produto seed pelo nome exato (Produto não tem criadoEm no schema)
    await prisma.produto.deleteMany({
      where: { tenantId, nome: SEED_PRODUCT_NAME },
    });

    // Remove a venda de teste mais recente (última venda nas últimas 24h)
    const ultimaVenda = await prisma.venda.findFirst({
      where: { tenantId, criadoEm: { gte: cutoff } },
      orderBy: { criadoEm: "desc" },
      select: { id: true },
    });

    if (ultimaVenda) {
      await prisma.venda.delete({ where: { id: ultimaVenda.id } });
    }

    revalidatePath("/app");
    revalidatePath("/dashboard");
    revalidatePath("/settings");

    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erro ao limpar dados.";
    return { success: false, error: msg };
  }
}

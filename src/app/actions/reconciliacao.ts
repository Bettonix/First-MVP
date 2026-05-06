"use server";

import { prisma } from "@/lib/prisma";
import { getTenantIdOrRedirect } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export interface ProdutoInconsistente {
  id: string;
  nome: string;
  categoria: string;
  estoqueAtual: number;
  lastInconsistency: string; // ISO string
}

/**
 * Retorna produtos com needsReconciliation = true para o tenant.
 * Usado pelo card de alerta no dashboard de produtos.
 */
export async function getProdutosInconsistentes(): Promise<ProdutoInconsistente[]> {
  const tenantId = await getTenantIdOrRedirect();

  const produtos = await prisma.produto.findMany({
    where: { tenantId, needsReconciliation: true, ativo: true },
    select: {
      id: true,
      nome: true,
      categoria: true,
      estoqueAtual: true,
      lastInconsistency: true,
    },
    orderBy: { lastInconsistency: "desc" },
  });

  return produtos.map((p) => ({
    id: p.id.toString(),
    nome: p.nome,
    categoria: p.categoria,
    estoqueAtual: p.estoqueAtual,
    lastInconsistency: p.lastInconsistency?.toISOString() ?? new Date().toISOString(),
  }));
}

/**
 * Marca um produto como reconciliado (needsReconciliation = false).
 * Opcionalmente ajusta o estoque para o valor informado pelo gerente.
 */
export async function reconciliarProduto(
  produtoId: string,
  novoEstoque?: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const tenantId = await getTenantIdOrRedirect();

    const produto = await prisma.produto.findFirst({
      where: { id: BigInt(produtoId), tenantId },
      select: { id: true, estoqueAtual: true, nome: true },
    });

    if (!produto) return { success: false, error: "Produto não encontrado." };

    await prisma.$transaction(async (tx) => {
      const estoqueAnterior = produto.estoqueAtual;
      const estoqueNovo = novoEstoque ?? Math.max(0, produto.estoqueAtual);

      // Atualiza produto
      await tx.produto.update({
        where: { id: produto.id },
        data: {
          needsReconciliation: false,
          lastInconsistency: null,
          estoqueAtual: estoqueNovo,
        },
      });

      // Registra ajuste de auditoria
      if (novoEstoque !== undefined) {
        await tx.movimentacaoEstoque.create({
          data: {
            tenantId,
            produtoId: produto.id,
            tipo: "AJUSTE",
            quantidade: estoqueNovo - estoqueAnterior,
            quantidadeAnterior: estoqueAnterior,
            motivo: `Reconciliação manual pelo gerente. Estoque ajustado de ${estoqueAnterior} para ${estoqueNovo}.`,
          },
        });
      }
    });

    revalidatePath("/app");
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro ao reconciliar produto.";
    return { success: false, error: msg };
  }
}

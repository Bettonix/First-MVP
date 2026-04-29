"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { produtoSchema, ProdutoFormData } from "@/schemas/produto.schema";
import { getTenantIdOrRedirect } from "@/lib/auth";

export async function createProduto(data: ProdutoFormData) {
  // Validação centralizada do schema Zod
  const result = produtoSchema.safeParse(data);
  
  if (!result.success) {
    return { success: false, errors: result.error.flatten().fieldErrors };
  }

  const tenantId = await getTenantIdOrRedirect();
  const precoCentavos = Math.round(result.data.preco * 100); // Conversão para inteiros

  try {
    const novoProduto = await prisma.produto.create({
      data: {
        tenantId,
        nome: result.data.nome,
        precoCentavos,
        estoqueAtual: result.data.estoqueAtual,
        estoqueInicial: result.data.estoqueAtual, // Assume initial is current at creation
        isFavorito: result.data.isFavorito,
      },
    });

    // Revalidação em lote para manter a UI sync
    revalidatePath("/dashboard/produtos");
    revalidatePath("/"); // Atualiza o PDV

    // Serializando o BigInt para retornar ao Client
    return { 
      success: true, 
      produto: {
        ...novoProduto,
        id: novoProduto.id.toString(),
      } 
    };
  } catch (error) {
    console.error("Erro ao criar produto:", error);
    return { success: false, error: "Erro interno ao salvar produto." };
  }
}

export async function getProdutosPDV() {
  const tenantId = await getTenantIdOrRedirect();
  const produtos = await prisma.produto.findMany({
    where: { tenantId, isFavorito: true },
    orderBy: { nome: 'asc' }
  });

  return produtos.map(p => ({
    ...p,
    id: p.id.toString(), // Client components precisam de strings em vez de BigInt
  }));
}

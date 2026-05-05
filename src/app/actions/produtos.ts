"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { produtoSchema, ProdutoFormData } from "@/schemas/produto.schema";
import { getTenantIdOrRedirect } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// ─── CREATE ──────────────────────────────────────────────────────

export async function createProduto(data: ProdutoFormData) {
  const result = produtoSchema.safeParse(data);
  
  if (!result.success) {
    return { success: false as const, errors: result.error.flatten().fieldErrors };
  }

  const tenantId = await getTenantIdOrRedirect();
  const precoCentavos = Math.round(result.data.preco * 100);
  const precoCustoCentavos = Math.round((result.data.precoCusto || 0) * 100);

  try {
    console.log("🛠️ Tentando criar produto para Tenant:", tenantId);
    console.log("📦 Payload Prisma:", {
      tenantId,
      nome: result.data.nome,
      precoCentavos,
      precoCustoCentavos,
      estoqueAtual: result.data.estoqueAtual,
    });

    const novoProduto = await prisma.produto.create({
      data: {
        tenantId,
        nome: result.data.nome,
        precoCentavos,
        precoCustoCentavos,
        categoria: result.data.categoria || "Outros",
        estoqueAtual: result.data.estoqueAtual,
        estoqueInicial: result.data.estoqueAtual,
        isFavorito: result.data.isFavorito,
      },
    });

    revalidatePath("/dashboard/produtos");
    revalidatePath("/");
    revalidateTag('products', 'max');

    return { 
      success: true as const, 
      produto: {
        ...novoProduto,
        id: novoProduto.id.toString(),
      } 
    };
  } catch (error: any) {
    console.error("❌ Erro fatal ao criar produto:", {
      message: error.message,
      code: error.code,
      meta: error.meta,
      stack: error.stack
    });
    
    return { 
      success: false as const, 
      error: `Erro no servidor: ${error.message || "Tente novamente."}` 
    };
  }
}

// ─── READ (PDV) ──────────────────────────────────────────────────

export async function getProdutosPDV() {
  const tenantId = await getTenantIdOrRedirect();
  const produtos = await prisma.produto.findMany({
    where: { tenantId, ativo: true },
    orderBy: { nome: 'asc' }
  });

  return produtos.map((p) => ({
    id: p.id.toString(),
    nome: p.nome,
    precoCentavos: p.precoCentavos,
    precoCustoCentavos: p.precoCustoCentavos,
    categoria: p.categoria,
    estoqueAtual: p.estoqueAtual,
    estoqueInicial: p.estoqueInicial,
    isFavorito: p.isFavorito,
    ativo: p.ativo,
  }));
}

// ─── READ (Catálogo Admin — todos, incluindo inativos) ────────────

export async function getProdutosCatalogo() {
  const tenantId = await getTenantIdOrRedirect();
  const produtos = await prisma.produto.findMany({
    where: { tenantId },
    orderBy: [{ ativo: 'desc' }, { nome: 'asc' }],
  });

  return produtos.map((p) => ({
    id: p.id.toString(),
    nome: p.nome,
    precoCentavos: p.precoCentavos,
    precoCustoCentavos: p.precoCustoCentavos,
    categoria: p.categoria,
    estoqueAtual: p.estoqueAtual,
    estoqueInicial: p.estoqueInicial,
    isFavorito: p.isFavorito,
    ativo: p.ativo,
  }));
}

// ─── TOGGLE ATIVO (Soft enable/disable) ──────────────────────────

export async function toggleProdutoAtivo(produtoId: string, ativo: boolean) {
  const tenantId = await getTenantIdOrRedirect();

  try {
    const id = BigInt(produtoId);

    const produto = await prisma.produto.findFirst({ where: { id, tenantId } });
    if (!produto) return { success: false as const, error: "Produto não encontrado." };

    await prisma.produto.update({ where: { id }, data: { ativo } });

    revalidatePath("/dashboard/produtos");
    revalidatePath("/");
    revalidateTag('products', 'max');

    return { success: true as const };
  } catch (error: any) {
    return { success: false as const, error: error.message || "Erro ao atualizar." };
  }
}

// ─── UPDATE ──────────────────────────────────────────────────────

export async function updateProduto(produtoId: string, data: ProdutoFormData) {
  const result = produtoSchema.safeParse(data);
  if (!result.success) {
    return { success: false as const, errors: result.error.flatten().fieldErrors };
  }

  const tenantId = await getTenantIdOrRedirect();
  const supabase = await createClient();

  // 4. Garantia de Inteiro: Reforce que precoCentavos e estoques sejam Math.round()
  const precoCentavos = Math.round(result.data.preco * 100);
  const precoCustoCentavos = Math.round((result.data.precoCusto || 0) * 100);
  const estoqueAtual = Math.round(result.data.estoqueAtual);

  const payload = {
    nome: String(result.data.nome),
    precoCentavos,
    precoCustoCentavos,
    categoria: String(result.data.categoria || "Outros"),
    estoqueAtual,
    isFavorito: Boolean(result.data.isFavorito),
  };

  try {
    const { error, count } = await supabase
      .from('Produto')
      .update(payload, { count: 'exact' })
      .eq('id', produtoId)
      .eq('tenant_id', tenantId);

    if (error) {
      console.error("Erro Supabase no Update:", error.message);
      return { success: false as const, error: `Erro no Banco: ${error.message}` };
    }

    if (count === 0) {
      return { 
        success: false as const, 
        error: "Produto não encontrado ou sem permissão para editar." 
      };
    }

    revalidatePath("/dashboard/produtos");
    revalidatePath("/");
    revalidateTag('products', 'max');

    return { 
      success: true as const, 
      produto: { ...payload, id: produtoId } 
    };
  } catch (error: any) {
    console.error("❌ Falha na atualização crítica:", {
      id: produtoId,
      message: error.message
    });
    
    return { success: false as const, error: `Erro interno: ${error.message || "Tente novamente."}` };
  }
}

// ─── DELETE (Soft Delete — preserva histórico de vendas) ─────────

export async function deleteProduto(produtoId: string) {
  const tenantId = await getTenantIdOrRedirect();

  try {
    let id: bigint;
    try {
      id = BigInt(produtoId);
    } catch (e) {
      return { success: false as const, error: "ID de produto inválido." };
    }

    const produto = await prisma.produto.findFirst({ where: { id, tenantId } });
    if (!produto) {
      return { success: false as const, error: "Produto não encontrado ou sem permissão." };
    }

    // Soft delete: marca como inativo em vez de remover fisicamente
    await prisma.produto.update({ where: { id }, data: { ativo: false } });

    revalidatePath("/dashboard/produtos");
    revalidatePath("/");
    revalidateTag('products', 'max');

    return { success: true as const };
  } catch (error: any) {
    console.error("Erro ao excluir produto:", error);
    return { success: false as const, error: `Erro ao excluir: ${error.message || "Tente novamente."}` };
  }
}

// ─── STOCK DEPLETION (called after sale) ─────────────────────────

export async function depleteStock(items: { produtoId: string; quantidade: number }[]) {
  const tenantId = await getTenantIdOrRedirect();

  try {
    // Batch update stock for all sold items
    await prisma.$transaction(
      items.map(item =>
        prisma.produto.updateMany({
          where: { 
            id: BigInt(item.produtoId), 
            tenantId,
            estoqueAtual: { gte: item.quantidade } // only if enough stock
          },
          data: {
            estoqueAtual: { decrement: item.quantidade }
          }
        })
      )
    );

    revalidatePath("/");
    return { success: true as const };
  } catch (error) {
    console.error("Erro ao decrementar estoque:", error);
    return { success: false as const, error: "Erro ao atualizar estoque." };
  }
}

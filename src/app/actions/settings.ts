"use server";

import { prisma } from "@/lib/prisma";
import { getTenantIdOrRedirect } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface ProdutoSettings {
  id: string;
  nome: string;
  categoria: string;
  precoCentavos: number;
  precoCustoCentavos: number;
  estoqueAtual: number;
  estoqueMinimo: number;
  gerenciarEstoque: boolean;
  isFavorito: boolean;
}

// ─── Zod schema ───────────────────────────────────────────────────────────────
const produtoSchema = z.object({
  nome:               z.string().min(1, { message: "Nome obrigatório." }),
  categoria:          z.string().min(1, { message: "Categoria obrigatória." }),
  precoCentavos:      z.number().int().min(1,  { message: "Preço deve ser maior que zero." }),
  precoCustoCentavos: z.number().int().min(0).default(0),
  estoqueAtual:       z.number().int().min(0).default(0),
  estoqueMinimo:      z.number().int().min(0).default(0),
  gerenciarEstoque:   z.boolean().default(true),
  isFavorito:         z.boolean().default(true),
});

export type ProdutoInput = z.infer<typeof produtoSchema>;

// ─── CRUD ─────────────────────────────────────────────────────────────────────
export async function criarProduto(
  input: ProdutoInput
): Promise<{ id: string } | { error: string }> {
  const tenantId = await getTenantIdOrRedirect();
  const parsed = produtoSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const p = await prisma.produto.create({
    data: { tenantId, ...parsed.data },
  });

  revalidatePath("/settings");
  revalidatePath("/");
  return { id: p.id.toString() };
}

export async function editarProduto(
  id: string,
  input: ProdutoInput
): Promise<{ ok: true } | { error: string }> {
  const tenantId = await getTenantIdOrRedirect();
  const parsed = produtoSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const exists = await prisma.produto.findFirst({ where: { id: BigInt(id), tenantId }, select: { id: true } });
  if (!exists) return { error: "Produto não encontrado." };

  await prisma.produto.update({
    where: { id: BigInt(id) },
    data: parsed.data,
  });

  revalidatePath("/settings");
  revalidatePath("/");
  return { ok: true };
}

export async function excluirProduto(
  id: string
): Promise<{ ok: true } | { error: string }> {
  const tenantId = await getTenantIdOrRedirect();

  const exists = await prisma.produto.findFirst({ where: { id: BigInt(id), tenantId }, select: { id: true } });
  if (!exists) return { error: "Produto não encontrado." };

  await prisma.produto.delete({ where: { id: BigInt(id) } });

  revalidatePath("/settings");
  revalidatePath("/");
  return { ok: true };
}

export interface NomeLojaSettings {
  nomeLoja: string;
}

// ─── Estoque ──────────────────────────────────────────────────────────────────
export async function getEstoqueSettings(): Promise<ProdutoSettings[]> {
  const tenantId = await getTenantIdOrRedirect();
  const produtos = await prisma.produto.findMany({
    where: { tenantId },
    orderBy: [{ categoria: "asc" }, { nome: "asc" }],
  });

  return produtos.map((p) => ({
    id: p.id.toString(),
    nome: p.nome,
    categoria: p.categoria,
    precoCentavos: p.precoCentavos,
    precoCustoCentavos: p.precoCustoCentavos,
    estoqueAtual: p.estoqueAtual,
    estoqueMinimo: p.estoqueMinimo,
    gerenciarEstoque: p.gerenciarEstoque,
    isFavorito: p.isFavorito,
  }));
}

export async function updateEstoque(
  id: string,
  data: { estoqueAtual?: number; estoqueMinimo?: number; gerenciarEstoque?: boolean }
): Promise<{ ok: true } | { error: string }> {
  const tenantId = await getTenantIdOrRedirect();

  const produto = await prisma.produto.findFirst({
    where: { id: BigInt(id), tenantId },
    select: { estoqueAtual: true },
  });
  if (!produto) return { error: "Produto não encontrado." };

  // Log movement if estoqueAtual changed
  if (data.estoqueAtual !== undefined && data.estoqueAtual !== produto.estoqueAtual) {
    const diff = data.estoqueAtual - produto.estoqueAtual;
    await prisma.movimentacaoEstoque.create({
      data: {
        tenantId,
        produtoId: BigInt(id),
        tipo: "AJUSTE",
        quantidade: Math.abs(diff),
        quantidadeAnterior: produto.estoqueAtual,
        motivo: `Ajuste manual via Configurações (${diff > 0 ? "+" : ""}${diff})`,
      },
    });
  }

  await prisma.produto.update({
    where: { id: BigInt(id) },
    data,
  });

  revalidatePath("/settings");
  revalidatePath("/");
  return { ok: true };
}

export async function entradaEstoque(
  id: string,
  quantidade: number,
  motivo: string
): Promise<{ ok: true } | { error: string }> {
  const tenantId = await getTenantIdOrRedirect();
  if (quantidade <= 0) return { error: "Quantidade deve ser positiva." };

  const produto = await prisma.produto.findFirst({
    where: { id: BigInt(id), tenantId },
    select: { estoqueAtual: true },
  });
  if (!produto) return { error: "Produto não encontrado." };

  const novoEstoque = produto.estoqueAtual + quantidade;

  await Promise.all([
    prisma.produto.update({ where: { id: BigInt(id) }, data: { estoqueAtual: novoEstoque } }),
    prisma.movimentacaoEstoque.create({
      data: {
        tenantId,
        produtoId: BigInt(id),
        tipo: "ENTRADA",
        quantidade,
        quantidadeAnterior: produto.estoqueAtual,
        motivo: motivo || "Entrada de estoque",
      },
    }),
  ]);

  revalidatePath("/settings");
  revalidatePath("/");
  return { ok: true };
}

// ─── Geral (nomeLoja) ─────────────────────────────────────────────────────────
export async function getNomeLoja(): Promise<string> {
  const tenantId = await getTenantIdOrRedirect();
  const vendedor = await prisma.vendedor.findUnique({
    where: { id: tenantId },
    select: { nomeLoja: true },
  });
  return vendedor?.nomeLoja ?? "";
}

export async function updateNomeLoja(
  nomeLoja: string
): Promise<{ ok: true } | { error: string }> {
  const tenantId = await getTenantIdOrRedirect();
  if (!nomeLoja.trim()) return { error: "Nome não pode ser vazio." };

  await prisma.vendedor.update({
    where: { id: tenantId },
    data: { nomeLoja: nomeLoja.trim() },
  });

  revalidatePath("/settings");
  revalidatePath("/");
  return { ok: true };
}

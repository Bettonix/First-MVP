"use server";

import { prisma } from "@/lib/prisma";
import { getTenantIdOrRedirect, requireGerente } from "@/lib/auth";
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
  const { tenantId } = await requireGerente();
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
  const { tenantId } = await requireGerente();
  const parsed = produtoSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const exists = await prisma.produto.findFirst({ where: { id: BigInt(id), tenantId }, select: { id: true } });
  if (!exists) return { error: "Produto não encontrado." };

  await prisma.produto.update({
    where: { id: BigInt(id), tenantId },
    data: parsed.data,
  });

  revalidatePath("/settings");
  revalidatePath("/");
  return { ok: true };
}

export async function excluirProduto(
  id: string
): Promise<{ ok: true } | { error: string }> {
  const { tenantId } = await requireGerente();

  const exists = await prisma.produto.findFirst({ where: { id: BigInt(id), tenantId }, select: { id: true } });
  if (!exists) return { error: "Produto não encontrado." };

  await prisma.produto.update({ where: { id: BigInt(id), tenantId }, data: { ativo: false } });

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
    where: { id: BigInt(id), tenantId },
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
    prisma.produto.update({ where: { id: BigInt(id), tenantId }, data: { estoqueAtual: novoEstoque } }),
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
  const { tenantId } = await requireGerente();
  if (!nomeLoja.trim()) return { error: "Nome não pode ser vazio." };

  await prisma.vendedor.update({
    where: { id: tenantId },
    data: { nomeLoja: nomeLoja.trim() },
  });

  revalidatePath("/settings");
  revalidatePath("/");
  return { ok: true };
}

export async function getInstagramUrl(): Promise<string> {
  const tenantId = await getTenantIdOrRedirect();
  const vendedor = await prisma.vendedor.findUnique({
    where: { id: tenantId },
    select: { instagramUrl: true },
  });
  return vendedor?.instagramUrl ?? "";
}

export async function updateInstagramUrl(
  url: string
): Promise<{ ok: true } | { error: string }> {
  const { tenantId } = await requireGerente();
  const trimmed = url.trim();
  if (trimmed && !trimmed.startsWith("https://")) {
    return { error: "URL deve começar com https://" };
  }
  await prisma.vendedor.update({
    where: { id: tenantId },
    data: { instagramUrl: trimmed || null },
  });
  revalidatePath("/settings");
  return { ok: true };
}

// ─── PDV Settings ─────────────────────────────────────────────────────────────
export async function getMetodosPagamento(): Promise<string[]> {
  const tenantId = await getTenantIdOrRedirect();
  const v = await prisma.vendedor.findUnique({ where: { id: tenantId }, select: { metodosPagamento: true } });
  return v?.metodosPagamento ?? [];
}

export async function updateMetodosPagamento(metodos: string[]): Promise<{ ok: true } | { error: string }> {
  const { tenantId } = await requireGerente();
  if (metodos.length === 0) return { error: "Selecione ao menos um método de pagamento." };
  await prisma.vendedor.update({ where: { id: tenantId }, data: { metodosPagamento: metodos } });
  revalidatePath("/settings");
  return { ok: true };
}

export async function getMensagemRecibo(): Promise<string> {
  const tenantId = await getTenantIdOrRedirect();
  const v = await prisma.vendedor.findUnique({ where: { id: tenantId }, select: { mensagemRecibo: true } });
  return v?.mensagemRecibo ?? "Obrigado pela preferência! Volte sempre.";
}

export async function updateMensagemRecibo(msg: string): Promise<{ ok: true } | { error: string }> {
  const { tenantId } = await requireGerente();
  await prisma.vendedor.update({ where: { id: tenantId }, data: { mensagemRecibo: msg.trim() || null } });
  revalidatePath("/settings");
  return { ok: true };
}

export async function getDadosNegocio(): Promise<{ cnpjCpf: string; telefone: string }> {
  const tenantId = await getTenantIdOrRedirect();
  const v = await prisma.vendedor.findUnique({ where: { id: tenantId }, select: { cnpjCpf: true, telefone: true } });
  return { cnpjCpf: v?.cnpjCpf ?? "", telefone: v?.telefone ?? "" };
}

export async function updateDadosNegocio(data: { cnpjCpf?: string; telefone?: string }): Promise<{ ok: true } | { error: string }> {
  const { tenantId } = await requireGerente();
  await prisma.vendedor.update({
    where: { id: tenantId },
    data: { cnpjCpf: data.cnpjCpf?.trim() || null, telefone: data.telefone?.trim() || null },
  });
  revalidatePath("/settings");
  return { ok: true };
}

// ─── Segurança (PIN) ──────────────────────────────────────────────────────────
export async function getPinStatus(): Promise<boolean> {
  const tenantId = await getTenantIdOrRedirect();
  const v = await prisma.vendedor.findUnique({ where: { id: tenantId }, select: { pinGerente: true } });
  return !!v?.pinGerente;
}

export async function updatePin(
  pinAtual: string | null,
  pinNovo: string
): Promise<{ ok: true } | { error: string }> {
  const { tenantId } = await requireGerente();
  if (!/^\d{4,6}$/.test(pinNovo)) return { error: "PIN deve ter 4 a 6 dígitos numéricos." };

  const v = await prisma.vendedor.findUnique({ where: { id: tenantId }, select: { pinGerente: true } });

  if (v?.pinGerente) {
    if (!pinAtual) return { error: "Informe o PIN atual para alterá-lo." };
    const bcrypt = await import("bcryptjs");
    const ok = await bcrypt.compare(pinAtual, v.pinGerente);
    if (!ok) return { error: "PIN atual incorreto." };
  }

  const bcrypt = await import("bcryptjs");
  const hash = await bcrypt.hash(pinNovo, 10);
  await prisma.vendedor.update({ where: { id: tenantId }, data: { pinGerente: hash } });
  revalidatePath("/settings");
  return { ok: true };
}

export async function removePin(pinAtual: string): Promise<{ ok: true } | { error: string }> {
  const { tenantId } = await requireGerente();
  const v = await prisma.vendedor.findUnique({ where: { id: tenantId }, select: { pinGerente: true } });
  if (!v?.pinGerente) return { error: "Nenhum PIN configurado." };
  const bcrypt = await import("bcryptjs");
  const ok = await bcrypt.compare(pinAtual, v.pinGerente);
  if (!ok) return { error: "PIN incorreto." };
  await prisma.vendedor.update({ where: { id: tenantId }, data: { pinGerente: null } });
  revalidatePath("/settings");
  return { ok: true };
}

"use server";

import { prisma } from "@/lib/prisma";
import { getTenantIdOrRedirect } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export interface ComandaItem {
  nome: string;
  quantidade: number;
  precoCentavos: number;
}

export interface ComandaComMesa {
  id: string;
  mesaId: string;
  mesaNome: string;
  name: string | null;
  status: string;
  totalCentavos: number;
  itens: ComandaItem[];
  abertaEm: string;
  fechadaEm: string | null;
}

export interface MesaComComanda {
  id: string;
  nome: string;
  ativa: boolean;
  /** Todas as comandas ABERTAS desta mesa */
  comandas: ComandaComMesa[];
}

// ─── Listar mesas com todas as comandas abertas ──────────────────────────────
export async function getMesasComComanda(): Promise<MesaComComanda[]> {
  const tenantId = await getTenantIdOrRedirect();

  const mesas = await prisma.mesa.findMany({
    where: { tenantId, ativa: true },
    orderBy: { id: "asc" },
    include: {
      comandas: {
        where: { status: "ABERTA" },
        orderBy: { abertaEm: "asc" },
      },
    },
  });

  return mesas.map((m) => ({
    id: m.id.toString(),
    nome: m.nome,
    ativa: m.ativa,
    comandas: m.comandas.map((cmd) => ({
      id: cmd.id.toString(),
      mesaId: m.id.toString(),
      mesaNome: m.nome,
      name: cmd.name ?? null,
      status: cmd.status,
      totalCentavos: cmd.totalCentavos,
      itens: (cmd.itens as unknown as ComandaItem[]) ?? [],
      abertaEm: cmd.abertaEm.toISOString(),
      fechadaEm: cmd.fechadaEm?.toISOString() ?? null,
    })),
  }));
}

// ─── Abrir comanda (múltiplas por mesa permitidas) ───────────────────────────
export async function abrirComanda(
  mesaId: string,
  name?: string
): Promise<{ id: string } | { error: string }> {
  const tenantId = await getTenantIdOrRedirect();

  const comanda = await prisma.comanda.create({
    data: {
      tenantId,
      mesaId: BigInt(mesaId),
      name: name?.trim() || null,
      itens: [],
    },
  });

  revalidatePath("/dashboard/comandas");
  return { id: comanda.id.toString() };
}

// ─── Adicionar item à comanda ─────────────────────────────────────────────────
export async function adicionarItemComanda(
  comandaId: string,
  item: ComandaItem
): Promise<{ error: string } | { ok: true }> {
  const tenantId = await getTenantIdOrRedirect();

  const comanda = await prisma.comanda.findFirst({
    where: { id: BigInt(comandaId), tenantId, status: "ABERTA" },
  });
  if (!comanda) return { error: "Comanda não encontrada." };

  const itens = (comanda.itens as unknown as ComandaItem[]) ?? [];
  const existing = itens.findIndex((i) => i.nome === item.nome);
  if (existing >= 0) {
    itens[existing].quantidade += item.quantidade;
  } else {
    itens.push(item);
  }

  const total = itens.reduce((acc, i) => acc + i.precoCentavos * i.quantidade, 0);

  await prisma.comanda.update({
    where: { id: BigInt(comandaId) },
    data: { itens: itens as object[], totalCentavos: total },
  });

  revalidatePath("/dashboard/comandas");
  return { ok: true };
}

// ─── Remover item da comanda ──────────────────────────────────────────────────
export async function removerItemComanda(
  comandaId: string,
  itemNome: string
): Promise<{ error: string } | { ok: true }> {
  const tenantId = await getTenantIdOrRedirect();

  const comanda = await prisma.comanda.findFirst({
    where: { id: BigInt(comandaId), tenantId, status: "ABERTA" },
  });
  if (!comanda) return { error: "Comanda não encontrada." };

  const itens = ((comanda.itens as unknown as ComandaItem[]) ?? []).filter(
    (i) => i.nome !== itemNome
  );
  const total = itens.reduce((acc, i) => acc + i.precoCentavos * i.quantidade, 0);

  await prisma.comanda.update({
    where: { id: BigInt(comandaId) },
    data: { itens: itens as object[], totalCentavos: total },
  });

  revalidatePath("/dashboard/comandas");
  return { ok: true };
}

// ─── Fechar comanda ───────────────────────────────────────────────────────────
export async function fecharComanda(
  comandaId: string
): Promise<{ error: string } | { ok: true }> {
  const tenantId = await getTenantIdOrRedirect();

  const comanda = await prisma.comanda.findFirst({
    where: { id: BigInt(comandaId), tenantId, status: "ABERTA" },
  });
  if (!comanda) return { error: "Comanda não encontrada ou já fechada." };

  await prisma.comanda.update({
    where: { id: BigInt(comandaId) },
    data: { status: "FECHADA", fechadaEm: new Date() },
  });

  revalidatePath("/dashboard/comandas");
  return { ok: true };
}

// ─── Cancelar/deletar comanda ─────────────────────────────────────────────────
export async function cancelarComanda(
  comandaId: string
): Promise<{ error: string } | { ok: true }> {
  const tenantId = await getTenantIdOrRedirect();

  await prisma.comanda.deleteMany({
    where: { id: BigInt(comandaId), tenantId },
  });

  revalidatePath("/dashboard/comandas");
  return { ok: true };
}

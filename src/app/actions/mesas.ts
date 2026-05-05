"use server";

import { prisma } from "@/lib/prisma";
import { getTenantIdOrRedirect, requireGerente } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export interface MesaRow {
  id: string;
  nome: string;
  ativa: boolean;
  criadoEm: string;
}

export async function getMesas(): Promise<MesaRow[]> {
  const tenantId = await getTenantIdOrRedirect();
  const mesas = await prisma.mesa.findMany({
    where: { tenantId },
    orderBy: { id: "asc" },
  });
  return mesas.map((m) => ({
    id: m.id.toString(),
    nome: m.nome,
    ativa: m.ativa,
    criadoEm: m.criadoEm.toISOString(),
  }));
}

export async function criarMesasEmLote(quantidade: number, prefixo: string) {
  const { tenantId } = await requireGerente();
  if (quantidade < 1 || quantidade > 200) {
    return { error: "Quantidade deve ser entre 1 e 200." };
  }
  const data = Array.from({ length: quantidade }, (_, i) => ({
    tenantId,
    nome: `${prefixo.trim()} ${String(i + 1).padStart(2, "0")}`,
  }));
  await prisma.mesa.createMany({ data });
  revalidatePath("/settings");
  revalidatePath("/dashboard/comandas");
  return { success: true };
}

export async function updateMesa(id: string, nome: string) {
  const { tenantId } = await requireGerente();
  await prisma.mesa.updateMany({
    where: { id: BigInt(id), tenantId },
    data: { nome },
  });
  revalidatePath("/settings");
  revalidatePath("/dashboard/comandas");
  return { success: true };
}

export async function toggleMesa(id: string, ativa: boolean) {
  const tenantId = await getTenantIdOrRedirect();
  await prisma.mesa.updateMany({
    where: { id: BigInt(id), tenantId },
    data: { ativa },
  });
  revalidatePath("/settings");
  revalidatePath("/dashboard/comandas");
  return { success: true };
}

export async function deleteMesa(id: string) {
  const { tenantId } = await requireGerente();
  await prisma.mesa.deleteMany({ where: { id: BigInt(id), tenantId } });
  revalidatePath("/settings");
  revalidatePath("/dashboard/comandas");
  return { success: true };
}

export async function deleteTodasMesas() {
  const { tenantId } = await requireGerente();
  await prisma.mesa.deleteMany({ where: { tenantId } });
  revalidatePath("/settings");
  revalidatePath("/dashboard/comandas");
  return { success: true };
}

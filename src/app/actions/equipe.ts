"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireGerente, getSessionContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

const createOperatorSchema = z.object({
  nome: z.string().min(2, "Nome precisa ter ao menos 2 caracteres.").max(100),
  email: z.email("E-mail inválido."),
  senha: z.string().min(6, "Senha precisa ter ao menos 6 caracteres."),
});

export interface OperadorRow {
  id: string;
  nome: string | null;
  email: string;
  criadoEm: string;
}

export async function createOperator(input: {
  nome: string;
  email: string;
  senha: string;
}): Promise<{ error: string } | { ok: true }> {
  const ctx = await requireGerente();

  const parsed = createOperatorSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { nome, email, senha } = parsed.data;

  // Verifica se já existe operador com esse email neste tenant
  const existing = await prisma.profile.findFirst({
    where: { email, vendedorId: ctx.tenantId },
    select: { id: true },
  });
  if (existing) return { error: "Já existe um operador com este e-mail nesta loja." };

  let adminClient;
  try {
    adminClient = createAdminClient();
  } catch {
    return { error: "Gerenciamento de equipe não disponível. Configure SUPABASE_SERVICE_ROLE_KEY no servidor." };
  }

  // Cria o usuário no Supabase Auth
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { name: nome, role: "OPERADOR", vendedor_id: ctx.tenantId },
  });

  if (authError || !authData.user) {
    return { error: authError?.message ?? "Erro ao criar usuário no Supabase." };
  }

  // Vincula o Profile ao tenant com role OPERADOR
  await prisma.profile.upsert({
    where: { id: authData.user.id },
    create: {
      id: authData.user.id,
      email,
      name: nome,
      role: "OPERADOR",
      vendedorId: ctx.tenantId,
    },
    update: {
      name: nome,
      role: "OPERADOR",
      vendedorId: ctx.tenantId,
    },
  });

  revalidatePath("/settings");
  return { ok: true };
}

export async function listOperadores(): Promise<OperadorRow[]> {
  const ctx = await requireGerente();

  const profiles = await prisma.profile.findMany({
    where: { vendedorId: ctx.tenantId, role: "OPERADOR" },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, email: true, createdAt: true },
  });

  return profiles.map((p) => ({
    id: p.id,
    nome: p.name,
    email: p.email,
    criadoEm: p.createdAt.toISOString(),
  }));
}

export async function deleteOperador(
  operadorId: string
): Promise<{ error: string } | { ok: true }> {
  const ctx = await requireGerente();

  // Garante que o operador pertence ao tenant do gerente
  const profile = await prisma.profile.findFirst({
    where: { id: operadorId, vendedorId: ctx.tenantId, role: "OPERADOR" },
    select: { id: true },
  });
  if (!profile) return { error: "Operador não encontrado." };

  let adminClient;
  try {
    adminClient = createAdminClient();
  } catch {
    return { error: "Gerenciamento de equipe não disponível. Configure SUPABASE_SERVICE_ROLE_KEY." };
  }

  // Remove do Supabase Auth (cascade deleta o Profile via trigger)
  const { error: authError } = await adminClient.auth.admin.deleteUser(operadorId);
  if (authError) return { error: authError.message };

  // Remove o Profile manualmente caso a trigger não exista
  await prisma.profile.deleteMany({ where: { id: operadorId } });

  revalidatePath("/settings");
  return { ok: true };
}

export async function setPinGerente(
  pin: string
): Promise<{ error: string } | { ok: true }> {
  const ctx = await requireGerente();

  if (!/^\d{4}$/.test(pin)) {
    return { error: "PIN deve ter exatamente 4 dígitos numéricos." };
  }

  const hash = await bcrypt.hash(pin, 10);

  await prisma.vendedor.update({
    where: { id: ctx.tenantId },
    data: { pinGerente: hash },
  });

  return { ok: true };
}

export async function verificarPinGerente(
  pin: string
): Promise<{ ok: true } | { error: string }> {
  const ctx = await getSessionContext();

  const vendedor = await prisma.vendedor.findUnique({
    where: { id: ctx.tenantId },
    select: { pinGerente: true },
  });

  if (!vendedor?.pinGerente) {
    return { error: "PIN do gerente não configurado." };
  }

  const match = await bcrypt.compare(pin, vendedor.pinGerente);
  if (!match) return { error: "PIN incorreto." };

  return { ok: true };
}

export async function revogarSessaoOperador(
  operadorId: string
): Promise<{ error: string } | { ok: true }> {
  const ctx = await requireGerente();

  const profile = await prisma.profile.findFirst({
    where: { id: operadorId, vendedorId: ctx.tenantId, role: "OPERADOR" },
    select: { id: true },
  });
  if (!profile) return { error: "Operador não encontrado." };

  let adminClient;
  try {
    adminClient = createAdminClient();
  } catch {
    return { error: "Gerenciamento de equipe não disponível. Configure SUPABASE_SERVICE_ROLE_KEY." };
  }

  const { error } = await adminClient.auth.admin.signOut(operadorId, "global");
  if (error) return { error: error.message };

  return { ok: true };
}

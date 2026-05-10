"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

async function getAuthUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

async function getVendedor(authId: string) {
  return prisma.vendedor.findUnique({ where: { authId }, select: { id: true, onboardingStep: true } });
}

// Avança o step sem salvar dados (botão "Pular")
export async function pularStep(targetStep: number): Promise<{ error: string } | { ok: true }> {
  const user = await getAuthUser();
  if (!user) return { error: "Sessão expirada." };
  const v = await getVendedor(user.id);
  if (!v) return { error: "Complete o passo 1 primeiro." };
  await prisma.vendedor.update({
    where: { id: v.id },
    data: { onboardingStep: Math.max(v.onboardingStep, targetStep) },
  });
  return { ok: true };
}

// Step 1 — Identidade (OBRIGATÓRIO)
const step1Schema = z.object({
  nomeLoja: z.string().min(2, "Nome deve ter ao menos 2 caracteres."),
  nicho: z.string().default("outros"),
});

export async function salvarStep1(input: z.infer<typeof step1Schema>): Promise<{ error: string } | { ok: true }> {
  const user = await getAuthUser();
  if (!user) return { error: "Sessão expirada." };
  const parsed = step1Schema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const existing = await getVendedor(user.id);
  if (existing) {
    await prisma.vendedor.update({
      where: { id: existing.id },
      data: { nomeLoja: parsed.data.nomeLoja.trim(), nicho: parsed.data.nicho,
        onboardingStep: Math.max(existing.onboardingStep, 1) },
    });
  } else {
    await prisma.$transaction(async (tx) => {
      await tx.vendedor.create({
        data: { authId: user.id, nomeLoja: parsed.data.nomeLoja.trim(), nicho: parsed.data.nicho, onboardingStep: 1 },
      });
      await tx.profile.upsert({
        where: { id: user.id },
        update: { role: "GERENTE" },
        create: { id: user.id, email: user.email!, name: user.user_metadata?.full_name ?? user.email!.split("@")[0],
          avatarUrl: user.user_metadata?.avatar_url ?? null, role: "GERENTE" },
      });
    });
  }
  return { ok: true };
}

// Step 2 — Profissionalização (OPCIONAL)
const step2Schema = z.object({
  cnpjCpf: z.string().optional(),
  telefone: z.string().optional(),
  mensagemRecibo: z.string().optional(),
});

export async function salvarStep2(input: z.infer<typeof step2Schema>): Promise<{ error: string } | { ok: true }> {
  const user = await getAuthUser();
  if (!user) return { error: "Sessão expirada." };
  const v = await getVendedor(user.id);
  if (!v) return { error: "Complete o passo 1 primeiro." };
  await prisma.vendedor.update({
    where: { id: v.id },
    data: { cnpjCpf: input.cnpjCpf?.trim() || null, telefone: input.telefone?.trim() || null,
      mensagemRecibo: input.mensagemRecibo?.trim() || null,
      onboardingStep: Math.max(v.onboardingStep, 2) },
  });
  return { ok: true };
}

// Step 3 — Pagamentos (OBRIGATÓRIO)
const step3Schema = z.object({
  metodosPagamento: z.array(z.string()).min(1, "Selecione ao menos um método."),
});

export async function salvarStep3(input: z.infer<typeof step3Schema>): Promise<{ error: string } | { ok: true }> {
  const user = await getAuthUser();
  if (!user) return { error: "Sessão expirada." };
  const parsed = step3Schema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const v = await getVendedor(user.id);
  if (!v) return { error: "Complete o passo 1 primeiro." };
  await prisma.vendedor.update({
    where: { id: v.id },
    data: { metodosPagamento: parsed.data.metodosPagamento, onboardingStep: Math.max(v.onboardingStep, 3) },
  });
  return { ok: true };
}

// Step 4 — PIN (OPCIONAL)
const step4Schema = z.object({
  pin: z.string().min(4).max(6).regex(/^\d+$/, "PIN deve conter apenas números."),
});

export async function salvarStep4(input: z.infer<typeof step4Schema>): Promise<{ error: string } | { ok: true }> {
  const user = await getAuthUser();
  if (!user) return { error: "Sessão expirada." };
  const parsed = step4Schema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const v = await getVendedor(user.id);
  if (!v) return { error: "Complete o passo 1 primeiro." };
  const bcrypt = await import("bcryptjs");
  const hash = await bcrypt.hash(parsed.data.pin, 10);
  await prisma.vendedor.update({
    where: { id: v.id },
    data: { pinGerente: hash, onboardingStep: Math.max(v.onboardingStep, 4) },
  });
  return { ok: true };
}

// Step 5 — Primeiro produto (OPCIONAL)
const step5Schema = z.object({
  nomeProduto: z.string().min(2, "Nome do produto obrigatório."),
  precoCentavos: z.number().int().min(1, "Preço deve ser maior que zero."),
  categoria: z.string().default("Outros"),
});

export async function salvarStep5(input: z.infer<typeof step5Schema>): Promise<{ error: string } | { ok: true }> {
  const user = await getAuthUser();
  if (!user) return { error: "Sessão expirada." };
  const parsed = step5Schema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const v = await getVendedor(user.id);
  if (!v) return { error: "Complete o passo 1 primeiro." };
  await prisma.$transaction(async (tx) => {
    await tx.produto.create({
      data: { tenantId: v.id, nome: parsed.data.nomeProduto.trim(),
        precoCentavos: parsed.data.precoCentavos, categoria: parsed.data.categoria, isFavorito: true },
    });
    await tx.vendedor.update({ where: { id: v.id }, data: { onboardingStep: Math.max(v.onboardingStep, 5) } });
  });
  return { ok: true };
}

// Step 6 — Conclusão
export async function concluirOnboarding(): Promise<{ error: string } | { ok: true }> {
  const user = await getAuthUser();
  if (!user) return { error: "Sessão expirada." };
  const v = await getVendedor(user.id);
  if (!v) return { error: "Conta não configurada." };
  await prisma.vendedor.update({ where: { id: v.id }, data: { onboardingStep: 6 } });
  return { ok: true };
}

export async function getOnboardingStep(): Promise<number> {
  const user = await getAuthUser();
  if (!user) return 0;
  const v = await prisma.vendedor.findUnique({ where: { authId: user.id }, select: { onboardingStep: true } });
  return v?.onboardingStep ?? 0;
}

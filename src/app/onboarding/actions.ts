"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { z } from "zod";

const onboardingSchema = z.object({
  nomeLoja: z.string().min(2, "Nome precisa ter ao menos 2 caracteres.").max(100),
  nicho: z.string().min(1, "Selecione um ramo."),
  metodosPagamento: z.array(z.string()).min(1, "Selecione ao menos um método."),
  produto: z.object({
    nome: z.string().min(1, "Nome do produto é obrigatório.").max(200),
    precoCentavos: z.number().int().min(1, "Preço deve ser maior que zero."),
    categoria: z.string(),
  }),
});

type OnboardingInput = z.infer<typeof onboardingSchema>;

export async function setupOnboarding(
  input: OnboardingInput
): Promise<{ error: string } | void> {
  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { error: first?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) return { error: "Sessão expirada. Faça login novamente." };

  const existe = await prisma.vendedor.findUnique({
    where: { authId: user.id },
    select: { id: true },
  });
  if (existe) redirect("/");

  const { nomeLoja, nicho, metodosPagamento, produto } = parsed.data;

  await prisma.$transaction(async (tx) => {
    const vendedor = await tx.vendedor.create({
      data: {
        authId: user.id,
        nomeLoja,
        nicho,
        metodosPagamento,
      },
    });

    await tx.produto.create({
      data: {
        tenantId: vendedor.id,
        nome: produto.nome,
        precoCentavos: produto.precoCentavos,
        precoCustoCentavos: 0,
        categoria: produto.categoria,
        isFavorito: true,
        gerenciarEstoque: false,
        estoqueAtual: 0,
        estoqueMinimo: 0,
      },
    });
  });

  redirect("/?welcome=1");
}

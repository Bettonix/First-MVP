"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export async function createTenant(formData: FormData) {
  const nomeLoja = formData.get("nomeLoja") as string;
  if (!nomeLoja || nomeLoja.length < 3) {
    return { error: "O nome da loja deve ter no mínimo 3 caracteres." };
  }

  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return { error: "Não autorizado." };
  }

  // Verifica se já tem tenant
  const existe = await prisma.vendedor.findUnique({ where: { authId: user.id } });
  if (existe) {
    redirect("/"); // Já tem tenant, vai pro PDV
  }

  await prisma.vendedor.create({
    data: {
      authId: user.id,
      nomeLoja: nomeLoja
    }
  });

  redirect("/");
}

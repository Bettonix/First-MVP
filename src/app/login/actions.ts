"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getURL } from "@/lib/utils";

export async function signInWithGoogle() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${getURL()}/auth/callback`,
    },
  });

  if (error || !data.url) {
    return { error: error?.message ?? "Erro ao iniciar login com Google" };
  }

  redirect(data.url);
}

export async function signInWithPassword(email: string, password: string) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  // Never reveal whether the email exists — always return the same generic message
  if (error) return { error: "Credenciais inválidas. Verifique e-mail e senha." };
  return { success: true };
}

export async function signUpWithPassword(email: string, password: string) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) return { error: error.message };
  return { success: true };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
}

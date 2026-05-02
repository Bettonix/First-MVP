"use server";

import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

function getSiteOrigin(fallback: string): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? fallback;
}

export async function signInWithGoogle() {
  const supabase = await createClient();
  const headersList = await headers();
  const origin = headersList.get("origin") ?? getSiteOrigin("http://localhost:3000");

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback`,
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
  if (error) return { error: error.message };
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

"use server";

import { createClient } from "@/lib/supabase/server";

export async function signInWithMagicLink(email: string) {
  const supabase = await createClient();

  // NEXT_PUBLIC_SITE_URL tem prioridade (Vercel Prod/Preview).
  // Fallback para localhost durante o desenvolvimento.
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000";

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${siteUrl}/auth/callback`,
    },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
}

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase com Service Role Key — bypassa RLS.
 * Requer SUPABASE_SERVICE_ROLE_KEY no .env.local.
 * Usado exclusivamente em Server Actions para criar/deletar usuários.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY não configurada. " +
      "Adicione ao .env.local para habilitar o gerenciamento de equipe."
    );
  }

  return createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

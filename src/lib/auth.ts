import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export async function getTenantIdOrRedirect(): Promise<string> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  const vendedor = await prisma.vendedor.findUnique({
    where: { authId: user.id }
  });

  if (!vendedor) {
    redirect("/onboarding");
  }

  return vendedor.id; // tenant_id
}

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import LandingClient from "./landing-client";

export const dynamic = "force-dynamic";

export default async function RootPage() {
  // Authenticated users go straight to the PDV
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/app");

  return <LandingClient />;
}

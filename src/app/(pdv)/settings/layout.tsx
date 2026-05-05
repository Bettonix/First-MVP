import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getSessionContext();
  if (ctx.role !== "GERENTE") redirect("/");
  return <>{children}</>;
}

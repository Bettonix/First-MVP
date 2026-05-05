import { AppSidebar } from "@/components/AppSidebar";
import { getSessionContext } from "@/lib/auth";
import { IdleLockProvider } from "./providers/IdleLockProvider";
import { prisma } from "@/lib/prisma";

export default async function PdvLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getSessionContext();
  const vendedor = await prisma.vendedor.findUnique({
    where: { id: ctx.tenantId },
    select: { nomeLoja: true },
  });

  return (
    <div className="h-screen w-full flex overflow-hidden bg-[var(--parchment)]">
      <AppSidebar userRole={ctx.role} />
      <main className="flex-1 min-h-0 overflow-auto pb-24 md:pb-0">
        <IdleLockProvider nomeLoja={vendedor?.nomeLoja}>
          {children}
        </IdleLockProvider>
      </main>
    </div>
  );
}

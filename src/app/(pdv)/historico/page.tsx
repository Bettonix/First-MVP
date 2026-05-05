import { getHistoricoCompleto } from "@/app/actions/historico";
import { HistoricoView, type Metodo } from "@/components/HistoricoView";
import { getSessionContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function HistoricoPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; metodo?: string; busca?: string; tab?: string }>;
}) {
  const [params, ctx] = await Promise.all([searchParams, getSessionContext()]);
  const [data, vendedor] = await Promise.all([
    getHistoricoCompleto({ date: params.date, metodo: params.metodo, busca: params.busca }),
    prisma.vendedor.findUnique({ where: { id: ctx.tenantId }, select: { nomeLoja: true, instagramUrl: true } }),
  ]);

  return (
    <HistoricoView
      initialData={data}
      initialFilters={{
        date: params.date ?? new Date().toISOString().split("T")[0],
        metodo: (params.metodo as Metodo) ?? "all",
        busca: params.busca ?? "",
        tab: (params.tab as "vendas" | "comandas") ?? "vendas",
      }}
      userRole={ctx.role}
      nomeLoja={vendedor?.nomeLoja ?? ""}
      instagramUrl={vendedor?.instagramUrl ?? ""}
    />
  );
}

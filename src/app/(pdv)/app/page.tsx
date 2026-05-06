import { PDVContainer } from "@/components/PDVContainer";
import { getPDVBootstrapData } from "@/app/actions/pdv-bootstrap";
import { getSessionContext } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const [data, params, ctx] = await Promise.all([
    getPDVBootstrapData(),
    searchParams,
    getSessionContext(),
  ]);
  const { isTurnoAberto, nomeLoja, instagramUrl, insights, lowStockItems, recentSales, produtos } = data;

  return (
    <PDVContainer
      isTurnoAberto={isTurnoAberto}
      nomeLoja={nomeLoja}
      instagramUrl={instagramUrl}
      insights={insights}
      lowStockItems={lowStockItems}
      recentSales={recentSales}
      initialProdutos={produtos}
      showWelcome={params.welcome === "1"}
      userRole={ctx.role}
    />
  );
}

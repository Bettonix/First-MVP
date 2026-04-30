import { PDVContainer } from "@/components/PDVContainer";
import { getPDVBootstrapData } from "@/app/actions/pdv-bootstrap";

export const dynamic = 'force-dynamic';

export default async function Home() {
  const data = await getPDVBootstrapData();
  const { isTurnoAberto, nomeLoja, insights, lowStockItems, recentSales, produtos } = data;

  return (
    <main className="min-h-screen bg-[#0B0D11]">
      <PDVContainer
        isTurnoAberto={isTurnoAberto}
        nomeLoja={nomeLoja}
        insights={insights}
        lowStockItems={lowStockItems}
        recentSales={recentSales}
        initialProdutos={produtos}
      />
    </main>
  );
}

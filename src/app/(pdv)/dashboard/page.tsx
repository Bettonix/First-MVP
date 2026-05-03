import { Suspense } from "react";
import { getFullDashboardStats } from "@/app/actions/analytics";
import { RevenueChart, PaymentDistributionCard } from "@/components/DashboardCharts";
import { PeriodSelector } from "@/components/PeriodSelector";
import { Package } from "lucide-react";

export const dynamic = "force-dynamic";

const PERIOD_LABELS: Record<string, string> = {
  today: "Hoje",
  "7d": "Últimos 7 Dias",
  "30d": "Últimos 30 Dias",
  month: "Este Mês",
};

function fmtBRL(centavos: number) {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function KpiCard({ title, value, accent }: { title: string; value: string; accent: string }) {
  return (
    <div className="dash-card rounded-3xl p-6 relative overflow-hidden">
      <p className="dash-label text-xs font-bold uppercase tracking-wider mb-3">{title}</p>
      <p className={`text-2xl font-black tabular-nums tracking-tight ${accent}`}>{value}</p>
      <div className={`absolute -bottom-4 -right-4 w-20 h-20 rounded-full blur-2xl opacity-20 ${accent}`} />
    </div>
  );
}

type Stats = Awaited<ReturnType<typeof getFullDashboardStats>>;

function buildKpis(period: string, stats: Stats) {
  const { periodTotal, periodRevenue } = stats;
  const label = PERIOD_LABELS[period] ?? "Últimos 30 Dias";

  const primaryValue =
    period === "today"  ? periodRevenue.hoje   :
    period === "7d"     ? periodRevenue.semana  :
    period === "month"  ? periodRevenue.mes     :
    periodTotal;

  const kpi1 = { title: label,              value: fmtBRL(primaryValue),        accent: "text-emerald-500" };
  const kpi2 = period === "today"
    ? { title: "Últimos 7 Dias",   value: fmtBRL(periodRevenue.semana), accent: "text-blue-500" }
    : { title: "Faturamento Hoje", value: fmtBRL(periodRevenue.hoje),   accent: "text-blue-500" };
  const kpi3 = period === "month"
    ? { title: "Últimos 7 Dias", value: fmtBRL(periodRevenue.semana), accent: "text-violet-500" }
    : { title: "Este Mês",       value: fmtBRL(periodRevenue.mes),    accent: "text-violet-500" };

  return [kpi1, kpi2, kpi3];
}

async function DashboardContent({ period }: { period: string }) {
  const stats = await getFullDashboardStats(period);
  const { revenueByDay, paymentDistribution, topProducts } = stats;
  const kpis = buildKpis(period, stats);
  const label = PERIOD_LABELS[period] ?? "Período";

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.title} title={kpi.title} value={kpi.value} accent={kpi.accent} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 dash-card rounded-3xl p-6 min-w-0">
          <h2 className="dash-title text-lg font-bold">Faturamento Diário — {label}</h2>
          <p className="dash-subtitle text-sm font-medium mb-2">Evolução da receita bruta por dia.</p>
          <RevenueChart data={revenueByDay} />
        </div>
        <div className="dash-card rounded-3xl p-6 min-w-0">
          <h2 className="dash-title text-lg font-bold">Distribuição de Pagamento</h2>
          <p className="dash-subtitle text-sm font-medium mb-4">{label}.</p>
          <PaymentDistributionCard data={paymentDistribution} />
        </div>
      </div>

      <div className="dash-card rounded-3xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="dash-title text-lg font-bold">Top 10 — Mais Vendidos ({label})</h2>
            <p className="dash-subtitle text-sm font-medium">Ranking por receita gerada.</p>
          </div>
          <span className="dash-badge text-xs font-bold px-3 py-1.5 rounded-full">{topProducts.length} produtos</span>
        </div>

        {topProducts.length === 0 ? (
          <div className="dash-empty rounded-2xl flex flex-col items-center justify-center h-32">
            <Package size={32} className="dash-label mb-2" />
            <p className="dash-subtitle text-sm font-semibold">Nenhum dado disponível.</p>
          </div>
        ) : (
          <div className="space-y-1">
            {topProducts.map((produto, index) => {
              const maxRevenue = topProducts[0]?.receitaTotalCentavos ?? 1;
              const barPct = (produto.receitaTotalCentavos / maxRevenue) * 100;
              const rankClass =
                index === 0 ? "dash-rank-gold" :
                index === 1 ? "dash-rank-silver" :
                index === 2 ? "dash-rank-bronze" : "dash-rank-other";
              return (
                <div key={index} className="dash-row-hover flex items-center gap-4 p-3 rounded-xl transition-colors">
                  <span className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-black shrink-0 ${rankClass}`}>{index + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="dash-value font-bold text-sm truncate">{produto.nome}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="dash-bar-track flex-1 h-1.5 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full transition-all duration-700" style={{ width: `${barPct}%` }} />
                      </div>
                      <span className="dash-label text-xs font-semibold shrink-0">{produto.quantidadeTotal} un</span>
                    </div>
                  </div>
                  <p className="text-emerald-500 font-black text-sm tabular-nums shrink-0">{fmtBRL(produto.receitaTotalCentavos)}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

function DashboardSkeleton() {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => <div key={i} className="dash-card rounded-3xl h-32 animate-pulse" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 dash-card rounded-3xl h-80 animate-pulse" />
        <div className="dash-card rounded-3xl h-80 animate-pulse" />
      </div>
      <div className="dash-card rounded-3xl h-96 animate-pulse" />
    </>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period = "30d" } = await searchParams;
  const validPeriods = ["today", "7d", "30d", "month"];
  const safePeriod = validPeriods.includes(period) ? period : "30d";

  return (
    <div className="dash-page p-4 md:p-8 max-w-7xl mx-auto space-y-6 pb-16">
      <div className="flex items-start justify-between gap-4 mb-2 flex-wrap">
        <div>
          <h1 className="dash-title text-3xl font-black tracking-tight">Dashboard</h1>
          <p className="dash-subtitle font-medium text-sm">Inteligência de negócio em tempo real.</p>
        </div>
        <PeriodSelector />
      </div>
      <Suspense key={safePeriod} fallback={<DashboardSkeleton />}>
        <DashboardContent period={safePeriod} />
      </Suspense>
    </div>
  );
}

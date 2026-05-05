import { Suspense } from "react";
import { getFullDashboardStats } from "@/app/actions/analytics";
import { RevenueChart, PaymentDistributionCard } from "@/components/DashboardCharts";
import { DashboardFilters } from "@/components/DashboardFilters";
import { Package, TrendingUp, ShoppingCart, BarChart2 } from "lucide-react";
import type { DashboardFilters as Filters } from "@/core/application/services/analytics.service";

export const dynamic = "force-dynamic";

const PERIOD_LABELS: Record<string, string> = {
  today: "Hoje",
  "7d":  "Últimos 7 Dias",
  "30d": "Últimos 30 Dias",
  month: "Este Mês",
};

function fmtBRL(centavos: number) {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ─── Skeletons ────────────────────────────────────────────────────────────────
function KpisSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="dash-card rounded-3xl h-28 animate-pulse" />
      ))}
    </div>
  );
}

function ChartsSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 dash-card rounded-3xl h-80 animate-pulse" />
      <div className="dash-card rounded-3xl h-80 animate-pulse" />
    </div>
  );
}

function RankingSkeleton() {
  return <div className="dash-card rounded-3xl h-96 animate-pulse" />;
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({
  title, value, sub, icon: Icon, accentColor,
}: {
  title: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  accentColor: string;
}) {
  return (
    <div
      className="dash-card rounded-3xl p-5 relative overflow-hidden"
      style={{ borderTop: `2px solid ${accentColor}` }}
    >
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center mb-3"
        style={{ backgroundColor: `${accentColor}18`, color: accentColor }}
      >
        <Icon size={15} />
      </div>
      <p className="dash-label text-[10px] font-bold uppercase tracking-wider mb-1">{title}</p>
      <p className="dash-value text-xl font-black tabular-nums tracking-tight">{value}</p>
      {sub && <p className="dash-subtitle text-xs font-semibold mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Async sections ───────────────────────────────────────────────────────────
type SearchParams = { period?: string; metodo?: string; categoria?: string };

async function KpisSection({ period, filters }: { period: string; filters: Filters }) {
  const stats = await getFullDashboardStats(period, filters);
  const label = PERIOD_LABELS[period] ?? "Período";
  const { periodRevenue } = stats;

  const kpis = [
    {
      title: label,
      value: fmtBRL(stats.periodTotal),
      sub: `${stats.qtdPedidos} pedidos`,
      icon: TrendingUp,
      accentColor: "#D35400",
    },
    {
      title: "Ticket Médio",
      value: fmtBRL(stats.ticketMedioCentavos),
      sub: label,
      icon: ShoppingCart,
      accentColor: "#B7791F",
    },
    {
      title: "Faturamento Hoje",
      value: fmtBRL(periodRevenue.hoje),
      sub: undefined,
      icon: BarChart2,
      accentColor: "#5C6B3A",
    },
    {
      title: "Este Mês",
      value: fmtBRL(periodRevenue.mes),
      sub: undefined,
      icon: BarChart2,
      accentColor: "#6B6B6B",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {kpis.map((kpi) => (
        <KpiCard key={kpi.title} {...kpi} />
      ))}
    </div>
  );
}

async function ChartsSection({ period, filters }: { period: string; filters: Filters }) {
  const stats = await getFullDashboardStats(period, filters);
  const label = PERIOD_LABELS[period] ?? "Período";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 dash-card rounded-3xl p-6 min-w-0">
        <h2 className="dash-title text-lg font-bold">Faturamento Diário — {label}</h2>
        <p className="dash-subtitle text-sm font-medium mb-2">Evolução da receita bruta por dia.</p>
        <RevenueChart data={stats.revenueByDay} />
      </div>
      <div className="dash-card rounded-3xl p-6 min-w-0">
        <h2 className="dash-title text-lg font-bold">Distribuição de Pagamento</h2>
        <p className="dash-subtitle text-sm font-medium mb-4">{label}.</p>
        <PaymentDistributionCard data={stats.paymentDistribution} />
      </div>
    </div>
  );
}

async function RankingSection({ period, filters }: { period: string; filters: Filters }) {
  const stats = await getFullDashboardStats(period, filters);
  const label = PERIOD_LABELS[period] ?? "Período";
  const { topProducts } = stats;

  return (
    <div className="dash-card rounded-3xl p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="dash-title text-lg font-bold">Top 10 — Mais Vendidos ({label})</h2>
          <p className="dash-subtitle text-sm font-medium">Ranking por receita gerada.</p>
        </div>
        <span className="dash-badge text-xs font-bold px-3 py-1.5 rounded-full">
          {topProducts.length} produtos
        </span>
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
              index === 0 ? "dash-rank-gold"   :
              index === 1 ? "dash-rank-silver" :
              index === 2 ? "dash-rank-bronze" : "dash-rank-other";
            return (
              <div key={index} className="dash-row-hover flex items-center gap-4 p-3 rounded-xl transition-colors">
                <span className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-black shrink-0 ${rankClass}`}>
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="dash-value font-bold text-sm truncate">{produto.nome}</p>
                    {produto.categoria && (
                      <span className="dash-badge text-[9px] font-bold px-1.5 py-0.5 rounded-md shrink-0">
                        {produto.categoria}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="dash-bar-track flex-1 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${barPct}%`, backgroundColor: "var(--brasa)" }}
                      />
                    </div>
                    <span className="dash-label text-xs font-semibold shrink-0">{produto.quantidadeTotal} un</span>
                  </div>
                </div>
                <p className="font-black text-sm tabular-nums shrink-0" style={{ color: "var(--brasa)" }}>
                  {fmtBRL(produto.receitaTotalCentavos)}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Categorias para o filtro (carrega rápido, independente) ──────────────────
async function FiltersSection({ period, metodo, categoria }: SearchParams) {
  const { categorias } = await getFullDashboardStats(period ?? "30d", {});
  return <DashboardFilters categorias={categorias} />;
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const validPeriods = ["today", "7d", "30d", "month"];
  const period = validPeriods.includes(params.period ?? "") ? (params.period ?? "30d") : "30d";
  const filters: Filters = {
    metodo:    params.metodo    || undefined,
    categoria: params.categoria || undefined,
  };

  // Chave única para forçar re-stream quando filtros mudam
  const streamKey = `${period}-${filters.metodo ?? ""}-${filters.categoria ?? ""}`;

  return (
    <div className="dash-page p-4 md:p-8 max-w-7xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div>
          <h1 className="dash-title text-3xl font-black tracking-tight">Dashboard</h1>
          <p className="dash-subtitle font-medium text-sm">Inteligência de negócio em tempo real.</p>
        </div>
        {/* Filtros — carregam independentemente */}
        <Suspense fallback={
          <div className="flex gap-2">
            <div className="h-9 w-64 dash-card rounded-2xl animate-pulse" />
            <div className="h-9 w-52 dash-card rounded-2xl animate-pulse" />
          </div>
        }>
          <FiltersSection period={period} metodo={params.metodo} categoria={params.categoria} />
        </Suspense>
      </div>

      {/* KPIs — stream independente */}
      <Suspense key={`kpis-${streamKey}`} fallback={<KpisSkeleton />}>
        <KpisSection period={period} filters={filters} />
      </Suspense>

      {/* Gráficos — stream independente */}
      <Suspense key={`charts-${streamKey}`} fallback={<ChartsSkeleton />}>
        <ChartsSection period={period} filters={filters} />
      </Suspense>

      {/* Ranking — stream independente */}
      <Suspense key={`ranking-${streamKey}`} fallback={<RankingSkeleton />}>
        <RankingSection period={period} filters={filters} />
      </Suspense>
    </div>
  );
}

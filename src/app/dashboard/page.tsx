import { getDashboardStats } from "@/app/actions/analytics";
import { SalesHeatmap } from "@/components/SalesHeatmap";
import { StatCard } from "@/components/StatCard";
import { TrendingUp, Package, ArrowUpRight } from "lucide-react";
import Link from "next/link";

export const dynamic = 'force-dynamic';

export default async function DashboardOverview() {
  const stats = await getDashboardStats(7); // Últimos 7 dias
  
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-slate-500 font-medium">Resumo financeiro dos últimos 7 dias.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/produtos" className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-colors">
            <Package size={18} /> Estoque
          </Link>
          <Link href="/" className="bg-slate-900 hover:bg-black text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-colors">
            Abrir PDV <ArrowUpRight size={18} />
          </Link>
        </div>
      </div>

      {/* Grid de StatCards (1 col mobile, 2 col desktop) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatCard 
          title="Receita Bruta (7d)"
          value={(stats.totalReceitaCentavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          icon={TrendingUp}
          iconBgClass="bg-emerald-100"
          iconColorClass="text-emerald-600"
          glowColorClass="bg-emerald-50"
          trend={{ value: stats.revenueGrowth, label: "vs 7d atrás" }}
        />

        <StatCard 
          title="Produto Mais Vendido"
          value={stats.topProducts[0]?.nome || "Sem vendas"}
          subtitle={stats.topProducts[0] ? `${stats.topProducts[0].quantidadeTotal} unidades` : undefined}
          icon={Package}
          iconBgClass="bg-slate-100"
          iconColorClass="text-slate-600"
          glowColorClass="bg-slate-50"
        />
      </div>

      {/* Área do Gráfico */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
        <div className="mb-2">
          <h2 className="text-lg font-bold text-slate-900">Picos de Movimento (Heatmap)</h2>
          <p className="text-slate-500 text-sm font-medium">Volume de vendas agrupado por hora.</p>
        </div>
        
        <SalesHeatmap data={stats.volumeByHour} />
      </div>

      {/* Tabela Top Produtos */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Ranking de Lucratividade</h2>
        {stats.topProducts.length === 0 ? (
          <p className="text-slate-400 text-sm">Dados insuficientes para gerar ranking.</p>
        ) : (
          <div className="space-y-3">
            {stats.topProducts.map((produto, index) => (
              <div key={index} className="flex justify-between items-center p-3 hover:bg-slate-50 rounded-xl transition-colors">
                <div className="flex items-center gap-3">
                  <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${index === 0 ? 'bg-amber-100 text-amber-700' : index === 1 ? 'bg-slate-200 text-slate-700' : index === 2 ? 'bg-orange-100 text-orange-800' : 'bg-slate-100 text-slate-500'}`}>
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-bold text-slate-900">{produto.nome}</p>
                    <p className="text-xs font-semibold text-slate-500">{produto.quantidadeTotal} vendidos</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-black text-emerald-600">{(produto.receitaTotalCentavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

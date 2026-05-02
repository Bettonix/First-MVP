"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { QrCode, Banknote, CreditCard, Star } from "lucide-react";

interface PaymentDistributionCardProps {
  data: Array<{ metodo: string; quantidade: number; totalCentavos: number }>;
}

const COLORS: Record<string, string> = {
  PIX:      "#10b981",
  DINHEIRO: "#3b82f6",
  MISTO:    "#f59e0b",
};
const DEFAULT_COLOR = "#94a3b8";

function MetodoIcon({ metodo }: { metodo: string }) {
  const cls = "shrink-0";
  if (metodo === "PIX")      return <QrCode     size={16} className={cls} />;
  if (metodo === "DINHEIRO") return <Banknote    size={16} className={cls} />;
  if (metodo === "MISTO")    return <CreditCard  size={16} className={cls} />;
  return <Star size={16} className={cls} />;
}

export function PaymentDistributionCard({ data }: PaymentDistributionCardProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 bg-slate-50 rounded-2xl border border-slate-100">
        <p className="text-slate-400 font-semibold text-sm">Sem dados de pagamento.</p>
      </div>
    );
  }

  const total = data.reduce((s, d) => s + d.totalCentavos, 0);
  const chartData = data.map((d) => ({ name: d.metodo, value: d.totalCentavos / 100 }));
  const best = data[0];

  return (
    <div className="flex flex-col gap-4">
      {/* Destaque — método mais usado */}
      <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
        <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
          <MetodoIcon metodo={best.metodo} />
        </div>
        <div>
          <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Método mais usado</p>
          <p className="font-black text-emerald-900 text-lg">{best.metodo}</p>
        </div>
        <div className="ml-auto text-right">
          <p className="font-black text-emerald-600">
            {(best.totalCentavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </p>
          <p className="text-xs text-emerald-500 font-semibold">
            {total > 0 ? ((best.totalCentavos / total) * 100).toFixed(0) : 0}% do total
          </p>
        </div>
      </div>

      <div className="flex items-center gap-6">
        {/* Pizza */}
        <div className="h-36 w-36 shrink-0 relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={38}
                outerRadius={58}
                paddingAngle={3}
                dataKey="value"
                animationDuration={600}
              >
                {chartData.map((entry) => (
                  <Cell key={entry.name} fill={COLORS[entry.name] ?? DEFAULT_COLOR} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload?.length) {
                    return (
                      <div className="bg-white/90 backdrop-blur-md p-2.5 rounded-xl border border-slate-200 shadow-lg">
                        <p className="text-slate-600 font-bold text-xs">{payload[0].name}</p>
                        <p className="text-slate-900 font-black text-sm">
                          {Number(payload[0].value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Lista */}
        <div className="flex flex-col gap-2 flex-1 min-w-0">
          {data.map((d) => {
            const pct = total > 0 ? (d.totalCentavos / total) * 100 : 0;
            const color = COLORS[d.metodo] ?? DEFAULT_COLOR;
            return (
              <div key={d.metodo} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
                <span className="text-slate-700 font-semibold text-sm flex-1 truncate">{d.metodo}</span>
                <span className="text-slate-500 text-xs font-bold">{pct.toFixed(0)}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

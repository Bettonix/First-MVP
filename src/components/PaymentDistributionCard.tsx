"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { QrCode, Banknote, CreditCard, Star } from "lucide-react";

interface PaymentDistributionCardProps {
  data: Array<{ metodo: string; quantidade: number; totalCentavos: number }>;
}

const COLORS: Record<string, string> = {
  PIX:      "#D35400",  /* brasa — laranja queimado */
  DINHEIRO: "#5C6B3A",  /* oliva — verde ervas */
  MISTO:    "#B7791F",  /* mel — âmbar */
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
      <div className="dash-empty flex flex-col items-center justify-center h-48 rounded-2xl">
        <p className="dash-subtitle font-semibold text-sm">Sem dados de pagamento.</p>
      </div>
    );
  }

  const total = data.reduce((s, d) => s + d.totalCentavos, 0);
  const chartData = data.map((d) => ({ name: d.metodo, value: d.totalCentavos / 100 }));
  const best = data[0];

  return (
    <div className="flex flex-col gap-4">
      {/* Destaque — método mais usado */}
      <div className="flex items-center gap-3 rounded-2xl p-4"
        style={{ backgroundColor: "var(--brasa-light)", border: "1px solid var(--brasa-border)", borderTop: "2px solid var(--brasa)" }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: "rgba(211,84,0,0.12)", color: "var(--brasa)" }}>
          <MetodoIcon metodo={best.metodo} />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--brasa-hover)" }}>Método mais usado</p>
          <p className="font-black text-lg" style={{ color: "var(--ink)" }}>{best.metodo}</p>
        </div>
        <div className="ml-auto text-right">
          <p className="font-black" style={{ color: "var(--brasa)" }}>
            {(best.totalCentavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </p>
          <p className="text-xs font-semibold" style={{ color: "var(--ink-3)" }}>
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
                      <div style={{ backgroundColor: "#FFFFFF", border: "1px solid rgba(45,45,45,0.12)", boxShadow: "0 4px 12px rgba(45,45,45,0.1)" }} className="p-2.5 rounded-xl">
                        <p style={{ color: "var(--ink-3)" }} className="font-bold text-xs">{payload[0].name}</p>
                        <p style={{ color: "var(--ink)" }} className="font-black text-sm">
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
                <span style={{ color: "var(--ink-2)" }} className="font-semibold text-sm flex-1 truncate">{d.metodo}</span>
                <span style={{ color: "var(--ink-4)" }} className="text-xs font-bold">{pct.toFixed(0)}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

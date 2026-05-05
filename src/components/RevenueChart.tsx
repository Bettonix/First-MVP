"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface RevenueChartProps {
  data: Array<{ date: string; totalCentavos: number }>;
}

export function RevenueChart({ data }: RevenueChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-slate-50 rounded-2xl border border-slate-100">
        <p className="text-slate-400 font-semibold text-sm">Sem dados para o período selecionado.</p>
      </div>
    );
  }

  const chartData = data.map((d) => ({
    date: d.date,
    valor: d.totalCentavos / 100,
  }));

  return (
    <div className="h-72 w-full mt-4 relative">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
          <defs>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#D35400" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#D35400" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(45,45,45,0.08)" />
          <XAxis
            dataKey="date"
            tick={{ fill: "#9A9A9A", fontSize: 11, fontWeight: 600 }}
            tickLine={false}
            axisLine={false}
            dy={8}
            interval="preserveStartEnd"
          />
          <YAxis
            tickFormatter={(v) => `R$${v}`}
            tick={{ fill: "#9A9A9A", fontSize: 11, fontWeight: 500 }}
            tickLine={false}
            axisLine={false}
            dx={-4}
          />
          <Tooltip
            cursor={{ stroke: "#D35400", strokeWidth: 1, strokeDasharray: "4 4" }}
            content={({ active, payload, label }) => {
              if (active && payload?.length) {
                return (
                  <div style={{ backgroundColor: "#FFFFFF", border: "1px solid rgba(45,45,45,0.12)", boxShadow: "0 4px 12px rgba(45,45,45,0.1)" }} className="p-3 rounded-xl">
                    <p style={{ color: "#9A9A9A" }} className="font-semibold text-xs mb-1">{label}</p>
                    <p style={{ color: "#D35400" }} className="font-black text-base">
                      {Number(payload[0].value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Area
            type="monotone"
            dataKey="valor"
            stroke="#D35400"
            strokeWidth={2.5}
            fill="url(#colorRevenue)"
            dot={false}
            activeDot={{ r: 5, fill: "#D35400", strokeWidth: 0 }}
            animationDuration={700}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

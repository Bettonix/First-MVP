"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface HeatmapData {
  hour: string;
  volumeCentavos: number;
}

export function SalesHeatmap({ data }: { data: HeatmapData[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-slate-50 rounded-2xl border border-slate-100">
        <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mb-4">
          <span className="text-2xl">📊</span>
        </div>
        <p className="text-slate-500 font-medium">Ainda não há vendas para este período.</p>
      </div>
    );
  }

  // Format data for Recharts
  const chartData = data.map(item => {
    const date = new Date(item.hour);
    return {
      horario: date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      valor: item.volumeCentavos / 100
    };
  });

  return (
    <div className="h-72 w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis 
            dataKey="horario" 
            tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }}
            tickLine={false}
            axisLine={false}
            dy={10}
          />
          <YAxis 
            tickFormatter={(value) => `R$ ${value}`} 
            tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
            tickLine={false}
            axisLine={false}
            dx={-10}
          />
          <Tooltip 
            cursor={{ fill: '#f1f5f9' }}
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-white/80 backdrop-blur-md p-3 rounded-xl border border-slate-200 shadow-lg">
                    <p className="text-slate-500 font-semibold text-xs mb-1">{label}</p>
                    <p className="text-emerald-600 font-black text-lg">
                      {Number(payload[0].value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar 
            dataKey="valor" 
            fill="#10b981" 
            radius={[6, 6, 0, 0]} 
            barSize={32}
            animationDuration={800} // Fast animation constraint
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

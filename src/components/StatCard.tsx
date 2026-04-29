import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  iconColorClass: string;
  iconBgClass: string;
  glowColorClass: string;
  trend?: {
    value: number;
    label: string;
  };
}

export function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  iconColorClass, 
  iconBgClass, 
  glowColorClass,
  trend 
}: StatCardProps) {
  const hasTrend = trend !== undefined && trend.value !== 0;
  const isPositive = hasTrend && trend.value > 0;
  
  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col justify-between h-32 relative overflow-hidden">
      <div className="flex justify-between items-start z-10">
        <div className="flex flex-col">
          <span className="text-slate-500 font-bold uppercase tracking-wider text-xs">{title}</span>
          {hasTrend && (
            <div className={`mt-1 flex items-center gap-1 text-xs font-bold px-1.5 py-0.5 rounded-full w-max ${isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
              {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              <span>{isPositive ? '+' : ''}{trend.value.toFixed(1)}% {trend.label}</span>
            </div>
          )}
        </div>
        <div className={`${iconBgClass} p-2 rounded-lg ${iconColorClass}`}>
          <Icon size={20} />
        </div>
      </div>
      
      <div className="flex flex-col z-10">
        <span className="text-3xl font-black text-slate-900 truncate" title={value}>{value}</span>
        {subtitle && <span className="text-slate-500 text-sm font-semibold truncate" title={subtitle}>{subtitle}</span>}
      </div>

      {/* Decoração minimalista */}
      <div className={`absolute -bottom-6 -right-6 w-32 h-32 ${glowColorClass} rounded-full blur-2xl pointer-events-none`} />
    </div>
  );
}

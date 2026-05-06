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
  trend,
}: StatCardProps) {
  const hasTrend = trend !== undefined && trend.value !== 0;
  const isPositive = hasTrend && trend.value > 0;

  return (
    <div className="dash-card rounded-3xl p-5 flex flex-col justify-between h-32 relative overflow-hidden"
      style={{ borderTop: "2px solid var(--brasa)" }}>
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-1">
          <span className="dash-label text-[10px] font-black uppercase tracking-widest">{title}</span>
          {hasTrend && (
            <div
              className="flex items-center gap-1 text-xs font-bold px-1.5 py-0.5 rounded-full w-max"
              style={isPositive
                ? { backgroundColor: "var(--success-bg)", color: "var(--success)" }
                : { backgroundColor: "var(--danger-bg)", color: "var(--danger)" }
              }
            >
              {isPositive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              <span>{isPositive ? "+" : ""}{trend.value.toFixed(1)}% {trend.label}</span>
            </div>
          )}
        </div>
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${iconBgClass} ${iconColorClass}`}>
          <Icon size={15} />
        </div>
      </div>

      <div className="flex flex-col">
        <span className="dash-value text-2xl font-black tabular-nums tracking-tight truncate" title={value}>
          {value}
        </span>
        {subtitle && (
          <span className="dash-subtitle text-xs font-semibold truncate" title={subtitle}>{subtitle}</span>
        )}
      </div>
    </div>
  );
}


"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

const PERIODS = [
  { label: "Hoje", value: "today" },
  { label: "7 Dias", value: "7d" },
  { label: "30 Dias", value: "30d" },
  { label: "Este Mês", value: "month" },
] as const;

type PeriodValue = (typeof PERIODS)[number]["value"];
const DEFAULT_PERIOD: PeriodValue = "30d";

function PeriodSelectorInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = (searchParams.get("period") ?? DEFAULT_PERIOD) as PeriodValue;

  function select(value: PeriodValue) {
    router.replace(`?period=${value}`, { scroll: false });
  }

  return (
    <div className="flex items-center gap-1 p-1 dash-card rounded-2xl">
      {PERIODS.map(({ label, value }) => (
        <button
          key={value}
          onClick={() => select(value)}
          className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all duration-200 whitespace-nowrap ${
            current === value ? "dash-pill-active" : "dash-pill-inactive"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function PeriodSelectorSkeleton() {
  return (
    <div className="flex items-center gap-1 p-1 dash-card rounded-2xl">
      {PERIODS.map(({ label, value }) => (
        <span
          key={value}
          className={`px-3 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap ${
            value === DEFAULT_PERIOD ? "dash-pill-active" : "dash-pill-inactive"
          }`}
        >
          {label}
        </span>
      ))}
    </div>
  );
}

export function PeriodSelector() {
  return (
    <Suspense fallback={<PeriodSelectorSkeleton />}>
      <PeriodSelectorInner />
    </Suspense>
  );
}

"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useTransition } from "react";
import { Filter, X } from "lucide-react";

const PERIODS = [
  { label: "Hoje",     value: "today" },
  { label: "7 Dias",   value: "7d"    },
  { label: "30 Dias",  value: "30d"   },
  { label: "Este Mês", value: "month" },
] as const;

type PeriodValue = (typeof PERIODS)[number]["value"];
const DEFAULT_PERIOD: PeriodValue = "30d";

const METODOS = [
  { label: "Todos",    value: ""         },
  { label: "PIX",      value: "PIX"      },
  { label: "Dinheiro", value: "DINHEIRO" },
  { label: "Misto",    value: "MISTO"    },
];

interface DashboardFiltersInnerProps {
  categorias: string[];
}

function DashboardFiltersInner({ categorias }: DashboardFiltersInnerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const period   = (searchParams.get("period")   ?? DEFAULT_PERIOD) as PeriodValue;
  const metodo   = searchParams.get("metodo")    ?? "";
  const categoria = searchParams.get("categoria") ?? "";

  const update = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      startTransition(() => {
        router.replace(`?${params.toString()}`, { scroll: false });
      });
    },
    [router, searchParams]
  );

  const hasActiveFilters = metodo !== "" || categoria !== "";

  const clearFilters = () => {
    const params = new URLSearchParams();
    params.set("period", period);
    startTransition(() => {
      router.replace(`?${params.toString()}`, { scroll: false });
    });
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 transition-opacity ${isPending ? "opacity-60" : "opacity-100"}`}>
      {/* Period pills */}
      <div className="flex items-center gap-1 p-1 dash-card rounded-2xl">
        {PERIODS.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => update("period", value)}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
              period === value ? "dash-pill-active" : "dash-pill-inactive"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Método de pagamento */}
      <div className="flex items-center gap-1 p-1 dash-card rounded-2xl">
        {METODOS.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => update("metodo", value)}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
              metodo === value ? "dash-pill-active" : "dash-pill-inactive"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Categoria — só aparece se houver categorias */}
      {categorias.length > 0 && (
        <div className="flex items-center gap-1 p-1 dash-card rounded-2xl">
          <button
            onClick={() => update("categoria", "")}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap flex items-center gap-1 ${
              categoria === "" ? "dash-pill-active" : "dash-pill-inactive"
            }`}
          >
            <Filter size={10} /> Todas
          </button>
          {categorias.map((cat) => (
            <button
              key={cat}
              onClick={() => update("categoria", cat)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
                categoria === cat ? "dash-pill-active" : "dash-pill-inactive"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Limpar filtros */}
      {hasActiveFilters && (
        <button
          onClick={clearFilters}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all dash-action-btn-danger"
        >
          <X size={11} /> Limpar filtros
        </button>
      )}
    </div>
  );
}

function DashboardFiltersSkeleton() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="h-9 w-64 dash-card rounded-2xl animate-pulse" />
      <div className="h-9 w-52 dash-card rounded-2xl animate-pulse" />
    </div>
  );
}

export function DashboardFilters({ categorias }: DashboardFiltersInnerProps) {
  return (
    <Suspense fallback={<DashboardFiltersSkeleton />}>
      <DashboardFiltersInner categorias={categorias} />
    </Suspense>
  );
}

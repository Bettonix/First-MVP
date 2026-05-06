"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function PdvError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[PDVError]", error);
  }, [error]);

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="flex flex-col items-center text-center gap-6 max-w-sm">
        <div className="w-16 h-16 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-center">
          <AlertTriangle size={28} className="text-rose-500" />
        </div>
        <div>
          <h2 className="text-xl font-black tracking-tighter dash-title mb-2">
            Erro ao carregar
          </h2>
          <p className="dash-subtitle text-sm leading-relaxed">
            {error.message || "Não foi possível carregar esta página. Verifique sua conexão e tente novamente."}
          </p>
          {error.digest && (
            <p className="dash-label text-xs mt-2 font-mono">ref: {error.digest}</p>
          )}
        </div>
        <div className="flex gap-3 w-full">
          <Link
            href="/"
            className="flex-1 h-11 dash-action-btn font-bold rounded-xl flex items-center justify-center gap-2 text-sm transition-all"
          >
            <ArrowLeft size={15} /> Início
          </Link>
          <button
            onClick={reset}
            className="flex-1 h-11 bg-[var(--brasa)] hover:bg-[var(--brasa-hover)] text-white font-black rounded-xl flex items-center justify-center gap-2 text-sm transition-all"
          >
            <RefreshCw size={15} /> Tentar de novo
          </button>
        </div>
      </div>
    </div>
  );
}

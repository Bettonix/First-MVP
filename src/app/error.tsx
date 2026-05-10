"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6"
      style={{ backgroundColor: "var(--parchment)" }}>
      <div className="flex flex-col items-center text-center gap-6 max-w-md">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ backgroundColor: "var(--danger-bg)" }}>
          <AlertTriangle size={28} style={{ color: "var(--danger)" }} />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tighter mb-2" style={{ color: "var(--ink)" }}>
            Algo deu errado
          </h1>
          <p className="text-sm" style={{ color: "var(--ink-3)" }}>
            Ocorreu um erro inesperado. Tente novamente ou recarregue a página.
          </p>
          {error.digest && (
            <p className="text-xs mt-2 font-mono" style={{ color: "var(--ink-4)" }}>#{error.digest}</p>
          )}
        </div>
        <button
          onClick={reset}
          className="h-12 px-8 text-white font-black rounded-2xl flex items-center gap-2 transition-all"
          style={{ backgroundColor: "var(--brasa)" }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--brasa-hover)")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--brasa)")}
        >
          <RefreshCw size={16} /> Tentar Novamente
        </button>
      </div>
    </div>
  );
}

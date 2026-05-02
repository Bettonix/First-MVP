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
    <html>
      <body className="bg-[#0B0D11] text-neutral-100 min-h-screen flex items-center justify-center p-6">
        <div className="flex flex-col items-center text-center gap-6 max-w-md">
          <div className="w-16 h-16 bg-rose-500/10 rounded-2xl flex items-center justify-center">
            <AlertTriangle size={28} className="text-rose-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter mb-2">Algo deu errado</h1>
            <p className="text-neutral-400 text-sm">
              Ocorreu um erro inesperado. Tente novamente ou recarregue a página.
            </p>
            {error.digest && (
              <p className="text-neutral-600 text-xs mt-2 font-mono">#{error.digest}</p>
            )}
          </div>
          <button
            onClick={reset}
            className="h-12 px-8 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl flex items-center gap-2 transition-all"
          >
            <RefreshCw size={16} /> Tentar Novamente
          </button>
        </div>
      </body>
    </html>
  );
}

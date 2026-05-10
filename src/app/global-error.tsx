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
    <html lang="pt-BR">
      <body style={{ backgroundColor: "#F9F7F2", color: "#2D2D2D", margin: 0, fontFamily: "system-ui, sans-serif" }}>
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "24px", maxWidth: "400px" }}>
            <div style={{ width: 64, height: 64, borderRadius: 16, backgroundColor: "#FEF2F2", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <AlertTriangle size={28} color="#9B1C1C" />
            </div>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.05em", marginBottom: 8 }}>
                Algo deu errado
              </h1>
              <p style={{ fontSize: 14, color: "#6B6B6B" }}>
                Ocorreu um erro crítico. Tente novamente ou recarregue a página.
              </p>
              {error.digest && (
                <p style={{ fontSize: 11, color: "#9A9A9A", marginTop: 8, fontFamily: "monospace" }}>
                  #{error.digest}
                </p>
              )}
            </div>
            <button onClick={reset}
              style={{ height: 48, padding: "0 32px", backgroundColor: "#D35400", color: "#fff", fontWeight: 900, borderRadius: 16, border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
              <RefreshCw size={16} /> Tentar Novamente
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}

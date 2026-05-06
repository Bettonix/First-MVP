"use client";

/**
 * ConnectivityToast
 *
 * Banner não-bloqueante que sinaliza estados de rede:
 *   • Offline  — âmbar, persiste até reconectar
 *   • Syncing  — verde pulsante, mostra progresso
 *   • Restored — verde, autohide após 3s
 *
 * Posicionado no topo da viewport com z-[190] (abaixo do
 * ChangeOverlay z-[150] mas acima de tudo mais).
 * Usa backdrop-blur leve para integrar com o design Premium.
 */

import { motion, AnimatePresence } from "framer-motion";
import { WifiOff, Loader2, CheckCircle2 } from "lucide-react";

interface ConnectivityToastProps {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  justReconnected: boolean;
}

export function ConnectivityToast({
  isOnline,
  isSyncing,
  pendingCount,
  justReconnected,
}: ConnectivityToastProps) {
  // Determina qual estado exibir
  const showOffline    = !isOnline;
  const showSyncing    = isOnline && isSyncing;
  const showRestored   = isOnline && !isSyncing && justReconnected;
  const isVisible      = showOffline || showSyncing || showRestored;

  type BannerState = "offline" | "syncing" | "restored";
  const state: BannerState = showOffline ? "offline" : showSyncing ? "syncing" : "restored";

  const config = {
    offline: {
      bg:     "rgba(146,64,14,0.08)",   // --warning tinted
      border: "rgba(146,64,14,0.18)",
      text:   "var(--warning)",
      icon:   <WifiOff size={13} />,
      label:  "Modo Offline Ativo",
      sub:    "Vendas sendo salvas localmente",
    },
    syncing: {
      bg:     "rgba(45,106,79,0.08)",   // --success tinted
      border: "rgba(45,106,79,0.18)",
      text:   "var(--success)",
      icon:   <Loader2 size={13} className="animate-spin" />,
      label:  "Conexão Restaurada",
      sub:    (() => { const vendas = pendingCount > 0 ? `${pendingCount} venda${pendingCount > 1 ? "s" : ""}` : "dados"; return `Sincronizando ${vendas}…`; })(),
    },
    restored: {
      bg:     "rgba(45,106,79,0.08)",
      border: "rgba(45,106,79,0.18)",
      text:   "var(--success)",
      icon:   <CheckCircle2 size={13} />,
      label:  "Tudo Sincronizado",
      sub:    "Todas as vendas foram enviadas",
    },
  } satisfies Record<BannerState, {
    bg: string; border: string; text: string;
    icon: React.ReactNode; label: string; sub: string;
  }>;

  const c = config[state];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key={state}
          initial={{ y: -56, opacity: 0 }}
          animate={{ y: 0,   opacity: 1 }}
          exit={{   y: -56, opacity: 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
          className="fixed top-0 inset-x-0 z-[190] flex justify-center pointer-events-none"
          aria-live="polite"
          aria-atomic="true"
        >
          <div
            data-testid={`connectivity-toast-${state}`}
            className="mt-3 mx-4 flex items-center gap-2.5 px-4 py-2.5 rounded-2xl pointer-events-auto"
            style={{
              backgroundColor: c.bg,
              border: `1px solid ${c.border}`,
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              boxShadow: "0 4px 16px rgba(45,45,45,0.08)",
              color: c.text,
            }}
          >
            {/* Icon */}
            <span className="shrink-0">{c.icon}</span>

            {/* Text */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black tracking-tight">{c.label}</span>
              <span className="text-[10px] font-semibold opacity-70">•</span>
              <span className="text-[10px] font-semibold opacity-70">{c.sub}</span>
            </div>

            {/* Offline pulse dot */}
            {showOffline && (
              <span className="shrink-0 w-1.5 h-1.5 rounded-full animate-pulse ml-1"
                style={{ backgroundColor: c.text }} />
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

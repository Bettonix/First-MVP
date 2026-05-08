"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, QrCode, Banknote, CreditCard, ShoppingBag } from "lucide-react";
import type { VendaDetalhe } from "@/app/actions/vendas";

interface SaleDetailSheetProps {
  sale: VendaDetalhe | null;
  onClose: () => void;
}

function fmt(centavos: number) {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function MetodoBadge({ metodo }: { metodo: string }) {
  const map: Record<string, { icon: React.ReactNode; cls: string }> = {
    PIX:      { icon: <QrCode    size={14} />, cls: "bg-[var(--brasa-light)] text-[var(--brasa)] border-[var(--brasa-border)]" },
    DINHEIRO: { icon: <Banknote  size={14} />, cls: "bg-[var(--oliva-light)] text-[var(--oliva)] border-[rgba(92,107,58,0.2)]" },
    MISTO:    { icon: <CreditCard size={14} />, cls: "bg-[var(--mel-light)]   text-[var(--mel)]   border-[rgba(183,121,31,0.2)]" },
  };
  const { icon, cls } = map[metodo] ?? { icon: null, cls: "dash-muted dash-label border dash-border" };
  return (
    <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold uppercase tracking-wide ${cls}`}>
      {icon} {metodo}
    </span>
  );
}

export function SaleDetailSheet({ sale, onClose }: SaleDetailSheetProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sale) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [sale, onClose]);

  if (!sale || typeof document === "undefined") return null;

  const subtotal = sale.itens.reduce((s, i) => s + i.precoCentavos * i.quantidade, 0);

  const content = (
    <>
      {/* Overlay */}
      <div
        ref={overlayRef}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9000] transition-opacity"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-md z-[9001] flex flex-col
        dash-card border-l dash-border shadow-2xl
        animate-in slide-in-from-right duration-300"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b dash-border">
          <div>
            <p className="text-xs font-bold dash-label uppercase tracking-widest">Detalhes da Venda</p>
            <h2 className="text-xl font-black dash-title mt-0.5">Venda #{sale.id.slice(-6)}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-11 h-11 rounded-xl dash-action-btn flex items-center justify-center transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Meta */}
        <div className="flex items-center gap-3 px-6 py-4 border-b dash-border">
          <MetodoBadge metodo={sale.metodoPagto} />
          <span className="text-xs dash-label font-semibold">
            {new Date(sale.criadoEm).toLocaleString("pt-BR", {
              day: "2-digit", month: "2-digit", year: "numeric",
              hour: "2-digit", minute: "2-digit",
            })}
          </span>
        </div>

        {/* Items list */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
          <p className="text-xs font-bold dash-label uppercase tracking-widest mb-3 flex items-center gap-2">
            <ShoppingBag size={12} /> Itens ({sale.itens.length})
          </p>
          {sale.itens.map((item, i) => (
            <div
              key={`item-${i}`}
              className="flex items-center justify-between dash-card-muted border dash-border rounded-xl p-4"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 dash-muted rounded-lg flex items-center justify-center shrink-0">
                  <span className="text-xs font-black dash-label">{item.quantidade}×</span>
                </div>
                <span className="font-semibold dash-value text-sm truncate">{item.nome}</span>
              </div>
              <div className="text-right shrink-0 ml-3">
                <p className="font-black dash-value text-sm tabular-nums">
                  {fmt(item.precoCentavos * item.quantidade)}
                </p>
                <p className="text-xs dash-label font-medium">{fmt(item.precoCentavos)} / un</p>
              </div>
            </div>
          ))}
        </div>

        {/* Summary footer */}
        <div className="border-t dash-border px-6 py-5 space-y-2.5">
          <div className="flex justify-between text-sm">
            <span className="dash-label font-semibold">Subtotal</span>
            <span className="dash-value font-bold tabular-nums">{fmt(subtotal)}</span>
          </div>
          {subtotal !== sale.totalCentavos && (
            <div className="flex justify-between text-sm">
              <span className="dash-label font-semibold">Ajuste</span>
              <span className="text-amber-600 font-bold tabular-nums">
                {fmt(sale.totalCentavos - subtotal)}
              </span>
            </div>
          )}
          <div className="flex justify-between items-center pt-2 border-t dash-border">
            <span className="dash-label font-bold">Total</span>
            <span className="text-2xl font-black text-[var(--brasa)] tabular-nums tracking-tighter">
              {fmt(sale.totalCentavos)}
            </span>
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(content, document.body);
}

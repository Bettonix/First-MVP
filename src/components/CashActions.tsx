"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { ArrowDownToLine, ArrowUpFromLine, Lock, Unlock, Loader2, X, MoreVertical } from "lucide-react";
import { abrirTurno, fecharTurno, registrarMovimentacao } from "@/app/actions/turnos";
import { useRouter } from "next/navigation";
import { fmtBRL, safeCentavos } from "@/lib/currency";
import { motion, AnimatePresence } from "framer-motion";

export function CashActions({ isTurnoAberto, insights, onMessage }: { isTurnoAberto: boolean, insights?: any, onMessage?: (msg: string, type: 'success' | 'error') => void }) {
  const [modalType, setModalType] = useState<'ABRIR' | 'FECHAR' | 'SANGRIA' | 'REFORCO' | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const [valor, setValor] = useState("");
  const [motivo, setMotivo] = useState("");
  const [loading, setLoading] = useState(false);
  const [, startTransition] = useTransition();
  const router = useRouter();

  const fmt = (cents: number | null | undefined) => fmtBRL(safeCentavos(cents));

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const openAction = (type: 'ABRIR' | 'FECHAR' | 'SANGRIA' | 'REFORCO') => {
    setMenuOpen(false);
    setModalType(type);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const v = Number(valor);

      if (modalType === 'ABRIR') {
        const res = await abrirTurno({ valorInicial: v });
        if (!res.success) onMessage?.(res.error || "Erro ao abrir turno", 'error');
        else onMessage?.("Turno aberto com sucesso!", 'success');
      } else if (modalType === 'FECHAR') {
        const res = await fecharTurno({ valorFinalInformado: v });
        if (res.success && res.relatorio) {
          onMessage?.(`Turno Fechado! Esperado: R$ ${res.relatorio.esperado.toFixed(2)} | Informado: R$ ${res.relatorio.informado.toFixed(2)}`, 'success');
        } else {
          onMessage?.(res.error || "Erro ao fechar turno", 'error');
        }
      } else if (modalType === 'SANGRIA') {
        const res = await registrarMovimentacao({ tipo: 'SAIDA', valor: v, motivo });
        if (!res.success) onMessage?.(res.error || "Erro na sangria", 'error');
        else onMessage?.("Sangria registrada!", 'success');
      } else if (modalType === 'REFORCO') {
        const res = await registrarMovimentacao({ tipo: 'ENTRADA', valor: v, motivo });
        if (!res.success) onMessage?.(res.error || "Erro no reforço", 'error');
        else onMessage?.("Reforço registrado!", 'success');
      }

      if (modalType === 'ABRIR' || modalType === 'FECHAR') {
        startTransition(() => router.refresh());
      }

      setModalType(null);
      setValor("");
      setMotivo("");
    } finally {
      setLoading(false);
    }
  };

  const modalTitles: Record<string, string> = {
    ABRIR: 'Abrir Turno',
    FECHAR: 'Fechar Turno',
    SANGRIA: 'Retirar Dinheiro',
    REFORCO: 'Adicionar Troco',
  };

  const modalLabels: Record<string, string> = {
    ABRIR: 'Troco Inicial na Gaveta (R$)',
    FECHAR: 'Dinheiro Total na Gaveta (R$)',
    SANGRIA: 'Valor (R$)',
    REFORCO: 'Valor (R$)',
  };

  return (
    <>
      {/* Trigger — ícone único no cabeçalho */}
      <div ref={menuRef} className="relative">
        <button
          onClick={() => setMenuOpen(v => !v)}
          aria-label="Ações do caixa"
          aria-expanded={menuOpen}
          className={`
            p-2.5 rounded-xl transition-colors duration-150
            ${menuOpen
              ? 'bg-white/10 text-neutral-100'
              : 'hover:bg-white/5 active:bg-white/10 text-neutral-400 hover:text-neutral-200'
            }
          `}
        >
          <MoreVertical size={18} />
        </button>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -6 }}
              transition={{ duration: 0.13, ease: [0.16, 1, 0.3, 1] }}
              className="absolute right-0 top-full mt-2 z-50 min-w-[190px] bg-[#1C2028] border border-white/[0.08] rounded-2xl shadow-2xl shadow-black/60 overflow-hidden"
            >
              {!isTurnoAberto ? (
                <button
                  onClick={() => openAction('ABRIR')}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-semibold text-emerald-400 hover:bg-white/5 transition-colors duration-100"
                >
                  <Unlock size={15} />
                  Abrir Caixa
                </button>
              ) : (
                <>
                  <button
                    onClick={() => openAction('SANGRIA')}
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-semibold text-neutral-300 hover:bg-white/5 transition-colors duration-100"
                  >
                    <ArrowUpFromLine size={15} className="text-rose-400" />
                    Sangria
                  </button>
                  <button
                    onClick={() => openAction('REFORCO')}
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-semibold text-neutral-300 hover:bg-white/5 transition-colors duration-100"
                  >
                    <ArrowDownToLine size={15} className="text-emerald-400" />
                    Reforço
                  </button>
                  <div className="h-px bg-white/[0.06] mx-3" />
                  <button
                    onClick={() => openAction('FECHAR')}
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-semibold text-neutral-400 hover:bg-white/5 hover:text-neutral-200 transition-colors duration-100"
                  >
                    <Lock size={15} className="text-amber-500/80" />
                    Fechar Caixa
                  </button>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modal Bottom Sheet — inalterado */}
      {modalType && (
        <div
          className="fixed inset-0 z-50 flex items-end lg:items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setModalType(null)}
        >
          <div
            className="bg-[#13161A] w-full lg:w-[420px] rounded-t-3xl lg:rounded-3xl p-6 pb-8 shadow-2xl border border-neutral-800"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag Handle (Mobile) */}
            <div className="w-10 h-1 bg-neutral-700 rounded-full mx-auto mb-5 lg:hidden" />

            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-bold text-neutral-100">
                {modalTitles[modalType]}
              </h3>
              <button
                onClick={() => setModalType(null)}
                className="p-1.5 hover:bg-neutral-800 rounded-full transition-colors"
              >
                <X size={18} className="text-neutral-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {modalType === 'FECHAR' && insights && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-2 space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-neutral-400">Vendas do Turno (Din+Pix)</span>
                    <span className="font-bold text-neutral-200">{fmt(insights.totalHojeCentavos || 0)}</span>
                  </div>
                  <div className="h-px bg-white/10 w-full" />
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-400 font-bold uppercase tracking-wider text-[10px]">Saldo Esperado Gaveta</span>
                    <span className="font-black text-emerald-400 text-xl tracking-tighter">{fmt(insights.vaultCentavos || 0)}</span>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">
                  {modalLabels[modalType]}
                </label>
                <input
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  autoFocus
                  required
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  placeholder="0,00"
                  className="
                    w-full py-3 px-4
                    bg-[#191D24] text-neutral-100 text-2xl font-bold tabular-nums
                    placeholder:text-neutral-600
                    border border-neutral-700/50 rounded-xl
                    outline-none transition-all duration-150
                    focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20
                  "
                />
              </div>

              {(modalType === 'SANGRIA' || modalType === 'REFORCO') && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                    Motivo
                  </label>
                  <input
                    type="text"
                    required
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    placeholder="Ex: Troco, pagamento fornecedor..."
                    className="
                      w-full py-3 px-4
                      bg-[#191D24] text-neutral-100 text-base font-medium
                      placeholder:text-neutral-600
                      border border-neutral-700/50 rounded-xl
                      outline-none transition-all duration-150
                      focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20
                    "
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="
                  w-full h-12 mt-1
                  bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700
                  disabled:bg-neutral-800 disabled:text-neutral-600
                  text-white font-bold text-sm rounded-xl
                  flex justify-center items-center gap-2
                  transition-all duration-150 active:scale-[0.98]
                "
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : 'CONFIRMAR'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

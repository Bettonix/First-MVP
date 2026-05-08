"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { ArrowDownToLine, ArrowUpFromLine, Lock, Unlock, Loader2, X, MoreVertical } from "lucide-react";
import { abrirTurno, fecharTurno, registrarMovimentacao } from "@/app/actions/turnos";
import { useRouter } from "next/navigation";
import { fmtBRL, safeCentavos } from "@/lib/currency";
import { motion, AnimatePresence } from "framer-motion";
import { InfoTooltip } from "./ui/InfoTooltip";

export function CashActions({ isTurnoAberto, insights, onMessage }: { isTurnoAberto: boolean, insights?: { totalHojeCentavos?: number; vaultCentavos?: number }, onMessage?: (msg: string, type: 'success' | 'error') => void }) {
  const [modalType, setModalType] = useState<'ABRIR' | 'FECHAR' | 'SANGRIA' | 'REFORCO' | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const [valor, setValor] = useState("");
  const [motivo, setMotivo] = useState("");
  const [isPending, startTransition] = useTransition();
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

  const executarAcao = async (tipo: NonNullable<typeof modalType>, v: number) => {
    if (tipo === 'ABRIR') {
      const res = await abrirTurno({ valorInicial: v });
      onMessage?.(res.success ? "Turno aberto com sucesso!" : (res.error || "Erro ao abrir turno"), res.success ? 'success' : 'error');
    } else if (tipo === 'FECHAR') {
      const res = await fecharTurno({ valorFinalInformado: v });
      if (res.success && res.relatorio) {
        onMessage?.(`Turno Fechado! Esperado: R$ ${res.relatorio.esperado.toFixed(2)} | Informado: R$ ${res.relatorio.informado.toFixed(2)}`, 'success');
      } else {
        onMessage?.(res.error || "Erro ao fechar turno", 'error');
      }
    } else if (tipo === 'SANGRIA') {
      const res = await registrarMovimentacao({ tipo: 'SAIDA', valor: v, motivo });
      onMessage?.(res.success ? "Sangria registrada!" : (res.error || "Erro na sangria"), res.success ? 'success' : 'error');
    } else {
      const res = await registrarMovimentacao({ tipo: 'ENTRADA', valor: v, motivo });
      onMessage?.(res.success ? "Reforço registrado!" : (res.error || "Erro no reforço"), res.success ? 'success' : 'error');
    }
  };

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!modalType) return;

    startTransition(async () => {
      try {
        await executarAcao(modalType, Number(valor));
        if (modalType === 'ABRIR' || modalType === 'FECHAR') router.refresh();
        setModalType(null);
        setValor("");
        setMotivo("");
      } catch {
        onMessage?.("Erro inesperado. Tente novamente.", 'error');
      }
    });
  };

  const modalTitles: Record<string, string> = {
    ABRIR: 'Abrir Turno',
    FECHAR: 'Fechar Turno',
    SANGRIA: 'Retirar Dinheiro',
    REFORCO: 'Adicionar Troco',
  };

  const modalTooltips: Record<string, string> = {
    ABRIR: 'Valor em dinheiro que você coloca na gaveta para dar troco. Não é receita.',
    FECHAR: 'Conte o dinheiro físico na gaveta e informe o total. O sistema calculará a diferença.',
    SANGRIA: 'Retirada de dinheiro da gaveta. Ex: pagar fornecedor, guardar excesso.',
    REFORCO: 'Adição de dinheiro na gaveta. Ex: repor troco quando o caixa está baixo.',
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
            min-w-[44px] min-h-[44px] p-2.5 rounded-xl transition-colors duration-150 flex items-center justify-center
            ${menuOpen
              ? 'dash-pill-active'
              : 'dash-pill-inactive hover:dash-value'
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
              className="absolute right-0 top-full mt-2 z-50 min-w-[190px] dash-card border dash-border rounded-2xl shadow-lg overflow-hidden"
            >
              {!isTurnoAberto ? (
                <button
                  onClick={() => openAction('ABRIR')}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-semibold dash-highlight-text dash-row-hover transition-colors duration-100"
                >
                  <Unlock size={15} />
                  Abrir Caixa
                </button>
              ) : (
                <>
                  <button
                    onClick={() => openAction('SANGRIA')}
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-semibold dash-value dash-row-hover transition-colors duration-100"
                  >
                    <ArrowUpFromLine size={15} className="text-rose-400" />
                    Sangria
                  </button>
                  <button
                    onClick={() => openAction('REFORCO')}
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-semibold dash-value dash-row-hover transition-colors duration-100"
                  >
                    <ArrowDownToLine size={15} style={{ color: "var(--oliva)" }} />
                    Reforço
                  </button>
                  <div className="h-px dash-divider mx-3" />
                  <button
                    onClick={() => openAction('FECHAR')}
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-semibold dash-label dash-row-hover hover:dash-value transition-colors duration-100"
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

      {/* Modal Bottom Sheet */}
      {modalType && (
        <div
          className="fixed inset-0 z-50 flex items-end lg:items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setModalType(null)}
        >
          <div
            className="dash-card w-full lg:w-[420px] rounded-t-3xl lg:rounded-3xl p-6 pb-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag Handle (Mobile) */}
            <div className="w-10 h-1 rounded-full mx-auto mb-5 lg:hidden" style={{ backgroundColor: "var(--border-md)" }} />

            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-bold dash-title">
                {modalTitles[modalType]}
              </h3>
              <button
                onClick={() => setModalType(null)}
                className="p-1.5 rounded-full transition-colors hover:bg-[var(--muted)]"
              >
                <X size={18} className="dash-label" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {modalType === 'FECHAR' && insights && (
                <div className="rounded-xl p-4 mb-2 space-y-3 dash-card-muted">
                  <div className="flex justify-between items-center text-sm">
                    <span className="dash-subtitle flex items-center gap-1.5">
                      Vendas do Turno (Din+Pix)
                      <InfoTooltip text="Total de vendas pagas em Dinheiro e PIX neste turno. Cartão não entra na gaveta." position="right" />
                    </span>
                    <span className="font-bold dash-value">{fmt(insights.totalHojeCentavos || 0)}</span>
                  </div>
                  <div className="h-px w-full" style={{ backgroundColor: "var(--border)" }} />
                  <div className="flex justify-between items-center">
                    <span className="dash-label font-bold uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                      Saldo Esperado Gaveta
                      <InfoTooltip text="Valor que deveria estar fisicamente na gaveta: fundo de caixa + vendas em dinheiro − sangrias + reforços." position="right" />
                    </span>
                    <span className="font-black text-xl tracking-tighter" style={{ color: "var(--brasa)" }}>{fmt(insights.vaultCentavos || 0)}</span>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black dash-label uppercase tracking-widest flex items-center gap-1.5">
                  {modalLabels[modalType]}
                  <InfoTooltip text={modalTooltips[modalType]} position="right" />
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
                  className="dash-input w-full py-3 px-4 text-2xl font-bold tabular-nums rounded-xl outline-none transition-all duration-150 focus:ring-2 focus:ring-[rgba(211,84,0,0.2)] focus:border-[var(--brasa)]"
                />
              </div>

              {(modalType === 'SANGRIA' || modalType === 'REFORCO') && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold dash-label uppercase tracking-wider">
                    Motivo
                  </label>
                  <input
                    type="text"
                    required
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    placeholder="Ex: Troco, pagamento fornecedor..."
                    className="dash-input w-full py-3 px-4 text-base font-medium rounded-xl outline-none transition-all duration-150 focus:ring-2 focus:ring-[rgba(211,84,0,0.2)] focus:border-[var(--brasa)]"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={isPending}
                className="w-full h-12 mt-1 bg-[var(--brasa)] hover:bg-[var(--brasa-hover)] disabled:opacity-40 text-white font-bold text-sm rounded-xl flex justify-center items-center gap-2 transition-all duration-150 active:scale-[0.98]"
              >
                {isPending ? <Loader2 size={18} className="animate-spin" /> : 'CONFIRMAR'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

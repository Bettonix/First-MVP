"use client";

/**
 * InventoryReconciliationSheet
 *
 * Drawer lateral que lista todos os produtos com needsReconciliation = true.
 * Para cada produto, o gerente pode:
 *   1. Digitar a contagem física real → "Aplicar Ajuste"
 *   2. Clicar "Zerar Estoque" → define estoqueAtual = 0
 *
 * Linguagem: profissional e neutra — "Ajuste Necessário", não "erro" ou "roubo".
 */

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Package, CheckCircle2, Loader2, RotateCcw, ClipboardCheck } from "lucide-react";
import { reconciliarProduto, type ProdutoInconsistente } from "@/app/actions/reconciliacao";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  produtos: ProdutoInconsistente[];
}

interface ItemState {
  contagem: string;   // valor do input
  status: "idle" | "saving" | "done" | "error";
  errorMsg?: string;
}

export function InventoryReconciliationSheet({ isOpen, onClose, produtos }: Props) {
  const queryClient = useQueryClient();
  const [, startTransition] = useTransition();

  // Estado por produto
  const [itemStates, setItemStates] = useState<Record<string, ItemState>>(() =>
    Object.fromEntries(produtos.map(p => [p.id, { contagem: "", status: "idle" }]))
  );

  const setItem = (id: string, patch: Partial<ItemState>) =>
    setItemStates(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  const handleAjuste = (produto: ProdutoInconsistente, novoEstoque: number) => {
    setItem(produto.id, { status: "saving" });
    startTransition(async () => {
      const res = await reconciliarProduto(produto.id, novoEstoque);
      if (res.success) {
        setItem(produto.id, { status: "done" });
        queryClient.invalidateQueries({ queryKey: ["produtos-inconsistentes"] });
        queryClient.invalidateQueries({ queryKey: ["produtos-catalogo"] });
      } else {
        setItem(produto.id, { status: "error", errorMsg: res.error });
      }
    });
  };

  const pendentes = produtos.filter(p => itemStates[p.id]?.status !== "done");
  const allDone   = pendentes.length === 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[120] flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 340, damping: 32 }}
            className="relative w-full max-w-md h-full flex flex-col shadow-2xl"
            style={{ backgroundColor: "var(--porcelana)" }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b"
              style={{ borderColor: "var(--border-md)" }}>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <ClipboardCheck size={16} style={{ color: "var(--warning)" }} />
                  <h2 className="text-lg font-black tracking-tight" style={{ color: "var(--ink)" }}>
                    Ajuste de Estoque
                  </h2>
                </div>
                <p className="text-xs font-medium" style={{ color: "var(--ink-3)" }}>
                  {allDone
                    ? "Todos os ajustes foram aplicados."
                    : `${pendentes.length} produto${pendentes.length > 1 ? "s" : ""} aguardando verificação física`}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl transition-colors"
                style={{ color: "var(--ink-3)" }}
                aria-label="Fechar"
              >
                <X size={18} />
              </button>
            </div>

            {/* All done state */}
            {allDone && (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6">
                <div className="w-14 h-14 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: "var(--success-bg)" }}>
                  <CheckCircle2 size={28} style={{ color: "var(--success)" }} />
                </div>
                <p className="text-base font-black" style={{ color: "var(--ink)" }}>Estoque Reconciliado</p>
                <p className="text-sm text-center font-medium" style={{ color: "var(--ink-3)" }}>
                  Todos os ajustes foram registrados com sucesso.
                </p>
                <button
                  onClick={onClose}
                  className="mt-4 px-6 py-2.5 rounded-xl font-bold text-sm text-white transition-all active:scale-95"
                  style={{ backgroundColor: "var(--brasa)" }}
                >
                  Fechar
                </button>
              </div>
            )}

            {/* Product list */}
            {!allDone && (
              <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
                {produtos.map(produto => {
                  const state = itemStates[produto.id] ?? { contagem: "", status: "idle" };
                  if (state.status === "done") return null;

                  const contagemNum = parseInt(state.contagem, 10);
                  const contagemValida = !isNaN(contagemNum) && contagemNum >= 0;

                  return (
                    <motion.div
                      key={produto.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: 40 }}
                      className="rounded-2xl border p-4 flex flex-col gap-3"
                      style={{
                        backgroundColor: "var(--muted)",
                        borderColor: "var(--border-md)",
                        borderLeft: "3px solid var(--warning)",
                      }}
                    >
                      {/* Product info */}
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                          style={{ backgroundColor: "var(--warning-bg)", color: "var(--warning)" }}>
                          <Package size={15} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-sm truncate" style={{ color: "var(--ink)" }}>
                            {produto.nome}
                          </p>
                          <p className="text-[10px] font-semibold uppercase tracking-wider mt-0.5"
                            style={{ color: "var(--ink-4)" }}>
                            {produto.categoria}
                          </p>
                        </div>
                        {/* Current stock badge */}
                        <div className="shrink-0 px-2.5 py-1 rounded-lg text-xs font-black tabular-nums"
                          style={{
                            backgroundColor: produto.estoqueAtual < 0 ? "var(--danger-bg)" : "var(--warning-bg)",
                            color: produto.estoqueAtual < 0 ? "var(--danger)" : "var(--warning)",
                          }}>
                          {produto.estoqueAtual < 0 ? "" : ""}{produto.estoqueAtual} un
                        </div>
                      </div>

                      {/* Input row */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest"
                          style={{ color: "var(--ink-3)" }}>
                          Contagem Física Real
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            min="0"
                            inputMode="numeric"
                            placeholder="Ex: 12"
                            value={state.contagem}
                            onChange={e => setItem(produto.id, { contagem: e.target.value, status: "idle" })}
                            className="flex-1 h-10 px-3 rounded-xl text-sm font-bold outline-none transition-all"
                            style={{
                              backgroundColor: "var(--porcelana)",
                              border: "1px solid var(--border-md)",
                              color: "var(--ink)",
                            }}
                            onFocus={e => e.target.style.borderColor = "var(--brasa)"}
                            onBlur={e => e.target.style.borderColor = "var(--border-md)"}
                          />
                          {/* Apply button */}
                          <button
                            onClick={() => handleAjuste(produto, contagemNum)}
                            disabled={!contagemValida || state.status === "saving"}
                            className="h-10 px-4 rounded-xl font-black text-xs text-white transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                            style={{ backgroundColor: "var(--brasa)" }}
                          >
                            {state.status === "saving"
                              ? <Loader2 size={14} className="animate-spin" />
                              : "Aplicar"
                            }
                          </button>
                          {/* Zero button */}
                          <button
                            onClick={() => handleAjuste(produto, 0)}
                            disabled={state.status === "saving"}
                            title="Zerar estoque (prateleira vazia)"
                            className="h-10 w-10 rounded-xl flex items-center justify-center transition-all active:scale-95 disabled:opacity-40"
                            style={{
                              backgroundColor: "var(--danger-bg)",
                              color: "var(--danger)",
                              border: "1px solid var(--danger-border)",
                            }}
                          >
                            <RotateCcw size={13} />
                          </button>
                        </div>
                        {state.status === "error" && (
                          <p className="text-xs font-semibold" style={{ color: "var(--danger)" }}>
                            {state.errorMsg ?? "Erro ao salvar. Tente novamente."}
                          </p>
                        )}
                      </div>

                      {/* Inconsistency date */}
                      <p className="text-[10px] font-medium" style={{ color: "var(--ink-4)" }}>
                        Divergência detectada em{" "}
                        {new Date(produto.lastInconsistency).toLocaleDateString("pt-BR", {
                          day: "2-digit", month: "short", year: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </p>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* Footer hint */}
            {!allDone && (
              <div className="px-6 py-4 border-t" style={{ borderColor: "var(--border)" }}>
                <p className="text-[10px] font-medium text-center" style={{ color: "var(--ink-4)" }}>
                  Cada ajuste é registrado no histórico de movimentações para auditoria.
                </p>
              </div>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}

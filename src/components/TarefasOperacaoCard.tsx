"use client";

/**
 * TarefasOperacaoCard
 *
 * Card de ação prioritária no Dashboard principal.
 * Aparece apenas quando há produtos com needsReconciliation = true.
 * Abre o InventoryReconciliationSheet ao clicar.
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { ClipboardCheck, ChevronRight, AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getProdutosInconsistentes, type ProdutoInconsistente } from "@/app/actions/reconciliacao";
import { InventoryReconciliationSheet } from "./InventoryReconciliationSheet";

export function TarefasOperacaoCard() {
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data: inconsistentes = [], isLoading } = useQuery({
    queryKey: ["produtos-inconsistentes"],
    queryFn: getProdutosInconsistentes,
    staleTime: 60_000,
  });

  if (isLoading || inconsistentes.length === 0) return null;

  const negativos = inconsistentes.filter((p: ProdutoInconsistente) => p.estoqueAtual < 0);

  return (
    <>
      <motion.section
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle size={13} style={{ color: "var(--warning)" }} />
          <h2 className="text-[11px] font-black uppercase tracking-widest"
            style={{ color: "var(--warning)" }}>
            Tarefas de Operação
          </h2>
        </div>

        <button
          onClick={() => setSheetOpen(true)}
          className="w-full text-left rounded-2xl border p-4 flex items-center gap-4 transition-all hover:shadow-md active:scale-[0.99]"
          style={{
            backgroundColor: "var(--warning-bg)",
            borderColor: "rgba(146,64,14,0.2)",
            borderLeft: "3px solid var(--warning)",
          }}
        >
          {/* Icon */}
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: "rgba(146,64,14,0.12)", color: "var(--warning)" }}>
            <ClipboardCheck size={18} />
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <p className="font-black text-sm" style={{ color: "var(--ink)" }}>
              Ajuste de Estoque Necessário
            </p>
            <p className="text-xs font-medium mt-0.5" style={{ color: "var(--ink-3)" }}>
              {inconsistentes.length} produto{inconsistentes.length > 1 ? "s" : ""} aguardando verificação
              {negativos.length > 0 && (
                <span style={{ color: "var(--danger)" }}>
                  {" "}· {negativos.length} com estoque negativo
                </span>
              )}
            </p>
          </div>

          {/* Badges */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="px-2.5 py-1 rounded-full text-xs font-black"
              style={{ backgroundColor: "rgba(146,64,14,0.15)", color: "var(--warning)" }}>
              {inconsistentes.length}
            </span>
            <ChevronRight size={15} style={{ color: "var(--ink-3)" }} />
          </div>
        </button>
      </motion.section>

      <InventoryReconciliationSheet
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        produtos={inconsistentes}
      />
    </>
  );
}

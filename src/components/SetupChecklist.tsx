"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Package, ShoppingCart, Settings, Check, ChevronDown, ChevronUp, X } from "lucide-react";

const TASKS = [
  {
    id: "produto",
    label: "Criar um Produto",
    desc: "Adicione seu primeiro item ao cardápio",
    href: "/settings",
    icon: Package,
  },
  {
    id: "venda",
    label: "Realizar Venda de Teste",
    desc: "Faça sua primeira venda no balcão",
    href: "/app",
    icon: ShoppingCart,
  },
  {
    id: "perfil",
    label: "Configurar Perfil",
    desc: "Personalize nome da loja e métodos de pagamento",
    href: "/settings",
    icon: Settings,
  },
] as const;

type TaskId = (typeof TASKS)[number]["id"];

export function SetupChecklist() {
  const [done, setDone]         = useState<Set<TaskId>>(new Set());
  const [open, setOpen]         = useState(true);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const total    = TASKS.length;
  const completed = done.size;
  const pct      = Math.round((completed / total) * 100);
  const allDone  = completed === total;

  const toggle = (id: TaskId) =>
    setDone((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="rounded-2xl border overflow-hidden"
      data-testid="setup-checklist"
      style={{
        borderColor: "var(--border-md)",
        backgroundColor: "var(--porcelana)",
        boxShadow: "0 2px 12px rgba(45,45,45,0.06)",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-black uppercase tracking-widest" style={{ color: "var(--brasa)" }}>
              Primeiros passos
            </span>
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
              style={{
                backgroundColor: allDone ? "var(--brasa-light)" : "var(--border)",
                color: allDone ? "var(--brasa)" : "var(--ink-3)",
              }}
            >
              {completed}/{total}
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--border)" }}>
            <motion.div
              className="h-full rounded-full"
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              style={{ backgroundColor: "var(--brasa)" }}
            />
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setOpen((v) => !v)}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-black/5"
            aria-label={open ? "Recolher" : "Expandir"}
            style={{ color: "var(--ink-3)" }}
          >
            {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-black/5"
            aria-label="Fechar checklist"
            style={{ color: "var(--ink-4)" }}
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Task list */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
            <div className="px-3 pb-3 space-y-1.5">
              {TASKS.map(({ id, label, desc, href, icon: Icon }) => {
                const isDone = done.has(id);
                return (
                  <div
                    key={id}
                    className="flex items-center gap-3 p-3 rounded-xl transition-all"
                    style={{
                      backgroundColor: isDone ? "var(--brasa-light)" : "var(--parchment, #F9F7F2)",
                      opacity: isDone ? 0.7 : 1,
                    }}
                  >
                    <button
                      onClick={() => toggle(id)}
                      className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all"
                      aria-label={isDone ? `Desmarcar ${label}` : `Marcar ${label} como feito`}
                      style={{
                        borderColor: isDone ? "var(--brasa)" : "var(--border-md)",
                        backgroundColor: isDone ? "var(--brasa)" : "transparent",
                      }}
                    >
                      {isDone && <Check size={10} className="text-white" strokeWidth={3} />}
                    </button>

                    <div className="flex-1 min-w-0">
                      <p
                        className="text-sm font-bold leading-tight"
                        style={{
                          color: isDone ? "var(--ink-3)" : "var(--ink)",
                          textDecoration: isDone ? "line-through" : "none",
                        }}
                      >
                        {label}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--ink-4)" }}>
                        {desc}
                      </p>
                    </div>

                    {!isDone && (
                      <Link
                        href={href}
                        className="text-xs font-bold px-3 py-1.5 rounded-lg transition-all shrink-0"
                        style={{
                          backgroundColor: "var(--brasa-light)",
                          color: "var(--brasa)",
                        }}
                      >
                        Ir
                      </Link>
                    )}

                    {isDone && (
                      <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                        style={{ backgroundColor: "var(--brasa)" }}>
                        <Check size={12} className="text-white" strokeWidth={2.5} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowRight, FlaskConical } from "lucide-react";
import { wipeSeedData } from "@/app/actions/onboarding-cleanup";
import { useCartStore } from "@/store/useCartStore";

const LS_KEY = "isGraduated";

interface GraduationModalProps {
  open: boolean;
  onClose: () => void;
}

export function GraduationModal({ open, onClose }: GraduationModalProps) {
  const router = useRouter();
  const clearCart = useCartStore((s) => s.clearCart);
  const [isPending, start] = useTransition();
  const [done, setDone] = useState(false);

  const graduate = (clean: boolean) => {
    localStorage.setItem(LS_KEY, "1");
    if (!clean) { onClose(); return; }

    start(async () => {
      await wipeSeedData();
      clearCart();
      setDone(true);
      setTimeout(() => {
        onClose();
        router.push("/settings");
      }, 1200);
    });
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center sm:p-4 backdrop-blur-sm bg-black/40"
          onClick={(e) => e.target === e.currentTarget && graduate(false)}
        >
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl border overflow-hidden max-h-[90dvh] overflow-y-auto"
            style={{
              backgroundColor: "var(--porcelana)",
              borderColor: "var(--border-md)",
              boxShadow: "0 32px 80px rgba(45,45,45,0.18), 0 0 0 1px rgba(255,255,255,0.6) inset",
            }}
          >
            {/* Drag handle (mobile only) */}
            <div className="w-10 h-1 rounded-full mx-auto mt-3 mb-0 sm:hidden" style={{ backgroundColor: "var(--border-md)" }} />
            {/* Header com gradiente */}
            <div
              className="px-8 pt-6 sm:pt-8 pb-6 text-center"
              style={{
                background: "linear-gradient(160deg, var(--brasa-light) 0%, var(--porcelana) 60%)",
              }}
            >
              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.15 }}
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg"
                style={{
                  background: "linear-gradient(135deg, var(--brasa) 0%, #B84A00 100%)",
                  boxShadow: "0 8px 24px rgba(211,84,0,0.35)",
                }}
              >
                <Sparkles size={28} className="text-white" />
              </motion.div>

              <h2
                className="text-xl font-black tracking-tight leading-snug mb-2"
                style={{ color: "var(--ink)" }}
              >
                Parabéns! Você domina o básico.
              </h2>
              <p className="text-sm leading-relaxed" style={{ color: "var(--ink-3)" }}>
                Você finalizou sua primeira venda de teste. Agora é hora de começar o seu negócio de verdade.
              </p>
            </div>

            {/* Corpo */}
            <div className="px-8 pb-8 space-y-3">
              {done ? (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center gap-2 py-4 text-center"
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: "var(--brasa-light)" }}
                  >
                    <Sparkles size={18} style={{ color: "var(--brasa)" }} />
                  </div>
                  <p className="text-sm font-bold" style={{ color: "var(--ink)" }}>
                    PDV limpo e pronto para o seu negócio!
                  </p>
                  <p className="text-xs" style={{ color: "var(--ink-3)" }}>
                    Redirecionando para configurações...
                  </p>
                </motion.div>
              ) : (
                <>
                  {/* Botão primário */}
                  <motion.button
                    onClick={() => graduate(true)}
                    disabled={isPending}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl font-bold text-sm transition-all disabled:opacity-60"
                    style={{
                      background: "linear-gradient(135deg, var(--brasa) 0%, #B84A00 100%)",
                      color: "#fff",
                      boxShadow: "0 4px 20px rgba(211,84,0,0.3)",
                    }}
                  >
                    {isPending ? (
                      <span className="animate-pulse">Limpando dados...</span>
                    ) : (
                      <>
                        <ArrowRight size={16} />
                        Limpar dados de teste e começar meu negócio
                      </>
                    )}
                  </motion.button>

                  {/* Botão secundário ghost */}
                  <motion.button
                    onClick={() => graduate(false)}
                    disabled={isPending}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm border transition-all disabled:opacity-40"
                    style={{
                      borderColor: "var(--border-md)",
                      color: "var(--ink-3)",
                      backgroundColor: "transparent",
                    }}
                  >
                    <FlaskConical size={14} />
                    Manter dados para testar mais
                  </motion.button>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

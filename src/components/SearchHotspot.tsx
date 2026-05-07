"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const LS_KEY = "hasSeenSearchHotspot";
const INPUT_SELECTOR = '[data-testid="pdv-search"]';

export function useSearchHotspot() {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (localStorage.getItem(LS_KEY)) return;

    // Mostra o hotspot após 300ms (ignora autoFocus inicial do mount)
    const showTimer = setTimeout(() => {
      setDismissed(false);

      const dismiss = () => {
        const input = document.querySelector<HTMLElement>(INPUT_SELECTOR);
        if (!input) return;
        localStorage.setItem(LS_KEY, "1");
        setDismissed(true);
        input.removeEventListener("pointerdown", dismiss);
        input.removeEventListener("keydown", dismiss);
        input.removeEventListener("focusin", dismiss);
      };

      // Escuta múltiplos eventos para cobrir autoFocus + clique + teclado
      const input = document.querySelector<HTMLElement>(INPUT_SELECTOR);
      if (input) {
        input.addEventListener("pointerdown", dismiss);
        input.addEventListener("keydown", dismiss);
        input.addEventListener("focusin", dismiss);
      }
    }, 300);

    return () => clearTimeout(showTimer);
  }, []);

  return { dismissed };
}

export function SearchHotspot({ dismissed }: { dismissed: boolean }) {
  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none z-20"
          aria-hidden="true"
        >
          <motion.div
            initial={{ opacity: 0, x: 6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15, duration: 0.2 }}
            className="relative flex items-center"
          >
            <div
              className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-lg"
              style={{
                backgroundColor: "var(--brasa)",
                color: "#fff",
                boxShadow: "0 4px 14px rgba(211,84,0,0.4)",
              }}
            >
              Busque um produto aqui
              <span
                className="absolute right-[-5px] top-1/2 -translate-y-1/2 w-0 h-0"
                style={{
                  borderTop: "5px solid transparent",
                  borderBottom: "5px solid transparent",
                  borderLeft: "5px solid var(--brasa)",
                }}
              />
            </div>
          </motion.div>

          <div className="relative w-4 h-4 flex items-center justify-center">
            <span
              className="absolute inline-flex w-full h-full rounded-full animate-ping opacity-60"
              style={{ backgroundColor: "var(--brasa)" }}
            />
            <span
              className="relative inline-flex w-2.5 h-2.5 rounded-full"
              style={{
                backgroundColor: "var(--brasa)",
                boxShadow: "0 0 8px rgba(211,84,0,0.7)",
              }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, X, AlertTriangle } from "lucide-react";
import { verificarPinGerente } from "@/app/actions/equipe";

interface PinAuthModalProps {
  isOpen: boolean;
  title?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function PinAuthModal({
  isOpen,
  title = "Autorização de Gerente",
  onSuccess,
  onCancel,
}: PinAuthModalProps) {
  const [digits, setDigits] = useState(["", "", "", ""]);
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const [isPending, startTransition] = useTransition();
  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  useEffect(() => {
    if (isOpen) {
      setDigits(["", "", "", ""]);
      setError("");
      setTimeout(() => inputRefs[0].current?.focus(), 50);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    setError("");
    if (digit && index < 3) {
      inputRefs[index + 1].current?.focus();
    }
    if (digit && index === 3) {
      const pin = [...next].join("");
      if (pin.length === 4) handleConfirm(pin);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  const handleConfirm = (pinOverride?: string) => {
    const pin = pinOverride ?? digits.join("");
    if (pin.length < 4) return;

    startTransition(async () => {
      const res = await verificarPinGerente(pin);
      if ("ok" in res) {
        onSuccess();
      } else {
        setDigits(["", "", "", ""]);
        setError(res.error);
        setShake(true);
        setTimeout(() => {
          setShake(false);
          inputRefs[0].current?.focus();
        }, 500);
      }
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
      />
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={shake ? { scale: 1, opacity: 1, x: [0, -8, 8, -8, 8, 0] } : { scale: 1, opacity: 1, x: 0 }}
        transition={shake ? { duration: 0.4 } : { type: "spring", stiffness: 300, damping: 25 }}
        className="dash-card w-full max-w-xs p-8 rounded-3xl border dash-border relative shadow-2xl flex flex-col items-center text-center"
      >
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-xl dash-label hover:dash-value dash-action-btn transition-colors"
          aria-label="Fechar"
        >
          <X size={16} />
        </button>

        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-400 mb-4">
          <ShieldCheck size={28} />
        </div>

        <h3 className="text-base font-black mb-1">{title}</h3>
        <p className="dash-subtitle text-xs mb-6">Digite o PIN de 4 dígitos do gerente</p>

        <div className="flex gap-3 mb-6">
          {digits.map((d, i) => (
            <input
              key={`digit-${i}`}
              type="password"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              disabled={isPending}
              className={`w-14 h-14 text-center text-2xl font-black rounded-2xl border dash-muted outline-none transition-all
                ${d ? "border-amber-500/60 text-amber-400" : "dash-border dash-value"}
                ${error ? "border-rose-500/60" : ""}
                focus:border-amber-500/80 focus:bg-white/8 disabled:opacity-50`}
            />
          ))}
        </div>

        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-1.5 text-rose-400 text-xs font-bold mb-4"
            >
              <AlertTriangle size={12} /> {error}
            </motion.p>
          )}
        </AnimatePresence>

        <button
          onClick={() => handleConfirm()}
          disabled={isPending || digits.join("").length < 4}
          className="w-full h-12 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-black text-sm rounded-2xl transition-all active:scale-[0.98]"
        >
          {isPending ? "Verificando..." : "Confirmar"}
        </button>
      </motion.div>
    </div>
  );
}

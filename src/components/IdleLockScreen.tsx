"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, AlertTriangle, ShieldCheck } from "lucide-react";
import { verificarPinGerente } from "@/app/actions/equipe";

const IDLE_TIMEOUT_MS =
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_IDLE_TIMEOUT_MS
    ? parseInt(process.env.NEXT_PUBLIC_IDLE_TIMEOUT_MS, 10)
    : 15 * 60 * 1000;

const IDLE_EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"] as const;

interface IdleLockScreenProps {
  nomeLoja?: string;
}

export function IdleLockScreen({ nomeLoja }: IdleLockScreenProps) {
  const [locked, setLocked] = useState(false);
  const [digits, setDigits] = useState(["", "", "", ""]);
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const [isPending, startTransition] = useTransition();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  const resetTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setLocked(true), IDLE_TIMEOUT_MS);
  };

  useEffect(() => {
    resetTimer();
    IDLE_EVENTS.forEach((e) => window.addEventListener(e, resetTimer, { passive: true }));
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      IDLE_EVENTS.forEach((e) => window.removeEventListener(e, resetTimer));
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (locked) {
      setDigits(["", "", "", ""]);
      setError("");
      setTimeout(() => inputRefs[0].current?.focus(), 100);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locked]);

  const handleChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    setError("");
    if (digit && index < 3) inputRefs[index + 1].current?.focus();
    if (digit && index === 3) {
      const pin = [...next].join("");
      if (pin.length === 4) handleUnlock(pin);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  const handleUnlock = (pinOverride?: string) => {
    const pin = pinOverride ?? digits.join("");
    if (pin.length < 4) return;

    startTransition(async () => {
      const res = await verificarPinGerente(pin);
      if ("ok" in res) {
        setLocked(false);
        resetTimer();
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

  return (
    <AnimatePresence>
      {locked && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[300] flex items-center justify-center bg-[var(--parchment)]/95 backdrop-blur-md p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={shake
              ? { scale: 1, opacity: 1, y: 0, x: [0, -10, 10, -10, 10, 0] }
              : { scale: 1, opacity: 1, y: 0, x: 0 }}
            transition={shake ? { duration: 0.4 } : { type: "spring", stiffness: 280, damping: 24 }}
            className="dash-card w-full max-w-sm p-8 rounded-3xl border dash-border shadow-2xl flex flex-col items-center text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-400 mb-5">
              <Lock size={32} />
            </div>

            <h2 className="text-xl font-black mb-1">Sessão Bloqueada</h2>
            {nomeLoja && (
              <p className="dash-subtitle text-sm font-semibold mb-1">{nomeLoja}</p>
            )}
            <p className="text-neutral-600 text-xs mb-7">Inatividade detectada. Digite o PIN do gerente para continuar.</p>

            <div className="flex gap-3 mb-5">
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={inputRefs[i]}
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
                    focus:border-amber-500/80 disabled:opacity-50`}
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
              onClick={() => handleUnlock()}
              disabled={isPending || digits.join("").length < 4}
              className="w-full h-12 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-black text-sm rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <ShieldCheck size={16} />
              {isPending ? "Verificando..." : "Desbloquear"}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Store, UtensilsCrossed, ShoppingBag, Loader2, ArrowRight, Check } from "lucide-react";
import { setupOnboarding } from "./actions";

// ─── Animation variants ───────────────────────────────────────────────────────
const slide = {
  enter: (dir: number) => ({ x: dir > 0 ? 50 : -50, opacity: 0 }),
  center: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.24, ease: [0.25, 0.46, 0.45, 0.94] as [number,number,number,number] },
  },
  exit: (dir: number) => ({
    x: dir > 0 ? -50 : 50,
    opacity: 0,
    transition: { duration: 0.18, ease: [0.55, 0, 1, 0.45] as [number,number,number,number] },
  }),
};

const MODELOS = [
  {
    id: "balcao",
    label: "Balcão / Delivery",
    desc: "Atendimento rápido no balcão ou pedidos para entrega",
    icon: ShoppingBag,
  },
  {
    id: "mesas",
    label: "Mesas / Salão",
    desc: "Atendimento em mesas com comandas por cliente",
    icon: UtensilsCrossed,
  },
] as const;

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep]           = useState(1);
  const [direction, setDirection] = useState(1);
  const [isPending, start]        = useTransition();
  const [error, setError]         = useState("");
  const [loaderDone, setLoaderDone] = useState(false);

  const [nomeLoja, setNomeLoja] = useState("");
  const [modelo, setModelo]     = useState<"balcao" | "mesas" | "">("");

  const inputRef = useRef<HTMLInputElement>(null);

  // auto-focus no step 1
  useEffect(() => {
    if (step === 1) setTimeout(() => inputRef.current?.focus(), 280);
  }, [step]);

  // loader: 1.5s depois submete
  useEffect(() => {
    if (step !== 3) return;
    const t = setTimeout(() => setLoaderDone(true), 1500);
    return () => clearTimeout(t);
  }, [step]);

  useEffect(() => {
    if (!loaderDone) return;
    start(async () => {
      const nicho = modelo === "mesas" ? "restaurante" : "outros";
      const res = await setupOnboarding({
        nomeLoja: nomeLoja.trim(),
        nicho,
        metodosPagamento: ["DINHEIRO", "PIX", "CARTAO"],
        produto: { nome: "Produto Exemplo", precoCentavos: 1000, categoria: "Produtos" },
      });
      if (res && "error" in res) {
        setError(res.error);
        setStep(1);
        setDirection(-1);
        setLoaderDone(false);
      }
      // sucesso: server action redireciona para /?welcome=1
    });
  }, [loaderDone]);

  const goTo = (next: number) => {
    setError("");
    setDirection(next > step ? 1 : -1);
    setStep(next);
  };

  const canStep1 = nomeLoja.trim().length >= 2;
  const canStep2 = modelo !== "";

  return (
    <div
      className="min-h-[100dvh] flex flex-col items-center justify-center bg-[#0B0D11] px-4"
      data-theme="dark"
    >
      {/* Card glassmorphism */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center">
            <Store size={17} className="text-emerald-400" />
          </div>
          <span className="text-sm font-bold text-neutral-500 tracking-wide">Balcão Rápido</span>
        </div>

        {/* Progress dots */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3].map((n) => (
            <motion.div
              key={n}
              animate={{
                width: step === n ? 24 : 8,
                backgroundColor: step > n ? "#10b981" : step === n ? "#059669" : "rgba(255,255,255,0.08)",
              }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="h-2 rounded-full"
            />
          ))}
        </div>

        {/* Card */}
        <div
          className="rounded-3xl border border-white/[0.06] overflow-hidden"
          style={{
            background: "linear-gradient(145deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)",
            backdropFilter: "blur(20px)",
            boxShadow: "0 24px 64px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)",
          }}
        >
          <div className="p-8" style={{ minHeight: 320 }}>
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={step}
                custom={direction}
                variants={slide}
                initial="enter"
                animate="center"
                exit="exit"
              >

                {/* ── STEP 1: Nome do estabelecimento ── */}
                {step === 1 && (
                  <div className="space-y-6">
                    <div>
                      <p className="text-[11px] font-bold text-emerald-500 uppercase tracking-widest mb-2">
                        Passo 1 de 3
                      </p>
                      <h1 className="text-2xl font-black text-white leading-snug tracking-tight">
                        Qual o nome do seu<br />estabelecimento?
                      </h1>
                    </div>

                    <input
                      ref={inputRef}
                      value={nomeLoja}
                      onChange={(e) => setNomeLoja(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && canStep1 && goTo(2)}
                      placeholder="Ex: Espetinhos do João"
                      maxLength={100}
                      className="w-full py-4 px-5 bg-white/[0.05] text-white text-lg font-semibold placeholder:text-neutral-700 border border-white/[0.08] rounded-2xl outline-none transition-all focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/15"
                    />

                    {error && (
                      <p className="text-sm text-red-400">{error}</p>
                    )}

                    <motion.button
                      onClick={() => goTo(2)}
                      disabled={!canStep1}
                      whileHover={{ scale: canStep1 ? 1.02 : 1 }}
                      whileTap={{ scale: canStep1 ? 0.97 : 1 }}
                      className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                      style={{
                        background: canStep1
                          ? "linear-gradient(135deg, #059669 0%, #047857 100%)"
                          : "rgba(255,255,255,0.06)",
                        color: canStep1 ? "#fff" : "rgba(255,255,255,0.3)",
                        boxShadow: canStep1 ? "0 4px 20px rgba(5,150,105,0.35)" : "none",
                      }}
                    >
                      Continuar <ArrowRight size={16} />
                    </motion.button>
                  </div>
                )}

                {/* ── STEP 2: Modelo de atendimento ── */}
                {step === 2 && (
                  <div className="space-y-6">
                    <div>
                      <p className="text-[11px] font-bold text-emerald-500 uppercase tracking-widest mb-2">
                        Passo 2 de 3
                      </p>
                      <h1 className="text-2xl font-black text-white leading-snug tracking-tight">
                        Qual o seu modelo<br />principal de atendimento?
                      </h1>
                    </div>

                    <div className="space-y-3">
                      {MODELOS.map(({ id, label, desc, icon: Icon }) => {
                        const sel = modelo === id;
                        return (
                          <motion.button
                            key={id}
                            type="button"
                            onClick={() => setModelo(id)}
                            whileTap={{ scale: 0.97 }}
                            className="w-full flex items-center gap-4 p-5 rounded-2xl border text-left transition-all duration-150"
                            style={{
                              background: sel
                                ? "rgba(5,150,105,0.12)"
                                : "rgba(255,255,255,0.03)",
                              borderColor: sel
                                ? "rgba(5,150,105,0.45)"
                                : "rgba(255,255,255,0.07)",
                              boxShadow: sel
                                ? "0 0 0 1px rgba(5,150,105,0.2), 0 4px 16px rgba(5,150,105,0.1)"
                                : "none",
                            }}
                          >
                            <div
                              className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all"
                              style={{
                                background: sel ? "rgba(5,150,105,0.2)" : "rgba(255,255,255,0.05)",
                              }}
                            >
                              <Icon size={20} className={sel ? "text-emerald-400" : "text-neutral-600"} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`font-bold text-sm ${sel ? "text-emerald-300" : "text-neutral-300"}`}>
                                {label}
                              </p>
                              <p className="text-xs text-neutral-600 mt-0.5 leading-relaxed">{desc}</p>
                            </div>
                            {sel && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shrink-0"
                              >
                                <Check size={11} className="text-white" />
                              </motion.div>
                            )}
                          </motion.button>
                        );
                      })}
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => goTo(1)}
                        className="flex-1 py-4 rounded-2xl font-bold text-sm text-neutral-500 border border-white/[0.07] hover:border-white/[0.12] transition-all"
                      >
                        Voltar
                      </button>
                      <motion.button
                        onClick={() => goTo(3)}
                        disabled={!canStep2}
                        whileHover={{ scale: canStep2 ? 1.02 : 1 }}
                        whileTap={{ scale: canStep2 ? 0.97 : 1 }}
                        className="flex-[2] flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                        style={{
                          background: canStep2
                            ? "linear-gradient(135deg, #059669 0%, #047857 100%)"
                            : "rgba(255,255,255,0.06)",
                          color: canStep2 ? "#fff" : "rgba(255,255,255,0.3)",
                          boxShadow: canStep2 ? "0 4px 20px rgba(5,150,105,0.35)" : "none",
                        }}
                      >
                        Continuar <ArrowRight size={16} />
                      </motion.button>
                    </div>
                  </div>
                )}

                {/* ── STEP 3: Loader de configuração ── */}
                {step === 3 && (
                  <div className="flex flex-col items-center justify-center py-8 space-y-6 text-center">
                    <div className="relative">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                        className="w-16 h-16 rounded-full border-2 border-emerald-500/20 border-t-emerald-500"
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Store size={20} className="text-emerald-400" />
                      </div>
                    </div>

                    <div>
                      <h2 className="text-xl font-black text-white tracking-tight">
                        Preparando seu PDV...
                      </h2>
                      <p className="text-sm text-neutral-500 mt-2">
                        Configurando <span className="text-neutral-300 font-semibold">{nomeLoja}</span> para você
                      </p>
                    </div>

                    <div className="w-full bg-white/[0.05] rounded-full h-1.5 overflow-hidden">
                      <motion.div
                        className="h-full bg-emerald-500 rounded-full"
                        initial={{ width: "0%" }}
                        animate={{ width: loaderDone ? "100%" : "75%" }}
                        transition={{ duration: loaderDone ? 0.3 : 1.4, ease: "easeOut" }}
                      />
                    </div>

                    {isPending && (
                      <div className="flex items-center gap-2 text-xs text-neutral-600">
                        <Loader2 size={12} className="animate-spin" />
                        Salvando configurações...
                      </div>
                    )}
                  </div>
                )}

              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-neutral-700 mt-6">
          Balcão Rápido · PDV para restaurantes
        </p>
      </motion.div>
    </div>
  );
}

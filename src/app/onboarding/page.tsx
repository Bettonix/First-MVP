"use client";

import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { setupOnboarding } from "./actions";
import {
  Utensils, Sandwich, GlassWater, Truck, Cake, ShoppingBag, Sparkles,
  Banknote, QrCode, CreditCard,
  ArrowLeft, ArrowRight, Check, Loader2, Store,
} from "lucide-react";

// ─── Config ────────────────────────────────────────────────────────────────────
const NICHOS = [
  { id: "restaurante", label: "Restaurante",    icon: Utensils,    desc: "Pratos, marmitas" },
  { id: "lanchonete",  label: "Lanchonete",     icon: Sandwich,    desc: "Lanches, salgados" },
  { id: "bar",         label: "Bar / Bebidas",  icon: GlassWater,  desc: "Drinks, petiscos" },
  { id: "food_truck",  label: "Food Truck",     icon: Truck,       desc: "Comida de rua" },
  { id: "doces",       label: "Doces / Café",   icon: Cake,        desc: "Confeitaria, café" },
  { id: "feira",       label: "Feira / Mercado",icon: ShoppingBag, desc: "Produtos variados" },
  { id: "outros",      label: "Outros",         icon: Sparkles,    desc: "Qualquer negócio" },
] as const;

const METODOS = [
  { id: "DINHEIRO", label: "Dinheiro", icon: Banknote,    desc: "Pagamento em espécie" },
  { id: "PIX",      label: "Pix",      icon: QrCode,      desc: "Transferência na hora" },
  { id: "CARTAO",   label: "Cartão",   icon: CreditCard,  desc: "Crédito e débito" },
] as const;

const NICHO_CATEGORIA: Record<string, string> = {
  restaurante: "Pratos",
  lanchonete:  "Lanches",
  bar:         "Bebidas",
  food_truck:  "Pratos",
  doces:       "Doces",
  feira:       "Produtos",
  outros:      "Produtos",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function brlTocentavos(val: string): number {
  const clean = val.replace(/[^\d,]/g, "").replace(",", ".");
  return Math.round((parseFloat(clean) || 0) * 100);
}

// ─── Animation variants ───────────────────────────────────────────────────────
const stepVariants = {
  enter: (dir: number) => ({
    x: dir > 0 ? 48 : -48,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
  },
  exit: (dir: number) => ({
    x: dir > 0 ? -48 : 48,
    opacity: 0,
    transition: { duration: 0.16, ease: [0.55, 0, 1, 0.45] as [number, number, number, number] },
  }),
};

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function OnboardingPage() {
  const [step, setStep]           = useState(1);
  const [direction, setDirection] = useState(1);
  const [isPending, start]        = useTransition();
  const [error, setError]         = useState("");

  // Step 1
  const [nomeLoja, setNomeLoja] = useState("");
  const [nicho, setNicho]       = useState("");

  // Step 2
  const [produtoNome, setProdutoNome]   = useState("");
  const [produtoPreco, setProdutoPreco] = useState("");

  // Step 3
  const [metodos, setMetodos] = useState<string[]>(["DINHEIRO", "PIX", "CARTAO"]);

  const toggleMetodo = (id: string) =>
    setMetodos((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );

  const canProceed = [
    nomeLoja.trim().length >= 2 && nicho !== "",
    produtoNome.trim().length >= 1 && brlTocentavos(produtoPreco) > 0,
    metodos.length >= 1,
  ];

  const goTo = (next: number) => {
    setError("");
    setDirection(next > step ? 1 : -1);
    setStep(next);
  };

  const handleSubmit = () => {
    setError("");
    start(async () => {
      const res = await setupOnboarding({
        nomeLoja: nomeLoja.trim(),
        nicho,
        metodosPagamento: metodos,
        produto: {
          nome:          produtoNome.trim(),
          precoCentavos: brlTocentavos(produtoPreco),
          categoria:     NICHO_CATEGORIA[nicho] ?? "Produtos",
        },
      });
      if (res && "error" in res) setError(res.error);
      // On success: server redirects to /?welcome=1
    });
  };

  const STEPS = ["Seu Negócio", "1º Produto", "Pagamentos"];
  const progress = (step / STEPS.length) * 100;

  return (
    <div className="min-h-[100dvh] bg-[#0B0D11] flex flex-col select-none" data-theme="dark">

      {/* ── Top: logo + progress ────────────────────────────────────── */}
      <header className="shrink-0 px-5 pt-10 pb-4 max-w-md mx-auto w-full">
        {/* Brand */}
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 bg-emerald-500/15 rounded-xl flex items-center justify-center">
            <Store size={16} className="text-emerald-400" />
          </div>
          <span className="text-sm font-bold text-neutral-500 tracking-wide">Balcão Rápido</span>
        </div>

        {/* Step labels */}
        <div className="flex items-center gap-0 mb-3">
          {STEPS.map((label, i) => {
            const num  = i + 1;
            const done = step > num;
            const curr = step === num;
            return (
              <div key={label} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center gap-1">
                  <motion.div
                    animate={{
                      backgroundColor: done ? "#10b981" : curr ? "#059669" : "rgba(255,255,255,0.06)",
                      scale: curr ? 1.1 : 1,
                    }}
                    transition={{ duration: 0.2 }}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black"
                  >
                    {done
                      ? <Check size={13} className="text-white" />
                      : <span className={curr ? "text-white" : "text-neutral-600"}>{num}</span>
                    }
                  </motion.div>
                  <span className={`text-[10px] font-bold whitespace-nowrap transition-colors ${curr ? "text-neutral-300" : "text-neutral-700"}`}>
                    {label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className="flex-1 mx-2 mb-4">
                    <div className="h-px bg-neutral-800 relative overflow-hidden">
                      <motion.div
                        className="absolute inset-0 bg-emerald-500"
                        animate={{ scaleX: step > num ? 1 : 0 }}
                        initial={{ scaleX: 0 }}
                        style={{ transformOrigin: "left" }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-emerald-500 rounded-full"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>
      </header>

      {/* ── Content: animated steps ─────────────────────────────────── */}
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="absolute inset-0 overflow-y-auto"
          >
            <div className="max-w-md mx-auto px-5 py-6 pb-4">

              {/* ═══ STEP 1: Negócio + Nicho ═══════════════════════════ */}
              {step === 1 && (
                <div className="space-y-6">
                  <div>
                    <h1 className="text-2xl font-black text-white tracking-tight leading-snug">
                      Vamos configurar<br />seu negócio
                    </h1>
                    <p className="text-sm text-neutral-500 mt-2">
                      Personalizamos o PDV para o seu ramo em segundos.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest block">
                      Nome do negócio
                    </label>
                    <input
                      autoFocus
                      value={nomeLoja}
                      onChange={(e) => setNomeLoja(e.target.value)}
                      placeholder="Ex: Espetinhos do João"
                      maxLength={100}
                      className="w-full py-3.5 px-4 bg-[#13161C] text-neutral-100 text-base font-semibold placeholder:text-neutral-700 border border-neutral-800 rounded-2xl outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest block">
                      Qual é o seu ramo?
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {NICHOS.map(({ id, label, icon: Icon, desc }) => {
                        const sel = nicho === id;
                        return (
                          <motion.button
                            key={id}
                            type="button"
                            onClick={() => setNicho(id)}
                            whileTap={{ scale: 0.96 }}
                            className={`flex items-start gap-3 p-3.5 rounded-2xl border text-left transition-all duration-150 ${
                              sel
                                ? "bg-emerald-500/10 border-emerald-500/40 shadow-[0_0_0_1px_rgba(16,185,129,0.25)]"
                                : "bg-[#13161C] border-neutral-800/80 hover:border-neutral-700"
                            }`}
                          >
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 transition-all ${sel ? "bg-emerald-500/20" : "bg-white/5"}`}>
                              <Icon size={16} className={sel ? "text-emerald-400" : "text-neutral-600"} />
                            </div>
                            <div className="min-w-0">
                              <p className={`text-sm font-bold leading-tight truncate ${sel ? "text-emerald-300" : "text-neutral-300"}`}>{label}</p>
                              <p className="text-[11px] text-neutral-600 mt-0.5">{desc}</p>
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ═══ STEP 2: Primeiro Produto ═══════════════════════════ */}
              {step === 2 && (
                <div className="space-y-6">
                  <div>
                    <h1 className="text-2xl font-black text-white tracking-tight leading-snug">
                      Seu produto<br />campeão de vendas
                    </h1>
                    <p className="text-sm text-neutral-500 mt-2">
                      Só o essencial agora. Você adiciona mais no estoque depois.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest block">
                        Nome do produto
                      </label>
                      <input
                        autoFocus
                        value={produtoNome}
                        onChange={(e) => setProdutoNome(e.target.value)}
                        placeholder="Ex: Espetinho de Frango"
                        maxLength={200}
                        className="w-full py-3.5 px-4 bg-[#13161C] text-neutral-100 text-base font-semibold placeholder:text-neutral-700 border border-neutral-800 rounded-2xl outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest block">
                        Preço de venda
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 font-bold text-sm pointer-events-none">
                          R$
                        </span>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={produtoPreco}
                          onChange={(e) => setProdutoPreco(e.target.value)}
                          placeholder="0,00"
                          className="w-full py-3.5 pl-12 pr-4 bg-[#13161C] text-neutral-100 text-base font-bold placeholder:text-neutral-700 border border-neutral-800 rounded-2xl outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Tip card */}
                  <div className="flex items-start gap-3 p-4 bg-[#13161C] border border-neutral-800 rounded-2xl">
                    <div className="w-8 h-8 bg-emerald-500/10 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles size={14} className="text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-neutral-300">Aparece direto no PDV</p>
                      <p className="text-xs text-neutral-600 mt-0.5 leading-relaxed">
                        Na primeira tela, pronto para vender. Sem configuração extra.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* ═══ STEP 3: Formas de Pagamento ════════════════════════ */}
              {step === 3 && (
                <div className="space-y-6">
                  <div>
                    <h1 className="text-2xl font-black text-white tracking-tight leading-snug">
                      Como você<br />recebe o dinheiro?
                    </h1>
                    <p className="text-sm text-neutral-500 mt-2">
                      Selecione as formas que aceita. Pode trocar depois.
                    </p>
                  </div>

                  <div className="space-y-2.5">
                    {METODOS.map(({ id, label, icon: Icon, desc }) => {
                      const sel = metodos.includes(id);
                      return (
                        <motion.button
                          key={id}
                          type="button"
                          onClick={() => toggleMetodo(id)}
                          whileTap={{ scale: 0.98 }}
                          className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all duration-150 ${
                            sel
                              ? "bg-emerald-500/10 border-emerald-500/35 shadow-[0_0_0_1px_rgba(16,185,129,0.2)]"
                              : "bg-[#13161C] border-neutral-800/80 hover:border-neutral-700"
                          }`}
                        >
                          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all ${sel ? "bg-emerald-500/20" : "bg-white/5"}`}>
                            <Icon size={22} className={sel ? "text-emerald-400" : "text-neutral-500"} />
                          </div>
                          <div className="flex-1 text-left">
                            <p className={`text-base font-bold leading-tight ${sel ? "text-emerald-300" : "text-neutral-300"}`}>{label}</p>
                            <p className="text-xs text-neutral-600 mt-0.5">{desc}</p>
                          </div>
                          {/* Checkbox visual */}
                          <motion.div
                            animate={{
                              backgroundColor: sel ? "#10b981" : "transparent",
                              borderColor: sel ? "#10b981" : "#404040",
                            }}
                            className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
                          >
                            {sel && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                              >
                                <Check size={11} className="text-white" />
                              </motion.div>
                            )}
                          </motion.div>
                        </motion.button>
                      );
                    })}
                  </div>

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-rose-500/10 border border-rose-500/20 rounded-2xl px-4 py-3 text-rose-400 text-sm font-semibold"
                    >
                      {error}
                    </motion.div>
                  )}
                </div>
              )}

            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Footer: navigation ──────────────────────────────────────── */}
      <footer className="shrink-0 border-t border-white/5 bg-[#0B0D11]">
        <div className="max-w-md mx-auto px-5 py-4" style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 1.25rem)" }}>
          <div className="flex gap-2.5">
            {/* Back button */}
            {step > 1 && (
              <motion.button
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => goTo(step - 1)}
                disabled={isPending}
                className="h-14 w-14 bg-[#13161C] hover:bg-neutral-800 border border-neutral-800 text-neutral-400 font-bold rounded-2xl flex items-center justify-center transition-all shrink-0"
              >
                <ArrowLeft size={20} />
              </motion.button>
            )}

            {/* Next / Submit button */}
            {step < 3 ? (
              <motion.button
                onClick={() => goTo(step + 1)}
                disabled={!canProceed[step - 1]}
                whileTap={{ scale: 0.97 }}
                className="flex-1 h-14 bg-emerald-600 hover:bg-emerald-500 disabled:bg-[#13161C] disabled:text-neutral-700 disabled:border disabled:border-neutral-800 text-white font-black text-base rounded-2xl flex items-center justify-center gap-2 transition-all shadow-[0_8px_24px_rgba(5,150,105,0.25)] disabled:shadow-none"
              >
                Próximo <ArrowRight size={19} />
              </motion.button>
            ) : (
              <motion.button
                onClick={handleSubmit}
                disabled={!canProceed[2] || isPending}
                whileTap={{ scale: 0.97 }}
                className="flex-1 h-14 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-black text-base rounded-2xl flex items-center justify-center gap-2.5 transition-all shadow-[0_8px_24px_rgba(5,150,105,0.3)]"
              >
                {isPending ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    <span>Configurando...</span>
                  </>
                ) : (
                  <>
                    <Check size={20} />
                    <span>Abrir meu Balcão</span>
                  </>
                )}
              </motion.button>
            )}
          </div>

          {/* Step hint */}
          <p className="text-center text-[11px] text-neutral-700 mt-3 font-medium">
            Etapa {step} de {STEPS.length} · {STEPS[step - 1]}
          </p>
        </div>
      </footer>

    </div>
  );
}

"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Store, CreditCard, Package, Rocket, ArrowRight, ArrowLeft,
  Loader2, Check, Banknote, QrCode, BadgeCheck, UtensilsCrossed,
  Beer, ShoppingCart, IceCream, Sparkles, Shield, FileText,
  ChevronRight, Lock,
} from "lucide-react";
import confetti from "canvas-confetti";
import {
  salvarStep1, salvarStep2, salvarStep3, salvarStep4, salvarStep5,
  concluirOnboarding, pularStep, getOnboardingStep,
} from "@/app/actions/onboarding";

const NICHOS = [
  { value: "lanchonete",  label: "Lanchonete",  icon: UtensilsCrossed, color: "#D35400" },
  { value: "bar",         label: "Bar",          icon: Beer,            color: "#B7791F" },
  { value: "restaurante", label: "Restaurante",  icon: UtensilsCrossed, color: "#5C6B3A" },
  { value: "doceria",     label: "Doceria",      icon: IceCream,        color: "#9B1C1C" },
  { value: "acai",        label: "Açaí",         icon: IceCream,        color: "#6B21A8" },
  { value: "mercadinho",  label: "Mercadinho",   icon: ShoppingCart,    color: "#1E40AF" },
  { value: "outros",      label: "Outros",       icon: Sparkles,        color: "#6B6B6B" },
];

const METODOS = [
  { value: "PIX",            label: "PIX",     icon: QrCode,     desc: "Instantâneo",    color: "#2D6A4F" },
  { value: "DINHEIRO",       label: "Dinheiro",icon: Banknote,   desc: "Em espécie",     color: "#B7791F" },
  { value: "CARTAO_CREDITO", label: "Crédito", icon: CreditCard, desc: "Cartão crédito", color: "#1E40AF" },
  { value: "CARTAO_DEBITO",  label: "Débito",  icon: CreditCard, desc: "Cartão débito",  color: "#5C6B3A" },
];

const CATEGORIAS = ["Lanches", "Bebidas", "Sobremesas", "Porções", "Outros"];

const STEPS = [
  { id: 1, label: "Identidade", icon: Store,       required: true  },
  { id: 2, label: "Dados",      icon: FileText,    required: false },
  { id: 3, label: "Pagamentos", icon: CreditCard,  required: true  },
  { id: 4, label: "Segurança",  icon: Shield,      required: false },
  { id: 5, label: "Produto",    icon: Package,     required: false },
  { id: 6, label: "Pronto!",    icon: Rocket,      required: true  },
];

const slide = {
  enter: (d: number) => ({ opacity: 0, x: d > 0 ? 56 : -56 }),
  center: { opacity: 1, x: 0 },
  exit:  (d: number) => ({ opacity: 0, x: d > 0 ? -56 : 56 }),
};

function fmtPrice(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function parseCurrency(raw: string): number {
  return parseInt(raw.replace(/\D/g, "") || "0", 10);
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep]    = useState(1);
  const [dir,  setDir]     = useState(1);
  const [error, setError]  = useState("");
  const [isPending, start] = useTransition();
  const [done, setDone]    = useState(false);

  // Step 1
  const [nomeLoja, setNomeLoja] = useState("");
  const [nicho, setNicho]       = useState("lanchonete");
  // Step 2
  const [cnpjCpf,         setCnpjCpf]         = useState("");
  const [telefone,        setTelefone]        = useState("");
  const [mensagemRecibo,  setMensagemRecibo]  = useState("Obrigado pela preferência! Volte sempre.");
  // Step 3
  const [metodos, setMetodos] = useState<string[]>(["PIX", "DINHEIRO"]);
  // Step 4
  const [pin,        setPin]        = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  // Step 5
  const [nomeProduto,  setNomeProduto]  = useState("");
  const [precoDisplay, setPrecoDisplay] = useState("");
  const [categoria,    setCategoria]    = useState("Outros");

  useEffect(() => {
    getOnboardingStep().then((s) => { if (s > 0 && s < 6) { setDir(1); setStep(Math.min(s + 1, 6)); } });
  }, []);

  const go = (next: number) => { setDir(next > step ? 1 : -1); setStep(next); setError(""); };
  const toggleMetodo = (v: string) =>
    setMetodos((p) => p.includes(v) ? p.filter((m) => m !== v) : [...p, v]);

  const progress = ((step - 1) / (STEPS.length - 1)) * 100;

  const handleSkip = () => {
    start(async () => {
      const result = await pularStep(step);
      if ("error" in result) { setError(result.error); return; }
      go(step + 1);
    });
  };

  const handleSave = () => {
    start(async () => {
      let result: { error: string } | { ok: true };

      if (step === 1) {
        if (nomeLoja.trim().length < 2) { setError("Nome deve ter ao menos 2 caracteres."); return; }
        result = await salvarStep1({ nomeLoja, nicho });
      } else if (step === 2) {
        result = await salvarStep2({ cnpjCpf, telefone, mensagemRecibo });
      } else if (step === 3) {
        if (metodos.length === 0) { setError("Selecione ao menos um método."); return; }
        result = await salvarStep3({ metodosPagamento: metodos });
      } else if (step === 4) {
        if (pin.length < 4) { setError("PIN deve ter ao menos 4 dígitos."); return; }
        if (pin !== pinConfirm) { setError("PINs não coincidem."); return; }
        result = await salvarStep4({ pin });
      } else if (step === 5) {
        if (nomeProduto.trim().length < 2) { setError("Nome do produto obrigatório."); return; }
        if (parseCurrency(precoDisplay) < 1) { setError("Informe um preço válido."); return; }
        result = await salvarStep5({ nomeProduto, precoCentavos: parseCurrency(precoDisplay), categoria });
      } else {
        result = await concluirOnboarding();
        if (!("error" in result)) {
          setDone(true);
          confetti({ particleCount: 220, spread: 100, origin: { y: 0.55 },
            colors: ["#D35400","#B84A00","#FDF0E8","#B7791F","#FFD700","#CD7F32","#fff"] });
          setTimeout(() => router.push("/app?welcome=1"), 1800);
        }
        if ("error" in result) setError(result.error);
        return;
      }

      if ("error" in result) { setError(result.error); return; }
      go(step + 1);
    });
  };

  const currentStep = STEPS[step - 1];
  const isOptional  = !currentStep?.required && step < 6;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 relative">
      {/* Blobs */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-48 -right-48 w-[700px] h-[700px] rounded-full opacity-[0.15]"
          style={{ background: "radial-gradient(circle, #D35400 0%, transparent 65%)" }} />
        <div className="absolute -bottom-48 -left-48 w-[600px] h-[600px] rounded-full opacity-[0.08]"
          style={{ background: "radial-gradient(circle, #B7791F 0%, transparent 65%)" }} />
      </div>

      {/* Progress bar */}
      <div className="fixed top-0 inset-x-0 h-1 z-50" style={{ backgroundColor: "var(--border)" }}>
        <motion.div className="h-full rounded-full"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          style={{ background: "linear-gradient(90deg, #D35400, #B84A00)" }} />
      </div>

      <div className="w-full max-w-[440px]">
        {/* Logo */}
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }} className="flex justify-center mb-8">
          <div className="w-14 h-14 rounded-3xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #D35400 0%, #B84A00 100%)",
              boxShadow: "0 12px 32px rgba(211,84,0,0.35)" }}>
            <Store size={26} className="text-white" />
          </div>
        </motion.div>

        {/* Stepper */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
          className="flex items-center justify-center gap-0 mb-8">
          {STEPS.map((s, i) => {
            const Icon   = s.icon;
            const isDone = step > s.id;
            const active = step === s.id;
            return (
              <div key={s.id} className="flex items-center">
                <div className="flex flex-col items-center gap-1">
                  <motion.div animate={{ scale: active ? 1.15 : 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                    className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 relative"
                    style={{
                      backgroundColor: isDone || active ? "var(--brasa)" : "var(--muted)",
                      color: isDone || active ? "#fff" : "var(--ink-4)",
                      boxShadow: active ? "0 0 0 4px rgba(211,84,0,0.18)" : "none",
                    }}>
                    {isDone ? <Check size={12} strokeWidth={3} /> : <Icon size={12} />}
                    {!s.required && !isDone && !active && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full text-[7px] flex items-center justify-center font-black"
                        style={{ backgroundColor: "var(--mel-light)", color: "var(--mel)" }}>✦</span>
                    )}
                  </motion.div>
                  <span className="text-[8px] font-black uppercase tracking-widest hidden sm:block"
                    style={{ color: active ? "var(--brasa)" : isDone ? "var(--ink-3)" : "var(--ink-4)" }}>
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className="w-6 h-0.5 mx-0.5 mb-4 rounded-full transition-all duration-500"
                    style={{ backgroundColor: step > s.id ? "var(--brasa)" : "var(--border-md)" }} />
                )}
              </div>
            );
          })}
        </motion.div>

        {/* Optional badge */}
        {isOptional && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
            className="flex justify-center mb-3">
            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest"
              style={{ backgroundColor: "var(--mel-light)", color: "var(--mel)" }}>
              ✦ Etapa opcional
            </span>
          </motion.div>
        )}

        {/* Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="rounded-3xl overflow-hidden"
          style={{ backgroundColor: "var(--porcelana)",
            boxShadow: "0 20px 48px rgba(45,45,45,0.1), 0 4px 12px rgba(45,45,45,0.06)",
            border: "1px solid var(--border)" }}>
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div key={step} custom={dir} variants={slide}
              initial="enter" animate="center" exit="exit"
              transition={{ duration: 0.26, ease: [0.4, 0, 0.2, 1] }}
              className="p-8">
              {/* Step 1 — Identidade */}
              {step === 1 && (
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ backgroundColor: "var(--brasa-light)" }}>
                      <Store size={20} style={{ color: "var(--brasa)" }} />
                    </div>
                    <div>
                      <h2 className="font-black text-xl" style={{ color: "var(--ink)" }}>Identidade da Loja</h2>
                      <p className="text-xs" style={{ color: "var(--ink-4)" }}>Como os clientes te conhecem?</p>
                    </div>
                  </div>
                  <div className="mb-5">
                    <label className="block text-[10px] font-black mb-2 uppercase tracking-widest" style={{ color: "var(--ink-3)" }}>Nome da loja *</label>
                    <input type="text" value={nomeLoja} autoFocus
                      onChange={(e) => { setNomeLoja(e.target.value); setError(""); }}
                      onKeyDown={(e) => e.key === "Enter" && handleSave()}
                      placeholder="Ex: Lanchonete do João"
                      className="w-full px-4 py-3.5 rounded-2xl text-sm font-semibold outline-none transition-all"
                      style={{ backgroundColor: "var(--muted)", color: "var(--ink)",
                        border: error ? "2px solid var(--danger)" : "2px solid transparent" }}
                      onFocus={(e) => { if (!error) e.currentTarget.style.border = "2px solid var(--brasa)"; }}
                      onBlur={(e)  => { if (!error) e.currentTarget.style.border = "2px solid transparent"; }}
                    />
                    {error && <p className="text-xs mt-1.5 font-semibold" style={{ color: "var(--danger)" }}>{error}</p>}
                  </div>
                  <div>
                    <label className="block text-[10px] font-black mb-2 uppercase tracking-widest" style={{ color: "var(--ink-3)" }}>Segmento *</label>
                    <div className="grid grid-cols-3 gap-2">
                      {NICHOS.map(({ value, label, icon: Icon, color }) => {
                        const sel = nicho === value;
                        return (
                          <motion.button key={value} type="button"
                            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }}
                            onClick={() => setNicho(value)}
                            className="flex flex-col items-center gap-2 p-3 rounded-2xl transition-all"
                            style={{ backgroundColor: sel ? `${color}15` : "var(--muted)",
                              border: sel ? `2px solid ${color}40` : "2px solid transparent" }}>
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                              style={{ backgroundColor: sel ? `${color}20` : "var(--muted-hover)" }}>
                              <Icon size={16} style={{ color: sel ? color : "var(--ink-3)" }} />
                            </div>
                            <span className="text-[10px] font-black leading-none text-center"
                              style={{ color: sel ? color : "var(--ink-3)" }}>{label}</span>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2 — Profissionalização */}
              {step === 2 && (
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ backgroundColor: "var(--mel-light)" }}>
                      <FileText size={20} style={{ color: "var(--mel)" }} />
                    </div>
                    <div>
                      <h2 className="font-black text-xl" style={{ color: "var(--ink)" }}>Dados do Negócio</h2>
                      <p className="text-xs" style={{ color: "var(--ink-4)" }}>Aparece nos recibos dos clientes</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-black mb-2 uppercase tracking-widest" style={{ color: "var(--ink-3)" }}>CNPJ / CPF</label>
                      <input type="text" value={cnpjCpf} autoFocus
                        onChange={(e) => setCnpjCpf(e.target.value)}
                        placeholder="00.000.000/0001-00"
                        className="w-full px-4 py-3.5 rounded-2xl text-sm font-semibold outline-none transition-all"
                        style={{ backgroundColor: "var(--muted)", color: "var(--ink)", border: "2px solid transparent" }}
                        onFocus={(e) => (e.currentTarget.style.border = "2px solid var(--brasa)")}
                        onBlur={(e)  => (e.currentTarget.style.border = "2px solid transparent")}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black mb-2 uppercase tracking-widest" style={{ color: "var(--ink-3)" }}>Telefone / WhatsApp</label>
                      <input type="tel" value={telefone}
                        onChange={(e) => setTelefone(e.target.value)}
                        placeholder="(11) 99999-9999"
                        className="w-full px-4 py-3.5 rounded-2xl text-sm font-semibold outline-none transition-all"
                        style={{ backgroundColor: "var(--muted)", color: "var(--ink)", border: "2px solid transparent" }}
                        onFocus={(e) => (e.currentTarget.style.border = "2px solid var(--brasa)")}
                        onBlur={(e)  => (e.currentTarget.style.border = "2px solid transparent")}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black mb-2 uppercase tracking-widest" style={{ color: "var(--ink-3)" }}>Mensagem do Recibo</label>
                      <textarea value={mensagemRecibo}
                        onChange={(e) => setMensagemRecibo(e.target.value)}
                        rows={2}
                        className="w-full px-4 py-3 rounded-2xl text-sm font-semibold outline-none transition-all resize-none"
                        style={{ backgroundColor: "var(--muted)", color: "var(--ink)", border: "2px solid transparent" }}
                        onFocus={(e) => (e.currentTarget.style.border = "2px solid var(--brasa)")}
                        onBlur={(e)  => (e.currentTarget.style.border = "2px solid transparent")}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3 — Pagamentos */}
              {step === 3 && (
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ backgroundColor: "var(--brasa-light)" }}>
                      <CreditCard size={20} style={{ color: "var(--brasa)" }} />
                    </div>
                    <div>
                      <h2 className="font-black text-xl" style={{ color: "var(--ink)" }}>Formas de Pagamento</h2>
                      <p className="text-xs" style={{ color: "var(--ink-4)" }}>Necessário para finalizar vendas</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {METODOS.map(({ value, label, icon: Icon, desc, color }) => {
                      const sel = metodos.includes(value);
                      return (
                        <motion.button key={value} type="button"
                          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                          onClick={() => { toggleMetodo(value); setError(""); }}
                          className="p-4 rounded-2xl text-left transition-all relative"
                          style={{ backgroundColor: sel ? `${color}12` : "var(--muted)",
                            border: sel ? `2px solid ${color}35` : "2px solid transparent" }}>
                          {sel && (
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                              className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full flex items-center justify-center"
                              style={{ backgroundColor: color }}>
                              <Check size={10} className="text-white" strokeWidth={3} />
                            </motion.div>
                          )}
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2.5"
                            style={{ backgroundColor: sel ? `${color}20` : "var(--muted-hover)" }}>
                            <Icon size={18} style={{ color: sel ? color : "var(--ink-3)" }} />
                          </div>
                          <p className="text-sm font-black" style={{ color: sel ? color : "var(--ink)" }}>{label}</p>
                          <p className="text-[10px] mt-0.5 font-semibold" style={{ color: "var(--ink-4)" }}>{desc}</p>
                        </motion.button>
                      );
                    })}
                  </div>
                  {error && <p className="text-xs mt-3 font-semibold" style={{ color: "var(--danger)" }}>{error}</p>}
                </div>
              )}
              {/* Step 4 — PIN */}
              {step === 4 && (
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ backgroundColor: "var(--success-bg)" }}>
                      <Shield size={20} style={{ color: "var(--success)" }} />
                    </div>
                    <div>
                      <h2 className="font-black text-xl" style={{ color: "var(--ink)" }}>PIN de Segurança</h2>
                      <p className="text-xs" style={{ color: "var(--ink-4)" }}>Protege estornos e ações críticas</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-black mb-2 uppercase tracking-widest" style={{ color: "var(--ink-3)" }}>PIN (4–6 dígitos)</label>
                      <input type="password" inputMode="numeric" value={pin} autoFocus maxLength={6}
                        onChange={(e) => { setPin(e.target.value.replace(/\D/g, "")); setError(""); }}
                        placeholder="••••"
                        className="w-full px-4 py-3.5 rounded-2xl text-sm font-semibold outline-none transition-all tracking-[0.5em]"
                        style={{ backgroundColor: "var(--muted)", color: "var(--ink)", border: "2px solid transparent" }}
                        onFocus={(e) => (e.currentTarget.style.border = "2px solid var(--brasa)")}
                        onBlur={(e)  => (e.currentTarget.style.border = "2px solid transparent")}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black mb-2 uppercase tracking-widest" style={{ color: "var(--ink-3)" }}>Confirmar PIN</label>
                      <input type="password" inputMode="numeric" value={pinConfirm} maxLength={6}
                        onChange={(e) => { setPinConfirm(e.target.value.replace(/\D/g, "")); setError(""); }}
                        placeholder="••••"
                        className="w-full px-4 py-3.5 rounded-2xl text-sm font-semibold outline-none transition-all tracking-[0.5em]"
                        style={{ backgroundColor: "var(--muted)", color: "var(--ink)",
                          border: error ? "2px solid var(--danger)" : "2px solid transparent" }}
                        onFocus={(e) => { if (!error) e.currentTarget.style.border = "2px solid var(--brasa)"; }}
                        onBlur={(e)  => { if (!error) e.currentTarget.style.border = "2px solid transparent"; }}
                      />
                      {error && <p className="text-xs mt-1.5 font-semibold" style={{ color: "var(--danger)" }}>{error}</p>}
                    </div>
                    <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl" style={{ backgroundColor: "var(--success-bg)" }}>
                      <Lock size={13} className="mt-0.5 shrink-0" style={{ color: "var(--success)" }} />
                      <p className="text-xs" style={{ color: "var(--success)" }}>
                        O PIN é armazenado com hash seguro. Nem nós conseguimos ver o valor original.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 5 — Produto */}
              {step === 5 && (
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ backgroundColor: "var(--brasa-light)" }}>
                      <Package size={20} style={{ color: "var(--brasa)" }} />
                    </div>
                    <div>
                      <h2 className="font-black text-xl" style={{ color: "var(--ink)" }}>Seu 1º Produto</h2>
                      <p className="text-xs" style={{ color: "var(--ink-4)" }}>Cadastre um item para começar</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-black mb-2 uppercase tracking-widest" style={{ color: "var(--ink-3)" }}>Nome</label>
                      <input type="text" value={nomeProduto} autoFocus
                        onChange={(e) => { setNomeProduto(e.target.value); setError(""); }}
                        placeholder="Ex: X-Burguer"
                        className="w-full px-4 py-3.5 rounded-2xl text-sm font-semibold outline-none transition-all"
                        style={{ backgroundColor: "var(--muted)", color: "var(--ink)", border: "2px solid transparent" }}
                        onFocus={(e) => (e.currentTarget.style.border = "2px solid var(--brasa)")}
                        onBlur={(e)  => (e.currentTarget.style.border = "2px solid transparent")}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black mb-2 uppercase tracking-widest" style={{ color: "var(--ink-3)" }}>Preço</label>
                      <input type="text" inputMode="numeric" value={precoDisplay}
                        onChange={(e) => { setPrecoDisplay(fmtPrice(parseCurrency(e.target.value))); setError(""); }}
                        placeholder="R$ 0,00"
                        className="w-full px-4 py-3.5 rounded-2xl text-sm font-semibold outline-none transition-all"
                        style={{ backgroundColor: "var(--muted)", color: "var(--ink)", border: "2px solid transparent" }}
                        onFocus={(e) => (e.currentTarget.style.border = "2px solid var(--brasa)")}
                        onBlur={(e)  => (e.currentTarget.style.border = "2px solid transparent")}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black mb-2 uppercase tracking-widest" style={{ color: "var(--ink-3)" }}>Categoria</label>
                      <div className="flex flex-wrap gap-2">
                        {CATEGORIAS.map((c) => (
                          <motion.button key={c} type="button" whileTap={{ scale: 0.95 }}
                            onClick={() => setCategoria(c)}
                            className="px-3.5 py-1.5 rounded-full text-xs font-black transition-all"
                            style={{ backgroundColor: categoria === c ? "var(--brasa-light)" : "var(--muted)",
                              color: categoria === c ? "var(--brasa)" : "var(--ink-3)",
                              border: categoria === c ? "1.5px solid var(--brasa-border)" : "1.5px solid transparent" }}>
                            {c}
                          </motion.button>
                        ))}
                      </div>
                    </div>
                    {error && <p className="text-xs font-semibold" style={{ color: "var(--danger)" }}>{error}</p>}
                  </div>
                </div>
              )}

              {/* Step 6 — Celebração */}
              {step === 6 && (
                <div className="text-center">
                  <motion.div initial={{ scale: 0, rotate: -15 }} animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.1 }}
                    className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-5"
                    style={{ backgroundColor: "var(--brasa-light)", boxShadow: "0 8px 24px rgba(211,84,0,0.2)" }}>
                    <BadgeCheck size={38} style={{ color: "var(--brasa)" }} />
                  </motion.div>
                  <motion.h2 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                    className="text-2xl font-black mb-1" style={{ fontFamily: "var(--font-serif)", color: "var(--ink)" }}>
                    Tudo configurado!
                  </motion.h2>
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                    className="text-sm mb-6" style={{ color: "var(--ink-3)" }}>
                    Sua loja está pronta para vender.
                  </motion.p>
                  <div className="flex flex-col gap-2.5 text-left">
                    {[
                      { icon: Store,      label: "Loja",       value: nomeLoja || "—",              color: "#D35400" },
                      { icon: CreditCard, label: "Pagamentos", value: metodos.join(" · ") || "—",   color: "#2D6A4F" },
                      nomeProduto ? { icon: Package, label: "Produto", value: `${nomeProduto} — ${fmtPrice(parseCurrency(precoDisplay))}`, color: "#B7791F" } : null,
                      pin ? { icon: Shield, label: "Segurança", value: "PIN configurado", color: "#5C6B3A" } : null,
                    ].filter(Boolean).map((item, i) => {
                      const Icon = item!.icon;
                      return (
                        <motion.div key={item!.label}
                          initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.35 + i * 0.08 }}
                          className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                          style={{ backgroundColor: `${item!.color}0d`, border: `1px solid ${item!.color}20` }}>
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                            style={{ backgroundColor: `${item!.color}18` }}>
                            <Icon size={15} style={{ color: item!.color }} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: `${item!.color}99` }}>{item!.label}</p>
                            <p className="text-sm font-bold truncate" style={{ color: "var(--ink)" }}>{item!.value}</p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                  {error && <p className="text-xs mt-4 px-3 py-2 rounded-xl font-semibold"
                    style={{ color: "var(--danger)", backgroundColor: "var(--danger-bg)" }}>{error}</p>}
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* Navigation */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
          className="flex flex-col gap-2 mt-5">
          <div className="flex items-center justify-between gap-3">
            {step > 1 && !done ? (
              <motion.button whileTap={{ scale: 0.95 }}
                onClick={() => go(step - 1)} disabled={isPending}
                className="flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold transition-all disabled:opacity-40"
                style={{ backgroundColor: "var(--muted)", color: "var(--ink-2)" }}>
                <ArrowLeft size={15} /> Voltar
              </motion.button>
            ) : <div />}

            <motion.button whileHover={{ scale: done ? 1 : 1.02 }} whileTap={{ scale: 0.96 }}
              onClick={handleSave} disabled={isPending || done}
              className="flex items-center gap-2 px-7 py-3 rounded-2xl text-sm font-black text-white transition-all ml-auto disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, #D35400 0%, #B84A00 100%)",
                boxShadow: step === 6 && !done ? "0 4px 20px rgba(211,84,0,0.45)" : "0 4px 12px rgba(211,84,0,0.3)" }}>
              {isPending
                ? <><Loader2 size={15} className="animate-spin" /> Salvando...</>
                : done ? <><Check size={15} /> Redirecionando...</>
                : step === 6 ? <><Rocket size={15} /> Abrir meu Caixa</>
                : <>Continuar <ArrowRight size={15} /></>
              }
            </motion.button>
          </div>

          {/* Skip button — only for optional steps */}
          {isOptional && !isPending && (
            <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleSkip}
              className="flex items-center justify-center gap-1.5 py-2 text-sm font-semibold transition-all"
              style={{ color: "var(--ink-4)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--ink-2)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--ink-4)")}>
              Pular esta etapa <ChevronRight size={14} />
            </motion.button>
          )}
        </motion.div>
      </div>
    </div>
  );
}

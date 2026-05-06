"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Eye, EyeOff, AlertCircle, ArrowRight, ArrowLeft } from "lucide-react";
import { Syne } from "next/font/google";
import { signInWithGoogle, signInWithPassword } from "./actions";

const syne = Syne({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-syne",
});

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

// Slide variants for step transitions
const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 40 : -40, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -40 : 40, opacity: 0 }),
};

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [direction, setDirection] = useState(1);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState("");
  const [isPendingGoogle, startGoogleTransition] = useTransition();
  const [isPendingForm, startFormTransition] = useTransition();

  const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

  const handleContinue = () => {
    if (!isValidEmail(email)) {
      setEmailError("Digite um e-mail válido.");
      return;
    }
    setEmailError("");
    setServerError("");
    setDirection(1);
    setStep(2);
  };

  const handleBack = () => {
    setDirection(-1);
    setStep(1);
    setServerError("");
    setPassword("");
  };

  const handleGoogleLogin = () => {
    setServerError("");
    startGoogleTransition(async () => {
      const result = await signInWithGoogle();
      if (result && "error" in result) setServerError(result.error);
    });
  };

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (step === 1) { handleContinue(); return; }
    if (!password || password.length < 6) { setServerError("Senha deve ter ao menos 6 caracteres."); return; }
    setServerError("");
    startFormTransition(async () => {
      const result = await signInWithPassword(email.trim(), password);
      if (result?.error) {
        setServerError(result.error);
      } else {
        router.push("/app");
      }
    });
  };

  const isLoading = isPendingGoogle || isPendingForm;

  return (
    <div className={`${syne.variable} auth-root`}>

      {/* ── Brand panel (desktop only) ── */}
      <aside className="auth-brand hidden lg:flex" aria-hidden="true">
        <div className="auth-brand-bg">
          <div className="auth-brand-grid" />
          <div className="auth-brand-glow" />
          <div className="auth-brand-watermark">B</div>
        </div>
        <div className="auth-brand-accent" />
        <div className="auth-brand-top">
          <span className="auth-brand-gem" />
          <span className="auth-brand-name-sm">Balcão Rápido</span>
        </div>
        <div className="auth-brand-center">
          <p className="auth-eyebrow">PDV Para Restaurantes</p>
          <h1 className="auth-display">
            <span className="auth-display-white">BALCÃO</span>
            <span className="auth-display-green">RÁPIDO.</span>
          </h1>
          <p className="auth-brand-sub">
            Vendas ágeis. Controle total.<br />
            Para restaurantes que não param.
          </p>
        </div>
        <div className="auth-brand-stats">
          <div className="auth-stat">
            <span className="auth-stat-num">10k+</span>
            <span className="auth-stat-lbl">pedidos / mês</span>
          </div>
          <div className="auth-stat-sep" />
          <div className="auth-stat">
            <span className="auth-stat-num">200+</span>
            <span className="auth-stat-lbl">restaurantes</span>
          </div>
        </div>
      </aside>

      {/* ── Form panel ── */}
      <section className="auth-panel">
        <div className="auth-mobile-bar lg:hidden" aria-label="Balcão Rápido">
          <span className="auth-brand-gem-sm" />
          <span className="auth-mobile-name">Balcão Rápido</span>
        </div>

        <div className="auth-form-wrap" style={{ overflow: "hidden" }}>

          {/* Step header — slides with content */}
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.22, ease: "easeInOut" }}
            >
              <div className="auth-form-head">
                {step === 1 ? (
                  <>
                    <h2 className="auth-form-title">Bem-vindo de volta.</h2>
                    <p className="auth-form-subtitle">Entre para acessar o seu PDV.</p>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleBack}
                      className="flex items-center gap-1.5 text-xs font-bold dash-label hover:dash-value transition-colors mb-3"
                    >
                      <ArrowLeft size={13} /> Voltar
                    </button>
                    <h2 className="auth-form-title">Digite sua senha.</h2>
                    <p className="auth-form-subtitle" style={{ wordBreak: "break-all" }}>
                      {email}
                    </p>
                  </>
                )}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Error */}
          <AnimatePresence>
            {serverError && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="auth-alert auth-alert--error"
                role="alert"
              >
                <AlertCircle size={14} className="shrink-0 mt-px" />
                <p>{serverError}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={handleSubmit} className="auth-fields" noValidate>
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={step}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.22, ease: "easeInOut" }}
                className="flex flex-col gap-4"
              >
                {step === 1 ? (
                  <div className="auth-field">
                    <label className="auth-label" htmlFor="auth-email">E-mail</label>
                    <input
                      id="auth-email"
                      type="email"
                      autoComplete="email"
                      autoFocus
                      placeholder="seu@restaurante.com"
                      value={email}
                      onChange={e => { setEmail(e.target.value); setEmailError(""); }}
                      onKeyDown={e => e.key === "Enter" && handleContinue()}
                      className="auth-input"
                    />
                    {emailError && <span className="auth-err">{emailError}</span>}
                  </div>
                ) : (
                  <div className="auth-field">
                    <label className="auth-label" htmlFor="auth-pass">Senha</label>
                    <div className="auth-input-wrap">
                      <input
                        id="auth-pass"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        autoFocus
                        placeholder="••••••••"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="auth-input auth-input--pw"
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShowPassword(v => !v)}
                        className="auth-pw-toggle"
                        aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                      >
                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="auth-submit-btn"
                >
                  {isPendingForm ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <>
                      <span>{step === 1 ? "Continuar" : "Entrar"}</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </motion.div>
            </AnimatePresence>
          </form>

          {/* Divider + Google */}
          <div className="auth-divider-row" aria-hidden="true">
            <span className="auth-divider-line" />
            <span className="auth-divider-txt">ou</span>
            <span className="auth-divider-line" />
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="auth-google-btn"
          >
            {isPendingGoogle
              ? <Loader2 size={17} className="animate-spin" />
              : <GoogleIcon />
            }
            <span>Continuar com Google</span>
          </button>

          <p className="auth-footer-txt">
            Ao entrar, você concorda com os{" "}
            <button type="button" className="auth-footer-link">Termos de Uso</button>.
          </p>
        </div>
      </section>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Eye, EyeOff, AlertCircle, ArrowRight } from "lucide-react";
import { Syne } from "next/font/google";
import { signInWithGoogle, signInWithPassword, signUpWithPassword } from "./actions";

const syne = Syne({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-syne",
});

const authSchema = z.object({
  email: z.string().email({ message: "E-mail inválido" }),
  password: z.string().min(6, { message: "Mínimo de 6 caracteres" }),
});
type AuthFormData = z.infer<typeof authSchema>;

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

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isPendingGoogle, startGoogleTransition] = useTransition();
  const [isPendingForm, startFormTransition] = useTransition();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<AuthFormData>({
    resolver: zodResolver(authSchema),
  });

  const switchTab = (t: "login" | "register") => {
    setTab(t);
    setServerError("");
    setSuccessMsg("");
    reset();
  };

  const handleGoogleLogin = () => {
    setServerError("");
    startGoogleTransition(async () => {
      const result = await signInWithGoogle();
      if (result && "error" in result) setServerError(result.error);
    });
  };

  const onSubmit = (data: AuthFormData) => {
    setServerError("");
    setSuccessMsg("");
    startFormTransition(async () => {
      if (tab === "login") {
        const result = await signInWithPassword(data.email, data.password);
        if (result?.error) {
          setServerError(
            result.error.includes("Invalid login credentials")
              ? "E-mail ou senha inválidos. Verifique e tente novamente."
              : result.error
          );
        } else {
          router.push("/");
        }
      } else {
        const result = await signUpWithPassword(data.email, data.password);
        if (result?.error) {
          setServerError(
            result.error.includes("already registered")
              ? "Este e-mail já está em uso. Tente fazer login."
              : result.error
          );
        } else {
          setSuccessMsg("Conta criada! Verifique seu e-mail para confirmar.");
        }
      }
    });
  };

  const isLoading = isPendingGoogle || isPendingForm;

  return (
    <div className={`${syne.variable} auth-root`}>

      {/* ── Painel de Marca (apenas desktop) ──────────────────── */}
      <aside className="auth-brand hidden lg:flex" aria-hidden="true">
        {/* Elementos decorativos de fundo isolados – não afetam o overflow do texto */}
        <div className="auth-brand-bg">
          <div className="auth-brand-grid" />
          <div className="auth-brand-glow" />
          <div className="auth-brand-watermark">B</div>
        </div>
        <div className="auth-brand-accent" />

        {/* Logo */}
        <div className="auth-brand-top">
          <span className="auth-brand-gem" />
          <span className="auth-brand-name-sm">Balcão Rápido</span>
        </div>

        {/* Headline editorial */}
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

        {/* Stats */}
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

      {/* ── Painel do Formulário ──────────────────────────────── */}
      <section className="auth-panel">

        {/* Logo mobile */}
        <div className="auth-mobile-bar lg:hidden" aria-label="Balcão Rápido">
          <span className="auth-brand-gem-sm" />
          <span className="auth-mobile-name">Balcão Rápido</span>
        </div>

        <div className="auth-form-wrap">

          {/* Cabeçalho */}
          <div className="auth-form-head">
            <h2 className="auth-form-title">
              {tab === "login" ? "Bem-vindo de volta." : "Criar conta."}
            </h2>
            <p className="auth-form-subtitle">
              {tab === "login"
                ? "Entre para acessar o seu PDV."
                : "Comece a usar o Balcão Rápido hoje."}
            </p>
          </div>

          {/* Tabs – estilo underline */}
          <div className="auth-tabs-row" role="tablist">
            <button
              role="tab"
              aria-selected={tab === "login"}
              type="button"
              onClick={() => switchTab("login")}
              className={`auth-tab${tab === "login" ? " auth-tab--active" : ""}`}
            >
              Entrar
            </button>
            <button
              role="tab"
              aria-selected={tab === "register"}
              type="button"
              onClick={() => switchTab("register")}
              className={`auth-tab${tab === "register" ? " auth-tab--active" : ""}`}
            >
              Criar Conta
            </button>
          </div>

          {/* Google */}
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

          {/* Divisor */}
          <div className="auth-divider-row" aria-hidden="true">
            <span className="auth-divider-line" />
            <span className="auth-divider-txt">ou e-mail</span>
            <span className="auth-divider-line" />
          </div>

          {/* Feedback */}
          {serverError && (
            <div className="auth-alert auth-alert--error" role="alert">
              <AlertCircle size={14} className="shrink-0 mt-px" />
              <p>{serverError}</p>
            </div>
          )}
          {successMsg && (
            <div className="auth-alert auth-alert--success" role="status">
              <span className="shrink-0 font-bold">✓</span>
              <p>{successMsg}</p>
            </div>
          )}

          {/* Formulário */}
          <form onSubmit={handleSubmit(onSubmit)} className="auth-fields" noValidate>

            <div className="auth-field">
              <label className="auth-label" htmlFor="auth-email">E-mail</label>
              <input
                id="auth-email"
                type="email"
                autoComplete="email"
                autoFocus
                placeholder="seu@restaurante.com"
                {...register("email")}
                className="auth-input"
              />
              {errors.email && <span className="auth-err">{errors.email.message}</span>}
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="auth-pass">Senha</label>
              <div className="auth-input-wrap">
                <input
                  id="auth-pass"
                  type={showPassword ? "text" : "password"}
                  autoComplete={tab === "login" ? "current-password" : "new-password"}
                  placeholder="••••••••"
                  {...register("password")}
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
              {errors.password && <span className="auth-err">{errors.password.message}</span>}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="auth-submit-btn"
            >
              {isPendingForm
                ? <Loader2 size={16} className="animate-spin" />
                : (
                  <>
                    <span>{tab === "login" ? "Entrar" : "Criar Conta"}</span>
                    <ArrowRight size={16} />
                  </>
                )
              }
            </button>
          </form>

          <p className="auth-footer-txt">
            Ao entrar, você concorda com os{" "}
            <button type="button" className="auth-footer-link">Termos de Uso</button>.
          </p>
        </div>
      </section>
    </div>
  );
}

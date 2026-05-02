"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Eye, EyeOff, LogIn, UserPlus, AlertCircle } from "lucide-react";
import { signInWithGoogle, signInWithPassword, signUpWithPassword } from "./actions";

// ── Validation Schema ────────────────────────────────────────────────────────
const authSchema = z.object({
  email: z.string().email({ message: "E-mail inválido" }),
  password: z.string().min(6, { message: "A senha deve ter pelo menos 6 caracteres" }),
});
type AuthFormData = z.infer<typeof authSchema>;

// ── Google SVG Icon ──────────────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

// ── Page Component ───────────────────────────────────────────────────────────
export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isPendingGoogle, startGoogleTransition] = useTransition();
  const [isPendingForm, startFormTransition] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AuthFormData>({ resolver: zodResolver(authSchema) });

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
          router.refresh();
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
          setSuccessMsg("Conta criada! Verifique seu e-mail para confirmar o cadastro.");
        }
      }
    });
  };

  const isLoading = isPendingGoogle || isPendingForm;

  return (
    <div className="login-bg min-h-screen flex items-center justify-center p-4">
      <div className="login-card w-full max-w-md rounded-3xl overflow-hidden">
        {/* Topo decorativo */}
        <div className="h-1 w-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400" />

        <div className="p-8 md:p-10">
          {/* Logo / Branding */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-950/50 border border-emerald-800/40 mb-4 relative">
              <div className="absolute inset-0 bg-emerald-400/10 rounded-2xl blur-xl" />
              <span className="relative text-2xl font-black text-emerald-400">B</span>
            </div>
            <h1 className="login-title text-2xl font-bold tracking-tight">
              Balcão Rápido
            </h1>
            <p className="login-subtitle text-sm mt-1">
              Seu PDV inteligente
            </p>
          </div>

          {/* Tabs */}
          <div className="login-tab-bg flex rounded-2xl p-1 mb-6">
            <button
              type="button"
              onClick={() => switchTab("login")}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-1.5 ${
                tab === "login"
                  ? "login-tab-active shadow-sm"
                  : "login-tab-inactive"
              }`}
            >
              <LogIn size={14} />
              Entrar
            </button>
            <button
              type="button"
              onClick={() => switchTab("register")}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-1.5 ${
                tab === "register"
                  ? "login-tab-active shadow-sm"
                  : "login-tab-inactive"
              }`}
            >
              <UserPlus size={14} />
              Criar Conta
            </button>
          </div>

          {/* Google Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="login-google-btn w-full h-12 rounded-xl border font-semibold text-sm
              flex items-center justify-center gap-3
              transition-all duration-150 active:scale-[0.98] mb-4
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPendingGoogle ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <GoogleIcon />
            )}
            Continuar com Google
          </button>

          {/* Separator */}
          <div className="flex items-center gap-3 mb-4">
            <div className="login-divider flex-1 h-px" />
            <span className="login-divider-text text-xs font-medium px-1">
              ou continue com e-mail
            </span>
            <div className="login-divider flex-1 h-px" />
          </div>

          {/* Error / Success Messages */}
          {serverError && (
            <div className="flex items-start gap-2.5 bg-rose-950/40 border border-rose-800/40 rounded-xl p-3.5 mb-4">
              <AlertCircle size={16} className="text-rose-400 mt-0.5 shrink-0" />
              <p className="text-rose-300 text-sm leading-snug">{serverError}</p>
            </div>
          )}
          {successMsg && (
            <div className="flex items-start gap-2.5 bg-emerald-950/40 border border-emerald-800/40 rounded-xl p-3.5 mb-4">
              <span className="text-emerald-400 text-base leading-none mt-0.5">✓</span>
              <p className="text-emerald-300 text-sm leading-snug">{successMsg}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label className="login-label text-xs font-semibold uppercase tracking-wider">
                E-mail
              </label>
              <input
                type="email"
                autoComplete="email"
                autoFocus
                placeholder="seu@email.com"
                {...register("email")}
                className="login-input w-full py-3 px-4 rounded-xl text-base font-medium
                  outline-none transition-all duration-150
                  focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
              />
              {errors.email && (
                <p className="text-rose-400 text-xs font-semibold">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label className="login-label text-xs font-semibold uppercase tracking-wider">
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete={tab === "login" ? "current-password" : "new-password"}
                  placeholder="••••••••"
                  {...register("password")}
                  className="login-input w-full py-3 pl-4 pr-11 rounded-xl text-base font-medium
                    outline-none transition-all duration-150
                    focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 login-eye-btn p-1 rounded-lg transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-rose-400 text-xs font-semibold">{errors.password.message}</p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 mt-1
                bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700
                disabled:opacity-50 disabled:cursor-not-allowed
                text-white font-bold text-sm rounded-xl
                flex items-center justify-center gap-2
                transition-all duration-150 active:scale-[0.98]"
            >
              {isPendingForm ? (
                <Loader2 size={18} className="animate-spin" />
              ) : tab === "login" ? (
                <>
                  <LogIn size={16} />
                  Entrar
                </>
              ) : (
                <>
                  <UserPlus size={16} />
                  Criar Conta
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <p className="login-footer text-center text-xs mt-6">
            Ao entrar, você concorda com os{" "}
            <span className="underline cursor-pointer hover:opacity-80 transition-opacity">
              Termos de Uso
            </span>
            .
          </p>
        </div>
      </div>
    </div>
  );
}

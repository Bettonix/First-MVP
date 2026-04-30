"use client";

import { useState } from "react";
import { signInWithMagicLink } from "./actions";
import { Loader2, Mail, Sparkles } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      const res = await signInWithMagicLink(email);
      if (res.success) {
        setSuccess(true);
      } else {
        setErrorMsg(res.error || "Ocorreu um erro ao enviar o link.");
      }
    } catch {
      setErrorMsg("Erro inesperado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0D11] flex items-center justify-center p-4">
      {/* Card */}
      <div className="bg-[#13161A] w-full max-w-md rounded-3xl shadow-2xl border border-neutral-800 overflow-hidden">

        {/* Topo decorativo */}
        <div className="h-1 w-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400" />

        <div className="p-8 md:p-10">
          {/* Ícone */}
          <div className="relative w-14 h-14 mx-auto mb-6">
            <div className="absolute inset-0 bg-emerald-400/10 rounded-2xl blur-2xl" />
            <div className="relative w-14 h-14 bg-emerald-950/50 border border-emerald-800/40 rounded-2xl flex items-center justify-center">
              <Mail size={24} className="text-emerald-400" />
            </div>
          </div>

          {/* Título e subtítulo */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-neutral-100 tracking-tight mb-1.5">
              Acessar Meu Balcão
            </h1>
            <p className="text-sm text-neutral-500 leading-relaxed">
              Sem senha. Digite seu e-mail e receba um{" "}
              <span className="text-emerald-400 font-semibold">link mágico</span>{" "}
              de acesso instantâneo.
            </p>
          </div>

          {success ? (
            /* Estado de sucesso */
            <div className="bg-emerald-950/40 border border-emerald-800/40 rounded-2xl p-5 text-center">
              <div className="w-10 h-10 bg-emerald-900/50 border border-emerald-700/30 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Sparkles size={20} className="text-emerald-400" />
              </div>
              <h3 className="font-bold text-emerald-300 mb-1">Link enviado!</h3>
              <p className="text-sm text-emerald-400/80">
                Verifique a caixa de entrada de{" "}
                <strong className="font-semibold text-emerald-300">{email}</strong>
              </p>
              <p className="text-xs text-emerald-500/60 mt-2">
                Verifique também o spam, caso não encontre.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              {/* Campo de e-mail */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="email-input"
                  className="text-xs font-semibold text-neutral-500 uppercase tracking-wider"
                >
                  Endereço de e-mail
                </label>
                <input
                  id="email-input"
                  type="email"
                  required
                  autoFocus
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="
                    w-full py-3 px-4
                    bg-[#191D24] text-neutral-100
                    text-base font-medium placeholder:text-neutral-600
                    border border-neutral-700/50 rounded-xl
                    outline-none transition-all duration-150
                    focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20
                  "
                />
                {errorMsg && (
                  <p className="text-rose-400 text-xs font-semibold mt-0.5">
                    {errorMsg}
                  </p>
                )}
              </div>

              {/* Botão CTA */}
              <button
                type="submit"
                disabled={loading || !email}
                className="
                  w-full h-12 mt-1
                  bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700
                  disabled:bg-neutral-800 disabled:text-neutral-600 disabled:cursor-not-allowed
                  text-white font-bold text-sm rounded-xl
                  flex items-center justify-center gap-2
                  transition-all duration-150 active:scale-[0.98]
                "
              >
                {loading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <>
                    <Mail size={16} />
                    Receber Magic Link
                  </>
                )}
              </button>
            </form>
          )}

          {/* Rodapé */}
          <p className="text-center text-xs text-neutral-600 mt-6">
            Ao entrar, você concorda com os{" "}
            <span className="underline cursor-pointer hover:text-neutral-400 transition-colors">
              Termos de Uso
            </span>
            .
          </p>
        </div>
      </div>
    </div>
  );
}

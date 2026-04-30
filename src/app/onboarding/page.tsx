"use client";

import { useState } from "react";
import { createTenant } from "./actions";
import { Loader2, Rocket, Sparkles } from "lucide-react";

export default function OnboardingPage() {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    const formData = new FormData(e.currentTarget);
    try {
      const res = await createTenant(formData);
      if (res?.error) {
        setErrorMsg(res.error);
        setLoading(false);
      }
    } catch {
      setErrorMsg("Erro inesperado.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0D11] flex items-center justify-center p-4">
      <div className="bg-[#13161A] w-full max-w-md rounded-3xl shadow-2xl border border-neutral-800 overflow-hidden">
        {/* Barra decorativa */}
        <div className="h-1 w-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400" />

        <div className="p-8 md:p-10 text-center">
          {/* Ícone com glow */}
          <div className="relative w-16 h-16 mx-auto mb-6">
            <div className="absolute inset-0 bg-emerald-400/10 rounded-2xl blur-2xl" />
            <div className="relative w-16 h-16 bg-emerald-950/50 border border-emerald-800/40 rounded-2xl flex items-center justify-center">
              <Sparkles size={28} className="text-emerald-400" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-neutral-100 tracking-tight mb-1.5">
            Bem-vindo ao seu PDV
          </h1>
          <p className="text-sm text-neutral-500 leading-relaxed mb-8">
            Para começar a vender, dê um nome para o seu ponto de venda.
            Pode ser o nome da sua barraca, loja ou feira.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5 text-left">
              <label
                htmlFor="nomeLoja"
                className="text-xs font-semibold text-neutral-500 uppercase tracking-wider"
              >
                Nome do negócio
              </label>
              <input
                id="nomeLoja"
                type="text"
                name="nomeLoja"
                required
                autoFocus
                placeholder="Ex: Espetinhos do João"
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

            <button
              type="submit"
              disabled={loading}
              className="
                w-full h-14 mt-1
                bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700
                disabled:bg-neutral-800 disabled:text-neutral-600 disabled:cursor-not-allowed
                text-white font-bold text-base rounded-xl
                flex items-center justify-center gap-2.5
                transition-all duration-150 active:scale-[0.98]
              "
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  <Rocket size={18} />
                  Criar Meu PDV
                </>
              )}
            </button>
          </form>

          <p className="text-xs text-neutral-600 mt-6">
            Você poderá alterar o nome depois nas configurações.
          </p>
        </div>
      </div>
    </div>
  );
}

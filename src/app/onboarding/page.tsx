"use client";

import { useState } from "react";
import { createTenant } from "./actions";
import { Loader2, Store } from "lucide-react";

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
    } catch (err) {
      setErrorMsg("Erro inesperado.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 md:p-10 rounded-3xl shadow-xl border border-slate-100 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Store size={32} />
        </div>
        <h1 className="text-3xl font-black text-slate-900 mb-2">Bem-vindo!</h1>
        <p className="text-slate-500 font-medium mb-8">
          Para começar a vender, como se chama o seu negócio?
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <input
              type="text"
              name="nomeLoja"
              required
              placeholder="Nome da sua Loja ou Barraca"
              className="w-full p-4 bg-slate-50 rounded-xl border border-slate-200 text-lg font-medium outline-none focus:border-emerald-500 focus:bg-white transition-colors text-center"
            />
            {errorMsg && <p className="text-rose-500 text-sm mt-2 font-semibold">{errorMsg}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white disabled:bg-slate-300 disabled:text-slate-500 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-colors active:scale-95 mt-2"
          >
            {loading ? <Loader2 className="animate-spin" /> : "Criar Meu PDV"}
          </button>
        </form>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { signInWithMagicLink } from "./actions";
import { Loader2, Mail } from "lucide-react";

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
    } catch (err) {
      setErrorMsg("Erro inesperado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 md:p-10 rounded-3xl shadow-xl border border-slate-100 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Mail size={32} />
        </div>
        <h1 className="text-3xl font-black text-slate-900 mb-2">Entrar no PDV</h1>
        <p className="text-slate-500 font-medium mb-8">
          Enviaremos um link mágico para o seu e-mail. Sem senhas para lembrar.
        </p>

        {success ? (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-6 rounded-2xl">
            <h3 className="font-bold text-lg mb-1">Link Enviado! 🚀</h3>
            <p className="text-sm font-medium">Verifique a caixa de entrada de <strong>{email}</strong> para acessar sua conta.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full p-4 bg-slate-50 rounded-xl border border-slate-200 text-lg font-medium outline-none focus:border-blue-500 focus:bg-white transition-colors text-center"
              />
              {errorMsg && <p className="text-rose-500 text-sm mt-2 font-semibold">{errorMsg}</p>}
            </div>

            <button
              type="submit"
              disabled={loading || !email}
              className="w-full h-14 bg-slate-900 hover:bg-black text-white disabled:bg-slate-300 disabled:text-slate-500 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-colors active:scale-95 mt-2"
            >
              {loading ? <Loader2 className="animate-spin" /> : "Receber Magic Link"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

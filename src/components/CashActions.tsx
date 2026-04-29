"use client";

import { useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine, Lock, Unlock, Loader2, X } from "lucide-react";
import { abrirTurno, fecharTurno, registrarMovimentacao } from "@/app/actions/turnos";
import { useRouter } from "next/navigation";

export function CashActions({ isTurnoAberto }: { isTurnoAberto: boolean }) {
  const [modalType, setModalType] = useState<'ABRIR' | 'FECHAR' | 'SANGRIA' | 'REFORCO' | null>(null);
  const [valor, setValor] = useState("");
  const [motivo, setMotivo] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const v = Number(valor);
      
      if (modalType === 'ABRIR') {
        const res = await abrirTurno({ valorInicial: v });
        if (!res.success) alert(res.error);
      } else if (modalType === 'FECHAR') {
        const res = await fecharTurno({ valorFinalInformado: v });
        if (res.success && res.relatorio) {
          alert(`Turno Fechado!\nEsperado: R$ ${res.relatorio.esperado}\nInformado: R$ ${res.relatorio.informado}\nDiferença: R$ ${res.relatorio.diferenca}`);
        } else {
          alert(res.error);
        }
      } else if (modalType === 'SANGRIA') {
        const res = await registrarMovimentacao({ tipo: 'SAIDA', valor: v, motivo });
        if (!res.success) alert(res.error);
      } else if (modalType === 'REFORCO') {
        const res = await registrarMovimentacao({ tipo: 'ENTRADA', valor: v, motivo });
        if (!res.success) alert(res.error);
      }
      
      if (modalType === 'ABRIR' || modalType === 'FECHAR') {
        router.refresh();
      }
      
      setModalType(null);
      setValor("");
      setMotivo("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Menu Rápido Flutuante / Fixo */}
      <div className="flex gap-2 mb-4">
        {!isTurnoAberto ? (
          <button 
            onClick={() => setModalType('ABRIR')}
            className="flex-1 bg-green-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            <Unlock size={20} /> ABRIR CAIXA
          </button>
        ) : (
          <>
            <button 
              onClick={() => setModalType('SANGRIA')}
              className="flex-1 bg-red-100 text-red-700 font-bold py-3 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform border border-red-200"
            >
              <ArrowUpFromLine size={20} /> Retirar (Sangria)
            </button>
            <button 
              onClick={() => setModalType('REFORCO')}
              className="flex-1 bg-blue-100 text-blue-700 font-bold py-3 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform border border-blue-200"
            >
              <ArrowDownToLine size={20} /> Adicionar Troco
            </button>
            <button 
              onClick={() => setModalType('FECHAR')}
              className="flex-none bg-neutral-800 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform"
            >
              <Lock size={20} /> Fechar
            </button>
          </>
        )}
      </div>

      {/* Modal Reutilizável Rápido */}
      {modalType && (
        <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full lg:w-[400px] rounded-t-3xl lg:rounded-3xl p-6 pb-10 shadow-2xl animate-in slide-in-from-bottom-10">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">
                {modalType === 'ABRIR' && 'Abrir Turno'}
                {modalType === 'FECHAR' && 'Fechar Turno'}
                {modalType === 'SANGRIA' && 'Retirar Dinheiro'}
                {modalType === 'REFORCO' && 'Adicionar Troco'}
              </h3>
              <button onClick={() => setModalType(null)} className="p-2 bg-neutral-100 rounded-full active:bg-neutral-200">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="text-sm font-semibold text-neutral-600 mb-1 block">
                  {modalType === 'ABRIR' ? 'Troco Inicial na Gaveta (R$)' : ''}
                  {modalType === 'FECHAR' ? 'Dinheiro Total na Gaveta Agora (R$)' : ''}
                  {modalType === 'SANGRIA' || modalType === 'REFORCO' ? 'Valor (R$)' : ''}
                </label>
                <input 
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  autoFocus
                  required
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  className="w-full p-4 bg-neutral-100 rounded-xl text-2xl font-black focus:bg-white border focus:border-blue-500 outline-none"
                />
              </div>

              {(modalType === 'SANGRIA' || modalType === 'REFORCO') && (
                <div>
                  <label className="text-sm font-semibold text-neutral-600 mb-1 block">Motivo</label>
                  <input 
                    type="text"
                    required
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    placeholder="Ex: Troco trocado, Pagamento fornecedor..."
                    className="w-full p-4 bg-neutral-100 rounded-xl text-lg font-medium focus:bg-white border focus:border-blue-500 outline-none"
                  />
                </div>
              )}

              <button 
                type="submit" 
                disabled={loading}
                className="w-full h-14 mt-2 bg-black text-white rounded-xl font-bold text-lg flex justify-center items-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" /> : 'CONFIRMAR'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

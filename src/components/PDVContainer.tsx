"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { ShoppingCart, Trash2, Banknote, QrCode, CreditCard, Loader2, Lock } from "lucide-react";
import { useCartStore } from "@/store/useCartStore";



const checkoutSchema = z.object({
  pagamento: z.enum(['PIX', 'DINHEIRO', 'MISTO']),
  valorRecebido: z.number().min(0, "Valor inválido").optional(),
}).superRefine((data, ctx) => {
  if (data.pagamento === 'DINHEIRO' && !data.valorRecebido) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Informe o valor recebido",
      path: ["valorRecebido"],
    });
  }
});

type CheckoutForm = z.infer<typeof checkoutSchema>;

const formatCurrency = (cents: number) => 
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

import { useQuery } from "@tanstack/react-query";
import { getProdutosPDV } from "@/app/actions/produtos";
import { QuickAddSheet } from "./QuickAddSheet";
import { CashActions } from "./CashActions";

export function PDVContainer({ isTurnoAberto }: { isTurnoAberto: boolean }) {
  const { items, addItem, removeItem, clearCart, totalCentavos } = useCartStore();
  const total = totalCentavos();

  const { register, handleSubmit, watch, formState: { errors } } = useForm<CheckoutForm>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: { pagamento: 'DINHEIRO' }
  });

  const pagamentoType = watch("pagamento");
  const valorRecebidoRaw = watch("valorRecebido");
  
  const valorRecebido = valorRecebidoRaw ? Math.round(Number(valorRecebidoRaw) * 100) : 0;
  const troco = pagamentoType === 'DINHEIRO' ? Math.max(0, valorRecebido - total) : 0;

  // React Query Fetcher (SSR fallback não necessário aqui, mas caching é ultra rápido)
  const { data: produtos = [], isLoading } = useQuery({
    queryKey: ['produtos-pdv'],
    queryFn: async () => await getProdutosPDV(),
  });

  const mutation = useMutation({
    mutationFn: async (data: CheckoutForm) => {
      // Serializando BigInt
      const cartSerialized = items.map(item => ({
        produtoId: Number(item.produtoId), // Simplificação segura p/ DTO JSON no Next
        nome: item.nome,
        quantidade: item.quantidade,
        precoCentavos: item.precoCentavos
      }));

      const response = await fetch('/api/vendas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-tenant-id': 'tenant_123' },
        body: JSON.stringify({
          cart: cartSerialized,
          pagamento: {
            tipo: data.pagamento,
            pixId: data.pagamento === 'PIX' ? 'req_pix_123' : undefined,
          }
        }),
      });

      if (!response.ok) throw new Error("Erro ao finalizar venda");
      return response.json();
    },
    onSuccess: (data) => {
      if (data.alertas) {
        alert(data.alertas.join('\n')); // UI Simples p/ alerta de estoque
      }
      clearCart();
      alert("Venda concluída com sucesso!");
    },
    onError: (err: any) => alert(err.message),
  });

  const onSubmit = (data: CheckoutForm) => {
    if (items.length === 0) return alert("Carrinho vazio!");
    if (pagamentoType === 'DINHEIRO' && valorRecebido < total) {
      return alert("Valor recebido é menor que o total da venda!");
    }
    mutation.mutate(data);
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-neutral-100 overflow-hidden text-neutral-900">
      {/* Área de Produtos (Tap-to-add) */}
      <div className="flex-1 overflow-y-auto p-4 pb-32 lg:pb-4 flex flex-col">
        <CashActions isTurnoAberto={isTurnoAberto} />
        
        <h1 className="text-2xl font-bold mb-4 mt-2">PDV Rápido</h1>
        {isLoading ? (
          <div className="flex justify-center mt-10"><Loader2 className="animate-spin text-blue-500" size={32} /></div>
        ) : !isTurnoAberto ? (
          <div className="flex flex-col items-center justify-center h-64 text-neutral-400 bg-white rounded-2xl border-2 border-dashed border-neutral-200">
            <Lock size={48} className="mb-4" />
            <p className="font-bold text-lg">Caixa Fechado</p>
            <p className="text-sm">Abra o caixa para iniciar as vendas</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {produtos.map((produto: any) => (
              <button
                key={produto.id.toString()}
                onClick={() => addItem({ produtoId: BigInt(produto.id), nome: produto.nome, precoCentavos: produto.precoCentavos })}
                className="bg-white p-4 rounded-2xl shadow-sm active:scale-95 transition-transform border border-neutral-200 flex flex-col items-center justify-center min-h-[120px]"
              >
                <span className="font-semibold text-lg text-center leading-tight">{produto.nome}</span>
                <span className="text-green-700 font-medium mt-2">{formatCurrency(produto.precoCentavos)}</span>
              </button>
            ))}
          </div>
        )}
        {isTurnoAberto && <QuickAddSheet />}
      </div>

      {/* Área do Carrinho e Checkout (Otimizada para polegar) */}
      <div className="bg-white w-full lg:w-[400px] border-t lg:border-l lg:border-t-0 border-neutral-200 flex flex-col h-[55vh] lg:h-full fixed bottom-0 lg:relative z-10 shadow-2xl lg:shadow-none">
        
        {/* Lista do Carrinho */}
        <div className="flex-1 overflow-y-auto p-4 bg-neutral-50 border-b border-neutral-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold flex items-center gap-2"><ShoppingCart size={20}/> Pedido Atual</h2>
            {items.length > 0 && (
              <button onClick={clearCart} className="text-red-500 text-sm font-semibold p-2">Limpar</button>
            )}
          </div>
          {items.length === 0 ? (
            <div className="text-neutral-400 text-center mt-10">Carrinho vazio</div>
          ) : (
            <ul className="space-y-3">
              {items.map(item => (
                <li key={item.produtoId.toString()} className="flex justify-between items-center bg-white p-3 rounded-xl shadow-sm">
                  <div>
                    <div className="font-medium">{item.nome} <span className="text-neutral-500">x{item.quantidade}</span></div>
                    <div className="text-sm text-neutral-500">{formatCurrency(item.precoCentavos * item.quantidade)}</div>
                  </div>
                  <button onClick={() => removeItem(item.produtoId)} className="text-red-400 p-2 active:bg-red-50 rounded-lg">
                    <Trash2 size={18}/>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Formulário de Checkout */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-4 bg-white flex flex-col gap-3">
          <div className="flex justify-between items-end mb-2">
            <span className="text-neutral-500">Total a Pagar</span>
            <span className="text-3xl font-black text-blue-600">{formatCurrency(total)}</span>
          </div>

          {/* Seleção de Pagamento Dinâmica */}
          <div className="grid grid-cols-3 gap-2">
            <label className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-colors cursor-pointer ${pagamentoType === 'DINHEIRO' ? 'border-blue-500 bg-blue-50' : 'border-neutral-200'}`}>
              <input type="radio" value="DINHEIRO" {...register("pagamento")} className="sr-only" />
              <Banknote size={24} className={pagamentoType === 'DINHEIRO' ? 'text-blue-600' : 'text-neutral-400'} />
              <span className="text-xs font-semibold mt-1">Dinheiro</span>
            </label>
            <label className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-colors cursor-pointer ${pagamentoType === 'PIX' ? 'border-teal-500 bg-teal-50' : 'border-neutral-200'}`}>
              <input type="radio" value="PIX" {...register("pagamento")} className="sr-only" />
              <QrCode size={24} className={pagamentoType === 'PIX' ? 'text-teal-600' : 'text-neutral-400'} />
              <span className="text-xs font-semibold mt-1">Pix</span>
            </label>
            <label className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-colors cursor-pointer ${pagamentoType === 'MISTO' ? 'border-purple-500 bg-purple-50' : 'border-neutral-200'}`}>
              <input type="radio" value="MISTO" {...register("pagamento")} className="sr-only" />
              <CreditCard size={24} className={pagamentoType === 'MISTO' ? 'text-purple-600' : 'text-neutral-400'} />
              <span className="text-xs font-semibold mt-1">Misto</span>
            </label>
          </div>

          {/* Input Troco - Focado apenas se Dinheiro */}
          {pagamentoType === 'DINHEIRO' && (
            <div className="flex gap-3 mt-2">
              <div className="flex-1">
                <label className="text-xs text-neutral-500 font-semibold mb-1 block">Recebido (R$)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  inputMode="decimal"
                  {...register("valorRecebido")} 
                  className="w-full p-3 bg-neutral-100 rounded-xl border border-neutral-200 text-lg font-bold outline-none focus:border-blue-500 focus:bg-white"
                  placeholder="0.00"
                />
                {errors.valorRecebido && <span className="text-red-500 text-xs mt-1 block">{errors.valorRecebido.message}</span>}
              </div>
              <div className="w-1/3 flex flex-col justify-end">
                <span className="text-xs text-neutral-500 font-semibold mb-1 block text-right">Troco</span>
                <span className={`text-xl font-bold text-right py-3 ${troco > 0 ? 'text-green-600' : 'text-neutral-400'}`}>
                  {formatCurrency(troco)}
                </span>
              </div>
            </div>
          )}

          <button 
            type="submit" 
            disabled={items.length === 0 || mutation.isPending || !isTurnoAberto}
            className="mt-2 w-full h-16 bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-300 disabled:text-neutral-500 text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-colors active:scale-[0.98]"
          >
            {mutation.isPending ? <Loader2 className="animate-spin" /> : !isTurnoAberto ? "CAIXA FECHADO" : "FINALIZAR VENDA"}
          </button>
        </form>
      </div>
    </div>
  );
}

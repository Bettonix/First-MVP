"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { produtoSchema, ProdutoFormData } from "@/schemas/produto.schema";

interface ProductFormProps {
  mode: 'compact' | 'full';
  onSubmit: (data: ProdutoFormData) => Promise<void>;
  isPending: boolean;
  defaultValues?: Partial<ProdutoFormData>;
}

export function ProductForm({ mode, onSubmit, isPending, defaultValues }: ProductFormProps) {
  const { register, handleSubmit, formState: { errors } } = useForm<ProdutoFormData>({
    resolver: zodResolver(produtoSchema) as any,
    defaultValues: {
      nome: defaultValues?.nome || "",
      preco: defaultValues?.preco || undefined,
      isFavorito: defaultValues?.isFavorito ?? true,
      estoqueAtual: defaultValues?.estoqueAtual ?? 0,
    }
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      {/* Nome */}
      <div>
        <label className="text-sm font-semibold text-neutral-600 mb-1 block">Nome do Produto</label>
        <input 
          {...register("nome")} 
          autoComplete="off"
          placeholder="Ex: Espetinho de Carne"
          className="w-full p-4 bg-neutral-100 rounded-xl border border-neutral-200 text-lg font-medium outline-none focus:border-blue-500 focus:bg-white transition-colors"
        />
        {errors.nome && <span className="text-red-500 text-xs mt-1 block">{errors.nome.message}</span>}
      </div>

      {/* Preço - Optimização para Mobile (inputMode decimal) */}
      <div>
        <label className="text-sm font-semibold text-neutral-600 mb-1 block">Preço (R$)</label>
        <input 
          type="number"
          step="0.01"
          inputMode="decimal"
          {...register("preco")} 
          placeholder="0.00"
          className="w-full p-4 bg-neutral-100 rounded-xl border border-neutral-200 text-xl font-bold outline-none focus:border-blue-500 focus:bg-white transition-colors"
        />
        {errors.preco && <span className="text-red-500 text-xs mt-1 block">{errors.preco.message}</span>}
      </div>

      {/* Modo Full: Mostra Estoque e Favorito */}
      {mode === 'full' && (
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="text-sm font-semibold text-neutral-600 mb-1 block">Estoque Inicial</label>
            <input 
              type="number"
              inputMode="numeric"
              {...register("estoqueAtual")} 
              className="w-full p-4 bg-neutral-100 rounded-xl border border-neutral-200 text-lg font-medium outline-none focus:border-blue-500 focus:bg-white transition-colors"
            />
            {errors.estoqueAtual && <span className="text-red-500 text-xs mt-1 block">{errors.estoqueAtual.message}</span>}
          </div>
          
          <div className="flex items-center gap-2 mt-6">
            <input 
              type="checkbox" 
              {...register("isFavorito")} 
              id="isFavorito"
              className="w-6 h-6 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="isFavorito" className="text-sm font-semibold text-neutral-600">
              Favorito (PDV)
            </label>
          </div>
        </div>
      )}

      <button 
        type="submit" 
        disabled={isPending}
        className="mt-4 w-full h-14 bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-300 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-colors active:scale-95"
      >
        {isPending ? <Loader2 className="animate-spin" /> : "SALVAR PRODUTO"}
      </button>
    </form>
  );
}

"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Star, AlertTriangle, ChevronUp } from "lucide-react";
import { produtoSchema, ProdutoFormData, CATEGORIAS_PRODUTO } from "@/schemas/produto.schema";

interface ProductFormProps {
  onSubmit: (data: ProdutoFormData) => Promise<void>;
  isPending: boolean;
  defaultValues?: Partial<ProdutoFormData>;
  submitLabel?: string;
}

const inputClass = "w-full py-4 px-5 bg-neutral-800 text-neutral-100 text-lg font-bold placeholder:text-neutral-500 border border-white/10 rounded-2xl outline-none transition-all duration-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10";
const labelClass = "text-[11px] font-black text-neutral-400 uppercase tracking-[0.2em] mb-2 block ml-1";
const errorClass = "text-rose-400 text-xs font-bold mt-2 ml-1 flex items-center gap-1";

export function ProductForm({ onSubmit, isPending, defaultValues, submitLabel }: ProductFormProps) {
  const { register, handleSubmit, formState: { errors } } = useForm<ProdutoFormData>({
    resolver: zodResolver(produtoSchema) as any,
    defaultValues: {
      nome: defaultValues?.nome || "",
      preco: defaultValues?.preco || undefined,
      precoCusto: defaultValues?.precoCusto || 0,
      categoria: defaultValues?.categoria || "Outros",
      isFavorito: defaultValues?.isFavorito ?? true,
      estoqueAtual: defaultValues?.estoqueAtual ?? 0,
    }
  });

  const sanitize = (v: string) => v.replace(/[^0-9.]/g, '');

  const onFormSubmit = async (data: ProdutoFormData) => {
    const sanitized = {
      ...data,
      preco: Number(sanitize(String(data.preco))) || 0,
      precoCusto: Number(sanitize(String(data.precoCusto))) || 0,
      estoqueAtual: Number(sanitize(String(data.estoqueAtual))) || 0,
    };
    await onSubmit(sanitized);
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="flex flex-col gap-6">
      <div>
        <label className={labelClass}>Nome do Produto</label>
        <input {...register("nome")} autoComplete="off" placeholder="Ex: Espetinho de Carne" className={inputClass} />
        {errors.nome && <span className={errorClass}><AlertTriangle size={12}/> {errors.nome.message}</span>}
      </div>

      <div className="grid grid-cols-2 gap-5">
        <div>
          <label className={labelClass}>Preço de Venda (R$)</label>
          <input type="number" step="0.01" inputMode="decimal" {...register("preco", { valueAsNumber: true })} placeholder="0.00" className={inputClass} />
          {errors.preco && <span className={errorClass}><AlertTriangle size={12}/> {errors.preco.message}</span>}
        </div>
        <div>
          <label className={labelClass}>Preço de Custo (R$)</label>
          <input type="number" step="0.01" inputMode="decimal" {...register("precoCusto", { valueAsNumber: true })} placeholder="0.00" className={inputClass} />
          {errors.precoCusto && <span className={errorClass}><AlertTriangle size={12}/> {errors.precoCusto.message}</span>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5">
        <div>
          <label className={labelClass}>Categoria</label>
          <div className="relative">
            <select {...register("categoria")} className={`${inputClass} appearance-none cursor-pointer pr-10`}>
              {CATEGORIAS_PRODUTO.map(cat => (
                <option key={cat} value={cat} className="bg-neutral-900 text-neutral-100">{cat}</option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500">
              <ChevronUp size={16} className="rotate-180" />
            </div>
          </div>
          {errors.categoria && <span className={errorClass}><AlertTriangle size={12}/> {errors.categoria.message}</span>}
        </div>
        <div>
          <label className={labelClass}>Estoque Inicial</label>
          <input type="number" inputMode="numeric" {...register("estoqueAtual", { valueAsNumber: true })} placeholder="0" className={inputClass} />
          {errors.estoqueAtual && <span className={errorClass}><AlertTriangle size={12}/> {errors.estoqueAtual.message}</span>}
        </div>
      </div>

      <label htmlFor="isFavorito" className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5 cursor-pointer hover:bg-white/10 transition-all active:scale-[0.99]">
        <input type="checkbox" {...register("isFavorito")} id="isFavorito" className="sr-only peer" />
        <div className="w-6 h-6 rounded-lg border-2 border-white/20 flex items-center justify-center peer-checked:bg-amber-500 peer-checked:border-amber-500 transition-all shadow-inner">
          <Star size={14} className="text-white opacity-0 peer-checked:opacity-100 fill-current" />
        </div>
        <span className="text-sm font-black text-neutral-300 uppercase tracking-wider">Fixar no topo (Favorito)</span>
      </label>

      <button type="submit" disabled={isPending} className="mt-4 w-full h-16 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:bg-neutral-800 disabled:text-neutral-600 text-white rounded-[20px] font-black text-sm uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all duration-200 active:scale-[0.98] shadow-[0_20px_40px_rgba(16,185,129,0.2)]">
        {isPending ? <Loader2 className="animate-spin" size={20} /> : (submitLabel || "SALVAR PRODUTO")}
      </button>
    </form>
  );
}

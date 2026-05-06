"use client";

import { useForm, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Star, AlertTriangle } from "lucide-react";
import { produtoSchema, ProdutoFormData, CATEGORIAS_PRODUTO } from "@/schemas/produto.schema";
import { PremiumSelect } from "./PremiumSelect";

interface ProductFormProps {
  onSubmit: (data: ProdutoFormData) => Promise<void>;
  isPending: boolean;
  defaultValues?: Partial<ProdutoFormData>;
  submitLabel?: string;
}

const inputClass = "w-full py-4 px-5 dash-input text-lg font-bold rounded-2xl outline-none transition-all duration-200 focus:ring-2 focus:ring-[rgba(211,84,0,0.2)] focus:border-[var(--brasa)]";
const labelClass = "text-[11px] font-black dash-label uppercase tracking-[0.2em] mb-2 block ml-1";
const errorClass = "text-[var(--danger)] text-xs font-bold mt-2 ml-1 flex items-center gap-1";

export function ProductForm({ onSubmit, isPending, defaultValues, submitLabel }: ProductFormProps) {
  const { register, control, handleSubmit, formState: { errors } } = useForm<ProdutoFormData>({
    resolver: zodResolver(produtoSchema) as Resolver<ProdutoFormData>,
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
          <Controller
            name="categoria"
            control={control}
            render={({ field }) => (
              <PremiumSelect
                options={CATEGORIAS_PRODUTO as unknown as string[]}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                className={`${inputClass} appearance-none cursor-pointer`}
              />
            )}
          />
          {errors.categoria && <span className={errorClass}><AlertTriangle size={12}/> {errors.categoria.message}</span>}
        </div>
        <div>
          <label className={labelClass}>Estoque Inicial</label>
          <input type="number" inputMode="numeric" {...register("estoqueAtual", { valueAsNumber: true })} placeholder="0" className={inputClass} />
          {errors.estoqueAtual && <span className={errorClass}><AlertTriangle size={12}/> {errors.estoqueAtual.message}</span>}
        </div>
      </div>

      <label htmlFor="isFavorito" className="flex items-center gap-4 p-4 dash-muted rounded-2xl border dash-border cursor-pointer dash-row-hover transition-all active:scale-[0.99]">
        <input type="checkbox" {...register("isFavorito")} id="isFavorito" className="sr-only peer" />
        <div className="w-6 h-6 rounded-lg border-2 border-[var(--border-md)] flex items-center justify-center peer-checked:bg-[var(--brasa)] peer-checked:border-[var(--brasa)] transition-all shadow-inner">
          <Star size={14} className="text-white opacity-0 peer-checked:opacity-100 fill-current" />
        </div>
        <span className="text-sm font-black dash-value uppercase tracking-wider">Fixar no topo (Favorito)</span>
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="mt-4 w-full h-16 text-white rounded-[20px] font-black text-sm uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all duration-200 active:scale-[0.98] hover:-translate-y-px disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ background: "linear-gradient(135deg, #D35400 0%, #B84A00 100%)", boxShadow: "0 8px 24px rgba(211,84,0,0.3)" }}
      >
        {isPending ? <Loader2 className="animate-spin" size={20} /> : (submitLabel || "SALVAR PRODUTO")}
      </button>
    </form>
  );
}

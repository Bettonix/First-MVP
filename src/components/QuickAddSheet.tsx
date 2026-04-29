"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { ProductForm } from "./ProductForm";
import { createProduto } from "@/app/actions/produtos";
import { ProdutoFormData } from "@/schemas/produto.schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function QuickAddSheet() {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (data: ProdutoFormData) => {
      const res = await createProduto(data);
      if (!res.success) throw new Error(res.error || "Erro ao criar");
      return res.produto;
    },
    // Optimistic Update: Adiciona na UI instantaneamente antes do server responder
    onMutate: async (newProdutoData) => {
      await queryClient.cancelQueries({ queryKey: ['produtos-pdv'] });
      const previousProdutos = queryClient.getQueryData(['produtos-pdv']);
      
      // Cria um ID temporário e salva no cache
      const optimisticProduto = { 
        id: `temp-${Date.now()}`, 
        nome: newProdutoData.nome, 
        precoCentavos: Math.round(newProdutoData.preco * 100) 
      };

      queryClient.setQueryData(['produtos-pdv'], (old: any) => {
        return old ? [...old, optimisticProduto] : [optimisticProduto];
      });

      setIsOpen(false); // Fecha o Sheet com transição suave instantânea

      return { previousProdutos };
    },
    onError: (err, newProduto, context) => {
      // Reverte em caso de erro
      if (context?.previousProdutos) {
        queryClient.setQueryData(['produtos-pdv'], context.previousProdutos);
      }
      alert("Erro ao salvar produto rápido");
    },
    onSettled: () => {
      // Garante que o estado real do DB foi fetchado em background
      queryClient.invalidateQueries({ queryKey: ['produtos-pdv'] });
    }
  });

  const onSubmit = async (data: ProdutoFormData) => {
    mutation.mutate(data);
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="w-full mt-4 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 p-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-colors active:scale-95 border border-emerald-200"
      >
        <Plus size={24} /> Cadastrar Produto Rápido
      </button>

      {/* Overlay - Transição suave (evita modal brusco) */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-40 transition-opacity backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sheet / Drawer Inferior Otimizado para Mobile */}
      <div 
        className={`fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl shadow-2xl transition-transform duration-300 ease-out transform ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}
      >
        <div className="p-6 pb-10">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-neutral-800">Adicionar Rápido</h3>
            <button onClick={() => setIsOpen(false)} className="p-2 text-neutral-500 bg-neutral-100 rounded-full active:bg-neutral-200">
              <X size={20} />
            </button>
          </div>
          
          <ProductForm 
            mode="compact" 
            onSubmit={onSubmit} 
            isPending={false} // Loading gerido pelo Optimistic Update
          />
        </div>
      </div>
    </>
  );
}

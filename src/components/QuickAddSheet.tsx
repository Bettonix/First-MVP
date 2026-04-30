"use client";

import { useState } from "react";
import { Plus, X, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { ProductForm } from "./ProductForm";
import { createProduto, updateProduto, deleteProduto } from "@/app/actions/produtos";
import { ProdutoFormData } from "@/schemas/produto.schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ──────────────────────────────────────────────────────

interface ProductData {
  id: string;
  nome: string;
  precoCentavos: number;
  precoCustoCentavos: number;
  categoria: string;
  estoqueAtual: number;
  estoqueInicial: number;
  isFavorito: boolean;
}

// ─── Quick Add Button (for product grid) ────────────────────────

export function QuickAddButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="
        h-12 px-5 rounded-xl font-black text-sm uppercase tracking-widest
        flex items-center justify-center gap-2
        bg-emerald-600 hover:bg-emerald-500 text-white
        transition-all duration-150 active:scale-[0.98]
        shadow-lg shadow-emerald-600/20
      "
    >
      <Plus size={16} /> Novo Produto
    </button>
  );
}

// ─── Product CRUD Sheet ─────────────────────────────────────────

interface QuickAddSheetProps {
  editProduct?: ProductData | null;
  isOpen?: boolean;
  onClose?: () => void;
  onMessage?: (msg: string, type: 'success' | 'error') => void;
}

export function QuickAddSheet({ editProduct, isOpen: externalIsOpen, onClose, onMessage }: QuickAddSheetProps = {}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const queryClient = useQueryClient();

  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalOpen;
  const close = () => {
    if (onClose) onClose();
    else setInternalOpen(false);
  };

  const notify = (msg: string, type: 'success' | 'error' = 'success') => {
    if (onMessage) onMessage(msg, type);
    else if (type === 'error') console.error(msg);
  };

  const createMutation = useMutation({
    mutationFn: async (data: ProdutoFormData) => {
      const res = await createProduto(data);
      if (!res.success) throw new Error((res as any).error || "Erro ao criar");
      return (res as any).produto;
    },
    onMutate: async (newProdutoData) => {
      await queryClient.cancelQueries({ queryKey: ['produtos-pdv'] });
      const previousProdutos = queryClient.getQueryData(['produtos-pdv']);

      const optimisticProduto = {
        id: `temp-${Date.now()}`,
        nome: newProdutoData.nome,
        precoCentavos: Math.round(newProdutoData.preco * 100),
        precoCustoCentavos: Math.round((newProdutoData.precoCusto || 0) * 100),
        categoria: newProdutoData.categoria || "Outros",
        estoqueAtual: newProdutoData.estoqueAtual || 0,
        estoqueInicial: newProdutoData.estoqueAtual || 0,
        isFavorito: newProdutoData.isFavorito ?? true,
      };

      queryClient.setQueryData(['produtos-pdv'], (old: unknown) => {
        return Array.isArray(old) ? [...old, optimisticProduto] : [optimisticProduto];
      });

      close();
      return { previousProdutos };
    },
    onError: (err: any, _newProduto, context) => {
      if (context?.previousProdutos) {
        queryClient.setQueryData(['produtos-pdv'], context.previousProdutos);
      }
      notify(err.message || "Erro ao salvar produto.", "error");
    },
    onSuccess: () => notify("Produto criado com sucesso!"),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['produtos-pdv'] });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (data: ProdutoFormData) => {
      if (!editProduct) throw new Error("Sem produto para editar");
      const res = await updateProduto(editProduct.id, data);
      if (!res.success) throw new Error((res as any).error || "Erro ao atualizar");
      return (res as any).produto;
    },
    onMutate: async (updatedData) => {
      await queryClient.cancelQueries({ queryKey: ['produtos-pdv'] });
      const previousProdutos = queryClient.getQueryData(['produtos-pdv']);

      queryClient.setQueryData(['produtos-pdv'], (old: unknown) => {
        if (!Array.isArray(old) || !editProduct) return old;
        return old.map((p: any) =>
          p.id === editProduct.id
            ? {
                ...p,
                nome: updatedData.nome,
                precoCentavos: Math.round(updatedData.preco * 100),
                precoCustoCentavos: Math.round((updatedData.precoCusto || 0) * 100),
                categoria: updatedData.categoria || "Outros",
                estoqueAtual: updatedData.estoqueAtual || 0,
                isFavorito: updatedData.isFavorito ?? true,
              }
            : p
        );
      });

      close();
      return { previousProdutos };
    },
    onError: (err: any, _data, context) => {
      if (context?.previousProdutos) {
        queryClient.setQueryData(['produtos-pdv'], context.previousProdutos);
      }
      notify(err.message || "Erro ao atualizar produto.", "error");
    },
    onSuccess: () => {
      notify("Produto atualizado com sucesso!");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['produtos-pdv'] });
    }
  });

  const [isDeleting, setIsDeleting] = useState(false);
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!editProduct) return;
      const res = await deleteProduto(editProduct.id);
      if (!res.success) throw new Error(res.error || "Erro ao excluir");
    },
    onSuccess: () => {
      notify("Produto excluído com sucesso!");
      setIsDeleting(false);
      close();
    },
    onError: (err: any) => notify(err.message, "error"),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['produtos-pdv'] }),
  });

  const handleFormSubmit = async (data: ProdutoFormData) => {
    if (editProduct) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  const defaultValues: Partial<ProdutoFormData> | undefined = editProduct
    ? {
        nome: editProduct.nome,
        preco: editProduct.precoCentavos / 100,
        precoCusto: editProduct.precoCustoCentavos / 100,
        categoria: editProduct.categoria,
        estoqueAtual: editProduct.estoqueAtual,
        isFavorito: editProduct.isFavorito,
      }
    : undefined;

  return (
    <>
      {/* Internal trigger button (only when not externally controlled) */}
      {externalIsOpen === undefined && (
        <button
          onClick={() => setInternalOpen(true)}
          className="
            h-12 px-5 rounded-xl font-black text-sm uppercase tracking-widest
            flex items-center justify-center gap-2
            bg-emerald-600 hover:bg-emerald-500 text-white
            transition-all duration-150 active:scale-[0.98]
            shadow-lg shadow-emerald-600/20
          "
        >
          <Plus size={16} /> Novo Produto
        </button>
      )}

      {/* Modal Overlay */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-xl"
              onClick={close}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-[#13161A] w-full max-w-lg p-8 rounded-[32px] border border-white/10 relative shadow-[0_0_80px_rgba(0,0,0,0.5)] max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-8">
                <div className="flex flex-col">
                  <h2 className="text-2xl font-black tracking-tighter text-white">
                    {editProduct ? "Editar Produto" : "Novo Produto"}
                  </h2>
                  <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mt-1">
                    {editProduct ? "Ajuste os detalhes abaixo" : "Preencha para cadastrar"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {editProduct && (
                    <button
                      onClick={() => setIsDeleting(true)}
                      className="p-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-2xl transition-all"
                      title="Excluir Produto"
                    >
                      <Trash2 size={20} />
                    </button>
                  )}
                  <button
                    onClick={close}
                    className="p-3 bg-white/5 hover:bg-white/10 text-neutral-500 hover:text-neutral-200 rounded-2xl transition-all"
                    aria-label="Fechar modal"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              <ProductForm
                key={editProduct?.id || "new"}
                onSubmit={handleFormSubmit}
                isPending={isPending}
                defaultValues={defaultValues}
                submitLabel={editProduct ? "ATUALIZAR PRODUTO" : "SALVAR PRODUTO"}
              />

              <AnimatePresence>
                {isDeleting && (
                  <DeleteConfirmModal 
                    product={editProduct} 
                    onConfirm={() => deleteMutation.mutate()} 
                    onCancel={() => setIsDeleting(false)} 
                    isPending={deleteMutation.isPending} 
                  />
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Delete Confirmation Modal ──────────────────────────────────

interface DeleteConfirmProps {
  product: ProductData | null;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}

export function DeleteConfirmModal({ product, onConfirm, onCancel, isPending }: DeleteConfirmProps) {
  if (!product) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/80 backdrop-blur-xl"
        onClick={onCancel}
      />
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-[#13161A] w-full max-w-sm p-8 rounded-[32px] border border-rose-500/20 relative shadow-[0_0_60px_rgba(239,68,68,0.15)] flex flex-col items-center text-center"
      >
        <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mb-5">
          <AlertTriangle size={32} className="text-rose-400" />
        </div>
        <h3 className="text-lg font-black mb-2 tracking-tighter">Excluir Produto?</h3>
        <p className="text-neutral-400 text-sm mb-6">
          Tem certeza que deseja excluir <strong className="text-neutral-200">{product.nome}</strong>? Esta ação é irreversível.
        </p>
        <div className="w-full flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 h-12 bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 rounded-xl font-bold text-sm transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="flex-1 h-12 bg-rose-600 hover:bg-rose-500 disabled:bg-neutral-800 disabled:text-neutral-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
          >
            {isPending ? <span className="animate-spin">⟳</span> : <><Trash2 size={14} /> Excluir</>}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

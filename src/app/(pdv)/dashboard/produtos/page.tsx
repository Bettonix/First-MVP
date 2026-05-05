"use client";

import { useState, useCallback, useTransition, useEffect, Suspense } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package, Plus, Search, X, Check, AlertTriangle,
  Loader2, ChevronRight, ImageOff,
} from "lucide-react";
import { getProdutosCatalogo, toggleProdutoAtivo, updateProduto } from "@/app/actions/produtos";
import { createProduto } from "@/app/actions/produtos";
import { ProductForm } from "@/components/ProductForm";
import { fmtBRL, safeCentavos } from "@/lib/currency";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ProdutoFormData } from "@/schemas/produto.schema";

// ─── Types ────────────────────────────────────────────────────────
interface ProdutoCatalogo {
  id: string;
  nome: string;
  precoCentavos: number;
  precoCustoCentavos: number;
  categoria: string;
  estoqueAtual: number;
  isFavorito: boolean;
  ativo: boolean;
}

const fmt = (c: number) => fmtBRL(safeCentavos(c));

// ─── Toggle Switch ────────────────────────────────────────────────
function ToggleSwitch({
  checked, onChange, disabled,
}: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={e => { e.stopPropagation(); onChange(!checked); }}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
        checked ? "bg-[var(--brasa)]" : "bg-neutral-600"
      }`}
    >
      <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transform transition-transform duration-200 ${checked ? "translate-x-5" : "translate-x-0"}`} />
    </button>
  );
}

// ─── Product Drawer ───────────────────────────────────────────────
function ProductDrawer({
  produto,
  onClose,
  onSaved,
}: {
  produto: ProdutoCatalogo | null;
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [togglePending, startToggleTransition] = useTransition();
  const [localAtivo, setLocalAtivo] = useState(produto?.ativo ?? true);

  useEffect(() => { setLocalAtivo(produto?.ativo ?? true); }, [produto?.id]);

  const handleSave = async (data: ProdutoFormData) => {
    startTransition(async () => {
      if (produto) {
        const res = await updateProduto(produto.id, data);
        if (res.success) { onSaved("Produto atualizado."); onClose(); }
      } else {
        const res = await createProduto(data);
        if (res.success) { onSaved("Produto criado."); onClose(); }
      }
    });
  };

  const handleToggle = (v: boolean) => {
    setLocalAtivo(v);
    startToggleTransition(async () => {
      if (produto) {
        const res = await toggleProdutoAtivo(produto.id, v);
        if (!res.success) setLocalAtivo(!v);
        else onSaved(v ? "Produto ativado." : "Produto desativado.");
      }
    });
  };

  const defaultValues: Partial<ProdutoFormData> | undefined = produto
    ? {
        nome: produto.nome,
        preco: produto.precoCentavos / 100,
        precoCusto: produto.precoCustoCentavos / 100,
        categoria: produto.categoria,
        isFavorito: produto.isFavorito,
        estoqueAtual: produto.estoqueAtual,
      }
    : undefined;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4 shrink-0"
        style={{ borderBottom: "1px solid var(--border)", backgroundColor: "var(--porcelana)" }}
      >
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest dash-label">
            {produto ? "Editar Produto" : "Novo Produto"}
          </p>
          <h3 className="font-black text-base dash-value tracking-tight truncate max-w-[220px]">
            {produto?.nome ?? "Cadastrar"}
          </h3>
        </div>
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-xl flex items-center justify-center dash-muted dash-label hover:dash-value transition-colors"
          style={{ border: "1px solid var(--border-md)" }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-6">
        {/* Image placeholder */}
        <div
          className="w-full h-36 rounded-2xl flex flex-col items-center justify-center gap-2 dash-muted"
          style={{ border: "2px dashed var(--border-md)" }}
        >
          <ImageOff size={28} className="dash-label" />
          <span className="text-[10px] font-black uppercase tracking-widest dash-label">
            Upload de imagem em breve
          </span>
        </div>

        {/* Ativo toggle (only for existing products) */}
        {produto && (
          <div
            className="flex items-center justify-between p-4 rounded-2xl dash-muted"
            style={{ border: "1px solid var(--border-md)" }}
          >
            <div>
              <p className="text-xs font-black dash-value uppercase tracking-wider">Disponível no balcão</p>
              <p className="text-[10px] dash-label mt-0.5">Produtos inativos não aparecem para venda</p>
            </div>
            <div className="flex items-center gap-2">
              {togglePending && <Loader2 size={13} className="animate-spin dash-label" />}
              <ToggleSwitch checked={localAtivo} onChange={handleToggle} disabled={togglePending} />
            </div>
          </div>
        )}

        {/* Product form */}
        <ProductForm
          onSubmit={handleSave}
          isPending={isPending}
          defaultValues={defaultValues}
          submitLabel={isPending ? "Salvando..." : produto ? "Salvar Alterações" : "Criar Produto"}
        />
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────
function ProdutosCatalogoInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const selectedId = searchParams.get("produto");
  const isNewOpen = searchParams.get("produto") === "novo";

  const showToast = useCallback((msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const openDrawer = (id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("produto", id);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const closeDrawer = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("produto");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
    queryClient.invalidateQueries({ queryKey: ["produtos-catalogo"] });
  };

  const { data: produtos = [], isLoading } = useQuery({
    queryKey: ["produtos-catalogo"],
    queryFn: getProdutosCatalogo,
  });

  type ToggleVars = { id: string; ativo: boolean };
  type ToggleCtx = { prev?: ProdutoCatalogo[] };

  const toggleMutation = useMutation<unknown, unknown, ToggleVars, ToggleCtx>({
    mutationFn: ({ id, ativo }) => toggleProdutoAtivo(id, ativo),
    onMutate: async ({ id, ativo }) => {
      setPendingIds(prev => new Set(prev).add(id));
      await queryClient.cancelQueries({ queryKey: ["produtos-catalogo"] });
      const prev = queryClient.getQueryData<ProdutoCatalogo[]>(["produtos-catalogo"]);
      queryClient.setQueryData<ProdutoCatalogo[]>(["produtos-catalogo"], old =>
        old?.map(p => p.id === id ? { ...p, ativo } : p) ?? []
      );
      return { prev };
    },
    onError: (_err, { id }, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["produtos-catalogo"], ctx.prev);
      showToast("Erro ao atualizar produto.", false);
      setPendingIds(prev => { const s = new Set(prev); s.delete(id); return s; });
    },
    onSuccess: (_data, { id, ativo }) => {
      showToast(ativo ? "Produto ativado." : "Produto desativado.");
      setPendingIds(prev => { const s = new Set(prev); s.delete(id); return s; });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["produtos-catalogo"] });
    },
  });

  const filtered = produtos.filter(p =>
    p.nome.toLowerCase().includes(search.toLowerCase()) ||
    p.categoria.toLowerCase().includes(search.toLowerCase())
  );

  const drawerProduto = selectedId && selectedId !== "novo"
    ? (produtos.find(p => p.id === selectedId) ?? null)
    : null;

  const drawerOpen = !!selectedId;

  return (
    <div className="flex h-full min-h-screen">
      {/* ─── Main list ─── */}
      <div className={`flex-1 min-w-0 p-6 transition-all duration-300 ${drawerOpen ? "max-w-[calc(100%-420px)]" : ""}`}>
        <div className="max-w-4xl mx-auto flex flex-col gap-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black dash-value flex items-center gap-2 tracking-tighter">
                <Package size={22} style={{ color: "var(--brasa)" }} />
                Catálogo
              </h1>
              <p className="dash-subtitle text-xs mt-0.5">
                {produtos.length} produto{produtos.length !== 1 ? "s" : ""} · {produtos.filter(p => p.ativo).length} ativos
              </p>
            </div>
            <button
              onClick={() => openDrawer("novo")}
              className="h-10 px-4 rounded-2xl font-black text-xs uppercase tracking-widest text-white flex items-center gap-2 transition-all active:scale-95"
              style={{ backgroundColor: "var(--brasa)" }}
            >
              <Plus size={15} /> Novo
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 dash-label pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por nome ou categoria..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-10 pl-10 pr-4 dash-muted border dash-border rounded-2xl text-sm font-medium focus:border-[var(--brasa)] outline-none transition-all"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 dash-label hover:dash-value">
                <X size={13} />
              </button>
            )}
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="flex items-center justify-center py-24 dash-subtitle text-sm gap-2">
              <Loader2 size={16} className="animate-spin" /> Carregando...
            </div>
          ) : (
            <div className="dash-card rounded-3xl border dash-border overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest dash-label">Produto</th>
                    <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest dash-label hidden sm:table-cell">Categoria</th>
                    <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest dash-label">Preço</th>
                    <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest dash-label hidden md:table-cell">Estoque</th>
                    <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest dash-label text-center">Ativo</th>
                    <th className="px-5 py-3 w-8" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center dash-subtitle text-sm">
                        Nenhum produto encontrado.
                      </td>
                    </tr>
                  ) : filtered.map((p, i) => (
                    <tr
                      key={p.id}
                      onClick={() => openDrawer(p.id)}
                      className="cursor-pointer transition-colors hover:bg-[var(--muted)]"
                      style={{
                        borderBottom: i < filtered.length - 1 ? "1px solid var(--border)" : undefined,
                        opacity: p.ativo ? 1 : 0.45,
                        backgroundColor: selectedId === p.id ? "var(--muted)" : undefined,
                      }}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 dash-muted"
                            style={{ border: "1px solid var(--border-md)" }}
                          >
                            <ImageOff size={12} className="dash-label" />
                          </div>
                          <span className="font-bold text-sm dash-value">{p.nome}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 hidden sm:table-cell">
                        <span className="text-xs font-semibold dash-label px-2 py-1 rounded-lg dash-muted border dash-border">
                          {p.categoria}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-sm font-black tabular-nums" style={{ color: "var(--brasa)" }}>
                          {fmt(p.precoCentavos)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 hidden md:table-cell">
                        <span className={`text-xs font-bold px-2 py-1 rounded-lg ${
                          p.estoqueAtual > 5 ? "bg-emerald-500/10 text-emerald-400"
                          : p.estoqueAtual > 0 ? "bg-amber-500/10 text-amber-400"
                          : "bg-rose-500/10 text-rose-400"
                        }`}>
                          {p.estoqueAtual} un.
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <ToggleSwitch
                          checked={p.ativo}
                          onChange={v => toggleMutation.mutate({ id: p.id, ativo: v })}
                          disabled={pendingIds.has(p.id)}
                        />
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <ChevronRight size={14} className="dash-label ml-auto" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ─── Drawer ─── */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            {/* Mobile backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40 md:hidden"
              onClick={closeDrawer}
            />
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-[420px] z-50 md:z-auto md:relative md:w-[420px] md:shrink-0 flex flex-col"
              style={{
                backgroundColor: "var(--parchment)",
                borderLeft: "1px solid var(--border)",
              }}
            >
              <ProductDrawer
                produto={isNewOpen ? null : drawerProduto}
                onClose={closeDrawer}
                onSaved={msg => {
                  showToast(msg);
                  queryClient.invalidateQueries({ queryKey: ["produtos-catalogo"] });
                }}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ─── Toast ─── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[300] flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm shadow-xl pointer-events-none"
            style={{ backgroundColor: toast.ok ? "var(--brasa)" : "#ef4444", color: "#fff" }}
          >
            {toast.ok ? <Check size={15} /> : <AlertTriangle size={15} />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ProdutosCatalogo() {
  return (
    <Suspense>
      <ProdutosCatalogoInner />
    </Suspense>
  );
}

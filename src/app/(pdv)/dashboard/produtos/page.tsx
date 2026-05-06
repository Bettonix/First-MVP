"use client";

import { useState, useCallback, useTransition, useEffect, Suspense } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package, Plus, Search, X, Check, AlertTriangle,
  Loader2, ChevronRight, ImageOff, RefreshCw,
} from "lucide-react";
import { getProdutosCatalogo, toggleProdutoAtivo, updateProduto } from "@/app/actions/produtos";
import { createProduto } from "@/app/actions/produtos";
import { getProdutosInconsistentes, reconciliarProduto, type ProdutoInconsistente } from "@/app/actions/reconciliacao";
import { ProductForm } from "@/components/ProductForm";
import { fmtBRL, safeCentavos } from "@/lib/currency";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ProdutoFormData } from "@/schemas/produto.schema";

// ─── Reconciliação Alert Card ──────────────────────────────────────────────────
function ReconciliacaoAlert() {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);

  const { data: inconsistentes = [], isLoading } = useQuery({
    queryKey: ["produtos-inconsistentes"],
    queryFn: getProdutosInconsistentes,
    staleTime: 30_000,
  });

  const reconciliarMutation = useMutation({
    mutationFn: ({ id }: { id: string }) => reconciliarProduto(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["produtos-inconsistentes"] });
      queryClient.invalidateQueries({ queryKey: ["produtos-catalogo"] });
    },
  });

  if (isLoading || inconsistentes.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="rounded-2xl border overflow-hidden"
      style={{
        backgroundColor: "var(--warning-bg)",
        borderColor: "rgba(146,64,14,0.2)",
        borderLeft: "3px solid var(--warning)",
      }}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[rgba(146,64,14,0.04)]"
      >
        <AlertTriangle size={15} style={{ color: "var(--warning)", flexShrink: 0 }} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black tracking-tight" style={{ color: "var(--warning)" }}>
            {inconsistentes.length} produto{inconsistentes.length > 1 ? "s" : ""} com divergência de estoque
          </p>
          <p className="text-xs font-medium mt-0.5" style={{ color: "rgba(146,64,14,0.7)" }}>
            Gerado por sincronização offline · Requer reconciliação manual
          </p>
        </div>
        <ChevronRight
          size={14}
          style={{ color: "var(--warning)", flexShrink: 0, transform: expanded ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
        />
      </button>

      {/* Expanded list */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 flex flex-col gap-1.5 border-t" style={{ borderColor: "rgba(146,64,14,0.12)" }}>
              {inconsistentes.map((p: ProdutoInconsistente) => (
                <div key={p.id} className="flex items-center gap-3 py-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate" style={{ color: "var(--ink)" }}>{p.nome}</p>
                    <p className="text-xs font-medium" style={{ color: "var(--ink-3)" }}>
                      Estoque atual: <span className="font-black" style={{ color: p.estoqueAtual < 0 ? "var(--danger)" : "var(--ink)" }}>{p.estoqueAtual}</span>
                      {" · "}{new Date(p.lastInconsistency).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <button
                    onClick={() => reconciliarMutation.mutate({ id: p.id })}
                    disabled={reconciliarMutation.isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all active:scale-95 disabled:opacity-40"
                    style={{ backgroundColor: "var(--success-bg)", color: "var(--success)", border: "1px solid rgba(45,106,79,0.2)" }}
                  >
                    {reconciliarMutation.isPending
                      ? <Loader2 size={11} className="animate-spin" />
                      : <><Check size={11} /> Resolver</>
                    }
                  </button>
                </div>
              ))}
              <p className="text-[10px] font-semibold pt-1" style={{ color: "rgba(146,64,14,0.6)" }}>
                "Resolver" marca o produto como reconciliado e zera a flag. Ajuste o estoque manualmente se necessário.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

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
              <h1 className="text-2xl font-black flex items-center gap-2 tracking-tighter bg-clip-text text-transparent"
                style={{ backgroundImage: "linear-gradient(135deg, #1c1917 0%, #57534e 100%)" }}>
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

          {/* Reconciliação — aparece apenas se houver produtos inconsistentes */}
          <ReconciliacaoAlert />

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
                          p.estoqueAtual > 5 ? "bg-[var(--success-bg)] text-[var(--success)]"
                          : p.estoqueAtual > 0 ? "bg-[var(--warning-bg)] text-[var(--warning)]"
                          : "bg-[var(--danger-bg)] text-[var(--danger)]"
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

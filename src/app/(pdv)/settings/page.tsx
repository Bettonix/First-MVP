"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  getEstoqueSettings, updateEstoque, entradaEstoque,
  criarProduto, editarProduto, excluirProduto,
  getNomeLoja, updateNomeLoja, getInstagramUrl, updateInstagramUrl,
  type ProdutoSettings, type ProdutoInput,
} from "@/app/actions/settings";
import {
  getMesas, criarMesasEmLote, toggleMesa, updateMesa, deleteMesa, deleteTodasMesas,
  type MesaRow,
} from "@/app/actions/mesas";
import {
  listOperadores, createOperator, deleteOperador, revogarSessaoOperador, setPinGerente,
  type OperadorRow,
} from "@/app/actions/equipe";
import {
  Settings, Package, TableProperties, Store, Users,
  CheckCircle2, AlertTriangle, XCircle,
  Loader2, Plus, ToggleLeft, ToggleRight,
  Zap, PlusCircle, Pencil, Check, X, Trash2,
  Search, ShieldCheck, UserMinus,
} from "lucide-react";
import { fmtBRL } from "@/lib/currency";

// ─── Types ────────────────────────────────────────────────────────────────────
type TabId = "estoque" | "mesas" | "geral" | "equipe";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function brlTocentavos(val: string): number {
  const n = parseFloat(val.replace(",", ".")) || 0;
  return Math.round(n * 100);
}
function centavosToStr(c: number): string {
  return (c / 100).toFixed(2).replace(".", ",");
}

function StockBadge({ atual, minimo, gerenciar }: { atual: number; minimo: number; gerenciar: boolean }) {
  if (!gerenciar)      return <span className="dash-badge text-[10px] font-bold px-2 py-0.5 rounded-full">—</span>;
  if (atual <= 0)      return <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"><XCircle size={10} />Esgotado</span>;
  if (atual <= minimo) return <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"><AlertTriangle size={10} />Baixo</span>;
  return <span className="dash-icon-accent dash-highlight-text border dash-border text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"><CheckCircle2 size={10} />OK</span>;
}

function StockLevelBar({ atual, minimo, gerenciar }: { atual: number; minimo: number; gerenciar: boolean }) {
  if (!gerenciar) return null;
  const max = Math.max(minimo * 2, atual + 1, 4);
  const pct = Math.min(100, (atual / max) * 100);
  const fill = atual <= 0 ? "bg-rose-500" : atual <= minimo ? "bg-amber-400" : "bg-[var(--oliva)]";
  return (
    <div className="mt-1.5 h-[3px] w-full rounded-full relative overflow-hidden">
      <div className="absolute inset-0 bg-current opacity-10 rounded-full" />
      <div className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${fill}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function EditableNumber({ value, onSave }: { value: number; onSave: (v: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(String(value));
  useEffect(() => { setDraft(String(value)); }, [value]);
  const commit = () => {
    const n = Math.max(0, parseInt(draft, 10) || 0);
    setEditing(false);
    if (n !== value) onSave(n);
  };
  if (editing) return (
    <input autoFocus type="number" min={0} value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setEditing(false); setDraft(String(value)); } }}
      className="dash-input w-14 text-center text-sm font-bold rounded-lg py-1 px-1 outline-none"
    />
  );
  return (
    <button onClick={() => setEditing(true)}
      className="w-14 text-center text-sm font-black dash-value hover:dash-highlight-text transition-colors group flex items-center justify-center gap-0.5 tabular-nums">
      {value}<Pencil size={9} className="opacity-0 group-hover:opacity-50 shrink-0" />
    </button>
  );
}

// ─── Product Modal ─────────────────────────────────────────────────────────────
interface ProductModalProps {
  product: ProdutoSettings | null;
  onClose: () => void;
  onSaved: () => void;
}

function ProductModal({ product, onClose, onSaved }: ProductModalProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError]            = useState("");
  const [nome, setNome]              = useState(product?.nome ?? "");
  const [categoria, setCategoria]    = useState(product?.categoria ?? "Outros");
  const [precoVenda, setPrecoVenda]  = useState(product ? centavosToStr(product.precoCentavos) : "");
  const [precoCusto, setPrecoCusto]  = useState(product ? centavosToStr(product.precoCustoCentavos) : "0,00");
  const [estoque, setEstoque]        = useState(String(product?.estoqueAtual ?? 0));
  const [minEstoque, setMinEstoque]  = useState(String(product?.estoqueMinimo ?? 0));
  const [gerenciar, setGerenciar]    = useState(product?.gerenciarEstoque ?? true);
  const [favorito, setFavorito]      = useState(product?.isFavorito ?? true);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const handleSubmit = () => {
    setError("");
    const input: ProdutoInput = {
      nome: nome.trim(),
      categoria: categoria.trim() || "Outros",
      precoCentavos:      brlTocentavos(precoVenda),
      precoCustoCentavos: brlTocentavos(precoCusto),
      estoqueAtual:       Math.max(0, parseInt(estoque) || 0),
      estoqueMinimo:      Math.max(0, parseInt(minEstoque) || 0),
      gerenciarEstoque:   gerenciar,
      isFavorito:         favorito,
    };
    startTransition(async () => {
      const res = product ? await editarProduto(product.id, input) : await criarProduto(input);
      if ("error" in res) { setError(res.error); return; }
      onSaved();
      onClose();
    });
  };

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
      <label className="dash-label text-[10px] font-bold uppercase tracking-widest block mb-1.5">{label}</label>
      {children}
    </div>
  );

  const content = (
    <div className="fixed inset-0 z-[9000]" style={{ isolation: "isolate" }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-[500px] dash-card border-l dash-border flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b dash-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 dash-icon-accent rounded-xl flex items-center justify-center shrink-0">
              <Package size={16} className="dash-icon-accent-fg" />
            </div>
            <div>
              <h2 className="dash-title font-black text-base leading-tight">{product ? "Editar Produto" : "Novo Produto"}</h2>
              <p className="dash-subtitle text-xs">{product ? `Editando: ${product.nome}` : "Preencha os dados do produto"}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 dash-nav-btn rounded-xl flex items-center justify-center shrink-0">
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Identificação */}
          <div className="space-y-3">
            <p className="dash-label text-[10px] font-bold uppercase tracking-widest">Identificação</p>
            <Field label="Nome do Produto *">
              <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Coca-Cola 350ml"
                className="dash-input w-full py-2.5 px-4 rounded-xl text-sm font-semibold outline-none" />
            </Field>
            <Field label="Categoria">
              <input value={categoria} onChange={(e) => setCategoria(e.target.value)} placeholder="Ex: Bebidas, Lanches..."
                className="dash-input w-full py-2.5 px-4 rounded-xl text-sm font-semibold outline-none" />
            </Field>
          </div>

          <div className="border-t dash-border" />

          {/* Preços */}
          <div className="space-y-3">
            <p className="dash-label text-[10px] font-bold uppercase tracking-widest">Precificação</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Preço de Venda (R$) *">
                <input value={precoVenda} onChange={(e) => setPrecoVenda(e.target.value)} placeholder="0,00"
                  className="dash-input w-full py-2.5 px-4 rounded-xl text-sm font-semibold outline-none" />
              </Field>
              <Field label="Preço de Custo (R$)">
                <input value={precoCusto} onChange={(e) => setPrecoCusto(e.target.value)} placeholder="0,00"
                  className="dash-input w-full py-2.5 px-4 rounded-xl text-sm font-semibold outline-none" />
              </Field>
            </div>
          </div>

          <div className="border-t dash-border" />

          {/* Estoque */}
          <div className="space-y-3">
            <p className="dash-label text-[10px] font-bold uppercase tracking-widest">Controle de Estoque</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Estoque Atual">
                <input type="number" min={0} value={estoque} onChange={(e) => setEstoque(e.target.value)}
                  className="dash-input w-full py-2.5 px-4 rounded-xl text-sm font-semibold outline-none" />
              </Field>
              <Field label="Estoque Mínimo">
                <input type="number" min={0} value={minEstoque} onChange={(e) => setMinEstoque(e.target.value)}
                  className="dash-input w-full py-2.5 px-4 rounded-xl text-sm font-semibold outline-none" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setGerenciar(!gerenciar)}
                className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${gerenciar ? "dash-icon-accent dash-border" : "dash-card dash-border"}`}>
                <span className="dash-value text-sm font-bold">Gerenciar Estoque</span>
                {gerenciar ? <ToggleRight size={22} className="dash-icon-accent-fg" /> : <ToggleLeft size={22} className="dash-subtitle" />}
              </button>
              <button type="button" onClick={() => setFavorito(!favorito)}
                className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${favorito ? "bg-amber-500/10 border-amber-500/30" : "dash-card dash-border"}`}>
                <span className="dash-value text-sm font-bold">Favorito (PDV)</span>
                {favorito ? <ToggleRight size={22} className="text-amber-400" /> : <ToggleLeft size={22} className="dash-subtitle" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2.5 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl">
              <AlertTriangle size={14} className="text-rose-400 shrink-0 mt-0.5" />
              <p className="text-rose-400 text-xs font-semibold">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t dash-border shrink-0 flex gap-3">
          <button onClick={onClose} className="flex-1 h-11 dash-nav-btn font-bold rounded-xl text-sm">Cancelar</button>
          <button onClick={handleSubmit} disabled={isPending || !nome.trim() || !precoVenda}
            className="flex-1 h-11 bg-[var(--brasa)] hover:bg-[var(--brasa-hover)] disabled:opacity-40 text-white font-black rounded-xl flex items-center justify-center gap-2 text-sm shadow-lg shadow-[0_4px_12px_rgba(211,84,0,0.2)] transition-all">
            {isPending ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            {product ? "Salvar Alterações" : "Criar Produto"}
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(content, document.body);
}

// ─── Delete Confirm ────────────────────────────────────────────────────────────
function DeleteConfirm({ product, onClose, onDeleted }: { product: ProdutoSettings; onClose: () => void; onDeleted: () => void }) {
  const [isPending, startTransition] = useTransition();
  const handleDelete = () => {
    startTransition(async () => { await excluirProduto(product.id); onDeleted(); onClose(); });
  };
  const content = (
    <div className="fixed inset-0 z-[9100] flex items-center justify-center p-4" style={{ isolation: "isolate" }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative dash-card rounded-2xl p-6 max-w-sm w-full shadow-2xl z-10">
        <div className="w-12 h-12 bg-rose-500/15 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Trash2 size={22} className="text-rose-400" />
        </div>
        <h3 className="dash-title font-black text-center text-lg mb-1.5">Excluir produto?</h3>
        <p className="dash-subtitle text-sm text-center mb-5">
          <strong className="dash-value">"{product.nome}"</strong> será removido permanentemente.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 h-11 dash-nav-btn font-bold rounded-xl">Cancelar</button>
          <button onClick={handleDelete} disabled={isPending}
            className="flex-1 h-11 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-black rounded-xl flex items-center justify-center gap-2 text-sm transition-all">
            {isPending ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />} Excluir
          </button>
        </div>
      </div>
    </div>
  );
  if (typeof document === "undefined") return null;
  return createPortal(content, document.body);
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: ESTOQUE
// ═══════════════════════════════════════════════════════════════════════════════
function EstoqueTab() {
  const [produtos, setProdutos]           = useState<ProdutoSettings[]>([]);
  const [loading, setLoading]             = useState(true);
  const [isPending, startTransition]      = useTransition();
  const [search, setSearch]               = useState("");
  const [modalProduct, setModalProduct]   = useState<ProdutoSettings | "new" | null>(null);
  const [deleteTarget, setDeleteTarget]   = useState<ProdutoSettings | null>(null);
  const [selectedId, setSelectedId]       = useState<string | null>(null);
  const [entradaQtd, setEntradaQtd]       = useState(1);
  const [entradaMotivo, setEntradaMotivo] = useState("");
  const [toast, setToast]                 = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const reload = useCallback(() => {
    setLoading(true);
    getEstoqueSettings().then((d) => { setProdutos(d); setLoading(false); });
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const handleInlineUpdate = (id: string, data: { estoqueAtual?: number; estoqueMinimo?: number; gerenciarEstoque?: boolean }) => {
    setProdutos((prev) => prev.map((p) => p.id === id ? { ...p, ...data } : p));
    startTransition(async () => {
      const res = await updateEstoque(id, data);
      if ("error" in res) showToast(res.error, false);
    });
  };

  const handleEntrada = (id: string) => {
    if (entradaQtd < 1) return;
    startTransition(async () => {
      const res = await entradaEstoque(id, entradaQtd, entradaMotivo);
      if ("error" in res) { showToast(res.error, false); return; }
      showToast("Entrada registrada!");
      setSelectedId(null); setEntradaQtd(1); setEntradaMotivo("");
      reload();
    });
  };

  const filtered = produtos.filter((p) =>
    p.nome.toLowerCase().includes(search.toLowerCase()) ||
    p.categoria.toLowerCase().includes(search.toLowerCase())
  );

  const total       = produtos.length;
  const gerenciados = produtos.filter((p) => p.gerenciarEstoque).length;
  const criticos    = produtos.filter((p) => p.gerenciarEstoque && p.estoqueAtual > 0 && p.estoqueAtual <= p.estoqueMinimo).length;
  const esgotados   = produtos.filter((p) => p.gerenciarEstoque && p.estoqueAtual <= 0).length;

  const kpis = [
    { label: "Total",         value: total,       sub: "produtos cadastrados",     color: "dash-title" },
    { label: "Gerenciados",   value: gerenciados, sub: `de ${total} com controle`, color: "dash-title" },
    { label: "Estoque Baixo", value: criticos,    sub: "abaixo do mínimo",         color: criticos  > 0 ? "text-amber-400" : "dash-title" },
    { label: "Esgotados",     value: esgotados,   sub: "sem unidades",             color: esgotados > 0 ? "text-rose-400"  : "dash-title" },
  ];

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map(({ label, value, sub, color }) => (
          <div key={label} className="dash-card rounded-2xl p-4 flex flex-col gap-0.5">
            <p className="dash-label text-[10px] font-bold uppercase tracking-widest mb-1">{label}</p>
            <p className={`text-2xl font-black tabular-nums ${color}`}>{value}</p>
            <p className="dash-subtitle text-[11px] leading-tight">{sub}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 dash-label pointer-events-none" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou categoria..."
            className="dash-input w-full py-2.5 pl-9 pr-4 rounded-xl text-sm font-medium outline-none" />
        </div>
        <button onClick={() => setModalProduct("new")}
          className="h-10 px-5 bg-[var(--brasa)] hover:bg-[var(--brasa-hover)] text-white font-bold text-sm rounded-xl flex items-center gap-2 shrink-0 shadow-lg shadow-[0_4px_12px_rgba(211,84,0,0.2)] transition-all">
          <Plus size={15} /> Novo Produto
        </button>
      </div>

      {/* Desktop Table */}
      <div className="dash-card rounded-2xl overflow-hidden hidden md:block">
        <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden">
          <div className="min-w-[640px]">
            <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto_auto] gap-3 px-5 py-3 border-b dash-border">
              <p className="dash-label text-[10px] font-bold uppercase tracking-widest">Produto</p>
              <p className="dash-label text-[10px] font-bold uppercase tracking-widest text-center w-14">Qtd.</p>
              <p className="dash-label text-[10px] font-bold uppercase tracking-widest text-center w-14">Mín.</p>
              <p className="dash-label text-[10px] font-bold uppercase tracking-widest text-center w-20">Status</p>
              <p className="dash-label text-[10px] font-bold uppercase tracking-widest text-center w-14">Ctrl.</p>
              <p className="dash-label text-[10px] font-bold uppercase tracking-widest text-center w-7">+</p>
              <p className="dash-label text-[10px] font-bold uppercase tracking-widest text-center w-16">Ações</p>
            </div>

            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-[60px] border-b dash-border animate-pulse last:border-0" />
              ))
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="w-12 h-12 dash-card rounded-2xl flex items-center justify-center">
                  <Package size={22} className="dash-label" />
                </div>
                <div className="text-center">
                  <p className="dash-value font-semibold text-sm">{search ? "Nenhum resultado encontrado" : "Nenhum produto cadastrado"}</p>
                  <p className="dash-subtitle text-xs mt-0.5">{search ? "Tente outro termo de busca" : "Clique em \"Novo Produto\" para começar"}</p>
                </div>
              </div>
            ) : (
              filtered.map((p) => (
                <div key={p.id}>
                  <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto_auto] gap-3 items-center px-5 py-3.5 border-b dash-border dash-row-hover transition-colors last:border-0">
                    <div className="min-w-0">
                      <p className="dash-value font-semibold text-sm truncate">{p.nome}</p>
                      <p className="dash-subtitle text-xs">{p.categoria} · {fmtBRL(p.precoCentavos)}</p>
                      <StockLevelBar atual={p.estoqueAtual} minimo={p.estoqueMinimo} gerenciar={p.gerenciarEstoque} />
                    </div>
                    <EditableNumber value={p.estoqueAtual} onSave={(v) => handleInlineUpdate(p.id, { estoqueAtual: v })} />
                    <EditableNumber value={p.estoqueMinimo} onSave={(v) => handleInlineUpdate(p.id, { estoqueMinimo: v })} />
                    <div className="w-20 flex justify-center">
                      <StockBadge atual={p.estoqueAtual} minimo={p.estoqueMinimo} gerenciar={p.gerenciarEstoque} />
                    </div>
                    <button onClick={() => handleInlineUpdate(p.id, { gerenciarEstoque: !p.gerenciarEstoque })}
                      className={`w-14 flex items-center justify-center transition-colors ${p.gerenciarEstoque ? "dash-highlight-text" : "dash-subtitle"}`}>
                      {p.gerenciarEstoque ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                    </button>
                    <button onClick={() => setSelectedId(selectedId === p.id ? null : p.id)}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${selectedId === p.id ? "dash-icon-accent dash-highlight-text" : "dash-action-btn hover:dash-highlight-text"}`}>
                      <PlusCircle size={15} />
                    </button>
                    <div className="w-16 flex items-center justify-center gap-1">
                      <button onClick={() => setModalProduct(p)} className="w-7 h-7 dash-action-btn rounded-lg flex items-center justify-center hover:dash-highlight-text transition-colors">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => setDeleteTarget(p)} className="w-7 h-7 dash-action-btn-danger rounded-lg flex items-center justify-center transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  {selectedId === p.id && (
                    <div className="dash-muted border-b dash-border px-5 py-3 flex items-center gap-3 flex-wrap">
                      <p className="dash-subtitle text-[10px] font-bold uppercase tracking-widest shrink-0">Registrar Entrada</p>
                      <input type="number" min={1} value={entradaQtd} onChange={(e) => setEntradaQtd(Math.max(1, parseInt(e.target.value) || 1))}
                        className="dash-input w-20 py-1.5 px-3 rounded-lg text-sm font-bold outline-none" />
                      <input value={entradaMotivo} onChange={(e) => setEntradaMotivo(e.target.value)} placeholder="Motivo (opcional)"
                        className="dash-input flex-1 min-w-[140px] py-1.5 px-3 rounded-lg text-sm outline-none" />
                      <button onClick={() => handleEntrada(p.id)} disabled={isPending}
                        className="h-8 px-4 bg-[var(--brasa)] hover:bg-[var(--brasa-hover)] disabled:opacity-50 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition-all">
                        {isPending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Confirmar
                      </button>
                      <button onClick={() => setSelectedId(null)} className="w-8 h-8 dash-action-btn rounded-lg flex items-center justify-center">
                        <X size={12} />
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Mobile Card List */}
      <div className="dash-card rounded-2xl overflow-hidden md:hidden">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 border-b dash-border animate-pulse last:border-0" />)
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <Package size={28} className="dash-label" />
            <p className="dash-subtitle text-sm font-semibold">{search ? "Nenhum resultado." : "Nenhum produto."}</p>
          </div>
        ) : (
          filtered.map((p) => (
            <div key={p.id}>
              <div className="flex items-start gap-3 px-4 py-3.5 border-b dash-border last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="dash-value font-semibold text-sm truncate">{p.nome}</p>
                  <p className="dash-subtitle text-xs">{p.categoria} · {fmtBRL(p.precoCentavos)}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <StockBadge atual={p.estoqueAtual} minimo={p.estoqueMinimo} gerenciar={p.gerenciarEstoque} />
                    {p.gerenciarEstoque && <span className="dash-subtitle text-[11px]">{p.estoqueAtual} un</span>}
                  </div>
                  <StockLevelBar atual={p.estoqueAtual} minimo={p.estoqueMinimo} gerenciar={p.gerenciarEstoque} />
                </div>
                <div className="flex items-center gap-1 shrink-0 pt-0.5">
                  <button onClick={() => setSelectedId(selectedId === p.id ? null : p.id)}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${selectedId === p.id ? "dash-icon-accent dash-highlight-text" : "dash-action-btn"}`}>
                    <PlusCircle size={15} />
                  </button>
                  <button onClick={() => setModalProduct(p)} className="w-8 h-8 dash-action-btn rounded-lg flex items-center justify-center hover:dash-highlight-text transition-colors">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => setDeleteTarget(p)} className="w-8 h-8 dash-action-btn-danger rounded-lg flex items-center justify-center">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              {selectedId === p.id && (
                <div className="dash-muted border-b dash-border px-4 py-3 space-y-2">
                  <p className="dash-subtitle text-[10px] font-bold uppercase tracking-widest">Registrar Entrada</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <input type="number" min={1} value={entradaQtd} onChange={(e) => setEntradaQtd(Math.max(1, parseInt(e.target.value) || 1))}
                      className="dash-input w-20 py-1.5 px-3 rounded-lg text-sm font-bold outline-none" />
                    <input value={entradaMotivo} onChange={(e) => setEntradaMotivo(e.target.value)} placeholder="Motivo (opcional)"
                      className="dash-input flex-1 min-w-[100px] py-1.5 px-3 rounded-lg text-sm outline-none" />
                    <button onClick={() => handleEntrada(p.id)} disabled={isPending}
                      className="h-8 px-4 bg-[var(--brasa)] hover:bg-[var(--brasa-hover)] disabled:opacity-50 text-white font-bold text-xs rounded-lg flex items-center gap-1.5">
                      {isPending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} OK
                    </button>
                    <button onClick={() => setSelectedId(null)} className="w-8 h-8 dash-action-btn rounded-lg flex items-center justify-center">
                      <X size={12} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl shadow-2xl border flex items-center gap-3 font-bold text-sm
          ${toast.ok ? "dash-icon-accent dash-border dash-highlight-text" : "bg-rose-500/10 border-rose-500/20 text-rose-400"}`}>
          {toast.ok ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}{toast.msg}
        </div>
      )}

      {modalProduct !== null && (
        <ProductModal
          product={modalProduct === "new" ? null : modalProduct}
          onClose={() => setModalProduct(null)}
          onSaved={() => { showToast(modalProduct === "new" ? "Produto criado!" : "Produto atualizado!"); reload(); }}
        />
      )}
      {deleteTarget && (
        <DeleteConfirm
          product={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={() => { showToast("Produto excluído."); reload(); }}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: MESAS
// ═══════════════════════════════════════════════════════════════════════════════
function MesasTab() {
  const [mesas, setMesas]                       = useState<MesaRow[]>([]);
  const [loading, setLoading]                   = useState(true);
  const [isPending, startTransition]            = useTransition();
  const [batchQtd, setBatchQtd]                 = useState(10);
  const [batchPrefix, setBatchPrefix]           = useState("Mesa");
  const [batchError, setBatchError]             = useState("");
  const [editingId, setEditingId]               = useState<string | null>(null);
  const [editingNome, setEditingNome]           = useState("");
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);

  const reload = useCallback(() => {
    setLoading(true);
    getMesas().then((d) => { setMesas(d); setLoading(false); });
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const handleGenerate = () => {
    setBatchError("");
    if (batchQtd < 1 || batchQtd > 200) { setBatchError("Entre 1 e 200 mesas."); return; }
    if (!batchPrefix.trim()) { setBatchError("Informe um prefixo."); return; }
    startTransition(async () => {
      const r = await criarMesasEmLote(batchQtd, batchPrefix);
      if (r.error) setBatchError(r.error); else reload();
    });
  };

  const handleToggle = (id: string, ativa: boolean) => {
    setMesas((prev) => prev.map((m) => m.id === id ? { ...m, ativa: !ativa } : m));
    startTransition(async () => { await toggleMesa(id, !ativa); reload(); });
  };

  const handleSaveEdit = (id: string) => {
    if (!editingNome.trim()) return;
    startTransition(async () => { await updateMesa(id, editingNome.trim()); setEditingId(null); reload(); });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => { await deleteMesa(id); reload(); });
  };

  const handleDeleteAll = () => {
    startTransition(async () => { await deleteTodasMesas(); setConfirmDeleteAll(false); reload(); });
  };

  const ativas   = mesas.filter((m) => m.ativa).length;
  const inativas = mesas.length - ativas;

  const previewNames = batchPrefix.trim() && batchQtd > 0
    ? Array.from({ length: Math.min(3, batchQtd) }, (_, i) => `${batchPrefix.trim()} ${String(i + 1).padStart(2, "0")}`)
    : [];

  return (
    <div className="space-y-4">
      {/* Batch Wizard */}
      <div className="dash-card rounded-2xl p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 dash-icon-accent rounded-xl flex items-center justify-center shrink-0">
            <Zap size={16} className="dash-icon-accent-fg" />
          </div>
          <div>
            <h3 className="dash-title font-bold text-sm">Gerador em Lote</h3>
            <p className="dash-subtitle text-xs">Crie várias mesas com numeração automática em sequência.</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1.5">
            <label className="dash-label text-[10px] font-bold uppercase tracking-widest">Prefixo</label>
            <input value={batchPrefix} onChange={(e) => setBatchPrefix(e.target.value)} placeholder="Mesa, Balcão, Área..."
              className="dash-input py-2.5 px-3.5 rounded-xl text-sm font-semibold w-40 outline-none" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="dash-label text-[10px] font-bold uppercase tracking-widest">Quantidade</label>
            <input type="number" min={1} max={200} value={batchQtd} onChange={(e) => setBatchQtd(Number(e.target.value))}
              className="dash-input py-2.5 px-3.5 rounded-xl text-sm font-semibold w-24 outline-none" />
          </div>
          <button onClick={handleGenerate} disabled={isPending}
            className="h-10 px-5 bg-[var(--brasa)] hover:bg-[var(--brasa-hover)] disabled:opacity-50 text-white font-bold text-sm rounded-xl flex items-center gap-2 shrink-0 shadow-lg shadow-[0_4px_12px_rgba(211,84,0,0.2)] transition-all">
            {isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Gerar
          </button>
        </div>

        {previewNames.length > 0 && (
          <div className="mt-4 flex items-center gap-2 flex-wrap">
            <p className="dash-label text-[10px] font-bold uppercase tracking-widest">Prévia:</p>
            {previewNames.map((n) => (
              <span key={n} className="dash-badge text-xs px-2.5 py-1 rounded-lg font-semibold">{n}</span>
            ))}
            {batchQtd > 3 && <span className="dash-subtitle text-xs">+ {batchQtd - 3} mais</span>}
          </div>
        )}

        {batchError && (
          <div className="mt-3 flex items-center gap-2 text-rose-400 text-xs font-semibold bg-rose-500/10 px-3 py-2 rounded-xl border border-rose-500/20">
            <AlertTriangle size={12} /> {batchError}
          </div>
        )}
      </div>

      {/* Mesas Grid */}
      <div className="dash-card rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b dash-border">
          <div className="flex items-center gap-3">
            <h3 className="dash-title font-bold text-sm">
              {mesas.length === 0 ? "Nenhuma mesa" : `${mesas.length} ${mesas.length === 1 ? "mesa" : "mesas"}`}
            </h3>
            {mesas.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="dash-badge-active text-[10px] font-bold px-2 py-0.5 rounded-full">{ativas} ativas</span>
                <span className="dash-badge text-[10px] font-bold px-2 py-0.5 rounded-full">{inativas} inativas</span>
              </div>
            )}
          </div>
          {mesas.length > 0 && (
            <button onClick={() => setConfirmDeleteAll(true)}
              className="text-xs font-bold text-rose-500 hover:text-rose-400 flex items-center gap-1.5 transition-colors">
              <Trash2 size={12} /> Apagar todas
            </button>
          )}
        </div>

        <div className="p-4">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
              {Array.from({ length: 10 }).map((_, i) => <div key={i} className="h-[70px] dash-card rounded-xl animate-pulse" />)}
            </div>
          ) : mesas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 gap-3">
              <div className="w-14 h-14 dash-card rounded-2xl flex items-center justify-center">
                <TableProperties size={24} className="dash-label" />
              </div>
              <div className="text-center">
                <p className="dash-value font-semibold text-sm">Nenhuma mesa configurada</p>
                <p className="dash-subtitle text-xs mt-0.5">Use o gerador acima para criar mesas</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
              {mesas.map((m) => (
                <div key={m.id} className={`relative group rounded-xl border transition-all duration-150 ${m.ativa ? "dash-mesa-ativa" : "dash-mesa-inativa"}`}>
                  {editingId === m.id ? (
                    <div className="p-2.5 flex flex-col gap-1.5">
                      <input autoFocus value={editingNome}
                        onChange={(e) => setEditingNome(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleSaveEdit(m.id); if (e.key === "Escape") setEditingId(null); }}
                        className="dash-input text-sm font-semibold rounded-lg px-2 py-1.5 outline-none w-full"
                      />
                      <div className="flex gap-1">
                        <button onClick={() => handleSaveEdit(m.id)} className="flex-1 h-7 dash-icon-accent dash-highlight-text rounded-lg flex items-center justify-center text-xs font-bold gap-1">
                          <Check size={11} /> OK
                        </button>
                        <button onClick={() => setEditingId(null)} className="w-7 h-7 dash-row-hover rounded-lg flex items-center justify-center">
                          <X size={11} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 min-h-[70px] flex flex-col justify-between">
                      <div className="flex items-start justify-between gap-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div className={`w-1.5 h-1.5 rounded-full shrink-0 mt-0.5 ${m.ativa ? "bg-[var(--brasa)]" : "bg-[var(--border-md)]"}`} />
                          <span className="dash-value font-semibold text-sm truncate leading-tight">{m.nome}</span>
                        </div>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <button onClick={() => { setEditingId(m.id); setEditingNome(m.nome); }}
                            className="w-5 h-5 dash-action-btn rounded flex items-center justify-center hover:dash-highlight-text">
                            <Pencil size={9} />
                          </button>
                          <button onClick={() => handleDelete(m.id)}
                            className="w-5 h-5 dash-action-btn-danger rounded flex items-center justify-center">
                            <Trash2 size={9} />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="dash-subtitle text-[10px] font-medium">{m.ativa ? "Ativa" : "Inativa"}</span>
                        <button onClick={() => handleToggle(m.id, m.ativa)} className="shrink-0">
                          {m.ativa
                            ? <ToggleRight size={16} className="dash-icon-accent-fg" />
                            : <ToggleLeft size={16} className="dash-subtitle" />}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Confirm Delete All */}
      {confirmDeleteAll && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9200] flex items-center justify-center p-4" style={{ isolation: "isolate" }}>
          <div className="dash-card rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="w-12 h-12 bg-rose-500/15 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={22} className="text-rose-400" />
            </div>
            <h3 className="dash-title font-black text-center text-lg mb-1.5">Apagar todas as mesas?</h3>
            <p className="dash-subtitle text-sm text-center mb-5">
              Remove permanentemente <strong className="dash-value">{mesas.length} mesas</strong>.<br />Essa ação não pode ser desfeita.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteAll(false)} className="flex-1 h-11 dash-nav-btn font-bold rounded-xl">Cancelar</button>
              <button onClick={handleDeleteAll} disabled={isPending}
                className="flex-1 h-11 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-black rounded-xl flex items-center justify-center gap-2 transition-all">
                {isPending ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />} Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: GERAL
// ═══════════════════════════════════════════════════════════════════════════════
function GeralTab() {
  const [nomeLoja, setNomeLoja]       = useState("");
  const [draft, setDraft]            = useState("");
  const [instagram, setInstagram]    = useState("");
  const [instaDraft, setInstaDraft]  = useState("");
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved]            = useState(false);
  const [instaSaved, setInstaSaved]  = useState(false);
  const [instaError, setInstaError]  = useState("");

  useEffect(() => {
    getNomeLoja().then((n) => { setNomeLoja(n); setDraft(n); });
    getInstagramUrl().then((u) => { setInstagram(u); setInstaDraft(u); });
  }, []);

  const handleSave = () => {
    if (draft === nomeLoja || !draft.trim()) return;
    startTransition(async () => {
      const res = await updateNomeLoja(draft);
      if ("ok" in res) { setNomeLoja(draft); setSaved(true); setTimeout(() => setSaved(false), 2500); }
    });
  };

  const handleSaveInstagram = () => {
    setInstaError("");
    startTransition(async () => {
      const res = await updateInstagramUrl(instaDraft);
      if ("ok" in res) { setInstagram(instaDraft); setInstaSaved(true); setTimeout(() => setInstaSaved(false), 2500); }
      else setInstaError(res.error);
    });
  };

  return (
    <div className="max-w-lg space-y-4">
      <div className="dash-card rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b dash-border flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: "var(--brasa-light)" }}>
            <Store size={15} style={{ color: "var(--brasa)" }} />
          </div>
          <div>
            <h3 className="dash-title font-bold text-sm">Informações da Loja</h3>
            <p className="dash-subtitle text-xs">Dados básicos do estabelecimento</p>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="dash-label text-[10px] font-bold uppercase tracking-widest block mb-1.5">Nome do Estabelecimento</label>
            <input value={draft} onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
              placeholder="Ex: Restaurante do João"
              className="dash-input w-full py-2.5 px-4 rounded-xl text-sm font-semibold outline-none" />
            <p className="dash-subtitle text-[11px] mt-1.5">Exibido no cabeçalho do PDV e em relatórios.</p>
          </div>
          <div className="flex justify-end">
            <button onClick={handleSave} disabled={isPending || draft === nomeLoja || !draft.trim()}
              className="h-10 px-6 disabled:opacity-40 text-white font-bold text-sm rounded-xl flex items-center gap-2 transition-all"
              style={{ backgroundColor: "var(--brasa)" }}>
              {isPending ? <Loader2 size={15} className="animate-spin" />
               : saved ? <CheckCircle2 size={15} />
               : <Check size={15} />}
              {saved ? "Salvo!" : "Salvar"}
            </button>
          </div>
        </div>
      </div>

      {/* Instagram / Link do recibo */}
      <div className="dash-card rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b dash-border flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: "var(--brasa-light)" }}>
            <span style={{ fontSize: "15px" }}>📸</span>
          </div>
          <div>
            <h3 className="dash-title font-bold text-sm">Link do Recibo (QR Code)</h3>
            <p className="dash-subtitle text-xs">Aparece no rodapé do recibo térmico</p>
          </div>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="dash-label text-[10px] font-bold uppercase tracking-widest block mb-1.5">URL do Instagram ou site</label>
            <input value={instaDraft} onChange={(e) => { setInstaDraft(e.target.value); setInstaError(""); }}
              onKeyDown={(e) => { if (e.key === "Enter") handleSaveInstagram(); }}
              placeholder="https://www.instagram.com/suaLoja"
              className="dash-input w-full py-2.5 px-4 rounded-xl text-sm font-semibold outline-none" />
            {instaError && <p className="text-rose-500 text-xs font-bold mt-1.5 flex items-center gap-1"><AlertTriangle size={11} />{instaError}</p>}
            <p className="dash-subtitle text-[11px] mt-1.5">Deixe vazio para não exibir QR Code.</p>
          </div>
          <div className="flex justify-end">
            <button onClick={handleSaveInstagram} disabled={isPending || instaDraft === instagram}
              className="h-10 px-6 disabled:opacity-40 text-white font-bold text-sm rounded-xl flex items-center gap-2 transition-all"
              style={{ backgroundColor: "var(--brasa)" }}>
              {isPending ? <Loader2 size={15} className="animate-spin" />
               : instaSaved ? <CheckCircle2 size={15} />
               : <Check size={15} />}
              {instaSaved ? "Salvo!" : "Salvar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// EQUIPE TAB
// ═══════════════════════════════════════════════════════════════════════════════
function EquipeTab() {
  const [isPending, startTransition] = useTransition();
  const [operadores, setOperadores] = useState<OperadorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  // PIN section
  const [pin, setPin] = useState("");
  const [pinSaved, setPinSaved] = useState(false);

  // Add operator form
  const [showAddForm, setShowAddForm] = useState(false);
  const [addNome, setAddNome] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addSenha, setAddSenha] = useState("");
  const [addError, setAddError] = useState("");

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const reload = useCallback(() => {
    setLoading(true);
    listOperadores().then((rows) => { setOperadores(rows); setLoading(false); });
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const handleSavePin = () => {
    if (!/^\d{4}$/.test(pin)) { showToast("PIN deve ter 4 dígitos numéricos.", false); return; }
    startTransition(async () => {
      const res = await setPinGerente(pin);
      if ("ok" in res) { setPinSaved(true); setPin(""); showToast("PIN configurado com sucesso."); }
      else showToast(res.error, false);
    });
  };

  const handleAddOperador = () => {
    setAddError("");
    startTransition(async () => {
      const res = await createOperator({ nome: addNome, email: addEmail, senha: addSenha });
      if ("ok" in res) {
        setShowAddForm(false); setAddNome(""); setAddEmail(""); setAddSenha("");
        showToast("Operador adicionado.");
        reload();
      } else { setAddError(res.error); }
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const res = await deleteOperador(id);
      if ("ok" in res) { showToast("Operador removido."); reload(); }
      else showToast(res.error, false);
    });
  };

  const handleRevogar = (id: string) => {
    startTransition(async () => {
      const res = await revogarSessaoOperador(id);
      if ("ok" in res) showToast("Sessão revogada. O operador será deslogado.");
      else showToast(res.error, false);
    });
  };

  return (
    <div className="space-y-6">
      {/* PIN do Gerente */}
      <div className="dash-card rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl dash-icon-accent flex items-center justify-center shrink-0">
            <ShieldCheck size={18} className="dash-icon-accent-fg" />
          </div>
          <div>
            <p className="dash-value font-bold text-sm">PIN de Autorização</p>
            <p className="dash-subtitle text-xs">Usado para autorizar estornos e desbloquear a tela</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pin}
            onChange={(e) => { setPin(e.target.value.replace(/\D/g, "").slice(0, 4)); setPinSaved(false); }}
            placeholder="4 dígitos"
            className="dash-input w-32 py-2.5 px-4 rounded-xl text-sm font-bold outline-none tracking-[0.4em] text-center"
          />
          <button
            onClick={handleSavePin}
            disabled={isPending || pin.length < 4}
            className="h-10 px-5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black font-black text-sm rounded-xl flex items-center gap-2 transition-all"
          >
            {isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            {pinSaved ? "Salvo!" : "Salvar PIN"}
          </button>
        </div>
      </div>

      {/* Operadores */}
      <div className="dash-card rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b dash-border">
          <div className="flex items-center gap-2">
            <Users size={16} className="dash-label" />
            <p className="dash-value font-bold text-sm">Operadores</p>
            <span className="dash-badge text-[10px] font-bold px-2 py-0.5 rounded-full">{operadores.length}</span>
          </div>
          <button
            onClick={() => setShowAddForm((v) => !v)}
            className="h-8 px-3 bg-[var(--brasa)] hover:bg-[var(--brasa-hover)] text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all"
          >
            <Plus size={13} /> Adicionar
          </button>
        </div>

        {/* Add form */}
        {showAddForm && (
          <div className="px-5 py-4 border-b dash-border dash-muted space-y-3">
            <p className="dash-subtitle text-[10px] font-bold uppercase tracking-widest">Novo Operador</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input value={addNome} onChange={(e) => setAddNome(e.target.value)} placeholder="Nome"
                className="dash-input py-2 px-3 rounded-xl text-sm outline-none" />
              <input value={addEmail} onChange={(e) => setAddEmail(e.target.value)} placeholder="E-mail" type="email"
                className="dash-input py-2 px-3 rounded-xl text-sm outline-none" />
              <input value={addSenha} onChange={(e) => setAddSenha(e.target.value)} placeholder="Senha (mín. 6)" type="password"
                className="dash-input py-2 px-3 rounded-xl text-sm outline-none" />
            </div>
            {addError && <p className="text-rose-400 text-xs font-bold flex items-center gap-1"><AlertTriangle size={11} />{addError}</p>}
            <div className="flex gap-2">
              <button onClick={handleAddOperador} disabled={isPending}
                className="h-8 px-4 bg-[var(--brasa)] hover:bg-[var(--brasa-hover)] disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center gap-1.5">
                {isPending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Confirmar
              </button>
              <button onClick={() => { setShowAddForm(false); setAddError(""); }}
                className="h-8 px-3 dash-action-btn rounded-xl text-xs font-bold flex items-center gap-1.5">
                <X size={12} /> Cancelar
              </button>
            </div>
          </div>
        )}

        {/* List */}
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 border-b dash-border animate-pulse last:border-0" />)
        ) : operadores.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <Users size={28} className="dash-label" />
            <p className="dash-subtitle text-sm font-semibold">Nenhum operador cadastrado.</p>
          </div>
        ) : (
          operadores.map((op) => (
            <div key={op.id} className="flex items-center gap-3 px-5 py-3.5 border-b dash-border last:border-0">
              <div className="w-9 h-9 rounded-xl dash-muted flex items-center justify-center shrink-0">
                <Users size={15} className="dash-label" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="dash-value font-semibold text-sm truncate">{op.nome ?? "—"}</p>
                <p className="dash-subtitle text-xs truncate">{op.email}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => handleRevogar(op.id)}
                  disabled={isPending}
                  title="Revogar acesso / deslogar dispositivos"
                  className="h-8 px-3 flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 disabled:opacity-50 font-bold text-xs transition-all"
                >
                  <UserMinus size={13} /> Revogar
                </button>
                <button
                  onClick={() => handleDelete(op.id)}
                  disabled={isPending}
                  title="Remover operador"
                  className="w-8 h-8 dash-action-btn-danger rounded-xl flex items-center justify-center"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl shadow-2xl border flex items-center gap-3 font-bold text-sm
          ${toast.ok ? "dash-icon-accent dash-border dash-highlight-text" : "bg-rose-500/10 border-rose-500/20 text-rose-400"}`}>
          {toast.ok ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}{toast.msg}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════════════════════════
const TABS: { id: TabId; label: string; icon: React.ElementType; desc: string }[] = [
  { id: "estoque", label: "Estoque",          icon: Package,         desc: "Produtos e inventário" },
  { id: "mesas",   label: "Mesas & Comandas", icon: TableProperties, desc: "Configuração de mesas" },
  { id: "geral",   label: "Geral",            icon: Store,           desc: "Preferências do sistema" },
  { id: "equipe",  label: "Equipe",           icon: Users,           desc: "Operadores e segurança" },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("estoque");

  return (
    <div className="dash-page min-h-screen">
      {/* Header */}
      <div className="px-4 md:px-8 pt-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 dash-icon-accent rounded-2xl flex items-center justify-center">
            <Settings size={19} className="dash-icon-accent-fg" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight bg-clip-text text-transparent"
              style={{ backgroundImage: "linear-gradient(135deg, #1c1917 0%, #57534e 100%)" }}>
              Configurações
            </h1>
            <p className="dash-subtitle text-xs font-medium">Gerencie estoque, mesas e preferências do sistema</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 pb-16 flex flex-col lg:flex-row gap-6">
        {/* Navigation */}
        <aside className="lg:w-52 lg:shrink-0">
          {/* Mobile: horizontal pills */}
          <div className="flex lg:hidden gap-1 p-1 dash-card rounded-2xl overflow-x-auto [&::-webkit-scrollbar]:hidden">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap shrink-0 ${
                  activeTab === id ? "bg-[var(--brasa)] text-white shadow-lg shadow-[0_4px_12px_rgba(211,84,0,0.2)]" : "dash-subtitle hover:dash-value"
                }`}>
                <Icon size={14} />{label}
              </button>
            ))}
          </div>

          {/* Desktop: vertical sidebar */}
          <nav className="hidden lg:flex flex-col gap-1 sticky top-6">
            {TABS.map(({ id, label, icon: Icon, desc }) => (
              <button key={id} onClick={() => setActiveTab(id)}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-left w-full ${
                  activeTab === id
                    ? "dash-highlight"
                    : "border border-transparent dash-subtitle hover:dash-value"
                }`}>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                  activeTab === id ? "dash-icon-accent" : "dash-icon-surface"
                }`}>
                  <Icon size={15} className={activeTab === id ? "dash-icon-accent-fg" : ""} />
                </div>
                <div className="min-w-0">
                  <p className={`text-sm font-bold leading-tight ${activeTab === id ? "dash-highlight-text" : "dash-value"}`}>{label}</p>
                  <p className="text-[10px] dash-subtitle truncate mt-0.5">{desc}</p>
                </div>
              </button>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0 pt-4 lg:pt-0">
          {activeTab === "estoque" && <EstoqueTab />}
          {activeTab === "mesas"   && <MesasTab />}
          {activeTab === "geral"   && <GeralTab />}
          {activeTab === "equipe"  && <EquipeTab />}
        </main>
      </div>
    </div>
  );
}

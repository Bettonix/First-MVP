"use client";

import { useState, useTransition, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  getEstoqueSettings, updateEstoque, entradaEstoque,
  criarProduto, editarProduto, excluirProduto,
  getNomeLoja, updateNomeLoja, getInstagramUrl, updateInstagramUrl,
  getMetodosPagamento, updateMetodosPagamento, getMensagemRecibo, updateMensagemRecibo,
  getDadosNegocio, updateDadosNegocio, getPinStatus, updatePin, removePin,
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
  CreditCard, Banknote, QrCode, Shield, Lock, Eye, EyeOff, FileText,
  Receipt, Building2, Phone, Image, Link,
} from "lucide-react";
import { fmtBRL } from "@/lib/currency";

// ─── Types ────────────────────────────────────────────────────────────────────
type TabId = "estoque" | "mesas" | "geral" | "equipe" | "pdv" | "seguranca";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function brlTocentavos(val: string): number {
  const n = parseFloat(val.replace(",", ".")) || 0;
  return Math.round(n * 100);
}
function centavosToStr(c: number): string {
  return (c / 100).toFixed(2).replace(".", ",");
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ msg, ok }: { msg: string; ok: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.96 }}
      className={`fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] right-6 z-50 px-5 py-3 rounded-2xl shadow-2xl border flex items-center gap-3 font-bold text-sm
        ${ok ? "dash-icon-accent dash-border dash-highlight-text" : "bg-rose-500/10 border-rose-500/20 text-rose-400"}`}
    >
      {ok ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}{msg}
    </motion.div>
  );
}

function useToast() {
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const show = useCallback((msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 2800);
  }, []);
  const el = (
    <AnimatePresence>
      {toast && <Toast key={toast.msg} msg={toast.msg} ok={toast.ok} />}
    </AnimatePresence>
  );
  return { show, el };
}

// ─── Auto-save indicator ──────────────────────────────────────────────────────
function SavedDot({ visible }: { visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.span
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest"
          style={{ color: "var(--success)" }}
        >
          <CheckCircle2 size={11} /> Salvo
        </motion.span>
      )}
    </AnimatePresence>
  );
}

// ─── Section card ─────────────────────────────────────────────────────────────
function SectionCard({
  icon: Icon,
  iconBg,
  iconColor,
  title,
  subtitle,
  children,
  action,
}: {
  icon: React.ElementType;
  iconBg?: string;
  iconColor?: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="bg-white/90 backdrop-blur-md border border-neutral-200/60 shadow-sm rounded-2xl overflow-hidden">
      <div className="px-6 py-5 border-b border-neutral-100 flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: iconBg ?? "var(--brasa-light)" }}
        >
          <Icon size={16} style={{ color: iconColor ?? "var(--brasa)" }} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-neutral-900 leading-tight">{title}</h3>
          <p className="text-sm text-neutral-500 leading-relaxed">{subtitle}</p>
        </div>
        {action}
      </div>
      <div className="p-6 md:p-8 flex flex-col gap-6">{children}</div>
    </div>
  );
}

// ─── Field label ──────────────────────────────────────────────────────────────
function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-sm font-medium text-neutral-700 block mb-1.5">
      {children}
    </label>
  );
}

// ─── Unified input class ──────────────────────────────────────────────────────
const inputCls = "h-10 bg-neutral-50 border border-neutral-200 rounded-lg px-3 text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none w-full";
const btnPrimary = "h-10 px-5 bg-orange-600 text-white rounded-lg font-medium shadow-sm hover:bg-orange-700 active:scale-95 transition-all flex items-center gap-2 shrink-0 disabled:opacity-40 text-sm";

// ─── Stock helpers (unchanged) ────────────────────────────────────────────────
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
  const editRef = useRef<HTMLInputElement>(null);
  useEffect(() => { setDraft(String(value)); }, [value]);
  useEffect(() => {
    if (!editing) return;
    const t = setTimeout(() => editRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [editing]);
  const commit = () => {
    const n = Math.max(0, parseInt(draft, 10) || 0);
    setEditing(false);
    if (n !== value) onSave(n);
  };
  if (editing) return (
    <input ref={editRef} type="number" min={0} value={draft}
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

// ─── Product Modal (unchanged) ────────────────────────────────────────────────
interface ProductModalProps {
  product: ProdutoSettings | null;
  onClose: () => void;
  onSaved: () => void;
}

function ModalField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="dash-label text-[10px] font-bold uppercase tracking-widest block mb-1.5">{label}</label>
      {children}
    </div>
  );
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

  const content = (
    <div className="fixed inset-0 z-[9000]" style={{ isolation: "isolate" }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-[500px] dash-card border-l dash-border flex flex-col shadow-2xl">
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
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="space-y-3">
            <p className="dash-label text-[10px] font-bold uppercase tracking-widest">Identificação</p>
            <ModalField label="Nome do Produto *">
              <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Coca-Cola 350ml"
                className="dash-input w-full py-2.5 px-4 rounded-xl text-sm font-semibold outline-none" />
            </ModalField>
            <ModalField label="Categoria">
              <input value={categoria} onChange={(e) => setCategoria(e.target.value)} placeholder="Ex: Bebidas, Lanches..."
                className="dash-input w-full py-2.5 px-4 rounded-xl text-sm font-semibold outline-none" />
            </ModalField>
          </div>
          <div className="border-t dash-border" />
          <div className="space-y-3">
            <p className="dash-label text-[10px] font-bold uppercase tracking-widest">Precificação</p>
            <div className="grid grid-cols-2 gap-3">
              <ModalField label="Preço de Venda (R$) *">
                <input value={precoVenda} onChange={(e) => setPrecoVenda(e.target.value)} placeholder="0,00"
                  className="dash-input w-full py-2.5 px-4 rounded-xl text-sm font-semibold outline-none" />
              </ModalField>
              <ModalField label="Preço de Custo (R$)">
                <input value={precoCusto} onChange={(e) => setPrecoCusto(e.target.value)} placeholder="0,00"
                  className="dash-input w-full py-2.5 px-4 rounded-xl text-sm font-semibold outline-none" />
              </ModalField>
            </div>
          </div>
          <div className="border-t dash-border" />
          <div className="space-y-3">
            <p className="dash-label text-[10px] font-bold uppercase tracking-widest">Controle de Estoque</p>
            <div className="grid grid-cols-2 gap-3">
              <ModalField label="Estoque Atual">
                <input type="number" min={0} value={estoque} onChange={(e) => setEstoque(e.target.value)}
                  className="dash-input w-full py-2.5 px-4 rounded-xl text-sm font-semibold outline-none" />
              </ModalField>
              <ModalField label="Estoque Mínimo">
                <input type="number" min={0} value={minEstoque} onChange={(e) => setMinEstoque(e.target.value)}
                  className="dash-input w-full py-2.5 px-4 rounded-xl text-sm font-semibold outline-none" />
              </ModalField>
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

// ─── Delete Confirm (unchanged) ───────────────────────────────────────────────
function DeleteConfirm({ product, onClose, onDeleted }: { product: ProdutoSettings; onClose: () => void; onDeleted: () => void }) {
  const [isPending, startTransition] = useTransition();
  const handleDelete = () => {
    startTransition(async () => { await excluirProduto(product.id); onDeleted(); onClose(); });
  };
  const content = (
    <div className="fixed inset-0 z-[9100] flex items-end sm:items-center justify-center sm:p-4" style={{ isolation: "isolate" }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative dash-card rounded-t-3xl sm:rounded-2xl px-6 pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:pb-6 max-w-sm w-full shadow-2xl z-10">
        <div className="w-10 h-1 rounded-full mx-auto mb-5 sm:hidden" style={{ backgroundColor: "var(--border-md)" }} />
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
// TAB: ESTOQUE (unchanged)
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
  const { show: showToast, el: toastEl }  = useToast();

  const reload = useCallback(() => {
    setLoading(true);
    getEstoqueSettings().then((d) => { setProdutos(d); setLoading(false); });
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const handleInlineUpdate = (id: string, data: { estoqueAtual?: number; estoqueMinimo?: number; gerenciarEstoque?: boolean }) => {
    setProdutos((prev) => prev.map((p) => p.id === id ? { ...p, ...data } : p));
    startTransition(async () => {
      const res = await updateEstoque(id, data);
      if ("error" in res) { showToast(res.error, false); }
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map(({ label, value, sub, color }) => (
          <div key={label} className="dash-card rounded-2xl p-4 flex flex-col gap-0.5">
            <p className="dash-label text-[10px] font-bold uppercase tracking-widest mb-1">{label}</p>
            <p className={`text-2xl font-black tabular-nums ${color}`}>{value}</p>
            <p className="dash-subtitle text-[11px] leading-tight">{sub}</p>
          </div>
        ))}
      </div>
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
                <div key={`skeleton-${i}`} className="h-[60px] border-b dash-border animate-pulse last:border-0" />
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
      <div className="dash-card rounded-2xl overflow-hidden md:hidden">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <div key={`skeleton-${i}`} className="h-20 border-b dash-border animate-pulse last:border-0" />)
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
      {toastEl}
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
// TAB: MESAS (unchanged)
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
      if (r.error) { setBatchError(r.error); } else { reload(); }
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
              {Array.from({ length: 10 }).map((_, i) => <div key={`skeleton-${i}`} className="h-[70px] dash-card rounded-xl animate-pulse" />)}
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
// TAB: GERAL (upgraded — bento cards, auto-save on blur, logo placeholder)
// ═══════════════════════════════════════════════════════════════════════════════
function GeralTab() {
  const [nomeLoja,    setNomeLoja]    = useState("");
  const [nomeDraft,   setNomeDraft]   = useState("");
  const [nicho,       setNicho]       = useState("");
  const [instagram,   setInstagram]   = useState("");
  const [instaDraft,  setInstaDraft]  = useState("");
  const [cnpjCpf,     setCnpjCpf]    = useState("");
  const [telefone,    setTelefone]    = useState("");
  const [isPending,   start]          = useTransition();
  const [savedNome,   setSavedNome]   = useState(false);
  const [savedInsta,  setSavedInsta]  = useState(false);
  const [savedFiscal, setSavedFiscal] = useState(false);
  const [instaError,  setInstaError]  = useState("");
  const { show: showToast, el: toastEl } = useToast();

  useEffect(() => {
    getNomeLoja().then((n) => { setNomeLoja(n); setNomeDraft(n); });
    getInstagramUrl().then((u) => { setInstagram(u); setInstaDraft(u); });
    getDadosNegocio().then((d) => { setCnpjCpf(d.cnpjCpf); setTelefone(d.telefone); });
  }, []);

  const flash = (setter: (v: boolean) => void) => {
    setter(true);
    setTimeout(() => setter(false), 2500);
  };

  const saveNome = () => {
    if (nomeDraft === nomeLoja || !nomeDraft.trim()) return;
    start(async () => {
      const res = await updateNomeLoja(nomeDraft);
      if ("ok" in res) { setNomeLoja(nomeDraft); flash(setSavedNome); }
      else showToast(res.error, false);
    });
  };

  const saveInstagram = () => {
    setInstaError("");
    if (instaDraft === instagram) return;
    start(async () => {
      const res = await updateInstagramUrl(instaDraft);
      if ("ok" in res) { setInstagram(instaDraft); flash(setSavedInsta); }
      else setInstaError(res.error);
    });
  };

  const saveFiscal = () => {
    start(async () => {
      const res = await updateDadosNegocio({ cnpjCpf, telefone });
      if ("ok" in res) flash(setSavedFiscal);
      else showToast(res.error, false);
    });
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      <SectionCard icon={Store} title="Identidade da Loja" subtitle="Nome e nicho de atuação">
        <div>
          <FieldLabel>Nome do Estabelecimento</FieldLabel>
          <div className="flex items-center gap-3">
            <input
              value={nomeDraft}
              onChange={(e) => setNomeDraft(e.target.value)}
              onBlur={saveNome}
              onKeyDown={(e) => { if (e.key === "Enter") saveNome(); }}
              placeholder="Ex: Restaurante do João"
              className={`${inputCls} flex-1`}
            />
            <SavedDot visible={savedNome} />
          </div>
          <p className="text-sm text-neutral-400 mt-2">Exibido no cabeçalho do PDV e em relatórios.</p>
        </div>
        <div>
          <FieldLabel>Nicho de Atuação</FieldLabel>
          <select
            value={nicho}
            onChange={(e) => setNicho(e.target.value)}
            className={`${inputCls} appearance-none`}
          >
            <option value="">Selecione...</option>
            <option value="restaurante">Restaurante</option>
            <option value="lanchonete">Lanchonete / Snack Bar</option>
            <option value="bar">Bar / Boteco</option>
            <option value="cafeteria">Cafeteria</option>
            <option value="pizzaria">Pizzaria</option>
            <option value="sorveteria">Sorveteria / Açaí</option>
            <option value="outros">Outros</option>
          </select>
        </div>
      </SectionCard>

      {/* Logo */}
      <SectionCard icon={Image} title="Logotipo" subtitle="Aparece no cabeçalho dos recibos">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-neutral-200 bg-neutral-50 flex items-center justify-center shrink-0">
            <Image size={24} className="text-neutral-300" />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-sm text-neutral-500 leading-relaxed">
              Upload de logo disponível em breve. O logotipo aparecerá no cabeçalho dos recibos térmicos.
            </p>
            <button
              disabled
              className="h-9 px-4 rounded-lg text-sm font-medium flex items-center gap-2 opacity-40 cursor-not-allowed bg-neutral-100 text-neutral-500 w-fit"
            >
              <Plus size={13} /> Enviar imagem
            </button>
          </div>
        </div>
      </SectionCard>

      {/* Dados Fiscais */}
      <SectionCard
        icon={Building2}
        title="Dados Fiscais"
        subtitle="CNPJ/CPF e telefone do negócio"
        action={<SavedDot visible={savedFiscal} />}
      >
        <div>
          <FieldLabel>CNPJ / CPF</FieldLabel>
          <div className="relative">
            <Building2 size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
            <input
              value={cnpjCpf}
              onChange={(e) => setCnpjCpf(e.target.value)}
              onBlur={saveFiscal}
              placeholder="00.000.000/0001-00"
              className={`${inputCls} pl-9`}
            />
          </div>
        </div>
        <div>
          <FieldLabel>Telefone / WhatsApp</FieldLabel>
          <div className="relative">
            <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
            <input
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              onBlur={saveFiscal}
              placeholder="(11) 99999-9999"
              className={`${inputCls} pl-9`}
            />
          </div>
        </div>
      </SectionCard>

      {/* Link do Recibo */}
      <SectionCard
        icon={Link}
        title="Link do Recibo (QR Code)"
        subtitle="Aparece no rodapé do recibo térmico"
        action={<SavedDot visible={savedInsta} />}
      >
        <div>
          <FieldLabel>URL do Instagram ou site</FieldLabel>
          <input
            value={instaDraft}
            onChange={(e) => { setInstaDraft(e.target.value); setInstaError(""); }}
            onBlur={saveInstagram}
            onKeyDown={(e) => { if (e.key === "Enter") saveInstagram(); }}
            placeholder="https://www.instagram.com/suaLoja"
            className={inputCls}
          />
          {instaError && (
            <p className="text-rose-500 text-sm font-medium flex items-center gap-1 mt-2">
              <AlertTriangle size={13} />{instaError}
            </p>
          )}
          <p className="text-sm text-neutral-400 mt-2">Deixe vazio para não exibir QR Code.</p>
        </div>
      </SectionCard>

      {toastEl}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: PDV (upgraded — payment toggles + live receipt preview)
// ═══════════════════════════════════════════════════════════════════════════════
const METODOS_OPCOES = [
  { value: "PIX",            label: "PIX",     icon: QrCode,     color: "#2D6A4F" },
  { value: "DINHEIRO",       label: "Dinheiro",icon: Banknote,   color: "#B7791F" },
  { value: "CARTAO_CREDITO", label: "Crédito", icon: CreditCard, color: "#1E40AF" },
  { value: "CARTAO_DEBITO",  label: "Débito",  icon: CreditCard, color: "#5C6B3A" },
];

function ReciboPreview({ nomeLoja, mensagem, instagram }: { nomeLoja: string; mensagem: string; instagram: string }) {
  const now = new Date();
  const hora = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const data = now.toLocaleDateString("pt-BR");

  return (
    <div
      className="rounded-xl p-4 font-mono text-[11px] leading-relaxed select-none w-full max-w-[220px]"
      style={{
        backgroundColor: "#FAFAF8",
        border: "1px solid #E5E5E5",
        boxShadow: "inset 0 1px 3px rgba(0,0,0,0.04)",
        color: "#2D2D2D",
      }}
    >
      <div className="text-center mb-3 pb-2" style={{ borderBottom: "1px dashed #ccc" }}>
        <p className="font-bold text-[12px] uppercase tracking-wide truncate">{nomeLoja || "Nome da Loja"}</p>
        <p className="text-[10px] opacity-60 mt-0.5">{data} · {hora}</p>
      </div>
      <div className="space-y-1 mb-3">
        {[["Produto Exemplo", "R$ 12,00"], ["Outro Item", "R$ 8,50"]].map(([n, v]) => (
          <div key={n} className="flex justify-between gap-2">
            <span className="opacity-70 truncate">{n}</span>
            <span className="font-bold shrink-0">{v}</span>
          </div>
        ))}
      </div>
      <div
        className="flex justify-between font-bold text-[12px] py-2 mb-3"
        style={{ borderTop: "1px dashed #ccc", borderBottom: "1px dashed #ccc" }}
      >
        <span>TOTAL</span>
        <span>R$ 20,50</span>
      </div>
      <div className="text-center">
        <p className="text-[10px] opacity-80 leading-snug break-words">{mensagem || "Obrigado pela preferência!"}</p>
        {instagram && (
          <p className="text-[10px] opacity-50 mt-1 truncate">{instagram}</p>
        )}
      </div>
    </div>
  );
}

function PdvTab() {
  const [metodos,   setMetodos]   = useState<string[]>([]);
  const [mensagem,  setMensagem]  = useState("");
  const [nomeLoja,  setNomeLoja]  = useState("");
  const [instagram, setInstagram] = useState("");
  const [isPending, start]        = useTransition();
  const [savedMetodos,  setSavedMetodos]  = useState(false);
  const [savedMensagem, setSavedMensagem] = useState(false);
  const { show: showToast, el: toastEl }  = useToast();

  const flash = (setter: (v: boolean) => void) => {
    setter(true);
    setTimeout(() => setter(false), 2500);
  };

  useEffect(() => {
    getMetodosPagamento().then(setMetodos);
    getMensagemRecibo().then(setMensagem);
    getNomeLoja().then(setNomeLoja);
    getInstagramUrl().then(setInstagram);
  }, []);

  const toggleMetodo = (v: string) =>
    setMetodos((p) => p.includes(v) ? p.filter((m) => m !== v) : [...p, v]);

  const saveMetodos = () => {
    start(async () => {
      const res = await updateMetodosPagamento(metodos);
      if ("ok" in res) flash(setSavedMetodos);
      else showToast(res.error, false);
    });
  };

  const saveMensagem = () => {
    start(async () => {
      const res = await updateMensagemRecibo(mensagem);
      if ("ok" in res) flash(setSavedMensagem);
      else showToast(res.error, false);
    });
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Métodos de pagamento */}
      <SectionCard
        icon={CreditCard}
        title="Formas de Pagamento"
        subtitle="Métodos aceitos no PDV"
        action={<SavedDot visible={savedMetodos} />}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {METODOS_OPCOES.map(({ value, label, icon: Icon, color }) => {
            const sel = metodos.includes(value);
            return (
              <button
                key={value}
                type="button"
                role="switch"
                aria-checked={sel}
                onClick={() => toggleMetodo(value)}
                className="flex items-center gap-3 h-14 px-4 rounded-lg transition-all text-left"
                style={{
                  backgroundColor: sel ? `${color}12` : "#F9F9F9",
                  border: sel ? `1.5px solid ${color}35` : "1.5px solid #E5E5E5",
                }}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: sel ? `${color}20` : "#EFEFEF" }}
                >
                  <Icon size={16} style={{ color: sel ? color : "#9A9A9A" }} />
                </div>
                <span className="text-sm font-medium flex-1" style={{ color: sel ? color : "#4A4A4A" }}>{label}</span>
                <div
                  className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all"
                  style={{
                    borderColor: sel ? color : "#D4D4D4",
                    backgroundColor: sel ? color : "transparent",
                  }}
                >
                  {sel && <Check size={10} color="#fff" strokeWidth={3} />}
                </div>
              </button>
            );
          })}
        </div>
        <div className="flex justify-end">
          <button
            onClick={saveMetodos}
            disabled={isPending || metodos.length === 0}
            className={btnPrimary}
          >
            {isPending ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
            Salvar
          </button>
        </div>
      </SectionCard>

      {/* Mensagem do recibo + live preview */}
      <SectionCard
        icon={Receipt}
        title="Mensagem do Recibo"
        subtitle="Edite e veja o resultado em tempo real"
        action={<SavedDot visible={savedMensagem} />}
      >
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          <div className="flex flex-col gap-4 flex-1 min-w-0">
            <div>
              <FieldLabel>Mensagem de rodapé</FieldLabel>
              <textarea
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
                onBlur={saveMensagem}
                rows={4}
                placeholder="Obrigado pela preferência! Volte sempre."
                className="bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none w-full resize-none"
              />
              <p className="text-sm text-neutral-400 mt-2">Salvo automaticamente ao sair do campo.</p>
            </div>
          </div>
          <div className="shrink-0 w-full lg:w-auto">
            <p className="text-sm font-medium text-neutral-700 mb-3">Prévia do Recibo</p>
            <ReciboPreview nomeLoja={nomeLoja} mensagem={mensagem} instagram={instagram} />
          </div>
        </div>
      </SectionCard>

      {toastEl}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: SEGURANÇA (upgraded — status card + virtual numpad)
// ═══════════════════════════════════════════════════════════════════════════════
function VirtualNumpad({
  value,
  onChange,
  maxLength = 6,
}: {
  value: string;
  onChange: (v: string) => void;
  maxLength?: number;
}) {
  const keys = ["1","2","3","4","5","6","7","8","9","","0","⌫"];

  const press = (k: string) => {
    if (k === "⌫") { onChange(value.slice(0, -1)); return; }
    if (k === "") return;
    if (value.length >= maxLength) return;
    onChange(value + k);
  };

  return (
    <div className="flex flex-col items-center gap-5">
      {/* PIN dots */}
      <div className="flex items-center justify-center gap-4 py-2">
        {Array.from({ length: maxLength }).map((_, i) => (
          <div
            key={i}
            className="w-3.5 h-3.5 rounded-full transition-all duration-150"
            style={{
              backgroundColor: i < value.length ? "#D35400" : "#E5E5E5",
              transform: i < value.length ? "scale(1.25)" : "scale(1)",
            }}
          />
        ))}
      </div>

      {/* 3×4 keypad */}
      <div className="grid grid-cols-3 gap-4 max-w-xs w-full mx-auto">
        {keys.map((k, i) => (
          <button
            key={i}
            type="button"
            onClick={() => press(k)}
            disabled={k === ""}
            className={`aspect-square rounded-2xl font-bold text-xl transition-all active:scale-90 ${
              k === "⌫"
                ? "bg-neutral-100 hover:bg-neutral-200 text-neutral-500 text-base"
                : k === ""
                ? "invisible"
                : "bg-white border border-neutral-200 hover:bg-orange-50 hover:border-orange-200 text-neutral-800 shadow-sm"
            }`}
          >
            {k}
          </button>
        ))}
      </div>
    </div>
  );
}

function SegurancaTab() {
  const [temPin,     setTemPin]     = useState(false);
  const [pinAtual,   setPinAtual]   = useState("");
  const [pinNovo,    setPinNovo]    = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [isPending,  start]         = useTransition();
  const [mode,       setMode]       = useState<"idle" | "set" | "remove">("idle");
  const [step,       setStep]       = useState<"atual" | "novo" | "confirmar">("atual");
  const [pinError,   setPinError]   = useState("");
  const { show: showToast, el: toastEl } = useToast();

  useEffect(() => { getPinStatus().then(setTemPin); }, []);

  const resetForm = () => {
    setMode("idle"); setStep("atual");
    setPinAtual(""); setPinNovo(""); setPinConfirm(""); setPinError("");
  };

  const handleSavePin = () => {
    if (pinNovo !== pinConfirm) { setPinError("PINs não coincidem."); return; }
    start(async () => {
      const res = await updatePin(temPin ? pinAtual : null, pinNovo);
      if ("ok" in res) {
        showToast(temPin ? "PIN alterado!" : "PIN configurado!");
        setTemPin(true); resetForm();
      } else { setPinError(res.error); }
    });
  };

  const handleRemovePin = () => {
    start(async () => {
      const res = await removePin(pinAtual);
      if ("ok" in res) { showToast("PIN removido."); setTemPin(false); resetForm(); }
      else { setPinError(res.error); }
    });
  };

  // Determine current numpad target and advance logic
  const currentValue = mode === "remove" ? pinAtual
    : step === "atual" ? pinAtual
    : step === "novo" ? pinNovo
    : pinConfirm;

  const setCurrentValue = (v: string) => {
    if (mode === "remove") { setPinAtual(v); return; }
    if (step === "atual") setPinAtual(v);
    else if (step === "novo") setPinNovo(v);
    else setPinConfirm(v);
  };

  const canAdvance = currentValue.length >= 4;

  const advanceStep = () => {
    setPinError("");
    if (mode === "remove") { handleRemovePin(); return; }
    if (step === "atual" && temPin) { setStep("novo"); return; }
    if (step === "atual" && !temPin) { setStep("novo"); return; }
    if (step === "novo") { setStep("confirmar"); return; }
    if (step === "confirmar") { handleSavePin(); }
  };

  const stepLabel = mode === "remove"
    ? "Digite o PIN atual para confirmar a remoção"
    : !temPin
    ? step === "novo" ? "Crie um novo PIN (4–6 dígitos)" : step === "confirmar" ? "Confirme o PIN" : "Crie um novo PIN"
    : step === "atual" ? "Digite o PIN atual" : step === "novo" ? "Digite o novo PIN" : "Confirme o novo PIN";

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Status card */}
      <div
        className="rounded-3xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5"
        style={{
          backgroundColor: temPin ? "#EDFAF3" : "#FEF3C7",
          border: `1px solid ${temPin ? "rgba(45,106,79,0.2)" : "rgba(146,64,14,0.2)"}`,
        }}
      >
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: temPin ? "rgba(45,106,79,0.15)" : "rgba(146,64,14,0.15)" }}
        >
          <Shield size={22} style={{ color: temPin ? "#2D6A4F" : "#92400E" }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-base" style={{ color: temPin ? "#2D6A4F" : "#92400E" }}>
            {temPin ? "🟢 Proteção Ativa" : "⚠️ Sem Proteção"}
          </p>
          <p className="text-sm mt-1 leading-relaxed" style={{ color: temPin ? "#2D6A4F" : "#92400E", opacity: 0.8 }}>
            {temPin
              ? "O PIN protege estornos e ações críticas do caixa."
              : "Configure um PIN para proteger operações sensíveis."}
          </p>
        </div>
        {mode === "idle" && (
          <div className="flex flex-row sm:flex-col gap-2 shrink-0 w-full sm:w-auto">
            <button
              onClick={() => { setMode("set"); setStep(temPin ? "atual" : "novo"); }}
              className={`${btnPrimary} flex-1 sm:flex-none justify-center`}
            >
              <Lock size={15} /> {temPin ? "Alterar PIN" : "Ativar PIN"}
            </button>
            {temPin && (
              <button
                onClick={() => { setMode("remove"); setPinAtual(""); }}
                className="h-11 px-6 rounded-xl font-medium text-sm flex items-center gap-2 transition-all flex-1 sm:flex-none justify-center"
                style={{ backgroundColor: "#FEF2F2", color: "#9B1C1C" }}
              >
                <XCircle size={15} /> Desativar
              </button>
            )}
          </div>
        )}
      </div>

      {/* Numpad panel */}
      <AnimatePresence>
        {mode !== "idle" && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="bg-white/90 backdrop-blur-md border border-neutral-200/60 shadow-sm rounded-2xl overflow-hidden"
          >
            <div className="px-6 py-5 border-b border-neutral-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: "var(--brasa-light)" }}>
                  <Lock size={15} style={{ color: "var(--brasa)" }} />
                </div>
                <p className="text-lg font-semibold text-neutral-900">{stepLabel}</p>
              </div>
              <button
                onClick={resetForm}
                className="w-9 h-9 rounded-xl bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center transition-colors"
              >
                <X size={15} className="text-neutral-500" />
              </button>
            </div>

            <div className="p-6 md:p-8 flex flex-col gap-6">
              <VirtualNumpad value={currentValue} onChange={setCurrentValue} maxLength={6} />

              {pinError && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center text-sm font-medium flex items-center justify-center gap-1.5 text-red-600"
                >
                  <AlertTriangle size={14} /> {pinError}
                </motion.p>
              )}

              <div className="flex gap-3 justify-center">
                <button
                  onClick={advanceStep}
                  disabled={!canAdvance || isPending}
                  className={`${btnPrimary} px-8`}
                >
                  {isPending ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                  {mode === "remove" ? "Confirmar Remoção"
                    : step === "confirmar" ? "Salvar PIN"
                    : "Continuar"}
                </button>
                <button
                  onClick={resetForm}
                  className="h-10 px-6 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 font-medium text-sm rounded-lg transition-all"
                >
                  Cancelar
                </button>
              </div>

              {/* Step progress dots */}
              {mode === "set" && (
                <div className="flex items-center justify-center gap-2">
                  {(temPin ? ["atual","novo","confirmar"] : ["novo","confirmar"]).map((s) => (
                    <div
                      key={s}
                      className="h-1.5 rounded-full transition-all duration-300"
                      style={{
                        width: step === s ? 28 : 8,
                        backgroundColor: step === s ? "#D35400" : "#E5E5E5",
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {toastEl}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: EQUIPE (unchanged)
// ═══════════════════════════════════════════════════════════════════════════════
function EquipeTab() {
  const [isPending, startTransition] = useTransition();
  const [operadores, setOperadores] = useState<OperadorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const { show: showToast, el: toastEl } = useToast();

  const [pin, setPin] = useState("");
  const [pinSaved, setPinSaved] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addNome, setAddNome] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addSenha, setAddSenha] = useState("");
  const [addError, setAddError] = useState("");

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
    <div className="flex flex-col gap-6 w-full">
      {/* PIN do Gerente */}
      <div className="bg-white/90 backdrop-blur-md border border-neutral-200/60 shadow-sm rounded-3xl p-6 md:p-8 flex flex-col gap-6 overflow-hidden">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
            <ShieldCheck size={18} className="text-orange-600" />
          </div>
          <div>
            <p className="text-lg font-semibold text-neutral-900">PIN de Autorização</p>
            <p className="text-sm text-neutral-500">Usado para autorizar estornos e desbloquear a tela</p>
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
            className="h-10 bg-neutral-50 border border-neutral-200 rounded-lg px-4 text-sm font-bold outline-none tracking-[0.4em] text-center w-32 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
          />
          <button
            onClick={handleSavePin}
            disabled={isPending || pin.length < 4}
            className={btnPrimary}
          >
            {isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            {pinSaved ? "Salvo!" : "Salvar PIN"}
          </button>
        </div>
      </div>

      {/* Operadores */}
      <div className="bg-white/90 backdrop-blur-md border border-neutral-200/60 shadow-sm rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-neutral-400" />
            <p className="text-lg font-semibold text-neutral-900">Operadores</p>
            <span className="bg-neutral-100 text-neutral-500 text-xs font-bold px-2 py-0.5 rounded-full">{operadores.length}</span>
          </div>
          <button
            onClick={() => setShowAddForm((v) => !v)}
            className={btnPrimary}
          >
            <Plus size={14} /> Adicionar
          </button>
        </div>

        {showAddForm && (
          <div className="px-6 py-5 border-b border-neutral-100 bg-neutral-50 flex flex-col gap-4">
            <p className="text-sm font-medium text-neutral-700">Novo Operador</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input value={addNome} onChange={(e) => setAddNome(e.target.value)} placeholder="Nome"
                className={inputCls} />
              <input value={addEmail} onChange={(e) => setAddEmail(e.target.value)} placeholder="E-mail" type="email"
                className={inputCls} />
              <input value={addSenha} onChange={(e) => setAddSenha(e.target.value)} placeholder="Senha (mín. 6)" type="password"
                className={inputCls} />
            </div>
            {addError && (
              <p className="text-rose-500 text-sm font-medium flex items-center gap-1.5">
                <AlertTriangle size={13} />{addError}
              </p>
            )}
            <div className="flex gap-2">
              <button onClick={handleAddOperador} disabled={isPending}
                className={btnPrimary}>
                {isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Confirmar
              </button>
              <button onClick={() => { setShowAddForm(false); setAddError(""); }}
                className="h-10 px-4 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 font-medium text-sm rounded-lg flex items-center gap-1.5 transition-all">
                <X size={14} /> Cancelar
              </button>
            </div>
          </div>
        )}

        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <div key={`skeleton-${i}`} className="h-16 border-b border-neutral-100 animate-pulse last:border-0" />)
        ) : operadores.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <Users size={28} className="text-neutral-300" />
            <p className="text-sm font-medium text-neutral-500">Nenhum operador cadastrado.</p>
          </div>
        ) : (
          operadores.map((op) => (
            <div key={op.id} className="flex items-center gap-3 px-6 py-4 border-b border-neutral-100 last:border-0">
              <div className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center shrink-0">
                <Users size={15} className="text-neutral-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-neutral-900 truncate">{op.nome ?? "—"}</p>
                <p className="text-xs text-neutral-500 truncate">{op.email}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleRevogar(op.id)}
                  disabled={isPending}
                  className="h-9 px-3 flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 disabled:opacity-50 font-medium text-sm transition-all"
                >
                  <UserMinus size={14} /> Revogar
                </button>
                <button
                  onClick={() => handleDelete(op.id)}
                  disabled={isPending}
                  className="w-9 h-9 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 flex items-center justify-center transition-all disabled:opacity-50"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      {toastEl}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE SHELL
// ═══════════════════════════════════════════════════════════════════════════════
const TABS: { id: TabId; label: string; icon: React.ElementType; desc: string }[] = [
  { id: "geral",     label: "Geral",            icon: Store,           desc: "Identidade e dados fiscais"  },
  { id: "pdv",       label: "PDV",              icon: CreditCard,      desc: "Pagamentos e recibos"        },
  { id: "seguranca", label: "Segurança",        icon: Shield,          desc: "PIN e controle de acesso"    },
  { id: "estoque",   label: "Estoque",          icon: Package,         desc: "Produtos e inventário"       },
  { id: "mesas",     label: "Mesas & Comandas", icon: TableProperties, desc: "Configuração de mesas"       },
  { id: "equipe",    label: "Equipe",           icon: Users,           desc: "Operadores e permissões"     },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("geral");

  return (
    <div className="dash-page min-h-screen">
      {/* Page header */}
      <div className="p-4 md:p-8 pb-0 max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 dash-icon-accent rounded-2xl flex items-center justify-center shrink-0">
            <Settings size={19} className="dash-icon-accent-fg" />
          </div>
          <div>
            <h1
              className="text-xl font-black tracking-tight bg-clip-text text-transparent"
              style={{ backgroundImage: "linear-gradient(135deg, #1c1917 0%, #57534e 100%)" }}
            >
              Configurações
            </h1>
            <p className="text-sm text-neutral-500">Central de controle do seu estabelecimento</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8 max-w-5xl mx-auto w-full p-4 md:p-8 pt-0 items-start">
        {/* ── Sidebar ── */}
        <aside className="w-full md:w-64 shrink-0 h-fit bg-transparent">
          {/* Mobile: horizontal scroll pills */}
          <div className="flex md:hidden gap-1 p-1 bg-white/90 border border-neutral-200/60 rounded-2xl overflow-x-auto [&::-webkit-scrollbar]:hidden shadow-sm">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === id ? "text-white" : "text-neutral-500 hover:text-neutral-900"
                }`}
              >
                {activeTab === id && (
                  <motion.span
                    layoutId="mobile-pill"
                    className="absolute inset-0 rounded-xl bg-orange-600"
                    transition={{ type: "spring", stiffness: 400, damping: 35 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <Icon size={14} />{label}
                </span>
              </button>
            ))}
          </div>

          {/* Desktop: transparent nav with white pill active state */}
          <nav className="hidden md:flex flex-col gap-1 sticky top-6">
            {TABS.map(({ id, label, icon: Icon, desc }) => {
              const isActive = activeTab === id;
              return (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 select-none cursor-pointer text-left w-full ${
                    isActive
                      ? "bg-white text-orange-600 shadow-sm border border-neutral-200/60"
                      : "text-neutral-500 hover:bg-neutral-200/50 hover:text-neutral-900 border border-transparent"
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                      isActive ? "bg-orange-50" : "bg-neutral-100"
                    }`}
                  >
                    <Icon
                      size={14}
                      strokeWidth={isActive ? 2.5 : 2}
                      className={isActive ? "text-orange-600" : "text-neutral-400"}
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="leading-tight truncate">{label}</p>
                    <p className="text-[11px] text-neutral-400 truncate mt-0.5 font-normal">{desc}</p>
                  </div>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* ── Content ── */}
        <main className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
            >
              {activeTab === "geral"     && <GeralTab />}
              {activeTab === "pdv"       && <PdvTab />}
              {activeTab === "seguranca" && <SegurancaTab />}
              {activeTab === "estoque"   && <EstoqueTab />}
              {activeTab === "mesas"     && <MesasTab />}
              {activeTab === "equipe"    && <EquipeTab />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

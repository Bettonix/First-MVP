"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  getEstoqueSettings, updateEstoque, entradaEstoque,
  criarProduto, editarProduto, excluirProduto,
  getNomeLoja, updateNomeLoja,
  type ProdutoSettings, type ProdutoInput,
} from "@/app/actions/settings";
import {
  getMesas, criarMesasEmLote, toggleMesa, updateMesa, deleteMesa, deleteTodasMesas,
  type MesaRow,
} from "@/app/actions/mesas";
import {
  Settings, Package, TableProperties, Store,
  CheckCircle2, AlertTriangle, XCircle,
  Loader2, Plus, ToggleLeft, ToggleRight,
  Zap, PlusCircle, Pencil, Check, X, Trash2,
} from "lucide-react";
import { fmtBRL } from "@/lib/currency";

// ─── Types ────────────────────────────────────────────────────────────────────
type TabId = "estoque" | "mesas" | "geral";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function brlTocentavos(val: string): number {
  const n = parseFloat(val.replace(",", ".")) || 0;
  return Math.round(n * 100);
}
function centavosToStr(c: number): string {
  return (c / 100).toFixed(2).replace(".", ",");
}

function StockBadge({ atual, minimo, gerenciar }: { atual: number; minimo: number; gerenciar: boolean }) {
  if (!gerenciar)   return <span className="dash-badge text-[10px] font-bold px-2 py-0.5 rounded-full">—</span>;
  if (atual <= 0)   return <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"><XCircle size={10} />Esgotado</span>;
  if (atual <= minimo) return <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"><AlertTriangle size={10} />Baixo</span>;
  return <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"><CheckCircle2 size={10} />OK</span>;
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
      className="dash-input w-16 text-center text-sm font-bold rounded-lg py-1 px-1 outline-none"
    />
  );
  return (
    <button onClick={() => setEditing(true)} className="w-16 text-center text-sm font-black dash-value hover:text-emerald-400 transition-colors group flex items-center justify-center gap-0.5">
      {value}<Pencil size={9} className="opacity-0 group-hover:opacity-50" />
    </button>
  );
}

// ─── Product Modal (Create / Edit) ───────────────────────────────────────────
interface ProductModalProps {
  product: ProdutoSettings | null; // null = create
  onClose: () => void;
  onSaved: () => void;
}

function ProductModal({ product, onClose, onSaved }: ProductModalProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError]            = useState("");

  const [nome,        setNome]        = useState(product?.nome ?? "");
  const [categoria,   setCategoria]   = useState(product?.categoria ?? "Outros");
  const [precoVenda,  setPrecoVenda]  = useState(product ? centavosToStr(product.precoCentavos) : "");
  const [precoCusto,  setPrecoCusto]  = useState(product ? centavosToStr(product.precoCustoCentavos) : "0,00");
  const [estoque,     setEstoque]     = useState(String(product?.estoqueAtual ?? 0));
  const [minEstoque,  setMinEstoque]  = useState(String(product?.estoqueMinimo ?? 0));
  const [gerenciar,   setGerenciar]   = useState(product?.gerenciarEstoque ?? true);
  const [favorito,    setFavorito]    = useState(product?.isFavorito ?? true);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
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
      const res = product
        ? await editarProduto(product.id, input)
        : await criarProduto(input);

      if ("error" in res) { setError(res.error); return; }
      onSaved();
      onClose();
    });
  };

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
      <label className="dash-label text-xs font-bold uppercase tracking-wider block mb-1.5">{label}</label>
      {children}
    </div>
  );

  const content = (
    <div className="fixed inset-0 z-[9000]" style={{ isolation: "isolate" }}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-[480px] dash-card border-l dash-border flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b dash-border shrink-0">
          <div>
            <h2 className="dash-title font-black text-lg">{product ? "Editar Produto" : "Novo Produto"}</h2>
            <p className="dash-subtitle text-xs font-medium">{product ? `Editando: ${product.nome}` : "Preencha os dados do produto."}</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 dash-nav-btn rounded-xl flex items-center justify-center"><X size={16} /></button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <Field label="Nome do Produto *">
            <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Coca-Cola 350ml"
              className="dash-input w-full py-2.5 px-4 rounded-xl text-sm font-semibold outline-none" />
          </Field>

          <Field label="Categoria">
            <input value={categoria} onChange={(e) => setCategoria(e.target.value)} placeholder="Ex: Bebidas, Lanches..."
              className="dash-input w-full py-2.5 px-4 rounded-xl text-sm font-semibold outline-none" />
          </Field>

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

          <div className="flex gap-4">
            <button onClick={() => setGerenciar(!gerenciar)} className={`flex-1 flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${gerenciar ? "bg-emerald-500/10 border-emerald-500/30" : "dash-card border-white/5"}`}>
              <span className="dash-value text-sm font-bold">Gerenciar Estoque</span>
              {gerenciar ? <ToggleRight size={22} className="text-emerald-400" /> : <ToggleLeft size={22} className="dash-subtitle" />}
            </button>
            <button onClick={() => setFavorito(!favorito)} className={`flex-1 flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${favorito ? "bg-amber-500/10 border-amber-500/30" : "dash-card border-white/5"}`}>
              <span className="dash-value text-sm font-bold">Favorito (PDV)</span>
              {favorito ? <ToggleRight size={22} className="text-amber-400" /> : <ToggleLeft size={22} className="dash-subtitle" />}
            </button>
          </div>

          {error && (
            <p className="text-rose-500 text-xs font-semibold flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2">
              <AlertTriangle size={14} />{error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t dash-border shrink-0 flex gap-3">
          <button onClick={onClose} className="flex-1 h-11 dash-nav-btn font-bold rounded-xl text-sm">Cancelar</button>
          <button onClick={handleSubmit} disabled={isPending || !nome.trim() || !precoVenda}
            className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-black rounded-xl flex items-center justify-center gap-2 text-sm shadow-lg shadow-emerald-600/20">
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

// ─── Delete Confirm ───────────────────────────────────────────────────────────
function DeleteConfirm({ product, onClose, onDeleted }: { product: ProdutoSettings; onClose: () => void; onDeleted: () => void }) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      await excluirProduto(product.id);
      onDeleted();
      onClose();
    });
  };

  const content = (
    <div className="fixed inset-0 z-[9100] flex items-center justify-center p-4" style={{ isolation: "isolate" }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative dash-card rounded-3xl p-6 max-w-sm w-full shadow-2xl z-10">
        <div className="w-12 h-12 bg-rose-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Trash2 size={22} className="text-rose-400" />
        </div>
        <h3 className="dash-title font-black text-center text-lg mb-2">Excluir produto?</h3>
        <p className="dash-subtitle text-sm text-center mb-5">
          <strong className="dash-value">"{product.nome}"</strong> será removido permanentemente.
          Isso não pode ser desfeito.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 h-11 dash-nav-btn font-bold rounded-xl">Cancelar</button>
          <button onClick={handleDelete} disabled={isPending}
            className="flex-1 h-11 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-black rounded-xl flex items-center justify-center gap-2 text-sm">
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

  const criticos  = produtos.filter((p) => p.gerenciarEstoque && p.estoqueAtual > 0 && p.estoqueAtual <= p.estoqueMinimo).length;
  const esgotados = produtos.filter((p) => p.gerenciarEstoque && p.estoqueAtual <= 0).length;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="dash-card rounded-2xl p-4"><p className="dash-label text-xs font-bold uppercase tracking-wider mb-1">Total</p><p className="dash-title text-2xl font-black">{produtos.length}</p></div>
        <div className="dash-card rounded-2xl p-4"><p className="dash-label text-xs font-bold uppercase tracking-wider mb-1">Críticos</p><p className={`text-2xl font-black ${criticos > 0 ? "text-amber-400" : "dash-title"}`}>{criticos}</p></div>
        <div className="dash-card rounded-2xl p-4"><p className="dash-label text-xs font-bold uppercase tracking-wider mb-1">Esgotados</p><p className={`text-2xl font-black ${esgotados > 0 ? "text-rose-400" : "dash-title"}`}>{esgotados}</p></div>
        <div className="dash-card rounded-2xl p-4"><p className="dash-label text-xs font-bold uppercase tracking-wider mb-1">Gerenciados</p><p className="dash-title text-2xl font-black">{produtos.filter((p) => p.gerenciarEstoque).length}</p></div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Filtrar por nome ou categoria..."
          className="dash-input flex-1 py-2.5 px-4 rounded-xl text-sm font-medium outline-none" />
        <button onClick={() => setModalProduct("new")}
          className="h-10 px-5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl flex items-center gap-2 shrink-0 shadow-lg shadow-emerald-600/20 transition-all">
          <Plus size={16} /> Adicionar
        </button>
      </div>

      {/* Table */}
      <div className="dash-card rounded-3xl overflow-hidden">
        <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden">
        <div className="min-w-[640px]">
        {/* Header row */}
        <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto_auto] gap-3 px-5 py-3 border-b dash-border">
          <p className="dash-label text-[10px] font-bold uppercase tracking-wider">Produto</p>
          <p className="dash-label text-[10px] font-bold uppercase tracking-wider text-center w-16">Estoque</p>
          <p className="dash-label text-[10px] font-bold uppercase tracking-wider text-center w-16">Mín.</p>
          <p className="dash-label text-[10px] font-bold uppercase tracking-wider text-center w-20">Status</p>
          <p className="dash-label text-[10px] font-bold uppercase tracking-wider text-center w-16">Gerenciar</p>
          <p className="dash-label text-[10px] font-bold uppercase tracking-wider text-center w-7">+</p>
          <p className="dash-label text-[10px] font-bold uppercase tracking-wider text-center w-16">Ações</p>
        </div>

        {loading ? (
          <div>{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-12 border-b dash-border animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Package size={36} className="dash-label mb-3" />
            <p className="dash-subtitle font-semibold text-sm">{search ? "Nenhum resultado." : "Nenhum produto. Clique em Adicionar."}</p>
          </div>
        ) : (
          <div>
            {filtered.map((p) => (
              <div key={p.id}>
                <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto_auto] gap-3 items-center px-5 py-3 border-b dash-border dash-row-hover transition-colors last:border-0">
                  <div className="min-w-0">
                    <p className="dash-value font-semibold text-sm truncate">{p.nome}</p>
                    <p className="dash-subtitle text-xs">{p.categoria} · {fmtBRL(p.precoCentavos)}</p>
                  </div>
                  <EditableNumber value={p.estoqueAtual} onSave={(v) => handleInlineUpdate(p.id, { estoqueAtual: v })} />
                  <EditableNumber value={p.estoqueMinimo} onSave={(v) => handleInlineUpdate(p.id, { estoqueMinimo: v })} />
                  <div className="w-20 flex justify-center">
                    <StockBadge atual={p.estoqueAtual} minimo={p.estoqueMinimo} gerenciar={p.gerenciarEstoque} />
                  </div>
                  <button onClick={() => handleInlineUpdate(p.id, { gerenciarEstoque: !p.gerenciarEstoque })}
                    className={`w-16 flex items-center justify-center transition-colors ${p.gerenciarEstoque ? "text-emerald-400" : "dash-subtitle"}`}>
                    {p.gerenciarEstoque ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                  </button>
                  {/* Entrada rápida */}
                  <button onClick={() => setSelectedId(selectedId === p.id ? null : p.id)}
                    className="w-7 h-7 dash-action-btn rounded-lg flex items-center justify-center hover:text-emerald-400 transition-colors">
                    <PlusCircle size={15} />
                  </button>
                  {/* Edit + Delete */}
                  <div className="w-16 flex items-center justify-center gap-1">
                    <button onClick={() => setModalProduct(p)}
                      className="w-7 h-7 dash-action-btn rounded-lg flex items-center justify-center hover:text-emerald-400 transition-colors">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => setDeleteTarget(p)}
                      className="w-7 h-7 dash-action-btn-danger rounded-lg flex items-center justify-center transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Entrada inline panel */}
                {selectedId === p.id && (
                  <div className="bg-emerald-500/5 border-b dash-border px-5 py-3 flex items-center gap-3 flex-wrap">
                    <p className="dash-subtitle text-xs font-bold uppercase shrink-0">Entrada:</p>
                    <input type="number" min={1} value={entradaQtd} onChange={(e) => setEntradaQtd(Math.max(1, parseInt(e.target.value) || 1))}
                      className="dash-input w-20 py-1.5 px-3 rounded-lg text-sm font-bold outline-none" />
                    <input value={entradaMotivo} onChange={(e) => setEntradaMotivo(e.target.value)} placeholder="Motivo (opcional)"
                      className="dash-input flex-1 min-w-[140px] py-1.5 px-3 rounded-lg text-sm outline-none" />
                    <button onClick={() => handleEntrada(p.id)} disabled={isPending}
                      className="h-8 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-lg flex items-center gap-1.5">
                      {isPending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} OK
                    </button>
                    <button onClick={() => setSelectedId(null)} className="w-8 h-8 dash-action-btn rounded-lg flex items-center justify-center"><X size={12} /></button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        </div>{/* min-w */}
        </div>{/* overflow-x-auto */}
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl shadow-2xl border flex items-center gap-3 font-bold text-sm
          ${toast.ok ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-rose-500/10 border-rose-500/20 text-rose-400"}`}>
          {toast.ok ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}{toast.msg}
        </div>
      )}

      {/* Modals */}
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
  const [mesas, setMesas]             = useState<MesaRow[]>([]);
  const [loading, setLoading]         = useState(true);
  const [isPending, startTransition]  = useTransition();
  const [batchQtd, setBatchQtd]       = useState(10);
  const [batchPrefix, setBatchPrefix] = useState("Mesa");
  const [batchError, setBatchError]   = useState("");
  const [editingId, setEditingId]     = useState<string | null>(null);
  const [editingNome, setEditingNome] = useState("");
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);

  const reload = useCallback(() => {
    setLoading(true);
    getMesas().then((d) => { setMesas(d); setLoading(false); });
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const handleGenerate = () => {
    setBatchError("");
    if (batchQtd < 1 || batchQtd > 200) { setBatchError("Entre 1 e 200."); return; }
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
    startTransition(async () => {
      await updateMesa(id, editingNome.trim());
      setEditingId(null);
      reload();
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => { await deleteMesa(id); reload(); });
  };

  const handleDeleteAll = () => {
    startTransition(async () => { await deleteTodasMesas(); setConfirmDeleteAll(false); reload(); });
  };

  const ativas   = mesas.filter((m) => m.ativa).length;
  const inativas = mesas.filter((m) => !m.ativa).length;

  return (
    <div className="space-y-4">
      <div className="dash-card rounded-3xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 dash-icon-accent rounded-xl flex items-center justify-center"><Zap size={15} className="dash-icon-accent-fg" /></div>
          <div>
            <h3 className="dash-title font-bold text-sm">Gerar em Lote</h3>
            <p className="dash-subtitle text-xs">Crie várias mesas com numeração automática.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1.5">
            <label className="dash-label text-xs font-bold uppercase">Prefixo</label>
            <input value={batchPrefix} onChange={(e) => setBatchPrefix(e.target.value)} placeholder="Mesa, Balcão..." className="dash-input py-2 px-3 rounded-xl text-sm font-semibold w-36 outline-none" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="dash-label text-xs font-bold uppercase">Quantidade</label>
            <input type="number" min={1} max={200} value={batchQtd} onChange={(e) => setBatchQtd(Number(e.target.value))} className="dash-input py-2 px-3 rounded-xl text-sm font-semibold w-24 outline-none" />
          </div>
          <button onClick={handleGenerate} disabled={isPending} className="h-9 px-5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-sm rounded-xl flex items-center gap-1.5 shrink-0">
            {isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Gerar
          </button>
          {batchError && <p className="text-rose-500 text-xs font-semibold flex items-center gap-1"><AlertTriangle size={11} />{batchError}</p>}
        </div>
      </div>

      <div className="dash-card rounded-3xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="dash-title font-bold">{mesas.length} mesa{mesas.length !== 1 ? "s" : ""}</h3>
          <div className="flex items-center gap-2">
            <span className="dash-badge-active text-xs font-bold px-2.5 py-1 rounded-full">{ativas} ativas</span>
            <span className="dash-badge text-xs font-bold px-2.5 py-1 rounded-full">{inativas} inativas</span>
            {mesas.length > 0 && (
              <button onClick={() => setConfirmDeleteAll(true)} className="text-xs font-bold text-rose-500 hover:text-rose-400 flex items-center gap-1 ml-2">
                <Trash2 size={11} /> Apagar todas
              </button>
            )}
          </div>
        </div>
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-12 dash-card rounded-xl animate-pulse" />)}
          </div>
        ) : mesas.length === 0 ? (
          <div className="dash-empty flex items-center justify-center h-24 rounded-2xl border-2 border-dashed">
            <p className="dash-subtitle text-sm font-semibold">Use o wizard para gerar mesas.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {mesas.map((m) => (
              <div key={m.id} className={`relative group flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all ${m.ativa ? "dash-mesa-ativa" : "dash-mesa-inativa"}`}>
                {editingId === m.id ? (
                  <div className="flex w-full gap-1.5 items-center">
                    <input
                      autoFocus
                      value={editingNome}
                      onChange={(e) => setEditingNome(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveEdit(m.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      className="dash-input flex-1 min-w-0 text-sm font-semibold rounded-lg px-2 py-1 outline-none"
                    />
                    <button onClick={() => handleSaveEdit(m.id)} className="w-6 h-6 bg-emerald-500/20 text-emerald-400 rounded-md flex items-center justify-center shrink-0"><Check size={11} /></button>
                    <button onClick={() => setEditingId(null)} className="w-6 h-6 dash-row-hover rounded-md flex items-center justify-center shrink-0"><X size={11} /></button>
                  </div>
                ) : (
                  <>
                    <span className="dash-value font-semibold text-sm truncate">{m.nome}</span>
                    <div className="flex items-center gap-0.5">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                        <button
                          onClick={() => { setEditingId(m.id); setEditingNome(m.nome); }}
                          className="w-5 h-5 dash-action-btn rounded flex items-center justify-center hover:text-emerald-400"
                        ><Pencil size={9} /></button>
                        <button
                          onClick={() => handleDelete(m.id)}
                          className="w-5 h-5 dash-action-btn-danger rounded flex items-center justify-center"
                        ><Trash2 size={9} /></button>
                      </div>
                      <button onClick={() => handleToggle(m.id, m.ativa)} className="ml-0.5">
                        {m.ativa ? <ToggleRight size={16} className="text-emerald-400 shrink-0" /> : <ToggleLeft size={16} className="dash-subtitle shrink-0" />}
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {confirmDeleteAll && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9200] flex items-center justify-center p-4">
          <div className="dash-card rounded-3xl p-6 max-w-sm w-full shadow-2xl">
            <div className="w-12 h-12 bg-rose-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4"><AlertTriangle size={22} className="text-rose-500" /></div>
            <h3 className="dash-title font-black text-center text-lg mb-2">Apagar todas as mesas?</h3>
            <p className="dash-subtitle text-sm text-center mb-5">Remove permanentemente todas as <strong className="dash-value">{mesas.length} mesas</strong>.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteAll(false)} className="flex-1 h-11 dash-nav-btn font-bold rounded-xl">Cancelar</button>
              <button onClick={handleDeleteAll} disabled={isPending} className="flex-1 h-11 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-black rounded-xl flex items-center justify-center gap-2">
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
  const [nomeLoja, setNomeLoja]        = useState("");
  const [draft, setDraft]             = useState("");
  const [isPending, startTransition]  = useTransition();
  const [saved, setSaved]             = useState(false);

  useEffect(() => { getNomeLoja().then((n) => { setNomeLoja(n); setDraft(n); }); }, []);

  const handleSave = () => {
    if (draft === nomeLoja || !draft.trim()) return;
    startTransition(async () => {
      const res = await updateNomeLoja(draft);
      if ("ok" in res) { setNomeLoja(draft); setSaved(true); setTimeout(() => setSaved(false), 2500); }
    });
  };

  return (
    <div className="dash-card rounded-3xl p-6 max-w-lg">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-8 h-8 dash-icon-accent rounded-xl flex items-center justify-center"><Store size={15} className="dash-icon-accent-fg" /></div>
        <h3 className="dash-title font-bold">Informações da Loja</h3>
      </div>
      <div className="space-y-4">
        <div>
          <label className="dash-label text-xs font-bold uppercase tracking-wider block mb-1.5">Nome da Loja</label>
          <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
            placeholder="Nome do seu estabelecimento" className="dash-input w-full py-2.5 px-4 rounded-xl text-sm font-semibold outline-none" />
        </div>
        <button onClick={handleSave} disabled={isPending || draft === nomeLoja || !draft.trim()}
          className="h-10 px-6 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold text-sm rounded-xl flex items-center gap-2 transition-all">
          {isPending ? <Loader2 size={15} className="animate-spin" /> : saved ? <CheckCircle2 size={15} /> : <Check size={15} />}
          {saved ? "Salvo!" : "Salvar"}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════════════════════════
const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "estoque", label: "Estoque",          icon: Package         },
  { id: "mesas",   label: "Mesas & Comandas", icon: TableProperties },
  { id: "geral",   label: "Geral",            icon: Store           },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("estoque");

  return (
    <div className="dash-page p-4 md:p-8 pb-16 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 dash-nav-dark rounded-2xl flex items-center justify-center">
          <Settings size={20} />
        </div>
        <div>
          <h1 className="dash-title text-2xl font-black tracking-tight">Configurações</h1>
          <p className="dash-subtitle font-medium text-sm">Gerencie estoque, mesas e preferências do sistema.</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 dash-card rounded-2xl mb-6 overflow-x-auto scrollbar-hide">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
              activeTab === id ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20" : "dash-subtitle hover:dash-value"
            }`}>
            <Icon size={15} />{label}
          </button>
        ))}
      </div>

      {activeTab === "estoque" && <EstoqueTab />}
      {activeTab === "mesas"   && <MesasTab />}
      {activeTab === "geral"   && <GeralTab />}
    </div>
  );
}

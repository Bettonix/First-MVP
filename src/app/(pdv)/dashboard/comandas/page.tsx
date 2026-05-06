"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  getMesasComComanda, abrirComanda, adicionarItemComanda,
  removerItemComanda, fecharComanda, cancelarComanda,
  type MesaComComanda, type ComandaComMesa, type ComandaItem,
} from "@/app/actions/comandas";
import { getProdutosPDV } from "@/app/actions/produtos";
import {
  ClipboardList, Plus, Loader2, X, Check, Trash2,
  ShoppingBag, Timer, ChevronRight, Search, ChevronLeft,
  Users, Banknote, QrCode, CreditCard, LayoutGrid,
} from "lucide-react";

// ─── Payment Methods ──────────────────────────────────────────────────────────
const PAYMENT_METHODS = [
  { value: 'DINHEIRO' as const, label: 'Dinheiro', icon: Banknote },
  { value: 'PIX'      as const, label: 'Pix',      icon: QrCode },
  { value: 'CARTAO'   as const, label: 'Cartão',   icon: CreditCard },
  { value: 'MISTO'    as const, label: 'Misto',    icon: LayoutGrid },
] as const;

type MetodoPagamento = typeof PAYMENT_METHODS[number]['value'];
import { fmtBRL } from "@/lib/currency";

// ─── Utilities ────────────────────────────────────────────────────────────────
function tempoAberta(isoString: string): string {
  const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 60000);
  if (diff < 1) return "Agora";
  if (diff < 60) return `Há ${diff} min`;
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return m > 0 ? `Há ${h}h ${m}min` : `Há ${h}h`;
}

// ─── Mesa Card ────────────────────────────────────────────────────────────────
function MesaCard({ mesa, onClick }: { mesa: MesaComComanda; onClick: () => void }) {
  const count = mesa.comandas.length;
  const ocupada = count > 0;
  const totalGeral = mesa.comandas.reduce((acc, c) => acc + c.totalCentavos, 0);
  const oldest = mesa.comandas[0];

  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center justify-center text-center p-5 rounded-2xl border transition-all duration-200 cursor-pointer select-none
        hover:scale-[1.03] hover:shadow-lg group
        ${ocupada
          ? "bg-[var(--brasa-light)] border-[var(--brasa-border)] shadow-[inset_0_0_0_1.5px_var(--brasa-border)]"
          : "dash-card hover:border-[var(--brasa-border)]"
        }`}
    >
      {/* Status dot */}
      <div className={`w-2.5 h-2.5 rounded-full mb-3 transition-colors ${ocupada ? "bg-[var(--brasa)] shadow-[0_0_8px_rgba(211,84,0,0.5)]" : "bg-[var(--border-strong)]"}`} />

      <p className={`font-black text-base leading-tight mb-1 ${ocupada ? "dash-highlight-text" : "dash-value"}`}>
        {mesa.nome}
      </p>

      {ocupada ? (
        <>
          <p className="dash-highlight-text font-black text-lg tabular-nums">
            {fmtBRL(totalGeral)}
          </p>
          {count > 1 ? (
            <p className="dash-highlight-text text-xs font-black mt-1 flex items-center gap-1">
              <Users size={10} /> {count} comandas
            </p>
          ) : oldest ? (
            <p className="dash-highlight-text opacity-80 text-xs font-semibold mt-1 flex items-center gap-1">
              <Timer size={10} /> {tempoAberta(oldest.abertaEm)}
            </p>
          ) : null}
          <p className="dash-highlight-text opacity-60 text-[10px] mt-1">
            {mesa.comandas.reduce((a, c) => a + c.itens.length, 0)} itens
          </p>
        </>
      ) : (
        <p className="dash-subtitle text-xs font-semibold mt-1">Livre</p>
      )}

      <div className={`absolute right-2.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity ${ocupada ? "dash-highlight-text" : "dash-subtitle"}`}>
        <ChevronRight size={16} />
      </div>
    </button>
  );
}

// ─── Comanda Sheet ─────────────────────────────────────────────────────────────
interface ComandaSheetProps {
  mesa: MesaComComanda;
  onClose: () => void;
  onRefresh: () => void;
}

function ComandaSheet({ mesa, onClose, onRefresh }: ComandaSheetProps) {
  const [isPending, startTransition] = useTransition();
  const [produtos, setProdutos] = useState<Array<{ id: string; nome: string; precoCentavos: number; categoria: string }>>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [confirmFechar, setConfirmFechar] = useState(false);
  const [metodoPagamento, setMetodoPagamento] = useState<MetodoPagamento | null>(null);
  const [novaComandaNome, setNovaComandaNome] = useState("");
  const [criandoNova, setCriandoNova] = useState(false);

  // State machine: 'list' | 'detail' | 'empty' | 'nova'
  const [view, setView] = useState<"list" | "detail" | "empty" | "nova">(() => {
    if (mesa.comandas.length === 0) return "empty";
    if (mesa.comandas.length === 1) return "detail";
    return "list";
  });
  const [selectedComanda, setSelectedComanda] = useState<ComandaComMesa | null>(
    mesa.comandas.length === 1 ? mesa.comandas[0] : null
  );

  // Sync state when mesa refreshes
  useEffect(() => {
    if (mesa.comandas.length === 0) {
      setView("empty");
      setSelectedComanda(null);
    } else if (selectedComanda) {
      const updated = mesa.comandas.find((c) => c.id === selectedComanda.id);
      if (updated) {
        setSelectedComanda(updated);
      } else {
        // comanda was closed; go back
        if (mesa.comandas.length === 0) { setView("empty"); setSelectedComanda(null); }
        else if (mesa.comandas.length === 1) { setView("detail"); setSelectedComanda(mesa.comandas[0]); }
        else { setView("list"); setSelectedComanda(null); }
      }
    }
  }, [mesa.comandas]);

  useEffect(() => {
    getProdutosPDV().then((ps) =>
      setProdutos(ps.map((p) => ({ id: p.id.toString(), nome: p.nome, precoCentavos: p.precoCentavos, categoria: p.categoria })))
    );
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (view === "detail" && mesa.comandas.length > 1) { setView("list"); setSelectedComanda(null); }
        else if (view === "nova") { setView(mesa.comandas.length > 0 ? "list" : "empty"); }
        else onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, view, mesa.comandas.length]);

  const handleAbrir = (name?: string) => {
    setError("");
    setCriandoNova(true);
    startTransition(async () => {
      const result = await abrirComanda(mesa.id, name);
      setCriandoNova(false);
      if ("error" in result) { setError(result.error); return; }

      // Set selectedComanda immediately with stub data so detail view renders.
      // The useEffect on mesa.comandas will replace this with the persisted record once onRefresh completes.
      const stub: ComandaComMesa = {
        id: result.id,
        mesaId: mesa.id,
        mesaNome: mesa.nome,
        name: name?.trim() || null,
        status: "ABERTA",
        totalCentavos: 0,
        itens: [],
        abertaEm: new Date().toISOString(),
        fechadaEm: null,
      };
      setSelectedComanda(stub);
      setView("detail");
      setNovaComandaNome("");
      onRefresh();
    });
  };

  const handleSelectComanda = (comanda: ComandaComMesa) => {
    setSelectedComanda(comanda);
    setView("detail");
  };

  const handleAddItem = (produto: { nome: string; precoCentavos: number }) => {
    if (!selectedComanda) return;
    startTransition(async () => {
      await adicionarItemComanda(selectedComanda.id, { nome: produto.nome, quantidade: 1, precoCentavos: produto.precoCentavos });
      onRefresh();
    });
  };

  const handleRemoverItem = (itemNome: string) => {
    if (!selectedComanda) return;
    startTransition(async () => {
      await removerItemComanda(selectedComanda.id, itemNome);
      onRefresh();
    });
  };

  const handleFechar = () => {
    if (!selectedComanda) return;
    startTransition(async () => {
      await fecharComanda(selectedComanda.id);
      onRefresh();
      if (mesa.comandas.length <= 1) onClose();
      else { setView("list"); setSelectedComanda(null); }
    });
  };

  const handleCancelar = () => {
    if (!selectedComanda) return;
    startTransition(async () => {
      await cancelarComanda(selectedComanda.id);
      onRefresh();
      if (mesa.comandas.length <= 1) onClose();
      else { setView("list"); setSelectedComanda(null); }
    });
  };

  const produtosFiltrados = produtos.filter((p) =>
    p.nome.toLowerCase().includes(search.toLowerCase())
  );

  const content = (
    <div className="fixed inset-0 z-[9000]" style={{ isolation: "isolate" }}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="absolute right-0 top-0 h-full w-full max-w-[480px] dash-card border-l dash-border flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b dash-border shrink-0">
          <div className="flex items-center gap-3">
            {(view === "detail" && mesa.comandas.length > 1) || view === "nova" ? (
              <button
                onClick={() => { setView("list"); setSelectedComanda(null); }}
                className="w-8 h-8 dash-nav-btn rounded-lg flex items-center justify-center"
              >
                <ChevronLeft size={16} />
              </button>
            ) : null}
            <div>
              <h2 className="dash-title font-black text-lg">{mesa.nome}</h2>
              <p className={`text-xs font-bold ${mesa.comandas.length > 0 ? "dash-highlight-text" : "dash-subtitle"}`}>
                {view === "detail" && selectedComanda
                  ? `${selectedComanda.name ?? "Comanda"} · ${tempoAberta(selectedComanda.abertaEm)}`
                  : mesa.comandas.length > 0
                  ? `${mesa.comandas.length} comanda${mesa.comandas.length !== 1 ? "s" : ""} ativa${mesa.comandas.length !== 1 ? "s" : ""}`
                  : "Mesa livre"}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 dash-nav-btn rounded-xl flex items-center justify-center transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* ── VIEW: EMPTY ── */}
        {view === "empty" && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6">
            <div className="w-16 h-16 dash-icon-accent rounded-2xl flex items-center justify-center">
              <ClipboardList size={28} className="dash-icon-accent-fg" />
            </div>
            <div className="text-center">
              <p className="dash-title font-black text-lg">Mesa livre</p>
              <p className="dash-subtitle text-sm mt-1">Abra uma comanda para registrar os pedidos.</p>
            </div>
            {error && <p className="text-rose-500 text-xs font-semibold">{error}</p>}
            <button
              onClick={() => handleAbrir()}
              disabled={isPending}
              className="h-12 px-8 bg-[var(--brasa)] hover:bg-[var(--brasa-hover)] disabled:opacity-50 text-white font-black rounded-2xl flex items-center gap-2 transition-all "
            >
              {isPending ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
              Abrir Comanda
            </button>
          </div>
        )}

        {/* ── VIEW: LIST (multiple comandas) ── */}
        {view === "list" && (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto p-6 space-y-2">
              <p className="dash-label text-[10px] font-black uppercase tracking-wider mb-3">Comandas Ativas</p>
              {mesa.comandas.map((comanda) => (
                <button
                  key={comanda.id}
                  onClick={() => handleSelectComanda(comanda)}
                  className="w-full dash-row-hover flex items-center justify-between p-4 rounded-xl text-left transition-colors group"
                >
                  <div>
                    <p className="dash-value font-bold text-sm">
                      {comanda.name ?? `Comanda #${comanda.id.slice(-4)}`}
                    </p>
                    <p className="dash-subtitle text-xs flex items-center gap-1 mt-0.5">
                      <Timer size={10} /> {tempoAberta(comanda.abertaEm)}
                      · {comanda.itens.length} {comanda.itens.length === 1 ? "item" : "itens"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="dash-highlight-text font-black tabular-nums">{fmtBRL(comanda.totalCentavos)}</p>
                    <ChevronRight size={16} className="dash-subtitle group-hover:dash-highlight-text transition-colors" />
                  </div>
                </button>
              ))}
            </div>
            <div className="p-6 border-t dash-border shrink-0 space-y-2">
              {error && <p className="text-rose-500 text-xs font-semibold">{error}</p>}
              <button
                onClick={() => setView("nova")}
                className="w-full h-11 bg-[var(--brasa-light)] hover:bg-[rgba(211,84,0,0.12)] border border-[var(--brasa-border)] dash-highlight-text font-black rounded-xl flex items-center justify-center gap-2 text-sm transition-all"
              >
                <Plus size={15} /> Nova Comanda
              </button>
            </div>
          </div>
        )}

        {/* ── VIEW: NOVA COMANDA ── */}
        {view === "nova" && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6">
            <div className="w-16 h-16 dash-icon-accent rounded-2xl flex items-center justify-center">
              <Plus size={28} className="dash-icon-accent-fg" />
            </div>
            <div className="text-center">
              <p className="dash-title font-black text-lg">Nova Comanda</p>
              <p className="dash-subtitle text-sm mt-1">Nome opcional para identificar (ex: "João").</p>
            </div>
            <input
              autoFocus
              value={novaComandaNome}
              onChange={(e) => setNovaComandaNome(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAbrir(novaComandaNome || undefined); }}
              placeholder="Nome do cliente (opcional)"
              className="dash-input w-full max-w-xs py-3 px-4 rounded-xl text-sm font-semibold outline-none text-center"
            />
            {error && <p className="text-rose-500 text-xs font-semibold">{error}</p>}
            <div className="flex gap-3 w-full max-w-xs">
              <button onClick={() => setView("list")} className="flex-1 h-11 dash-nav-btn font-bold rounded-xl text-sm">Voltar</button>
              <button
                onClick={() => handleAbrir(novaComandaNome || undefined)}
                disabled={criandoNova}
                className="flex-1 h-11 bg-[var(--brasa)] hover:bg-[var(--brasa-hover)] disabled:opacity-50 text-white font-black rounded-xl flex items-center justify-center gap-2 text-sm "
              >
                {criandoNova ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                Abrir
              </button>
            </div>
          </div>
        )}

        {/* ── VIEW: DETAIL (single comanda) ── */}
        {view === "detail" && selectedComanda && (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto p-6 space-y-2">
              <div className="flex items-center justify-between mb-3">
                <p className="dash-label text-xs font-bold uppercase tracking-wider">Itens ({selectedComanda.itens.length})</p>
                <p className="dash-highlight-text font-black tabular-nums">{fmtBRL(selectedComanda.totalCentavos)}</p>
              </div>

              {selectedComanda.itens.length === 0 ? (
                <div className="dash-empty rounded-xl flex flex-col items-center justify-center h-24 border border-dashed">
                  <p className="dash-subtitle text-xs font-semibold">Nenhum item adicionado</p>
                </div>
              ) : (
                selectedComanda.itens.map((item: ComandaItem) => (
                  <div key={item.nome} className="dash-row-hover flex items-center gap-3 p-3 rounded-xl group transition-colors">
                    <div className="w-8 h-8 dash-icon-surface rounded-lg flex items-center justify-center shrink-0">
                      <ShoppingBag size={14} className="dash-label" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="dash-value font-semibold text-sm truncate">{item.nome}</p>
                      <p className="dash-subtitle text-xs">{item.quantidade}× {fmtBRL(item.precoCentavos)}</p>
                    </div>
                    <p className="dash-value font-bold text-sm tabular-nums shrink-0">
                      {fmtBRL(item.precoCentavos * item.quantidade)}
                    </p>
                    <button
                      onClick={() => handleRemoverItem(item.nome)}
                      className="w-7 h-7 dash-action-btn-danger rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shrink-0"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))
              )}

              {/* Adicionar à conta */}
              <div className="pt-3">
                <p className="dash-label text-[10px] font-black uppercase tracking-wider mb-2">Adicionar à Conta</p>
                <div className="relative mb-2">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 dash-subtitle" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar produto para adicionar..."
                    className="dash-input w-full pl-9 pr-4 py-2 rounded-xl text-sm font-medium outline-none"
                  />
                </div>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {produtosFiltrados.slice(0, 20).map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleAddItem(p)}
                      disabled={isPending}
                      className="w-full dash-row-hover flex items-center justify-between p-2.5 rounded-xl text-left transition-colors group disabled:opacity-50"
                    >
                      <span className="dash-value text-sm font-semibold truncate">{p.nome}</span>
                      <span className="text-xs font-bold flex items-center gap-1.5 shrink-0">
                        <span className="dash-subtitle">{fmtBRL(p.precoCentavos)}</span>
                        <span className="flex items-center gap-0.5 dash-highlight-text bg-[var(--brasa-light)] border border-[var(--brasa-border)] px-1.5 py-0.5 rounded-md text-[10px] font-black">
                          <Plus size={10} /> Enviar
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer actions */}
            <div className="px-6 pt-6 pb-[max(env(safe-area-inset-bottom),1.5rem)] border-t dash-border space-y-3 shrink-0">
              <div className="flex items-center justify-between">
                <p className="dash-subtitle text-sm font-bold">Total</p>
                <p className="dash-title text-2xl font-black tabular-nums">{fmtBRL(selectedComanda.totalCentavos)}</p>
              </div>

              {confirmFechar ? (
                <div className="space-y-3">
                  {/* Premium payment selector */}
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] dash-label text-center">Forma de Pagamento</p>
                  <div className="grid grid-cols-4 gap-2">
                    {PAYMENT_METHODS.map((m) => (
                      <button
                        key={m.value}
                        type="button"
                        onClick={() => setMetodoPagamento(m.value)}
                        className={`
                          flex flex-col items-center justify-center py-3 rounded-2xl border transition-all duration-200
                          ${metodoPagamento === m.value
                            ? 'border-[var(--brasa)] bg-[var(--brasa-light)] dash-highlight-text shadow-[0_5px_20px_rgba(211,84,0,0.15)] scale-[1.02]'
                            : 'dash-muted border dash-border dash-label opacity-60 hover:opacity-100'}
                        `}
                      >
                        <m.icon size={18} />
                        <span className="text-[8px] font-black mt-1.5 uppercase tracking-[0.1em]">{m.label}</span>
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setConfirmFechar(false); setMetodoPagamento(null); }}
                      className="flex-1 h-11 dash-nav-btn font-bold rounded-xl text-sm"
                    >
                      Voltar
                    </button>
                    <button
                      onClick={handleFechar}
                      disabled={isPending || !metodoPagamento}
                      className="flex-1 h-11 bg-[var(--brasa)] hover:bg-[var(--brasa-hover)] disabled:opacity-40 text-white font-black rounded-xl flex items-center justify-center gap-2 text-sm "
                    >
                      {isPending ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                      {metodoPagamento ? `Receber · ${metodoPagamento}` : 'Selecione...'}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => { setSearch(""); onRefresh(); }}
                    disabled={isPending || selectedComanda.itens.length === 0}
                    className="w-full h-11 bg-[var(--brasa-light)] hover:bg-[rgba(211,84,0,0.12)] border border-[var(--brasa-border)] disabled:opacity-40 dash-highlight-text font-black rounded-xl flex items-center justify-center gap-2 text-sm transition-all"
                  >
                    {isPending ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                    Enviar para Preparo
                  </button>
                  <div className="flex gap-2">
                    <button onClick={handleCancelar} disabled={isPending} className="h-11 px-4 dash-action-btn-danger border rounded-xl font-bold text-sm flex items-center gap-1.5 transition-all">
                      <Trash2 size={15} /> Cancelar
                    </button>
                    <button
                      onClick={() => { setConfirmFechar(true); setMetodoPagamento(null); }}
                      disabled={isPending}
                      className="flex-1 h-11 bg-[var(--brasa)] hover:bg-[var(--brasa-hover)] disabled:opacity-50 text-white font-black rounded-xl flex items-center justify-center gap-2 text-sm "
                    >
                      <Check size={16} /> Fechar Conta
                    </button>
                  </div>
                </>
              )}

              {/* Nova Comanda link when in detail view */}
              {!confirmFechar && mesa.comandas.length >= 1 && (
                <button
                  onClick={() => setView("nova")}
                  className="w-full text-xs font-bold dash-subtitle hover:dash-highlight-text flex items-center justify-center gap-1 transition-colors py-1"
                >
                  <Plus size={11} /> Abrir outra comanda nesta mesa
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(content, document.body);
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ComandasPage() {
  const [mesas, setMesas] = useState<MesaComComanda[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<MesaComComanda | null>(null);

  const reload = useCallback(async () => {
    const data = await getMesasComComanda();
    setMesas(data);
    setLoading(false);
    if (selected) {
      const updated = data.find((m) => m.id === selected.id);
      setSelected(updated ?? null);
    }
  }, [selected]);

  useEffect(() => { reload(); }, []);

  const handleRefresh = async () => {
    const data = await getMesasComComanda();
    setMesas(data);
    if (selected) {
      const updated = data.find((m) => m.id === selected.id);
      setSelected(updated ?? null);
    }
  };

  const livres   = mesas.filter((m) => m.comandas.length === 0).length;
  const ocupadas = mesas.filter((m) => m.comandas.length > 0).length;

  return (
    <div className="dash-page p-4 md:p-8 pb-16 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 dash-nav-dark rounded-2xl flex items-center justify-center">
            <ClipboardList size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight bg-clip-text text-transparent"
              style={{ backgroundImage: "linear-gradient(135deg, #1c1917 0%, #57534e 100%)" }}>
              Comandas
            </h1>
            <p className="dash-subtitle font-medium text-sm">Visão em tempo real das mesas e pedidos.</p>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <span className="dash-badge-active text-xs font-bold px-3 py-1.5 rounded-full">{ocupadas} ocupadas</span>
          <span className="dash-badge text-xs font-bold px-3 py-1.5 rounded-full">{livres} livres</span>
          <button
            onClick={() => { setLoading(true); reload(); }}
            className="h-8 w-8 dash-nav-btn rounded-xl flex items-center justify-center transition-colors"
          >
            <Loader2 size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Grid de mesas */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-36 dash-card rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : mesas.length === 0 ? (
        <div className="dash-empty flex flex-col items-center justify-center h-64 rounded-3xl border-2 border-dashed">
          <ClipboardList size={48} className="dash-label mb-4" />
          <p className="dash-title font-bold text-lg">Nenhuma mesa configurada</p>
          <p className="dash-subtitle text-sm mt-1">Acesse <strong>Configurações → Mesas</strong> para cadastrar mesas.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {mesas.map((mesa) => (
            <MesaCard key={mesa.id} mesa={mesa} onClick={() => setSelected(mesa)} />
          ))}
        </div>
      )}

      {/* Sheet */}
      {selected && (
        <ComandaSheet
          mesa={selected}
          onClose={() => setSelected(null)}
          onRefresh={handleRefresh}
        />
      )}
    </div>
  );
}

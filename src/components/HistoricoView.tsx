"use client";

import { useState, useTransition, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, X, ChevronRight, QrCode, Banknote, CreditCard,
  ShoppingBag, ClipboardList, SlidersHorizontal,
  Clock, Receipt, Hash, TableProperties,
  CheckCircle2, ChevronDown, RotateCcw, Printer,
} from "lucide-react";
import type { HistoricoResult, VendaHistorico, ComandaHistorico } from "@/app/actions/historico";
import { getHistoricoCompleto, estornarVenda } from "@/app/actions/historico";
import { PinAuthModal } from "@/components/PinAuthModal";
import { ReceiptModal, type ReceiptData } from "@/components/Receipt";
import type { UserRole } from "@/lib/auth";

// ─── Main Component ───────────────────────────────────────────────────────────
export function HistoricoView({ initialData, initialFilters, userRole, nomeLoja = "", instagramUrl = "" }: HistoricoViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [data, setData] = useState<HistoricoResult>(initialData);
  const [selectedVenda, setSelectedVenda] = useState<VendaHistorico | null>(null);
  const [selectedComanda, setSelectedComanda] = useState<ComandaHistorico | null>(null);
  const [showMobileDetail, setShowMobileDetail] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [pinAuthPending, setPinAuthPending] = useState<(() => void) | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const pushFilters = useCallback((next: Partial<Filters>) => {
    const merged = { ...filters, ...next };
    setFilters(merged);
    const params = new URLSearchParams();
    if (merged.date)   params.set("date",   merged.date);
    if (merged.metodo && merged.metodo !== "all") params.set("metodo", merged.metodo);
    if (merged.busca)  params.set("busca",  merged.busca);
    if (merged.tab)    params.set("tab",    merged.tab);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });

    startTransition(async () => {
      const result = await getHistoricoCompleto({
        date: merged.date,
        metodo: merged.metodo !== "all" ? merged.metodo : undefined,
        busca: merged.busca || undefined,
      });
      setData(result);
      setSelectedVenda(null);
      setSelectedComanda(null);
    });
  }, [filters, pathname, router]);

  const selectVenda = (v: VendaHistorico) => {
    setSelectedVenda(v);
    setSelectedComanda(null);
    setShowMobileDetail(true);
  };

  const selectComanda = (c: ComandaHistorico) => {
    setSelectedComanda(c);
    setSelectedVenda(null);
    setShowMobileDetail(true);
  };

  const closeDetail = () => {
    setSelectedVenda(null);
    setSelectedComanda(null);
    setShowMobileDetail(false);
  };

  const activeList = filters.tab === "vendas" ? data.vendas : data.comandas;
  const hasDetail = selectedVenda !== null || selectedComanda !== null;

  const METODOS: { id: Metodo; label: string }[] = [
    { id: "all",      label: "Todos"    },
    { id: "PIX",      label: "PIX"      },
    { id: "DINHEIRO", label: "Dinheiro" },
    { id: "MISTO",    label: "Misto"    },
  ];

  return (
    <div className="h-full flex flex-col bg-[var(--parchment)] overflow-hidden">

      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="shrink-0 px-5 pt-6 pb-4 border-b dash-border max-w-none">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight bg-clip-text text-transparent"
              style={{ backgroundImage: "linear-gradient(135deg, #1c1917 0%, #57534e 100%)" }}>
              Histórico
            </h1>
            <p className="text-xs dash-label font-semibold mt-0.5">
              {data.vendas.length + data.comandas.length} registros · {fmt(data.totalVendasCentavos + data.totalComandasCentavos)} total
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Date quick buttons */}
            <div className="hidden sm:flex items-center gap-1 dash-muted rounded-xl p-1">
              {[
                { label: "Hoje",   value: todayISO() },
                { label: "Ontem",  value: yesterdayISO() },
              ].map(({ label, value }) => (
                <button
                  key={value}
                  onClick={() => pushFilters({ date: value })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    filters.date === value
                      ? "dash-pill-active"
                      : "dash-label hover:dash-value"
                  }`}
                >
                  {label}
                </button>
              ))}
              <input
                type="date"
                value={filters.date}
                onChange={(e) => pushFilters({ date: e.target.value })}
                className="px-2 py-1.5 rounded-lg text-xs font-bold bg-transparent dash-label hover:dash-value transition-colors outline-none cursor-pointer [color-scheme:light]"
                aria-label="Selecionar data"
              />
            </div>
            <button
              onClick={() => setShowFilters((v) => !v)}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all border ${
                showFilters
                  ? "dash-pill-active"
                  : "dash-muted border-transparent dash-label hover:dash-value"
              }`}
              aria-label="Filtros"
            >
              <SlidersHorizontal size={16} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 dash-muted rounded-xl p-1 w-fit">
          {([
            { id: "vendas"   as Tab, label: "Pedidos Avulsos", icon: Receipt,       count: data.vendas.length },
            { id: "comandas" as Tab, label: "Comandas",        icon: ClipboardList, count: data.comandas.length },
          ]).map(({ id, label, icon: Icon, count }) => (
            <button
              key={id}
              onClick={() => pushFilters({ tab: id })}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                filters.tab === id
                  ? "dash-pill-active shadow-sm"
                  : "dash-label hover:dash-value"
              }`}
            >
              <Icon size={14} />
              <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden">{id === "vendas" ? "Avulsos" : "Comandas"}</span>
              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${
                filters.tab === id ? "dash-pill-active" : "dash-muted dash-subtitle"
              }`}>
                {count}
              </span>
            </button>
          ))}
        </div>

        {/* Expandable filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="pt-3 flex flex-wrap gap-2">
                {/* Mobile date */}
                <div className="sm:hidden flex items-center gap-1 dash-muted rounded-xl p-1">
                  {[
                    { label: "Hoje",  value: todayISO() },
                    { label: "Ontem", value: yesterdayISO() },
                  ].map(({ label, value }) => (
                    <button
                      key={value}
                      onClick={() => pushFilters({ date: value })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        filters.date === value ? "dash-pill-active" : "dash-label"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                  <input
                    type="date"
                    value={filters.date}
                    onChange={(e) => pushFilters({ date: e.target.value })}
                    className="px-2 py-1.5 rounded-lg text-xs font-bold bg-transparent dash-label outline-none cursor-pointer [color-scheme:light]"
                    aria-label="Selecionar data"
                  />
                </div>

                {/* Método chips */}
                <div className="flex items-center gap-1 dash-muted rounded-xl p-1">
                  {METODOS.map(({ id, label }) => (
                    <button
                      key={id}
                      onClick={() => pushFilters({ metodo: id })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        filters.metodo === id ? "dash-pill-active" : "dash-label hover:dash-value"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search */}
        <div className="relative mt-3">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 dash-label pointer-events-none" />
          <input
            ref={searchRef}
            type="text"
            value={filters.busca}
            onChange={(e) => pushFilters({ busca: e.target.value })}
            placeholder={filters.tab === "vendas" ? "Buscar por ID da venda…" : "Buscar por mesa ou cliente…"}
            className="w-full pl-9 pr-9 py-2.5 dash-input border dash-border rounded-xl text-sm dash-value placeholder:dash-subtitle outline-none focus:border-[var(--brasa)] focus:ring-1 focus:ring-[rgba(211,84,0,0.1)] transition-all"
          />
          {filters.busca && (
            <button
              onClick={() => pushFilters({ busca: "" })}
              className="absolute right-3 top-1/2 -translate-y-1/2 dash-label hover:dash-value transition-colors"
              aria-label="Limpar busca"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </header>

      {/* ── Body: Master-Detail ─────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* Master list */}
        <div className={`flex flex-col overflow-hidden transition-all duration-300 ${
          hasDetail ? "hidden lg:flex lg:w-[380px] xl:w-[420px] shrink-0" : "flex-1"
        }`}>
          {/* Summary bar */}
          <div className="shrink-0 px-4 py-2.5 border-b dash-border flex items-center justify-between">
            <span className="text-xs font-bold dash-label">
              {activeList.length} {activeList.length === 1 ? "registro" : "registros"}
            </span>
            <span className="text-xs font-black dash-highlight-text tabular-nums">
              {fmt(filters.tab === "vendas" ? data.totalVendasCentavos : data.totalComandasCentavos)}
            </span>
          </div>

          <div className={`flex-1 overflow-y-auto px-4 py-3 space-y-2 ${isPending ? "opacity-60 pointer-events-none" : ""}`}>
            {isPending && activeList.length === 0 ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={`skeleton-${i}`} className="h-[72px] dash-card-muted rounded-2xl animate-pulse" />
              ))
            ) : activeList.length === 0 ? (
              <EmptyState tab={filters.tab} />
            ) : filters.tab === "vendas" ? (
              data.vendas.map((v) => (
                <VendaCard
                  key={v.id}
                  venda={v}
                  selected={selectedVenda?.id === v.id}
                  onClick={() => selectVenda(v)}
                />
              ))
            ) : (
              data.comandas.map((c) => (
                <ComandaCard
                  key={c.id}
                  comanda={c}
                  selected={selectedComanda?.id === c.id}
                  onClick={() => selectComanda(c)}
                />
              ))
            )}
          </div>
        </div>

        {/* Detail panel — desktop */}
        <AnimatePresence>
          {hasDetail && (
            <motion.div
              key="detail-desktop"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="hidden lg:flex flex-1 flex-col border-l dash-border bg-[var(--parchment)] overflow-hidden"
            >
              {selectedVenda && <VendaDetail venda={selectedVenda} onClose={closeDetail} userRole={userRole} onEstorno={(fn) => setPinAuthPending(() => fn)} nomeLoja={nomeLoja} instagramUrl={instagramUrl} onReceipt={(d) => { setReceiptData(d); setReceiptOpen(true); }} />}
              {selectedComanda && <ComandaDetail comanda={selectedComanda} onClose={closeDetail} />}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Detail panel — mobile (bottom sheet) */}
        <AnimatePresence>
          {showMobileDetail && hasDetail && (
            <>
              <motion.div
                key="overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="lg:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-[80]"
                onClick={closeDetail}
              />
              <motion.div
                key="sheet"
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                className="lg:hidden fixed inset-x-0 bottom-0 z-[81] dash-card border-t dash-border rounded-t-3xl overflow-hidden flex flex-col"
                style={{ maxHeight: "85dvh" }}
              >
                {/* Drag handle */}
                <div className="flex justify-center pt-3 pb-1 shrink-0">
                  <div className="w-10 h-1 dash-divider rounded-full" />
                </div>
                {selectedVenda && <VendaDetail venda={selectedVenda} onClose={closeDetail} mobile userRole={userRole} onEstorno={(fn) => setPinAuthPending(() => fn)} nomeLoja={nomeLoja} instagramUrl={instagramUrl} onReceipt={(d) => { setReceiptData(d); setReceiptOpen(true); }} />}
                {selectedComanda && <ComandaDetail comanda={selectedComanda} onClose={closeDetail} mobile />}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      <PinAuthModal
        isOpen={pinAuthPending !== null}
        title="Autorização para Estorno"
        onSuccess={() => {
          pinAuthPending?.();
          setPinAuthPending(null);
        }}
        onCancel={() => setPinAuthPending(null)}
      />

      <ReceiptModal
        isOpen={receiptOpen}
        data={receiptData}
        onClose={() => setReceiptOpen(false)}
      />
    </div>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────
function EmptyState({ tab }: { tab: Tab }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center opacity-50">
      {tab === "vendas" ? <Receipt size={40} className="mb-4 dash-label" /> : <ClipboardList size={40} className="mb-4 dash-label" />}
      <p className="font-bold dash-label">Nenhum registro encontrado</p>
      <p className="text-sm dash-subtitle mt-1">Tente ajustar os filtros ou selecionar outra data.</p>
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────
export type Tab = "vendas" | "comandas";
export type Metodo = "all" | "PIX" | "DINHEIRO" | "MISTO";

interface Filters {
  date: string;
  metodo: Metodo;
  busca: string;
  tab: Tab;
}

interface HistoricoViewProps {
  initialData: HistoricoResult;
  initialFilters: Filters;
  userRole?: UserRole;
  nomeLoja?: string;
  instagramUrl?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(c: number) {
  return (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

function yesterdayISO() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

// ─── Badge components ─────────────────────────────────────────────────────────
function MetodoBadge({ metodo, size = "sm" }: { metodo: string; size?: "xs" | "sm" }) {
  const map: Record<string, { icon: React.ReactNode; cls: string; label: string }> = {
    PIX:      { icon: <QrCode    size={size === "xs" ? 10 : 12} />, cls: "bg-[var(--brasa-light)] dash-highlight-text border-[var(--brasa-border)]", label: "PIX" },
    DINHEIRO: { icon: <Banknote  size={size === "xs" ? 10 : 12} />, cls: "bg-[rgba(92,107,58,0.1)] text-[var(--oliva)] border-[rgba(92,107,58,0.2)]",    label: "Dinheiro" },
    MISTO:    { icon: <CreditCard size={size === "xs" ? 10 : 12} />, cls: "bg-amber-500/10  text-amber-400   border-amber-500/20",   label: "Misto" },
  };
  const { icon, cls, label } = map[metodo] ?? { icon: null, cls: "dash-muted dash-label border dash-border", label: metodo };
  const pad = size === "xs" ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]";
  return (
    <span className={`inline-flex items-center gap-1 rounded-md border font-bold uppercase tracking-wide ${pad} ${cls}`}>
      {icon} {label}
    </span>
  );
}

// ─── Venda Detail Panel ───────────────────────────────────────────────────────
function VendaDetail({
  venda, onClose, mobile, userRole, onEstorno, nomeLoja, instagramUrl, onReceipt,
}: {
  venda: VendaHistorico;
  onClose: () => void;
  mobile?: boolean;
  userRole?: UserRole;
  onEstorno?: (fn: () => void) => void;
  nomeLoja?: string;
  instagramUrl?: string;
  onReceipt?: (data: ReceiptData) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [estornado, setEstornado] = useState(false);

  const handleEstorno = () => {
    const doEstorno = () => {
      startTransition(async () => {
        const res = await estornarVenda(venda.id);
        if ("ok" in res) {
          setEstornado(true);
          setTimeout(onClose, 1200);
        }
      });
    };

    if (userRole === "GERENTE") {
      doEstorno();
    } else {
      onEstorno?.(doEstorno);
    }
  };

  const subtotal = venda.itens.reduce((s, i) => s + i.precoCentavos * i.quantidade, 0);
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b dash-border shrink-0">
        <div>
          <p className="text-[10px] font-bold dash-label uppercase tracking-widest">Pedido Avulso</p>
          <h2 className="text-xl font-black dash-value mt-0.5 flex items-center gap-2">
            <Hash size={16} className="dash-label" />
            {venda.id.slice(-8)}
          </h2>
        </div>
        <button
          onClick={onClose}
          aria-label="Fechar detalhes"
          className="w-9 h-9 rounded-xl dash-muted hover:dash-card flex items-center justify-center dash-label transition-colors"
        >
          {mobile ? <ChevronDown size={18} /> : <X size={18} />}
        </button>
      </div>

      {/* Meta */}
      <div className="flex items-center gap-3 px-6 py-3 border-b dash-border shrink-0 flex-wrap gap-y-2">
        <MetodoBadge metodo={venda.metodoPagto} />
        <span className="flex items-center gap-1.5 text-xs dash-label font-semibold">
          <Clock size={12} />
          {fmtDate(venda.criadoEm)} às {fmtTime(venda.criadoEm)}
        </span>
        <span className="flex items-center gap-1.5 text-xs dash-label font-semibold">
          <CheckCircle2 size={12} style={{ color: "var(--success)" }} />
          Concluído
        </span>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
        <p className="text-[10px] font-bold dash-label uppercase tracking-widest mb-3 flex items-center gap-2">
          <ShoppingBag size={11} /> Itens ({venda.itens.length})
        </p>
        {venda.itens.map((item) => (
          <div key={item.produtoId} className="flex items-center justify-between dash-muted border dash-border rounded-xl p-3.5">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 dash-muted rounded-lg flex items-center justify-center shrink-0">
                <span className="text-xs font-black dash-label">{item.quantidade}×</span>
              </div>
              <span className="font-semibold dash-value text-sm truncate">{item.nome}</span>
            </div>
            <div className="text-right shrink-0 ml-3">
              <p className="font-black dash-value text-sm tabular-nums">{fmt(item.precoCentavos * item.quantidade)}</p>
              <p className="text-xs dash-subtitle font-medium">{fmt(item.precoCentavos)} / un</p>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="border-t border-white/10 px-6 py-5 space-y-2 shrink-0">
        <div className="flex justify-between text-sm">
          <span className="dash-label font-semibold">Subtotal</span>
          <span className="dash-value font-bold tabular-nums">{fmt(subtotal)}</span>
        </div>
        {subtotal !== venda.totalCentavos && (
          <div className="flex justify-between text-sm">
            <span className="dash-label font-semibold">Ajuste</span>
            <span className="text-amber-400 font-bold tabular-nums">{fmt(venda.totalCentavos - subtotal)}</span>
          </div>
        )}
        <div className="flex justify-between items-center pt-2 border-t dash-border">
          <span className="dash-label font-bold">Total pago</span>
          <span className="text-2xl font-black dash-highlight-text tabular-nums tracking-tighter">{fmt(venda.totalCentavos)}</span>
        </div>
        {onEstorno && (
          <button
            onClick={handleEstorno}
            disabled={isPending || estornado}
            className="w-full mt-2 h-11 flex items-center justify-center gap-2 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-sm transition-all"
          >
            <RotateCcw size={15} />
            {estornado ? "Estornado" : isPending ? "Estornando..." : "Estornar Venda"}
          </button>
        )}
        {onReceipt && (
          <button
            onClick={() => onReceipt({
              nomeLoja: nomeLoja ?? "",
              items: venda.itens.map(i => ({
                produtoId: i.produtoId,
                nome: i.nome,
                quantidade: i.quantidade,
                precoCentavos: i.precoCentavos,
                prepared: false,
              })),
              totalCentavos: venda.totalCentavos,
              metodoPagamento: venda.metodoPagto,
              criadoEm: new Date(venda.criadoEm),
              instagramUrl: instagramUrl || undefined,
            })}
            className="w-full h-11 flex items-center justify-center gap-2 rounded-2xl font-bold text-sm transition-all"
            style={{ backgroundColor: "var(--brasa-light)", color: "var(--brasa)", border: "1px solid var(--brasa-border)" }}
          >
            <Printer size={15} />
            Ver Comprovante
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Venda List Card ──────────────────────────────────────────────────────────
function VendaCard({ venda, selected, onClick }: { venda: VendaHistorico; selected: boolean; onClick: () => void }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`w-full text-left p-4 rounded-2xl border transition-all duration-150 flex items-center gap-3 group ${
        selected
          ? "bg-[var(--brasa-light)] border-[var(--brasa-border)] shadow-[0_0_0_1px_var(--brasa-border)]"
          : "dash-card hover:border-[var(--border-md)]"
      }`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
        selected ? "dash-pill-active" : "dash-muted dash-label group-hover:dash-icon-accent group-hover:dash-highlight-text"
      }`}>
        {venda.metodoPagto === "PIX" ? <QrCode size={18} /> : venda.metodoPagto === "DINHEIRO" ? <Banknote size={18} /> : <CreditCard size={18} />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={`font-black text-sm truncate ${selected ? "dash-highlight-text" : "dash-value"}`}>
            #{venda.id.slice(-8)}
          </span>
          <MetodoBadge metodo={venda.metodoPagto} size="xs" />
        </div>
        <p className="text-xs dash-label font-medium flex items-center gap-1">
          <Clock size={10} /> {fmtTime(venda.criadoEm)} · {venda.itens.length} {venda.itens.length === 1 ? "item" : "itens"}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className={`font-black tabular-nums tracking-tighter ${selected ? "dash-highlight-text" : "dash-value"}`}>
          {fmt(venda.totalCentavos)}
        </p>
        <ChevronRight size={14} className={`ml-auto mt-0.5 transition-colors ${selected ? "dash-highlight-text" : "dash-label group-hover:dash-value"}`} />
      </div>
    </motion.button>
  );
}

// ─── Comanda List Card ────────────────────────────────────────────────────────
function ComandaCard({ comanda, selected, onClick }: { comanda: ComandaHistorico; selected: boolean; onClick: () => void }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`w-full text-left p-4 rounded-2xl border transition-all duration-150 flex items-center gap-3 group ${
        selected
          ? "bg-[var(--brasa-light)] border-[var(--brasa-border)] shadow-[0_0_0_1px_var(--brasa-border)]"
          : "dash-card hover:border-[var(--border-md)]"
      }`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
        selected ? "dash-pill-active" : "dash-muted dash-label group-hover:dash-icon-accent group-hover:dash-highlight-text"
      }`}>
        <TableProperties size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={`font-black text-sm truncate ${selected ? "dash-highlight-text" : "dash-value"}`}>
            {comanda.mesaNome}
          </span>
          {comanda.name && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md dash-badge uppercase tracking-tight truncate max-w-[80px]">
              {comanda.name}
            </span>
          )}
        </div>
        <p className="text-xs dash-label font-medium flex items-center gap-1">
          <Clock size={10} /> {comanda.fechadaEm ? fmtTime(comanda.fechadaEm) : "—"} · {comanda.itens.length} {comanda.itens.length === 1 ? "item" : "itens"}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className={`font-black tabular-nums tracking-tighter ${selected ? "dash-highlight-text" : "dash-value"}`}>
          {fmt(comanda.totalCentavos)}
        </p>
        <ChevronRight size={14} className={`ml-auto mt-0.5 transition-colors ${selected ? "dash-highlight-text" : "dash-label group-hover:dash-value"}`} />
      </div>
    </motion.button>
  );
}

// ─── Comanda Detail Panel ─────────────────────────────────────────────────────
function ComandaDetail({ comanda, onClose, mobile }: { comanda: ComandaHistorico; onClose: () => void; mobile?: boolean }) {
  const subtotal = comanda.itens.reduce((s, i) => s + i.precoCentavos * i.quantidade, 0);
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-5 border-b dash-border shrink-0">
        <div>
          <p className="text-[10px] font-bold dash-label uppercase tracking-widest">Comanda Fechada</p>
          <h2 className="text-xl font-black dash-value mt-0.5 flex items-center gap-2">
            <TableProperties size={16} className="dash-label" />
            {comanda.mesaNome}{comanda.name ? ` · ${comanda.name}` : ""}
          </h2>
        </div>
        <button
          onClick={onClose}
          aria-label="Fechar detalhes"
          className="w-9 h-9 rounded-xl dash-muted hover:dash-card flex items-center justify-center dash-label transition-colors"
        >
          {mobile ? <ChevronDown size={18} /> : <X size={18} />}
        </button>
      </div>

      <div className="flex items-center gap-3 px-6 py-3 border-b dash-border shrink-0 flex-wrap gap-y-2">
        <span className="flex items-center gap-1.5 text-xs dash-label font-semibold">
          <Clock size={12} /> Aberta: {fmtDate(comanda.abertaEm)} às {fmtTime(comanda.abertaEm)}
        </span>
        {comanda.fechadaEm && (
          <span className="flex items-center gap-1.5 text-xs dash-label font-semibold">
            <CheckCircle2 size={12} style={{ color: "var(--success)" }} /> Fechada: {fmtTime(comanda.fechadaEm)}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
        <p className="text-[10px] font-bold dash-label uppercase tracking-widest mb-3 flex items-center gap-2">
          <ClipboardList size={11} /> Itens ({comanda.itens.length})
        </p>
        {comanda.itens.length === 0 ? (
          <p className="text-sm dash-subtitle text-center py-8">Nenhum item registrado.</p>
        ) : comanda.itens.map((item, i) => (
          <div key={`item-${i}`} className="flex items-center justify-between dash-muted border dash-border rounded-xl p-3.5">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 dash-muted rounded-lg flex items-center justify-center shrink-0">
                <span className="text-xs font-black dash-label">{item.quantidade}×</span>
              </div>
              <span className="font-semibold dash-value text-sm truncate">{item.nome}</span>
            </div>
            <div className="text-right shrink-0 ml-3">
              <p className="font-black dash-value text-sm tabular-nums">{fmt(item.precoCentavos * item.quantidade)}</p>
              <p className="text-xs dash-subtitle font-medium">{fmt(item.precoCentavos)} / un</p>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-white/10 px-6 py-5 space-y-2 shrink-0">
        <div className="flex justify-between text-sm">
          <span className="dash-label font-semibold">Subtotal</span>
          <span className="dash-value font-bold tabular-nums">{fmt(subtotal)}</span>
        </div>
        <div className="flex justify-between items-center pt-2 border-t dash-border">
          <span className="dash-label font-bold">Total</span>
          <span className="text-2xl font-black dash-highlight-text tabular-nums tracking-tighter">{fmt(comanda.totalCentavos)}</span>
        </div>
      </div>
    </div>
  );
}

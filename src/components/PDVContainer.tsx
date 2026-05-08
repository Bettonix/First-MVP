"use client";

import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ShoppingCart, Banknote, QrCode, CreditCard,
  Loader2, Lock, Minus,
  DollarSign, Hash, TrendingUp, Star, Clock,
  Package, AlertTriangle, X, CheckCircle2,
  ClipboardList, ShoppingBag, Search,
  Pencil, Trash2, Plus, TableProperties, ChevronLeft, RefreshCw,
} from "lucide-react";
import { useCartStore, CartItem } from "@/store/useCartStore";
import { useTabStore, Comanda } from "@/store/useTabStore";
import { getProdutosPDV, deleteProduto, depleteStock } from "@/app/actions/produtos";
import { registrarVenda, getHistoricoVendas, type VendaDetalhe } from "@/app/actions/vendas";
import { getMesasComComanda, abrirComanda, fecharComanda, type MesaComComanda } from "@/app/actions/comandas";
import { SaleDetailSheet } from "./SaleDetailSheet";
import { QuickAddSheet, DeleteConfirmModal } from "./QuickAddSheet";
import { InfoTooltip } from "./ui/InfoTooltip";
import { CashActions } from "./CashActions";
import { PremiumDatePicker } from "./DatePicker";
import { fmtBRL, safeCentavos } from "@/lib/currency";
import { SetupChecklist } from "./SetupChecklist";
import { SearchHotspot, useSearchHotspot } from "./SearchHotspot";
import { useFirstSaleConfetti } from "@/hooks/useFirstSaleConfetti";
import { GraduationModal } from "./GraduationModal";
import { useState, useEffect, useRef, useOptimistic, memo, useCallback, useMemo } from "react";
import type { UserRole } from "@/lib/auth";
import { motion, AnimatePresence, LayoutGroup, useMotionValue, useTransform } from "framer-motion";
import { useSensoryFeedback } from "@/hooks/useSensoryFeedback";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { enqueueVenda } from "@/lib/offlineQueue";
import { ConnectivityToast } from "@/components/ConnectivityToast";
import { ReceiptModal, type ReceiptData } from "@/components/Receipt";

// ─── Types ───────────────────────────────────────────────────
interface ProdutoPDV {
  id: string;
  nome: string;
  precoCentavos: number;
  precoCustoCentavos: number;
  categoria: string;
  estoqueAtual: number;
  estoqueInicial: number;
  estoqueMinimo: number;
  gerenciarEstoque: boolean;
  isFavorito: boolean;
}

type ProdutoPDVAction =
  | { type: 'delete'; payload: string }
  | { type: 'update'; payload: ProdutoPDV }
  | { type: 'add'; payload: ProdutoPDV };

// ─── Utility Functions ────────────────────────────────────────
const sanitize = (val: unknown) => {
  if (!val) return 0;
  const cleaned = String(val).replace(/[^0-9.-]+/g, "");
  return parseFloat(cleaned) || 0;
};

// ─── Toast Component ──────────────────────────────────────────
function Toast({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, x: '-50%' }}
      animate={{ opacity: 1, y: 0, x: '-50%' }}
      exit={{ opacity: 0, y: -20, x: '-50%' }}
      className={`fixed top-6 left-1/2 z-[200] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border ${
        type === 'success' ? 'dash-icon-accent border-[var(--brasa-border)] dash-highlight-text' : 'bg-[var(--danger-bg)] border-[var(--danger-border)] text-[var(--danger)]'
      }`}
    >
      {type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
      <span className="text-sm font-bold tracking-tight">{message}</span>
      <button onClick={onClose} aria-label="Fechar notificação" className="ml-2 hover:opacity-70 transition-opacity"><X size={14} /></button>
    </motion.div>
  );
}

// ─── Change Overlay ───────────────────────────────────────────
function ChangeOverlay({ troco, onDismiss }: { troco: number; onDismiss: () => void }) {
  const [countdown, setCountdown] = useState(4);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const R = 20;
  const circ = 2 * Math.PI * R;
  const progress = countdown / 4;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-[150] flex flex-col items-center justify-center select-none"
      style={{ backgroundColor: "#1A1208" }}
      onClick={onDismiss}
    >
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div style={{
          position: "absolute", top: "30%", left: "50%", transform: "translate(-50%,-50%)",
          width: "600px", height: "400px",
          background: "radial-gradient(ellipse, rgba(211,84,0,0.18) 0%, transparent 68%)",
        }} />
      </div>

      <motion.div
        initial={{ scale: 0.85, opacity: 0, y: 28 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.85, opacity: 0, y: 28 }}
        transition={{ type: "spring", stiffness: 300, damping: 22 }}
        className="flex flex-col items-center gap-5 relative z-10"
        onClick={e => e.stopPropagation()}
      >
        {/* Eyebrow */}
        <p className="font-black uppercase tracking-[0.3em] text-xs"
          style={{ color: "rgba(211,84,0,0.7)" }}>
          PAGAMENTO CONCLUÍDO
        </p>

        {/* Troco label */}
        <p className="font-black uppercase tracking-[0.2em] text-[11px]"
          style={{ color: "rgba(255,255,255,0.3)" }}>
          TROCO
        </p>

        {/* Value — data-first, maximum size */}
        <p
          data-testid="change-overlay-value"
          className="font-black tabular-nums leading-none"
          style={{
            fontSize: "clamp(64px, 16vw, 140px)",
            color: "#D35400",
            letterSpacing: "-0.04em",
            lineHeight: 1,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {fmtBRL(troco)}
        </p>

        {/* Nova Venda button + countdown ring */}
        <div className="flex items-center gap-4 mt-4">
          <button
            onClick={onDismiss}
            className="flex items-center gap-2.5 px-7 py-3.5 rounded-2xl font-black text-sm uppercase tracking-widest text-white transition-all active:scale-95"
            style={{
              background: "linear-gradient(135deg, #D35400 0%, #B84A00 100%)",
              boxShadow: "0 8px 24px rgba(211,84,0,0.4)",
            }}
          >
            Nova Venda
          </button>

          {/* SVG countdown ring */}
          <div className="relative w-12 h-12 flex items-center justify-center">
            <svg width="48" height="48" className="absolute inset-0 -rotate-90">
              <circle cx="24" cy="24" r={R} fill="none"
                stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
              <circle cx="24" cy="24" r={R} fill="none"
                stroke="#D35400" strokeWidth="3"
                strokeDasharray={circ}
                strokeDashoffset={circ * (1 - progress)}
                strokeLinecap="round"
                style={{ transition: "stroke-dashoffset 0.9s linear" }}
              />
            </svg>
            <span className="font-black text-sm tabular-nums relative z-10"
              style={{ color: "rgba(255,255,255,0.5)" }}>
              {countdown}
            </span>
          </div>
        </div>

        <p className="text-xs font-semibold mt-1"
          style={{ color: "rgba(255,255,255,0.2)" }}>
          Toque em qualquer lugar para continuar
        </p>
      </motion.div>
    </motion.div>
  );
}

// ─── Custom Confirm Dialog ────────────────────────────────────
function ConfirmDialog({ isOpen, title, message, onConfirm, onCancel }: { isOpen: boolean, title: string, message: string, onConfirm: () => void, onCancel: () => void }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="dash-card w-full max-w-sm p-8 rounded-3xl border dash-border relative shadow-2xl flex flex-col items-center text-center max-h-[90dvh] overflow-y-auto">
        <h3 className="text-lg font-black mb-2">{title}</h3>
        <p className="dash-label text-sm mb-6">{message}</p>
        <div className="w-full flex gap-3">
          <button onClick={onCancel} className="flex-1 h-12 dash-muted hover:dash-muted rounded-xl font-bold text-sm">Voltar</button>
          <button onClick={onConfirm} className="flex-1 h-12 bg-[var(--brasa)] hover:bg-[var(--brasa-hover)] rounded-xl font-bold text-sm">Confirmar</button>
        </div>
      </motion.div>
    </div>
  );
}


// ─── Schemas & Helpers ─────────────────────────────────────────

const checkoutSchema = z.object({
  pagamento: z.enum(['PIX', 'DINHEIRO', 'CARTAO_CREDITO', 'CARTAO_DEBITO']),
});

type CheckoutForm = z.infer<typeof checkoutSchema>;

const fmt = (cents: number | null | undefined) => fmtBRL(safeCentavos(cents));

function safeIdToNumber(id: string): number {
  const numeric = id.replace(/\D/g, '');
  return numeric.length > 0 && id === numeric ? Number(numeric) : 0;
}

// ─── Types ─────────────────────────────────────────────────────

interface RecentSale {
  id: string;
  totalCentavos: number;
  metodoPagto: string;
  criadoEm: string;
}

// ─── Discount Modal ───────────────────────────────────────────
function DiscountModal({ isOpen, onApply, onCancel }: { isOpen: boolean, onApply: (val: number) => void, onCancel: () => void }) {
  const [val, setVal] = useState("");
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="dash-card w-full max-w-sm p-8 rounded-[32px] border dash-border relative shadow-2xl">
        <h3 className="text-lg font-black mb-4 text-center">Aplicar Desconto</h3>
        <div className="flex flex-col gap-4">
          <input
            autoFocus
            data-testid="desconto-input"
            type="number"
            step="0.01"
            placeholder="0,00"
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { onApply(Math.round(Number(val.replace(',','.')) * 100)); setVal(""); } }}
            className="w-full h-14 dash-muted border dash-border rounded-2xl px-6 text-2xl font-black text-center focus:border-[var(--brasa)] focus:dash-muted outline-none transition-all placeholder:dash-subtitle"
          />
          <div className="flex gap-3">
            <button onClick={onCancel} className="flex-1 h-12 dash-muted hover:dash-muted rounded-xl font-bold text-sm">Cancelar</button>
            <button data-testid="btn-aplicar-desconto" onClick={() => { onApply(Math.round(Number(val.replace(',','.')) * 100)); setVal(""); }} className="flex-1 h-12 bg-[var(--brasa)] hover:bg-[var(--brasa-hover)] rounded-xl font-bold text-sm">Aplicar</button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

interface PDVContainerProps {
  isTurnoAberto: boolean;
  nomeLoja: string;
  instagramUrl?: string;
  insights: {
    totalHojeCentavos: number;
    qtdHoje: number;
    ticketMedioCentavos: number;
    vaultCentavos: number;
  };
  lowStockItems: { id: string; nome: string; estoqueAtual: number }[];
  recentSales: RecentSale[];
  initialProdutos: ProdutoPDV[];
  showWelcome?: boolean;
  userRole?: UserRole;
}

// ─── Live Clock & Timer Helpers ───────────────────────────────

function LiveClock() {
  const [time, setTime] = useState("");
  useEffect(() => {
    const update = () => setTime(new Date().toLocaleString("pt-BR", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }));
    update();
    const id = setInterval(update, 30000);
    return () => clearInterval(id);
  }, []);
  return <span className="text-xs dash-label font-medium tabular-nums">{time}</span>;
}

function OpenTime({ createdAt }: { createdAt: number }) {
  const [diff, setDiff] = useState("");
  useEffect(() => {
    const update = () => {
      const seconds = Math.floor((Date.now() - createdAt) / 1000);
      const m = Math.floor(seconds / 60);
      setDiff(m > 0 ? `${m} min` : `${seconds}s`);
    };
    update();
    const id = setInterval(update, 10000);
    return () => clearInterval(id);
  }, [createdAt]);
  return <span className="text-[10px] dash-label font-bold uppercase tracking-widest">{diff}</span>;
}

// ─── Product Card (memoized — prevents re-render on cart changes) ─
interface ProductCardProps {
  produto: { id: string; nome: string; precoCentavos: number; estoqueAtual: number; estoqueMinimo: number; gerenciarEstoque: boolean };
  fmt: (c: number) => string;
  onAdd: (id: string, nome: string, preco: number) => void;
}
const ProductCard = memo(function ProductCard({ produto: p, fmt, onAdd }: ProductCardProps) {
  const isEsgotado = p.gerenciarEstoque && p.estoqueAtual <= 0;
  const isLowStock = p.gerenciarEstoque && p.estoqueAtual > 0 && p.estoqueAtual <= p.estoqueMinimo;

  let cardBorder = 'dash-border hover:border-[var(--brasa-border)] active:scale-95';
  if (isEsgotado) cardBorder = 'opacity-40 grayscale pointer-events-none dash-border';
  else if (isLowStock) cardBorder = 'border-amber-400/50 hover:border-amber-400 active:scale-95';

  let iconBorder = 'dash-border group-hover:scale-105 group-hover:border-[var(--brasa-border)]';
  if (isEsgotado) iconBorder = 'dash-border';
  else if (isLowStock) iconBorder = 'border-amber-400/40 group-hover:scale-105';

  let iconColor = 'dash-label';
  if (isEsgotado) iconColor = 'dash-subtitle';
  else if (isLowStock) iconColor = 'text-amber-500';

  return (
    <motion.button
      key={p.id}
      disabled={isEsgotado}
      onClick={() => onAdd(p.id, p.nome, p.precoCentavos)}
      whileTap={isEsgotado ? {} : { scale: 0.93 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      className={`dash-card border p-4 rounded-3xl flex flex-col items-center text-center gap-3 transition-colors relative overflow-hidden group shadow-xl min-h-[120px] ${cardBorder}`}
    >
      {/* Ícone maior — Fitts */}
      <div className={`w-14 h-14 rounded-2xl dash-muted border-2 flex items-center justify-center transition-transform ${iconBorder}`}>
        <Package size={26} className={iconColor} />
      </div>
      <div className="w-full">
        <p className={`font-black text-sm leading-tight transition-colors line-clamp-2 ${!isEsgotado && 'group-hover:dash-highlight-text'}`}>{p.nome}</p>
        <p className={`font-bold mt-1 text-sm tabular-nums ${isEsgotado ? 'dash-label' : 'dash-highlight-text'}`}>{fmt(p.precoCentavos)}</p>
      </div>

      {/* Badge de estoque — só quando gerenciarEstoque=true */}
      {p.gerenciarEstoque && !isEsgotado && (
        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black ${
          isLowStock ? 'bg-amber-400/15 text-amber-600' : 'bg-[var(--border)] dash-label'
        }`}>
          {isLowStock ? '⚠️' : '📦'} {p.estoqueAtual} un.
        </div>
      )}

      {isEsgotado && (
        <div className="absolute inset-0 bg-[var(--parchment)]/80 backdrop-blur-[2px] flex items-center justify-center pointer-events-none">
          <span className="bg-rose-500 text-white text-[10px] font-black px-4 py-1 rounded-full uppercase tracking-tighter shadow-lg shadow-rose-500/20 rotate-[-8deg]">
            Esgotado
          </span>
        </div>
      )}
    </motion.button>
  );
});

// ─── Swipe-to-Delete Cart Item (Poka-yoke) ────────────────────
interface SwipeCartItemProps {
  item: CartItem;
  fmt: (c: number) => string;
  onIncrement: (id: string) => void;
  onDecrement: (id: string) => void;
  onRemove: (id: string) => void;
  onTogglePrepared: (id: string) => void;
}

const SWIPE_THRESHOLD = 120;

function SwipeCartItem({ item, fmt, onIncrement, onDecrement, onRemove, onTogglePrepared }: SwipeCartItemProps) {
  const x = useMotionValue(0);
  const background = useTransform(x, [-SWIPE_THRESHOLD, -SWIPE_THRESHOLD * 0.4, 0], ["rgba(239,68,68,0.25)", "rgba(239,68,68,0.08)", "rgba(0,0,0,0)"]);
  const trashOpacity = useTransform(x, [-SWIPE_THRESHOLD, -SWIPE_THRESHOLD * 0.5, 0], [1, 0.5, 0]);
  const trashScale = useTransform(x, [-SWIPE_THRESHOLD, -SWIPE_THRESHOLD * 0.5, 0], [1.2, 0.9, 0.6]);

  const handleDragEnd = (_: unknown, info: { offset: { x: number } }) => {
    if (info.offset.x < -SWIPE_THRESHOLD) {
      onRemove(item.produtoId);
    }
  };

  return (
    <motion.li
      layout
      key={item.produtoId}
      initial={{ opacity: 0, x: 20, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -60, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={`relative overflow-hidden rounded-[24px] ${item.prepared ? 'opacity-40' : item.saved ? 'opacity-60' : 'opacity-100'}`}
    >
      {/* Item "saved" — somente leitura, sem swipe/controles */}
      {item.saved ? (
        <div className="relative dash-muted p-4 rounded-[24px] border dash-border border-dashed">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl dash-card border dash-border shrink-0">
              <ClipboardList size={14} className="dash-label" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm leading-tight dash-value truncate">{item.nome}</p>
              <p className="text-xs dash-label font-bold tabular-nums mt-0.5">{item.quantidade}× {fmt(item.precoCentavos)}</p>
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest dash-label bg-[var(--muted)] border dash-border px-2 py-1 rounded-lg shrink-0">
              Enviado
            </span>
          </div>
        </div>
      ) : (
      <>
      {/* Fundo vermelho revelado pelo swipe */}
      <motion.div
        style={{ background }}
        className="absolute inset-0 rounded-[24px] flex items-center justify-end pr-5 pointer-events-none"
      >
        <motion.div style={{ opacity: trashOpacity, scale: trashScale }}>
          <Trash2 size={22} className="text-rose-500" />
        </motion.div>
      </motion.div>

      {/* Card arrastável */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -SWIPE_THRESHOLD * 1.2, right: 0 }}
        dragElastic={{ left: 0.15, right: 0 }}
        style={{ x }}
        onDragEnd={handleDragEnd}
        whileDrag={{ cursor: "grabbing" }}
        className="relative dash-muted p-4 rounded-[24px] border dash-border touch-pan-y select-none"
      >
        <div className="flex items-center gap-3">
          {/* Controles +/- — h-12 w-12 (Fitts) */}
          <div className="flex items-center gap-1 dash-card rounded-xl border dash-border p-0.5 shrink-0">
            <motion.button
              type="button"
              whileTap={{ scale: 0.8 }}
              transition={{ type: "spring", stiffness: 500, damping: 15 }}
              aria-label={`Diminuir ${item.nome}`}
              onClick={() => onDecrement(item.produtoId)}
              className="w-10 h-10 flex items-center justify-center dash-label hover:dash-value hover:dash-muted rounded-lg transition-colors"
            >
              <Minus size={15} />
            </motion.button>
            <span aria-live="polite" data-testid={`qty-${item.produtoId}`} className="w-7 text-center text-sm font-black tabular-nums dash-value">{item.quantidade}</span>
            <motion.button
              type="button"
              whileTap={{ scale: 0.8 }}
              transition={{ type: "spring", stiffness: 500, damping: 15 }}
              aria-label={`Aumentar ${item.nome}`}
              onClick={() => onIncrement(item.produtoId)}
              className="w-10 h-10 flex items-center justify-center dash-label hover:dash-value hover:dash-muted rounded-lg transition-colors"
            >
              <Plus size={15} />
            </motion.button>
          </div>

          {/* Nome e preço */}
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm leading-tight dash-value truncate">{item.nome}</p>
            <p className="text-xs dash-highlight-text font-bold tabular-nums mt-0.5">{fmt(item.precoCentavos * item.quantidade)}</p>
          </div>

          {/* Botão preparado */}
          <motion.button
            type="button"
            whileTap={{ scale: 0.85 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            aria-label={item.prepared ? `Desmarcar ${item.nome}` : `Marcar ${item.nome} como preparado`}
            onClick={() => onTogglePrepared(item.produtoId)}
            className={`w-9 h-9 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${
              item.prepared
                ? 'bg-[var(--brasa)] border-[var(--brasa)] text-white shadow-[0_0_12px_rgba(211,84,0,0.4)]'
                : 'dash-border text-[var(--border)] hover:border-[var(--brasa-border)]'
            }`}
          >
            <CheckCircle2 size={15} />
          </motion.button>
        </div>

        {/* Hint de swipe — aparece só no primeiro item */}
        {item === undefined ? null : (
          <p className="text-[9px] dash-label font-bold uppercase tracking-widest text-center mt-2 opacity-30 pointer-events-none select-none">
            ← deslize para remover
          </p>
        )}
      </motion.div>
      </>
      )}
    </motion.li>
  );
}

// ─── Main Component ───────────────────────────────────────────

export function PDVContainer({ isTurnoAberto, nomeLoja, instagramUrl, insights, lowStockItems, recentSales, initialProdutos, showWelcome, userRole = "GERENTE" }: PDVContainerProps) {
  const { items, addItem, removeItem, incrementItem, decrementItem, togglePrepared, clearCart, totalCentavos, subtotalCentavos, descontoCentavos, setDesconto, setItems, loadTableContext, newItemsTotalCentavos } = useCartStore();
  const { comandas, saveComanda, updateComandaItems, activeComandaId, setActiveComanda, closeComanda } = useTabStore();
  const { onSaleSuccess } = useSensoryFeedback();
  const { isOnline, pendingCount, isSyncing, justReconnected } = useOfflineSync();
  
  const { data: produtos = initialProdutos, isLoading } = useQuery({
    queryKey: ['produtos-pdv'],
    queryFn: async () => await getProdutosPDV(),
    initialData: initialProdutos,
    staleTime: 5 * 60 * 1000,
  });

  const subtotal = subtotalCentavos();
  const total = totalCentavos();
  const [cartOpen, setCartOpen] = useState(false);
  const [produtosList, setProdutosList] = useState<ProdutoPDV[]>(initialProdutos ?? []);
  const [optimisticProdutos, addOptimisticProduto] = useOptimistic(
    produtosList,
    (state: ProdutoPDV[], action: ProdutoPDVAction) => {
      if (action.type === 'delete') return state.filter((p) => p.id !== action.payload);
      if (action.type === 'update') return state.map((p) => p.id === action.payload.id ? { ...p, ...action.payload } : p);
      if (action.type === 'add') return [...state, action.payload];
      return state;
    }
  );

  useEffect(() => { if (produtos) setProdutosList(produtos); }, [produtos]);

  const [activeTab, setActiveTab] = useState<"todos" | "favoritos">("todos");
  const [activeView, setActiveView] = useState<"VENDA" | "COMANDAS" | "HISTORICO" | "ESTOQUE" | "RELATORIOS">("VENDA");
  
  const [comandaModalOpen, setComandaModalOpen] = useState(false);
  const [comandaName, setComandaName] = useState("");
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [changeOverlay, setChangeOverlay] = useState<{ troco: number } | null>(null);
  const changeOverlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [discountModalOpen, setDiscountModalOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { fireConfetti } = useFirstSaleConfetti();
  const { dismissed: hotspotDismissed } = useSearchHotspot();
  const [graduationOpen, setGraduationOpen] = useState(false);
  const [selectedHistoryDate, setSelectedHistoryDate] = useState(new Date());
  const [selectedDashboardDate, setSelectedDashboardDate] = useState(new Date());
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);

  // ─── Mesa Vinculada (PDV Selector) ────────────────────────────
  const [vinculadoAMesa, setVinculadoAMesa]       = useState(false);
  const [mesasPDV, setMesasPDV]                   = useState<MesaComComanda[]>([]);
  const [mesasPDVLoading, setMesasPDVLoading]     = useState(false);
  const [selectedMesaId, setSelectedMesaId]               = useState("");
  const [selectedComandaId, setSelectedComandaId]         = useState("");
  const [novaComandaNome, setNovaComandaNome]             = useState("");
  const [novaComandaConfirmed, setNovaComandaConfirmed]   = useState(false);
  // ID da mesa ocupada carregada no contexto do PDV (modo "Enviar Adicionais")
  const [mesaOcupadaContextId, setMesaOcupadaContextId]   = useState<string | null>(null);

  const fetchMesasPDV = useCallback(() => {
    setMesasPDVLoading(true);
    return getMesasComComanda()
      .then((data) => { setMesasPDV(data); })
      .finally(() => setMesasPDVLoading(false));
  }, []);

  const handleToggleVinculado = (on: boolean) => {
    setVinculadoAMesa(on);
    if (on) {
      fetchMesasPDV();
    } else {
      setSelectedMesaId("");
      setSelectedComandaId("");
      setNovaComandaNome("");
      setNovaComandaConfirmed(false);
    }
  };

  const resetMesaSelector = () => {
    setVinculadoAMesa(false);
    setSelectedMesaId("");
    setSelectedComandaId("");
    setNovaComandaNome("");
    setNovaComandaConfirmed(false);
    setMesasPDV([]);
    setMesaOcupadaContextId(null);
  };

  // ── Carregar mesa ocupada no contexto do PDV ─────────────────
  const handleCarregarMesaOcupada = (mesa: MesaComComanda) => {
    // Proteção: carrinho com itens não-saved pertence a outro contexto
    const hasUnsavedItems = items.some(i => !i.saved);
    if (hasUnsavedItems) {
      showToast("Finalize ou limpe o carrinho atual antes de abrir uma mesa.", "error");
      return;
    }
    // Carrega itens da primeira comanda ativa como "saved"
    const comanda = mesa.comandas[0];
    const savedItems = comanda
      ? comanda.itens.map((i, idx) => ({
          produtoId: `saved__${comanda.id}__${idx}`,
          nome: i.nome,
          quantidade: i.quantidade,
          precoCentavos: i.precoCentavos,
          prepared: false,
          saved: true as const,
        }))
      : [];
    loadTableContext(savedItems);
    setMesaOcupadaContextId(mesa.id);
    setSelectedMesaId(mesa.id);
    setSelectedComandaId(comanda?.id ?? "");
    setVinculadoAMesa(true);
    setCartOpen(true);
    showToast(`${mesa.nome} carregada. Adicione itens e clique em "Enviar Adicionais".`, "success");
  };

  const handleAddProduct = useCallback((id: string, nome: string, preco: number) => {
    // Optimistic UI — atualiza estoque local imediatamente (Step 3)
    addOptimisticProduto({ type: 'update', payload: { id, nome, precoCentavos: safeCentavos(preco), precoCustoCentavos: 0, categoria: '', estoqueAtual: Math.max(0, (produtos.find(p => String(p.id) === id)?.estoqueAtual ?? 1) - 1), estoqueInicial: 0, estoqueMinimo: 0, gerenciarEstoque: false, isFavorito: false } });
    addItem({ produtoId: id, nome, precoCentavos: safeCentavos(preco) });
    setCartOpen(true);
  }, [addItem, addOptimisticProduto, produtos]);

  // Sale detail sheet + history query
  const [selectedSale, setSelectedSale] = useState<VendaDetalhe | null>(null);
  const historicoQuery = useQuery({
    queryKey: ['historico-vendas', selectedHistoryDate.toDateString()],
    queryFn: () => getHistoricoVendas(selectedHistoryDate.toISOString()),
    staleTime: 30_000,
  });

  // CRUD & Feedback State
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [confirmData, setConfirmData] = useState<{ title: string, message: string, action: () => void } | null>(null);
  const [crudModalOpen, setCrudModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProdutoPDV | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<ProdutoPDV | null>(null);
  const queryClient = useQueryClient();

  const showToast = (message: string, type: 'success' | 'error' = 'success') => setToast({ message, type });

  useEffect(() => {
    if (!showWelcome) return;
    const timer = setTimeout(() => {
      showToast(`Bem-vindo ao ${nomeLoja}! Seu primeiro produto já está no PDV. 🎉`);
    }, 800);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const deleteMutation = useMutation({
    mutationFn: async (produtoId: string) => {
      const res = await deleteProduto(produtoId);
      if (!res.success) throw new Error(res.error || "Erro");
    },
    onMutate: async (produtoId) => {
      await queryClient.cancelQueries({ queryKey: ['produtos-pdv'] });
      const prev = queryClient.getQueryData(['produtos-pdv']);
      queryClient.setQueryData(['produtos-pdv'], (old: unknown) =>
        Array.isArray(old) ? (old as ProdutoPDV[]).filter((p) => p.id !== produtoId) : old
      );
      setDeletingProduct(null);
      return { prev };
    },
    onError: (err, _id, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['produtos-pdv'], ctx.prev);
      showToast(err.message, 'error');
    },
    onSuccess: () => showToast("Produto excluído com sucesso!"),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['produtos-pdv'] }),
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const { handleSubmit, watch, reset: resetForm } = useForm<CheckoutForm>({
    resolver: zodResolver(checkoutSchema) as Resolver<CheckoutForm>,
    defaultValues: { pagamento: 'DINHEIRO' }
  });

  // ─── Split Payment State ──────────────────────────────────────
  type SplitMetodo = 'PIX' | 'DINHEIRO' | 'CARTAO_CREDITO' | 'CARTAO_DEBITO';
  const [splitPagamentos, setSplitPagamentos] = useState<{ metodo: SplitMetodo; valorCentavos: number }[]>([]);
  const [splitInputValor, setSplitInputValor] = useState("");
  const splitInputRef = useRef<HTMLInputElement>(null);

  const pagamentoType = watch("pagamento") as SplitMetodo;

  const splitPago = splitPagamentos.reduce((s, p) => s + p.valorCentavos, 0);
  const splitRestante = Math.max(0, total - splitPago);
  const splitTroco = Math.max(0, splitPago - total);
  const isSplitValid = splitPago >= total && splitPagamentos.length > 0;

  // Mesa livre selecionada = modo "Abrir Mesa" (sem pagamento imediato)
  const mesaSelecionada = mesasPDV.find((m) => m.id === selectedMesaId);
  const isModoAbrirMesa = vinculadoAMesa && !!selectedMesaId && (mesaSelecionada?.comandas.length ?? 0) === 0;

  // Mesa ocupada carregada no contexto = modo "Enviar Adicionais"
  const newItemsTotal = newItemsTotalCentavos();
  const hasNewItems   = items.some(i => !i.saved);
  const isModoEnviarAdicionais = !!mesaOcupadaContextId && hasNewItems;
  // Mesa ocupada carregada, carrinho só tem itens saved = modo "Fechar Conta"
  const isModoFecharConta = !!mesaOcupadaContextId && items.length > 0 && items.every(i => i.saved);
  // No modo adicionais, o split valida apenas os itens novos
  const isSplitValidAdicionais = splitPago >= newItemsTotal && splitPagamentos.length > 0;

  // Troco em dinheiro = dinheiro pago - (total - outros métodos)
  const splitDinheiroPago = splitPagamentos.filter(p => p.metodo === 'DINHEIRO').reduce((s, p) => s + p.valorCentavos, 0);
  const splitNaoDinheiro = splitPagamentos.filter(p => p.metodo !== 'DINHEIRO').reduce((s, p) => s + p.valorCentavos, 0);
  const trocoFinal = Math.max(0, splitDinheiroPago - Math.max(0, total - splitNaoDinheiro));

  const addSplitPagamento = (metodo: SplitMetodo) => {
    const raw = parseFloat(splitInputValor.replace(',', '.'));
    if (isNaN(raw) || raw <= 0) return;
    const valorCentavos = Math.round(raw * 100);
    setSplitPagamentos(prev => [...prev, { metodo, valorCentavos }]);
    setSplitInputValor("");
    splitInputRef.current?.focus();
  };

  const removeSplitPagamento = (idx: number) => {
    setSplitPagamentos(prev => prev.filter((_, i) => i !== idx));
  };

  // Reset split state on cart clear
  const resetSplitState = () => {
    setSplitPagamentos([]);
    setSplitInputValor("");
  };


  const mutation = useMutation({
    mutationFn: async (data: CheckoutForm) => {
      // ── Modo "Fechar Conta": itens são saved (IDs sintéticos), usa totalCentavos da comanda ──
      if (isModoFecharConta) {
        const cartSerialized = items.map(item => ({
          // saved items têm IDs sintéticos — serializa apenas nome/qtd/preço
          produtoId: BigInt(0),
          nome: item.nome,
          quantidade: item.quantidade,
          precoCentavos: item.precoCentavos,
        }));

        if (!navigator.onLine) {
          await enqueueVenda({
            payload: {
              cart: items.map(item => ({
                produtoId: "0",
                nome: item.nome,
                quantidade: item.quantidade,
                precoCentavos: item.precoCentavos,
              })),
              pagamentos: splitPagamentos,
              totalCentavos: total,
              troco: trocoFinal,
            },
          });
          return { __offline: true as const };
        }

        const res = await registrarVenda({ cart: cartSerialized, pagamentos: splitPagamentos });
        if (!res.success) throw new Error(res.error);

        if (selectedComandaId) await fecharComanda(selectedComandaId);

        return res;
      }

      // Valida que todos os IDs são numéricos antes de converter para BigInt
      const invalidItems = items.filter(item => !/^\d+$/.test(item.produtoId));
      if (invalidItems.length > 0) {
        throw new Error(`Produto(s) inválido(s): ${invalidItems.map(i => i.nome).join(", ")}. Recarregue a página.`);
      }

      const cartSerialized = items.map(item => ({
        produtoId: BigInt(item.produtoId),
        nome: item.nome,
        quantidade: item.quantidade,
        precoCentavos: item.precoCentavos,
      }));

      // ── Offline fallback ──────────────────────────────────────
      // Server Actions requerem rede. Se offline, persiste na fila
      // local e simula sucesso para não bloquear o operador.
      if (!navigator.onLine) {
        await enqueueVenda({
          payload: {
            cart: items.map(item => ({
              produtoId: item.produtoId,
              nome: item.nome,
              quantidade: item.quantidade,
              precoCentavos: item.precoCentavos,
            })),
            pagamentos: splitPagamentos,
            totalCentavos: total,
            troco: trocoFinal,
          },
        });
        // Retorna objeto compatível com o fluxo de onSuccess
        return { __offline: true as const };
      }

      // Resolve comanda to close (create new if needed)
      let comandaParaFechar: string | null = null;
      if (vinculadoAMesa && selectedMesaId) {
        if (selectedComandaId === "__nova__") {
          const cr = await abrirComanda(selectedMesaId, novaComandaNome || undefined);
          if ("id" in cr) comandaParaFechar = cr.id;
        } else if (selectedComandaId) {
          comandaParaFechar = selectedComandaId;
        }
      }

      const res = await registrarVenda({ cart: cartSerialized, pagamentos: splitPagamentos });

      if (!res.success) {
        console.error("❌ Erro na Server Action:", res.error);
        throw new Error(res.error);
      }

      if (comandaParaFechar) {
        await fecharComanda(comandaParaFechar);
      }

      return res;
    },
    onSuccess: async (result) => {
      const doReset = () => {
        clearCart();
        setCartOpen(false);
        resetForm();
        resetSplitState();
        setChangeOverlay(null);
        setTimeout(() => searchInputRef.current?.focus(), 80);
      };

      // ── Offline path: venda enfileirada localmente ────────────
      if (result && '__offline' in result && result.__offline) {
        const snapshotTroco = trocoFinal;
        if (snapshotTroco > 0) {
          setChangeOverlay({ troco: snapshotTroco });
          if (changeOverlayTimerRef.current) clearTimeout(changeOverlayTimerRef.current);
          changeOverlayTimerRef.current = setTimeout(doReset, 4000);
        } else {
          doReset();
          showToast("Venda salva localmente. Sincronizando quando houver conexão.", 'success');
        }
        return;
      }

      const metodo = pagamentoType ?? undefined;
      onSaleSuccess(metodo);

      const snapshotSplits = [...splitPagamentos];
      const snapshotTroco = trocoFinal;

      // Derive metodoPagamento label for receipt
      const metodosUnicos = [...new Set(snapshotSplits.map(p => p.metodo))];
      const metodoLabel = metodosUnicos.length === 1 ? metodosUnicos[0] : 'MISTO';

      const receipt: ReceiptData = {
        nomeLoja,
        items: [...items],
        totalCentavos: total,
        metodoPagamento: metodoLabel,
        criadoEm: new Date(),
        instagramUrl: instagramUrl || undefined,
        troco: snapshotTroco,
      };
      setReceiptData(receipt);

      // Atualiza o estoque localmente sem round-trip ao servidor
      const soldItems = [...items];
      queryClient.setQueryData(['produtos-pdv'], (old: ProdutoPDV[] | undefined) => {
        if (!old) return old;
        return old.map(p => {
          const sold = soldItems.find(i => i.produtoId === p.id);
          if (!sold || !p.gerenciarEstoque) return p;
          return { ...p, estoqueAtual: Math.max(0, p.estoqueAtual - sold.quantidade) };
        });
      });

      // Persiste decremento atômico no banco (apenas produtos com gerenciarEstoque=true)
      depleteStock(soldItems.map(i => ({ produtoId: i.produtoId, quantidade: i.quantidade })));

      if (activeComandaId) closeComanda(activeComandaId);
      resetMesaSelector();

      // Dispara impressão de forma assíncrona (não bloqueia o fluxo)
      setTimeout(() => {
        const el = document.getElementById("thermal-receipt");
        if (el) {
          const win = window.open("", "_blank", "width=400,height=600");
          if (win) {
            win.document.write(`<html><head><title>Recibo</title><style>*{margin:0;padding:0;box-sizing:border-box}body{background:#fff}@media print{@page{margin:0;size:80mm auto}body{-webkit-print-color-adjust:exact}}</style></head><body>${el.innerHTML}</body></html>`);
            win.document.close();
            win.focus();
            setTimeout(() => { win.print(); win.close(); }, 300);
          }
        }
      }, 0);

      if (snapshotTroco > 0) {
        setChangeOverlay({ troco: snapshotTroco });
        if (changeOverlayTimerRef.current) clearTimeout(changeOverlayTimerRef.current);
        changeOverlayTimerRef.current = setTimeout(doReset, 4000);
      } else {
        doReset();
        showToast("Venda finalizada!");
        const wasFirst = fireConfetti();
        if (wasFirst) {
          setTimeout(() => setGraduationOpen(true), 2800);
        }
      }
    },
    onError: (err: Error) => {
      showToast(err.message, 'error');
    },
  });

  const onSubmit = (_data: CheckoutForm) => {
    if (items.length === 0) return showToast("Carrinho vazio.", 'error');
    if (!isTurnoAberto) return showToast("Abra o caixa antes de vender.", 'error');
    // Modo "Abrir Mesa": ignora validação de pagamento
    if (isModoAbrirMesa) {
      handleAbrirMesa();
      return;
    }
    // Modo "Enviar Adicionais": valida apenas os itens novos
    if (isModoEnviarAdicionais) {
      if (!isSplitValidAdicionais) return showToast(`Pagamento insuficiente. Falta ${fmt(Math.max(0, newItemsTotal - splitPago))}`, 'error');
      mutation.mutate(_data);
      return;
    }
    // Modo "Fechar Conta": valida split pelo total completo da mesa
    if (isModoFecharConta) {
      if (!isSplitValid) return showToast(`Pagamento insuficiente. Falta ${fmt(splitRestante)}`, 'error');
      mutation.mutate(_data);
      return;
    }
    if (!isSplitValid) return showToast(`Pagamento insuficiente. Falta ${fmt(splitRestante)}`, 'error');
    mutation.mutate(_data);
  };

  const paymentMethods = [
    { value: 'DINHEIRO' as const, label: 'Dinheiro', icon: Banknote },
    { value: 'PIX' as const, label: 'Pix', icon: QrCode },
    { value: 'CARTAO_CREDITO' as const, label: 'Crédito', icon: CreditCard },
    { value: 'CARTAO_DEBITO' as const, label: 'Débito', icon: CreditCard },
  ];

  const handleSaveToComanda = () => {
    if (items.length === 0) return;
    if (activeComandaId) {
      updateComandaItems(activeComandaId, items);
      clearCart();
      setActiveComanda(null);
      setCartOpen(false);
    } else {
      setComandaModalOpen(true);
    }
  };

  // ── Abrir Mesa silenciosamente (sem pagamento imediato) ──────────────────
  const [abrindoMesa, setAbrindoMesa] = useState(false);
  const handleAbrirMesa = async () => {
    if (!selectedMesaId || items.length === 0) return;
    setAbrindoMesa(true);
    try {
      const nomeMesa = mesaSelecionada?.nome ?? `Mesa ${selectedMesaId}`;
      const cr = await abrirComanda(selectedMesaId, novaComandaNome || undefined);
      if (!("id" in cr)) {
        showToast("Erro ao abrir mesa. Tente novamente.", "error");
        return;
      }
      // Salva os itens na comanda recém-aberta
      updateComandaItems(cr.id, items);
      // Reset completo
      clearCart();
      setCartOpen(false);
      resetForm();
      resetSplitState();
      resetMesaSelector();
      await fetchMesasPDV();
      showToast(`${nomeMesa} aberta com sucesso!`, "success");
      setTimeout(() => searchInputRef.current?.focus(), 80);
    } catch {
      showToast("Erro ao abrir mesa. Tente novamente.", "error");
    } finally {
      setAbrindoMesa(false);
    }
  };

  // Conteúdo do botão principal — variável para evitar ternários aninhados (S3358)
  const btnPrincipalContent = (() => {
    if (mutation.isPending || abrindoMesa) return { icon: <Loader2 className="animate-spin" size={22}/>, label: "Processando..." };
    if (isModoAbrirMesa)        return { icon: <TableProperties size={22}/>, label: `Abrir ${mesaSelecionada?.nome ?? "Mesa"}` };
    if (isModoEnviarAdicionais) return { icon: <Plus size={22}/>, label: `Enviar Adicionais ${hasNewItems ? fmt(newItemsTotal) : ''}` };
    if (isModoFecharConta)      return { icon: <DollarSign size={22}/>, label: `Fechar Conta ${fmt(total)}` };
    return { icon: <CheckCircle2 size={22}/>, label: `Receber ${items.length > 0 ? fmt(total) : ''}` };
  })();

  const confirmSaveComanda = () => {
    if (!comandaName) return;
    saveComanda(comandaName, items);
    clearCart();
    setComandaName("");
    setComandaModalOpen(false);
    setCartOpen(false);
  };

  const selectComanda = (c: Comanda) => {
    if (items.length > 0 && !activeComandaId) {
      setConfirmData({
        title: "Substituir Carrinho?",
        message: "O carrinho atual será perdido. Continuar?",
        action: () => { setItems(c.items); setActiveComanda(c.id); setActiveView("VENDA"); setCartOpen(true); setConfirmData(null); }
      });
      return;
    }
    setItems(c.items);
    setActiveComanda(c.id);
    setActiveView("VENDA");
    setCartOpen(true);
  };

  const filteredProdutos = useMemo(
    () => (produtos as ProdutoPDV[]).filter((p) => {
      const matchesTab = activeTab === "todos" || p.isFavorito;
      const matchesSearch = p.nome.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesTab && matchesSearch;
    }),
    [produtos, activeTab, searchQuery]
  );

  return (
    <div className="h-full w-full bg-[var(--parchment)] overflow-hidden font-sans md:grid md:grid-cols-[1fr_clamp(340px,33vw,420px)]">

      {/* ─── MAIN CONTENT (COLUNA 1) ─── */}
      <div className="h-full flex flex-col overflow-hidden relative z-30">
        
        {/* Header (Fixo no Topo) */}
        <header className="px-4 md:px-6 pt-16 pb-4 md:py-4 border-b dash-border bg-[var(--parchment)] flex flex-shrink-0 items-center justify-between">
          <div className="flex flex-col gap-0.5 shrink-0">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-tighter">{nomeLoja}</h1>
              {/* Network status badge — dinâmico */}
              {isOnline ? (
                pendingCount > 0 ? (
                  <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: "var(--warning-bg)", color: "var(--warning)" }}>
                    {isSyncing
                      ? <><Loader2 size={10} className="animate-spin" /> Sincronizando…</>
                      : <><RefreshCw size={10} /> {pendingCount} pendente{pendingCount > 1 ? "s" : ""}</>
                    }
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest dash-icon-accent px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: "var(--success-bg)", color: "var(--success)" }}>
                    <CheckCircle2 size={10} /> Online
                  </span>
                )
              ) : (
                <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: "var(--danger-bg)", color: "var(--danger)" }}>
                  <AlertTriangle size={10} /> Offline
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs dash-label">
              <span className="font-bold dash-label">Operador: Admin</span>
              <span>•</span>
              <LiveClock />
            </div>
          </div>
          <CashActions isTurnoAberto={isTurnoAberto} insights={insights} onMessage={showToast} />
        </header>

        {/* Dashboard Bar (Resumo Operacional) */}
        <section className="px-4 md:px-6 py-3 md:py-4 bg-[var(--parchment)] flex flex-shrink-0 gap-3 md:gap-6 overflow-x-auto border-b dash-border scrollbar-hide">
          <div className="flex-1 min-w-[160px] md:min-w-[200px] dash-card border dash-border rounded-2xl p-3 md:p-4 flex items-center gap-3 md:gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl dash-icon-accent flex items-center justify-center dash-highlight-text"><Lock size={22}/></div>
            <div>
              <p className="text-xs dash-label font-bold uppercase tracking-wider mb-0.5 flex items-center gap-1">
                Cofre (Dinheiro)
                <InfoTooltip text="Saldo estimado na gaveta: fundo de caixa + vendas em dinheiro − sangrias + reforços do turno atual." position="bottom" />
              </p>
              <p className="text-base md:text-lg font-black tabular-nums">{fmt(insights.vaultCentavos)}</p>
            </div>
          </div>
          <div className="flex-1 min-w-[160px] md:min-w-[200px] dash-card border dash-border rounded-2xl p-3 md:p-4 flex items-center gap-3 md:gap-4">
            <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center ${lowStockItems.length > 0 ? 'bg-[var(--warning-bg)] text-[var(--warning)]' : 'dash-muted dash-label'}`}><Package size={22}/></div>
            <div>
              <p className="text-xs dash-label font-bold uppercase tracking-wider mb-0.5">Estoque</p>
              <p className="text-base md:text-lg font-black">{lowStockItems.length > 0 ? `${lowStockItems.length} Itens Críticos` : 'Normal'}</p>
            </div>
          </div>
          <div className="flex-1 min-w-[160px] md:min-w-[200px] dash-card border dash-border rounded-2xl p-3 md:p-4 flex items-center gap-3 md:gap-4">
            <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center ${isTurnoAberto ? 'dash-icon-accent dash-highlight-text' : 'bg-rose-500/10 text-rose-400'}`}><CheckCircle2 size={22}/></div>
            <div>
              <p className="text-xs dash-label font-bold uppercase tracking-wider mb-0.5">Status</p>
              <p className="text-base md:text-lg font-black uppercase tracking-tighter">{isTurnoAberto ? 'Caixa Aberto' : 'Caixa Fechado'}</p>
            </div>
          </div>
        </section>

        {/* Tab Navigation */}
        <nav className="px-4 md:px-6 py-3 md:py-4 flex flex-shrink-0 gap-2 md:gap-3 border-b dash-border bg-[var(--parchment)] overflow-x-auto scrollbar-hide">
          <button onClick={() => setActiveView("VENDA")} className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeView === "VENDA" ? 'bg-[var(--brasa)] dash-value shadow-lg shadow-[0_4px_12px_rgba(211,84,0,0.15)]' : 'dash-muted dash-label hover:dash-value'}`}>Pedido Balcão</button>
          <button onClick={() => setActiveView("COMANDAS")} className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeView === "COMANDAS" ? 'bg-[var(--brasa)] dash-value shadow-lg shadow-[0_4px_12px_rgba(211,84,0,0.15)]' : 'dash-muted dash-label hover:dash-value'}`}>Pedidos em Aberto <span className="dash-muted px-1.5 py-0.5 rounded-md text-[10px]">{comandas.length}</span></button>
        </nav>

        {/* Main Area (Scroll Interno) */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <AnimatePresence mode="wait">
            {activeView === "VENDA" && (
              <motion.div key="venda" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="h-full flex flex-col">

                {/* Checklist de ativação — exibido apenas no primeiro acesso */}
                {showWelcome && (
                  <div className="mb-6">
                    <SetupChecklist />
                  </div>
                )}

                {/* Busca e Filtros */}
                <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 dash-label" size={18} />
                    <input
                      ref={searchInputRef}
                      autoFocus
                      type="search"
                      inputMode="search"
                      data-testid="pdv-search"
                      placeholder="Bipar código ou digitar produto..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full h-12 dash-muted border dash-border rounded-xl pl-12 pr-10 text-sm font-bold focus:border-[var(--brasa)] focus:dash-muted outline-none transition-all placeholder:text-neutral-600"
                    />
                    <SearchHotspot dismissed={hotspotDismissed} />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setActiveTab("todos")} className={`px-4 h-12 rounded-xl text-xs font-bold border transition-all ${activeTab === "todos" ? 'border-[var(--brasa-border)] dash-icon-accent dash-highlight-text' : 'dash-border dash-muted dash-label hover:dash-value'}`}>Todos</button>
                    <button onClick={() => setActiveTab("favoritos")} className={`px-4 h-12 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${activeTab === "favoritos" ? 'border-[var(--mel-border)] bg-[var(--mel-light)] text-[var(--mel)]' : 'dash-border dash-muted dash-label hover:dash-value'}`}><Star size={14}/> Favoritos</button>
                  </div>
                </div>

                {isLoading ? (
                  <div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin dash-label" size={32}/></div>
                ) : filteredProdutos.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center dash-label opacity-60"><Package size={48} className="mb-4"/><p className="font-bold">Nenhum produto encontrado</p></div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 pb-20 md:pb-0">
                    {optimisticProdutos
                      .filter((p) => {
                        const matchesSearch = p.nome.toLowerCase().includes(searchQuery.toLowerCase());
                        const matchesTab = activeTab === "todos" || (activeTab === "favoritos" && p.isFavorito);
                        return matchesSearch && matchesTab;
                      })
                      .map((p) => (
                        <ProductCard
                          key={p.id}
                          produto={{ id: String(p.id), nome: p.nome, precoCentavos: p.precoCentavos, estoqueAtual: p.estoqueAtual, estoqueMinimo: p.estoqueMinimo, gerenciarEstoque: p.gerenciarEstoque }}
                          fmt={fmt}
                          onAdd={handleAddProduct}
                        />
                      ))}
                  </div>
                )}
              </motion.div>
            )}

            {activeView === "COMANDAS" && (
              <motion.div key="comandas" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                {comandas.length === 0 ? (
                  <div className="h-80 rounded-3xl border-2 border-dashed dash-border flex flex-col items-center justify-center dash-label dash-muted"><ClipboardList size={48} className="mb-4 opacity-20"/><p className="font-bold">Nenhuma comanda aberta</p></div>
                ) : (
                  <LayoutGroup>
                    <motion.div layout className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-20 md:pb-0">
                      {comandas.map((c) => (
                        <motion.button layout key={c.id} onClick={() => selectComanda(c)}
                          whileTap={{ scale: 0.97 }}
                          transition={{ type: "spring", stiffness: 300, damping: 20 }}
                          className="dash-card border dash-border p-6 rounded-3xl flex flex-col gap-4 text-left hover:border-[var(--brasa-border)] transition-colors relative overflow-hidden group shadow-2xl">
                          <div className="flex justify-between items-start">
                            <div className="flex flex-col"><span className="text-xs dash-label font-black uppercase tracking-widest mb-1">Cliente / Mesa</span><span className="text-xl font-black dash-value">{c.clienteNome}</span></div>
                            <OpenTime createdAt={c.createdAt} />
                          </div>
                          <div className="flex items-end justify-between mt-6">
                            <div className="flex -space-x-2">{c.items.slice(0,3).map((it) => <div key={it.produtoId} className="w-8 h-8 rounded-full dash-muted border-2 border-[#13161A] flex items-center justify-center text-xs font-bold dash-label">{it.quantidade}</div>)}{c.items.length > 3 && <div className="w-8 h-8 rounded-full dash-muted border-2 border-[#13161A] flex items-center justify-center text-xs font-bold dash-label">+{c.items.length - 3}</div>}</div>
                            <div className="text-2xl font-black dash-highlight-text tabular-nums tracking-tighter">{fmt(c.items.reduce((acc, i) => acc + (i.precoCentavos * i.quantidade), 0))}</div>
                          </div>
                          <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--brasa)]/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-[var(--brasa-hover)]/10 transition-all" />
                        </motion.button>
                      ))}
                    </motion.div>
                  </LayoutGroup>
                )}
              </motion.div>
            )}

            {activeView === "HISTORICO" && (
              <motion.div key="historico" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="h-full flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <h2 className="text-2xl font-black">Histórico de Vendas</h2>
                    <p className="text-[10px] font-bold dash-label uppercase tracking-widest mt-1">Exibindo registros por data</p>
                  </div>
                  <PremiumDatePicker 
                    selectedDate={selectedHistoryDate} 
                    onDateChange={setSelectedHistoryDate} 
                  />
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                  {historicoQuery.isLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <div key={`skeleton-${i}`} className="h-24 dash-muted rounded-2xl animate-pulse" />
                    ))
                  ) : (historicoQuery.data ?? []).length === 0 ? (
                    <div className="dash-muted border dash-border rounded-3xl p-12 flex flex-col items-center justify-center text-center opacity-50">
                      <Clock size={48} className="mb-6 dash-label" />
                      <p className="font-bold text-lg mb-2">Nenhuma venda nesta data</p>
                      <p className="text-sm dash-label">Tente selecionar outro dia no calendário acima.</p>
                    </div>
                  ) : (
                    (historicoQuery.data ?? []).map((sale) => (
                      <motion.button
                        key={sale.id}
                        type="button"
                        onClick={() => setSelectedSale(sale)}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="w-full text-left dash-card border dash-border p-5 rounded-2xl flex items-center justify-between group hover:border-[var(--brasa-border)] hover:bg-[var(--muted-hover)] active:scale-[0.99] transition-all cursor-pointer"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl dash-muted flex items-center justify-center dash-label group-hover:bg-[var(--brasa-hover)]/10 group-hover:dash-highlight-text transition-colors">
                            {sale.metodoPagto === 'PIX' ? <QrCode size={20} /> : sale.metodoPagto === 'DINHEIRO' ? <Banknote size={20} /> : <CreditCard size={20} />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-black dash-value">Venda #{sale.id.slice(-4)}</span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md dash-muted dash-label uppercase tracking-tighter">{sale.metodoPagto}</span>
                            </div>
                            <p className="text-xs dash-label font-medium mt-1">
                              {new Date(sale.criadoEm).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-black dash-highlight-text tabular-nums tracking-tighter">{fmt(sale.totalCentavos)}</p>
                          <p className="text-[10px] font-bold dash-label opacity-60 uppercase tracking-widest mt-1 group-hover:dash-highlight-text transition-colors">Ver detalhes →</p>
                        </div>
                      </motion.button>
                    ))
                  )}
                </div>
              </motion.div>
            )}

            {activeView === "ESTOQUE" && (
              <motion.div key="estoque" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="h-full flex flex-col gap-6">
                 <div className="flex justify-between items-center dash-muted p-4 rounded-2xl border dash-border">
                   <h2 className="text-xl font-black">Gestão de Estoque</h2>
                   {userRole === "GERENTE" && (
                     <button onClick={() => { setEditingProduct(null); setCrudModalOpen(true); }} className="h-10 px-4 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 bg-[var(--brasa)] hover:bg-[var(--brasa-hover)] dash-value transition-all active:scale-[0.98] shadow-lg shadow-[0_4px_12px_rgba(211,84,0,0.15)]"><Plus size={14}/> Novo</button>
                   )}
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                   {(produtos as ProdutoPDV[]).map((p) => (
                     <motion.div layout key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-[var(--muted)] border dash-border hover:border-[var(--border-md)] transition-all rounded-2xl p-5 flex flex-col gap-3 relative group">
                        {p.estoqueAtual < 5 && <div className="absolute top-4 right-4 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--warning)] opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-[var(--warning)]"></span></div>}
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 dash-muted rounded-lg flex items-center justify-center"><Package size={16} className="dash-label"/></div>
                          <div className="flex-1 min-w-0">
                            <span className="font-bold text-sm leading-tight block truncate">{p.nome}</span>
                            <span className="text-[10px] dash-label font-bold uppercase tracking-wider">{p.categoria || 'Outros'}</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center text-sm pt-2 border-t dash-border">
                          <span className="dash-label font-bold">Estoque:</span>
                          <span className={`${p.estoqueAtual < 5 ? 'text-amber-400 bg-amber-400/10' : 'dash-value dash-muted'} px-2 py-1 rounded-md font-bold tabular-nums`}>{p.estoqueAtual} unid.</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="dash-label font-bold">Venda / Custo:</span>
                          <span className="dash-highlight-text font-black tabular-nums">{fmt(p.precoCentavos)} <span className="dash-label">/ {fmt(p.precoCustoCentavos)}</span></span>
                        </div>
                        {userRole === "GERENTE" && (
                          <div className="flex gap-2 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => { setEditingProduct(p); setCrudModalOpen(true); }} className="flex-1 h-9 dash-muted hover:dash-muted border dash-border rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 dash-value transition-all"><Pencil size={12}/> Editar</button>
                            <button onClick={() => setDeletingProduct(p)} className="h-9 px-3 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 text-rose-400 transition-all"><Trash2 size={12}/></button>
                          </div>
                        )}
                     </motion.div>
                   ))}
                 </div>

                 {/* CRUD Modals */}
                 <QuickAddSheet editProduct={editingProduct} isOpen={crudModalOpen} onClose={() => { setCrudModalOpen(false); setEditingProduct(null); }} onMessage={showToast} />
                 <AnimatePresence>
                   {deletingProduct && <DeleteConfirmModal product={deletingProduct} onConfirm={() => deleteMutation.mutate(deletingProduct.id)} onCancel={() => setDeletingProduct(null)} isPending={deleteMutation.isPending} />}
                 </AnimatePresence>
              </motion.div>
            )}

            {activeView === "RELATORIOS" && (
              <motion.div key="relatorios" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="h-full flex flex-col gap-6">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-2xl font-black">Dashboard de Vendas</h2>
                  <PremiumDatePicker 
                    selectedDate={selectedDashboardDate} 
                    onDateChange={setSelectedDashboardDate} 
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   <div className="dash-card border border-[var(--brasa-border)] rounded-3xl p-6 relative overflow-hidden group">
                      <div className="absolute -right-6 -top-6 w-24 h-24 dash-icon-accent rounded-full blur-2xl group-hover:bg-[var(--brasa-hover)]/20 transition-all"/>
                      <h3 className="dash-highlight-text font-bold text-[10px] uppercase tracking-widest mb-2 flex items-center gap-2"><DollarSign size={14}/> Vendas Hoje</h3>
                      <p className="text-2xl sm:text-3xl md:text-4xl font-black dash-highlight-text tabular-nums tracking-tighter truncate">{fmt(insights?.totalHojeCentavos || 0)}</p>
                   </div>
                   <div className="dash-card border border-blue-500/20 rounded-3xl p-6 relative overflow-hidden group">
                      <div className="absolute -right-6 -top-6 w-24 h-24 dash-muted rounded-full blur-2xl group-hover:bg-[var(--muted)] transition-all"/>
                      <h3 className="dash-label font-bold text-[10px] uppercase tracking-widest mb-2 flex items-center gap-2"><Hash size={14}/> Total de Pedidos</h3>
                      <p className="text-2xl sm:text-3xl md:text-4xl font-black dash-value tabular-nums tracking-tighter">{insights?.qtdHoje || 0}</p>
                   </div>
                   <div className="dash-card border border-purple-500/20 rounded-3xl p-6 relative overflow-hidden group">
                      <div className="absolute -right-6 -top-6 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-all"/>
                      <h3 className="text-purple-500 font-bold text-[10px] uppercase tracking-widest mb-2 flex items-center gap-2">
                        <TrendingUp size={14}/> Ticket Médio
                        <InfoTooltip text="Valor médio por venda hoje. Calculado como: total de vendas ÷ número de pedidos." position="bottom" />
                      </h3>
                      <p className="text-2xl sm:text-3xl md:text-4xl font-black text-purple-400 tabular-nums tracking-tighter truncate">{fmt(insights?.ticketMedioCentavos || 0)}</p>
                   </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ─── SIDE PANEL (CARRINHO / CHECKOUT PRO) (COLUNA DIREITA) ─── */}
      <div className={`fixed inset-0 z-[140] md:hidden bg-black/80 backdrop-blur-md transition-opacity duration-500 ${cartOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setCartOpen(false)} />

      <form
        noValidate
        onSubmit={handleSubmit(onSubmit)}
        className={`
          fixed bottom-0 inset-x-0 z-[150] w-full h-[92dvh] rounded-t-3xl overflow-hidden
          md:static md:inset-auto md:h-full md:rounded-none md:w-auto
          bg-[var(--parchment)]
          md:border-l md:dash-border flex flex-col
          transition-transform duration-300 ease-in-out
          ${cartOpen ? 'translate-y-0' : 'translate-y-full md:translate-y-0'}
          shadow-[0_-20px_40px_rgba(45,45,45,0.12)]
          ${activeComandaId && isMounted ? 'border-t-4 border-[var(--brasa)]' : 'border-t-4 border-transparent'}
        `}
      >
        {/* Drag handle — mobile only */}
        <div className="md:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-[var(--border-md)]" />
        </div>
        {/* Glow Decorativo de Fundo */}
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-[var(--brasa)]/5 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="p-6 md:p-8 border-b dash-border flex items-center justify-between relative z-10 shrink-0">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-[var(--brasa)] animate-pulse" />
              <h2 className="text-xs font-black uppercase tracking-[0.3em] dash-label">Checkout Pro</h2>
            </div>
            <h3 className="text-xl font-black dash-value tracking-tighter">
              {activeComandaId && isMounted ? 'Conta em Aberto' : 'Pedido Direto'}
            </h3>
            {activeComandaId && isMounted && (
              <div className="mt-2 flex items-center gap-1.5 bg-[var(--brasa)]/15 border border-[var(--brasa-border)] px-3 py-1.5 rounded-lg w-fit">
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--brasa)] animate-pulse shrink-0" />
                <p className="text-[10px] dash-highlight-text font-black uppercase tracking-widest">
                  {comandas.find(c => c.id === activeComandaId)?.clienteNome ?? 'EM ATENDIMENTO'}
                </p>
              </div>
            )}
          </div>
          <button type="button" aria-label="Fechar carrinho" onClick={() => setCartOpen(false)} className="md:hidden w-10 h-10 flex items-center justify-center dash-muted hover:dash-muted rounded-full transition-all"><X size={20}/></button>
        </div>

        {/* ─── SCROLLABLE AREA: Mesa Selector + Items ──────────────── */}
        <div className="flex-1 overflow-y-auto overscroll-contain relative z-10 scrollbar-hide">

          {/* ─── Mesa Selector (Cascade) ──────────────────────────── */}
          {isMounted && (
            <div className="px-6 md:px-8 py-4 border-b dash-border">

              {/* ── Segmented Control: Pedido Direto / Mesa ── */}
              <div className="flex gap-1.5 p-1 dash-muted rounded-2xl border dash-border">
                <button
                  type="button"
                  aria-pressed={!vinculadoAMesa}
                  onClick={() => handleToggleVinculado(false)}
                  className={`flex-1 flex items-center justify-center gap-2 h-10 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-150
                    ${!vinculadoAMesa
                      ? "bg-[var(--porcelana)] border border-[var(--border-md)] shadow-[var(--shadow-xs)] dash-value"
                      : "dash-label hover:dash-value"}`}
                >
                  <ShoppingBag size={13} />
                  Balcão
                </button>
                <button
                  type="button"
                  aria-pressed={vinculadoAMesa}
                  onClick={() => handleToggleVinculado(true)}
                  className={`flex-1 flex items-center justify-center gap-2 h-10 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-150
                    ${vinculadoAMesa
                      ? "bg-[var(--brasa-light)] border border-[var(--brasa-border)] dash-highlight-text"
                      : "dash-label hover:dash-value"}`}
                >
                  <TableProperties size={13} />
                  Mesa
                </button>
              </div>

              {/* ── Expansão animada da seleção de mesa ── */}
              <div className={`overflow-hidden transition-all duration-200 ${vinculadoAMesa ? "max-h-[600px] mt-3" : "max-h-0"}`}>
              {vinculadoAMesa && (() => {
                const mesaAtual         = mesasPDV.find((m) => m.id === selectedMesaId);
                const comandaSelecionada = mesaAtual?.comandas.find((c) => c.id === selectedComandaId);
                const isNova            = selectedComandaId === "__nova__";
                const isConfirmed       = !!comandaSelecionada || (isNova && novaComandaConfirmed);

                if (mesasPDVLoading) {
                  return (
                    <div className="mt-4 flex items-center gap-2 dash-label text-xs py-3">
                      <Loader2 size={14} className="animate-spin" /> Carregando mesas...
                    </div>
                  );
                }

                // ── STEP D: Vinculado ─────────────────────────────────
                if (isConfirmed && mesaAtual) {
                  const label = isNova
                    ? (novaComandaNome.trim() || "Sem nome")
                    : (comandaSelecionada?.name ?? `Comanda #${selectedComandaId.slice(-4)}`);
                  return (
                    <div className="mt-3 flex items-center gap-3 dash-icon-accent border border-[var(--brasa-border)] px-4 py-3 rounded-2xl">
                      <div className="w-2 h-2 rounded-full bg-[var(--brasa)] animate-pulse shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] dash-highlight-text opacity-80 font-black uppercase tracking-widest">
                          {isNova ? "Nova Comanda" : "Vinculado"}
                        </p>
                        <p className="text-sm dash-highlight-text font-bold truncate">
                          {mesaAtual.nome} · {label}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setSelectedComandaId(""); setNovaComandaNome(""); setNovaComandaConfirmed(false); }}
                        className="text-[10px] font-black uppercase tracking-widest dash-highlight-text hover:dash-highlight-text px-3 py-1.5 rounded-lg dash-icon-accent hover:bg-[var(--brasa-hover)]/20 border border-[var(--brasa-border)] transition-all"
                      >
                        Trocar
                      </button>
                    </div>
                  );
                }

                // ── STEP B/C: Comanda List + Nova Inline ──────────────
                if (mesaAtual) {
                  const comandasMesa = mesaAtual.comandas;
                  return (
                    <div className="mt-3 space-y-2.5">
                      {/* Mesa header with back button */}
                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => { setSelectedMesaId(""); setSelectedComandaId(""); setNovaComandaNome(""); setNovaComandaConfirmed(false); }}
                          className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest dash-label hover:dash-highlight-text transition-colors"
                        >
                          <ChevronLeft size={12} /> Voltar
                        </button>
                        <p className="text-sm font-black dash-value tracking-tight">{mesaAtual.nome}</p>
                      </div>

                      {/* Nova Comanda Inline Form */}
                      {isNova && !novaComandaConfirmed ? (
                        <div className="space-y-2 dash-muted border dash-border rounded-2xl p-3">
                          <p className="text-[10px] font-black uppercase tracking-widest dash-highlight-text">Nova Comanda</p>
                          <input
                            autoFocus
                            value={novaComandaNome}
                            onChange={(e) => setNovaComandaNome(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") setNovaComandaConfirmed(true); }}
                            placeholder="Nome do cliente (opcional)"
                            className="w-full h-11 dash-muted border dash-border rounded-xl px-4 text-sm font-semibold focus:border-[var(--brasa)] focus:dash-muted outline-none transition-all placeholder:text-neutral-600"
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => { setSelectedComandaId(""); setNovaComandaNome(""); }}
                              className="flex-1 h-10 dash-muted hover:dash-muted border dash-border dash-value font-bold rounded-xl text-xs"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={() => setNovaComandaConfirmed(true)}
                              className="flex-1 h-10 bg-[var(--brasa)] hover:bg-[var(--brasa-hover)] dash-value font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-[0_4px_12px_rgba(211,84,0,0.15)]"
                            >
                              <CheckCircle2 size={13} /> Confirmar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* Existing comandas */}
                          {comandasMesa.length > 0 && (
                            <div className="space-y-1.5">
                              {comandasMesa.map((c) => (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={() => setSelectedComandaId(c.id)}
                                  className="w-full flex items-center justify-between dash-muted hover:dash-muted border dash-border hover:border-[var(--brasa-border)] rounded-xl px-3.5 py-2.5 transition-all group"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <ClipboardList size={14} className="dash-label group-hover:dash-highlight-text transition-colors shrink-0" />
                                    <span className="text-sm font-bold dash-value truncate">
                                      {c.name ?? `Comanda #${c.id.slice(-4)}`}
                                    </span>
                                  </div>
                                  <span className="text-xs font-black tabular-nums dash-highlight-text shrink-0 ml-2">
                                    {fmtBRL(c.totalCentavos)}
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}

                          {/* + Nova Comanda */}
                          <button
                            type="button"
                            onClick={() => { setSelectedComandaId("__nova__"); setNovaComandaNome(""); setNovaComandaConfirmed(false); }}
                            className="w-full flex items-center justify-center gap-2 dash-icon-accent hover:bg-[var(--brasa-hover)]/15 border border-dashed border-[var(--brasa-border)] hover:border-[var(--brasa)] dash-highlight-text font-black text-xs uppercase tracking-widest rounded-xl px-4 py-3 transition-all"
                          >
                            <Plus size={14} /> Nova Comanda
                          </button>
                        </>
                      )}
                    </div>
                  );
                }

                // ── STEP A: Mesa Grid ─────────────────────────────────
                return (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-black uppercase tracking-widest dash-label">Selecione a Mesa</p>
                      <button
                        type="button"
                        onClick={() => fetchMesasPDV()}
                        aria-label="Atualizar mesas"
                        className="dash-label hover:dash-highlight-text transition-colors p-1"
                      >
                        <RefreshCw size={12} className={mesasPDVLoading ? "animate-spin" : ""} />
                      </button>
                    </div>
                    {mesasPDV.length === 0 ? (
                      <div className="dash-muted border border-dashed dash-border rounded-xl py-6 text-center">
                        <p className="text-xs dash-label font-semibold">Nenhuma mesa configurada.</p>
                        <p className="text-[10px] dash-subtitle mt-1">Cadastre em Configurações → Mesas.</p>
                      </div>
                    ) : (
                      <div className="max-h-52 overflow-y-auto overscroll-contain scrollbar-hide -mx-1 px-1">
                        <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                          {mesasPDV.map((m) => {
                            const ocupada = m.comandas.length > 0;
                            const total   = m.comandas.reduce((acc, c) => acc + c.totalCentavos, 0);
                            return (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => ocupada ? handleCarregarMesaOcupada(m) : setSelectedMesaId(m.id)}
                                aria-label={`${m.nome} — ${ocupada ? "ocupada" : "livre"}`}
                                className={`relative flex flex-col items-center justify-center gap-1 rounded-xl py-3 px-2 border transition-all duration-150 text-center min-h-[64px]
                                  ${ocupada
                                    ? "bg-[var(--mel-light)] border-[var(--mel)] hover:brightness-95"
                                    : "bg-[var(--success-bg)] border-[var(--success)]/30 hover:border-[var(--success)]/60 hover:brightness-95"}`}
                              >
                                {/* Status dot */}
                                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${ocupada ? "bg-[var(--mel)]" : "bg-[var(--success)]"}`} />

                                {/* Nome */}
                                <span className={`text-xs font-black leading-tight truncate w-full ${ocupada ? "text-[var(--warning)]" : "text-[var(--success)]"}`}>
                                  {m.nome}
                                </span>

                                {/* Status label */}
                                {ocupada ? (
                                  <span className="text-[9px] font-bold text-[var(--warning)] opacity-80 tabular-nums">
                                    {fmtBRL(total)}
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-bold text-[var(--success)] opacity-70 uppercase tracking-wider">
                                    Livre
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
              </div>
            </div>
          )}

          {/* ─── Items List ─────────────────────────────────────── */}
          <div className="px-4 md:px-6 lg:px-8 py-4 md:py-6">
          <AnimatePresence initial={false}>
            {!isMounted || items.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col items-center justify-center text-center px-6 gap-4 opacity-40">
                <ShoppingBag size={48} className="dash-label" />
                <div className="space-y-1">
                  <p className="font-bold dash-value">Aguardando o primeiro item para brilhar!</p>
                  <p className="text-sm dash-label">Selecione produtos no catálogo.</p>
                </div>
              </motion.div>
            ) : (
              <ul className="space-y-3">
                {items.map(item => (
                  <SwipeCartItem
                    key={item.produtoId}
                    item={item}
                    fmt={fmt}
                    onIncrement={incrementItem}
                    onDecrement={decrementItem}
                    onRemove={removeItem}
                    onTogglePrepared={togglePrepared}
                  />
                ))}
              </ul>
            )}
          </AnimatePresence>
          </div>
        </div>

        <footer className="p-4 md:p-6 pb-10 md:pb-6 bg-[var(--porcelana)] border-t dash-border space-y-3 md:space-y-4 relative z-10 shrink-0">
          <div className="flex flex-col gap-1">
            
            <div className="flex items-center justify-between dash-muted p-4 rounded-3xl border dash-border shadow-inner">
              <div className="flex flex-col items-start gap-0.5">
                <span className="text-[9px] font-black uppercase tracking-[0.3em] dash-label">Total</span>
                <button
                  type="button"
                  data-testid="btn-abrir-desconto"
                  onClick={() => setDiscountModalOpen(true)}
                  className="text-[9px] dash-label hover:dash-highlight-text font-bold uppercase tracking-widest transition-all flex items-center gap-1"
                >
                  {descontoCentavos > 0 ? (
                    <span data-testid="desconto-valor" className="text-rose-400 flex items-center gap-1">
                      -{fmt(descontoCentavos)} <X size={9} onClick={(e) => { e.stopPropagation(); setDesconto(0); }} />
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      + Desconto
                      <InfoTooltip text="Aplica um desconto em reais no total do pedido. O valor original fica riscado para o cliente ver." position="top" />
                    </span>
                  )}
                </button>
              </div>
              <div className="flex flex-col items-end min-w-0">
                {descontoCentavos > 0 && <span data-testid="subtotal-riscado" className="text-[10px] dash-subtitle line-through tabular-nums font-bold leading-none mb-1">{fmt(subtotal)}</span>}
                <span data-testid="total-grande" className="text-2xl sm:text-3xl md:text-4xl font-black dash-highlight-text tabular-nums tracking-tighter leading-none drop-shadow-[0_0_15px_rgba(52,211,153,0.15)] truncate max-w-[160px] sm:max-w-none">
                  {isMounted ? fmt(total) : 'R$ 0,00'}
                </span>
              </div>
            </div>
          </div>

          {/* ─── Split Payment Header ─── */}
          {/* ─── Seção de pagamento — oculta no modo Abrir Mesa ─── */}
          {!isModoAbrirMesa && (
          <div className="grid grid-cols-3 gap-2 dash-muted border dash-border rounded-2xl p-3">
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-[8px] font-black uppercase tracking-widest dash-label">Total</span>
              <span data-testid="cart-total" className="text-base font-black tabular-nums tracking-tighter dash-value">{isMounted ? fmt(total) : 'R$ 0,00'}</span>
            </div>
            <div className="flex flex-col items-center gap-0.5 border-x dash-border">
              <span className="text-[8px] font-black uppercase tracking-widest dash-label">Pago</span>
              <span className={`text-base font-black tabular-nums tracking-tighter ${isMounted && splitPago > 0 ? 'dash-highlight-text' : 'dash-subtitle'}`}>{isMounted ? fmt(splitPago) : 'R$ 0,00'}</span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-[8px] font-black uppercase tracking-widest dash-label">Restante</span>
              <span className={`text-base font-black tabular-nums tracking-tighter ${isMounted && splitRestante === 0 ? 'dash-highlight-text' : 'text-rose-400'}`}>
                {isMounted ? (splitRestante === 0 && splitTroco > 0 ? `+${fmt(splitTroco)}` : fmt(splitRestante)) : 'R$ 0,00'}
              </span>
            </div>
          </div>
          )}

          {/* ─── Split Input + Method Buttons ─── */}
          {!isModoAbrirMesa && (
          <div className="flex flex-col gap-2">
            <input
              ref={splitInputRef}
              type="number"
              step="0.01"
              inputMode="decimal"
              data-testid="split-valor-input"
              placeholder={splitRestante > 0 ? (splitRestante / 100).toFixed(2) : "0,00"}
              value={splitInputValor}
              onChange={e => setSplitInputValor(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSplitPagamento(pagamentoType); } }}
              className="w-full h-14 dash-muted border dash-border rounded-2xl px-5 text-2xl font-black text-center focus:border-[var(--brasa)] focus:dash-muted outline-none transition-all placeholder:dash-subtitle tabular-nums"
            />
            <div className="grid grid-cols-4 gap-2">
              {paymentMethods.map(m => (
                <button
                  type="button"
                  key={m.value}
                  data-testid={`btn-metodo-${m.value.toLowerCase()}`}
                  onClick={() => addSplitPagamento(m.value)}
                  className="flex flex-col items-center justify-center py-3 rounded-2xl border transition-all duration-150 dash-border dash-muted dash-label hover:border-[var(--brasa-border)] hover:dash-value active:scale-95"
                >
                  <m.icon size={18}/>
                  <span className="text-[8px] font-black mt-1 uppercase tracking-[0.08em]">{m.label}</span>
                </button>
              ))}
            </div>
            {/* Quick amounts for cash */}
            <div className="grid grid-cols-4 gap-1.5">
              {[10, 20, 50, 100].map(val => (
                <button
                  type="button"
                  key={val}
                  onClick={() => { setSplitInputValor(String(val)); }}
                  className="dash-muted hover:dash-muted border dash-border rounded-lg py-2 text-[10px] font-black dash-label transition-all active:scale-95"
                >
                  R$ {val}
                </button>
              ))}
            </div>
          </div>
          )}

          {/* ─── Split List ─── */}
          <AnimatePresence>
            {splitPagamentos.length > 0 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="flex flex-col gap-1.5 overflow-hidden"
              >
                {splitPagamentos.map((p, i) => (
                  <motion.div
                    key={`${p.metodo}-${i}`}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    className="flex items-center justify-between dash-muted border dash-border rounded-xl px-4 py-2.5"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-black uppercase tracking-widest dash-label">{p.metodo.replace('_', ' ')}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-black tabular-nums dash-value">{fmt(p.valorCentavos)}</span>
                      <button
                        type="button"
                        onClick={() => removeSplitPagamento(i)}
                        className="w-6 h-6 rounded-lg flex items-center justify-center dash-label hover:text-rose-400 transition-colors"
                      >
                        <X size={12}/>
                      </button>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleSaveToComanda}
              disabled={items.length === 0}
              className="flex-1 h-12 bg-transparent border dash-border hover:dash-muted disabled:opacity-20 dash-label rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
            >
              Salvar Pedido <ClipboardList size={14}/>
            </button>
          </div>

          <motion.button
            type="submit"
            data-testid="btn-finalizar-venda"
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            disabled={
              items.length === 0 ||
              (!isModoAbrirMesa && !isModoEnviarAdicionais && !isModoFecharConta && !isSplitValid) ||
              (isModoEnviarAdicionais && !hasNewItems) ||
              mutation.isPending ||
              abrindoMesa ||
              !isTurnoAberto
            }
            className={`
              w-full h-[72px] disabled:opacity-40 disabled:cursor-not-allowed
              text-white rounded-3xl font-black text-xl
              transition-all flex items-center justify-center gap-3 relative overflow-hidden group
              ${isModoFecharConta
                ? "bg-[var(--success)] hover:brightness-90 shadow-[0_8px_32px_rgba(45,106,79,0.35)] hover:shadow-[0_12px_40px_rgba(45,106,79,0.45)]"
                : "bg-[var(--brasa)] hover:bg-[var(--brasa-hover)] shadow-[0_8px_32px_rgba(211,84,0,0.35)] hover:shadow-[0_12px_40px_rgba(211,84,0,0.45)]"
              }
            `}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none" />
            {btnPrincipalContent.icon}
            <span>{btnPrincipalContent.label}</span>
          </motion.button>

          {mutation.isError && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-red-400 bg-red-950/20 p-4 rounded-2xl border border-red-500/20 flex items-center gap-2 text-xs font-bold mt-2">
              <AlertTriangle size={14} />
              {mutation.error?.message}
            </motion.div>
          )}
        </footer>
      </form>

      {/* Botão flutuante do carrinho no Mobile */}
      {items.length > 0 && (
        <button onClick={() => setCartOpen(true)} className="md:hidden fixed bottom-[max(calc(env(safe-area-inset-bottom)+72px),5.5rem)] left-4 right-4 z-[110] bg-[var(--brasa)] hover:bg-[var(--brasa-hover)] dash-value rounded-2xl h-14 flex items-center justify-between px-6 shadow-[0_10px_40px_rgba(16,185,129,0.3)] active:scale-[0.98] transition-all">
          <div className="flex items-center gap-3">
            <ShoppingCart size={20} />
            <span className="font-bold text-sm">{isMounted ? items.length : 0} {items.length === 1 ? 'item' : 'itens'}</span>
          </div>
          <span className="font-black text-lg">
            {isMounted ? fmt(total) : 'R$ 0,00'}
          </span>
        </button>
      )}

      {/* ─── MODALS ─── */}
      <AnimatePresence>
        {comandaModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={() => setComandaModalOpen(false)} />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="dash-card w-full max-w-md p-8 rounded-3xl border dash-border relative shadow-[0_0_80px_rgba(0,0,0,0.5)] max-h-[90dvh] overflow-y-auto">
              <h2 className="text-2xl font-black mb-6 tracking-tighter">Nomear Pedido</h2>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest dash-label">Nome do Cliente</label>
                  <input autoFocus type="text" value={comandaName} onChange={(e) => setComandaName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && confirmSaveComanda()} placeholder="Ex: João Silva" className="w-full h-16 dash-muted border dash-border rounded-2xl px-6 text-xl font-bold focus:border-[var(--brasa)] focus:dash-muted outline-none transition-all placeholder:dash-subtitle"/>
                </div>
                <button onClick={confirmSaveComanda} className="w-full h-16 bg-[var(--brasa)] hover:bg-[var(--brasa-hover)] dash-value rounded-2xl font-black text-lg transition-all shadow-xl shadow-[0_4px_12px_rgba(211,84,0,0.15)] mt-4">SALVAR PEDIDO</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── CONNECTIVITY TOAST ─── */}
      <ConnectivityToast
        isOnline={isOnline}
        isSyncing={isSyncing}
        pendingCount={pendingCount}
        justReconnected={justReconnected}
      />

      {/* ─── CHANGE OVERLAY ─── */}
      <AnimatePresence>
        {changeOverlay && (
          <ChangeOverlay
            troco={changeOverlay.troco}
            onDismiss={() => {
              if (changeOverlayTimerRef.current) clearTimeout(changeOverlayTimerRef.current);
              clearCart();
              setCartOpen(false);
              resetForm();
              resetSplitState();
              setChangeOverlay(null);
              setTimeout(() => searchInputRef.current?.focus(), 80);
            }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        {confirmData && <ConfirmDialog isOpen={!!confirmData} title={confirmData.title} message={confirmData.message} onConfirm={confirmData.action} onCancel={() => setConfirmData(null)} />}
        {discountModalOpen && <DiscountModal isOpen={discountModalOpen} onApply={(val) => { setDesconto(val); setDiscountModalOpen(false); showToast("Desconto aplicado!"); }} onCancel={() => setDiscountModalOpen(false)} />}
      </AnimatePresence>

      {/* ─── GRADUATION MODAL ─── */}
      <GraduationModal open={graduationOpen} onClose={() => setGraduationOpen(false)} />

      {/* ─── SALE DETAIL SHEET ─── */}
      <SaleDetailSheet sale={selectedSale} onClose={() => setSelectedSale(null)} />

      {/* ─── RECEIPT MODAL ─── */}
      <ReceiptModal
        isOpen={receiptOpen}
        data={receiptData}
        onClose={() => setReceiptOpen(false)}
      />
    </div>
  );
}

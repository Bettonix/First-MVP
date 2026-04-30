"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { updateAccessibilitySettings } from "@/app/actions/accessibility";
import {
  ShoppingCart, Banknote, QrCode, CreditCard,
  Loader2, Lock, Minus, ChevronUp,
  DollarSign, Hash, TrendingUp, Star, LayoutGrid, Clock,
  Package, AlertTriangle, Users, Save, X, CheckCircle2,
  ClipboardList, ShoppingBag, Printer, MessageCircle, Search,
  Pencil, Trash2, Plus, Sun, Moon,
} from "lucide-react";
import { useCartStore, CartItem } from "@/store/useCartStore";
import { useTabStore, Comanda } from "@/store/useTabStore";
import { getProdutosPDV, depleteStock, deleteProduto } from "@/app/actions/produtos";
import { registrarVenda } from "@/app/actions/vendas";
import { QuickAddSheet, DeleteConfirmModal } from "./QuickAddSheet";
import { CashActions } from "./CashActions";
import { PremiumDatePicker } from "./DatePicker";
import { fmtBRL, safeCentavos } from "@/lib/currency";
import { useState, useEffect, useRef, useOptimistic, useTransition } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";

// ─── Utility Functions ────────────────────────────────────────
const sanitize = (val: any) => {
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
      className={`fixed top-6 left-1/2 z-[200] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border backdrop-blur-xl ${
        type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
      }`}
    >
      {type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
      <span className="text-sm font-bold tracking-tight">{message}</span>
      <button onClick={onClose} className="ml-2 hover:opacity-70 transition-opacity"><X size={14} /></button>
    </motion.div>
  );
}

// ─── Custom Confirm Dialog ────────────────────────────────────
function ConfirmDialog({ isOpen, title, message, onConfirm, onCancel }: { isOpen: boolean, title: string, message: string, onConfirm: () => void, onCancel: () => void }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-[#13161A] w-full max-w-sm p-8 rounded-[32px] border border-white/10 relative shadow-2xl flex flex-col items-center text-center">
        <h3 className="text-lg font-black mb-2">{title}</h3>
        <p className="text-neutral-400 text-sm mb-6">{message}</p>
        <div className="w-full flex gap-3">
          <button onClick={onCancel} className="flex-1 h-12 bg-white/5 hover:bg-white/10 rounded-xl font-bold text-sm">Voltar</button>
          <button onClick={onConfirm} className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold text-sm">Confirmar</button>
        </div>
      </motion.div>
    </div>
  );
}


// ─── Schemas & Helpers ─────────────────────────────────────────

const checkoutSchema = z.object({
  pagamento: z.enum(['PIX', 'DINHEIRO', 'CARTAO', 'MISTO']),
  valorRecebido: z.coerce.number().min(0).default(0),
  valorPix: z.coerce.number().min(0).default(0),
  valorDinheiro: z.coerce.number().min(0).default(0),
});

type CheckoutForm = z.infer<typeof checkoutSchema>;

const fmt = (cents: number | null | undefined) => fmtBRL(safeCentavos(cents));

function safeIdToNumber(id: string): number {
  const numeric = id.replace(/[^0-9]/g, '');
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
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-[#13161A] w-full max-w-sm p-8 rounded-[32px] border border-white/10 relative shadow-2xl">
        <h3 className="text-lg font-black mb-4 text-center">Aplicar Desconto</h3>
        <div className="flex flex-col gap-4">
          <input
            autoFocus
            type="number"
            step="0.01"
            placeholder="0,00"
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { onApply(Math.round(Number(val.replace(',','.')) * 100)); setVal(""); } }}
            className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 text-2xl font-black text-center focus:border-emerald-500 focus:bg-white/10 outline-none transition-all placeholder:text-neutral-700"
          />
          <div className="flex gap-3">
            <button onClick={onCancel} className="flex-1 h-12 bg-white/5 hover:bg-white/10 rounded-xl font-bold text-sm">Cancelar</button>
            <button onClick={() => { onApply(Math.round(Number(val.replace(',','.')) * 100)); setVal(""); }} className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold text-sm">Aplicar</button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

interface PDVContainerProps {
  isTurnoAberto: boolean;
  nomeLoja: string;
  insights: {
    totalHojeCentavos: number;
    qtdHoje: number;
    ticketMedioCentavos: number;
    vaultCentavos: number;
  };
  lowStockItems: { id: string; nome: string; estoqueAtual: number }[];
  recentSales: RecentSale[];
  initialProdutos: any[];
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
  return <span className="text-xs text-neutral-500 font-medium tabular-nums">{time}</span>;
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
  return <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">{diff}</span>;
}

// ─── Main Component ───────────────────────────────────────────

export function PDVContainer({ isTurnoAberto, nomeLoja, insights, lowStockItems, recentSales, initialProdutos }: PDVContainerProps) {
  const { items, addItem, removeItem, incrementItem, decrementItem, togglePrepared, clearCart, totalCentavos, subtotalCentavos, descontoCentavos, setDesconto, setItems } = useCartStore();
  const { comandas, saveComanda, updateComandaItems, activeComandaId, setActiveComanda, closeComanda } = useTabStore();
  
  const { data: produtos = initialProdutos, isLoading } = useQuery({
    queryKey: ['produtos-pdv'],
    queryFn: async () => await getProdutosPDV(),
    initialData: initialProdutos
  });

  const subtotal = subtotalCentavos();
  const total = totalCentavos();
  const [cartOpen, setCartOpen] = useState(false);
  const [produtosList, setProdutosList] = useState<any[]>(initialProdutos || []);
  const [optimisticProdutos, addOptimisticProduto] = useOptimistic(
    produtosList,
    (state, action: { type: 'update' | 'delete' | 'add', payload: any }) => {
      if (action.type === 'delete') return state.filter(p => p.id !== action.payload);
      if (action.type === 'update') return state.map(p => p.id === action.payload.id ? { ...p, ...action.payload } : p);
      if (action.type === 'add') return [...state, action.payload];
      return state;
    }
  );

  useEffect(() => { if (produtos) setProdutosList(produtos); }, [produtos]);

  const [activeTab, setActiveTab] = useState<"todos" | "favoritos">("todos");
  const [activeView, setActiveView] = useState<"VENDA" | "COMANDAS" | "HISTORICO" | "ESTOQUE" | "RELATORIOS">("VENDA");
  
  const [comandaModalOpen, setComandaModalOpen] = useState(false);
  const [comandaName, setComandaName] = useState("");
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [discountModalOpen, setDiscountModalOpen] = useState(false);
  const [lastSaleTotal, setLastSaleTotal] = useState(0);
  const [lastSaleItems, setLastSaleItems] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [selectedHistoryDate, setSelectedHistoryDate] = useState(new Date());
  const [selectedDashboardDate, setSelectedDashboardDate] = useState(new Date());
  const [isMounted, setIsMounted] = useState(false);
  const [isSunlightActive, setIsSunlightActive] = useState(false);
  const [isPendingTheme, startThemeTransition] = useTransition();

  const toggleSunlight = () => {
    const isSunlight = document.documentElement.classList.contains('sunlight-mode');
    const nextTheme = isSunlight ? 'dark' : 'sunlight';

    // Optimistic: aplica a classe imediatamente para feedback visual instantâneo
    document.documentElement.classList.toggle('sunlight-mode', !isSunlight);
    document.body.classList.toggle('sunlight-mode', !isSunlight);
    setIsSunlightActive(!isSunlight);

    startThemeTransition(async () => {
      await updateAccessibilitySettings(nextTheme);
    });
  };

  useEffect(() => {
    setIsMounted(true);
    setIsSunlightActive(document.documentElement.classList.contains('sunlight-mode'));
  }, []);

  // CRUD & Feedback State
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [confirmData, setConfirmData] = useState<{ title: string, message: string, action: () => void } | null>(null);
  const [crudModalOpen, setCrudModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [deletingProduct, setDeletingProduct] = useState<any>(null);
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();

  const showToast = (message: string, type: 'success' | 'error' = 'success') => setToast({ message, type });

  const deleteMutation = useMutation({
    mutationFn: async (produtoId: string) => {
      const res = await deleteProduto(produtoId);
      if (!res.success) throw new Error(res.error || "Erro");
    },
    onMutate: async (produtoId) => {
      await queryClient.cancelQueries({ queryKey: ['produtos-pdv'] });
      const prev = queryClient.getQueryData(['produtos-pdv']);
      queryClient.setQueryData(['produtos-pdv'], (old: unknown) =>
        Array.isArray(old) ? old.filter((p: any) => p.id !== produtoId) : old
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

  const { register, handleSubmit, watch, formState: { errors }, reset: resetForm, setValue } = useForm<CheckoutForm>({
    resolver: zodResolver(checkoutSchema) as any,
    defaultValues: { 
      pagamento: 'DINHEIRO',
      valorRecebido: 0,
      valorPix: 0,
      valorDinheiro: 0
    }
  });

  const pagamentoType = watch("pagamento");
  const valorRecebidoRaw = watch("valorRecebido");
  
  // Financial normalization helper (Cents Rule)
  const toCents = (val: any) => Math.round(sanitize(val) * 100);

  const valorRecebido = toCents(valorRecebidoRaw);
  const troco = pagamentoType === 'DINHEIRO' ? Math.max(0, valorRecebido - total) : 0;
  
  const valorPixRaw = watch("valorPix");
  const valorDinheiroRaw = watch("valorDinheiro");
  
  const mistoPixCentavos = toCents(valorPixRaw);
  const mistoDinheiroCentavos = toCents(valorDinheiroRaw);
  const mistoTotalCentavos = mistoPixCentavos + mistoDinheiroCentavos;
  
  const faltaMisto = Math.max(0, total - mistoTotalCentavos);
  const trocoMisto = mistoTotalCentavos > total && mistoDinheiroCentavos > (total - mistoPixCentavos) 
    ? mistoTotalCentavos - total 
    : 0;
    
  const isMistoValid = pagamentoType === 'MISTO' && mistoTotalCentavos >= total;


  const mutation = useMutation({
    mutationFn: async (data: CheckoutForm) => {
      const cartSerialized = items.map(item => ({
        produtoId: item.produtoId,
        nome: item.nome,
        quantidade: item.quantidade,
        precoCentavos: item.precoCentavos,
      }));

      // Base Payload
      const payload: any = {
        cart: cartSerialized,
        pagamento: {
          tipo: data.pagamento,
          pixId: undefined,
          pixCentavos: 0,
          dinheiroCentavos: 0
        }
      };

      // Case-specific payload refinement
      if (data.pagamento === 'DINHEIRO') {
        payload.pagamento.dinheiroCentavos = total; // Net revenue
      } else if (data.pagamento === 'PIX') {
        payload.pagamento.pixCentavos = total;
        payload.pagamento.pixId = `PIX-${Date.now()}`; // Unique ID placeholder
      } else if (data.pagamento === 'CARTAO') {
        payload.pagamento.cartaoCentavos = total;
        payload.pagamento.pixId = `CARD-${Date.now()}`;
      } else if (data.pagamento === 'MISTO') {
        payload.pagamento.pixCentavos = Math.round(sanitize(data.valorPix) * 100);
        payload.pagamento.dinheiroCentavos = Math.round(sanitize(data.valorDinheiro) * 100);
        payload.pagamento.pixId = `MISTO-${Date.now()}`;
      }

      console.log("🚀 Auditoria de Payload (Supabase):", payload);
      
      const res = await registrarVenda(payload);

      if (!res.success) {
        console.error("❌ Erro na Server Action:", res.error);
        throw new Error(res.error);
      }
      
      return res;
    },
    onSuccess: async () => {
      setLastSaleTotal(total);
      setLastSaleItems([...items]);
      
      // Invalida a query para obter o estoque atualizado do servidor
      queryClient.invalidateQueries({ queryKey: ['produtos-pdv'] });

      if (activeComandaId) closeComanda(activeComandaId);
      
      clearCart();
      setCartOpen(false);
      resetForm();
      setSuccessModalOpen(true);
      showToast("Venda finalizada com sucesso!");
    },
    onError: (err: Error) => {
      showToast(err.message, 'error');
    },
  });

  const onSubmit = (data: CheckoutForm) => {
    console.log("📝 Form Data Raw:", data);
    
    if (items.length === 0) return showToast("Carrinho vazio.", 'error');

    if (pagamentoType === 'DINHEIRO') {
      const recebido = Math.round(sanitize(data.valorRecebido) * 100);
      if (recebido < total) return showToast(`Valor insuficiente. Falta ${fmt(total - recebido)}`, 'error');
    }

    if (pagamentoType === 'MISTO') {
      const pix = Math.round(sanitize(data.valorPix) * 100);
      const money = Math.round(sanitize(data.valorDinheiro) * 100);
      const sum = pix + money;
      
      if (sum < total) {
        return showToast(`Pagamento insuficiente. Falta ${fmt(total - sum)}`, 'error');
      }
      if (sum > total) {
        return showToast(`O pagamento misto deve ser exato. Excedente: ${fmt(sum - total)}`, 'error');
      }
    }

    mutation.mutate(data);
  };

  const paymentMethods = [
    { value: 'DINHEIRO' as const, label: 'Dinheiro', icon: Banknote },
    { value: 'PIX' as const, label: 'Pix', icon: QrCode },
    { value: 'CARTAO' as const, label: 'Cartão', icon: CreditCard },
    { value: 'MISTO' as const, label: 'Misto', icon: LayoutGrid },
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

  const confirmSaveComanda = () => {
    if (!comandaName) return;
    saveComanda(comandaName, items);
    clearCart();
    setComandaName("");
    setComandaModalOpen(false);
    setCartOpen(false);
  };

  const clearCartWithConfirm = () => {
    if (items.length === 0) return;
    setConfirmData({
      title: "Esvaziar Carrinho?",
      message: "Todos os itens adicionados serão removidos. Deseja continuar?",
      action: () => { clearCart(); setConfirmData(null); }
    });
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

  const filteredProdutos = produtos.filter((p: any) => {
    const matchesTab = activeTab === "todos" || p.isFavorito;
    const matchesSearch = p.nome.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <div className="h-screen w-full bg-[#0B0D11] overflow-hidden text-neutral-100 font-sans lg:grid lg:grid-cols-[72px_1fr_400px]">
      
      {/* ─── SIDEBAR (COLUNA 1) ─── */}
      <aside className="hidden lg:flex flex-col items-center py-6 border-r border-white/5 bg-[#0B0D11] z-[100]">
        <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center mb-8 shadow-lg shadow-emerald-500/20">
          <LayoutGrid size={20} className="text-white" />
        </div>
        <nav className="flex flex-col gap-4 flex-1">
          <button onClick={() => setActiveView("VENDA")} className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all group relative border ${activeView === 'VENDA' || activeView === 'COMANDAS' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'text-neutral-500 hover:text-emerald-400 hover:bg-emerald-500/10 border-transparent'}`}>
            <ShoppingCart size={20} />
            <span className="absolute left-full ml-4 bg-neutral-800 text-white text-xs px-2 py-1.5 rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-all whitespace-nowrap z-[110] shadow-xl border border-white/10">Balcão</span>
          </button>
          <button onClick={() => setActiveView("HISTORICO")} className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all group relative border ${activeView === 'HISTORICO' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'text-neutral-500 hover:text-emerald-400 hover:bg-emerald-500/10 border-transparent'}`}>
            <Clock size={20} />
            <span className="absolute left-full ml-4 bg-neutral-800 text-white text-xs px-2 py-1.5 rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-all whitespace-nowrap z-[110] shadow-xl border border-white/10">Histórico</span>
          </button>
          <button onClick={() => setActiveView("ESTOQUE")} className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all group relative border ${activeView === 'ESTOQUE' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'text-neutral-500 hover:text-emerald-400 hover:bg-emerald-500/10 border-transparent'}`}>
            <Package size={20} />
            <span className="absolute left-full ml-4 bg-neutral-800 text-white text-xs px-2 py-1.5 rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-all whitespace-nowrap z-[110] shadow-xl border border-white/10">Estoque</span>
          </button>
          <button onClick={() => setActiveView("RELATORIOS")} className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all group relative border ${activeView === 'RELATORIOS' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'text-neutral-500 hover:text-emerald-400 hover:bg-emerald-500/10 border-transparent'}`}>
            <TrendingUp size={20} />
            <span className="absolute left-full ml-4 bg-neutral-800 text-white text-xs px-2 py-1.5 rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-all whitespace-nowrap z-[110] shadow-xl border border-white/10">Dashboard</span>
          </button>

          <div className="w-8 h-[1px] bg-white/5 mx-auto my-2" />

          <button 
            type="button"
            onClick={toggleSunlight} 
            disabled={isPendingTheme}
            className="w-12 h-12 rounded-xl flex items-center justify-center text-neutral-500 hover:text-amber-400 hover:bg-amber-400/10 transition-all group relative"
          >
            {isPendingTheme ? <Loader2 size={18} className="animate-spin" /> : isSunlightActive ? <Moon size={20} /> : <Sun size={20} />}
            <span className="absolute left-full ml-4 bg-neutral-800 text-white text-xs px-2 py-1.5 rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-all whitespace-nowrap z-[110] shadow-xl border border-white/10">{isSunlightActive ? 'Modo Escuro' : 'Modo Sol'}</span>
          </button>
        </nav>
        <button onClick={() => { clearCart(); window.location.href='/login'; }} className="w-12 h-12 rounded-xl text-neutral-500 hover:text-rose-400 hover:bg-rose-500/10 flex items-center justify-center transition-all group relative mt-auto">
          <Lock size={20} />
          <span className="absolute left-full ml-4 bg-neutral-800 text-white text-xs px-2 py-1.5 rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-all whitespace-nowrap z-[110] shadow-xl border border-white/10">Sair</span>
        </button>
      </aside>

      {/* ─── MAIN CONTENT (COLUNA 2) ─── */}
      <div className="h-full flex flex-col overflow-hidden relative z-30">
        
        {/* Header (Fixo no Topo) */}
        <header className="px-6 py-4 border-b border-white/5 bg-[#0B0D11] flex flex-shrink-0 items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-tighter">{nomeLoja}</h1>
              <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                <CheckCircle2 size={12} /> Nuvem
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-neutral-500">
              <span className="font-bold text-neutral-400">Operador: Admin</span>
              <span>•</span>
              <LiveClock />
            </div>
          </div>
          <CashActions isTurnoAberto={isTurnoAberto} insights={insights} onMessage={showToast} />
        </header>

        {/* Dashboard Bar (Resumo Operacional) */}
        <section className="px-6 py-4 bg-[#0B0D11] flex flex-shrink-0 gap-6 overflow-x-auto border-b border-white/5 scrollbar-hide">
          <div className="flex-1 min-w-[200px] bg-[#13161A] border border-white/10 rounded-2xl p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400"><Lock size={24}/></div>
            <div>
              <p className="text-xs text-neutral-500 font-bold uppercase tracking-wider mb-0.5">Cofre (Dinheiro)</p>
              <p className="text-lg font-black tabular-nums">{fmt(insights.vaultCentavos)}</p>
            </div>
          </div>
          <div className="flex-1 min-w-[200px] bg-[#13161A] border border-white/10 rounded-2xl p-4 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${lowStockItems.length > 0 ? 'bg-amber-500/10 text-amber-400' : 'bg-blue-500/10 text-blue-400'}`}><Package size={24}/></div>
            <div>
              <p className="text-xs text-neutral-500 font-bold uppercase tracking-wider mb-0.5">Estoque</p>
              <p className="text-lg font-black">{lowStockItems.length > 0 ? `${lowStockItems.length} Itens Críticos` : 'Normal'}</p>
            </div>
          </div>
          <div className="flex-1 min-w-[200px] bg-[#13161A] border border-white/10 rounded-2xl p-4 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isTurnoAberto ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}><CheckCircle2 size={24}/></div>
            <div>
              <p className="text-xs text-neutral-500 font-bold uppercase tracking-wider mb-0.5">Status</p>
              <p className="text-lg font-black uppercase tracking-tighter">{isTurnoAberto ? 'Caixa Aberto' : 'Caixa Fechado'}</p>
            </div>
          </div>
        </section>

        {/* Tab Navigation */}
        <nav className="px-6 py-4 flex flex-shrink-0 gap-3 border-b border-white/5 bg-[#0B0D11]">
          <button onClick={() => setActiveView("VENDA")} className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeView === "VENDA" ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'bg-white/5 text-neutral-500 hover:text-neutral-300'}`}>Venda Direta</button>
          <button onClick={() => setActiveView("COMANDAS")} className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeView === "COMANDAS" ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'bg-white/5 text-neutral-500 hover:text-neutral-300'}`}>Gestão de Comandas <span className="bg-white/10 px-1.5 py-0.5 rounded-md text-[10px]">{comandas.length}</span></button>
        </nav>

        {/* Main Area (Scroll Interno) */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-8">
          <AnimatePresence mode="wait">
            {activeView === "VENDA" && (
              <motion.div key="venda" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="h-full flex flex-col">
                
                {/* Busca e Filtros */}
                <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={18} />
                    <input 
                      ref={searchInputRef}
                      type="text" 
                      placeholder="Buscar produto... (Pressione '/' para focar)"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full h-12 bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 text-sm font-bold focus:border-emerald-500 focus:bg-white/10 outline-none transition-all placeholder:text-neutral-600"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setActiveTab("todos")} className={`px-4 h-12 rounded-xl text-xs font-bold border transition-all ${activeTab === "todos" ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400' : 'border-white/5 bg-white/5 text-neutral-500 hover:text-neutral-300'}`}>Todos</button>
                    <button onClick={() => setActiveTab("favoritos")} className={`px-4 h-12 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${activeTab === "favoritos" ? 'border-amber-500/50 bg-amber-500/10 text-amber-400' : 'border-white/5 bg-white/5 text-neutral-500 hover:text-neutral-300'}`}><Star size={14}/> Favoritos</button>
                  </div>
                </div>

                {isLoading ? (
                  <div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin text-neutral-500" size={32}/></div>
                ) : filteredProdutos.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-neutral-500 opacity-60"><Package size={48} className="mb-4"/><p className="font-bold">Nenhum produto encontrado</p></div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 pb-20 lg:pb-0">
                    {optimisticProdutos
                      .filter((p: any) => {
                        const matchesSearch = p.nome.toLowerCase().includes(searchQuery.toLowerCase());
                        const matchesTab = activeTab === "todos" || (activeTab === "favoritos" && p.isFavorito);
                        return matchesSearch && matchesTab;
                      })
                      .map((p: any) => {
                        const isEsgotado = p.estoqueAtual <= 0;
                        return (
                          <button 
                            key={p.id} 
                            disabled={isEsgotado}
                            onClick={() => { 
                              addItem({ produtoId: String(p.id), nome: p.nome, precoCentavos: safeCentavos(p.precoCentavos) }); 
                              setCartOpen(true); 
                            }} 
                            className={`bg-[#13161A] border border-white/5 p-4 rounded-3xl flex flex-col items-center text-center gap-3 transition-all relative overflow-hidden group shadow-xl ${isEsgotado ? 'opacity-40 grayscale pointer-events-none' : 'hover:border-emerald-500/30 active:scale-[0.98]'}`}
                          >
                            <div className={`w-16 h-16 rounded-full bg-neutral-800 border-2 border-white/5 flex items-center justify-center transition-transform ${!isEsgotado && 'group-hover:scale-105'}`}>
                              <Package size={24} className={isEsgotado ? 'text-neutral-700' : 'text-neutral-500'}/>
                            </div>
                            <div>
                              <p className={`font-black text-sm leading-tight transition-colors line-clamp-2 ${!isEsgotado && 'group-hover:text-emerald-400'}`}>{p.nome}</p>
                              <p className={`font-bold mt-1 text-sm tabular-nums ${isEsgotado ? 'text-neutral-500' : 'text-emerald-500/80'}`}>{fmt(p.precoCentavos)}</p>
                            </div>

                            {isEsgotado && (
                              <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center rotate-[-15deg] pointer-events-none">
                                <span className="bg-rose-500 text-white text-[10px] font-black px-4 py-1 rounded-full uppercase tracking-tighter shadow-lg shadow-rose-500/20">
                                  Esgotado
                                </span>
                              </div>
                            )}
                          </button>
                        );
                      })}
                  </div>
                )}
              </motion.div>
            )}

            {activeView === "COMANDAS" && (
              <motion.div key="comandas" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                {comandas.length === 0 ? (
                  <div className="h-80 rounded-3xl border-2 border-dashed border-white/5 flex flex-col items-center justify-center text-neutral-600 bg-white/[0.02]"><ClipboardList size={48} className="mb-4 opacity-20"/><p className="font-bold">Nenhuma comanda aberta</p></div>
                ) : (
                  <LayoutGroup>
                    <motion.div layout className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-20 lg:pb-0">
                      {comandas.map((c) => (
                        <motion.button layout key={c.id} onClick={() => selectComanda(c)} className="bg-[#13161A] border border-white/10 p-6 rounded-3xl flex flex-col gap-4 text-left hover:border-emerald-500/50 transition-all relative overflow-hidden group shadow-2xl">
                          <div className="flex justify-between items-start">
                            <div className="flex flex-col"><span className="text-xs text-neutral-500 font-black uppercase tracking-widest mb-1">Cliente / Mesa</span><span className="text-xl font-black text-neutral-100">{c.clienteNome}</span></div>
                            <OpenTime createdAt={c.createdAt} />
                          </div>
                          <div className="flex items-end justify-between mt-6">
                            <div className="flex -space-x-2">{c.items.slice(0,3).map((it, idx) => <div key={idx} className="w-8 h-8 rounded-full bg-neutral-800 border-2 border-[#13161A] flex items-center justify-center text-xs font-bold text-neutral-400">{it.quantidade}</div>)}{c.items.length > 3 && <div className="w-8 h-8 rounded-full bg-neutral-800 border-2 border-[#13161A] flex items-center justify-center text-xs font-bold text-neutral-500">+{c.items.length - 3}</div>}</div>
                            <div className="text-2xl font-black text-emerald-400 tabular-nums tracking-tighter">{fmt(c.items.reduce((acc, i) => acc + (i.precoCentavos * i.quantidade), 0))}</div>
                          </div>
                          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-emerald-500/10 transition-all" />
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
                    <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mt-1">Exibindo registros por data</p>
                  </div>
                  <PremiumDatePicker 
                    selectedDate={selectedHistoryDate} 
                    onDateChange={setSelectedHistoryDate} 
                  />
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                  {recentSales.filter(s => {
                    const saleDate = new Date(s.criadoEm);
                    return saleDate.getDate() === selectedHistoryDate.getDate() &&
                           saleDate.getMonth() === selectedHistoryDate.getMonth() &&
                           saleDate.getFullYear() === selectedHistoryDate.getFullYear();
                  }).length === 0 ? (
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-12 flex flex-col items-center justify-center text-center opacity-50">
                       <Clock size={48} className="mb-6 text-neutral-500" />
                       <p className="font-bold text-lg mb-2">Nenhuma venda nesta data</p>
                       <p className="text-sm text-neutral-400">Tente selecionar outro dia no calendário acima.</p>
                    </div>
                  ) : (
                    recentSales
                      .filter(s => {
                        const saleDate = new Date(s.criadoEm);
                        return saleDate.getDate() === selectedHistoryDate.getDate() &&
                               saleDate.getMonth() === selectedHistoryDate.getMonth() &&
                               saleDate.getFullYear() === selectedHistoryDate.getFullYear();
                      })
                      .map((sale) => (
                      <motion.div 
                        key={sale.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-[#13161A] border border-white/5 p-5 rounded-2xl flex items-center justify-between group hover:border-emerald-500/30 transition-all"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-neutral-400 group-hover:bg-emerald-500/10 group-hover:text-emerald-400 transition-colors">
                            {sale.metodoPagto === 'PIX' ? <QrCode size={20} /> : sale.metodoPagto === 'DINHEIRO' ? <Banknote size={20} /> : <CreditCard size={20} />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-black text-neutral-200">Venda #{sale.id.slice(-4)}</span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/5 text-neutral-500 uppercase tracking-tighter">{sale.metodoPagto}</span>
                            </div>
                            <p className="text-xs text-neutral-500 font-medium mt-1">
                              {new Date(sale.criadoEm).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-black text-emerald-400 tabular-nums tracking-tighter">{fmt(sale.totalCentavos)}</p>
                          <p className="text-[10px] font-bold text-emerald-500/40 uppercase tracking-widest mt-1">Finalizada</p>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </motion.div>
            )}

            {activeView === "ESTOQUE" && (
              <motion.div key="estoque" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="h-full flex flex-col gap-6">
                 <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/10">
                   <h2 className="text-xl font-black">Gestão de Estoque</h2>
                   <button onClick={() => { setEditingProduct(null); setCrudModalOpen(true); }} className="h-10 px-4 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white transition-all active:scale-[0.98] shadow-lg shadow-emerald-600/20"><Plus size={14}/> Novo</button>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                   {produtos.map((p: any) => (
                     <motion.div layout key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-neutral-900/40 border border-white/5 hover:border-white/15 transition-all rounded-2xl p-5 flex flex-col gap-3 relative group">
                        {p.estoqueAtual < 5 && <div className="absolute top-4 right-4 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span></div>}
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-neutral-800 rounded-lg flex items-center justify-center"><Package size={16} className="text-neutral-400"/></div>
                          <div className="flex-1 min-w-0">
                            <span className="font-bold text-sm leading-tight block truncate">{p.nome}</span>
                            <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">{p.categoria || 'Outros'}</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center text-sm pt-2 border-t border-white/5">
                          <span className="text-neutral-500 font-bold">Estoque:</span>
                          <span className={`${p.estoqueAtual < 5 ? 'text-amber-400 bg-amber-400/10' : 'text-neutral-300 bg-white/5'} px-2 py-1 rounded-md font-bold tabular-nums`}>{p.estoqueAtual} unid.</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-neutral-500 font-bold">Venda / Custo:</span>
                          <span className="text-emerald-400 font-black tabular-nums">{fmt(p.precoCentavos)} <span className="text-neutral-600">/ {fmt(p.precoCustoCentavos)}</span></span>
                        </div>
                        <div className="flex gap-2 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => { setEditingProduct(p); setCrudModalOpen(true); }} className="flex-1 h-9 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 text-neutral-300 transition-all"><Pencil size={12}/> Editar</button>
                          <button onClick={() => setDeletingProduct(p)} className="h-9 px-3 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 text-rose-400 transition-all"><Trash2 size={12}/></button>
                        </div>
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
                   <div className="bg-[#13161A] border border-emerald-500/20 rounded-3xl p-6 relative overflow-hidden group">
                      <div className="absolute -right-6 -top-6 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all"/>
                      <h3 className="text-emerald-500 font-bold text-[10px] uppercase tracking-widest mb-2 flex items-center gap-2"><DollarSign size={14}/> Vendas Hoje</h3>
                      <p className="text-4xl font-black text-emerald-400 tabular-nums tracking-tighter">{fmt(insights?.totalHojeCentavos || 0)}</p>
                   </div>
                   <div className="bg-[#13161A] border border-blue-500/20 rounded-3xl p-6 relative overflow-hidden group">
                      <div className="absolute -right-6 -top-6 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all"/>
                      <h3 className="text-blue-500 font-bold text-[10px] uppercase tracking-widest mb-2 flex items-center gap-2"><Hash size={14}/> Total de Pedidos</h3>
                      <p className="text-4xl font-black text-blue-400 tabular-nums tracking-tighter">{insights?.qtdHoje || 0}</p>
                   </div>
                   <div className="bg-[#13161A] border border-purple-500/20 rounded-3xl p-6 relative overflow-hidden group">
                      <div className="absolute -right-6 -top-6 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-all"/>
                      <h3 className="text-purple-500 font-bold text-[10px] uppercase tracking-widest mb-2 flex items-center gap-2"><TrendingUp size={14}/> Ticket Médio</h3>
                      <p className="text-4xl font-black text-purple-400 tabular-nums tracking-tighter">{fmt(insights?.ticketMedioCentavos || 0)}</p>
                   </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ─── SIDE PANEL (CARRINHO / CHECKOUT PRO) (COLUNA DIREITA) ─── */}
      <div className={`fixed inset-0 z-40 lg:hidden bg-black/80 backdrop-blur-md transition-opacity duration-500 ${cartOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setCartOpen(false)} />
      
      <form 
        noValidate
        onSubmit={handleSubmit(onSubmit)}
        className={`
          fixed inset-y-0 right-0 z-50 w-full max-w-[420px] 
          lg:static lg:w-full lg:max-w-none 
          bg-[#0B0D11]/40 backdrop-blur-3xl 
          lg:border-l lg:border-white/10 flex flex-col 
          transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)]
          ${cartOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
          relative shadow-[0_0_100px_rgba(0,0,0,0.8)]
        `}
      >
        {/* Glow Decorativo de Fundo */}
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="p-8 border-b border-white/5 flex items-center justify-between relative z-10">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <h2 className="text-xs font-black uppercase tracking-[0.3em] text-neutral-500">Checkout Pro</h2>
            </div>
            <h3 className="text-xl font-black text-white tracking-tighter">
              {activeComandaId && isMounted ? 'Comanda Ativa' : 'Pedido Direto'}
            </h3>
            {activeComandaId && <p className="text-[10px] text-emerald-400/80 font-bold mt-1 uppercase tracking-widest bg-emerald-400/5 px-2 py-0.5 rounded-md inline-block">Mesa: {comandas.find(c => c.id === activeComandaId)?.clienteNome}</p>}
          </div>
          <button type="button" onClick={() => setCartOpen(false)} className="lg:hidden w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-full transition-all"><X size={20}/></button>
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-8 relative z-10 scrollbar-hide">
          <AnimatePresence initial={false}>
            {!isMounted || items.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col items-center justify-center text-center px-6 gap-4 opacity-40">
                <ShoppingBag size={48} className="text-neutral-500" />
                <div className="space-y-1">
                  <p className="font-bold text-neutral-300">Aguardando o primeiro item para brilhar!</p>
                  <p className="text-sm text-neutral-500">Selecione produtos no catálogo.</p>
                </div>
              </motion.div>
            ) : (
              <ul className="space-y-4">
                {items.map(item => (
                  <motion.li layout key={item.produtoId} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.9 }} className={`group relative bg-white/[0.03] p-5 rounded-[24px] border border-white/5 hover:border-white/10 transition-all ${item.prepared ? 'opacity-40' : 'opacity-100'}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-bold text-sm leading-tight text-neutral-200">{item.nome}</p>
                        <div className="flex items-center gap-3 mt-2">
                           <div className="flex items-center bg-white/5 rounded-lg border border-white/10 p-0.5">
                              <button 
                                type="button"
                                onClick={() => decrementItem(item.produtoId)} 
                                className="w-6 h-6 flex items-center justify-center text-neutral-500 hover:text-white hover:bg-white/10 rounded-md transition-all active:scale-90"
                              >
                                <Minus size={12}/>
                              </button>
                              <span className="w-8 text-center text-xs font-black tabular-nums text-neutral-200">{item.quantidade}</span>
                              <button 
                                type="button"
                                onClick={() => incrementItem(item.produtoId)} 
                                className="w-6 h-6 flex items-center justify-center text-neutral-500 hover:text-white hover:bg-white/10 rounded-md transition-all active:scale-90"
                              >
                                <Plus size={12}/>
                              </button>
                           </div>
                           <p className="text-xs text-emerald-500/70 font-bold tabular-nums">{fmt(item.precoCentavos * item.quantidade)}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-3">
                        <button type="button" onClick={() => togglePrepared(item.produtoId)} className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${item.prepared ? 'bg-emerald-500 border-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'border-white/10 text-transparent hover:border-emerald-500/50'}`}><CheckCircle2 size={16}/></button>
                        <button type="button" onClick={() => removeItem(item.produtoId)} className="text-rose-500/20 hover:text-rose-500 transition-colors p-2"><Trash2 size={18}/></button>
                      </div>
                    </div>
                  </motion.li>
                ))}
              </ul>
            )}
          </AnimatePresence>
        </div>

        <footer className="p-6 bg-[#0B0D11]/60 backdrop-blur-3xl border-t border-white/5 space-y-4 relative z-10 flex-shrink-0">
          <div className="flex flex-col gap-1">
            <AnimatePresence>
              {descontoCentavos > 0 && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="flex items-center justify-between text-rose-400 overflow-hidden mb-1">
                  <span className="text-[9px] font-black uppercase tracking-[0.2em]">Desconto</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold tabular-nums">-{fmt(descontoCentavos)}</span>
                    <button type="button" onClick={() => setDesconto(0)} className="hover:text-rose-300 p-1"><X size={10}/></button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            <div className="flex items-center justify-between bg-white/[0.02] p-4 rounded-3xl border border-white/5 shadow-inner">
              <div className="flex flex-col items-start gap-0.5">
                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-neutral-500">Total</span>
                {descontoCentavos === 0 && items.length > 0 && (
                  <button type="button" onClick={() => setDiscountModalOpen(true)} className="text-[9px] text-emerald-500 hover:text-emerald-400 font-bold uppercase tracking-widest transition-all">+ Cupom</button>
                )}
              </div>
              <div className="flex flex-col items-end">
                {descontoCentavos > 0 && <span className="text-[10px] text-neutral-600 line-through tabular-nums font-bold leading-none mb-1">{fmt(subtotal)}</span>}
                <span className="text-4xl font-black text-emerald-400 tabular-nums tracking-tighter leading-none drop-shadow-[0_0_15px_rgba(52,211,153,0.15)]">
                  {isMounted ? fmt(total) : 'R$ 0,00'}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {paymentMethods.map(m => (
              <button 
                type="button" 
                key={m.value} 
                onClick={() => resetForm({ pagamento: m.value })} 
                className={`
                  flex flex-col items-center justify-center py-3 rounded-2xl border transition-all duration-300
                  ${pagamentoType === m.value 
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 shadow-[0_5px_20px_rgba(16,185,129,0.1)] scale-[1.02]' 
                    : 'border-white/5 bg-white/[0.03] text-neutral-500 hover:border-white/10 hover:bg-white/[0.05] grayscale opacity-60 hover:grayscale-0 hover:opacity-100'}
                `}
              >
                <m.icon size={18}/>
                <span className="text-[8px] font-black mt-1.5 uppercase tracking-[0.1em]">{m.label}</span>
              </button>
            ))}
          </div>

          <AnimatePresence>
            {pagamentoType === 'DINHEIRO' && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="flex flex-col gap-2 overflow-hidden">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-neutral-500 ml-1">Recebido</label>
                    <input
                      type="number"
                      step="0.01"
                      inputMode="decimal"
                      placeholder="0,00"
                      {...register("valorRecebido")}
                      className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-xl font-black focus:border-emerald-500 focus:bg-white/10 outline-none transition-all placeholder:text-neutral-800"
                    />
                  </div>
                  <div className="flex flex-col gap-1 items-end justify-end">
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-neutral-600 mr-1">Troco</span>
                    <span className={`text-2xl font-black tabular-nums tracking-tighter leading-none ${troco > 0 ? 'text-amber-400' : 'text-neutral-700'}`}>
                      {fmt(troco)}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[10, 20, 50, 100].map(val => (
                    <button type="button" key={val} onClick={() => setValue("valorRecebido", val)} className="bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg py-2 text-[10px] font-black text-neutral-400 transition-all active:scale-95">R$ {val}</button>
                  ))}
                </div>
              </motion.div>
            )}

            {pagamentoType === 'MISTO' && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="flex flex-col gap-3 overflow-hidden">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-neutral-500">Pix</label>
                    <input
                      type="number"
                      step="0.01"
                      inputMode="decimal"
                      placeholder="0,00"
                      {...register("valorPix")}
                      className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-lg font-black focus:border-emerald-500 focus:bg-white/10 outline-none transition-all"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-neutral-500">Dinheiro</label>
                    <input
                      type="number"
                      step="0.01"
                      inputMode="decimal"
                      placeholder="0,00"
                      {...register("valorDinheiro")}
                      className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-lg font-black focus:border-emerald-500 focus:bg-white/10 outline-none transition-all"
                    />
                  </div>
                </div>
                
                <div className="flex justify-between items-center bg-white/[0.02] border border-white/5 p-4 rounded-2xl">
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black uppercase tracking-widest text-neutral-600">Restante</span>
                    <span className={`text-xl font-black tabular-nums tracking-tighter ${faltaMisto === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {fmt(faltaMisto)}
                    </span>
                  </div>
                  {trocoMisto > 0 && (
                    <div className="flex flex-col items-end">
                      <span className="text-[8px] font-black uppercase tracking-widest text-amber-500">Troco</span>
                      <span className="text-xl font-black tabular-nums tracking-tighter text-amber-400">
                        {fmt(trocoMisto)}
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex gap-3">
            <button 
              type="button"
              onClick={handleSaveToComanda} 
              disabled={items.length === 0} 
              className="flex-1 h-12 bg-transparent border border-white/5 hover:bg-white/5 disabled:opacity-20 text-neutral-500 rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
            >
              Comanda <ClipboardList size={14}/>
            </button>
          </div>

          <button 
            type="submit" 
            disabled={items.length === 0 || !pagamentoType || (pagamentoType === 'DINHEIRO' && valorRecebido < total) || (pagamentoType === 'MISTO' && !isMistoValid) || mutation.isPending || !isTurnoAberto} 
            className="
              w-full h-16 bg-emerald-600 hover:bg-emerald-500 disabled:bg-neutral-900 disabled:text-neutral-700 
              text-white rounded-2xl font-black text-lg shadow-[0_15px_40px_rgba(16,185,129,0.15)] 
              active:scale-[0.98] transition-all flex items-center justify-center gap-3 relative overflow-hidden group
            "
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite] pointer-events-none" />
            {mutation.isPending ? <Loader2 className="animate-spin"/> : <><CheckCircle2 size={20}/> FINALIZAR</>}
          </button>

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
        <button onClick={() => setCartOpen(true)} className="lg:hidden fixed bottom-6 left-6 right-6 z-30 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl h-16 flex items-center justify-between px-6 shadow-[0_10px_40px_rgba(16,185,129,0.3)] active:scale-[0.98] transition-all">
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
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-[#13161A] w-full max-w-md p-8 rounded-[40px] border border-white/10 relative shadow-[0_0_80px_rgba(0,0,0,0.5)]">
              <h2 className="text-2xl font-black mb-6 tracking-tighter">Identificar Comanda</h2>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Nome do Cliente ou Mesa</label>
                  <input autoFocus type="text" value={comandaName} onChange={(e) => setComandaName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && confirmSaveComanda()} placeholder="Ex: João - Mesa 05" className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl px-6 text-xl font-bold focus:border-emerald-500 focus:bg-white/10 outline-none transition-all placeholder:text-neutral-700"/>
                </div>
                <button onClick={confirmSaveComanda} className="w-full h-16 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-lg transition-all shadow-xl shadow-emerald-600/20 mt-4">ABRIR COMANDA</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {successModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={() => setSuccessModalOpen(false)} />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="bg-[#13161A] w-full max-w-md p-8 rounded-[40px] border border-white/10 relative shadow-[0_0_80px_rgba(16,185,129,0.3)] flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 size={40} className="text-emerald-400" />
              </div>
              <h2 className="text-2xl font-black mb-2 tracking-tighter">Venda Finalizada!</h2>
              <p className="text-neutral-400 mb-8">Total de {fmt(lastSaleTotal)} registrado no caixa.</p>
              
              <div className="w-full space-y-3">
                <button onClick={() => {
                  const itemsText = lastSaleItems.map(i => `${i.quantidade}x ${i.nome}`).join(", ");
                  const text = `${nomeLoja} - Recibo da sua compra:\n${itemsText}\n\nTotal: ${fmt(lastSaleTotal)}`;
                  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                  setSuccessModalOpen(false);
                }} className="w-full h-14 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/20 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all">
                  <MessageCircle size={18} /> Enviar WhatsApp
                </button>
                <button onClick={() => { showToast("Impressão via Bluetooth não configurada.", "error"); setSuccessModalOpen(false); }} className="w-full h-14 bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all">
                  <Printer size={18} /> Imprimir Recibo
                </button>
              </div>
              
              <button onClick={() => setSuccessModalOpen(false)} className="mt-6 text-[10px] text-neutral-500 font-black uppercase tracking-widest hover:text-neutral-300 transition-colors p-2">Voltar ao PDV</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        {confirmData && <ConfirmDialog isOpen={!!confirmData} title={confirmData.title} message={confirmData.message} onConfirm={confirmData.action} onCancel={() => setConfirmData(null)} />}
        {discountModalOpen && <DiscountModal isOpen={discountModalOpen} onApply={(val) => { setDesconto(val); setDiscountModalOpen(false); showToast("Desconto aplicado!"); }} onCancel={() => setDiscountModalOpen(false)} />}
      </AnimatePresence>
    </div>
  );
}

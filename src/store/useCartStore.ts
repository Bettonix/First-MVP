import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { safeCentavos } from '@/lib/currency';

// ─── Cart Item ─────────────────────────────────────────────────

export interface CartItem {
  produtoId: string;
  nome: string;
  quantidade: number;
  precoCentavos: number;
  prepared: boolean; // Toggle: item preparado/entregue
}

interface CartState {
  items: CartItem[];
  descontoCentavos: number;
  addItem: (item: Omit<CartItem, 'quantidade' | 'prepared'>) => void;
  removeItem: (produtoId: string) => void;
  togglePrepared: (produtoId: string) => void;
  setItems: (items: CartItem[]) => void;
  setDesconto: (centavos: number) => void;
  clearCart: () => void;
  subtotalCentavos: () => number;
  totalCentavos: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      descontoCentavos: 0,

      addItem: (newItem) => set((state) => {
        // Guard: ensure precoCentavos is always a valid integer
        const preco = safeCentavos(newItem.precoCentavos);
        const existing = state.items.find(i => i.produtoId === newItem.produtoId);
        if (existing) {
          return {
            items: state.items.map(i =>
              i.produtoId === newItem.produtoId
                ? { ...i, quantidade: i.quantidade + 1 }
                : i
            )
          };
        }
        return { items: [...state.items, { ...newItem, precoCentavos: preco, quantidade: 1, prepared: false }] };
      }),

      removeItem: (produtoId) => set((state) => ({
        items: state.items.filter(i => i.produtoId !== produtoId)
      })),

      togglePrepared: (produtoId) => set((state) => ({
        items: state.items.map(i =>
          i.produtoId === produtoId ? { ...i, prepared: !i.prepared } : i
        )
      })),

      setItems: (items) => set({ 
        items: items.map(i => ({ ...i, precoCentavos: safeCentavos(i.precoCentavos) }))
      }),
      
      setDesconto: (centavos) => set({ descontoCentavos: safeCentavos(centavos) }),

      clearCart: () => set({ items: [], descontoCentavos: 0 }),

      subtotalCentavos: () => get().items.reduce(
        (total, item) => total + (safeCentavos(item.precoCentavos) * (item.quantidade || 0)), 0
      ),

      totalCentavos: () => {
        const sub = get().subtotalCentavos();
        const desc = safeCentavos(get().descontoCentavos);
        return Math.max(0, sub - desc);
      },
    }),
    { name: 'pdv-cart-storage' }
  )
);

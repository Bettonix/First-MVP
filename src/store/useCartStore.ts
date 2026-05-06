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
  saved?: boolean;   // Item já enviado/salvo na mesa (somente leitura no carrinho)
}

interface CartState {
  items: CartItem[];
  descontoCentavos: number;
  addItem: (item: Omit<CartItem, 'quantidade' | 'prepared' | 'saved'>) => void;
  removeItem: (produtoId: string) => void;
  incrementItem: (produtoId: string) => void;
  decrementItem: (produtoId: string) => void;
  togglePrepared: (produtoId: string) => void;
  setItems: (items: CartItem[]) => void;
  loadTableContext: (savedItems: CartItem[]) => void;
  setDesconto: (centavos: number) => void;
  clearCart: () => void;
  subtotalCentavos: () => number;
  totalCentavos: () => number;
  newItemsTotalCentavos: () => number;
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
          // Se o item já existe como "saved", adiciona um novo item separado (adicional)
          if (existing.saved) {
            return {
              items: [...state.items, { ...newItem, produtoId: `${newItem.produtoId}__new`, precoCentavos: preco, quantidade: 1, prepared: false, saved: false }]
            };
          }
          return {
            items: state.items.map(i =>
              i.produtoId === newItem.produtoId
                ? { ...i, quantidade: i.quantidade + 1 }
                : i
            )
          };
        }
        return { items: [...state.items, { ...newItem, precoCentavos: preco, quantidade: 1, prepared: false, saved: false }] };
      }),

      removeItem: (produtoId) => set((state) => ({
        items: state.items.filter(i => i.produtoId !== produtoId)
      })),

      incrementItem: (produtoId) => set((state) => ({
        items: state.items.map(i => i.produtoId === produtoId && !i.saved ? { ...i, quantidade: i.quantidade + 1 } : i)
      })),

      decrementItem: (produtoId) => set((state) => ({
        items: state.items.map(i => {
          if (i.produtoId === produtoId && !i.saved) {
            const newQty = Math.max(1, i.quantidade - 1);
            return { ...i, quantidade: newQty };
          }
          return i;
        })
      })),

      togglePrepared: (produtoId) => set((state) => ({
        items: state.items.map(i =>
          i.produtoId === produtoId ? { ...i, prepared: !i.prepared } : i
        )
      })),

      setItems: (items) => set({
        items: items.map(i => ({ ...i, precoCentavos: safeCentavos(i.precoCentavos) }))
      }),

      // Carrega itens de uma mesa ocupada como "saved" (somente leitura)
      loadTableContext: (savedItems) => set({
        items: savedItems.map(i => ({
          ...i,
          precoCentavos: safeCentavos(i.precoCentavos),
          saved: true,
        })),
        descontoCentavos: 0,
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

      // Total apenas dos itens novos (não saved) — usado no modo "Enviar Adicionais"
      newItemsTotalCentavos: () => get().items
        .filter(i => !i.saved)
        .reduce((total, item) => total + (safeCentavos(item.precoCentavos) * (item.quantidade || 0)), 0),
    }),
    { name: 'pdv-cart-storage' }
  )
);

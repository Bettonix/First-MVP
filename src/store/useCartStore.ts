import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// O Schema de Tipagem reflete o estrito da API e Prisma
export interface CartItem {
  produtoId: bigint;
  nome: string;
  quantidade: number;
  precoCentavos: number;
}

interface CartState {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantidade'>) => void;
  removeItem: (produtoId: bigint) => void;
  clearCart: () => void;
  totalCentavos: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      
      addItem: (newItem) => set((state) => {
        const existingItem = state.items.find(i => i.produtoId === newItem.produtoId);
        if (existingItem) {
          return {
            items: state.items.map(i => 
              i.produtoId === newItem.produtoId 
                ? { ...i, quantidade: i.quantidade + 1 }
                : i
            )
          };
        }
        return { items: [...state.items, { ...newItem, quantidade: 1 }] };
      }),
      
      removeItem: (produtoId) => set((state) => ({
        items: state.items.filter(i => i.produtoId !== produtoId)
      })),
      
      clearCart: () => set({ items: [] }),
      
      totalCentavos: () => get().items.reduce((total, item) => total + (item.precoCentavos * item.quantidade), 0),
    }),
    {
      name: 'pdv-cart-storage',
      // BigInt não é serializável por padrão no JSON. 
      // Adicionamos custom replacer e reviver.
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          return JSON.parse(str, (key, value) => 
            typeof value === 'string' && value.endsWith('n') && !isNaN(Number(value.slice(0, -1)))
              ? BigInt(value.slice(0, -1))
              : value
          );
        },
        setItem: (name, value) => {
          localStorage.setItem(name, JSON.stringify(value, (key, val) =>
            typeof val === 'bigint' ? val.toString() + 'n' : val
          ));
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
    }
  )
);

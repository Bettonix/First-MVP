import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem } from './useCartStore';

// ─── Comanda (Tab) ─────────────────────────────────────────────

export interface Comanda {
  id: string;            // "tab-{timestamp}"
  clienteNome: string;   // Nome ou mesa
  items: CartItem[];
  createdAt: number;     // Date.now() — para calcular tempo em aberto
}

interface TabState {
  comandas: Comanda[];
  activeComandaId: string | null;

  /** Salva o carrinho atual como nova comanda */
  saveComanda: (clienteNome: string, items: CartItem[]) => void;

  /** Remove a comanda (após fechamento/pagamento) */
  closeComanda: (id: string) => void;

  /** Atualiza os itens de uma comanda ativa (quando editar e re-salvar) */
  updateComandaItems: (id: string, items: CartItem[]) => void;

  /** Marca qual comanda está sendo editada no carrinho */
  setActiveComanda: (id: string | null) => void;

  /** Calcula o total de uma comanda em centavos */
  comandaTotal: (id: string) => number;
}

export const useTabStore = create<TabState>()(
  persist(
    (set, get) => ({
      comandas: [],
      activeComandaId: null,

      saveComanda: (clienteNome, items) => {
        const newComanda: Comanda = {
          id: `tab-${Date.now()}`,
          clienteNome,
          items,
          createdAt: Date.now(),
        };
        set((state) => ({
          comandas: [...state.comandas, newComanda],
        }));
      },

      closeComanda: (id) => set((state) => ({
        comandas: state.comandas.filter(c => c.id !== id),
        activeComandaId: state.activeComandaId === id ? null : state.activeComandaId,
      })),

      updateComandaItems: (id, items) => set((state) => ({
        comandas: state.comandas.map(c =>
          c.id === id ? { ...c, items } : c
        ),
      })),

      setActiveComanda: (id) => set({ activeComandaId: id }),

      comandaTotal: (id) => {
        const comanda = get().comandas.find(c => c.id === id);
        if (!comanda) return 0;
        return comanda.items.reduce(
          (total, item) => total + (item.precoCentavos * item.quantidade), 0
        );
      },
    }),
    { name: 'pdv-tabs-storage' }
  )
);

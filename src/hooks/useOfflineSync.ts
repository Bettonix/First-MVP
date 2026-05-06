"use client";

/**
 * useOfflineSync
 *
 * Hook que:
 * 1. Monitora status de rede (online/offline)
 * 2. Expõe `pendingCount` — número de vendas na fila local
 * 3. Executa sync automático quando a rede volta
 * 4. Expõe `syncNow()` para sync manual
 *
 * O sync chama a Server Action `registrarVenda` para cada item
 * pendente. Em caso de sucesso, remove da fila. Em caso de erro,
 * incrementa o contador de tentativas (max 5, depois descarta).
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  getPendingVendas,
  removeVenda,
  incrementAttempts,
  countPending,
} from "@/lib/offlineQueue";
import { registrarVenda } from "@/app/actions/vendas";

export interface OfflineSyncState {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  justReconnected: boolean; // true por 3s após sync completar com sucesso
  syncNow: () => Promise<void>;
}

export function useOfflineSync(): OfflineSyncState {
  const [isOnline, setIsOnline]           = useState(true);
  const [pendingCount, setPendingCount]   = useState(0);
  const [isSyncing, setIsSyncing]         = useState(false);
  const [justReconnected, setJustReconnected] = useState(false);
  const syncLockRef        = useRef(false);
  const reconnectTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Inicializa estado de rede e contagem de pendentes
  useEffect(() => {
    setIsOnline(navigator.onLine);
    countPending().then(setPendingCount).catch(() => {});
  }, []);

  const refreshCount = useCallback(async () => {
    try {
      const n = await countPending();
      setPendingCount(n);
    } catch { /* IndexedDB indisponível — ignora */ }
  }, []);

  const syncNow = useCallback(async () => {
    if (syncLockRef.current || !navigator.onLine) return;
    syncLockRef.current = true;
    setIsSyncing(true);

    try {
      const pending = await getPendingVendas();
      if (pending.length === 0) return;

      // Processa em série para evitar race conditions no servidor
      for (const venda of pending) {
        try {
          const METODOS_VALIDOS = ["PIX", "DINHEIRO", "CARTAO_CREDITO", "CARTAO_DEBITO"] as const;
          type MetodoValido = typeof METODOS_VALIDOS[number];

          const cartSerialized = venda.payload.cart.map(item => ({
            produtoId: BigInt(item.produtoId),
            nome: item.nome,
            quantidade: item.quantidade,
            precoCentavos: item.precoCentavos,
          }));

          const pagamentosValidos = venda.payload.pagamentos
            .filter(p => (METODOS_VALIDOS as readonly string[]).includes(p.metodo))
            .map(p => ({ metodo: p.metodo as MetodoValido, valorCentavos: p.valorCentavos }));

          if (pagamentosValidos.length === 0) {
            await removeVenda(venda.id); // dados corrompidos — descarta
            continue;
          }

          const res = await registrarVenda({
            cart: cartSerialized,
            pagamentos: pagamentosValidos,
          });

          if (res.success) {
            await removeVenda(venda.id);
          } else {
            await incrementAttempts(venda.id);
          }
        } catch {
          // Erro de rede durante sync — para e tenta na próxima reconexão
          await incrementAttempts(venda.id);
          break;
        }
      }
    } catch { /* Falha silenciosa — não interrompe o operador */ } finally {
      syncLockRef.current = false;
      setIsSyncing(false);
      await refreshCount();
      // Sinaliza reconexão bem-sucedida por 3s para o banner
      setJustReconnected(true);
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = setTimeout(() => setJustReconnected(false), 3000);
    }
  }, [refreshCount]);

  // Listeners de rede
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Pequeno delay para garantir que a rede está estável
      setTimeout(() => syncNow(), 1500);
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online",  handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online",  handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [syncNow]);

  return { isOnline, pendingCount, isSyncing, justReconnected, syncNow };
}

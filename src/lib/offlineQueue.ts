/**
 * Offline Transaction Queue — IndexedDB
 *
 * Persiste vendas pendentes quando o dispositivo está offline.
 * Usa IndexedDB diretamente (sem dependências externas) para
 * garantir durabilidade entre recarregamentos de página.
 *
 * Estrutura de uma entrada na fila:
 *   id        — UUID gerado localmente (evita duplicatas no sync)
 *   payload   — dados da venda prontos para enviar à Server Action
 *   createdAt — timestamp ISO para ordenação e auditoria
 *   attempts  — contador de tentativas de sync (max 5)
 */

export interface OfflineVenda {
  id: string;
  payload: {
    cart: Array<{
      produtoId: string; // string aqui — BigInt não serializa em JSON
      nome: string;
      quantidade: number;
      precoCentavos: number;
    }>;
    pagamentos: Array<{
      metodo: string;
      valorCentavos: number;
    }>;
    totalCentavos: number;
    troco: number;
  };
  createdAt: string;
  attempts: number;
}

const DB_NAME = "balcao-rapido-offline";
const STORE   = "vendas-pendentes";
const VERSION = 1;
const MAX_ATTEMPTS = 5;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

export async function enqueueVenda(venda: Omit<OfflineVenda, "id" | "createdAt" | "attempts">): Promise<string> {
  const db = await openDB();
  const id = crypto.randomUUID();
  const entry: OfflineVenda = { ...venda, id, createdAt: new Date().toISOString(), attempts: 0 };
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE, "readwrite");
    const req = tx.objectStore(STORE).add(entry);
    req.onsuccess = () => resolve(id);
    req.onerror   = () => reject(req.error);
  });
}

export async function getPendingVendas(): Promise<OfflineVenda[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result as OfflineVenda[]);
    req.onerror   = () => reject(req.error);
  });
}

export async function removeVenda(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE, "readwrite");
    const req = tx.objectStore(STORE).delete(id);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

export async function incrementAttempts(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const get   = store.get(id);
    get.onsuccess = () => {
      const entry = get.result as OfflineVenda | undefined;
      if (!entry) { resolve(); return; }
      entry.attempts += 1;
      // Remove permanentemente se excedeu tentativas
      if (entry.attempts >= MAX_ATTEMPTS) {
        store.delete(id);
      } else {
        store.put(entry);
      }
      resolve();
    };
    get.onerror = () => reject(get.error);
  });
}

export async function countPending(): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).count();
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

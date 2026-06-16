import AsyncStorage from '@react-native-async-storage/async-storage';

export const STORAGE_KEYS = {
  PENDING_SALES: '@pism/cache/pending_sales',
  CLIENTS:       '@pism/cache/clients',
  PRODUCTS:      '@pism/cache/products',
  SALES:         '@pism/cache/sales',
  SYNC_QUEUE:    '@pism/sync/queue',
  LAST_SYNC:     '@pism/sync/last_at',
  AUTO_SYNC:     '@pism/sync/auto',
  REGIOES_ESTADOS_FILTER: '@pism/settings/regioes_estados_filter',
} as const;

export interface SyncOp {
  id:        string;
  type:      string;
  payload:   unknown;
  createdAt: string;
}

async function getItem<T>(key: string): Promise<T | null> {
  try {
    const v = await AsyncStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : null;
  } catch {
    return null;
  }
}

async function setItem(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

async function getQueue(): Promise<SyncOp[]> {
  return (await getItem<SyncOp[]>(STORAGE_KEYS.SYNC_QUEUE)) ?? [];
}

async function enqueue(op: Omit<SyncOp, 'id' | 'createdAt'>): Promise<void> {
  const queue = await getQueue();
  queue.push({
    ...op,
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    createdAt: new Date().toISOString(),
  });
  await setItem(STORAGE_KEYS.SYNC_QUEUE, queue);
}

async function dequeue(ids: string[]): Promise<void> {
  const queue = await getQueue();
  await setItem(STORAGE_KEYS.SYNC_QUEUE, queue.filter(o => !ids.includes(o.id)));
}

export const storageService = { getItem, setItem, getQueue, enqueue, dequeue };

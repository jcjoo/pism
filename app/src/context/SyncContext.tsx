import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { syncService } from '../services/sync.service';
import { STORAGE_KEYS } from '../services/storage.service';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

interface SyncContextValue {
  status:    SyncStatus;
  pendingCount: number;
  lastSyncAt: Date | null;
  autoSync:   boolean;
  setAutoSync: (val: boolean) => Promise<void>;
  sync:        () => Promise<void>;
}

const SyncContext = createContext<SyncContextValue>({
  status:       'idle',
  pendingCount: 0,
  lastSyncAt:   null,
  autoSync:     false,
  setAutoSync:  async () => {},
  sync:         async () => {},
});

const AUTO_SYNC_INTERVAL_MS = 3 * 60 * 1000; // 3 minutes

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const [status,       setStatus]       = useState<SyncStatus>('idle');
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncAt,   setLastSyncAt]   = useState<Date | null>(null);
  const [autoSync,     setAutoSyncState] = useState(false);

  const intervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const syncingRef   = useRef(false);

  useEffect(() => {
    (async () => {
      const [autoVal, lastAt, cnt] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.AUTO_SYNC),
        AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC),
        syncService.getQueueLength(),
      ]);
      if (autoVal !== null) setAutoSyncState(JSON.parse(autoVal));
      if (lastAt) setLastSyncAt(new Date(lastAt));
      setPendingCount(cnt);
    })();
  }, []);

  // Poll pending count every 5 seconds
  useEffect(() => {
    const t = setInterval(async () => {
      setPendingCount(await syncService.getQueueLength());
    }, 5000);
    return () => clearInterval(t);
  }, []);

  const sync = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    setStatus('syncing');
    try {
      await syncService.flushQueue();
      await syncService.refreshCaches();
      const now = new Date();
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC, now.toISOString());
      setLastSyncAt(now);
      setStatus('synced');
    } catch {
      setStatus('error');
    } finally {
      syncingRef.current = false;
      setPendingCount(await syncService.getQueueLength());
    }
  }, []);

  // Auto-sync interval management
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (autoSync) {
      intervalRef.current = setInterval(sync, AUTO_SYNC_INTERVAL_MS);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoSync, sync]);

  const setAutoSync = async (val: boolean) => {
    setAutoSyncState(val);
    await AsyncStorage.setItem(STORAGE_KEYS.AUTO_SYNC, JSON.stringify(val));
    if (val) sync();
  };

  return (
    <SyncContext.Provider value={{ status, pendingCount, lastSyncAt, autoSync, setAutoSync, sync }}>
      {children}
    </SyncContext.Provider>
  );
}

export function useSync() {
  return useContext(SyncContext);
}

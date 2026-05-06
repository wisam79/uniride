import AsyncStorage from "@react-native-async-storage/async-storage";
// @ts-ignore
import NetInfo, { NetInfoState } from "@react-native-community/netinfo";

const CACHE_PREFIX = "uniride_cache:";
const QUEUE_KEY = "uniride_sync_queue";

interface CacheEntry<T = unknown> {
  data: T;
  expiresAt: number;
}

interface SyncOperation {
  id: string;
  type: "CREATE" | "UPDATE" | "DELETE";
  table: string;
  payload: Record<string, unknown>;
  createdAt: number;
  retryCount: number;
}

export class CacheManager {
  private static instance: CacheManager;

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  async set<T>(key: string, data: T, ttlMs: number = 5 * 60 * 1000): Promise<void> {
    const entry: CacheEntry<T> = {
      data,
      expiresAt: Date.now() + ttlMs,
    };
    await AsyncStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await AsyncStorage.getItem(CACHE_PREFIX + key);
      if (!raw) return null;

      const entry: CacheEntry<T> = JSON.parse(raw);

      if (Date.now() > entry.expiresAt) {
        await AsyncStorage.removeItem(CACHE_PREFIX + key);
        return null;
      }

      return entry.data;
    } catch {
      return null;
    }
  }

  async invalidate(key: string): Promise<void> {
    await AsyncStorage.removeItem(CACHE_PREFIX + key);
  }

  async clear(): Promise<void> {
    const allKeys = await AsyncStorage.getAllKeys();
    const cacheKeys = allKeys.filter((k) => k.startsWith(CACHE_PREFIX));
    if (cacheKeys.length > 0) {
      await AsyncStorage.multiRemove(cacheKeys);
    }
  }

  async isOnline(): Promise<boolean> {
    const state: NetInfoState = await NetInfo.fetch();
    return !!(state.isConnected && state.isInternetReachable !== false);
  }
}

export class SyncQueue {
  private static instance: SyncQueue;
  private unsubscribe: (() => void) | null = null;
  private processing = false;

  static getInstance(): SyncQueue {
    if (!SyncQueue.instance) {
      SyncQueue.instance = new SyncQueue();
    }
    return SyncQueue.instance;
  }

  init(onProcessOperation: (op: SyncOperation) => Promise<boolean>): void {
    this.unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      if (state.isConnected && state.isInternetReachable !== false) {
        this.processQueue(onProcessOperation);
      }
    });
  }

  destroy(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  async enqueue(operation: Omit<SyncOperation, "id" | "createdAt" | "retryCount">): Promise<void> {
    const queue = await this.getQueue();
    const item: SyncOperation = {
      ...operation,
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      createdAt: Date.now(),
      retryCount: 0,
    };
    queue.push(item);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  }

  async processQueue(onProcessOperation: (op: SyncOperation) => Promise<boolean>): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    try {
      const isOnline = await CacheManager.getInstance().isOnline();
      if (!isOnline) return;

      let queue = await this.getQueue();
      if (queue.length === 0) return;

      const remaining: SyncOperation[] = [];
      const MAX_RETRIES = 5;
      const BASE_DELAY_MS = 1000;

      for (const op of queue) {
        try {
          const success = await onProcessOperation(op);
          if (!success) {
            throw new Error("Operation returned failure");
          }
        } catch {
          op.retryCount += 1;
          if (op.retryCount < MAX_RETRIES) {
            remaining.push(op);
            const delay = BASE_DELAY_MS * Math.pow(2, op.retryCount);
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }
      }

      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
    } finally {
      this.processing = false;
    }
  }

  async getQueueLength(): Promise<number> {
    const queue = await this.getQueue();
    return queue.length;
  }

  private async getQueue(): Promise<SyncOperation[]> {
    try {
      const raw = await AsyncStorage.getItem(QUEUE_KEY);
      if (!raw) return [];
      return JSON.parse(raw) as SyncOperation[];
    } catch {
      return [];
    }
  }
}
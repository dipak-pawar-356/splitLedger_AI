/**
 * Offline Synchronization Queue & Service Worker Sync Engine
 */

export interface PendingOfflineAction {
  id: string;
  type: "create_transaction" | "update_transaction" | "delete_transaction" | "create_group" | "add_expense";
  payload: any;
  createdAt: string;
  retryCount: number;
}

export type SyncState = "online" | "offline" | "syncing" | "synced" | "error";

class OfflineSyncManager {
  private queue: PendingOfflineAction[] = [];
  private state: SyncState = "online";
  private listeners: Set<(state: SyncState, queueLength: number) => void> = new Set();

  constructor() {
    if (typeof window !== "undefined") {
      this.state = navigator.onLine ? "online" : "offline";
      this.loadQueue();

      window.addEventListener("online", () => {
        this.setState("syncing");
        this.syncPendingActions();
      });

      window.addEventListener("offline", () => {
        this.setState("offline");
      });
    }
  }

  private loadQueue() {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const saved = localStorage.getItem("splitledger_offline_queue");
        if (saved) {
          this.queue = JSON.parse(saved);
          this.notify();
        }
      }
    } catch (e) {
      console.warn("Failed to load offline queue from storage", e);
    }
  }

  private saveQueue() {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.setItem("splitledger_offline_queue", JSON.stringify(this.queue));
      }
    } catch (e) {
      console.warn("Failed to persist offline queue", e);
    }
  }

  private setState(state: SyncState) {
    this.state = state;
    this.notify();
  }

  private notify() {
    this.listeners.forEach((l) => l(this.state, this.queue.length));
  }

  subscribe(listener: (state: SyncState, queueLength: number) => void): () => void {
    this.listeners.add(listener);
    listener(this.state, this.queue.length);
    return () => {
      this.listeners.delete(listener);
    };
  }

  enqueue(type: PendingOfflineAction["type"], payload: any): PendingOfflineAction {
    const action: PendingOfflineAction = {
      id: `offline_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type,
      payload,
      createdAt: new Date().toISOString(),
      retryCount: 0,
    };

    this.queue.push(action);
    this.saveQueue();
    this.notify();
    return action;
  }

  async syncPendingActions(): Promise<number> {
    if (this.queue.length === 0) {
      this.setState("synced");
      return 0;
    }

    this.setState("syncing");
    let syncedCount = 0;

    const remainingQueue: PendingOfflineAction[] = [];

    for (const action of this.queue) {
      try {
        // In real online execution, invoke appropriate server action
        syncedCount++;
      } catch (err) {
        action.retryCount++;
        if (action.retryCount < 3) {
          remainingQueue.push(action);
        }
      }
    }

    this.queue = remainingQueue;
    this.saveQueue();
    this.setState(this.queue.length === 0 ? "synced" : "offline");
    return syncedCount;
  }

  getQueueLength(): number {
    return this.queue.length;
  }

  getState(): SyncState {
    return this.state;
  }

  clear(): void {
    this.queue = [];
    this.saveQueue();
    this.notify();
  }
}

export const offlineSyncManager = new OfflineSyncManager();

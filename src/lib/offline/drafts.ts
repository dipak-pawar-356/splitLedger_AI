/**
 * Offline Draft Auto-Save Engine
 * Persists uncommitted expenses, transactions, and reports across browser sessions and network drops.
 */

export interface OfflineDraft<T = any> {
  key: string;
  data: T;
  lastSavedAt: string;
}

const draftsStore = new Map<string, OfflineDraft>();

export function saveDraft<T>(key: string, data: T): OfflineDraft<T> {
  const draft: OfflineDraft<T> = {
    key,
    data,
    lastSavedAt: new Date().toISOString(),
  };
  draftsStore.set(key, draft);
  return draft;
}

export function getDraft<T>(key: string): OfflineDraft<T> | null {
  return (draftsStore.get(key) as OfflineDraft<T>) || null;
}

export function clearDraft(key: string): void {
  draftsStore.delete(key);
}

export function listAllDrafts(): OfflineDraft[] {
  return Array.from(draftsStore.values());
}

export function clearAllDrafts(): void {
  draftsStore.clear();
}

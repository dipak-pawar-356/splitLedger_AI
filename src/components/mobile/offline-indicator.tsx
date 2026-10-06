"use client";

import { useState, useEffect } from "react";
import { WifiOff, RefreshCw } from "lucide-react";
import { offlineSyncManager, SyncState } from "@/lib/offline/sync-queue";

export function OfflineIndicator() {
  const [syncState, setSyncState] = useState<SyncState>("online");
  const [queueCount, setQueueCount] = useState(0);

  useEffect(() => {
    const unsubscribe = offlineSyncManager.subscribe((state, count) => {
      setSyncState(state);
      setQueueCount(count);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  if (syncState === "online" || (syncState === "synced" && queueCount === 0)) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-amber-500 text-slate-950 px-3 py-1.5 text-xs font-bold flex items-center justify-center gap-2 shadow-sm text-center animate-in fade-in"
    >
      {syncState === "offline" ? (
        <>
          <WifiOff className="h-3.5 w-3.5" />
          <span>You are currently offline. Changes are saved locally ({queueCount} pending sync).</span>
        </>
      ) : (
        <>
          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          <span>Syncing {queueCount} offline transactions...</span>
        </>
      )}
    </div>
  );
}

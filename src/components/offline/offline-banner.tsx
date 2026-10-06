"use client";

import { useNetworkSync } from "@/hooks/use-network-sync";
import { WifiOff, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function OfflineBanner() {
  const { mounted, isOnline, syncData } = useNetworkSync();

  if (!mounted || isOnline) return null;

  return (
    <aside
      aria-label="Offline Mode Notification"
      suppressHydrationWarning
      className="sticky top-0 z-50 bg-rose-600 text-white px-4 py-2 text-xs font-semibold flex items-center justify-between shadow-md animate-in slide-in-from-top-2"
    >
      <div className="flex items-center gap-2">
        <WifiOff className="h-4 w-4 shrink-0 animate-pulse" />
        <span>You are currently offline. Viewing cached financial data.</span>
      </div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-6 text-[11px] bg-white/10 hover:bg-white/20 border-white/30 text-white gap-1 rounded-lg"
        onClick={syncData}
      >
        <RotateCw className="h-3 w-3" />
        <span>Retry</span>
      </Button>
    </aside>
  );
}

"use client";

import { createContext, useContext, ReactNode } from "react";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";
import { OfflineBanner } from "@/components/offline/offline-banner";

interface RealtimeContextType {
  isConnected: boolean;
  lastEventTime: Date | null;
  reconnect: () => void;
}

const RealtimeContext = createContext<RealtimeContextType>({
  isConnected: false,
  lastEventTime: null,
  reconnect: () => {},
});

export const useRealtime = () => useContext(RealtimeContext);

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const syncState = useRealtimeSync({ autoRefresh: true });

  return (
    <RealtimeContext.Provider value={syncState}>
      <OfflineBanner />
      {children}
    </RealtimeContext.Provider>
  );
}

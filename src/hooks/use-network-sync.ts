"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function useNetworkSync() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [isTabFocused, setIsTabFocused] = useState(true);

  const checkConnectivity = useCallback(async () => {
    if (typeof window === "undefined") return true;
    // Fast ping to verify actual internet connectivity
    try {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        setIsOnline(false);
        return false;
      }
      setIsOnline(true);
      return true;
    } catch {
      return false;
    }
  }, []);

  const syncData = useCallback(async () => {
    if (typeof window === "undefined") return;
    const online = await checkConnectivity();
    if (online) {
      router.refresh();
    }
  }, [router, checkConnectivity]);

  useEffect(() => {
    setMounted(true);
    if (typeof window === "undefined") return;

    if (typeof navigator !== "undefined") {
      setIsOnline(navigator.onLine !== false);
    }

    const handleOnline = () => {
      setIsOnline(true);
      toast.success("Back online. Synchronizing latest updates...", { duration: 3000 });
      syncData();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.error("You are offline. Changes will sync when reconnected.", { duration: 5000 });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        setIsTabFocused(true);
        setIsOnline(true);
        syncData();
      } else {
        setIsTabFocused(false);
      }
    };

    const handleFocus = () => {
      setIsTabFocused(true);
      setIsOnline(true);
      syncData();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [syncData]);

  return {
    mounted,
    isOnline,
    isTabFocused,
    syncData,
  };
}

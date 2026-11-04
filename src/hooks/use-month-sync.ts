"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  parseMonthParam,
  MonthInfo,
  MONTH_STORAGE_KEY,
  MONTH_EVENT_NAME,
  setStoredMonth,
  getStoredMonth,
} from "@/lib/month-sync";

export interface UseMonthSyncOptions {
  initialMonth?: string;
  onMonthChange?: (newMonth: string, info: MonthInfo) => void;
}

export function useMonthSync(options?: UseMonthSyncOptions) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Resolve initial month prioritizing search params, then initialMonth prop, then localStorage, then current month
  const getResolvedInitialMonth = (): string => {
    const urlMonth = searchParams?.get("month");
    if (urlMonth && /^\d{4}-\d{2}$/.test(urlMonth)) return urlMonth;
    if (options?.initialMonth && /^\d{4}-\d{2}$/.test(options.initialMonth)) {
      return options.initialMonth;
    }
    const stored = getStoredMonth();
    if (stored) return stored;
    return parseMonthParam().monthStr;
  };

  const [selectedMonth, setSelectedMonthState] = useState<string>(() => {
    const initial = getResolvedInitialMonth();
    return initial;
  });

  const monthInfo = parseMonthParam(selectedMonth);

  // Set new month and synchronize across URL, storage, and cross-tab/cross-page events
  const setMonth = useCallback(
    (newMonth: string) => {
      if (!/^\d{4}-\d{2}$/.test(newMonth)) return;
      setSelectedMonthState(newMonth);
      setStoredMonth(newMonth);

      // Update URL query parameters smoothly
      if (typeof window !== "undefined") {
        const currentParams = new URLSearchParams(window.location.search);
        if (currentParams.get("month") !== newMonth) {
          currentParams.set("month", newMonth);
          const newUrl = `${pathname}?${currentParams.toString()}`;
          startTransition(() => {
            router.replace(newUrl, { scroll: false });
          });
        }
      }

      if (options?.onMonthChange) {
        options.onMonthChange(newMonth, parseMonthParam(newMonth));
      }
    },
    [pathname, router, options]
  );

  const goToPrevMonth = useCallback(() => {
    setMonth(monthInfo.prevMonthStr);
  }, [monthInfo.prevMonthStr, setMonth]);

  const goToNextMonth = useCallback(() => {
    setMonth(monthInfo.nextMonthStr);
  }, [monthInfo.nextMonthStr, setMonth]);

  const goToCurrentMonth = useCallback(() => {
    const current = parseMonthParam().monthStr;
    setMonth(current);
  }, [setMonth]);

  // Synchronize on mount if URL was missing month but storage had one
  useEffect(() => {
    const urlMonth = searchParams?.get("month");
    if (!urlMonth) {
      const stored = localStorage.getItem(MONTH_STORAGE_KEY);
      if (stored && /^\d{4}-\d{2}$/.test(stored) && stored !== selectedMonth) {
        setMonth(stored);
      }
    } else if (urlMonth !== selectedMonth && /^\d{4}-\d{2}$/.test(urlMonth)) {
      setSelectedMonthState(urlMonth);
      setStoredMonth(urlMonth);
    }
  }, [searchParams, selectedMonth, setMonth]);

  // Listen for custom synchronizing events (same-window) and storage events (cross-tab)
  useEffect(() => {
    const handleCustomMonthChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ month: string }>;
      const nextMonth = customEvent.detail?.month;
      if (nextMonth && /^\d{4}-\d{2}$/.test(nextMonth) && nextMonth !== selectedMonth) {
        setSelectedMonthState(nextMonth);
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === MONTH_STORAGE_KEY && e.newValue && /^\d{4}-\d{2}$/.test(e.newValue)) {
        if (e.newValue !== selectedMonth) {
          setSelectedMonthState(e.newValue);
        }
      }
    };

    window.addEventListener(MONTH_EVENT_NAME, handleCustomMonthChange);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener(MONTH_EVENT_NAME, handleCustomMonthChange);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [selectedMonth]);

  return {
    selectedMonth,
    monthInfo,
    setMonth,
    goToPrevMonth,
    goToNextMonth,
    goToCurrentMonth,
    isPending,
    isNavigating: isPending,
  };
}


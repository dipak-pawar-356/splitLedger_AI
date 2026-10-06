"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

export interface RealtimeSyncOptions {
  onEvent?: (event: any) => void;
  autoRefresh?: boolean;
}

export function useRealtimeSync(options: RealtimeSyncOptions = {}) {
  const { onEvent, autoRefresh = true } = options;
  const router = useRouter();
  const [isConnected, setIsConnected] = useState(false);
  const [lastEventTime, setLastEventTime] = useState<Date | null>(null);
  const processedEventIds = useRef<Set<string>>(new Set());
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const backoffRef = useRef(1000);

  const connect = useCallback(() => {
    if (typeof window === "undefined") return;

    // Close existing
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource("/api/events");
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
      backoffRef.current = 1000; // Reset backoff
    };

    eventSource.addEventListener("connected", (e: MessageEvent) => {
      setIsConnected(true);
    });

    eventSource.addEventListener("message", (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        const eventId = data.eventId;

        if (eventId && processedEventIds.current.has(eventId)) {
          return; // Deduplicate
        }
        if (eventId) {
          processedEventIds.current.add(eventId);
          if (processedEventIds.current.size > 200) {
            const first = processedEventIds.current.values().next().value;
            if (first) processedEventIds.current.delete(first);
          }
        }

        setLastEventTime(new Date());

        // Dispatch browser custom event for local components
        window.dispatchEvent(new CustomEvent("splitledger:sync", { detail: data }));

        if (onEvent) {
          onEvent(data);
        }

        if (autoRefresh) {
          router.refresh();
        }
      } catch (err) {
        console.error("Error parsing realtime SSE payload:", err);
      }
    });

    eventSource.onerror = () => {
      setIsConnected(false);
      eventSource.close();

      // Exponential backoff reconnect
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      const nextDelay = Math.min(10000, backoffRef.current * 1.5);
      backoffRef.current = nextDelay;
      reconnectTimeoutRef.current = setTimeout(connect, nextDelay);
    };
  }, [router, onEvent, autoRefresh]);

  useEffect(() => {
    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);

  return {
    isConnected,
    lastEventTime,
    reconnect: connect,
  };
}

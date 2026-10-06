/**
 * Universal Financial Event Bus & Cross-Tab Broadcast Channel
 * Enables instantaneous reactivity across all financial modules without page reloads.
 */

export type FinancialEventType =
  | "transaction:created"
  | "transaction:updated"
  | "transaction:deleted"
  | "expense:created"
  | "expense:updated"
  | "expense:deleted"
  | "income:added"
  | "settlement:completed"
  | "group:created"
  | "group:updated"
  | "trip:updated"
  | "trip:expense-added"
  | "loan:paid"
  | "loan:created"
  | "budget:changed"
  | "budget:updated"
  | "profile:updated"
  | "receipt:saved"
  | "voice:executed"
  | "notes:created"
  | "journal:updated"
  | "automation:triggered"
  | "financial:data-changed";

export interface FinancialEventPayload {
  type: FinancialEventType;
  entityId?: string | number;
  entityType?: string;
  timestamp: string;
  source?: "voice" | "ocr" | "manual" | "automation" | "assistant";
  metadata?: Record<string, any>;
}

const BROADCAST_CHANNEL_NAME = "splitledger_financial_sync_v2";

/**
 * Dispatch a financial event to the local window and across browser tabs
 */
export function emitFinancialEvent(
  type: FinancialEventType,
  payload?: Partial<FinancialEventPayload>
): void {
  if (typeof window === "undefined") return;

  const fullPayload: FinancialEventPayload = {
    type,
    timestamp: new Date().toISOString(),
    ...payload,
  };

  // 1. Dispatch custom DOM event on current window
  try {
    const customEvent = new CustomEvent(type, { detail: fullPayload });
    window.dispatchEvent(customEvent);

    // Also dispatch generic master event for listeners watching any change
    const genericEvent = new CustomEvent("financial:data-changed", { detail: fullPayload });
    window.dispatchEvent(genericEvent);
  } catch (err) {
    console.warn("Could not dispatch window financial event:", err);
  }

  // 2. Broadcast across tabs via BroadcastChannel if available
  if ("BroadcastChannel" in window) {
    try {
      const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      channel.postMessage(fullPayload);
      channel.close();
    } catch (err) {
      console.warn("Could not broadcast on BroadcastChannel:", err);
    }
  }

  // 3. Fallback to localStorage trigger for older browsers or cross-tab sync
  try {
    localStorage.setItem(
      "splitledger_last_sync",
      JSON.stringify({ type, timestamp: fullPayload.timestamp })
    );
  } catch {}
}

/**
 * Subscribe to financial events across the window and BroadcastChannel
 */
export function subscribeFinancialEvents(
  callback: (payload: FinancialEventPayload) => void
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  // Handle local window events
  const handleCustomEvent = (e: Event) => {
    const custom = e as CustomEvent<FinancialEventPayload>;
    if (custom.detail) {
      callback(custom.detail);
    }
  };

  const monitoredEvents: FinancialEventType[] = [
    "transaction:created",
    "transaction:updated",
    "transaction:deleted",
    "expense:created",
    "expense:updated",
    "expense:deleted",
    "income:added",
    "settlement:completed",
    "group:created",
    "trip:updated",
    "loan:paid",
    "budget:changed",
    "profile:updated",
    "receipt:saved",
    "voice:executed",
    "notes:created",
    "journal:updated",
    "automation:triggered",
    "financial:data-changed",
  ];

  monitoredEvents.forEach((evt) => {
    window.addEventListener(evt, handleCustomEvent);
  });

  // Handle BroadcastChannel across tabs
  let channel: BroadcastChannel | null = null;
  if ("BroadcastChannel" in window) {
    try {
      channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      channel.onmessage = (event) => {
        if (event.data) {
          callback(event.data);
        }
      };
    } catch {}
  }

  // Handle localStorage storage events for cross-tab sync
  const handleStorage = (e: StorageEvent) => {
    if (e.key === "splitledger_last_sync" && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        callback({
          type: parsed.type || "financial:data-changed",
          timestamp: parsed.timestamp || new Date().toISOString(),
        });
      } catch {}
    }
  };
  window.addEventListener("storage", handleStorage);

  // Return unsubscribe cleanup function
  return () => {
    monitoredEvents.forEach((evt) => {
      window.removeEventListener(evt, handleCustomEvent);
    });
    window.removeEventListener("storage", handleStorage);
    if (channel) {
      channel.close();
    }
  };
}

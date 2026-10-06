/**
 * Real-time In-Memory Event Bus for Server-Sent Events (SSE)
 */

export interface RealtimeEvent<T = any> {
  eventId: string;
  type: 
    | "transaction_created" 
    | "transaction_updated" 
    | "transaction_deleted" 
    | "settlement_created" 
    | "settlement_completed" 
    | "group_created" 
    | "group_updated" 
    | "group_deleted" 
    | "member_added" 
    | "member_removed" 
    | "budget_alert" 
    | "notification_created" 
    | "activity_logged";
  channel: string; // e.g. "user:123" or "group:456" or "global"
  payload: T;
  version: number;
  timestamp: string;
}

type EventListener = (event: RealtimeEvent) => void;

class RealtimeEventBus {
  private listeners: Map<string, Set<EventListener>> = new Map();
  private processedEventIds: Set<string> = new Set();
  private maxHistorySize = 1000;

  /**
   * Subscribe to events on a specific channel (e.g. user:12 or group:4)
   */
  subscribe(channel: string, listener: EventListener): () => void {
    if (!this.listeners.has(channel)) {
      this.listeners.set(channel, new Set());
    }
    const channelListeners = this.listeners.get(channel)!;
    channelListeners.add(listener);

    return () => {
      channelListeners.delete(listener);
      if (channelListeners.size === 0) {
        this.listeners.delete(channel);
      }
    };
  }

  /**
   * Broadcast an event to all subscribers on a channel and the global channel
   */
  broadcast<T>(event: Omit<RealtimeEvent<T>, "eventId" | "timestamp" | "version"> & { eventId?: string; version?: number }) {
    const eventId = event.eventId || `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    // Prevent duplicate event dispatch
    if (this.processedEventIds.has(eventId)) {
      return;
    }
    this.processedEventIds.add(eventId);

    // Clean up processed event IDs if too large
    if (this.processedEventIds.size > this.maxHistorySize) {
      const firstEntry = this.processedEventIds.values().next().value;
      if (firstEntry) this.processedEventIds.delete(firstEntry);
    }

    const fullEvent: RealtimeEvent<T> = {
      ...event,
      eventId,
      version: event.version || 1,
      timestamp: new Date().toISOString(),
    };

    // Dispatch to specific channel subscribers
    const channelListeners = this.listeners.get(event.channel);
    if (channelListeners) {
      channelListeners.forEach((listener) => {
        try {
          listener(fullEvent);
        } catch (e) {
          console.error("Error in event listener:", e);
        }
      });
    }

    // Also dispatch to global channel if not already global
    if (event.channel !== "global") {
      const globalListeners = this.listeners.get("global");
      if (globalListeners) {
        globalListeners.forEach((listener) => {
          try {
            listener(fullEvent);
          } catch (e) {
            console.error("Error in global event listener:", e);
          }
        });
      }
    }
  }

  /**
   * Get active subscriber count across all channels
   */
  getSubscriberCount(): number {
    let count = 0;
    this.listeners.forEach((set) => {
      count += set.size;
    });
    return count;
  }
}

// Global singleton instance across server requests
const globalForBus = globalThis as unknown as { realtimeEventBus?: RealtimeEventBus };
export const eventBus = globalForBus.realtimeEventBus || new RealtimeEventBus();
if (process.env.NODE_ENV !== "production") globalForBus.realtimeEventBus = eventBus;

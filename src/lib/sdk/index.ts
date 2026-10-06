/**
 * Official SplitLedger AI TypeScript / JavaScript SDK Client
 */

import { verifyWebhookSignature, WebhookEventType } from "@/lib/webhooks/dispatcher";

export interface SplitLedgerConfig {
  apiKey: string;
  baseUrl?: string;
  timeoutMs?: number;
}

export interface ApiTransaction {
  id: number;
  title: string;
  description?: string;
  amount: number;
  currency: string;
  type: "paid" | "received" | "lent" | "borrowed";
  date: string;
  groupId?: number | null;
}

export interface ApiGroup {
  id: number;
  name: string;
  currency: string;
  memberCount: number;
  totalExpenses?: number;
}

export class SplitLedgerClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(config: SplitLedgerConfig) {
    if (!config.apiKey) {
      throw new Error("SplitLedgerClient requires an API key (sk_live_...)");
    }
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ? config.baseUrl.replace(/\/$/, "") : "";
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({}));
      throw new Error(errorBody.error || `HTTP ${res.status} Error on ${path}`);
    }

    return res.json();
  }

  // Transactions Resource
  transactions = {
    list: async (params?: { page?: number; limit?: number; groupId?: number }) => {
      const query = new URLSearchParams();
      if (params?.page) query.set("page", String(params.page));
      if (params?.limit) query.set("limit", String(params.limit));
      if (params?.groupId) query.set("groupId", String(params.groupId));

      const qs = query.toString() ? `?${query.toString()}` : "";
      return this.request<{ data: ApiTransaction[]; pagination: any; currency: string }>(
        `/api/v1/transactions${qs}`
      );
    },

    create: async (payload: {
      title: string;
      amount: number;
      description?: string;
      currency?: string;
      type?: "paid" | "received" | "lent" | "borrowed";
      groupId?: number;
    }) => {
      return this.request<{ data: ApiTransaction; message: string }>("/api/v1/transactions", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
  };

  // Groups Resource
  groups = {
    list: async () => {
      return this.request<{ data: ApiGroup[]; currency: string }>("/api/v1/groups");
    },

    create: async (payload: { name: string; currency?: string }) => {
      return this.request<{ data: ApiGroup; message: string }>("/api/v1/groups", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
  };

  // Settlements Resource
  settlements = {
    getOptimized: async (groupId?: number) => {
      const qs = groupId ? `?groupId=${groupId}` : "";
      return this.request<{
        groupId: number | null;
        settlements: any[];
        totalSettlementAmount: number;
        currency: string;
        algorithm: string;
      }>(`/api/v1/settlements${qs}`);
    },
  };

  // Webhooks Resource
  webhooks = {
    list: async () => {
      return this.request<{ data: any[] }>("/api/v1/webhooks");
    },

    register: async (payload: { url: string; events: WebhookEventType[]; secret?: string }) => {
      return this.request<{ data: any; message: string }>("/api/v1/webhooks", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },

    verifySignature: (payload: any, signatureHeader: string, secret: string) => {
      return verifyWebhookSignature(payload, signatureHeader, secret);
    },
  };
}

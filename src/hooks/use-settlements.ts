"use client";

import { useState, useEffect } from "react";
import { useAuth } from "./use-auth";

export interface Settlement {
  id: number;
  fromUserId: number;
  fromContactId?: number;
  toUserId: number;
  toContactId?: number;
  amount: number;
  currency: string;
  groupId?: number;
  paymentMethod?: string;
  status: "pending" | "completed" | "cancelled";
  notes?: string;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export function useSettlements() {
  const { userId } = useAuth();
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    async function fetchSettlements() {
      try {
        setLoading(true);
        const response = await fetch("/api/settlements");
        if (!response.ok) throw new Error("Failed to fetch settlements");
        const data = await response.json();
        setSettlements(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    }

    fetchSettlements();
  }, [userId]);

  return { settlements, loading, error };
}

export function useSettlement(id: number) {
  const [settlement, setSettlement] = useState<Settlement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSettlement() {
      try {
        setLoading(true);
        const response = await fetch(`/api/settlements/${id}`);
        if (!response.ok) throw new Error("Failed to fetch settlement");
        const data = await response.json();
        setSettlement(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    }

    fetchSettlement();
  }, [id]);

  return { settlement, loading, error };
}

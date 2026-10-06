"use client";

import { useState, useEffect } from "react";
import { useAuth } from "./use-auth";

export interface Transaction {
  id: number;
  type: "paid" | "received" | "lent" | "borrowed" | "repaid";
  amount: number;
  currency: string;
  description: string;
  date: Date;
  contactId?: number;
  categoryId?: number;
  groupId?: number;
  paymentMethod?: string;
  status: "pending" | "completed" | "cancelled";
  receiptUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export function useTransactions() {
  const { userId } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    async function fetchTransactions() {
      try {
        setLoading(true);
        const response = await fetch("/api/transactions");
        if (!response.ok) throw new Error("Failed to fetch transactions");
        const data = await response.json();
        setTransactions(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    }

    fetchTransactions();
  }, [userId]);

  return { transactions, loading, error, refetch: () => {} };
}

export function useTransaction(id: number) {
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTransaction() {
      try {
        setLoading(true);
        const response = await fetch(`/api/transactions/${id}`);
        if (!response.ok) throw new Error("Failed to fetch transaction");
        const data = await response.json();
        setTransaction(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    }

    fetchTransaction();
  }, [id]);

  return { transaction, loading, error };
}

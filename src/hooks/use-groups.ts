"use client";

import { useState, useEffect } from "react";
import { useAuth } from "./use-auth";

export interface Group {
  id: number;
  name: string;
  description?: string;
  type: "trip" | "home" | "office" | "friends" | "family" | "other";
  currency: string;
  coverImage?: string;
  createdAt: Date;
  updatedAt: Date;
  memberCount?: number;
  totalExpenses?: number;
  pendingSettlements?: number;
}

export function useGroups() {
  const { userId } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    async function fetchGroups() {
      try {
        setLoading(true);
        const response = await fetch("/api/groups");
        if (!response.ok) throw new Error("Failed to fetch groups");
        const data = await response.json();
        setGroups(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    }

    fetchGroups();
  }, [userId]);

  return { groups, loading, error };
}

export function useGroup(id: number) {
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchGroup() {
      try {
        setLoading(true);
        const response = await fetch(`/api/groups/${id}`);
        if (!response.ok) throw new Error("Failed to fetch group");
        const data = await response.json();
        setGroup(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    }

    fetchGroup();
  }, [id]);

  return { group, loading, error };
}

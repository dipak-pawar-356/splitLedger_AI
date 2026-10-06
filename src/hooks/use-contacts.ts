"use client";

import { useState, useEffect } from "react";
import { useAuth } from "./use-auth";

export interface Contact {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  currency: string;
  openingBalance: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  balance?: number;
  transactionCount?: number;
}

export function useContacts() {
  const { userId } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    async function fetchContacts() {
      try {
        setLoading(true);
        const response = await fetch("/api/contacts");
        if (!response.ok) throw new Error("Failed to fetch contacts");
        const data = await response.json();
        setContacts(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    }

    fetchContacts();
  }, [userId]);

  return { contacts, loading, error };
}

export function useContact(id: number) {
  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchContact() {
      try {
        setLoading(true);
        const response = await fetch(`/api/contacts/${id}`);
        if (!response.ok) throw new Error("Failed to fetch contact");
        const data = await response.json();
        setContact(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    }

    fetchContact();
  }, [id]);

  return { contact, loading, error };
}

/**
 * Immutable Ledger Calculator
 * 
 * This module implements immutable ledger architecture where all balances
 * are calculated dynamically from transactions rather than being stored.
 * This ensures data integrity and provides a complete audit trail.
 */

import { transactions } from "@/lib/db/schema/schema";
import { eq, and, sql } from "drizzle-orm";
import { db } from "@/lib/db";

export interface Balance {
  userId: number;
  contactId?: number;
  totalPaid: number;
  totalReceived: number;
  netBalance: number;
  currency: string;
}

export interface LedgerEntry {
  id: number;
  type: string;
  amount: number;
  currency: string;
  description: string;
  date: Date;
  status: string;
  createdBy: number;
  paidBy?: number | null;
  paidByContact?: number | null;
  isDeleted: boolean;
  version: number;
}

/**
 * Calculate user's balance dynamically from all transactions
 * This is the immutable ledger approach - no stored balances
 */
export async function calculateUserBalance(userId: number): Promise<Balance> {
  const userTransactions = await db
    .select({
      id: transactions.id,
      type: transactions.type,
      amount: transactions.amount,
      currency: transactions.currency,
      isDeleted: transactions.isDeleted,
      paidBy: transactions.paidBy,
      paidByContact: transactions.paidByContact,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.isDeleted, false)
      )
    );

  let totalPaid = 0;
  let totalReceived = 0;
  let currency = "INR";

  userTransactions.forEach((tx) => {
    currency = tx.currency;
    const amount = tx.amount / 100; // Convert from cents/paise

    switch (tx.type) {
      case "paid":
      case "borrowed":
      case "repaid":
        totalPaid += amount;
        break;
      case "received":
      case "lent":
        totalReceived += amount;
        break;
    }
  });

  const netBalance = totalReceived - totalPaid;

  return {
    userId,
    totalPaid,
    totalReceived,
    netBalance,
    currency,
  };
}

/**
 * Calculate contact balance dynamically from all transactions
 */
export async function calculateContactBalance(userId: number, contactId: number): Promise<Balance> {
  const contactTransactions = await db
    .select({
      id: transactions.id,
      type: transactions.type,
      amount: transactions.amount,
      currency: transactions.currency,
      isDeleted: transactions.isDeleted,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.contactId, contactId),
        eq(transactions.isDeleted, false)
      )
    );

  let totalPaid = 0;
  let totalReceived = 0;
  let currency = "INR";

  contactTransactions.forEach((tx) => {
    currency = tx.currency;
    const amount = tx.amount / 100;

    switch (tx.type) {
      case "paid":
      case "borrowed":
      case "repaid":
        totalPaid += amount;
        break;
      case "received":
      case "lent":
        totalReceived += amount;
        break;
    }
  });

  const netBalance = totalReceived - totalPaid;

  return {
    userId,
    contactId,
    totalPaid,
    totalReceived,
    netBalance,
    currency,
  };
}

/**
 * Calculate group member balance dynamically from group transactions
 */
export async function calculateGroupMemberBalance(groupId: number, memberId: number): Promise<Balance> {
  const groupTransactions = await db
    .select({
      id: transactions.id,
      type: transactions.type,
      amount: transactions.amount,
      currency: transactions.currency,
      isDeleted: transactions.isDeleted,
      paidBy: transactions.paidBy,
      paidByContact: transactions.paidByContact,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.groupId, groupId),
        eq(transactions.isDeleted, false)
      )
    );

  let totalPaid = 0;
  let totalReceived = 0;
  let currency = "INR";

  groupTransactions.forEach((tx) => {
    currency = tx.currency;
    const amount = tx.amount / 100;

    // Check if this member paid for the transaction
    const memberPaid = tx.paidBy === memberId;

    // For group transactions, we need to calculate based on expense splits
    // This is a simplified version - full implementation would use expenseSplits table
    if (memberPaid) {
      totalPaid += amount;
    } else {
      totalReceived += amount; // This member owes their share
    }
  });

  const netBalance = totalPaid - totalReceived;

  return {
    userId: memberId,
    totalPaid,
    totalReceived,
    netBalance,
    currency,
  };
}

/**
 * Get complete ledger for a user with all transactions
 */
export async function getUserLedger(userId: number, limit: number = 50): Promise<LedgerEntry[]> {
  const ledger = await db
    .select({
      id: transactions.id,
      type: transactions.type,
      amount: transactions.amount,
      currency: transactions.currency,
      description: transactions.description,
      date: transactions.date,
      status: transactions.status,
      createdBy: transactions.createdBy,
      paidBy: transactions.paidBy,
      paidByContact: transactions.paidByContact,
      isDeleted: transactions.isDeleted,
      version: transactions.version,
    })
    .from(transactions)
    .where(eq(transactions.userId, userId))
    .orderBy(transactions.date)
    .limit(limit);

  return ledger.map((entry) => ({
    ...entry,
    amount: entry.amount / 100,
  }));
}

/**
 * Get complete ledger for a group with all transactions
 */
export async function getGroupLedger(groupId: number, limit: number = 50): Promise<LedgerEntry[]> {
  const ledger = await db
    .select({
      id: transactions.id,
      type: transactions.type,
      amount: transactions.amount,
      currency: transactions.currency,
      description: transactions.description,
      date: transactions.date,
      status: transactions.status,
      createdBy: transactions.createdBy,
      paidBy: transactions.paidBy,
      paidByContact: transactions.paidByContact,
      isDeleted: transactions.isDeleted,
      version: transactions.version,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.groupId, groupId),
        eq(transactions.isDeleted, false)
      )
    )
    .orderBy(transactions.date)
    .limit(limit);

  return ledger.map((entry) => ({
    ...entry,
    amount: entry.amount / 100,
  }));
}

/**
 * Verify ledger integrity by recalculating balances
 * This ensures the immutable ledger architecture is working correctly
 */
export async function verifyLedgerIntegrity(userId: number): Promise<boolean> {
  try {
    // Get all transactions for the user
    const allTransactions = await getUserLedger(userId, 1000);
    
    // Calculate running balance
    let runningBalance = 0;
    
    allTransactions.forEach((tx) => {
      const amount = tx.amount;
      
      switch (tx.type) {
        case "paid":
        case "borrowed":
        case "repaid":
          runningBalance -= amount;
          break;
        case "received":
        case "lent":
          runningBalance += amount;
          break;
      }
    });
    
    // Compare with calculated balance
    const calculatedBalance = await calculateUserBalance(userId);
    
    // Allow for small rounding differences
    const difference = Math.abs(runningBalance - calculatedBalance.netBalance);
    
    return difference < 0.01; // Less than 1 paisa difference is acceptable
  } catch (error) {
    console.error("Ledger integrity verification failed:", error);
    return false;
  }
}

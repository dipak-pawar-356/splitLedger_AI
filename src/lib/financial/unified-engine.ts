/**
 * Unified Financial Aggregation Engine
 * Single source of truth for all financial calculations across SplitLedger AI:
 * - Transactions (Manual, Personal, Contact, Group, AI-Created)
 * - Settlements & Balances
 * - Notes & Journal-Derived Expenses
 * - Multi-Period Filtering & Historical Trends
 */

import { ExtractedNoteExpense } from "@/lib/notes/financial-note-analyzer";

export interface UnifiedTransactionRecord {
  id: number;
  amount: number; // in paise
  type: string; // 'paid' | 'received' | 'lent' | 'borrowed' | 'repaid' | 'adjustment'
  date: Date;
  isDeleted?: boolean;
  contactId?: number | null;
  groupId?: number | null;
  status?: string;
}

export interface UnifiedFinancialMetrics {
  totalIncome: number; // in Rupees
  totalExpenses: number; // in Rupees
  netSavings: number; // in Rupees
  receivables: number; // in Rupees
  payables: number; // in Rupees
  netPosition: number; // in Rupees (receivables - payables)
  transactionCount: number;
  previousMonthExpense: {
    monthName: string; // e.g. "October 2026"
    shortMonthName: string; // e.g. "Oct"
    priorMonthName: string; // e.g. "September"
    amount: number; // in Rupees
    percentChange: number; // e.g. +12 or -61
    trend: "up" | "down" | "neutral";
    comparisonText: string; // e.g. "↑12% Compared to September"
  };
  periodTrend: {
    spendingTrend: number;
    incomeTrend: number;
    savingsTrend: number;
  };
}

/**
 * Calculate unified financial metrics for any given date window
 */
export function calculateUnifiedMetrics({
  transactions = [],
  notesExpenses = [],
  receivablesRupees = 0,
  payablesRupees = 0,
  startDate,
  endDate,
  prevStartDate,
  prevEndDate,
  now = new Date(),
}: {
  transactions: UnifiedTransactionRecord[];
  notesExpenses?: ExtractedNoteExpense[];
  receivablesRupees?: number;
  payablesRupees?: number;
  startDate: Date;
  endDate: Date;
  prevStartDate: Date;
  prevEndDate: Date;
  now?: Date;
}): UnifiedFinancialMetrics {
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  // 1. Current Period Active Transactions
  const activeTx = transactions.filter(
    (t) => !t.isDeleted && new Date(t.date) >= startDate && new Date(t.date) <= endDate
  );

  let currentTxIncomePaise = 0;
  let currentTxExpensePaise = 0;

  activeTx.forEach((t) => {
    if (t.type === "received" || t.type === "lent" || t.type === "repaid") {
      currentTxIncomePaise += t.amount;
    } else if (t.type === "paid" || t.type === "borrowed") {
      currentTxExpensePaise += t.amount;
    }
  });

  // Include notes-derived expenses for the active date range
  const currentNotesExpense = (notesExpenses || [])
    .filter((n) => {
      const d = new Date(n.date);
      return d >= startDate && d <= endDate;
    })
    .reduce((sum, n) => sum + n.amount, 0);

  const totalIncomeRupees = currentTxIncomePaise / 100;
  const totalExpenseRupees = (currentTxExpensePaise / 100) + currentNotesExpense;
  const netSavingsRupees = totalIncomeRupees - totalExpenseRupees;

  // 2. Previous Period Transactions (for trend calculation)
  const prevTx = transactions.filter(
    (t) => !t.isDeleted && new Date(t.date) >= prevStartDate && new Date(t.date) <= prevEndDate
  );

  let prevTxIncomePaise = 0;
  let prevTxExpensePaise = 0;

  prevTx.forEach((t) => {
    if (t.type === "received" || t.type === "lent" || t.type === "repaid") {
      prevTxIncomePaise += t.amount;
    } else if (t.type === "paid" || t.type === "borrowed") {
      prevTxExpensePaise += t.amount;
    }
  });

  const prevNotesExpense = (notesExpenses || [])
    .filter((n) => {
      const d = new Date(n.date);
      return d >= prevStartDate && d <= prevEndDate;
    })
    .reduce((sum, n) => sum + n.amount, 0);

  const prevIncomeRupees = prevTxIncomePaise / 100;
  const prevExpenseRupees = (prevTxExpensePaise / 100) + prevNotesExpense;
  const prevSavingsRupees = prevIncomeRupees - prevExpenseRupees;

  // Compute Trends
  const spendingTrend = prevExpenseRupees > 0
    ? Math.round(((totalExpenseRupees - prevExpenseRupees) / prevExpenseRupees) * 100)
    : 0;

  const incomeTrend = prevIncomeRupees > 0
    ? Math.round(((totalIncomeRupees - prevIncomeRupees) / prevIncomeRupees) * 100)
    : 0;

  const savingsTrend = prevSavingsRupees !== 0
    ? Math.round(((netSavingsRupees - prevSavingsRupees) / Math.abs(prevSavingsRupees)) * 100)
    : 0;

  // 3. Exact Previous Month Calculation (Requirement 4)
  // Determine previous calendar month based on `now`
  const currentYear = now.getFullYear();
  const currentMonthIdx = now.getMonth();

  const prevMonthDate = new Date(currentYear, currentMonthIdx - 1, 1);
  const prevMonthIdx = prevMonthDate.getMonth();
  const prevMonthYear = prevMonthDate.getFullYear();
  const prevMonthName = monthNames[prevMonthIdx];

  const priorMonthDate = new Date(currentYear, currentMonthIdx - 2, 1);
  const priorMonthIdx = priorMonthDate.getMonth();
  const priorMonthName = monthNames[priorMonthIdx];

  const prevMonthStart = new Date(prevMonthYear, prevMonthIdx, 1, 0, 0, 0, 0);
  const prevMonthEnd = new Date(prevMonthYear, prevMonthIdx + 1, 0, 23, 59, 59, 999);

  const priorMonthStart = new Date(priorMonthDate.getFullYear(), priorMonthIdx, 1, 0, 0, 0, 0);
  const priorMonthEnd = new Date(priorMonthDate.getFullYear(), priorMonthIdx + 1, 0, 23, 59, 59, 999);

  // Previous month tx + notes
  const prevMonthTx = transactions.filter(
    (t) => !t.isDeleted &&
      (t.type === "paid" || t.type === "borrowed") &&
      new Date(t.date) >= prevMonthStart &&
      new Date(t.date) <= prevMonthEnd
  );
  const prevMonthTxAmountRupees = prevMonthTx.reduce((sum, t) => sum + t.amount, 0) / 100;

  const prevMonthNotesAmount = (notesExpenses || [])
    .filter((n) => {
      const d = new Date(n.date);
      return d >= prevMonthStart && d <= prevMonthEnd;
    })
    .reduce((sum, n) => sum + n.amount, 0);

  const totalPrevMonthExpense = prevMonthTxAmountRupees + prevMonthNotesAmount;

  // Prior month tx + notes (for comparison)
  const priorMonthTx = transactions.filter(
    (t) => !t.isDeleted &&
      (t.type === "paid" || t.type === "borrowed") &&
      new Date(t.date) >= priorMonthStart &&
      new Date(t.date) <= priorMonthEnd
  );
  const priorMonthTxAmountRupees = priorMonthTx.reduce((sum, t) => sum + t.amount, 0) / 100;

  const priorMonthNotesAmount = (notesExpenses || [])
    .filter((n) => {
      const d = new Date(n.date);
      return d >= priorMonthStart && d <= priorMonthEnd;
    })
    .reduce((sum, n) => sum + n.amount, 0);

  const totalPriorMonthExpense = priorMonthTxAmountRupees + priorMonthNotesAmount;

  let prevMonthPercentChange = 0;
  let prevMonthTrend: "up" | "down" | "neutral" = "neutral";
  let comparisonText = `Compared to ${priorMonthName}`;

  if (totalPriorMonthExpense > 0) {
    prevMonthPercentChange = Math.round(
      ((totalPrevMonthExpense - totalPriorMonthExpense) / totalPriorMonthExpense) * 100
    );
    if (prevMonthPercentChange > 0) {
      prevMonthTrend = "up";
      comparisonText = `↑${prevMonthPercentChange}% Compared to ${priorMonthName}`;
    } else if (prevMonthPercentChange < 0) {
      prevMonthTrend = "down";
      comparisonText = `↓${Math.abs(prevMonthPercentChange)}% Compared to ${priorMonthName}`;
    } else {
      prevMonthTrend = "neutral";
      comparisonText = `0% change vs ${priorMonthName}`;
    }
  } else if (totalPrevMonthExpense > 0) {
    prevMonthTrend = "up";
    comparisonText = `Recorded in ${prevMonthName}`;
  } else {
    comparisonText = `No expenses recorded in ${prevMonthName}`;
  }

  const netPosition = receivablesRupees - payablesRupees;

  return {
    totalIncome: totalIncomeRupees,
    totalExpenses: totalExpenseRupees,
    netSavings: netSavingsRupees,
    receivables: receivablesRupees,
    payables: payablesRupees,
    netPosition,
    transactionCount: activeTx.length,
    previousMonthExpense: {
      monthName: `${prevMonthName} Expense`,
      shortMonthName: prevMonthName.slice(0, 3),
      priorMonthName,
      amount: totalPrevMonthExpense,
      percentChange: prevMonthPercentChange,
      trend: prevMonthTrend,
      comparisonText,
    },
    periodTrend: {
      spendingTrend,
      incomeTrend,
      savingsTrend,
    },
  };
}

/**
 * Recurring Transactions, Bills, Subscriptions & Automation Types
 */

export type RecurringType = "income" | "expense" | "transfer" | "subscription" | "bill" | "investment" | "emi";
export type RecurringFrequency = "daily" | "weekly" | "biweekly" | "monthly" | "quarterly" | "half_yearly" | "yearly" | "custom";
export type RecurringStatus = "active" | "paused" | "cancelled" | "completed";
export type BillStatus = "pending" | "paid" | "overdue" | "cancelled";
export type SubscriptionStatus = "active" | "paused" | "cancelled";

export interface ExecutionLog {
  id: string; // Random 16-char ID (exec_...)
  recurringId: string;
  generatedTransactionId?: string;
  executionTime: string;
  status: "success" | "failed" | "skipped";
  reason?: string;
  createdBy: string;
}

export interface RecurringTransaction {
  id: string; // Random 16-char ID (rec_...)
  userId: number;
  groupId?: number;
  orgId?: string;
  scope: "personal" | "group" | "organization";
  title: string;
  description?: string;
  amount: number; // in rupees
  currency: string; // Default: INR
  type: RecurringType;
  category: string;
  paymentMethod: string;
  frequency: RecurringFrequency;
  customDays?: number;
  startDate: string;
  endDate?: string;
  status: RecurringStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  lastExecuted?: string;
  nextExecution: string;
  executionCount: number;
  maxExecutions?: number;
  autoCreate: boolean;
  autoNotify: boolean;
}

export interface BillRecord {
  id: string; // Random 16-char ID (bill_...)
  userId: number;
  title: string;
  billNumber?: string;
  provider: string;
  category: string;
  amount: number; // in rupees
  currency: string; // Default: INR
  dueDate: string;
  reminderDays: number;
  status: BillStatus;
  recurringId?: string;
  createdAt: string;
}

export interface SubscriptionRecord {
  id: string; // Random 16-char ID (sub_...)
  userId: number;
  name: string;
  provider: string;
  category: string;
  billingCycle: "monthly" | "quarterly" | "yearly";
  amount: number; // in rupees
  currency: string; // Default: INR
  renewalDate: string;
  autoRenewal: boolean;
  paymentMethod: string;
  status: SubscriptionStatus;
  createdAt: string;
}

export interface RecurringDashboardMetrics {
  totalMonthlyRecurringOutflow: number; // in rupees
  totalMonthlyRecurringIncome: number; // in rupees
  upcomingBillsCount: number;
  upcomingBillsAmount: number; // in rupees
  activeSubscriptionsCount: number;
  activeSubscriptionsMonthlyTotal: number; // in rupees
  currency: string;
  recurringTransactions: RecurringTransaction[];
  bills: BillRecord[];
  subscriptions: SubscriptionRecord[];
  executionLogs: ExecutionLog[];
}

"use server";

import { requireAuth } from "@/lib/auth";
import {
  RecurringTransaction,
  BillRecord,
  SubscriptionRecord,
  ExecutionLog,
  RecurringDashboardMetrics,
  RecurringFrequency,
  RecurringType,
} from "@/lib/types/recurring";
import { DatabaseError, ValidationError } from "@/lib/errors";
import { generatePublicId } from "@/lib/utils";

// In-memory stores per user key
const recurringStore = new Map<string, RecurringTransaction[]>();
const billsStore = new Map<string, BillRecord[]>();
const subscriptionsStore = new Map<string, SubscriptionRecord[]>();
const executionLogsStore = new Map<string, ExecutionLog[]>();

/**
 * Calculate Next Execution Date based on Frequency
 */
export async function calculateNextExecutionDate(
  startDateStr: string,
  frequency: RecurringFrequency,
  customDays?: number
): Promise<string> {
  const start = new Date(startDateStr);
  const next = new Date(start);

  switch (frequency) {
    case "daily":
      next.setDate(next.getDate() + 1);
      break;
    case "weekly":
      next.setDate(next.getDate() + 7);
      break;
    case "biweekly":
      next.setDate(next.getDate() + 14);
      break;
    case "monthly":
      next.setMonth(next.getMonth() + 1);
      break;
    case "quarterly":
      next.setMonth(next.getMonth() + 3);
      break;
    case "half_yearly":
      next.setMonth(next.getMonth() + 6);
      break;
    case "yearly":
      next.setFullYear(next.getFullYear() + 1);
      break;
    case "custom":
      next.setDate(next.getDate() + (customDays || 30));
      break;
    default:
      next.setMonth(next.getMonth() + 1);
  }

  return next.toISOString().split("T")[0];
}

function ensureSeedRecurringData(userId: number) {
  const userKey = `user_${userId}`;
  if (!recurringStore.has(userKey)) {
    const defaultSchedules: RecurringTransaction[] = [
      {
        id: `rec_${userId}_01`,
        userId,
        scope: "personal",
        title: "Apartment Monthly Rent",
        description: "Primary residential rent payment",
        amount: 28000,
        currency: "INR",
        type: "expense",
        category: "Housing & Rent",
        paymentMethod: "HDFC NetBanking",
        frequency: "monthly",
        startDate: new Date(Date.now() - 60 * 86400000).toISOString().split("T")[0],
        status: "active",
        createdBy: "Dipak Pawar",
        createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
        lastExecuted: new Date(Date.now() - 1 * 86400000).toISOString().split("T")[0],
        nextExecution: new Date(Date.now() + 29 * 86400000).toISOString().split("T")[0],
        executionCount: 2,
        autoCreate: true,
        autoNotify: true,
      },
      {
        id: `rec_${userId}_02`,
        userId,
        groupId: 101,
        scope: "group",
        title: "Shared Broadband & Fiber Internet",
        description: "Goa Villa high-speed fiber connection",
        amount: 1499,
        currency: "INR",
        type: "expense",
        category: "Utilities",
        paymentMethod: "UPI",
        frequency: "monthly",
        startDate: new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0],
        status: "active",
        createdBy: "Dipak Pawar",
        createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
        lastExecuted: new Date(Date.now() - 2 * 86400000).toISOString().split("T")[0],
        nextExecution: new Date(Date.now() + 28 * 86400000).toISOString().split("T")[0],
        executionCount: 1,
        autoCreate: true,
        autoNotify: true,
      },
      {
        id: `rec_${userId}_03`,
        userId,
        scope: "personal",
        title: "Software Retainer Advisory Income",
        description: "Monthly tech consulting retainer from client",
        amount: 85000,
        currency: "INR",
        type: "income",
        category: "Consulting Income",
        paymentMethod: "Bank Transfer",
        frequency: "monthly",
        startDate: new Date(Date.now() - 90 * 86400000).toISOString().split("T")[0],
        status: "active",
        createdBy: "Dipak Pawar",
        createdAt: new Date(Date.now() - 90 * 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
        lastExecuted: new Date(Date.now() - 15 * 86400000).toISOString().split("T")[0],
        nextExecution: new Date(Date.now() + 15 * 86400000).toISOString().split("T")[0],
        executionCount: 3,
        autoCreate: true,
        autoNotify: true,
      },
    ];
    recurringStore.set(userKey, defaultSchedules);

    const defaultBills: BillRecord[] = [
      {
        id: `bill_${userId}_01`,
        userId,
        title: "Electricity Board Utility Bill",
        billNumber: "MSEB-91823901",
        provider: "MSEDCL Maharashtra",
        category: "Electricity",
        amount: 3450,
        currency: "INR",
        dueDate: new Date(Date.now() + 5 * 86400000).toISOString().split("T")[0],
        reminderDays: 3,
        status: "pending",
        recurringId: `rec_${userId}_01`,
        createdAt: new Date().toISOString(),
      },
      {
        id: `bill_${userId}_02`,
        userId,
        title: "High-Speed Fiber Broadband",
        billNumber: "ACT-882149",
        provider: "ACT Fibernet",
        category: "Internet",
        amount: 1499,
        currency: "INR",
        dueDate: new Date(Date.now() + 10 * 86400000).toISOString().split("T")[0],
        reminderDays: 2,
        status: "pending",
        createdAt: new Date().toISOString(),
      },
      {
        id: `bill_${userId}_03`,
        userId,
        title: "HDFC Credit Card Auto-Debit",
        billNumber: "CARD-49102",
        provider: "HDFC Bank",
        category: "Credit Card",
        amount: 18200,
        currency: "INR",
        dueDate: new Date(Date.now() - 2 * 86400000).toISOString().split("T")[0],
        reminderDays: 5,
        status: "paid",
        createdAt: new Date().toISOString(),
      },
    ];
    billsStore.set(userKey, defaultBills);

    const defaultSubscriptions: SubscriptionRecord[] = [
      {
        id: `sub_${userId}_01`,
        userId,
        name: "ChatGPT Plus & Team Subscription",
        provider: "OpenAI",
        category: "AI & Software",
        billingCycle: "monthly",
        amount: 1999,
        currency: "INR",
        renewalDate: new Date(Date.now() + 12 * 86400000).toISOString().split("T")[0],
        autoRenewal: true,
        paymentMethod: "Credit Card",
        status: "active",
        createdAt: new Date().toISOString(),
      },
      {
        id: `sub_${userId}_02`,
        userId,
        name: "Netflix Premium 4K Family",
        provider: "Netflix India",
        category: "Entertainment",
        billingCycle: "monthly",
        amount: 649,
        currency: "INR",
        renewalDate: new Date(Date.now() + 18 * 86400000).toISOString().split("T")[0],
        autoRenewal: true,
        paymentMethod: "UPI AutoPay",
        status: "active",
        createdAt: new Date().toISOString(),
      },
      {
        id: `sub_${userId}_03`,
        userId,
        name: "Vercel Pro Developer Plan",
        provider: "Vercel Inc",
        category: "Cloud Infrastructure",
        billingCycle: "monthly",
        amount: 1750,
        currency: "INR",
        renewalDate: new Date(Date.now() + 8 * 86400000).toISOString().split("T")[0],
        autoRenewal: true,
        paymentMethod: "Credit Card",
        status: "active",
        createdAt: new Date().toISOString(),
      },
    ];
    subscriptionsStore.set(userKey, defaultSubscriptions);

    const defaultLogs: ExecutionLog[] = [
      {
        id: `exec_${userId}_01`,
        recurringId: `rec_${userId}_01`,
        generatedTransactionId: `txn_auto_rent_01`,
        executionTime: new Date(Date.now() - 1 * 86400000).toISOString(),
        status: "success",
        reason: "Scheduled monthly auto-creation executed cleanly",
        createdBy: "System Automation Worker",
      },
      {
        id: `exec_${userId}_02`,
        recurringId: `rec_${userId}_02`,
        generatedTransactionId: `txn_auto_wifi_01`,
        executionTime: new Date(Date.now() - 2 * 86400000).toISOString(),
        status: "success",
        reason: "Scheduled group broadband expense generated",
        createdBy: "System Automation Worker",
      },
    ];
    executionLogsStore.set(userKey, defaultLogs);
  }
}

/**
 * Get Comprehensive Recurring Dashboard Metrics
 */
export async function getRecurringDashboardSummary(): Promise<RecurringDashboardMetrics> {
  const user = await requireAuth();
  ensureSeedRecurringData(user.id);
  const userKey = `user_${user.id}`;

  const recurringTransactions = recurringStore.get(userKey) || [];
  const bills = billsStore.get(userKey) || [];
  const subscriptions = subscriptionsStore.get(userKey) || [];
  const executionLogs = executionLogsStore.get(userKey) || [];

  const totalMonthlyRecurringOutflow = recurringTransactions
    .filter((r) => r.type === "expense" || r.type === "subscription" || r.type === "bill" || r.type === "emi")
    .filter((r) => r.status === "active")
    .reduce((sum, r) => sum + r.amount, 0);

  const totalMonthlyRecurringIncome = recurringTransactions
    .filter((r) => r.type === "income")
    .filter((r) => r.status === "active")
    .reduce((sum, r) => sum + r.amount, 0);

  const pendingBills = bills.filter((b) => b.status === "pending" || b.status === "overdue");
  const upcomingBillsCount = pendingBills.length;
  const upcomingBillsAmount = pendingBills.reduce((sum, b) => sum + b.amount, 0);

  const activeSubs = subscriptions.filter((s) => s.status === "active");
  const activeSubscriptionsCount = activeSubs.length;
  const activeSubscriptionsMonthlyTotal = activeSubs.reduce((sum, s) => sum + s.amount, 0);

  return {
    totalMonthlyRecurringOutflow,
    totalMonthlyRecurringIncome,
    upcomingBillsCount,
    upcomingBillsAmount,
    activeSubscriptionsCount,
    activeSubscriptionsMonthlyTotal,
    currency: "INR",
    recurringTransactions,
    bills,
    subscriptions,
    executionLogs,
  };
}

/**
 * Create a new recurring transaction schedule
 */
export async function createRecurringSchedule(data: {
  title: string;
  description?: string;
  amount: number;
  type: RecurringType;
  category: string;
  paymentMethod?: string;
  frequency: RecurringFrequency;
  customDays?: number;
  startDate?: string;
  scope?: "personal" | "group" | "organization";
  groupId?: number;
  orgId?: string;
  autoCreate?: boolean;
}): Promise<RecurringTransaction> {
  const user = await requireAuth();
  ensureSeedRecurringData(user.id);
  const userKey = `user_${user.id}`;

  if (data.amount <= 0) {
    throw new ValidationError("Recurring transaction amount must be greater than ₹0.");
  }

  const startDate = data.startDate || new Date().toISOString().split("T")[0];
  const nextExecution = await calculateNextExecutionDate(startDate, data.frequency, data.customDays);

  const newSchedule: RecurringTransaction = {
    id: generatePublicId("rec"),
    userId: user.id,
    scope: data.scope || "personal",
    groupId: data.groupId,
    orgId: data.orgId,
    title: data.title,
    description: data.description,
    amount: data.amount,
    currency: "INR",
    type: data.type,
    category: data.category,
    paymentMethod: data.paymentMethod || "UPI",
    frequency: data.frequency,
    customDays: data.customDays,
    startDate,
    status: "active",
    createdBy: user.name || "Dipak Pawar",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    nextExecution,
    executionCount: 0,
    autoCreate: data.autoCreate !== undefined ? data.autoCreate : true,
    autoNotify: true,
  };

  const schedules = recurringStore.get(userKey) || [];
  schedules.push(newSchedule);
  recurringStore.set(userKey, schedules);

  return newSchedule;
}

/**
 * Trigger Scheduled Execution Run (Manually or Worker)
 */
export async function triggerScheduledExecution(recurringId: string): Promise<ExecutionLog> {
  const user = await requireAuth();
  ensureSeedRecurringData(user.id);
  const userKey = `user_${user.id}`;

  const schedules = recurringStore.get(userKey) || [];
  const schedule = schedules.find((s) => s.id === recurringId);

  if (!schedule) {
    throw new DatabaseError("Recurring schedule record not found.");
  }

  const generatedTxnId = generatePublicId("txn");
  schedule.executionCount += 1;
  schedule.lastExecuted = new Date().toISOString().split("T")[0];
  schedule.nextExecution = await calculateNextExecutionDate(
    schedule.lastExecuted,
    schedule.frequency,
    schedule.customDays
  );
  schedule.updatedAt = new Date().toISOString();

  const log: ExecutionLog = {
    id: generatePublicId("exec"),
    recurringId,
    generatedTransactionId: generatedTxnId,
    executionTime: new Date().toISOString(),
    status: "success",
    reason: `Automated transaction generated for "${schedule.title}" (Execution #${schedule.executionCount})`,
    createdBy: user.name || "System Automation",
  };

  const logs = executionLogsStore.get(userKey) || [];
  logs.unshift(log);
  executionLogsStore.set(userKey, logs);

  return log;
}

/**
 * Pause or Resume a Recurring Schedule
 */
export async function pauseResumeRecurringSchedule(
  recurringId: string,
  action: "pause" | "resume" | "cancel"
): Promise<RecurringTransaction> {
  const user = await requireAuth();
  ensureSeedRecurringData(user.id);
  const userKey = `user_${user.id}`;

  const schedules = recurringStore.get(userKey) || [];
  const schedule = schedules.find((s) => s.id === recurringId);

  if (!schedule) {
    throw new DatabaseError("Recurring schedule not found.");
  }

  if (action === "pause") schedule.status = "paused";
  else if (action === "resume") schedule.status = "active";
  else if (action === "cancel") schedule.status = "cancelled";

  schedule.updatedAt = new Date().toISOString();
  return schedule;
}

/**
 * Create a Utility / Personal Bill
 */
export async function createBill(data: {
  title: string;
  provider: string;
  category: string;
  amount: number;
  dueDate: string;
  billNumber?: string;
  reminderDays?: number;
}): Promise<BillRecord> {
  const user = await requireAuth();
  ensureSeedRecurringData(user.id);
  const userKey = `user_${user.id}`;

  if (data.amount <= 0) {
    throw new ValidationError("Bill amount must be greater than ₹0.");
  }

  const bill: BillRecord = {
    id: generatePublicId("bill"),
    userId: user.id,
    title: data.title,
    provider: data.provider,
    category: data.category,
    amount: data.amount,
    currency: "INR",
    dueDate: data.dueDate,
    billNumber: data.billNumber,
    reminderDays: data.reminderDays || 3,
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  const bills = billsStore.get(userKey) || [];
  bills.push(bill);
  billsStore.set(userKey, bills);

  return bill;
}

/**
 * Mark a Bill as Paid
 */
export async function markBillPaid(billId: string): Promise<BillRecord> {
  const user = await requireAuth();
  ensureSeedRecurringData(user.id);
  const userKey = `user_${user.id}`;

  const bills = billsStore.get(userKey) || [];
  const bill = bills.find((b) => b.id === billId);

  if (!bill) {
    throw new DatabaseError("Bill record not found.");
  }

  bill.status = "paid";
  return bill;
}

/**
 * Create a Subscription Record
 */
export async function createSubscription(data: {
  name: string;
  provider: string;
  category: string;
  billingCycle: "monthly" | "quarterly" | "yearly";
  amount: number;
  renewalDate: string;
  paymentMethod?: string;
}): Promise<SubscriptionRecord> {
  const user = await requireAuth();
  ensureSeedRecurringData(user.id);
  const userKey = `user_${user.id}`;

  if (data.amount <= 0) {
    throw new ValidationError("Subscription amount must be greater than ₹0.");
  }

  const sub: SubscriptionRecord = {
    id: generatePublicId("sub"),
    userId: user.id,
    name: data.name,
    provider: data.provider,
    category: data.category,
    billingCycle: data.billingCycle,
    amount: data.amount,
    currency: "INR",
    renewalDate: data.renewalDate,
    autoRenewal: true,
    paymentMethod: data.paymentMethod || "Credit Card",
    status: "active",
    createdAt: new Date().toISOString(),
  };

  const subs = subscriptionsStore.get(userKey) || [];
  subs.push(sub);
  subscriptionsStore.set(userKey, subs);

  return sub;
}

/**
 * Cancel a Subscription
 */
export async function cancelSubscription(subId: string): Promise<SubscriptionRecord> {
  const user = await requireAuth();
  ensureSeedRecurringData(user.id);
  const userKey = `user_${user.id}`;

  const subs = subscriptionsStore.get(userKey) || [];
  const sub = subs.find((s) => s.id === subId);

  if (!sub) {
    throw new DatabaseError("Subscription record not found.");
  }

  sub.status = "cancelled";
  sub.autoRenewal = false;
  return sub;
}

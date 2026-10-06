/**
 * AI KNOWLEDGE CONTEXT ENGINE
 * 
 * Aggregates and validates complete live contextual knowledge for the active user:
 * transactions, categories, budgets, settlements, debts, loans, trips, notes,
 * profile completion, recent voice commands, and OCR uploads.
 */

import { db } from "@/lib/db";
import {
  transactions,
  categories,
  groups,
  groupMembers,
  settlements,
  budgets,
  notes,
  users,
  profiles,
  receipts,
  auditLogs,
} from "@/lib/db/schema/schema";
import { eq, and, desc, sql, or, gte } from "drizzle-orm";
import {
  validateTransactions,
  validateSettlements,
  validateBudgets,
  validateNotes,
} from "@/lib/ai/financial-validator";

export interface FinancialKnowledgeContext {
  user: {
    id: number;
    name: string;
    email: string;
    avatar?: string | null;
    defaultCurrency: string;
    profileCompletionPct: number;
    emailVerified: boolean;
    mobileVerified: boolean;
    twoFactorEnabled: boolean;
  };
  transactions: {
    all: any[];
    currentMonth: any[];
    lastMonth: any[];
    totalCount: number;
    totalSpentThisMonth: number; // in rupees
    totalIncomeThisMonth: number; // in rupees
    netSavingsThisMonth: number; // in rupees
    savingsRatePct: number;
    categoryTotals: Record<string, number>; // in rupees
    hourlyDistribution: Record<number, number>; // hour -> count
    weekdaySpending: Record<string, number>; // day name -> rupees
    midnightSpendTotal: number; // transactions between 11PM and 5AM in rupees
    highestTransaction: { title: string; amount: number; date: Date | string } | null;
    lowestTransaction: { title: string; amount: number; date: Date | string } | null;
    flaggedDuplicates: any[];
  };
  settlements: {
    receivablesTotal: number; // in rupees
    payablesTotal: number; // in rupees
    netDues: number; // in rupees
    pendingSettlements: any[];
    debtorRanking: Array<{ name: string; amount: number }>;
  };
  budgets: {
    activeBudgets: any[];
    totalAllocatedBudget: number; // in rupees
    totalBudgetSpent: number; // in rupees
    overallUtilizationPct: number;
    breachedBudgets: any[];
  };
  groups: {
    all: any[];
    groupSpending: Record<string, number>;
  };
  trips: {
    activeTripsCount: number;
    totalTripBudget: number;
    totalTripSpent: number;
    exceededTrips: any[];
  };
  notes: {
    recentNotes: any[];
  };
  recentVoiceCommands: any[];
  recentOcrReceipts: any[];
  gatheredAt: string;
}

/**
 * Fetch and construct comprehensive financial knowledge context for user
 */
export async function getFinancialKnowledgeContext(
  userId: number
): Promise<FinancialKnowledgeContext> {
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  // Parallel live database queries
  const [
    userRows,
    rawTxRows,
    rawSettlementRows,
    rawBudgetRows,
    rawGroupRows,
    rawNotesRows,
    rawReceiptsRows,
    rawAuditLogsRows,
  ] = await Promise.all([
    // User and profile
    db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        avatar: users.avatar,
        currency: users.defaultCurrency,
        emailVerified: users.emailVerified,
        phone: profiles.phone,
        mobileVerified: profiles.mobileVerified,
        twoFactor: profiles.twoFactorEnabled,
        occupation: profiles.occupation,
        city: profiles.city,
      })
      .from(users)
      .leftJoin(profiles, eq(users.id, profiles.userId))
      .where(eq(users.id, userId))
      .limit(1),

    // Live transactions with category names
    db
      .select({
        id: transactions.id,
        publicId: transactions.publicId,
        title: transactions.title,
        description: transactions.description,
        amount: transactions.amount,
        type: transactions.type,
        date: transactions.date,
        currency: transactions.currency,
        categoryId: transactions.categoryId,
        categoryName: categories.name,
        groupId: transactions.groupId,
        groupName: groups.name,
        paymentMethod: transactions.paymentMethod,
        isDeleted: transactions.isDeleted,
        userId: transactions.userId,
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .leftJoin(groups, eq(transactions.groupId, groups.id))
      .where(and(eq(transactions.userId, userId), eq(transactions.isDeleted, false)))
      .orderBy(desc(transactions.date))
      .limit(300),

    // Live settlements
    db
      .select({
        id: settlements.id,
        fromUserId: settlements.fromUserId,
        toUserId: settlements.toUserId,
        amount: settlements.amount,
        status: settlements.status,
        currency: settlements.currency,
        groupName: groups.name,
        isDeleted: settlements.isDeleted,
      })
      .from(settlements)
      .leftJoin(groups, eq(settlements.groupId, groups.id))
      .where(
        and(
          eq(settlements.isDeleted, false),
          or(eq(settlements.fromUserId, userId), eq(settlements.toUserId, userId))
        )
      ),

    // Live budgets
    db
      .select({
        id: budgets.id,
        name: budgets.name,
        amount: budgets.amount,
        alertThreshold: budgets.alertThreshold,
        status: budgets.status,
        isDeleted: budgets.isDeleted,
        userId: budgets.userId,
      })
      .from(budgets)
      .where(and(eq(budgets.userId, userId), eq(budgets.isDeleted, false))),

    // Groups
    db
      .select({
        id: groups.id,
        name: groups.name,
        type: groups.type,
        isActive: groups.isActive,
      })
      .from(groups)
      .innerJoin(groupMembers, eq(groups.id, groupMembers.groupId))
      .where(and(eq(groupMembers.userId, userId), eq(groups.isDeleted, false))),

    // Notes
    db
      .select({
        id: notes.id,
        title: notes.title,
        plainText: notes.plainText,
        wordCount: notes.wordCount,
        isDeleted: notes.isDeleted,
        userId: notes.userId,
        createdAt: notes.createdAt,
      })
      .from(notes)
      .where(and(eq(notes.userId, userId), eq(notes.isDeleted, false)))
      .orderBy(desc(notes.createdAt))
      .limit(10),

    // Receipts
    db
      .select({
        id: receipts.id,
        merchant: receipts.merchant,
        extractedAmount: receipts.extractedAmount,
        extractedGst: receipts.extractedGst,
        extractedDate: receipts.extractedDate,
        originalFileName: receipts.originalFileName,
        url: receipts.url,
      })
      .from(receipts)
      .innerJoin(transactions, eq(receipts.transactionId, transactions.id))
      .where(eq(transactions.userId, userId))
      .orderBy(desc(receipts.createdAt))
      .limit(10),

    // Audit logs for voice/assistant commands
    db
      .select({
        action: auditLogs.action,
        reason: auditLogs.reason,
        changes: auditLogs.changes,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .where(and(eq(auditLogs.userId, userId), eq(auditLogs.entityType, "voice_command")))
      .orderBy(desc(auditLogs.createdAt))
      .limit(5),
  ]);

  // Run validation layer
  const validatedTx = validateTransactions(rawTxRows, userId, userRows[0]?.currency || "INR");
  const validatedSt = validateSettlements(rawSettlementRows, userId);
  const validatedBg = validateBudgets(rawBudgetRows, userId);
  const validatedNt = validateNotes(rawNotesRows, userId);

  // User details
  const u = userRows[0] || {
    id: userId,
    name: "Member",
    email: "user@splitledger.app",
    currency: "INR",
  };

  // Compute profile completion percentage
  let profileFieldsFilled = 0;
  const totalProfileFields = 7;
  if (u.name) profileFieldsFilled++;
  if (u.email) profileFieldsFilled++;
  if (u.emailVerified) profileFieldsFilled++;
  if (u.phone) profileFieldsFilled++;
  if (u.mobileVerified) profileFieldsFilled++;
  if (u.city) profileFieldsFilled++;
  if (u.twoFactor) profileFieldsFilled++;
  const profileCompletionPct = Math.round((profileFieldsFilled / totalProfileFields) * 100);

  // Filter temporal sets
  const allTx = validatedTx.sanitizedData;
  const currentMonthTx = allTx.filter((t) => new Date(t.date) >= currentMonthStart);
  const lastMonthTx = allTx.filter(
    (t) => new Date(t.date) >= lastMonthStart && new Date(t.date) <= lastMonthEnd
  );

  // Month stats
  let totalSpentThisMonth = 0;
  let totalIncomeThisMonth = 0;
  const categoryTotals: Record<string, number> = {};
  const hourlyDistribution: Record<number, number> = {};
  const weekdaySpending: Record<string, number> = {};
  const weekdayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  let midnightSpendTotal = 0;
  let highestTransaction: any = null;
  let lowestTransaction: any = null;

  for (const t of allTx) {
    const amtRupees = t.amount / 100;
    const dateObj = new Date(t.date);
    const hour = dateObj.getHours();
    const dayName = weekdayNames[dateObj.getDay()];

    hourlyDistribution[hour] = (hourlyDistribution[hour] || 0) + 1;

    // Track midnight spending (11PM to 5AM)
    if (hour >= 23 || hour <= 4) {
      if (t.type === "paid" || t.type === "borrowed") {
        midnightSpendTotal += amtRupees;
      }
    }

    if (t.type === "paid" || t.type === "borrowed") {
      weekdaySpending[dayName] = (weekdaySpending[dayName] || 0) + amtRupees;
    }

    // Extremes check
    if (!highestTransaction || amtRupees > highestTransaction.amount) {
      highestTransaction = {
        title: t.title || t.description,
        amount: amtRupees,
        date: t.date,
      };
    }
    if (!lowestTransaction || amtRupees < lowestTransaction.amount) {
      lowestTransaction = {
        title: t.title || t.description,
        amount: amtRupees,
        date: t.date,
      };
    }

    // Current month accumulation
    if (dateObj >= currentMonthStart) {
      if (t.type === "paid" || t.type === "borrowed") {
        totalSpentThisMonth += amtRupees;
        const cat = t.categoryName || "Uncategorized";
        categoryTotals[cat] = (categoryTotals[cat] || 0) + amtRupees;
      } else if (t.type === "received" || t.type === "lent" || t.type === "repaid") {
        totalIncomeThisMonth += amtRupees;
      }
    }
  }

  const netSavingsThisMonth = totalIncomeThisMonth - totalSpentThisMonth;
  const savingsRatePct =
    totalIncomeThisMonth > 0
      ? Math.max(0, Math.round((netSavingsThisMonth / totalIncomeThisMonth) * 100))
      : 0;

  // Settlements metrics
  let receivablesTotal = 0;
  let payablesTotal = 0;
  const pendingSettlements: any[] = [];
  const debtorMap = new Map<string, number>();

  for (const s of validatedSt.sanitizedData) {
    const sAmt = s.amount / 100;
    if (s.status === "pending") {
      pendingSettlements.push(s);
      if (s.toUserId === userId) {
        // Someone owes current user
        receivablesTotal += sAmt;
        const name = s.fromUserName || s.groupName || "Group Member";
        debtorMap.set(name, (debtorMap.get(name) || 0) + sAmt);
      } else if (s.fromUserId === userId) {
        // Current user owes someone
        payablesTotal += sAmt;
      }
    }
  }

  const debtorRanking = Array.from(debtorMap.entries())
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);

  // Budgets metrics
  const activeBudgets = validatedBg.sanitizedData;
  const totalAllocatedBudget = activeBudgets.reduce((sum, b) => sum + b.amount / 100, 0);
  const totalBudgetSpent = totalSpentThisMonth;
  const overallUtilizationPct =
    totalAllocatedBudget > 0
      ? Math.round((totalBudgetSpent / totalAllocatedBudget) * 100)
      : 0;
  const breachedBudgets = activeBudgets.filter(
    (b) => totalBudgetSpent > b.amount / 100
  );

  // Group spending
  const groupSpending: Record<string, number> = {};
  for (const t of allTx) {
    if (t.groupName) {
      groupSpending[t.groupName] = (groupSpending[t.groupName] || 0) + t.amount / 100;
    }
  }

  // Flagged duplicates
  const flaggedDuplicates = validatedTx.issues
    .filter((i) => i.code === "DUPLICATE_RECORD")
    .map((i) => ({ id: i.entityId, message: i.message }));

  return {
    user: {
      id: userId,
      name: u.name || "SplitLedger Member",
      email: u.email || "",
      avatar: u.avatar,
      defaultCurrency: u.currency || "INR",
      profileCompletionPct,
      emailVerified: Boolean(u.emailVerified),
      mobileVerified: Boolean(u.mobileVerified),
      twoFactorEnabled: Boolean(u.twoFactor),
    },
    transactions: {
      all: allTx,
      currentMonth: currentMonthTx,
      lastMonth: lastMonthTx,
      totalCount: allTx.length,
      totalSpentThisMonth: Math.round(totalSpentThisMonth),
      totalIncomeThisMonth: Math.round(totalIncomeThisMonth),
      netSavingsThisMonth: Math.round(netSavingsThisMonth),
      savingsRatePct,
      categoryTotals,
      hourlyDistribution,
      weekdaySpending,
      midnightSpendTotal: Math.round(midnightSpendTotal),
      highestTransaction,
      lowestTransaction,
      flaggedDuplicates,
    },
    settlements: {
      receivablesTotal: Math.round(receivablesTotal),
      payablesTotal: Math.round(payablesTotal),
      netDues: Math.round(receivablesTotal - payablesTotal),
      pendingSettlements,
      debtorRanking,
    },
    budgets: {
      activeBudgets,
      totalAllocatedBudget: Math.round(totalAllocatedBudget),
      totalBudgetSpent: Math.round(totalBudgetSpent),
      overallUtilizationPct,
      breachedBudgets,
    },
    groups: {
      all: rawGroupRows,
      groupSpending,
    },
    trips: {
      activeTripsCount: rawGroupRows.filter((g) => g.type === "trip").length,
      totalTripBudget: 0,
      totalTripSpent: 0,
      exceededTrips: [],
    },
    notes: {
      recentNotes: validatedNt.sanitizedData,
    },
    recentVoiceCommands: rawAuditLogsRows,
    recentOcrReceipts: rawReceiptsRows,
    gatheredAt: new Date().toISOString(),
  };
}

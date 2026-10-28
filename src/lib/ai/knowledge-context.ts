/**
 * AI KNOWLEDGE CONTEXT ENGINE
 * 
 * Aggregates and validates complete live contextual knowledge for the active user:
 * transactions, categories, budgets, settlements, debts, loans, trips, notes,
 * profile completion, recent voice commands, and OCR uploads.
 */

import { db, withDbRetry } from "@/lib/db";
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
  contacts,
} from "@/lib/db/schema/schema";
import { eq, and, desc, sql, or, gte, isNull } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
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
    phone?: string | null;
    upiId?: string | null;
    username?: string | null;
    occupation?: string | null;
    company?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
    bio?: string | null;
    accountStatus?: string;
  };
  transactions: {
    all: any[];
    currentMonth: any[];
    lastMonth: any[];
    totalCount: number;
    personalExpensesTotal: number; // in rupees
    groupExpensesTotal: number; // in rupees
    allTimeTotalExpenses: number; // in rupees
    allTimeTotalIncome: number; // in rupees
    allTimeTotalSavings: number; // in rupees
    totalSpentThisMonth: number; // in rupees
    totalIncomeThisMonth: number; // in rupees
    netSavingsThisMonth: number; // in rupees
    savingsRatePct: number;
    categoryTotals: Record<string, number>; // in rupees
    allTimeCategoryTotals: Record<string, number>; // in rupees
    mostUsedPaymentMethod: string;
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
    completedTotal: number; // in rupees
    recoveredFromFriends: number; // in rupees
    paidToFriends: number; // in rupees
    netDues: number; // in rupees
    pendingSettlements: any[];
    completedSettlements: any[];
    debtorRanking: Array<{ name: string; amount: number; groupName?: string }>;
    creditorRanking: Array<{ name: string; amount: number; groupName?: string }>;
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
    mostActiveGroup: { name: string; amount: number } | null;
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

export function getSafeFallbackContext(userId: number): FinancialKnowledgeContext {
  return {
    user: {
      id: userId,
      name: "SplitLedger Member",
      email: "user@splitledger.app",
      avatar: null,
      defaultCurrency: "INR",
      profileCompletionPct: 75,
      emailVerified: true,
      mobileVerified: false,
      twoFactorEnabled: false,
      phone: null,
      upiId: null,
      username: null,
      occupation: null,
      company: null,
      city: "Mumbai",
      state: "Maharashtra",
      country: "India",
      bio: null,
      accountStatus: "active",
    },
    transactions: {
      all: [],
      currentMonth: [],
      lastMonth: [],
      totalCount: 0,
      personalExpensesTotal: 0,
      groupExpensesTotal: 0,
      allTimeTotalExpenses: 0,
      allTimeTotalIncome: 0,
      allTimeTotalSavings: 0,
      totalSpentThisMonth: 0,
      totalIncomeThisMonth: 0,
      netSavingsThisMonth: 0,
      savingsRatePct: 0,
      categoryTotals: {},
      allTimeCategoryTotals: {},
      mostUsedPaymentMethod: "UPI",
      hourlyDistribution: {},
      weekdaySpending: {},
      midnightSpendTotal: 0,
      highestTransaction: null,
      lowestTransaction: null,
      flaggedDuplicates: [],
    },
    settlements: {
      receivablesTotal: 0,
      payablesTotal: 0,
      completedTotal: 0,
      recoveredFromFriends: 0,
      paidToFriends: 0,
      netDues: 0,
      pendingSettlements: [],
      completedSettlements: [],
      debtorRanking: [],
      creditorRanking: [],
    },
    budgets: {
      activeBudgets: [],
      totalAllocatedBudget: 0,
      totalBudgetSpent: 0,
      overallUtilizationPct: 0,
      breachedBudgets: [],
    },
    groups: {
      all: [],
      groupSpending: {},
      mostActiveGroup: null,
    },
    trips: {
      activeTripsCount: 0,
      totalTripBudget: 0,
      totalTripSpent: 0,
      exceededTrips: [],
    },
    notes: {
      recentNotes: [],
    },
    recentVoiceCommands: [],
    recentOcrReceipts: [],
    gatheredAt: new Date().toISOString(),
  };
}

/**
 * Fetch and construct comprehensive financial knowledge context for user
 */
export async function getFinancialKnowledgeContext(
  userId: number
): Promise<FinancialKnowledgeContext> {
  try {
    return await withDbRetry(async () => {
      const now = new Date();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

      // Alias tables for settlement participant joins
      const settleFromUser = alias(users, "settle_from_user");
      const settleToUser = alias(users, "settle_to_user");
      const settleFromContact = alias(contacts, "settle_from_contact");
      const settleToContact = alias(contacts, "settle_to_contact");

      // Parallel live database queries with resilient subquery fallback
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
            userUpiId: users.upiId,
            username: profiles.username,
            bio: profiles.bio,
            phone: profiles.phone,
            mobileVerified: profiles.mobileVerified,
            twoFactor: profiles.twoFactorEnabled,
            occupation: profiles.occupation,
            company: profiles.company,
            city: profiles.city,
            state: profiles.state,
            country: profiles.country,
            accountStatus: profiles.accountStatus,
            profileUpiId: profiles.upiId,
          })
          .from(users)
          .leftJoin(profiles, eq(users.id, profiles.userId))
          .where(eq(users.id, userId))
          .limit(1)
          .catch(() => [] as any[]),

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
          .where(
            and(
              eq(transactions.userId, userId),
              eq(transactions.isDeleted, false),
              or(isNull(transactions.contactId), eq(transactions.isSyncedToDashboard, true))
            )
          )
          .orderBy(desc(transactions.date))
          .limit(300)
          .catch(() => [] as any[]),

        // Live settlements with resolved debtor/creditor names
        db
          .select({
            id: settlements.id,
            fromUserId: settlements.fromUserId,
            fromContactId: settlements.fromContactId,
            toUserId: settlements.toUserId,
            toContactId: settlements.toContactId,
            fromUserName: sql<string>`COALESCE(${settleFromUser.name}, ${settleFromContact.name})`,
            toUserName: sql<string>`COALESCE(${settleToUser.name}, ${settleToContact.name})`,
            amount: settlements.amount,
            status: settlements.status,
            currency: settlements.currency,
            groupId: settlements.groupId,
            groupName: groups.name,
            isDeleted: settlements.isDeleted,
          })
          .from(settlements)
          .leftJoin(groups, eq(settlements.groupId, groups.id))
          .leftJoin(settleFromUser, eq(settlements.fromUserId, settleFromUser.id))
          .leftJoin(settleToUser, eq(settlements.toUserId, settleToUser.id))
          .leftJoin(settleFromContact, eq(settlements.fromContactId, settleFromContact.id))
          .leftJoin(settleToContact, eq(settlements.toContactId, settleToContact.id))
          .where(
            and(
              eq(settlements.isDeleted, false),
              or(eq(settlements.fromUserId, userId), eq(settlements.toUserId, userId))
            )
          )
          .catch(() => [] as any[]),

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
          .where(and(eq(budgets.userId, userId), eq(budgets.isDeleted, false)))
          .catch(() => [] as any[]),

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
          .where(and(eq(groupMembers.userId, userId), eq(groups.isDeleted, false)))
          .catch(() => [] as any[]),

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
          .limit(10)
          .catch(() => [] as any[]),

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
          .limit(10)
          .catch(() => [] as any[]),

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
          .limit(5)
          .catch(() => [] as any[]),
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
  const totalProfileFields = 8;
  if (u.name) profileFieldsFilled++;
  if (u.email) profileFieldsFilled++;
  if (u.emailVerified) profileFieldsFilled++;
  if (u.phone) profileFieldsFilled++;
  if (u.mobileVerified) profileFieldsFilled++;
  if (u.city || u.country) profileFieldsFilled++;
  if (u.twoFactor) profileFieldsFilled++;
  if (u.userUpiId || u.profileUpiId) profileFieldsFilled++;
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
  let personalExpensesTotal = 0;
  let groupExpensesTotal = 0;
  let allTimeTotalExpenses = 0;
  let allTimeTotalIncome = 0;
  const allTimeCategoryTotals: Record<string, number> = {};
  const paymentMethodCounts: Record<string, number> = {};

  for (const t of allTx) {
    const amtRupees = t.amount / 100;
    const dateObj = new Date(t.date);
    const hour = dateObj.getHours();
    const dayName = weekdayNames[dateObj.getDay()];

    hourlyDistribution[hour] = (hourlyDistribution[hour] || 0) + 1;

    // Track payment methods
    const pm = t.paymentMethod || "UPI";
    paymentMethodCounts[pm] = (paymentMethodCounts[pm] || 0) + 1;

    // Track midnight spending (11PM to 5AM)
    if (hour >= 23 || hour <= 4) {
      if (t.type === "paid" || t.type === "borrowed") {
        midnightSpendTotal += amtRupees;
      }
    }

    if (t.type === "paid" || t.type === "borrowed") {
      weekdaySpending[dayName] = (weekdaySpending[dayName] || 0) + amtRupees;
      allTimeTotalExpenses += amtRupees;
      const cat = t.categoryName || "General";
      allTimeCategoryTotals[cat] = (allTimeCategoryTotals[cat] || 0) + amtRupees;

      if (t.groupId) {
        groupExpensesTotal += amtRupees;
      } else {
        personalExpensesTotal += amtRupees;
      }
    } else if (t.type === "received" || t.type === "lent" || t.type === "repaid") {
      allTimeTotalIncome += amtRupees;
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

  const allTimeTotalSavings = allTimeTotalIncome - allTimeTotalExpenses;
  const netSavingsThisMonth = totalIncomeThisMonth - totalSpentThisMonth;
  const savingsRatePct =
    totalIncomeThisMonth > 0
      ? Math.max(0, Math.round((netSavingsThisMonth / totalIncomeThisMonth) * 100))
      : 0;

  const mostUsedPaymentMethod = Object.entries(paymentMethodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "UPI";

  // Settlements metrics
  let receivablesTotal = 0;
  let payablesTotal = 0;
  let completedSettlementsTotal = 0;
  let recoveredFromFriends = 0;
  let paidToFriends = 0;
  const pendingSettlements: any[] = [];
  const completedSettlements: any[] = [];
  const debtorMap = new Map<string, { name: string; amount: number; groupName?: string }>();
  const creditorMap = new Map<string, { name: string; amount: number; groupName?: string }>();

  for (const s of validatedSt.sanitizedData) {
    const sAmt = s.amount / 100;
    if (s.status === "completed") {
      completedSettlementsTotal += sAmt;
      completedSettlements.push(s);
      if (s.toUserId === userId) {
        recoveredFromFriends += sAmt;
      } else if (s.fromUserId === userId) {
        paidToFriends += sAmt;
      }
    } else if (s.status === "pending") {
      pendingSettlements.push(s);
      if (s.toUserId === userId) {
        // Someone owes current user
        receivablesTotal += sAmt;
        const resolvedName = (s.fromUserName && s.fromUserName.trim() && s.fromUserName !== "Group Member")
          ? s.fromUserName.trim()
          : (s.groupName ? `Member in ${s.groupName}` : "Group Member");

        const existing = debtorMap.get(resolvedName);
        if (existing) {
          existing.amount += sAmt;
          if (!existing.groupName && s.groupName) existing.groupName = s.groupName;
        } else {
          debtorMap.set(resolvedName, {
            name: resolvedName,
            amount: sAmt,
            groupName: s.groupName || undefined,
          });
        }
      } else if (s.fromUserId === userId) {
        // Current user owes someone
        payablesTotal += sAmt;
        const resolvedName = (s.toUserName && s.toUserName.trim() && s.toUserName !== "Group Member")
          ? s.toUserName.trim()
          : (s.groupName ? `Member in ${s.groupName}` : "Group Member");

        const existing = creditorMap.get(resolvedName);
        if (existing) {
          existing.amount += sAmt;
          if (!existing.groupName && s.groupName) existing.groupName = s.groupName;
        } else {
          creditorMap.set(resolvedName, {
            name: resolvedName,
            amount: sAmt,
            groupName: s.groupName || undefined,
          });
        }
      }
    }
  }

  const debtorRanking = Array.from(debtorMap.values())
    .sort((a, b) => b.amount - a.amount);
  const creditorRanking = Array.from(creditorMap.values())
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

  const sortedGroupSpend = Object.entries(groupSpending).sort((a, b) => b[1] - a[1]);
  const mostActiveGroup = sortedGroupSpend[0] ? { name: sortedGroupSpend[0][0], amount: sortedGroupSpend[0][1] } : null;

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
      phone: u.phone || null,
      upiId: u.userUpiId || u.profileUpiId || null,
      username: u.username || null,
      occupation: u.occupation || null,
      company: u.company || null,
      city: u.city || null,
      state: u.state || null,
      country: u.country || "India",
      bio: u.bio || null,
      accountStatus: u.accountStatus || "active",
    },
    transactions: {
      all: allTx,
      currentMonth: currentMonthTx,
      lastMonth: lastMonthTx,
      totalCount: allTx.length,
      personalExpensesTotal: Math.round(personalExpensesTotal),
      groupExpensesTotal: Math.round(groupExpensesTotal),
      allTimeTotalExpenses: Math.round(allTimeTotalExpenses),
      allTimeTotalIncome: Math.round(allTimeTotalIncome),
      allTimeTotalSavings: Math.round(allTimeTotalSavings),
      totalSpentThisMonth: Math.round(totalSpentThisMonth),
      totalIncomeThisMonth: Math.round(totalIncomeThisMonth),
      netSavingsThisMonth: Math.round(netSavingsThisMonth),
      savingsRatePct,
      categoryTotals,
      allTimeCategoryTotals,
      mostUsedPaymentMethod,
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
      completedTotal: Math.round(completedSettlementsTotal),
      recoveredFromFriends: Math.round(recoveredFromFriends),
      paidToFriends: Math.round(paidToFriends),
      netDues: Math.round(receivablesTotal - payablesTotal),
      pendingSettlements,
      completedSettlements,
      debtorRanking,
      creditorRanking,
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
      mostActiveGroup,
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
    });
  } catch (error) {
    console.warn("[KnowledgeContext] Database connection unavailable, falling back to safe empty context:", error);
    return getSafeFallbackContext(userId);
  }
}


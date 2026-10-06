"use server";

import { db } from "@/lib/db";
import { 
  transactions, 
  categories, 
  contacts, 
  groups, 
  settlements,
  groupMembers,
  users,
  auditLogs,
  savedReports,
  scheduledReports,
  expenseSplits
} from "@/lib/db/schema/schema";
import { eq, desc, and, sql, gte, lte, or, inArray, ilike } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { requireAuth } from "@/lib/auth";
import { ValidationError, DatabaseError, AuthorizationError } from "@/lib/errors";
import { generateReportId, generateScheduleId, formatCurrency } from "@/lib/utils";
import { 
  generateCSVExport, 
  generateJSONExport, 
  generatePrintableHTMLReport, 
  generateExcelWorkbook,
  type ExportReportData,
  type ExportTransactionItem
} from "@/lib/export/export-engine";
import { getDashboardData } from "@/actions/dashboard";
import { revalidatePath } from "next/cache";

export interface ReportFilterOptions {
  reportType?: 
    | "overview"
    | "personal" 
    | "group" 
    | "individual_group" 
    | "member" 
    | "settlement" 
    | "category" 
    | "monthly" 
    | "weekly" 
    | "daily" 
    | "custom" 
    | "payment_method" 
    | "activity" 
    | "audit_logs";
  period?: "today" | "yesterday" | "7d" | "30d" | "3m" | "1y" | "custom" | "all";
  startDate?: string | Date;
  endDate?: string | Date;
  groupId?: number;
  contactId?: number;
  categoryId?: number;
  paymentMethod?: string;
  type?: string;
  status?: string;
  minAmount?: number; // in paise
  maxAmount?: number; // in paise
  hasReceipt?: boolean;
  tag?: string;
  search?: string;
  sortBy?: "date_desc" | "date_asc" | "amount_desc" | "amount_asc" | "title_asc";
  page?: number;
  limit?: number;
}

/**
 * SECTION 1: Report Dashboard Summary Cards
 * Consumes the application's central Financial Engine (getDashboardData) to ensure 
 * 100% mathematical consistency across Dashboard, Reports, Analytics, and PDF exports.
 */
export async function getReportDashboardSummary() {
  try {
    const dashboardData = await getDashboardData();

    return {
      totalIncome: dashboardData.personalStats.personalIncome,
      totalExpense: dashboardData.summary.monthlySpending,
      netBalance: dashboardData.summary.netBalance,
      totalReceivable: dashboardData.summary.totalReceivable,
      totalPayable: dashboardData.summary.totalPayable,
      totalSettlements: dashboardData.summary.pendingSettlementsAmount,
      totalSettlementCount: dashboardData.summary.pendingSettlementsCount,
      pendingSettlementsCount: dashboardData.summary.pendingSettlementsCount,
      activeGroupsCount: dashboardData.summary.myGroupsCount,
      personalTxCount: dashboardData.personalStats.personalTransactionsCount,
      groupTxCount: dashboardData.groupStats.totalGroups,
      totalMembersCount: dashboardData.groupStats.totalGroupMembers,
      totalTransactions: dashboardData.summary.totalTransactions,
    };
  } catch (error) {
    throw new DatabaseError("Failed to calculate report dashboard summary", { originalError: error });
  }
}

/**
 * SECTION 2, 4, 5, 6: Comprehensive Report Query Engine
 * Supports all 13 Report Types with full itemized details, Public IDs, splits, and sorting.
 */
export async function getComprehensiveReport(options: ReportFilterOptions = {}) {
  try {
    const user = await requireAuth();

    const conditions: any[] = [
      eq(transactions.isDeleted, false),
      or(
        eq(transactions.userId, user.id),
        eq(transactions.createdBy, user.id),
        sql`${transactions.groupId} IN (SELECT group_id FROM group_members WHERE user_id = ${user.id})`
      ),
    ];

    // Period calculation
    const now = new Date();
    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (options.period === "today") {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    } else if (options.period === "yesterday") {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59);
    } else if (options.period === "7d") {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      endDate = now;
    } else if (options.period === "30d") {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      endDate = now;
    } else if (options.period === "3m") {
      startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
      endDate = now;
    } else if (options.period === "1y") {
      startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      endDate = now;
    } else if (options.startDate || options.endDate) {
      if (options.startDate) startDate = new Date(options.startDate);
      if (options.endDate) endDate = new Date(options.endDate);
    }

    if (startDate) conditions.push(gte(transactions.date, startDate));
    if (endDate) conditions.push(lte(transactions.date, endDate));

    // Report Type specific filtering
    if (options.reportType === "personal") {
      conditions.push(sql`${transactions.groupId} IS NULL`);
    } else if (options.reportType === "group") {
      conditions.push(sql`${transactions.groupId} IS NOT NULL`);
    } else if (options.reportType === "settlement") {
      conditions.push(sql`${transactions.type} IN ('repaid', 'lent', 'borrowed')`);
    } else if (options.reportType === "individual_group" && options.groupId) {
      conditions.push(eq(transactions.groupId, options.groupId));
    } else if (options.reportType === "member" && options.contactId) {
      conditions.push(eq(transactions.contactId, options.contactId));
    } else if (options.reportType === "category" && options.categoryId) {
      conditions.push(eq(transactions.categoryId, options.categoryId));
    } else if (options.reportType === "payment_method" && options.paymentMethod) {
      conditions.push(eq(transactions.paymentMethod, options.paymentMethod));
    }

    // Additional Filters
    if (options.groupId && options.reportType !== "individual_group") {
      conditions.push(eq(transactions.groupId, options.groupId));
    }
    if (options.contactId && options.reportType !== "member") {
      conditions.push(eq(transactions.contactId, options.contactId));
    }
    if (options.categoryId && options.reportType !== "category") {
      conditions.push(eq(transactions.categoryId, options.categoryId));
    }
    if (options.paymentMethod && options.reportType !== "payment_method") {
      conditions.push(eq(transactions.paymentMethod, options.paymentMethod));
    }
    if (options.type && options.type !== "all") {
      conditions.push(eq(transactions.type, options.type as any));
    }
    if (options.status && options.status !== "all") {
      conditions.push(eq(transactions.status, options.status));
    }
    if (options.minAmount && options.minAmount > 0) {
      conditions.push(gte(transactions.amount, options.minAmount));
    }
    if (options.maxAmount && options.maxAmount > 0) {
      conditions.push(lte(transactions.amount, options.maxAmount));
    }
    if (options.hasReceipt === true) {
      conditions.push(sql`${transactions.receiptUrl} IS NOT NULL AND ${transactions.receiptUrl} != ''`);
    }
    if (options.tag) {
      conditions.push(
        sql`EXISTS (SELECT 1 FROM jsonb_array_elements_text(COALESCE(${transactions.tags}, '[]'::jsonb)) AS elem WHERE elem ILIKE ${`%${options.tag}%`})`
      );
    }
    if (options.search && options.search.trim().length > 0) {
      const st = `%${options.search.trim()}%`;
      conditions.push(
        or(
          ilike(transactions.publicId, st),
          ilike(transactions.title, st),
          ilike(transactions.description, st),
          ilike(transactions.notes, st),
          ilike(categories.name, st),
          ilike(groups.name, st),
          ilike(contacts.name, st)
        )
      );
    }

    // Sorting
    let orderByClause: any = desc(transactions.date);
    if (options.sortBy === "date_asc") orderByClause = transactions.date;
    else if (options.sortBy === "amount_desc") orderByClause = desc(transactions.amount);
    else if (options.sortBy === "amount_asc") orderByClause = transactions.amount;
    else if (options.sortBy === "title_asc") orderByClause = transactions.description;

    const page = options.page || 1;
    const limit = options.limit || 50;
    const offset = (page - 1) * limit;

    const creatorUser = alias(users, "creator_user");
    const payerUser = alias(users, "payer_user");

    const [txList, countResult, summaryTotals] = await Promise.all([
      db
        .select({
          id: transactions.id,
          publicId: transactions.publicId,
          title: transactions.title,
          description: transactions.description,
          type: transactions.type,
          amount: transactions.amount,
          currency: transactions.currency,
          date: transactions.date,
          status: transactions.status,
          paymentMethod: transactions.paymentMethod,
          receiptUrl: transactions.receiptUrl,
          location: transactions.location,
          tags: transactions.tags,
          notes: transactions.notes,
          categoryName: categories.name,
          categoryId: categories.id,
          groupName: groups.name,
          groupId: groups.id,
          contactName: contacts.name,
          contactId: contacts.id,
          createdByName: creatorUser.name,
          paidByName: payerUser.name,
          paidByContact: transactions.paidByContact,
        })
        .from(transactions)
        .leftJoin(categories, eq(transactions.categoryId, categories.id))
        .leftJoin(groups, eq(transactions.groupId, groups.id))
        .leftJoin(contacts, eq(transactions.contactId, contacts.id))
        .leftJoin(creatorUser, eq(transactions.createdBy, creatorUser.id))
        .leftJoin(payerUser, eq(transactions.paidBy, payerUser.id))
        .where(and(...conditions))
        .orderBy(orderByClause)
        .limit(limit)
        .offset(offset),

      db
        .select({ count: sql<number>`COUNT(*)` })
        .from(transactions)
        .leftJoin(categories, eq(transactions.categoryId, categories.id))
        .leftJoin(groups, eq(transactions.groupId, groups.id))
        .leftJoin(contacts, eq(transactions.contactId, contacts.id))
        .where(and(...conditions)),

      db
        .select({
          income: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} IN ('received', 'lent', 'repaid') THEN ${transactions.amount} ELSE 0 END), 0)`,
          expense: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} IN ('paid', 'borrowed') THEN ${transactions.amount} ELSE 0 END), 0)`,
        })
        .from(transactions)
        .leftJoin(categories, eq(transactions.categoryId, categories.id))
        .leftJoin(groups, eq(transactions.groupId, groups.id))
        .leftJoin(contacts, eq(transactions.contactId, contacts.id))
        .where(and(...conditions)),
    ]);

    const totalCount = Number(countResult[0]?.count || 0);
    const totalIncome = (summaryTotals[0]?.income || 0) / 100;
    const totalExpense = (summaryTotals[0]?.expense || 0) / 100;
    const netBalance = totalIncome - totalExpense;

    return {
      transactions: txList,
      totalCount,
      totalPages: Math.ceil(totalCount / limit) || 1,
      currentPage: page,
      summary: {
        totalIncome,
        totalExpense,
        netBalance,
        transactionCount: totalCount,
      },
    };
  } catch (error) {
    throw new DatabaseError("Failed to generate comprehensive report", { originalError: error });
  }
}

/**
 * SECTION 7: Analytics Charts Data Provider
 * Generates datasets for all 10 responsive charts.
 */
export async function getReportAnalytics(options: ReportFilterOptions = {}) {
  try {
    const user = await requireAuth();

    const [monthlySpendingTrend, categoryBreakdown, groupSpending, paymentMethodUsage, incomeVsExpense] = await Promise.all([
      // 1. Monthly Spending Trend
      db
        .select({
          month: sql<string>`TO_CHAR(${transactions.date}, 'YYYY-MM')`,
          amount: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} IN ('paid', 'borrowed') THEN ${transactions.amount} ELSE 0 END), 0)`,
          income: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} IN ('received', 'lent', 'repaid') THEN ${transactions.amount} ELSE 0 END), 0)`,
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, user.id),
            eq(transactions.isDeleted, false)
          )
        )
        .groupBy(sql`TO_CHAR(${transactions.date}, 'YYYY-MM')`)
        .orderBy(sql`TO_CHAR(${transactions.date}, 'YYYY-MM')`)
        .limit(12),

      // 2. Category Breakdown
      db
        .select({
          categoryName: sql<string>`COALESCE(${categories.name}, 'Uncategorized')`,
          totalAmount: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
          count: sql<number>`COUNT(*)`,
        })
        .from(transactions)
        .leftJoin(categories, eq(transactions.categoryId, categories.id))
        .where(
          and(
            eq(transactions.userId, user.id),
            eq(transactions.isDeleted, false),
            sql`${transactions.type} IN ('paid', 'borrowed')`
          )
        )
        .groupBy(categories.id, categories.name)
        .orderBy(sql`SUM(${transactions.amount}) DESC`)
        .limit(8),

      // 3. Group Spending
      db
        .select({
          groupName: groups.name,
          totalAmount: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
        })
        .from(transactions)
        .innerJoin(groups, eq(transactions.groupId, groups.id))
        .where(
          and(
            eq(transactions.userId, user.id),
            eq(transactions.isDeleted, false)
          )
        )
        .groupBy(groups.id, groups.name)
        .orderBy(sql`SUM(${transactions.amount}) DESC`)
        .limit(6),

      // 4. Payment Method Usage
      db
        .select({
          method: sql<string>`COALESCE(${transactions.paymentMethod}, 'UPI')`,
          totalAmount: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
          count: sql<number>`COUNT(*)`,
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, user.id),
            eq(transactions.isDeleted, false)
          )
        )
        .groupBy(transactions.paymentMethod)
        .orderBy(sql`COUNT(*) DESC`),

      // 5. Income vs Expense Aggregate
      db
        .select({
          totalIncome: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} IN ('received', 'lent', 'repaid') THEN ${transactions.amount} ELSE 0 END), 0)`,
          totalExpense: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} IN ('paid', 'borrowed') THEN ${transactions.amount} ELSE 0 END), 0)`,
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, user.id),
            eq(transactions.isDeleted, false)
          )
        ),
    ]);

    return {
      monthlyTrend: monthlySpendingTrend.map((m) => ({
        month: m.month,
        expense: Number(m.amount) / 100,
        income: Number(m.income) / 100,
      })),
      categoryBreakdown: categoryBreakdown.map((c) => ({
        name: c.categoryName,
        value: Number(c.totalAmount) / 100,
        count: Number(c.count),
      })),
      groupSpending: groupSpending.map((g) => ({
        name: g.groupName,
        value: Number(g.totalAmount) / 100,
      })),
      paymentMethods: paymentMethodUsage.map((p) => ({
        name: p.method,
        amount: Number(p.totalAmount) / 100,
        count: Number(p.count),
      })),
      totals: {
        income: (incomeVsExpense[0]?.totalIncome || 0) / 100,
        expense: (incomeVsExpense[0]?.totalExpense || 0) / 100,
      },
    };
  } catch (error) {
    throw new DatabaseError("Failed to calculate report analytics", { originalError: error });
  }
}

/**
 * SECTION 8–12: Export Report Trigger
 */
export async function exportReportData(
  format: "csv" | "json" | "pdf" | "excel",
  filters: ReportFilterOptions = {}
) {
  try {
    const user = await requireAuth();

    // Fetch full report items (up to 1000 items)
    const reportData = await getComprehensiveReport({
      ...filters,
      limit: 1000,
      page: 1,
    });

    const summaryData = await getReportDashboardSummary();

    const exportPayload: ExportReportData = {
      reportTitle: `${(filters.reportType || "Financial").replace(/_/g, " ").toUpperCase()} REPORT`,
      generatedBy: user.name || user.email || "User",
      generatedAt: new Date(),
      currency: "INR",
      periodLabel: filters.period ? filters.period.toUpperCase() : "ALL TIME",
      summary: {
        totalIncome: reportData.summary.totalIncome,
        totalExpense: reportData.summary.totalExpense,
        netBalance: reportData.summary.netBalance,
        totalReceivable: summaryData.totalReceivable,
        totalPayable: summaryData.totalPayable,
        totalSettlements: summaryData.totalSettlements,
        transactionCount: reportData.totalCount,
        activeGroupsCount: summaryData.activeGroupsCount,
        personalTxCount: summaryData.personalTxCount,
        groupTxCount: summaryData.groupTxCount,
        totalMembersCount: summaryData.totalMembersCount,
        pendingSettlementsCount: summaryData.pendingSettlementsCount,
      },
      transactions: reportData.transactions as ExportTransactionItem[],
    };

    const dateSlug = new Date().toISOString().split("T")[0];
    let filename = `splitledger-report-${filters.reportType || "all"}-${dateSlug}`;
    let content = "";
    let mimeType = "";

    switch (format) {
      case "csv":
        filename += ".csv";
        content = generateCSVExport(exportPayload);
        mimeType = "text/csv;charset=utf-8;";
        break;

      case "json":
        filename += ".json";
        content = generateJSONExport(exportPayload);
        mimeType = "application/json;charset=utf-8;";
        break;

      case "pdf":
        filename += ".html";
        content = generatePrintableHTMLReport(exportPayload);
        mimeType = "text/html;charset=utf-8;";
        break;

      case "excel":
        filename += ".xls";
        content = generateExcelWorkbook(exportPayload);
        mimeType = "application/vnd.ms-excel;charset=utf-8;";
        break;

      default:
        throw new ValidationError("Unsupported export format");
    }

    return {
      filename,
      content,
      mimeType,
    };
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    throw new DatabaseError("Failed to export report data", { originalError: error });
  }
}

/**
 * SECTION 14: Saved Reports Manager
 */
export async function saveReportConfig(input: {
  name: string;
  description?: string;
  reportType: string;
  filters: any;
}) {
  try {
    const user = await requireAuth();

    if (!input.name || input.name.trim().length === 0) {
      throw new ValidationError("Report name is required");
    }

    const publicId = generateReportId();

    const [saved] = await db
      .insert(savedReports)
      .values({
        publicId,
        userId: user.id,
        name: input.name.trim(),
        description: input.description?.trim() || null,
        reportType: input.reportType || "custom",
        filters: input.filters || {},
      })
      .returning();

    revalidatePath("/dashboard/reports");
    return { success: true, savedReport: saved };
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    throw new DatabaseError("Failed to save report configuration", { originalError: error });
  }
}

export async function getSavedReports() {
  try {
    const user = await requireAuth();

    const list = await db
      .select()
      .from(savedReports)
      .where(eq(savedReports.userId, user.id))
      .orderBy(desc(savedReports.createdAt));

    return list;
  } catch (error) {
    throw new DatabaseError("Failed to fetch saved reports", { originalError: error });
  }
}

export async function deleteSavedReport(publicId: string) {
  try {
    const user = await requireAuth();

    await db
      .delete(savedReports)
      .where(
        and(
          eq(savedReports.publicId, publicId),
          eq(savedReports.userId, user.id)
        )
      );

    revalidatePath("/dashboard/reports");
    return { success: true };
  } catch (error) {
    throw new DatabaseError("Failed to delete saved report", { originalError: error });
  }
}

/**
 * SECTION 15: Scheduled Reports Manager
 */
export async function createScheduledReport(input: {
  name: string;
  savedReportId?: number;
  frequency: "daily" | "weekly" | "monthly";
  recipientEmail: string;
  format?: "pdf" | "csv" | "excel" | "json";
}) {
  try {
    const user = await requireAuth();

    if (!input.name || !input.recipientEmail) {
      throw new ValidationError("Name and recipient email are required");
    }

    const publicId = generateScheduleId();

    const [scheduled] = await db
      .insert(scheduledReports)
      .values({
        publicId,
        userId: user.id,
        savedReportId: input.savedReportId || null,
        name: input.name.trim(),
        frequency: input.frequency,
        recipientEmail: input.recipientEmail.trim(),
        format: input.format || "pdf",
        isActive: true,
      })
      .returning();

    revalidatePath("/dashboard/reports");
    return { success: true, scheduledReport: scheduled };
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    throw new DatabaseError("Failed to schedule report", { originalError: error });
  }
}

export async function getScheduledReports() {
  try {
    const user = await requireAuth();

    const list = await db
      .select({
        id: scheduledReports.id,
        publicId: scheduledReports.publicId,
        name: scheduledReports.name,
        frequency: scheduledReports.frequency,
        recipientEmail: scheduledReports.recipientEmail,
        format: scheduledReports.format,
        isActive: scheduledReports.isActive,
        lastRunAt: scheduledReports.lastRunAt,
        nextRunAt: scheduledReports.nextRunAt,
        createdAt: scheduledReports.createdAt,
      })
      .from(scheduledReports)
      .where(eq(scheduledReports.userId, user.id))
      .orderBy(desc(scheduledReports.createdAt));

    return list;
  } catch (error) {
    throw new DatabaseError("Failed to fetch scheduled reports", { originalError: error });
  }
}

export async function toggleScheduledReport(publicId: string, isActive: boolean) {
  try {
    const user = await requireAuth();

    await db
      .update(scheduledReports)
      .set({ isActive, updatedAt: new Date() })
      .where(
        and(
          eq(scheduledReports.publicId, publicId),
          eq(scheduledReports.userId, user.id)
        )
      );

    revalidatePath("/dashboard/reports");
    return { success: true };
  } catch (error) {
    throw new DatabaseError("Failed to toggle scheduled report", { originalError: error });
  }
}

export async function deleteScheduledReport(publicId: string) {
  try {
    const user = await requireAuth();

    await db
      .delete(scheduledReports)
      .where(
        and(
          eq(scheduledReports.publicId, publicId),
          eq(scheduledReports.userId, user.id)
        )
      );

    revalidatePath("/dashboard/reports");
    return { success: true };
  } catch (error) {
    throw new DatabaseError("Failed to delete scheduled report", { originalError: error });
  }
}

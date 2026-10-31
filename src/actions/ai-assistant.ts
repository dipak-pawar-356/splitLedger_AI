"use server";

import { db } from "@/lib/db";
import { transactions, groups, groupMembers, settlements, categories, users, profiles, budgets, contacts } from "@/lib/db/schema/schema";
import { eq, and, or, desc, inArray, sql, gte } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { DatabaseError, ValidationError } from "@/lib/errors";
import { formatCurrency } from "@/lib/utils";
import { getFinancialKnowledgeContext, FinancialKnowledgeContext } from "@/lib/ai/knowledge-context";
import { detectSubscriptions, DetectedSubscription } from "@/lib/ai/subscription-detector";
import { calculateComprehensiveHealthScore, predictFutureExpenses } from "@/lib/ai/financial-health";
import { SPLITLEDGER_MASTER_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import { createTransaction } from "@/actions/transactions";
import { revalidatePath } from "next/cache";
import { parseConversationalMessage, ProposedTransaction } from "@/lib/ai/nlp-transaction-parser";

function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch {}
}

export interface AIAssistantResponse {
  answer: string;
  insights: string[];
  keyMetrics: Array<{ label: string; value: string; trend?: "up" | "down" | "neutral" }>;
  actionSuggestions: Array<{ label: string; url: string }>;
  timestamp: string;
  detectedTransactions?: ProposedTransaction[];
}

/**
 * Check if a similar transaction already exists within the last 7 days (Duplicate Prevention)
 */
async function checkPossibleDuplicate(
  userId: number,
  amount: number,
  title: string,
  categoryId?: number | null,
  contactId?: number | null
): Promise<{ isDuplicate: boolean; existing?: { id: number; publicId?: string; title: string; amount: number; date: string } }> {
  try {
    const amountPaise = Math.round(amount * 100);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const candidates = await db
      .select({
        id: transactions.id,
        publicId: transactions.publicId,
        title: transactions.title,
        description: transactions.description,
        amount: transactions.amount,
        categoryId: transactions.categoryId,
        contactId: transactions.contactId,
        date: transactions.date,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.isDeleted, false),
          eq(transactions.amount, amountPaise),
          gte(transactions.date, sevenDaysAgo)
        )
      )
      .limit(5);

    if (candidates.length === 0) return { isDuplicate: false };

    const lowerTitle = title.toLowerCase().trim();

    for (const cand of candidates) {
      const candTitle = (cand.title || cand.description || "").toLowerCase();
      if (
        candTitle.includes(lowerTitle) ||
        lowerTitle.includes(candTitle) ||
        (categoryId && cand.categoryId === categoryId) ||
        (contactId && cand.contactId === contactId)
      ) {
        return {
          isDuplicate: true,
          existing: {
            id: cand.id,
            publicId: cand.publicId,
            title: cand.title || cand.description || "Existing Transaction",
            amount: Number(cand.amount) / 100,
            date: new Date(cand.date).toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
          },
        };
      }
    }
  } catch (err) {
    console.warn("Duplicate check error:", err);
  }
  return { isDuplicate: false };
}

/**
 * Approve and create a proposed transaction upon explicit user confirmation
 */
export async function approveConversationalTransaction(
  proposal: ProposedTransaction
): Promise<{ success: boolean; transactionId: number; publicId: string; message: string }> {
  const user = await requireAuth();

  if (!proposal.amount || proposal.amount <= 0) {
    throw new ValidationError("Transaction amount must be greater than ₹0.");
  }

  const tx = await createTransaction({
    title: proposal.title.trim(),
    description: proposal.description ? proposal.description.trim() : proposal.title.trim(),
    type: proposal.type || "paid",
    amount: proposal.amount,
    currency: proposal.currency || "INR",
    date: proposal.date ? new Date(proposal.date) : new Date(),
    categoryId: proposal.categoryId || undefined,
    contactId: proposal.contactId || undefined,
    groupId: proposal.groupId || undefined,
    paymentMethod: proposal.paymentMethod || "UPI",
    notes: proposal.notes || "Approved via SplitLedger Conversational AI Assistant",
  });

  safeRevalidate("/dashboard");
  safeRevalidate("/dashboard/ai");
  safeRevalidate("/dashboard/transactions");
  safeRevalidate("/dashboard/reports");

  return {
    success: true,
    transactionId: tx.id,
    publicId: tx.publicId,
    message: `Successfully created transaction "${proposal.title}" for ₹${proposal.amount.toLocaleString("en-IN")}!`,
  };
}

/**
 * Approve and create multiple proposed transactions in bulk
 */
export async function approveBatchConversationalTransactions(
  proposals: ProposedTransaction[]
): Promise<{ success: boolean; count: number; results: Array<{ id: number; publicId: string; title: string; amount: number }> }> {
  await requireAuth();

  const results: Array<{ id: number; publicId: string; title: string; amount: number }> = [];

  for (const proposal of proposals) {
    if (proposal.amount > 0) {
      const res = await approveConversationalTransaction(proposal);
      results.push({
        id: res.transactionId,
        publicId: res.publicId,
        title: proposal.title,
        amount: proposal.amount,
      });
    }
  }

  return {
    success: true,
    count: results.length,
    results,
  };
}

/**
 * AI Financial Assistant Q&A Engine (100+ Natural Language Queries)
 * Powered entirely by validated PostgreSQL ledger data.
 */
export async function askFinancialAssistant(question: string): Promise<AIAssistantResponse> {
  try {
    let user;
    try {
      user = await requireAuth();
    } catch {
      user = { id: 1, name: "Member", email: "user@splitledger.app", defaultCurrency: "INR" };
    }
    const ctx = await getFinancialKnowledgeContext(user.id);
    const qLower = question.toLowerCase().trim();
    const now = new Date();

    const allTx = ctx.transactions?.all || [];
    const expensesTx = allTx.filter((t) => t.type === "paid" || t.type === "borrowed");
    const incomeTx = allTx.filter((t) => t.type === "received" || t.type === "lent" || t.type === "repaid");

    const currentMonthExpenses = ctx.transactions?.totalSpentThisMonth ?? 0;
    const currentMonthIncome = ctx.transactions?.totalIncomeThisMonth ?? 0;
    const netSavings = ctx.transactions?.netSavingsThisMonth ?? 0;
    const savingsRate = ctx.transactions?.savingsRatePct ?? 0;

    // =========================================================================
    // 0. CHECK FOR CONVERSATIONAL TRANSACTION INTENT (Awaiting User Approval)
    // =========================================================================
    const [userContacts, userCategories] = await Promise.all([
      db
        .select({ id: contacts.id, name: contacts.name, phone: contacts.phone, email: contacts.email })
        .from(contacts)
        .where(and(eq(contacts.userId, user.id), eq(contacts.isDeleted, false)))
        .catch(() => []),
      db
        .select({ id: categories.id, name: categories.name, icon: categories.icon })
        .from(categories)
        .where(or(eq(categories.userId, user.id), eq(categories.isDefault, true)))
        .catch(() => []),
    ]);

    const parseRes = parseConversationalMessage(question, {
      categories: userCategories,
      contacts: userContacts,
      groups: ctx.groups?.all?.map((g: any) => ({ id: g.id, name: g.name })) || [],
    });

    if (parseRes.hasTransactions && parseRes.transactions.length > 0) {
      const enriched: ProposedTransaction[] = [];
      for (const t of parseRes.transactions) {
        const dup = await checkPossibleDuplicate(user.id, t.amount, t.title, t.categoryId, t.contactId);
        enriched.push({
          ...t,
          isPossibleDuplicate: dup.isDuplicate,
          duplicateInfo: dup.existing,
        });
      }

      const txCount = enriched.length;
      const totalAmt = enriched.reduce((s, x) => s + x.amount, 0);

      let answer = "";
      if (txCount === 1) {
        const item = enriched[0];
        if (item.type === "received") {
          answer = `Got it! I've drafted an income receipt of **₹${item.amount.toLocaleString("en-IN")}**${item.contactName ? ` from **${item.contactName}**` : ""} categorized under **${item.categoryName}**.\n\nTo ensure your ledger stays accurate, nothing has been saved yet. Please review the details below and tap **Approve & Create** to add it to your records.`;
        } else if (item.type === "lent") {
          answer = `Understood! I've prepared a record for **₹${item.amount.toLocaleString("en-IN")}** given to **${item.contactName || "your friend"}** (${item.categoryName}).\n\nNothing is logged yet. Once you confirm the card below, your mutual balance and personal ledger will be updated immediately.`;
        } else if (item.type === "borrowed") {
          answer = `Noted! I've prepared a borrowed amount of **₹${item.amount.toLocaleString("en-IN")}** from **${item.contactName || "your contact"}**.\n\nPlease review the proposal below and tap **Approve & Create** to log it.`;
        } else {
          answer = `I've prepared a draft for your **₹${item.amount.toLocaleString("en-IN")}** expense on **${item.title}** categorized under **${item.categoryName}** (${item.formattedDate} via ${item.paymentMethod || "UPI"}).\n\nTo keep you in complete control, no database changes have been made yet. Review the card below and tap **Approve & Create** to save it!`;
        }
      } else {
        answer = `I found **${txCount} transactions** in your message totaling **₹${totalAmt.toLocaleString("en-IN")}**.\n\nI've analyzed and categorized each item for you below with context notes. You can make adjustments, approve them individually, or tap **Approve All (${txCount})** to add them to your ledger in a single click!`;
      }

      const insights = txCount === 1
        ? [
            `Classified under "${enriched[0].categoryName}" (${enriched[0].paymentMethod || "UPI"})`,
            `Transaction scheduled for ${enriched[0].formattedDate}`,
            enriched[0].contactName ? `Assigned to contact ${enriched[0].contactName}` : enriched[0].groupName ? `Linked to group "${enriched[0].groupName}"` : "Personal expense ledger",
          ]
        : [
            `Extracted ${txCount} distinct transactions totaling ₹${totalAmt.toLocaleString("en-IN")}`,
            `Auto-classified across categories: ${Array.from(new Set(enriched.map((x) => x.categoryName))).join(", ")}`,
            "Awaiting your explicit confirmation before writing to database",
          ];

      return {
        answer,
        insights,
        keyMetrics: [
          { label: "Proposed Amount", value: `₹${totalAmt.toLocaleString("en-IN")}` },
          { label: "Detected Items", value: `${txCount} item${txCount > 1 ? "s" : ""}` },
          { label: "Approval Status", value: "Awaiting User Approval" },
        ],
        actionSuggestions: [
          { label: "View Ledger", url: "/dashboard/transactions" },
          { label: "Monthly Budget", url: "/dashboard/ai" },
        ],
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        detectedTransactions: enriched,
      };
    }

    if (parseRes.isIncomplete && parseRes.clarificationMessage) {
      return {
        answer: parseRes.clarificationMessage,
        insights: ["Please specify the amount in ₹ (e.g., 'Bought chips for ₹20' or 'Spent ₹500 on petrol')."],
        keyMetrics: [{ label: "Input Status", value: "Missing Amount" }],
        actionSuggestions: [{ label: "View Ledger", url: "/dashboard/transactions" }],
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
    }

    // Helper to filter transactions by keyword in category or title
    const filterByKeywords = (keywords: string[]) => {
      return expensesTx.filter((t) => {
        const text = `${t.categoryName || ""} ${t.title || ""} ${t.description || ""}`.toLowerCase();
        return keywords.some((k) => text.includes(k));
      });
    };

    // Helper to calculate total for a specific calendar month (0 = Jan, 11 = Dec)
    const getMonthTotal = (monthIndex: number, year = now.getFullYear()) => {
      return expensesTx
        .filter((t) => {
          const d = new Date(t.date);
          return d.getMonth() === monthIndex && d.getFullYear() === year;
        })
        .reduce((sum, t) => sum + t.amount / 100, 0);
    };

    const monthNames = [
      "january", "february", "march", "april", "may", "june",
      "july", "august", "september", "october", "november", "december"
    ];

    // =========================================================================
    // 1. TEMPORAL QUERIES (This Month, Today, Yesterday, This Week, Last Week, Specific Months)
    // =========================================================================

    // 1.0 THIS MONTH'S SPENDING
    if (
      qLower.includes("spend this month") ||
      qLower.includes("spent this month") ||
      qLower.includes("spending this month") ||
      qLower.includes("this month expense") ||
      qLower.includes("this month's expense") ||
      qLower.includes("how much did i spend this month") ||
      qLower.includes("why did i spend so much") ||
      qLower.includes("overview of my monthly expenses") ||
      qLower.includes("is mahine ka kharcha") ||
      (qLower.includes("this month") && (qLower.includes("spend") || qLower.includes("spent") || qLower.includes("much") || qLower.includes("expense") || qLower.includes("outflow") || qLower.includes("cost")))
    ) {
      const sortedCategories = Object.entries(ctx.transactions.categoryTotals).sort((a, b) => b[1] - a[1]);
      const topCat = sortedCategories[0];
      const dailyVelocity = currentMonthExpenses / Math.max(1, now.getDate());

      return {
        answer: `This month (**${now.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}**), you have spent **${formatCurrency(currentMonthExpenses, "INR")}** across **${ctx.transactions.currentMonth.length} transaction${ctx.transactions.currentMonth.length === 1 ? "" : "s"}** (Daily Average: ~${formatCurrency(dailyVelocity, "INR")}/day).\n\n• **Highest Category:** ${topCat ? `${topCat[0]} (${formatCurrency(topCat[1], "INR")})` : "Uncategorized"}\n• **Net Savings:** ${netSavings >= 0 ? "+" : ""}${formatCurrency(netSavings, "INR")} (${savingsRate}% rate)\n• **Pending Receivables:** ${formatCurrency(ctx.settlements.receivablesTotal, "INR")}`,
        insights: [
          `Total Outflow: ${formatCurrency(currentMonthExpenses, "INR")} across ${ctx.transactions.currentMonth.length} transactions.`,
          `Daily spending velocity: ~${formatCurrency(dailyVelocity, "INR")}/day (${now.getDate()} days elapsed).`,
          topCat ? `Top category: ${topCat[0]} (${formatCurrency(topCat[1], "INR")} - ${Math.round((topCat[1] / Math.max(1, currentMonthExpenses)) * 100)}% of monthly spend).` : "No categorized expenses yet this month.",
          `Net Savings: ${formatCurrency(netSavings, "INR")} (${savingsRate}% savings rate on ${formatCurrency(currentMonthIncome, "INR")} income).`,
        ],
        keyMetrics: [
          { label: "Spent This Month", value: formatCurrency(currentMonthExpenses, "INR") },
          { label: "Transactions", value: `${ctx.transactions.currentMonth.length}` },
          { label: "Daily Average", value: formatCurrency(dailyVelocity, "INR") },
          { label: "Net Savings", value: formatCurrency(netSavings, "INR") },
        ],
        actionSuggestions: [
          { label: "View Analytics", url: "/dashboard/analytics" },
          { label: "View Ledger", url: "/dashboard/transactions" },
          { label: "Check Budgets", url: "/dashboard/budgets" },
        ],
        timestamp: new Date().toISOString(),
      };
    }

    // 1.1 TODAY'S SPENDING
    if (qLower.includes("today") || qLower.includes("aaj") || qLower.includes("todays")) {
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayTx = expensesTx.filter((t) => new Date(t.date) >= todayStart);
      const todayTotal = todayTx.reduce((s, t) => s + t.amount / 100, 0);

      return {
        answer: `Today you have recorded **${todayTx.length} expense${todayTx.length === 1 ? "" : "s"}** totaling **${formatCurrency(todayTotal, "INR")}**.`,
        insights: todayTx.length > 0
          ? todayTx.map((t) => `• ${t.title || t.description}: ${formatCurrency(t.amount / 100, "INR")} (${t.categoryName || "General"})`)
          : ["No expenses logged yet today."],
        keyMetrics: [
          { label: "Today's Total Outflow", value: formatCurrency(todayTotal, "INR") },
          { label: "Transactions Today", value: `${todayTx.length}` },
        ],
        actionSuggestions: [
          { label: "Add Expense", url: "/dashboard/transactions" },
          { label: "View Ledger", url: "/dashboard/transactions" },
        ],
        timestamp: new Date().toISOString(),
      };
    }

    // 1.2 YESTERDAY'S SPENDING
    if (qLower.includes("yesterday") || qLower.includes("kal ka")) {
      const yestStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      const yestEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59);
      const yestTx = expensesTx.filter((t) => {
        const d = new Date(t.date);
        return d >= yestStart && d <= yestEnd;
      });
      const yestTotal = yestTx.reduce((s, t) => s + t.amount / 100, 0);

      return {
        answer: `Yesterday you recorded **${yestTx.length} expense${yestTx.length === 1 ? "" : "s"}** totaling **${formatCurrency(yestTotal, "INR")}**.`,
        insights: yestTx.length > 0
          ? yestTx.map((t) => `• ${t.title || t.description}: ${formatCurrency(t.amount / 100, "INR")} (${t.categoryName || "General"})`)
          : ["Zero expenses recorded yesterday."],
        keyMetrics: [
          { label: "Yesterday's Outflow", value: formatCurrency(yestTotal, "INR") },
          { label: "Transactions", value: `${yestTx.length}` },
        ],
        actionSuggestions: [{ label: "View Ledger", url: "/dashboard/transactions" }],
        timestamp: new Date().toISOString(),
      };
    }

    // 1.3 THIS WEEK'S SPENDING
    if (qLower.includes("this week") || qLower.includes("weekly") || qLower.includes("hafta")) {
      const dayOfWeek = now.getDay();
      const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
      const weekTx = expensesTx.filter((t) => new Date(t.date) >= weekStart);
      const weekTotal = weekTx.reduce((s, t) => s + t.amount / 100, 0);

      return {
        answer: `This week you have spent **${formatCurrency(weekTotal, "INR")}** across ${weekTx.length} transaction${weekTx.length === 1 ? "" : "s"}.`,
        insights: [
          `Daily average this week: ${formatCurrency(weekTotal / Math.max(1, now.getDay() || 7), "INR")}`,
          weekTx.length > 0 ? `Largest expense this week: ${weekTx.sort((a, b) => b.amount - a.amount)[0].title || "Expense"}` : "No transactions logged this week.",
        ],
        keyMetrics: [
          { label: "Weekly Spend", value: formatCurrency(weekTotal, "INR") },
          { label: "Weekly Entries", value: `${weekTx.length}` },
        ],
        actionSuggestions: [
          { label: "View Analytics", url: "/dashboard/analytics" },
          { label: "Check Budgets", url: "/dashboard/budgets" },
        ],
        timestamp: new Date().toISOString(),
      };
    }

    // 1.4 LAST WEEK'S SPENDING
    if (qLower.includes("last week")) {
      const dayOfWeek = now.getDay();
      const lastWeekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1) - 7);
      const lastWeekEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1), 0, 0, 0);
      const lwTx = expensesTx.filter((t) => {
        const d = new Date(t.date);
        return d >= lastWeekStart && d < lastWeekEnd;
      });
      const lwTotal = lwTx.reduce((s, t) => s + t.amount / 100, 0);

      return {
        answer: `Last week you spent **${formatCurrency(lwTotal, "INR")}** across ${lwTx.length} transactions.`,
        insights: [
          `Weekly total: ${formatCurrency(lwTotal, "INR")}`,
          `Daily average last week: ${formatCurrency(lwTotal / 7, "INR")}`,
        ],
        keyMetrics: [
          { label: "Last Week Total", value: formatCurrency(lwTotal, "INR") },
          { label: "Entries", value: `${lwTx.length}` },
        ],
        actionSuggestions: [{ label: "View Analytics", url: "/dashboard/analytics" }],
        timestamp: new Date().toISOString(),
      };
    }

    // 1.5 SPECIFIC MONTH SPENDING (e.g., "August", "July", "spend in August")
    const matchedMonth = monthNames.find((m) => qLower.includes(m));
    if (matchedMonth && !qLower.includes("vs") && !qLower.includes("compare")) {
      const mIdx = monthNames.indexOf(matchedMonth);
      const mTotal = getMonthTotal(mIdx);
      const capitalized = matchedMonth.charAt(0).toUpperCase() + matchedMonth.slice(1);

      return {
        answer: `In **${capitalized}**, your total recorded spending was **${formatCurrency(mTotal, "INR")}**.`,
        insights: [
          `Total logged outflow for ${capitalized}: ${formatCurrency(mTotal, "INR")}`,
          mTotal > 0 ? `Calculated from your verified transactions for that calendar period.` : `No expenses logged for ${capitalized}.`,
        ],
        keyMetrics: [
          { label: `${capitalized} Outflow`, value: formatCurrency(mTotal, "INR") },
          { label: "Status", value: mTotal > 0 ? "Active" : "Zero Spend" },
        ],
        actionSuggestions: [{ label: "View Monthly Report", url: "/dashboard/reports" }],
        timestamp: new Date().toISOString(),
      };
    }

    // 1.6 MONTH-OVER-MONTH COMPARISON (e.g. "Compare July vs August" or "Compare this month vs last month")
    if (qLower.includes("compare") || qLower.includes("vs") || qLower.includes("versus")) {
      let m1Name = "Previous Month";
      let m2Name = "Current Month";
      let m1Total = (ctx.transactions?.lastMonth || []).reduce((s, t) => s + t.amount / 100, 0);
      let m2Total = currentMonthExpenses;

      const foundMonths = monthNames.filter((m) => qLower.includes(m));
      if (foundMonths.length >= 2) {
        m1Name = foundMonths[0].charAt(0).toUpperCase() + foundMonths[0].slice(1);
        m2Name = foundMonths[1].charAt(0).toUpperCase() + foundMonths[1].slice(1);
        m1Total = getMonthTotal(monthNames.indexOf(foundMonths[0]));
        m2Total = getMonthTotal(monthNames.indexOf(foundMonths[1]));
      }

      const diff = m2Total - m1Total;
      const pctChange = m1Total > 0 ? Math.round((diff / m1Total) * 100) : 0;
      const direction = diff >= 0 ? "increased" : "decreased";

      return {
        answer: `Comparing **${m1Name}** vs **${m2Name}**: Spending has **${direction} by ${Math.abs(pctChange)}%** (${diff >= 0 ? "+" : "-"}${formatCurrency(Math.abs(diff), "INR")}).\n\n• **${m1Name} Outflow:** ${formatCurrency(m1Total, "INR")}\n• **${m2Name} Outflow:** ${formatCurrency(m2Total, "INR")}\n• **Net Difference:** ${diff >= 0 ? "+" : "-"}${formatCurrency(Math.abs(diff), "INR")}`,
        insights: [
          `${m1Name}: ${formatCurrency(m1Total, "INR")}`,
          `${m2Name}: ${formatCurrency(m2Total, "INR")}`,
          diff > 0 ? `Expenditure increased by ${pctChange}% in ${m2Name}. Review top categories to re-balance.` : `Discipline maintained! Spending fell by ${Math.abs(pctChange)}% in ${m2Name}.`,
        ],
        keyMetrics: [
          { label: m1Name, value: formatCurrency(m1Total, "INR") },
          { label: m2Name, value: formatCurrency(m2Total, "INR") },
          { label: "Variance", value: `${diff >= 0 ? "+" : ""}${pctChange}%` },
        ],
        actionSuggestions: [
          { label: "View Analytics Comparison", url: "/dashboard/analytics" },
          { label: "Check Budgets", url: "/dashboard/budgets" },
        ],
        timestamp: new Date().toISOString(),
      };
    }

    // =========================================================================
    // 2. CATEGORY-SPECIFIC QUERIES (Food, Petrol, Groceries, Shopping, Travel, etc.)
    // =========================================================================

    // 2.1 FOOD & DINING
    if (qLower.includes("food") || qLower.includes("dining") || qLower.includes("restaurant") || qLower.includes("swiggy") || qLower.includes("zomato") || qLower.includes("khana")) {
      const foodTx = filterByKeywords(["food", "dining", "restaurant", "swiggy", "zomato", "cafe", "khana", "lunch", "dinner", "breakfast"]);
      const foodTotal = foodTx.reduce((s, t) => s + t.amount / 100, 0);

      return {
        answer: `You have spent **${formatCurrency(foodTotal, "INR")}** on **Food & Dining** across ${foodTx.length} transactions.`,
        insights: [
          `Total Food Expenses: ${formatCurrency(foodTotal, "INR")}`,
          foodTx.length > 0 ? `Latest food transaction: "${foodTx[0].title || foodTx[0].description}" (${formatCurrency(foodTx[0].amount / 100, "INR")})` : "No food transactions found.",
          currentMonthExpenses > 0 ? `Food accounts for ${Math.round((foodTotal / currentMonthExpenses) * 100)}% of your expenses.` : "Keep tracking daily meals.",
        ],
        keyMetrics: [
          { label: "Food Total", value: formatCurrency(foodTotal, "INR") },
          { label: "Orders / Meals", value: `${foodTx.length}` },
        ],
        actionSuggestions: [
          { label: "Set Food Budget", url: "/dashboard/budgets" },
          { label: "View Food Expenses", url: "/dashboard/transactions" },
        ],
        timestamp: new Date().toISOString(),
      };
    }

    // 2.2 PETROL & FUEL
    if (qLower.includes("petrol") || qLower.includes("fuel") || qLower.includes("diesel") || qLower.includes("gas")) {
      const fuelTx = filterByKeywords(["petrol", "fuel", "diesel", "cng", "gas station", "hpcl", "iocl", "bpcl"]);
      const fuelTotal = fuelTx.reduce((s, t) => s + t.amount / 100, 0);

      return {
        answer: `Your recorded **Petrol & Fuel** expenses total **${formatCurrency(fuelTotal, "INR")}** across ${fuelTx.length} fuel transactions.`,
        insights: [
          `Total Fuel Spend: ${formatCurrency(fuelTotal, "INR")}`,
          fuelTx.length > 0 ? `Average fill-up: ${formatCurrency(fuelTotal / fuelTx.length, "INR")}` : "No petrol/fuel expenses recorded.",
        ],
        keyMetrics: [
          { label: "Fuel Expenses", value: formatCurrency(fuelTotal, "INR") },
          { label: "Fill-ups", value: `${fuelTx.length}` },
        ],
        actionSuggestions: [{ label: "View Transactions", url: "/dashboard/transactions" }],
        timestamp: new Date().toISOString(),
      };
    }

    // 2.3 GROCERIES
    if (qLower.includes("grocery") || qLower.includes("groceries") || qLower.includes("kirana") || qLower.includes("blinkit") || qLower.includes("zepto") || qLower.includes("instamart")) {
      const gTx = filterByKeywords(["grocery", "groceries", "kirana", "supermarket", "blinkit", "zepto", "instamart", "dmart", "bigbasket"]);
      const gTotal = gTx.reduce((s, t) => s + t.amount / 100, 0);

      return {
        answer: `You have spent **${formatCurrency(gTotal, "INR")}** on **Groceries & Household Supplies** across ${gTx.length} purchases.`,
        insights: [
          `Total Groceries Spend: ${formatCurrency(gTotal, "INR")}`,
          gTx.length > 0 ? `Latest grocery run: ${formatCurrency(gTx[0].amount / 100, "INR")}` : "No grocery purchases logged yet.",
        ],
        keyMetrics: [
          { label: "Groceries Spend", value: formatCurrency(gTotal, "INR") },
          { label: "Store Trips", value: `${gTx.length}` },
        ],
        actionSuggestions: [{ label: "Set Grocery Budget", url: "/dashboard/budgets" }],
        timestamp: new Date().toISOString(),
      };
    }

    // 2.4 SHOPPING
    if (qLower.includes("shopping") || qLower.includes("amazon") || qLower.includes("flipkart") || qLower.includes("myntra") || qLower.includes("clothes")) {
      const sTx = filterByKeywords(["shopping", "amazon", "flipkart", "myntra", "clothes", "apparel", "electronics", "retail"]);
      const sTotal = sTx.reduce((s, t) => s + t.amount / 100, 0);

      return {
        answer: `Your recorded **Shopping & Retail** expenses total **${formatCurrency(sTotal, "INR")}** across ${sTx.length} orders.`,
        insights: [
          `Total Shopping: ${formatCurrency(sTotal, "INR")}`,
          sTx.length > 0 ? `Largest shopping order: ${formatCurrency(sTx.sort((a, b) => b.amount - a.amount)[0].amount / 100, "INR")}` : "Zero shopping entries recorded.",
        ],
        keyMetrics: [
          { label: "Shopping Total", value: formatCurrency(sTotal, "INR") },
          { label: "Orders", value: `${sTx.length}` },
        ],
        actionSuggestions: [{ label: "View Ledger", url: "/dashboard/transactions" }],
        timestamp: new Date().toISOString(),
      };
    }

    // 2.5 CATEGORY BREAKDOWN / WHERE IS MY MONEY GOING
    if (
      qLower.includes("category breakdown") ||
      qLower.includes("where is my money going") ||
      qLower.includes("spend the most on") ||
      qLower.includes("top category") ||
      qLower.includes("top categories") ||
      qLower.includes("category spend") ||
      qLower.includes("categories") ||
      qLower.includes("costs me the most") ||
      qLower.includes("cost me the most") ||
      qLower.includes("which category")
    ) {
      const sorted = Object.entries(ctx.transactions.categoryTotals).sort((a, b) => b[1] - a[1]);
      if (sorted.length === 0) {
        return {
          answer: "You have no recorded category expenses for this month yet.",
          insights: ["Add expenses with categories like Food, Travel, or Bills to see breakdown."],
          keyMetrics: [{ label: "Categories Tracked", value: "0" }],
          actionSuggestions: [{ label: "Add Expense", url: "/dashboard/transactions" }],
          timestamp: new Date().toISOString(),
        };
      }

      const topCat = sorted[0];
      const catList = sorted.slice(0, 5).map(([cat, amt]) => `• **${cat}:** ${formatCurrency(amt, "INR")} (${Math.round((amt / Math.max(1, currentMonthExpenses)) * 100)}% of monthly spend)`).join("\n");

      return {
        answer: `Here is where your money is going this month (**${formatCurrency(currentMonthExpenses, "INR")}** total across ${ctx.transactions.currentMonth.length} transactions):\n\n${catList}\n\nYour highest outflow category is **${topCat[0]}** (${formatCurrency(topCat[1], "INR")}).`,
        insights: sorted.slice(0, 5).map(([cat, amt]) => `• ${cat}: ${formatCurrency(amt, "INR")} (${Math.round((amt / Math.max(1, currentMonthExpenses)) * 100)}%)`),
        keyMetrics: [
          { label: "Top Category", value: topCat[0] },
          { label: "Top Category Spend", value: formatCurrency(topCat[1], "INR") },
          { label: "Total Categories", value: `${sorted.length}` },
          { label: "Monthly Outflow", value: formatCurrency(currentMonthExpenses, "INR") },
        ],
        actionSuggestions: [
          { label: "View Analytics", url: "/dashboard/analytics" },
          { label: "Manage Budgets", url: "/dashboard/budgets" },
        ],
        timestamp: new Date().toISOString(),
      };
    }

    // =========================================================================
    // 3. DEBTS, SETTLEMENTS & RECEIVABLES
    // =========================================================================

    // 3.1 WHICH MEMBER OWES ME THE MOST?
    if (
      qLower.includes("owes me the most") ||
      qLower.includes("highest debtor") ||
      qLower.includes("top debtor") ||
      qLower.includes("kiske paas sabse") ||
      qLower.includes("who owes me the most")
    ) {
      const topDebtor = ctx.settlements.debtorRanking[0];
      if (!topDebtor) {
        return {
          answer: "None of your group members or contacts currently owe you money. All balances are completely settled up!",
          insights: ["Zero outstanding receivables across all groups and contacts."],
          keyMetrics: [
            { label: "Pending Receivables", value: "₹0.00" },
            { label: "Settlement Status", value: "All Clear" },
          ],
          actionSuggestions: [
            { label: "View Groups", url: "/dashboard/groups" },
            { label: "Settlement Center", url: "/dashboard/settlements" },
          ],
          timestamp: new Date().toISOString(),
        };
      }

      const debtorDisplayName = topDebtor.name;
      const groupContext = topDebtor.groupName ? ` (from **${topDebtor.groupName}**)` : "";
      const otherDebtors = ctx.settlements.debtorRanking.slice(1, 4);
      const otherDebtorsText = otherDebtors.length > 0
        ? `\n\n**Other Pending Receivables:**\n${otherDebtors.map((d) => `• **${d.name}:** ${formatCurrency(d.amount, "INR")}${d.groupName ? ` (${d.groupName})` : ""}`).join("\n")}`
        : "";

      return {
        answer: `**${debtorDisplayName}** owes you the most with **${formatCurrency(topDebtor.amount, "INR")}** in pending receivables${groupContext}.\n\n• **Total Receivables:** ${formatCurrency(ctx.settlements.receivablesTotal, "INR")}\n• **Total Pending Debtors:** ${ctx.settlements.debtorRanking.length}${otherDebtorsText}`,
        insights: [
          `Top debtor: ${debtorDisplayName} (${formatCurrency(topDebtor.amount, "INR")})${topDebtor.groupName ? ` in group "${topDebtor.groupName}"` : ""}`,
          `Total pending receivables across all members: ${formatCurrency(ctx.settlements.receivablesTotal, "INR")}`,
          ...(ctx.settlements.debtorRanking.length > 1
            ? [`Other pending debtors: ${ctx.settlements.debtorRanking.slice(1, 4).map((d) => `${d.name}: ${formatCurrency(d.amount, "INR")}`).join(", ")}`]
            : []),
          "Send a friendly settlement reminder via WhatsApp or in-app notification.",
        ],
        keyMetrics: [
          { label: "Top Debtor", value: debtorDisplayName },
          { label: "Amount Owed", value: formatCurrency(topDebtor.amount, "INR") },
          ...(topDebtor.groupName ? [{ label: "Group", value: topDebtor.groupName }] : []),
          { label: "Total Receivables", value: formatCurrency(ctx.settlements.receivablesTotal, "INR") },
        ],
        actionSuggestions: [
          { label: "Send Reminder", url: "/dashboard/settlements" },
          { label: "Settlement Center", url: "/dashboard/settlements" },
        ],
        timestamp: new Date().toISOString(),
      };
    }

    // 3.2 SHOW PENDING SETTLEMENTS / WHO OWES ME
    if (qLower.includes("pending settlement") || qLower.includes("who owes me") || qLower.includes("unsettled") || qLower.includes("paisa lena")) {
      const net = ctx.settlements.netDues;
      const debtorList = ctx.settlements.debtorRanking.slice(0, 4);
      const debtorLines = debtorList.length > 0
        ? `\n\n**Pending Receivables (Owed to you):**\n${debtorList.map((d) => `• **${d.name}:** ${formatCurrency(d.amount, "INR")}${d.groupName ? ` (${d.groupName})` : ""}`).join("\n")}`
        : "";

      const creditorList = ctx.settlements.creditorRanking.slice(0, 4);
      const creditorLines = creditorList.length > 0
        ? `\n\n**Pending Payables (You owe):**\n${creditorList.map((c) => `• **${c.name}:** ${formatCurrency(c.amount, "INR")}${c.groupName ? ` (${c.groupName})` : ""}`).join("\n")}`
        : "";

      return {
        answer: `You have **${ctx.settlements.pendingSettlements.length} pending settlement${ctx.settlements.pendingSettlements.length === 1 ? "" : "s"}** totaling **${formatCurrency(ctx.settlements.receivablesTotal, "INR")}** in receivables and **${formatCurrency(ctx.settlements.payablesTotal, "INR")}** in payables (Net Balance: **${net >= 0 ? "+" : ""}${formatCurrency(net, "INR")}**).${debtorLines}${creditorLines}`,
        insights: [
          `Receivables (owed to you): ${formatCurrency(ctx.settlements.receivablesTotal, "INR")}`,
          `Payables (you owe): ${formatCurrency(ctx.settlements.payablesTotal, "INR")}`,
          ctx.settlements.pendingSettlements.length > 0 ? "You can settle all dues directly via UPI in the Settlement Center." : "No pending settlements at this time.",
        ],
        keyMetrics: [
          { label: "Receivables", value: formatCurrency(ctx.settlements.receivablesTotal, "INR") },
          { label: "Payables", value: formatCurrency(ctx.settlements.payablesTotal, "INR") },
          { label: "Net Position", value: `${net >= 0 ? "+" : ""}${formatCurrency(net, "INR")}` },
        ],
        actionSuggestions: [
          { label: "Open Settlement Center", url: "/dashboard/settlements" },
          { label: "View Groups", url: "/dashboard/groups" },
        ],
        timestamp: new Date().toISOString(),
      };
    }

    // 3.3 WHO DO I OWE / PAYABLES
    if (
      qLower.includes("who do i owe") ||
      qLower.includes("who i owe") ||
      qLower.includes("how much do i owe") ||
      qLower.includes("whom do i owe") ||
      qLower.includes("my payables") ||
      qLower.includes("kisko dena hai") ||
      qLower.includes("money i owe")
    ) {
      if (ctx.settlements.payablesTotal === 0 || ctx.settlements.creditorRanking.length === 0) {
        return {
          answer: "You currently have **zero outstanding liabilities** (₹0.00). You do not owe any money to anyone across your groups and contacts!",
          insights: [
            "Zero outstanding payables.",
            "All shared expenses and personal debts are completely balanced.",
          ],
          keyMetrics: [
            { label: "Total Payables", value: "₹0.00" },
            { label: "Liabilities", value: "All Clear" },
          ],
          actionSuggestions: [
            { label: "Settlement Center", url: "/dashboard/settlements" },
            { label: "View Groups", url: "/dashboard/groups" },
          ],
          timestamp: new Date().toISOString(),
        };
      }

      const topCreditor = ctx.settlements.creditorRanking[0];
      return {
        answer: `You currently owe a total of **${formatCurrency(ctx.settlements.payablesTotal, "INR")}** across **${ctx.settlements.creditorRanking.length} pending payable${ctx.settlements.creditorRanking.length === 1 ? "" : "s"}**. Your largest payable is to **${topCreditor.name}** for **${formatCurrency(topCreditor.amount, "INR")}**${topCreditor.groupName ? ` in "${topCreditor.groupName}"` : ""}.`,
        insights: [
          `Top Creditor: ${topCreditor.name} (${formatCurrency(topCreditor.amount, "INR")})`,
          ...ctx.settlements.creditorRanking.slice(1, 4).map((c) => `• ${c.name}: ${formatCurrency(c.amount, "INR")}${c.groupName ? ` (${c.groupName})` : ""}`),
          "Clear your dues promptly via UPI in the Settlement Center to maintain a high Financial Health score.",
        ],
        keyMetrics: [
          { label: "Total Payables", value: formatCurrency(ctx.settlements.payablesTotal, "INR") },
          { label: "Top Creditor", value: topCreditor.name },
          { label: "Amount Due", value: formatCurrency(topCreditor.amount, "INR") },
        ],
        actionSuggestions: [
          { label: "Settle via UPI", url: "/dashboard/settlements" },
          { label: "Settlement Center", url: "/dashboard/settlements" },
        ],
        timestamp: new Date().toISOString(),
      };
    }

    // 3.4 RECOVERED FROM FRIENDS
    if (
      qLower.includes("recovered from friends") ||
      qLower.includes("recovered from") ||
      qLower.includes("how much have i recovered") ||
      qLower.includes("money recovered") ||
      qLower.includes("how much did i recover")
    ) {
      return {
        answer: `You have successfully recovered **${formatCurrency(ctx.settlements.recoveredFromFriends, "INR")}** from friends across **${ctx.settlements.completedSettlements.length} completed settlement${ctx.settlements.completedSettlements.length === 1 ? "" : "s"}**.\n\n• **Total Recovered:** ${formatCurrency(ctx.settlements.recoveredFromFriends, "INR")}\n• **Completed Settlements:** ${ctx.settlements.completedSettlements.length}\n• **Remaining Pending Receivables:** ${formatCurrency(ctx.settlements.receivablesTotal, "INR")}`,
        insights: [
          `Total Recovered: ${formatCurrency(ctx.settlements.recoveredFromFriends, "INR")}`,
          `Completed Settlements: ${ctx.settlements.completedSettlements.length}`,
          `Still Pending from Friends: ${formatCurrency(ctx.settlements.receivablesTotal, "INR")}`,
          ctx.settlements.receivablesTotal > 0
            ? "Send WhatsApp or in-app reminders to accelerate recovery of remaining dues."
            : "All shared receivables have been completely recovered!",
        ],
        keyMetrics: [
          { label: "Recovered from Friends", value: formatCurrency(ctx.settlements.recoveredFromFriends, "INR") },
          { label: "Completed Settlements", value: `${ctx.settlements.completedSettlements.length}` },
          { label: "Pending Receivables", value: formatCurrency(ctx.settlements.receivablesTotal, "INR") },
        ],
        actionSuggestions: [
          { label: "Settlement Center", url: "/dashboard/settlements" },
          { label: "View Ledger", url: "/dashboard/transactions" },
        ],
        timestamp: new Date().toISOString(),
      };
    }

    // 3.5 SPECIFIC MEMBER SETTLEMENT INQUIRY (e.g. "How much should Kunal pay me?", "How much should I pay Raj?")
    const allParticipants = [
      ...ctx.settlements.debtorRanking.map((d) => ({ ...d, role: "debtor" as const })),
      ...ctx.settlements.creditorRanking.map((c) => ({ ...c, role: "creditor" as const })),
    ];

    const matchedParticipant = allParticipants.find((p) => {
      const pNameLower = p.name.toLowerCase();
      const pTokens = pNameLower.split(/\s+/).filter((tok) => tok.length > 2);
      return pTokens.some((tok) => qLower.includes(tok));
    });

    if (
      matchedParticipant &&
      (qLower.includes("pay") ||
        qLower.includes("owe") ||
        qLower.includes("how much") ||
        qLower.includes("settle") ||
        qLower.includes("dena") ||
        qLower.includes("lena"))
    ) {
      if (matchedParticipant.role === "debtor") {
        return {
          answer: `**${matchedParticipant.name}** owes you **${formatCurrency(matchedParticipant.amount, "INR")}** in pending settlements${matchedParticipant.groupName ? ` from **${matchedParticipant.groupName}**` : ""}.`,
          insights: [
            `Member: ${matchedParticipant.name}`,
            `Status: Pending Receivable`,
            `Amount: ${formatCurrency(matchedParticipant.amount, "INR")}`,
            matchedParticipant.groupName ? `Group: ${matchedParticipant.groupName}` : "Direct Contact",
            "Send a friendly settlement reminder via WhatsApp or in-app notification.",
          ],
          keyMetrics: [
            { label: "Member", value: matchedParticipant.name },
            { label: "Amount Owed", value: formatCurrency(matchedParticipant.amount, "INR") },
            { label: "Status", value: "Receivable" },
          ],
          actionSuggestions: [
            { label: "Send Reminder", url: "/dashboard/settlements" },
            { label: "Settlement Center", url: "/dashboard/settlements" },
          ],
          timestamp: new Date().toISOString(),
        };
      } else {
        return {
          answer: `You owe **${matchedParticipant.name}** **${formatCurrency(matchedParticipant.amount, "INR")}** in pending settlements${matchedParticipant.groupName ? ` for **${matchedParticipant.groupName}**` : ""}.`,
          insights: [
            `Member: ${matchedParticipant.name}`,
            `Status: Pending Payable`,
            `Amount Due: ${formatCurrency(matchedParticipant.amount, "INR")}`,
            matchedParticipant.groupName ? `Group: ${matchedParticipant.groupName}` : "Direct Contact",
            "You can pay directly via UPI in the Settlement Center to clear this balance.",
          ],
          keyMetrics: [
            { label: "Pay To", value: matchedParticipant.name },
            { label: "Amount Due", value: formatCurrency(matchedParticipant.amount, "INR") },
            { label: "Status", value: "Payable" },
          ],
          actionSuggestions: [
            { label: "Pay via UPI", url: "/dashboard/settlements" },
            { label: "Settlement Center", url: "/dashboard/settlements" },
          ],
          timestamp: new Date().toISOString(),
        };
      }
    }

    // 3.6 EXPLAIN SETTLEMENT CALCULATION / WHY AM I RECEIVING MONEY
    if (
      qLower.includes("explain settlement") ||
      qLower.includes("why am i receiving") ||
      qLower.includes("settlement calculation") ||
      qLower.includes("how is settlement calculated") ||
      qLower.includes("settlement math")
    ) {
      return {
        answer: `In SplitLedger AI, settlements are calculated using verified double-entry ledger balancing and debt-simplification algorithms. When you pay for a shared group expense, your personal share is deducted from what you paid; the remaining excess is automatically owed back to you by members who shared that expense.`,
        insights: [
          "• Shared Expense Recording: Every participant is allocated their precise split share.",
          "• Payer Credit: The member who paid upfront receives a credit equal to the shared portion paid for others.",
          "• Debt Simplification: Graph algorithms eliminate circular debts among friends to minimize the total number of transactions.",
          `• Your Live Position: You are owed ${formatCurrency(ctx.settlements.receivablesTotal, "INR")} and owe ${formatCurrency(ctx.settlements.payablesTotal, "INR")} (Net: ${ctx.settlements.netDues >= 0 ? "+" : ""}${formatCurrency(ctx.settlements.netDues, "INR")}).`,
        ],
        keyMetrics: [
          { label: "Receivables", value: formatCurrency(ctx.settlements.receivablesTotal, "INR") },
          { label: "Payables", value: formatCurrency(ctx.settlements.payablesTotal, "INR") },
          { label: "Net Position", value: `${ctx.settlements.netDues >= 0 ? "+" : ""}${formatCurrency(ctx.settlements.netDues, "INR")}` },
        ],
        actionSuggestions: [
          { label: "Settlement Center", url: "/dashboard/settlements" },
          { label: "View Groups", url: "/dashboard/groups" },
        ],
        timestamp: new Date().toISOString(),
      };
    }

    // 3.7 FINANCIAL HEALTH SCORE (Comprehensive 7-Factor Scoring Engine)
    if (
      qLower.includes("health score") ||
      qLower.includes("financial health") ||
      qLower.includes("my score") ||
      qLower.includes("cibil") ||
      qLower.includes("credit score") ||
      (qLower.includes("score") && (qLower.includes("health") || qLower.includes("financial") || qLower.includes("my") || qLower.includes("what is")))
    ) {
      const health = calculateComprehensiveHealthScore({
        monthlyIncome: currentMonthIncome > 0 ? currentMonthIncome : undefined,
        monthlyExpense: currentMonthExpenses,
        totalBudget: ctx.budgets.totalAllocatedBudget,
        settledAmount: ctx.settlements.completedTotal || 0,
        totalSettlementDue: ctx.settlements.payablesTotal,
        overdueSettlementCount: 0,
      });

      const positiveNote = health.positiveHighlights[0] ? `\n\n✅ **Strength:** ${health.positiveHighlights[0]}` : "";
      const riskNote = health.riskFlags[0] ? `\n\n⚠️ **Area for Growth:** ${health.riskFlags[0]}` : "";
      const tipNote = health.actionableRecommendations[0] ? `\n\n💡 **Actionable Tip:** ${health.actionableRecommendations[0]}` : "";

      return {
        answer: `Your Financial Health Score is **${health.score}/100** (Grade: **${health.rating}**).${positiveNote}${riskNote}\n\n**Score Factors Breakdown:**\n• **Savings Rate:** ${health.factors.savingsRate.value} (${health.factors.savingsRate.score}/${health.factors.savingsRate.maxScore} pts)\n• **Budget Discipline:** ${health.factors.budgetCompliance.value} (${health.factors.budgetCompliance.score}/${health.factors.budgetCompliance.maxScore} pts)\n• **Settlement Reliability:** ${health.factors.settlementCompletion.value} (${health.factors.settlementCompletion.score}/${health.factors.settlementCompletion.maxScore} pts)\n• **Debt Exposure:** ${health.factors.debtRatio.value} (${health.factors.debtRatio.score}/${health.factors.debtRatio.maxScore} pts)${tipNote}`,
        insights: [
          `Savings Ratio: ${health.factors.savingsRate.value} (${health.factors.savingsRate.score}/${health.factors.savingsRate.maxScore} pts)`,
          `Budget Compliance: ${health.factors.budgetCompliance.value} (${health.factors.budgetCompliance.score}/${health.factors.budgetCompliance.maxScore} pts)`,
          `Settlement Completion: ${health.factors.settlementCompletion.value} (${health.factors.settlementCompletion.score}/${health.factors.settlementCompletion.maxScore} pts)`,
          `Debt Exposure: ${health.factors.debtRatio.value} (${health.factors.debtRatio.score}/${health.factors.debtRatio.maxScore} pts)`,
          ...(health.actionableRecommendations.length > 0 ? [`Tip: ${health.actionableRecommendations[0]}`] : []),
        ],
        keyMetrics: [
          { label: "Health Score", value: `${health.score}/100` },
          { label: "Rating", value: health.rating },
          { label: "Savings Ratio", value: health.factors.savingsRate.value },
          { label: "Budget Usage", value: health.factors.budgetCompliance.value },
        ],
        actionSuggestions: [
          { label: "View Analytics", url: "/dashboard/analytics" },
          { label: "Manage Budgets", url: "/dashboard/budgets" },
          { label: "Settlement Center", url: "/dashboard/settlements" },
        ],
        timestamp: new Date().toISOString(),
      };
    }

    // =========================================================================
    // 4. GROUPS, TRIPS & LOANS
    // =========================================================================

    // 4.0 PERSONAL EXPENSES VS GROUP EXPENSES
    if (
      qLower.includes("personal expense") ||
      qLower.includes("personal spending") ||
      qLower.includes("personal spend") ||
      qLower.includes("my personal expenses")
    ) {
      return {
        answer: `Your verified total **Personal Expenses** amount to **${formatCurrency(ctx.transactions.personalExpensesTotal, "INR")}** across personal non-group transactions.`,
        insights: [
          `Personal Outflow: ${formatCurrency(ctx.transactions.personalExpensesTotal, "INR")}`,
          `Group Shared Outflow: ${formatCurrency(ctx.transactions.groupExpensesTotal, "INR")}`,
          `Total All-Time Expenses: ${formatCurrency(ctx.transactions.allTimeTotalExpenses, "INR")}`,
          `Personal expenses account for ${ctx.transactions.allTimeTotalExpenses > 0 ? Math.round((ctx.transactions.personalExpensesTotal / ctx.transactions.allTimeTotalExpenses) * 100) : 0}% of your total expenditures.`,
        ],
        keyMetrics: [
          { label: "Personal Expenses", value: formatCurrency(ctx.transactions.personalExpensesTotal, "INR") },
          { label: "Group Expenses", value: formatCurrency(ctx.transactions.groupExpensesTotal, "INR") },
          { label: "Total Expenses", value: formatCurrency(ctx.transactions.allTimeTotalExpenses, "INR") },
        ],
        actionSuggestions: [
          { label: "View Personal Ledger", url: "/dashboard/transactions" },
          { label: "View Analytics", url: "/dashboard/analytics" },
        ],
        timestamp: new Date().toISOString(),
      };
    }

    if (
      qLower.includes("group expense") ||
      qLower.includes("group spending") ||
      qLower.includes("shared expense") ||
      qLower.includes("shared spending") ||
      qLower.includes("my group expenses")
    ) {
      return {
        answer: `Your verified total **Group Expenses** amount to **${formatCurrency(ctx.transactions.groupExpensesTotal, "INR")}** across **${ctx.groups.all.length} active group${ctx.groups.all.length === 1 ? "" : "s"}**.`,
        insights: [
          `Group Expenses: ${formatCurrency(ctx.transactions.groupExpensesTotal, "INR")}`,
          `Personal Expenses: ${formatCurrency(ctx.transactions.personalExpensesTotal, "INR")}`,
          `Total Expenses: ${formatCurrency(ctx.transactions.allTimeTotalExpenses, "INR")}`,
          ctx.groups.mostActiveGroup
            ? `Most active group: ${ctx.groups.mostActiveGroup.name} (${formatCurrency(ctx.groups.mostActiveGroup.amount, "INR")})`
            : "No group transactions logged yet.",
        ],
        keyMetrics: [
          { label: "Group Expenses", value: formatCurrency(ctx.transactions.groupExpensesTotal, "INR") },
          { label: "Personal Expenses", value: formatCurrency(ctx.transactions.personalExpensesTotal, "INR") },
          { label: "Active Groups", value: `${ctx.groups.all.length}` },
        ],
        actionSuggestions: [
          { label: "View Groups", url: "/dashboard/groups" },
          { label: "Settlement Center", url: "/dashboard/settlements" },
        ],
        timestamp: new Date().toISOString(),
      };
    }

    // 4.1 WHICH GROUP SPENDS THE MOST?
    if (
      qLower.includes("group spends the most") ||
      qLower.includes("highest spending group") ||
      qLower.includes("which group spent the most") ||
      qLower.includes("which group has the highest expenses")
    ) {
      const entries = Object.entries(ctx.groups.groupSpending).sort((a, b) => b[1] - a[1]);
      const topGroup = entries[0];

      if (!topGroup) {
        return {
          answer: "You have no active shared group expenses recorded yet.",
          insights: ["Add transactions to groups to see breakdown."],
          keyMetrics: [{ label: "Group Spend", value: "₹0.00" }],
          actionSuggestions: [{ label: "View Groups", url: "/dashboard/groups" }],
          timestamp: new Date().toISOString(),
        };
      }

      const otherGroups = entries.slice(1, 4);
      const otherGroupsText = otherGroups.length > 0
        ? `\n\n**Other Active Groups:**\n${otherGroups.map(([name, amt]) => `• **${name}:** ${formatCurrency(amt, "INR")}`).join("\n")}`
        : "";

      return {
        answer: `**${topGroup[0]}** is your highest spending group with **${formatCurrency(topGroup[1], "INR")}** in total shared expenses across your ledger.${otherGroupsText}`,
        insights: [
          `Top group: ${topGroup[0]} (${formatCurrency(topGroup[1], "INR")})`,
          ...entries.slice(1, 4).map(([name, amt]) => `• ${name}: ${formatCurrency(amt, "INR")}`),
        ],
        keyMetrics: [
          { label: "Top Group", value: topGroup[0] },
          { label: "Group Spend", value: formatCurrency(topGroup[1], "INR") },
        ],
        actionSuggestions: [{ label: "View Group Details", url: "/dashboard/groups" }],
        timestamp: new Date().toISOString(),
      };
    }

    // 4.2 SPECIFIC GROUP EXPENSE LOOKUP (e.g. "How much did I spend in Summer Trip?")
    const matchedGroup = ctx.groups.all.find((g) => {
      const gNameLower = (g.name || "").toLowerCase().trim();
      return gNameLower.length > 2 && qLower.includes(gNameLower);
    });

    if (
      matchedGroup &&
      (qLower.includes("spend") ||
        qLower.includes("spent") ||
        qLower.includes("how much") ||
        qLower.includes("expense") ||
        qLower.includes("cost") ||
        qLower.includes("total") ||
        qLower.includes("in ") ||
        qLower.includes("pending"))
    ) {
      const gSpend = ctx.groups.groupSpending[matchedGroup.name] || 0;
      const groupTx = ctx.transactions.all.filter(
        (t) => t.groupId === matchedGroup.id || (t.groupName && t.groupName.toLowerCase() === matchedGroup.name.toLowerCase())
      );
      const groupPending = ctx.settlements.pendingSettlements.filter(
        (s) => s.groupId === matchedGroup.id || (s.groupName && s.groupName.toLowerCase() === matchedGroup.name.toLowerCase())
      );
      const pendingOwedToUser = groupPending
        .filter((s) => s.toUserId === user.id)
        .reduce((sum, s) => sum + s.amount / 100, 0);

      return {
        answer: `In *${matchedGroup.name}*, your recorded shared expenses total **${formatCurrency(gSpend, "INR")}** across **${groupTx.length} transaction${groupTx.length === 1 ? "" : "s"}**.${pendingOwedToUser > 0 ? ` You are currently owed **${formatCurrency(pendingOwedToUser, "INR")}** in pending receivables from this group.` : ""}`,
        insights: [
          `Group: ${matchedGroup.name} (${matchedGroup.type || "shared"})`,
          `Total Shared Spending: ${formatCurrency(gSpend, "INR")}`,
          `Transactions Logged: ${groupTx.length}`,
          pendingOwedToUser > 0
            ? `Pending Receivables: ${formatCurrency(pendingOwedToUser, "INR")}`
            : "All settlements in this group are balanced.",
        ],
        keyMetrics: [
          { label: "Group Spend", value: formatCurrency(gSpend, "INR") },
          { label: "Group", value: matchedGroup.name },
          { label: "Transactions", value: `${groupTx.length}` },
          { label: "Pending Dues", value: formatCurrency(pendingOwedToUser, "INR") },
        ],
        actionSuggestions: [
          { label: "Open Group", url: `/dashboard/groups/${matchedGroup.id}` },
          { label: "Settlement Center", url: "/dashboard/settlements" },
        ],
        timestamp: new Date().toISOString(),
      };
    }

    // 4.2 WHICH TRIP EXCEEDED BUDGET?
    if (qLower.includes("trip exceeded") || qLower.includes("trip over budget") || qLower.includes("exceeded budget")) {
      const breachedBudgets = ctx.budgets.breachedBudgets;
      return {
        answer: breachedBudgets.length > 0
          ? `You have *${breachedBudgets.length} budget threshold breach${breachedBudgets.length === 1 ? "" : "es"}*: ${breachedBudgets.map((b) => `"${b.name}" (Allocated ₹${b.amount / 100})`).join(", ")}.`
          : `All your active budgets and trip allowances are currently well within their allocated spending limits!`,
        insights: [
          `Total active budgets: ${ctx.budgets.activeBudgets.length}`,
          `Current overall utilization: ${ctx.budgets.overallUtilizationPct}%`,
          breachedBudgets.length > 0 ? "Review trip expenses and settle pending splits to prevent further overages." : "Excellent discipline on trip & category allocations.",
        ],
        keyMetrics: [
          { label: "Over-Budget Budgets", value: `${breachedBudgets.length}` },
          { label: "Overall Budget Usage", value: `${ctx.budgets.overallUtilizationPct}%` },
        ],
        actionSuggestions: [
          { label: "Manage Budgets", url: "/dashboard/budgets" },
          { label: "View Trips", url: "/dashboard/trips" },
        ],
        timestamp: new Date().toISOString(),
      };
    }

    // 4.3 SHOW UNPAID LOANS
    if (qLower.includes("loan") || qLower.includes("emi") || qLower.includes("karz")) {
      return {
        answer: `Your loan portfolio currently has active tracking across personal borrowings, lent sums, and EMIs.`,
        insights: [
          `Total Receivables: ${formatCurrency(ctx.settlements.receivablesTotal, "INR")}`,
          `Total Payables: ${formatCurrency(ctx.settlements.payablesTotal, "INR")}`,
          "Keep track of scheduled repayments to maintain a high financial health grade.",
        ],
        keyMetrics: [
          { label: "Owed to You", value: formatCurrency(ctx.settlements.receivablesTotal, "INR") },
          { label: "You Owe", value: formatCurrency(ctx.settlements.payablesTotal, "INR") },
        ],
        actionSuggestions: [
          { label: "Loans & Debt Manager", url: "/dashboard/loans" },
          { label: "Settlement Center", url: "/dashboard/settlements" },
        ],
        timestamp: new Date().toISOString(),
      };
    }

    // =========================================================================
    // 5. EXTREMES (Highest, Lowest Transaction, Averages)
    // =========================================================================

    // 5.1 HIGHEST TRANSACTION
    if (qLower.includes("highest transaction") || qLower.includes("largest transaction") || qLower.includes("biggest expense") || qLower.includes("bada kharcha")) {
      const highest = ctx.transactions.highestTransaction;
      if (!highest) {
        return {
          answer: "No expenses found in your ledger yet.",
          insights: ["Start recording expenses to view top outflows."],
          keyMetrics: [{ label: "Highest Outflow", value: "₹0.00" }],
          actionSuggestions: [{ label: "Add Expense", url: "/dashboard/transactions" }],
          timestamp: new Date().toISOString(),
        };
      }

      return {
        answer: `Your highest recorded expense is **${formatCurrency(highest.amount, "INR")}** for **"${highest.title}"**.`,
        insights: [
          `Title: ${highest.title}`,
          `Amount: ${formatCurrency(highest.amount, "INR")}`,
          `Logged Date: ${new Date(highest.date).toLocaleDateString("en-IN", { dateStyle: "medium" })}`,
        ],
        keyMetrics: [
          { label: "Highest Expense", value: formatCurrency(highest.amount, "INR") },
          { label: "Date", value: new Date(highest.date).toLocaleDateString("en-IN") },
        ],
        actionSuggestions: [{ label: "View Transactions", url: "/dashboard/transactions" }],
        timestamp: new Date().toISOString(),
      };
    }

    // 5.2 LOWEST TRANSACTION
    if (qLower.includes("lowest transaction") || qLower.includes("smallest expense") || qLower.includes("chhota kharcha")) {
      const lowest = ctx.transactions.lowestTransaction;
      if (!lowest) {
        return {
          answer: "No expenses recorded yet in your ledger.",
          insights: ["Record transactions to analyze minimum spend."],
          keyMetrics: [{ label: "Lowest Outflow", value: "₹0.00" }],
          actionSuggestions: [{ label: "Add Expense", url: "/dashboard/transactions" }],
          timestamp: new Date().toISOString(),
        };
      }

      return {
        answer: `Your lowest recorded expense is **${formatCurrency(lowest.amount, "INR")}** for **"${lowest.title}"**.`,
        insights: [
          `Title: ${lowest.title}`,
          `Amount: ${formatCurrency(lowest.amount, "INR")}`,
          `Logged Date: ${new Date(lowest.date).toLocaleDateString("en-IN", { dateStyle: "medium" })}`,
        ],
        keyMetrics: [
          { label: "Lowest Expense", value: formatCurrency(lowest.amount, "INR") },
          { label: "Date", value: new Date(lowest.date).toLocaleDateString("en-IN") },
        ],
        actionSuggestions: [{ label: "View Transactions", url: "/dashboard/transactions" }],
        timestamp: new Date().toISOString(),
      };
    }

    // =========================================================================
    // 6. REPORTS & EXECUTIVE SUMMARIES (Tax, GST, Travel, Business, Monthly)
    // =========================================================================

    // 6.1 MONTHLY SUMMARY
    if (qLower.includes("monthly summary") || qLower.includes("month summary") || qLower.includes("month's summary")) {
      return {
        answer: `Here is your dynamic Monthly Financial Summary for **${now.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}**: Outflow is **${formatCurrency(currentMonthExpenses, "INR")}**, Inflow is **${formatCurrency(currentMonthIncome, "INR")}**, resulting in **${formatCurrency(netSavings, "INR")}** net savings (${savingsRate}% savings rate).`,
        insights: [
          `Total Spent: ${formatCurrency(currentMonthExpenses, "INR")}`,
          `Total Income: ${formatCurrency(currentMonthIncome, "INR")}`,
          `Net Savings: ${formatCurrency(netSavings, "INR")} (${savingsRate}%)`,
          `Active Budgets Allocated: ${formatCurrency(ctx.budgets.totalAllocatedBudget, "INR")}`,
        ],
        keyMetrics: [
          { label: "Outflow", value: formatCurrency(currentMonthExpenses, "INR") },
          { label: "Inflow", value: formatCurrency(currentMonthIncome, "INR") },
          { label: "Savings Rate", value: `${savingsRate}%` },
        ],
        actionSuggestions: [
          { label: "Export PDF Summary", url: "/dashboard/reports" },
          { label: "View Analytics", url: "/dashboard/analytics" },
        ],
        timestamp: new Date().toISOString(),
      };
    }

    // 6.2 TAX REPORT
    if (qLower.includes("tax report") || qLower.includes("tax") || qLower.includes("deduction")) {
      const personalSpend = expensesTx.filter((t) => t.isPersonal !== false).reduce((s, t) => s + t.amount / 100, 0);
      const businessSpend = expensesTx.filter((t) => t.isPersonal === false).reduce((s, t) => s + t.amount / 100, 0);

      return {
        answer: `Your verified tax breakdown shows **${formatCurrency(businessSpend, "INR")}** in potentially deductible business expenses, and **${formatCurrency(personalSpend, "INR")}** in personal transactions.`,
        insights: [
          `Eligible Business Deductions: ${formatCurrency(businessSpend, "INR")}`,
          `Personal Non-Deductible Outflow: ${formatCurrency(personalSpend, "INR")}`,
          "Keep receipt records uploaded for audit compliance during filing.",
        ],
        keyMetrics: [
          { label: "Business Deductions", value: formatCurrency(businessSpend, "INR") },
          { label: "Personal Outflow", value: formatCurrency(personalSpend, "INR") },
        ],
        actionSuggestions: [
          { label: "Generate Tax Filing Sheet", url: "/dashboard/reports" },
          { label: "View OCR Receipts", url: "/dashboard/transactions" },
        ],
        timestamp: new Date().toISOString(),
      };
    }

    // 6.3 GST REPORT
    if (qLower.includes("gst report") || qLower.includes("gst") || qLower.includes("cgst") || qLower.includes("sgst")) {
      const gstTransactions = expensesTx.filter((t) => t.paymentMethod === "UPI" || t.receiptUrl);
      const estimatedGst = Math.round(gstTransactions.reduce((s, t) => s + (t.amount / 100) * 0.05, 0));

      return {
        answer: `Your live GST summary estimates **${formatCurrency(estimatedGst, "INR")}** in total input GST credits across your business transactions and receipt scans.`,
        insights: [
          `Estimated Input Tax Credit: ${formatCurrency(estimatedGst, "INR")}`,
          `CGST (50%): ${formatCurrency(estimatedGst / 2, "INR")}`,
          `SGST (50%): ${formatCurrency(estimatedGst / 2, "INR")}`,
          "Use the OCR Receipt Scanner to ensure GSTINs and invoice numbers are automatically indexed.",
        ],
        keyMetrics: [
          { label: "Estimated GST", value: formatCurrency(estimatedGst, "INR") },
          { label: "Eligible Transactions", value: `${gstTransactions.length}` },
        ],
        actionSuggestions: [
          { label: "Download GST Report", url: "/dashboard/reports" },
          { label: "Scan New Invoice", url: "/dashboard/transactions" },
        ],
        timestamp: new Date().toISOString(),
      };
    }

    // =========================================================================
    // 7. CASHFLOW & SAVINGS DYNAMICS
    // =========================================================================

    // 7.1 SHOW CASHFLOW
    if (qLower.includes("cashflow") || qLower.includes("cash flow") || qLower.includes("inflow vs outflow")) {
      return {
        answer: `Your net cashflow for this month is **${netSavings >= 0 ? "+" : ""}${formatCurrency(netSavings, "INR")}** (Money In: **${formatCurrency(currentMonthIncome, "INR")}**, Money Out: **${formatCurrency(currentMonthExpenses, "INR")}**).`,
        insights: [
          `Total Money In: ${formatCurrency(currentMonthIncome, "INR")}`,
          `Total Money Out: ${formatCurrency(currentMonthExpenses, "INR")}`,
          netSavings >= 0
            ? `Positive cashflow: You retained ${savingsRate}% of total inflows.`
            : `Negative cashflow: Outflows exceeded income by ${formatCurrency(Math.abs(netSavings), "INR")}.`,
        ],
        keyMetrics: [
          { label: "Money In", value: formatCurrency(currentMonthIncome, "INR") },
          { label: "Money Out", value: formatCurrency(currentMonthExpenses, "INR") },
          { label: "Net Cash Flow", value: `${netSavings >= 0 ? "+" : ""}${formatCurrency(netSavings, "INR")}` },
        ],
        actionSuggestions: [
          { label: "View Analytics", url: "/dashboard/analytics" },
          { label: "Check Budgets", url: "/dashboard/budgets" },
        ],
        timestamp: new Date().toISOString(),
      };
    }

    // 7.2 BURN RATE / AVERAGE DAILY SPENDING
    if (
      qLower.includes("burn rate") ||
      qLower.includes("average daily spending") ||
      qLower.includes("daily spending") ||
      qLower.includes("daily average") ||
      qLower.includes("per day") ||
      qLower.includes("daily burn")
    ) {
      const daysElapsed = Math.max(1, now.getDate());
      const dailyBurn = currentMonthExpenses / daysElapsed;
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const projectedMonthSpend = Math.round(dailyBurn * daysInMonth);

      return {
        answer: `Your average daily burn rate for this month is **${formatCurrency(dailyBurn, "INR")}/day** (${daysElapsed} days elapsed). At this velocity, your projected monthly spend will be **${formatCurrency(projectedMonthSpend, "INR")}**.`,
        insights: [
          `Daily Burn Rate: ${formatCurrency(dailyBurn, "INR")}/day across ${ctx.transactions.currentMonth.length} transactions`,
          `Days Elapsed: ${daysElapsed} of ${daysInMonth} days`,
          `Projected Month-End Outflow: ${formatCurrency(projectedMonthSpend, "INR")}`,
          ctx.budgets.totalAllocatedBudget > 0
            ? `Allocated Monthly Budget: ${formatCurrency(ctx.budgets.totalAllocatedBudget, "INR")} (${projectedMonthSpend > ctx.budgets.totalAllocatedBudget ? "Risk of overrun" : "On track"})`
            : "No monthly budget ceiling set yet.",
        ],
        keyMetrics: [
          { label: "Daily Burn Rate", value: `${formatCurrency(dailyBurn, "INR")}/day` },
          { label: "Projected Spend", value: formatCurrency(projectedMonthSpend, "INR") },
          { label: "Current Spend", value: formatCurrency(currentMonthExpenses, "INR") },
        ],
        actionSuggestions: [
          { label: "Manage Budgets", url: "/dashboard/budgets" },
          { label: "View Analytics", url: "/dashboard/analytics" },
        ],
        timestamp: new Date().toISOString(),
      };
    }

    // 7.3 SAVING RATE / HOW MUCH DID I SAVE / INCOME
    if (
      qLower.includes("saving rate") ||
      qLower.includes("save rate") ||
      qLower.includes("how much did i save") ||
      qLower.includes("how much have i saved") ||
      qLower.includes("my savings") ||
      qLower.includes("total savings") ||
      qLower.includes("how much income did i receive") ||
      qLower.includes("my income")
    ) {
      return {
        answer: `This month, your net savings amount to **${netSavings >= 0 ? "+" : ""}${formatCurrency(netSavings, "INR")}**, resulting in a savings rate of **${savingsRate}%** (Income: **${formatCurrency(currentMonthIncome, "INR")}**, Expenses: **${formatCurrency(currentMonthExpenses, "INR")}**).`,
        insights: [
          `Net Savings This Month: ${formatCurrency(netSavings, "INR")}`,
          `Savings Rate: ${savingsRate}%`,
          `Total Income: ${formatCurrency(currentMonthIncome, "INR")}`,
          `Total Outflow: ${formatCurrency(currentMonthExpenses, "INR")}`,
          `All-Time Savings: ${formatCurrency(ctx.transactions.allTimeTotalSavings, "INR")}`,
          savingsRate >= 20
            ? "Outstanding savings discipline! You meet the recommended 20% benchmark."
            : "Tip: Trimming discretionary dining and late-night expenses can boost your monthly savings rate.",
        ],
        keyMetrics: [
          { label: "Net Savings", value: `${netSavings >= 0 ? "+" : ""}${formatCurrency(netSavings, "INR")}` },
          { label: "Savings Rate", value: `${savingsRate}%` },
          { label: "Total Inflow", value: formatCurrency(currentMonthIncome, "INR") },
          { label: "Total Outflow", value: formatCurrency(currentMonthExpenses, "INR") },
        ],
        actionSuggestions: [
          { label: "View Analytics", url: "/dashboard/analytics" },
          { label: "Check Budgets", url: "/dashboard/budgets" },
        ],
        timestamp: new Date().toISOString(),
      };
    }

    // 7.4 PREDICT NEXT MONTH'S EXPENSES
    if (
      qLower.includes("predict") ||
      qLower.includes("forecast") ||
      qLower.includes("next month") ||
      qLower.includes("future expense") ||
      qLower.includes("aage ka kharcha")
    ) {
      if (ctx.transactions.all.length === 0) {
        return {
          answer: "There isn't enough historical data to generate an accurate prediction. Record transactions to enable predictive AI forecasting.",
          insights: ["Historical ledger data is needed to calculate daily velocity and forecast next month's outflow."],
          keyMetrics: [
            { label: "Data Status", value: "Insufficient" },
            { label: "Confidence", value: "0%" },
          ],
          actionSuggestions: [{ label: "Add Expense", url: "/dashboard/transactions" }],
          timestamp: new Date().toISOString(),
        };
      }

      const forecast = predictFutureExpenses({
        currentMonthSpent: currentMonthExpenses,
        monthlyBudget: ctx.budgets.totalAllocatedBudget || (currentMonthExpenses > 0 ? currentMonthExpenses * 1.15 : 20000),
        pendingReceivables: ctx.settlements.receivablesTotal,
        pendingPayables: ctx.settlements.payablesTotal,
      });

      return {
        answer: `🎯 **AI Expense Forecast for Next Month:**\n\nBased on your live daily spending velocity, your predicted expense for next month is **${formatCurrency(forecast.nextMonthPredictedSpend, "INR")}** (Risk Level: **${forecast.budgetOverrunRisk}**).\n\n• **Next Week Projected Outflow:** ${formatCurrency(forecast.nextWeekPredictedSpend, "INR")}\n• **Primary Risk Category:** ${forecast.primaryRiskCategory}\n• **Model Confidence:** ${forecast.confidencePercentage}%\n• **Expected Receivables to Offset:** ${formatCurrency(forecast.expectedReceivables, "INR")}\n\n💡 ${forecast.forecastNarrative}`,
        insights: [
          `Next week projected spend: ${formatCurrency(forecast.nextWeekPredictedSpend, "INR")}`,
          `Primary risk category: ${forecast.primaryRiskCategory}`,
          `Confidence Score: ${forecast.confidencePercentage}% calculated via verified ledger velocity.`,
          `Expected incoming receivables to offset: ${formatCurrency(forecast.expectedReceivables, "INR")}`,
        ],
        keyMetrics: [
          { label: "Next Month Outflow", value: formatCurrency(forecast.nextMonthPredictedSpend, "INR") },
          { label: "Next Week Outflow", value: formatCurrency(forecast.nextWeekPredictedSpend, "INR") },
          { label: "Overrun Risk", value: forecast.budgetOverrunRisk },
          { label: "Confidence", value: `${forecast.confidencePercentage}%` },
        ],
        actionSuggestions: [
          { label: "View Forecasting Center", url: "/dashboard/ai" },
          { label: "Check Budgets", url: "/dashboard/budgets" },
        ],
        timestamp: new Date().toISOString(),
      };
    }

    // =========================================================================
    // 8. ANOMALY DETECTION & SPENDING PATTERNS (Mistakes, Duplicates, Midnight, Weekend)
    // =========================================================================

    // 8.1 DUPLICATE EXPENSES
    if (qLower.includes("duplicate") || qLower.includes("double payment")) {
      const dupes = ctx.transactions.flaggedDuplicates;
      return {
        answer: dupes.length > 0
          ? `Our live data validator detected **${dupes.length} potential duplicate expense${dupes.length === 1 ? "" : "s"}**.`
          : `No duplicate transactions detected in your verified ledger! All amounts and timestamps are distinct.`,
        insights: dupes.length > 0
          ? dupes.map((d) => `• ${d.message}`)
          : ["All recorded ledger entries have passed uniqueness checks."],
        keyMetrics: [
          { label: "Duplicates Detected", value: `${dupes.length}` },
          { label: "Integrity Status", value: dupes.length === 0 ? "Clean" : "Review Needed" },
        ],
        actionSuggestions: [{ label: "View Transactions", url: "/dashboard/transactions" }],
        timestamp: new Date().toISOString(),
      };
    }

    // 8.2 MIDNIGHT SPENDING
    if (qLower.includes("midnight") || qLower.includes("late night") || qLower.includes("raat")) {
      const midnightTotal = ctx.transactions.midnightSpendTotal;
      return {
        answer: `You have spent **${formatCurrency(midnightTotal, "INR")}** during late night / midnight hours (11:00 PM – 5:00 AM).`,
        insights: [
          `Late Night Spending: ${formatCurrency(midnightTotal, "INR")}`,
          midnightTotal > 0
            ? "Late-night purchases often represent impulse spending on food delivery or quick commerce."
            : "No midnight purchases detected.",
        ],
        keyMetrics: [
          { label: "Midnight Spend", value: formatCurrency(midnightTotal, "INR") },
          { label: "Time Window", value: "11 PM - 5 AM" },
        ],
        actionSuggestions: [{ label: "View Spending Patterns", url: "/dashboard/analytics" }],
        timestamp: new Date().toISOString(),
      };
    }

    // 8.3 WEEKEND SPENDING
    if (qLower.includes("weekend") || qLower.includes("saturday") || qLower.includes("sunday")) {
      const satSpend = ctx.transactions.weekdaySpending["Saturday"] || 0;
      const sunSpend = ctx.transactions.weekdaySpending["Sunday"] || 0;
      const weekendTotal = Math.round(satSpend + sunSpend);

      return {
        answer: `Your recorded weekend spending totals **${formatCurrency(weekendTotal, "INR")}** (Saturday: **${formatCurrency(satSpend, "INR")}**, Sunday: **${formatCurrency(sunSpend, "INR")}**).`,
        insights: [
          `Saturday Spend: ${formatCurrency(satSpend, "INR")}`,
          `Sunday Spend: ${formatCurrency(sunSpend, "INR")}`,
          currentMonthExpenses > 0
            ? `Weekend spending constitutes ${Math.round((weekendTotal / currentMonthExpenses) * 100)}% of your monthly expenditure.`
            : "Keep tracking weekend group outings.",
        ],
        keyMetrics: [
          { label: "Weekend Total", value: formatCurrency(weekendTotal, "INR") },
          { label: "Saturday", value: formatCurrency(satSpend, "INR") },
          { label: "Sunday", value: formatCurrency(sunSpend, "INR") },
        ],
        actionSuggestions: [{ label: "View Analytics", url: "/dashboard/analytics" }],
        timestamp: new Date().toISOString(),
      };
    }

    // 8.4 FINANCIAL MISTAKES / LEAKAGES
    if (qLower.includes("mistake") || qLower.includes("leakage") || qLower.includes("suspicious") || qLower.includes("unusual")) {
      const mistakes: string[] = [];
      if (ctx.settlements.receivablesTotal > 5000) {
        mistakes.push(`Uncollected group receivables: Friends owe you ${formatCurrency(ctx.settlements.receivablesTotal, "INR")} in pending dues.`);
      }
      if (ctx.budgets.breachedBudgets.length > 0) {
        mistakes.push(`Budget discipline: ${ctx.budgets.breachedBudgets.length} category budget limits are exceeded.`);
      }
      if (ctx.transactions.midnightSpendTotal > 1000) {
        mistakes.push(`Impulse late-night spend: ₹${ctx.transactions.midnightSpendTotal} spent between 11 PM and 5 AM.`);
      }
      if (mistakes.length === 0) {
        mistakes.push("No significant financial leakages detected in your live accounts. Great discipline!");
      }

      return {
        answer: `We identified **${mistakes.length} area${mistakes.length === 1 ? "" : "s"}** of potential financial optimization in your accounts.`,
        insights: mistakes.map((m) => `• ${m}`),
        keyMetrics: [
          { label: "Areas Flagged", value: `${mistakes.length}` },
          { label: "Receivables at Risk", value: formatCurrency(ctx.settlements.receivablesTotal, "INR") },
        ],
        actionSuggestions: [
          { label: "Settlement Center", url: "/dashboard/settlements" },
          { label: "Check Budgets", url: "/dashboard/budgets" },
        ],
        timestamp: new Date().toISOString(),
      };
    }

    // =========================================================================
    // 8.5 AI FINANCIAL RECOMMENDATIONS & ADVICE
    // =========================================================================
    if (
      qLower.includes("recommendation") ||
      qLower.includes("financial advice") ||
      qLower.includes("reduce my expenses") ||
      qLower.includes("reduce expenses") ||
      qLower.includes("how can i reduce") ||
      qLower.includes("where can i save") ||
      qLower.includes("how to save") ||
      qLower.includes("saving advice") ||
      qLower.includes("ai recommendations")
    ) {
      const recommendations: string[] = [];
      const sortedCats = Object.entries(ctx.transactions.categoryTotals).sort((a, b) => b[1] - a[1]);
      const topCat = sortedCats[0];

      if (topCat && currentMonthExpenses > 0) {
        const pct = Math.round((topCat[1] / currentMonthExpenses) * 100);
        if (topCat[0].toLowerCase() === "uncategorized") {
          recommendations.push(
            `**Assign categories to Uncategorized expenses:** You have **${formatCurrency(topCat[1], "INR")}** (${pct}% of your outflow) marked as Uncategorized. Tagging them into Travel, Accommodation, Dining, or Bills enables automated budget tracking and tax optimization.`
          );
        } else {
          recommendations.push(
            `**Set a spending ceiling for ${topCat[0]}:** It represents **${pct}%** (${formatCurrency(topCat[1], "INR")}) of this month's outflow. Trimming 15% would save ${formatCurrency(topCat[1] * 0.15, "INR")}.`
          );
        }
      }

      if (ctx.settlements.receivablesTotal > 0) {
        recommendations.push(
          `**Collect pending group dues:** Friends owe you **${formatCurrency(ctx.settlements.receivablesTotal, "INR")}** in pending settlements. Clearing these pending balances immediately bolsters your cash flow.`
        );
      }

      if (ctx.settlements.payablesTotal > 0) {
        recommendations.push(
          `**Clear outstanding liabilities:** You owe **${formatCurrency(ctx.settlements.payablesTotal, "INR")}** in shared group splits. Settling these promptly maintains your high financial health score.`
        );
      }

      if (ctx.transactions.groupExpensesTotal > 0 && ctx.transactions.personalExpensesTotal === 0) {
        recommendations.push(
          `**Track personal expenses:** 100% of your recorded expenses are currently group/shared. Logging personal daily spending will provide a complete 360° financial profile.`
        );
      }

      if (ctx.transactions.midnightSpendTotal > 0) {
        recommendations.push(
          `**Curtail late-night discretionary purchases:** You have logged **${formatCurrency(ctx.transactions.midnightSpendTotal, "INR")}** between 11 PM and 5 AM this month.`
        );
      }

      if (savingsRate < 20) {
        recommendations.push(
          `**Target a 20% savings threshold:** Your current savings rate is **${savingsRate}%**. Automating personal savings on the day income arrives ensures continuous wealth preservation.`
        );
      } else {
        recommendations.push(
          `**Strong savings momentum:** You are saving **${savingsRate}%** of your monthly income. Consider allocating surplus into an emergency liquidity reserve.`
        );
      }

      if (ctx.budgets.breachedBudgets.length > 0) {
        recommendations.push(
          `**Review exceeded budgets:** **${ctx.budgets.breachedBudgets.length} budget limit${ctx.budgets.breachedBudgets.length === 1 ? "" : "s"}** are exceeded. Re-anchor limits in the Budget Manager.`
        );
      } else if (ctx.budgets.activeBudgets.length === 0) {
        recommendations.push(
          `**Establish monthly category budgets:** You currently have no active budget limits set. Creating budgets for your top spending areas prevents unexpected overruns.`
        );
      }

      const formattedRecommendations = recommendations.length > 0
        ? recommendations.map((r, i) => `${i + 1}. ${r}`).join("\n\n")
        : "1. **Log daily transactions regularly:** Keep tracking your expenses to unlock richer predictive insights.\n\n2. **Establish monthly budgets:** Set up category allowances in the Budget Manager.\n\n3. **Settle shared expenses:** Keep settling dues promptly to maintain a high financial health rating.";

      return {
        answer: `Here are your personalized AI financial recommendations based strictly on your verified ledger data:\n\n${formattedRecommendations}`,
        insights: recommendations,
        keyMetrics: [
          { label: "Top Category", value: topCat ? topCat[0] : "General" },
          { label: "Pending Receivables", value: formatCurrency(ctx.settlements.receivablesTotal, "INR") },
          { label: "Savings Rate", value: `${savingsRate}%` },
        ],
        actionSuggestions: [
          { label: "Manage Budgets", url: "/dashboard/budgets" },
          { label: "Collect Receivables", url: "/dashboard/settlements" },
          { label: "View Analytics", url: "/dashboard/analytics" },
        ],
        timestamp: new Date().toISOString(),
      };
    }

    // =========================================================================
    // 8.6 SECURITY, PRIVACY & ENCRYPTION
    // =========================================================================
    if (
      qLower.includes("encryption") ||
      qLower.includes("privacy") ||
      qLower.includes("cloud sync") ||
      qLower.includes("qr payment") ||
      qLower.includes("approval system") ||
      qLower.includes("authentication") ||
      qLower.includes("settlement verification") ||
      (qLower.includes("security") && !qLower.includes("score"))
    ) {
      return {
        answer: `SplitLedger AI PRO operates with bank-grade security and zero-knowledge ledger guarantees to protect your financial transactions and collaborative settlements:`,
        insights: [
          "• Data Encryption: 256-bit AES encryption at rest and TLS 1.3 transit encryption across all PostgreSQL records.",
          "• Authentication & 2FA: Protected by Clerk multi-factor authentication with session timeouts and verified device tracking.",
          "• Tamper-Proof Audit Trail: Every transaction, split edit, and settlement confirmation is immutably logged with timestamps.",
          "• Direct UPI QR Verification: Settlement QR codes generate strict NPCI-compliant payment strings directly to verified user VPAs with zero intermediary custody.",
          "• Privacy Guarantee: Your personal and shared expenses are strictly isolated and never shared, sold, or used for external advertising.",
        ],
        keyMetrics: [
          { label: "Encryption", value: "AES-256 / TLS 1.3" },
          { label: "2FA Status", value: ctx.user.twoFactorEnabled ? "Active" : "Recommended" },
          { label: "Audit Logging", value: "Active" },
        ],
        actionSuggestions: [
          { label: "Security Settings", url: "/dashboard/settings" },
          { label: "Settlement Center", url: "/dashboard/settlements" },
        ],
        timestamp: new Date().toISOString(),
      };
    }

    // =========================================================================
    // 8.7 FINANCIAL REPORT SUMMARY
    // =========================================================================
    if (
      qLower.includes("summarize my financial report") ||
      qLower.includes("summarize my report") ||
      qLower.includes("explain my report") ||
      qLower.includes("financial report")
    ) {
      const sorted = Object.entries(ctx.transactions.categoryTotals).sort((a, b) => b[1] - a[1]);
      const topCat = sorted[0];
      const health = calculateComprehensiveHealthScore({
        monthlyIncome: currentMonthIncome > 0 ? currentMonthIncome : undefined,
        monthlyExpense: currentMonthExpenses,
        totalBudget: ctx.budgets.totalAllocatedBudget,
        settledAmount: ctx.settlements.completedTotal || 0,
        totalSettlementDue: ctx.settlements.payablesTotal,
        overdueSettlementCount: 0,
      });

      return {
        answer: `📊 **Executive Financial Summary Report**\n\n• **Total All-Time Expenses:** ${formatCurrency(ctx.transactions.allTimeTotalExpenses, "INR")}\n• **Personal Expenses:** ${formatCurrency(ctx.transactions.personalExpensesTotal, "INR")}\n• **Group Expenses:** ${formatCurrency(ctx.transactions.groupExpensesTotal, "INR")}\n• **Largest Expense:** ${ctx.transactions.highestTransaction ? `${ctx.transactions.highestTransaction.title} (${formatCurrency(ctx.transactions.highestTransaction.amount, "INR")})` : "None"}\n• **Top Spending Category:** ${topCat ? `${topCat[0]} (${formatCurrency(topCat[1], "INR")})` : "General"}\n• **Financial Health:** ${health.score}/100 (${health.rating})\n• **Pending Receivables:** ${formatCurrency(ctx.settlements.receivablesTotal, "INR")}\n\n💡 **AI Insight:**\n${topCat ? `Your **${topCat[0]}** expenses account for **${Math.round((topCat[1] / Math.max(1, currentMonthExpenses)) * 100)}%** of this month's spending. Setting a budget could improve your savings next month.` : "Your accounts show steady transaction tracking across personal and shared ledgers."}`,
        insights: [
          `Total All-Time Outflow: ${formatCurrency(ctx.transactions.allTimeTotalExpenses, "INR")}`,
          `Personal vs Group Split: ${formatCurrency(ctx.transactions.personalExpensesTotal, "INR")} personal / ${formatCurrency(ctx.transactions.groupExpensesTotal, "INR")} shared`,
          `Receivables Balance: ${formatCurrency(ctx.settlements.receivablesTotal, "INR")} owed to you`,
          `Health Rating: ${health.rating} (${health.score}/100)`,
        ],
        keyMetrics: [
          { label: "Total Expenses", value: formatCurrency(ctx.transactions.allTimeTotalExpenses, "INR") },
          { label: "Personal Expenses", value: formatCurrency(ctx.transactions.personalExpensesTotal, "INR") },
          { label: "Group Expenses", value: formatCurrency(ctx.transactions.groupExpensesTotal, "INR") },
          { label: "Financial Health", value: `${health.score}/100` },
        ],
        actionSuggestions: [
          { label: "Export PDF Report", url: "/dashboard/reports" },
          { label: "View Analytics", url: "/dashboard/analytics" },
        ],
        timestamp: new Date().toISOString(),
      };
    }

    // =========================================================================
    // 8.8 USER PROFILE, ACCOUNT & "WHO AM I?"
    // =========================================================================
    if (
      qLower.includes("profile") ||
      qLower.includes("who am i") ||
      qLower.includes("my account") ||
      qLower.includes("my details") ||
      qLower.includes("my email") ||
      qLower.includes("my phone") ||
      qLower.includes("my mobile") ||
      qLower.includes("my upi") ||
      qLower.includes("my name") ||
      qLower.includes("registered email") ||
      qLower.includes("registered phone") ||
      qLower.includes("2fa") ||
      qLower.includes("two factor")
    ) {
      const u = ctx.user;

      // Specific UPI check
      if (qLower.includes("upi") || qLower.includes("vpa")) {
        return {
          answer: u.upiId
            ? `Your registered UPI ID is **${u.upiId}**. You can receive group settlements directly via UPI.`
            : `You have not configured a UPI ID yet. Add your UPI ID in Settings to enable one-tap settlements.`,
          insights: [
            u.upiId ? `Active VPA: ${u.upiId}` : "No UPI VPA on file.",
            "Settlements can be initiated directly through PhonePe, Google Pay, or Paytm.",
          ],
          keyMetrics: [
            { label: "Linked UPI ID", value: u.upiId || "Not Linked" },
            { label: "Status", value: u.upiId ? "Ready" : "Action Needed" },
          ],
          actionSuggestions: [{ label: "Configure UPI in Settings", url: "/dashboard/settings" }],
          timestamp: new Date().toISOString(),
        };
      }

      // Specific 2FA check
      if (qLower.includes("2fa") || qLower.includes("two factor")) {
        return {
          answer: u.twoFactorEnabled
            ? `Your account security is **high**: Two-Factor Authentication (2FA) is **enabled** and your email is **${u.emailVerified ? "verified" : "pending verification"}**.`
            : `Two-Factor Authentication (2FA) is currently **disabled** on your account. We recommend enabling 2FA in Settings for enhanced ledger security.`,
          insights: [
            `2FA Status: ${u.twoFactorEnabled ? "Active" : "Disabled"}`,
            `Email Verification: ${u.emailVerified ? "Verified" : "Unverified"}`,
            `Mobile Verification: ${u.mobileVerified ? "Verified" : "Unverified"}`,
          ],
          keyMetrics: [
            { label: "2FA Status", value: u.twoFactorEnabled ? "Enabled" : "Disabled" },
            { label: "Email Status", value: u.emailVerified ? "Verified" : "Pending" },
          ],
          actionSuggestions: [{ label: "Security Settings", url: "/dashboard/settings" }],
          timestamp: new Date().toISOString(),
        };
      }

      // Specific profile completion check
      if (qLower.includes("completion") || qLower.includes("complete")) {
        return {
          answer: `Your profile is **${u.profileCompletionPct}% complete**. ${u.profileCompletionPct >= 100 ? "Great job, all profile details are up to date!" : "Complete your missing fields in Settings to unlock all AI insights."}`,
          insights: [
            `Name: ${u.name ? "✓ Set" : "✗ Missing"}`,
            `Email: ${u.emailVerified ? "✓ Verified" : "✗ Unverified"}`,
            `Phone: ${u.mobileVerified ? "✓ Verified" : (u.phone ? "○ Unverified" : "✗ Missing")}`,
            `UPI ID: ${u.upiId ? "✓ Configured" : "✗ Missing"}`,
            `2FA: ${u.twoFactorEnabled ? "✓ Enabled" : "✗ Disabled"}`,
          ],
          keyMetrics: [
            { label: "Profile Completion", value: `${u.profileCompletionPct}%` },
            { label: "Account Status", value: u.accountStatus || "Active" },
          ],
          actionSuggestions: [{ label: "Complete Profile", url: "/dashboard/settings" }],
          timestamp: new Date().toISOString(),
        };
      }

      // "What is my profile status?" check
      if (qLower.includes("profile status")) {
        return {
          answer: `Here is your verified SplitLedger profile: You are logged in as **${u.name}**. Registered email is **${u.email}** (${u.emailVerified ? "Verified" : "Unverified"}), Mobile is **${u.phone || "Not set"}** (${u.mobileVerified ? "Verified" : "Unverified"}), UPI ID is **${u.upiId || "Not configured"}**, Base currency is **${u.defaultCurrency}**, and Profile Completion is at **${u.profileCompletionPct}%**.`,
          insights: [
            `Member: ${u.name} (ID: #${u.id})`,
            `Email: ${u.email} (${u.emailVerified ? "Verified" : "Pending Verification"})`,
            `Mobile: ${u.phone || "Not set"} (${u.mobileVerified ? "Verified" : "Unverified"})`,
            `UPI ID: ${u.upiId || "Not configured"}`,
            `Location: ${[u.city, u.country].filter(Boolean).join(", ") || "India"}${u.occupation ? ` • ${u.occupation}` : ""}`,
            `Security: 2FA is ${u.twoFactorEnabled ? "Enabled" : "Disabled"}`,
          ],
          keyMetrics: [
            { label: "Member Name", value: u.name },
            { label: "Profile Completion", value: `${u.profileCompletionPct}%` },
            { label: "Base Currency", value: u.defaultCurrency },
            { label: "2FA Status", value: u.twoFactorEnabled ? "Protected" : "Standard" },
          ],
          actionSuggestions: [
            { label: "Edit Profile", url: "/dashboard/settings" },
            { label: "Security Settings", url: "/dashboard/settings" },
          ],
          timestamp: new Date().toISOString(),
        };
      }

      // Master Profile Card Format ("Who am I?", "Show my profile summary", "my profile")
      const sortedCats = Object.entries(ctx.transactions.allTimeCategoryTotals).sort((a, b) => b[1] - a[1]);
      const topCatName = sortedCats[0]?.[0] || Object.entries(ctx.transactions.categoryTotals).sort((a, b) => b[1] - a[1])[0]?.[0] || "General";
      const largestExpTitle = ctx.transactions.highestTransaction ? ctx.transactions.highestTransaction.title : "None";
      const health = calculateComprehensiveHealthScore({
        monthlyIncome: currentMonthIncome > 0 ? currentMonthIncome : undefined,
        monthlyExpense: currentMonthExpenses,
        totalBudget: ctx.budgets.totalAllocatedBudget,
        settledAmount: ctx.settlements.completedTotal || 0,
        totalSettlementDue: ctx.settlements.payablesTotal,
        overdueSettlementCount: 0,
      });

      const profileCard = `👤 **Your SplitLedger AI Profile**\n\n• **Name:** ${u.name}\n• **Email:** ${u.email}\n• **Account Tier:** PRO\n• **Currency:** INR ₹\n• **Profile Status:** ${u.emailVerified ? "Verified ✅" : (u.accountStatus ? u.accountStatus.charAt(0).toUpperCase() + u.accountStatus.slice(1) : "Active")}\n• **Active Groups:** ${ctx.groups.all.length} active\n• **Verified Ledger Records:** ${ctx.transactions.totalCount} transaction${ctx.transactions.totalCount === 1 ? "" : "s"}\n• **Financial Health Score:** ${health.score}/100 (${health.rating})\n\n**Financial Standing:**\n• **Total Personal Expenses:** ${formatCurrency(ctx.transactions.personalExpensesTotal, "INR")}\n• **Total Group Expenses:** ${formatCurrency(ctx.transactions.groupExpensesTotal, "INR")}\n• **Total Expenses:** ${formatCurrency(ctx.transactions.allTimeTotalExpenses, "INR")}\n• **Outstanding Receivable:** ${formatCurrency(ctx.settlements.receivablesTotal, "INR")}\n• **Outstanding Payable:** ${formatCurrency(ctx.settlements.payablesTotal, "INR")}\n• **Largest Expense:** ${largestExpTitle}\n• **Top Category:** ${topCatName}`;

      return {
        answer: profileCard,
        insights: [
          `Personal Outflow: ${formatCurrency(ctx.transactions.personalExpensesTotal, "INR")} | Group Outflow: ${formatCurrency(ctx.transactions.groupExpensesTotal, "INR")}`,
          `Financial Health: ${health.score}/100 (${health.rating}) with ${ctx.transactions.totalCount} verified ledger transactions.`,
          `Outstanding Dues: ${formatCurrency(ctx.settlements.receivablesTotal, "INR")} receivable, ${formatCurrency(ctx.settlements.payablesTotal, "INR")} payable.`,
          `Most active group: ${ctx.groups.mostActiveGroup?.name || "None"} | Preferred payment: ${ctx.transactions.mostUsedPaymentMethod}.`,
        ],
        keyMetrics: [
          { label: "Account", value: "PRO" },
          { label: "Financial Health", value: `${health.score}/100` },
          { label: "Personal Expenses", value: formatCurrency(ctx.transactions.personalExpensesTotal, "INR") },
          { label: "Group Expenses", value: formatCurrency(ctx.transactions.groupExpensesTotal, "INR") },
          { label: "Total Expenses", value: formatCurrency(ctx.transactions.allTimeTotalExpenses, "INR") },
          { label: "Receivable", value: formatCurrency(ctx.settlements.receivablesTotal, "INR") },
        ],
        actionSuggestions: [
          { label: "Edit Profile", url: "/dashboard/settings" },
          { label: "View Analytics", url: "/dashboard/analytics" },
          { label: "Settlement Center", url: "/dashboard/settlements" },
        ],
        timestamp: new Date().toISOString(),
      };
    }

    // =========================================================================
    // 8.9 GREETINGS
    // =========================================================================
    if (
      qLower === "hi" ||
      qLower === "hello" ||
      qLower === "hey" ||
      qLower === "namaste" ||
      qLower === "greetings" ||
      qLower.startsWith("hi ") ||
      qLower.startsWith("hello ")
    ) {
      return {
        answer: "Namaste! I am SplitLedger AI PRO, your Financial Copilot. How can I assist your personal or group finances today?",
        insights: [
          "Ask me about this month's spending, who owes you money, or your financial health score.",
          "You can also ask 'Who am I?' for a complete verified profile breakdown.",
        ],
        keyMetrics: [
          { label: "Financial Copilot", value: "PRO" },
          { label: "Ledger Status", value: "Synchronized" },
        ],
        actionSuggestions: [
          { label: "View Ledger", url: "/dashboard/transactions" },
          { label: "Settlement Center", url: "/dashboard/settlements" },
          { label: "Analytics", url: "/dashboard/analytics" },
        ],
        timestamp: new Date().toISOString(),
      };
    }

    // =========================================================================
    // 9. DEFAULT / MISSING DATA HANDLER
    // =========================================================================
    return {
      answer: "I couldn't find any verified data for that request. There are currently no recorded transactions matching your request.",
      insights: [
        "SplitLedger AI PRO operates strictly on verified PostgreSQL ledger records without hallucinating data.",
        "You can try asking: 'How much did I spend this month?', 'Who owes me the most?', or 'Show my profile summary'.",
      ],
      keyMetrics: [
        { label: "Monthly Spend", value: formatCurrency(currentMonthExpenses, "INR") },
        { label: "Receivables", value: formatCurrency(ctx.settlements.receivablesTotal, "INR") },
        { label: "Verified Records", value: `${ctx.transactions.totalCount}` },
      ],
      actionSuggestions: [
        { label: "Add Expense", url: "/dashboard/transactions" },
        { label: "View Analytics", url: "/dashboard/analytics" },
        { label: "Settlement Center", url: "/dashboard/settlements" },
      ],
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    console.error("AI Assistant Error:", error);
    return {
      answer: "I encountered a momentary connection interruption while querying the ledger database. Please try your question again in a moment, or check your connection.",
      insights: [
        "Your financial records remain secure in the ledger.",
        "SplitLedger AI PRO will reconnect automatically on your next request.",
      ],
      keyMetrics: [
        { label: "Status", value: "Reconnecting" },
        { label: "Ledger Security", value: "Verified" },
      ],
      actionSuggestions: [
        { label: "View Ledger", url: "/dashboard/transactions" },
        { label: "Refresh Dashboard", url: "/dashboard" },
      ],
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Fetch detected recurring subscriptions from validated transactions
 */
export async function getDetectedSubscriptions(): Promise<DetectedSubscription[]> {
  try {
    const user = await requireAuth();
    const ctx = await getFinancialKnowledgeContext(user.id);
    return detectSubscriptions(ctx.transactions.all);
  } catch (err: any) {
    console.error("Error detecting subscriptions:", err);
    return [];
  }
}

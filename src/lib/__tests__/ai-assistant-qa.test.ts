import { describe, it, expect, vi } from "vitest";

// Mock requireAuth
vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn().mockResolvedValue({
    id: 42,
    clerkUserId: "user_test_42",
    email: "test.user@splitledger.app",
    name: "Dipak Pawar",
    defaultCurrency: "INR",
  }),
}));

// Mock knowledge context
vi.mock("@/lib/ai/knowledge-context", () => ({
  getFinancialKnowledgeContext: vi.fn().mockResolvedValue({
    user: {
      id: 42,
      name: "Dipak Pawar",
      email: "dipak@splitledger.app",
      avatar: null,
      defaultCurrency: "INR",
      profileCompletionPct: 88,
      emailVerified: true,
      mobileVerified: true,
      twoFactorEnabled: true,
      phone: "+91 9876543210",
      upiId: "dipak@okaxis",
      username: "dipakpawar",
      occupation: "Software Engineer",
      city: "Mumbai",
      country: "India",
      accountStatus: "active",
    },
    transactions: {
      all: [
        { id: 1, title: "Swiggy Dinner", amount: 150000, type: "paid", date: new Date(), categoryName: "Food & Dining" },
        { id: 2, title: "Uber Ride", amount: 50000, type: "paid", date: new Date(), categoryName: "Transportation" },
        { id: 3, title: "Supermarket Groceries", amount: 600000, type: "paid", date: new Date(), categoryName: "Groceries" },
      ],
      currentMonth: [
        { id: 1, title: "Swiggy Dinner", amount: 150000, type: "paid", date: new Date(), categoryName: "Food & Dining" },
        { id: 2, title: "Uber Ride", amount: 50000, type: "paid", date: new Date(), categoryName: "Transportation" },
        { id: 3, title: "Supermarket Groceries", amount: 600000, type: "paid", date: new Date(), categoryName: "Groceries" },
      ],
      lastMonth: [],
      totalCount: 3,
      totalSpentThisMonth: 8000,
      totalIncomeThisMonth: 0,
      netSavingsThisMonth: -8000,
      savingsRatePct: 0,
      personalExpensesTotal: 2000,
      groupExpensesTotal: 6000,
      allTimeTotalExpenses: 8000,
      allTimeTotalIncome: 0,
      allTimeTotalSavings: -8000,
      categoryTotals: {
        "Groceries": 6000,
        "Food & Dining": 1500,
        "Transportation": 500,
      },
      allTimeCategoryTotals: {
        "Groceries": 6000,
        "Food & Dining": 1500,
        "Transportation": 500,
      },
      mostUsedPaymentMethod: "UPI",
      hourlyDistribution: {},
      weekdaySpending: {},
      midnightSpendTotal: 0,
      highestTransaction: { title: "Supermarket Groceries", amount: 6000, date: new Date() },
      lowestTransaction: { title: "Uber Ride", amount: 500, date: new Date() },
      flaggedDuplicates: [],
    },
    settlements: {
      receivablesTotal: 1667,
      payablesTotal: 0,
      completedTotal: 5000,
      recoveredFromFriends: 5000,
      paidToFriends: 0,
      netDues: 1667,
      pendingSettlements: [
        {
          id: 1,
          fromUserId: 10,
          fromUserName: "Aarav Sharma",
          toUserId: 42,
          amount: 166666,
          status: "pending",
          groupName: "Summer Trip",
          groupId: 1,
        },
      ],
      completedSettlements: [
        {
          id: 2,
          fromUserId: 11,
          fromUserName: "Rohan Verma",
          toUserId: 42,
          amount: 500000,
          status: "completed",
          groupName: "Summer Trip",
          groupId: 1,
        },
      ],
      debtorRanking: [
        { name: "Aarav Sharma", amount: 1666.66, groupName: "Summer Trip" },
      ],
      creditorRanking: [],
    },
    budgets: {
      activeBudgets: [{ id: 1, name: "Monthly Allowance", amount: 1500000 }],
      totalAllocatedBudget: 15000,
      totalBudgetSpent: 8000,
      overallUtilizationPct: 53,
      breachedBudgets: [],
    },
    groups: {
      all: [{ id: 1, name: "Summer Trip", type: "trip" }],
      groupSpending: { "Summer Trip": 8000 },
      mostActiveGroup: { name: "Summer Trip", amount: 8000 },
    },
    trips: {
      activeTripsCount: 1,
      totalTripBudget: 20000,
      totalTripSpent: 8000,
      exceededTrips: [],
    },
    notes: { recentNotes: [] },
    recentVoiceCommands: [],
    recentOcrReceipts: [],
    gatheredAt: new Date().toISOString(),
  }),
}));

import { askFinancialAssistant } from "@/actions/ai-assistant";

describe("AI Financial Assistant Verified Q&A System", () => {
  it("answers 'How much did I spend this month?' accurately without falling back to generic default", async () => {
    const res = await askFinancialAssistant("How much did I spend this month?");
    expect(res.answer).toContain("₹8,000.00");
    expect(res.answer).toContain("Groceries");
    expect(res.keyMetrics.some((m) => m.label === "Spent This Month" && m.value === "₹8,000.00")).toBe(true);
    expect(res.insights.length).toBeGreaterThan(0);
  });

  it("answers 'Who owes me the most?' resolving the actual debtor person instead of the group name", async () => {
    const res = await askFinancialAssistant("Who owes me the most?");
    // Must identify "Aarav Sharma", not just "Summer Trip"
    expect(res.answer).toContain("Aarav Sharma");
    expect(res.answer).toContain("Summer Trip");
    expect(res.keyMetrics.some((m) => m.label === "Top Debtor" && m.value === "Aarav Sharma")).toBe(true);
    expect(res.keyMetrics.some((m) => m.label === "Group" && m.value === "Summer Trip")).toBe(true);
  });

  it("answers 'What is my financial health score?' computing actual 7-factor health score", async () => {
    const res = await askFinancialAssistant("What is my financial health score?");
    expect(res.answer).toContain("Financial Health Score");
    expect(res.answer).toContain("/100");
    expect(res.keyMetrics.some((m) => m.label === "Health Score")).toBe(true);
    expect(res.keyMetrics.some((m) => m.label === "Rating")).toBe(true);
    // Should NOT say "Here is your current live account status"
    expect(res.answer).not.toContain("Here is your current live account status");
  });

  it("answers 'Predict next month's expenses.' using predictive run rate forecasting", async () => {
    const res = await askFinancialAssistant("Predict next month's expenses.");
    expect(res.answer).toContain("predicted expense for next month");
    expect(res.keyMetrics.some((m) => m.label === "Next Month Outflow")).toBe(true);
    expect(res.keyMetrics.some((m) => m.label === "Confidence")).toBe(true);
  });

  it("answers profile inquiries with live account details and completion status", async () => {
    const res = await askFinancialAssistant("What is my profile status?");
    expect(res.answer).toContain("Dipak Pawar");
    expect(res.answer).toContain("dipak@splitledger.app");
    expect(res.answer).toContain("88%");
    expect(res.keyMetrics.some((m) => m.label === "Profile Completion" && m.value === "88%")).toBe(true);
  });

  it("answers category breakdown inquiries with top categories and percentages", async () => {
    const res = await askFinancialAssistant("Where is my money going?");
    expect(res.answer).toContain("Groceries");
    expect(res.keyMetrics.some((m) => m.label === "Top Category" && m.value === "Groceries")).toBe(true);
  });

  it("answers 'Who am I?' with the Master Profile Card format", async () => {
    const res = await askFinancialAssistant("Who am I?");
    expect(res.answer).toContain("Your SplitLedger AI Profile");
    expect(res.answer).toContain("Dipak Pawar");
    expect(res.answer).toContain("PRO");
    expect(res.answer).toContain("INR ₹");
    expect(res.answer).toContain("Total Personal Expenses");
    expect(res.answer).toContain("Total Group Expenses");
    expect(res.answer).toContain("Total Expenses");
    expect(res.answer).toContain("Outstanding Receivable");
    expect(res.answer).toContain("Largest Expense");
    expect(res.keyMetrics.some((m) => m.label === "Account" && m.value === "PRO")).toBe(true);
  });

  it("answers 'How much have I recovered from friends?' using verified settlement recovery metrics", async () => {
    const res = await askFinancialAssistant("How much have I recovered from friends?");
    expect(res.answer).toContain("₹5,000.00");
    expect(res.answer).toContain("1 completed settlement");
    expect(res.keyMetrics.some((m) => m.label === "Recovered from Friends" && m.value === "₹5,000.00")).toBe(true);
  });

  it("answers specific group inquiry 'How much did I spend in Summer Trip?'", async () => {
    const res = await askFinancialAssistant("How much did I spend in Summer Trip?");
    expect(res.answer).toContain("Summer Trip");
    expect(res.answer).toContain("₹8,000.00");
    expect(res.keyMetrics.some((m) => m.label === "Group Spend" && m.value === "₹8,000.00")).toBe(true);
  });

  it("answers 'Who do I owe?' when there are zero outstanding liabilities", async () => {
    const res = await askFinancialAssistant("Who do I owe?");
    expect(res.answer).toContain("₹0.00");
    expect(res.answer).toContain("zero outstanding liabilities");
    expect(res.keyMetrics.some((m) => m.label === "Total Payables" && m.value === "₹0.00")).toBe(true);
  });

  it("answers 'How can I reduce my expenses?' with actionable recommendations from data", async () => {
    const res = await askFinancialAssistant("How can I reduce my expenses?");
    expect(res.answer).toContain("personalized AI financial recommendations");
    expect(res.answer).toMatch(/1\.\s+\*\*/);
    expect(res.insights.length).toBeGreaterThan(0);
    expect(res.keyMetrics.some((m) => m.label === "Top Category")).toBe(true);
  });

  it("answers '💡 Give me AI financial recommendations.' with numbered actionable recommendations in the answer text", async () => {
    const res = await askFinancialAssistant("💡 Give me AI financial recommendations.");
    expect(res.answer).toContain("personalized AI financial recommendations");
    expect(res.answer).toMatch(/1\.\s+\*\*/);
    expect(res.insights.length).toBeGreaterThan(0);
    expect(res.keyMetrics.some((m) => m.label === "Top Category")).toBe(true);
  });

  it("answers '📑 Summarize my financial report.' with structured bulleted report metrics", async () => {
    const res = await askFinancialAssistant("📑 Summarize my financial report.");
    expect(res.answer).toContain("Executive Financial Summary Report");
    expect(res.answer).toContain("Total All-Time Expenses");
    expect(res.answer).toContain("Financial Health");
  });

  it("answers 'Explain data encryption and security' with bank-grade security facts", async () => {
    const res = await askFinancialAssistant("Explain data encryption and security");
    expect(res.answer).toContain("bank-grade security");
    expect(res.insights.some((i) => i.includes("256-bit AES"))).toBe(true);
    expect(res.keyMetrics.some((m) => m.label === "Encryption")).toBe(true);
  });

  it("returns zero-hallucination notice when data does not exist", async () => {
    const res = await askFinancialAssistant("How much did I spend on luxury yacht?");
    expect(res.answer).toContain("I couldn't find any verified data for that request.");
  });
});

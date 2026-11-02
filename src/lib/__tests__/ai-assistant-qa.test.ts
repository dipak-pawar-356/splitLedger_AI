import { describe, it, expect, vi } from "vitest";

// Mock rate limiting for unit tests
vi.mock("@/lib/security/rate-limit", () => ({
  assertRateLimit: vi.fn(),
  RATE_LIMITS: {
    ai: {
      assistant: { limit: 1000, windowMs: 60000 },
    },
  },
}));

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
    expect(res.answer).toContain("No matching financial records were found for your request.");
  });

  it("does not automatically create transactions for 'Petrol 500' and instructs to use 'create transition'", async () => {
    const res = await askFinancialAssistant("Petrol 500");
    expect(res.answer).toContain("I can help you record this.");
    expect(res.answer).toContain("create transition");
    expect(res.answer).toContain("Petrol 500");
    expect(res.detectedTransactions?.length || 0).toBe(0);
  });

  it("does not automatically create transactions for 'Salary 25000' and instructs to use 'create transition'", async () => {
    const res = await askFinancialAssistant("Salary 25000");
    expect(res.answer).toContain("I can help you record this.");
    expect(res.answer).toContain("create transition");
    expect(res.answer).toContain("Salary 25000");
    expect(res.detectedTransactions?.length || 0).toBe(0);
  });

  it("enters transaction creation mode when prefixed with 'create transition Petrol 500'", async () => {
    const res = await askFinancialAssistant("create transition Petrol 500");
    expect(res.detectedTransactions).toBeDefined();
    expect(res.detectedTransactions!.length).toBe(1);
    expect(res.detectedTransactions![0].title).toBe("Petrol");
    expect(res.detectedTransactions![0].amount).toBe(500);
  });

  it("answers 'Dashboard help' in Mode 1 Financial Support mode", async () => {
    const res = await askFinancialAssistant("Dashboard help");
    expect(res.answer).toContain("dashboard values");
    expect(res.actionSuggestions.some((a) => a.label === "View Dashboard")).toBe(true);
  });

  it("answers 'Budget help' in Mode 1 Financial Support mode", async () => {
    const res = await askFinancialAssistant("Budget help");
    expect(res.answer).toContain("budget");
  });

  describe("Personal Financial Advisor Explanations & Strict Month Awareness", () => {
    it("answers 'Why did I spend so much this month?' with conversational financial advisor explanation", async () => {
      const res = await askFinancialAssistant("Why did I spend so much this month?");
      expect(res.answer).toContain("₹8,000.00");
      expect(res.answer).toContain("Top Spending Drivers");
      expect(res.answer).toContain("Groceries");
      expect(res.answer).toContain("Advisor Takeaway");
      expect(res.keyMetrics.some((m) => m.label === "Spent This Month" && m.value === "₹8,000.00")).toBe(true);
      expect(res.keyMetrics.some((m) => m.label === "Top Category" && m.value === "Groceries")).toBe(true);
    });

    it("handles follow-up question 'Why?' using conversation history", async () => {
      const history = [
        { role: "user" as const, content: "How much did I spend this month?" },
        { role: "assistant" as const, content: "This month you spent ₹8,000.00 across 3 transactions." },
      ];
      const res = await askFinancialAssistant("Why?", undefined, history);
      expect(res.answer).toContain("Top Spending Drivers");
      expect(res.answer).toContain("Groceries");
      expect(res.answer).toContain("Advisor Takeaway");
    });

    it("handles follow-up query 'Show only food expenses'", async () => {
      const res = await askFinancialAssistant("Show only food expenses");
      expect(res.answer).toContain("Food & Dining");
      expect(res.answer).toContain("Swiggy Dinner");
      expect(res.keyMetrics.some((m) => m.label === "Food & Dining Total")).toBe(true);
    });

    it("answers 'How many expenses did I add this month?' with exact count", async () => {
      const res = await askFinancialAssistant("How many expenses did I add this month?");
      expect(res.answer).toContain("3 expenses");
      expect(res.answer).toContain("₹8,000.00");
      expect(res.keyMetrics.some((m) => m.label === "Expenses Added" && m.value === "3")).toBe(true);
    });

    it("answers 'How much salary did I receive?' with real data", async () => {
      const res = await askFinancialAssistant("How much salary did I receive?");
      expect(res.answer).toContain("salary");
      expect(res.keyMetrics.some((m) => m.label === "Salary This Month")).toBe(true);
    });

    it("answers 'Did I overspend?' analyzing budget utilization", async () => {
      const res = await askFinancialAssistant("Did I overspend?");
      expect(res.answer).toContain("budget");
      expect(res.keyMetrics.some((m) => m.label.includes("Budget") || m.label === "Status")).toBe(true);
    });

    it("answers 'How much cash flow do I have?' with verified inflows and outflows", async () => {
      const res = await askFinancialAssistant("How much cash flow do I have?");
      expect(res.answer).toContain("cashflow");
      expect(res.keyMetrics.some((m) => m.label === "Net Cash Flow")).toBe(true);
    });

    it("answers 'Which friend owes me the highest amount?' resolving the top debtor person", async () => {
      const res = await askFinancialAssistant("Which friend owes me the highest amount?");
      expect(res.answer).toContain("Aarav Sharma");
      expect(res.answer).toContain("Summer Trip");
      expect(res.keyMetrics.some((m) => m.label === "Top Debtor" && m.value === "Aarav Sharma")).toBe(true);
    });

    it("answers 'Which settlement is pending?' listing pending group settlements", async () => {
      const res = await askFinancialAssistant("Which settlement is pending?");
      expect(res.answer).toContain("pending settlement");
      expect(res.answer).toContain("Aarav Sharma");
      expect(res.keyMetrics.some((m) => m.label === "Receivables")).toBe(true);
    });

    it("answers 'Which group spent the most?' with top group metrics", async () => {
      const res = await askFinancialAssistant("Which group spent the most?");
      expect(res.answer).toContain("Summer Trip");
      expect(res.answer).toContain("₹8,000.00");
      expect(res.keyMetrics.some((m) => m.label === "Top Group" && m.value === "Summer Trip")).toBe(true);
    });

    it("answers 'How much did I save?' with net savings and savings rate", async () => {
      const res = await askFinancialAssistant("How much did I save?");
      expect(res.answer).toContain("savings");
      expect(res.keyMetrics.some((m) => m.label === "Net Savings")).toBe(true);
    });

    it("supports temporal queries: 'last month', 'this year', 'last year'", async () => {
      const resLastMonth = await askFinancialAssistant("How much did I spend last month?");
      expect(resLastMonth.answer).toContain("last month");

      const resThisYear = await askFinancialAssistant("How much did I spend this year?");
      expect(resThisYear.answer).toContain(new Date().getFullYear().toString());

      const resLastYear = await askFinancialAssistant("How much did I spend last year?");
      expect(resLastYear.answer).toContain((new Date().getFullYear() - 1).toString());
    });
  });
});

/**
 * Executive AI Summary & Business Intelligence Generator
 */

import { formatCurrency } from "@/lib/utils";

export interface ExecutiveReportNarrative {
  period: "weekly" | "monthly" | "quarterly" | "yearly";
  headline: string;
  executiveSummary: string;
  keyHighlights: string[];
  departmentPerformance: Array<{ department: string; spending: number; budget: number; status: "optimal" | "warning" | "exceeded" }>;
  riskScore: number; // 0 - 100
  recommendedAction: string;
  generatedAt: string;
}

export function generateExecutiveReportNarrative(
  period: "weekly" | "monthly" | "quarterly" = "monthly",
  data: {
    totalSpent: number;
    totalBudget: number;
    topCategory: string;
    departmentBreakdown?: Array<{ name: string; spent: number; budget: number }>;
  }
): ExecutiveReportNarrative {
  const budgetUtilization = data.totalBudget > 0 ? (data.totalSpent / data.totalBudget) * 100 : 0;
  const variance = data.totalBudget - data.totalSpent;

  let riskScore = 15;
  if (budgetUtilization > 95) riskScore = 85;
  else if (budgetUtilization > 80) riskScore = 55;

  const departmentPerformance = (data.departmentBreakdown || [
    { name: "Engineering & Tech", spent: data.totalSpent * 0.6, budget: data.totalBudget * 0.6 },
    { name: "Marketing & Growth", spent: data.totalSpent * 0.25, budget: data.totalBudget * 0.25 },
    { name: "Finance & Admin", spent: data.totalSpent * 0.15, budget: data.totalBudget * 0.15 },
  ]).map((dept) => {
    const util = dept.budget > 0 ? (dept.spent / dept.budget) * 100 : 0;
    return {
      department: dept.name,
      spending: dept.spent,
      budget: dept.budget,
      status: (util > 100 ? "exceeded" : util > 85 ? "warning" : "optimal") as "optimal" | "warning" | "exceeded",
    };
  });

  return {
    period,
    headline: `${period.toUpperCase()} FINANCIAL EXECUTIVE SUMMARY: ₹${Math.round(data.totalSpent).toLocaleString("en-IN")} Outflow`,
    executiveSummary: `During this ${period} period, total corporate & personal outflow reached ${formatCurrency(data.totalSpent, "INR")} against an allocated budget of ${formatCurrency(data.totalBudget, "INR")} (${Math.round(budgetUtilization)}% utilization). Overall variance stands at ${formatCurrency(Math.abs(variance), "INR")} ${variance >= 0 ? "under budget" : "over budget"}.`,
    keyHighlights: [
      `Budget Utilization: ${Math.round(budgetUtilization)}%`,
      `Primary Cost Center: ${data.topCategory || "Engineering & Cloud"}`,
      `Net Cash Flow Variance: ${formatCurrency(variance, "INR")}`,
      `Financial Risk Index: ${riskScore}/100`,
    ],
    departmentPerformance,
    riskScore,
    recommendedAction:
      budgetUtilization > 90
        ? "Enforce secondary approvals on non-essential expenditures above ₹5,000."
        : "Maintain existing spending trajectory and allocate surplus to operational reserves.",
    generatedAt: new Date().toISOString(),
  };
}

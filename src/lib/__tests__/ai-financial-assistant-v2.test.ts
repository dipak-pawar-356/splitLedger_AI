import { describe, it, expect } from "vitest";
import {
  calculateComprehensiveHealthScore,
  predictFutureExpenses,
} from "@/lib/ai/financial-health";
import { optimizeSettlementPaths } from "@/lib/ai/settlement-optimizer";

describe("AI Financial Assistant, Health Scoring & Settlement Optimizer (Part VI-D)", () => {
  describe("MODULE 9: Comprehensive 7-Factor Financial Health Score", () => {
    it("should calculate high health score for disciplined spending and low debt", () => {
      const health = calculateComprehensiveHealthScore({
        monthlyIncome: 100000,
        monthlyExpense: 45000,
        totalBudget: 60000,
        settledAmount: 18000,
        totalSettlementDue: 500,
        overdueSettlementCount: 0,
      });

      expect(health.score).toBeGreaterThanOrEqual(85);
      expect(health.rating).toBe("Excellent");
      expect(health.positiveHighlights.length).toBeGreaterThan(0);
      expect(health.factors.savingsRate.score).toBe(20);
      expect(health.factors.budgetCompliance.score).toBe(20);
    });

    it("should lower score and generate risk flags for high debt exposure", () => {
      const health = calculateComprehensiveHealthScore({
        monthlyIncome: 50000,
        monthlyExpense: 52000,
        totalBudget: 45000,
        settledAmount: 2000,
        totalSettlementDue: 18500,
        overdueSettlementCount: 4,
      });

      expect(health.score).toBeLessThan(70);
      expect(health.riskFlags.length).toBeGreaterThan(0);
      expect(health.actionableRecommendations.length).toBeGreaterThan(0);
    });
  });

  describe("MODULE 4 & 6: Predictive Analytics & Expense Forecasting", () => {
    it("should project next week and next month spending with confidence scores in INR", () => {
      const forecast = predictFutureExpenses({
        currentMonthSpent: 30000,
        monthlyBudget: 50000,
        pendingReceivables: 4500,
        pendingPayables: 1200,
      });

      expect(forecast.nextWeekPredictedSpend).toBeGreaterThan(0);
      expect(forecast.nextMonthPredictedSpend).toBeGreaterThan(0);
      expect(forecast.confidencePercentage).toBeGreaterThanOrEqual(90);
      expect(forecast.upcomingBillsForecast.length).toBeGreaterThan(0);
      expect(forecast.forecastNarrative).toContain("projected to reach");
    });
  });

  describe("MODULE 7: Smart Settlement Optimization (O(N log N))", () => {
    it("should minimize transfers and consolidate multi-member debt paths", () => {
      const participants = [
        { userId: 1, name: "Dipak", netBalance: -600 }, // owes 600
        { userId: 2, name: "Rahul", netBalance: -400 }, // owes 400
        { userId: 3, name: "Priya", netBalance: 1000 }, // should receive 1000
      ];

      const report = optimizeSettlementPaths(participants, "INR");

      // Instead of 4 separate transactions, optimal is exactly 2 transfers
      expect(report.optimizedTransactionCount).toBe(2);
      expect(report.transfers.some((t) => t.fromUserName === "Dipak" && t.toUserName === "Priya" && t.amount === 600)).toBe(true);
      expect(report.transfers.some((t) => t.fromUserName === "Rahul" && t.toUserName === "Priya" && t.amount === 400)).toBe(true);
      expect(report.totalSettlementVolume).toBe(1000);
      expect(report.reductionPercentage).toBeGreaterThanOrEqual(0);
    });
  });
});

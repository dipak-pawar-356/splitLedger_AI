import { describe, it, expect, beforeEach } from "vitest";
import { parseVoiceCommand } from "@/lib/ai/voice-parser";
import { evaluateAutomationRules } from "@/lib/ai/automation-engine";
import { evaluateTransactionRisk } from "@/lib/ai/fraud-detector";
import {
  recordCategoryCorrection,
  getLearnedCategory,
  clearUserLearning,
} from "@/lib/ai/learning-engine";
import { generateExecutiveReportNarrative } from "@/lib/ai/executive-summary";

describe("SplitLedger AI Version 2.0 – AI, Automation, Voice & Intelligence (Part VI)", () => {
  describe("MODULE 10: Multilingual Voice Command Parser", () => {
    it("should parse expense commands and infer category in INR", () => {
      const parsed = parseVoiceCommand("Add ₹750 Food Expense");
      expect(parsed.action).toBe("add_expense");
      expect(parsed.parameters.amount).toBe(750);
      expect(parsed.parameters.currency).toBe("INR");
      expect(parsed.parameters.category).toBe("Food & Dining");
      expect(parsed.confidence).toBeGreaterThan(0.9);
    });

    it("should parse Hinglish expense command", () => {
      const parsed = parseVoiceCommand("500 rupaye petrol ka add karo");
      expect(parsed.action).toBe("add_expense");
      expect(parsed.parameters.amount).toBe(500);
      expect(parsed.parameters.category).toBe("Petrol & Fuel");
    });

    it("should parse create group and balance query commands", () => {
      const groupCmd = parseVoiceCommand("Create Goa Trip Group");
      expect(groupCmd.action).toBe("create_group");
      expect(groupCmd.parameters.groupName).toBe("Goa");

      const balCmd = parseVoiceCommand("Show my balance");
      expect(balCmd.action).toBe("show_balance");
    });
  });

  describe("MODULE 15: Chained Automation Rules Engine", () => {
    it("should trigger high expense alert rule for amounts > ₹5000", () => {
      const results = evaluateAutomationRules("expense_created", { amount: 12500 });
      expect(results.length).toBe(1);
      expect(results[0].ruleId).toBe("rule_high_expense");
      expect(results[0].executedActions).toContain("notify_admin");
      expect(results[0].executedActions).toContain("send_alert");
    });

    it("should trigger critical budget alert when budget utilization >= 90%", () => {
      const results = evaluateAutomationRules("budget_threshold", { budgetPercent: 94 });
      expect(results.length).toBe(1);
      expect(results[0].ruleId).toBe("rule_budget_critical");
      expect(results[0].executedActions).toContain("email_finance");
    });
  });

  describe("MODULE 7: Fraud, Risk & Anomaly Detection", () => {
    it("should flag severe spending spikes as critical risk", () => {
      const risk = evaluateTransactionRisk(
        { amount: 85000, title: "Executive Luxury Dinner" },
        2500,
        0
      );

      expect(risk.isSuspicious).toBe(true);
      expect(risk.riskScore).toBeGreaterThan(50);
      expect(risk.suggestedAction).toBe("flag_for_review");
      expect(risk.reasons.length).toBeGreaterThan(0);
    });

    it("should flag abnormal submission velocity", () => {
      const risk = evaluateTransactionRisk(
        { amount: 4500, title: "Office Supplies" },
        2500,
        6 // 6 claims in last hour
      );

      expect(risk.isSuspicious).toBe(true);
      expect(risk.reasons.some((r) => r.includes("velocity"))).toBe(true);
    });
  });

  describe("MODULE 16: Privacy-Preserving User Learning Engine", () => {
    beforeEach(() => {
      clearUserLearning();
    });

    it("should store user custom category corrections and recall them with high confidence", () => {
      // User 1 corrects "Chai Point" to "Office Refreshments"
      recordCategoryCorrection(1, "Chai Point", "Office Refreshments");

      const learned = getLearnedCategory(1, "Chai Point Order #441");
      expect(learned.isLearned).toBe(true);
      expect(learned.category).toBe("Office Refreshments");
      expect(learned.confidence).toBeGreaterThan(0.85);

      // User 2 should NOT have User 1's override (tenant isolation)
      const user2Learned = getLearnedCategory(2, "Chai Point Order #441");
      expect(user2Learned.isLearned).toBe(false);
    });
  });

  describe("MODULE 9: Executive AI Summary & Business Intelligence", () => {
    it("should generate structured monthly executive narrative in INR", () => {
      const narrative = generateExecutiveReportNarrative("monthly", {
        totalSpent: 75000,
        totalBudget: 80000,
        topCategory: "Engineering & Cloud",
      });

      expect(narrative.period).toBe("monthly");
      expect(narrative.headline).toContain("75,000");
      expect(narrative.keyHighlights.length).toBeGreaterThan(2);
      expect(narrative.riskScore).toBeDefined();
    });
  });
});

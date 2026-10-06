import { describe, it, expect, vi } from "vitest";
import {
  createRecurringSchedule,
  triggerScheduledExecution,
  pauseResumeRecurringSchedule,
  createBill,
  markBillPaid,
  createSubscription,
  cancelSubscription,
  getRecurringDashboardSummary,
  calculateNextExecutionDate,
} from "@/actions/recurring";

// Mock requireAuth
vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn().mockResolvedValue({
    id: 1,
    clerkUserId: "user_test_recurring_manager",
    email: "dipak@splitledger.ai",
    name: "Dipak Pawar",
    defaultCurrency: "INR",
  }),
}));

describe("Recurring Transactions, Bills, Subscriptions & Automation (Part VI-L)", () => {
  describe("MODULE 1 & 2: Recurring Schedule & Next Date Calculation", () => {
    it("should calculate correct next execution dates across frequencies", async () => {
      const baseDate = "2026-08-01";
      const nextDaily = await calculateNextExecutionDate(baseDate, "daily");
      const nextMonthly = await calculateNextExecutionDate(baseDate, "monthly");
      const nextYearly = await calculateNextExecutionDate(baseDate, "yearly");

      expect(nextDaily).toBe("2026-08-02");
      expect(nextMonthly).toBe("2026-09-01");
      expect(nextYearly).toBe("2027-08-01");
    });

    it("should create a recurring schedule with random 16-char ID in INR", async () => {
      const schedule = await createRecurringSchedule({
        title: "Gym Membership Monthly",
        amount: 2500,
        type: "subscription",
        category: "Fitness & Health",
        frequency: "monthly",
      });

      expect(schedule.id).toMatch(/^rec_[A-Za-z0-9]{16}$/);
      expect(schedule.amount).toBe(2500);
      expect(schedule.currency).toBe("INR");
      expect(schedule.status).toBe("active");
    });

    it("should reject recurring schedule with ₹0 or negative amount", async () => {
      await expect(
        createRecurringSchedule({
          title: "Invalid Zero Schedule",
          amount: 0,
          type: "expense",
          category: "Test",
          frequency: "monthly",
        })
      ).rejects.toThrow("must be greater than ₹0");
    });
  });

  describe("MODULE 5 & 15: Automated Execution & Audit History Logs", () => {
    it("should trigger execution run, generate random transaction reference, and update schedule next execution", async () => {
      const schedule = await createRecurringSchedule({
        title: "Office Cleaning Maid Fee",
        amount: 4000,
        type: "expense",
        category: "Services",
        frequency: "monthly",
      });

      const initialExecCount = schedule.executionCount;

      const log = await triggerScheduledExecution(schedule.id);

      expect(log.id).toMatch(/^exec_[A-Za-z0-9]{16}$/);
      expect(log.status).toBe("success");
      expect(log.generatedTransactionId).toMatch(/^txn_[A-Za-z0-9]{16}$/);
    });

    it("should pause and resume recurring schedule cleanly", async () => {
      const schedule = await createRecurringSchedule({
        title: "Tutor Monthly Fee",
        amount: 3000,
        type: "expense",
        category: "Education",
        frequency: "monthly",
      });

      const paused = await pauseResumeRecurringSchedule(schedule.id, "pause");
      expect(paused.status).toBe("paused");

      const resumed = await pauseResumeRecurringSchedule(schedule.id, "resume");
      expect(resumed.status).toBe("active");
    });
  });

  describe("MODULE 3 & 4: Bills & Subscriptions Management", () => {
    it("should create utility bill and allow marking as paid", async () => {
      const bill = await createBill({
        title: "Piped Gas Utility Bill",
        provider: "Mahanagar Gas Ltd",
        category: "Gas",
        amount: 850,
        dueDate: "2026-09-10",
      });

      expect(bill.id).toMatch(/^bill_[A-Za-z0-9]{16}$/);
      expect(bill.status).toBe("pending");

      const paidBill = await markBillPaid(bill.id);
      expect(paidBill.status).toBe("paid");
    });

    it("should create SaaS subscription and allow cancellation", async () => {
      const sub = await createSubscription({
        name: "GitHub Copilot Pro",
        provider: "GitHub",
        category: "Developer Tools",
        billingCycle: "monthly",
        amount: 820,
        renewalDate: "2026-09-15",
      });

      expect(sub.id).toMatch(/^sub_[A-Za-z0-9]{16}$/);
      expect(sub.status).toBe("active");

      const cancelledSub = await cancelSubscription(sub.id);
      expect(cancelledSub.status).toBe("cancelled");
      expect(cancelledSub.autoRenewal).toBe(false);
    });
  });

  describe("MODULE 9: Comprehensive Dashboard Metrics", () => {
    it("should calculate aggregate recurring income and outflow metrics in INR", async () => {
      const summary = await getRecurringDashboardSummary();

      expect(summary.totalMonthlyRecurringOutflow).toBeGreaterThan(0);
      expect(summary.totalMonthlyRecurringIncome).toBeGreaterThan(0);
      expect(summary.currency).toBe("INR");
      expect(summary.recurringTransactions.length).toBeGreaterThan(0);
      expect(summary.bills.length).toBeGreaterThan(0);
      expect(summary.subscriptions.length).toBeGreaterThan(0);
    });
  });
});

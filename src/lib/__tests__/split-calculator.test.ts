import { describe, it, expect } from "vitest";
import {
  calculateExactAmountGroupPayables,
  calculatePercentageGroupPayables,
  calculateSharesGroupPayables,
  validateReceiverAssignment,
  type SplitMemberInput,
} from "../settlements/split-calculator";

describe("Enterprise Split Engines (INR ₹ Precision & Zero-Drift Guarantees)", () => {
  describe("1. Exact Amount Split Engine", () => {
    it("should distribute fixed amounts and distribute remaining amount equally among all members (User Requirement Example)", () => {
      // User's exact example:
      // Expense = ₹10,000 (1,000,000 paise)
      // A Fixed Share = ₹2,000 (200,000 paise)
      // B Fixed Share = ₹3,000 (300,000 paise)
      // C Fixed Share = ₹2,000 (200,000 paise)
      // Allocated = ₹7,000 (700,000 paise)
      // Remaining = ₹3,000 (300,000 paise)
      // Distributed equally = ₹1,000 each (100,000 paise each)
      // Final Payable: A = ₹3,000, B = ₹4,000, C = ₹3,000. Sum = ₹10,000.
      const members: SplitMemberInput[] = [
        { key: "user-1", userId: 1, name: "A", fixedAmountPaise: 200000 },
        { key: "user-2", userId: 2, name: "B", fixedAmountPaise: 300000 },
        { key: "user-3", userId: 3, name: "C", fixedAmountPaise: 200000 },
      ];

      const result = calculateExactAmountGroupPayables(1000000, members);

      expect(result.isValid).toBe(true);
      expect(result.totalExpenseRupees).toBe(10000);
      expect(result.allocatedFixedRupees).toBe(7000);
      expect(result.remainingUnallocatedRupees).toBe(3000);

      const [a, b, c] = result.payables;
      expect(a.amountRupees).toBe(3000);
      expect(b.amountRupees).toBe(4000);
      expect(c.amountRupees).toBe(3000);

      // Verify zero drift
      const totalAllocated = result.payables.reduce((sum, p) => sum + p.amountPaise, 0);
      expect(totalAllocated).toBe(1000000);
    });

    it("should handle partial fixed allocation where some members have 0 fixed share", () => {
      // Total ₹10,000
      // A fixed = ₹4,000, B = 0, C = 0
      // Remaining = ₹6,000 / 3 = ₹2,000 each
      // Final: A = ₹6,000, B = ₹2,000, C = ₹2,000
      const members: SplitMemberInput[] = [
        { key: "user-1", userId: 1, name: "A", fixedAmountPaise: 400000 },
        { key: "user-2", userId: 2, name: "B", fixedAmountPaise: 0 },
        { key: "user-3", userId: 3, name: "C", fixedAmountPaise: 0 },
      ];

      const result = calculateExactAmountGroupPayables(1000000, members);
      expect(result.isValid).toBe(true);
      expect(result.payables[0].amountRupees).toBe(6000);
      expect(result.payables[1].amountRupees).toBe(2000);
      expect(result.payables[2].amountRupees).toBe(2000);

      const totalAllocated = result.payables.reduce((sum, p) => sum + p.amountPaise, 0);
      expect(totalAllocated).toBe(1000000);
    });

    it("should handle indivisible paise without any loss or drift", () => {
      // ₹100.01 (10,001 paise) with A fixed ₹50.00 (5,000 paise)
      // Remaining = 5,001 paise across 3 members = 1,667 paise each
      const members: SplitMemberInput[] = [
        { key: "user-1", userId: 1, name: "A", fixedAmountPaise: 5000 },
        { key: "user-2", userId: 2, name: "B", fixedAmountPaise: 0 },
        { key: "user-3", userId: 3, name: "C", fixedAmountPaise: 0 },
      ];

      const result = calculateExactAmountGroupPayables(10001, members);
      expect(result.isValid).toBe(true);

      const totalAllocated = result.payables.reduce((sum, p) => sum + p.amountPaise, 0);
      expect(totalAllocated).toBe(10001);
    });

    it("should reject when sum of fixed amounts exceeds total group expense", () => {
      const members: SplitMemberInput[] = [
        { key: "user-1", userId: 1, name: "A", fixedAmountPaise: 600000 },
        { key: "user-2", userId: 2, name: "B", fixedAmountPaise: 500000 },
      ];

      const result = calculateExactAmountGroupPayables(1000000, members); // ₹10,000 expense, ₹11,000 fixed
      expect(result.isValid).toBe(false);
      expect(result.validationError).toContain("exceeds total expense");
    });
  });

  describe("2. Percentage Split Engine", () => {
    it("should calculate exact proportional shares for 40%, 35%, 25% on ₹20,000 (User Example)", () => {
      const members: SplitMemberInput[] = [
        { key: "user-1", userId: 1, name: "A", percentage: 40 },
        { key: "user-2", userId: 2, name: "B", percentage: 35 },
        { key: "user-3", userId: 3, name: "C", percentage: 25 },
      ];

      const result = calculatePercentageGroupPayables(2000000, members); // ₹20,000 = 2,000,000 paise
      expect(result.isValid).toBe(true);
      expect(result.totalPercentage).toBe(100);

      const [a, b, c] = result.payables;
      expect(a.amountRupees).toBe(8000);
      expect(b.amountRupees).toBe(7000);
      expect(c.amountRupees).toBe(5000);

      const totalAllocated = result.payables.reduce((sum, p) => sum + p.amountPaise, 0);
      expect(totalAllocated).toBe(2000000);
    });

    it("should handle decimal percentages (33.33%, 33.33%, 33.34%) with zero drift", () => {
      const members: SplitMemberInput[] = [
        { key: "user-1", userId: 1, name: "A", percentage: 33.33 },
        { key: "user-2", userId: 2, name: "B", percentage: 33.33 },
        { key: "user-3", userId: 3, name: "C", percentage: 33.34 },
      ];

      const result = calculatePercentageGroupPayables(100000, members); // ₹1,000
      expect(result.isValid).toBe(true);

      const totalAllocated = result.payables.reduce((sum, p) => sum + p.amountPaise, 0);
      expect(totalAllocated).toBe(100000);
    });

    it("should flag invalid total percentage when sum !== 100%", () => {
      const members: SplitMemberInput[] = [
        { key: "user-1", userId: 1, name: "A", percentage: 50 },
        { key: "user-2", userId: 2, name: "B", percentage: 40 },
      ];

      const result = calculatePercentageGroupPayables(100000, members);
      expect(result.isValid).toBe(false);
      expect(result.remainingPercentage).toBe(10);
    });
  });

  describe("3. Shares Ratio Split Engine", () => {
    it("should calculate shares with ratio 1 : 2 : 3 on ₹12,000 (User Example)", () => {
      // Total Shares = 6
      // Share Value = ₹2,000
      // A = ₹2,000, B = ₹4,000, C = ₹6,000
      const members: SplitMemberInput[] = [
        { key: "user-1", userId: 1, name: "A", shares: 1 },
        { key: "user-2", userId: 2, name: "B", shares: 2 },
        { key: "user-3", userId: 3, name: "C", shares: 3 },
      ];

      const result = calculateSharesGroupPayables(1200000, members); // ₹12,000
      expect(result.isValid).toBe(true);
      expect(result.totalShares).toBe(6);
      expect(result.shareValueRupees).toBe(2000);

      const [a, b, c] = result.payables;
      expect(a.amountRupees).toBe(2000);
      expect(b.amountRupees).toBe(4000);
      expect(c.amountRupees).toBe(6000);

      const totalAllocated = result.payables.reduce((sum, p) => sum + p.amountPaise, 0);
      expect(totalAllocated).toBe(1200000);
    });

    it("should support decimal shares (1.5, 2.5, 1.0) with exact sum conservation", () => {
      const members: SplitMemberInput[] = [
        { key: "user-1", userId: 1, name: "A", shares: 1.5 },
        { key: "user-2", userId: 2, name: "B", shares: 2.5 },
        { key: "user-3", userId: 3, name: "C", shares: 1.0 },
      ];

      const result = calculateSharesGroupPayables(500000, members); // ₹5,000
      expect(result.isValid).toBe(true);
      expect(result.totalShares).toBe(5);

      const totalAllocated = result.payables.reduce((sum, p) => sum + p.amountPaise, 0);
      expect(totalAllocated).toBe(500000);
    });

    it("should flag invalid shares if any member has 0 or negative shares", () => {
      const members: SplitMemberInput[] = [
        { key: "user-1", userId: 1, name: "A", shares: 2 },
        { key: "user-2", userId: 2, name: "B", shares: 0 },
      ];

      const result = calculateSharesGroupPayables(500000, members);
      expect(result.isValid).toBe(false);
      expect(result.validationError).toContain("at least 1 share");
    });
  });

  describe("4. Receiver Assignment Validation", () => {
    it("should validate and recalculate remaining liability when assigning receivers (User Example)", () => {
      // Person B needs to pay ₹1,000 (100,000 paise).
      // Assigning Person A ₹500 (50,000 paise).
      // Debtor remaining liability should become ₹500 (50,000 paise).
      const step1 = validateReceiverAssignment({
        debtorTotalLiabilityPaise: 100000,
        debtorExistingAssignedPaise: 0,
        assignmentAmountPaise: 50000,
        receiverTotalReceivablePaise: 50000,
        receiverExistingAssignedPaise: 0,
      });

      expect(step1.isValid).toBe(true);
      expect(step1.debtorRemainingLiabilityPaise).toBe(50000);
      expect(step1.receiverRemainingReceivablePaise).toBe(0);

      // Next step: Assign remaining ₹500 to Person C
      const step2 = validateReceiverAssignment({
        debtorTotalLiabilityPaise: 100000,
        debtorExistingAssignedPaise: 50000,
        assignmentAmountPaise: 50000,
        receiverTotalReceivablePaise: 50000,
        receiverExistingAssignedPaise: 0,
      });

      expect(step2.isValid).toBe(true);
      expect(step2.debtorRemainingLiabilityPaise).toBe(0); // 0 remaining!
      expect(step2.receiverRemainingReceivablePaise).toBe(0);
    });

    it("should reject assignment if amount exceeds debtor's remaining liability", () => {
      const res = validateReceiverAssignment({
        debtorTotalLiabilityPaise: 50000, // ₹500 liability
        debtorExistingAssignedPaise: 0,
        assignmentAmountPaise: 60000,     // ₹600 assignment
        receiverTotalReceivablePaise: 100000,
        receiverExistingAssignedPaise: 0,
      });

      expect(res.isValid).toBe(false);
      expect(res.error).toContain("exceeds debtor's remaining liability");
    });

    it("should reject assignment if amount exceeds receiver's available receivable", () => {
      const res = validateReceiverAssignment({
        debtorTotalLiabilityPaise: 100000,
        debtorExistingAssignedPaise: 0,
        assignmentAmountPaise: 50000,     // ₹500 assignment
        receiverTotalReceivablePaise: 30000, // receiver only eligible for ₹300
        receiverExistingAssignedPaise: 0,
      });

      expect(res.isValid).toBe(false);
      expect(res.error).toContain("exceeds receiver's available receivable");
    });
  });
});

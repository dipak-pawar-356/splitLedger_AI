import { describe, it, expect } from "vitest";
import {
  calculateExactAmountGroupPayables,
  calculatePercentageGroupPayables,
  calculateSharesGroupPayables,
  validateReceiverAssignment,
  type SplitMemberInput,
} from "../settlements/split-calculator";

describe("E2E Split Engine & Receiver Assignment Scenarios (₹ INR Invariants)", () => {
  it("Scenario 1: Exact Amount Split + Receiver Assignment Workflow (User Prompt Flow)", () => {
    // 1. Group Expense = ₹10,000 (1,000,000 paise)
    // Members: A, B, C
    // Admin sets:
    // A Fixed = ₹2,000
    // B Fixed = ₹3,000
    // C Fixed = ₹2,000
    // Allocated = ₹7,000
    // Remaining = ₹3,000 (Distributed equally = ₹1,000 each)
    // Target Payables: A = ₹3,000, B = ₹4,000, C = ₹3,000
    const members: SplitMemberInput[] = [
      { key: "user-1", userId: 1, name: "A", fixedAmountPaise: 200000 },
      { key: "user-2", userId: 2, name: "B", fixedAmountPaise: 300000 },
      { key: "user-3", userId: 3, name: "C", fixedAmountPaise: 200000 },
    ];

    const exactResult = calculateExactAmountGroupPayables(1000000, members);
    expect(exactResult.isValid).toBe(true);

    const payableA = exactResult.payables.find((p) => p.userId === 1)!.amountPaise;
    const payableB = exactResult.payables.find((p) => p.userId === 2)!.amountPaise;
    const payableC = exactResult.payables.find((p) => p.userId === 3)!.amountPaise;

    expect(payableA).toBe(300000); // ₹3,000
    expect(payableB).toBe(400000); // ₹4,000
    expect(payableC).toBe(300000); // ₹3,000

    // Sum of payables must strictly equal total group expense
    expect(payableA + payableB + payableC).toBe(1000000);

    // 2. Member B already paid ₹3,000 (300,000 paise) in group expenses.
    // Target payable = ₹4,000.
    // Remaining liability for B = ₹1,000 (100,000 paise).
    const bPaidPaise = 300000;
    const bNetLiabilityPaise = payableB - bPaidPaise;
    expect(bNetLiabilityPaise).toBe(100000); // ₹1,000

    // Let A have paid ₹6,000 in expenses (Target ₹3,000 => Net Receivable ₹3,000 = 300,000 paise)
    // Let C have paid ₹1,000 in expenses (Target ₹3,000 => Net Liability ₹2,000)
    // Or let A have paid ₹4,000 (Receivable ₹1,000), C paid ₹3,000 (Settled) etc.
    const aPaidPaise = 400000; // A paid ₹4,000 => receivable = 400,000 - 300,000 = 100,000 paise (₹1,000)
    const cPaidPaise = 300000; // C paid ₹3,000 => receivable = 0
    // Total expenses = 4,000 + 3,000 + 3,000 = ₹10,000.

    // Admin assigns Receiver A: ₹500 (50,000 paise)
    const assignment1 = validateReceiverAssignment({
      debtorTotalLiabilityPaise: bNetLiabilityPaise,
      debtorExistingAssignedPaise: 0,
      receiverTotalReceivablePaise: 100000, // A is owed ₹1,000
      receiverExistingAssignedPaise: 0,
      assignmentAmountPaise: 50000, // ₹500
    });

    expect(assignment1.isValid).toBe(true);
    expect(assignment1.debtorRemainingLiabilityPaise).toBe(50000); // ₹500 still remaining for B

    // Admin assigns Receiver A remaining ₹500 (50,000 paise)
    const assignment2 = validateReceiverAssignment({
      debtorTotalLiabilityPaise: bNetLiabilityPaise,
      debtorExistingAssignedPaise: 50000,
      receiverTotalReceivablePaise: 100000,
      receiverExistingAssignedPaise: 50000,
      assignmentAmountPaise: 50000, // ₹500
    });

    expect(assignment2.isValid).toBe(true);
    expect(assignment2.debtorRemainingLiabilityPaise).toBe(0); // 0 remaining for B!
  });

  it("Scenario 2: Percentage Split Engine with 40%, 35%, 25% on ₹20,000", () => {
    const members: SplitMemberInput[] = [
      { key: "user-1", userId: 1, name: "A", percentage: 40 },
      { key: "user-2", userId: 2, name: "B", percentage: 35 },
      { key: "user-3", userId: 3, name: "C", percentage: 25 },
    ];

    const result = calculatePercentageGroupPayables(2000000, members);
    expect(result.isValid).toBe(true);
    expect(result.totalPercentage).toBe(100);

    const [a, b, c] = result.payables;
    expect(a.amountRupees).toBe(8000);
    expect(b.amountRupees).toBe(7000);
    expect(c.amountRupees).toBe(5000);
    expect(a.amountPaise + b.amountPaise + c.amountPaise).toBe(2000000);
  });

  it("Scenario 3: Shares Ratio Split Engine with 1, 2, 3 shares on ₹12,000", () => {
    const members: SplitMemberInput[] = [
      { key: "user-1", userId: 1, name: "A", shares: 1 },
      { key: "user-2", userId: 2, name: "B", shares: 2 },
      { key: "user-3", userId: 3, name: "C", shares: 3 },
    ];

    const result = calculateSharesGroupPayables(1200000, members);
    expect(result.isValid).toBe(true);
    expect(result.totalShares).toBe(6);
    expect(result.shareValueRupees).toBe(2000);

    const [a, b, c] = result.payables;
    expect(a.amountRupees).toBe(2000);
    expect(b.amountRupees).toBe(4000);
    expect(c.amountRupees).toBe(6000);
    expect(a.amountPaise + b.amountPaise + c.amountPaise).toBe(1200000);
  });

  it("Scenario 4: Assignment validation prevents over-assignment and negative values", () => {
    // Attempting to assign more than debtor's liability
    const invalidOverDebt = validateReceiverAssignment({
      debtorTotalLiabilityPaise: 100000, // ₹1,000
      debtorExistingAssignedPaise: 80000,  // ₹800 already assigned
      receiverTotalReceivablePaise: 500000, // Receiver owed ₹5,000
      receiverExistingAssignedPaise: 0,
      assignmentAmountPaise: 30000,   // Requesting ₹300, but only ₹200 left
    });

    expect(invalidOverDebt.isValid).toBe(false);
    expect(invalidOverDebt.error).toContain("exceeds debtor's remaining liability");

    // Attempting to assign 0 or negative
    const invalidZero = validateReceiverAssignment({
      debtorTotalLiabilityPaise: 100000,
      debtorExistingAssignedPaise: 0,
      receiverTotalReceivablePaise: 100000,
      receiverExistingAssignedPaise: 0,
      assignmentAmountPaise: 0,
    });

    expect(invalidZero.isValid).toBe(false);
    expect(invalidZero.error).toContain("greater than");
  });
});

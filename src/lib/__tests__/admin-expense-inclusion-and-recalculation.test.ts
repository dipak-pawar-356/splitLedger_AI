import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  determineExpenseEligibleParticipants,
  calculateSharesForExpense,
  calculateMemberNetBalances,
  validateIntegrity,
  hasParticipantSetOrSharesChanged,
  type TimelineEntry,
  type ParticipantKey,
} from "@/lib/settlements/recalculation-engine";
import { calculateOptimalSettlements, type Balance } from "@/lib/settlements/calculator";

describe("Admin Permission Management, Expense Inclusion Engine & Automatic Recalculation", () => {
  const T0 = new Date("2026-01-01T10:00:00Z"); // Group created (P1, P2)
  const T1 = new Date("2026-01-02T10:00:00Z"); // Expense E1 (₹1000)
  const T2 = new Date("2026-01-05T10:00:00Z"); // Raj (P3) joins with Include Previous Expenses = OFF ("excluded")
  const T3 = new Date("2026-01-06T10:00:00Z"); // Expense E2 (₹600)
  const T4 = new Date("2026-01-10T10:00:00Z"); // Admin changes Raj to Include Previous Expenses = ON ("included")
  const T5 = new Date("2026-01-12T10:00:00Z"); // Expense E3 (₹900)
  const T6 = new Date("2026-01-15T10:00:00Z"); // Admin changes Raj back to Include Previous Expenses = OFF ("excluded")
  const T7 = new Date("2026-01-18T10:00:00Z"); // Expense E4 (₹300)

  // =========================================================================
  // FEATURE 3 & 4: PARTICIPATION PERMISSION & CHANGE ANYTIME
  // =========================================================================
  describe("Features 3 & 4: Member Expense Participation Permission Anytime", () => {
    it("initially excludes member from historical expenses when Include Previous Expenses = OFF", () => {
      const rajTimeline: TimelineEntry[] = [
        {
          groupId: 10,
          userId: 3,
          participationMode: "excluded",
          effectiveFrom: T2,
          effectiveUntil: null,
          reason: "initial_approval",
          redistributionVersion: 1,
        },
      ];

      // Historical expense E1 at T1 (< T2): Raj is excluded
      const e1Participants = determineExpenseEligibleParticipants(rajTimeline, T1);
      expect(e1Participants.map((p) => p.userId)).not.toContain(3);

      // Future expense E2 at T3 (> T2): Raj is included
      const e2Participants = determineExpenseEligibleParticipants(rajTimeline, T3);
      expect(e2Participants.map((p) => p.userId)).toContain(3);
    });

    it("automatically includes member in historical expenses when Admin switches setting to ON", () => {
      const rajTimelineAfterSwitchOn: TimelineEntry[] = [
        {
          groupId: 10,
          userId: 3,
          participationMode: "excluded",
          effectiveFrom: T2,
          effectiveUntil: T4,
          reason: "initial_approval",
          redistributionVersion: 1,
        },
        {
          groupId: 10,
          userId: 3,
          participationMode: "included",
          effectiveFrom: T4,
          effectiveUntil: null,
          reason: "mode_change",
          redistributionVersion: 2,
        },
      ];

      // Now historical expense E1 at T1 (< T2) MUST include Raj
      const e1Participants = determineExpenseEligibleParticipants(rajTimelineAfterSwitchOn, T1);
      expect(e1Participants.map((p) => p.userId)).toContain(3);

      // And expense E2 at T3 (> T2) continues to include Raj
      const e2Participants = determineExpenseEligibleParticipants(rajTimelineAfterSwitchOn, T3);
      expect(e2Participants.map((p) => p.userId)).toContain(3);

      // And expense E3 at T5 (> T4) includes Raj
      const e3Participants = determineExpenseEligibleParticipants(rajTimelineAfterSwitchOn, T5);
      expect(e3Participants.map((p) => p.userId)).toContain(3);
    });

    it("automatically removes member from historical expenses when Admin switches setting back to OFF without affecting expenses incurred while active", () => {
      const rajTimelineAfterSwitchOff: TimelineEntry[] = [
        {
          groupId: 10,
          userId: 3,
          participationMode: "excluded",
          effectiveFrom: T2,
          effectiveUntil: T4,
          reason: "initial_approval",
          redistributionVersion: 1,
        },
        {
          groupId: 10,
          userId: 3,
          participationMode: "included",
          effectiveFrom: T4,
          effectiveUntil: T6,
          reason: "mode_change",
          redistributionVersion: 2,
        },
        {
          groupId: 10,
          userId: 3,
          participationMode: "excluded",
          effectiveFrom: T6,
          effectiveUntil: null,
          reason: "mode_change",
          redistributionVersion: 3,
        },
      ];

      // Historical expense E1 at T1 (< T2): MUST exclude Raj again!
      const e1Participants = determineExpenseEligibleParticipants(rajTimelineAfterSwitchOff, T1);
      expect(e1Participants.map((p) => p.userId)).not.toContain(3);

      // Expense E2 at T3 (created while active after T2): Raj STILL participates!
      const e2Participants = determineExpenseEligibleParticipants(rajTimelineAfterSwitchOff, T3);
      expect(e2Participants.map((p) => p.userId)).toContain(3);

      // Expense E3 at T5 (created while active after T2): Raj STILL participates!
      const e3Participants = determineExpenseEligibleParticipants(rajTimelineAfterSwitchOff, T5);
      expect(e3Participants.map((p) => p.userId)).toContain(3);

      // Expense E4 at T7 (created while active after T2): Raj STILL participates!
      const e4Participants = determineExpenseEligibleParticipants(rajTimelineAfterSwitchOff, T7);
      expect(e4Participants.map((p) => p.userId)).toContain(3);
    });
  });

  // =========================================================================
  // FEATURE 5 & 6: FULL LEDGER REBUILD & AUTOMATIC RECALCULATION
  // =========================================================================
  describe("Features 5 & 6: Full Ledger Rebuild and Automatic Recalculation", () => {
    it("rebuilds entire ledger chronologically from oldest to latest transaction with paise-perfect balance equality", () => {
      const allMembers = [
        { userId: 1, name: "P1" },
        { userId: 2, name: "P2" },
        { userId: 3, name: "Raj" },
      ];

      // Scenario A: Raj is EXCLUDED from historical expenses (E1 = ₹900)
      // E1: P1 paid ₹900 (90000 paise) at T1. Only P1 and P2 participate (₹450 each).
      // E2: P2 paid ₹600 (60000 paise) at T3. P1, P2, and Raj participate (₹200 each).
      const splitsModeB = [
        // E1 splits
        { userId: 1, amountPaise: 45000 },
        { userId: 2, amountPaise: 45000 },
        // E2 splits
        { userId: 1, amountPaise: 20000 },
        { userId: 2, amountPaise: 20000 },
        { userId: 3, amountPaise: 20000 },
      ];

      const expenses = [
        { paidBy: 1, amountPaise: 90000 },
        { paidBy: 2, amountPaise: 60000 },
      ];

      const balancesModeB = calculateMemberNetBalances(allMembers, expenses, splitsModeB, []);
      // P1: paid 900, share 450 + 200 = 650 => net +250 (25000 paise)
      // P2: paid 600, share 450 + 200 = 650 => net -50 (-5000 paise)
      // Raj: paid 0, share 200 => net -200 (-20000 paise)
      expect(balancesModeB.find((b) => b.userId === 1)!.amount).toBe(25000);
      expect(balancesModeB.find((b) => b.userId === 2)!.amount).toBe(-5000);
      expect(balancesModeB.find((b) => b.userId === 3)!.amount).toBe(-20000);

      // Check integrity: sum of net balances MUST be exactly 0
      const integrityB = validateIntegrity(150000, 150000, balancesModeB, [{ amount: 25000 }]);
      expect(integrityB.isValid).toBe(true);

      // Now Admin changes Raj to Include Previous Expenses = ON (Mode A).
      // Chronological rebuild recalculates E1 across P1, P2, and Raj (₹300 each).
      const splitsModeA = [
        // E1 splits (rebuilt to include Raj!)
        { userId: 1, amountPaise: 30000 },
        { userId: 2, amountPaise: 30000 },
        { userId: 3, amountPaise: 30000 },
        // E2 splits
        { userId: 1, amountPaise: 20000 },
        { userId: 2, amountPaise: 20000 },
        { userId: 3, amountPaise: 20000 },
      ];

      const balancesModeA = calculateMemberNetBalances(allMembers, expenses, splitsModeA, []);
      // P1: paid 900, share 300 + 200 = 500 => net +400 (40000 paise)
      // P2: paid 600, share 300 + 200 = 500 => net +100 (10000 paise)
      // Raj: paid 0, share 300 + 200 = 500 => net -500 (-50000 paise)
      expect(balancesModeA.find((b) => b.userId === 1)!.amount).toBe(40000);
      expect(balancesModeA.find((b) => b.userId === 2)!.amount).toBe(10000);
      expect(balancesModeA.find((b) => b.userId === 3)!.amount).toBe(-50000);

      // Optimal settlement suggestions generated for Mode A:
      const settlementsModeA = calculateOptimalSettlements(balancesModeA, "INR");
      expect(settlementsModeA).toHaveLength(2);
      // Raj owes P1 ₹400 and Raj owes P2 ₹100
      expect(settlementsModeA.find((s) => s.toUserId === 1)!.amount).toBe(40000);
      expect(settlementsModeA.find((s) => s.toUserId === 2)!.amount).toBe(10000);

      const integrityA = validateIntegrity(150000, 150000, balancesModeA, settlementsModeA);
      expect(integrityA.isValid).toBe(true);
    });
  });

  // =========================================================================
  // FEATURE 1 & 2: ADMIN EDIT AND DELETE ANY TRANSACTION
  // =========================================================================
  describe("Features 1 & 2: Admin Edit & Delete Transaction Recalculation", () => {
    it("recalculates all balances and debt optimization when a transaction is deleted", () => {
      const members = [
        { userId: 1, name: "P1" },
        { userId: 2, name: "P2" },
      ];

      // Initially 2 expenses: E1 (₹1000), E2 (₹400)
      const initialExpenses = [
        { paidBy: 1, amountPaise: 100000 },
        { paidBy: 2, amountPaise: 40000 },
      ];
      const initialSplits = [
        { userId: 1, amountPaise: 50000 },
        { userId: 2, amountPaise: 50000 },
        { userId: 1, amountPaise: 20000 },
        { userId: 2, amountPaise: 20000 },
      ];

      const initialBalances = calculateMemberNetBalances(members, initialExpenses, initialSplits, []);
      // P1: paid 1000, share 700 => net +300 (30000 paise)
      // P2: paid 400, share 700 => net -300 (-30000 paise)
      expect(initialBalances.find((b) => b.userId === 1)!.amount).toBe(30000);
      expect(initialBalances.find((b) => b.userId === 2)!.amount).toBe(-30000);

      // Admin deletes E1 (the ₹1000 expense)
      const afterDeleteExpenses = [{ paidBy: 2, amountPaise: 40000 }];
      const afterDeleteSplits = [
        { userId: 1, amountPaise: 20000 },
        { userId: 2, amountPaise: 20000 },
      ];

      const afterDeleteBalances = calculateMemberNetBalances(members, afterDeleteExpenses, afterDeleteSplits, []);
      // P1: paid 0, share 200 => net -200 (-20000 paise)
      // P2: paid 400, share 200 => net +200 (+20000 paise)
      expect(afterDeleteBalances.find((b) => b.userId === 1)!.amount).toBe(-20000);
      expect(afterDeleteBalances.find((b) => b.userId === 2)!.amount).toBe(20000);

      const afterDeleteSettlements = calculateOptimalSettlements(afterDeleteBalances, "INR");
      expect(afterDeleteSettlements).toHaveLength(1);
      expect(afterDeleteSettlements[0].fromUserId).toBe(1);
      expect(afterDeleteSettlements[0].toUserId).toBe(2);
      expect(afterDeleteSettlements[0].amount).toBe(20000);
    });

    it("detects split differences properly when an expense is updated", () => {
      const existingSplits = [
        { userId: 1, amount: 5000, splitMethod: "equal" },
        { userId: 2, amount: 5000, splitMethod: "equal" },
      ];

      const newSharesWithDifferentAmount = [
        { userId: 1, amountPaise: 6000 },
        { userId: 2, amountPaise: 6000 },
      ];

      expect(hasParticipantSetOrSharesChanged(existingSplits, newSharesWithDifferentAmount)).toBe(true);

      const newSharesIdentical = [
        { userId: 1, amountPaise: 5000 },
        { userId: 2, amountPaise: 5000 },
      ];

      expect(hasParticipantSetOrSharesChanged(existingSplits, newSharesIdentical)).toBe(false);
    });
  });

  // =========================================================================
  // FEATURE 10 & 13: NO DUPLICATE RECALCULATION & DRIFT PREVENTION
  // =========================================================================
  describe("Features 10 & 13: Integrity Invariants and Zero Calculation Drift", () => {
    it("guarantees sum of shares strictly equals total expense amount across odd division amounts", () => {
      // ₹100 split among 3 people: ₹33.34 + ₹33.33 + ₹33.33 = ₹100.00
      const participants: ParticipantKey[] = [{ userId: 1 }, { userId: 2 }, { userId: 3 }];
      const shares = calculateSharesForExpense(10000, participants);

      const sum = shares.reduce((acc, s) => acc + s.amountPaise, 0);
      expect(sum).toBe(10000);
      expect(shares[0].amountPaise).toBe(3334);
      expect(shares[1].amountPaise).toBe(3333);
      expect(shares[2].amountPaise).toBe(3333);
    });

    it("verifies double-entry invariant: sum of net positive balances strictly equals sum of net negative balances", () => {
      const balances: Balance[] = [
        { userId: 1, amount: 45000 },
        { userId: 2, amount: 15000 },
        { userId: 3, amount: -60000 },
      ];

      const integrity = validateIntegrity(60000, 60000, balances, [{ amount: 45000 }, { amount: 15000 }]);
      expect(integrity.isValid).toBe(true);
    });
  });
});

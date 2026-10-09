import { describe, it, expect } from "vitest";
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

describe("Expense Participation Timeline and Recalculation Engine", () => {
  // Helpers to create ISO dates for timeline steps
  const T0 = new Date("2026-01-01T10:00:00Z"); // Initial Group (P1, P2, P3)
  const T1 = new Date("2026-01-02T10:00:00Z"); // Expense E1
  const T2 = new Date("2026-01-03T10:00:00Z"); // P4 Joins (Mode A: Included)
  const T2_5 = new Date("2026-01-04T10:00:00Z"); // Expense E2
  const T3 = new Date("2026-01-05T10:00:00Z"); // P5 Joins (Mode B: Excluded / New Only)
  const T3_5 = new Date("2026-01-06T10:00:00Z"); // Expense E3
  const T4 = new Date("2026-01-07T10:00:00Z"); // P6 Joins (Mode B: Excluded / New Only)
  const T4_5 = new Date("2026-01-08T10:00:00Z"); // Expense E4
  const T5 = new Date("2026-01-09T10:00:00Z"); // Remove P6
  const T6 = new Date("2026-01-10T10:00:00Z"); // Remove P4

  // =========================================================================
  // SECTION 1, 2, 8: PARTICIPATION MODES & TIMELINE RULES
  // =========================================================================
  describe("Participation Modes and Timeline Evaluation", () => {
    it("Mode B (Start From New Expenses Only) member is excluded from older expenses and included only in future ones", () => {
      const p5Timeline: TimelineEntry[] = [
        {
          groupId: 1,
          userId: 5,
          participationMode: "excluded",
          effectiveFrom: T3,
          effectiveUntil: null,
          reason: "initial_approval",
          redistributionVersion: 1,
        },
      ];

      // E1 created at T1 (before T3): must NOT include P5
      const e1Participants = determineExpenseEligibleParticipants(p5Timeline, T1);
      expect(e1Participants.map((p) => p.userId)).not.toContain(5);

      // E2 created at T2_5 (before T3): must NOT include P5
      const e2Participants = determineExpenseEligibleParticipants(p5Timeline, T2_5);
      expect(e2Participants.map((p) => p.userId)).not.toContain(5);

      // E3 created at T3_5 (after T3): MUST include P5
      const e3Participants = determineExpenseEligibleParticipants(p5Timeline, T3_5);
      expect(e3Participants.map((p) => p.userId)).toContain(5);
    });

    it("Mode A (Included in Previous Expenses) member participates in both historical and future expenses", () => {
      const p4Timeline: TimelineEntry[] = [
        {
          groupId: 1,
          userId: 4,
          participationMode: "included",
          effectiveFrom: T2,
          effectiveUntil: null,
          reason: "initial_approval",
          redistributionVersion: 1,
        },
      ];

      // E1 created at T1 (before T2): MUST include active P4
      const e1Participants = determineExpenseEligibleParticipants(p4Timeline, T1);
      expect(e1Participants.map((p) => p.userId)).toContain(4);

      // E2 created at T2_5 (after T2): MUST include active P4
      const e2Participants = determineExpenseEligibleParticipants(p4Timeline, T2_5);
      expect(e2Participants.map((p) => p.userId)).toContain(4);
    });
  });

  // =========================================================================
  // SECTION 9: EXAMPLE SCENARIO PROGRESSION (P1..P6)
  // =========================================================================
  describe("Section 9: Example Scenario Progression", () => {
    // Timelines as of T4_5 when all P1..P6 are in the group
    const allTimelines: TimelineEntry[] = [
      { groupId: 1, userId: 1, participationMode: "included", effectiveFrom: T0, effectiveUntil: null, reason: "group_creation", redistributionVersion: 1 },
      { groupId: 1, userId: 2, participationMode: "included", effectiveFrom: T0, effectiveUntil: null, reason: "group_creation", redistributionVersion: 1 },
      { groupId: 1, userId: 3, participationMode: "included", effectiveFrom: T0, effectiveUntil: null, reason: "group_creation", redistributionVersion: 1 },
      { groupId: 1, userId: 4, participationMode: "included", effectiveFrom: T2, effectiveUntil: null, reason: "initial_approval", redistributionVersion: 1 },
      { groupId: 1, userId: 5, participationMode: "excluded", effectiveFrom: T3, effectiveUntil: null, reason: "initial_approval", redistributionVersion: 1 },
      { groupId: 1, userId: 6, participationMode: "excluded", effectiveFrom: T4, effectiveUntil: null, reason: "initial_approval", redistributionVersion: 1 },
    ];

    it("E1 (at T1) is distributed among Person 1, 2, 3, 4", () => {
      const participants = determineExpenseEligibleParticipants(allTimelines, T1);
      const userIds = participants.map((p) => p.userId).sort();
      expect(userIds).toEqual([1, 2, 3, 4]);
    });

    it("E2 (at T2.5) is distributed among Person 1, 2, 3, 4", () => {
      const participants = determineExpenseEligibleParticipants(allTimelines, T2_5);
      const userIds = participants.map((p) => p.userId).sort();
      expect(userIds).toEqual([1, 2, 3, 4]);
    });

    it("E3 (at T3.5) is distributed among Person 1, 2, 3, 4, 5", () => {
      const participants = determineExpenseEligibleParticipants(allTimelines, T3_5);
      const userIds = participants.map((p) => p.userId).sort();
      expect(userIds).toEqual([1, 2, 3, 4, 5]);
    });

    it("E4 (at T4.5) is distributed among Person 1, 2, 3, 4, 5, 6", () => {
      const participants = determineExpenseEligibleParticipants(allTimelines, T4_5);
      const userIds = participants.map((p) => p.userId).sort();
      expect(userIds).toEqual([1, 2, 3, 4, 5, 6]);
    });
  });

  // =========================================================================
  // SECTION 10: REMOVE PERSON 6 (MODE B MEMBER)
  // =========================================================================
  describe("Section 10: Remove Person 6 (Mode B Member)", () => {
    // Person 6 is removed at T5
    const timelinesAfterP6Removal: TimelineEntry[] = [
      { groupId: 1, userId: 1, participationMode: "included", effectiveFrom: T0, effectiveUntil: null, reason: "group_creation", redistributionVersion: 1 },
      { groupId: 1, userId: 2, participationMode: "included", effectiveFrom: T0, effectiveUntil: null, reason: "group_creation", redistributionVersion: 1 },
      { groupId: 1, userId: 3, participationMode: "included", effectiveFrom: T0, effectiveUntil: null, reason: "group_creation", redistributionVersion: 1 },
      { groupId: 1, userId: 4, participationMode: "included", effectiveFrom: T2, effectiveUntil: null, reason: "initial_approval", redistributionVersion: 1 },
      { groupId: 1, userId: 5, participationMode: "excluded", effectiveFrom: T3, effectiveUntil: null, reason: "initial_approval", redistributionVersion: 1 },
      { groupId: 1, userId: 6, participationMode: "excluded", effectiveFrom: T4, effectiveUntil: T5, reason: "member_removal", redistributionVersion: 2 },
    ];

    it("Historical expenses E1 and E2 remain strictly among Person 1, 2, 3, 4", () => {
      const e1Participants = determineExpenseEligibleParticipants(timelinesAfterP6Removal, T1);
      expect(e1Participants.map((p) => p.userId).sort()).toEqual([1, 2, 3, 4]);

      const e2Participants = determineExpenseEligibleParticipants(timelinesAfterP6Removal, T2_5);
      expect(e2Participants.map((p) => p.userId).sort()).toEqual([1, 2, 3, 4]);
    });

    it("Historical expense E3 remains strictly among Person 1, 2, 3, 4, 5", () => {
      const e3Participants = determineExpenseEligibleParticipants(timelinesAfterP6Removal, T3_5);
      expect(e3Participants.map((p) => p.userId).sort()).toEqual([1, 2, 3, 4, 5]);
    });

    it("Only future expense E4 is recalculated (among Person 1, 2, 3, 4, 5)", () => {
      const e4Participants = determineExpenseEligibleParticipants(timelinesAfterP6Removal, T4_5);
      expect(e4Participants.map((p) => p.userId).sort()).toEqual([1, 2, 3, 4, 5]);
      expect(e4Participants.map((p) => p.userId)).not.toContain(6);
    });
  });

  // =========================================================================
  // SECTION 11: REMOVE PERSON 4 (MODE A MEMBER)
  // =========================================================================
  describe("Section 11: Remove Person 4 (Mode A Member)", () => {
    // Person 4 is removed at T6
    const timelinesAfterP4Removal: TimelineEntry[] = [
      { groupId: 1, userId: 1, participationMode: "included", effectiveFrom: T0, effectiveUntil: null, reason: "group_creation", redistributionVersion: 1 },
      { groupId: 1, userId: 2, participationMode: "included", effectiveFrom: T0, effectiveUntil: null, reason: "group_creation", redistributionVersion: 1 },
      { groupId: 1, userId: 3, participationMode: "included", effectiveFrom: T0, effectiveUntil: null, reason: "group_creation", redistributionVersion: 1 },
      { groupId: 1, userId: 4, participationMode: "included", effectiveFrom: T2, effectiveUntil: T6, reason: "member_removal", redistributionVersion: 2 },
      { groupId: 1, userId: 5, participationMode: "excluded", effectiveFrom: T3, effectiveUntil: null, reason: "initial_approval", redistributionVersion: 1 },
      { groupId: 1, userId: 6, participationMode: "excluded", effectiveFrom: T4, effectiveUntil: T5, reason: "member_removal", redistributionVersion: 2 },
    ];

    it("Historical expense E1 automatically reverts to Person 1, Person 2, Person 3", () => {
      const e1Participants = determineExpenseEligibleParticipants(timelinesAfterP4Removal, T1);
      const userIds = e1Participants.map((p) => p.userId).sort();
      expect(userIds).toEqual([1, 2, 3]);
      expect(userIds).not.toContain(4);
    });

    it("Expense E2 (created while P4 was active) is recalculated among remaining participants (P1, P2, P3)", () => {
      const e2Participants = determineExpenseEligibleParticipants(timelinesAfterP4Removal, T2_5);
      const userIds = e2Participants.map((p) => p.userId).sort();
      expect(userIds).toEqual([1, 2, 3]);
      expect(userIds).not.toContain(4);
    });

    it("Expense E3 is recalculated among remaining participants (P1, P2, P3, P5)", () => {
      const e3Participants = determineExpenseEligibleParticipants(timelinesAfterP4Removal, T3_5);
      const userIds = e3Participants.map((p) => p.userId).sort();
      expect(userIds).toEqual([1, 2, 3, 5]);
      expect(userIds).not.toContain(4);
    });

    it("Expense E4 is recalculated among remaining participants (P1, P2, P3, P5)", () => {
      const e4Participants = determineExpenseEligibleParticipants(timelinesAfterP4Removal, T4_5);
      const userIds = e4Participants.map((p) => p.userId).sort();
      expect(userIds).toEqual([1, 2, 3, 5]);
      expect(userIds).not.toContain(4);
      expect(userIds).not.toContain(6);
    });
  });

  // =========================================================================
  // SECTION 13 & 14: SETTLEMENT PRESERVATION & NET BALANCE CALCULATIONS
  // =========================================================================
  describe("Section 13 & 14: Completed Settlement Preservation and Crediting", () => {
    it("preserves completed settlements and credits paid amounts toward net outstanding balances", () => {
      const members = [
        { userId: 1, name: "P1" },
        { userId: 2, name: "P2" },
      ];

      // E1: P1 paid ₹1000 (100000 paise). Split equally: P1 share ₹500, P2 share ₹500.
      const expenses = [{ paidBy: 1, amountPaise: 100000 }];
      const splits = [
        { userId: 1, amountPaise: 50000 },
        { userId: 2, amountPaise: 50000 },
      ];

      // Without any settlements: P1 net = +50000, P2 net = -50000
      const initialBalances = calculateMemberNetBalances(members, expenses, splits, []);
      const p1Initial = initialBalances.find((b) => b.userId === 1)!.amount;
      const p2Initial = initialBalances.find((b) => b.userId === 2)!.amount;
      expect(p1Initial).toBe(50000);
      expect(p2Initial).toBe(-50000);

      // Now suppose P2 paid a settlement of ₹300 (30000 paise) offline, which was completed
      const completedSettlements = [
        { fromUserId: 2, toUserId: 1, amountPaise: 30000 },
      ];

      const creditedBalances = calculateMemberNetBalances(
        members,
        expenses,
        splits,
        completedSettlements
      );

      const p1Credited = creditedBalances.find((b) => b.userId === 1)!.amount;
      const p2Credited = creditedBalances.find((b) => b.userId === 2)!.amount;

      // P1 was owed 500, received 300 => now owed remaining 200 (20000 paise)
      expect(p1Credited).toBe(20000);
      // P2 owed 500, paid 300 => now owes remaining 200 (-20000 paise)
      expect(p2Credited).toBe(-20000);

      // Pending settlements generated should be ONLY the remaining ₹200 (20000 paise)
      const pendingSettlements = calculateOptimalSettlements(creditedBalances, "INR");
      expect(pendingSettlements).toHaveLength(1);
      expect(pendingSettlements[0].fromUserId).toBe(2);
      expect(pendingSettlements[0].toUserId).toBe(1);
      expect(pendingSettlements[0].amount).toBe(20000);
    });
  });

  // =========================================================================
  // SECTION 17: MATHEMATICAL INVARIANTS & INTEGRITY VERIFICATION
  // =========================================================================
  describe("Section 17: Integrity Verification Invariants", () => {
    it("guarantees sum of shares equals total expense amount down to the paise", () => {
      const oddAmountPaise = 100001; // ₹1000.01
      const participants: ParticipantKey[] = [{ userId: 1 }, { userId: 2 }, { userId: 3 }];

      const shares = calculateSharesForExpense(oddAmountPaise, participants);
      const totalShares = shares.reduce((sum, s) => sum + s.amountPaise, 0);

      expect(totalShares).toBe(oddAmountPaise);
      expect(shares[0].amountPaise).toBe(33334);
      expect(shares[1].amountPaise).toBe(33334);
      expect(shares[2].amountPaise).toBe(33333);
    });

    it("guarantees sum of net balances is zero and total payable equals total receivable", () => {
      const members = [
        { userId: 1, name: "P1" },
        { userId: 2, name: "P2" },
        { userId: 3, name: "P3" },
      ];

      const expenses = [
        { paidBy: 1, amountPaise: 300000 }, // P1 paid 3000
        { paidBy: 2, amountPaise: 150000 }, // P2 paid 1500
      ];

      const splits = [
        { userId: 1, amountPaise: 150000 },
        { userId: 2, amountPaise: 150000 },
        { userId: 3, amountPaise: 150000 },
      ];

      const completed = [{ fromUserId: 3, toUserId: 1, amountPaise: 50000 }];

      const balances = calculateMemberNetBalances(members, expenses, splits, completed);
      const optimal = calculateOptimalSettlements(balances, "INR");

      const check = validateIntegrity(450000, 450000, balances, optimal);
      expect(check.isValid).toBe(true);

      const netSum = balances.reduce((sum, b) => sum + b.amount, 0);
      expect(netSum).toBe(0);
    });
  });

  // =========================================================================
  // SECTION 18: DIFF-BASED SPLIT DETECTION & PRESERVATION
  // =========================================================================
  describe("Section 18: Diff-Based Split Detection & Unaffected Expense Preservation", () => {
    it("detects no change when participant set and share amounts match existing splits", () => {
      const existingSplits = [
        { userId: 1, contactId: null, amount: 5000 },
        { userId: 2, contactId: null, amount: 5000 },
      ];
      const calculatedShares = [
        { userId: 1, amountPaise: 5000 },
        { userId: 2, amountPaise: 5000 },
      ];

      const changed = hasParticipantSetOrSharesChanged(existingSplits, calculatedShares);
      expect(changed).toBe(false);
    });

    it("detects change when a participant is added or removed", () => {
      // Prior splits had P1, P2, P4
      const existingSplits = [
        { userId: 1, contactId: null, amount: 3334 },
        { userId: 2, contactId: null, amount: 3333 },
        { userId: 4, contactId: null, amount: 3333 },
      ];
      // P4 removed, so recalculated shares are only P1, P2
      const calculatedShares = [
        { userId: 1, amountPaise: 5000 },
        { userId: 2, amountPaise: 5000 },
      ];

      const changed = hasParticipantSetOrSharesChanged(existingSplits, calculatedShares);
      expect(changed).toBe(true);
    });

    it("detects change when member shares change due to amount or distribution shifts", () => {
      const existingSplits = [
        { userId: 1, contactId: null, amount: 4000 },
        { userId: 2, contactId: null, amount: 6000 },
      ];
      const calculatedShares = [
        { userId: 1, amountPaise: 5000 },
        { userId: 2, amountPaise: 5000 },
      ];

      const changed = hasParticipantSetOrSharesChanged(existingSplits, calculatedShares);
      expect(changed).toBe(true);
    });
  });
});


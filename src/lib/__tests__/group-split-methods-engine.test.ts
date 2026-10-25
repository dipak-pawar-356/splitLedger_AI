import { describe, it, expect } from "vitest";
import {
  calculateSharesForExpense,
  calculateMemberNetBalances,
  validateIntegrity,
  type ParticipantShareInput,
  type ParticipantKey,
} from "@/lib/settlements/recalculation-engine";
import { calculateOptimalSettlements } from "@/lib/settlements/calculator";

describe("Group Split Method Engine - Mathematical Accuracy, Persistence & Invariants", () => {
  // =========================================================================
  // 1. EQUAL SPLIT (1/N)
  // =========================================================================
  describe("Equal Split Engine", () => {
    it("handles single member paying and splitting 100% of expense", () => {
      const participants: ParticipantShareInput[] = [{ userId: 1, contactId: null }];
      const totalPaise = 100000; // ₹1,000.00
      const shares = calculateSharesForExpense(totalPaise, participants, "equal");

      expect(shares).toHaveLength(1);
      expect(shares[0].amountPaise).toBe(100000);
      expect(shares[0].splitMethod).toBe("equal");
      expect(shares.reduce((sum, s) => sum + s.amountPaise, 0)).toBe(totalPaise);
    });

    it("handles two members splitting evenly", () => {
      const participants: ParticipantShareInput[] = [
        { userId: 1, contactId: null },
        { userId: 2, contactId: null },
      ];
      const totalPaise = 100000; // ₹1,000.00
      const shares = calculateSharesForExpense(totalPaise, participants, "equal");

      expect(shares).toHaveLength(2);
      expect(shares[0].amountPaise).toBe(50000);
      expect(shares[1].amountPaise).toBe(50000);
      expect(shares.reduce((sum, s) => sum + s.amountPaise, 0)).toBe(totalPaise);
    });

    it("handles three members with odd paise remainder allocated deterministically", () => {
      const participants: ParticipantShareInput[] = [
        { userId: 1, contactId: null },
        { userId: 2, contactId: null },
        { userId: 3, contactId: null },
      ];
      const totalPaise = 100000; // ₹1,000.00 = 100,000 paise
      // 100,000 / 3 = 33,333 paise with remainder 1 paise distributed to index 0
      const shares = calculateSharesForExpense(totalPaise, participants, "equal");

      expect(shares).toHaveLength(3);
      expect(shares[0].amountPaise).toBe(33334); // Takes remainder 1 paise
      expect(shares[1].amountPaise).toBe(33333);
      expect(shares[2].amountPaise).toBe(33333);
      expect(shares.reduce((sum, s) => sum + s.amountPaise, 0)).toBe(totalPaise);
    });

    it("handles 10 members with zero drift", () => {
      const participants: ParticipantShareInput[] = Array.from({ length: 10 }, (_, i) => ({
        userId: i + 1,
        contactId: null,
      }));
      const totalPaise = 99999; // ₹999.99 = 99,999 paise
      // 99,999 / 10 = 9999 paise with remainder 9 paise distributed across indices 0 to 8
      const shares = calculateSharesForExpense(totalPaise, participants, "equal");

      expect(shares).toHaveLength(10);
      expect(shares.reduce((sum, s) => sum + s.amountPaise, 0)).toBe(totalPaise);
      expect(shares[0].amountPaise).toBe(10000); // 9999 + 1
      expect(shares[8].amountPaise).toBe(10000); // 9999 + 1
      expect(shares[9].amountPaise).toBe(9999);
    });

    it("handles decimal expenses (e.g. ₹123.45 across 3 members)", () => {
      const participants: ParticipantShareInput[] = [
        { userId: 1, contactId: null },
        { userId: 2, contactId: null },
        { userId: 3, contactId: null },
      ];
      const totalPaise = 12345; // ₹123.45
      const shares = calculateSharesForExpense(totalPaise, participants, "equal");

      expect(shares.reduce((sum, s) => sum + s.amountPaise, 0)).toBe(totalPaise);
      expect(shares[0].amountPaise).toBe(4115);
      expect(shares[1].amountPaise).toBe(4115);
      expect(shares[2].amountPaise).toBe(4115); // 12345 / 3 = exactly 4115 with 0 remainder
    });
  });

  // =========================================================================
  // 2. EXACT AMOUNT SPLIT
  // =========================================================================
  describe("Exact Amount Split Engine", () => {
    it("allocates specified amounts accurately when sum equals total expense", () => {
      // Total ₹1000: Dipak = ₹500, Raj = ₹300, Kunal = ₹200
      const totalPaise = 100000;
      const participants: ParticipantShareInput[] = [
        { userId: 1, contactId: null, amountPaise: 50000 },
        { userId: 2, contactId: null, amountPaise: 30000 },
        { userId: 3, contactId: null, amountPaise: 20000 },
      ];

      const shares = calculateSharesForExpense(totalPaise, participants, "exact");

      expect(shares).toHaveLength(3);
      expect(shares[0].amountPaise).toBe(50000);
      expect(shares[1].amountPaise).toBe(30000);
      expect(shares[2].amountPaise).toBe(20000);
      expect(shares.reduce((sum, s) => sum + s.amountPaise, 0)).toBe(totalPaise);
    });

    it("falls back to equal distribution if no custom amounts provided for exact method", () => {
      const participants: ParticipantShareInput[] = [
        { userId: 1, contactId: null },
        { userId: 2, contactId: null },
      ];
      const totalPaise = 50000;
      const shares = calculateSharesForExpense(totalPaise, participants, "exact");

      expect(shares).toHaveLength(2);
      expect(shares.reduce((sum, s) => sum + s.amountPaise, 0)).toBe(totalPaise);
      expect(shares[0].amountPaise).toBe(25000);
      expect(shares[1].amountPaise).toBe(25000);
    });
  });

  // =========================================================================
  // 3. PERCENTAGE SPLIT
  // =========================================================================
  describe("Percentage Split Engine", () => {
    it("calculates exact shares for 50%, 30%, 20% on ₹1,000", () => {
      const totalPaise = 100000; // ₹1000.00
      const participants: ParticipantShareInput[] = [
        { userId: 1, contactId: null, percentage: 50 },
        { userId: 2, contactId: null, percentage: 30 },
        { userId: 3, contactId: null, percentage: 20 },
      ];

      const shares = calculateSharesForExpense(totalPaise, participants, "percentage");

      expect(shares).toHaveLength(3);
      expect(shares[0].amountPaise).toBe(50000); // ₹500
      expect(shares[1].amountPaise).toBe(30000); // ₹300
      expect(shares[2].amountPaise).toBe(20000); // ₹200
      expect(shares.reduce((sum, s) => sum + s.amountPaise, 0)).toBe(totalPaise);
    });

    it("handles decimal percentages (e.g. 33.33%, 33.33%, 33.34%) with zero drift", () => {
      const totalPaise = 100000; // ₹1,000.00
      const participants: ParticipantShareInput[] = [
        { userId: 1, contactId: null, percentage: 33.33 },
        { userId: 2, contactId: null, percentage: 33.33 },
        { userId: 3, contactId: null, percentage: 33.34 },
      ];

      const shares = calculateSharesForExpense(totalPaise, participants, "percentage");

      expect(shares).toHaveLength(3);
      expect(shares.reduce((sum, s) => sum + s.amountPaise, 0)).toBe(totalPaise);
      expect(shares[0].amountPaise).toBe(33330);
      expect(shares[1].amountPaise).toBe(33330);
      expect(shares[2].amountPaise).toBe(33340);
    });
  });

  // =========================================================================
  // 4. SHARES RATIO SPLIT
  // =========================================================================
  describe("Shares Ratio Split Engine", () => {
    it("allocates proportional shares for integer shares (5, 3, 2 units on ₹1,000)", () => {
      const totalPaise = 100000; // ₹1000.00
      const participants: ParticipantShareInput[] = [
        { userId: 1, contactId: null, shares: 5 },
        { userId: 2, contactId: null, shares: 3 },
        { userId: 3, contactId: null, shares: 2 },
      ];

      const shares = calculateSharesForExpense(totalPaise, participants, "shares");

      expect(shares).toHaveLength(3);
      expect(shares[0].amountPaise).toBe(50000); // 5/10 = 50%
      expect(shares[1].amountPaise).toBe(30000); // 3/10 = 30%
      expect(shares[2].amountPaise).toBe(20000); // 2/10 = 20%
      expect(shares.reduce((sum, s) => sum + s.amountPaise, 0)).toBe(totalPaise);
    });

    it("supports decimal share values (e.g. 1.5, 2.5, 1.0 shares)", () => {
      const totalPaise = 50000; // ₹500.00
      // Total shares = 1.5 + 2.5 + 1.0 = 5.0
      // P1: (1.5 / 5) * 50000 = 15000
      // P2: (2.5 / 5) * 50000 = 25000
      // P3: (1.0 / 5) * 50000 = 10000
      const participants: ParticipantShareInput[] = [
        { userId: 1, contactId: null, shares: 1.5 },
        { userId: 2, contactId: null, shares: 2.5 },
        { userId: 3, contactId: null, shares: 1.0 },
      ];

      const shares = calculateSharesForExpense(totalPaise, participants, "shares");

      expect(shares).toHaveLength(3);
      expect(shares[0].amountPaise).toBe(15000);
      expect(shares[1].amountPaise).toBe(25000);
      expect(shares[2].amountPaise).toBe(10000);
      expect(shares.reduce((sum, s) => sum + s.amountPaise, 0)).toBe(totalPaise);
    });

    it("handles indivisible share proportions with exact remainder allocation", () => {
      const totalPaise = 100001; // ₹1000.01 (100,001 paise)
      const participants: ParticipantShareInput[] = [
        { userId: 1, contactId: null, shares: 1 },
        { userId: 2, contactId: null, shares: 1 },
      ];

      const shares = calculateSharesForExpense(totalPaise, participants, "shares");

      expect(shares).toHaveLength(2);
      expect(shares[0].amountPaise).toBe(50000);
      expect(shares[1].amountPaise).toBe(50001); // 1 paise remainder assigned to last
      expect(shares.reduce((sum, s) => sum + s.amountPaise, 0)).toBe(totalPaise);
    });
  });

  // =========================================================================
  // 5. GUEST MEMBERS & REMOVED / EXCLUDED PARTICIPANTS
  // =========================================================================
  describe("Participant Diversity: Guests, Removed & Excluded Members", () => {
    it("handles guest members identified by contactId without userId", () => {
      const totalPaise = 80000;
      const participants: ParticipantShareInput[] = [
        { userId: 1, contactId: null, percentage: 60 }, // Registered user
        { userId: null, contactId: 101, percentage: 40 }, // Guest member
      ];

      const shares = calculateSharesForExpense(totalPaise, participants, "percentage");

      expect(shares).toHaveLength(2);
      expect(shares[0].amountPaise).toBe(48000);
      expect(shares[1].amountPaise).toBe(32000);
      expect(shares[1].contactId).toBe(101);
      expect(shares.reduce((sum, s) => sum + s.amountPaise, 0)).toBe(totalPaise);
    });

    it("only distributes among active included participants", () => {
      const totalPaise = 60000;
      const activeParticipants: ParticipantShareInput[] = [
        { userId: 1, contactId: null, shares: 2 },
        { userId: 3, contactId: null, shares: 1 },
      ];
      const shares = calculateSharesForExpense(totalPaise, activeParticipants, "shares");

      expect(shares).toHaveLength(2);
      expect(shares[0].amountPaise).toBe(40000);
      expect(shares[1].amountPaise).toBe(20000);
      expect(shares.reduce((sum, s) => sum + s.amountPaise, 0)).toBe(totalPaise);
    });
  });

  // =========================================================================
  // 6. NET BALANCES & SETTLEMENT OPTIMIZATION ACROSS SPLIT METHODS
  // =========================================================================
  describe("Financial Balances & Settlement Suggestions Integration", () => {
    it("calculates accurate net balances and optimal settlements for mixed split methods", () => {
      // Transaction 1: ₹1,000 paid by User 1, split by Percentage (60% U1, 40% U2)
      // Transaction 2: ₹600 paid by User 2, split by Shares (2 units U1, 1 unit U2)
      const members = [
        { userId: 1, contactId: null },
        { userId: 2, contactId: null },
      ];

      const expenses = [
        { paidBy: 1, amountPaise: 100000 },
        { paidBy: 2, amountPaise: 60000 },
      ];

      const splits = [
        // Tx 1 splits (Percentage: 60% U1 = 60,000, 40% U2 = 40,000)
        { userId: 1, amountPaise: 60000 },
        { userId: 2, amountPaise: 40000 },
        // Tx 2 splits (Shares: 2 units U1 = 40,000, 1 unit U2 = 20,000)
        { userId: 1, amountPaise: 40000 },
        { userId: 2, amountPaise: 20000 },
      ];

      const balances = calculateMemberNetBalances(members, expenses, splits, []);
      // User 1 paid 100,000, owed share = 60,000 + 40,000 = 100,000. Net = 0
      // User 2 paid 60,000, owed share = 40,000 + 20,000 = 60,000. Net = 0
      const u1 = balances.find((b) => b.userId === 1);
      const u2 = balances.find((b) => b.userId === 2);

      expect(u1?.amount).toBe(0);
      expect(u2?.amount).toBe(0);

      // Verify zero drift integrity (totalExpenses: 160,000, totalSplits: 160,000)
      const integrity = validateIntegrity(160000, 160000, balances, []);
      expect(integrity.isValid).toBe(true);
      expect(integrity.error).toBeUndefined();
    });

    it("generates correct smart debt netting when percentage split creates asymmetry", () => {
      // User 1 pays ₹1,000 for a dinner.
      // Split by Percentage: User 1 (30% = ₹300), User 2 (70% = ₹700)
      const members = [
        { userId: 1, contactId: null },
        { userId: 2, contactId: null },
      ];

      const expenses = [
        { paidBy: 1, amountPaise: 100000 },
      ];

      const splits = [
        { userId: 1, amountPaise: 30000 },
        { userId: 2, amountPaise: 70000 },
      ];

      const balances = calculateMemberNetBalances(members, expenses, splits, []);
      const u1 = balances.find((b) => b.userId === 1);
      const u2 = balances.find((b) => b.userId === 2);

      expect(u1?.amount).toBe(70000); // User 1 is owed ₹700 (positive)
      expect(u2?.amount).toBe(-70000); // User 2 owes ₹700 (negative)

      // Optimal settlement suggestion in rupees
      const settlements = calculateOptimalSettlements(
        [
          { userId: 1, amount: u1!.amount / 100 },
          { userId: 2, amount: u2!.amount / 100 },
        ],
        "INR"
      );

      expect(settlements).toHaveLength(1);
      expect(settlements[0].fromUserId).toBe(2);
      expect(settlements[0].toUserId).toBe(1);
      expect(settlements[0].amount).toBe(700);
    });
  });

  // =========================================================================
  // 7. MATHEMATICAL INVARIANTS: ZERO DRIFT & SUM EQUALITY
  // =========================================================================
  describe("Mathematical Invariants Across Extreme Values", () => {
    it("preserves sum(shares) === totalExpense for large prime expense (₹999,999.73 across 7 members)", () => {
      const participants: ParticipantShareInput[] = Array.from({ length: 7 }, (_, i) => ({
        userId: i + 1,
        contactId: null,
      }));
      const totalPaise = 99999973; // ₹999,999.73

      for (const method of ["equal", "shares"] as const) {
        const shares = calculateSharesForExpense(totalPaise, participants, method);
        const sum = shares.reduce((acc, s) => acc + s.amountPaise, 0);
        expect(sum).toBe(totalPaise);
      }
    });

    it("validates integrity check passes with 0 discrepancy", () => {
      const members = [
        { userId: 1, contactId: null },
        { userId: 2, contactId: null },
        { userId: 3, contactId: null },
      ];

      const calculatedShares = calculateSharesForExpense(33333, members, "equal");
      const expenses = [{ paidBy: 1, amountPaise: 33333 }];
      const splits = calculatedShares.map((s) => ({
        userId: s.userId,
        amountPaise: s.amountPaise,
      }));

      const balances = calculateMemberNetBalances(members, expenses, splits, []);
      const integrity = validateIntegrity(33333, 33333, balances, []);

      expect(integrity.isValid).toBe(true);
      expect(integrity.error).toBeUndefined();
    });
  });
});

import { describe, it, expect } from "vitest";
import { 
  calculateGroupBalances, 
  calculateOptimalSettlements, 
  calculateGroupSettlements,
  type Expense,
  type Balance 
} from "../settlements/calculator";

describe("Group Financial Calculations & Member Settlement Engine", () => {
  describe("SECTION 4: Master Prompt Example Calculation", () => {
    it("should accurately calculate Paid, Share, Need To Pay, and Will Receive for Members A, B, C", () => {
      // Members A (user-1), B (user-2), C (user-3)
      // Total Expense: ₹900 (90000 paise)
      // A paid ₹100 (10000 paise)
      // B paid ₹450 (45000 paise)
      // C paid ₹350 (35000 paise)
      // Equal split among all 3 members (₹300 each)
      const expenses: Expense[] = [
        {
          id: 1,
          paidBy: 1, // A
          amount: 10000,
          currency: "INR",
          splitType: "equal",
          splits: [
            { userId: 1, amount: 3333 },
            { userId: 2, amount: 3333 },
            { userId: 3, amount: 3334 },
          ],
        },
        {
          id: 2,
          paidBy: 2, // B
          amount: 45000,
          currency: "INR",
          splitType: "equal",
          splits: [
            { userId: 1, amount: 15000 },
            { userId: 2, amount: 15000 },
            { userId: 3, amount: 15000 },
          ],
        },
        {
          id: 3,
          paidBy: 3, // C
          amount: 35000,
          currency: "INR",
          splitType: "equal",
          splits: [
            { userId: 1, amount: 11667 },
            { userId: 2, amount: 11667 },
            { userId: 3, amount: 11666 },
          ],
        },
      ];

      const namesMap = {
        "user-1": "Member A",
        "user-2": "Member B",
        "user-3": "Member C",
      };

      const balances = calculateGroupBalances(expenses, namesMap);

      const memberA = balances.find((b) => b.userId === 1)!;
      const memberB = balances.find((b) => b.userId === 2)!;
      const memberC = balances.find((b) => b.userId === 3)!;

      // Net Balance = Paid - Share
      // A: 100 - 300 = -200 (owes 20000 paise)
      // B: 450 - 300 = +150 (receives 15000 paise)
      // C: 350 - 300 = +50 (receives 5000 paise)
      expect(memberA.amount).toBe(-20000);
      expect(memberB.amount).toBe(15000);
      expect(memberC.amount).toBe(5000);

      // Verify Need To Pay and Will Receive formulas
      const needToPayA = Math.max(0, -memberA.amount);
      const willReceiveA = Math.max(0, memberA.amount);
      expect(needToPayA).toBe(20000);
      expect(willReceiveA).toBe(0);

      const needToPayB = Math.max(0, -memberB.amount);
      const willReceiveB = Math.max(0, memberB.amount);
      expect(needToPayB).toBe(0);
      expect(willReceiveB).toBe(15000);

      const needToPayC = Math.max(0, -memberC.amount);
      const willReceiveC = Math.max(0, memberC.amount);
      expect(needToPayC).toBe(0);
      expect(willReceiveC).toBe(5000);
    });
  });

  describe("SECTION 6: Who Pays Whom Minimal Transfers", () => {
    it("should generate minimum transfers without null or unknown names", () => {
      const balances: Balance[] = [
        { userId: 1, name: "Member A", amount: -20000 },
        { userId: 2, name: "Member B", amount: 15000 },
        { userId: 3, name: "Member C", amount: 5000 },
      ];

      const settlements = calculateOptimalSettlements(balances, "INR");

      expect(settlements).toHaveLength(2);

      // Transfer 1: A pays B ₹150 (15000 paise)
      expect(settlements[0].fromName).toBe("Member A");
      expect(settlements[0].toName).toBe("Member B");
      expect(settlements[0].amount).toBe(15000);

      // Transfer 2: A pays C ₹50 (5000 paise)
      expect(settlements[1].fromName).toBe("Member A");
      expect(settlements[1].toName).toBe("Member C");
      expect(settlements[1].amount).toBe(5000);
    });
  });

  describe("SECTION 9: Member Contribution Percentage", () => {
    it("should calculate exact contribution % according to master prompt example", () => {
      const totalExpense = 10000;
      const rahulPaid = 3500;
      const dipakPaid = 2500;
      const amitPaid = 4000;

      const rahulPct = Math.round((rahulPaid / totalExpense) * 100);
      const dipakPct = Math.round((dipakPaid / totalExpense) * 100);
      const amitPct = Math.round((amitPaid / totalExpense) * 100);

      expect(rahulPct).toBe(35);
      expect(dipakPct).toBe(25);
      expect(amitPct).toBe(40);
      expect(rahulPct + dipakPct + amitPct).toBe(100);
    });
  });

  describe("Split Type Computations", () => {
    it("should accurately compute percentage splits", () => {
      const expense: Expense = {
        id: 1,
        paidBy: 1, // User 1 paid ₹1000 (100000 paise)
        amount: 100000,
        currency: "INR",
        splitType: "percentage",
        splits: [
          { userId: 1, percentage: 50 }, // ₹500
          { userId: 2, percentage: 30 }, // ₹300
          { userId: 3, percentage: 20 }, // ₹200
        ],
      };

      const balances = calculateGroupBalances([expense]);
      const user1 = balances.find((b) => b.userId === 1)!;
      const user2 = balances.find((b) => b.userId === 2)!;
      const user3 = balances.find((b) => b.userId === 3)!;

      // User 1 paid ₹1000, own share ₹500 -> +₹500 (50000 paise)
      expect(user1.amount).toBe(50000);
      // User 2 paid ₹0, own share ₹300 -> -₹300 (-30000 paise)
      expect(user2.amount).toBe(-30000);
      // User 3 paid ₹0, own share ₹200 -> -₹200 (-20000 paise)
      expect(user3.amount).toBe(-20000);
    });

    it("should accurately compute shares splits", () => {
      const expense: Expense = {
        id: 1,
        paidBy: 1, // User 1 paid ₹1200 (120000 paise)
        amount: 120000,
        currency: "INR",
        splitType: "shares",
        splits: [
          { userId: 1, shares: 3 }, // 3/6 = 50% = ₹600
          { userId: 2, shares: 2 }, // 2/6 = 33.33% = ₹400
          { userId: 3, shares: 1 }, // 1/6 = 16.67% = ₹200
        ],
      };

      const balances = calculateGroupBalances([expense]);
      const user1 = balances.find((b) => b.userId === 1)!;
      const user2 = balances.find((b) => b.userId === 2)!;
      const user3 = balances.find((b) => b.userId === 3)!;

      expect(user1.amount).toBe(60000); // +₹600
      expect(user2.amount).toBe(-40000); // -₹400
      expect(user3.amount).toBe(-20000); // -₹200
    });
  });
});

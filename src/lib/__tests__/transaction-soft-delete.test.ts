import { describe, it, expect } from "vitest";
import { calculateGroupBalances, type Expense } from "../settlements/calculator";

describe("Transaction Soft-Delete & Balance Recalculation", () => {
  it("should exclude soft-deleted transactions from group balance calculations", () => {
    const expenses: Expense[] = [
      {
        id: 1,
        paidBy: 101,
        amount: 300,
        currency: "INR",
        splitType: "equal",
        isDeleted: false,
        splits: [
          { userId: 101, amount: 100 },
          { userId: 102, amount: 100 },
          { userId: 103, amount: 100 },
        ],
      },
      {
        id: 2,
        paidBy: 102,
        amount: 150,
        currency: "INR",
        splitType: "equal",
        isDeleted: true, // This transaction is soft-deleted
        splits: [
          { userId: 101, amount: 50 },
          { userId: 102, amount: 50 },
          { userId: 103, amount: 50 },
        ],
      },
    ];

    const balances = calculateGroupBalances(expenses);

    // User 101 paid ₹300 for 3 people (their share is ₹100, others owe them ₹200)
    // Expense 2 is deleted, so it must not affect any balance!
    const user101 = balances.find((b) => b.userId === 101);
    const user102 = balances.find((b) => b.userId === 102);
    const user103 = balances.find((b) => b.userId === 103);

    expect(user101?.amount).toBe(200); // 300 - 100 = +200
    expect(user102?.amount).toBe(-100); // -100
    expect(user103?.amount).toBe(-100); // -100
  });

  it("should instantly include restored transactions upon restoration", () => {
    const expenses: Expense[] = [
      {
        id: 1,
        paidBy: 101,
        amount: 300,
        currency: "INR",
        splitType: "equal",
        isDeleted: false,
        splits: [
          { userId: 101, amount: 100 },
          { userId: 102, amount: 100 },
          { userId: 103, amount: 100 },
        ],
      },
      {
        id: 2,
        paidBy: 102,
        amount: 150,
        currency: "INR",
        splitType: "equal",
        isDeleted: false, // Restored!
        splits: [
          { userId: 101, amount: 50 },
          { userId: 102, amount: 50 },
          { userId: 103, amount: 50 },
        ],
      },
    ];

    const balances = calculateGroupBalances(expenses);

    const user101 = balances.find((b) => b.userId === 101);
    const user102 = balances.find((b) => b.userId === 102);
    const user103 = balances.find((b) => b.userId === 103);

    // User 101: +200 from Exp1, -50 from Exp2 = +150
    // User 102: -100 from Exp1, +100 from Exp2 (150-50) = 0
    // User 103: -100 from Exp1, -50 from Exp2 = -150
    expect(user101?.amount).toBe(150);
    expect(user102?.amount).toBe(0);
    expect(user103?.amount).toBe(-150);
  });
});

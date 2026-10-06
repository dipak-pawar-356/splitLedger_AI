import { describe, it, expect, vi } from "vitest";
import {
  createLoan,
  recordLoanRepayment,
  calculateSimpleInterest,
  calculateCompoundInterest,
  generateEmiSchedule,
  getLoanDashboardSummary,
} from "@/actions/loans";

// Mock requireAuth
vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn().mockResolvedValue({
    id: 1,
    clerkUserId: "user_test_loan_manager",
    email: "dipak@splitledger.ai",
    name: "Dipak Pawar",
    defaultCurrency: "INR",
  }),
}));

describe("Borrow/Lend, Loans, EMI & Debt Management (Part VI-K)", () => {
  describe("MODULE 6: Mathematical Interest Calculation Engine", () => {
    it("should compute Simple Interest accurately: I = (P * R * T) / 100", async () => {
      // Principal: ₹50,000, Rate: 10% p.a., Time: 1 year -> Interest = ₹5,000
      const interest = await calculateSimpleInterest(50000, 10, 1);
      expect(interest).toBe(5000);

      // Principal: ₹1,00,000, Rate: 12% p.a., Time: 6 months (0.5 yr) -> Interest = ₹6,000
      const halfYear = await calculateSimpleInterest(100000, 12, 0.5);
      expect(halfYear).toBe(6000);
    });

    it("should compute Compound Interest accurately: A = P * (1 + r/n)^(nt) - P", async () => {
      // Principal: ₹10,000, Rate: 12% p.a., Time: 1 yr compounded monthly
      const ci = await calculateCompoundInterest(10000, 12, 1, 12);
      expect(ci).toBeCloseTo(1268.25, 1);
    });
  });

  describe("MODULE 3: Automated EMI Amortization Schedule", () => {
    it("should generate a 6-month EMI schedule for ₹30,000 with proper principal and interest portions", async () => {
      const { emiAmount, totalInterest, installments } = await generateEmiSchedule(
        30000,
        10,
        6,
        "monthly",
        "simple"
      );

      expect(totalInterest).toBe(1500); // 30,000 * 10% * 0.5 yr = 1,500
      expect(installments.length).toBe(6);
      expect(emiAmount).toBe(5250); // (30,000 + 1,500) / 6 = 5,250
      expect(installments[5].remainingBalance).toBe(0);
    });
  });

  describe("MODULE 1 & 2: Loan Creation & Random Secure IDs", () => {
    it("should create a lent loan with random 16-char ID in INR", async () => {
      const loan = await createLoan({
        title: "Emergency Freelance Advance to Priya",
        borrowerName: "Priya Nair",
        lenderName: "Dipak Pawar (Me)",
        borrowerUpiId: "priya@okaxis",
        lenderUpiId: "dipak@okaxis",
        principalAmount: 25000,
        loanType: "lent",
        category: "friend_family",
        interestType: "simple",
        interestRate: 8,
        tenureMonths: 5,
      });

      expect(loan.id).toMatch(/^loan_[A-Za-z0-9]{16}$/);
      expect(loan.principalAmount).toBe(25000);
      expect(loan.currency).toBe("INR");
      expect(loan.status).toBe("active");
    });

    it("should reject loan creation with ₹0 or negative principal amount", async () => {
      await expect(
        createLoan({
          title: "Invalid Zero Loan",
          borrowerName: "Test Borrower",
          lenderName: "Test Lender",
          principalAmount: 0,
          loanType: "borrowed",
          category: "personal",
          interestType: "none",
        })
      ).rejects.toThrow("must be greater than ₹0");
    });
  });

  describe("MODULE 4 & 5: Partial & Full Repayments", () => {
    it("should record repayment, reduce outstanding balance, and mark installment status", async () => {
      const loan = await createLoan({
        title: "Laptop Purchase Loan",
        borrowerName: "Dipak Pawar (Me)",
        lenderName: "Amit Verma",
        principalAmount: 20000,
        loanType: "borrowed",
        category: "personal",
        interestType: "none",
        tenureMonths: 4,
      });

      expect(loan.outstandingBalance).toBe(20000);

      // Make partial payment of ₹5,000
      const afterRepay = await recordLoanRepayment(loan.id, {
        amount: 5000,
        paymentMethod: "UPI",
        referenceNumber: "UPI-TEST-12345",
      });

      expect(afterRepay.totalPaid).toBe(5000);
      expect(afterRepay.outstandingBalance).toBe(15000);
      expect(afterRepay.status).toBe("partially_paid");
      expect(afterRepay.installments[0].status).toBe("paid");
    });
  });

  describe("MODULE 11: Comprehensive Dashboard Summary", () => {
    it("should compute accurate aggregate debt metrics in INR", async () => {
      const summary = await getLoanDashboardSummary();

      expect(summary.totalLent).toBeGreaterThanOrEqual(0);
      expect(summary.totalBorrowed).toBeGreaterThanOrEqual(0);
      expect(summary.netDebtPosition).toBe(summary.totalLent - summary.totalBorrowed);
      expect(summary.currency).toBe("INR");
    });
  });
});

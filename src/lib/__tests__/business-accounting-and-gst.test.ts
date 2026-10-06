import { describe, it, expect, vi } from "vitest";
import {
  recordJournalEntry,
  generateFinancialStatements,
  calculateGstSummary,
  createTaxInvoice,
  getAccountingDashboardSummary,
  exportAccountingData,
} from "@/actions/accounting";

// Mock requireAuth
vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn().mockResolvedValue({
    id: 1,
    clerkUserId: "user_test_accountant",
    email: "dipak@splitledger.ai",
    name: "Dipak Pawar",
    defaultCurrency: "INR",
  }),
}));

describe("Business Accounting, GST Engine & Double-Entry Bookkeeping (Part VI-G)", () => {
  describe("MODULE 4 & 5: Double-Entry Bookkeeping & General Ledger", () => {
    it("should successfully record balanced journal entry", async () => {
      const entry = await recordJournalEntry({
        description: "Office Internet Broadband Subscription",
        reference: "INV-ISP-4001",
        lines: [
          { accountId: "acc_1", accountCode: "5010", accountName: "Office Rent & Utilities", debit: 2360, credit: 0 },
          { accountId: "acc_2", accountCode: "1010", accountName: "HDFC Current Account", debit: 0, credit: 2360 },
        ],
      });

      expect(entry.id).toMatch(/^je_/);
      expect(entry.totalDebit).toBe(2360);
      expect(entry.totalCredit).toBe(2360);
    });

    it("should reject unbalanced journal entry and throw ValidationError", async () => {
      await expect(
        recordJournalEntry({
          description: "Unbalanced Transaction",
          lines: [
            { accountId: "acc_1", accountCode: "5010", accountName: "Utilities", debit: 5000, credit: 0 },
            { accountId: "acc_2", accountCode: "1010", accountName: "Bank", debit: 0, credit: 4000 },
          ],
        })
      ).rejects.toThrow("Double-Entry Bookkeeping Error");
    });
  });

  describe("MODULE 2: Indian GST & Input Tax Credit (ITC) Engine", () => {
    it("should compute CGST, SGST and Net GST Payable accurately in INR", async () => {
      const gst = await calculateGstSummary();

      expect(gst.taxableSales).toBeGreaterThanOrEqual(100000);
      expect(gst.totalOutputGst).toBeGreaterThan(0);
      expect(gst.cgstPayable + gst.sgstPayable).toBeCloseTo(gst.totalOutputGst, 1);
      expect(gst.netGstPayable).toBe(Math.max(0, gst.totalOutputGst - gst.itcAvailable));
      expect(gst.currency).toBe("INR");
    });
  });

  describe("MODULE 6: Financial Statements (Trial Balance, P&L, Balance Sheet)", () => {
    it("should generate balanced Trial Balance and accurate Profit & Loss", async () => {
      const statements = await generateFinancialStatements();

      expect(statements.trialBalance.isBalanced).toBe(true);
      expect(statements.trialBalance.totalDebit).toBeGreaterThan(0);
      expect(statements.trialBalance.totalDebit).toBeCloseTo(statements.trialBalance.totalCredit, 1);

      expect(statements.profitAndLoss.revenue).toBeGreaterThanOrEqual(100000);
      expect(statements.profitAndLoss.netProfit).toBe(
        statements.profitAndLoss.revenue - statements.profitAndLoss.operatingExpenses
      );
      expect(statements.balanceSheet.totalAssets).toBeGreaterThan(0);
    });
  });

  describe("MODULE 7 & 12: Tax Invoicing & Tally Exports", () => {
    it("should generate GST-compliant tax invoice with automatic journal posting", async () => {
      const invoice = await createTaxInvoice({
        customerName: "Tech Innovations India Pvt Ltd",
        customerGstin: "27ABCDE9999F1Z2",
        items: [{ name: "SplitLedger AI Custom Integration", quantity: 1, unitPrice: 50000 }],
        isInterstate: false,
      });

      expect(invoice.invoiceNumber).toMatch(/^INV-2026-/);
      expect(invoice.subtotal).toBe(50000);
      expect(invoice.cgst).toBe(4500); // 9%
      expect(invoice.sgst).toBe(4500); // 9%
      expect(invoice.total).toBe(59000); // 18% total GST
    });

    it("should export accounting data in valid Tally XML format", async () => {
      const xml = await exportAccountingData("tally_xml");
      expect(xml).toContain("<TALLYREQUEST>Import Data</TALLYREQUEST>");
      expect(xml).toContain("<COMPANY>");
    });
  });
});

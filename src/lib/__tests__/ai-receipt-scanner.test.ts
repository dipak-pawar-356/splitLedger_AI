import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  scanAndParseReceipt,
  computeItemizedSplit,
  clearKnownInvoiceRegistry,
} from "@/actions/receipt-scanner";

// Mock requireAuth
vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn().mockResolvedValue({
    id: 1,
    clerkUserId: "user_test_scanner",
    email: "dipak@splitledger.ai",
    name: "Dipak Pawar",
    defaultCurrency: "INR",
  }),
}));

const SAMPLE_CAFE_RECEIPT = `
BARISTA COFFEE COMPANY
TAX INVOICE
GSTIN: 27AAPFU0939F1ZV
Invoice No: INV-PUN-99201
Date: 2026-08-30

Espresso Romano 1 x 180.00
Blueberry Muffin 2 x 160.00
Paneer Tikka Roll 1 x 250.00

Subtotal: 750.00
CGST: 18.75
SGST: 18.75
Grand Total: 787.50
`;

describe("AI Receipt Scanner, OCR, GST Parsing & Itemized Splitting (Part VI-F)", () => {
  beforeEach(async () => {
    await clearKnownInvoiceRegistry();
  });

  describe("MODULE 2, 3 & 6: OCR Extraction & GST Breakdown", () => {
    it("should extract merchant name, GSTIN, line items, taxes and grand total in INR", async () => {
      const parsed = await scanAndParseReceipt(SAMPLE_CAFE_RECEIPT);

      expect(parsed.merchantName).toContain("BARISTA");
      expect(parsed.gstNumber).toBe("27AAPFU0939F1ZV");
      expect(parsed.invoiceNumber).toBe("INV-PUN-99201");
      expect(parsed.currency).toBe("INR");
      expect(parsed.category).toBe("Food & Dining");
      expect(parsed.items.length).toBeGreaterThanOrEqual(3);
      expect(parsed.grandTotal).toBeDefined();
      expect(parsed.grandTotal!).toBeGreaterThan(parsed.subtotal!);
    });
  });

  describe("MODULE 8: Proportional Itemized Group Splitting", () => {
    it("should calculate exact proportional tax distribution across members", async () => {
      const items = [
        { id: "1", name: "Pizza", quantity: 1, unitPrice: 600, totalPrice: 600, assignedMemberIds: [1] }, // Dipak only
        { id: "2", name: "Pasta", quantity: 1, unitPrice: 400, totalPrice: 400, assignedMemberIds: [2] }, // Rahul only
      ];

      const taxBreakdown = {
        cgst: 25,
        sgst: 25,
        igst: 0,
        vat: 0,
        serviceCharge: 0,
        totalTax: 50,
      };

      const members = [
        { id: 1, name: "Dipak" },
        { id: 2, name: "Rahul" },
      ];

      const splits = await computeItemizedSplit(items, taxBreakdown, members);

      expect(splits.length).toBe(2);

      const dipakSplit = splits.find((s) => s.memberId === 1);
      const rahulSplit = splits.find((s) => s.memberId === 2);

      // Dipak had 60% of total items (600/1000) -> 60% of 50 tax = 30
      expect(dipakSplit?.itemSubtotal).toBe(600);
      expect(dipakSplit?.taxShare).toBe(30);
      expect(dipakSplit?.totalPayable).toBe(630);

      // Rahul had 40% of total items (400/1000) -> 40% of 50 tax = 20
      expect(rahulSplit?.itemSubtotal).toBe(400);
      expect(rahulSplit?.taxShare).toBe(20);
      expect(rahulSplit?.totalPayable).toBe(420);

      // Total sum must equal 1050 (1000 items + 50 tax)
      expect(dipakSplit!.totalPayable + rahulSplit!.totalPayable).toBe(1050);
    });
  });

  describe("MODULE 9: Duplicate Invoice Detection", () => {
    it("should flag duplicate receipt upload if identical merchant & invoice is submitted", async () => {
      const firstScan = await scanAndParseReceipt(SAMPLE_CAFE_RECEIPT);
      expect(firstScan.isDuplicate).toBe(false);

      // Second identical upload
      const secondScan = await scanAndParseReceipt(SAMPLE_CAFE_RECEIPT);
      expect(secondScan.isDuplicate).toBe(true);
    });
  });
});

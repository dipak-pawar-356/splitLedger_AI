import { describe, it, expect, vi } from "vitest";
import {
  uploadVaultDocument,
  createInvoice,
  verifyVaultDocument,
  getDocumentDashboardSummary,
} from "@/actions/documents";
import { globalSearch } from "@/actions/search";

// Mock requireAuth
vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn().mockResolvedValue({
    id: 1,
    clerkUserId: "user_test_vault_manager",
    email: "dipak@splitledger.ai",
    name: "Dipak Pawar",
    defaultCurrency: "INR",
  }),
}));

describe("Document Vault, Invoices & Universal Global Search (Part VI-N & VI-O)", () => {
  describe("PART VI-N: Document Vault & Invoice Management", () => {
    it("should upload vault document with random 16-char ID in INR", async () => {
      const doc = await uploadVaultDocument({
        fileName: "Medical_Hospital_Receipt.pdf",
        originalName: "Hospital_Receipt_2026.pdf",
        fileType: "pdf",
        fileSize: 340000,
        docType: "medical_bill",
        module: "personal",
        amount: 14500,
        merchantName: "Apollo Hospitals Mumbai",
      });

      expect(doc.id).toMatch(/^vlt_[A-Za-z0-9]{16}$/);
      expect(doc.amount).toBe(14500);
      expect(doc.currency).toBe("INR");
      expect(doc.status).toBe("pending");
    });

    it("should generate a formal invoice with subtotals, tax breakdown and grand total in INR", async () => {
      const invoice = await createInvoice({
        customerName: "Reliance Industries",
        customerGst: "27AAACR1234K1Z9",
        dueDate: "2026-09-30",
        items: [
          { description: "Enterprise Security Audit Services", quantity: 1, unitPrice: 100000, taxRate: 18 },
        ],
      });

      expect(invoice.id).toMatch(/^ivc_[A-Za-z0-9]{16}$/);
      expect(invoice.subtotal).toBe(100000);
      expect(invoice.totalTax).toBe(18000); // 18% of 1,00,000
      expect(invoice.grandTotal).toBe(118000);
      expect(invoice.currency).toBe("INR");
    });

    it("should verify document status successfully", async () => {
      const summary = await getDocumentDashboardSummary();
      const firstDoc = summary.documents[0];

      const verified = await verifyVaultDocument(firstDoc.id, "verified");
      expect(verified.status).toBe("verified");
    });
  });

  describe("PART VI-O: Universal Global Search Engine", () => {
    it("should execute globalSearch and return multi-module results", async () => {
      const results = await globalSearch("Goa");
      expect(results.length).toBeGreaterThan(0);

      const tripMatch = results.find((r) => r.type === "trip");
      expect(tripMatch).toBeDefined();
      expect(tripMatch?.link).toBe("/dashboard/trips");
    });

    it("should search document vault and invoices via globalSearch", async () => {
      const docResults = await globalSearch("MSEDCL");
      expect(docResults.length).toBeGreaterThan(0);

      const docMatch = docResults.find((r) => r.type === "document");
      expect(docMatch).toBeDefined();
      expect(docMatch?.amount).toBe(3450);
    });
  });
});

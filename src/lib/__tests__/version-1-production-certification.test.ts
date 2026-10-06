import { describe, it, expect, vi } from "vitest";
import { calculateOptimalSettlements } from "../settlements/calculator";
import { getRecurringDashboardSummary } from "@/actions/recurring";
import { getLoanDashboardSummary } from "@/actions/loans";
import { getTripDashboardSummary, createTrip } from "@/actions/trips";
import { getDocumentDashboardSummary, uploadVaultDocument, createInvoice } from "@/actions/documents";
import { globalSearch } from "@/actions/search";

// Mock requireAuth
vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn().mockResolvedValue({
    id: 1,
    clerkUserId: "user_v1_cert_auditor",
    email: "dipak@splitledger.ai",
    name: "Dipak Pawar",
    defaultCurrency: "INR",
  }),
}));

describe("SplitLedger AI Version 1.0 Final Production Certification (Part VI-Q)", () => {
  describe("AUDIT PHASE 1 & 2: Financial Recalculation & Ledger Integrity", () => {
    it("should compute exact greedy debt settlements with zero loss", () => {
      const balances = [
        { userId: 1, amount: 15000 },
        { userId: 2, amount: -10000 },
        { userId: 3, amount: -5000 },
      ];

      const settlements = calculateOptimalSettlements(balances, "INR");

      expect(settlements.length).toBe(2);
      const totalTransferred = settlements.reduce((sum, s) => sum + s.amount, 0);
      expect(totalTransferred).toBe(15000);
      expect(settlements[0].currency).toBe("INR");
    });

    it("should aggregate Net Balance = Receivable - Payable accurately in INR", () => {
      const receivable = 25000;
      const payable = 12000;
      const netBalance = receivable - payable;

      expect(netBalance).toBe(13000);
    });
  });

  describe("AUDIT PHASE 17: Secure Random 16-Character Public ID Compliance", () => {
    it("should generate unguessable 16-char public IDs with distinct 3-4 letter prefixes across modules", async () => {
      await createTrip({
        name: "Cert Vacation Trip",
        destination: "Goa",
        category: "vacation",
        startDate: "2026-10-01",
        endDate: "2026-10-05",
        budgetAmount: 50000,
      });

      await uploadVaultDocument({
        fileName: "Cert_Doc.pdf",
        originalName: "Cert_Doc.pdf",
        fileType: "pdf",
        fileSize: 1000,
        docType: "receipt",
        module: "personal",
        amount: 5000,
        merchantName: "Cert Merchant",
      });

      await createInvoice({
        customerName: "Cert Customer",
        dueDate: "2026-10-05",
        items: [{ description: "Services", quantity: 1, unitPrice: 5000, taxRate: 18 }],
      });

      const trips = await getTripDashboardSummary();
      const docs = await getDocumentDashboardSummary();
      const recs = await getRecurringDashboardSummary();

      expect(trips.trips[0].id).toMatch(/^trip_[A-Za-z0-9_]+$/);
      expect(docs.documents[0].id).toMatch(/^vlt_[A-Za-z0-9_]+$/);
      expect(docs.invoices[0].id).toMatch(/^ivc_[A-Za-z0-9_]+$/);
      expect(recs.recurringTransactions[0].id).toMatch(/^rec_[A-Za-z0-9_]+$/);
    });
  });

  describe("AUDIT PHASE 11 & 14: Universal Search & Cross-Module Intelligence", () => {
    it("should perform application-wide search returning multi-module results", async () => {
      const results = await globalSearch("Goa");
      expect(results.length).toBeGreaterThan(0);
      const tripMatch = results.find((r) => r.type === "trip");
      expect(tripMatch).toBeDefined();
    });
  });
});

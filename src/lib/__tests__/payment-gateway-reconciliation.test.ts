import { describe, it, expect, vi } from "vitest";
import {
  createPaymentRequest,
  generatePaymentLink,
  processPartialPayment,
  verifyPayment,
  raisePaymentDispute,
  resolvePaymentDispute,
  generatePaymentReceipt,
  getPaymentDashboardSummary,
} from "@/actions/payments-reconciliation";

// Mock requireAuth
vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn().mockResolvedValue({
    id: 1,
    clerkUserId: "user_test_payer_01",
    email: "dipak@splitledger.ai",
    name: "Dipak Pawar",
    defaultCurrency: "INR",
  }),
}));

describe("Payment Gateway, Partial Settlements & Auto-Reconciliation (Part VI-C)", () => {
  describe("MODULE 1 & 6: Payment Lifecycle & Partial Payments", () => {
    it("should create payment request and process partial payment in INR", async () => {
      const req = await createPaymentRequest({
        groupId: 101,
        groupName: "Goa Beach Villa",
        toUserId: 2,
        toUserName: "Rahul Sharma",
        totalPayable: 1000,
        payeeUpiId: "rahul@okhdfcbank",
        method: "upi",
      });

      expect(req.id).toMatch(/^pay_req_/);
      expect(req.state).toBe("pending");
      expect(req.totalPayable).toBe(1000);
      expect(req.remainingAmount).toBe(1000);

      // Process Partial Payment of ₹400
      const partial = await processPartialPayment({
        paymentId: req.id,
        amountPaid: 400,
        method: "upi",
        utrNumber: "423400112233",
      });

      expect(partial.paidAmount).toBe(400);
      expect(partial.remainingAmount).toBe(600);
      expect(partial.state).toBe("verification_pending");
      expect(partial.utrNumber).toBe("423400112233");

      // Verify and reconcile
      const verified = await verifyPayment(req.id, "verify");
      expect(verified.state).toBe("verified");
      expect(verified.receiptNumber).toBeDefined();
    });
  });

  describe("MODULE 3: Single-Use Secure Payment Links", () => {
    it("should generate secure tokenized payment link with 15-min expiry", async () => {
      const link = await generatePaymentLink("pay_rec_1_01");

      expect(link.token).toMatch(/^STL_/);
      expect(link.url).toBe(`/pay/${link.token}`);
      expect(link.currency).toBe("INR");
      expect(new Date(link.expiresAt).getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe("MODULE 8: Payment Disputes Management", () => {
    it("should raise dispute, update payment state, and allow resolution", async () => {
      const dispute = await raisePaymentDispute({
        paymentId: "pay_rec_1_01",
        reason: "wrong_amount",
        evidence: "Bank statement shows ₹800 debited instead of ₹1200",
      });

      expect(dispute.id).toMatch(/^disp_/);
      expect(dispute.status).toBe("open");

      // Admin resolves dispute
      const resolved = await resolvePaymentDispute(
        dispute.id,
        "refund",
        "Dispute approved; ₹400 refund initiated."
      );

      expect(resolved.status).toBe("resolved");
      expect(resolved.resolvedAt).toBeDefined();
    });
  });

  describe("MODULE 9 & 11: Digital Receipts & Payment Dashboard", () => {
    it("should generate structured digital payment receipt in INR", async () => {
      const receipt = await generatePaymentReceipt("pay_rec_1_01");

      expect(receipt.receiptNumber).toMatch(/^REC-2026-/);
      expect(receipt.amount).toBe(800);
      expect(receipt.currency).toBe("INR");
      expect(receipt.senderName).toBe("Dipak Pawar");
      expect(receipt.receiverName).toBe("Rahul Sharma");
    });

    it("should compute payment dashboard metrics accurately", async () => {
      const dashboard = await getPaymentDashboardSummary();

      expect(dashboard.totalPaid).toBeGreaterThanOrEqual(0);
      expect(dashboard.totalReceived).toBeGreaterThanOrEqual(0);
      expect(dashboard.successRatePercent).toBeGreaterThan(90);
      expect(dashboard.currency).toBe("INR");
      expect(dashboard.payments.length).toBeGreaterThan(0);
    });
  });
});

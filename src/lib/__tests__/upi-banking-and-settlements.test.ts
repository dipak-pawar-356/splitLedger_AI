import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  validateUpiId,
  buildUpiDeepLink,
  getAppSpecificUpiLink,
  generateUpiQrCodeUrl,
} from "@/lib/payments/upi";
import {
  getUserPaymentMethods,
  addPaymentMethod,
  setDefaultPaymentMethod,
  deletePaymentMethod,
  initiateSettlementPayment,
  confirmSettlementPayment,
  verifySettlementPayment,
} from "@/actions/payments";

// Mock requireAuth to return user with ID 1
vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn().mockResolvedValue({
    id: 1,
    clerkUserId: "user_test_upi_payer",
    email: "dipak@splitledger.ai",
    name: "Dipak Pawar",
    defaultCurrency: "INR",
  }),
}));

describe("Banking Integration, UPI Payments & Smart Group Settlement (Part VI-B)", () => {
  describe("SECTION 2: UPI ID Validation", () => {
    it("should validate standard Indian VPA handles correctly", () => {
      expect(validateUpiId("dipak@okhdfcbank").isValid).toBe(true);
      expect(validateUpiId("rahul@ybl").isValid).toBe(true);
      expect(validateUpiId("9876543210@paytm").isValid).toBe(true);
      expect(validateUpiId("merchant.pay@ibl").isValid).toBe(true);
      expect(validateUpiId("finance_dept@axl").isValid).toBe(true);
    });

    it("should reject invalid, empty or malformed UPI IDs", () => {
      expect(validateUpiId("").isValid).toBe(false);
      expect(validateUpiId("invalid_upi_without_handle").isValid).toBe(false);
      expect(validateUpiId("user@").isValid).toBe(false);
      expect(validateUpiId("@okhdfcbank").isValid).toBe(false);
    });
  });

  describe("SECTION 5, 6 & 7: NPCI UPI Deep Link & Dynamic QR Code Generation", () => {
    const details = {
      payeeUpiId: "rahul@okhdfcbank",
      payeeName: "Rahul Sharma",
      amount: 450.0,
      currency: "INR",
      transactionNote: "Settlement for Goa Trip",
      transactionRef: "SPLIT-GRP-101-9988",
    };

    it("should build standard NPCI Universal UPI URI with exact amount and currency in INR", () => {
      const uri = buildUpiDeepLink(details);

      expect(uri).toContain("upi://pay?");
      expect(uri).toContain("pa=rahul%40okhdfcbank");
      expect(uri).toContain("pn=Rahul+Sharma");
      expect(uri).toContain("am=450.00");
      expect(uri).toContain("cu=INR");
      expect(uri).toContain("tr=SPLIT-GRP-101-9988");
    });

    it("should generate app-specific deep links for Google Pay, PhonePe, Paytm, and BHIM", () => {
      const baseUri = buildUpiDeepLink(details);

      const gpayLink = getAppSpecificUpiLink("gpay", baseUri);
      expect(gpayLink).toMatch(/^gpay:\/\/upi\/pay\?/);

      const phonepeLink = getAppSpecificUpiLink("phonepe", baseUri);
      expect(phonepeLink).toMatch(/^phonepe:\/\/pay\?/);

      const paytmLink = getAppSpecificUpiLink("paytm", baseUri);
      expect(paytmLink).toMatch(/^paytmmp:\/\/pay\?/);

      const bhimLink = getAppSpecificUpiLink("bhim", baseUri);
      expect(bhimLink).toMatch(/^bhim:\/\/pay\?/);
    });

    it("should generate dynamic QR code URL encoding exact UPI payload", () => {
      const baseUri = buildUpiDeepLink(details);
      const qrUrl = generateUpiQrCodeUrl(baseUri);

      expect(qrUrl).toContain("api.qrserver.com/v1/create-qr-code");
      expect(qrUrl).toContain(encodeURIComponent(baseUri));
    });
  });

  describe("SECTION 1 & 3: User Banking Profile & Payment Methods", () => {
    it("should allow user to register multiple VPAs and maintain single default method", async () => {
      const method1 = await addPaymentMethod({
        upiId: "dipak.personal@okhdfcbank",
        accountHolderName: "Dipak Pawar",
        nickname: "Personal HDFC",
        isDefault: true,
      });

      expect(method1.id).toBeDefined();
      expect(method1.isDefault).toBe(true);

      const method2 = await addPaymentMethod({
        upiId: "dipak.business@icici",
        accountHolderName: "Dipak Pawar",
        nickname: "Business ICICI",
        isDefault: true,
      });

      expect(method2.isDefault).toBe(true);

      const methods = await getUserPaymentMethods();
      const defaultMethods = methods.filter((m) => m.isDefault);
      expect(defaultMethods.length).toBe(1);
      expect(defaultMethods[0].id).toBe(method2.id);
    });
  });

  describe("SECTION 4, 8, 9 & 10: Group Settlement Payment Lifecycle & UTR Confirmation", () => {
    it("should initiate payment, submit UTR reference, and allow verification", async () => {
      // 1. Initiate settlement payment
      const payment = await initiateSettlementPayment({
        groupId: 101,
        groupName: "Goa Beach Villa",
        toUserId: 2,
        toUserName: "Rahul Sharma",
        payeeUpiId: "rahul@ybl",
        amount: 850,
      });

      expect(payment.id).toMatch(/^pay_/);
      expect(payment.status).toBe("pending");
      expect(payment.amount).toBe(850);
      expect(payment.currency).toBe("INR");
      expect(payment.upiUri).toBeDefined();
      expect(payment.qrCodeUrl).toBeDefined();

      // 2. Submit 12-digit UTR confirmation
      const confirmed = await confirmSettlementPayment({
        paymentId: payment.id,
        utrNumber: "423400891234",
        remarks: "Paid via Google Pay",
      });

      expect(confirmed.status).toBe("waiting_confirmation");
      expect(confirmed.utrNumber).toBe("423400891234");
      expect(confirmed.confirmedAt).toBeDefined();

      // 3. Receiver verifies settlement payment
      const verified = await verifySettlementPayment(payment.id, "approve");
      expect(verified.status).toBe("paid");
      expect(verified.verifiedAt).toBeDefined();
    });
  });
});

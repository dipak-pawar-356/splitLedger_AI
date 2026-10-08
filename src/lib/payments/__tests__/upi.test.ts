import { describe, it, expect } from "vitest";
import {
  validateUpiId,
  sanitizePayeeName,
  buildUpiDeepLink,
  getAppSpecificUpiLink,
  generateUpiQrCodeDataUrl,
  generateUpiQrCodeSvg,
} from "../upi";

describe("UPI Utility & Dynamic QR Generator", () => {
  describe("validateUpiId", () => {
    it("should accept valid UPI IDs", () => {
      expect(validateUpiId("user@okhdfcbank").isValid).toBe(true);
      expect(validateUpiId("9876543210@paytm").isValid).toBe(true);
      expect(validateUpiId("rahul.sharma@ybl").isValid).toBe(true);
      expect(validateUpiId("merchant-store@ibl").isValid).toBe(true);
    });

    it("should reject invalid UPI IDs", () => {
      expect(validateUpiId("").isValid).toBe(false);
      expect(validateUpiId("invalid").isValid).toBe(false);
      expect(validateUpiId("@okhdfcbank").isValid).toBe(false);
      expect(validateUpiId("user@").isValid).toBe(false);
      expect(validateUpiId("user@bank!").isValid).toBe(false);
    });
  });

  describe("sanitizePayeeName", () => {
    it("should sanitize special characters in payee name", () => {
      expect(sanitizePayeeName("Dipak Pawar (Admin)")).toBe("Dipak Pawar Admin");
      expect(sanitizePayeeName("Rahul's Store #1")).toBe("Rahuls Store 1");
    });
  });

  describe("buildUpiDeepLink", () => {
    it("should construct valid NPCI UPI URI with exact amount and currency", () => {
      const uri = buildUpiDeepLink({
        payeeUpiId: "dipak@okhdfcbank",
        payeeName: "Dipak Pawar",
        amount: 500,
        currency: "INR",
        transactionNote: "Goa Trip Settlement",
      });

      expect(uri).toContain("upi://pay?");
      expect(uri).toContain("pa=dipak%40okhdfcbank");
      expect(uri).toContain("pn=Dipak+Pawar");
      expect(uri).toContain("am=500.00");
      expect(uri).toContain("cu=INR");
      expect(uri).toContain("tn=Goa+Trip+Settlement");
    });

    it("should throw on invalid amount <= 0", () => {
      expect(() =>
        buildUpiDeepLink({
          payeeUpiId: "dipak@okhdfcbank",
          payeeName: "Dipak Pawar",
          amount: 0,
        })
      ).toThrow();
    });
  });

  describe("getAppSpecificUpiLink", () => {
    it("should format app-specific deep links", () => {
      const baseUri = "upi://pay?pa=dipak@okhdfcbank&pn=Dipak&am=500.00&cu=INR";
      expect(getAppSpecificUpiLink("gpay", baseUri)).toContain("gpay://upi/pay?");
      expect(getAppSpecificUpiLink("phonepe", baseUri)).toContain("phonepe://pay?");
      expect(getAppSpecificUpiLink("paytm", baseUri)).toContain("paytmmp://pay?");
    });
  });

  describe("generateUpiQrCodeDataUrl", () => {
    it("should generate a valid PNG Base64 data URL offline", async () => {
      const uri = "upi://pay?pa=dipak@okhdfcbank&pn=Dipak&am=500.00&cu=INR";
      const qrDataUrl = await generateUpiQrCodeDataUrl(uri);
      expect(qrDataUrl).toMatch(/^data:image\/png;base64,/);
    });

    it("should generate SVG string offline", async () => {
      const uri = "upi://pay?pa=dipak@okhdfcbank&pn=Dipak&am=500.00&cu=INR";
      const svg = await generateUpiQrCodeSvg(uri);
      expect(svg).toContain("<svg");
      expect(svg).toContain("</svg>");
    });
  });
});

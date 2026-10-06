/**
 * NPCI UPI Deep Link & Dynamic Exact-Amount QR Code Generator
 */

export interface UpiPaymentDetails {
  payeeUpiId: string;
  payeeName: string;
  amount: number; // in rupees
  currency?: string; // Default: INR
  transactionNote?: string;
  transactionRef?: string;
  orderId?: string;
}

export type PreferredUpiApp = "generic" | "gpay" | "phonepe" | "paytm" | "bhim" | "cred";

/**
 * Validate standard Indian Virtual Payment Address (UPI ID / VPA)
 * Examples: user@okhdfcbank, name@ybl, mobile@paytm, id@ibl, user@axl
 */
export function validateUpiId(upiId: string): { isValid: boolean; error?: string } {
  if (!upiId || typeof upiId !== "string") {
    return { isValid: false, error: "UPI ID cannot be empty." };
  }

  const clean = upiId.trim();
  if (clean.length < 5 || clean.length > 100) {
    return { isValid: false, error: "UPI ID must be between 5 and 100 characters." };
  }

  const upiRegex = /^[a-zA-Z0-9.\-_]{2,64}@[a-zA-Z0-9]{2,32}$/;
  if (!upiRegex.test(clean)) {
    return { isValid: false, error: "Invalid UPI ID format (expected handle like user@okhdfcbank or 9876543210@paytm)." };
  }

  return { isValid: true };
}

/**
 * Generate standard NPCI Universal UPI URI
 * Spec: upi://pay?pa=VPA&pn=NAME&am=AMOUNT&cu=INR&tn=NOTE&tr=REF
 */
export function buildUpiDeepLink(details: UpiPaymentDetails): string {
  const params = new URLSearchParams();
  params.set("pa", details.payeeUpiId.trim());
  params.set("pn", details.payeeName.trim());
  params.set("am", details.amount.toFixed(2));
  params.set("cu", details.currency || "INR");

  if (details.transactionNote) {
    params.set("tn", details.transactionNote.slice(0, 80));
  }
  if (details.transactionRef) {
    params.set("tr", details.transactionRef.slice(0, 35));
  }

  return `upi://pay?${params.toString()}`;
}

/**
 * Get App-Specific UPI Deep Link
 */
export function getAppSpecificUpiLink(app: PreferredUpiApp, baseUpiUri: string): string {
  const query = baseUpiUri.replace(/^upi:\/\/pay\?/, "");

  switch (app) {
    case "gpay":
      return `gpay://upi/pay?${query}`;
    case "phonepe":
      return `phonepe://pay?${query}`;
    case "paytm":
      return `paytmmp://pay?${query}`;
    case "bhim":
      return `bhim://pay?${query}`;
    case "cred":
      return `cred://pay?${query}`;
    case "generic":
    default:
      return baseUpiUri;
  }
}

/**
 * Generate dynamic high-resolution QR code URL for UPI URI
 */
export function generateUpiQrCodeUrl(upiUri: string, size: number = 300): string {
  const encoded = encodeURIComponent(upiUri);
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}&margin=10&format=svg`;
}

/**
 * NPCI UPI Deep Link & Dynamic Exact-Amount QR Code Generator
 * Secure, in-app offline QR rendering with zero third-party data leakage.
 */

import QRCode from "qrcode";

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
 * Examples: user@okhdfcbank, name@ybl, 9876543210@paytm, id@ibl, user@axl
 */
export function validateUpiId(upiId: string): { isValid: boolean; error?: string } {
  if (!upiId || typeof upiId !== "string") {
    return { isValid: false, error: "UPI ID cannot be empty." };
  }

  const clean = upiId.trim();
  if (clean.length < 5 || clean.length > 100) {
    return { isValid: false, error: "UPI ID must be between 5 and 100 characters." };
  }

  // UPI VPA spec: username (alphanumeric with ., -, _) @ handle (alphanumeric)
  const upiRegex = /^[a-zA-Z0-9.\-_]{2,64}@[a-zA-Z0-9]{2,32}$/;
  if (!upiRegex.test(clean)) {
    return { isValid: false, error: "Invalid UPI ID format (expected format like name@okhdfcbank or 9876543210@paytm)." };
  }

  return { isValid: true };
}

/**
 * Clean and format recipient display name for NPCI URI spec
 * NPCI recommends alphanumeric and spaces, maximum 50 characters
 */
export function sanitizePayeeName(name: string): string {
  if (!name) return "SplitLedger Member";
  const cleaned = name.replace(/[^\w\s.-]/g, "").trim();
  return cleaned.slice(0, 50) || "SplitLedger Member";
}

/**
 * Generate standard NPCI Universal UPI URI
 * Spec: upi://pay?pa=VPA&pn=NAME&am=AMOUNT&cu=INR&tn=NOTE&tr=REF
 * Security: Encodes only required transaction fields without passwords or sensitive PII.
 */
export function buildUpiDeepLink(details: UpiPaymentDetails): string {
  const validation = validateUpiId(details.payeeUpiId);
  if (!validation.isValid) {
    throw new Error(validation.error || "Invalid payee UPI ID");
  }

  const amountVal = Number(details.amount);
  if (isNaN(amountVal) || amountVal <= 0) {
    throw new Error("Settlement payment amount must be greater than 0");
  }

  // Exact 2 decimal places rounding
  const formattedAmount = (Math.round(amountVal * 100) / 100).toFixed(2);

  const params = new URLSearchParams();
  params.set("pa", details.payeeUpiId.trim());
  params.set("pn", sanitizePayeeName(details.payeeName));
  params.set("am", formattedAmount);
  params.set("cu", details.currency || "INR");

  if (details.transactionNote) {
    // Max 80 chars per NPCI standard
    const cleanNote = details.transactionNote.replace(/[^\w\s.-]/g, "").trim();
    params.set("tn", cleanNote.slice(0, 80));
  }
  if (details.transactionRef) {
    // Alphanumeric ref with hyphens up to 35 chars
    const cleanRef = details.transactionRef.replace(/[^a-zA-Z0-9-]/g, "").trim();
    if (cleanRef) {
      params.set("tr", cleanRef.slice(0, 35));
    }
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
 * Generate in-app dynamic high-resolution QR code Data URL (PNG Base64)
 * Runs locally with zero external network requests for maximum privacy and reliability.
 */
export async function generateUpiQrCodeDataUrl(
  upiUri: string,
  options: {
    width?: number;
    margin?: number;
    darkColor?: string;
    lightColor?: string;
  } = {}
): Promise<string> {
  return QRCode.toDataURL(upiUri, {
    width: options.width || 360,
    margin: options.margin !== undefined ? options.margin : 2,
    color: {
      dark: options.darkColor || "#0f172a",
      light: options.lightColor || "#ffffff",
    },
    errorCorrectionLevel: "M",
  });
}

export const generateQrCodeDataUrl = generateUpiQrCodeDataUrl;

/**
 * Generate in-app dynamic SVG QR Code string
 * Produces lightweight vector output ideal for crisp responsive UI.
 */
export async function generateUpiQrCodeSvg(
  upiUri: string,
  options: {
    width?: number;
    margin?: number;
  } = {}
): Promise<string> {
  return QRCode.toString(upiUri, {
    type: "svg",
    width: options.width || 360,
    margin: options.margin !== undefined ? options.margin : 2,
    errorCorrectionLevel: "M",
  });
}

/**
 * Legacy fallback: Generate remote QR code URL
 */
export function generateUpiQrCodeUrl(upiUri: string, size: number = 300): string {
  const encoded = encodeURIComponent(upiUri);
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}&margin=10&format=svg`;
}

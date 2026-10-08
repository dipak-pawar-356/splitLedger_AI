import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: string = "INR"): string {
  const safeCurrency = (currency || "INR").trim().toUpperCase();
  const locale = safeCurrency === "INR" ? "en-IN" : "en-US";
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: safeCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }
}

function parseSafeDate(date: Date | string): Date {
  if (date instanceof Date) return date;
  if (typeof date === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const [y, m, d] = date.split("-").map(Number);
      return new Date(y, m - 1, d, 12, 0, 0);
    }
    return new Date(date);
  }
  return new Date(date);
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "N/A";
  const d = parseSafeDate(date);
  if (isNaN(d.getTime())) return "N/A";
  return format(d, "MMM dd, yyyy");
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "N/A";
  const d = parseSafeDate(date);
  if (isNaN(d.getTime())) return "N/A";
  return format(d, "MMM dd, yyyy HH:mm");
}

export function formatRelativeTime(date: Date | string | null | undefined): string {
  if (!date) return "N/A";
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (diffInSeconds < 60) return "Just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return formatDate(d);
}

/**
 * Generates an unpredictable, cryptographically random numeric string of 15 to 20 digits.
 * Ensures the first digit is non-zero (1-9) so it does not lose precision or have leading zeros.
 * Guarantees no sequential predictability and optional exclusion of conflicting IDs.
 */
export function generateRandomNumericId(length: number = 16, excludeIds: string[] = []): string {
  const targetLength = Math.max(15, Math.min(20, length));
  const maxAttempts = 100;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const bytes = new Uint8Array(targetLength);
    crypto.getRandomValues(bytes);

    // First digit is 1-9 to avoid leading zero
    const firstDigit = ((bytes[0] % 9) + 1).toString();
    const restDigits = Array.from(bytes.slice(1), (b) => (b % 10).toString()).join("");
    const numericId = `${firstDigit}${restDigits}`;

    if (!excludeIds.includes(numericId)) {
      return numericId;
    }
  }

  const timestamp = Date.now().toString();
  const randomSuffix = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
  return `${timestamp}${randomSuffix}`.slice(0, targetLength);
}

/**
 * Checks whether an ID represents an internal PostgreSQL serial integer ID (1, 2, ... <= 2147483647).
 * Randomized 15-20 digit public IDs and tokens will return false, preventing SQL integer overflow.
 */
export function isDbIntegerId(val: string | number | undefined | null): boolean {
  if (val === undefined || val === null) return false;
  if (typeof val === "number") return Number.isInteger(val) && val > 0 && val <= 2147483647;
  const str = String(val).trim();
  return /^\d{1,9}$/.test(str) && Number(str) <= 2147483647;
}

export function generateSecureToken(excludeIds: string[] = []): string {
  return generateRandomNumericId(16, excludeIds);
}

export function generatePublicId(prefix?: string): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  const randomStr = Array.from(array, (byte) => chars[byte % chars.length]).join("");
  return prefix ? `${prefix}_${randomStr}` : randomStr;
}

export function generateTransactionId(): string {
  return generatePublicId("txn");
}

export function generateVersionId(): string {
  return generatePublicId("ver");
}

export function generateAuditId(): string {
  return generatePublicId("aud");
}

export function generateGroupId(): string {
  return generateRandomNumericId(16);
}

export function generateExpenseId(): string {
  return generatePublicId("txn");
}

export function generateInvitationToken(excludeIds: string[] = []): string {
  return generateRandomNumericId(16, excludeIds);
}

export function generateInvitationId(excludeIds: string[] = []): string {
  return generateRandomNumericId(16, excludeIds);
}

export function generateContactId(): string {
  return generatePublicId("cnt");
}

export function generateSettlementId(): string {
  return generatePublicId("set");
}

export function generateReportId(): string {
  return generatePublicId("rep");
}

export function generateScheduleId(): string {
  return generatePublicId("sch");
}

export const PRODUCTION_APP_URL = "https://split-ledger-ai.vercel.app";

export function getBaseAppUrl(): string {
  // Always enforce production domain for external links (QR codes, invite links, emails, and shares)
  return PRODUCTION_APP_URL;
}

export function generateGroupJoinUrl(groupIdentifier: string): string {
  return `${PRODUCTION_APP_URL}/join-group/${groupIdentifier}`;
}

export function generateInvitationUrl(token: string): string {
  return `${PRODUCTION_APP_URL}/join-group/${token}`;
}

export function generateWhatsAppLink(phone: string, message: string): string {
  const formattedPhone = phone.replace(/\D/g, "");
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
}

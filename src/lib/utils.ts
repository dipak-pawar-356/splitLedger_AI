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

export function generateSecureToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
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
  return generatePublicId("grp");
}

export function generateExpenseId(): string {
  return generatePublicId("txn");
}

export function generateInvitationId(): string {
  return generatePublicId("inv");
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

export function getBaseAppUrl(): string {
  const rawUrl = process.env.NEXT_PUBLIC_APP_URL || "https://split-ledger-ai.vercel.app";
  return rawUrl.trim().replace(/\/+$/, "");
}

export function generateInvitationUrl(token: string): string {
  const baseUrl = getBaseAppUrl();
  return `${baseUrl}/invite/${token}`;
}

export function generateWhatsAppLink(phone: string, message: string): string {
  const formattedPhone = phone.replace(/\D/g, "");
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
}

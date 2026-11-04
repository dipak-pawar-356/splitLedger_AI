import { BudgetDurationPreset, BudgetComputedStatus, BudgetIncreaseHistoryItem } from "@/lib/types/budgets";

export interface BudgetMetadataPayload {
  __splitLedgerMeta: boolean;
  originalAmount: number;
  durationPreset?: BudgetDurationPreset;
  userNotes?: string;
  increases: BudgetIncreaseHistoryItem[];
}

export function parseBudgetMetadata(rawNotes: string | null | undefined, currentAmount: number): {
  originalAmount: number;
  increases: BudgetIncreaseHistoryItem[];
  userNotes: string;
  durationPreset?: BudgetDurationPreset;
} {
  if (!rawNotes) {
    return {
      originalAmount: currentAmount,
      increases: [],
      userNotes: "",
    };
  }
  try {
    const parsed = JSON.parse(rawNotes);
    if (parsed && typeof parsed === "object" && (parsed.__splitLedgerMeta || parsed.originalAmount !== undefined)) {
      return {
        originalAmount: typeof parsed.originalAmount === "number" ? parsed.originalAmount : currentAmount,
        increases: Array.isArray(parsed.increases) ? parsed.increases : [],
        userNotes: parsed.userNotes || "",
        durationPreset: parsed.durationPreset,
      };
    }
  } catch {
    // rawNotes is plain text notes
  }
  return {
    originalAmount: currentAmount,
    increases: [],
    userNotes: rawNotes,
  };
}

export function serializeBudgetMetadata(
  originalAmount: number,
  increases: BudgetIncreaseHistoryItem[],
  userNotes?: string,
  durationPreset?: BudgetDurationPreset
): string {
  const payload: BudgetMetadataPayload = {
    __splitLedgerMeta: true,
    originalAmount,
    increases,
    userNotes: userNotes || "",
    durationPreset,
  };
  return JSON.stringify(payload);
}

export function calculateBudgetDatesFromPreset(
  preset: BudgetDurationPreset | string | undefined,
  customStart?: string | Date,
  customEnd?: string | Date
): { startDate: Date; endDate: Date; totalDays: number } {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

  if (preset === "daily") {
    const start = new Date(todayStart);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return { startDate: start, endDate: end, totalDays: 1 };
  }
  if (preset === "weekly") {
    const start = new Date(todayStart);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 6, 23, 59, 59, 999);
    return { startDate: start, endDate: end, totalDays: 7 };
  }
  if (preset === "monthly") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000));
    return { startDate: start, endDate: end, totalDays };
  }
  if (preset === "quarterly") {
    const start = new Date(todayStart);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 89, 23, 59, 59, 999);
    return { startDate: start, endDate: end, totalDays: 90 };
  }
  if (preset === "half_yearly") {
    const start = new Date(todayStart);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 181, 23, 59, 59, 999);
    return { startDate: start, endDate: end, totalDays: 182 };
  }
  if (preset === "yearly") {
    const start = new Date(todayStart);
    const end = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
    return { startDate: start, endDate: end, totalDays: 365 };
  }

  // Custom or fallback to start/end or current month
  const start = customStart ? new Date(customStart) : new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const end = customEnd ? new Date(customEnd) : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000));
  return { startDate: start, endDate: end, totalDays };
}

export function computeCountdownText(
  status: BudgetComputedStatus,
  daysRemaining: number,
  remainingHours: number,
  daysPassed: number,
  totalDays: number,
  startDate: Date,
  endDate: Date,
  now: Date
): string {
  if (status === "upcoming") {
    const daysUntil = Math.max(1, Math.ceil((startDate.getTime() - now.getTime()) / 86400000));
    return `Starts in ${daysUntil} Day${daysUntil > 1 ? "s" : ""}`;
  }
  if (status === "completed" || status === "expired") {
    const daysAgo = Math.max(1, Math.ceil((now.getTime() - endDate.getTime()) / 86400000));
    return daysAgo === 1 ? "Expired Yesterday" : `Expired ${daysAgo} Days Ago`;
  }
  if (daysRemaining === 0) {
    return remainingHours > 0 ? `Ends in ${remainingHours} Hours` : "Expires Today";
  }
  if (daysRemaining === 1) {
    return "Expires Tomorrow";
  }
  if (daysRemaining >= 60) {
    const months = (daysRemaining / 30.4).toFixed(1);
    return `Ends in ${months} Months`;
  }
  if (daysRemaining >= 14) {
    const weeks = Math.floor(daysRemaining / 7);
    return `Ends in ${weeks} Weeks (${daysRemaining} Days)`;
  }
  return `${daysRemaining} Days Left`;
}

export function parseSafeDate(val: any): Date {
  if (!val) return new Date();
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? new Date() : val;
  }
  if (typeof val === "number") {
    const d = new Date(val);
    return isNaN(d.getTime()) ? new Date() : d;
  }
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (!trimmed) return new Date();

    // Check for DD-MM-YYYY or DD/MM/YYYY
    const dmyMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(.*)$/);
    if (dmyMatch) {
      const day = parseInt(dmyMatch[1], 10);
      const month = parseInt(dmyMatch[2], 10) - 1;
      const year = parseInt(dmyMatch[3], 10);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) return d;
    }

    // Standard new Date parse (handles YYYY-MM-DD, ISO, etc.)
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date();
}

export function getSafeIsoDateStr(val: any): string {
  try {
    const d = parseSafeDate(val);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  } catch {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
}

export function getSafeFullIsoDateStr(val: any): string {
  try {
    const d = parseSafeDate(val);
    return d.toISOString();
  } catch {
    return new Date().toISOString();
  }
}




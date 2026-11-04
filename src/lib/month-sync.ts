import { format } from "date-fns";

export interface MonthInfo {
  year: number;
  month: number; // 1-12
  monthIndex: number; // 0-11
  monthStr: string; // "YYYY-MM"
  label: string; // e.g. "November 2026"
  shortLabel: string; // e.g. "Nov 2026"
  startDate: Date; // 1st day 00:00:00.000
  endDate: Date; // Last day 23:59:59.999
  totalDays: number;
  elapsedDays: number;
  remainingDays: number;
  isCurrentMonth: boolean;
  isPastMonth: boolean;
  isFutureMonth: boolean;
  status: "current" | "past" | "future";
  prevMonthStr: string; // "2026-10"
  nextMonthStr: string; // "2026-12"
}

export const MONTH_STORAGE_KEY = "splitledger_selected_month";
export const MONTH_EVENT_NAME = "splitledger:month-change";

/**
 * Pure date and boundary calculator for month synchronization.
 * Handles month boundaries, year transitions, leap years, and timezones accurately.
 */
export function parseMonthParam(param?: string | null): MonthInfo {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-based

  let year = currentYear;
  let month = currentMonth;

  if (param && typeof param === "string") {
    const match = param.trim().match(/^(\d{4})-(\d{1,2})$/);
    if (match) {
      const parsedYear = parseInt(match[1], 10);
      const parsedMonth = parseInt(match[2], 10);
      if (parsedYear >= 2000 && parsedYear <= 2100 && parsedMonth >= 1 && parsedMonth <= 12) {
        year = parsedYear;
        month = parsedMonth;
      }
    }
  }

  const monthIndex = month - 1;
  const monthStr = `${year}-${String(month).padStart(2, "0")}`;

  // Month start: 1st of month at 00:00:00.000
  const startDate = new Date(year, monthIndex, 1, 0, 0, 0, 0);

  // Month end: last day of month at 23:59:59.999
  // Day 0 of monthIndex + 1 yields the exact last day of monthIndex, properly handling Feb in leap years
  const endDate = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);
  const totalDays = endDate.getDate();

  const isCurrentMonth = year === currentYear && month === currentMonth;
  const isPastMonth = year < currentYear || (year === currentYear && month < currentMonth);
  const isFutureMonth = year > currentYear || (year === currentYear && month > currentMonth);

  let elapsedDays = totalDays;
  let remainingDays = 0;

  if (isCurrentMonth) {
    elapsedDays = Math.max(1, now.getDate());
    remainingDays = Math.max(0, totalDays - elapsedDays);
  } else if (isFutureMonth) {
    elapsedDays = 0;
    remainingDays = totalDays;
  } else {
    // Past month: all days elapsed
    elapsedDays = totalDays;
    remainingDays = 0;
  }

  // Prev month
  const prevDate = new Date(year, monthIndex - 1, 1);
  const prevMonthStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;

  // Next month
  const nextDate = new Date(year, monthIndex + 1, 1);
  const nextMonthStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}`;

  let label = `${monthStr}`;
  let shortLabel = `${monthStr}`;
  try {
    label = format(startDate, "MMMM yyyy");
    shortLabel = format(startDate, "MMM yyyy");
  } catch {
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    label = `${monthNames[monthIndex]} ${year}`;
    shortLabel = `${monthNames[monthIndex].slice(0, 3)} ${year}`;
  }

  return {
    year,
    month,
    monthIndex,
    monthStr,
    label,
    shortLabel,
    startDate,
    endDate,
    totalDays,
    elapsedDays,
    remainingDays,
    isCurrentMonth,
    isPastMonth,
    isFutureMonth,
    status: isCurrentMonth ? "current" : isPastMonth ? "past" : "future",
    prevMonthStr,
    nextMonthStr,
  };
}

/**
 * Read the user's selected month from browser storage or URL
 */
export function getStoredMonth(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const urlMonth = urlParams.get("month");
    if (urlMonth && /^\d{4}-\d{2}$/.test(urlMonth)) {
      return urlMonth;
    }
    const stored = localStorage.getItem(MONTH_STORAGE_KEY);
    if (stored && /^\d{4}-\d{2}$/.test(stored)) {
      return stored;
    }
  } catch {
    // localStorage might be unavailable
  }
  return null;
}

/**
 * Persist selected month across browser sessions and dispatch synchronizing event
 */
export function setStoredMonth(monthStr: string): void {
  if (typeof window === "undefined" || !/^\d{4}-\d{2}$/.test(monthStr)) return;
  try {
    localStorage.setItem(MONTH_STORAGE_KEY, monthStr);
    window.dispatchEvent(
      new CustomEvent(MONTH_EVENT_NAME, {
        detail: { month: monthStr },
      })
    );
  } catch {
    // Ignore storage errors
  }
}


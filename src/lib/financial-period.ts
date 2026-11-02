export type PeriodFilter =
  | "today"
  | "yesterday"
  | "this_week"
  | "last_week"
  | "current_month"
  | "last_month"
  | "current_quarter"
  | "last_quarter"
  | "current_year"
  | "last_year"
  | "all_time"
  | "custom";

export interface PeriodDateRangeResult {
  startDate: Date | null;
  endDate: Date | null;
  prevStartDate: Date | null;
  prevEndDate: Date | null;
  periodLabel: string;
  comparisonLabel: string;
  elapsedDays: number;
}

/**
 * Pure date range calculator for Financial Intelligence & Forecasting.
 * Separated into a pure library file to strictly satisfy Next.js 15 Server Actions requirements
 * where `"use server"` files may only export asynchronous functions.
 */
export function getPeriodDateRange(
  period: string = "current_month",
  now: Date = new Date(),
  customStart?: string,
  customEnd?: string
): PeriodDateRangeResult {
  const year = now.getFullYear();
  const month = now.getMonth();
  const date = now.getDate();
  const day = now.getDay();

  let startDate: Date | null = null;
  let endDate: Date | null = null;
  let prevStartDate: Date | null = null;
  let prevEndDate: Date | null = null;
  let periodLabel = "Current Month";
  let comparisonLabel = "vs Previous Month";
  let elapsedDays = Math.max(1, date);

  switch (period) {
    case "today": {
      startDate = new Date(year, month, date, 0, 0, 0, 0);
      endDate = new Date(year, month, date, 23, 59, 59, 999);
      prevStartDate = new Date(year, month, date - 1, 0, 0, 0, 0);
      prevEndDate = new Date(year, month, date - 1, 23, 59, 59, 999);
      periodLabel = "Today";
      comparisonLabel = "vs Yesterday";
      elapsedDays = 1;
      break;
    }
    case "yesterday": {
      startDate = new Date(year, month, date - 1, 0, 0, 0, 0);
      endDate = new Date(year, month, date - 1, 23, 59, 59, 999);
      prevStartDate = new Date(year, month, date - 2, 0, 0, 0, 0);
      prevEndDate = new Date(year, month, date - 2, 23, 59, 59, 999);
      periodLabel = "Yesterday";
      comparisonLabel = "vs Day Before Yesterday";
      elapsedDays = 1;
      break;
    }
    case "this_week": {
      const diffToMonday = (day === 0 ? -6 : 1) - day;
      startDate = new Date(year, month, date + diffToMonday, 0, 0, 0, 0);
      endDate = new Date(year, month, date, 23, 59, 59, 999);
      prevStartDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() - 7, 0, 0, 0, 0);
      prevEndDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() - 1, 23, 59, 59, 999);
      periodLabel = "This Week";
      comparisonLabel = "vs Previous Week";
      elapsedDays = Math.max(1, day === 0 ? 7 : day);
      break;
    }
    case "last_week": {
      const diffToMonday = (day === 0 ? -6 : 1) - day;
      const currentMonday = new Date(year, month, date + diffToMonday, 0, 0, 0, 0);
      startDate = new Date(currentMonday.getFullYear(), currentMonday.getMonth(), currentMonday.getDate() - 7, 0, 0, 0, 0);
      endDate = new Date(currentMonday.getFullYear(), currentMonday.getMonth(), currentMonday.getDate() - 1, 23, 59, 59, 999);
      prevStartDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() - 7, 0, 0, 0, 0);
      prevEndDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() - 1, 23, 59, 59, 999);
      periodLabel = "Last Week";
      comparisonLabel = "vs Week Before Last";
      elapsedDays = 7;
      break;
    }
    case "current_month": {
      startDate = new Date(year, month, 1, 0, 0, 0, 0);
      endDate = new Date(year, month, date, 23, 59, 59, 999);
      prevStartDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
      prevEndDate = new Date(year, month, 0, 23, 59, 59, 999);
      periodLabel = "Current Month";
      comparisonLabel = "vs Previous Month";
      elapsedDays = Math.max(1, date);
      break;
    }
    case "last_month": {
      startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
      endDate = new Date(year, month, 0, 23, 59, 59, 999);
      prevStartDate = new Date(year, month - 2, 1, 0, 0, 0, 0);
      prevEndDate = new Date(year, month - 1, 0, 23, 59, 59, 999);
      periodLabel = "Last Month";
      comparisonLabel = "vs Month Before Last";
      elapsedDays = new Date(year, month, 0).getDate();
      break;
    }
    case "current_quarter": {
      const qStartMonth = Math.floor(month / 3) * 3;
      const qNum = Math.floor(month / 3) + 1;
      startDate = new Date(year, qStartMonth, 1, 0, 0, 0, 0);
      endDate = new Date(year, month, date, 23, 59, 59, 999);
      prevStartDate = new Date(year, qStartMonth - 3, 1, 0, 0, 0, 0);
      prevEndDate = new Date(year, qStartMonth, 0, 23, 59, 59, 999);
      periodLabel = `Current Quarter (Q${qNum})`;
      comparisonLabel = `vs Previous Quarter (Q${qNum === 1 ? 4 : qNum - 1})`;
      elapsedDays = Math.max(1, Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
      break;
    }
    case "last_quarter": {
      const qStartMonth = Math.floor(month / 3) * 3 - 3;
      const qNum = ((Math.floor(month / 3) + 3) % 4) || 4;
      startDate = new Date(year, qStartMonth, 1, 0, 0, 0, 0);
      endDate = new Date(year, qStartMonth + 3, 0, 23, 59, 59, 999);
      prevStartDate = new Date(year, qStartMonth - 3, 1, 0, 0, 0, 0);
      prevEndDate = new Date(year, qStartMonth, 0, 23, 59, 59, 999);
      periodLabel = `Last Quarter (Q${qNum})`;
      comparisonLabel = `vs Quarter Before Last`;
      elapsedDays = Math.max(1, Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
      break;
    }
    case "current_year": {
      startDate = new Date(year, 0, 1, 0, 0, 0, 0);
      endDate = new Date(year, month, date, 23, 59, 59, 999);
      prevStartDate = new Date(year - 1, 0, 1, 0, 0, 0, 0);
      prevEndDate = new Date(year - 1, 11, 31, 23, 59, 59, 999);
      periodLabel = `Current Year (${year})`;
      comparisonLabel = `vs Previous Year (${year - 1})`;
      elapsedDays = Math.max(1, Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
      break;
    }
    case "last_year": {
      startDate = new Date(year - 1, 0, 1, 0, 0, 0, 0);
      endDate = new Date(year - 1, 11, 31, 23, 59, 59, 999);
      prevStartDate = new Date(year - 2, 0, 1, 0, 0, 0, 0);
      prevEndDate = new Date(year - 2, 11, 31, 23, 59, 59, 999);
      periodLabel = `Last Year (${year - 1})`;
      comparisonLabel = `vs Year Before Last (${year - 2})`;
      elapsedDays = 365;
      break;
    }
    case "all_time": {
      startDate = null;
      endDate = null;
      prevStartDate = null;
      prevEndDate = null;
      periodLabel = "All-Time Ledger";
      comparisonLabel = "All-Time Baseline";
      elapsedDays = 30;
      break;
    }
    case "custom": {
      startDate = customStart ? new Date(customStart) : new Date(year, month, 1, 0, 0, 0, 0);
      endDate = customEnd ? new Date(customEnd) : new Date(year, month, date, 23, 59, 59, 999);
      prevStartDate = null;
      prevEndDate = null;
      periodLabel = "Custom Range";
      comparisonLabel = "Baseline";
      elapsedDays = Math.max(1, Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
      break;
    }
    default: {
      startDate = new Date(year, month, 1, 0, 0, 0, 0);
      endDate = new Date(year, month, date, 23, 59, 59, 999);
      prevStartDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
      prevEndDate = new Date(year, month, 0, 23, 59, 59, 999);
      periodLabel = "Current Month";
      comparisonLabel = "vs Previous Month";
      elapsedDays = Math.max(1, date);
    }
  }

  return {
    startDate,
    endDate,
    prevStartDate,
    prevEndDate,
    periodLabel,
    comparisonLabel,
    elapsedDays,
  };
}


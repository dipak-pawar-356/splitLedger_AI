/**
 * Smart Financial Note Analyzer (NLP & Expense Extractor)
 * Extracts date-wise and point-wise expense entries from user notes and journals
 * without creating duplicate transactions.
 * Computes monthly totals, categories, trends, and comparisons.
 */

export interface ExtractedNoteExpense {
  id: string; // unique deterministic hash / id
  noteId?: number;
  noteTitle?: string;
  description: string;
  amount: number; // in normal currency units (INR ₹)
  category: string;
  date: string; // YYYY-MM-DD
  month: string; // Full month name, e.g. "November"
  year: number; // e.g. 2026
  monthKey: string; // YYYY-MM
  rawText: string;
  lineNumber: number;
}

export interface MonthlyNoteExpenseSummary {
  monthKey: string; // YYYY-MM
  monthName: string; // e.g. "November 2026"
  shortMonthName: string; // e.g. "Nov 2026"
  year: number;
  monthIndex: number; // 0-11
  totalAmount: number;
  expenseCount: number;
  highestExpense: ExtractedNoteExpense | null;
  lowestExpense: ExtractedNoteExpense | null;
  averageExpense: number;
  topCategory: { name: string; amount: number; count: number } | null;
  categoryBreakdown: Array<{ name: string; amount: number; count: number; percentage: number }>;
  items: ExtractedNoteExpense[];
}

export interface FinancialNotesAnalysisResult {
  totalExpensesCount: number;
  allTimeTotalAmount: number;
  monthlySummaries: MonthlyNoteExpenseSummary[];
  currentMonth: MonthlyNoteExpenseSummary | null;
  previousMonth: MonthlyNoteExpenseSummary | null;
  trend: {
    percentageDiff: number; // e.g. +12 or -61
    direction: "up" | "down" | "neutral";
    comparisonText: string; // e.g. "↓ 61% vs Previous Month"
  };
  highestOverallExpense: ExtractedNoteExpense | null;
  lowestOverallExpense: ExtractedNoteExpense | null;
  mostUsedCategory: string;
  allExpenses: ExtractedNoteExpense[];
}

/**
 * Standard category dictionary for automated inference
 */
const CATEGORY_RULES: Array<{ category: string; keywords: string[] }> = [
  {
    category: "Travel",
    keywords: [
      "bus", "travel", "flight", "train", "metro", "cab", "taxi", "uber", "ola", "rapido",
      "auto", "fuel", "petrol", "diesel", "cng", "toll", "parking", "airfare", "railway",
      "ticket", "fare", "commute", "pass",
    ],
  },
  {
    category: "Shopping",
    keywords: [
      "flipkart", "amazon", "myntra", "meesho", "ajio", "nykaa", "order", "shopping",
      "dress", "shirt", "pant", "tshirt", "jeans", "shoes", "jacket", "clothes",
      "electronics", "gadget", "watch", "perfume", "bag", "earphones", "headphones",
    ],
  },
  {
    category: "Food & Drinks",
    keywords: [
      "tea", "chai", "coffee", "breakfast", "lunch", "dinner", "snack", "snacks",
      "restaurant", "hotel", "cafe", "dhaba", "zomato", "swiggy", "pizza", "burger",
      "biryani", "canteen", "treat", "juice", "bakery", "cake", "sweet", "sweets",
    ],
  },
  {
    category: "Groceries",
    keywords: [
      "grocery", "groceries", "vegetable", "vegetables", "fruit", "fruits", "milk",
      "dairy", "curd", "paneer", "bread", "ration", "supermarket", "mart", "blinkit",
      "zepto", "instamart", "bigbasket", "d-mart", "dmart", "spices", "oil", "rice", "wheat",
    ],
  },
  {
    category: "Bills & Utilities",
    keywords: [
      "electricity", "current bill", "water bill", "wifi", "broadband", "internet",
      "recharge", "mobile recharge", "gas", "lpg", "cylinder", "rent", "maintenance",
      "dth", "cable", "utility", "bill", "subscription",
    ],
  },
  {
    category: "Healthcare",
    keywords: [
      "medicine", "medicines", "medical", "pharmacy", "chemist", "doctor", "hospital",
      "clinic", "consultation", "test", "lab", "tablets", "syrup", "health", "dental",
    ],
  },
  {
    category: "Entertainment",
    keywords: [
      "movie", "cinema", "theatre", "netflix", "prime", "hotstar", "spotify", "youtube",
      "game", "gaming", "amusement", "show", "event", "concert", "outing",
    ],
  },
];

/**
 * Infer the best category based on the expense description
 */
export function inferCategoryFromText(text: string): string {
  const clean = text.toLowerCase();
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((kw) => clean.includes(kw))) {
      return rule.category;
    }
  }
  return "General";
}

/**
 * Normalize and parse a date string from various formats:
 * - DD/MM/YYYY, D/M/YYYY
 * - DD-MM-YYYY, D-M-YYYY
 * - YYYY-MM-DD
 * - Month Day Year (e.g. "November 1 2026", "Nov 1 2026", "1 Nov 2026")
 */
export function parseDateString(dateStr: string, fallbackDate: Date = new Date()): Date {
  const trimmed = dateStr.trim();

  // Format: YYYY-MM-DD
  const isoMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10) - 1;
    const day = parseInt(isoMatch[3], 10);
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d;
  }

  // Format: DD/MM/YYYY or DD-MM-YYYY or D/M/YYYY
  const dmyMatch = trimmed.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d;
  }

  // Format: Words like "November 1 2026", "Nov 1 2026", "1 Nov 2026", "1st November 2026"
  const cleanWords = trimmed
    .replace(/(?:st|nd|rd|th)/gi, "")
    .replace(/,/g, " ")
    .trim();
  const parsedTimestamp = Date.parse(cleanWords);
  if (!isNaN(parsedTimestamp)) {
    return new Date(parsedTimestamp);
  }

  return fallbackDate;
}

/**
 * Check if a string contains a standalone date header (e.g. "Date: 01/11/2026", "01/11/2026", "November 1, 2026")
 */
export function extractDateFromLine(line: string): Date | null {
  const clean = line.trim();
  if (!clean) return null;

  // Patterns with prefix like "Date: 01/11/2026", "Date - 1-11-2026", "Date 2026-11-01"
  const prefixMatch = clean.match(/^(?:date|dated|on)\s*[:=-]?\s*([a-zA-Z0-9\s,./-]+)$/i);
  if (prefixMatch) {
    const candidate = prefixMatch[1].trim();
    const d = parseDateString(candidate);
    if (d && !isNaN(d.getTime())) return d;
  }

  // Pure date on line: "01/11/2026", "1/11/2026", "01-11-2026", "2026-11-01"
  if (/^(\d{1,2}[-/.]\d{1,2}[-/.]\d{4}|\d{4}[-/.]\d{1,2}[-/.]\d{1,2})$/.test(clean)) {
    return parseDateString(clean);
  }

  // Textual date: "November 1 2026", "Nov 1, 2026", "1st November 2026"
  const monthNames = "(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";
  const textDatePattern = new RegExp(`^(?:(?:\\d{1,2}(?:st|nd|rd|th)?\\s+)?${monthNames}(?:\\s+\\d{1,2}(?:st|nd|rd|th)?)?(?:,?\\s+\\d{4})?)$`, "i");
  if (textDatePattern.test(clean)) {
    return parseDateString(clean);
  }

  return null;
}

/**
 * Filter out false-positive number patterns:
 * - 10-digit mobile numbers (e.g. 9876543210, +91...)
 * - 4-6 digit OTPs or PINs (e.g. OTP: 481923)
 * - Order IDs or alphanumeric codes (e.g. OD1234567, INV-001)
 * - UPI IDs (e.g. 9876543210@upi, name@okhdfcbank)
 * - Years (e.g. 2026)
 */
function isFalsePositiveNumber(line: string, amount: number): boolean {
  // 10-digit mobile phone number check
  if (/(\+?\d{1,3}[-.\s]?)?[6-9]\d{9}\b/.test(line)) {
    // If line mentions phone/mobile/call
    if (/(?:call|phone|mobile|contact|tel|whatsapp|ph)\b/i.test(line)) {
      return true;
    }
  }

  // OTP or verification code
  if (/\b(?:otp|pin|code|password)\b/i.test(line)) {
    return true;
  }

  // Invoice / Order number
  if (/\b(?:inv|invoice|ord|order|id|ref|reference|txn|hash)\s*[:#=-]?\s*\w+/i.test(line)) {
    // If the line only contains the order number without expense wording
    if (!/(?:paid|spent|cost|price|bought|order\s*-\s*\d+)/i.test(line)) {
      return true;
    }
  }

  // UPI ID
  if (/[\w.-]+@[\w.-]+/.test(line) && !line.includes("-") && !line.includes("₹")) {
    return true;
  }

  // Standalone Year like 2024, 2025, 2026 without any expense indicators
  if (amount >= 2000 && amount <= 2099 && !/(?:rs|inr|₹|\/-|paid|spent|cost|-)/i.test(line)) {
    return true;
  }

  return false;
}

/**
 * Convert HTML content to plain text with preserved line breaks
 */
export function htmlToCleanLines(htmlOrText: string): string[] {
  if (!htmlOrText) return [];

  // Replace common HTML block elements and breaks with newlines
  const text = htmlOrText
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<[^>]+>/g, " ") // remove all remaining tags
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");

  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

/**
 * Parse an individual note line to extract an expense item:
 * Examples:
 * - "1. for bus travel - 500"
 * - "1. Bus Travel - 500"
 * - "2. Flipkart order - 375"
 * - "3. Tea - 20"
 * - "4. Grocery - 1500"
 * - "- Tea: ₹20"
 * - "Movie tickets 600 rs"
 */
export function parseExpenseLine(
  line: string,
  lineNumber: number,
  currentDate: Date,
  noteId?: number,
  noteTitle?: string
): ExtractedNoteExpense | null {
  const clean = line.trim();
  if (!clean || clean.length < 3) return null;

  // Skip standalone dates
  if (extractDateFromLine(clean)) return null;

  // Regex patterns to capture amount & description:
  // Pattern 1: "1. Bus Travel - 500" or "1. for bus travel - 500" or "Bus Travel - ₹500"
  // Captures: index (opt), description, separator, amount
  const pattern1 = /^(?:\d+[\.\)]|\*|\-|\•)?\s*(?:for\s+)?(.*?)(?:[-:–—=]|\s+(?:for|rs|inr|₹)\s+)\s*(?:rs\.?|inr|₹)?\s*([0-9,]+(?:\.\d{1,2})?)\s*(?:\/-|rs|rupees|inr)?$/i;

  // Pattern 2: "1. Bus Travel 500 rs" or "₹500 for Bus Travel"
  const pattern2 = /^(?:rs\.?|inr|₹)\s*([0-9,]+(?:\.\d{1,2})?)\s*(?:for|on|-)?\s*(.*?)$/i;
  const pattern3 = /^(?:\d+[\.\)]|\*|\-|\•)?\s*(.*?)\s+(?:rs\.?|inr|₹)\s*([0-9,]+(?:\.\d{1,2})?)$/i;

  let rawDesc = "";
  let rawAmount = "";

  const match1 = clean.match(pattern1);
  if (match1 && match1[1] && match1[2]) {
    rawDesc = match1[1].trim();
    rawAmount = match1[2].replace(/,/g, "").trim();
  } else {
    const match2 = clean.match(pattern2);
    if (match2 && match2[1] && match2[2]) {
      rawAmount = match2[1].replace(/,/g, "").trim();
      rawDesc = match2[2].trim();
    } else {
      const match3 = clean.match(pattern3);
      if (match3 && match3[1] && match3[2]) {
        rawDesc = match3[1].trim();
        rawAmount = match3[2].replace(/,/g, "").trim();
      }
    }
  }

  // Fallback pattern: line ending in "- <amount>" e.g. "Flipkart Order - 375"
  if (!rawAmount) {
    const dashMatch = clean.match(/^(?:(?:\d+[\.\)]|\*|\-|\•)?\s*)?(.*?)\s*[-:]\s*([0-9,]+(?:\.\d{1,2})?)$/);
    if (dashMatch && dashMatch[1] && dashMatch[2]) {
      rawDesc = dashMatch[1].trim();
      rawAmount = dashMatch[2].replace(/,/g, "").trim();
    }
  }

  if (!rawAmount || !rawDesc) return null;

  const parsedAmount = parseFloat(rawAmount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) return null;

  // Check false positives
  if (isFalsePositiveNumber(clean, parsedAmount)) return null;

  // Clean description: strip leading bullet points, numbers, or "for"
  let cleanDesc = rawDesc
    .replace(/^(?:\d+[\.\)]|\*|\-|\•)\s*/, "")
    .replace(/^for\s+/i, "")
    .trim();

  // If description is empty or looks like a date/phone, skip
  if (!cleanDesc || cleanDesc.length < 2) return null;
  if (/^\d+$/.test(cleanDesc)) return null;

  // Capitalize description nicely
  cleanDesc = cleanDesc.charAt(0).toUpperCase() + cleanDesc.slice(1);

  const category = inferCategoryFromText(cleanDesc);

  const year = currentDate.getFullYear();
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const month = monthNames[currentDate.getMonth()];
  const monthKey = `${year}-${String(currentDate.getMonth() + 1).padStart(2, "0")}`;
  const dateStr = `${year}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(currentDate.getDate()).padStart(2, "0")}`;

  const expenseId = `note_exp_${noteId || 0}_${lineNumber}_${Math.round(parsedAmount)}_${cleanDesc.slice(0, 8).toLowerCase().replace(/\s+/g, "_")}`;

  return {
    id: expenseId,
    noteId,
    noteTitle,
    description: cleanDesc,
    amount: parsedAmount,
    category,
    date: dateStr,
    month,
    year,
    monthKey,
    rawText: clean,
    lineNumber,
  };
}

/**
 * Analyze an entire note document and extract all expenses
 */
export function extractExpensesFromNote(
  noteContent: string,
  noteCreatedAt: Date = new Date(),
  noteId?: number,
  noteTitle?: string
): ExtractedNoteExpense[] {
  const lines = htmlToCleanLines(noteContent);
  const expenses: ExtractedNoteExpense[] = [];
  let currentDate = noteCreatedAt;

  lines.forEach((line, index) => {
    // Check if the line sets a new date
    const dateOnLine = extractDateFromLine(line);
    if (dateOnLine) {
      currentDate = dateOnLine;
      return;
    }

    const exp = parseExpenseLine(line, index + 1, currentDate, noteId, noteTitle);
    if (exp) {
      expenses.push(exp);
    }
  });

  return expenses;
}

/**
 * Aggregate an array of extracted note expenses across all notes into full financial analytics
 */
export function aggregateFinancialNotes(
  allExpenses: ExtractedNoteExpense[]
): FinancialNotesAnalysisResult {
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  // Group expenses by MonthKey (YYYY-MM)
  const groupMap = new Map<string, ExtractedNoteExpense[]>();
  let allTimeTotal = 0;
  let highestOverall: ExtractedNoteExpense | null = null;
  let lowestOverall: ExtractedNoteExpense | null = null;
  const categoryCountMap = new Map<string, number>();

  allExpenses.forEach((exp) => {
    allTimeTotal += exp.amount;

    if (!highestOverall || exp.amount > highestOverall.amount) {
      highestOverall = exp;
    }
    if (!lowestOverall || exp.amount < lowestOverall.amount) {
      lowestOverall = exp;
    }

    categoryCountMap.set(exp.category, (categoryCountMap.get(exp.category) || 0) + 1);

    const arr = groupMap.get(exp.monthKey) || [];
    arr.push(exp);
    groupMap.set(exp.monthKey, arr);
  });

  // Most used category overall
  let mostUsedCategory = "General";
  let maxCatCount = 0;
  categoryCountMap.forEach((count, cat) => {
    if (count > maxCatCount) {
      maxCatCount = count;
      mostUsedCategory = cat;
    }
  });

  // Build Monthly Summaries
  const summaries: MonthlyNoteExpenseSummary[] = [];

  // Sort month keys descending (newest first)
  const sortedMonthKeys = Array.from(groupMap.keys()).sort().reverse();

  sortedMonthKeys.forEach((key) => {
    const items = groupMap.get(key) || [];
    const totalAmount = items.reduce((sum, i) => sum + i.amount, 0);
    const count = items.length;

    let highest: ExtractedNoteExpense | null = null;
    let lowest: ExtractedNoteExpense | null = null;
    const catMap = new Map<string, { amount: number; count: number }>();

    items.forEach((item) => {
      if (!highest || item.amount > highest.amount) highest = item;
      if (!lowest || item.amount < lowest.amount) lowest = item;

      const c = catMap.get(item.category) || { amount: 0, count: 0 };
      c.amount += item.amount;
      c.count += 1;
      catMap.set(item.category, c);
    });

    const categoryBreakdown = Array.from(catMap.entries())
      .map(([name, data]) => ({
        name,
        amount: data.amount,
        count: data.count,
        percentage: totalAmount > 0 ? Math.round((data.amount / totalAmount) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    const topCategory = categoryBreakdown.length > 0 ? categoryBreakdown[0] : null;

    const [yStr, mStr] = key.split("-");
    const year = parseInt(yStr, 10);
    const mIdx = parseInt(mStr, 10) - 1;
    const mName = monthNames[mIdx] || "Unknown";

    summaries.push({
      monthKey: key,
      monthName: `${mName} ${year}`,
      shortMonthName: `${mName.slice(0, 3)} ${year}`,
      year,
      monthIndex: mIdx,
      totalAmount,
      expenseCount: count,
      highestExpense: highest,
      lowestExpense: lowest,
      averageExpense: count > 0 ? Math.round(totalAmount / count) : 0,
      topCategory,
      categoryBreakdown,
      items: items.sort((a, b) => b.amount - a.amount),
    });
  });

  // Current month & Previous month detection
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthKey = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, "0")}`;

  const currentMonthSummary = summaries.find((s) => s.monthKey === currentMonthKey) || null;
  const previousMonthSummary = summaries.find((s) => s.monthKey === prevMonthKey) || null;

  // Calculate Trend
  const currAmt = currentMonthSummary ? currentMonthSummary.totalAmount : 0;
  const prevAmt = previousMonthSummary ? previousMonthSummary.totalAmount : 0;

  let percentageDiff = 0;
  let direction: "up" | "down" | "neutral" = "neutral";
  let comparisonText = "No previous month data";

  if (prevAmt > 0) {
    percentageDiff = Math.round(((currAmt - prevAmt) / prevAmt) * 100);
    if (percentageDiff > 0) {
      direction = "up";
      comparisonText = `↑ ${percentageDiff}% vs Previous Month`;
    } else if (percentageDiff < 0) {
      direction = "down";
      comparisonText = `↓ ${Math.abs(percentageDiff)}% vs Previous Month`;
    } else {
      direction = "neutral";
      comparisonText = "0% change vs Previous Month";
    }
  } else if (currAmt > 0) {
    direction = "up";
    comparisonText = `New expenses this month`;
  }

  return {
    totalExpensesCount: allExpenses.length,
    allTimeTotalAmount: allTimeTotal,
    monthlySummaries: summaries,
    currentMonth: currentMonthSummary,
    previousMonth: previousMonthSummary,
    trend: {
      percentageDiff,
      direction,
      comparisonText,
    },
    highestOverallExpense: highestOverall,
    lowestOverallExpense: lowestOverall,
    mostUsedCategory,
    allExpenses,
  };
}

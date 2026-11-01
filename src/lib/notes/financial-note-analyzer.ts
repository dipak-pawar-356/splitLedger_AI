/**
 * SplitLedger AI – Smart Financial Note & Journal Analysis Engine
 * Extracts date-wise and point-wise entries from user notes and handwritten journals
 * with mathematical accuracy and strict date boundary enforcement.
 * Accurately classifies Income, Expense, Receivable, Payable, and Transfers.
 * Distributes entries strictly by their detected dates within single or multi-date notes.
 * Computes monthly totals, categories, cashflows, trends, and daily breakdowns.
 *
 * Core Rules:
 * 1. Date boundaries: whenever a line matches dd/mm/yyyy or similar, it starts a NEW transaction block.
 *    Everything after belongs ONLY to that date until the next date appears.
 * 2. Inflow / Outflow classification:
 *    - Income: Already received (e.g. Received Salary, Salary Credited, Received From Kunal, Bonus, Refund).
 *    - Expense: Already paid / spent (e.g. Chips, Petrol, Flipkart, Paid Rahul, Electric Bill, Recharge, Groceries).
 *    - Receivable: Expected incoming money (e.g. Kunal owes me 500, I need to take back from Kartik 1000, Kartik has to return 1000).
 *    - Payable: Money user still needs to pay (e.g. Need to pay Rahul 700, I need to pay Amol 500, Pending payment to shopkeeper 450).
 *    - Transfers: Internal account movements (Bank to UPI, Cash to SBI).
 * 3. Never double count: every entry belongs to ONE type only.
 * 4. Net Cashflow = Total Income - Total Expense.
 * 5. Automatic duplicate protection & confidence scoring (high, medium, low / needs review).
 */

export type FinancialFlowType = "expense" | "income" | "receivable" | "payable" | "transfer";

export interface ExtractedNoteExpense {
  id: string; // unique deterministic hash / id
  noteId?: number;
  noteTitle?: string;
  description: string;
  amount: number; // in normal currency units (INR ₹)
  type: FinancialFlowType;
  category: string;
  contactName?: string | null;
  confidence?: number; // 0 to 100
  confidenceLevel?: "high" | "medium" | "low";
  needsReview?: boolean;
  isAmbiguous?: boolean;
  ambiguityReason?: string;
  isDuplicate?: boolean;
  duplicateReason?: string;
  date: string; // YYYY-MM-DD
  month: string; // Full month name, e.g. "October"
  year: number; // e.g. 2026
  monthKey: string; // YYYY-MM
  rawText: string;
  lineNumber: number;
}

export interface DailyNoteFinancialBreakdown {
  date: string; // YYYY-MM-DD
  income: number;
  expense: number;
  receivable: number;
  payable: number;
  net: number;
  itemsCount: number;
  items: ExtractedNoteExpense[];
}

export interface NoteFinancialSummary {
  month: string; // e.g. "October"
  year: number; // e.g. 2026
  monthYear: string; // e.g. "October 2026"
  totalExpense: number;
  totalIncome: number;
  totalReceivable: number;
  totalPayable: number;
  netCashflow: number;
  expenseCount: number;
  incomeCount: number;
  receivableCount: number;
  payableCount: number;
  transferCount: number;
  totalTransactionsCount: number;
  hasDuplicates: boolean;
  duplicateCount: number;
  hasReviewItems: boolean;
  reviewCount: number;
  topExpenseNames: string[];
  topIncomeNames: string[];
  dateCount: number;
  dates: string[];
}

export interface MonthlyNoteExpenseSummary {
  monthKey: string; // YYYY-MM
  monthName: string; // e.g. "October 2026"
  shortMonthName: string; // e.g. "Oct 2026"
  year: number;
  monthIndex: number; // 0-11
  totalAmount: number; // For backward compatibility: total expenses
  totalExpense: number;
  totalIncome: number;
  totalReceivable: number;
  totalPayable: number;
  netCashflow: number;
  expenseCount: number;
  incomeCount: number;
  receivableCount: number;
  payableCount: number;
  transferCount: number;
  totalTransactionsCount: number;
  highestExpense: ExtractedNoteExpense | null;
  highestIncome: ExtractedNoteExpense | null;
  lowestExpense: ExtractedNoteExpense | null;
  averageExpense: number;
  averageIncome: number;
  averageDailyExpense: number;
  averageDailyIncome: number;
  topCategory: { name: string; amount: number; count: number } | null;
  categoryBreakdown: Array<{ name: string; amount: number; count: number; percentage: number }>;
  expenseCategories: Array<{ name: string; amount: number; count: number; percentage: number }>;
  incomeCategories: Array<{ name: string; amount: number; count: number; percentage: number }>;
  items: ExtractedNoteExpense[];
  dailyBreakdown: Record<string, DailyNoteFinancialBreakdown>;
}

export interface FinancialNotesAnalysisResult {
  totalExpensesCount: number;
  totalIncomeCount: number;
  totalReceivableCount: number;
  totalPayableCount: number;
  totalTransactionsCount: number;
  allTimeTotalAmount: number; // backward compatibility: expense total
  allTimeTotalExpense: number;
  allTimeTotalIncome: number;
  allTimeTotalReceivable: number;
  allTimeTotalPayable: number;
  allTimeNetCashflow: number;
  monthlySummaries: MonthlyNoteExpenseSummary[];
  currentMonth: MonthlyNoteExpenseSummary | null;
  previousMonth: MonthlyNoteExpenseSummary | null;
  trend: {
    percentageDiff: number; // e.g. +12 or -61
    direction: "up" | "down" | "neutral";
    comparisonText: string; // e.g. "↓ 61% vs Previous Month"
  };
  highestOverallExpense: ExtractedNoteExpense | null;
  highestOverallIncome: ExtractedNoteExpense | null;
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
      "mess", "tiffin", "thali", "chips",
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
      "dth", "cable", "utility", "bill", "subscription", "electric bill", "power bill",
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
  {
    category: "Salary",
    keywords: ["salary", "stipend", "paycheck", "wages", "payroll"],
  },
];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const MONTH_MAP: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

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
 * Detect Month and Year standalone headers (e.g. "October 2026", "Nov 2026", "Month: October 2026")
 */
export function extractMonthYearHeader(
  line: string
): { year: number; month: number; monthName: string } | null {
  if (!line) return null;
  const clean = line.replace(/^[#*_\-\s]+|[#*_\-\s]+$/g, "").trim();
  if (!clean || clean.length < 4) return null;

  const monthRegexStr = "(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";

  // e.g. "October 2026", "Month: October 2026", "Oct 2026", "October, 2026", "October - 2026"
  const m1 = clean.match(new RegExp(`^(?:month\\s*[:=-]?\\s*)?(${monthRegexStr})[\\s,/-]+(\\d{4})$`, "i"));
  if (m1) {
    const monthKey = m1[1].toLowerCase().slice(0, 3);
    const month = MONTH_MAP[monthKey] ?? 0;
    const year = parseInt(m1[2], 10);
    return { year, month, monthName: MONTH_NAMES[month] };
  }

  // e.g. "2026 October", "2026-10"
  const m2 = clean.match(new RegExp(`^(\\d{4})[\\s,/-]+(${monthRegexStr})$`, "i"));
  if (m2) {
    const year = parseInt(m2[1], 10);
    const monthKey = m2[2].toLowerCase().slice(0, 3);
    const month = MONTH_MAP[monthKey] ?? 0;
    return { year, month, monthName: MONTH_NAMES[month] };
  }

  return null;
}

/**
 * Normalize and parse a date string from various formats:
 * - DD/MM/YYYY, D/M/YYYY
 * - DD-MM-YYYY, D-M-YYYY
 * - YYYY-MM-DD
 * - DD/MM, D/M, DD-MM, D-M (with context year)
 * - Textual dates like "01 Oct 2026", "1 October 2026", "1st Oct"
 */
export function parseDateString(
  dateStr: string,
  contextYear: number = new Date().getFullYear(),
  contextMonth: number = new Date().getMonth()
): Date {
  const trimmed = dateStr.replace(/^[#*_\-\s]+|[#*_\-\s]+$/g, "").trim();

  // Format: YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = trimmed.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10) - 1;
    const day = parseInt(isoMatch[3], 10);
    const d = new Date(year, month, day, 12, 0, 0);
    if (!isNaN(d.getTime())) return d;
  }

  // Format: DD/MM/YYYY or DD-MM-YYYY or D/M/YYYY (Standard Indian / International format)
  const dmyMatch = trimmed.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    const d = new Date(year, month, day, 12, 0, 0);
    if (!isNaN(d.getTime())) return d;
  }

  // Format: DD/MM or DD-MM or D/M without year (e.g. "01/10", "04/10", "15/10")
  const dmMatch = trimmed.match(/^(\d{1,2})[-/.](\d{1,2})$/);
  if (dmMatch) {
    const day = parseInt(dmMatch[1], 10);
    const month = parseInt(dmMatch[2], 10) - 1;
    if (day >= 1 && day <= 31 && month >= 0 && month <= 11) {
      const d = new Date(contextYear, month, day, 12, 0, 0);
      if (!isNaN(d.getTime())) return d;
    }
  }

  // Format: "1 October 2026" or "1st October 2026" or "01 Oct"
  const monthRegexStr = "(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";
  const dmyWords = trimmed.match(new RegExp(`^(\\d{1,2})(?:st|nd|rd|th)?[\\s,/-]+(${monthRegexStr})(?:[\\s,/-]+(\\d{2,4}))?$`, "i"));
  if (dmyWords) {
    const day = parseInt(dmyWords[1], 10);
    const mStr = dmyWords[2].toLowerCase().slice(0, 3);
    const month = MONTH_MAP[mStr] ?? contextMonth;
    let year = dmyWords[3] ? parseInt(dmyWords[3], 10) : contextYear;
    if (year < 100) year += 2000;
    return new Date(year, month, day, 12, 0, 0);
  }

  // Format: "October 1 2026" or "Oct 1"
  const mdyWords = trimmed.match(new RegExp(`^(${monthRegexStr})[\\s,/-]+(\\d{1,2})(?:st|nd|rd|th)?(?:[\\s,/-]+(\\d{2,4}))?$`, "i"));
  if (mdyWords) {
    const mStr = mdyWords[1].toLowerCase().slice(0, 3);
    const month = MONTH_MAP[mStr] ?? contextMonth;
    const day = parseInt(mdyWords[2], 10);
    let year = mdyWords[3] ? parseInt(mdyWords[3], 10) : contextYear;
    if (year < 100) year += 2000;
    return new Date(year, month, day, 12, 0, 0);
  }

  return new Date(contextYear, contextMonth, 1, 12, 0, 0);
}

/**
 * Check if a string contains a standalone date header (e.g. "01/10/2026", "Date: 01/10/2026", "04/10/2026", "01/10")
 * Strict Rule: When detected, it indicates a new date section.
 */
export function extractDateFromLine(
  line: string,
  contextYear: number = new Date().getFullYear(),
  contextMonth: number = new Date().getMonth()
): Date | null {
  if (!line) return null;
  const clean = line.replace(/^[#*_\-\s]+|[#*_\-\s]+$/g, "").trim();
  if (!clean || clean.length < 2) return null;

  // Month-year headers alone (e.g. "October 2026") are not day dates
  if (extractMonthYearHeader(clean)) return null;

  // Prefixes like "Date: 01/10/2026", "Date - 1-10-2026", "Dated 01/10/2026", "On 01/10/2026"
  const prefixMatch = clean.match(/^(?:date|dated|on)\s*[:=-]?\s*([a-zA-Z0-9\s,./-]+)$/i);
  if (prefixMatch) {
    const candidate = prefixMatch[1].trim();
    if (!extractMonthYearHeader(candidate)) {
      const d = parseDateString(candidate, contextYear, contextMonth);
      if (d && !isNaN(d.getTime())) return d;
    }
  }

  // Pure date on line: "01/10/2026", "1/10/2026", "01-10-2026", "2026-10-01", "2026/10/01"
  if (/^(\d{1,2}[-/.]\d{1,2}[-/.]\d{4}|\d{4}[-/.]\d{1,2}[-/.]\d{1,2})$/.test(clean)) {
    return parseDateString(clean, contextYear, contextMonth);
  }

  // Short date on line: "01/10", "1/10", "04/10", "30/10"
  if (/^\d{1,2}[-/.]\d{1,2}$/.test(clean)) {
    return parseDateString(clean, contextYear, contextMonth);
  }

  const monthRegexStr = "(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";

  // Pattern: "1 October 2026" or "1st October" or "01 Oct 2026"
  const dmyWords = clean.match(new RegExp(`^(\\d{1,2})(?:st|nd|rd|th)?[\\s,/-]+(${monthRegexStr})(?:[\\s,/-]+(\\d{2,4}))?$`, "i"));
  if (dmyWords) {
    return parseDateString(clean, contextYear, contextMonth);
  }

  // Pattern: "October 1 2026" or "Oct 1"
  const mdyWords = clean.match(new RegExp(`^(${monthRegexStr})[\\s,/-]+(\\d{1,2})(?:st|nd|rd|th)?(?:[\\s,/-]+(\\d{2,4}))?$`, "i"));
  if (mdyWords) {
    return parseDateString(clean, contextYear, contextMonth);
  }

  return null;
}

/**
 * Filter out non-financial numbers and false positives:
 * - Order IDs (e.g. OD1234567, Order ID 548923)
 * - 10-12 digit phone numbers / mobile numbers
 * - 4-6 digit OTPs, PINs, passwords
 * - Years (e.g. 2026) without financial context
 * - Time of day (e.g. 10:30 AM, 5 PM)
 * - Reference hashes, tracking codes
 */
export function isFalsePositiveNumber(line: string, amount: number): boolean {
  const lower = line.toLowerCase();

  // 1. Order ID, invoice numbers, reference numbers (e.g. "Order ID 548923")
  if (/\b(?:order\s*id|inv(?:oice)?\s*id|ref(?:erence)?\s*id|tracking\s*id|pnr|txn\s*id|hash)\s*[:#=-]?\s*\w+/i.test(line)) {
    return true;
  }

  // 2. Mobile or phone numbers
  if (/(?:call|phone|mobile|contact|tel|whatsapp|ph)\s*[:#=-]?\s*[\d+]+/i.test(line)) {
    return true;
  }
  // Standalone 10-digit number without financial indicators
  if (/\b[6-9]\d{9}\b/.test(line) && !/(?:rs|inr|₹|\/-|paid|spent|cost|credit|received)/i.test(line)) {
    return true;
  }

  // 3. OTP, PIN, Security code
  if (/\b(?:otp|pin|passcode|code|password)\b/i.test(line)) {
    return true;
  }

  // 4. Standalone Year (e.g. 2024 - 2035) without any currency / item descriptor
  if (amount >= 2020 && amount <= 2035 && !/(?:rs|inr|₹|\/-|paid|spent|cost|flipkart|bill|order|-|:)/i.test(line)) {
    return true;
  }

  // 5. Time stamps (e.g. "Meeting at 5 pm", "10:30 am")
  if (/\b\d{1,2}(?::\d{2})?\s*(?:am|pm)\b/i.test(line) && !/(?:rs|inr|₹|\/-|-)/i.test(line)) {
    return true;
  }

  // 6. UPI ID
  if (/[\w.-]+@[\w.-]+/.test(line) && !line.includes("-") && !line.includes("₹") && !line.includes("rs")) {
    return true;
  }

  return false;
}

/**
 * Intelligent Natural Language Financial Flow Classifier
 * Accurately classifies into:
 * - Income: already received (Received Salary, Salary Credited, Received from Kunal, Bonus, Refund, Cashback)
 * - Expense: already spent (Chips, Petrol, Flipkart, Paid Rahul, Electric Bill, Recharge, Groceries, Paid Grocery)
 * - Receivable: money expected / someone owes you (Kunal owes me 500, Kartik has to return 1000, Need to collect from Amit)
 * - Payable: money user still needs to pay (Need to pay Rahul 700, I need to pay Amol 500, Pending payment to shopkeeper)
 * - Transfer: internal transfer (Bank to UPI, Cash to SBI)
 */
export function classifyFinancialIntent(
  description: string,
  rawText: string
): {
  type: FinancialFlowType;
  category: string;
  contactName: string | null;
  confidence: number;
  confidenceLevel: "high" | "medium" | "low";
  needsReview: boolean;
  isAmbiguous: boolean;
  ambiguityReason?: string;
} {
  const cleanDesc = description.trim();
  const lower = cleanDesc.toLowerCase();
  const lowerRaw = rawText.toLowerCase();

  // 1. Internal Transfers (Bank to UPI, Cash to SBI, etc.)
  if (
    /(?:bank\s+to\s+upi|cash\s+to\s+sbi|wallet\s+transfer|account\s+transfer|self\s+transfer|atm\s+withdr|transferred?\s+to\s+savings|transfer\s+to\s+(?:bank|savings|upi|sbi|hdfc|icici|axis|kotak|pnb))\b/i.test(
      lowerRaw
    )
  ) {
    return {
      type: "transfer",
      category: "Internal Transfer",
      contactName: null,
      confidence: 98,
      confidenceLevel: "high",
      needsReview: false,
      isAmbiguous: false,
    };
  }

  // 2. Ambiguous single-word transactions (Needs Review)
  if (/^(?:sent\s+money|transfer|transferred|money\s+transfer)$/i.test(lower)) {
    return {
      type: "transfer",
      category: "Transfer",
      contactName: null,
      confidence: 50,
      confidenceLevel: "low",
      needsReview: true,
      isAmbiguous: true,
      ambiguityReason: "Transfer destination or purpose not specified (bank transfer, loan, investment, or expense)",
    };
  }

  if (/^(?:credit|credited)$/i.test(lower)) {
    return {
      type: "income",
      category: "Credit",
      contactName: null,
      confidence: 60,
      confidenceLevel: "medium",
      needsReview: true,
      isAmbiguous: true,
      ambiguityReason: "Incoming credit source not specified (Salary, Refund, Loan, or Gift)",
    };
  }

  if (/^(?:paid|spent|debit|debited|expense)$/i.test(lower)) {
    return {
      type: "expense",
      category: "General",
      contactName: null,
      confidence: 60,
      confidenceLevel: "medium",
      needsReview: true,
      isAmbiguous: true,
      ambiguityReason: "Category not specified (Food, Fuel, Shopping, Bills, etc.)",
    };
  }

  // 3. PAYABLE: Money user STILL needs to pay / has to pay / owes / pending payment
  // Examples:
  // - "I need to pay Amol - 500"
  // - "I have to pay Rahul 300"
  // - "Need to pay electricity bill 1200"
  // - "Pending payment to shopkeeper 450"
  // - "Need to pay Rahul 700"
  // - "Borrowed from Amit 1000"
  // - "Yet to pay rent 10000"
  const isPayablePhrase = /(?:need\s+to\s+pay|have\s+to\s+pay|has\s+to\s+pay|must\s+pay|pending\s+payment|yet\s+to\s+pay|to\s+be\s+paid|due\s+to\s+pay|due\s+payment|borrowed\s+(?:from)?|owe\s+|owes\s+to|loan\s+repayment\s+due|repayment\s+pending)\b/i.test(
    lower
  );
  if (isPayablePhrase) {
    let contactName: string | null = null;
    const contactMatch = lower.match(
      /(?:(?:need\s+to\s+pay|have\s+to\s+pay|has\s+to\s+pay|pending\s+payment\s+to|owe|borrowed\s+from)\s+([a-z]+))/i
    );
    if (contactMatch) {
      const candidate = contactMatch[1].trim();
      const isGeneric = /(?:bill|rent|electricity|wifi|water|shop|shopkeeper|grocery|groceries|fee|fees|tax|emi)/i.test(candidate);
      if (!isGeneric && candidate.length > 1) {
        contactName = candidate.charAt(0).toUpperCase() + candidate.slice(1);
      }
    }

    const inferredCat = inferCategoryFromText(cleanDesc);
    const category = contactName ? "Contact Payment" : (inferredCat !== "General" ? inferredCat : "Payable");

    return {
      type: "payable",
      category,
      contactName,
      confidence: 95,
      confidenceLevel: "high",
      needsReview: false,
      isAmbiguous: false,
    };
  }

  // 4. RECEIVABLE: Expected incoming money (someone owes you / money you need to collect or take back)
  // Examples:
  // - "Kunal owes me 500"
  // - "I need to take back from Kartik - 1000"
  // - "Kartik has to return 1000"
  // - "Need to collect from Amit 700"
  // - "Need to receive from Kartik 1000"
  // - "Lent 500 to Rahul"
  // - "Pending from Kartik 1000"
  const isReceivablePhrase = /(?:owes\s+me|need\s+to\s+take\s+back|has\s+to\s+return|have\s+to\s+return|need\s+to\s+collect|need\s+to\s+receive|pending\s+from|yet\s+to\s+receive|to\s+collect\s+from|lent\s+(?:to\s+)?|gave\s+to\s+)/i.test(
    lower
  );
  if (isReceivablePhrase) {
    let contactName: string | null = null;
    const contactMatch = lower.match(
      /(?:([a-z]+)\s+owes\s+me|([a-z]+)\s+has\s+to\s+return|(?:take\s+back\s+from|collect\s+from|receive\s+from|pending\s+from|lent\s+to|gave\s+to)\s+([a-z]+))/i
    );
    if (contactMatch) {
      const raw = (contactMatch[1] || contactMatch[2] || contactMatch[3] || "").trim();
      if (raw.length > 1) {
        contactName = raw.charAt(0).toUpperCase() + raw.slice(1);
      }
    }

    return {
      type: "receivable",
      category: "Contact Payment",
      contactName,
      confidence: 96,
      confidenceLevel: "high",
      needsReview: false,
      isAmbiguous: false,
    };
  }

  // 5. INCOME: Money ALREADY received / credited
  // Examples:
  // - "Received Salary - 25000"
  // - "Salary Credited - 25000"
  // - "Salary - 25000"
  // - "Received From Kunal - 1500" (Income! Already received!)
  // - "Received From Rahul - 500" (Income!)
  // - "Freelance payment received - 8000"
  // - "Bonus received - 5000"
  // - "Refund received - 350"
  // - "Cashback received - 120"
  // - "Amit returned money - 800"
  // - "Rahul paid me - 450"
  const isReceivedFromContact = lower.match(
    /(?:received\s+(?:from|by)\s+([a-z\s]+)|([a-z\s]+)\s+(?:returned\s+money|paid\s+me|cleared\s+dues))/i
  );
  if (isReceivedFromContact) {
    const rawContact = (isReceivedFromContact[1] || isReceivedFromContact[2] || "").trim();
    const isCompanyOrSalary = /(?:salary|employer|office|company|flipkart|amazon|bank|gov|google)/i.test(rawContact);
    const contactName = (!isCompanyOrSalary && rawContact.length > 1)
      ? rawContact.charAt(0).toUpperCase() + rawContact.slice(1)
      : null;

    let cat = "Income";
    if (isCompanyOrSalary || lower.includes("salary")) cat = "Salary";
    else if (contactName) cat = "Contact Payment";

    return {
      type: "income",
      category: cat,
      contactName,
      confidence: 98,
      confidenceLevel: "high",
      needsReview: false,
      isAmbiguous: false,
    };
  }

  const isIncomeKeyword = /(?:salary|freelance|bonus|cashback|cash\s*back|dividend|interest|refund|stipend|pension|incentive|commission|client\s+payment|business\s+income|gift\s+received)\b/i.test(
    lower
  );
  if (isIncomeKeyword || lower.startsWith("received salary") || lower.startsWith("salary received") || lower.startsWith("salary credited")) {
    let cat = "Income";
    if (lower.includes("salary")) cat = "Salary";
    else if (lower.includes("freelance")) cat = "Freelance";
    else if (lower.includes("bonus")) cat = "Bonus";
    else if (lower.includes("refund")) cat = "Refund";
    else if (lower.includes("cashback") || lower.includes("cash back")) cat = "Cashback";
    else if (lower.includes("interest") || lower.includes("dividend")) cat = "Investments & Interest";
    else if (lower.includes("gift")) cat = "Gift";
    else if (lower.includes("business") || lower.includes("client")) cat = "Business Income";

    return {
      type: "income",
      category: cat,
      contactName: null,
      confidence: 98,
      confidenceLevel: "high",
      needsReview: false,
      isAmbiguous: false,
    };
  }

  // 6. EXPENSE: Already paid / spent
  // Examples:
  // - "Paid Rahul - 500" -> Expense only (NOT payable, already paid!)
  // - "Paid Electricity Bill 1500" -> Expense (Bills & Utilities)
  // - "Paid Grocery 850" -> Expense (Groceries)
  // - "Chips - 20" -> Expense (Food & Drinks)
  // - "Petrol - 500" -> Expense (Travel)
  // - "Flipkart Order - 300" -> Expense (Shopping)
  // - "Mess - 40" -> Expense (Food & Drinks)
  // - "Tea - 60" -> Expense (Food & Drinks)
  // - "Recharge - 399" -> Expense (Bills & Utilities)
  // - "Groceries - 1850" -> Expense (Groceries)
  // - "Electric Bill - 1200" -> Expense (Bills & Utilities)
  let contactName: string | null = null;
  const paidContactMatch = lower.match(/^paid\s+(?:to\s+)?([a-z]+)/i);
  if (paidContactMatch) {
    const target = paidContactMatch[1].trim();
    const isExpenseKeyword = /(?:bill|rent|petrol|fuel|ticket|electricity|water|wifi|mess|tea|coffee|dinner|lunch|breakfast|food|grocery|groceries|recharge|order|shopping|fee|fees|tax|emi|subscription|dues|credit)/i.test(
      target
    );
    if (!isExpenseKeyword && target.length > 1) {
      contactName = target.charAt(0).toUpperCase() + target.slice(1);
    }
  }

  const inferredCat = inferCategoryFromText(cleanDesc);
  const category = contactName ? "Contact Payment" : inferredCat;

  return {
    type: "expense",
    category,
    contactName,
    confidence: inferredCat !== "General" || contactName !== null ? 95 : 85,
    confidenceLevel: "high",
    needsReview: false,
    isAmbiguous: false,
  };
}

/**
 * Convert HTML or multiline text into clean, individual lines
 * Handles splitting numbered lists, bullet lists, and space-separated lines.
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

  const initialLines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const cleanLines: string[] = [];

  for (const rawLine of initialLines) {
    let line = rawLine.trim();
    if (!line) continue;

    // 1. If line starts with a date followed by text, e.g. "01/11/2026 1. Bus Travel - 500"
    const datePrefixMatch = line.match(/^((?:date\s*[:=-]?\s*)?(?:\d{1,2}[-/.]\d{1,2}[-/.]\d{4}|\d{4}[-/.]\d{1,2}[-/.]\d{1,2}))\s+(.+)$/i);
    if (datePrefixMatch) {
      cleanLines.push(datePrefixMatch[1].trim());
      line = datePrefixMatch[2].trim();
    }

    // 2. If line contains multiple numbered items on one line, e.g. "1. Bus Travel - 500 2. Flipkart Order - 375"
    if (/(?:\d+[\.\)]\s+.*?){2,}/.test(line)) {
      const parts = line.split(/(?<=\S)\s+(?=\d+[\.\)]\s+)/).map((p) => p.trim()).filter(Boolean);
      cleanLines.push(...parts);
      continue;
    }

    // 3. If line contains comma-separated expenses e.g. "Bus Travel - 500, Flipkart Order - 375"
    if (/(?:[A-Za-z\s]+[-:]\s*\d+)\s*,\s*(?:[A-Za-z\s]+[-:]\s*\d+)/.test(line)) {
      const parts = line.split(/\s*,\s*(?=[A-Za-z0-9])/).map((p) => p.trim()).filter(Boolean);
      cleanLines.push(...parts);
      continue;
    }

    // 4. If line contains multiple space-separated expenses without commas or numbering,
    // e.g. "Bus Travel - 500 Flipkart Order - 375 Tea - 20 Grocery - 1500"
    if (/(?:[-:]\s*₹?\s*\d+.*?){2,}/.test(line)) {
      const parts = line
        .split(/(?<=\b\d+(?:\.\d{1,2})?(?:\s*(?:rs|inr|\/-))?)\s+(?=[A-Za-z][^-\n:]*?[-:]\s*₹?\s*\d+)/i)
        .map((p) => p.trim())
        .filter(Boolean);
      if (parts.length > 1) {
        cleanLines.push(...parts);
        continue;
      }
    }

    cleanLines.push(line);
  }

  return cleanLines;
}

/**
 * Parse an individual note line to extract a financial entry:
 * - "Chips - 20"
 * - "Petrol - 500"
 * - "Flipkart Order - 300"
 * - "Received Salary - 25000"
 * - "Received From Kunal - 1500"
 * - "Paid Rahul - 500"
 * - "I need to pay Amol - 500"
 * - "Kunal owes me 500"
 * - "Paid Grocery 850"
 */
export function parseExpenseLine(
  line: string,
  lineNumber: number,
  currentDate: Date,
  noteId?: number,
  noteTitle?: string
): ExtractedNoteExpense | null {
  const clean = line.replace(/^[#*_\-\s\•\▪\▫]+|[#*_\-\s]+$/g, "").trim();
  if (!clean || clean.length < 2) return null;

  // Skip standalone dates and month headers completely
  if (extractDateFromLine(clean) || extractMonthYearHeader(clean)) return null;

  let rawDesc = "";
  let rawAmount = "";

  // Pattern 1: With separator (-, :, =, +, etc.):
  // "Chips - 20", "Petrol - 500", "Received Salary - 25000", "Received From Kunal - 1500", "Paid Rahul - 500"
  const pattern1 = /^(?:\d+[\.\)]|\*|\-|\•)?\s*(?:for\s+)?(.*?)(?:[-:–—=+]|\s+(?:for|rs|inr|₹|is|of)\s+)\s*(?:rs\.?|inr|₹)?\s*([0-9,]+(?:\.\d{1,2})?)\s*(?:\/-|rs|rupees|inr)?$/i;

  // Pattern 2: Amount first e.g. "₹500 for Bus Travel" or "+25000 Salary"
  const pattern2 = /^(?:\+|rs\.?|inr|₹)?\s*([0-9,]+(?:\.\d{1,2})?)\s*(?:for|on|-|\/)?\s*(.*?)$/i;

  // Pattern 3: Space separator e.g. "Kunal owes me 500", "Paid Grocery 850", "Kartik has to return 1000", "Mess 40", "Tea 60"
  const pattern3 = /^(?:\d+[\.\)]|\*|\-|\•)?\s*(.*?)\s+(?:rs\.?|inr|₹)?\s*([0-9,]+(?:\.\d{1,2})?)\s*(?:rs|rupees|inr|\/-)?$/i;

  const match1 = clean.match(pattern1);
  if (match1 && match1[1] && match1[2]) {
    rawDesc = match1[1].trim();
    rawAmount = match1[2].replace(/,/g, "").trim();
  } else {
    const match3 = clean.match(pattern3);
    if (match3 && match3[1] && match3[2] && isNaN(Number(match3[1]))) {
      rawDesc = match3[1].trim();
      rawAmount = match3[2].replace(/,/g, "").trim();
    } else {
      const match2 = clean.match(pattern2);
      if (match2 && match2[1] && match2[2] && isNaN(Number(match2[2]))) {
        rawAmount = match2[1].replace(/,/g, "").trim();
        rawDesc = match2[2].trim();
      }
    }
  }

  // Fallback: line ending in "- <amount>"
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

  // Check false positives (Order IDs, Phone numbers, OTPs, Years)
  if (isFalsePositiveNumber(clean, parsedAmount)) return null;

  // Clean description
  let cleanDesc = rawDesc
    .replace(/^(?:\d+[\.\)]|\*|\-|\•)\s*/, "")
    .replace(/^for\s+/i, "")
    .trim();

  if (!cleanDesc || cleanDesc.length < 2) return null;
  if (/^\d+$/.test(cleanDesc)) return null;

  // Format description
  cleanDesc = cleanDesc.charAt(0).toUpperCase() + cleanDesc.slice(1);

  // Perform Classification
  const classification = classifyFinancialIntent(cleanDesc, clean);

  const year = currentDate.getFullYear();
  const month = MONTH_NAMES[currentDate.getMonth()];
  const monthKey = `${year}-${String(currentDate.getMonth() + 1).padStart(2, "0")}`;
  const dateStr = `${year}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(currentDate.getDate()).padStart(2, "0")}`;

  const expenseId = `note_exp_${noteId || 0}_${lineNumber}_${Math.round(parsedAmount)}_${cleanDesc.slice(0, 10).toLowerCase().replace(/\s+/g, "_")}`;

  return {
    id: expenseId,
    noteId,
    noteTitle,
    description: cleanDesc,
    amount: parsedAmount,
    type: classification.type,
    category: classification.category,
    contactName: classification.contactName,
    confidence: classification.confidence,
    confidenceLevel: classification.confidenceLevel,
    needsReview: classification.needsReview,
    isAmbiguous: classification.isAmbiguous,
    ambiguityReason: classification.ambiguityReason,
    date: dateStr,
    month,
    year,
    monthKey,
    rawText: clean,
    lineNumber,
  };
}

/**
 * Analyze an entire note document and extract all financial entries:
 * - Scans sequentially
 * - Detects Month & Year (e.g. "October 2026")
 * - Enforces strict Date boundaries (whenever a date is found, starts a NEW block)
 * - Classifies into Income, Expense, Receivable, Payable
 * - Detects duplicates under the same date
 */
export function extractExpensesFromNote(
  noteContent: string,
  noteCreatedAt: Date = new Date(),
  noteId?: number,
  noteTitle?: string
): ExtractedNoteExpense[] {
  const lines = htmlToCleanLines(noteContent);
  if (!lines || lines.length === 0) return [];

  const expenses: ExtractedNoteExpense[] = [];

  // 1. Initial Context: inspect noteTitle or top lines for Month/Year header
  let contextYear = noteCreatedAt.getFullYear();
  let contextMonth = noteCreatedAt.getMonth();

  if (noteTitle) {
    const titleMonthYear = extractMonthYearHeader(noteTitle);
    if (titleMonthYear) {
      contextYear = titleMonthYear.year;
      contextMonth = titleMonthYear.month;
    }
  }

  // Pre-scan lines to see if there is a primary month header (e.g. "October 2026")
  for (const l of lines.slice(0, 5)) {
    const my = extractMonthYearHeader(l);
    if (my) {
      contextYear = my.year;
      contextMonth = my.month;
      break;
    }
  }

  let currentDate = new Date(contextYear, contextMonth, noteCreatedAt.getDate(), 12, 0, 0);
  let hasFoundExplicitDate = false;

  // Track duplicates per date: map of `date -> Map<signature, ExtractedNoteExpense>`
  const seenEntriesByDate = new Map<string, Map<string, number>>();

  lines.forEach((line, index) => {
    // 1. Check for Month + Year header (e.g. "October 2026")
    const monthYear = extractMonthYearHeader(line);
    if (monthYear) {
      contextYear = monthYear.year;
      contextMonth = monthYear.month;
      // If we haven't seen an explicit day date yet, anchor currentDate to 1st of that month
      if (!hasFoundExplicitDate) {
        currentDate = new Date(contextYear, contextMonth, 1, 12, 0, 0);
      }
      return;
    }

    // 2. Check for Date header (e.g. "01/10/2026", "04/10/2026", "10/10/2026", "01/10")
    // When a date is found, it closes the previous block and starts a NEW block!
    const dateOnLine = extractDateFromLine(line, contextYear, contextMonth);
    if (dateOnLine) {
      currentDate = dateOnLine;
      contextYear = currentDate.getFullYear();
      contextMonth = currentDate.getMonth();
      hasFoundExplicitDate = true;
      return;
    }

    // 3. Parse financial entry under the active currentDate
    const entry = parseExpenseLine(line, index + 1, currentDate, noteId, noteTitle);
    if (entry) {
      // Check for duplicate entry on the same date
      const dateKey = entry.date;
      if (!seenEntriesByDate.has(dateKey)) {
        seenEntriesByDate.set(dateKey, new Map<string, number>());
      }
      const dateMap = seenEntriesByDate.get(dateKey)!;
      const signature = `${entry.description.toLowerCase().trim()}_${entry.amount}`;

      if (dateMap.has(signature)) {
        entry.isDuplicate = true;
        entry.duplicateReason = `Possible duplicate under ${entry.date}: "${entry.description}" (₹${entry.amount.toLocaleString("en-IN")})`;
      } else {
        dateMap.set(signature, index + 1);
      }

      expenses.push(entry);
    }
  });

  return expenses;
}

/**
 * Generate a concise, mathematically accurate Financial Summary for a note
 */
export function getNoteFinancialSummary(
  expenses: ExtractedNoteExpense[],
  noteTitle?: string
): NoteFinancialSummary {
  let totalExpense = 0;
  let totalIncome = 0;
  let totalReceivable = 0;
  let totalPayable = 0;
  let expenseCount = 0;
  let incomeCount = 0;
  let receivableCount = 0;
  let payableCount = 0;
  let transferCount = 0;
  let duplicateCount = 0;
  let reviewCount = 0;

  const datesSet = new Set<string>();
  const expenseItems: ExtractedNoteExpense[] = [];
  const incomeItems: ExtractedNoteExpense[] = [];

  expenses.forEach((e) => {
    datesSet.add(e.date);
    if (e.isDuplicate) duplicateCount++;
    if (e.needsReview || e.isAmbiguous) reviewCount++;

    if (e.type === "expense") {
      totalExpense += e.amount;
      expenseCount++;
      expenseItems.push(e);
    } else if (e.type === "income") {
      totalIncome += e.amount;
      incomeCount++;
      incomeItems.push(e);
    } else if (e.type === "receivable") {
      totalReceivable += e.amount;
      receivableCount++;
    } else if (e.type === "payable") {
      totalPayable += e.amount;
      payableCount++;
    } else if (e.type === "transfer") {
      transferCount++;
    }
  });

  const netCashflow = totalIncome - totalExpense;

  // Determine primary month & year
  let primaryMonth = "Unknown";
  let primaryYear = new Date().getFullYear();

  if (noteTitle) {
    const my = extractMonthYearHeader(noteTitle);
    if (my) {
      primaryMonth = my.monthName;
      primaryYear = my.year;
    }
  }
  if (primaryMonth === "Unknown" && expenses.length > 0) {
    primaryMonth = expenses[0].month;
    primaryYear = expenses[0].year;
  }

  // Top major expenses & incomes (sorted by amount descending)
  const topExpenseNames = [...expenseItems]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)
    .map((e) => `${e.description}: ₹${e.amount.toLocaleString("en-IN")}`);

  const topIncomeNames = [...incomeItems]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)
    .map((e) => `${e.description}: ₹${e.amount.toLocaleString("en-IN")}`);

  return {
    month: primaryMonth,
    year: primaryYear,
    monthYear: `${primaryMonth} ${primaryYear}`,
    totalExpense,
    totalIncome,
    totalReceivable,
    totalPayable,
    netCashflow,
    expenseCount,
    incomeCount,
    receivableCount,
    payableCount,
    transferCount,
    totalTransactionsCount: expenses.length,
    hasDuplicates: duplicateCount > 0,
    duplicateCount,
    hasReviewItems: reviewCount > 0,
    reviewCount,
    topExpenseNames,
    topIncomeNames,
    dateCount: datesSet.size,
    dates: Array.from(datesSet).sort(),
  };
}

/**
 * Aggregate an array of extracted note entries across all notes into full financial analytics
 * Strictly separates Income, Expense, Receivable, and Payable without cross-contamination.
 */
export function aggregateFinancialNotes(
  allExpenses: ExtractedNoteExpense[]
): FinancialNotesAnalysisResult {
  // Group entries by MonthKey (YYYY-MM)
  const groupMap = new Map<string, ExtractedNoteExpense[]>();
  let allTimeTotalExpense = 0;
  let allTimeTotalIncome = 0;
  let allTimeTotalReceivable = 0;
  let allTimeTotalPayable = 0;
  let totalExpensesCount = 0;
  let totalIncomeCount = 0;
  let totalReceivableCount = 0;
  let totalPayableCount = 0;

  let highestOverallExpense: ExtractedNoteExpense | null = null;
  let highestOverallIncome: ExtractedNoteExpense | null = null;
  let lowestOverallExpense: ExtractedNoteExpense | null = null;
  const categoryCountMap = new Map<string, number>();

  allExpenses.forEach((exp) => {
    if (exp.type === "expense") {
      allTimeTotalExpense += exp.amount;
      totalExpensesCount++;
      if (!highestOverallExpense || exp.amount > highestOverallExpense.amount) highestOverallExpense = exp;
      if (!lowestOverallExpense || exp.amount < lowestOverallExpense.amount) lowestOverallExpense = exp;
      categoryCountMap.set(exp.category, (categoryCountMap.get(exp.category) || 0) + 1);
    } else if (exp.type === "income") {
      allTimeTotalIncome += exp.amount;
      totalIncomeCount++;
      if (!highestOverallIncome || exp.amount > highestOverallIncome.amount) highestOverallIncome = exp;
    } else if (exp.type === "receivable") {
      allTimeTotalReceivable += exp.amount;
      totalReceivableCount++;
    } else if (exp.type === "payable") {
      allTimeTotalPayable += exp.amount;
      totalPayableCount++;
    }

    const arr = groupMap.get(exp.monthKey) || [];
    arr.push(exp);
    groupMap.set(exp.monthKey, arr);
  });

  const allTimeNetCashflow = allTimeTotalIncome - allTimeTotalExpense;

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
  const sortedMonthKeys = Array.from(groupMap.keys()).sort().reverse();

  sortedMonthKeys.forEach((key) => {
    const items = groupMap.get(key) || [];
    let mExpense = 0;
    let mIncome = 0;
    let mReceivable = 0;
    let mPayable = 0;
    let mExpCount = 0;
    let mIncCount = 0;
    let mRecCount = 0;
    let mPayCount = 0;
    let mTransferCount = 0;

    let highestExp: ExtractedNoteExpense | null = null;
    let highestInc: ExtractedNoteExpense | null = null;
    let lowestExp: ExtractedNoteExpense | null = null;

    const expCatMap = new Map<string, { amount: number; count: number }>();
    const incCatMap = new Map<string, { amount: number; count: number }>();
    const dailyBreakdown: Record<string, DailyNoteFinancialBreakdown> = {};

    items.forEach((item) => {
      // Daily breakdown tracking
      if (!dailyBreakdown[item.date]) {
        dailyBreakdown[item.date] = {
          date: item.date,
          income: 0,
          expense: 0,
          receivable: 0,
          payable: 0,
          net: 0,
          itemsCount: 0,
          items: [],
        };
      }
      const day = dailyBreakdown[item.date];
      day.itemsCount++;
      day.items.push(item);

      if (item.type === "expense") {
        mExpense += item.amount;
        mExpCount++;
        day.expense += item.amount;
        day.net -= item.amount;

        if (!highestExp || item.amount > highestExp.amount) highestExp = item;
        if (!lowestExp || item.amount < lowestExp.amount) lowestExp = item;

        const c = expCatMap.get(item.category) || { amount: 0, count: 0 };
        c.amount += item.amount;
        c.count += 1;
        expCatMap.set(item.category, c);
      } else if (item.type === "income") {
        mIncome += item.amount;
        mIncCount++;
        day.income += item.amount;
        day.net += item.amount;

        if (!highestInc || item.amount > highestInc.amount) highestInc = item;

        const c = incCatMap.get(item.category) || { amount: 0, count: 0 };
        c.amount += item.amount;
        c.count += 1;
        incCatMap.set(item.category, c);
      } else if (item.type === "receivable") {
        mReceivable += item.amount;
        mRecCount++;
        day.receivable += item.amount;
      } else if (item.type === "payable") {
        mPayable += item.amount;
        mPayCount++;
        day.payable += item.amount;
      } else if (item.type === "transfer") {
        mTransferCount++;
      }
    });

    const mNetCashflow = mIncome - mExpense;
    const activeExpenseDaysCount = Math.max(1, Object.values(dailyBreakdown).filter((d) => d.expense > 0).length);
    const activeIncomeDaysCount = Math.max(1, Object.values(dailyBreakdown).filter((d) => d.income > 0).length);

    const expenseCategories = Array.from(expCatMap.entries())
      .map(([name, data]) => ({
        name,
        amount: data.amount,
        count: data.count,
        percentage: mExpense > 0 ? Math.round((data.amount / mExpense) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    const incomeCategories = Array.from(incCatMap.entries())
      .map(([name, data]) => ({
        name,
        amount: data.amount,
        count: data.count,
        percentage: mIncome > 0 ? Math.round((data.amount / mIncome) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    const topCategory = expenseCategories.length > 0 ? expenseCategories[0] : null;

    const [yStr, mStr] = key.split("-");
    const year = parseInt(yStr, 10);
    const mIdx = parseInt(mStr, 10) - 1;
    const mName = MONTH_NAMES[mIdx] || "Unknown";

    summaries.push({
      monthKey: key,
      monthName: `${mName} ${year}`,
      shortMonthName: `${mName.slice(0, 3)} ${year}`,
      year,
      monthIndex: mIdx,
      totalAmount: mExpense,
      totalExpense: mExpense,
      totalIncome: mIncome,
      totalReceivable: mReceivable,
      totalPayable: mPayable,
      netCashflow: mNetCashflow,
      expenseCount: mExpCount,
      incomeCount: mIncCount,
      receivableCount: mRecCount,
      payableCount: mPayCount,
      transferCount: mTransferCount,
      totalTransactionsCount: items.length,
      highestExpense: highestExp,
      highestIncome: highestInc,
      lowestExpense: lowestExp,
      averageExpense: mExpCount > 0 ? Math.round(mExpense / mExpCount) : 0,
      averageIncome: mIncCount > 0 ? Math.round(mIncome / mIncCount) : 0,
      averageDailyExpense: Math.round(mExpense / activeExpenseDaysCount),
      averageDailyIncome: Math.round(mIncome / activeIncomeDaysCount),
      topCategory,
      categoryBreakdown: expenseCategories,
      expenseCategories,
      incomeCategories,
      items: items.sort((a, b) => b.amount - a.amount),
      dailyBreakdown,
    });
  });

  // Current month & Previous month detection
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthKey = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, "0")}`;

  // If calendar current month has entries, pick it; otherwise default to most recent available month in data
  const currentMonthSummary = summaries.find((s) => s.monthKey === currentMonthKey) || (summaries.length > 0 ? summaries[0] : null);
  const previousMonthSummary = summaries.find((s) => s.monthKey === prevMonthKey) || (summaries.length > 1 ? summaries[1] : null);

  // Calculate Trend
  const currAmt = currentMonthSummary ? currentMonthSummary.totalExpense : 0;
  const prevAmt = previousMonthSummary && previousMonthSummary !== currentMonthSummary ? previousMonthSummary.totalExpense : 0;

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
    comparisonText = `Recorded this month`;
  }

  return {
    totalExpensesCount,
    totalIncomeCount,
    totalReceivableCount,
    totalPayableCount,
    totalTransactionsCount: allExpenses.length,
    allTimeTotalAmount: allTimeTotalExpense,
    allTimeTotalExpense,
    allTimeTotalIncome,
    allTimeTotalReceivable,
    allTimeTotalPayable,
    allTimeNetCashflow,
    monthlySummaries: summaries,
    currentMonth: currentMonthSummary,
    previousMonth: previousMonthSummary,
    trend: {
      percentageDiff,
      direction,
      comparisonText,
    },
    highestOverallExpense,
    highestOverallIncome,
    lowestOverallExpense,
    mostUsedCategory,
    allExpenses,
  };
}

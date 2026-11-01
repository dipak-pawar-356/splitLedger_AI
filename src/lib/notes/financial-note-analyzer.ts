/**
 * Smart Financial Note Analyzer (NLP & Multi-Flow Financial Extractor)
 * Extracts date-wise and point-wise entries from user notes and journals
 * without creating duplicate transactions.
 * Accurately classifies Income, Expense, Receivable, Payable, and Transfers.
 * Distributes entries strictly by their detected dates within single or multi-date notes.
 * Computes monthly totals, categories, cashflows, trends, and daily breakdowns.
 */

export type FinancialFlowType = "expense" | "income" | "receivable" | "payable" | "transfer";

export interface ExtractedNoteExpense {
  id: string; // unique deterministic hash / id
  noteId?: number;
  noteTitle?: string;
  description: string;
  amount: number; // in normal currency units (INR ₹)
  type?: FinancialFlowType;
  category: string;
  contactName?: string | null;
  confidence?: number; // 0 to 100
  isAmbiguous?: boolean;
  ambiguityReason?: string;
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
/**
 * Detect Month and Year standalone headers (e.g. "October 2026", "Nov 2026", "Month: October 2026")
 */
export function extractMonthYearHeader(line: string): { year: number; month: number } | null {
  const clean = line.trim();
  if (!clean || clean.length < 5) return null;

  const monthNames = "(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";
  const m = clean.match(new RegExp(`^(?:month\\s*[:=-]?\\s*)?(${monthNames})\\s+(\\d{4})$`, "i"));
  if (m) {
    const monthStr = m[1].toLowerCase().slice(0, 3);
    const monthsMap: Record<string, number> = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
    };
    const month = monthsMap[monthStr] ?? 0;
    const year = parseInt(m[2], 10);
    return { year, month };
  }
  return null;
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
    const d = new Date(year, month, day, 12, 0, 0);
    if (!isNaN(d.getTime())) return d;
  }

  // Format: DD/MM/YYYY or DD-MM-YYYY or D/M/YYYY
  const dmyMatch = trimmed.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    const d = new Date(year, month, day, 12, 0, 0);
    if (!isNaN(d.getTime())) return d;
  }

  // Format: Words like "November 1 2026", "Nov 1 2026", "1 Nov 2026", "1st November 2026"
  const cleanWords = trimmed
    .replace(/(?:st|nd|rd|th)/gi, "")
    .replace(/,/g, " ")
    .trim();
  const parsedTimestamp = Date.parse(cleanWords);
  if (!isNaN(parsedTimestamp)) {
    const parsed = new Date(parsedTimestamp);
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 12, 0, 0);
  }

  return fallbackDate;
}

/**
 * Check if a string contains a standalone date header (e.g. "Date: 01/10/2026", "01/10/2026", "October 1, 2026")
 */
export function extractDateFromLine(
  line: string,
  contextYear: number = new Date().getFullYear(),
  contextMonth: number = new Date().getMonth()
): Date | null {
  const clean = line.trim();
  if (!clean || clean.length < 2) return null;

  // Month-year headers are not day dates
  if (extractMonthYearHeader(clean)) return null;

  // Patterns with prefix like "Date: 01/10/2026", "Date - 1-10-2026", "Date 2026-10-01"
  const prefixMatch = clean.match(/^(?:date|dated|on)\s*[:=-]?\s*([a-zA-Z0-9\s,./-]+)$/i);
  if (prefixMatch) {
    const candidate = prefixMatch[1].trim();
    const d = parseDateString(candidate);
    if (d && !isNaN(d.getTime())) return d;
  }

  // Pure date on line: "01/10/2026", "1/10/2026", "01-10-2026", "2026-10-01"
  if (/^(\d{1,2}[-/.]\d{1,2}[-/.]\d{4}|\d{4}[-/.]\d{1,2}[-/.]\d{1,2})$/.test(clean)) {
    return parseDateString(clean);
  }

  const monthNames = "(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";
  const monthsMap: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  };

  // Pattern: "1 October 2026" or "1st October 2026" or "1 Oct 2026" or "1 Oct"
  const dmyWords = clean.match(new RegExp(`^(\\d{1,2})(?:st|nd|rd|th)?\\s+(${monthNames})(?:\\s+(\\d{4}))?$`, "i"));
  if (dmyWords) {
    const day = parseInt(dmyWords[1], 10);
    const mStr = dmyWords[2].toLowerCase().slice(0, 3);
    const month = monthsMap[mStr] ?? contextMonth;
    const year = dmyWords[3] ? parseInt(dmyWords[3], 10) : contextYear;
    return new Date(year, month, day, 12, 0, 0);
  }

  // Pattern: "October 1 2026" or "Oct 1 2026" or "October 1"
  const mdyWords = clean.match(new RegExp(`^(${monthNames})\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?$`, "i"));
  if (mdyWords) {
    const mStr = mdyWords[1].toLowerCase().slice(0, 3);
    const month = monthsMap[mStr] ?? contextMonth;
    const day = parseInt(mdyWords[2], 10);
    const year = mdyWords[3] ? parseInt(mdyWords[3], 10) : contextYear;
    return new Date(year, month, day, 12, 0, 0);
  }

  // Textual date fallback
  const textDatePattern = new RegExp(`^(?:(?:\\d{1,2}(?:st|nd|rd|th)?\\s+)?${monthNames}(?:\\s+\\d{1,2}(?:st|nd|rd|th)?)?(?:,?\\s+\\d{4})?)$`, "i");
  if (textDatePattern.test(clean)) {
    return parseDateString(clean);
  }

  return null;
}

/**
 * Intelligent Financial Flow Classifier
 * Accurately detects:
 * - Income (Salary, Freelance, Bonus, Refund, Cashback, Interest, Gift)
 * - Expense (Food, Travel, Bills, Groceries, Shopping, Healthcare, etc.)
 * - Receivable (Received from contact, contact returned money, money lent)
 * - Payable (Paid contact, cleared debt, loan returned, borrowed)
 * - Internal Transfer (Bank to UPI, Cash to SBI, Wallet transfer)
 * - Ambiguous Classifications (Confidence < 70% with explanation)
 */
export function classifyFinancialIntent(
  description: string,
  rawText: string
): {
  type: FinancialFlowType;
  category: string;
  contactName: string | null;
  confidence: number;
  isAmbiguous: boolean;
  ambiguityReason?: string;
} {
  const cleanDesc = description.trim();
  const lower = cleanDesc.toLowerCase();
  const lowerRaw = rawText.toLowerCase();

  // 1. Internal Transfers (do not affect income/expenses)
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
      isAmbiguous: false,
    };
  }

  // 2. Ambiguous transactions (needs clarification / confidence < 70%)
  if (/^sent\s+money$/i.test(lower) || /^transfer$/i.test(lower) || /^transferred$/i.test(lower) || /^money\s+transfer$/i.test(lower)) {
    return {
      type: "transfer",
      category: "Transfer",
      contactName: null,
      confidence: 60,
      isAmbiguous: true,
      ambiguityReason: "Transfer destination or purpose not specified (bank transfer, loan, investment, or expense)",
    };
  }

  if (/^(?:credit|credited)$/i.test(lower)) {
    return {
      type: "income",
      category: "Credit",
      contactName: null,
      confidence: 65,
      isAmbiguous: true,
      ambiguityReason: "Incoming credit source not specified (Salary, Refund, Loan, or Gift)",
    };
  }

  if (/^(?:paid|spent|debit|debited|expense)$/i.test(lower)) {
    return {
      type: "expense",
      category: "General",
      contactName: null,
      confidence: 65,
      isAmbiguous: true,
      ambiguityReason: "Category not specified (Food, Fuel, Shopping, Bills, etc.)",
    };
  }

  // 3. Receivable: Money received from a contact / person
  // e.g. "Received From Kunal - 1500", "Received from Kunal 1200", "Amit returned money", "Rahul paid me", "Payment received from XYZ"
  const receivedFromContactMatch = lower.match(
    /(?:received\s+(?:from|by)\s+([a-z\s]+)|([a-z\s]+)\s+(?:returned\s+money|paid\s+me|cleared\s+dues))/i
  );
  if (receivedFromContactMatch) {
    const rawContact = (receivedFromContactMatch[1] || receivedFromContactMatch[2] || "").trim();
    const isCompanyOrSalary = /(?:salary|employer|office|company|flipkart|amazon|myntra|bank|gov|google)/i.test(rawContact);
    if (!isCompanyOrSalary && rawContact.length > 1) {
      const contactName = rawContact.charAt(0).toUpperCase() + rawContact.slice(1);
      return {
        type: "receivable",
        category: "Contact Payment",
        contactName,
        confidence: 96,
        isAmbiguous: false,
      };
    }
  }

  // Receivable: Money lent / someone owes you
  // e.g. "Kunal owes me ₹500", "Gave Rahul ₹1000", "Lent ₹200 to Rahul"
  const lentMatch = lower.match(
    /(?:([a-z\s]+)\s+owes\s+me|gave\s+([a-z\s]+)|lent\s+(?:to\s+)?([a-z\s]+)?)/i
  );
  if (lentMatch) {
    const rawContact = (lentMatch[1] || lentMatch[2] || lentMatch[3] || "").trim();
    const contactName = rawContact ? rawContact.charAt(0).toUpperCase() + rawContact.slice(1) : null;
    return {
      type: "receivable",
      category: "Lent / Receivable",
      contactName,
      confidence: 95,
      isAmbiguous: false,
    };
  }

  // 4. Payable: Money paid to a person / peer settlement / credit clearance
  // e.g. "Paid Rahul - 500", "Paid to Rahul", "Paid Grocery Credit", "Returned Loan", "Borrowed from Amit"
  const borrowedMatch = lower.match(
    /(?:borrowed\s+(?:from\s+)?([a-z\s]+)|need\s+to\s+return\s+(?:to\s+)?([a-z\s]+))/i
  );
  if (borrowedMatch) {
    const rawContact = (borrowedMatch[1] || borrowedMatch[2] || "").trim();
    const contactName = rawContact ? rawContact.charAt(0).toUpperCase() + rawContact.slice(1) : null;
    return {
      type: "payable",
      category: "Debt / Payable",
      contactName,
      confidence: 95,
      isAmbiguous: false,
    };
  }

  // "Paid Rahul", "Paid to Rahul" (check that the word after Paid is not an expense word like bill, rent, fuel, etc.)
  const paidContactMatch = lower.match(/^paid\s+(?:to\s+)?([a-z]+(?:\s+[a-z]+)?)/i);
  if (paidContactMatch) {
    const target = paidContactMatch[1].trim();
    const isExpenseKeyword = /(?:bill|rent|petrol|fuel|ticket|electricity|water|wifi|mess|tea|coffee|dinner|lunch|breakfast|food|grocery|groceries|recharge|order|shopping|fee|fees|tax|emi|subscription|dues|credit)/i.test(
      target
    );
    if (!isExpenseKeyword && target.length > 1) {
      const contactName = target.charAt(0).toUpperCase() + target.slice(1);
      return {
        type: "payable",
        category: "Contact Payment",
        contactName,
        confidence: 95,
        isAmbiguous: false,
      };
    }
    // "Paid Grocery Credit" or "Returned loan"
    if (/(?:credit|loan|debt|borrowed)/i.test(target)) {
      return {
        type: "payable",
        category: "Debt Repayment",
        contactName: null,
        confidence: 94,
        isAmbiguous: false,
      };
    }
  }

  // 5. Income:
  // e.g. "Salary", "Received Salary - 25000", "Salary +35000", "Freelance Payment", "Bonus", "Cashback", "Interest", "Refund", "Gift Received"
  const isIncomeKeyword = /(?:salary|freelance|bonus|cashback|cash\s*back|dividend|interest|refund|stipend|pension|incentive|commission|client\s+payment|business\s+income|gift\s+received)\b/i.test(
    lower
  );
  if (isIncomeKeyword || lower.startsWith("received salary") || lower.startsWith("salary received")) {
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
      isAmbiguous: false,
    };
  }

  // 6. Expense: default for items, food, bills, groceries, shopping, travel, etc.
  const inferredCat = inferCategoryFromText(cleanDesc);
  return {
    type: "expense",
    category: inferredCat,
    contactName: null,
    confidence: inferredCat !== "General" ? 95 : 85,
    isAmbiguous: false,
  };
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
 * Convert HTML content to plain text with preserved line breaks and intelligent item splitting
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

    // 1. If line starts with a date followed by text, e.g. "01/11/2026 1. Bus Travel - 500" or "01/11/2026 Bus Travel - 500"
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
/**
 * Parse an individual note line to extract a financial entry:
 * Examples:
 * - "Chips - 20" (Expense -> Food & Drinks)
 * - "Petrol - 500" (Expense -> Travel)
 * - "Flipkart Order - 300" (Expense -> Shopping)
 * - "Mess - 40" (Expense -> Food & Drinks)
 * - "Tea - 60" (Expense -> Food & Drinks)
 * - "Received Salary - 25000" (Income -> Salary)
 * - "Received From Kunal - 1500" (Receivable -> Contact Payment)
 * - "Electric Bill - 1200" (Expense -> Bills & Utilities)
 * - "Paid Rahul - 500" (Payable -> Contact Payment)
 * - "Recharge - 399" (Expense -> Bills & Utilities)
 * - "Groceries - 1850" (Expense -> Groceries)
 * - "Salary +35000" (Income -> Salary)
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

  // Skip standalone dates and month headers
  if (extractDateFromLine(clean) || extractMonthYearHeader(clean)) return null;

  // Regex patterns to capture amount & description:
  // Pattern 1: With separator (-, :, =, +, etc.):
  // "Chips - 20", "Received Salary - 25000", "Received From Kunal - 1500", "Paid Rahul - 500", "Salary +35000"
  const pattern1 = /^(?:\d+[\.\)]|\*|\-|\•)?\s*(?:for\s+)?(.*?)(?:[-:–—=+]|\s+(?:for|rs|inr|₹)\s+)\s*(?:rs\.?|inr|₹)?\s*([0-9,]+(?:\.\d{1,2})?)\s*(?:\/-|rs|rupees|inr)?$/i;

  // Pattern 2: Amount first e.g. "₹500 for Bus Travel" or "+35000 Salary"
  const pattern2 = /^(?:\+|rs\.?|inr|₹)?\s*([0-9,]+(?:\.\d{1,2})?)\s*(?:for|on|-|\/)?\s*(.*?)$/i;

  // Pattern 3: Space separator e.g. "Received from Kunal 1200", "Mess 40", "Tea 60", "Movie tickets 600 rs"
  const pattern3 = /^(?:\d+[\.\)]|\*|\-|\•)?\s*(.*?)\s+(?:rs\.?|inr|₹)?\s*([0-9,]+(?:\.\d{1,2})?)\s*(?:rs|rupees|inr|\/-)?$/i;

  let rawDesc = "";
  let rawAmount = "";

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

  // Perform Intelligent Financial Flow Classification
  const classification = classifyFinancialIntent(cleanDesc, clean);

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
    type: classification.type,
    category: classification.category,
    contactName: classification.contactName,
    confidence: classification.confidence,
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
 * Analyze an entire note document and extract all financial entries (multi-month, multi-date support)
 */
export function extractExpensesFromNote(
  noteContent: string,
  noteCreatedAt: Date = new Date(),
  noteId?: number,
  noteTitle?: string
): ExtractedNoteExpense[] {
  const lines = htmlToCleanLines(noteContent);
  const expenses: ExtractedNoteExpense[] = [];
  
  let contextYear = noteCreatedAt.getFullYear();
  let contextMonth = noteCreatedAt.getMonth();
  let currentDate = new Date(contextYear, contextMonth, noteCreatedAt.getDate(), 12, 0, 0);

  lines.forEach((line, index) => {
    // 1. Check for Month + Year header (e.g. "October 2026")
    const monthYear = extractMonthYearHeader(line);
    if (monthYear) {
      contextYear = monthYear.year;
      contextMonth = monthYear.month;
      currentDate = new Date(contextYear, contextMonth, 1, 12, 0, 0);
      return;
    }

    // 2. Check for Date header (e.g. "01/10/2026", "1/10/2026", "04/10/2026")
    const dateOnLine = extractDateFromLine(line, contextYear, contextMonth);
    if (dateOnLine) {
      currentDate = dateOnLine;
      contextYear = currentDate.getFullYear();
      contextMonth = currentDate.getMonth();
      return;
    }

    // 3. Parse financial entry under currentDate
    const exp = parseExpenseLine(line, index + 1, currentDate, noteId, noteTitle);
    if (exp) {
      expenses.push(exp);
    }
  });

  return expenses;
}

/**
 * Aggregate an array of extracted note entries across all notes into full financial analytics
 */
export function aggregateFinancialNotes(
  allExpenses: ExtractedNoteExpense[]
): FinancialNotesAnalysisResult {
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

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
    const isOutflow = exp.type === "expense" || exp.type === "payable";
    const isInflow = exp.type === "income" || exp.type === "receivable";

    if (exp.type === "expense") {
      allTimeTotalExpense += exp.amount;
      totalExpensesCount++;
      if (!highestOverallExpense || exp.amount > highestOverallExpense.amount) highestOverallExpense = exp;
      if (!lowestOverallExpense || exp.amount < lowestOverallExpense.amount) lowestOverallExpense = exp;
      categoryCountMap.set(exp.category, (categoryCountMap.get(exp.category) || 0) + 1);
    } else if (exp.type === "payable") {
      allTimeTotalExpense += exp.amount;
      allTimeTotalPayable += exp.amount;
      totalPayableCount++;
      categoryCountMap.set(exp.category, (categoryCountMap.get(exp.category) || 0) + 1);
    } else if (exp.type === "income") {
      allTimeTotalIncome += exp.amount;
      totalIncomeCount++;
      if (!highestOverallIncome || exp.amount > highestOverallIncome.amount) highestOverallIncome = exp;
    } else if (exp.type === "receivable") {
      allTimeTotalIncome += exp.amount;
      allTimeTotalReceivable += exp.amount;
      totalReceivableCount++;
      if (!highestOverallIncome || exp.amount > highestOverallIncome.amount) highestOverallIncome = exp;
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
      } else if (item.type === "payable") {
        mExpense += item.amount;
        mPayable += item.amount;
        mPayCount++;
        day.expense += item.amount;
        day.payable += item.amount;
        day.net -= item.amount;

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
        mIncome += item.amount;
        mReceivable += item.amount;
        mRecCount++;
        day.income += item.amount;
        day.receivable += item.amount;
        day.net += item.amount;

        if (!highestInc || item.amount > highestInc.amount) highestInc = item;

        const c = incCatMap.get(item.category) || { amount: 0, count: 0 };
        c.amount += item.amount;
        c.count += 1;
        incCatMap.set(item.category, c);
      } else if (item.type === "transfer") {
        mTransferCount++;
      }
    });

    const mNetCashflow = mIncome - mExpense;
    const activeDaysCount = Math.max(1, Object.keys(dailyBreakdown).length);

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
    const mName = monthNames[mIdx] || "Unknown";

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
      averageDailyExpense: Math.round(mExpense / activeDaysCount),
      averageDailyIncome: Math.round(mIncome / activeDaysCount),
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

  const currentMonthSummary = summaries.find((s) => s.monthKey === currentMonthKey) || null;
  const previousMonthSummary = summaries.find((s) => s.monthKey === prevMonthKey) || null;

  // Calculate Trend
  const currAmt = currentMonthSummary ? currentMonthSummary.totalExpense : 0;
  const prevAmt = previousMonthSummary ? previousMonthSummary.totalExpense : 0;

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


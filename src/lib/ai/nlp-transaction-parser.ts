/**
 * Natural Language Financial Transaction Parser & Extractor (NLP)
 * Detects expenses, income, lend/borrow, contact payments, and group expenses from free-text and voice inputs.
 * Never creates or stores transactions automatically; outputs structured proposals awaiting user approval.
 */

export interface ProposedTransaction {
  tempId: string;
  title: string;
  description: string;
  type: "paid" | "received" | "lent" | "borrowed";
  amount: number; // in normal currency units (INR)
  currency: string;
  date: string; // YYYY-MM-DD
  formattedDate: string; // Human readable date e.g. "Today, Oct 31"
  time: string; // e.g. "Current Time", "Morning", "Evening"
  categoryId?: number | null;
  categoryName: string;
  categoryIcon?: string;
  contactId?: number | null;
  contactName?: string | null;
  groupId?: number | null;
  groupName?: string | null;
  paymentMethod?: string | null;
  notes?: string | null;
  isPossibleDuplicate?: boolean;
  duplicateInfo?: {
    id: number;
    publicId?: string;
    title: string;
    amount: number;
    date: string;
  };
  needsClarification?: boolean;
  clarificationField?: "contact" | "group" | "amount";
  clarificationQuestion?: string;
  clarificationOptions?: Array<{ id: number; name: string }>;
  status: "draft" | "approved" | "cancelled";
}

export interface NLPParserContext {
  categories?: Array<{ id: number; name: string; icon?: string | null; color?: string | null }>;
  contacts?: Array<{ id: number; name: string; phone?: string | null; email?: string | null }>;
  groups?: Array<{ id: number; name: string }>;
}

export interface ParseResult {
  hasTransactions: boolean;
  transactions: ProposedTransaction[];
  isIncomplete: boolean;
  clarificationMessage?: string;
}

// Word number converter for voice transcripts
const WORD_NUMBER_MAP: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
  hundred: 100,
  thousand: 1000,
  lakh: 100000,
  crore: 10000000,
};

function parseWordNumber(text: string): number | null {
  const words = text.toLowerCase().split(/[\s-]+/);
  let total = 0;
  let current = 0;
  let matchedAny = false;

  for (const word of words) {
    if (WORD_NUMBER_MAP[word] !== undefined) {
      matchedAny = true;
      const val = WORD_NUMBER_MAP[word];
      if (val === 100) {
        current = (current || 1) * 100;
      } else if (val === 1000 || val === 100000 || val === 10000000) {
        current = (current || 1) * val;
        total += current;
        current = 0;
      } else {
        current += val;
      }
    }
  }

  total += current;
  return matchedAny && total > 0 ? total : null;
}

// Category keyword mappings for automated classification (ordered by specificity)
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "Groceries & Supplies": [
    "groceries", "grocery", "vegetable", "vegetables", "fruits", "milk", "bread",
    "eggs", "ration", "supermarket", "blinkit", "zepto", "instamart", "kirana",
    "market", "supplies"
  ],
  "Bills & Utilities": [
    "electricity", "power", "light bill", "water", "wifi", "internet", "broadband",
    "recharge", "mobile recharge", "gas", "cylinder", "dth", "bill", "rent",
    "maintenance", "utility", "phone bill"
  ],
  "Healthcare & Medical": [
    "medicine", "pharmacy", "hospital", "doctor", "clinic", "dental", "dentist",
    "lab", "medical", "tablet", "tablets", "pills", "syrup", "test", "healthcare",
    "meds", "apollo", "medplus"
  ],
  "Entertainment": [
    "movie", "tickets", "ticket", "netflix", "cinema", "game", "gaming", "party",
    "concert", "outing", "hotstar", "spotify", "pvr", "inox", "theater", "show", "club"
  ],
  "Travel & Commute": [
    "petrol", "fuel", "diesel", "auto", "uber", "ola", "cab", "taxi", "bus",
    "metro", "train", "flight", "travel", "parking", "toll", "commute", "rapido",
    "rickshaw", "transport", "trip"
  ],
  "Food & Dining": [
    "chips", "snack", "snacks", "tea", "chai", "coffee", "biscuit", "biscuits",
    "samosa", "breakfast", "lunch", "dinner", "pizza", "burger", "restaurant",
    "cafe", "swiggy", "zomato", "biryani", "food", "meal", "drink", "drinks",
    "juice", "sandwich", "maggi", "noodles", "icecream", "dessert", "thali", "dosa"
  ],
  "Shopping": [
    "shopping", "amazon", "flipkart", "myntra", "clothes", "shoes", "dress",
    "pants", "shirt", "mall", "store", "bought", "electronics", "gadgets",
    "watch", "apparel", "zara", "h&m"
  ],
};

/**
 * Extract numerical amount from a string (supports ₹, Rs, INR, words, suffixes like 2.5k)
 */
function extractAmount(text: string): { amount: number | null; matchedText: string | null } {
  // Pattern 1: Explicit currency symbol: ₹20, ₹ 1,500, Rs. 500, Rs 500, 2500 INR
  const symbolRegex = /(?:₹|rs\.?|inr)\s*([0-9]+(?:,[0-9]+)*(?:\.[0-9]{1,2})?)\b/i;
  const symbolMatch = text.match(symbolRegex);
  if (symbolMatch) {
    const rawNum = symbolMatch[1].replace(/,/g, "");
    const parsed = parseFloat(rawNum);
    if (!isNaN(parsed) && parsed > 0) {
      return { amount: parsed, matchedText: symbolMatch[0] };
    }
  }

  // Pattern 2: Number followed by currency: 500 rs, 20 rupees, 1500 bucks
  const reverseRegex = /\b([0-9]+(?:,[0-9]+)*(?:\.[0-9]{1,2})?)\s*(?:rs\.?|rupees?|inr|bucks)\b/i;
  const reverseMatch = text.match(reverseRegex);
  if (reverseMatch) {
    const rawNum = reverseMatch[1].replace(/,/g, "");
    const parsed = parseFloat(rawNum);
    if (!isNaN(parsed) && parsed > 0) {
      return { amount: parsed, matchedText: reverseMatch[0] };
    }
  }

  // Pattern 3: Shorthand 'k': 2.5k, 5k
  const kRegex = /\b([0-9]+(?:\.[0-9]+)?)\s*k\b/i;
  const kMatch = text.match(kRegex);
  if (kMatch) {
    const parsed = parseFloat(kMatch[1]) * 1000;
    if (!isNaN(parsed) && parsed > 0) {
      return { amount: parsed, matchedText: kMatch[0] };
    }
  }

  // Pattern 4: "for 500", "of 120", "paid 2500"
  const prepositionRegex = /(?:for|of|paid|spent|gave|received|got|cost)\s+([0-9]+(?:,[0-9]+)*(?:\.[0-9]{1,2})?)\b/i;
  const prepMatch = text.match(prepositionRegex);
  if (prepMatch) {
    const rawNum = prepMatch[1].replace(/,/g, "");
    const parsed = parseFloat(rawNum);
    if (!isNaN(parsed) && parsed > 0) {
      return { amount: parsed, matchedText: prepMatch[0] };
    }
  }

  // Pattern 5: Word number (e.g. "fifty rupees", "two hundred", "twenty")
  const wordAmt = parseWordNumber(text);
  if (wordAmt && wordAmt > 0) {
    return { amount: wordAmt, matchedText: "word_number" };
  }

  // Pattern 6: Bare number at end of line (e.g. "Tea 20", "Petrol 600", "Lunch 250")
  const endNumRegex = /\b([0-9]+(?:\.[0-9]{1,2})?)\s*$/;
  const endMatch = text.match(endNumRegex);
  if (endMatch) {
    const parsed = parseFloat(endMatch[1]);
    if (!isNaN(parsed) && parsed > 0) {
      return { amount: parsed, matchedText: endMatch[0] };
    }
  }

  return { amount: null, matchedText: null };
}

/**
 * Determine transaction type based on language context
 */
function determineTransactionType(text: string): "paid" | "received" | "lent" | "borrowed" {
  const lower = text.toLowerCase();

  // Lending to someone
  if (
    lower.includes("gave ") ||
    lower.includes("give ") ||
    lower.includes("lent ") ||
    lower.includes("lend ") ||
    lower.includes("sent to ") ||
    lower.includes("paid to ") ||
    lower.includes("paid for ")
  ) {
    return "lent";
  }

  // Borrowing from someone
  if (
    lower.includes("borrowed from") ||
    lower.includes("borrow from") ||
    lower.includes("took from") ||
    lower.includes("loan from")
  ) {
    return "borrowed";
  }

  // Receiving money / Income
  if (
    lower.includes("received") ||
    lower.includes("got ") ||
    lower.includes("salary") ||
    lower.includes("refund") ||
    lower.includes("cashback") ||
    lower.includes("earned") ||
    lower.includes("income") ||
    lower.includes("credit") ||
    lower.includes("deposited")
  ) {
    return "received";
  }

  // Default is Expense
  return "paid";
}

/**
 * Extract Date and Time from text
 */
function extractDateTime(text: string): {
  date: string;
  formattedDate: string;
  time: string;
} {
  const lower = text.toLowerCase();
  const now = new Date();
  let targetDate = new Date();

  if (lower.includes("yesterday") || lower.includes("kal ") || lower.includes("last night")) {
    targetDate.setDate(targetDate.getDate() - 1);
  } else if (lower.includes("tomorrow")) {
    targetDate.setDate(targetDate.getDate() + 1);
  } else if (lower.includes("2 days ago") || lower.includes("two days ago")) {
    targetDate.setDate(targetDate.getDate() - 2);
  } else if (lower.includes("3 days ago") || lower.includes("three days ago")) {
    targetDate.setDate(targetDate.getDate() - 3);
  } else if (lower.includes("last sunday")) {
    const day = targetDate.getDay();
    targetDate.setDate(targetDate.getDate() - (day === 0 ? 7 : day));
  } else if (lower.includes("last monday")) {
    const day = targetDate.getDay();
    targetDate.setDate(targetDate.getDate() - (day >= 1 ? day - 1 + 7 : 6));
  }

  // Check specific month date like "1 october", "25 dec", "15th august"
  const dateRegex = /\b([0-9]{1,2})(?:st|nd|rd|th)?\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/i;
  const dateMatch = lower.match(dateRegex);
  if (dateMatch) {
    const day = parseInt(dateMatch[1], 10);
    const monthStr = dateMatch[2].slice(0, 3).toLowerCase();
    const monthMap: Record<string, number> = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
    };
    if (monthMap[monthStr] !== undefined) {
      targetDate.setMonth(monthMap[monthStr], day);
    }
  }

  // Time extraction
  let timeStr = "Current Time";
  if (lower.includes("morning") || lower.includes("breakfast")) {
    timeStr = "Morning (09:00 AM)";
  } else if (lower.includes("afternoon") || lower.includes("lunch")) {
    timeStr = "Afternoon (01:30 PM)";
  } else if (lower.includes("evening") || lower.includes("tea time")) {
    timeStr = "Evening (06:00 PM)";
  } else if (lower.includes("night") || lower.includes("dinner") || lower.includes("late night")) {
    timeStr = "Night (09:30 PM)";
  }

  const isToday = targetDate.toDateString() === now.toDateString();
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = targetDate.toDateString() === yesterday.toDateString();

  let formattedDate = isToday
    ? "Today, " + targetDate.toLocaleDateString("en-IN", { month: "short", day: "numeric" })
    : isYesterday
    ? "Yesterday, " + targetDate.toLocaleDateString("en-IN", { month: "short", day: "numeric" })
    : targetDate.toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" });

  const isoDate = targetDate.toISOString().split("T")[0];

  return { date: isoDate, formattedDate, time: timeStr };
}

/**
 * Extract Payment Method
 */
function extractPaymentMethod(text: string): string | null {
  const lower = text.toLowerCase();
  if (lower.includes("upi") || lower.includes("gpay") || lower.includes("google pay") || lower.includes("phonepe") || lower.includes("paytm")) {
    return "UPI";
  }
  if (lower.includes("cash")) {
    return "Cash";
  }
  if (lower.includes("credit card") || lower.includes("cc")) {
    return "Credit Card";
  }
  if (lower.includes("debit card") || lower.includes("dc") || lower.includes("card")) {
    return "Debit Card";
  }
  if (lower.includes("bank") || lower.includes("netbanking") || lower.includes("neft") || lower.includes("imps")) {
    return "Net Banking";
  }
  if (lower.includes("wallet")) {
    return "Wallet";
  }
  if (lower.includes("cheque") || lower.includes("check")) {
    return "Cheque";
  }
  return null;
}

/**
 * Classify category based on text and user's categories
 */
function classifyCategory(
  text: string,
  userCategories?: Array<{ id: number; name: string; icon?: string | null }>
): { categoryId: number | null; categoryName: string; categoryIcon: string } {
  const lower = text.toLowerCase();

  // First check against user's actual categories in database
  if (userCategories && userCategories.length > 0) {
    for (const cat of userCategories) {
      const catLower = cat.name.toLowerCase();
      if (lower.includes(catLower)) {
        return { categoryId: cat.id, categoryName: cat.name, categoryIcon: cat.icon || "Tag" };
      }
    }
  }

  // Then check standard category keywords
  for (const [categoryName, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const kw of keywords) {
      const regex = new RegExp(`\\b${kw}\\b`, "i");
      if (regex.test(lower)) {
        // Find if this category exists in userCategories
        const userCat = userCategories?.find(
          (c) => c.name.toLowerCase() === categoryName.toLowerCase() || c.name.toLowerCase().includes(kw)
        );
        return {
          categoryId: userCat?.id || null,
          categoryName,
          categoryIcon: userCat?.icon || "Tag",
        };
      }
    }
  }

  // Fallback to General
  const generalCat = userCategories?.find((c) => c.name.toLowerCase().includes("general"));
  return {
    categoryId: generalCat?.id || null,
    categoryName: generalCat?.name || "General",
    categoryIcon: "Tag",
  };
}

/**
 * Match contacts from user contact list
 */
function matchContact(
  text: string,
  userContacts?: Array<{ id: number; name: string; phone?: string | null; email?: string | null }>
): {
  contactId: number | null;
  contactName: string | null;
  clarificationNeeded?: boolean;
  clarificationOptions?: Array<{ id: number; name: string }>;
} {
  if (!userContacts || userContacts.length === 0) {
    return { contactId: null, contactName: null };
  }

  const lower = text.toLowerCase();
  const matching = userContacts.filter((c) => {
    const firstName = c.name.split(" ")[0].toLowerCase();
    const fullName = c.name.toLowerCase();
    return (
      (firstName.length >= 3 && lower.includes(firstName)) ||
      lower.includes(fullName)
    );
  });

  if (matching.length === 1) {
    return { contactId: matching[0].id, contactName: matching[0].name };
  } else if (matching.length > 1) {
    return {
      contactId: null,
      contactName: matching[0].name.split(" ")[0],
      clarificationNeeded: true,
      clarificationOptions: matching.map((m) => ({ id: m.id, name: m.name })),
    };
  }

  return { contactId: null, contactName: null };
}

/**
 * Match groups from user group list
 */
function matchGroup(
  text: string,
  userGroups?: Array<{ id: number; name: string }>
): { groupId: number | null; groupName: string | null } {
  if (!userGroups || userGroups.length === 0) {
    return { groupId: null, groupName: null };
  }

  const lower = text.toLowerCase();
  for (const g of userGroups) {
    const gLower = g.name.toLowerCase();
    if (lower.includes(gLower) || (gLower.length >= 4 && lower.includes(gLower.split(" ")[0]))) {
      return { groupId: g.id, groupName: g.name };
    }
  }

  return { groupId: null, groupName: null };
}

/**
 * Clean up raw phrase into human-readable Title and Description
 */
function formatTitleAndDescription(
  rawText: string,
  categoryName: string,
  type: "paid" | "received" | "lent" | "borrowed",
  contactName: string | null
): { title: string; description: string } {
  // Strip out currency, number words, and conversational fillers
  let cleaned = rawText
    .replace(/(?:₹|rs\.?|inr)\s*[0-9]+(?:,[0-9]+)*(?:\.[0-9]{1,2})?/gi, "")
    .replace(/\b[0-9]+(?:\.[0-9]{1,2})?\s*(?:rs|rupees|inr|bucks)\b/gi, "")
    .replace(/\b[0-9]+(?:\.[0-9]+)?\s*k\b/gi, "")
    .replace(/\b(twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|lakh|crore|rupees|rupee)\b/gi, "")
    .replace(/\b(i|we|today|yesterday|tomorrow|this morning|tonight|please|just)\b/gi, "")
    .replace(/\b(bought|spent on|spent|paid for|paid|purchased|gave|lent|received|got|for)\b/gi, "")
    .replace(/\b(via upi|using cash|by card|with credit card|through gpay|in cash)\b/gi, "")
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Strip leading prepositions: "on petrol" -> "petrol", "from amit" -> "amit"
  cleaned = cleaned.replace(/^(on|from|to|for|of|with|in)\s+/i, "").trim();

  // If text is empty or purely filler
  if (!cleaned || cleaned.length < 2) {
    if (type === "lent" && contactName) cleaned = `Payment to ${contactName}`;
    else if (type === "received" && contactName) cleaned = `Received from ${contactName}`;
    else if (type === "received") cleaned = `Income (${categoryName})`;
    else cleaned = `${categoryName} Expense`;
  }

  // Capitalize properly
  const title = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  let description = title;

  if (type === "paid") {
    description = `Paid for ${title.toLowerCase()}`;
  } else if (type === "received") {
    description = contactName ? `Received from ${contactName}` : `Received ${title.toLowerCase()}`;
  } else if (type === "lent" && contactName) {
    description = `Gave ${contactName} for ${title.toLowerCase()}`;
  } else if (type === "borrowed" && contactName) {
    description = `Borrowed from ${contactName}`;
  }

  return { title, description };
}

/**
 * Main parser: Analyzes message, extracts one or multiple transaction proposals
 */
export function parseConversationalMessage(
  message: string,
  context?: NLPParserContext
): ParseResult {
  const trimmed = message.trim();
  if (!trimmed) {
    return { hasTransactions: false, transactions: [], isIncomplete: false };
  }

  // Exclude pure questions that do not propose a transaction (e.g. "what is my spending?", "who owes me?", "how can I reduce my expenses?")
  const lower = trimmed.toLowerCase();
  const isQuestion =
    lower.endsWith("?") ||
    lower.startsWith("what ") ||
    lower.startsWith("why ") ||
    lower.startsWith("how ") ||
    lower.startsWith("who ") ||
    lower.startsWith("when ") ||
    lower.startsWith("where ") ||
    lower.startsWith("which ") ||
    lower.startsWith("can ") ||
    lower.startsWith("could ") ||
    lower.startsWith("should ") ||
    lower.startsWith("would ") ||
    lower.startsWith("is ") ||
    lower.startsWith("are ") ||
    lower.startsWith("do ") ||
    lower.startsWith("does ") ||
    lower.startsWith("show ") ||
    lower.startsWith("compare ") ||
    lower.startsWith("list ") ||
    lower.startsWith("give me ") ||
    lower.startsWith("suggest ") ||
    lower.startsWith("help me ") ||
    lower.startsWith("tell me ") ||
    lower.includes("predict ") ||
    lower.includes("summarize ") ||
    lower.includes("can you show");

  if (isQuestion && !lower.includes("add ") && !lower.includes("create ") && !lower.includes("log ") && !lower.includes("record ")) {
    return { hasTransactions: false, transactions: [], isIncomplete: false };
  }

  // Split multi-line input or conjunction-separated entries (e.g. "Tea ₹20\nPetrol ₹600" or "Tea ₹20, Petrol ₹600")
  const lines = trimmed
    .split(/\n+|;\s*|,\s*(?=[A-Za-z]+(?:\s+[A-Za-z]+)*\s*(?:₹|rs\.?|[0-9]+))/i)
    .map((l) => l.trim())
    .filter(Boolean);

  const proposals: ProposedTransaction[] = [];
  let detectedIncomplete = false;
  let clarificationMessage: string | undefined;

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];

    // Check if line indicates an expense/income intent but missing amount
    const lineLower = line.toLowerCase();
    const hasIntentKeyword =
      /\b(spent|bought|paid|gave|lent|received|borrowed)\b/i.test(line) ||
      /\b(add|create|record|log)\s+(?:an?\s+)?(?:expense|transaction|income|bill)\b/i.test(line) ||
      /\b(?:new|another)\s+(?:expense|transaction|income|bill)\b/i.test(line);

    const { amount } = extractAmount(line);

    if (!amount) {
      if (hasIntentKeyword && lines.length === 1 && !lineLower.endsWith("?")) {
        detectedIncomplete = true;
        clarificationMessage = "I noticed you want to log a transaction. How much did you spend or receive?";
      }
      continue;
    }

    const type = determineTransactionType(line);
    const { categoryId, categoryName, categoryIcon } = classifyCategory(line, context?.categories);
    const { date, formattedDate, time } = extractDateTime(line);
    const paymentMethod = extractPaymentMethod(line);
    const contactMatch = matchContact(line, context?.contacts);
    const groupMatch = matchGroup(line, context?.groups);
    const { title, description } = formatTitleAndDescription(line, categoryName, type, contactMatch.contactName);

    const tempId = `prop_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 7)}`;

    proposals.push({
      tempId,
      title,
      description,
      type,
      amount,
      currency: "INR",
      date,
      formattedDate,
      time,
      categoryId,
      categoryName,
      categoryIcon,
      contactId: contactMatch.contactId,
      contactName: contactMatch.contactName,
      groupId: groupMatch.groupId,
      groupName: groupMatch.groupName,
      paymentMethod,
      notes: null,
      needsClarification: contactMatch.clarificationNeeded,
      clarificationField: contactMatch.clarificationNeeded ? "contact" : undefined,
      clarificationQuestion: contactMatch.clarificationNeeded
        ? `I found multiple contacts matching "${contactMatch.contactName}". Which one do you mean?`
        : undefined,
      clarificationOptions: contactMatch.clarificationOptions,
      status: "draft",
    });
  }

  return {
    hasTransactions: proposals.length > 0,
    transactions: proposals,
    isIncomplete: detectedIncomplete && proposals.length === 0,
    clarificationMessage,
  };
}

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
  "Food & Drinks": [
    "water bottle", "watter bottle", "mineral water", "water", "watter", "bottle",
    "chips", "juice", "tea", "chai", "coffee", "snacks", "snack", "food", "dinner",
    "lunch", "breakfast", "pizza", "burger", "restaurant", "cafe", "swiggy",
    "zomato", "biryani", "meal", "drink", "drinks", "biscuit", "biscuits",
    "samosa", "sandwich", "maggi", "noodles", "icecream", "dessert", "thali", "dosa",
    "groceries", "grocery", "vegetable", "vegetables", "fruits", "milk", "bread",
    "eggs", "ration", "supermarket", "blinkit", "zepto", "instamart", "kirana",
    "market", "supplies"
  ],
  "Travel & Transport": [
    "bus", "metro", "train", "taxi", "uber", "ola", "cab", "auto", "rickshaw",
    "fuel", "petrol", "diesel", "parking", "travel", "travel by bus", "toll",
    "commute", "rapido", "flight", "transport", "trip"
  ],
  "Healthcare": [
    "medicine", "medicines", "medical", "doctor", "clinic", "pharmacy",
    "hospital", "dental", "dentist", "lab", "tablet", "tablets", "pills",
    "syrup", "test", "healthcare", "meds", "apollo", "medplus", "gym", "fitness"
  ],
  "Utilities": [
    "electricity", "power", "light bill", "internet", "wifi", "broadband",
    "gas", "cylinder", "water bill", "recharge", "mobile recharge", "dth",
    "bill", "rent", "maintenance", "utility", "phone bill"
  ],
  "Shopping": [
    "shopping", "amazon", "flipkart", "myntra", "clothes", "cloth", "shoes",
    "shoe", "dress", "pants", "shirt", "mall", "store", "electronics",
    "gadgets", "watch", "apparel", "zara", "h&m"
  ],
  "Entertainment": [
    "movie", "movies", "ticket", "tickets", "netflix", "cinema", "game",
    "gaming", "party", "concert", "outing", "hotstar", "spotify", "pvr",
    "inox", "theater", "theatre", "show", "club"
  ],
};

/**
 * Extract numerical amount from a string (supports ₹, Rs, INR, words, suffixes like 2.5k)
 */
function extractAmount(text: string): { amount: number | null; matchedText: string | null } {
  // Pattern 1: Explicit currency symbol: ₹20, ₹ 1,500, Rs. 500, Rs 500, 2500 INR
  const symbolRegex = /(?:₹|rs\.?|inr)\s*([0-9]+(?:,[0-9]+)*(?:\.[0-9]{1,2})?)/i;
  const symbolMatch = text.match(symbolRegex);
  if (symbolMatch) {
    const rawNum = symbolMatch[1].replace(/,/g, "");
    const parsed = parseFloat(rawNum);
    if (!isNaN(parsed) && parsed > 0) {
      return { amount: parsed, matchedText: symbolMatch[0] };
    }
  }

  // Pattern 2: Number followed by currency: 500 rs, 20rs, 20 rupees, 1500 bucks, 50/-
  const reverseRegex = /([0-9]+(?:,[0-9]+)*(?:\.[0-9]{1,2})?)\s*(?:rs\.?|rupees?|inr|bucks|\/-)/i;
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

  // Pattern 4: "for 500", "of 120", "paid 2500", "spent 1000", "cost 50"
  const prepositionRegex = /(?:for|of|paid|spent|gave|received|got|cost)\s+([0-9]+(?:,[0-9]+)*(?:\.[0-9]{1,2})?)/i;
  const prepMatch = text.match(prepositionRegex);
  if (prepMatch) {
    const rawNum = prepMatch[1].replace(/,/g, "");
    const parsed = parseFloat(rawNum);
    if (!isNaN(parsed) && parsed > 0) {
      return { amount: parsed, matchedText: prepMatch[0] };
    }
  }

  // Pattern 5: Number before "for" or "on": "20 for water bottle", "50 on bus"
  const numBeforePrepRegex = /\b([0-9]+(?:,[0-9]+)*(?:\.[0-9]{1,2})?)\s+(?:for|on)\b/i;
  const numBeforePrepMatch = text.match(numBeforePrepRegex);
  if (numBeforePrepMatch) {
    const rawNum = numBeforePrepMatch[1].replace(/,/g, "");
    const parsed = parseFloat(rawNum);
    if (!isNaN(parsed) && parsed > 0) {
      return { amount: parsed, matchedText: numBeforePrepMatch[0] };
    }
  }

  // Pattern 6: Bare number at start of clause: "20 water bottle"
  const startNumRegex = /^\s*([0-9]+(?:,[0-9]+)*(?:\.[0-9]{1,2})?)\s+/i;
  const startMatch = text.match(startNumRegex);
  if (startMatch) {
    const parsed = parseFloat(startMatch[1].replace(/,/g, ""));
    if (!isNaN(parsed) && parsed > 0 && parsed !== 2024 && parsed !== 2025 && parsed !== 2026) {
      return { amount: parsed, matchedText: startMatch[0] };
    }
  }

  // Pattern 7: Bare number at end of line (e.g. "Tea 20", "Petrol 600", "Lunch 250")
  const endNumRegex = /\b([0-9]+(?:\.[0-9]{1,2})?)\s*$/;
  const endMatch = text.match(endNumRegex);
  if (endMatch) {
    const parsed = parseFloat(endMatch[1]);
    if (!isNaN(parsed) && parsed > 0) {
      return { amount: parsed, matchedText: endMatch[0] };
    }
  }

  // Pattern 8: Word number (e.g. "fifty rupees", "two hundred", "twenty")
  const wordAmt = parseWordNumber(text);
  if (wordAmt && wordAmt > 0) {
    return { amount: wordAmt, matchedText: "word_number" };
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

  // Special check: 'water bill' belongs to Utilities, not Food & Drinks
  const isWaterBill = lower.includes("water bill") || lower.includes("water-bill") || lower.includes("waterbill");

  // Check against our comprehensive keyword dictionary
  for (const [canonicalName, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (canonicalName === "Food & Drinks" && isWaterBill) {
      continue;
    }

    for (const kw of keywords) {
      if (canonicalName === "Food & Drinks" && (kw === "water" || kw === "watter" || kw === "bottle") && isWaterBill) {
        continue;
      }

      if (lower.includes(kw)) {
        // Find if this category or equivalent exists in userCategories
        let matchedUserCat = userCategories?.find(
          (c) => c.name.toLowerCase() === canonicalName.toLowerCase()
        );

        // Alias matching for DB schemas using alternate names
        if (!matchedUserCat && userCategories && userCategories.length > 0) {
          if (canonicalName === "Food & Drinks") {
            matchedUserCat = userCategories.find((c) =>
              c.name.toLowerCase().includes("food") || c.name.toLowerCase().includes("dining")
            );
          } else if (canonicalName === "Travel & Transport") {
            matchedUserCat = userCategories.find((c) =>
              c.name.toLowerCase().includes("travel") || c.name.toLowerCase().includes("commute")
            );
          } else if (canonicalName === "Utilities") {
            matchedUserCat = userCategories.find((c) =>
              c.name.toLowerCase().includes("utilit") || c.name.toLowerCase().includes("bill")
            );
          } else if (canonicalName === "Healthcare") {
            matchedUserCat = userCategories.find((c) =>
              c.name.toLowerCase().includes("health") || c.name.toLowerCase().includes("medical")
            );
          }
        }

        return {
          categoryId: matchedUserCat?.id || null,
          categoryName: matchedUserCat?.name || canonicalName,
          categoryIcon: matchedUserCat?.icon || "Tag",
        };
      }
    }
  }

  // Check direct match in user categories if any
  if (userCategories && userCategories.length > 0) {
    for (const cat of userCategories) {
      const catLower = cat.name.toLowerCase();
      if (catLower.length >= 4 && lower.includes(catLower)) {
        return { categoryId: cat.id, categoryName: cat.name, categoryIcon: cat.icon || "Tag" };
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
 * Clean up raw phrase into human-readable Title and Description with professional naming
 */
function formatTitleAndDescription(
  rawText: string,
  categoryName: string,
  type: "paid" | "received" | "lent" | "borrowed",
  contactName: string | null
): { title: string; description: string } {
  const lower = rawText.toLowerCase();

  // Specific high-precision domain naming
  if (lower.includes("water bottle") || lower.includes("watter bottle") || (lower.includes("water") && !lower.includes("bill"))) {
    return { title: "Water bottle", description: "Purchased Water Bottle" };
  }
  if (lower.includes("bus") || lower.includes("travel by bus")) {
    return { title: "Bus Travel Fare", description: "Bus Travel Fare" };
  }
  if (lower.includes("metro") || lower.includes("train")) {
    return { title: "Train & Metro Ticket", description: "Metro / Train Travel Fare" };
  }
  if (lower.includes("uber") || lower.includes("ola") || lower.includes("cab") || lower.includes("taxi") || lower.includes("auto") || lower.includes("rapido")) {
    return { title: "Cab Travel Fare", description: "Cab Travel Fare" };
  }
  if (lower.includes("petrol") || lower.includes("fuel") || lower.includes("diesel")) {
    return { title: "Fuel Refill", description: "Fuel Refill Expense" };
  }
  if (lower.includes("tea") || lower.includes("chai")) {
    return { title: "Tea Purchase", description: "Tea Purchase" };
  }
  if (lower.includes("coffee") || lower.includes("cafe")) {
    return { title: "Coffee Purchase", description: "Coffee Purchase" };
  }
  if (lower.includes("lunch")) {
    return { title: "Lunch at Restaurant", description: "Lunch at Restaurant" };
  }
  if (lower.includes("dinner")) {
    return { title: "Dinner Expense", description: "Dinner at Restaurant" };
  }
  if (lower.includes("breakfast") || lower.includes("samosa")) {
    return { title: "Breakfast & Snacks", description: "Breakfast & Snacks Purchase" };
  }
  if (lower.includes("chips")) {
    return { title: "Chips & Snacks", description: "Chips & Snacks Purchase" };
  }
  if (lower.includes("movie") || lower.includes("cinema") || lower.includes("theater") || lower.includes("theatre")) {
    return { title: "Movie Tickets", description: "Movie Tickets & Entertainment" };
  }
  if (lower.includes("internet") || lower.includes("wifi") || lower.includes("broadband")) {
    return { title: "Monthly Internet Bill", description: "Monthly Internet Bill" };
  }
  if (lower.includes("electricity") || lower.includes("power") || lower.includes("light bill")) {
    return { title: "Monthly Electricity Bill", description: "Monthly Electricity Bill" };
  }
  if (lower.includes("groceries") || lower.includes("grocery") || lower.includes("kirana")) {
    return { title: "Grocery Supplies", description: "Grocery Supplies Purchase" };
  }
  if (lower.includes("medicine") || lower.includes("medical") || lower.includes("pharmacy") || lower.includes("doctor")) {
    return { title: "Pharmacy & Healthcare", description: "Pharmacy & Healthcare Expense" };
  }
  if (lower.includes("parking") || lower.includes("toll")) {
    return { title: "Vehicle Parking Fee", description: "Vehicle Parking Fee" };
  }
  if (lower.includes("gym") || lower.includes("fitness")) {
    return { title: "Gym Membership", description: "Gym & Fitness Expense" };
  }

  // Strip out currency, number words, and conversational fillers
  let cleaned = rawText
    .replace(/(?:₹|rs\.?|inr)\s*[0-9]+(?:,[0-9]+)*(?:\.[0-9]{1,2})?/gi, "")
    .replace(/\b[0-9]+(?:\.[0-9]{1,2})?\s*(?:rs|rupees|inr|bucks|\/-)\b/gi, "")
    .replace(/\b[0-9]+(?:\.[0-9]+)?\s*k\b/gi, "")
    .replace(/\b[0-9]+(?:\.[0-9]{1,2})?\b/g, "")
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

  // Capitalize properly in Title Case
  const title = cleaned
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  let description = title;
  if (type === "paid") {
    description = `${title} Purchase`;
  } else if (type === "received") {
    description = contactName ? `Received from ${contactName}` : `Received ${title}`;
  } else if (type === "lent" && contactName) {
    description = `Gave ${contactName} for ${title}`;
  } else if (type === "borrowed" && contactName) {
    description = `Borrowed from ${contactName}`;
  }

  return { title, description };
}

/**
 * Splits conversational multi-transaction input intelligently.
 * Connected by: and, ,, then, also, plus, &, +, after, before, followed by, \n+, etc.
 * Separates transactions whenever multiple independent expenses/purchases are present.
 */
function segmentMultiTransactionMessage(message: string): string[] {
  const trimmed = message.trim();
  if (!trimmed) return [];

  // Delimiters: newlines, semicolons, commas, or conjunction words
  const delimiterRegex = /(\r?\n+|;\s*|,\s*|\s+(?:and\s+then|also\s+bought|also\s+spent|and\s+also|followed\s+by|after|before|and|then|also|plus|&|\+)\s+)/i;

  const rawPieces: string[] = [];
  let remaining = trimmed;

  while (remaining) {
    const match = remaining.match(delimiterRegex);
    if (!match || match.index === undefined) {
      const lastPiece = remaining.trim();
      if (lastPiece) rawPieces.push(lastPiece);
      break;
    }
    const piece = remaining.slice(0, match.index).trim();
    if (piece) rawPieces.push(piece);
    remaining = remaining.slice(match.index + match[0].length).trim();
  }

  if (rawPieces.length <= 1) {
    return [trimmed];
  }

  // Group candidate pieces into complete transaction clauses based on presence of amounts
  const clauses: string[] = [];
  let buffer = "";

  for (let i = 0; i < rawPieces.length; i++) {
    const piece = rawPieces[i];
    const candidateCombined = buffer ? `${buffer} and ${piece}` : piece;
    const pieceHasAmt = extractAmount(piece).amount !== null;

    if (pieceHasAmt) {
      if (buffer) {
        if (extractAmount(buffer).amount === null) {
          // Buffer was just a prefix item without an amount, merge into this piece
          clauses.push(candidateCombined);
          buffer = "";
        } else {
          clauses.push(buffer);
          buffer = piece;
        }
      } else {
        clauses.push(piece);
      }
    } else {
      buffer = candidateCombined;
    }
  }

  if (buffer) {
    if (clauses.length > 0 && extractAmount(buffer).amount === null) {
      clauses[clauses.length - 1] += ` ${buffer}`;
    } else {
      clauses.push(buffer);
    }
  }

  return clauses.length > 0 ? clauses : [trimmed];
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

  // Segment message into separate independent transaction clauses
  const lines = segmentMultiTransactionMessage(trimmed);

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

    // Build intelligent, comprehensive notes capturing user context accurately
    const intelligentNotes = [
      `${description} (${categoryName})`,
      lineLower.includes("water bottle") ? "Water bottle purchase" : null,
      contactMatch.contactName ? `Peer: ${contactMatch.contactName}` : null,
      groupMatch.groupName ? `Group: ${groupMatch.groupName}` : null,
      paymentMethod ? `Via ${paymentMethod}` : null,
      `Recorded via SplitLedger Conversational AI Assistant`,
    ]
      .filter(Boolean)
      .join(" • ");

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
      notes: intelligentNotes,
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

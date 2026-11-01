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
  createdPublicId?: string;
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

  // Pattern 4: "for 500", "of 120", "paid 2500", "spent 1000", "take 500", "give 400"
  const prepositionRegex = /(?:for|of|paid|spent|gave|received|got|cost|take|collect|pay|give|send|lend|borrow|transfer)\s+([0-9]+(?:,[0-9]+)*(?:\.[0-9]{1,2})?)/i;
  const prepMatch = text.match(prepositionRegex);
  if (prepMatch) {
    const rawNum = prepMatch[1].replace(/,/g, "");
    const parsed = parseFloat(rawNum);
    if (!isNaN(parsed) && parsed > 0) {
      return { amount: parsed, matchedText: prepMatch[0] };
    }
  }

  // Pattern 5: Number before "for", "on", "from", "to": "20 for water bottle", "500 from kartik"
  const numBeforePrepRegex = /\b([0-9]+(?:,[0-9]+)*(?:\.[0-9]{1,2})?)\s+(?:for|on|from|to)\b/i;
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

  // Pattern 8: Any standalone financial amount in sentence (ignoring dates/years/phone numbers)
  const generalNumRegex = /\b([0-9]+(?:,[0-9]+)*(?:\.[0-9]{1,2})?)\b/g;
  let numMatch: RegExpExecArray | null;
  while ((numMatch = generalNumRegex.exec(text)) !== null) {
    const raw = numMatch[1].replace(/,/g, "");
    const val = parseFloat(raw);
    const isYear = val >= 2020 && val <= 2035;
    const isPhoneOrTimestamp = raw.length >= 7;
    if (!isNaN(val) && val > 0 && !isYear && !isPhoneOrTimestamp) {
      return { amount: val, matchedText: numMatch[0] };
    }
  }

  // Pattern 9: Word number (e.g. "fifty rupees", "two hundred", "twenty")
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
  const lower = text.toLowerCase().trim();

  // 1. RECEIVABLES (Money owed to user / to be collected from peer -> lent)
  if (
    lower.includes("need to take") ||
    lower.includes("need to receive") ||
    lower.includes("need to collect") ||
    lower.includes("have to collect") ||
    lower.includes("have to take") ||
    lower.includes("to collect") ||
    lower.includes("collect from") ||
    lower.includes("take from") ||
    lower.includes("owes me") ||
    lower.includes("owe me") ||
    lower.includes("has to give") ||
    lower.includes("to give me") ||
    lower.includes("receivable")
  ) {
    return "lent";
  }

  // 2. PAYABLES (Money user owes to peer or pending bills -> borrowed)
  if (
    lower.includes("need to pay") ||
    lower.includes("need to give") ||
    lower.includes("need to return") ||
    lower.includes("have to pay") ||
    lower.includes("have to give") ||
    lower.includes("have to return") ||
    lower.includes("pending bill") ||
    lower.includes("pay bill") ||
    lower.includes("pay emi") ||
    lower.includes("pay electricity") ||
    lower.includes("i owe") ||
    lower.includes("owe ") ||
    lower.includes("borrowed from") ||
    lower.includes("borrow from") ||
    lower.includes("took from") ||
    lower.includes("loan from") ||
    lower.includes("payable")
  ) {
    return "borrowed";
  }

  // 3. INCOME (Money received / salary / refunds / credits -> received)
  if (
    lower.includes("received") ||
    lower.includes("salary") ||
    lower.includes("refund") ||
    lower.includes("cashback") ||
    lower.includes("bonus") ||
    lower.includes("interest") ||
    lower.includes("dividend") ||
    lower.includes("commission") ||
    lower.includes("credit") ||
    lower.includes("earned") ||
    lower.includes("income") ||
    lower.includes("deposited") ||
    lower.includes("paid me") ||
    lower.includes("returned ") ||
    lower.includes("got ")
  ) {
    return "received";
  }

  // 4. LENDING / GIVING (Gave money to contact -> lent)
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

  // Default is Expense (paid)
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
  const lower = text.toLowerCase();

  // First try matching against registered database contacts
  if (userContacts && userContacts.length > 0) {
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
  }

  // Natural language contact extraction for unregistered peers
  // e.g. "from Kunal", "to Rahul", "paid Rahul", "take from Kartik", "collect from Amol", "receive Kartik", "Rahul owes me"
  const namePatterns = [
    /(?:collect\s+from|take\s+from|receive\s+from|receive|pay\s+to|paid\s+to|paid|give\s+to|gave\s+to|gave|return\s+to|returned\s+to|from|to)\s+([A-Za-z]+)/i,
    /([A-Za-z]+)\s+(?:paid\s+me|owes\s+me|owe\s+me|returned|has\s+to\s+give)/i,
    /(?:need\s+to\s+pay|need\s+to\s+take\s+from|need\s+to\s+give|need\s+to\s+return|need\s+to\s+receive\s+from|need\s+to\s+receive|need\s+to\s+collect\s+from|need\s+to\s+collect)\s+([A-Za-z]+)/i,
  ];

  for (const pat of namePatterns) {
    const match = text.match(pat);
    if (match && match[1]) {
      const rawName = match[1].trim();
      const forbiddenWords = [
        "salary", "petrol", "chips", "tea", "bill", "flipkart", "amazon", "recharge",
        "groceries", "mess", "hotel", "coffee", "food", "bus", "train", "water", "bottle",
        "order", "wifi", "rent", "emi", "electricity", "electric"
      ];
      if (!forbiddenWords.includes(rawName.toLowerCase()) && rawName.length >= 3) {
        const capitalized = rawName.charAt(0).toUpperCase() + rawName.slice(1).toLowerCase();
        return { contactId: null, contactName: capitalized };
      }
    }
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

  // If receivable or payable with a peer
  if (type === "lent" && contactName) {
    if (lower.includes("need to take") || lower.includes("take from")) {
      return { title: `Need to take from ${contactName}`, description: `Receivable from ${contactName}` };
    }
    if (lower.includes("need to receive") || lower.includes("receive from") || lower.includes("receive ")) {
      return { title: `Need to receive from ${contactName}`, description: `Receivable from ${contactName}` };
    }
    if (lower.includes("collect from")) {
      return { title: `Collect from ${contactName}`, description: `Receivable from ${contactName}` };
    }
    if (lower.includes("owes me")) {
      return { title: `${contactName} owes me`, description: `Receivable from ${contactName}` };
    }
    return { title: `Receivable from ${contactName}`, description: `Receivable from ${contactName}` };
  }

  if (type === "borrowed" && contactName) {
    if (lower.includes("need to pay")) {
      return { title: `Need to pay ${contactName}`, description: `Payable to ${contactName}` };
    }
    if (lower.includes("need to give")) {
      return { title: `Need to give ${contactName}`, description: `Payable to ${contactName}` };
    }
    if (lower.includes("need to return")) {
      return { title: `Need to return to ${contactName}`, description: `Payable to ${contactName}` };
    }
    return { title: `Payable to ${contactName}`, description: `Pending payment to ${contactName}` };
  }

  if (type === "received") {
    if (lower.includes("salary")) {
      return { title: "Salary Credited", description: "Monthly Salary Credited" };
    }
    if (contactName && (lower.includes("received from") || lower.includes("paid me") || lower.includes("returned"))) {
      return { title: `Received from ${contactName}`, description: `Payment received from ${contactName}` };
    }
    if (lower.includes("cashback")) {
      return { title: "Cashback Received", description: "Cashback Reward" };
    }
    if (lower.includes("refund")) {
      if (lower.includes("amazon")) return { title: "Amazon Refund", description: "Refund from Amazon" };
      if (lower.includes("flipkart")) return { title: "Flipkart Refund", description: "Refund from Flipkart" };
      return { title: "Refund Received", description: "Refund Amount" };
    }
    if (lower.includes("bonus")) {
      return { title: "Bonus Received", description: "Bonus Credit" };
    }
  }

  // Domain item naming
  if (lower.includes("water bottle") || lower.includes("watter bottle")) {
    return { title: "Water bottle", description: "Purchased Water Bottle" };
  }
  if (lower.includes("flipkart")) {
    return { title: "Flipkart Order", description: "Flipkart Order Purchase" };
  }
  if (lower.includes("amazon") && !lower.includes("refund")) {
    return { title: "Amazon Order", description: "Amazon Order Purchase" };
  }
  if (lower.includes("recharge")) {
    return { title: "Mobile Recharge", description: "Mobile Recharge" };
  }
  if (lower.includes("electric bill") || lower.includes("light bill") || lower.includes("electricity")) {
    return { title: "Electric Bill", description: "Monthly Electricity Bill" };
  }
  if (lower.includes("mess")) {
    return { title: "Mess Food", description: "Mess Meal Expense" };
  }
  if (lower.includes("tea") || lower.includes("chai")) {
    return { title: "Tea", description: "Tea Purchase" };
  }
  if (lower.includes("coffee")) {
    return { title: "Coffee", description: "Coffee Purchase" };
  }
  if (lower.includes("petrol") || lower.includes("fuel") || lower.includes("diesel")) {
    return { title: "Petrol", description: "Fuel Refill Expense" };
  }
  if (lower.includes("chips")) {
    return { title: "Chips", description: "Chips & Snacks Purchase" };
  }
  if (lower.includes("groceries") || lower.includes("grocery") || lower.includes("kirana")) {
    return { title: "Groceries", description: "Grocery Supplies Purchase" };
  }
  if (lower.includes("bus") || lower.includes("travel by bus")) {
    return { title: "Bus Travel Fare", description: "Bus Travel Fare" };
  }

  // Clean rawText
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

  cleaned = cleaned.replace(/^(on|from|to|for|of|with|in)\s+/i, "").trim();

  if (!cleaned || cleaned.length < 2) {
    if (type === "lent" && contactName) cleaned = `Payment to ${contactName}`;
    else if (type === "received" && contactName) cleaned = `Received from ${contactName}`;
    else if (type === "received") cleaned = `Income (${categoryName})`;
    else cleaned = `${categoryName} Expense`;
  }

  const title = cleaned
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");

  return { title, description: title };
}

/**
 * Splits conversational multi-transaction input intelligently.
 * Connected by: and, ,, then, also, plus, &, +, newlines, or multi-item token streams.
 * Separates transactions whenever multiple independent expenses/purchases are present.
 */
function segmentMultiTransactionMessage(message: string): string[] {
  let cleanText = message.trim();
  if (!cleanText) return [];

  // Strip conversational preamble if present
  cleanText = cleanText.replace(
    /^(?:i\s+(?:made|make|have|want\s+to\s+make|spent|did)|here\s+(?:are|is)|please\s+(?:add|create|record|log)|add|create|log|record|exp[ae]n[cs]es?|below\s+details|details\s+below|so\s+create\s+trans(?:action|ition)s?)[\s\S]*?(?=(?:[A-Z][a-z0-9_-]+\s*[-–—:]\s*\d+|[A-Z][a-z0-9_-]+\s+\d+|\d+\s+[A-Za-z]+|need\s+to|salary|received|paid|chips|petrol|mess|tea|flipkart|amazon|groceries))/i,
    ""
  ).trim();

  // Split by newlines first
  const rawLines = cleanText.split(/\r?\n+/).map((l) => l.trim()).filter(Boolean);
  const clauses: string[] = [];

  for (const rawLine of rawLines) {
    // Split by commas, semicolons, or conjunctions
    const subParts = rawLine
      .split(/[,;]|\s+(?:and\s+then|and\s+also|also\s+bought|also\s+spent|followed\s+by|plus|and|\+)\s+/i)
      .map((s) => s.trim())
      .filter(Boolean);

    for (const part of subParts) {
      // Find all numbers that look like financial amounts
      const amtRegex = /(?:(?:₹|rs\.?|inr)\s*)?[-–—]?\s*\b([0-9]+(?:,[0-9]+)*(?:\.[0-9]{1,2})?)\s*(?:(?:₹|rs\.?|inr|rupees?|\/-)\b)?/gi;
      const matches: Array<{ fullMatch: string; amount: number; index: number; length: number }> = [];
      let m: RegExpExecArray | null;

      while ((m = amtRegex.exec(part)) !== null) {
        const val = parseFloat(m[1].replace(/,/g, ""));
        const isYear = (val === 2024 || val === 2025 || val === 2026 || val === 2027) && !/(?:₹|rs\.?|inr)/i.test(m[0]);
        if (!isNaN(val) && val > 0 && !isYear) {
          matches.push({
            fullMatch: m[0],
            amount: val,
            index: m.index,
            length: m[0].length,
          });
        }
      }

      if (matches.length <= 1) {
        clauses.push(part);
        continue;
      }

      // Multiple amounts found in a single line / segment!
      const startsWithAmount = matches[0].index === 0 || /^\s*[-–—]?\s*(?:₹|rs\.?|inr)?[0-9]+/i.test(part);

      if (startsWithAmount) {
        // [Amount1 Item1] [Amount2 Item2] ...
        for (let i = 0; i < matches.length; i++) {
          const start = matches[i].index;
          const end = i < matches.length - 1 ? matches[i + 1].index : part.length;
          const chunk = part.slice(start, end).trim();
          if (chunk) clauses.push(chunk);
        }
      } else {
        // [Item1 Amount1] [Item2 Amount2] ...
        for (let i = 0; i < matches.length; i++) {
          const prevEnd = i === 0 ? 0 : matches[i - 1].index + matches[i - 1].length;
          const curEnd = matches[i].index + matches[i].length;
          const chunk = part.slice(prevEnd, curEnd).trim();
          if (chunk) clauses.push(chunk);
        }
      }
    }
  }

  return clauses.length > 0 ? clauses : [cleanText];
}

/**
 * Detects if the message explicitly starts with "create transaction" or "create transactions" (Mode 2 Trigger)
 */
export function detectTransactionTrigger(message: string): {
  isTriggered: boolean;
  cleanMessage: string;
} {
  const trimmed = message.trim();
  // Mode 2 Trigger: message must start with "create transaction" or "create transactions" (or variations like "create transition")
  const triggerMatch = trimmed.match(/^(?:please\s+)?create\s+trans(?:action|ition)s?(?:\s*[:\-\n]|\s+|$)/i);
  if (triggerMatch) {
    const clean = trimmed.slice(triggerMatch[0].length).trim();
    return { isTriggered: true, cleanMessage: clean };
  }

  // Also match conversational prompt: "I make expances below details so create transition Chips - 20..."
  const preambleMatch = trimmed.match(/^(?:i\s+(?:made|make|have|did)\s+exp[ae]n[cs]es?[\s\S]*?so\s+create\s+trans(?:action|ition)s?[:\s\-]*)/i);
  if (preambleMatch) {
    const clean = trimmed.slice(preambleMatch[0].length).trim();
    return { isTriggered: true, cleanMessage: clean };
  }

  return { isTriggered: false, cleanMessage: trimmed };
}

/**
 * Main parser: Analyzes message, extracts one or multiple transaction proposals
 */
export function parseConversationalMessage(
  message: string,
  context?: NLPParserContext,
  options?: { requireExplicitTrigger?: boolean }
): ParseResult {
  const trimmed = message.trim();
  if (!trimmed) {
    return { hasTransactions: false, transactions: [], isIncomplete: false };
  }

  // If explicit trigger required and trigger is absent, return no transactions (Mode 1 Financial Assistant)
  let textToParse = trimmed;
  if (options?.requireExplicitTrigger) {
    const trigger = detectTransactionTrigger(trimmed);
    if (!trigger.isTriggered) {
      return { hasTransactions: false, transactions: [], isIncomplete: false };
    }
    textToParse = trigger.cleanMessage;
    if (!textToParse) {
      return {
        hasTransactions: false,
        transactions: [],
        isIncomplete: true,
        clarificationMessage: `Please tell me the transaction details.\n\nExamples:\n• Petrol 500\n• Salary 25000\n• Need to pay Rahul 500\n• Received from Kunal 1000`,
      };
    }
  }

  // 1. Check for single bare number (e.g. "500", "₹500", "500 rs")
  const bareNumberMatch = textToParse.match(/^[-–—]?\s*(?:₹|rs\.?|inr)?\s*([0-9]+(?:,[0-9]+)*(?:\.[0-9]{1,2})?)\s*(?:rs\.?|rupees?|\/-)?$/i);
  if (bareNumberMatch) {
    const amt = parseFloat(bareNumberMatch[1].replace(/,/g, ""));
    return {
      hasTransactions: false,
      transactions: [],
      isIncomplete: true,
      clarificationMessage: `I detected ₹${amt.toLocaleString("en-IN")} but couldn't identify what this transaction was for.`,
    };
  }

  // 2. Check for generic intent without details (e.g. "Created transaction", "add transaction")
  const genericIntentRegex = /^(?:please\s+)?(?:created?|add|log|record|make|new)\s+(?:a\s+)?(?:trans(?:action|ition)|exp[ae]n[cs]e|income|bill)s?$/i;
  if (genericIntentRegex.test(textToParse)) {
    return {
      hasTransactions: false,
      transactions: [],
      isIncomplete: true,
      clarificationMessage: `Please tell me the transaction details.\n\nExamples:\n• Petrol 500\n• Salary 25000\n• Need to pay Rahul 500\n• Received from Kunal 1000`,
    };
  }

  // Exclude pure questions that do not propose a transaction
  const lower = textToParse.toLowerCase();
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
  const lines = segmentMultiTransactionMessage(textToParse);

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
      paymentMethod: paymentMethod || "UPI",
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

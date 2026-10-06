/**
 * Natural Language Query Parser for AI Financial Search
 */

export interface ParsedSearchQuery {
  rawQuery: string;
  category?: string;
  minAmount?: number;
  maxAmount?: number;
  groupKeyword?: string;
  personKeyword?: string;
  status?: "pending" | "completed" | "unpaid";
  keywords: string[];
}

export function parseNaturalLanguageSearch(query: string): ParsedSearchQuery {
  const clean = query.trim();
  const lower = clean.toLowerCase();

  const result: ParsedSearchQuery = {
    rawQuery: clean,
    keywords: [],
  };

  // 1. Extract Amount filters (e.g. "above ₹1000", "> 500", "below 2000")
  const aboveMatch = lower.match(/(?:above|greater than|>|more than)\s*(?:₹|rs\.?|inr)?\s*(\d+(?:,\d+)*(?:\.\d+)?)/i);
  if (aboveMatch) {
    result.minAmount = parseFloat(aboveMatch[1].replace(/,/g, ""));
  }

  const belowMatch = lower.match(/(?:below|less than|<|under)\s*(?:₹|rs\.?|inr)?\s*(\d+(?:,\d+)*(?:\.\d+)?)/i);
  if (belowMatch) {
    result.maxAmount = parseFloat(belowMatch[1].replace(/,/g, ""));
  }

  // 2. Extract Category
  if (lower.includes("food") || lower.includes("dinner") || lower.includes("restaurant") || lower.includes("cafe")) {
    result.category = "Food & Dining";
  } else if (lower.includes("travel") || lower.includes("flight") || lower.includes("hotel") || lower.includes("trip")) {
    result.category = "Travel & Trips";
  } else if (lower.includes("petrol") || lower.includes("fuel") || lower.includes("diesel")) {
    result.category = "Petrol & Fuel";
  } else if (lower.includes("grocery") || lower.includes("groceries") || lower.includes("supermarket")) {
    result.category = "Groceries";
  } else if (lower.includes("subscription") || lower.includes("netflix") || lower.includes("spotify")) {
    result.category = "Subscriptions";
  }

  // 3. Extract Person keyword ("by Rahul", "from Priya")
  const personMatch = lower.match(/(?:by|from|to|with)\s+([a-zA-Z]+)/i);
  if (personMatch && !["all", "the", "my", "this", "last"].includes(personMatch[1].toLowerCase())) {
    result.personKeyword = personMatch[1];
  }

  // 4. Extract Status
  if (lower.includes("unpaid") || lower.includes("pending") || lower.includes("due")) {
    result.status = "pending";
  } else if (lower.includes("settled") || lower.includes("paid") || lower.includes("completed")) {
    result.status = "completed";
  }

  // Remaining token keywords
  const tokens = lower
    .replace(/(?:above|greater than|below|less than|under|show|find|list|all|expenses|transactions|by|from)\s+/gi, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !/^\d+$/.test(t));

  result.keywords = Array.from(new Set(tokens));

  return result;
}

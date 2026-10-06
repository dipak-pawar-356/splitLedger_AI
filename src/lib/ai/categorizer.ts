/**
 * Smart Expense Categorization & Merchant Intelligence Engine
 * Classifies expense descriptions into 17 standard financial domains with confidence scores.
 */

export interface CategorizationResult {
  category: string;
  confidence: number; // 0.0 to 1.0
  reasoning: string;
  suggestedTags: string[];
}

const CATEGORY_RULES: Record<
  string,
  { keywords: string[]; tags: string[]; baseConfidence: number }
> = {
  "Food & Dining": {
    keywords: [
      "dinner", "lunch", "breakfast", "cafe", "restaurant", "swiggy", "zomato",
      "starbucks", "mcdonalds", "kfc", "dominos", "pizza", "burger", "biryani",
      "tea", "coffee", "dhaba", "food", "barbeque", "buffet", "sweets", "bakery",
    ],
    tags: ["dining", "food", "meal"],
    baseConfidence: 0.92,
  },
  "Groceries": {
    keywords: [
      "blinkit", "zepto", "instamart", "dmart", "supermarket", "grocery", "vegetables",
      "fruits", "milk", "bigbasket", "nature's basket", "provision", "ration",
    ],
    tags: ["groceries", "household", "essentials"],
    baseConfidence: 0.94,
  },
  "Travel & Trips": {
    keywords: [
      "flight", "hotel", "resort", "airbnb", "goa", "trip", "tour", "makemytrip",
      "cleartrip", "booking.com", "irctc", "train", "boarding", "stay", "vacation",
    ],
    tags: ["travel", "trip", "holiday"],
    baseConfidence: 0.95,
  },
  "Petrol & Fuel": {
    keywords: [
      "petrol", "diesel", "fuel", "cng", "hpcl", "bpcl", "ioc", "indian oil", "shell",
      "gas station", "fueling",
    ],
    tags: ["fuel", "vehicle", "transport"],
    baseConfidence: 0.96,
  },
  "Transport": {
    keywords: [
      "uber", "ola", "rapido", "cab", "taxi", "metro", "auto", "bus", "toll",
      "fastag", "parking", "train ticket",
    ],
    tags: ["transport", "commute", "transit"],
    baseConfidence: 0.93,
  },
  "Subscriptions": {
    keywords: [
      "netflix", "spotify", "prime", "youtube premium", "hotstar", "chatgpt",
      "openai", "apple", "icloud", "google one", "aws", "github", "adobe",
      "microsoft 365", "subscription",
    ],
    tags: ["subscription", "recurring", "digital"],
    baseConfidence: 0.98,
  },
  "Rent & Housing": {
    keywords: ["rent", "maintenance", "landlord", "flat rent", "society maintenance", "brokerage"],
    tags: ["housing", "rent", "property"],
    baseConfidence: 0.97,
  },
  "Bills & Utilities": {
    keywords: [
      "electricity", "water bill", "wifi", "broadband", "airtel", "jio",
      "mobile recharge", "gas cylinder", "utility", "tata play", "dish tv",
    ],
    tags: ["utilities", "bills", "recurring"],
    baseConfidence: 0.94,
  },
  "Medical & Healthcare": {
    keywords: [
      "pharmacy", "medicine", "apollo", "1mg", "pharmeasy", "doctor", "hospital",
      "clinic", "dental", "diagnostic", "blood test", "consultation",
    ],
    tags: ["health", "medical", "wellness"],
    baseConfidence: 0.95,
  },
  "Shopping": {
    keywords: [
      "amazon", "flipkart", "myntra", "zara", "h&m", "clothing", "shoes",
      "electronics", "mall", "retail", "croma", "reliance digital",
    ],
    tags: ["shopping", "lifestyle", "goods"],
    baseConfidence: 0.91,
  },
  "Entertainment": {
    keywords: [
      "movie", "pvr", "inox", "bookmyshow", "concert", "game", "gaming",
      "club", "pub", "party", "amusement park",
    ],
    tags: ["entertainment", "leisure", "events"],
    baseConfidence: 0.92,
  },
  "Sports & Fitness": {
    keywords: ["gym", "cult.fit", "cult fit", "fitness", "badminton", "turf", "swimming", "sports"],
    tags: ["fitness", "sports", "wellness"],
    baseConfidence: 0.93,
  },
  "Investments": {
    keywords: ["mutual fund", "sip", "zerodha", "groww", "stocks", "crypto", "fixed deposit", "gold"],
    tags: ["investment", "savings", "wealth"],
    baseConfidence: 0.96,
  },
  "Education": {
    keywords: ["course", "udemy", "coursera", "college", "tuition", "books", "exam fee", "school"],
    tags: ["education", "learning", "books"],
    baseConfidence: 0.94,
  },
};

/**
 * Predict category and tags from description text with reasoning
 */
export function categorizeExpense(description: string): CategorizationResult {
  if (!description || !description.trim()) {
    return {
      category: "General",
      confidence: 0.3,
      reasoning: "No description provided, assigned to General.",
      suggestedTags: ["general"],
    };
  }

  const cleanText = description.toLowerCase().trim();

  let bestMatch = {
    category: "General",
    confidence: 0.4,
    reasoning: "No specific merchant or keyword matched.",
    suggestedTags: ["general"],
  };
  let highestScore = 0;

  for (const [categoryName, rule] of Object.entries(CATEGORY_RULES)) {
    let matchedKeywords: string[] = [];

    for (const kw of rule.keywords) {
      if (cleanText.includes(kw)) {
        matchedKeywords.push(kw);
      }
    }

    if (matchedKeywords.length > 0) {
      const score = matchedKeywords.length * rule.baseConfidence;
      if (score > highestScore) {
        highestScore = score;
        bestMatch = {
          category: categoryName,
          confidence: Math.min(0.99, rule.baseConfidence + (matchedKeywords.length - 1) * 0.02),
          reasoning: `Identified keyword(s) "${matchedKeywords.join(", ")}" associated with ${categoryName}.`,
          suggestedTags: rule.tags,
        };
      }
    }
  }

  return bestMatch;
}

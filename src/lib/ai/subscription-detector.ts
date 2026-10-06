/**
 * Recurring Subscription & Utility Bill Detection Engine
 */

export interface DetectedSubscription {
  id: string;
  name: string;
  category: "Digital Subscription" | "Utilities & Bills" | "Housing & Rent" | "Fitness & Memberships";
  monthlyAmount: number; // in rupees
  annualizedCost: number; // in rupees
  billingCycle: "monthly" | "quarterly" | "yearly";
  nextEstimatedBillingDate: string;
  confidence: number;
  lastPaymentDate: string;
  savingRecommendation?: string;
}

const KNOWN_SUBSCRIPTIONS: Array<{
  name: string;
  keywords: string[];
  category: DetectedSubscription["category"];
  defaultCycle: "monthly" | "yearly";
}> = [
  { name: "Netflix", keywords: ["netflix"], category: "Digital Subscription", defaultCycle: "monthly" },
  { name: "Spotify Premium", keywords: ["spotify"], category: "Digital Subscription", defaultCycle: "monthly" },
  { name: "YouTube Premium", keywords: ["youtube premium", "youtube"], category: "Digital Subscription", defaultCycle: "monthly" },
  { name: "ChatGPT Plus", keywords: ["chatgpt", "openai"], category: "Digital Subscription", defaultCycle: "monthly" },
  { name: "Amazon Prime", keywords: ["amazon prime", "prime video"], category: "Digital Subscription", defaultCycle: "yearly" },
  { name: "Disney+ Hotstar", keywords: ["hotstar", "disney"], category: "Digital Subscription", defaultCycle: "yearly" },
  { name: "Apple iCloud / Music", keywords: ["apple.com", "icloud", "apple music"], category: "Digital Subscription", defaultCycle: "monthly" },
  { name: "Google One Storage", keywords: ["google one", "google storage"], category: "Digital Subscription", defaultCycle: "monthly" },
  { name: "Cult.fit / Gym Membership", keywords: ["cult.fit", "cult fit", "gym", "fitness first"], category: "Fitness & Memberships", defaultCycle: "monthly" },
  { name: "Broadband Wifi Internet", keywords: ["airtel broadband", "jio fiber", "act fibernet", "wifi bill"], category: "Utilities & Bills", defaultCycle: "monthly" },
  { name: "Mobile Postpaid / Recharge", keywords: ["airtel postpaid", "jio recharge", "vi prepaid"], category: "Utilities & Bills", defaultCycle: "monthly" },
  { name: "Apartment Rent", keywords: ["flat rent", "house rent", "room rent"], category: "Housing & Rent", defaultCycle: "monthly" },
];

/**
 * Identify recurring subscriptions from user transaction history
 */
export function detectSubscriptions(
  transactionsList: Array<{ title?: string | null; description?: string | null; amount: number; date: Date | string }>
): DetectedSubscription[] {
  const detected: DetectedSubscription[] = [];

  for (const item of KNOWN_SUBSCRIPTIONS) {
    const matchingTx = transactionsList.filter((tx) => {
      const text = `${tx.title} ${tx.description || ""}`.toLowerCase();
      return item.keywords.some((kw) => text.includes(kw));
    });

    if (matchingTx.length > 0) {
      // Sort by date descending
      matchingTx.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const latestTx = matchingTx[0];
      const amountRupees = latestTx.amount > 10000 && latestTx.amount % 100 === 0 ? latestTx.amount / 100 : latestTx.amount;

      // Project next date (+30 days for monthly, +365 days for yearly)
      const lastDate = new Date(latestTx.date);
      const nextDate = new Date(lastDate);
      if (item.defaultCycle === "monthly") {
        nextDate.setMonth(nextDate.getMonth() + 1);
      } else {
        nextDate.setFullYear(nextDate.getFullYear() + 1);
      }

      const monthlyAmount = item.defaultCycle === "monthly" ? amountRupees : Math.round(amountRupees / 12);
      const annualizedCost = item.defaultCycle === "monthly" ? amountRupees * 12 : amountRupees;

      detected.push({
        id: `sub_${item.name.toLowerCase().replace(/[^a-z0-9]/g, "_")}`,
        name: item.name,
        category: item.category,
        monthlyAmount,
        annualizedCost,
        billingCycle: item.defaultCycle,
        nextEstimatedBillingDate: nextDate.toISOString().split("T")[0],
        lastPaymentDate: lastDate.toISOString().split("T")[0],
        confidence: matchingTx.length >= 2 ? 0.95 : 0.85,
        savingRecommendation:
          item.category === "Digital Subscription"
            ? "Consider sharing a family plan or switching to annual billing to save up to 20%."
            : undefined,
      });
    }
  }

  return detected;
}

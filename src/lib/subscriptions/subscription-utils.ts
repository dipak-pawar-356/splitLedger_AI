export interface UserSubscription {
  id: string;
  name: string;
  merchant: string;
  category: string;
  amount: number; // in rupees
  billingCycle: "monthly" | "weekly" | "quarterly" | "yearly" | "custom";
  monthlyAmount: number;
  annualizedCost: number;
  startDate?: string;
  nextBillingDate: string;
  lastPaymentDate?: string;
  paymentMethod: string;
  autoRenewal: boolean;
  reminderDays: number;
  status: "Active" | "Upcoming" | "Due Today" | "Paid" | "Overdue" | "Paused" | "Cancelled" | "Trial";
  description?: string;
  isCustom?: boolean;
  confidence?: number;
  savingRecommendation?: string;
  createdAt: string;
  updatedAt: string;
}

export function advanceDateByBillingCycle(
  dateStr: string,
  cycle: "monthly" | "weekly" | "quarterly" | "yearly" | "custom"
): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return new Date().toISOString().split("T")[0];
  switch (cycle) {
    case "weekly":
      d.setDate(d.getDate() + 7);
      break;
    case "quarterly":
      d.setMonth(d.getMonth() + 3);
      break;
    case "yearly":
      d.setFullYear(d.getFullYear() + 1);
      break;
    case "monthly":
    case "custom":
    default:
      d.setMonth(d.getMonth() + 1);
      break;
  }
  return d.toISOString().split("T")[0];
}

export function computeSubscriptionAmounts(
  amount: number,
  billingCycle: "monthly" | "weekly" | "quarterly" | "yearly" | "custom"
): { monthlyAmount: number; annualizedCost: number } {
  const cleanAmt = Math.max(0, Math.round(amount));
  let monthlyAmount = cleanAmt;
  let annualizedCost = cleanAmt * 12;

  switch (billingCycle) {
    case "yearly":
      monthlyAmount = Math.round(cleanAmt / 12);
      annualizedCost = cleanAmt;
      break;
    case "quarterly":
      monthlyAmount = Math.round(cleanAmt / 3);
      annualizedCost = cleanAmt * 4;
      break;
    case "weekly":
      monthlyAmount = Math.round(cleanAmt * 4.333);
      annualizedCost = cleanAmt * 52;
      break;
    case "monthly":
    case "custom":
    default:
      monthlyAmount = cleanAmt;
      annualizedCost = cleanAmt * 12;
      break;
  }

  return { monthlyAmount, annualizedCost };
}

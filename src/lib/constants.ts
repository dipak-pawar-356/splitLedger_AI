export const CURRENCIES = [
  { code: "INR", symbol: "₹", name: "Indian Rupee (₹)" },
] as const;

export const TRANSACTION_TYPES = [
  { value: "paid", label: "Paid" },
  { value: "received", label: "Received" },
  { value: "lent", label: "Lent" },
  { value: "borrowed", label: "Borrowed" },
  { value: "repaid", label: "Repaid" },
  { value: "adjustment", label: "Adjustment" },
] as const;

export const EXPENSE_CATEGORIES = [
  { value: "food", label: "Food & Dining", icon: "utensils" },
  { value: "transport", label: "Transportation", icon: "car" },
  { value: "shopping", label: "Shopping", icon: "shopping-bag" },
  { value: "entertainment", label: "Entertainment", icon: "film" },
  { value: "utilities", label: "Utilities", icon: "zap" },
  { value: "rent", label: "Rent", icon: "home" },
  { value: "health", label: "Healthcare", icon: "heart" },
  { value: "education", label: "Education", icon: "book" },
  { value: "travel", label: "Travel", icon: "plane" },
  { value: "other", label: "Other", icon: "more-horizontal" },
] as const;

export const SPLIT_METHODS = [
  { value: "equal", label: "Equal Split" },
  { value: "exact", label: "Exact Amounts" },
  { value: "percentage", label: "Percentage" },
  { value: "shares", label: "Share Based" },
] as const;

export const GROUP_TYPES = [
  { value: "trip", label: "Trip" },
  { value: "friends", label: "Friends" },
  { value: "family", label: "Family" },
  { value: "couples", label: "Couples" },
  { value: "office", label: "Office" },
  { value: "event", label: "Event" },
  { value: "shared_bills", label: "Shared Bills" },
] as const;

export const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "upi", label: "UPI" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "digital_wallet", label: "Digital Wallet" },
  { value: "check", label: "Check" },
] as const;

/**
 * Settlement Calculator
 * 
 * Implements algorithms to calculate optimal settlements between group members
 * to minimize the number of transactions required to settle all debts.
 * Supports multiple split methods, tax/discount/tip handling, payer exclusion,
 * guest members, and expense ownership tracking.
 */

export interface Balance {
  userId?: number;
  contactId?: number;
  name?: string;
  isGuest?: boolean;
  amount: number; // Positive = owed money, Negative = owes money
}

export interface Settlement {
  fromUserId?: number;
  fromContactId?: number;
  toUserId?: number;
  toContactId?: number;
  fromName?: string;
  toName?: string;
  amount: number;
  currency: string;
}

export interface ExpenseSplit {
  userId?: number;
  contactId?: number;
  amount?: number;
  percentage?: number;
  shares?: number;
  isExcluded?: boolean;
}

export interface Expense {
  id?: number;
  paidBy?: number;
  paidByContact?: number;
  amount: number;
  currency: string;
  splitType: "equal" | "exact" | "percentage" | "shares";
  splits: ExpenseSplit[];
  tax?: number;
  discount?: number;
  tip?: number;
  excludePayer?: boolean;
  description?: string;
  createdBy?: number;
  isDeleted?: boolean;
}

export interface SettlementResult {
  settlements: Settlement[];
  totalAmount: number;
  transactionCount: number;
  currency: string;
  savings: number; // Amount saved by optimal settlements
  memberCount: number;
  guestCount: number;
}

/**
 * Calculate optimal settlements using a greedy algorithm
 * This minimizes the number of transactions by matching largest debts with largest credits
 */
export function calculateOptimalSettlements(balances: Balance[], currency: string = "INR"): Settlement[] {
  const settlements: Settlement[] = [];
  
  // Separate into creditors (positive balance) and debtors (negative balance)
  const creditors: Balance[] = balances.filter(b => b.amount > 0).sort((a, b) => b.amount - a.amount);
  const debtors: Balance[] = balances.filter(b => b.amount < 0).map(b => ({ ...b, amount: -b.amount })).sort((a, b) => b.amount - a.amount);
  
  let i = 0; // creditor index
  let j = 0; // debtor index
  
  while (i < creditors.length && j < debtors.length) {
    const creditor = creditors[i];
    const debtor = debtors[j];
    
    // Calculate the settlement amount
    const amount = Math.min(creditor.amount, debtor.amount);
    
    if (amount > 0) {
      settlements.push({
        fromUserId: debtor.userId,
        fromContactId: debtor.contactId,
        toUserId: creditor.userId,
        toContactId: creditor.contactId,
        fromName: debtor.name,
        toName: creditor.name,
        amount: Math.round(amount),
        currency,
      });
      
      // Update remaining balances
      creditor.amount -= amount;
      debtor.amount -= amount;
      
      // Move to next creditor if settled
      if (creditor.amount < 1) {
        i++;
      }
      
      // Move to next debtor if settled
      if (debtor.amount < 1) {
        j++;
      }
    }
  }
  
  return settlements;
}

/**
 * Calculate balances for a group based on expenses with advanced split support
 * Supports: equal, exact, percentage, shares splits with tax/discount/tip
 * Handles guest members and expense ownership tracking
 */
export function calculateGroupBalances(
  expenses: Expense[], 
  memberNamesMap?: Record<string, string>
): Balance[] {
  const balanceMap = new Map<string, { userId?: number; contactId?: number; name?: string; isGuest?: boolean; amount: number }>();
  
  // Filter out deleted expenses
  const activeExpenses = expenses.filter(e => !e.isDeleted);
  
  activeExpenses.forEach(expense => {
    // Calculate effective amount after tax, discount, and tip
    const baseAmount = expense.amount;
    const taxAmount = expense.tax || 0;
    const discountAmount = expense.discount || 0;
    const tipAmount = expense.tip || 0;
    
    // Apply discount first, then add tax and tip
    const effectiveAmount = baseAmount - discountAmount + taxAmount + tipAmount;
    
    // Add the amount paid by the payer
    const payerKey = expense.paidBy ? `user-${expense.paidBy}` : `contact-${expense.paidByContact}`;
    const payerName = memberNamesMap?.[payerKey];
    const payerBalance = balanceMap.get(payerKey) || { 
      userId: expense.paidBy, 
      contactId: expense.paidByContact,
      name: payerName,
      amount: 0 
    };
    if (!payerBalance.name && payerName) {
      payerBalance.name = payerName;
    }
    payerBalance.amount += effectiveAmount;
    balanceMap.set(payerKey, payerBalance);
    
    // Determine who should pay the split
    let participants = expense.splits;
    
    // If excludePayer is true, remove payer from participants
    if (expense.excludePayer) {
      participants = participants.filter(s => 
        (expense.paidBy && s.userId !== expense.paidBy) ||
        (expense.paidByContact && s.contactId !== expense.paidByContact)
      );
    }
    
    // Calculate each participant's share
    participants.forEach(split => {
      let shareAmount = 0;
      
      switch (expense.splitType) {
        case "equal":
          shareAmount = participants.length > 0 ? effectiveAmount / participants.length : 0;
          break;
        case "exact":
          shareAmount = split.amount || 0;
          break;
        case "percentage":
          shareAmount = (effectiveAmount * (split.percentage || 0)) / 100;
          break;
        case "shares":
          const totalShares = participants.reduce((sum, s) => sum + (s.shares || 0), 0);
          shareAmount = totalShares > 0 ? (effectiveAmount * (split.shares || 0)) / totalShares : 0;
          break;
      }
      
      const userKey = split.userId ? `user-${split.userId}` : `contact-${split.contactId}`;
      const userName = memberNamesMap?.[userKey];
      const userBalance = balanceMap.get(userKey) || { 
        userId: split.userId, 
        contactId: split.contactId,
        name: userName,
        amount: 0 
      };
      if (!userBalance.name && userName) {
        userBalance.name = userName;
      }
      userBalance.amount -= shareAmount;
      balanceMap.set(userKey, userBalance);
    });
  });
  
  // Convert to Balance array
  return Array.from(balanceMap.entries()).map(([key, data]) => ({
    userId: data.userId,
    contactId: data.contactId,
    name: data.name || memberNamesMap?.[key] || (data.userId ? `User #${data.userId}` : `Contact #${data.contactId}`),
    isGuest: data.isGuest,
    amount: Math.round(data.amount),
  }));
}

/**
 * Calculate comprehensive settlements for a group
 * Returns detailed settlement result with savings calculation
 */
export function calculateGroupSettlements(
  expenses: Expense[],
  memberNamesMap?: Record<string, string>
): SettlementResult {
  const currency = expenses[0]?.currency || "INR";
  
  // Calculate balances
  const balances = calculateGroupBalances(expenses, memberNamesMap);
  
  // Calculate optimal settlements
  const settlements = calculateOptimalSettlements(balances, currency);
  
  // Calculate total amount to be settled
  const totalAmount = settlements.reduce((sum, s) => sum + s.amount, 0);
  
  // Calculate savings (reduction in number of transactions)
  const positiveCount = balances.filter(b => b.amount > 0).length;
  const negativeCount = balances.filter(b => b.amount < 0).length;
  const maxPossibleTransactions = Math.min(positiveCount, negativeCount);
  const savings = Math.max(0, maxPossibleTransactions - settlements.length);
  
  // Count members and guests
  const memberCount = balances.filter(b => b.userId && !b.isGuest).length;
  const guestCount = balances.filter(b => b.isGuest || b.contactId).length;
  
  return {
    settlements,
    totalAmount: Math.round(totalAmount),
    transactionCount: settlements.length,
    currency,
    savings,
    memberCount,
    guestCount,
  };
}

/**
 * Calculate settlements for a specific contact
 */
export function calculateContactSettlements(
  userId: number,
  contactId: number,
  transactions: Array<{
    type: "paid" | "received" | "lent" | "borrowed" | "repaid";
    amount: number;
  }>,
  currency: string = "INR"
): Settlement[] {
  let balance = 0;
  
  transactions.forEach(tx => {
    switch (tx.type) {
      case "received":
      case "lent":
        balance += tx.amount;
        break;
      case "paid":
      case "borrowed":
        balance -= tx.amount;
        break;
      case "repaid":
        balance -= tx.amount;
        break;
    }
  });
  
  const settlements: Settlement[] = [];
  
  if (balance > 0) {
    // Contact owes user
    settlements.push({
      fromContactId: contactId,
      toUserId: userId,
      amount: balance,
      currency,
    });
  } else if (balance < 0) {
    // User owes contact
    settlements.push({
      fromUserId: userId,
      toContactId: contactId,
      amount: Math.abs(balance),
      currency,
    });
  }
  
  return settlements;
}

/**
 * Validate that settlements are mathematically correct
 */
export function validateSettlements(
  originalBalances: Balance[],
  settlements: Settlement[]
): boolean {
  // Calculate final balances after settlements
  const finalBalances = new Map<string, number>();
  
  // Start with original balances
  originalBalances.forEach(b => {
    const key = b.userId ? `user-${b.userId}` : `contact-${b.contactId}`;
    finalBalances.set(key, b.amount);
  });
  
  // Apply settlements
  settlements.forEach(s => {
    const fromKey = s.fromUserId ? `user-${s.fromUserId}` : `contact-${s.fromContactId}`;
    const fromBalance = finalBalances.get(fromKey) || 0;
    finalBalances.set(fromKey, fromBalance - s.amount);
    
    const toKey = s.toUserId ? `user-${s.toUserId}` : `contact-${s.toContactId}`;
    const toBalance = finalBalances.get(toKey) || 0;
    finalBalances.set(toKey, toBalance + s.amount);
  });
  
  // All final balances should be close to zero
  for (const [_, balance] of finalBalances) {
    if (Math.abs(balance) > 1) {
      return false;
    }
  }
  
  return true;
}

/**
 * Validate a single settlement
 */
export function validateSettlement(settlement: {
  fromUserId?: number | string;
  toUserId?: number | string;
  amount: number;
}): { valid: boolean; error?: string; errors: string[] } {
  if (settlement.amount <= 0) {
    const error = "Amount must be positive";
    return { valid: false, error, errors: [error] };
  }
  if (settlement.fromUserId && settlement.toUserId && String(settlement.fromUserId) === String(settlement.toUserId)) {
    const error = "From and to users must be different";
    return { valid: false, error, errors: [error] };
  }
  return { valid: true, errors: [] };
}

/**
 * Calculate the minimum number of transactions needed
 */
export function calculateMinimumTransactions(balances: Balance[]): number {
  const positiveCount = balances.filter(b => b.amount > 0).length;
  const negativeCount = balances.filter(b => b.amount < 0).length;
  
  return Math.min(positiveCount, negativeCount);
}

/**
 * Generate settlement summary
 */
export function generateSettlementSummary(settlements: Settlement[]): {
  totalAmount: number;
  totalSettlements: number;
  transactionCount: number;
  currency: string;
} {
  const totalAmount = settlements.reduce((sum, s) => sum + s.amount, 0);
  const currency = settlements[0]?.currency || "INR";
  
  return {
    totalAmount,
    totalSettlements: settlements.length,
    transactionCount: settlements.length,
    currency,
  };
}

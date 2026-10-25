/**
 * Pure Mathematical Calculation Engine for Group Split Methods:
 * 1. Exact Amount Split (Fixed allocation + equal distribution of remaining expense)
 * 2. Percentage Split (Strict 100% allocation with zero-drift paise conservation)
 * 3. Shares Ratio Split (Unit or decimal shares with deterministic share value)
 * 4. Receiver Assignment Validation Engine (Debtor liability to creditor matching)
 * 
 * Invariants:
 * - Currency: strictly Indian Rupee (₹ INR) and integer paise (100 paise = ₹1.00).
 * - Zero-drift: sum of all calculated member payables exactly equals total group expense.
 * - Non-negativity: shares > 0, percentages >= 0, fixed amounts >= 0.
 * - Equal Split (1/N) is kept untouched and preserves existing behavior.
 */

export interface SplitMemberInput {
  key: string; // "user-123" or "contact-456"
  userId?: number;
  contactId?: number;
  name: string;
  avatar?: string | null;
  fixedAmountPaise?: number; // for Exact Amount
  percentage?: number;       // for Percentage (0-100)
  shares?: number;           // for Shares (> 0)
  isLocked?: boolean;        // lock fixed allocation
}

export interface CalculatedMemberPayable {
  key: string;
  userId?: number;
  contactId?: number;
  name: string;
  avatar?: string | null;
  amountPaise: number;       // Final target payable in paise
  amountRupees: number;      // Final target payable in Rupees (paise / 100)
  fixedPaise?: number;       // Fixed share for exact amount
  remainingPaise?: number;   // Distributed remaining share for exact amount
  percentage?: number;       // Percentage share
  shares?: number;           // Shares share
  contributionPct: number;   // % of total group expense
}

export interface ExactAmountCalculationResult {
  payables: CalculatedMemberPayable[];
  totalExpensePaise: number;
  totalExpenseRupees: number;
  allocatedFixedPaise: number;
  allocatedFixedRupees: number;
  remainingUnallocatedPaise: number;
  remainingUnallocatedRupees: number;
  perMemberRemainingPaise: number;
  isValid: boolean;
  validationError?: string;
}

export interface PercentageCalculationResult {
  payables: CalculatedMemberPayable[];
  totalExpensePaise: number;
  totalExpenseRupees: number;
  totalPercentage: number;
  remainingPercentage: number;
  isValid: boolean;
  validationError?: string;
}

export interface SharesCalculationResult {
  payables: CalculatedMemberPayable[];
  totalExpensePaise: number;
  totalExpenseRupees: number;
  totalShares: number;
  shareValuePaise: number;
  shareValueRupees: number;
  isValid: boolean;
  validationError?: string;
}

/**
 * 1. EXACT AMOUNT SPLIT ENGINE
 * Formula:
 * - Admin enters fixed amounts Fi for members.
 * - Sum of fixed amounts = Sf = sum(Fi).
 * - If Sf > TotalExpense: Invalid.
 * - Remaining Expense = Trem = TotalExpense - Sf.
 * - Remaining Expense is distributed equally among all participating members:
 *   each member gets floor(Trem / N) + (remainder paise to first R members).
 * - Final Target Payable Pi = Fi + remaining_share_i.
 * - Invariant: sum(Pi) === TotalExpense.
 */
export function calculateExactAmountGroupPayables(
  totalExpensePaise: number,
  members: SplitMemberInput[]
): ExactAmountCalculationResult {
  const count = members.length;
  const totalExpenseRupees = totalExpensePaise / 100;

  if (count === 0 || totalExpensePaise <= 0) {
    return {
      payables: [],
      totalExpensePaise,
      totalExpenseRupees,
      allocatedFixedPaise: 0,
      allocatedFixedRupees: 0,
      remainingUnallocatedPaise: 0,
      remainingUnallocatedRupees: 0,
      perMemberRemainingPaise: 0,
      isValid: true,
    };
  }

  // Calculate sum of fixed allocations
  let allocatedFixedPaise = 0;
  for (const m of members) {
    const fixed = Math.max(0, Math.round(m.fixedAmountPaise || 0));
    allocatedFixedPaise += fixed;
  }

  const allocatedFixedRupees = allocatedFixedPaise / 100;

  if (allocatedFixedPaise > totalExpensePaise) {
    return {
      payables: members.map((m) => {
        const fixed = Math.max(0, Math.round(m.fixedAmountPaise || 0));
        return {
          key: m.key,
          userId: m.userId,
          contactId: m.contactId,
          name: m.name,
          avatar: m.avatar,
          amountPaise: fixed,
          amountRupees: fixed / 100,
          fixedPaise: fixed,
          remainingPaise: 0,
          contributionPct: totalExpensePaise > 0 ? Math.round((fixed / totalExpensePaise) * 100) : 0,
        };
      }),
      totalExpensePaise,
      totalExpenseRupees,
      allocatedFixedPaise,
      allocatedFixedRupees,
      remainingUnallocatedPaise: totalExpensePaise - allocatedFixedPaise,
      remainingUnallocatedRupees: (totalExpensePaise - allocatedFixedPaise) / 100,
      perMemberRemainingPaise: 0,
      isValid: false,
      validationError: `Sum of fixed amounts (₹${allocatedFixedRupees.toFixed(2)}) exceeds total expense (₹${totalExpenseRupees.toFixed(2)}).`,
    };
  }

  const remainingUnallocatedPaise = totalExpensePaise - allocatedFixedPaise;
  const remainingUnallocatedRupees = remainingUnallocatedPaise / 100;

  // Distribute remaining equally among all members
  const baseRemainingPaise = Math.floor(remainingUnallocatedPaise / count);
  const remainderPaise = remainingUnallocatedPaise % count;

  let verifiedSum = 0;
  const payables: CalculatedMemberPayable[] = members.map((m, idx) => {
    const fixed = Math.max(0, Math.round(m.fixedAmountPaise || 0));
    const memberRemaining = baseRemainingPaise + (idx < remainderPaise ? 1 : 0);
    const finalPaise = fixed + memberRemaining;
    verifiedSum += finalPaise;

    return {
      key: m.key,
      userId: m.userId,
      contactId: m.contactId,
      name: m.name,
      avatar: m.avatar,
      amountPaise: finalPaise,
      amountRupees: finalPaise / 100,
      fixedPaise: fixed,
      remainingPaise: memberRemaining,
      contributionPct: totalExpensePaise > 0 ? Math.round((finalPaise / totalExpensePaise) * 100) : 0,
    };
  });

  // Zero-drift guard: ensure sum strictly equals totalExpensePaise
  const drift = totalExpensePaise - verifiedSum;
  if (drift !== 0 && payables.length > 0) {
    payables[payables.length - 1].amountPaise += drift;
    payables[payables.length - 1].amountRupees = payables[payables.length - 1].amountPaise / 100;
  }

  return {
    payables,
    totalExpensePaise,
    totalExpenseRupees,
    allocatedFixedPaise,
    allocatedFixedRupees,
    remainingUnallocatedPaise,
    remainingUnallocatedRupees,
    perMemberRemainingPaise: baseRemainingPaise,
    isValid: true,
  };
}

/**
 * 2. PERCENTAGE SPLIT ENGINE
 * Formula:
 * - Admin assigns percentages pi to members.
 * - Sum of percentages must equal 100%.
 * - Member target payable Pi = round(TotalExpense * (pi / 100)).
 * - Last member receives remainder to ensure exact zero-drift equality.
 */
export function calculatePercentageGroupPayables(
  totalExpensePaise: number,
  members: SplitMemberInput[]
): PercentageCalculationResult {
  const count = members.length;
  const totalExpenseRupees = totalExpensePaise / 100;

  if (count === 0 || totalExpensePaise <= 0) {
    return {
      payables: [],
      totalExpensePaise,
      totalExpenseRupees,
      totalPercentage: 0,
      remainingPercentage: 100,
      isValid: true,
    };
  }

  let totalPercentage = 0;
  for (const m of members) {
    totalPercentage += Math.max(0, Number(m.percentage) || 0);
  }

  // Round to 2 decimals for percentage sum check
  totalPercentage = Math.round(totalPercentage * 100) / 100;
  const remainingPercentage = Math.round((100 - totalPercentage) * 100) / 100;

  const isValid = Math.abs(totalPercentage - 100) <= 0.05;
  let validationError: string | undefined;

  if (!isValid) {
    if (totalPercentage < 100) {
      validationError = `Total percentage is ${totalPercentage}%. Remaining ${remainingPercentage}% must be assigned to reach 100%.`;
    } else {
      validationError = `Total percentage is ${totalPercentage}%, which exceeds 100% by ${(totalPercentage - 100).toFixed(2)}%.`;
    }
  }

  let allocatedSum = 0;
  const payables: CalculatedMemberPayable[] = members.map((m, idx) => {
    const pct = Math.max(0, Number(m.percentage) || 0);
    let amountPaise = 0;

    if (idx === count - 1) {
      // Last member gets the exact difference to guarantee zero-drift
      amountPaise = Math.max(0, totalExpensePaise - allocatedSum);
    } else {
      amountPaise = Math.round((totalExpensePaise * pct) / 100);
      allocatedSum += amountPaise;
    }

    return {
      key: m.key,
      userId: m.userId,
      contactId: m.contactId,
      name: m.name,
      avatar: m.avatar,
      amountPaise,
      amountRupees: amountPaise / 100,
      percentage: pct,
      contributionPct: Math.round(pct),
    };
  });

  return {
    payables,
    totalExpensePaise,
    totalExpenseRupees,
    totalPercentage,
    remainingPercentage,
    isValid,
    validationError,
  };
}

/**
 * 3. SHARES RATIO SPLIT ENGINE
 * Formula:
 * - Admin assigns share units si to members (integers or decimals > 0).
 * - Total shares S = sum(si).
 * - Single share value = TotalExpense / S.
 * - Member target payable Pi = round(TotalExpense * (si / S)).
 * - Last member receives remainder to ensure exact zero-drift equality.
 */
export function calculateSharesGroupPayables(
  totalExpensePaise: number,
  members: SplitMemberInput[]
): SharesCalculationResult {
  const count = members.length;
  const totalExpenseRupees = totalExpensePaise / 100;

  if (count === 0 || totalExpensePaise <= 0) {
    return {
      payables: [],
      totalExpensePaise,
      totalExpenseRupees,
      totalShares: 0,
      shareValuePaise: 0,
      shareValueRupees: 0,
      isValid: true,
    };
  }

  let totalShares = 0;
  let hasZeroOrNegativeShare = false;

  for (const m of members) {
    const s = Number(m.shares) || 0;
    if (s <= 0) {
      hasZeroOrNegativeShare = true;
    }
    totalShares += Math.max(0, s);
  }

  totalShares = Math.round(totalShares * 100) / 100;

  const isValid = totalShares > 0 && !hasZeroOrNegativeShare;
  let validationError: string | undefined;

  if (totalShares <= 0) {
    validationError = "Total shares must be greater than zero.";
  } else if (hasZeroOrNegativeShare) {
    validationError = "Every member must have at least 1 share (or positive decimal share).";
  }

  const shareValuePaise = totalShares > 0 ? Math.round(totalExpensePaise / totalShares) : 0;
  const shareValueRupees = shareValuePaise / 100;

  let allocatedSum = 0;
  const payables: CalculatedMemberPayable[] = members.map((m, idx) => {
    const s = Math.max(0, Number(m.shares) || 0);
    let amountPaise = 0;

    if (totalShares > 0) {
      if (idx === count - 1) {
        // Last member gets the exact difference to guarantee zero-drift
        amountPaise = Math.max(0, totalExpensePaise - allocatedSum);
      } else {
        amountPaise = Math.round((totalExpensePaise * s) / totalShares);
        allocatedSum += amountPaise;
      }
    }

    const contributionPct = totalExpensePaise > 0 ? Math.round((amountPaise / totalExpensePaise) * 100) : 0;

    return {
      key: m.key,
      userId: m.userId,
      contactId: m.contactId,
      name: m.name,
      avatar: m.avatar,
      amountPaise,
      amountRupees: amountPaise / 100,
      shares: s,
      contributionPct,
    };
  });

  return {
    payables,
    totalExpensePaise,
    totalExpenseRupees,
    totalShares,
    shareValuePaise,
    shareValueRupees,
    isValid,
    validationError,
  };
}

/**
 * 4. RECEIVER ASSIGNMENT VALIDATION & CALCULATION ENGINE
 * Checks whether an admin's receiver allocation from a debtor to a creditor is valid:
 * - Debtor has remaining unassigned liability.
 * - Creditor is eligible to receive and has remaining receivable.
 * - Assignment amount <= remaining unassigned liability.
 * - Assignment amount <= creditor's available receivable.
 */
export interface ReceiverAssignmentValidationResult {
  isValid: boolean;
  assignedAmountPaise: number;
  debtorRemainingLiabilityPaise: number;
  receiverRemainingReceivablePaise: number;
  error?: string;
}

export function validateReceiverAssignment(params: {
  debtorTotalLiabilityPaise: number;
  debtorExistingAssignedPaise: number;
  assignmentAmountPaise: number;
  receiverTotalReceivablePaise: number;
  receiverExistingAssignedPaise: number;
}): ReceiverAssignmentValidationResult {
  const {
    debtorTotalLiabilityPaise,
    debtorExistingAssignedPaise,
    assignmentAmountPaise,
    receiverTotalReceivablePaise,
    receiverExistingAssignedPaise,
  } = params;

  if (assignmentAmountPaise <= 0) {
    return {
      isValid: false,
      assignedAmountPaise: 0,
      debtorRemainingLiabilityPaise: debtorTotalLiabilityPaise - debtorExistingAssignedPaise,
      receiverRemainingReceivablePaise: receiverTotalReceivablePaise - receiverExistingAssignedPaise,
      error: "Assignment amount must be greater than ₹0.00.",
    };
  }

  const debtorRemaining = debtorTotalLiabilityPaise - debtorExistingAssignedPaise;
  if (assignmentAmountPaise > debtorRemaining) {
    return {
      isValid: false,
      assignedAmountPaise: assignmentAmountPaise,
      debtorRemainingLiabilityPaise: debtorRemaining,
      receiverRemainingReceivablePaise: receiverTotalReceivablePaise - receiverExistingAssignedPaise,
      error: `Assignment amount (₹${(assignmentAmountPaise / 100).toFixed(2)}) exceeds debtor's remaining liability (₹${(debtorRemaining / 100).toFixed(2)}).`,
    };
  }

  const receiverRemaining = receiverTotalReceivablePaise - receiverExistingAssignedPaise;
  if (assignmentAmountPaise > receiverRemaining) {
    return {
      isValid: false,
      assignedAmountPaise: assignmentAmountPaise,
      debtorRemainingLiabilityPaise: debtorRemaining,
      receiverRemainingReceivablePaise: receiverRemaining,
      error: `Assignment amount (₹${(assignmentAmountPaise / 100).toFixed(2)}) exceeds receiver's available receivable (₹${(receiverRemaining / 100).toFixed(2)}).`,
    };
  }

  return {
    isValid: true,
    assignedAmountPaise: assignmentAmountPaise,
    debtorRemainingLiabilityPaise: debtorRemaining - assignmentAmountPaise,
    receiverRemainingReceivablePaise: receiverRemaining - assignmentAmountPaise,
  };
}

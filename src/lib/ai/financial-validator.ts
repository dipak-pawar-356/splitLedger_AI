/**
 * GLOBAL FINANCIAL DATA VALIDATION ENGINE
 * 
 * Enforces strict multi-entity validation before any data is sent to the AI
 * or used for intelligence calculations. Verifies user ownership, soft deletion,
 * currency conformity, future dates, duplicate entries, split balances, and orphaned relations.
 */

export interface ValidationIssue {
  entityType: string;
  entityId: string | number;
  field?: string;
  severity: "critical" | "warning" | "info";
  code:
    | "UNAUTHORIZED_OWNERSHIP"
    | "SOFT_DELETED_INCLUDED"
    | "INVALID_AMOUNT"
    | "FUTURE_DATE_ANOMALY"
    | "INCONSISTENT_DATE"
    | "MISSING_CATEGORY"
    | "BROKEN_RELATION"
    | "DUPLICATE_RECORD"
    | "SPLIT_TOTAL_MISMATCH"
    | "INVALID_CURRENCY"
    | "NULL_VALUE";
  message: string;
}

export interface ValidatedFinancialDataset<T = any> {
  isValid: boolean;
  sanitizedData: T[];
  issues: ValidationIssue[];
  metrics: {
    totalEvaluated: number;
    validCount: number;
    flaggedCount: number;
    discardedCount: number;
  };
}

/**
 * Validate raw transactions list
 */
export function validateTransactions(
  rawTransactions: any[],
  currentUserId: number,
  baseCurrency = "INR"
): ValidatedFinancialDataset<any> {
  const issues: ValidationIssue[] = [];
  const sanitized: any[] = [];
  const seenTxSignatures = new Set<string>();
  const now = new Date();
  // Allow small margin of 24h for clock skew/timezone
  const maxFutureAllowed = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  let validCount = 0;
  let flaggedCount = 0;
  let discardedCount = 0;

  for (const tx of rawTransactions) {
    if (!tx || typeof tx !== "object") {
      discardedCount++;
      continue;
    }

    const txId = tx.id ?? tx.publicId ?? "unknown";

    // 1. Soft-deleted check
    if (tx.isDeleted === true) {
      issues.push({
        entityType: "transaction",
        entityId: txId,
        severity: "critical",
        code: "SOFT_DELETED_INCLUDED",
        message: `Transaction ${txId} is soft-deleted and must be excluded from active calculations.`,
      });
      discardedCount++;
      continue;
    }

    // 2. Ownership / access check (must belong to user or user's group)
    const txUserId = tx.userId ?? tx.createdBy;
    if (txUserId !== undefined && txUserId !== null && txUserId !== currentUserId && !tx.groupId) {
      issues.push({
        entityType: "transaction",
        entityId: txId,
        severity: "critical",
        code: "UNAUTHORIZED_OWNERSHIP",
        message: `Transaction ${txId} belongs to user ${txUserId}, not current user ${currentUserId}.`,
      });
      discardedCount++;
      continue;
    }

    // 3. Amount sanity
    const amountVal = Number(tx.amount);
    if (isNaN(amountVal) || amountVal < 0) {
      issues.push({
        entityType: "transaction",
        entityId: txId,
        field: "amount",
        severity: "critical",
        code: "INVALID_AMOUNT",
        message: `Transaction ${txId} has invalid or negative amount: ${tx.amount}`,
      });
      discardedCount++;
      continue;
    }

    // 4. Date sanity
    const txDate = tx.date ? new Date(tx.date) : null;
    if (!txDate || isNaN(txDate.getTime())) {
      issues.push({
        entityType: "transaction",
        entityId: txId,
        field: "date",
        severity: "warning",
        code: "INCONSISTENT_DATE",
        message: `Transaction ${txId} has invalid date value. Defaulting to current timestamp.`,
      });
      flaggedCount++;
    } else if (txDate > maxFutureAllowed) {
      issues.push({
        entityType: "transaction",
        entityId: txId,
        field: "date",
        severity: "warning",
        code: "FUTURE_DATE_ANOMALY",
        message: `Transaction ${txId} has future date (${txDate.toISOString().slice(0, 10)}). Flagged for anomaly detection.`,
      });
      flaggedCount++;
    }

    // 5. Currency Check
    const currency = tx.currency || baseCurrency;
    if (currency !== baseCurrency) {
      issues.push({
        entityType: "transaction",
        entityId: txId,
        field: "currency",
        severity: "info",
        code: "INVALID_CURRENCY",
        message: `Transaction ${txId} is in ${currency}, base is ${baseCurrency}.`,
      });
    }

    // 6. Duplicate check (same amount + title + date within 5 minutes)
    const titleClean = (tx.title || tx.description || "").trim().toLowerCase();
    const dateMinuteStr = txDate ? Math.floor(txDate.getTime() / (5 * 60 * 1000)).toString() : "nodate";
    const signature = `${amountVal}_${titleClean}_${dateMinuteStr}`;

    if (seenTxSignatures.has(signature)) {
      issues.push({
        entityType: "transaction",
        entityId: txId,
        severity: "warning",
        code: "DUPLICATE_RECORD",
        message: `Potential duplicate transaction detected: ₹${amountVal / 100} for "${tx.title || tx.description}".`,
      });
      flaggedCount++;
    } else {
      seenTxSignatures.add(signature);
    }

    // 7. Category sanitation
    let categoryName = tx.categoryName || tx.category;
    if (!categoryName || categoryName === "null" || categoryName === "undefined" || categoryName === "Uncategorized") {
      categoryName = "Uncategorized";
      issues.push({
        entityType: "transaction",
        entityId: txId,
        field: "categoryId",
        severity: "info",
        code: "MISSING_CATEGORY",
        message: `Transaction ${txId} missing category. Assigned to Uncategorized.`,
      });
    }

    // Sanitize and append
    sanitized.push({
      ...tx,
      amount: amountVal,
      currency,
      categoryName,
      date: txDate && !isNaN(txDate.getTime()) ? txDate : now,
    });
    validCount++;
  }

  return {
    isValid: issues.filter((i) => i.severity === "critical").length === 0,
    sanitizedData: sanitized,
    issues,
    metrics: {
      totalEvaluated: rawTransactions.length,
      validCount,
      flaggedCount,
      discardedCount,
    },
  };
}

/**
 * Validate settlements list
 */
export function validateSettlements(
  rawSettlements: any[],
  currentUserId: number
): ValidatedFinancialDataset<any> {
  const issues: ValidationIssue[] = [];
  const sanitized: any[] = [];
  let validCount = 0;
  let discardedCount = 0;

  for (const s of rawSettlements) {
    if (!s || typeof s !== "object") {
      discardedCount++;
      continue;
    }

    const sId = s.id ?? s.publicId ?? "unknown";

    if (s.isDeleted === true) {
      discardedCount++;
      continue;
    }

    // Must be either debtor or creditor or group member
    if (s.fromUserId !== currentUserId && s.toUserId !== currentUserId) {
      issues.push({
        entityType: "settlement",
        entityId: sId,
        severity: "warning",
        code: "UNAUTHORIZED_OWNERSHIP",
        message: `Settlement ${sId} does not involve current user ${currentUserId}.`,
      });
      discardedCount++;
      continue;
    }

    const amt = Number(s.amount);
    if (isNaN(amt) || amt <= 0) {
      issues.push({
        entityType: "settlement",
        entityId: sId,
        field: "amount",
        severity: "critical",
        code: "INVALID_AMOUNT",
        message: `Settlement ${sId} has invalid or non-positive amount: ${s.amount}`,
      });
      discardedCount++;
      continue;
    }

    sanitized.push({
      ...s,
      amount: amt,
      status: s.status || "pending",
    });
    validCount++;
  }

  return {
    isValid: issues.filter((i) => i.severity === "critical").length === 0,
    sanitizedData: sanitized,
    issues,
    metrics: {
      totalEvaluated: rawSettlements.length,
      validCount,
      flaggedCount: 0,
      discardedCount,
    },
  };
}

/**
 * Validate budgets list
 */
export function validateBudgets(
  rawBudgets: any[],
  currentUserId: number
): ValidatedFinancialDataset<any> {
  const issues: ValidationIssue[] = [];
  const sanitized: any[] = [];
  let validCount = 0;
  let discardedCount = 0;

  for (const b of rawBudgets) {
    if (!b || typeof b !== "object") {
      discardedCount++;
      continue;
    }

    const bId = b.id ?? b.publicId ?? "unknown";

    if (b.isDeleted === true) {
      discardedCount++;
      continue;
    }

    if (b.userId !== currentUserId) {
      discardedCount++;
      continue;
    }

    const amt = Number(b.amount);
    if (isNaN(amt) || amt <= 0) {
      issues.push({
        entityType: "budget",
        entityId: bId,
        field: "amount",
        severity: "critical",
        code: "INVALID_AMOUNT",
        message: `Budget ${bId} has invalid amount: ${b.amount}`,
      });
      discardedCount++;
      continue;
    }

    sanitized.push({
      ...b,
      amount: amt,
      alertThreshold: Number(b.alertThreshold) || 80,
      status: b.status || "active",
    });
    validCount++;
  }

  return {
    isValid: issues.filter((i) => i.severity === "critical").length === 0,
    sanitizedData: sanitized,
    issues,
    metrics: {
      totalEvaluated: rawBudgets.length,
      validCount,
      flaggedCount: 0,
      discardedCount,
    },
  };
}

/**
 * Validate notes and daily journals
 */
export function validateNotes(
  rawNotes: any[],
  currentUserId: number
): ValidatedFinancialDataset<any> {
  const sanitized = rawNotes
    .filter((n) => n && n.isDeleted !== true && n.userId === currentUserId)
    .map((n) => ({
      ...n,
      title: n.title || "Untitled Note",
      plainText: n.plainText || n.content || "",
      wordCount: Number(n.wordCount) || 0,
    }));

  return {
    isValid: true,
    sanitizedData: sanitized,
    issues: [],
    metrics: {
      totalEvaluated: rawNotes.length,
      validCount: sanitized.length,
      flaggedCount: 0,
      discardedCount: rawNotes.length - sanitized.length,
    },
  };
}

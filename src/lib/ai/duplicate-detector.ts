/**
 * Duplicate Expense & Anomaly Detection Engine
 */

export interface ExpenseItemForDuplicateCheck {
  id?: number;
  description: string;
  amount: number; // in rupees or paise (consistent units)
  date: Date | string;
  groupId?: number | null;
  payerId?: number | null;
}

export interface DuplicateDetectionResult {
  isPotentialDuplicate: boolean;
  similarityScore: number; // 0.0 to 1.0
  matchReason: string;
  conflictingExpense?: ExpenseItemForDuplicateCheck;
}

function calculateStringSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0.0;

  const words1 = new Set(s1.split(/\s+/));
  const words2 = new Set(s2.split(/\s+/));

  let intersection = 0;
  for (const w of words1) {
    if (words2.has(w)) intersection++;
  }

  const union = new Set([...words1, ...words2]).size;
  return union === 0 ? 0 : Number((intersection / union).toFixed(2));
}

/**
 * Scan existing expense history to detect duplicate submissions
 */
export function checkDuplicateExpense(
  candidate: ExpenseItemForDuplicateCheck,
  existingExpenses: ExpenseItemForDuplicateCheck[],
  timeWindowHours = 72
): DuplicateDetectionResult {
  const candidateDate = new Date(candidate.date).getTime();

  for (const existing of existingExpenses) {
    // Skip comparing with itself
    if (candidate.id && existing.id && candidate.id === existing.id) continue;

    // 1. Amount match check (exact or < 1% difference)
    const amountDiff = Math.abs(candidate.amount - existing.amount);
    const isSameAmount = amountDiff === 0 || (amountDiff / candidate.amount) < 0.01;

    if (!isSameAmount) continue;

    // 2. Time proximity check (within timeWindowHours)
    const existingDate = new Date(existing.date).getTime();
    const diffHours = Math.abs(candidateDate - existingDate) / (1000 * 60 * 60);

    if (diffHours > timeWindowHours) continue;

    // 3. Text & Group similarity check
    const textSimilarity = calculateStringSimilarity(candidate.description, existing.description);
    const sameGroup = candidate.groupId === existing.groupId;
    const samePayer = candidate.payerId === existing.payerId;

    let totalScore = 0.5; // Baseline for identical amount + close date
    if (textSimilarity > 0.6) totalScore += 0.3;
    if (sameGroup) totalScore += 0.1;
    if (samePayer) totalScore += 0.1;

    const finalScore = Number(Math.min(0.99, totalScore).toFixed(2));

    if (finalScore >= 0.7) {
      return {
        isPotentialDuplicate: true,
        similarityScore: finalScore,
        matchReason: `Similar amount (${candidate.amount}) recorded within ${Math.round(diffHours)}h with matching description "${existing.description}".`,
        conflictingExpense: existing,
      };
    }
  }

  return {
    isPotentialDuplicate: false,
    similarityScore: 0,
    matchReason: "No duplicate transactions detected.",
  };
}

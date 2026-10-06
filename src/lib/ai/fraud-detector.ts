/**
 * Corporate Fraud, Anomaly & Risk Detection Engine
 */

export interface FraudEvaluationResult {
  isSuspicious: boolean;
  riskScore: number; // 0 - 100
  alertLevel: "low" | "medium" | "high" | "critical";
  reasons: string[];
  suggestedAction: "allow" | "flag_for_review" | "block";
}

/**
 * Scan financial claim or transaction for anomalies and fraud indicators
 */
export function evaluateTransactionRisk(
  candidate: { amount: number; title: string; description?: string; category?: string },
  historicalAverageAmount: number = 2500,
  recentClaimsInLastHour: number = 0
): FraudEvaluationResult {
  const reasons: string[] = [];
  let riskScore = 10;

  // 1. Extreme Outlier Spike (> 5x historical average or > ₹50,000)
  if (candidate.amount > 50000) {
    riskScore += 45;
    reasons.push(`High monetary value (₹${candidate.amount.toLocaleString("en-IN")}) exceeds enterprise standard thresholds.`);
  } else if (candidate.amount > historicalAverageAmount * 4) {
    riskScore += 30;
    reasons.push(`Amount is ${Math.round(candidate.amount / historicalAverageAmount)}x higher than user's 30-day historical average.`);
  }

  // 2. High Velocity Anomaly (> 5 claims in 1 hour)
  if (recentClaimsInLastHour >= 5) {
    riskScore += 35;
    reasons.push(`Abnormal submission velocity (${recentClaimsInLastHour} transactions submitted within the last hour).`);
  }

  // 3. Suspicious Exact Round Number at High Amounts
  if (candidate.amount >= 20000 && candidate.amount % 5000 === 0) {
    riskScore += 15;
    reasons.push("Exact round figure submitted without invoice itemization.");
  }

  const finalRiskScore = Math.min(100, riskScore);
  let alertLevel: FraudEvaluationResult["alertLevel"] = "low";
  let suggestedAction: FraudEvaluationResult["suggestedAction"] = "allow";

  if (finalRiskScore >= 70) {
    alertLevel = "critical";
    suggestedAction = "flag_for_review";
  } else if (finalRiskScore >= 45) {
    alertLevel = "high";
    suggestedAction = "flag_for_review";
  } else if (finalRiskScore >= 25) {
    alertLevel = "medium";
    suggestedAction = "allow";
  }

  return {
    isSuspicious: finalRiskScore >= 45,
    riskScore: finalRiskScore,
    alertLevel,
    reasons,
    suggestedAction,
  };
}

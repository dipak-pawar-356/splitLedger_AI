/**
 * Privacy-Preserving AI Learning Engine
 * Stores user-specific categorization overrides and learns individual expense patterns.
 */

interface UserLearningRule {
  merchantKeyword: string;
  assignedCategory: string;
  userCorrectionCount: number;
  lastUpdated: string;
}

const userLearningStore = new Map<number, Map<string, UserLearningRule>>();

/**
 * Record a user's category correction
 */
export function recordCategoryCorrection(
  userId: number,
  merchantOrTitle: string,
  category: string
): void {
  const keyword = merchantOrTitle.toLowerCase().trim();
  if (!keyword) return;

  let userMap = userLearningStore.get(userId);
  if (!userMap) {
    userMap = new Map();
    userLearningStore.set(userId, userMap);
  }

  const existing = userMap.get(keyword);
  if (existing) {
    existing.assignedCategory = category;
    existing.userCorrectionCount++;
    existing.lastUpdated = new Date().toISOString();
  } else {
    userMap.set(keyword, {
      merchantKeyword: keyword,
      assignedCategory: category,
      userCorrectionCount: 1,
      lastUpdated: new Date().toISOString(),
    });
  }
}

/**
 * Check if the user has a custom learned preference for this merchant/title
 */
export function getLearnedCategory(
  userId: number,
  title: string
): { category?: string; confidence?: number; isLearned: boolean } {
  const userMap = userLearningStore.get(userId);
  if (!userMap) return { isLearned: false };

  const cleanTitle = title.toLowerCase().trim();

  for (const [kw, rule] of userMap.entries()) {
    if (cleanTitle.includes(kw)) {
      return {
        category: rule.assignedCategory,
        confidence: Math.min(0.99, 0.85 + rule.userCorrectionCount * 0.05),
        isLearned: true,
      };
    }
  }

  return { isLearned: false };
}

export function clearUserLearning(userId?: number): void {
  if (userId) {
    userLearningStore.delete(userId);
  } else {
    userLearningStore.clear();
  }
}

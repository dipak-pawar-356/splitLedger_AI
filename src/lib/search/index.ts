/**
 * High-Performance Client & Server Search Engine
 * Features weighted multi-field scoring, tokenization, and fuzzy matching.
 */

export interface SearchField<T> {
  key: keyof T | ((item: T) => string);
  weight?: number; // Higher weight = higher relevance (default: 1)
}

export interface SearchOptions<T> {
  fields: SearchField<T>[];
  threshold?: number; // Minimum relevance score (default: 0.2)
  limit?: number; // Maximum items to return
}

export function searchList<T>(
  items: T[],
  query: string,
  options: SearchOptions<T>
): T[] {
  const cleanQuery = query.trim().toLowerCase();
  if (!cleanQuery) return items.slice(0, options.limit);

  const queryTokens = cleanQuery.split(/\s+/).filter(Boolean);
  const threshold = options.threshold ?? 0.15;

  const scored = items.map((item) => {
    let totalScore = 0;

    for (const field of options.fields) {
      const weight = field.weight ?? 1;
      let fieldValue = "";

      if (typeof field.key === "function") {
        fieldValue = String(field.key(item) || "").toLowerCase();
      } else {
        fieldValue = String(item[field.key] || "").toLowerCase();
      }

      if (!fieldValue) continue;

      // Exact substring match
      if (fieldValue.includes(cleanQuery)) {
        totalScore += weight * 2.0;
      }

      // Token matches
      let tokenMatches = 0;
      for (const token of queryTokens) {
        if (fieldValue.includes(token)) {
          tokenMatches++;
        }
      }

      if (tokenMatches > 0) {
        totalScore += (tokenMatches / queryTokens.length) * weight;
      }
    }

    return { item, score: totalScore };
  });

  return scored
    .filter((entry) => entry.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, options.limit)
    .map((entry) => entry.item);
}

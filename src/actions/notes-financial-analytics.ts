"use server";

import { db, withDbRetry } from "@/lib/db";
import { notes } from "@/lib/db/schema/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { appCache } from "@/lib/cache";
import {
  extractExpensesFromNote,
  aggregateFinancialNotes,
  FinancialNotesAnalysisResult,
  ExtractedNoteExpense,
} from "@/lib/notes/financial-note-analyzer";

/**
 * Get comprehensive financial analytics derived from all user notes & journals
 */
export async function getFinancialNotesAnalysisAction(): Promise<FinancialNotesAnalysisResult> {
  const user = await requireAuth();

  return await appCache.getOrSet(`notes:financial_analysis:${user.id}`, async () => {
    const userNotes = await withDbRetry(async () => {
      return await db
        .select({
          id: notes.id,
          title: notes.title,
          content: notes.content,
          plainText: notes.plainText,
          createdAt: notes.createdAt,
          updatedAt: notes.updatedAt,
        })
        .from(notes)
        .where(and(eq(notes.userId, user.id), eq(notes.isDeleted, false)))
        .orderBy(desc(notes.updatedAt));
    });

    const allExpenses: ExtractedNoteExpense[] = [];

    userNotes.forEach((n) => {
      const textToAnalyze = n.content || n.plainText || "";
      const extracted = extractExpensesFromNote(textToAnalyze, n.createdAt, n.id, n.title);
      allExpenses.push(...extracted);
    });

    return aggregateFinancialNotes(allExpenses);
  }, { ttlMs: 10000, tags: [`user:${user.id}`, "notes", "dashboard"] }); // 10 second cache or instant on invalidation
}

/**
 * Real-time analysis for a single note (used in Note Editor / Keep option)
 */
export async function analyzeSingleNoteContentAction(
  content: string,
  noteId?: number,
  noteTitle?: string
): Promise<{
  expenses: ExtractedNoteExpense[];
  totalAmount: number;
  count: number;
  categories: Array<{ name: string; amount: number; count: number }>;
}> {
  await requireAuth();

  const expenses = extractExpensesFromNote(content, new Date(), noteId, noteTitle);
  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

  const catMap = new Map<string, { amount: number; count: number }>();
  expenses.forEach((e) => {
    const c = catMap.get(e.category) || { amount: 0, count: 0 };
    c.amount += e.amount;
    c.count += 1;
    catMap.set(e.category, c);
  });

  const categories = Array.from(catMap.entries()).map(([name, data]) => ({
    name,
    amount: data.amount,
    count: data.count,
  }));

  return {
    expenses,
    totalAmount,
    count: expenses.length,
    categories,
  };
}

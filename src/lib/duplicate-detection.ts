import { db } from "@/lib/db";
import { contacts, transactions, groups } from "@/lib/db/schema/schema";
import { eq, and, or, like } from "drizzle-orm";

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  confidence: number;
  existingId?: number;
  message?: string;
}

// Check for duplicate contact by email or phone
export async function checkDuplicateContact(
  userId: number,
  name: string,
  email?: string,
  phone?: string
): Promise<DuplicateCheckResult> {
  try {
    const conditions = [];

    // Check by email
    if (email && email.trim()) {
      conditions.push(eq(contacts.email, email.trim()));
    }

    // Check by phone
    if (phone && phone.trim()) {
      conditions.push(eq(contacts.phone, phone.trim()));
    }

    // Check by name (fuzzy match)
    if (name && name.trim()) {
      conditions.push(like(contacts.name, `%${name.trim()}%`));
    }

    if (conditions.length === 0) {
      return { isDuplicate: false, confidence: 0 };
    }

    const existing = await db
      .select()
      .from(contacts)
      .where(and(eq(contacts.userId, userId), or(...conditions)))
      .limit(1);

    if (existing.length > 0) {
      const contact = existing[0];
      let confidence = 0.5;
      let message = "Possible duplicate contact found";

      // Exact match on email or phone = high confidence
      if (contact.email === email || contact.phone === phone) {
        confidence = 0.9;
        message = "Duplicate contact found with matching email or phone";
      }

      return {
        isDuplicate: true,
        confidence,
        existingId: contact.id,
        message,
      };
    }

    return { isDuplicate: false, confidence: 0 };
  } catch (error) {
    console.error("Error checking duplicate contact:", error);
    return { isDuplicate: false, confidence: 0 };
  }
}

// Check for duplicate transaction
export async function checkDuplicateTransaction(
  userId: number,
  amount: number,
  description: string,
  date?: Date,
  contactId?: number
): Promise<DuplicateCheckResult> {
  try {
    const conditions = [
      eq(transactions.userId, userId),
      eq(transactions.amount, amount),
    ];

    // Check within same day
    if (date) {
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      // TODO: Add date range check when Drizzle supports it properly
    }

    // Check by description similarity
    if (description) {
      conditions.push(like(transactions.description, `%${description.substring(0, 20)}%`));
    }

    // Check by contact
    if (contactId) {
      conditions.push(eq(transactions.contactId, contactId));
    }

    const existing = await db
      .select()
      .from(transactions)
      .where(and(...conditions))
      .limit(1);

    if (existing.length > 0) {
      const transaction = existing[0];
      let confidence = 0.5;
      let message = "Possible duplicate transaction found";

      // Exact match on amount and description = high confidence
      if (
        transaction.amount === amount &&
        transaction.description.toLowerCase() === description.toLowerCase()
      ) {
        confidence = 0.9;
        message = "Duplicate transaction found with matching amount and description";
      }

      return {
        isDuplicate: true,
        confidence,
        existingId: transaction.id,
        message,
      };
    }

    return { isDuplicate: false, confidence: 0 };
  } catch (error) {
    console.error("Error checking duplicate transaction:", error);
    return { isDuplicate: false, confidence: 0 };
  }
}

// Check for duplicate group
export async function checkDuplicateGroup(
  userId: number,
  name: string
): Promise<DuplicateCheckResult> {
  try {
    const existing = await db
      .select()
      .from(groups)
      .where(and(eq(groups.createdBy, userId), like(groups.name, `%${name}%`)))
      .limit(1);

    if (existing.length > 0) {
      const group = existing[0];
      let confidence = 0.5;
      let message = "Possible duplicate group found";

      // Exact match = high confidence
      if (group.name.toLowerCase() === name.toLowerCase()) {
        confidence = 0.9;
        message = "Duplicate group found with matching name";
      }

      return {
        isDuplicate: true,
        confidence,
        existingId: group.id,
        message,
      };
    }

    return { isDuplicate: false, confidence: 0 };
  } catch (error) {
    console.error("Error checking duplicate group:", error);
    return { isDuplicate: false, confidence: 0 };
  }
}

// Calculate string similarity (Levenshtein distance based)
export function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();

  if (s1 === s2) return 1;

  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;

  if (longer.length === 0) return 1;

  const costs = [];
  for (let i = 0; i < longer.length + 1; i++) {
    let lastValue = i;
    for (let j = 0; j < shorter.length + 1; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (longer.charAt(i - 1) !== shorter.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[shorter.length] = lastValue;
  }

  return (longer.length - costs[shorter.length]) / longer.length;
}

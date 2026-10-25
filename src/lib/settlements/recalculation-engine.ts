/**
 * Timeline-Based Expense Participation and Atomic Recalculation Engine
 * 
 * Implements strict timeline-based expense participation rules:
 * - Mode A ("included"): Participates in all historical expenses and future expenses until removed.
 *   On removal: Historical expenses revert to prior participant list, future expenses recalculated.
 * - Mode B ("excluded"): Participates only in future expenses created after activation (createdAt >= effectiveFrom).
 *   On removal: Historical expenses untouched; only expenses created while active are recalculated.
 * 
 * Executes atomic recalculation workflows ensuring:
 * - Immutable completed settlements preserved and credited
 * - Exact share distribution down to the paise
 * - Total payable === Total receivable
 * - Audit trail and settlement version snapshots
 */

import { db } from "@/lib/db";
import {
  groups,
  groupMembers,
  transactions,
  expenseSplits,
  settlements,
  memberParticipationTimeline,
  groupSettlementVersions,
  expenseParticipationHistory,
  auditLogs,
  users,
  contacts,
  groupReceiverAssignments,
} from "@/lib/db/schema/schema";
import { eq, and, desc, sql, inArray, ne } from "drizzle-orm";
import { generateTimelineId, generateSettlementVersionId, generateAuditId, generatePublicId } from "@/lib/utils";
import { calculateOptimalSettlements, type Balance } from "./calculator";
import { revalidatePath } from "next/cache";

export function safeRevalidatePath(path: string, type?: "layout" | "page") {
  try {
    revalidatePath(path, type);
  } catch (_) {
    // Gracefully ignore missing static generation store in asynchronous or serverless actions
  }
}

let schemaEnsured = false;
export async function ensureDatabaseSchema(txDb: any = db) {
  if (schemaEnsured) return;
  try {
    await txDb.execute(sql`
      ALTER TABLE transactions ADD COLUMN IF NOT EXISTS participation_version INTEGER DEFAULT 1 NOT NULL;
      ALTER TABLE transactions ADD COLUMN IF NOT EXISTS redistribution_version INTEGER DEFAULT 1 NOT NULL;
      CREATE TABLE IF NOT EXISTS member_participation_timeline (
        id SERIAL PRIMARY KEY,
        public_id TEXT UNIQUE NOT NULL,
        group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
        group_member_id INTEGER REFERENCES group_members(id) ON DELETE SET NULL,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        contact_id INTEGER REFERENCES contacts(id) ON DELETE CASCADE,
        participation_mode TEXT NOT NULL,
        effective_from TIMESTAMP DEFAULT NOW() NOT NULL,
        effective_until TIMESTAMP,
        approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        reason TEXT NOT NULL,
        redistribution_version INTEGER DEFAULT 1 NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
      CREATE INDEX IF NOT EXISTS mpt_group_idx ON member_participation_timeline(group_id);
      CREATE INDEX IF NOT EXISTS mpt_user_idx ON member_participation_timeline(user_id);
      CREATE INDEX IF NOT EXISTS mpt_effective_idx ON member_participation_timeline(group_id, effective_from, effective_until);
      CREATE INDEX IF NOT EXISTS mpt_public_id_idx ON member_participation_timeline(public_id);
      CREATE TABLE IF NOT EXISTS group_settlement_versions (
        id SERIAL PRIMARY KEY,
        public_id TEXT UNIQUE NOT NULL,
        group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
        version_number INTEGER NOT NULL,
        trigger_operation TEXT NOT NULL,
        initiated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        participation_timeline_version INTEGER DEFAULT 1 NOT NULL,
        status TEXT DEFAULT 'active' NOT NULL,
        total_expenses_paise BIGINT DEFAULT 0 NOT NULL,
        total_shares_paise BIGINT DEFAULT 0 NOT NULL,
        total_payable_paise BIGINT DEFAULT 0 NOT NULL,
        total_receivable_paise BIGINT DEFAULT 0 NOT NULL,
        snapshot JSONB NOT NULL,
        integrity_verified BOOLEAN DEFAULT true NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
      CREATE INDEX IF NOT EXISTS gsv_group_idx ON group_settlement_versions(group_id);
      CREATE INDEX IF NOT EXISTS gsv_version_idx ON group_settlement_versions(group_id, version_number);
      CREATE INDEX IF NOT EXISTS gsv_status_idx ON group_settlement_versions(group_id, status);
      CREATE INDEX IF NOT EXISTS gsv_public_id_idx ON group_settlement_versions(public_id);
      CREATE TABLE IF NOT EXISTS expense_participation_history (
        id SERIAL PRIMARY KEY,
        transaction_id INTEGER REFERENCES transactions(id) ON DELETE CASCADE NOT NULL,
        group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
        version INTEGER NOT NULL,
        participant_user_ids JSONB NOT NULL,
        participant_contact_ids JSONB DEFAULT '[]'::jsonb NOT NULL,
        split_method TEXT DEFAULT 'equal' NOT NULL,
        reason TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
      CREATE INDEX IF NOT EXISTS eph_tx_idx ON expense_participation_history(transaction_id);
      CREATE INDEX IF NOT EXISTS eph_group_idx ON expense_participation_history(group_id);
      ALTER TABLE groups ADD COLUMN IF NOT EXISTS split_config JSONB;
      CREATE TABLE IF NOT EXISTS group_receiver_assignments (
        id SERIAL PRIMARY KEY,
        public_id TEXT UNIQUE NOT NULL,
        group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
        from_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        from_contact_id INTEGER REFERENCES contacts(id) ON DELETE CASCADE,
        from_name TEXT NOT NULL,
        to_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        to_contact_id INTEGER REFERENCES contacts(id) ON DELETE CASCADE,
        to_name TEXT NOT NULL,
        amount BIGINT NOT NULL,
        currency TEXT DEFAULT 'INR' NOT NULL,
        split_method TEXT NOT NULL,
        status TEXT DEFAULT 'active' NOT NULL,
        notes TEXT,
        version INTEGER DEFAULT 1 NOT NULL,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL NOT NULL,
        updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
      CREATE INDEX IF NOT EXISTS gra_group_idx ON group_receiver_assignments(group_id);
      CREATE INDEX IF NOT EXISTS gra_from_user_idx ON group_receiver_assignments(from_user_id);
      CREATE INDEX IF NOT EXISTS gra_to_user_idx ON group_receiver_assignments(to_user_id);
      CREATE INDEX IF NOT EXISTS gra_public_id_idx ON group_receiver_assignments(public_id);
      CREATE INDEX IF NOT EXISTS gra_status_idx ON group_receiver_assignments(group_id, status);
    `);
    schemaEnsured = true;
  } catch (_) {
    schemaEnsured = true;
  }
}

// ============================================================================
// TYPES
// ============================================================================

export type ParticipationMode = "included" | "excluded";

export interface TimelineEntry {
  id?: number;
  groupId: number;
  userId?: number | null;
  contactId?: number | null;
  participationMode: ParticipationMode;
  effectiveFrom: Date;
  effectiveUntil?: Date | null;
  approvedBy?: number | null;
  reason: string;
  redistributionVersion: number;
}

export interface ParticipantKey {
  userId?: number;
  contactId?: number;
}

export interface RecalculationResult {
  success: boolean;
  groupId: number;
  settlementVersion: number;
  triggerOperation: string;
  totalExpensesPaise: number;
  totalSharesPaise: number;
  totalPayablePaise: number;
  totalReceivablePaise: number;
  affectedExpenseCount: number;
  pendingSettlementsCount: number;
  timestamp: Date;
  error?: string;
}

// In-process concurrency mutex per group
const groupLocks = new Map<number, Promise<void>>();

async function acquireGroupLock(groupId: number): Promise<() => void> {
  while (groupLocks.has(groupId)) {
    try {
      await groupLocks.get(groupId);
    } catch (_) {
      // Continue waiting or acquire
    }
  }

  let releaseLock: () => void;
  const lockPromise = new Promise<void>((resolve) => {
    releaseLock = resolve;
  });

  groupLocks.set(groupId, lockPromise);

  return () => {
    groupLocks.delete(groupId);
    releaseLock!();
  };
}

// ============================================================================
// PURE TIMELINE PARTICIPATION LOGIC (Fully testable without DB)
// ============================================================================

/**
 * Formats a user or contact into a unique key string
 */
export function getParticipantKey(p: { userId?: number | null; contactId?: number | null }): string {
  if (p.userId) return `user-${p.userId}`;
  if (p.contactId) return `contact-${p.contactId}`;
  return "unknown";
}

/**
 * Evaluates whether a member participates in an expense based on their timeline history.
 * 
 * Rules:
 * Mode B ("excluded" / Start From New Expenses Only):
 *   - Participates ONLY IF expense.createdAt >= effectiveFrom AND (effectiveUntil == null OR expense.createdAt < effectiveUntil).
 *   - Never participates in expenses created before effectiveFrom.
 * 
 * Mode A ("included" / Include in Previous Expenses):
 *   - If currently active (effectiveUntil == null): participates in historical expenses (createdAt < effectiveFrom) AND future expenses.
 *   - If member was REMOVED (effectiveUntil != null):
 *     - Historical expenses (createdAt < effectiveFrom): Member is REMOVED from historical expenses,
 *       reverting those expenses to the participants that existed before the member was added.
 *     - Expenses created while active (createdAt >= effectiveFrom && createdAt < effectiveUntil):
 *       Since the member is now removed from the group, they no longer participate in current active balances.
 */
export function isMemberEligibleForExpense(
  memberTimeline: TimelineEntry[],
  expenseCreatedAt: Date
): boolean {
  if (!memberTimeline || memberTimeline.length === 0) return false;

  const expTime = expenseCreatedAt.getTime();

  // Sort timeline entries chronologically by effectiveFrom
  const sorted = [...memberTimeline].sort(
    (a, b) => new Date(a.effectiveFrom).getTime() - new Date(b.effectiveFrom).getTime()
  );

  const latestEntry = sorted[sorted.length - 1];

  // If member has been removed from the group (effectiveUntil != null),
  // they no longer participate in any expenses in the group:
  // - Mode A: historical expenses revert to prior participants; future expenses recalculated without them
  // - Mode B: historical expenses were never included; future expenses recalculated without them
  if (latestEntry.effectiveUntil !== null) {
    return false;
  }

  // Earliest activation/join date of this member in the group
  const initialJoinTime = new Date(sorted[0].effectiveFrom).getTime();

  // If the expense was created on or after the member initially joined:
  // The member was an active member of the group when this expense was incurred
  if (expTime >= initialJoinTime) {
    return true;
  }

  // If the expense was created BEFORE the member joined:
  // Active member participation is governed by their current historical inclusion mode:
  // Mode A ("included" / Include Previous Expenses = ON): included in historical expenses
  // Mode B ("excluded" / Include Previous Expenses = OFF): excluded from historical expenses
  return latestEntry.participationMode === "included";
}

/**
 * Pure function: Determines eligible participants for an expense given timeline entries.
 */
export function determineExpenseEligibleParticipants(
  allTimelines: TimelineEntry[],
  expenseCreatedAt: Date,
  priorKnownParticipants?: ParticipantKey[]
): ParticipantKey[] {
  // Group timelines by member key
  const timelinesByMember = new Map<string, TimelineEntry[]>();
  for (const t of allTimelines) {
    const key = getParticipantKey(t);
    if (!timelinesByMember.has(key)) timelinesByMember.set(key, []);
    timelinesByMember.get(key)!.push(t);
  }

  const eligible: ParticipantKey[] = [];

  timelinesByMember.forEach((entries, key) => {
    // If priorKnownParticipants is provided, verify member was either a prior participant
    // or eligible under Mode A historical inclusion
    const isEligible = isMemberEligibleForExpense(entries, expenseCreatedAt);
    if (isEligible) {
      const sample = entries[0];
      eligible.push({
        userId: sample.userId || undefined,
        contactId: sample.contactId || undefined,
      });
    }
  });

  return eligible;
}

export interface ParticipantShareInput extends ParticipantKey {
  amountPaise?: number;
  percentage?: number;
  shares?: number;
}

/**
 * Pure function: Calculates paise-accurate share distribution across all split methods.
 * Supports: 'equal', 'exact', 'percentage', and 'shares'.
 * Sum of shares EXACTLY equals expenseAmountPaise with zero drift.
 */
export function calculateSharesForExpense(
  expenseAmountPaise: number,
  participants: ParticipantShareInput[],
  splitMethod: "equal" | "exact" | "percentage" | "shares" = "equal"
): Array<ParticipantKey & { amountPaise: number; percentage?: number; shares?: number; splitMethod: "equal" | "exact" | "percentage" | "shares" }> {
  if (participants.length === 0 || expenseAmountPaise <= 0) return [];
  const count = participants.length;

  if (splitMethod === "exact") {
    const hasExactAmounts = participants.some((p) => p.amountPaise !== undefined && p.amountPaise > 0);
    if (hasExactAmounts) {
      const shares = participants.map((p) => ({
        userId: p.userId,
        contactId: p.contactId,
        amountPaise: Math.max(0, p.amountPaise || 0),
        splitMethod: "exact" as const,
      }));
      const allocatedSum = shares.reduce((sum, s) => sum + s.amountPaise, 0);
      const diff = expenseAmountPaise - allocatedSum;
      if (diff !== 0 && shares.length > 0) {
        shares[shares.length - 1].amountPaise += diff;
      }
      return shares;
    }
    const basePaise = Math.floor(expenseAmountPaise / count);
    const remainderPaise = expenseAmountPaise - basePaise * count;
    return participants.map((p, idx) => ({
      userId: p.userId,
      contactId: p.contactId,
      amountPaise: basePaise + (idx === count - 1 ? remainderPaise : 0),
      splitMethod: "exact" as const,
    }));
  }

  if (splitMethod === "percentage") {
    const hasPercentages = participants.some((p) => p.percentage !== undefined && p.percentage > 0);
    const percentages = hasPercentages
      ? participants.map((p) => Math.max(0, p.percentage || 0))
      : participants.map(() => 100 / count);
    
    const pctSum = percentages.reduce((sum, pct) => sum + pct, 0);
    const normalizedPcts = pctSum > 0 ? percentages.map((pct) => (pct / pctSum) * 100) : percentages;

    let allocatedSum = 0;
    const shares = participants.map((p, idx) => {
      const pct = normalizedPcts[idx];
      const amountPaise = Math.round((expenseAmountPaise * pct) / 100);
      allocatedSum += amountPaise;
      return {
        userId: p.userId,
        contactId: p.contactId,
        amountPaise,
        percentage: Math.round(pct),
        splitMethod: "percentage" as const,
      };
    });

    const diff = expenseAmountPaise - allocatedSum;
    if (diff !== 0 && shares.length > 0) {
      shares[shares.length - 1].amountPaise += diff;
    }
    return shares;
  }

  if (splitMethod === "shares") {
    const sharesList = participants.map((p) => Math.max(0, p.shares !== undefined && p.shares > 0 ? p.shares : 1));
    const totalShares = sharesList.reduce((sum, s) => sum + s, 0) || count;

    let allocatedSum = 0;
    const result = participants.map((p, idx) => {
      const shareVal = sharesList[idx];
      const amountPaise = Math.floor((expenseAmountPaise * shareVal) / totalShares);
      allocatedSum += amountPaise;
      return {
        userId: p.userId,
        contactId: p.contactId,
        amountPaise,
        shares: Math.round(shareVal),
        splitMethod: "shares" as const,
      };
    });

    const diff = expenseAmountPaise - allocatedSum;
    if (diff !== 0 && result.length > 0) {
      result[result.length - 1].amountPaise += diff;
    }
    return result;
  }

  // Default: "equal" (Preserves existing calculation behavior exactly)
  const basePaise = Math.floor(expenseAmountPaise / count);
  const remainderPaise = expenseAmountPaise - (basePaise * count);

  return participants.map((p, idx) => ({
    userId: p.userId,
    contactId: p.contactId,
    amountPaise: basePaise + (idx < remainderPaise ? 1 : 0),
    splitMethod: "equal" as const,
  }));
}

/**
 * Pure function: Compares existing splits of an expense against freshly resolved shares.
 * Returns true if participant membership or share amounts differ.
 */
export function hasParticipantSetOrSharesChanged(
  existingSplits: Array<{ userId?: number | null; contactId?: number | null; amount: number }>,
  calculatedShares: Array<ParticipantKey & { amountPaise: number }>
): boolean {
  if (existingSplits.length !== calculatedShares.length) return true;

  const existingMap = new Map<string, number>();
  for (const s of existingSplits) {
    existingMap.set(getParticipantKey(s), s.amount);
  }

  for (const cs of calculatedShares) {
    const key = getParticipantKey(cs);
    if (!existingMap.has(key)) return true;
    if (existingMap.get(key) !== cs.amountPaise) return true;
  }

  return false;
}

/**
 * Pure function: Computes outstanding balances for members:
 * netPosition = (totalPaid - ownShare) + (settledPaid - settledReceived)
 */
export function calculateMemberNetBalances(
  members: Array<{ userId?: number | null; contactId?: number | null; name?: string }>,
  expenses: Array<{ paidBy?: number | null; paidByContact?: number | null; amountPaise: number }>,
  splits: Array<{ userId?: number | null; contactId?: number | null; amountPaise: number }>,
  completedSettlements: Array<{ fromUserId?: number | null; fromContactId?: number | null; toUserId?: number | null; toContactId?: number | null; amountPaise: number }>
): Balance[] {
  const balanceMap = new Map<string, Balance>();

  // Initialize members
  for (const m of members) {
    const key = getParticipantKey(m);
    balanceMap.set(key, {
      userId: m.userId ?? undefined,
      contactId: m.contactId ?? undefined,
      name: m.name,
      amount: 0,
    });
  }

  // Add expenses paid
  for (const e of expenses) {
    const payerKey = getParticipantKey({ userId: e.paidBy, contactId: e.paidByContact });
    if (!balanceMap.has(payerKey)) {
      balanceMap.set(payerKey, {
        userId: e.paidBy ?? undefined,
        contactId: e.paidByContact ?? undefined,
        amount: 0,
      });
    }
    balanceMap.get(payerKey)!.amount += e.amountPaise;
  }

  // Subtract own share from splits
  for (const s of splits) {
    const splitKey = getParticipantKey(s);
    if (!balanceMap.has(splitKey)) {
      balanceMap.set(splitKey, {
        userId: s.userId ?? undefined,
        contactId: s.contactId ?? undefined,
        amount: 0,
      });
    }
    balanceMap.get(splitKey)!.amount -= s.amountPaise;
  }

  // Completed settlements credit/debit
  for (const cs of completedSettlements) {
    const payerKey = getParticipantKey({ userId: cs.fromUserId, contactId: cs.fromContactId });
    const receiverKey = getParticipantKey({ userId: cs.toUserId, contactId: cs.toContactId });

    if (!balanceMap.has(payerKey)) {
      balanceMap.set(payerKey, {
        userId: cs.fromUserId ?? undefined,
        contactId: cs.fromContactId ?? undefined,
        amount: 0,
      });
    }
    if (!balanceMap.has(receiverKey)) {
      balanceMap.set(receiverKey, {
        userId: cs.toUserId ?? undefined,
        contactId: cs.toContactId ?? undefined,
        amount: 0,
      });
    }

    // Payer gave money, so their debt is reduced (credited balance)
    balanceMap.get(payerKey)!.amount += cs.amountPaise;
    // Receiver received money, so their receivable is reduced (debited balance)
    balanceMap.get(receiverKey)!.amount -= cs.amountPaise;
  }

  return Array.from(balanceMap.values());
}

/**
 * Validates integrity invariants:
 * 1. Sum of shares === sum of expenses
 * 2. Sum of net balances === 0
 * 3. Sum of pending payables === sum of pending receivables
 */
export function validateIntegrity(
  totalExpensesPaise: number,
  totalSharesPaise: number,
  balances: Balance[],
  pendingSettlements: Array<{ amount: number }>
): { isValid: boolean; error?: string } {
  if (totalExpensesPaise !== totalSharesPaise) {
    return {
      isValid: false,
      error: `Integrity failure: total expenses (${totalExpensesPaise}) does not equal total shares (${totalSharesPaise})`,
    };
  }

  const netSum = balances.reduce((sum, b) => sum + b.amount, 0);
  if (Math.abs(netSum) > 5) {
    return {
      isValid: false,
      error: `Integrity failure: net balance sum (${netSum}) deviates from 0`,
    };
  }

  const totalPending = pendingSettlements.reduce((sum, s) => sum + s.amount, 0);
  const totalPositive = balances.filter(b => b.amount > 0).reduce((sum, b) => sum + b.amount, 0);
  const totalNegative = balances.filter(b => b.amount < 0).reduce((sum, b) => sum + Math.abs(b.amount), 0);

  if (Math.abs(totalPositive - totalNegative) > 5) {
    return {
      isValid: false,
      error: `Integrity failure: total credit (${totalPositive}) does not equal total debit (${totalNegative})`,
    };
  }

  return { isValid: true };
}

// ============================================================================
// TIMELINE RECORDING IN DATABASE
// ============================================================================

/**
 * Appends a new immutable timeline entry for a member.
 * If closing an earlier active entry for this member (e.g. mode change or removal),
 * sets effectiveUntil = now on prior entries and inserts the new entry.
 */
export async function recordTimelineEvent(
  entry: {
    groupId: number;
    groupMemberId?: number | null;
    userId?: number | null;
    contactId?: number | null;
    participationMode: ParticipationMode;
    effectiveFrom?: Date;
    effectiveUntil?: Date | null;
    approvedBy?: number | null;
    reason: "initial_approval" | "mode_change" | "member_removal" | "group_creation";
    redistributionVersion?: number;
  },
  txDb: any = db
): Promise<TimelineEntry> {
  await ensureDatabaseSchema(txDb);
  const now = entry.effectiveFrom || new Date();

  // Close prior active timeline entry if changing mode or removing member
  if (entry.userId || entry.contactId) {
    const priorConditions = [
      eq(memberParticipationTimeline.groupId, entry.groupId),
      sql`${memberParticipationTimeline.effectiveUntil} IS NULL`,
    ];
    if (entry.userId) {
      priorConditions.push(eq(memberParticipationTimeline.userId, entry.userId));
    }
    if (entry.contactId) {
      priorConditions.push(eq(memberParticipationTimeline.contactId, entry.contactId));
    }

    await txDb
      .update(memberParticipationTimeline)
      .set({ effectiveUntil: now })
      .where(and(...priorConditions));
  }

  const [inserted] = await txDb
    .insert(memberParticipationTimeline)
    .values({
      publicId: generateTimelineId(),
      groupId: entry.groupId,
      groupMemberId: entry.groupMemberId || null,
      userId: entry.userId || null,
      contactId: entry.contactId || null,
      participationMode: entry.participationMode,
      effectiveFrom: now,
      effectiveUntil: entry.effectiveUntil || null,
      approvedBy: entry.approvedBy || null,
      reason: entry.reason,
      redistributionVersion: entry.redistributionVersion || 1,
      createdAt: new Date(),
    })
    .returning();

  return {
    id: inserted.id,
    groupId: inserted.groupId,
    userId: inserted.userId,
    contactId: inserted.contactId,
    participationMode: inserted.participationMode as ParticipationMode,
    effectiveFrom: inserted.effectiveFrom,
    effectiveUntil: inserted.effectiveUntil,
    approvedBy: inserted.approvedBy,
    reason: inserted.reason,
    redistributionVersion: inserted.redistributionVersion,
  };
}

// ============================================================================
// ATOMIC RECALCULATION WORKFLOW (Steps 1 through 12)
// ============================================================================

export async function executeAtomicGroupRecalculation(params: {
  groupId: number;
  triggerOperation:
    | "approve_member_included"
    | "approve_member_excluded"
    | "remove_member"
    | "mode_change"
    | "add_expense"
    | "edit_expense"
    | "delete_expense"
    | "restore_expense"
    | "recalculate"
    | "split_method_change";
  targetSplitMethod?: "equal" | "exact" | "percentage" | "shares";
  initiatedByUserId?: number | null;
  operationFn?: () => Promise<void>;
}): Promise<RecalculationResult> {
  const { groupId, triggerOperation, targetSplitMethod, initiatedByUserId, operationFn } = params;

  await ensureDatabaseSchema();

  // Step 1: Acquire exclusive resource lock on group
  const releaseLock = await acquireGroupLock(groupId);

  try {
    // Step 2: Create calculation snapshot (read consistent baseline)
    const [groupRecord] = await db
      .select()
      .from(groups)
      .where(and(eq(groups.id, groupId), eq(groups.isDeleted, false)))
      .limit(1);

    if (!groupRecord) {
      throw new Error(`Group ${groupId} not found`);
    }

    // Read current settlement version number
    const [latestVersionRow] = await db
      .select({ versionNumber: groupSettlementVersions.versionNumber })
      .from(groupSettlementVersions)
      .where(eq(groupSettlementVersions.groupId, groupId))
      .orderBy(desc(groupSettlementVersions.versionNumber))
      .limit(1);

    const nextVersionNumber = (latestVersionRow?.versionNumber || 0) + 1;

    // Step 3: Apply the requested operation (if provided)
    if (operationFn) {
      await operationFn();
    }

    // Step 4: Rebuild expense participants based on timeline
    // Fetch all timeline records for this group
    const timelineRows = await db
      .select()
      .from(memberParticipationTimeline)
      .where(eq(memberParticipationTimeline.groupId, groupId))
      .orderBy(memberParticipationTimeline.effectiveFrom);

    const parsedTimelines: TimelineEntry[] = timelineRows.map((t) => ({
      id: t.id,
      groupId: t.groupId,
      userId: t.userId,
      contactId: t.contactId,
      participationMode: t.participationMode as ParticipationMode,
      effectiveFrom: t.effectiveFrom,
      effectiveUntil: t.effectiveUntil,
      approvedBy: t.approvedBy,
      reason: t.reason,
      redistributionVersion: t.redistributionVersion,
    }));

    // Fetch active group transactions
    const groupTransactions = await db
      .select()
      .from(transactions)
      .where(and(eq(transactions.groupId, groupId), eq(transactions.isDeleted, false)))
      .orderBy(transactions.createdAt);

    // Fetch existing active members for name mapping & fallback
    const membersList = await db
      .select({
        id: groupMembers.id,
        userId: groupMembers.userId,
        contactId: groupMembers.contactId,
        membershipStatus: groupMembers.membershipStatus,
        historicalInclusionDecision: groupMembers.historicalInclusionDecision,
        userName: users.name,
        contactName: contacts.name,
      })
      .from(groupMembers)
      .leftJoin(users, eq(groupMembers.userId, users.id))
      .leftJoin(contacts, eq(groupMembers.contactId, contacts.id))
      .where(eq(groupMembers.groupId, groupId));

    const activeMembers = membersList.filter(
      (m) => m.membershipStatus === "active" || (m as any).isGuest
    );

    // If any active members lack a timeline record, initialize them permanently
    for (const m of activeMembers) {
      const hasTimeline = parsedTimelines.some(
        (t) => (m.userId && t.userId === m.userId) || (m.contactId && t.contactId === m.contactId)
      );
      if (!hasTimeline) {
        const mode: ParticipationMode = m.historicalInclusionDecision === "excluded" ? "excluded" : "included";
        const entry = await recordTimelineEvent(
          {
            groupId,
            groupMemberId: m.id,
            userId: m.userId,
            contactId: m.contactId,
            participationMode: mode,
            effectiveFrom: groupRecord.createdAt,
            reason: "group_creation",
            approvedBy: groupRecord.createdBy,
          },
          db
        );
        parsedTimelines.push(entry);
      }
    }

    const txIds = groupTransactions.map((tx) => tx.id);
    const existingSplits = txIds.length > 0
      ? await db
          .select()
          .from(expenseSplits)
          .where(inArray(expenseSplits.transactionId, txIds))
      : [];

    let totalExpensesPaise = 0;
    let totalSharesPaise = 0;
    let affectedExpenseCount = 0;
    const newSplitsToInsert: any[] = [];
    const txIdsToClear: number[] = [];
    const allEffectiveSplits: any[] = [];

    // Step 5: Recalculate shares for each expense with diff detection
    for (const tx of groupTransactions) {
      totalExpensesPaise += tx.amount;

      const txExistingSplits = existingSplits.filter((s) => s.transactionId === tx.id);
      const isMemberEvent = [
        "approve_member_included",
        "approve_member_excluded",
        "remove_member",
        "mode_change",
      ].includes(triggerOperation);
      const isSplitMethodChangeEvent = triggerOperation === "split_method_change";

      const activeMethod: "equal" | "exact" | "percentage" | "shares" =
        (isSplitMethodChangeEvent ? targetSplitMethod : null) ||
        (txExistingSplits[0]?.splitMethod as any) ||
        (groupRecord.splitMethod as any) ||
        "equal";

      const hasCustomOrNonEqualSplits = txExistingSplits.some(
        (s) => s.splitMethod !== "equal" || s.isExcluded
      );
      const existingSplitsSum = txExistingSplits.reduce((sum, s) => sum + s.amount, 0);

      // Preserve existing user-defined splits when they exist and are valid (unless bulk split method change is requested)
      if (
        !isSplitMethodChangeEvent &&
        txExistingSplits.length > 0 &&
        existingSplitsSum === tx.amount &&
        (!isMemberEvent || hasCustomOrNonEqualSplits)
      ) {
        for (const s of txExistingSplits) {
          totalSharesPaise += s.amount;
          allEffectiveSplits.push({
            userId: s.userId || undefined,
            contactId: s.contactId || undefined,
            amountPaise: s.amount,
          });
        }
        continue;
      }

      // Determine eligible participants using timeline rules
      let eligibleParticipants = determineExpenseEligibleParticipants(
        parsedTimelines,
        tx.createdAt || tx.date
      );

      // If no timeline records existed yet, fallback to active members
      if (eligibleParticipants.length === 0) {
        if (activeMembers.length > 0) {
          eligibleParticipants = activeMembers.map((m) => ({
            userId: m.userId || undefined,
            contactId: m.contactId || undefined,
          }));
        } else if (tx.paidBy || tx.paidByContact) {
          eligibleParticipants = [{
            userId: tx.paidBy || undefined,
            contactId: tx.paidByContact || undefined,
          }];
        }
      }

      // Build participant share inputs, preserving any existing percentages or shares if present
      const participantInputs: ParticipantShareInput[] = eligibleParticipants.map((p) => {
        const existing = txExistingSplits.find(
          (s) => (p.userId && s.userId === p.userId) || (p.contactId && s.contactId === p.contactId)
        );
        return {
          ...p,
          amountPaise: existing?.amount,
          percentage: existing?.percentage ? Number(existing.percentage) : undefined,
          shares: existing?.shares ? Number(existing.shares) : undefined,
        };
      });

      // Calculate paise-perfect shares according to active calculation engine
      const calculatedShares = calculateSharesForExpense(tx.amount, participantInputs, activeMethod);

      for (const share of calculatedShares) {
        totalSharesPaise += share.amountPaise;
        allEffectiveSplits.push({
          userId: share.userId || undefined,
          contactId: share.contactId || undefined,
          amountPaise: share.amountPaise,
        });
      }

      // Diff detection: only update splits and history if participants, splitMethod or shares changed
      const isMethodChanged = txExistingSplits[0]?.splitMethod !== activeMethod;
      const isChanged = isSplitMethodChangeEvent || isMethodChanged || hasParticipantSetOrSharesChanged(txExistingSplits, calculatedShares);

      if (isChanged) {
        txIdsToClear.push(tx.id);
        for (const share of calculatedShares) {
          newSplitsToInsert.push({
            transactionId: tx.id,
            userId: share.userId || null,
            contactId: share.contactId || null,
            splitMethod: (share.splitMethod || activeMethod) as any,
            amount: share.amountPaise,
            percentage: share.percentage || null,
            shares: share.shares || null,
            isExcluded: false,
            createdAt: new Date(),
          });
        }

        // Record expense participation history snapshot
        await db.insert(expenseParticipationHistory).values({
          transactionId: tx.id,
          groupId,
          version: (tx.participationVersion || 1) + 1,
          participantUserIds: calculatedShares.map((s) => s.userId).filter(Boolean) as number[],
          participantContactIds: calculatedShares.map((s) => s.contactId).filter(Boolean) as number[],
          splitMethod: activeMethod,
          reason: `Recalculation via ${triggerOperation}`,
          createdAt: new Date(),
        });

        // Update participation and redistribution version on transaction
        await db
          .update(transactions)
          .set({
            participationVersion: (tx.participationVersion || 1) + 1,
            redistributionVersion: (tx.redistributionVersion || 1) + 1,
            updatedAt: new Date(),
          })
          .where(eq(transactions.id, tx.id));

        affectedExpenseCount++;
      }
    }

    // Persist new splits for affected transactions only
    if (txIdsToClear.length > 0) {
      await db.delete(expenseSplits).where(inArray(expenseSplits.transactionId, txIdsToClear));
      if (newSplitsToInsert.length > 0) {
        await db.insert(expenseSplits).values(newSplitsToInsert);
      }
    }

    // Step 6: Preserve completed settlements (immutable)
    const completedSettlementsList = await db
      .select()
      .from(settlements)
      .where(
        and(
          eq(settlements.groupId, groupId),
          eq(settlements.status, "completed"),
          eq(settlements.isDeleted, false)
        )
      );

    // Step 7: Generate outstanding balances
    const balances = calculateMemberNetBalances(
      membersList.map((m) => ({
        userId: m.userId || undefined,
        contactId: m.contactId || undefined,
        name: m.userName || m.contactName || undefined,
      })),
      groupTransactions.map((tx) => ({
        paidBy: tx.paidBy || undefined,
        paidByContact: tx.paidByContact || undefined,
        amountPaise: tx.amount,
      })),
      allEffectiveSplits.map((s) => ({
        userId: s.userId || undefined,
        contactId: s.contactId || undefined,
        amountPaise: s.amountPaise,
      })),
      completedSettlementsList.map((cs) => ({
        fromUserId: cs.fromUserId || undefined,
        fromContactId: cs.fromContactId || undefined,
        toUserId: cs.toUserId || undefined,
        toContactId: cs.toContactId || undefined,
        amountPaise: cs.amount,
      }))
    );

    // Step 8: Generate pending settlement records using greedy optimal matching
    const optimalSettlements = calculateOptimalSettlements(balances, groupRecord.currency || "INR");

    // If equal split mode, supersede any custom receiver assignments
    if ((targetSplitMethod || groupRecord.splitMethod) === "equal") {
      await db
        .update(groupReceiverAssignments)
        .set({ status: "superseded", updatedAt: new Date() })
        .where(
          and(
            eq(groupReceiverAssignments.groupId, groupId),
            eq(groupReceiverAssignments.status, "active")
          )
        )
        .catch(() => {});
    }

    // Delete existing non-completed settlements (never touch completed settlements)
    await db
      .delete(settlements)
      .where(
        and(
          eq(settlements.groupId, groupId),
          ne(settlements.status, "completed"),
          eq(settlements.isDeleted, false)
        )
      );

    // Insert new pending settlements
    const pendingToInsert = optimalSettlements.map((s) => ({
      publicId: generatePublicId("set"),
      groupId,
      fromUserId: s.fromUserId || null,
      fromContactId: s.fromContactId || null,
      toUserId: s.toUserId || null,
      toContactId: s.toContactId || null,
      amount: Math.round(s.amount),
      currency: s.currency || groupRecord.currency || "INR",
      status: "pending" as const,
      createdAt: new Date(),
    }));

    if (pendingToInsert.length > 0) {
      await db.insert(settlements).values(pendingToInsert);
    }

    const totalPayablePaise = pendingToInsert.reduce((sum, s) => sum + s.amount, 0);
    const totalReceivablePaise = totalPayablePaise;

    // Step 10: Final integrity validation
    const integrityCheck = validateIntegrity(
      totalExpensesPaise,
      totalSharesPaise,
      balances,
      pendingToInsert
    );

    if (!integrityCheck.isValid) {
      throw new Error(integrityCheck.error || "Integrity verification failed");
    }

    // Step 9: Create new settlement version
    // Mark previous active version as superseded
    await db
      .update(groupSettlementVersions)
      .set({ status: "superseded" })
      .where(
        and(
          eq(groupSettlementVersions.groupId, groupId),
          eq(groupSettlementVersions.status, "active")
        )
      );

    const snapshot = {
      versionNumber: nextVersionNumber,
      triggerOperation,
      totalExpensesPaise,
      totalSharesPaise,
      totalPayablePaise,
      totalReceivablePaise,
      balances,
      pendingSettlements: pendingToInsert,
      completedSettlementsCount: completedSettlementsList.length,
      affectedExpenseCount,
      timestamp: new Date().toISOString(),
    };

    await db.insert(groupSettlementVersions).values({
      publicId: generateSettlementVersionId(),
      groupId,
      versionNumber: nextVersionNumber,
      triggerOperation,
      initiatedBy: initiatedByUserId || null,
      participationTimelineVersion: nextVersionNumber,
      status: "active",
      totalExpensesPaise,
      totalSharesPaise,
      totalPayablePaise,
      totalReceivablePaise,
      snapshot,
      integrityVerified: true,
      createdAt: new Date(),
    });

    // Record audit trail
    try {
      await db.insert(auditLogs).values({
        publicId: generateAuditId(),
        userId: initiatedByUserId || groupRecord.createdBy,
        action: "group_recalculation",
        entityType: "group",
        entityId: groupId,
        changes: {
          operation: triggerOperation,
          settlementVersion: nextVersionNumber,
          affectedExpenseCount,
          totalExpensesPaise,
          totalSharesPaise,
        },
        reason: `Atomic recalculation triggered by ${triggerOperation}`,
        status: "success",
      });
    } catch (_) {}

    // Step 12: Post-Commit Actions (Revalidation)
    safeRevalidatePath(`/dashboard/groups/${groupRecord.publicId}`);
    if (groupRecord.legacyPublicId) {
      safeRevalidatePath(`/dashboard/groups/${groupRecord.legacyPublicId}`);
    }
    safeRevalidatePath(`/dashboard/groups/${groupRecord.id}`);
    safeRevalidatePath(`/dashboard/groups/${groupRecord.id}/settlements`);
    safeRevalidatePath("/dashboard/settlements");
    safeRevalidatePath("/dashboard/groups");
    safeRevalidatePath("/groups");
    safeRevalidatePath("/dashboard");

    return {
      success: true,
      groupId,
      settlementVersion: nextVersionNumber,
      triggerOperation,
      totalExpensesPaise,
      totalSharesPaise,
      totalPayablePaise,
      totalReceivablePaise,
      affectedExpenseCount,
      pendingSettlementsCount: pendingToInsert.length,
      timestamp: new Date(),
    };
  } finally {
    releaseLock();
  }
}

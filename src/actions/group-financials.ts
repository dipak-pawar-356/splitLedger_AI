"use server";

import { db, withDbRetry } from "@/lib/db";
import { 
  groups, 
  groupMembers, 
  transactions, 
  settlements, 
  users, 
  contacts, 
  expenseSplits,
  categories,
  auditLogs,
  settlementVerifications,
  settlementHistory,
  settlementReminderSettings,
  settlementEmailLogs,
  adminActions,
  groupJoinRequests,
  groupReceiverAssignments
} from "@/lib/db/schema/schema";
import { eq, and, desc, sql, or, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { requireAuth } from "@/lib/auth";
import { ValidationError, DatabaseError, AuthorizationError } from "@/lib/errors";
import { calculateGroupSettlements, calculateOptimalSettlements, type Expense, type Balance } from "@/lib/settlements/calculator";
import { isDbIntegerId, generatePublicId } from "@/lib/utils";
import {
  calculateExactAmountGroupPayables,
  calculatePercentageGroupPayables,
  calculateSharesGroupPayables,
  type SplitMemberInput,
} from "@/lib/settlements/split-calculator";

export interface MemberFinancialDetail {
  id: number;
  userId?: number | null;
  contactId?: number | null;
  name: string;
  avatar?: string | null;
  email?: string | null;
  phone?: string | null;
  role: "owner" | "admin" | "member";
  isGuest: boolean;
  isRegistered: boolean;
  expenseCount: number;
  totalPaid: number; // in rupees
  ownShare: number; // in rupees
  netPosition: number; // in rupees (positive = will receive, negative = need to pay)
  extraPaid: number; // in rupees (max(0, netPosition))
  needToPay: number; // in rupees (max(0, -netPosition))
  willReceive: number; // in rupees (max(0, netPosition))
  contributionPercentage: number; // 0-100%
  settlementStatus: "settled" | "needs_to_pay" | "will_receive";
  settledPaid?: number; // in rupees
  settledReceived?: number; // in rupees
  isPaymentVerified?: boolean;
  joinedAt: Date | string;
  lastActivity?: Date | string | null;
  membershipStatus?: "pending" | "expense_inactive" | "active";
  historicalInclusionDecision?: "included" | "excluded" | null;
  delegatedPermissions?: Record<string, boolean>;
  receivesFrom: Array<{ name: string; amount: number; userId?: number; contactId?: number; email?: string; phone?: string; status?: string }>;
  owesTo: Array<{ name: string; amount: number; userId?: number; contactId?: number; email?: string; phone?: string; status?: string }>;
}

export interface GroupFinancialSummary {
  group: {
    id: number;
    publicId: string;
    name: string;
    description?: string | null;
    type: string;
    currency: string;
    splitMethod: string;
    splitConfig?: any;
    hasCustomAssignments?: boolean;
    coverImage?: string | null;
    createdAt: Date | string;
    updatedAt: Date | string;
    createdBy: number;
    isOwner: boolean;
    isAdmin: boolean;
    userMembershipStatus?: "pending" | "expense_inactive" | "active";
    userDelegatedPermissions?: Record<string, boolean>;
  };
  overview: {
    totalMembers: number;
    activeMembers: number;
    guestMembers: number;
    totalExpenses: number; // in rupees
    totalSettlements: number; // in rupees
    pendingSettlementsCount: number;
    pendingSettlementsAmount: number; // in rupees
    userContribution: number; // in rupees
    userShare: number; // in rupees
    userNetBalance: number; // in rupees
    userStatus: "will_receive" | "need_to_pay" | "settled";
    statusText: string;
  };
  members: MemberFinancialDetail[];
  settlements: {
    suggestions: Array<{
      fromUserId?: number;
      fromContactId?: number;
      fromName: string;
      fromAvatar?: string | null;
      toUserId?: number;
      toContactId?: number;
      toName: string;
      toAvatar?: string | null;
      amount: number; // in rupees
      currency: string;
    }>;
    pendingList: Array<{
      id: number;
      publicId: string;
      fromUserId?: number | null;
      fromContactId?: number | null;
      toUserId?: number | null;
      toContactId?: number | null;
      fromName: string;
      toName: string;
      amount: number; // in rupees
      status: string;
      createdAt: Date | string;
    }>;
  };
  expenseSummary: {
    totalExpense: number; // in rupees
    todayExpense: number; // in rupees
    thisMonthExpense: number; // in rupees
    averagePerMember: number; // in rupees
    highestExpense: { title: string; amount: number; paidBy: string } | null;
    lowestExpense: { title: string; amount: number; paidBy: string } | null;
    categoryBreakdown: Array<{ name: string; amount: number; count: number }>;
  };
  insights: {
    highestContributor: { name: string; amount: number; percentage: number } | null;
    lowestContributor: { name: string; amount: number; percentage: number } | null;
    mostActiveMember: { name: string; count: number } | null;
    largestExpense: { title: string; amount: number; date: Date | string } | null;
    totalReceivableInGroup: number; // in rupees
    totalPayableInGroup: number; // in rupees
  };
  adminData?: {
    history: Array<{
      id: number;
      publicId: string;
      fromName: string;
      toName: string;
      amountRupees: number;
      paymentMethod: string;
      transactionReference?: string | null;
      reason: string;
      notes?: string | null;
      approvedByName: string;
      approvedDate: Date | string;
      previousBalanceRupees: number;
      newBalanceRupees: number;
    }>;
    reminderSettings: {
      id: number;
      groupId: number;
      isEnabled: boolean;
      frequency: any;
      customIntervalDays: number;
      reminderTime: string;
      timezone: string;
      startDate?: Date | string | null;
      endDate?: Date | string | null;
      maxReminderCount: number;
      isPaused: boolean;
      lastRunAt?: Date | string | null;
      nextScheduledAt?: Date | string | null;
    };
    emailLogs: Array<{
      id: number;
      publicId: string;
      recipientName: string;
      recipientEmail: string;
      recipientType: string;
      subject: string;
      amountDueRupees: number;
      reminderCount: number;
      sentAt: Date | string;
      status: string;
      failureReason?: string | null;
    }>;
    adminActions: Array<{
      id: number;
      publicId: string;
      adminName: string;
      actionType: string;
      targetEntity: string;
      createdAt: Date | string;
      details?: any;
    }>;
  };
  expenses: Array<{
    id: number;
    publicId: string;
    title: string | null;
    description?: string | null;
    type: string;
    amount: number;
    currency: string;
    date: Date;
    status: string;
    receiptUrl?: string | null;
    paymentMethod?: string | null;
    categoryName?: string | null;
    categoryId?: number | null;
    notes?: string | null;
    paidByName?: string | null;
    paidByContactName?: string | null;
    paidBy?: number | null;
    paidByContact?: number | null;
    createdBy?: number | null;
  }>;
}

/**
 * SECTION 1–12: Get Comprehensive Group Financial Details & Calculation
 */
export async function getGroupFinancialDetails(
  groupIdOrPublicId: string | number
): Promise<GroupFinancialSummary> {
  return await withDbRetry(async () => {
    try {
      const user = await requireAuth();

      const strId = String(groupIdOrPublicId).trim();
      const isDbId = isDbIntegerId(groupIdOrPublicId);
    
    // 1. Fetch Group
    const [groupRecord] = await db
      .select()
      .from(groups)
      .where(
        and(
          isDbId 
            ? or(eq(groups.publicId, strId), eq(groups.id, Number(strId)), eq(groups.legacyPublicId, strId))
            : or(eq(groups.publicId, strId), eq(groups.legacyPublicId, strId)),
          eq(groups.isDeleted, false)
        )
      )
      .limit(1);

    if (!groupRecord) {
      throw new ValidationError("Group not found or has been deleted");
    }

    const groupId = groupRecord.id;

    // 2. Parallel Batch Fetch: Members, Expenses, Splits, Settlements, Categories
    const creatorUser = alias(users, "creator_user");
    const payerUser = alias(users, "payer_user");
    const toUser = alias(users, "to_user");
    const toContact = alias(contacts, "to_contact");

    const [
      membersList,
      expensesList,
      pendingSettlementsList,
      completedSettlementsList,
      pendingJoinRequestsList,
      activeReceiverAssignments,
    ] = await Promise.all([
      // A. Group Members
      db
        .select({
          id: groupMembers.id,
          isAdmin: groupMembers.isAdmin,
          isGuest: groupMembers.isGuest,
          nickname: groupMembers.nickname,
          joinedAt: groupMembers.joinedAt,
          userId: groupMembers.userId,
          contactId: groupMembers.contactId,
          membershipStatus: groupMembers.membershipStatus,
          historicalInclusionDecision: groupMembers.historicalInclusionDecision,
          delegatedPermissions: groupMembers.delegatedPermissions,
          userName: users.name,
          userAvatar: users.avatar,
          userEmail: users.email,
          contactName: contacts.name,
          contactAvatar: contacts.avatar,
          contactEmail: contacts.email,
          contactPhone: contacts.phone,
        })
        .from(groupMembers)
        .leftJoin(users, eq(groupMembers.userId, users.id))
        .leftJoin(contacts, eq(groupMembers.contactId, contacts.id))
        .where(eq(groupMembers.groupId, groupId)),

      // B. Active Group Expenses
      db
        .select({
          id: transactions.id,
          publicId: transactions.publicId,
          title: transactions.title,
          description: transactions.description,
          type: transactions.type,
          amount: transactions.amount,
          currency: transactions.currency,
          date: transactions.date,
          status: transactions.status,
          receiptUrl: transactions.receiptUrl,
          notes: transactions.notes,
          paymentMethod: transactions.paymentMethod,
          createdBy: transactions.createdBy,
          paidBy: transactions.paidBy,
          paidByContact: transactions.paidByContact,
          categoryId: transactions.categoryId,
          categoryName: categories.name,
          payerName: payerUser.name,
          payerContactName: contacts.name,
        })
        .from(transactions)
        .leftJoin(payerUser, eq(transactions.paidBy, payerUser.id))
        .leftJoin(contacts, eq(transactions.paidByContact, contacts.id))
        .leftJoin(categories, eq(transactions.categoryId, categories.id))
        .where(
          and(
            eq(transactions.groupId, groupId),
            eq(transactions.isDeleted, false)
          )
        )
        .orderBy(desc(transactions.date)),

      // C. Pending Settlements
      db
        .select({
          id: settlements.id,
          publicId: settlements.publicId,
          amount: settlements.amount,
          currency: settlements.currency,
          status: settlements.status,
          createdAt: settlements.createdAt,
          fromUserId: settlements.fromUserId,
          fromContactId: settlements.fromContactId,
          toUserId: settlements.toUserId,
          toContactId: settlements.toContactId,
          fromUserName: users.name,
          fromContactName: contacts.name,
          toUserName: sql<string>`COALESCE(${toUser.name}, ${toContact.name})`,
        })
        .from(settlements)
        .leftJoin(users, eq(settlements.fromUserId, users.id))
        .leftJoin(contacts, eq(settlements.fromContactId, contacts.id))
        .leftJoin(toUser, eq(settlements.toUserId, toUser.id))
        .leftJoin(toContact, eq(settlements.toContactId, toContact.id))
        .where(
          and(
            eq(settlements.groupId, groupId),
            eq(settlements.status, "pending"),
            eq(settlements.isDeleted, false)
          )
        ),

      // D. Completed Settlements (for balance calculation & total settled)
      db
        .select({
          id: settlements.id,
          fromUserId: settlements.fromUserId,
          fromContactId: settlements.fromContactId,
          toUserId: settlements.toUserId,
          toContactId: settlements.toContactId,
          amount: settlements.amount,
          currency: settlements.currency,
          paymentMethod: settlements.paymentMethod,
          paidAt: settlements.paidAt,
          notes: settlements.notes,
        })
        .from(settlements)
        .where(
          and(
            eq(settlements.groupId, groupId),
            eq(settlements.status, "completed"),
            eq(settlements.isDeleted, false)
          )
        ),

      // E. Pending Join Requests
      db
        .select({
          id: groupJoinRequests.id,
          userId: groupJoinRequests.userId,
          status: groupJoinRequests.status,
        })
        .from(groupJoinRequests)
        .where(
          and(
            eq(groupJoinRequests.groupId, groupId),
            eq(groupJoinRequests.status, "pending")
          )
        ),

      // F. Active Custom Receiver Assignments
      db
        .select()
        .from(groupReceiverAssignments)
        .where(
          and(
            eq(groupReceiverAssignments.groupId, groupId),
            inArray(groupReceiverAssignments.status, [
              "active",
              "pending",
              "payment_initiated",
              "waiting_confirmation",
            ])
          )
        )
        .catch(() => [] as any[]),
    ]);

    // Check membership authorization
    const currentUserMember = membersList.find((m) => m.userId === user.id);
    const isOwner = groupRecord.createdBy === user.id;
    const isAdmin = isOwner || !!currentUserMember?.isAdmin;

    if (!currentUserMember && !isOwner) {
      throw new AuthorizationError("You do not have access to this group");
    }

    if (!isOwner && currentUserMember?.membershipStatus !== "active") {
      throw new AuthorizationError("Your join request is still pending Group Owner approval. Financial data is restricted.");
    }

    // 3. Fetch Splits for all Expenses
    const txIds = expensesList.map((e) => e.id);
    let allSplits: any[] = [];
    if (txIds.length > 0) {
      allSplits = await db
        .select({
          id: expenseSplits.id,
          transactionId: expenseSplits.transactionId,
          userId: expenseSplits.userId,
          contactId: expenseSplits.contactId,
          splitMethod: expenseSplits.splitMethod,
          amount: expenseSplits.amount,
          percentage: expenseSplits.percentage,
          shares: expenseSplits.shares,
          isExcluded: expenseSplits.isExcluded,
        })
        .from(expenseSplits)
        .where(inArray(expenseSplits.transactionId, txIds));
    }

    // 4. Build Complete Member Names & Avatars Map
    const memberNamesMap: Record<string, string> = {};
    const memberAvatarsMap: Record<string, string | null> = {};

    membersList.forEach((m) => {
      const displayName = m.nickname || m.userName || m.contactName || (m.userId ? `User #${m.userId}` : `Contact #${m.contactId}`);
      const avatarUrl = m.userAvatar || m.contactAvatar || null;

      if (m.userId) {
        memberNamesMap[`user-${m.userId}`] = displayName;
        memberAvatarsMap[`user-${m.userId}`] = avatarUrl;
      }
      if (m.contactId) {
        memberNamesMap[`contact-${m.contactId}`] = displayName;
        memberAvatarsMap[`contact-${m.contactId}`] = avatarUrl;
      }
    });

    // 5. Convert to Settlement Calculator Expense format
    const calculatorExpenses: Expense[] = expensesList.map((e) => {
      const splitsForTx = allSplits.filter((s) => s.transactionId === e.id);
      return {
        id: e.id,
        amount: e.amount,
        currency: "INR",
        splitType: (splitsForTx[0]?.splitMethod as any) || groupRecord.splitMethod || "equal",
        paidBy: e.paidBy || undefined,
        paidByContact: e.paidByContact || undefined,
        isDeleted: false,
        splits: splitsForTx.length > 0 
          ? splitsForTx.map((s) => ({
              userId: s.userId || undefined,
              contactId: s.contactId || undefined,
              amount: s.amount,
              percentage: s.percentage ? Number(s.percentage) : undefined,
              shares: s.shares ? Number(s.shares) : undefined,
              isExcluded: s.isExcluded || false,
            }))
          : membersList.map((m) => ({
              userId: m.userId || undefined,
              contactId: m.contactId || undefined,
              amount: Math.round(e.amount / Math.max(1, membersList.length)),
            })),
      };
    });

    // Total Group Expenses
    const totalGroupExpenseInPaise = expensesList.reduce((sum, e) => sum + e.amount, 0);
    const totalGroupExpenseRupees = totalGroupExpenseInPaise / 100;

    const pendingUserIdsSet = new Set(
      pendingJoinRequestsList.map((r) => r.userId).filter(Boolean) as number[]
    );

    // 6. Calculate Initial Per-Member Financial Breakdown with Completed Settlements
    // Only approved/active members participate in member list and calculations (Requirement 1 & 2)
    // Strictly excludes any user with an active pending join request
    const isApprovedActive = (m: any) => {
      if (m.userId && pendingUserIdsSet.has(m.userId)) return false;
      const status = (m.membershipStatus || "").toLowerCase();
      if (status === "pending" || status === "pending_approval" || status === "expense_inactive") return false;
      if (m.isGuest) return status !== "pending" && status !== "pending_approval";
      return status === "active";
    };

    const participatingMembersList = membersList.filter(isApprovedActive);
    const activeCalculationCount = Math.max(1, participatingMembersList.filter(pm => pm.membershipStatus === "active" || pm.isGuest).length);

    // 5.5. Group-Wide Split Engine Resolution (Exact, Percentage, Shares)
    const memberPayableMap = new Map<string, number>();

    if (groupRecord.splitMethod !== "equal" && participatingMembersList.length > 0 && totalGroupExpenseInPaise > 0) {
      const splitMemberInputs: SplitMemberInput[] = participatingMembersList.map((m) => {
        const key = m.userId ? `user-${m.userId}` : `contact-${m.contactId}`;
        const name = m.nickname || m.userName || m.contactName || "Member";
        const savedConfig = (groupRecord.splitConfig as any)?.members?.find(
          (sm: any) => (m.userId && sm.userId === m.userId) || (m.contactId && sm.contactId === m.contactId)
        );
        return {
          key,
          userId: m.userId || undefined,
          contactId: m.contactId || undefined,
          name,
          avatar: m.userAvatar || m.contactAvatar || null,
          fixedAmountPaise: savedConfig?.fixedAmountPaise ?? 0,
          percentage: savedConfig?.percentage ?? (participatingMembersList.length > 0 ? 100 / participatingMembersList.length : 0),
          shares: savedConfig?.shares ?? 1,
          isLocked: savedConfig?.isLocked ?? false,
        };
      });

      if (groupRecord.splitMethod === "exact") {
        const exactRes = calculateExactAmountGroupPayables(totalGroupExpenseInPaise, splitMemberInputs);
        for (const p of exactRes.payables) {
          memberPayableMap.set(p.key, p.amountPaise);
        }
      } else if (groupRecord.splitMethod === "percentage") {
        const pctRes = calculatePercentageGroupPayables(totalGroupExpenseInPaise, splitMemberInputs);
        for (const p of pctRes.payables) {
          memberPayableMap.set(p.key, p.amountPaise);
        }
      } else if (groupRecord.splitMethod === "shares") {
        const sharesRes = calculateSharesGroupPayables(totalGroupExpenseInPaise, splitMemberInputs);
        for (const p of sharesRes.payables) {
          memberPayableMap.set(p.key, p.amountPaise);
        }
      }
    }

    const processedMembers: MemberFinancialDetail[] = participatingMembersList.map((m) => {
      const memberId = m.userId;
      const contactId = m.contactId;
      const displayName = m.nickname || m.userName || m.contactName || "Member";
      const avatarUrl = m.userAvatar || m.contactAvatar || null;

      // Total Paid by this member in expenses
      const memberPaidPaise = expensesList
        .filter((e) => (memberId && e.paidBy === memberId) || (contactId && e.paidByContact === contactId))
        .reduce((sum, e) => sum + e.amount, 0);

      // Own Share (splits assigned to this member)
      const memberKey = memberId ? `user-${memberId}` : `contact-${contactId}`;
      let memberSharePaise = 0;

      if (groupRecord.splitMethod !== "equal" && memberPayableMap.has(memberKey)) {
        memberSharePaise = memberPayableMap.get(memberKey)!;
      } else {
        // Equal Split: Existing unmodified behavior
        memberSharePaise = allSplits
          .filter((s) => (memberId && s.userId === memberId) || (contactId && s.contactId === contactId))
          .reduce((sum, s) => sum + s.amount, 0);

        if (allSplits.length === 0 && expensesList.length > 0) {
          if (m.membershipStatus === "active" || m.isGuest) {
            memberSharePaise = Math.round(totalGroupExpenseInPaise / activeCalculationCount);
          } else {
            memberSharePaise = 0;
          }
        }
      }

      // Offline Settlements Paid by this member (gives money to credit their debt balance)
      const settlementPaidPaise = completedSettlementsList
        .filter((s) => (memberId && s.fromUserId === memberId) || (contactId && s.fromContactId === contactId))
        .reduce((sum, s) => sum + Number(s.amount), 0);

      // Offline Settlements Received by this member (receives money to reduce receivable balance)
      const settlementReceivedPaise = completedSettlementsList
        .filter((s) => (memberId && s.toUserId === memberId) || (contactId && s.toContactId === contactId))
        .reduce((sum, s) => sum + Number(s.amount), 0);

      const totalPaid = memberPaidPaise / 100;
      const ownShare = memberSharePaise / 100;
      const settledPaid = settlementPaidPaise / 100;
      const settledReceived = settlementReceivedPaise / 100;

      // Net position after accounting for completed settlements
      const netPosition = (totalPaid - ownShare) + (settledPaid - settledReceived);

      const extraPaid = Math.max(0, netPosition);
      const needToPay = Math.max(0, -netPosition);
      const willReceive = Math.max(0, netPosition);

      const contributionPercentage = totalGroupExpenseRupees > 0 
        ? Math.round((totalPaid / totalGroupExpenseRupees) * 100) 
        : 0;

      let settlementStatus: "settled" | "needs_to_pay" | "will_receive" = "settled";
      if (netPosition > 0.01) settlementStatus = "will_receive";
      else if (netPosition < -0.01) settlementStatus = "needs_to_pay";

      const isPaymentVerified = (settlementPaidPaise > 0 || settlementReceivedPaise > 0) && Math.abs(netPosition) <= 0.01;

      const expenseCount = expensesList.filter(
        (e) => (memberId && e.paidBy === memberId) || (contactId && e.paidByContact === contactId)
      ).length;

      const role: "owner" | "admin" | "member" = groupRecord.createdBy === m.userId 
        ? "owner" 
        : m.isAdmin 
        ? "admin" 
        : "member";

      return {
        id: m.id,
        userId: m.userId,
        contactId: m.contactId,
        name: displayName,
        avatar: avatarUrl,
        email: m.userEmail || m.contactEmail || null,
        phone: m.contactPhone || null,
        role,
        isGuest: !!m.isGuest,
        isRegistered: !m.isGuest && !!m.userId,
        membershipStatus: (m.membershipStatus || "active") as "pending" | "expense_inactive" | "active",
        historicalInclusionDecision: (m.historicalInclusionDecision === "excluded" ? "excluded" : "included") as "included" | "excluded",
        delegatedPermissions: (m.delegatedPermissions as Record<string, boolean>) || {},
        expenseCount,
        totalPaid,
        ownShare,
        netPosition,
        extraPaid,
        needToPay,
        willReceive,
        contributionPercentage,
        settlementStatus,
        settledPaid,
        settledReceived,
        isPaymentVerified,
        joinedAt: m.joinedAt,
        receivesFrom: [],
        owesTo: [],
      };
    });

    // 7. Calculate Post-Settlement Optimal Settlement Graph
    // Balance array: only ACTIVE members participate in settlement calculations (Requirement 5 & 6)
    const optimalBalances: Balance[] = processedMembers
      .filter((m) => m.membershipStatus === "active" || m.isGuest)
      .map((m) => ({
        userId: m.userId || undefined,
        contactId: m.contactId || undefined,
        name: m.name,
        isGuest: m.isGuest,
        amount: Math.round(m.netPosition * 100),
      }));

    const optimalSettlements = calculateOptimalSettlements(optimalBalances, "INR");

    // Ground truth settlement suggestions are either active custom receiver assignments or freshly calculated optimalSettlements
    let effectivePendingList: any[] = [];
    if (activeReceiverAssignments.length > 0) {
      const assignedDebtorKeys = new Set(
        activeReceiverAssignments.map((a) =>
          a.fromUserId ? `user-${a.fromUserId}` : `contact-${a.fromContactId}`
        )
      );

      const mappedAssignments = activeReceiverAssignments.map((a) => {
        const fromKey = a.fromUserId ? `user-${a.fromUserId}` : `contact-${a.fromContactId}`;
        const toKey = a.toUserId ? `user-${a.toUserId}` : `contact-${a.toContactId}`;
        return {
          fromUserId: a.fromUserId || undefined,
          fromContactId: a.fromContactId || undefined,
          fromName: a.fromName || memberNamesMap[fromKey] || "Debtor",
          fromAvatar: memberAvatarsMap[fromKey] || null,
          toUserId: a.toUserId || undefined,
          toContactId: a.toContactId || undefined,
          toName: a.toName || memberNamesMap[toKey] || "Creditor",
          toAvatar: memberAvatarsMap[toKey] || null,
          amount: Number(a.amount),
          currency: a.currency || "INR",
          status: a.status || "pending",
        };
      });

      // Include optimal settlements for debtors who don't have custom assignments yet
      const remainingOptimal = optimalSettlements
        .filter((opt) => {
          const key = opt.fromUserId ? `user-${opt.fromUserId}` : `contact-${opt.fromContactId}`;
          return !assignedDebtorKeys.has(key);
        })
        .map((s) => ({
          ...s,
          status: "pending",
        }));

      effectivePendingList = [...mappedAssignments, ...remainingOptimal];
    } else {
      effectivePendingList = optimalSettlements.map((s) => ({
        ...s,
        status: "pending",
      }));
    }

    // Check whether the database pendingSettlementsList is identical to effectivePendingList
    const isDbInSync =
      pendingSettlementsList.length === effectivePendingList.length &&
      effectivePendingList.every((opt) =>
        pendingSettlementsList.some(
          (ps) =>
            ((opt.fromUserId && ps.fromUserId === opt.fromUserId) ||
              (opt.fromContactId && ps.fromContactId === opt.fromContactId)) &&
            ((opt.toUserId && ps.toUserId === opt.toUserId) ||
              (opt.toContactId && ps.toContactId === opt.toContactId)) &&
            Math.abs(Number(ps.amount) - opt.amount) < 1
        )
      );

    // If out of sync, auto-sync database pending settlements so other views and Dashboard stay consistent
    if (!isDbInSync) {
      try {
        await db
          .delete(settlements)
          .where(
            and(
              eq(settlements.groupId, groupId),
              eq(settlements.status, "pending"),
              eq(settlements.isDeleted, false)
            )
          );

        const pendingToInsert = effectivePendingList.map((s) => ({
          publicId: generatePublicId("set"),
          groupId,
          fromUserId: s.fromUserId || null,
          fromContactId: s.fromContactId || null,
          toUserId: s.toUserId || null,
          toContactId: s.toContactId || null,
          amount: Math.round(s.amount),
          currency: s.currency || groupRecord.currency || "INR",
          status: (s.status as any) || "pending",
          createdAt: new Date(),
        }));

        if (pendingToInsert.length > 0) {
          await db.insert(settlements).values(pendingToInsert);
        }
      } catch (syncErr) {
        console.error("Failed to auto-sync group pending settlements:", syncErr);
      }
    }

    // Populate pairwise debts into members
    processedMembers.forEach((m) => {
      const memberId = m.userId;
      const contactId = m.contactId;

      m.receivesFrom = effectivePendingList
        .filter((s) => (memberId && s.toUserId === memberId) || (contactId && s.toContactId === contactId))
        .map((s) => {
          const fromMember = processedMembers.find(
            (pm) => (s.fromUserId && pm.userId === s.fromUserId) || (s.fromContactId && pm.contactId === s.fromContactId)
          );
          const fromKey = s.fromUserId ? `user-${s.fromUserId}` : `contact-${s.fromContactId}`;
          return {
            name: s.fromName || memberNamesMap[fromKey] || "Member",
            amount: s.amount / 100,
            userId: s.fromUserId,
            contactId: s.fromContactId,
            email: fromMember?.email || undefined,
            phone: fromMember?.phone || undefined,
            status: s.status || "pending",
          };
        });

      m.owesTo = effectivePendingList
        .filter((s) => (memberId && s.fromUserId === memberId) || (contactId && s.fromContactId === contactId))
        .map((s) => {
          const toMember = processedMembers.find(
            (pm) => (s.toUserId && pm.userId === s.toUserId) || (s.toContactId && pm.contactId === s.toContactId)
          );
          const toKey = s.toUserId ? `user-${s.toUserId}` : `contact-${s.toContactId}`;
          return {
            name: s.toName || memberNamesMap[toKey] || "Member",
            amount: s.amount / 100,
            userId: s.toUserId,
            contactId: s.toContactId,
            email: toMember?.email || undefined,
            phone: toMember?.phone || undefined,
            status: s.status || "pending",
          };
        });
    });

    // 7.5 Synchronize each member's settlement status, netPosition, needToPay, and willReceive from their aggregated allocations
    processedMembers.forEach((m) => {
      const totalOwed = m.owesTo.reduce((sum, o) => sum + o.amount, 0);
      const totalReceiving = m.receivesFrom.reduce((sum, r) => sum + r.amount, 0);

      if (totalOwed > 0.01) {
        m.needToPay = totalOwed;
        m.willReceive = 0;
        m.netPosition = -totalOwed;
        m.settlementStatus = "needs_to_pay";
        // When member has owed debt/allocations, their effective own share must reflect their total liability
        if (m.totalPaid + totalOwed > m.ownShare) {
          m.ownShare = m.totalPaid + totalOwed;
        }
      } else if (totalReceiving > 0.01) {
        m.willReceive = totalReceiving;
        m.needToPay = 0;
        m.netPosition = totalReceiving;
        m.settlementStatus = "will_receive";
      } else {
        m.needToPay = 0;
        m.willReceive = 0;
        m.netPosition = 0;
        m.settlementStatus = "settled";
      }
    });

    // 8. Current Logged-in User Overview in this Group (SECTION 1 & 2)
    const currentUserDetail = processedMembers.find((m) => m.userId === user.id);
    const userContribution = currentUserDetail?.totalPaid || 0;
    const userShare = currentUserDetail?.ownShare || 0;
    const userNetBalance = currentUserDetail?.netPosition || 0;

    let userStatus: "will_receive" | "need_to_pay" | "settled" = "settled";
    let statusText = "You are all settled up in this group";

    if (currentUserDetail) {
      if (currentUserDetail.needToPay > 0.01) {
        userStatus = "need_to_pay";
        statusText = `You Need To Pay ₹${currentUserDetail.needToPay.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      } else if (currentUserDetail.willReceive > 0.01) {
        userStatus = "will_receive";
        statusText = `You Will Receive ₹${currentUserDetail.willReceive.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
    }

    // 9. Who Pays Whom Suggestions (SECTION 6)
    const settlementSuggestions = effectivePendingList.map((s) => {
      const fromKey = s.fromUserId ? `user-${s.fromUserId}` : `contact-${s.fromContactId}`;
      const toKey = s.toUserId ? `user-${s.toUserId}` : `contact-${s.toContactId}`;

      return {
        fromUserId: s.fromUserId,
        fromContactId: s.fromContactId,
        fromName: s.fromName || memberNamesMap[fromKey] || "Member",
        fromAvatar: memberAvatarsMap[fromKey] || null,
        toUserId: s.toUserId,
        toContactId: s.toContactId,
        toName: s.toName || memberNamesMap[toKey] || "Member",
        toAvatar: memberAvatarsMap[toKey] || null,
        amount: s.amount / 100,
        currency: "INR",
      };
    });

    // 10. Group Expense Summary (SECTION 8)
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const todayExpenses = expensesList
      .filter((e) => new Date(e.date) >= startOfToday)
      .reduce((sum, e) => sum + e.amount, 0) / 100;

    const thisMonthExpenses = expensesList
      .filter((e) => new Date(e.date) >= startOfMonth)
      .reduce((sum, e) => sum + e.amount, 0) / 100;

    const avgPerMember = participatingMembersList.length > 0 
      ? totalGroupExpenseRupees / participatingMembersList.length 
      : 0;

    // Highest and Lowest Expenses
    let highestExp: any = null;
    let lowestExp: any = null;

    if (expensesList.length > 0) {
      const sortedByAmount = [...expensesList].sort((a, b) => b.amount - a.amount);
      const top = sortedByAmount[0];
      const bottom = sortedByAmount[sortedByAmount.length - 1];

      highestExp = {
        title: top.title || top.description,
        amount: top.amount / 100,
        paidBy: top.payerName || top.payerContactName || "Member",
      };

      lowestExp = {
        title: bottom.title || bottom.description,
        amount: bottom.amount / 100,
        paidBy: bottom.payerName || bottom.payerContactName || "Member",
      };
    }

    // Category Breakdown
    const catMap = new Map<string, { amount: number; count: number }>();
    expensesList.forEach((e) => {
      const cat = e.categoryName || "General";
      const existing = catMap.get(cat) || { amount: 0, count: 0 };
      existing.amount += e.amount / 100;
      existing.count += 1;
      catMap.set(cat, existing);
    });

    const categoryBreakdown = Array.from(catMap.entries()).map(([name, data]) => ({
      name,
      amount: data.amount,
      count: data.count,
    })).sort((a, b) => b.amount - a.amount);

    // 11. Group Insights (SECTION 12)
    const sortedContributors = [...processedMembers].sort((a, b) => b.totalPaid - a.totalPaid);
    const highestContributor = sortedContributors.length > 0 && sortedContributors[0].totalPaid > 0
      ? { 
          name: sortedContributors[0].name, 
          amount: sortedContributors[0].totalPaid, 
          percentage: sortedContributors[0].contributionPercentage 
        }
      : null;

    const lowestContributor = sortedContributors.length > 0 
      ? { 
          name: sortedContributors[sortedContributors.length - 1].name, 
          amount: sortedContributors[sortedContributors.length - 1].totalPaid, 
          percentage: sortedContributors[sortedContributors.length - 1].contributionPercentage 
        }
      : null;

    const sortedByActivity = [...processedMembers].sort((a, b) => b.expenseCount - a.expenseCount);
    const mostActiveMember = sortedByActivity.length > 0 && sortedByActivity[0].expenseCount > 0
      ? { name: sortedByActivity[0].name, count: sortedByActivity[0].expenseCount }
      : null;

    const largestExpense = highestExp 
      ? { title: highestExp.title, amount: highestExp.amount, date: expensesList[0]?.date || new Date() }
      : null;

    const totalReceivableInGroup = processedMembers
      .reduce((sum, m) => sum + m.willReceive, 0);

    const totalPayableInGroup = processedMembers
      .reduce((sum, m) => sum + m.needToPay, 0);

    const pendingSettlementsAmount = effectivePendingList.reduce((sum, s) => sum + Number(s.amount), 0) / 100;

    const totalSettledAmount = completedSettlementsList.reduce((sum, s) => sum + Number(s.amount), 0) / 100;

    // 12. Fetch Admin Data (History, Reminders, Logs, Actions) if Caller is Admin or Owner
    let adminData;
    if (isAdmin || isOwner) {
      const [historyRows, reminderSettingsRows, emailLogRows, adminActionRows] = await Promise.all([
        db
          .select()
          .from(settlementHistory)
          .where(eq(settlementHistory.groupId, groupId))
          .orderBy(desc(settlementHistory.approvedDate))
          .limit(25),
        db
          .select()
          .from(settlementReminderSettings)
          .where(eq(settlementReminderSettings.groupId, groupId))
          .limit(1),
        db
          .select()
          .from(settlementEmailLogs)
          .where(eq(settlementEmailLogs.groupId, groupId))
          .orderBy(desc(settlementEmailLogs.sentAt))
          .limit(25),
        db
          .select()
          .from(adminActions)
          .where(eq(adminActions.groupId, groupId))
          .orderBy(desc(adminActions.createdAt))
          .limit(25),
      ]);

      adminData = {
        history: historyRows.map((h) => ({
          id: h.id,
          publicId: h.publicId,
          fromName: h.fromName,
          toName: h.toName,
          amountRupees: h.amount / 100,
          paymentMethod: h.paymentMethod,
          transactionReference: h.transactionReference,
          reason: h.reason,
          notes: h.notes,
          approvedByName: h.approvedByName,
          approvedDate: h.approvedDate,
          previousBalanceRupees: h.previousBalance / 100,
          newBalanceRupees: h.newBalance / 100,
        })),
        reminderSettings: reminderSettingsRows[0]
          ? {
              id: reminderSettingsRows[0].id,
              groupId: reminderSettingsRows[0].groupId,
              isEnabled: reminderSettingsRows[0].isEnabled,
              frequency: reminderSettingsRows[0].frequency,
              customIntervalDays: reminderSettingsRows[0].customIntervalDays || 1,
              reminderTime: reminderSettingsRows[0].reminderTime,
              timezone: reminderSettingsRows[0].timezone,
              startDate: reminderSettingsRows[0].startDate,
              endDate: reminderSettingsRows[0].endDate,
              maxReminderCount: reminderSettingsRows[0].maxReminderCount,
              isPaused: reminderSettingsRows[0].isPaused,
              lastRunAt: reminderSettingsRows[0].lastRunAt,
              nextScheduledAt: reminderSettingsRows[0].nextScheduledAt,
            }
          : {
              id: 0,
              groupId: groupId,
              isEnabled: false,
              frequency: "daily",
              customIntervalDays: 1,
              reminderTime: "09:00",
              timezone: "Asia/Kolkata",
              startDate: null,
              endDate: null,
              maxReminderCount: 5,
              isPaused: false,
              lastRunAt: null,
              nextScheduledAt: null,
            },
        emailLogs: emailLogRows.map((l) => ({
          id: l.id,
          publicId: l.publicId,
          recipientName: l.recipientName,
          recipientEmail: l.recipientEmail,
          recipientType: l.recipientType,
          subject: l.subject,
          amountDueRupees: l.amountDue / 100,
          reminderCount: l.reminderCount,
          sentAt: l.sentAt,
          status: l.status,
          failureReason: l.failureReason,
        })),
        adminActions: adminActionRows.map((a) => ({
          id: a.id,
          publicId: a.publicId,
          adminName: a.adminName,
          actionType: a.actionType,
          targetEntity: a.targetEntity,
          createdAt: a.createdAt,
          details: a.details,
        })),
      };
    }

    return {
      group: {
        id: groupRecord.id,
        publicId: groupRecord.publicId,
        name: groupRecord.name,
        description: groupRecord.description,
        type: groupRecord.type,
        currency: groupRecord.currency || "INR",
        splitMethod: groupRecord.splitMethod || "equal",
        splitConfig: groupRecord.splitConfig || null,
        hasCustomAssignments: activeReceiverAssignments.length > 0,
        coverImage: groupRecord.coverImage,
        createdAt: groupRecord.createdAt,
        updatedAt: groupRecord.updatedAt,
        createdBy: groupRecord.createdBy,
        isOwner,
        isAdmin,
        userMembershipStatus: (isOwner ? "active" : currentUserMember?.membershipStatus || "active") as "pending" | "expense_inactive" | "active",
        userDelegatedPermissions: (currentUserMember?.delegatedPermissions as Record<string, boolean>) || {},
      },
      overview: {
        totalMembers: membersList.filter(isApprovedActive).length,
        activeMembers: membersList.filter((m) => !m.isGuest && isApprovedActive(m)).length,
        guestMembers: membersList.filter((m) => m.isGuest && isApprovedActive(m)).length,
        totalExpenses: totalGroupExpenseRupees,
        totalSettlements: totalSettledAmount,
        pendingSettlementsCount: pendingSettlementsList.length,
        pendingSettlementsAmount,
        userContribution,
        userShare,
        userNetBalance,
        userStatus,
        statusText,
      },
      members: processedMembers,
      settlements: {
        suggestions: settlementSuggestions,
        pendingList: pendingSettlementsList.map((s) => ({
          id: s.id,
          publicId: s.publicId,
          fromUserId: s.fromUserId,
          fromContactId: s.fromContactId,
          toUserId: s.toUserId,
          toContactId: s.toContactId,
          fromName: s.fromUserName || s.fromContactName || "Member",
          toName: s.toUserName || "Member",
          amount: s.amount / 100,
          status: s.status,
          createdAt: s.createdAt,
        })),
      },
      expenseSummary: {
        totalExpense: totalGroupExpenseRupees,
        todayExpense: todayExpenses,
        thisMonthExpense: thisMonthExpenses,
        averagePerMember: avgPerMember,
        highestExpense: highestExp,
        lowestExpense: lowestExp,
        categoryBreakdown,
      },
      insights: {
        highestContributor,
        lowestContributor,
        mostActiveMember,
        largestExpense,
        totalReceivableInGroup,
        totalPayableInGroup,
      },
      adminData,
      expenses: expensesList.map((e) => ({
        id: e.id,
        publicId: e.publicId,
        title: e.title,
        description: e.description,
        type: e.type,
        amount: e.amount,
        currency: e.currency,
        date: e.date,
        status: e.status,
        receiptUrl: e.receiptUrl,
        paymentMethod: e.paymentMethod,
        categoryName: e.categoryName,
        categoryId: e.categoryId,
        notes: e.notes,
        paidByName: e.payerName,
        paidByContactName: e.payerContactName,
        paidBy: e.paidBy,
        paidByContact: e.paidByContact,
        createdBy: e.createdBy,
        splitMethod: allSplits.find((s) => s.transactionId === e.id)?.splitMethod || groupRecord.splitMethod || "equal",
        splits: allSplits
          .filter((s) => s.transactionId === e.id)
          .map((s) => ({
            userId: s.userId || undefined,
            contactId: s.contactId || undefined,
            amount: s.amount,
            percentage: s.percentage,
            shares: s.shares,
            splitMethod: s.splitMethod,
          })),
      })),
    };
    } catch (error) {
      if (error instanceof ValidationError || error instanceof AuthorizationError) throw error;
      throw new DatabaseError("Failed to calculate group financials", { originalError: error });
    }
  });
}

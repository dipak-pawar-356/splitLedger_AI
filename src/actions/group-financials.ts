"use server";

import { db } from "@/lib/db";
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
  adminActions
} from "@/lib/db/schema/schema";
import { eq, and, desc, sql, or, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { requireAuth } from "@/lib/auth";
import { ValidationError, DatabaseError, AuthorizationError } from "@/lib/errors";
import { calculateGroupSettlements, calculateOptimalSettlements, type Expense, type Balance } from "@/lib/settlements/calculator";
import { isDbIntegerId } from "@/lib/utils";

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
  receivesFrom: Array<{ name: string; amount: number; userId?: number; contactId?: number; email?: string; phone?: string }>;
  owesTo: Array<{ name: string; amount: number; userId?: number; contactId?: number; email?: string; phone?: string }>;
}

export interface GroupFinancialSummary {
  group: {
    id: number;
    publicId: string;
    name: string;
    description?: string | null;
    type: string;
    currency: string;
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
    paidByName?: string | null;
    paidByContactName?: string | null;
  }>;
}

/**
 * SECTION 1–12: Get Comprehensive Group Financial Details & Calculation
 */
export async function getGroupFinancialDetails(
  groupIdOrPublicId: string | number
): Promise<GroupFinancialSummary> {
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
        splitType: (splitsForTx[0]?.splitMethod as any) || "equal",
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

    // 6. Calculate Initial Per-Member Financial Breakdown with Completed Settlements
    // Only approved/active members participate in member list and calculations (Requirement 1 & 2)
    const isApprovedActive = (m: any) => {
      const status = (m.membershipStatus || "").toLowerCase();
      if (status === "pending" || status === "pending_approval") return false;
      if (m.isGuest) return status !== "pending" && status !== "pending_approval";
      return status === "active";
    };

    const participatingMembersList = membersList.filter(isApprovedActive);
    const activeCalculationCount = Math.max(1, participatingMembersList.filter(pm => pm.membershipStatus === "active" || pm.isGuest).length);

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
      let memberSharePaise = allSplits
        .filter((s) => (memberId && s.userId === memberId) || (contactId && s.contactId === contactId))
        .reduce((sum, s) => sum + s.amount, 0);

      // If no explicit splits were stored, fallback to equal share among active members
      if (allSplits.length === 0 && expensesList.length > 0) {
        if (m.membershipStatus === "active" || m.isGuest) {
          memberSharePaise = Math.round(totalGroupExpenseInPaise / activeCalculationCount);
        } else {
          memberSharePaise = 0;
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
        historicalInclusionDecision: (m.historicalInclusionDecision as any) || null,
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

    // Populate pairwise debts into members
    processedMembers.forEach((m) => {
      const memberId = m.userId;
      const contactId = m.contactId;

      m.receivesFrom = optimalSettlements
        .filter((s) => (memberId && s.toUserId === memberId) || (contactId && s.toContactId === contactId))
        .map((s) => {
          const fromMember = processedMembers.find(
            (pm) => (s.fromUserId && pm.userId === s.fromUserId) || (s.fromContactId && pm.contactId === s.fromContactId)
          );
          return {
            name: s.fromName || "Member",
            amount: s.amount / 100,
            userId: s.fromUserId,
            contactId: s.fromContactId,
            email: fromMember?.email || undefined,
            phone: fromMember?.phone || undefined,
          };
        });

      m.owesTo = optimalSettlements
        .filter((s) => (memberId && s.fromUserId === memberId) || (contactId && s.fromContactId === contactId))
        .map((s) => {
          const toMember = processedMembers.find(
            (pm) => (s.toUserId && pm.userId === s.toUserId) || (s.toContactId && pm.contactId === s.toContactId)
          );
          return {
            name: s.toName || "Member",
            amount: s.amount / 100,
            userId: s.toUserId,
            contactId: s.toContactId,
            email: toMember?.email || undefined,
            phone: toMember?.phone || undefined,
          };
        });
    });

    // 8. Current Logged-in User Overview in this Group (SECTION 1 & 2)
    const currentUserDetail = processedMembers.find((m) => m.userId === user.id);
    const userContribution = currentUserDetail?.totalPaid || 0;
    const userShare = currentUserDetail?.ownShare || 0;
    const userNetBalance = currentUserDetail?.netPosition || 0;

    let userStatus: "will_receive" | "need_to_pay" | "settled" = "settled";
    let statusText = "You are all settled up in this group";

    if (userNetBalance > 0.01) {
      userStatus = "will_receive";
      statusText = `You Will Receive ₹${userNetBalance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else if (userNetBalance < -0.01) {
      userStatus = "need_to_pay";
      statusText = `You Need To Pay ₹${Math.abs(userNetBalance).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    // 9. Who Pays Whom Suggestions (SECTION 6)
    const settlementSuggestions = optimalSettlements.map((s) => {
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

    const pendingSettlementsAmount = optimalSettlements.reduce((sum, s) => sum + s.amount, 0) / 100;

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
        totalMembers: participatingMembersList.length,
        activeMembers: membersList.filter((m) => !m.isGuest && (m.membershipStatus || "").toLowerCase() === "active").length,
        guestMembers: membersList.filter((m) => m.isGuest && (m.membershipStatus || "").toLowerCase() !== "pending" && (m.membershipStatus || "").toLowerCase() !== "pending_approval").length,
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
        paidByName: e.payerName,
        paidByContactName: e.payerContactName,
      })),
    };
  } catch (error) {
    if (error instanceof ValidationError || error instanceof AuthorizationError) throw error;
    throw new DatabaseError("Failed to calculate group financials", { originalError: error });
  }
}

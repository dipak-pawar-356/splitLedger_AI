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
  settlementHistory,
  auditLogs 
} from "@/lib/db/schema/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { requireAuth } from "@/lib/auth";
import { ValidationError, DatabaseError, AuthorizationError, NotFoundError } from "@/lib/errors";
import { calculateOptimalSettlements, type Balance, type Expense } from "@/lib/settlements/calculator";
import { 
  validateUpiId, 
  buildUpiDeepLink, 
  getAppSpecificUpiLink, 
  generateUpiQrCodeDataUrl,
  sanitizePayeeName 
} from "@/lib/payments/upi";
import { generatePublicId } from "@/lib/utils";
import { revalidatePath } from "next/cache";

export interface UpiSettlementCardData {
  receiverId: number;
  receiverType: "user" | "contact";
  receiverName: string;
  receiverAvatar: string | null;
  receiverUpiId: string | null;
  hasValidUpi: boolean;
  upiValidationMessage?: string;
  amount: number; // in rupees
  formattedAmount: string; // e.g. "₹500.00"
  currency: string; // "INR"
  upiUri: string | null;
  qrCodeDataUrl: string | null;
  appLinks: {
    gpay: string | null;
    phonepe: string | null;
    paytm: string | null;
    bhim: string | null;
    cred: string | null;
  };
  groupId: number;
  groupName: string;
}

export interface UpiReceivableCardData {
  payerId: number;
  payerType: "user" | "contact";
  payerName: string;
  payerAvatar: string | null;
  amount: number; // in rupees
  formattedAmount: string;
  currency: string;
  status: "pending";
}

export interface MemberFinancialBreakdown {
  grossExpensePaid: number; // in rupees
  grossShare: number; // in rupees
  netBalance: number; // in rupees: grossExpensePaid - grossShare
  completedSettlementPaid: number; // in rupees
  completedSettlementReceived: number; // in rupees
  totalContribution: number; // in rupees: grossExpensePaid + completedSettlementPaid
  outstandingPayable: number; // in rupees
  outstandingReceivable: number; // in rupees
}

export interface GroupUpiSettlementsResponse {
  success: boolean;
  groupId: number;
  groupName: string;
  groupCurrency: string;
  currentUserId: number;
  currentUserUpiId: string | null;
  isCurrentUserUpiConfigured: boolean;
  // Multiple independent payment cards where current user owes others
  myPayables: UpiSettlementCardData[];
  // Debts other members owe to current user
  myReceivables: UpiReceivableCardData[];
  totalPayableAmount: number;
  totalReceivableAmount: number;
  financialBreakdown?: MemberFinancialBreakdown;
  error?: string;
}

/**
 * Fetch and calculate fresh group-isolated settlement debts and generate dynamic UPI QR codes.
 * Ensures total isolation between groups: expenses and settlements of this group only.
 */
export async function getGroupUpiSettlementsAction(
  groupIdOrPublicId: string | number
): Promise<GroupUpiSettlementsResponse> {
  try {
    const user = await requireAuth();

    const isNumeric = typeof groupIdOrPublicId === "number" || /^\d+$/.test(String(groupIdOrPublicId));
    
    // 1. Fetch Group
    const [groupRecord] = await db
      .select()
      .from(groups)
      .where(
        and(
          isNumeric 
            ? eq(groups.id, Number(groupIdOrPublicId)) 
            : eq(groups.publicId, String(groupIdOrPublicId)),
          eq(groups.isDeleted, false)
        )
      )
      .limit(1);

    if (!groupRecord) {
      throw new NotFoundError("Group");
    }

    const groupId = groupRecord.id;

    // 2. Fetch Group Members with User Profile UPI IDs
    const membersList = await db
      .select({
        id: groupMembers.id,
        userId: groupMembers.userId,
        contactId: groupMembers.contactId,
        isAdmin: groupMembers.isAdmin,
        isGuest: groupMembers.isGuest,
        nickname: groupMembers.nickname,
        membershipStatus: groupMembers.membershipStatus,
        userName: users.name,
        userAvatar: users.avatar,
        userEmail: users.email,
        userUpiId: users.upiId,
        contactName: contacts.name,
        contactAvatar: contacts.avatar,
      })
      .from(groupMembers)
      .leftJoin(users, eq(groupMembers.userId, users.id))
      .leftJoin(contacts, eq(groupMembers.contactId, contacts.id))
      .where(eq(groupMembers.groupId, groupId));

    // Verify membership authorization
    const currentUserMember = membersList.find((m) => m.userId === user.id);
    const isOwner = groupRecord.createdBy === user.id;

    if (!currentUserMember && !isOwner) {
      throw new AuthorizationError("You are not authorized to view settlements for this group");
    }

    if (!isOwner && currentUserMember?.membershipStatus === "pending") {
      throw new AuthorizationError("Your join request is still pending Group Owner approval.");
    }

    if (!isOwner && currentUserMember?.membershipStatus === "expense_inactive") {
      throw new AuthorizationError("Your expense participation is awaiting Group Owner configuration.");
    }

    // 3. Fetch active expenses for THIS group ONLY (strict group isolation)
    const expensesList = await db
      .select({
        id: transactions.id,
        amount: transactions.amount,
        paidBy: transactions.paidBy,
        paidByContact: transactions.paidByContact,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.groupId, groupId),
          eq(transactions.isDeleted, false)
        )
      );

    // 4. Fetch expense splits
    const txIds = expensesList.map((e) => e.id);
    let allSplits: any[] = [];
    if (txIds.length > 0) {
      allSplits = await db
        .select({
          transactionId: expenseSplits.transactionId,
          userId: expenseSplits.userId,
          contactId: expenseSplits.contactId,
          amount: expenseSplits.amount,
        })
        .from(expenseSplits)
        .where(inArray(expenseSplits.transactionId, txIds));
    }

    // 5. Fetch completed settlements for THIS group ONLY
    const completedSettlementsList = await db
      .select({
        id: settlements.id,
        fromUserId: settlements.fromUserId,
        fromContactId: settlements.fromContactId,
        toUserId: settlements.toUserId,
        toContactId: settlements.toContactId,
        amount: settlements.amount,
      })
      .from(settlements)
      .where(
        and(
          eq(settlements.groupId, groupId),
          eq(settlements.status, "completed"),
          eq(settlements.isDeleted, false)
        )
      );

    // 6. Calculate Net Balances per Member for THIS Group
    const totalGroupExpenseInPaise = expensesList.reduce((sum, e) => sum + e.amount, 0);

    const balances: Balance[] = membersList.map((m) => {
      const memberId = m.userId;
      const contactId = m.contactId;
      const displayName = m.nickname || m.userName || m.contactName || (m.userId ? `User #${m.userId}` : `Contact #${m.contactId}`);

      // Amount paid by this member in group expenses
      const memberPaidPaise = expensesList
        .filter((e) => (memberId && e.paidBy === memberId) || (contactId && e.paidByContact === contactId))
        .reduce((sum, e) => sum + e.amount, 0);

      // Amount assigned to this member via expense splits
      let memberSharePaise = allSplits
        .filter((s) => (memberId && s.userId === memberId) || (contactId && s.contactId === contactId))
        .reduce((sum, s) => sum + s.amount, 0);

      if (allSplits.length === 0 && expensesList.length > 0 && membersList.length > 0) {
        memberSharePaise = Math.round(totalGroupExpenseInPaise / membersList.length);
      }

      // Settlements already paid by this member (reduces debt)
      const settlementPaidPaise = completedSettlementsList
        .filter((s) => (memberId && s.fromUserId === memberId) || (contactId && s.fromContactId === contactId))
        .reduce((sum, s) => sum + Number(s.amount), 0);

      // Settlements already received by this member (reduces credit)
      const settlementReceivedPaise = completedSettlementsList
        .filter((s) => (memberId && s.toUserId === memberId) || (contactId && s.toContactId === contactId))
        .reduce((sum, s) => sum + Number(s.amount), 0);

      // Positive = owed money (creditor), Negative = owes money (debtor)
      const netPaise = (memberPaidPaise - memberSharePaise) + (settlementPaidPaise - settlementReceivedPaise);

      return {
        userId: memberId || undefined,
        contactId: contactId || undefined,
        name: displayName,
        isGuest: Boolean(m.isGuest),
        amount: Math.round(netPaise),
      };
    });

    // 7. Calculate Minimal Debt Flow Transfers
    const optimalSettlements = calculateOptimalSettlements(balances, "INR");

    // 8. Find current user's profile and UPI status
    const [currentUserRecord] = await db
      .select({ upiId: users.upiId, name: users.name })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    const currentUserUpiId = currentUserRecord?.upiId?.trim() || null;
    const isCurrentUserUpiConfigured = Boolean(currentUserUpiId && validateUpiId(currentUserUpiId).isValid);

    // 9. Separate debts owed by current user (myPayables)
    const myOwedTransfers = optimalSettlements.filter(
      (s) => s.fromUserId === user.id && s.amount > 0
    );

    const myPayables: UpiSettlementCardData[] = await Promise.all(
      myOwedTransfers.map(async (st) => {
        const receiverMember = membersList.find(
          (m) => (st.toUserId && m.userId === st.toUserId) || (st.toContactId && m.contactId === st.toContactId)
        );

        const receiverName = receiverMember?.nickname || receiverMember?.userName || receiverMember?.contactName || st.toName || "Member";
        const receiverAvatar = receiverMember?.userAvatar || receiverMember?.contactAvatar || null;
        const receiverUpiId = receiverMember?.userUpiId?.trim() || null;

        // Validation of receiver UPI ID
        let hasValidUpi = false;
        let upiValidationMessage = "Receiver has not added a UPI ID. Ask them to add their UPI ID in Profile Settings.";

        if (receiverUpiId) {
          const val = validateUpiId(receiverUpiId);
          if (val.isValid) {
            hasValidUpi = true;
            upiValidationMessage = "";
          } else {
            upiValidationMessage = val.error || "Receiver's UPI ID is invalid.";
          }
        }

        // Exact amount in rupees rounded to two decimals
        const exactAmountRupees = Math.round(st.amount) / 100;
        const formattedAmount = `₹${exactAmountRupees.toLocaleString("en-IN", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`;

        let upiUri: string | null = null;
        let qrCodeDataUrl: string | null = null;
        let appLinks = {
          gpay: null as string | null,
          phonepe: null as string | null,
          paytm: null as string | null,
          bhim: null as string | null,
          cred: null as string | null,
        };

        if (hasValidUpi && receiverUpiId && exactAmountRupees > 0) {
          try {
            upiUri = buildUpiDeepLink({
              payeeUpiId: receiverUpiId,
              payeeName: receiverName,
              amount: exactAmountRupees,
              currency: "INR",
              transactionNote: `Settlement for ${groupRecord.name.slice(0, 40)}`,
            });

            qrCodeDataUrl = await generateUpiQrCodeDataUrl(upiUri, {
              width: 360,
              margin: 2,
            });

            appLinks = {
              gpay: getAppSpecificUpiLink("gpay", upiUri),
              phonepe: getAppSpecificUpiLink("phonepe", upiUri),
              paytm: getAppSpecificUpiLink("paytm", upiUri),
              bhim: getAppSpecificUpiLink("bhim", upiUri),
              cred: getAppSpecificUpiLink("cred", upiUri),
            };
          } catch (qrErr) {
            console.error("Failed to generate dynamic QR code:", qrErr);
            hasValidUpi = false;
            upiValidationMessage = "Failed to construct valid payment QR code.";
          }
        }

        return {
          receiverId: st.toUserId || (receiverMember?.id ?? 0),
          receiverType: st.toUserId ? "user" : "contact",
          receiverName,
          receiverAvatar,
          receiverUpiId,
          hasValidUpi,
          upiValidationMessage: hasValidUpi ? undefined : upiValidationMessage,
          amount: exactAmountRupees,
          formattedAmount,
          currency: "INR",
          upiUri,
          qrCodeDataUrl,
          appLinks,
          groupId: groupRecord.id,
          groupName: groupRecord.name,
        };
      })
    );

    // 10. Separate debts owed TO current user (myReceivables)
    const myReceivableTransfers = optimalSettlements.filter(
      (s) => s.toUserId === user.id && s.amount > 0
    );

    const myReceivables: UpiReceivableCardData[] = myReceivableTransfers.map((st) => {
      const payerMember = membersList.find(
        (m) => (st.fromUserId && m.userId === st.fromUserId) || (st.fromContactId && m.contactId === st.fromContactId)
      );

      const payerName = payerMember?.nickname || payerMember?.userName || payerMember?.contactName || st.fromName || "Member";
      const payerAvatar = payerMember?.userAvatar || payerMember?.contactAvatar || null;
      const exactAmountRupees = Math.round(st.amount) / 100;

      return {
        payerId: st.fromUserId || (payerMember?.id ?? 0),
        payerType: st.fromUserId ? "user" : "contact",
        payerName,
        payerAvatar,
        amount: exactAmountRupees,
        formattedAmount: `₹${exactAmountRupees.toLocaleString("en-IN", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
        currency: "INR",
        status: "pending",
      };
    });

    const totalPayableAmount = myPayables.reduce((sum, p) => sum + p.amount, 0);
    const totalReceivableAmount = myReceivables.reduce((sum, r) => sum + r.amount, 0);

    // Compute separate financial metrics for current user
    const currentUserPaidPaise = expensesList
      .filter((e) => e.paidBy === user.id)
      .reduce((sum, e) => sum + e.amount, 0);

    let currentUserSharePaise = allSplits
      .filter((s) => s.userId === user.id)
      .reduce((sum, s) => sum + s.amount, 0);

    if (allSplits.length === 0 && expensesList.length > 0 && membersList.length > 0) {
      currentUserSharePaise = Math.round(totalGroupExpenseInPaise / membersList.length);
    }

    const currentUserSettlementPaidPaise = completedSettlementsList
      .filter((s) => s.fromUserId === user.id)
      .reduce((sum, s) => sum + Number(s.amount), 0);

    const currentUserSettlementReceivedPaise = completedSettlementsList
      .filter((s) => s.toUserId === user.id)
      .reduce((sum, s) => sum + Number(s.amount), 0);

    const grossExpensePaid = currentUserPaidPaise / 100;
    const grossShare = currentUserSharePaise / 100;
    const completedSettlementPaid = currentUserSettlementPaidPaise / 100;
    const completedSettlementReceived = currentUserSettlementReceivedPaise / 100;
    const netBalance = (currentUserPaidPaise - currentUserSharePaise) / 100;
    const totalContribution = (currentUserPaidPaise + currentUserSettlementPaidPaise) / 100;

    const financialBreakdown: MemberFinancialBreakdown = {
      grossExpensePaid,
      grossShare,
      netBalance,
      completedSettlementPaid,
      completedSettlementReceived,
      totalContribution,
      outstandingPayable: totalPayableAmount,
      outstandingReceivable: totalReceivableAmount,
    };

    return {
      success: true,
      groupId: groupRecord.id,
      groupName: groupRecord.name,
      groupCurrency: groupRecord.currency || "INR",
      currentUserId: user.id,
      currentUserUpiId,
      isCurrentUserUpiConfigured,
      myPayables,
      myReceivables,
      totalPayableAmount,
      totalReceivableAmount,
      financialBreakdown,
    };
  } catch (error: any) {
    console.error("Error calculating group settlements:", error);
    return {
      success: false,
      groupId: 0,
      groupName: "",
      groupCurrency: "INR",
      currentUserId: 0,
      currentUserUpiId: null,
      isCurrentUserUpiConfigured: false,
      myPayables: [],
      myReceivables: [],
      totalPayableAmount: 0,
      totalReceivableAmount: 0,
      error: error?.message || "Failed to load settlement details",
    };
  }
}

/**
 * Single Source of Truth: Backend verification endpoint called immediately before QR presentation.
 * Recalculates fresh debt from caller to target receiver, confirms group membership and receiver UPI.
 */
export async function verifyAndGenerateSettlementQrAction(params: {
  groupId: number;
  receiverUserId: number;
}): Promise<{
  success: boolean;
  amount: number;
  receiverName: string;
  receiverUpiId: string;
  upiUri: string;
  qrCodeDataUrl: string;
  error?: string;
}> {
  try {
    const user = await requireAuth();

    // Re-run fresh group settlement calculation
    const groupData = await getGroupUpiSettlementsAction(params.groupId);
    if (!groupData.success) {
      throw new Error(groupData.error || "Failed to calculate group settlement");
    }

    const payable = groupData.myPayables.find((p) => p.receiverId === params.receiverUserId);
    if (!payable) {
      throw new ValidationError("No pending settlement found between you and this member.");
    }

    if (payable.amount <= 0) {
      throw new ValidationError("Settlement is already completed or balance is zero.");
    }

    if (!payable.hasValidUpi || !payable.receiverUpiId) {
      throw new ValidationError(payable.upiValidationMessage || "Receiver has not configured a valid UPI ID.");
    }

    if (!payable.upiUri || !payable.qrCodeDataUrl) {
      throw new ValidationError("Failed to generate dynamic settlement QR code.");
    }

    return {
      success: true,
      amount: payable.amount,
      receiverName: payable.receiverName,
      receiverUpiId: payable.receiverUpiId,
      upiUri: payable.upiUri,
      qrCodeDataUrl: payable.qrCodeDataUrl,
    };
  } catch (error: any) {
    return {
      success: false,
      amount: 0,
      receiverName: "",
      receiverUpiId: "",
      upiUri: "",
      qrCodeDataUrl: "",
      error: error?.message || "Failed to verify settlement",
    };
  }
}

/**
 * Record a peer-to-peer settlement payment as completed.
 * Invalidates the dynamic QR immediately by updating group balance and revalidating cache paths.
 */
export async function recordUpiSettlementPaymentAction(data: {
  groupId: number;
  receiverUserId: number;
  amount: number; // in rupees
  utrNumber?: string;
  notes?: string;
}): Promise<{ success: boolean; settlementId: number }> {
  try {
    const user = await requireAuth();

    if (!data.amount || data.amount <= 0) {
      throw new ValidationError("Payment amount must be greater than zero");
    }

    // Verify user is an active member of this group
    const [membership] = await db
      .select({ 
        id: groupMembers.id,
        membershipStatus: groupMembers.membershipStatus 
      })
      .from(groupMembers)
      .where(
        and(
          eq(groupMembers.groupId, data.groupId),
          eq(groupMembers.userId, user.id)
        )
      )
      .limit(1);

    if (!membership) {
      throw new AuthorizationError("You are not a member of this group");
    }

    if (membership.membershipStatus !== "active") {
      throw new AuthorizationError("Your expense participation is awaiting Group Owner configuration.");
    }

    // Amount in paise
    const amountInPaise = Math.round(data.amount * 100);

    const [insertedSettlement] = await db
      .insert(settlements)
      .values({
        publicId: generatePublicId(),
        groupId: data.groupId,
        fromUserId: user.id,
        toUserId: data.receiverUserId,
        amount: amountInPaise,
        currency: "INR",
        paymentMethod: "UPI",
        status: "completed",
        paidAt: new Date(),
        notes: data.notes?.trim() || (data.utrNumber ? `UPI Ref/UTR: ${data.utrNumber.trim()}` : "Direct UPI Transfer"),
      })
      .returning();

    // Record settlement history & audit log
    try {
      const [receiver] = await db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, data.receiverUserId))
        .limit(1);

      await db.insert(settlementHistory).values({
        publicId: generatePublicId(),
        settlementId: insertedSettlement.id,
        groupId: data.groupId,
        fromUserId: user.id,
        fromName: user.name || "Member",
        toUserId: data.receiverUserId,
        toName: receiver?.name || "Member",
        amount: amountInPaise,
        currency: "INR",
        paymentMethod: "UPI",
        transactionReference: data.utrNumber?.trim() || null,
        reason: "Dynamic UPI QR Settlement payment completed",
        notes: data.notes?.trim() || null,
        approvedBy: user.id,
        approvedByName: user.name || "Payer",
        approvedDate: new Date(),
        previousBalance: -amountInPaise,
        newBalance: 0,
      });

      await db.insert(auditLogs).values({
        userId: user.id,
        action: "settle",
        entityType: "settlement",
        entityId: insertedSettlement.id,
        changes: {
          groupId: data.groupId,
          toUserId: data.receiverUserId,
          amount: data.amount,
          paymentMethod: "UPI",
          utrNumber: data.utrNumber || null,
        },
      });
    } catch (logErr) {
      console.warn("Non-critical error logging settlement history:", logErr);
    }

    // Real-Time Revalidation: invalidate stale cached amounts immediately
    revalidatePath(`/dashboard/groups/${data.groupId}`);
    revalidatePath(`/dashboard/groups/${data.groupId}/settlements`);
    revalidatePath("/dashboard/settlements");
    revalidatePath("/dashboard");

    return { success: true, settlementId: insertedSettlement.id };
  } catch (error: any) {
    if (error instanceof ValidationError || error instanceof AuthorizationError) {
      throw error;
    }
    throw new DatabaseError("Failed to record settlement payment", { originalError: error });
  }
}

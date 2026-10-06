"use server";

import { db } from "@/lib/db";
import { 
  users, 
  profiles, 
  groups, 
  groupMembers, 
  transactions, 
  settlements,
  auditLogs,
  receipts
} from "@/lib/db/schema/schema";
import { eq, and, sql, desc, or, gte, lte, inArray } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";
import { eventBus } from "@/lib/realtime/event-bus";
import { DatabaseError, ValidationError, NotFoundError } from "@/lib/errors";

export interface ProfileDetails {
  user: {
    id: number;
    publicId: string;
    clerkUserId: string;
    email: string;
    name: string | null;
    avatar: string | null;
    defaultCurrency: string;
    theme: string | null;
    emailVerified: boolean | null;
    createdAt: Date;
  };
  profile: {
    username: string | null;
    bio: string | null;
    occupation: string | null;
    company: string | null;
    gender: string | null;
    dateOfBirth: Date | null;
    country: string | null;
    state: string | null;
    city: string | null;
    pinCode: string | null;
    phone: string | null;
    secondaryEmail: string | null;
    secondaryPhone: string | null;
    whatsappNumber: string | null;
    emergencyContact: string | null;
    mobileVerified: boolean;
    accountStatus: string;
    timezone: string;
    language: string;
    privacySettings: {
      showEmail?: boolean;
      showPhone?: boolean;
      showBio?: boolean;
      showActivity?: boolean;
      showGroups?: boolean;
      showFinancials?: boolean;
    };
  };
  completion: {
    percentage: number;
    missingFields: string[];
    suggestions: string[];
  };
  financialSummary: {
    totalReceivable: number;
    totalPayable: number;
    netBalance: number;
    personalTransactionsCount: number;
    groupTransactionsCount: number;
    monthlySpending: number;
    monthlyIncome: number;
    pendingSettlementsCount: number;
    completedSettlementsCount: number;
    groupsJoinedCount: number;
    uniqueMembersConnected: number;
    receiptsUploadedCount: number;
    reportsExportedCount: number;
  };
  groupsSummary: Array<{
    id: number;
    publicId: string;
    name: string;
    role: string;
    totalMembers: number;
    totalExpenses: number;
    userContribution: number;
    userShare: number;
    netBalance: number;
    lastActivity: Date | null;
  }>;
  recentActivity: Array<{
    id: number;
    action: string;
    entityType: string;
    title: string;
    description: string;
    createdAt: Date;
  }>;
  analytics: {
    daysActive: number;
    averageMonthlyActivity: number;
    topExpenseCategory: string;
    largestExpenseAmount: number;
    largestSettlementAmount: number;
  };
}

/**
 * SECTION 1 & 10: Get full profile details, dynamic completion % and financial stats
 */
export async function getProfileDetails(): Promise<ProfileDetails> {
  try {
    const authUser = await requireAuth();

    // 1. Fetch User & Profile
    const [userRow] = await db
      .select()
      .from(users)
      .where(eq(users.id, authUser.id))
      .limit(1);

    if (!userRow) throw new NotFoundError("User");

    let [profileRow] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, authUser.id))
      .limit(1);

    // Create profile if missing
    if (!profileRow) {
      const [newProfile] = await db
        .insert(profiles)
        .values({
          userId: authUser.id,
          accountStatus: "active",
          timezone: "Asia/Kolkata",
          language: "en",
          country: "India",
        })
        .returning();
      profileRow = newProfile;
    }

    // 2. Calculate dynamic Profile Completion %
    const missing: string[] = [];
    const suggestions: string[] = [];
    let score = 0;

    if (userRow.avatar) {
      score += 15;
    } else {
      missing.push("Profile Photo");
      suggestions.push("Upload a profile photo (+15%)");
    }

    if (userRow.name && userRow.name.trim().length > 0) {
      score += 10;
    } else {
      missing.push("Display Name");
      suggestions.push("Add your full display name (+10%)");
    }

    if (userRow.emailVerified) {
      score += 15;
    } else {
      missing.push("Email Verification");
      suggestions.push("Verify your primary email address (+15%)");
    }

    if (profileRow.phone && profileRow.mobileVerified) {
      score += 15;
    } else if (profileRow.phone) {
      score += 5;
      missing.push("Mobile Verification");
      suggestions.push("Verify your mobile number (+10%)");
    } else {
      missing.push("Mobile Number");
      suggestions.push("Add and verify your mobile number (+15%)");
    }

    if (profileRow.bio && profileRow.bio.trim().length > 10) {
      score += 10;
    } else {
      missing.push("Biography");
      suggestions.push("Write a short bio about yourself (+10%)");
    }

    if (profileRow.city && profileRow.country) {
      score += 10;
    } else {
      missing.push("Location");
      suggestions.push("Set your city and country (+10%)");
    }

    if (profileRow.occupation || profileRow.company) {
      score += 10;
    } else {
      missing.push("Occupation / Company");
      suggestions.push("Add your professional details (+10%)");
    }

    if (profileRow.timezone) score += 10;
    if (profileRow.language) score += 5;

    const completionPercentage = Math.min(100, Math.max(0, score));

    // 3. Live Financial Summary (SECTION 7)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Personal & Group transactions
    const [txStats] = await db
      .select({
        personalCount: sql<number>`COUNT(CASE WHEN ${transactions.groupId} IS NULL AND ${transactions.userId} = ${authUser.id} THEN 1 END)`,
        groupCount: sql<number>`COUNT(CASE WHEN ${transactions.groupId} IS NOT NULL AND ${transactions.paidBy} = ${authUser.id} THEN 1 END)`,
        monthlySpendPaise: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.date} >= ${startOfMonth} AND ${transactions.type} = 'paid' AND ${transactions.paidBy} = ${authUser.id} THEN ${transactions.amount} ELSE 0 END), 0)`,
        monthlyIncomePaise: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.date} >= ${startOfMonth} AND ${transactions.type} = 'received' AND ${transactions.userId} = ${authUser.id} THEN ${transactions.amount} ELSE 0 END), 0)`,
        largestExpensePaise: sql<number>`COALESCE(MAX(CASE WHEN ${transactions.paidBy} = ${authUser.id} THEN ${transactions.amount} ELSE 0 END), 0)`,
      })
      .from(transactions)
      .where(and(eq(transactions.isDeleted, false)));

    // Settlements
    const [settleStats] = await db
      .select({
        pendingCount: sql<number>`COUNT(CASE WHEN ${settlements.status} = 'pending' AND (${settlements.fromUserId} = ${authUser.id} OR ${settlements.toUserId} = ${authUser.id}) THEN 1 END)`,
        completedCount: sql<number>`COUNT(CASE WHEN ${settlements.status} = 'completed' AND (${settlements.fromUserId} = ${authUser.id} OR ${settlements.toUserId} = ${authUser.id}) THEN 1 END)`,
        receivablePaise: sql<number>`COALESCE(SUM(CASE WHEN ${settlements.status} = 'pending' AND ${settlements.toUserId} = ${authUser.id} THEN ${settlements.amount} ELSE 0 END), 0)`,
        payablePaise: sql<number>`COALESCE(SUM(CASE WHEN ${settlements.status} = 'pending' AND ${settlements.fromUserId} = ${authUser.id} THEN ${settlements.amount} ELSE 0 END), 0)`,
        largestSettlePaise: sql<number>`COALESCE(MAX(CASE WHEN ${settlements.fromUserId} = ${authUser.id} OR ${settlements.toUserId} = ${authUser.id} THEN ${settlements.amount} ELSE 0 END), 0)`,
      })
      .from(settlements);

    // Connected groups & members
    const userGroups = await db
      .select({
        id: groups.id,
        publicId: groups.publicId,
        name: groups.name,
        isAdmin: groupMembers.isAdmin,
        isGuest: groupMembers.isGuest,
      })
      .from(groups)
      .innerJoin(groupMembers, eq(groups.id, groupMembers.groupId))
      .where(and(eq(groupMembers.userId, authUser.id), eq(groups.isDeleted, false)));

    const groupIds = userGroups.map((g) => g.id);

    let uniqueConnectedMembers = 0;
    if (groupIds.length > 0) {
      const [membersCount] = await db
        .select({ count: sql<number>`COUNT(DISTINCT ${groupMembers.userId})` })
        .from(groupMembers)
        .where(inArray(groupMembers.groupId, groupIds));
      uniqueConnectedMembers = Number(membersCount?.count || 0);
    }

    // Receipts count (scoped to user transactions)
    const [receiptCount] = await db
      .select({ count: sql<number>`COUNT(DISTINCT ${receipts.id})` })
      .from(receipts)
      .innerJoin(transactions, eq(receipts.transactionId, transactions.id))
      .where(
        and(
          eq(transactions.isDeleted, false),
          or(eq(transactions.paidBy, authUser.id), eq(transactions.userId, authUser.id))
        )
      );

    // Reports count
    const [reportsCount] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(auditLogs)
      .where(and(eq(auditLogs.userId, authUser.id), eq(auditLogs.action, "report_export")));

    const receivableRupees = Number(settleStats?.receivablePaise || 0) / 100;
    const payableRupees = Number(settleStats?.payablePaise || 0) / 100;
    const netBalance = receivableRupees - payableRupees;

    // 4. Groups Summary (SECTION 8)
    const groupsSummary = userGroups.map((g) => ({
      id: g.id,
      publicId: g.publicId,
      name: g.name,
      role: g.isAdmin ? "admin" : g.isGuest ? "guest" : "member",
      totalMembers: 1,
      totalExpenses: 0,
      userContribution: 0,
      userShare: 0,
      netBalance: 0,
      lastActivity: null,
    }));

    // 5. Recent Activity Snapshot (SECTION 9: up to 20 events)
    const recentLogs = await db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        entityType: auditLogs.entityType,
        beforeData: auditLogs.beforeData,
        afterData: auditLogs.afterData,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .where(eq(auditLogs.userId, authUser.id))
      .orderBy(desc(auditLogs.createdAt))
      .limit(20);

    const recentActivity = recentLogs.map((l: any) => ({
      id: l.id,
      action: l.action,
      entityType: l.entityType,
      title: l.action.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
      description: `Performed ${l.action.replace(/_/g, " ")} on ${l.entityType}.`,
      createdAt: l.createdAt,
    }));

    // 6. Analytics
    const daysActive = Math.max(1, Math.floor((Date.now() - new Date(userRow.createdAt).getTime()) / (1000 * 60 * 60 * 24)));

    return {
      user: {
        id: userRow.id,
        publicId: userRow.publicId || `usr_${userRow.id}`,
        clerkUserId: userRow.clerkUserId,
        email: userRow.email,
        name: userRow.name,
        avatar: userRow.avatar,
        defaultCurrency: userRow.defaultCurrency || "INR",
        theme: userRow.theme,
        emailVerified: userRow.emailVerified,
        createdAt: userRow.createdAt,
      },
      profile: {
        username: profileRow.username,
        bio: profileRow.bio,
        occupation: profileRow.occupation,
        company: profileRow.company,
        gender: profileRow.gender,
        dateOfBirth: profileRow.dateOfBirth,
        country: profileRow.country || "India",
        state: profileRow.state,
        city: profileRow.city,
        pinCode: profileRow.pinCode,
        phone: profileRow.phone,
        secondaryEmail: profileRow.secondaryEmail,
        secondaryPhone: profileRow.secondaryPhone,
        whatsappNumber: profileRow.whatsappNumber,
        emergencyContact: profileRow.emergencyContact,
        mobileVerified: profileRow.mobileVerified || false,
        accountStatus: profileRow.accountStatus || "active",
        timezone: profileRow.timezone || "Asia/Kolkata",
        language: profileRow.language || "en",
        privacySettings: (profileRow.privacySettings as any) || {
          showEmail: true,
          showPhone: false,
          showBio: true,
          showActivity: true,
          showGroups: true,
          showFinancials: false,
        },
      },
      completion: {
        percentage: completionPercentage,
        missingFields: missing,
        suggestions,
      },
      financialSummary: {
        totalReceivable: receivableRupees,
        totalPayable: payableRupees,
        netBalance,
        personalTransactionsCount: Number(txStats?.personalCount || 0),
        groupTransactionsCount: Number(txStats?.groupCount || 0),
        monthlySpending: Number(txStats?.monthlySpendPaise || 0) / 100,
        monthlyIncome: Number(txStats?.monthlyIncomePaise || 0) / 100,
        pendingSettlementsCount: Number(settleStats?.pendingCount || 0),
        completedSettlementsCount: Number(settleStats?.completedCount || 0),
        groupsJoinedCount: userGroups.length,
        uniqueMembersConnected: uniqueConnectedMembers,
        receiptsUploadedCount: Number(receiptCount?.count || 0),
        reportsExportedCount: Number(reportsCount?.count || 0),
      },
      groupsSummary,
      recentActivity,
      analytics: {
        daysActive,
        averageMonthlyActivity: Math.round(Number(txStats?.personalCount || 0) + Number(txStats?.groupCount || 0)),
        topExpenseCategory: "Dining & Food",
        largestExpenseAmount: Number(txStats?.largestExpensePaise || 0) / 100,
        largestSettlementAmount: Number(settleStats?.largestSettlePaise || 0) / 100,
      },
    };
  } catch (error) {
    console.error("Failed to fetch profile details:", error);
    throw new DatabaseError("Failed to fetch profile details", { originalError: error });
  }
}

/**
 * SECTION 4: Update Personal Information
 */
export async function updatePersonalInfo(data: {
  name: string;
  username?: string;
  bio?: string;
  occupation?: string;
  company?: string;
  gender?: string;
  dateOfBirth?: string | Date;
  country?: string;
  state?: string;
  city?: string;
  pinCode?: string;
  timezone?: string;
  language?: string;
  defaultCurrency?: string;
}) {
  try {
    const user = await requireAuth();

    if (!data.name || data.name.trim().length === 0) {
      throw new ValidationError("Name is required");
    }

    // Update user display name & currency
    await db
      .update(users)
      .set({
        name: data.name.trim(),
        defaultCurrency: data.defaultCurrency || "INR",
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    // Update extended profile
    await db
      .update(profiles)
      .set({
        username: data.username?.trim() || null,
        bio: data.bio?.trim() || null,
        occupation: data.occupation?.trim() || null,
        company: data.company?.trim() || null,
        gender: data.gender || null,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        country: data.country || "India",
        state: data.state?.trim() || null,
        city: data.city?.trim() || null,
        pinCode: data.pinCode?.trim() || null,
        timezone: data.timezone || "Asia/Kolkata",
        language: data.language || "en",
        updatedAt: new Date(),
      })
      .where(eq(profiles.userId, user.id));

    // Audit log
    await recordAuditLog({
      userId: user.id,
      action: "profile_updated",
      entityType: "profile",
      entityId: user.id,
      changes: data,
    });

    // Real-time broadcast
    eventBus.broadcast({
      channel: `user:${user.id}`,
      type: "activity_logged",
      payload: { action: "profile_updated" },
    });

    return { success: true };
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    throw new DatabaseError("Failed to update personal information", { originalError: error });
  }
}

/**
 * SECTION 5: Update Contact Information
 */
export async function updateContactInfo(data: {
  phone?: string;
  secondaryEmail?: string;
  secondaryPhone?: string;
  whatsappNumber?: string;
  emergencyContact?: string;
}) {
  try {
    const user = await requireAuth();

    await db
      .update(profiles)
      .set({
        phone: data.phone?.trim() || null,
        secondaryEmail: data.secondaryEmail?.trim() || null,
        secondaryPhone: data.secondaryPhone?.trim() || null,
        whatsappNumber: data.whatsappNumber?.trim() || null,
        emergencyContact: data.emergencyContact?.trim() || null,
        updatedAt: new Date(),
      })
      .where(eq(profiles.userId, user.id));

    await recordAuditLog({
      userId: user.id,
      action: "contact_info_updated",
      entityType: "profile",
      entityId: user.id,
      changes: data,
    });

    return { success: true };
  } catch (error) {
    throw new DatabaseError("Failed to update contact information", { originalError: error });
  }
}

/**
 * SECTION 3: Update Profile Avatar
 */
export async function updateProfileAvatar(avatarUrl: string) {
  try {
    const user = await requireAuth();

    await db
      .update(users)
      .set({
        avatar: avatarUrl,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    await recordAuditLog({
      userId: user.id,
      action: "avatar_updated",
      entityType: "user",
      entityId: user.id,
    });

    eventBus.broadcast({
      channel: `user:${user.id}`,
      type: "activity_logged",
      payload: { action: "avatar_updated", avatar: avatarUrl },
    });

    return { success: true, avatar: avatarUrl };
  } catch (error) {
    throw new DatabaseError("Failed to update avatar", { originalError: error });
  }
}

/**
 * SECTION 3: Delete Profile Avatar
 */
export async function deleteProfileAvatar() {
  try {
    const user = await requireAuth();

    await db
      .update(users)
      .set({
        avatar: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    await recordAuditLog({
      userId: user.id,
      action: "avatar_deleted",
      entityType: "user",
      entityId: user.id,
    });

    eventBus.broadcast({
      channel: `user:${user.id}`,
      type: "activity_logged",
      payload: { action: "avatar_deleted", avatar: null },
    });

    return { success: true };
  } catch (error) {
    throw new DatabaseError("Failed to delete avatar", { originalError: error });
  }
}

/**
 * SECTION 11: Update Profile Privacy Settings
 */
export async function updateProfilePrivacy(settings: {
  showEmail?: boolean;
  showPhone?: boolean;
  showBio?: boolean;
  showActivity?: boolean;
  showGroups?: boolean;
  showFinancials?: boolean;
}) {
  try {
    const user = await requireAuth();

    await db
      .update(profiles)
      .set({
        privacySettings: settings,
        updatedAt: new Date(),
      })
      .where(eq(profiles.userId, user.id));

    await recordAuditLog({
      userId: user.id,
      action: "privacy_settings_updated",
      entityType: "profile",
      entityId: user.id,
      changes: settings,
    });

    return { success: true };
  } catch (error) {
    throw new DatabaseError("Failed to update privacy settings", { originalError: error });
  }
}

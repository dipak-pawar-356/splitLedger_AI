import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { groups, groupMembers, settlements, users, contacts, groupJoinRequests } from "@/lib/db/schema/schema";
import { eq, and, desc, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle, XCircle, Clock } from "lucide-react";
import { formatCurrency, formatDate, isDbIntegerId } from "@/lib/utils";
import Link from "next/link";
import { redirect } from "next/navigation";
import { markSettlementAsPaid, markSettlementAsPaidFormAction } from "@/actions/settlements";
import { GroupUpiSettlementHub } from "@/components/settlement/group-upi-settlement-hub";

import { GroupRouteErrorView } from "@/components/group/group-route-error-view";
import { PendingGroupAccessView } from "@/components/group/pending-group-access-view";

export const dynamic = 'force-dynamic';

export default async function GroupSettlementsPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  const { id: publicId } = await params;

  const strId = String(publicId).trim();
  const isDbId = isDbIntegerId(publicId);
  const [groupRecord] = await db
    .select()
    .from(groups)
    .where(
      isDbId
        ? or(eq(groups.publicId, strId), eq(groups.id, Number(strId)), eq(groups.legacyPublicId, strId))
        : or(eq(groups.publicId, strId), eq(groups.legacyPublicId, strId))
    )
    .limit(1);

  if (!groupRecord) {
    return <GroupRouteErrorView errorType="not_found" groupIdentifier={publicId} />;
  }

  if (groupRecord.isDeleted) {
    return <GroupRouteErrorView errorType="deleted" groupIdentifier={publicId} groupName={groupRecord.name} />;
  }

  const group = groupRecord;
  const groupId = group.id;
  const isOwner = group.createdBy === user.id;

  // Check user membership and pending request before fetching settlements (REQUIREMENT 2)
  const [userMembership] = await db
    .select({
      id: groupMembers.id,
      membershipStatus: groupMembers.membershipStatus,
      isAdmin: groupMembers.isAdmin,
    })
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, user.id)))
    .limit(1);

  const [userPendingRequest] = await db
    .select({ id: groupJoinRequests.id })
    .from(groupJoinRequests)
    .where(
      and(
        eq(groupJoinRequests.groupId, groupId),
        eq(groupJoinRequests.userId, user.id),
        eq(groupJoinRequests.status, "pending")
      )
    )
    .limit(1);

  if (!isOwner) {
    if (!userMembership && !userPendingRequest) {
      return (
        <GroupRouteErrorView 
          errorType="access_denied" 
          groupIdentifier={publicId} 
          groupName={group.name} 
          groupId={group.id} 
        />
      );
    }

    if (userMembership?.membershipStatus !== "active" || userPendingRequest) {
      return <PendingGroupAccessView groupName={group.name} groupLogo={group.coverImage} />;
    }
  }

  // Create table aliases for self-joins
  const fromUsers = alias(users, "from_users");
  const fromContacts = alias(contacts, "from_contacts");
  const toUsers = alias(users, "to_users");
  const toContacts = alias(contacts, "to_contacts");

  const [members, settlementsList] = await Promise.all([
    db
      .select({
        id: groupMembers.id,
        isAdmin: groupMembers.isAdmin,
        isGuest: groupMembers.isGuest,
        nickname: groupMembers.nickname,
        userId: groupMembers.userId,
        contactId: groupMembers.contactId,
        userName: users.name,
        userAvatar: users.avatar,
        contactName: contacts.name,
        contactAvatar: contacts.avatar,
      })
      .from(groupMembers)
      .leftJoin(users, eq(groupMembers.userId, users.id))
      .leftJoin(contacts, eq(groupMembers.contactId, contacts.id))
      .where(eq(groupMembers.groupId, groupId)),
    db
      .select({
        id: settlements.id,
        publicId: settlements.publicId,
        amount: settlements.amount,
        currency: settlements.currency,
        status: settlements.status,
        paidAt: settlements.paidAt,
        fromUserId: settlements.fromUserId,
        fromContactId: settlements.fromContactId,
        toUserId: settlements.toUserId,
        toContactId: settlements.toContactId,
        fromUserName: fromUsers.name,
        fromContactName: fromContacts.name,
        toUserName: toUsers.name,
        toContactName: toContacts.name,
      })
      .from(settlements)
      .leftJoin(fromUsers, eq(settlements.fromUserId, fromUsers.id))
      .leftJoin(fromContacts, eq(settlements.fromContactId, fromContacts.id))
      .leftJoin(toUsers, eq(settlements.toUserId, toUsers.id))
      .leftJoin(toContacts, eq(settlements.toContactId, toContacts.id))
      .where(
        and(
          eq(settlements.groupId, groupId),
          eq(settlements.isDeleted, false)
        )
      )
      .orderBy(desc(settlements.createdAt)),
  ]);

  const currentUserMember = members.find(m => m.userId === user.id);
  const isAdmin = currentUserMember?.isAdmin || isOwner;

  const pendingSettlements = settlementsList.filter(s => s.status === "pending");
  const completedSettlements = settlementsList.filter(s => s.status === "completed");

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link href={`/dashboard/groups/${publicId}`} className="flex items-center text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 mb-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Group
          </Link>
          <h1 className="text-3xl font-bold">{group.name} - Settlements</h1>
          <p className="text-slate-600 dark:text-slate-400">Track and manage group settlements</p>
        </div>
      </div>

      {/* Dynamic UPI Settlements Hub */}
      <div className="mb-8">
        <GroupUpiSettlementHub
          groupId={group.id}
          groupName={group.name}
        />
      </div>

      {/* Pending Settlements */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-600" />
            Pending Settlements ({pendingSettlements.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingSettlements.length === 0 ? (
            <div className="text-center py-8 text-slate-600 dark:text-slate-400">
              No pending settlements
            </div>
          ) : (
            <div className="space-y-4">
              {pendingSettlements.map((settlement) => {
                const isFromUser = settlement.fromUserId === user.id;
                const isToUser = settlement.toUserId === user.id;
                const canMarkPaid = isFromUser || isToUser || isAdmin;

                return (
                  <div key={settlement.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                        <Clock className="h-6 w-6 text-orange-600" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {settlement.fromUserName || settlement.fromContactName || "Unknown"} 
                          {" → "}
                          {settlement.toUserName || settlement.toContactName || "Unknown"}
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {formatCurrency(settlement.amount / 100, settlement.currency)}
                        </p>
                      </div>
                    </div>
                    {canMarkPaid && (
                      <form action={markSettlementAsPaidFormAction.bind(null, settlement.publicId || settlement.id)}>
                        <Button type="submit" size="sm">
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Mark as Paid
                        </Button>
                      </form>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Completed Settlements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Completed Settlements ({completedSettlements.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {completedSettlements.length === 0 ? (
            <div className="text-center py-8 text-slate-600 dark:text-slate-400">
              No completed settlements yet
            </div>
          ) : (
            <div className="space-y-4">
              {completedSettlements.map((settlement) => (
                <div key={settlement.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {settlement.fromUserName || settlement.fromContactName || "Unknown"} 
                        {" → "}
                        {settlement.toUserName || settlement.toContactName || "Unknown"}
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {formatCurrency(settlement.amount / 100, settlement.currency)}
                        {" • "}
                        Paid on {settlement.paidAt ? formatDate(settlement.paidAt) : "N/A"}
                      </p>
                    </div>
                  </div>
                  <div className="text-green-600 font-medium">
                    ✓ Paid
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

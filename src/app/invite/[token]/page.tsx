import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { invitations, groups, groupMembers, users, contacts, settlements, transactions, expenseSplits } from "@/lib/db/schema/schema";
import { eq, sql, and } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, DollarSign, Calendar, AlertTriangle, CheckCircle, XCircle, LogIn, ArrowRight, Shield } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";

export const dynamic = 'force-dynamic';

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const internalUser = await getCurrentUser();

  // Find the invitation by token
  const [invitation] = await db
    .select()
    .from(invitations)
    .where(eq(invitations.token, token))
    .limit(1);

  if (!invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-900">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="h-5 w-5" />
              Invalid Invitation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600 dark:text-slate-400 mb-4 text-sm">
              This invitation link is invalid or has expired.
            </p>
            <Link href="/dashboard">
              <Button className="w-full font-semibold">Go to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get group details
  const [group] = await db
    .select()
    .from(groups)
    .where(and(eq(groups.id, invitation.groupId), eq(groups.isDeleted, false)))
    .limit(1);

  if (!group) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-900">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="h-5 w-5" />
              Group Not Found
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600 dark:text-slate-400 mb-4 text-sm">
              The group associated with this invitation is no longer active.
            </p>
            <Link href="/dashboard">
              <Button className="w-full font-semibold">Go to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if user is already a member
  let isAlreadyMember = false;
  if (internalUser) {
    const [existingMember] = await db
      .select()
      .from(groupMembers)
      .where(and(eq(groupMembers.groupId, group.id), eq(groupMembers.userId, internalUser.id)))
      .limit(1);
    if (existingMember) {
      isAlreadyMember = true;
    }
  }

  // If already member, give instant redirect
  if (isAlreadyMember) {
    redirect(`/dashboard/groups/${group.publicId}`);
  }

  // Get member count and inviter details
  const memberCountResult = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(groupMembers)
    .where(eq(groupMembers.groupId, group.id));
  
  const memberCount = memberCountResult[0]?.count || 0;

  const [inviter] = await db
    .select({ name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, invitation.invitedBy))
    .limit(1);

  async function handleJoin() {
    "use server";
    const userToJoin = await getCurrentUser();
    if (!userToJoin) {
      redirect(`/sign-in?redirect_url=/invite/${token}`);
    }

    try {
      // Update invitation status (only if dedicated personal invite, not general public share/QR link)
      if (invitation.email !== "invite@splitledger.app") {
        await db
          .update(invitations)
          .set({ 
            status: 'accepted',
            acceptedAt: new Date(),
            mergedUserId: userToJoin.id,
            updatedAt: new Date()
          })
          .where(eq(invitations.id, invitation.id));
      }

      // If there was a guest contact, merge it
      if (invitation.guestContactId) {
        await db
          .update(groupMembers)
          .set({
            userId: userToJoin.id,
            contactId: null,
            isGuest: false,
          })
          .where(eq(groupMembers.contactId, invitation.guestContactId));

        await db
          .update(settlements)
          .set({
            fromUserId: userToJoin.id,
            fromContactId: null,
          })
          .where(eq(settlements.fromContactId, invitation.guestContactId));

        await db
          .update(settlements)
          .set({
            toUserId: userToJoin.id,
            toContactId: null,
          })
          .where(eq(settlements.toContactId, invitation.guestContactId));

        await db
          .update(expenseSplits)
          .set({
            userId: userToJoin.id,
            contactId: null,
          })
          .where(eq(expenseSplits.contactId, invitation.guestContactId));

        await db
          .update(transactions)
          .set({
            paidBy: userToJoin.id,
            paidByContact: null,
          })
          .where(eq(transactions.paidByContact, invitation.guestContactId));

        await db
          .update(contacts)
          .set({ isArchived: true })
          .where(eq(contacts.id, invitation.guestContactId));
      } else {
        const [existing] = await db
          .select()
          .from(groupMembers)
          .where(and(eq(groupMembers.groupId, group.id), eq(groupMembers.userId, userToJoin.id)))
          .limit(1);

        if (!existing) {
          await db.insert(groupMembers).values({
            groupId: group.id,
            userId: userToJoin.id,
            isAdmin: false,
            isGuest: false,
            joinedAt: new Date(),
          });
        }
      }

      revalidatePath(`/dashboard/groups/${group.publicId}`);
      revalidatePath(`/dashboard/groups/${group.id}`);
      revalidatePath('/dashboard/groups');
      revalidatePath('/dashboard');
    } catch (error) {
      console.error('Error joining group:', error);
      throw error;
    }

    redirect(`/dashboard/groups/${group.publicId}`);
  }

  async function handleDecline() {
    "use server";
    try {
      if (invitation.email !== "invite@splitledger.app") {
        await db
          .update(invitations)
          .set({ 
            status: 'rejected',
            rejectedAt: new Date(),
            updatedAt: new Date()
          })
          .where(eq(invitations.id, invitation.id));
      }

      revalidatePath('/dashboard');
    } catch (error) {
      console.error('Error declining invitation:', error);
      throw error;
    }

    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-900">
      <Card className="max-w-xl w-full shadow-lg border-slate-200 dark:border-slate-800">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mb-3 text-primary">
            <Users className="h-7 w-7" />
          </div>
          <CardTitle className="text-2xl font-extrabold tracking-tight">You&apos;re Invited to Join</CardTitle>
          <CardDescription className="text-base font-bold text-primary mt-1">
            {group.name}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 pt-2">
          {group.description && (
            <p className="text-center text-xs text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/60 p-3 rounded-lg">
              {group.description}
            </p>
          )}

          {/* Group Details Card */}
          <div className="bg-slate-50 dark:bg-slate-900/80 p-4 rounded-xl space-y-3 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Invited by</span>
              <span className="font-bold">{inviter?.name || "A Group Member"}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Group Category</span>
              <span className="font-bold capitalize">{group.type}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Active Members</span>
              <span className="font-bold">{memberCount} members</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Currency</span>
              <span className="font-bold font-mono">₹ INR</span>
            </div>
          </div>

          {/* Action Buttons */}
          {internalUser ? (
            <div className="flex flex-col gap-2 pt-2">
              <form action={handleJoin}>
                <Button type="submit" className="w-full font-bold text-sm py-5 shadow-sm">
                  Accept & Join Group
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </form>
              <form action={handleDecline}>
                <Button type="submit" variant="ghost" className="w-full text-xs text-slate-500 hover:text-red-600">
                  Decline Invitation
                </Button>
              </form>
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              <Link href={`/sign-in?redirect_url=/invite/${token}`} className="block">
                <Button className="w-full font-bold text-sm py-5 shadow-sm">
                  <LogIn className="mr-2 h-4 w-4" />
                  Sign In to Join Group
                </Button>
              </Link>
              <p className="text-center text-[11px] text-slate-500">
                Don&apos;t have an account?{" "}
                <Link href={`/sign-up?redirect_url=/invite/${token}`} className="text-primary font-bold hover:underline">
                  Sign up for free
                </Link>
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

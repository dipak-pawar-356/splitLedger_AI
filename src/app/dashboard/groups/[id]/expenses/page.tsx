import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { groups, groupMembers, transactions, users, contacts } from "@/lib/db/schema/schema";
import { eq, and, desc } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, TrendingUp, TrendingDown, FileText, Trash2 } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";
import { redirect } from "next/navigation";
import { GroupExpenseDialog } from "@/components/dialogs/group-expense-dialog";
import { deleteTransaction, deleteTransactionFormAction } from "@/actions/transactions";
import { alias } from "drizzle-orm/pg-core";

export const dynamic = 'force-dynamic';

export default async function GroupExpensesPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  const { id: publicId } = await params;

  const isNumeric = /^\d+$/.test(publicId);
  const [groupRecord] = await db
    .select()
    .from(groups)
    .where(
      and(
        isNumeric ? eq(groups.id, Number(publicId)) : eq(groups.publicId, publicId),
        eq(groups.isDeleted, false)
      )
    )
    .limit(1);

  if (!groupRecord) {
    redirect("/dashboard/groups");
  }

  const groupId = groupRecord.id;
  const groupData = groupRecord;
  const creatorUsers = alias(users, "creator_users");

  const [members, expenses] = await Promise.all([
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
        id: transactions.id,
        publicId: transactions.publicId,
        type: transactions.type,
        amount: transactions.amount,
        currency: transactions.currency,
        description: transactions.description,
        date: transactions.date,
        status: transactions.status,
        createdBy: transactions.createdBy,
        paidBy: transactions.paidBy,
        paidByContact: transactions.paidByContact,
        userName: users.name,
        contactName: contacts.name,
        creatorName: creatorUsers.name,
      })
      .from(transactions)
      .leftJoin(users, eq(transactions.paidBy, users.id))
      .leftJoin(contacts, eq(transactions.paidByContact, contacts.id))
      .leftJoin(creatorUsers, eq(transactions.createdBy, creatorUsers.id))
      .where(and(eq(transactions.groupId, groupId), eq(transactions.isDeleted, false)))
      .orderBy(desc(transactions.date)),
  ]);

  // Check if current user is member
  const currentUserMember = members.find(m => m.userId === user.id);
  if (!currentUserMember && groupData.createdBy !== user.id) {
    redirect("/dashboard/groups");
  }

  const isAdmin = currentUserMember?.isAdmin || groupData.createdBy === user.id;

  // Transform members to match GroupExpenseDialog expected type
  const mappedMembers = members.map((member) => ({
    id: member.id,
    userId: member.userId || undefined,
    contactId: member.contactId || undefined,
    userName: member.userName || undefined,
    contactName: member.contactName || undefined,
    isAdmin: member.isAdmin,
    isGuest: member.isGuest,
    nickname: member.nickname || undefined,
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link href={`/dashboard/groups/${groupData.publicId}`} className="flex items-center text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 mb-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Group
          </Link>
          <h1 className="text-3xl font-bold">{groupData.name} - Expenses</h1>
          <p className="text-slate-600 dark:text-slate-400">All group expenses</p>
        </div>
        <GroupExpenseDialog 
          groupId={groupId}
          groupCurrency={groupData.currency}
          members={mappedMembers}
          currentUserId={user.id}
          isAdmin={isAdmin}
          trigger={
            <Button>
              Add Expense
            </Button>
          }
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Expenses ({expenses.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {expenses.map((expense) => {
              const isPositive = expense.type === "received" || expense.type === "lent";
              const canEdit = expense.createdBy === user.id || expense.paidBy === user.id || isAdmin;
              return (
                <div key={expense.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isPositive ? "bg-green-100 dark:bg-green-900/30 text-green-600" : "bg-red-100 dark:bg-red-900/30 text-red-600"}`}>
                      {isPositive ? <TrendingUp className="h-6 w-6" /> : <TrendingDown className="h-6 w-6" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-lg">{expense.description}</p>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${isPositive ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300" : "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300"}`}>
                          {expense.type}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                        <span>
                          <span className="font-medium">Paid by:</span> {expense.userName || expense.contactName || "Unknown"}
                        </span>
                        <span>
                          <span className="font-medium">Added by:</span> {expense.creatorName || "Unknown"}
                        </span>
                        <span>
                          <span className="font-medium">Date:</span> {formatDate(expense.date)}
                        </span>
                        {expense.status !== "completed" && (
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            expense.status === "pending" ? "bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300" :
                            "bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300"
                          }`}>
                            {expense.status}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className={`text-xl font-bold ${isPositive ? "text-green-600" : "text-red-600"}`}>
                      {isPositive ? "+" : "-"}
                      {formatCurrency(expense.amount / 100, expense.currency)}
                    </div>
                    {canEdit && (
                      <div className="flex gap-2">
                        <Link href={`/dashboard/transactions/${expense.publicId}`}>
                          <Button variant="ghost" size="sm">
                            <FileText className="h-4 w-4" />
                          </Button>
                        </Link>
                        <form action={deleteTransactionFormAction.bind(null, expense.publicId)}>
                          <Button variant="ghost" size="sm" type="submit">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </form>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {expenses.length === 0 && (
              <div className="text-center py-12">
                <p className="text-slate-600 dark:text-slate-400">No expenses yet</p>
                <p className="text-sm text-slate-500 dark:text-slate-500 mt-2">Add your first expense to get started</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

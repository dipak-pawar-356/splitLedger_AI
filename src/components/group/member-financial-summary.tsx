"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatCurrency, formatDate } from "@/lib/utils";
import { 
  TrendingUp, 
  TrendingDown, 
  Receipt, 
  User, 
  Shield, 
  Bell, 
  Mail,
  Plus, 
  Trash2, 
  ArrowUpRight, 
  ArrowDownLeft, 
  CheckCircle2, 
  ExternalLink,
  BookOpen,
  QrCode,
  Smartphone,
  History,
  AlertCircle,
  ShieldCheck,
  ArrowRightLeft,
  Wallet,
  PieChart,
  Calendar,
  Clock,
  Users
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { UpiQuickPayDialog } from "@/components/settlement/upi-quick-pay-dialog";
import { ReminderDialog } from "@/components/dialogs/reminder-dialog";
import { MemberProfileModal } from "@/components/group/member-profile-modal";
import { MemberPermissionsDialog } from "@/components/group/member-permissions-dialog";
import { ReceiverAssignmentDialog } from "@/components/dialogs/receiver-assignment-dialog";
import { SettleAllDialog } from "@/components/dialogs/settle-all-dialog";
import { removeGroupMember, updateMemberRole, toggleMemberExpenseParticipationAction } from "@/actions/group-members";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { type MemberFinancialDetail } from "@/actions/group-financials";

interface MemberFinancialSummaryProps {
  member: MemberFinancialDetail;
  groupId: number;
  groupPublicId: string;
  groupName: string;
  isCurrentUserAdmin?: boolean;
  isGroupOwner?: boolean;
  currentUserId?: number;
  currentUserEmail?: string;
  onAddExpenseWithMember?: (member: MemberFinancialDetail) => void;
  totalGroupExpense?: number;
  totalMembers?: number;
  allMembers?: MemberFinancialDetail[];
  splitMethod?: string;
}

export function MemberFinancialSummary({ 
  member, 
  groupId,
  groupPublicId,
  groupName,
  isCurrentUserAdmin = false,
  isGroupOwner = false,
  currentUserId,
  currentUserEmail,
  onAddExpenseWithMember,
  totalGroupExpense,
  totalMembers,
  allMembers = [],
  splitMethod = "equal",
}: MemberFinancialSummaryProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [pendingParticipationToggle, setPendingParticipationToggle] = useState(false);
  const [isChangingParticipation, setIsChangingParticipation] = useState(false);
  const [isRoleUpdating, setIsRoleUpdating] = useState(false);

  const isCurrentUser = Boolean(
    (member.userId && currentUserId && member.userId === currentUserId) ||
    (member.email && currentUserEmail && member.email.toLowerCase().trim() === currentUserEmail.toLowerCase().trim())
  );

  const totalPendingOutgoing = member.owesTo.reduce((sum, o) => sum + o.amount, 0);
  const totalPendingIncoming = member.receivesFrom.reduce((sum, r) => sum + r.amount, 0);

  // Single source of truth: aggregated active receiver allocations
  const effectiveNeedToPay = totalPendingOutgoing > 0.01 ? totalPendingOutgoing : member.needToPay;
  const effectiveWillReceive = totalPendingIncoming > 0.01 ? totalPendingIncoming : member.willReceive;

  const isReceivable = effectiveWillReceive > 0.01;
  const isPayable = effectiveNeedToPay > 0.01;
  const isSettled = !isReceivable && !isPayable;
  const hasPendingSettlement = isReceivable || isPayable;

  // Single source of truth for own share: respects equal 1/N dynamic shares and custom allocations
  const effectiveOwnShare = (splitMethod !== "equal" && isPayable && (member.totalPaid + effectiveNeedToPay > member.ownShare))
    ? (member.totalPaid + effectiveNeedToPay) 
    : member.ownShare;

  const handleRemove = async () => {
    if (!confirm(`Are you sure you want to remove ${member.name} from this group?`)) return;
    setIsDeleting(true);
    try {
      await removeGroupMember(member.id, groupPublicId);
      toast.success(`${member.name} removed from group`);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to remove member");
    } finally {
      setIsDeleting(false);
    }
  };

  const isHistoricalIncluded =
    member.role === "owner" || member.historicalInclusionDecision !== "excluded";

  const canChangeParticipation = Boolean(
    (isGroupOwner || isCurrentUserAdmin) && member.role !== "owner"
  );

  const handleConfirmParticipationChange = async () => {
    setIsChangingParticipation(true);
    try {
      const res = await toggleMemberExpenseParticipationAction({
        groupIdOrPublicId: groupPublicId,
        memberId: member.id,
        includePreviousExpenses: pendingParticipationToggle,
      });
      toast.success(
        `Expense participation updated for ${member.name}. Recalculated ${res.affectedExpenseCount} historical expenses.`
      );
      setConfirmModalOpen(false);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to update expense participation");
    } finally {
      setIsChangingParticipation(false);
    }
  };

  const handleToggleAdminRole = async () => {
    setIsRoleUpdating(true);
    try {
      const nextIsAdmin = member.role !== "admin";
      await updateMemberRole(member.id, groupPublicId, nextIsAdmin);
      toast.success(`${member.name} is now ${nextIsAdmin ? "an Admin" : "a regular Member"}`);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to update member role");
    } finally {
      setIsRoleUpdating(false);
    }
  };

  const hasFullSettlementAccess = Boolean(isGroupOwner || isCurrentUser);
  const mutualReceives = member.receivesFrom.filter(
    (r) => currentUserId && r.userId === currentUserId
  );
  const mutualOwes = member.owesTo.filter(
    (o) => currentUserId && o.userId === currentUserId
  );

  return (
    <>
      <Card className={`w-full group hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between overflow-hidden bg-card rounded-3xl ${
        isReceivable 
          ? "border-2 border-emerald-500/60 shadow-md shadow-emerald-500/10 dark:border-emerald-500/50 hover:shadow-2xl hover:shadow-emerald-500/15 hover:border-emerald-400 dark:hover:border-emerald-400" 
          : isPayable 
          ? "border-2 border-rose-500/60 shadow-md shadow-rose-500/10 dark:border-rose-500/50 hover:shadow-2xl hover:shadow-rose-500/15 hover:border-rose-400 dark:hover:border-rose-400" 
          : "border border-slate-200/90 dark:border-slate-800 hover:shadow-xl hover:border-primary/40"
      }`}>
        <div>
          {/* Card Header: Avatar, Name, Role, Badges */}
          <CardHeader className="flex flex-row items-center gap-3.5 p-5 pb-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40">
            <Avatar className={`h-12 w-12 rounded-2xl ring-2 shrink-0 group-hover:scale-105 transition-transform duration-300 ${
              isReceivable 
                ? "ring-emerald-500/40" 
                : isPayable 
                ? "ring-rose-500/40" 
                : "ring-slate-700"
            }`}>
              <AvatarImage src={member.avatar || undefined} className="rounded-2xl" />
              <AvatarFallback className="rounded-2xl font-black bg-primary/20 text-primary text-base">
                {member.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <CardTitle className="text-base font-bold tracking-tight truncate text-slate-900 dark:text-slate-100 group-hover:text-primary transition-colors">
                  {member.name}
                </CardTitle>
                <Badge className="text-[10px] py-0 px-2 font-semibold capitalize bg-primary/20 text-primary border-primary/30 rounded-md">
                  {member.role}
                </Badge>
                {member.isGuest ? (
                  <Badge variant="secondary" className="text-[10px] py-0 px-2 font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-md">
                    Guest
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-[10px] py-0 px-2 font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-md">
                    User
                  </Badge>
                )}
                {member.membershipStatus === "expense_inactive" && (
                  <Badge variant="outline" className="text-[10px] py-0 px-2 font-bold bg-amber-500/10 text-amber-400 border-amber-500/30 rounded-md">
                    Expense Inactive
                  </Badge>
                )}
                {isCurrentUser && (
                  <Badge variant="outline" className="text-[10px] py-0 px-2 font-bold bg-primary/10 text-primary border-primary/30 rounded-md">
                    You
                  </Badge>
                )}
                {member.isPaymentVerified && (
                  <Badge className="text-[10px] py-0 px-2 font-semibold bg-emerald-500/15 text-emerald-400 border-emerald-500/30 gap-1 flex items-center rounded-md">
                    <CheckCircle2 className="h-3 w-3" />
                    Verified
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-400 truncate mt-1 font-mono">
                {member.email || member.phone || (member.isGuest ? "Guest Member" : "Registered User")}
              </p>
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-5 space-y-3.5">
            {/* Net Position Status Banner (Hero Section) */}
            <div className={`p-3.5 sm:p-4 rounded-2xl border transition-all duration-300 space-y-2.5 ${
              isReceivable 
                ? "bg-gradient-to-br from-emerald-500/10 via-emerald-950/20 to-transparent border-emerald-500/30 shadow-xs" 
                : isPayable 
                ? "bg-gradient-to-br from-rose-500/10 via-rose-950/20 to-transparent border-rose-500/30 shadow-xs" 
                : "bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800"
            }`}>
              {/* Banner Top Row: Status Label & Contribution Pill */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  {isReceivable ? (
                    <TrendingUp className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
                  ) : isPayable ? (
                    <Wallet className="h-4 w-4 text-rose-500 dark:text-rose-400" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
                  )}
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Settlement Status
                  </span>
                </div>

                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-300">
                  <PieChart className="h-3 w-3 text-slate-400" />
                  <span className="text-[10px] uppercase font-bold text-slate-400">
                    Contribution
                  </span>
                  <span className="text-xs font-black font-mono text-slate-100">
                    {member.contributionPercentage}%
                  </span>
                </div>
              </div>

              {/* Banner Amount */}
              <div>
                <span className={`text-xl sm:text-2xl font-black font-mono tracking-tight block ${
                  isReceivable 
                    ? "text-emerald-500 dark:text-emerald-400" 
                    : isPayable 
                    ? "text-rose-500 dark:text-rose-400" 
                    : member.isPaymentVerified ? "text-emerald-500 dark:text-emerald-400" : "text-slate-400"
                }`}>
                  {isReceivable 
                    ? `Will Receive ${formatCurrency(effectiveWillReceive)}` 
                    : isPayable 
                    ? `Needs To Pay ${formatCurrency(effectiveNeedToPay)}` 
                    : member.isPaymentVerified ? "Settled & Verified" : "Settled Up"}
                </span>
              </div>

              {/* Dynamic Receiver Assignment & Pairwise Settlement Transfers */}
              {(isCurrentUser || isGroupOwner || isCurrentUserAdmin) && (
                <div className="pt-2 mt-2 border-t border-slate-200/50 dark:border-slate-800/80 space-y-3">
                  {/* Admin action: Assign Receivers for debtor when split method is not equal */}
                  {isPayable && (isGroupOwner || isCurrentUserAdmin) && splitMethod !== "equal" && (
                    <div className="flex items-center justify-between pb-1">
                      <span className="text-xs font-bold text-slate-300">
                        Creditor Allocation
                      </span>
                      <ReceiverAssignmentDialog
                        groupId={groupId}
                        groupPublicId={groupPublicId}
                        debtor={{
                          userId: member.userId,
                          contactId: member.contactId,
                          name: member.name,
                          avatar: member.avatar,
                          totalPaid: member.totalPaid,
                          ownShare: effectiveOwnShare,
                          needToPay: effectiveNeedToPay,
                        }}
                        eligibleReceivers={allMembers
                          .filter((m) => m.id !== member.id && (m.willReceive > 0.01 || m.receivesFrom.length > 0))
                          .map((m) => ({
                            userId: m.userId,
                            contactId: m.contactId,
                            name: m.name,
                            avatar: m.avatar,
                            willReceive: m.willReceive > 0.01 ? m.willReceive : m.receivesFrom.reduce((sum, r) => sum + r.amount, 0),
                          }))}
                        trigger={
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs px-2.5 font-semibold rounded-xl gap-1.5 border-primary/40 text-primary hover:bg-primary/10 shadow-xs transition-all duration-200 hover:-translate-y-0.5"
                          >
                            <ArrowRightLeft className="h-3.5 w-3.5" />
                            <span>Assign Receivers</span>
                          </Button>
                        }
                      />
                    </div>
                  )}

                  {/* Outgoing debts owed by this member (Payer View: e.g. Pay Dipak ₹5,000, Pay Raj ₹2,000) */}
                  {member.owesTo.length > 0 && (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        <span className="flex items-center gap-1.5">
                          <Users className="h-3 w-3 text-rose-400" />
                          Assigned Receivers ({member.owesTo.length})
                        </span>
                      </div>

                      {member.owesTo.map((owe, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-2xl border border-rose-500/20 dark:border-rose-900/40 bg-slate-900/60 dark:bg-slate-950/60 hover:border-rose-500/40 transition-all duration-200 shadow-xs space-y-2.5"
                        >
                          {/* Mini Card Header: Avatar, Name, Amount */}
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="h-8 w-8 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center font-bold text-xs shrink-0">
                                {owe.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <span className="text-xs font-bold text-slate-100 truncate block">
                                  Pay {owe.name}
                                </span>
                                <span className="text-[10px] text-slate-400 block truncate">
                                  Assigned Creditor
                                </span>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <span className="text-sm sm:text-base font-black font-mono text-rose-400">
                                {formatCurrency(owe.amount)}
                              </span>
                            </div>
                          </div>

                          {/* Mini Card Action Strip: QR & Pay Now */}
                          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80">
                            {/* QR */}
                            {owe.userId ? (
                              <UpiQuickPayDialog
                                groupId={groupId}
                                groupName={groupName}
                                receiverUserId={owe.userId}
                                receiverName={owe.name}
                                payerUserId={member.userId || undefined}
                                payerName={member.name}
                                amount={owe.amount}
                                mode="receive"
                                trigger={
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="w-full h-7 text-[11px] font-semibold rounded-lg gap-1 border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 hover:text-indigo-300 transition-all duration-200 hover:-translate-y-0.5 active:scale-95"
                                  >
                                    <QrCode className="h-3 w-3" />
                                    <span>QR</span>
                                  </Button>
                                }
                              />
                            ) : (
                              <Button size="sm" variant="outline" disabled className="w-full h-7 text-[11px] opacity-40">
                                <QrCode className="h-3 w-3" />
                                <span>QR</span>
                              </Button>
                            )}

                            {/* Pay Now */}
                            {owe.userId ? (
                              <UpiQuickPayDialog
                                groupId={groupId}
                                groupName={groupName}
                                receiverUserId={owe.userId}
                                receiverName={owe.name}
                                payerUserId={member.userId || undefined}
                                payerName={member.name}
                                amount={owe.amount}
                                mode="pay"
                                trigger={
                                  <Button
                                    size="sm"
                                    className="w-full h-7 text-[11px] font-bold rounded-lg gap-1 bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-all duration-200 hover:-translate-y-0.5 active:scale-95"
                                  >
                                    <Smartphone className="h-3 w-3" />
                                    <span>Pay Now</span>
                                  </Button>
                                }
                              />
                            ) : (
                              <Button size="sm" disabled className="w-full h-7 text-[11px] opacity-40">
                                <Smartphone className="h-3 w-3" />
                                <span>Pay</span>
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}

                      {/* Bottom Total Pending Liability */}
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-rose-950/40 border border-rose-900/60 text-xs font-bold text-rose-300">
                        <span className="uppercase text-[10px] tracking-wider text-rose-400">Total Pending Liability</span>
                        <span className="font-mono text-sm font-black">{formatCurrency(effectiveNeedToPay)}</span>
                      </div>
                    </div>
                  )}

                  {/* Incoming funds to this member (Receiver View: e.g. Waiting from Kunal ₹2,000) */}
                  {member.receivesFrom.length > 0 && (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        <span className="flex items-center gap-1.5">
                          <Users className="h-3 w-3 text-emerald-400" />
                          Incoming Allocations ({member.receivesFrom.length})
                        </span>
                      </div>

                      {member.receivesFrom.map((rec, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-2xl border border-emerald-500/20 dark:border-emerald-900/40 bg-slate-900/60 dark:bg-slate-950/60 hover:border-emerald-500/40 transition-all duration-200 shadow-xs space-y-2.5"
                        >
                          {/* Mini Card Header: Avatar, Name, Amount */}
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-bold text-xs shrink-0">
                                {rec.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <span className="text-xs font-bold text-slate-100 truncate block">
                                  Waiting from {rec.name}
                                </span>
                                <span className="text-[10px] text-slate-400 block truncate">
                                  Incoming Debt Payment
                                </span>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <span className="text-sm sm:text-base font-black font-mono text-emerald-400">
                                {formatCurrency(rec.amount)}
                              </span>
                            </div>
                          </div>

                          {/* Mini Card Action Strip: Show QR */}
                          {member.userId && (
                            <div className="pt-1 border-t border-slate-800/80">
                              <UpiQuickPayDialog
                                groupId={groupId}
                                groupName={groupName}
                                receiverUserId={member.userId}
                                receiverName={member.name}
                                payerUserId={rec.userId}
                                payerName={rec.name}
                                amount={rec.amount}
                                mode="receive"
                                trigger={
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="w-full h-7 text-[11px] font-semibold rounded-lg gap-1.5 border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 hover:text-indigo-300 transition-all duration-200 hover:-translate-y-0.5 active:scale-95"
                                  >
                                    <QrCode className="h-3 w-3" />
                                    <span>Show QR</span>
                                  </Button>
                                }
                              />
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Bottom Total Pending Receivable */}
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-900/60 text-xs font-bold text-emerald-300">
                        <span className="uppercase text-[10px] tracking-wider text-emerald-400">Total Pending Receivable</span>
                        <span className="font-mono text-sm font-black">{formatCurrency(effectiveWillReceive)}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Financial Metrics Grid: Total Paid & Own Share */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200 space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[10px] uppercase font-bold tracking-wider">Total Paid</span>
                  <Receipt className="h-3.5 w-3.5 text-blue-500" />
                </div>
                <div className="text-sm sm:text-base font-black font-mono text-slate-900 dark:text-slate-100">
                  {formatCurrency(member.totalPaid)}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">
                  {member.expenseCount} {member.expenseCount === 1 ? "expense" : "expenses"}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200 space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[10px] uppercase font-bold tracking-wider">Own Share</span>
                  <PieChart className="h-3.5 w-3.5 text-purple-500" />
                </div>
                <div className="text-sm sm:text-base font-black font-mono text-slate-900 dark:text-slate-100">
                  {formatCurrency(effectiveOwnShare)}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                  {member.extraPaid > 0 ? `+${formatCurrency(member.extraPaid)} extra` : "Base share"}
                </div>
              </div>
            </div>

            {/* Expense Participation Setting */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <History className="h-3.5 w-3.5 text-indigo-500" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Expense Participation
                  </span>
                </div>
                <Badge
                  variant="outline"
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                    isHistoricalIncluded
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                      : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                  }`}
                >
                  {isHistoricalIncluded ? "Included in Past" : "New Expenses Only"}
                </Badge>
              </div>

              <div className="flex items-center justify-between pt-0.5">
                <div className="pr-2">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Included in Previous Expenses
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                    {isHistoricalIncluded
                      ? "Participates in past expenses prior to joining"
                      : "Participates only in expenses incurred after joining"}
                  </p>
                </div>

                {canChangeParticipation ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[11px] font-bold uppercase ${isHistoricalIncluded ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}`}>
                      {isHistoricalIncluded ? "ON" : "OFF"}
                    </span>
                    <Switch
                      checked={isHistoricalIncluded}
                      disabled={isChangingParticipation}
                      onCheckedChange={() => {
                        setPendingParticipationToggle(!isHistoricalIncluded);
                        setConfirmModalOpen(true);
                      }}
                      className={isHistoricalIncluded ? "data-[state=checked]:bg-emerald-600" : ""}
                    />
                  </div>
                ) : (
                  <span className={`text-xs font-bold uppercase shrink-0 ${isHistoricalIncluded ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}`}>
                    {isHistoricalIncluded ? "ON" : "OFF"}
                  </span>
                )}
              </div>
            </div>

            {/* Member Joined Date & Activity */}
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-1 pt-1">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3 w-3 text-slate-400" />
                <span>Joined: {formatDate(member.joinedAt)}</span>
              </div>
              {member.lastActivity && (
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3 w-3 text-slate-400" />
                  <span>Active: {formatDate(member.lastActivity)}</span>
                </div>
              )}
            </div>

            {/* Completed Settlements Paid/Received Row if any */}
            {(Number(member.settledPaid || 0) > 0 || Number(member.settledReceived || 0) > 0) && (
              <div className="grid grid-cols-2 gap-2 text-xs">
                {Number(member.settledPaid || 0) > 0 ? (
                  <div className="p-2.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase block">Settled Paid</span>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                      +{formatCurrency(member.settledPaid || 0)}
                    </span>
                  </div>
                ) : <div />}
                {Number(member.settledReceived || 0) > 0 ? (
                  <div className="p-2.5 rounded-xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-100 dark:border-teal-900/30">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase block">Settled Received</span>
                    <span className="text-xs font-bold text-teal-600 dark:text-teal-400 font-mono">
                      -{formatCurrency(member.settledReceived || 0)}
                    </span>
                  </div>
                ) : <div />}
              </div>
            )}
          </CardContent>
        </div>

        {/* Card Footer Actions */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-xl text-xs h-8 px-3 gap-1.5 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-all duration-200 hover:-translate-y-0.5 active:scale-95"
              onClick={() => setIsProfileModalOpen(true)}
            >
              <User className="h-3.5 w-3.5" />
              <span>Profile</span>
            </Button>

            {/* Contextual Reminder Action:
                IF current user & receivable: "Send Settlement Copy"
                IF member owes money: "Remind to Pay"
                IF member will receive money: "Request Settlement"
                IF settled: Disabled "No Pending Settlements"
            */}
            {isCurrentUser && member.willReceive > 0.01 && (
              <ReminderDialog
                recipientEmail={member.email || undefined}
                recipientPhone={member.phone || undefined}
                recipientName={member.name}
                amount={member.willReceive}
                groupId={groupId}
                groupPublicId={groupPublicId}
                groupName={groupName}
                owesToList={member.owesTo}
                receivesFromList={member.receivesFrom}
                totalGroupExpense={totalGroupExpense}
                totalMembers={totalMembers}
                memberPaidAmount={member.totalPaid}
                memberOwnShare={effectiveOwnShare}
                memberNetPosition={member.netPosition}
                reminderRole="receiver"
                onSuccess={() => router.refresh()}
                trigger={
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-xl text-xs h-8 px-3 gap-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:text-emerald-300 dark:hover:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 font-semibold transition-all duration-200 hover:-translate-y-0.5 active:scale-95"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    <span>Send Settlement Copy</span>
                  </Button>
                }
              />
            )}

            {!isCurrentUser && (
              member.needToPay > 0.01 ? (
                <ReminderDialog
                  recipientEmail={member.email || undefined}
                  recipientPhone={member.phone || undefined}
                  recipientName={member.name}
                  amount={member.needToPay}
                  groupId={groupId}
                  groupPublicId={groupPublicId}
                  groupName={groupName}
                  owesToList={member.owesTo}
                  receivesFromList={member.receivesFrom}
                  totalGroupExpense={totalGroupExpense}
                  totalMembers={totalMembers}
                  memberPaidAmount={member.totalPaid}
                  memberOwnShare={effectiveOwnShare}
                  memberNetPosition={member.netPosition}
                  reminderRole="payer"
                  onSuccess={() => router.refresh()}
                  trigger={
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-xl text-xs h-8 px-3 gap-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:text-rose-300 dark:hover:bg-rose-950/30 border-rose-300 dark:border-rose-800 font-semibold transition-all duration-200 hover:-translate-y-0.5 active:scale-95"
                    >
                      <Bell className="h-3.5 w-3.5" />
                      <span>Remind to Pay</span>
                    </Button>
                  }
                />
              ) : member.willReceive > 0.01 ? (
                <ReminderDialog
                  recipientEmail={member.email || undefined}
                  recipientPhone={member.phone || undefined}
                  recipientName={member.name}
                  amount={member.willReceive}
                  groupId={groupId}
                  groupPublicId={groupPublicId}
                  groupName={groupName}
                  owesToList={member.owesTo}
                  receivesFromList={member.receivesFrom}
                  totalGroupExpense={totalGroupExpense}
                  totalMembers={totalMembers}
                  memberPaidAmount={member.totalPaid}
                  memberOwnShare={effectiveOwnShare}
                  memberNetPosition={member.netPosition}
                  reminderRole="receiver"
                  onSuccess={() => router.refresh()}
                  trigger={
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-xl text-xs h-8 px-3 gap-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:text-emerald-300 dark:hover:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 font-semibold transition-all duration-200 hover:-translate-y-0.5 active:scale-95"
                    >
                      <Mail className="h-3.5 w-3.5" />
                      <span>Request Settlement</span>
                    </Button>
                  }
                />
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled
                  className="rounded-xl text-xs h-8 px-3 gap-1.5 text-slate-400 border-slate-200 dark:border-slate-800 opacity-60 cursor-not-allowed"
                  title="No pending settlements."
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-slate-400" />
                  <span>No Pending Settlements</span>
                </Button>
              )
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {isGroupOwner && !isCurrentUser && member.userId && member.role !== "owner" && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isRoleUpdating}
                className="rounded-xl text-xs h-8 px-2.5 gap-1.5 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 transition-all duration-200 hover:-translate-y-0.5 active:scale-95"
                onClick={handleToggleAdminRole}
                title={member.role === "admin" ? "Demote to Member" : "Promote to Admin"}
              >
                <Shield className={`h-3.5 w-3.5 ${member.role === "admin" ? "text-primary font-bold" : "text-slate-400"}`} />
                <span>{member.role === "admin" ? "Admin" : "Make Admin"}</span>
              </Button>
            )}

            {isGroupOwner && !isCurrentUser && member.userId && member.role !== "owner" && (
              <MemberPermissionsDialog
                groupId={groupId}
                targetUserId={member.userId}
                targetUserName={member.name}
                targetUserEmail={member.email}
                initialPermissions={member.delegatedPermissions || {}}
                canEdit={true}
              />
            )}

            {(isCurrentUserAdmin || isGroupOwner) && !isCurrentUser && member.role !== "owner" && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isDeleting}
                className="rounded-xl text-xs h-8 px-2.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all duration-200 hover:-translate-y-0.5 active:scale-95"
                onClick={handleRemove}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Member Profile Modal (SECTION 11) */}
      <MemberProfileModal
        open={isProfileModalOpen}
        onOpenChange={setIsProfileModalOpen}
        member={member}
        groupName={groupName}
        groupId={groupId}
        isGroupOwner={isGroupOwner}
        currentUserId={currentUserId}
      />

      {/* Recalculation Confirmation Dialog (FEATURE 9) */}
      <Dialog open={confirmModalOpen} onOpenChange={setConfirmModalOpen}>
        <DialogContent className="sm:max-w-[440px] rounded-3xl border shadow-2xl p-6 bg-card">
          <DialogHeader className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-2xl">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Recalculate Group Ledger?
                </DialogTitle>
                <p className="text-xs text-slate-500 font-medium truncate">
                  {member.name} • {pendingParticipationToggle ? "Include in Previous Expenses (ON)" : "New Expenses Only (OFF)"}
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 space-y-2">
              <p className="font-semibold text-slate-900 dark:text-slate-100">
                Changing this setting will
              </p>
              <ul className="space-y-1 text-xs list-disc list-inside text-slate-600 dark:text-slate-400 pl-1">
                <li>Recalculate all balances</li>
                <li>Update settlements</li>
                <li>Update reports</li>
                <li>Update analytics</li>
                <li>Update member contributions</li>
                <li>Update debt optimization</li>
              </ul>
            </div>

            <p className="text-xs text-slate-500 font-medium">
              Continue?
            </p>
          </DialogHeader>

          <DialogFooter className="flex flex-row items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmModalOpen(false)}
              disabled={isChangingParticipation}
              className="rounded-xl px-4 text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmParticipationChange}
              disabled={isChangingParticipation}
              className="rounded-xl px-5 text-xs font-bold bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/20"
            >
              {isChangingParticipation ? "Recalculating..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}


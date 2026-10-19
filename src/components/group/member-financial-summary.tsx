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
  ShieldCheck
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { UpiQuickPayDialog } from "@/components/settlement/upi-quick-pay-dialog";
import { ReminderDialog } from "@/components/dialogs/reminder-dialog";
import { MemberProfileModal } from "@/components/group/member-profile-modal";
import { MemberPermissionsDialog } from "@/components/group/member-permissions-dialog";
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
  totalMembers
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

  const isReceivable = member.netPosition > 0.01;
  const isPayable = member.netPosition < -0.01;
  const isSettled = !isReceivable && !isPayable;
  const hasPendingSettlement =
    member.needToPay > 0.01 ||
    member.willReceive > 0.01 ||
    member.owesTo.length > 0 ||
    member.receivesFrom.length > 0;

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
          ? "border-2 border-emerald-500 shadow-sm shadow-emerald-500/10 dark:border-emerald-500 hover:shadow-xl hover:shadow-emerald-500/15 hover:border-emerald-400 dark:hover:border-emerald-400" 
          : isPayable 
          ? "border-2 border-rose-500 shadow-sm shadow-rose-500/10 dark:border-rose-500 hover:shadow-xl hover:shadow-rose-500/15 hover:border-rose-400 dark:hover:border-rose-400" 
          : "border border-slate-200/90 dark:border-slate-800 hover:shadow-xl hover:border-primary/40"
      }`}>
        <div>
          {/* Card Header: Avatar, Name, Role, Badges */}
          <CardHeader className="flex flex-row items-center gap-3.5 pb-3 pt-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/30">
            <Avatar className="h-12 w-12 border-2 border-white/50 shadow-xs shrink-0 group-hover:scale-105 transition-transform duration-300">
              <AvatarImage src={member.avatar || undefined} />
              <AvatarFallback className="font-bold bg-primary text-white text-base">
                {member.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <CardTitle className="text-sm font-bold tracking-tight truncate text-slate-900 dark:text-slate-100 group-hover:text-primary transition-colors">
                  {member.name}
                </CardTitle>
                <Badge className="text-[10px] py-0 px-1.5 font-semibold capitalize bg-primary/20 text-primary border-primary/30">
                  {member.role}
                </Badge>
                {member.isGuest ? (
                  <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                    Guest
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                    User
                  </Badge>
                )}
                {member.membershipStatus === "expense_inactive" && (
                  <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200 border-amber-300">
                    Expense Inactive
                  </Badge>
                )}
                {isCurrentUser && (
                  <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-bold bg-primary/10 text-primary border-primary/30">
                    You
                  </Badge>
                )}
                {member.isPaymentVerified && (
                  <Badge className="text-[10px] py-0 px-1.5 font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1 flex items-center">
                    <CheckCircle2 className="h-2.5 w-2.5" />
                    Verified
                  </Badge>
                )}
              </div>
              <p className="text-[11px] text-slate-500 truncate mt-0.5">
                {member.email || member.phone || (member.isGuest ? "Guest Member" : "Registered User")}
              </p>
            </div>
          </CardHeader>

          <CardContent className="p-4 space-y-3">
            {/* Net Position Status Banner (SECTIONS 2 & 4) */}
            <div className={`p-3.5 rounded-2xl border-2 transition-all duration-200 group-hover:shadow-xs ${
              isReceivable 
                ? "bg-emerald-50/60 dark:bg-emerald-950/25 border-emerald-500/40 dark:border-emerald-500/50 group-hover:border-emerald-500/70" 
                : isPayable 
                ? "bg-rose-50/60 dark:bg-rose-950/25 border-rose-500/40 dark:border-rose-500/50 group-hover:border-rose-500/70" 
                : "bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800"
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Settlement Status
                  </span>
                  <span className={`text-base font-black tracking-tight mt-0.5 block ${
                    isReceivable ? "text-emerald-600 dark:text-emerald-400" : isPayable ? "text-rose-600 dark:text-rose-400" : member.isPaymentVerified ? "text-emerald-600 dark:text-emerald-400" : "text-slate-600"
                  }`}>
                    {isReceivable 
                      ? `Will Receive ${formatCurrency(member.willReceive)}` 
                      : isPayable 
                      ? `Needs To Pay ${formatCurrency(member.needToPay)}` 
                      : member.isPaymentVerified ? "Settled & Verified" : "Settled Up"}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-semibold text-slate-400 block uppercase">
                    Contribution
                  </span>
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {member.contributionPercentage}%
                  </span>
                </div>
              </div>

              {/* In one row: Show QR if he receives money, and Pay Now when he needs to pay */}
              {(isCurrentUser || isGroupOwner || isCurrentUserAdmin) && (member.receivesFrom.length > 0 || member.owesTo.length > 0) && (
                <div className="pt-2.5 mt-2.5 border-t border-slate-200/70 dark:border-slate-800/80 flex items-center gap-2 flex-wrap">
                  {/* Incoming funds to this member: Show QR */}
                  {member.receivesFrom.length > 0 && member.userId && (
                    <UpiQuickPayDialog
                      groupId={groupId}
                      groupName={groupName}
                      receiverUserId={member.userId}
                      receiverName={member.name}
                      payerUserId={member.receivesFrom[0].userId}
                      payerName={member.receivesFrom[0].name}
                      amount={member.receivesFrom[0].amount}
                      mode="receive"
                      trigger={
                        <Button
                          size="sm"
                          className="flex-1 min-w-[130px] h-7 text-xs px-2.5 font-bold rounded-xl gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                        >
                          <QrCode className="h-3.5 w-3.5" />
                          <span>Show QR (₹{member.receivesFrom[0].amount.toFixed(2)})</span>
                        </Button>
                      }
                    />
                  )}

                  {/* Outgoing funds member owes: Pay Now if current user is debtor; Show QR if admin/owner is viewing */}
                  {member.owesTo.length > 0 && member.owesTo[0].userId && (
                    isCurrentUser ? (
                      <UpiQuickPayDialog
                        groupId={groupId}
                        groupName={groupName}
                        receiverUserId={member.owesTo[0].userId}
                        receiverName={member.owesTo[0].name}
                        payerUserId={member.userId}
                        payerName={member.name}
                        amount={member.owesTo[0].amount}
                        mode="pay"
                        trigger={
                          <Button
                            size="sm"
                            className="flex-1 min-w-[130px] h-7 text-xs px-2.5 font-bold rounded-xl gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                          >
                            <Smartphone className="h-3.5 w-3.5" />
                            <span>Pay Now (₹{member.owesTo[0].amount.toFixed(2)})</span>
                          </Button>
                        }
                      />
                    ) : (
                      <UpiQuickPayDialog
                        groupId={groupId}
                        groupName={groupName}
                        receiverUserId={member.owesTo[0].userId}
                        receiverName={member.owesTo[0].name}
                        payerUserId={member.userId}
                        payerName={member.name}
                        amount={member.owesTo[0].amount}
                        mode="receive"
                        trigger={
                          <Button
                            size="sm"
                            className="flex-1 min-w-[130px] h-7 text-xs px-2.5 font-bold rounded-xl gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                          >
                            <QrCode className="h-3.5 w-3.5" />
                            <span>Show QR (₹{member.owesTo[0].amount.toFixed(2)})</span>
                          </Button>
                        }
                      />
                    )
                  )}
                </div>
              )}
            </div>

            {/* Paid vs Own Share Grid (SECTION 4) */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 hover:border-slate-200 dark:hover:border-slate-700 transition-all duration-200">
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">Total Paid</span>
                <span className="text-xs font-black text-slate-900 dark:text-slate-100 mt-0.5 block">
                  {formatCurrency(member.totalPaid)}
                </span>
                <span className="text-[10px] text-slate-400">{member.expenseCount} expenses</span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 hover:border-slate-200 dark:hover:border-slate-700 transition-all duration-200">
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">Own Share</span>
                <span className="text-xs font-black text-slate-900 dark:text-slate-100 mt-0.5 block">
                  {formatCurrency(member.ownShare)}
                </span>
                <span className="text-[10px] text-slate-400">
                  {member.extraPaid > 0 ? `+${formatCurrency(member.extraPaid)} extra` : "Base share"}
                </span>
              </div>
            </div>

            {/* Expense Participation Setting (FEATURE 3, 4, 8, 9) */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <History className="h-3.5 w-3.5 text-indigo-500" />
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
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
                  <p className="text-[10px] text-slate-400">
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

            {/* Member Details & Timestamps (FEATURE 8) */}
            <div className="flex items-center justify-between text-[10px] text-slate-400 px-1 pt-0.5">
              <span>Joined: {formatDate(member.joinedAt)}</span>
              {member.lastActivity && (
                <span>Updated: {formatDate(member.lastActivity)}</span>
              )}
            </div>

            {/* Completed Settlements Paid/Received Row if any */}
            {(Number(member.settledPaid || 0) > 0 || Number(member.settledReceived || 0) > 0) && (
              <div className="grid grid-cols-2 gap-2 text-xs">
                {Number(member.settledPaid || 0) > 0 ? (
                  <div className="p-2 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase block">Settled Paid</span>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      +{formatCurrency(member.settledPaid || 0)}
                    </span>
                  </div>
                ) : <div />}
                {Number(member.settledReceived || 0) > 0 ? (
                  <div className="p-2 rounded-xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-100 dark:border-teal-900/30">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase block">Settled Received</span>
                    <span className="text-xs font-bold text-teal-600 dark:text-teal-400">
                      -{formatCurrency(member.settledReceived || 0)}
                    </span>
                  </div>
                ) : <div />}
              </div>
            )}

            {/* Pairwise Settlement Details (SECTION 6) - Privacy & RBAC Protected */}
            {hasFullSettlementAccess ? (
              <>
                {member.receivesFrom.length > 0 && (
                  <div className="p-2.5 rounded-xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 text-[11px] space-y-2 hover:border-emerald-300 dark:hover:border-emerald-800 transition-colors">
                    <span className="font-semibold text-emerald-700 dark:text-emerald-400 block">Receives from:</span>
                    {member.receivesFrom.map((r, i) => (
                      <div key={i} className="flex justify-between items-center text-slate-600 dark:text-slate-300 gap-2">
                        <span className="truncate">{r.name}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <strong className="text-emerald-600 font-mono">+{formatCurrency(r.amount)}</strong>
                          {(isCurrentUser || isGroupOwner || isCurrentUserAdmin) && member.userId && (
                            <UpiQuickPayDialog
                              groupId={groupId}
                              groupName={groupName}
                              receiverUserId={member.userId}
                              receiverName={member.name}
                              payerUserId={r.userId}
                              payerName={r.name}
                              amount={r.amount}
                              mode="receive"
                              trigger={
                                <Button
                                  size="sm"
                                  className="h-6 text-[10px] px-2 font-bold rounded-lg gap-1 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                                >
                                  <QrCode className="h-2.5 w-2.5" />
                                  <span>Show QR</span>
                                </Button>
                              }
                            />
                          )}
                          {!isCurrentUser && currentUserId && r.userId === currentUserId && member.userId && (
                            <UpiQuickPayDialog
                              groupId={groupId}
                              groupName={groupName}
                              receiverUserId={member.userId}
                              receiverName={member.name}
                              payerUserId={currentUserId}
                              amount={r.amount}
                              mode="pay"
                              trigger={
                                <Button
                                  size="sm"
                                  className="h-6 text-[10px] px-2 font-bold rounded-lg gap-1 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                                >
                                  <Smartphone className="h-2.5 w-2.5" />
                                  <span>Pay Now</span>
                                </Button>
                              }
                            />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {member.owesTo.length > 0 && (
                  <div className="p-2.5 rounded-xl bg-rose-50/40 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 text-[11px] space-y-2 hover:border-rose-300 dark:hover:border-rose-800 transition-colors">
                    <span className="font-semibold text-rose-700 dark:text-rose-400 block">Needs to pay:</span>
                    {member.owesTo.map((o, i) => (
                      <div key={i} className="flex justify-between items-center text-slate-600 dark:text-slate-300 gap-2">
                        <span className="truncate">{o.name}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <strong className="text-rose-600 font-mono">-{formatCurrency(o.amount)}</strong>
                          {isCurrentUser && o.userId && (
                            <UpiQuickPayDialog
                              groupId={groupId}
                              groupName={groupName}
                              receiverUserId={o.userId}
                              receiverName={o.name}
                              payerUserId={member.userId}
                              payerName={member.name}
                              amount={o.amount}
                              mode="pay"
                              trigger={
                                <Button
                                  size="sm"
                                  className="h-6 text-[10px] px-2 font-bold rounded-lg gap-1 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                                >
                                  <Smartphone className="h-2.5 w-2.5" />
                                  <span>Pay Now</span>
                                </Button>
                              }
                            />
                          )}
                          {!isCurrentUser && o.userId && (o.userId === currentUserId || isGroupOwner || isCurrentUserAdmin) && (
                            <UpiQuickPayDialog
                              groupId={groupId}
                              groupName={groupName}
                              receiverUserId={o.userId}
                              receiverName={o.userId === currentUserId ? "You" : o.name}
                              payerUserId={member.userId}
                              payerName={member.name}
                              amount={o.amount}
                              mode="receive"
                              trigger={
                                <Button
                                  size="sm"
                                  className="h-6 text-[10px] px-2 font-bold rounded-lg gap-1 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                                >
                                  <QrCode className="h-2.5 w-2.5" />
                                  <span>Show QR</span>
                                </Button>
                              }
                            />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                {mutualReceives.length > 0 && (
                  <div className="p-2.5 rounded-xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 text-[11px] space-y-2 hover:border-emerald-300 dark:hover:border-emerald-800 transition-colors">
                    <span className="font-semibold text-emerald-700 dark:text-emerald-400 block">Settlement with you:</span>
                    {mutualReceives.map((r, i) => (
                      <div key={i} className="flex justify-between items-center text-slate-600 dark:text-slate-300 gap-2">
                        <span>Receives from you</span>
                        <div className="flex items-center gap-2">
                          <strong className="text-emerald-600 font-mono">+{formatCurrency(r.amount)}</strong>
                          {member.userId && (
                            <UpiQuickPayDialog
                              groupId={groupId}
                              groupName={groupName}
                              receiverUserId={member.userId}
                              receiverName={member.name}
                              payerUserId={currentUserId}
                              amount={r.amount}
                              mode="pay"
                              trigger={
                                <Button
                                  size="sm"
                                  className="h-6 text-[10px] px-2 font-bold rounded-lg gap-1 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                                >
                                  <Smartphone className="h-2.5 w-2.5" />
                                  <span>Pay Now</span>
                                </Button>
                              }
                            />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {mutualOwes.length > 0 && (
                  <div className="p-2.5 rounded-xl bg-rose-50/40 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 text-[11px] space-y-2 hover:border-rose-300 dark:hover:border-rose-800 transition-colors">
                    <span className="font-semibold text-rose-700 dark:text-rose-400 block">Settlement with you:</span>
                    {mutualOwes.map((o, i) => (
                      <div key={i} className="flex justify-between items-center text-slate-600 dark:text-slate-300 gap-2">
                        <span>Owes to you</span>
                        <div className="flex items-center gap-2">
                          <strong className="text-rose-600 font-mono">-{formatCurrency(o.amount)}</strong>
                          {currentUserId && (
                            <UpiQuickPayDialog
                              groupId={groupId}
                              groupName={groupName}
                              receiverUserId={currentUserId}
                              receiverName="You"
                              payerUserId={member.userId}
                              payerName={member.name}
                              amount={o.amount}
                              mode="receive"
                              trigger={
                                <Button
                                  size="sm"
                                  className="h-6 text-[10px] px-2 font-bold rounded-lg gap-1 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                                >
                                  <QrCode className="h-2.5 w-2.5" />
                                  <span>Show QR</span>
                                </Button>
                              }
                            />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {mutualReceives.length === 0 && mutualOwes.length === 0 && (
                  <div className="p-2.5 rounded-xl bg-slate-50/60 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 text-center hover:border-slate-200 dark:hover:border-slate-700 transition-colors">
                    <span>Settlement details visible to owner & member</span>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </div>

        {/* Card Footer Actions (SECTION 5) */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-between gap-1.5 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-xl text-[11px] h-7 px-2.5 gap-1"
              onClick={() => setIsProfileModalOpen(true)}
            >
              <User className="h-3 w-3" />
              <span>Profile</span>
            </Button>

            {/* If Current User is owed money, allow them to view or send their own settlement summary directly */}
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
                memberOwnShare={member.ownShare}
                memberNetPosition={member.netPosition}
                reminderRole="receiver"
                onSuccess={() => router.refresh()}
                trigger={
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-xl text-[11px] h-7 px-2.5 gap-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50 font-bold"
                  >
                    <Mail className="h-3 w-3" />
                    <span>Send Settlement Copy</span>
                  </Button>
                }
              />
            )}

            {/* Contextual Reminder Action:
                IF member.netPosition < -0.01 (owes money): "🔔 Remind to Pay"
                IF member.netPosition > 0.01 (will receive money): "📨 Request Settlement"
                IF member.netPosition == 0: Disabled "✓ No Pending Settlements"
            */}
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
                  memberOwnShare={member.ownShare}
                  memberNetPosition={member.netPosition}
                  reminderRole="payer"
                  onSuccess={() => router.refresh()}
                  trigger={
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-xl text-[11px] h-7 px-2.5 gap-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 border-rose-200 dark:border-rose-900/50 font-bold"
                    >
                      <Bell className="h-3 w-3" />
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
                  memberOwnShare={member.ownShare}
                  memberNetPosition={member.netPosition}
                  reminderRole="receiver"
                  onSuccess={() => router.refresh()}
                  trigger={
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-xl text-[11px] h-7 px-2.5 gap-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50 font-bold"
                    >
                      <Mail className="h-3 w-3" />
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
                  className="rounded-xl text-[11px] h-7 px-2.5 gap-1 text-slate-400 border-slate-200 dark:border-slate-800 opacity-60 cursor-not-allowed"
                  title="No pending settlements."
                >
                  <CheckCircle2 className="h-3 w-3 text-slate-400" />
                  <span>No Pending Settlements</span>
                </Button>
              )
            )}
          </div>

          <div className="flex items-center gap-1">
            {isGroupOwner && !isCurrentUser && member.userId && member.role !== "owner" && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isRoleUpdating}
                className="rounded-xl text-[11px] h-7 px-2 gap-1 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100"
                onClick={handleToggleAdminRole}
                title={member.role === "admin" ? "Demote to Member" : "Promote to Admin"}
              >
                <Shield className={`h-3 w-3 ${member.role === "admin" ? "text-primary font-bold" : "text-slate-400"}`} />
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
                className="rounded-xl text-[11px] h-7 px-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                onClick={handleRemove}
              >
                <Trash2 className="h-3 w-3" />
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


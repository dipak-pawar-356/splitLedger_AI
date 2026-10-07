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
  Plus, 
  Trash2, 
  ArrowUpRight, 
  ArrowDownLeft, 
  CheckCircle2, 
  ExternalLink,
  BookOpen
} from "lucide-react";
import { ReminderDialog } from "@/components/dialogs/reminder-dialog";
import { MemberProfileModal } from "@/components/group/member-profile-modal";
import { removeGroupMember } from "@/actions/group-members";
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
  onAddExpenseWithMember 
}: MemberFinancialSummaryProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

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

  return (
    <>
      <Card className="w-full hover:shadow-md transition-all duration-200 border-slate-200/90 dark:border-slate-800 flex flex-col justify-between overflow-hidden bg-card rounded-3xl">
        <div>
          {/* Card Header: Avatar, Name, Role, Badges */}
          <CardHeader className="flex flex-row items-center gap-3.5 pb-3 pt-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/30">
            <Avatar className="h-12 w-12 border-2 border-white/50 shadow-xs shrink-0">
              <AvatarImage src={member.avatar || undefined} />
              <AvatarFallback className="font-bold bg-primary text-white text-base">
                {member.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <CardTitle className="text-sm font-bold tracking-tight truncate text-slate-900 dark:text-slate-100">
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
            <div className={`p-3.5 rounded-2xl border transition-colors ${
              isReceivable 
                ? "bg-emerald-50/60 dark:bg-emerald-950/25 border-emerald-200 dark:border-emerald-900/60" 
                : isPayable 
                ? "bg-rose-50/60 dark:bg-rose-950/25 border-rose-200 dark:border-rose-900/60" 
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
            </div>

            {/* Paid vs Own Share Grid (SECTION 4) */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80">
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">Total Paid</span>
                <span className="text-xs font-black text-slate-900 dark:text-slate-100 mt-0.5 block">
                  {formatCurrency(member.totalPaid)}
                </span>
                <span className="text-[10px] text-slate-400">{member.expenseCount} expenses</span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80">
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">Own Share</span>
                <span className="text-xs font-black text-slate-900 dark:text-slate-100 mt-0.5 block">
                  {formatCurrency(member.ownShare)}
                </span>
                <span className="text-[10px] text-slate-400">
                  {member.extraPaid > 0 ? `+${formatCurrency(member.extraPaid)} extra` : "Base share"}
                </span>
              </div>
            </div>

            {/* Pairwise Settlement Details (SECTION 6) */}
            {member.receivesFrom.length > 0 && (
              <div className="p-2.5 rounded-xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 text-[11px] space-y-1">
                <span className="font-semibold text-emerald-700 dark:text-emerald-400 block">Receives from:</span>
                {member.receivesFrom.map((r, i) => (
                  <div key={i} className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span>{r.name}</span>
                    <strong className="text-emerald-600 font-mono">+{formatCurrency(r.amount)}</strong>
                  </div>
                ))}
              </div>
            )}

            {member.owesTo.length > 0 && (
              <div className="p-2.5 rounded-xl bg-rose-50/40 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 text-[11px] space-y-1">
                <span className="font-semibold text-rose-700 dark:text-rose-400 block">Needs to pay:</span>
                {member.owesTo.map((o, i) => (
                  <div key={i} className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span>{o.name}</span>
                    <strong className="text-rose-600 font-mono">-{formatCurrency(o.amount)}</strong>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </div>

        {/* Card Footer Actions (SECTION 5) */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-between gap-1.5 flex-wrap">
          <div className="flex items-center gap-1">
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

            {/* Remind Action: Never show for respective current user. Show for group owner & other members when there are pending or incoming settlement amounts */}
            {!isCurrentUser && hasPendingSettlement && (
              <ReminderDialog
                recipientEmail={member.email || undefined}
                recipientPhone={member.phone || undefined}
                recipientName={member.name}
                amount={member.needToPay > 0 ? member.needToPay : member.willReceive}
                groupId={groupId}
                groupPublicId={groupPublicId}
                groupName={groupName}
                owesToList={member.owesTo}
                receivesFromList={member.receivesFrom}
                trigger={
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-xl text-[11px] h-7 px-2 gap-1 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                  >
                    <Bell className="h-3 w-3" />
                    <span>Remind</span>
                  </Button>
                }
              />
            )}
          </div>

          {(isCurrentUserAdmin || isGroupOwner) && member.role !== "owner" && (
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
      </Card>

      {/* Member Profile Modal (SECTION 11) */}
      <MemberProfileModal
        open={isProfileModalOpen}
        onOpenChange={setIsProfileModalOpen}
        member={member}
        groupName={groupName}
      />
    </>
  );
}

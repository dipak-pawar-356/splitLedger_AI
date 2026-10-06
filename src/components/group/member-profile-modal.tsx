"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { 
  User, 
  Mail, 
  Phone, 
  Shield, 
  Receipt, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Calendar,
  DollarSign
} from "lucide-react";
import { type MemberFinancialDetail } from "@/actions/group-financials";

interface MemberProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: MemberFinancialDetail | null;
  groupName: string;
}

export function MemberProfileModal({
  open,
  onOpenChange,
  member,
  groupName,
}: MemberProfileModalProps) {
  if (!member) return null;

  const isReceive = member.netPosition > 0;
  const isPay = member.netPosition < 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] rounded-3xl border shadow-2xl p-0 overflow-hidden">
        {/* Top Header Background */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 text-white relative">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-white/20 shadow-md">
              <AvatarImage src={member.avatar || undefined} />
              <AvatarFallback className="text-xl font-bold bg-primary text-white">
                {member.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-bold text-white tracking-tight">{member.name}</h3>
                <Badge className="text-[10px] capitalize font-semibold bg-primary/30 text-indigo-200 border-primary/40">
                  {member.role}
                </Badge>
                <Badge variant="secondary" className="text-[10px] font-semibold">
                  {member.isGuest ? "Guest Contact" : "Registered User"}
                </Badge>
              </div>
              {member.email && (
                <p className="text-xs text-slate-300 flex items-center gap-1.5">
                  <Mail className="h-3 w-3 inline text-slate-400" />
                  <span>{member.email}</span>
                </p>
              )}
              {member.phone && (
                <p className="text-xs text-slate-300 flex items-center gap-1.5">
                  <Phone className="h-3 w-3 inline text-slate-400" />
                  <span>{member.phone}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Financial Metrics Grid */}
        <div className="p-6 space-y-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
              Financial Position in {groupName}
            </span>

            <div className="grid grid-cols-2 gap-3">
              {/* Total Paid */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">Total Paid</span>
                <span className="text-base font-black text-slate-900 dark:text-slate-100 mt-0.5 block">
                  {formatCurrency(member.totalPaid)}
                </span>
                <span className="text-[10px] text-slate-400">{member.expenseCount} recorded expenses</span>
              </div>

              {/* Own Share */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">Own Share</span>
                <span className="text-base font-black text-slate-900 dark:text-slate-100 mt-0.5 block">
                  {formatCurrency(member.ownShare)}
                </span>
                <span className="text-[10px] text-slate-400">{member.contributionPercentage}% group contribution</span>
              </div>

              {/* Net Balance */}
              <div className={`col-span-2 p-4 rounded-2xl border ${
                isReceive 
                  ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40" 
                  : isPay 
                  ? "bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40" 
                  : "bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800"
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">
                      Net Group Position
                    </span>
                    <span className={`text-xl font-black mt-0.5 block ${
                      isReceive ? "text-emerald-600 dark:text-emerald-400" : isPay ? "text-rose-600 dark:text-rose-400" : "text-slate-700"
                    }`}>
                      {isReceive 
                        ? `Will Receive ${formatCurrency(member.willReceive)}` 
                        : isPay 
                        ? `Needs To Pay ${formatCurrency(member.needToPay)}` 
                        : "Settled Up"}
                    </span>
                  </div>

                  <div className="text-right text-xs">
                    {member.receivesFrom.length > 0 && (
                      <span className="text-emerald-600 font-semibold block">
                        Receives from {member.receivesFrom.length} members
                      </span>
                    )}
                    {member.owesTo.length > 0 && (
                      <span className="text-rose-600 font-semibold block">
                        Owes to {member.owesTo.length} members
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Calendar className="h-3 w-3 inline" />
            <span>Member joined on {formatDate(member.joinedAt)}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

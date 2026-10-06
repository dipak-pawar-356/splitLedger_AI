"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { 
  Users, 
  Receipt, 
  Clock, 
  FileCheck, 
  Calendar, 
  ArrowUpRight, 
  ArrowDownLeft, 
  CheckCircle2, 
  DollarSign,
  Tag
} from "lucide-react";

interface GroupOverviewBannerProps {
  group: {
    id: number;
    publicId: string;
    name: string;
    description?: string | null;
    type: string;
    currency: string;
    createdAt: Date | string;
    isOwner: boolean;
    isAdmin: boolean;
  };
  overview: {
    totalMembers: number;
    activeMembers: number;
    guestMembers: number;
    totalExpenses: number;
    totalSettlements: number;
    pendingSettlementsCount: number;
    pendingSettlementsAmount: number;
    userContribution: number;
    userShare: number;
    userNetBalance: number;
    userStatus: "will_receive" | "need_to_pay" | "settled";
    statusText: string;
  };
}

export function GroupOverviewBanner({ group, overview }: GroupOverviewBannerProps) {
  const isReceive = overview.userStatus === "will_receive";
  const isPay = overview.userStatus === "need_to_pay";

  return (
    <div className="space-y-4">
      {/* Top Banner Card */}
      <Card className="rounded-3xl border shadow-sm bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white overflow-hidden relative">
        <div className="absolute right-0 top-0 w-80 h-full bg-primary/20 blur-3xl pointer-events-none" />

        <CardContent className="p-6 sm:p-7 space-y-6 relative z-10">
          {/* Header Info */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  {group.name}
                </h1>
                <Badge className="bg-primary/30 text-indigo-200 border-primary/40 text-xs capitalize font-medium">
                  <Tag className="h-3 w-3 mr-1 inline" />
                  {group.type}
                </Badge>
                {group.isOwner && (
                  <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs font-medium">
                    Owner
                  </Badge>
                )}
              </div>
              {group.description && (
                <p className="text-xs text-slate-300 mt-1 max-w-2xl font-normal">
                  {group.description}
                </p>
              )}
              <p className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-1.5">
                <Calendar className="h-3 w-3 inline" />
                <span>Created {formatDate(group.createdAt)}</span>
                <span>•</span>
                <span>{overview.totalMembers} members ({overview.activeMembers} registered, {overview.guestMembers} guests)</span>
              </p>
            </div>

            {/* Total Group Expense */}
            <div className="text-left md:text-right shrink-0">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Total Group Expenses
              </span>
              <span className="text-3xl font-black text-white tracking-tight">
                {formatCurrency(overview.totalExpenses)}
              </span>
            </div>
          </div>

          {/* User's Exact Financial Position in this Group (SECTION 1 & 2) */}
          <div className={`p-4 rounded-2xl border transition-all ${
            isReceive 
              ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-100"
              : isPay
              ? "bg-rose-950/40 border-rose-500/40 text-rose-100"
              : "bg-white/10 border-white/20 text-slate-200"
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  Your Net Group Balance
                </span>
                <div className="text-lg sm:text-xl font-bold flex items-center gap-2">
                  {isReceive && <ArrowUpRight className="h-5 w-5 text-emerald-400 shrink-0" />}
                  {isPay && <ArrowDownLeft className="h-5 w-5 text-rose-400 shrink-0" />}
                  {!isReceive && !isPay && <CheckCircle2 className="h-5 w-5 text-slate-400 shrink-0" />}
                  <span className={isReceive ? "text-emerald-400" : isPay ? "text-rose-400" : "text-white"}>
                    {overview.statusText}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-6 text-xs border-t sm:border-t-0 pt-3 sm:pt-0 border-white/10">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block">Your Contribution</span>
                  <span className="font-bold text-sm text-white">{formatCurrency(overview.userContribution)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block">Your Share</span>
                  <span className="font-bold text-sm text-white">{formatCurrency(overview.userShare)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1 border-t border-white/10">
            <div>
              <span className="text-[10px] text-slate-400 uppercase block">Settled Amount</span>
              <span className="font-bold text-sm text-teal-400">{formatCurrency(overview.totalSettlements)}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase block">Pending Settlements</span>
              <span className="font-bold text-sm text-amber-400">
                {formatCurrency(overview.pendingSettlementsAmount)} ({overview.pendingSettlementsCount})
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase block">Active Members</span>
              <span className="font-bold text-sm text-white">{overview.activeMembers} Users</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase block">Guest Members</span>
              <span className="font-bold text-sm text-white">{overview.guestMembers} Guests</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

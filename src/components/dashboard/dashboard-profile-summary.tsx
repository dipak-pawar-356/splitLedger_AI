"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { User, Users, Calendar, ArrowRight, CheckCircle2, Shield } from "lucide-react";
import Link from "next/link";

interface DashboardProfileSummaryProps {
  user: {
    id: number;
    name: string;
    email: string;
    avatar?: string | null;
    createdAt: Date | string;
    profileCompletion: number;
  };
  totalGroups: number;
  netBalance: number;
}

export function DashboardProfileSummary({
  user,
  totalGroups,
  netBalance,
}: DashboardProfileSummaryProps) {
  const isPositive = netBalance >= 0;

  return (
    <Card className="rounded-3xl border shadow-sm bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white overflow-hidden relative">
      {/* Background Subtle Gradient Glow */}
      <div className="absolute right-0 top-0 w-72 h-full bg-primary/20 blur-3xl pointer-events-none" />

      <CardContent className="p-6 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
        {/* User Details */}
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 border-2 border-white/20 shadow-md">
            <AvatarImage src={user.avatar || undefined} />
            <AvatarFallback className="text-xl font-bold bg-primary text-white">
              {user.name ? user.name.charAt(0).toUpperCase() : "U"}
            </AvatarFallback>
          </Avatar>

          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-white tracking-tight">{user.name}</h2>
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px] gap-1 px-2 py-0.5">
                <CheckCircle2 className="h-3 w-3" />
                Verified
              </Badge>
            </div>
            <p className="text-xs text-slate-300 font-medium">{user.email}</p>
            <p className="text-[11px] text-slate-400 flex items-center gap-1">
              <Calendar className="h-3 w-3 inline" />
              <span>Member since {formatDate(user.createdAt)}</span>
            </p>
          </div>
        </div>

        {/* Center/Right Metrics & Profile Completion */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-6 border-t md:border-t-0 pt-4 md:pt-0 border-white/10">
          {/* Groups Count */}
          <div className="space-y-0.5">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">
              My Groups
            </span>
            <div className="flex items-center gap-1.5 text-lg font-extrabold text-white">
              <Users className="h-4 w-4 text-primary" />
              <span>{totalGroups}</span>
            </div>
          </div>

          {/* Net Financial Balance */}
          <div className="space-y-0.5">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">
              Net Balance
            </span>
            <div className={`text-xl font-extrabold tracking-tight ${isPositive ? "text-emerald-400" : "text-rose-400"}`}>
              {formatCurrency(netBalance)}
            </div>
          </div>

          {/* Profile Completion Bar */}
          <div className="space-y-1.5 min-w-[140px]">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Profile Completion</span>
              <span className="font-semibold text-emerald-400">{user.profileCompletion}%</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
              <div
                className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${user.profileCompletion}%` }}
              />
            </div>
            <Link
              href="/dashboard/profile"
              className="text-[11px] text-indigo-300 hover:text-white flex items-center gap-1 transition-colors"
            >
              <span>Manage Profile</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

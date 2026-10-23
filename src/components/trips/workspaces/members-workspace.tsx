"use client";

import { useState } from "react";
import { TripRecord, TripMember } from "@/lib/types/trips";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Users,
  IndianRupee,
  Phone,
  Mail,
  ShieldCheck,
  UserCheck,
  Share2,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Send,
  ExternalLink,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

interface MembersWorkspaceProps {
  trips: TripRecord[];
}

export function MembersWorkspace({ trips }: MembersWorkspaceProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  // Aggregate unique members across all trips
  const allMembers = trips.flatMap((t) =>
    t.members.map((m) => ({ ...m, tripName: t.name, tripId: t.id, publicId: t.publicId }))
  );

  const filteredMembers = allMembers.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.email && m.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      m.tripName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "all" || m.role.toLowerCase() === roleFilter.toLowerCase();
    return matchesSearch && matchesRole;
  });

  const totalMembersCount = new Set(allMembers.map((m) => m.name)).size;
  const totalPendingBalance = allMembers.reduce((sum, m) => sum + (m.pending || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-5 rounded-3xl bg-card border border-slate-200/80 dark:border-slate-800/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                Members, Roles & Settlement Directory
              </h2>
              <Badge variant="secondary" className="bg-indigo-500/10 text-indigo-600 font-bold text-[10px] uppercase">
                {totalMembersCount} Unique Travelers
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Expedition member rosters, administrative privileges, individual expense balances and settlement links
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-center">
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Pending Reconciliation (INR)</span>
            <span className={`font-mono font-black text-lg ${totalPendingBalance > 0 ? "text-amber-600" : "text-emerald-600"}`}>
              {formatCurrency(totalPendingBalance, "INR")}
            </span>
          </div>
          <Button
            size="sm"
            onClick={() => {
              toast.info("Invite new travel companion modal opened.");
            }}
            className="rounded-xl text-xs font-bold gap-1.5 h-9 bg-primary text-primary-foreground shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>Invite Member</span>
          </Button>
        </div>
      </div>

      {/* Search & Role Filters */}
      <div className="p-3 rounded-2xl bg-card border border-slate-200/80 dark:border-slate-800/90 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search member by name, email, or trip container..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs rounded-xl border-slate-200/80 dark:border-slate-800"
          />
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-center overflow-x-auto w-full sm:w-auto">
          {["all", "owner", "admin", "member", "guest"].map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => setRoleFilter(role)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize whitespace-nowrap transition-all ${
                roleFilter === role
                  ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              {role}
            </button>
          ))}
        </div>
      </div>

      {/* Members Directory Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMembers.map((member, idx) => (
          <Card
            key={`${member.id}-${idx}`}
            className="rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-card p-4 shadow-xs hover:shadow-lg hover:border-indigo-500/40 transition-all duration-200 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-10 w-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center text-sm shrink-0">
                    {member.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
                      {member.name}
                    </h4>
                    <p className="text-[11px] text-slate-400 truncate">{member.email || "Registered User"}</p>
                  </div>
                </div>

                <Badge
                  variant="outline"
                  className={`text-[9px] uppercase font-bold py-0.5 shrink-0 ${
                    member.role === "Owner" || member.role === "Admin"
                      ? "border-indigo-500/30 text-indigo-600 bg-indigo-500/10"
                      : "border-slate-200 text-slate-600"
                  }`}
                >
                  {member.role}
                </Badge>
              </div>

              {/* Trip Container Association */}
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 text-xs space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Assigned Trip Container</span>
                <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">{member.tripName}</p>
                <span className="font-mono text-[10px] text-primary block">{member.publicId}</span>
              </div>

              {/* Spend & Balances */}
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/40">
                  <span className="text-[10px] text-slate-400 block font-sans">Paid Total</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {formatCurrency(member.paid || 0, "INR")}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/40">
                  <span className="text-[10px] text-slate-400 block font-sans">Pending Balance</span>
                  <span className={`font-bold ${member.pending > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                    {formatCurrency(member.pending || 0, "INR")}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className={`text-[10px] font-semibold ${member.pending > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                {member.pending > 0 ? "Settlement Due" : "Fully Reconciled"}
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  const text = encodeURIComponent(`Hi ${member.name}, here is your trip settlement update for ${member.tripName}. Current balance: ₹${member.pending}. Managed via SplitLedger AI.`);
                  window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
                }}
                className="h-7 text-[11px] font-bold text-primary gap-1"
              >
                <Send className="h-3 w-3" /> WhatsApp
              </Button>
            </div>
          </Card>
        ))}

        {filteredMembers.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-400 text-xs rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-card/60">
            No companions or organizers found matching current search.
          </div>
        )}
      </div>
    </div>
  );
}

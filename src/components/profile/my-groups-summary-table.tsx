"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { Users, ArrowRight, Layers, Shield, Crown } from "lucide-react";
import Link from "next/link";

interface MyGroupsSummaryTableProps {
  groups: Array<{
    id: number;
    publicId: string;
    name: string;
    role: string;
    totalMembers: number;
    totalExpenses: number;
    userContribution: number;
    userShare: number;
    netBalance: number;
  }>;
}

export function MyGroupsSummaryTable({ groups }: MyGroupsSummaryTableProps) {
  return (
    <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden bg-card">
      <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <span>My Linked Groups</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Overview of all active groups you participate in with your member role and finances
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-xs font-mono font-semibold">
            {groups.length} Groups
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {groups.length > 0 ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {groups.map((g) => (
              <div
                key={g.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 dark:hover:bg-slate-900/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold shrink-0">
                    <Layers className="h-5 w-5" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/dashboard/groups/${g.publicId}`}
                        className="text-xs font-bold text-slate-900 dark:text-slate-100 hover:text-primary transition-colors"
                      >
                        {g.name}
                      </Link>
                      <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-semibold capitalize gap-1">
                        {g.role === "admin" ? (
                          <Shield className="h-2.5 w-2.5 text-blue-500" />
                        ) : g.role === "owner" ? (
                          <Crown className="h-2.5 w-2.5 text-amber-500" />
                        ) : null}
                        <span>{g.role}</span>
                      </Badge>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      Collaborative shared ledger space
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-auto">
                  <Link href={`/dashboard/groups/${g.publicId}`}>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs font-semibold rounded-xl text-primary hover:bg-primary/10 border-primary/30 gap-1 px-2.5"
                    >
                      <span>Open Group</span>
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center text-slate-400 space-y-1">
            <Users className="h-8 w-8 mx-auto text-slate-300 mb-1" />
            <p className="font-semibold text-xs text-slate-800 dark:text-slate-200">
              You have not joined any shared groups yet
            </p>
            <p className="text-[11px] text-slate-400">
              Create a group or ask a peer for an invite link to start splitting expenses.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

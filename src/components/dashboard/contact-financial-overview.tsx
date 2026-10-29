"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { 
  Users, 
  ArrowUpRight, 
  ArrowDownLeft, 
  TrendingUp, 
  TrendingDown, 
  Scale, 
  Activity, 
  Award, 
  ArrowRight,
  Receipt
} from "lucide-react";
import Link from "next/link";
import type { ContactFinancialOverviewData } from "@/actions/dashboard";

interface ContactFinancialOverviewProps {
  overview: ContactFinancialOverviewData;
}

export function ContactFinancialOverview({ overview }: ContactFinancialOverviewProps) {
  return (
    <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden bg-card">
      <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Contact Financial Overview
              </CardTitle>
              <CardDescription className="text-xs">
                Audited network balances, top counterparties, and reflected volume
              </CardDescription>
            </div>
          </div>
          <Link href="/dashboard/contacts">
            <Button variant="outline" size="sm" className="rounded-xl text-xs gap-1.5 h-8 font-semibold">
              <span>View All Contacts</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </CardHeader>

      <CardContent className="p-5 space-y-6">
        {/* Metric Badges Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Total Contacts */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Total Contacts
            </span>
            <div className="text-xl font-black text-slate-900 dark:text-slate-100">
              {overview.totalContacts}
            </div>
            <span className="text-[10px] text-slate-400">Network size</span>
          </div>

          {/* Contacts Owe You */}
          <div className="p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mb-1">
              Contacts Owe You
            </span>
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 truncate">
              {formatCurrency(overview.contactsOweYou)}
            </div>
            <span className="text-[10px] text-emerald-700/70 dark:text-emerald-300/70">To collect</span>
          </div>

          {/* You Owe Contacts */}
          <div className="p-3.5 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 block mb-1">
              You Owe Contacts
            </span>
            <div className="text-xl font-black text-rose-600 dark:text-rose-400 truncate">
              {formatCurrency(overview.youOweContacts)}
            </div>
            <span className="text-[10px] text-rose-700/70 dark:text-rose-300/70">To settle</span>
          </div>

          {/* Monthly Received */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Monthly Received
            </span>
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 truncate">
              +{formatCurrency(overview.monthlyReceived)}
            </div>
            <span className="text-[10px] text-slate-400">Inbound payments</span>
          </div>

          {/* Monthly Paid */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Monthly Paid
            </span>
            <div className="text-xl font-black text-rose-600 dark:text-rose-400 truncate">
              -{formatCurrency(overview.monthlyPaid)}
            </div>
            <span className="text-[10px] text-slate-400">Outbound payments</span>
          </div>

          {/* Average Transaction Size */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Avg Ticket Size
            </span>
            <div className="text-xl font-black text-blue-600 dark:text-blue-400 truncate">
              {formatCurrency(overview.averageTransactionSize)}
            </div>
            <span className="text-[10px] text-slate-400">Per reflected tx</span>
          </div>
        </div>

        {/* Counterparty Insights Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          {/* Top Paying Contact */}
          <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-card/60 flex items-start gap-3">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 shrink-0">
              <Award className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Top Paying Contact
              </span>
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate mt-0.5">
                {overview.topPayingContact?.contactName || "No payer recorded yet"}
              </p>
              <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                {overview.topPayingContact ? formatCurrency(overview.topPayingContact.amount) : "₹0.00"}
              </p>
            </div>
          </div>

          {/* Top Owing Contact */}
          <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-card/60 flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 shrink-0">
              <Scale className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Top Owing Contact
              </span>
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate mt-0.5">
                {overview.topOwingContact?.contactName || "No debtors recorded"}
              </p>
              <p className="text-xs font-black text-amber-600 dark:text-amber-400 font-mono mt-0.5">
                {overview.topOwingContact ? formatCurrency(overview.topOwingContact.amount) : "₹0.00"}
              </p>
            </div>
          </div>

          {/* Largest Outstanding Balance */}
          <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-card/60 flex items-start gap-3">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 shrink-0">
              <Activity className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Largest Outstanding
              </span>
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate mt-0.5">
                {overview.largestOutstandingBalance?.contactName || "All accounts settled"}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs font-black text-slate-900 dark:text-slate-100 font-mono">
                  {overview.largestOutstandingBalance ? formatCurrency(overview.largestOutstandingBalance.amount) : "₹0.00"}
                </span>
                {overview.largestOutstandingBalance && (
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-semibold">
                    {overview.largestOutstandingBalance.status}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Contact Activity Feed */}
        {overview.recentContactActivity && overview.recentContactActivity.length > 0 && (
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-bold uppercase tracking-wider text-[11px] text-slate-600 dark:text-slate-300">
                Recent Reflected Contact Activity
              </span>
              <span className="text-[11px] text-slate-400">Synchronized entries</span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden bg-card">
              {overview.recentContactActivity.slice(0, 5).map((item) => {
                const isPositive = item.type === "received" || item.type === "lent" || item.type === "repaid";
                return (
                  <div
                    key={item.id}
                    className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`p-2 rounded-xl shrink-0 ${
                        isPositive 
                          ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400" 
                          : "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400"
                      }`}>
                        {isPositive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownLeft className="h-3.5 w-3.5" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                          {item.contactName}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">
                          {item.title} • {formatDate(item.date)}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className={`text-xs font-black block font-mono ${
                        isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                      }`}>
                        {isPositive ? "+" : "-"}{formatCurrency(item.amount)}
                      </span>
                      <Badge variant="outline" className="text-[9px] px-1 py-0 text-emerald-600 border-emerald-500/30">
                        ✓ Reflected
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

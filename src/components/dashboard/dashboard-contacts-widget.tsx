"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, ArrowRight, ArrowUpRight, ArrowDownLeft, CheckCircle2, ChevronRight, UserPlus } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export interface DashboardTopContact {
  id: number;
  publicId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  avatar?: string | null;
  balance: number; // in normal currency units (INR)
}

interface DashboardContactsWidgetProps {
  contacts: DashboardTopContact[];
}

export function DashboardContactsWidget({ contacts }: DashboardContactsWidgetProps) {
  const [activeTab, setActiveTab] = useState<"all" | "debtors" | "creditors" | "settled">("all");

  const filteredContacts = useMemo(() => {
    switch (activeTab) {
      case "debtors":
        return contacts.filter((c) => c.balance > 0);
      case "creditors":
        return contacts.filter((c) => c.balance < 0);
      case "settled":
        return contacts.filter((c) => c.balance === 0);
      case "all":
      default:
        return contacts;
    }
  }, [contacts, activeTab]);

  const debtorsCount = contacts.filter((c) => c.balance > 0).length;
  const creditorsCount = contacts.filter((c) => c.balance < 0).length;
  const settledCount = contacts.filter((c) => c.balance === 0).length;

  return (
    <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden bg-card">
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Top Contacts by Balance
              </CardTitle>
              <CardDescription className="text-xs">
                Active debtor, creditor & settled balance balances
              </CardDescription>
            </div>
          </div>
          <Link
            href="/dashboard/contacts"
            className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 pt-2 overflow-x-auto">
          {(
            [
              { id: "all", label: `All (${contacts.length})` },
              { id: "debtors", label: `They Owe You (${debtorsCount})` },
              { id: "creditors", label: `You Owe (${creditorsCount})` },
              { id: "settled", label: `Settled (${settledCount})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`text-xs font-semibold px-2.5 py-1 rounded-xl transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {filteredContacts.length > 0 ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {filteredContacts.map((contact) => {
              const isDebtor = contact.balance > 0;
              const isCreditor = contact.balance < 0;
              const isSettled = contact.balance === 0;

              return (
                <Link
                  key={contact.id}
                  href={`/dashboard/contacts/${contact.publicId}`}
                  className="p-3.5 flex items-center justify-between hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Avatar Initial */}
                    <div className="h-9 w-9 rounded-2xl bg-gradient-to-tr from-primary/20 via-primary/10 to-transparent border border-primary/20 flex items-center justify-center shrink-0 font-extrabold text-sm text-primary group-hover:scale-105 transition-transform">
                      {contact.name.charAt(0).toUpperCase()}
                    </div>

                    <div className="min-w-0">
                      <p className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 truncate group-hover:text-primary transition-colors">
                        {contact.name}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {contact.email || contact.phone || "Direct Connection"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p
                        className={`font-mono font-bold text-xs sm:text-sm ${
                          isDebtor
                            ? "text-emerald-600 dark:text-emerald-400"
                            : isCreditor
                            ? "text-rose-600 dark:text-rose-400"
                            : "text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        {isDebtor ? "+" : ""}
                        {formatCurrency(contact.balance, "INR")}
                      </p>
                      <Badge
                        variant="outline"
                        className={`text-[9px] px-1.5 py-0 font-bold uppercase rounded-md ${
                          isDebtor
                            ? "border-emerald-500/30 text-emerald-600 bg-emerald-50/40 dark:bg-emerald-950/30"
                            : isCreditor
                            ? "border-rose-500/30 text-rose-600 bg-rose-50/40 dark:bg-rose-950/30"
                            : "border-slate-300 text-slate-500 bg-slate-100 dark:bg-slate-800"
                        }`}
                      >
                        {isDebtor ? "They Owe You" : isCreditor ? "You Owe" : "Settled"}
                      </Badge>
                    </div>

                    <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="py-10 px-4 text-center space-y-3">
            <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl w-12 h-12 mx-auto flex items-center justify-center text-slate-400">
              <Users className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="font-bold text-xs text-slate-800 dark:text-slate-200">
                {activeTab === "debtors"
                  ? "No debtors right now"
                  : activeTab === "creditors"
                  ? "No creditors right now"
                  : activeTab === "settled"
                  ? "No settled contacts"
                  : "No contacts recorded yet"}
              </p>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                {activeTab === "debtors"
                  ? "No contacts currently owe you money."
                  : activeTab === "creditors"
                  ? "You do not owe money to any contacts."
                  : "Connect with friends and track financial splits."}
              </p>
            </div>
            <Link href="/dashboard/contacts">
              <Button size="sm" variant="outline" className="rounded-xl text-xs gap-1.5 h-8 font-semibold">
                <UserPlus className="h-3.5 w-3.5" />
                <span>Go to Contacts</span>
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


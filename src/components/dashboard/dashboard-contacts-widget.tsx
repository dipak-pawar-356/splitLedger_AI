"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Users,
  ArrowRight,
  ArrowUpRight,
  ArrowDownLeft,
  MinusCircle,
  ExternalLink,
  Clock,
  Layers,
  Loader2,
  UserPlus,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { removeContactFromDashboard } from "@/actions/transactions";
import { toast } from "sonner";

export interface DashboardTopContact {
  id: number;
  publicId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  avatar?: string | null;
  balance: number; // in normal currency units (INR)
  syncedTxCount?: number;
  lastSyncedAt?: Date | string | null;
}

interface DashboardContactsWidgetProps {
  contacts: DashboardTopContact[];
}

// Relative time helper (e.g. "Updated 3 mins ago")
function formatRelativeTime(date?: Date | string | null): string {
  if (!date) return "Recently";
  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "Just now";
  if (diffMin === 1) return "Updated 1 min ago";
  if (diffMin < 60) return `Updated ${diffMin} mins ago`;
  if (diffHour === 1) return "Updated 1 hour ago";
  if (diffHour < 24) return `Updated ${diffHour} hours ago`;
  if (diffDay === 1) return "Updated yesterday";
  return `Updated ${diffDay} days ago`;
}

export function DashboardContactsWidget({ contacts }: DashboardContactsWidgetProps) {
  const router = useRouter();
  const [removingContact, setRemovingContact] = useState<DashboardTopContact | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const handleRemoveAllConfirm = async () => {
    if (!removingContact) return;
    setIsRemoving(true);
    try {
      await removeContactFromDashboard(removingContact.publicId);
      toast.success(`Removed all synchronized transactions for ${removingContact.name} from Dashboard.`);
      setRemovingContact(null);
      router.refresh();
    } catch (err: any) {
      toast.error(err?.message || "Failed to remove transactions from dashboard");
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <>
      <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden bg-card">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Contact Balance Overview
                </CardTitle>
                <CardDescription className="text-xs">
                  Active synchronized contact balances affecting your dashboard
                </CardDescription>
              </div>
            </div>
            <Link
              href="/dashboard/contacts"
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
            >
              <span>Manage Contacts</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6">
          {contacts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {contacts.map((contact) => {
                const isDebtor = contact.balance > 0;
                const isCreditor = contact.balance < 0;
                const isSettled = contact.balance === 0;
                const statusLabel = isDebtor ? "They Owe You" : isCreditor ? "You Owe" : "Settled";
                const txCount = contact.syncedTxCount || 1;

                return (
                  <div
                    key={contact.id}
                    className="p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-card hover:border-primary/40 dark:hover:border-primary/50 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 space-y-3.5 flex flex-col justify-between group"
                  >
                    {/* Top Row: Avatar, Name, Relative Time */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-primary/20 via-primary/10 to-transparent border border-primary/25 flex items-center justify-center shrink-0 font-extrabold text-base text-primary shadow-xs">
                          {contact.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <Link
                            href={`/dashboard/contacts/${contact.publicId}`}
                            className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate hover:text-primary transition-colors block"
                          >
                            {contact.name}
                          </Link>
                          <p className="text-[11px] text-slate-400 truncate flex items-center gap-1 mt-0.5">
                            <Clock className="h-3 w-3 shrink-0" />
                            <span>{formatRelativeTime(contact.lastSyncedAt)}</span>
                          </p>
                        </div>
                      </div>

                      <Badge
                        variant="outline"
                        className={`text-[9px] px-2 py-0.5 font-bold uppercase rounded-lg shrink-0 ${
                          isDebtor
                            ? "border-emerald-500/30 text-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/40"
                            : isCreditor
                            ? "border-rose-500/30 text-rose-600 bg-rose-50/50 dark:bg-rose-950/40"
                            : "border-slate-300 text-slate-500 bg-slate-100 dark:bg-slate-800"
                        }`}
                      >
                        {statusLabel}
                      </Badge>
                    </div>

                    {/* Balance & Synced Counts */}
                    <div className="p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                          Synchronized Balance
                        </span>
                        <span
                          className={`font-mono font-black text-lg tracking-tight ${
                            isDebtor
                              ? "text-emerald-600 dark:text-emerald-400"
                              : isCreditor
                              ? "text-rose-600 dark:text-rose-400"
                              : "text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          {isDebtor ? "+" : ""}
                          {formatCurrency(contact.balance, "INR")}
                        </span>
                      </div>

                      <div className="text-right space-y-0.5">
                        <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                          Volume
                        </span>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 inline-flex items-center gap-1">
                          <Layers className="h-3 w-3 text-primary" />
                          <span>
                            {txCount} {txCount === 1 ? "Synced Tx" : "Synced Txs"}
                          </span>
                        </span>
                      </div>
                    </div>

                    {/* Card Actions: View Contact & Remove All */}
                    <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/90">
                      <Link href={`/dashboard/contacts/${contact.publicId}`} className="flex-1 min-w-0">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full rounded-xl text-xs h-8 gap-1 font-semibold hover:border-primary/50 hover:text-primary transition-all"
                        >
                          <ExternalLink className="h-3 w-3 shrink-0" />
                          <span>View Contact</span>
                        </Button>
                      </Link>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setRemovingContact(contact)}
                        className="rounded-xl text-xs h-8 px-2.5 font-semibold text-amber-600 dark:text-amber-400 hover:border-amber-500/50 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-all shrink-0"
                        title="Remove all synchronized transactions for this contact from dashboard"
                      >
                        <MinusCircle className="h-3 w-3 mr-1" />
                        <span>Remove All</span>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 px-4 text-center space-y-3">
              <div className="p-3.5 bg-slate-100 dark:bg-slate-800 rounded-3xl w-14 h-14 mx-auto flex items-center justify-center text-slate-400">
                <Users className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-sm text-slate-800 dark:text-slate-200">
                  No contacts synced to dashboard
                </p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Contact transactions remain in their private contact ledger by default. Open any contact&apos;s transaction history and click &ldquo;Add to Dashboard&rdquo; to track their balances here.
                </p>
              </div>
              <div className="pt-2">
                <Link href="/dashboard/contacts">
                  <Button size="sm" className="rounded-xl text-xs gap-1.5 h-9 font-semibold">
                    <UserPlus className="h-4 w-4" />
                    <span>Go to Contacts</span>
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog before Remove All */}
      <Dialog open={!!removingContact} onOpenChange={(open) => !open && setRemovingContact(null)}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-card border border-slate-200/80 dark:border-slate-800 shadow-2xl">
          <DialogHeader className="space-y-2">
            <div className="p-3 bg-amber-500/10 text-amber-600 rounded-2xl w-12 h-12 flex items-center justify-center">
              <MinusCircle className="h-6 w-6" />
            </div>
            <DialogTitle className="text-lg font-bold">
              Remove all synced transactions for {removingContact?.name}?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 leading-relaxed">
              This will remove all synchronized transactions for this contact from your dashboard totals, reports, and AI insights. The transactions and balances will remain safe inside the contact&apos;s ledger.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setRemovingContact(null)}
              className="rounded-xl text-xs font-semibold h-10"
              disabled={isRemoving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleRemoveAllConfirm}
              disabled={isRemoving}
              className="rounded-xl text-xs font-bold h-10 bg-amber-600 hover:bg-amber-700 text-white"
            >
              {isRemoving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                  <span>Removing...</span>
                </>
              ) : (
                "Remove from Dashboard"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatCurrency, generateWhatsAppLink } from "@/lib/utils";
import { BudgetProgress } from "@/actions/budgets";
import { toggleCompleteReminder } from "@/actions/reminders";
import { toast } from "sonner";
import {
  Target,
  Bell,
  Clock,
  ArrowRight,
  Plus,
  CheckCircle2,
  Calendar,
  Sparkles,
  ExternalLink,
  MessageCircle,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Receipt,
  Users,
} from "lucide-react";
import Link from "next/link";

export interface ReminderItem {
  id: number;
  publicId?: string;
  title: string | null;
  recipientName: string | null;
  recipientPhone?: string | null;
  recipientEmail?: string | null;
  method?: string | null;
  message: string;
  dueDate: Date | string | null;
  reminderDate?: Date | string | null;
  amount: number | null; // in paise or rupees
  currency?: string;
  priority?: "low" | "medium" | "high" | "urgent" | string;
  status?: string;
  isCompleted?: boolean;
}

interface AIBudgetAndRemindersHubProps {
  budgets: BudgetProgress[];
  reminders?: ReminderItem[];
  onOpenBudgetDialog?: () => void;
  onNavigateToBudgetsTab?: () => void;
}

export function AIBudgetAndRemindersHub({
  budgets,
  reminders = [],
  onOpenBudgetDialog,
  onNavigateToBudgetsTab,
}: AIBudgetAndRemindersHubProps) {
  const [localReminders, setLocalReminders] = useState<ReminderItem[]>(reminders);
  const [completingId, setCompletingId] = useState<number | null>(null);

  // Live aggregates across active budgets
  const activeBudgets = budgets.filter((b) => b.status !== "archived");
  const totalAllocated = activeBudgets.reduce((sum, b) => sum + b.amount, 0);
  const totalSpent = activeBudgets.reduce((sum, b) => sum + b.spent, 0);
  const totalRemaining = Math.max(0, totalAllocated - totalSpent);
  const overallUsagePct = totalAllocated > 0 ? Math.round((totalSpent / totalAllocated) * 100) : 0;

  // Days remaining in current calendar month
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const currentDay = now.getDate();
  const daysRemaining = Math.max(1, daysInMonth - currentDay);
  const dailySafeSpend = Math.max(0, Math.round(totalRemaining / daysRemaining));

  // Determine health risk status
  const isOverBudget = overallUsagePct >= 100;
  const isNearLimit = overallUsagePct >= 80 && !isOverBudget;
  const budgetStatusText = isOverBudget
    ? "Budget Exceeded"
    : isNearLimit
    ? "Approaching Limit"
    : "On Track";
  const budgetBadgeColor = isOverBudget
    ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
    : isNearLimit
    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
    : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";

  // Mark reminder completed
  const handleToggleComplete = async (id: number) => {
    setCompletingId(id);
    try {
      await toggleCompleteReminder(id);
      setLocalReminders((prev) => prev.filter((r) => r.id !== id));
      toast.success("Reminder marked as completed");
    } catch {
      toast.error("Failed to update reminder status");
    } finally {
      setCompletingId(null);
    }
  };

  // Launch WhatsApp with prefilled message
  const handleSendWhatsApp = (reminder: ReminderItem) => {
    const phone = reminder.recipientPhone || "";
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    if (!cleanPhone) {
      toast.error("No valid phone number found for this recipient.");
      return;
    }
    const amountVal = reminder.amount
      ? reminder.amount > 10000 && reminder.amount % 100 === 0
        ? reminder.amount / 100
        : reminder.amount
      : 0;
    const msg = `Hi ${reminder.recipientName || "there"}, gentle reminder regarding pending payment of ₹${amountVal.toLocaleString("en-IN")} on SplitLedger AI.`;
    const waUrl = generateWhatsAppLink(cleanPhone, msg);
    window.open(waUrl, "_blank", "noopener,noreferrer");
  };

  // Pending active reminders
  const activeReminders = localReminders.filter((r) => !r.isCompleted);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* 1. ACCURATE LIVE BUDGET TRACKER CARD */}
      <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-gradient-to-br from-card via-card to-emerald-500/[0.03] shadow-xs hover:border-emerald-500/40 transition-all">
        <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 shrink-0">
                <Target className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  Live Monthly Budget
                  <Badge variant="outline" className={`text-[10px] font-bold py-0 px-1.5 ${budgetBadgeColor}`}>
                    {budgetStatusText}
                  </Badge>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Calculated exclusively from approved ledger debits
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {onOpenBudgetDialog && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onOpenBudgetDialog}
                  className="rounded-xl h-7 px-2 text-[11px] font-semibold gap-1 text-slate-700 dark:text-slate-300"
                >
                  <Plus className="h-3 w-3" />
                  <span>Set Limit</span>
                </Button>
              )}
              {onNavigateToBudgetsTab && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onNavigateToBudgetsTab}
                  className="rounded-xl h-7 px-2 text-[11px] font-semibold text-primary hover:bg-primary/10 gap-1"
                >
                  <span>Details</span>
                  <ArrowRight className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>

          {totalAllocated > 0 ? (
            <div className="space-y-3">
              {/* Financial Breakdown Row */}
              <div className="flex items-baseline justify-between flex-wrap gap-2">
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Remaining to Spend
                  </span>
                  <div className={`text-xl sm:text-2xl font-black tracking-tight ${isOverBudget ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                    {formatCurrency(totalRemaining)}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Spent / Total Target
                  </span>
                  <div className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300">
                    {formatCurrency(totalSpent)} <span className="text-slate-400 font-normal">/ {formatCurrency(totalAllocated)}</span>
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                  <span>Utilization ({overallUsagePct}%)</span>
                  <span>{daysRemaining} days left in month</span>
                </div>
                <Progress
                  value={Math.min(100, overallUsagePct)}
                  className={`h-2 rounded-full ${
                    isOverBudget
                      ? "[&>div]:bg-rose-500"
                      : isNearLimit
                      ? "[&>div]:bg-amber-500"
                      : "[&>div]:bg-emerald-500"
                  }`}
                />
              </div>

              {/* Category Quick Badges */}
              {activeBudgets.length > 0 && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
                    {activeBudgets.slice(0, 4).map((b) => (
                      <span
                        key={b.id}
                        className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 text-[10px] font-semibold text-slate-700 dark:text-slate-300 shrink-0 flex items-center gap-1"
                      >
                        <span className="text-slate-400">{b.categoryName || b.name}:</span>
                        <span>{formatCurrency(b.spent)}</span>
                        <span className={`text-[9px] ${b.percentage >= 100 ? "text-rose-500 font-bold" : "text-slate-400"}`}>
                          ({b.percentage}%)
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Real-time AI Velocity Insight */}
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-xl">
                <Sparkles className="h-3 w-3 text-primary shrink-0" />
                <span>
                  Safe daily spend velocity: <strong className="text-slate-800 dark:text-slate-200">₹{dailySafeSpend.toLocaleString("en-IN")} / day</strong> for remaining {daysRemaining} days.
                </span>
              </div>
            </div>
          ) : (
            <div className="py-4 text-center space-y-2 bg-slate-50/50 dark:bg-slate-900/20 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
              <Target className="h-6 w-6 text-slate-400 mx-auto" />
              <p className="text-xs text-slate-500 font-medium">
                No monthly spending target configured yet.
              </p>
              {onOpenBudgetDialog && (
                <Button
                  size="sm"
                  onClick={onOpenBudgetDialog}
                  className="rounded-xl text-xs font-semibold h-7 bg-primary text-primary-foreground"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Set Budget Target
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. ACCURATE REMINDERS WITH ACCURATE POSITIONS CARD */}
      <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-gradient-to-br from-card via-card to-indigo-500/[0.03] shadow-xs hover:border-indigo-500/40 transition-all">
        <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 shrink-0">
                <Bell className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  Actionable Reminders
                  <Badge variant="secondary" className="text-[10px] font-bold py-0 px-1.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                    {activeReminders.length} Active
                  </Badge>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Pending settlements, due payments & scheduled follow-ups
                </p>
              </div>
            </div>

            <Link href="/dashboard/activity" className="text-[11px] font-semibold text-primary hover:underline shrink-0">
              View All
            </Link>
          </div>

          {/* Reminders List with Accurate Positions */}
          {activeReminders.length > 0 ? (
            <div className="space-y-2.5 max-h-[175px] overflow-y-auto scrollbar-thin pr-0.5">
              {activeReminders.slice(0, 3).map((r) => {
                const amtVal = r.amount
                  ? r.amount > 10000 && r.amount % 100 === 0
                    ? r.amount / 100
                    : r.amount
                  : null;

                const isUrgent = r.priority === "urgent" || r.priority === "high";

                return (
                  <div
                    key={r.id}
                    className="p-2.5 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-card hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-colors flex items-center justify-between gap-2.5"
                  >
                    {/* Left: Indicator & Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`h-2 w-2 rounded-full shrink-0 ${
                            isUrgent ? "bg-rose-500 animate-pulse" : "bg-amber-500"
                          }`}
                        />
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                          {r.recipientName || r.title || "Payment Reminder"}
                        </span>
                        {isUrgent && (
                          <Badge variant="outline" className="text-[9px] py-0 px-1 border-rose-300 text-rose-600 font-semibold">
                            Urgent
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {r.message}
                      </p>
                    </div>

                    {/* Accurate Positions: Amount Badge + Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {amtVal !== null && (
                        <span className="text-xs font-black text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg shrink-0">
                          ₹{amtVal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      )}

                      {/* WhatsApp trigger if phone exists */}
                      {r.recipientPhone && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleSendWhatsApp(r)}
                          className="h-7 w-7 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                          title="Send WhatsApp Reminder"
                          aria-label="Send WhatsApp Reminder"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                        </Button>
                      )}

                      {/* Complete action */}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleToggleComplete(r.id)}
                        disabled={completingId === r.id}
                        className="h-7 w-7 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                        title="Mark as completed"
                        aria-label="Mark reminder completed"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-4 text-center space-y-2 bg-slate-50/50 dark:bg-slate-900/20 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
              <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto" />
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  All obligations settled
                </p>
                <p className="text-[11px] text-slate-500">
                  0 pending reminders or overdue peer settlements.
                </p>
              </div>
            </div>
          )}

          {/* Footer Status */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-slate-400" />
              Automated reminders synchronized with ledger
            </span>
            <Link href="/dashboard/settlements" className="font-semibold text-primary hover:underline">
              Settle Dues
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


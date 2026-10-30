"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SmartRecommendation } from "@/actions/financial-intelligence";
import { BudgetProgress } from "@/actions/budgets";
import { formatInlineText } from "@/components/ai/formatted-ai-answer";
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import {
  Zap,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Bell,
  Target,
  UserCheck,
  TrendingDown,
  TrendingUp,
  Clock,
  Sparkles,
  ShieldCheck,
  IndianRupee,
  Settings2,
} from "lucide-react";
import Link from "next/link";
import { SettleAllDialog } from "@/components/dialogs/settle-all-dialog";
import { ReminderDialog } from "@/components/dialogs/reminder-dialog";

interface SmartRecommendationsViewProps {
  recommendations: SmartRecommendation[];
  onOpenBudgetDialog?: (suggestedAmount?: number) => void;
  onEditBudget?: (budget: BudgetProgress) => void;
}

export function SmartRecommendationsView({
  recommendations,
  onOpenBudgetDialog,
  onEditBudget,
}: SmartRecommendationsViewProps) {
  const shouldReduceMotion = useReducedMotion();

  const getPriorityBadge = (priority: SmartRecommendation["priority"]) => {
    if (priority === "high") {
      return (
        <Badge className="bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800 text-[10px] font-bold">
          High Priority
        </Badge>
      );
    }
    if (priority === "medium") {
      return (
        <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 text-[10px] font-bold">
          Medium Priority
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="text-[10px] font-bold">
        Optimization
      </Badge>
    );
  };

  const renderActionButton = (rec: SmartRecommendation) => {
    if (rec.actionType === "settle_up") {
      return (
        <SettleAllDialog
          trigger={
            <Button
              size="sm"
              aria-label="Settle outstanding debts now"
              className="rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-xs gap-1.5 focus-visible:ring-2 focus-visible:ring-teal-500"
            >
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Settle Now</span>
            </Button>
          }
        />
      );
    }

    if (rec.actionType === "send_reminder") {
      const payload = rec.actionPayload || {};
      const debtors = payload.receivesFromList || [];
      const isSingleDebtor = debtors.length === 1;

      return (
        <ReminderDialog
          recipientName={payload.recipientName || (isSingleDebtor ? debtors[0].name : "Group Members")}
          recipientPhone={payload.recipientPhone || (isSingleDebtor ? debtors[0].phone : undefined)}
          recipientEmail={payload.recipientEmail || (isSingleDebtor ? debtors[0].email : undefined)}
          amount={payload.amount}
          creditorName={payload.creditorName}
          receivesFromList={debtors}
          owesToList={payload.owesToList}
          groupId={payload.groupId}
          groupPublicId={payload.groupPublicId}
          groupName={payload.groupName}
          reminderRole="receiver"
          trigger={
            <Button
              size="sm"
              variant="outline"
              aria-label="Send reminder to group members"
              className="rounded-xl text-xs font-semibold text-amber-600 border-amber-300 dark:border-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30 gap-1.5 focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              <Bell className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Send Reminder</span>
            </Button>
          }
        />
      );
    }

    if (rec.actionType === "create_budget" && onOpenBudgetDialog) {
      const suggestedAmount = rec.actionPayload?.suggestedAmount;
      return (
        <Button
          size="sm"
          aria-label="Set up a monthly budget"
          className="rounded-xl text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs gap-1.5 focus-visible:ring-2 focus-visible:ring-primary"
          onClick={() => onOpenBudgetDialog(suggestedAmount)}
        >
          <Target className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Set Budget</span>
        </Button>
      );
    }

    if (rec.actionType === "view_profile") {
      return (
        <Link href="/dashboard/profile" aria-label="Go to profile page">
          <Button
            size="sm"
            variant="outline"
            className="rounded-xl text-xs font-semibold gap-1.5 hover:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <UserCheck className="h-3.5 w-3.5 text-blue-500" aria-hidden="true" />
            <span>Update Profile</span>
          </Button>
        </Link>
      );
    }

    return (
      <Link href="/dashboard/transactions" aria-label="View transactions ledger">
        <Button
          size="sm"
          variant="outline"
          className="rounded-xl text-xs font-semibold gap-1.5 hover:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary"
        >
          <span>View Ledger</span>
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      </Link>
    );
  };

  /**
   * Render Dedicated Monthly Budget Overview Card (Requirements 5, 9, 10, 11)
   */
  const renderMonthlyBudgetOverviewCard = (rec: SmartRecommendation) => {
    const budget: BudgetProgress | undefined = rec.actionPayload?.budget;
    if (!budget) return null;

    const isExceeded = budget.isOverBudget || budget.percentage >= 100;
    const isWarning = !isExceeded && (budget.percentage >= (budget.alertThreshold || 80) || budget.percentage >= 75);
    const isApproaching = !isExceeded && !isWarning && budget.percentage >= 50;

    // Determine color scheme for progress bar
    const progressFillColor = isExceeded
      ? "bg-rose-500"
      : budget.percentage >= 90
      ? "bg-orange-500"
      : budget.percentage >= 75
      ? "bg-yellow-500"
      : "bg-emerald-500";

    const statusBadge = isExceeded ? (
      <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-800 text-[10px] font-bold">
        ● Exceeded ({budget.percentage}%)
      </Badge>
    ) : isWarning ? (
      <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800 text-[10px] font-bold">
        ▲ Warning ({budget.percentage}%)
      </Badge>
    ) : isApproaching ? (
      <Badge className="bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-300 dark:border-yellow-800 text-[10px] font-bold">
        ▲ Approaching ({budget.percentage}%)
      </Badge>
    ) : (
      <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 text-[10px] font-bold">
        ● Healthy ({budget.percentage}%)
      </Badge>
    );

    const estimatedSavings = rec.actionPayload?.budget?.estimatedSavings ?? Math.max(0, budget.amount - budget.spent);

    return (
      <motion.article
        key={rec.id}
        role="article"
        aria-label="Monthly Budget Overview"
        whileHover={shouldReduceMotion ? undefined : { y: -2, scale: 1.004 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-gradient-to-br from-white via-slate-50/70 to-slate-100/40 dark:from-slate-900/80 dark:via-slate-900/40 dark:to-slate-950/60 hover:border-primary/40 dark:hover:border-primary/30 transition-all duration-200 hover:shadow-md space-y-4 shadow-2xs backdrop-blur-xs"
      >
        {/* Header Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <motion.div
              whileHover={shouldReduceMotion ? undefined : { rotate: 10, scale: 1.05 }}
              transition={{ duration: 0.2 }}
              className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0"
            >
              <Target className="h-4 w-4" aria-hidden="true" />
            </motion.div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                  Monthly Budget Overview
                </h4>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="cursor-help">{statusBadge}</span>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p className="font-semibold">Budget Health Status</p>
                    <p className="text-[11px] text-slate-300">
                      Calculated from live transactions against your ₹{budget.amount.toLocaleString("en-IN")} target.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 capitalize">
                {budget.name} • {budget.period} Cadence
              </p>
            </div>
          </div>

          {/* Adjust Budget Action */}
          <div className="shrink-0 self-start sm:self-auto">
            <Button
              size="sm"
              variant="outline"
              aria-label="Adjust monthly budget settings"
              className="rounded-xl text-xs font-semibold h-8 px-3 gap-1.5 border-slate-200 dark:border-slate-800 hover:border-primary/50 hover:bg-primary/5 text-slate-700 dark:text-slate-300 transition-colors"
              onClick={() => {
                if (onEditBudget) onEditBudget(budget);
                else if (onOpenBudgetDialog) onOpenBudgetDialog(budget.amount);
              }}
            >
              <Settings2 className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              <span>Adjust Budget</span>
            </Button>
          </div>
        </div>

        {/* 4 Core Financial Metrics Grid with Tooltips (Requirement 5 & 11) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {/* 1. Budget Amount */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="p-2.5 rounded-xl bg-slate-50/90 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 cursor-help transition-colors hover:border-slate-300 dark:hover:border-slate-700 text-left">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Target Budget
                </span>
                <span className="text-xs sm:text-sm font-black font-mono text-slate-900 dark:text-slate-100 tabular-nums">
                  ₹{budget.amount.toLocaleString("en-IN")}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="font-semibold">Allocated Target</p>
              <p className="text-[11px] text-slate-300">
                Total monthly spending limit configured in your PostgreSQL ledger.
              </p>
            </TooltipContent>
          </Tooltip>

          {/* 2. Spent Amount */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="p-2.5 rounded-xl bg-slate-50/90 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 cursor-help transition-colors hover:border-slate-300 dark:hover:border-slate-700 text-left">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Live Spent
                </span>
                <span
                  className={`text-xs sm:text-sm font-black font-mono tabular-nums ${
                    isExceeded ? "text-rose-600 dark:text-rose-400" : "text-slate-900 dark:text-slate-100"
                  }`}
                >
                  ₹{budget.spent.toLocaleString("en-IN")}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="font-semibold">Live Accumulated Spending</p>
              <p className="text-[11px] text-slate-300">
                Sum of all personal and shared expense transactions recorded in this period.
              </p>
            </TooltipContent>
          </Tooltip>

          {/* 3. Remaining Amount */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="p-2.5 rounded-xl bg-slate-50/90 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 cursor-help transition-colors hover:border-slate-300 dark:hover:border-slate-700 text-left">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Remaining
                </span>
                <span
                  className={`text-xs sm:text-sm font-black font-mono tabular-nums ${
                    budget.remaining > 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400"
                  }`}
                >
                  ₹{budget.remaining.toLocaleString("en-IN")}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="font-semibold">Remaining Spending Allowance</p>
              <p className="text-[11px] text-slate-300">
                Funds remaining before crossing your allocated threshold.
              </p>
            </TooltipContent>
          </Tooltip>

          {/* 4. Savings */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="p-2.5 rounded-xl bg-slate-50/90 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 cursor-help transition-colors hover:border-slate-300 dark:hover:border-slate-700 text-left">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Est. Savings
                </span>
                <span className="text-xs sm:text-sm font-black font-mono text-blue-600 dark:text-blue-400 tabular-nums">
                  ₹{estimatedSavings.toLocaleString("en-IN")}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="font-semibold">Estimated Monthly Savings</p>
              <p className="text-[11px] text-slate-300">
                Calculated as net monthly cashflow (Total Income minus Total Spending).
              </p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Animated Premium Progress Bar (Requirement 9 & 11) */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="space-y-1.5 cursor-help">
              <div className="flex justify-between items-center text-[11px] font-semibold">
                <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                  <span>Budget Utilization</span>
                  {isExceeded && (
                    <span className="text-rose-600 font-bold">(Over Budget by ₹{(budget.spent - budget.amount).toLocaleString("en-IN")})</span>
                  )}
                </span>
                <span
                  className={`font-mono font-bold ${
                    isExceeded
                      ? "text-rose-600 dark:text-rose-400"
                      : isWarning
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-emerald-600 dark:text-emerald-400"
                  }`}
                >
                  {budget.percentage}%
                </span>
              </div>

              <div className="w-full h-2.5 rounded-full bg-slate-200/80 dark:bg-slate-800/80 overflow-hidden relative shadow-inner">
                <motion.div
                  initial={shouldReduceMotion ? { width: `${Math.min(100, budget.percentage)}%` } : { width: 0 }}
                  animate={{ width: `${Math.min(100, budget.percentage)}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className={`h-full rounded-full transition-colors duration-200 ${progressFillColor}`}
                />
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="font-semibold">Budget Pacing Indicator</p>
            <p className="text-[11px] text-slate-300">
              {budget.percentage}% utilized. Warning alert threshold is set at {budget.alertThreshold || 80}%.
            </p>
          </TooltipContent>
        </Tooltip>

        {/* Quick Intelligence Footer Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/70 text-[11px] text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-1 font-medium">
            <Clock className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
            <span>
              <strong>{budget.daysRemaining ?? 0}</strong> days remaining
            </span>
          </div>

          <div className="flex items-center gap-1 font-medium">
            <TrendingDown className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
            <span>
              Daily Limit: <strong className="font-mono text-slate-900 dark:text-slate-100">₹{budget.dailyBudgetRemaining.toLocaleString("en-IN")}/day</strong>
            </span>
          </div>

          <div className="flex items-center gap-1 font-medium">
            <TrendingUp className="h-3.5 w-3.5 text-blue-500" aria-hidden="true" />
            <span>
              Projected Spend: <strong className="font-mono text-slate-900 dark:text-slate-100">₹{(budget.projectedSpend ?? budget.spent).toLocaleString("en-IN")}</strong>
            </span>
          </div>
        </div>

        {/* Dynamic Contextual AI Insight */}
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal bg-slate-50/50 dark:bg-slate-900/30 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/60">
          {formatInlineText(rec.reason)} {formatInlineText(rec.suggestedAction)}
        </p>
      </motion.article>
    );
  };

  return (
    <TooltipProvider delayDuration={150}>
      <Card
        role="region"
        aria-label="Smart action recommendations"
        className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden bg-card transition-all duration-300 hover:shadow-md"
      >
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/80 bg-gradient-to-r from-slate-50/80 via-amber-50/20 to-transparent dark:from-slate-900/40 dark:via-amber-950/20 dark:to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20 shadow-xs shrink-0">
                <Zap className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Smart Action Recommendations
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Context-aware recommendations to cut unnecessary expenses and boost your financial score
                </CardDescription>
              </div>
            </div>
            <Badge
              variant="outline"
              className="text-xs font-mono tabular-nums font-bold text-amber-600 border-amber-200 dark:border-amber-800 bg-amber-500/5"
            >
              {recommendations.length} Suggestions
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-5 space-y-3">
          {recommendations.length > 0 ? (
            recommendations.map((rec) => {
              // If recommendation is the active Monthly Budget Overview, render the dedicated overview card!
              if (rec.id === "rec-budget-overview" || rec.actionPayload?.budget) {
                return renderMonthlyBudgetOverviewCard(rec);
              }

              // Standard recommendation card (including "Set Up a Monthly Budget")
              return (
                <motion.article
                  key={rec.id}
                  role="article"
                  aria-label={rec.title}
                  whileHover={shouldReduceMotion ? undefined : { y: -2, scale: 1.005 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="p-4 rounded-2xl border border-slate-200/70 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/40 hover:border-amber-500/40 transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                        {formatInlineText(rec.title)}
                      </h4>
                      {getPriorityBadge(rec.priority)}
                      {rec.id === "rec-create-budget" && rec.actionPayload?.suggestedAmount && (
                        <Badge variant="outline" className="text-[10px] font-mono font-bold text-primary border-primary/30 bg-primary/5">
                          AI Suggested: ₹{rec.actionPayload.suggestedAmount.toLocaleString("en-IN")}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
                      {formatInlineText(rec.reason)} {formatInlineText(rec.suggestedAction)}
                    </p>
                  </div>

                  <div className="shrink-0 pt-1 sm:pt-0">
                    {renderActionButton(rec)}
                  </div>
                </motion.article>
              );
            })
          ) : (
            <div className="py-10 text-center text-slate-400 text-xs space-y-2 border border-dashed rounded-2xl">
              <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-500 mb-1" />
              <p className="font-semibold text-slate-700 dark:text-slate-300">
                All actions are up to date
              </p>
              <p>No immediate financial actions or settlements required.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}

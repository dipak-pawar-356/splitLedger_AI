"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { 
  Target, 
  Clock, 
  Calendar, 
  AlertTriangle, 
  CheckCircle2, 
  Trash2, 
  Edit3, 
  Tag, 
  Users,
  Zap,
  TrendingDown
} from "lucide-react";
import { deleteBudget, BudgetProgress } from "@/actions/budgets";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface BudgetCardProps {
  budget: BudgetProgress;
  onEdit?: (budget: BudgetProgress) => void;
}

export function BudgetCard({ budget, onEdit }: BudgetCardProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete budget "${budget.name}"?`)) return;
    setIsDeleting(true);
    try {
      await deleteBudget(budget.publicId);
      toast.success("Budget deleted");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete budget");
    } finally {
      setIsDeleting(false);
    }
  };

  const isExceeded = budget.healthStatus === "exceeded";
  const isWarning = budget.healthStatus === "warning";

  return (
    <motion.div
      whileHover={shouldReduceMotion ? undefined : { y: -2, scale: 1.005 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="h-full"
    >
      <Card className={`rounded-3xl border shadow-sm transition-all overflow-hidden flex flex-col justify-between h-full ${
        isExceeded
          ? "border-rose-300 dark:border-rose-900 bg-rose-50/15 dark:bg-rose-950/10 shadow-rose-500/5"
          : isWarning
          ? "border-amber-300 dark:border-amber-900 bg-amber-50/15 dark:bg-amber-950/10 shadow-amber-500/5"
          : "border-slate-200/80 dark:border-slate-800 bg-card hover:border-slate-300 dark:hover:border-slate-700"
      }`}>
      <div>
        {/* Header */}
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-900/20">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                  {budget.name}
                </CardTitle>
                <Badge className="text-[10px] capitalize font-medium py-0 px-1.5">
                  {budget.period}
                </Badge>
                {budget.categoryName && (
                  <Badge variant="outline" className="text-[10px] py-0 px-1.5 text-slate-600">
                    <Tag className="h-2.5 w-2.5 mr-1 inline" />
                    {budget.categoryName}
                  </Badge>
                )}
                {budget.groupName && (
                  <Badge variant="outline" className="text-[10px] py-0 px-1.5 text-indigo-600">
                    <Users className="h-2.5 w-2.5 mr-1 inline" />
                    {budget.groupName}
                  </Badge>
                )}
              </div>
              {budget.description && (
                <p className="text-xs text-slate-500 line-clamp-1 mt-0.5 font-normal">
                  {budget.description}
                </p>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {onEdit && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={`Edit budget ${budget.name}`}
                  title={`Edit budget ${budget.name}`}
                  className="h-7 w-7 p-0 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-indigo-500"
                  onClick={() => onEdit(budget)}
                >
                  <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isDeleting}
                aria-label={`Delete budget ${budget.name}`}
                title={`Delete budget ${budget.name}`}
                className="h-7 w-7 p-0 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 focus-visible:ring-2 focus-visible:ring-rose-500"
                onClick={handleDelete}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Content */}
        <CardContent className="p-4 space-y-4">
          {/* Main Numbers */}
          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Spent</span>
              <span className="text-xl font-black text-slate-900 dark:text-slate-100 font-mono tabular-nums tracking-tight">
                {formatCurrency(budget.usedAmount)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Limit</span>
              <span className="text-sm font-bold text-slate-700 dark:text-slate-300 font-mono tabular-nums">
                {formatCurrency(budget.amount)}
              </span>
            </div>
          </div>

          {/* Dynamic Progress Bar (SECTION 2: Green, Yellow, Red) */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px] font-semibold">
              <span className={`font-mono tabular-nums ${isExceeded ? "text-rose-600 font-bold" : isWarning ? "text-amber-600 font-bold" : "text-emerald-600"}`}>
                {budget.usedPercentage}% Used
              </span>
              <span className="text-slate-500 font-mono tabular-nums">
                {formatCurrency(budget.remainingAmount)} remaining
              </span>
            </div>
            <div 
              role="progressbar"
              aria-label={`${budget.name} budget progress: ${budget.usedPercentage}% used, ${formatCurrency(budget.remainingAmount)} remaining`}
              aria-valuenow={Math.min(100, Math.round(budget.usedPercentage))}
              aria-valuemin={0}
              aria-valuemax={100}
              className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden"
            >
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, budget.usedPercentage)}%` }}
                transition={{ duration: shouldReduceMotion ? 0 : 0.6, ease: "easeOut" }}
                className={`h-full rounded-full ${
                  isExceeded
                    ? "bg-gradient-to-r from-rose-500 to-pink-500"
                    : isWarning
                    ? "bg-gradient-to-r from-amber-500 to-yellow-500"
                    : "bg-gradient-to-r from-emerald-500 to-teal-400"
                }`}
              />
            </div>
          </div>

          {/* Daily Run-Rate Metric & Days Left (SECTION 2) */}
          <div className="grid grid-cols-2 gap-2 text-xs pt-1">
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 font-medium block">Daily Allowance</span>
              <span className="font-extrabold text-slate-900 dark:text-slate-100 block mt-0.5 font-mono tabular-nums">
                {formatCurrency(budget.dailyBudgetRemaining)} / day
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 font-medium block">Days Left</span>
              <span className="font-extrabold text-slate-900 dark:text-slate-100 block mt-0.5 font-mono tabular-nums">
                {budget.remainingDays} Days
              </span>
            </div>
          </div>
        </CardContent>
      </div>

      {/* Footer Alert Status Banner (SECTION 3) */}
      <div className={`p-3 text-xs border-t flex items-center justify-between ${
        isExceeded
          ? "bg-rose-100/50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200"
          : isWarning
          ? "bg-amber-100/50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200"
          : "bg-slate-50/60 dark:bg-slate-900/40 text-slate-600 dark:text-slate-400 border-slate-100 dark:border-slate-800"
      }`}>
        <div className="flex items-center gap-1.5">
          {isExceeded ? (
            <AlertTriangle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
          ) : isWarning ? (
            <Clock className="h-3.5 w-3.5 text-amber-600 shrink-0" />
          ) : (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
          )}
          <span className="font-medium text-[11px]">
            {isExceeded
              ? "Budget Limit Exceeded"
              : isWarning
              ? `Alert: Exceeded ${budget.alertThreshold}% threshold`
              : "Spending On Track"}
          </span>
        </div>
        <span className="text-[10px] font-mono text-slate-400">
          Ends {formatDate(budget.endDate)}
        </span>
      </div>
    </Card>
    </motion.div>
  );
}

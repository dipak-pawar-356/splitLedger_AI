"use client";

import { useState } from "react";
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
    <Card className={`rounded-3xl border shadow-sm transition-all overflow-hidden flex flex-col justify-between ${
      isExceeded
        ? "border-rose-300 dark:border-rose-900 bg-rose-50/15 dark:bg-rose-950/10"
        : isWarning
        ? "border-amber-300 dark:border-amber-900 bg-amber-50/15 dark:bg-amber-950/10"
        : "border-slate-200/80 dark:border-slate-800 bg-card"
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
                  className="h-7 w-7 p-0 rounded-lg text-slate-400 hover:text-slate-700"
                  onClick={() => onEdit(budget)}
                >
                  <Edit3 className="h-3.5 w-3.5" />
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isDeleting}
                className="h-7 w-7 p-0 rounded-lg text-rose-400 hover:text-rose-600"
                onClick={handleDelete}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Content */}
        <CardContent className="p-4 space-y-4">
          {/* Main Numbers */}
          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Spent</span>
              <span className="text-xl font-black text-slate-900 dark:text-slate-100">
                {formatCurrency(budget.usedAmount)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Limit</span>
              <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                {formatCurrency(budget.amount)}
              </span>
            </div>
          </div>

          {/* Dynamic Progress Bar (SECTION 2: Green, Yellow, Red) */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px] font-semibold">
              <span className={isExceeded ? "text-rose-600 font-bold" : isWarning ? "text-amber-600 font-bold" : "text-emerald-600"}>
                {budget.usedPercentage}% Used
              </span>
              <span className="text-slate-500">
                {formatCurrency(budget.remainingAmount)} remaining
              </span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isExceeded
                    ? "bg-rose-500"
                    : isWarning
                    ? "bg-amber-500"
                    : "bg-emerald-500"
                }`}
                style={{ width: `${Math.min(100, budget.usedPercentage)}%` }}
              />
            </div>
          </div>

          {/* Daily Run-Rate Metric & Days Left (SECTION 2) */}
          <div className="grid grid-cols-2 gap-2 text-xs pt-1">
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 font-medium block">Daily Allowance</span>
              <span className="font-extrabold text-slate-900 dark:text-slate-100 block mt-0.5">
                {formatCurrency(budget.dailyBudgetRemaining)} / day
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 font-medium block">Days Left</span>
              <span className="font-extrabold text-slate-900 dark:text-slate-100 block mt-0.5">
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
  );
}

"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SmartRecommendation } from "@/actions/financial-intelligence";
import { 
  Zap, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle, 
  Bell, 
  Target, 
  UserCheck, 
  Layers, 
  IndianRupee 
} from "lucide-react";
import Link from "next/link";
import { SettleAllDialog } from "@/components/dialogs/settle-all-dialog";
import { ReminderDialog } from "@/components/dialogs/reminder-dialog";

interface SmartRecommendationsViewProps {
  recommendations: SmartRecommendation[];
  onOpenBudgetDialog?: () => void;
}

export function SmartRecommendationsView({
  recommendations,
  onOpenBudgetDialog,
}: SmartRecommendationsViewProps) {
  const getPriorityBadge = (priority: SmartRecommendation["priority"]) => {
    if (priority === "high") {
      return <Badge className="bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800 text-[10px] font-bold">High Priority</Badge>;
    }
    if (priority === "medium") {
      return <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 text-[10px] font-bold">Medium Priority</Badge>;
    }
    return <Badge variant="secondary" className="text-[10px] font-bold">Optimization</Badge>;
  };

  const renderActionButton = (rec: SmartRecommendation) => {
    if (rec.actionType === "settle_up") {
      return (
        <SettleAllDialog
          trigger={
            <Button size="sm" className="rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-xs gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Settle Now</span>
            </Button>
          }
        />
      );
    }
    if (rec.actionType === "send_reminder") {
      return (
        <ReminderDialog
          recipientName="Group Members"
          trigger={
            <Button size="sm" variant="outline" className="rounded-xl text-xs font-semibold text-amber-600 border-amber-300 dark:border-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30 gap-1.5">
              <Bell className="h-3.5 w-3.5" />
              <span>Send Reminder</span>
            </Button>
          }
        />
      );
    }
    if (rec.actionType === "create_budget" && onOpenBudgetDialog) {
      return (
        <Button size="sm" className="rounded-xl text-xs font-bold bg-primary text-primary-foreground shadow-xs gap-1.5" onClick={onOpenBudgetDialog}>
          <Target className="h-3.5 w-3.5" />
          <span>Set Budget</span>
        </Button>
      );
    }
    if (rec.actionType === "view_profile") {
      return (
        <Link href="/dashboard/profile">
          <Button size="sm" variant="outline" className="rounded-xl text-xs font-semibold gap-1.5 hover:border-blue-400">
            <UserCheck className="h-3.5 w-3.5 text-blue-500" />
            <span>Update Profile</span>
          </Button>
        </Link>
      );
    }
    return (
      <Link href="/dashboard/transactions">
        <Button size="sm" variant="outline" className="rounded-xl text-xs font-semibold gap-1.5 hover:border-primary/50">
          <span>View Ledger</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </Link>
    );
  };

  return (
    <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden bg-card transition-all duration-300 hover:shadow-md">
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/80 bg-gradient-to-r from-slate-50/80 via-amber-50/20 to-transparent dark:from-slate-900/40 dark:via-amber-950/20 dark:to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20 shadow-xs shrink-0">
              <Zap className="h-5 w-5" />
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
          <Badge variant="outline" className="text-xs font-mono font-bold text-amber-600 border-amber-200 dark:border-amber-800 bg-amber-500/5">
            {recommendations.length} Suggestions
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 space-y-3">
        {recommendations.length > 0 ? (
          recommendations.map((rec) => (
            <motion.div
              key={rec.id}
              whileHover={{ y: -2, scale: 1.005 }}
              transition={{ duration: 0.2 }}
              className="p-4 rounded-2xl border border-slate-200/70 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/40 hover:border-amber-500/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                    {rec.title}
                  </h4>
                  {getPriorityBadge(rec.priority)}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
                  {rec.reason} {rec.suggestedAction}
                </p>
              </div>

              <div className="shrink-0 pt-1 sm:pt-0">
                {renderActionButton(rec)}
              </div>
            </motion.div>
          ))
        ) : (
          <div className="py-10 text-center text-slate-400 text-xs space-y-2 border border-dashed rounded-2xl">
            <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-500 mb-1" />
            <p className="font-semibold text-slate-700 dark:text-slate-300">All actions are up to date</p>
            <p>No immediate financial actions or settlements required.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


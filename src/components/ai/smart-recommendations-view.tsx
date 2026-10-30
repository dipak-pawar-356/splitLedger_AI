"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SmartRecommendation } from "@/actions/financial-intelligence";
import { formatInlineText } from "@/components/ai/formatted-ai-answer";
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
  const shouldReduceMotion = useReducedMotion();

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
            <Button size="sm" aria-label="Settle outstanding debts now" className="rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-xs gap-1.5 focus-visible:ring-2 focus-visible:ring-teal-500">
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
            <Button size="sm" variant="outline" aria-label="Send reminder to group members" className="rounded-xl text-xs font-semibold text-amber-600 border-amber-300 dark:border-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30 gap-1.5 focus-visible:ring-2 focus-visible:ring-amber-500">
              <Bell className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Send Reminder</span>
            </Button>
          }
        />
      );
    }
    if (rec.actionType === "create_budget" && onOpenBudgetDialog) {
      return (
        <Button size="sm" aria-label="Set up a budget" className="rounded-xl text-xs font-bold bg-primary text-primary-foreground shadow-xs gap-1.5 focus-visible:ring-2 focus-visible:ring-primary" onClick={onOpenBudgetDialog}>
          <Target className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Set Budget</span>
        </Button>
      );
    }
    if (rec.actionType === "view_profile") {
      return (
        <Link href="/dashboard/profile" aria-label="Go to profile page">
          <Button size="sm" variant="outline" className="rounded-xl text-xs font-semibold gap-1.5 hover:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-500">
            <UserCheck className="h-3.5 w-3.5 text-blue-500" aria-hidden="true" />
            <span>Update Profile</span>
          </Button>
        </Link>
      );
    }
    return (
      <Link href="/dashboard/transactions" aria-label="View transactions ledger">
        <Button size="sm" variant="outline" className="rounded-xl text-xs font-semibold gap-1.5 hover:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary">
          <span>View Ledger</span>
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      </Link>
    );
  };

  return (
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
          <Badge variant="outline" className="text-xs font-mono tabular-nums font-bold text-amber-600 border-amber-200 dark:border-amber-800 bg-amber-500/5">
            {recommendations.length} Suggestions
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 space-y-3">
        {recommendations.length > 0 ? (
          recommendations.map((rec) => (
            <motion.article
              key={rec.id}
              role="article"
              aria-label={rec.title}
              whileHover={shouldReduceMotion ? undefined : { y: -2, scale: 1.005 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="p-4 rounded-2xl border border-slate-200/70 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/40 hover:border-amber-500/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                    {formatInlineText(rec.title)}
                  </h4>
                  {getPriorityBadge(rec.priority)}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
                  {formatInlineText(rec.reason)} {formatInlineText(rec.suggestedAction)}
                </p>
              </div>

              <div className="shrink-0 pt-1 sm:pt-0">
                {renderActionButton(rec)}
              </div>
            </motion.article>
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


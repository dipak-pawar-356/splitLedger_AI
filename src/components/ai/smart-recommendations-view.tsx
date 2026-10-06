"use client";

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
  DollarSign 
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
      return <Badge className="bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-200 text-[10px] font-bold">High Priority</Badge>;
    }
    if (priority === "medium") {
      return <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 text-[10px] font-bold">Medium Priority</Badge>;
    }
    return <Badge variant="secondary" className="text-[10px] font-bold">Optimization</Badge>;
  };

  const renderActionButton = (rec: SmartRecommendation) => {
    if (rec.actionType === "settle_up") {
      return (
        <SettleAllDialog
          trigger={
            <Button size="sm" className="rounded-xl text-xs font-semibold bg-teal-600 hover:bg-teal-700 gap-1">
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
            <Button size="sm" variant="outline" className="rounded-xl text-xs text-amber-600 border-amber-300 hover:bg-amber-50 gap-1">
              <Bell className="h-3.5 w-3.5" />
              <span>Send Reminder</span>
            </Button>
          }
        />
      );
    }
    if (rec.actionType === "create_budget" && onOpenBudgetDialog) {
      return (
        <Button size="sm" className="rounded-xl text-xs font-semibold bg-primary gap-1" onClick={onOpenBudgetDialog}>
          <Target className="h-3.5 w-3.5" />
          <span>Set Budget</span>
        </Button>
      );
    }
    if (rec.actionType === "view_profile") {
      return (
        <Link href="/dashboard/profile">
          <Button size="sm" variant="outline" className="rounded-xl text-xs gap-1">
            <UserCheck className="h-3.5 w-3.5 text-blue-500" />
            <span>Update Profile</span>
          </Button>
        </Link>
      );
    }
    return (
      <Link href="/dashboard/transactions">
        <Button size="sm" variant="outline" className="rounded-xl text-xs gap-1">
          <span>View Ledger</span>
          <ArrowRight className="h-3 w-3" />
        </Button>
      </Link>
    );
  };

  return (
    <Card className="rounded-3xl border shadow-sm overflow-hidden bg-card">
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-bold">Smart Action Recommendations</CardTitle>
              <CardDescription className="text-xs">
                Context-aware recommendations to cut unnecessary expenses and boost your financial score
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="text-xs font-mono">
            {recommendations.length} Suggestions
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-3">
        {recommendations.length > 0 ? (
          recommendations.map((rec) => (
            <div
              key={rec.id}
              className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
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
            </div>
          ))
        ) : (
          <div className="py-8 text-center text-slate-400 text-xs">
            <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-500 mb-1" />
            <p className="font-semibold text-slate-700 dark:text-slate-300">All actions are up to date</p>
            <p>No immediate financial actions or settlements required.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, 
  AlertTriangle, 
  Bell, 
  ArrowRight, 
  Clock, 
  DollarSign, 
  CheckCheck
} from "lucide-react";
import Link from "next/link";

interface PendingTask {
  id: string;
  title: string;
  subtitle: string;
  type: "settlement" | "budget" | "reminder" | "payment";
  amount?: number;
  href: string;
  priority: "high" | "medium" | "low";
}

interface DashboardPendingTasksProps {
  tasks: PendingTask[];
}

export function DashboardPendingTasks({ tasks }: DashboardPendingTasksProps) {
  const getTaskIcon = (type: string, priority: string) => {
    switch (type) {
      case "settlement":
        return <DollarSign className="h-4 w-4 text-emerald-500" />;
      case "budget":
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case "reminder":
        return <Bell className="h-4 w-4 text-blue-500" />;
      default:
        return <Clock className="h-4 w-4 text-primary" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high":
        return (
          <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 text-[10px] font-bold">
            Action Required
          </Badge>
        );
      case "medium":
        return (
          <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] font-bold">
            Pending
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-[10px]">
            Normal
          </Badge>
        );
    }
  };

  return (
    <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden bg-card">
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Pending Tasks
                </CardTitle>
                <Badge variant="secondary" className="text-[10px] font-bold h-5 px-1.5">
                  {tasks.length}
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Settlement confirmations, debts, and budget alerts
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {tasks.length > 0 ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {tasks.map((task) => (
              <Link
                key={task.id}
                href={task.href}
                className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 shrink-0 group-hover:scale-105 transition-transform">
                    {getTaskIcon(task.type, task.priority)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-xs text-slate-900 dark:text-slate-100 group-hover:text-primary transition-colors truncate">
                      {task.title}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      {task.subtitle}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {getPriorityBadge(task.priority)}
                  <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCheck className="h-5 w-5" />
            </div>
            <p className="font-bold text-xs text-slate-900 dark:text-slate-100">All Caught Up!</p>
            <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
              No pending settlements or threshold alerts requiring your attention right now.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

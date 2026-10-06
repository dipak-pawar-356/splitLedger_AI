"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AIInsight } from "@/actions/financial-intelligence";
import { 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle2, 
  PiggyBank, 
  Clock, 
  Zap 
} from "lucide-react";

interface AIInsightsFeedProps {
  insights: AIInsight[];
}

export function AIInsightsFeed({ insights }: AIInsightsFeedProps) {
  const getSeverityIcon = (type: AIInsight["type"], severity: AIInsight["severity"]) => {
    if (severity === "warning" || severity === "alert") {
      return <AlertTriangle className="h-4 w-4 text-rose-500" />;
    }
    if (severity === "positive") {
      return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    }
    if (type === "savings_alert") {
      return <PiggyBank className="h-4 w-4 text-teal-500" />;
    }
    return <Sparkles className="h-4 w-4 text-primary" />;
  };

  return (
    <Card className="rounded-3xl border shadow-sm overflow-hidden bg-card">
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-bold">AI Financial Insights</CardTitle>
              <CardDescription className="text-xs">
                Intelligent financial summaries and pattern detections generated from your live transactions
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="text-xs font-mono">
            {insights.length} Signals
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-3">
        {insights.length > 0 ? (
          insights.map((insight) => (
            <div
              key={insight.id}
              className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 hover:border-primary/40 transition-colors flex items-start justify-between gap-3"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="p-2 rounded-xl bg-background border shadow-xs shrink-0 mt-0.5">
                  {getSeverityIcon(insight.type, insight.severity)}
                </div>
                <div className="space-y-0.5 min-w-0">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                    {insight.title}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
                    {insight.description}
                  </p>
                </div>
              </div>

              {insight.metricValue && (
                <Badge variant="secondary" className="text-xs font-mono font-bold shrink-0">
                  {insight.metricValue}
                </Badge>
              )}
            </div>
          ))
        ) : (
          <div className="py-8 text-center text-slate-400 text-xs">
            <Sparkles className="h-8 w-8 mx-auto text-slate-300 mb-1" />
            <p className="font-semibold text-slate-700 dark:text-slate-300">All spending patterns are stable</p>
            <p>No sudden spikes or velocity surges detected.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

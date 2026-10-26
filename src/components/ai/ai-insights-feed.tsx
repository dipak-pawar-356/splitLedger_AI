"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AIInsight } from "@/actions/financial-intelligence";
import { formatInlineText } from "@/components/ai/formatted-ai-answer";
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
  const shouldReduceMotion = useReducedMotion();

  const getSeverityIcon = (type: AIInsight["type"], severity: AIInsight["severity"]) => {
    if (severity === "warning" || severity === "alert") {
      return <AlertTriangle className="h-4 w-4 text-rose-500" aria-hidden="true" />;
    }
    if (severity === "positive") {
      return <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-hidden="true" />;
    }
    if (type === "savings_alert") {
      return <PiggyBank className="h-4 w-4 text-teal-500" aria-hidden="true" />;
    }
    return <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />;
  };

  return (
    <Card 
      role="region"
      aria-label="AI financial insights feed"
      className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden bg-card transition-all duration-300 hover:shadow-md"
    >
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/80 bg-gradient-to-r from-slate-50/80 via-purple-50/20 to-transparent dark:from-slate-900/40 dark:via-purple-950/20 dark:to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/20 shadow-xs shrink-0">
              <Sparkles className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                AI Financial Insights
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Intelligent financial summaries and pattern detections generated from your live transactions
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="text-xs font-mono tabular-nums font-bold text-purple-600 border-purple-200 dark:border-purple-800 bg-purple-500/5">
            {insights.length} Signals
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 space-y-3">
        {insights.length > 0 ? (
          insights.map((insight) => (
            <motion.article
              key={insight.id}
              role="article"
              aria-label={insight.title}
              whileHover={shouldReduceMotion ? undefined : { y: -2, scale: 1.005 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="p-4 rounded-2xl border border-slate-200/70 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/40 hover:border-purple-500/40 transition-colors flex items-start justify-between gap-3 shadow-2xs"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="p-2 rounded-xl bg-background border border-slate-200/60 dark:border-slate-700/60 shadow-xs shrink-0 mt-0.5">
                  {getSeverityIcon(insight.type, insight.severity)}
                </div>
                <div className="space-y-1 min-w-0">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                    {formatInlineText(insight.title)}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
                    {formatInlineText(insight.description)}
                  </p>
                </div>
              </div>

              {insight.metricValue && (
                <Badge variant="secondary" className="text-xs font-mono tabular-nums font-bold shrink-0 shadow-2xs">
                  {insight.metricValue}
                </Badge>
              )}
            </motion.article>
          ))
        ) : (
          <div className="py-10 text-center text-slate-400 text-xs space-y-2 border border-dashed rounded-2xl">
            <Sparkles className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-700" />
            <p className="font-semibold text-slate-700 dark:text-slate-300">All spending patterns are stable</p>
            <p>No sudden spikes or velocity surges detected.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


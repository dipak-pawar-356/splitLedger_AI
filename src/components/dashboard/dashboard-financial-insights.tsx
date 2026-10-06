"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, ArrowRight, TrendingUp, Lightbulb, CheckCircle2 } from "lucide-react";
import Link from "next/link";

interface FinancialInsightsProps {
  insights: {
    score: number;
    headline: string;
    keyFindings: string[];
    recommendation: string;
  };
}

export function DashboardFinancialInsights({ insights }: FinancialInsightsProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500/30";
    if (score >= 60) return "text-amber-500 bg-amber-50 dark:bg-amber-950/40 border-amber-500/30";
    return "text-rose-500 bg-rose-50 dark:bg-rose-950/40 border-rose-500/30";
  };

  return (
    <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden bg-gradient-to-br from-card via-card to-primary/[0.03]">
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Financial Insights
              </CardTitle>
              <CardDescription className="text-xs">
                Real-time intelligence from your live PostgreSQL ledger
              </CardDescription>
            </div>
          </div>
          <Badge className={`text-xs font-black px-2.5 py-0.5 border ${getScoreColor(insights.score)}`}>
            {insights.score}/100 Health
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 space-y-4">
        {/* Headline */}
        <div className="p-3.5 rounded-2xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/50">
          <div className="flex items-start gap-2.5">
            <TrendingUp className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug">
              {insights.headline}
            </p>
          </div>
        </div>

        {/* Key Findings List */}
        <div className="space-y-2">
          {insights.keyFindings.map((finding, idx) => (
            <div key={idx} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
              <span>{finding}</span>
            </div>
          ))}
        </div>

        {/* AI Recommendation */}
        <div className="p-3.5 rounded-2xl bg-primary/5 border border-primary/20 flex items-start gap-3">
          <Lightbulb className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold text-primary uppercase tracking-wider">
              Smart Recommendation
            </p>
            <p className="text-xs text-slate-700 dark:text-slate-300 mt-0.5 font-medium leading-relaxed">
              {insights.recommendation}
            </p>
          </div>
        </div>

        {/* Link to AI Center */}
        <div className="pt-1 flex items-center justify-end">
          <Link
            href="/dashboard/ai"
            className="text-xs font-bold text-primary hover:underline flex items-center gap-1.5 group"
          >
            <span>Open AI Financial Intelligence Center</span>
            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

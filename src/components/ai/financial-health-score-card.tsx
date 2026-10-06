"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FinancialHealthScore } from "@/actions/financial-intelligence";
import { 
  ShieldCheck, 
  TrendingUp, 
  TrendingDown,
  Minus,
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  PiggyBank, 
  Scale, 
  Target, 
  Activity, 
  UserCheck,
  Zap,
  Clock,
  Briefcase,
  AlertTriangle,
  ArrowUpRight
} from "lucide-react";
import Link from "next/link";

interface FinancialHealthScoreCardProps {
  healthScore: FinancialHealthScore;
}

export function FinancialHealthScoreCard({ healthScore }: FinancialHealthScoreCardProps) {
  const { score, grade, components, thirteenFactors, strengths, improvements, scoreDelta, changeExplanation, previousScore } = healthScore;

  const getGradeBadgeClass = () => {
    if (score >= 85) return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300";
    if (score >= 70) return "bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border-teal-300";
    if (score >= 50) return "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300";
    if (score >= 35) return "bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 border-orange-300";
    return "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300";
  };

  const tf = thirteenFactors || {
    savings: 10,
    debt: 8,
    budgetDiscipline: 8,
    settlementSpeed: 8,
    profileCompletion: 4,
    verification: 4,
    loanHealth: 6,
    incomeStability: 6,
    expenseStability: 5,
    emergencyFund: 5,
    recurringIncome: 4,
    pendingBills: 4,
    latePayments: 4,
  };

  return (
    <Card className="rounded-3xl border shadow-sm overflow-hidden bg-card">
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                Dynamic Financial Health Score
                <Badge variant="outline" className="text-[10px] font-mono">13 FACTORS</Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                Recalculated in real-time from verified transactions, settlements, and budget allocations.
              </CardDescription>
            </div>
          </div>
          <Badge className={`text-xs px-3 py-1 font-bold ${getGradeBadgeClass()}`}>
            {grade} ({score}/100)
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* Score Radial Visual & Overview */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-5">
            <div className="relative flex items-center justify-center w-20 h-20 rounded-full border-4 border-primary/20 bg-background shadow-inner shrink-0">
              <span className="text-2xl font-black text-primary font-mono">{score}</span>
              <span className="absolute text-[10px] text-slate-400 font-semibold bottom-2">/ 100</span>
            </div>
            <div className="space-y-1">
              <span className="text-xs uppercase font-bold text-slate-400">Rating Grade</span>
              <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">{grade} Financial Posture</h3>
              <p className="text-xs text-slate-500">
                {score >= 70
                  ? "Your financial records reflect disciplined debt settlement, steady savings, and healthy liquidity."
                  : "Address pending group settlements and category budget limits to enhance your health rating."}
              </p>
            </div>
          </div>

          {/* Delta & Change Tracker */}
          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-200/60 dark:border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400">Score Delta</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              {scoreDelta > 0 ? (
                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-mono font-bold text-xs gap-1">
                  <TrendingUp className="h-3 w-3" />
                  +{scoreDelta} pts
                </Badge>
              ) : scoreDelta < 0 ? (
                <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-mono font-bold text-xs gap-1">
                  <TrendingDown className="h-3 w-3" />
                  {scoreDelta} pts
                </Badge>
              ) : (
                <Badge variant="outline" className="font-mono font-bold text-xs gap-1">
                  <Minus className="h-3 w-3" />
                  0 pts
                </Badge>
              )}
            </div>
            <span className="text-[10px] text-slate-400 mt-1">Prev: {previousScore ?? score}</span>
          </div>
        </div>

        {/* Change Explanation Banner */}
        {changeExplanation && (
          <div className="p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/60 flex items-start gap-2.5 text-xs text-indigo-950 dark:text-indigo-200">
            <Sparkles className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
            <p>
              <strong className="font-semibold">Score Dynamics: </strong>
              {changeExplanation}
            </p>
          </div>
        )}

        {/* 13-Factor Breakdown Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              13 Comprehensive Health Factors
            </span>
            <span className="text-[11px] font-mono text-slate-400 font-semibold">100 Max Pts</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 text-xs">
            {/* 1. Savings */}
            <div className="p-2.5 rounded-xl border bg-card space-y-1">
              <div className="flex items-center justify-between text-slate-500">
                <span className="font-semibold flex items-center gap-1">
                  <PiggyBank className="h-3 w-3 text-emerald-500" /> Savings
                </span>
                <span className="font-mono font-bold">{tf.savings}/15</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${(tf.savings / 15) * 100}%` }} />
              </div>
            </div>

            {/* 2. Debt Ratio */}
            <div className="p-2.5 rounded-xl border bg-card space-y-1">
              <div className="flex items-center justify-between text-slate-500">
                <span className="font-semibold flex items-center gap-1">
                  <Scale className="h-3 w-3 text-rose-500" /> Debt Ratio
                </span>
                <span className="font-mono font-bold">{tf.debt}/10</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1">
                <div className="bg-rose-500 h-full rounded-full" style={{ width: `${(tf.debt / 10) * 100}%` }} />
              </div>
            </div>

            {/* 3. Budget Discipline */}
            <div className="p-2.5 rounded-xl border bg-card space-y-1">
              <div className="flex items-center justify-between text-slate-500">
                <span className="font-semibold flex items-center gap-1">
                  <Target className="h-3 w-3 text-indigo-500" /> Budgets
                </span>
                <span className="font-mono font-bold">{tf.budgetDiscipline}/10</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1">
                <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${(tf.budgetDiscipline / 10) * 100}%` }} />
              </div>
            </div>

            {/* 4. Settlement Speed */}
            <div className="p-2.5 rounded-xl border bg-card space-y-1">
              <div className="flex items-center justify-between text-slate-500">
                <span className="font-semibold flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-teal-500" /> Settlements
                </span>
                <span className="font-mono font-bold">{tf.settlementSpeed}/10</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1">
                <div className="bg-teal-500 h-full rounded-full" style={{ width: `${(tf.settlementSpeed / 10) * 100}%` }} />
              </div>
            </div>

            {/* 5. Profile Completion */}
            <div className="p-2.5 rounded-xl border bg-card space-y-1">
              <div className="flex items-center justify-between text-slate-500">
                <span className="font-semibold flex items-center gap-1">
                  <UserCheck className="h-3 w-3 text-cyan-500" /> Profile
                </span>
                <span className="font-mono font-bold">{tf.profileCompletion}/5</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1">
                <div className="bg-cyan-500 h-full rounded-full" style={{ width: `${(tf.profileCompletion / 5) * 100}%` }} />
              </div>
            </div>

            {/* 6. Verification */}
            <div className="p-2.5 rounded-xl border bg-card space-y-1">
              <div className="flex items-center justify-between text-slate-500">
                <span className="font-semibold flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3 text-blue-500" /> Verified
                </span>
                <span className="font-mono font-bold">{tf.verification}/5</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1">
                <div className="bg-blue-500 h-full rounded-full" style={{ width: `${(tf.verification / 5) * 100}%` }} />
              </div>
            </div>

            {/* 7. Loan Health */}
            <div className="p-2.5 rounded-xl border bg-card space-y-1">
              <div className="flex items-center justify-between text-slate-500">
                <span className="font-semibold flex items-center gap-1">
                  <Briefcase className="h-3 w-3 text-violet-500" /> Loans
                </span>
                <span className="font-mono font-bold">{tf.loanHealth}/8</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1">
                <div className="bg-violet-500 h-full rounded-full" style={{ width: `${(tf.loanHealth / 8) * 100}%` }} />
              </div>
            </div>

            {/* 8. Income Stability */}
            <div className="p-2.5 rounded-xl border bg-card space-y-1">
              <div className="flex items-center justify-between text-slate-500">
                <span className="font-semibold flex items-center gap-1">
                  <Activity className="h-3 w-3 text-emerald-500" /> Inflows
                </span>
                <span className="font-mono font-bold">{tf.incomeStability}/8</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${(tf.incomeStability / 8) * 100}%` }} />
              </div>
            </div>

            {/* 9. Expense Stability */}
            <div className="p-2.5 rounded-xl border bg-card space-y-1">
              <div className="flex items-center justify-between text-slate-500">
                <span className="font-semibold flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-amber-500" /> Outflow Var
                </span>
                <span className="font-mono font-bold">{tf.expenseStability}/7</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1">
                <div className="bg-amber-500 h-full rounded-full" style={{ width: `${(tf.expenseStability / 7) * 100}%` }} />
              </div>
            </div>

            {/* 10. Emergency Fund */}
            <div className="p-2.5 rounded-xl border bg-card space-y-1">
              <div className="flex items-center justify-between text-slate-500">
                <span className="font-semibold flex items-center gap-1">
                  <Zap className="h-3 w-3 text-yellow-500" /> Runway
                </span>
                <span className="font-mono font-bold">{tf.emergencyFund}/7</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1">
                <div className="bg-yellow-500 h-full rounded-full" style={{ width: `${(tf.emergencyFund / 7) * 100}%` }} />
              </div>
            </div>

            {/* 11. Recurring Income */}
            <div className="p-2.5 rounded-xl border bg-card space-y-1">
              <div className="flex items-center justify-between text-slate-500">
                <span className="font-semibold flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-indigo-500" /> Recurring
                </span>
                <span className="font-mono font-bold">{tf.recurringIncome}/5</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1">
                <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${(tf.recurringIncome / 5) * 100}%` }} />
              </div>
            </div>

            {/* 12. Late Payments */}
            <div className="p-2.5 rounded-xl border bg-card space-y-1">
              <div className="flex items-center justify-between text-slate-500">
                <span className="font-semibold flex items-center gap-1">
                  <Clock className="h-3 w-3 text-rose-500" /> On-Time
                </span>
                <span className="font-mono font-bold">{tf.latePayments}/5</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1">
                <div className="bg-rose-500 h-full rounded-full" style={{ width: `${(tf.latePayments / 5) * 100}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Strengths & Actionable Recommendations */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Strengths */}
          <div className="p-4 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/60 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" />
              Verified Strengths
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
              {strengths.map((str, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="text-emerald-500 font-bold">•</span>
                  <span>{str}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Actionable Recommendations with Deep Links */}
          <div className="p-4 rounded-2xl bg-amber-50/40 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/60 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4" />
              Target Improvements
            </h4>
            <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
              {improvements.map((imp, idx) => (
                <li key={idx} className="flex items-center justify-between gap-2">
                  <div className="flex items-start gap-1.5">
                    <span className="text-amber-500 font-bold">•</span>
                    <span>{imp}</span>
                  </div>
                  <Link href="/dashboard/budgets">
                    <Button size="sm" variant="ghost" className="h-6 px-1.5 text-[10px] text-primary gap-0.5">
                      Act <ArrowUpRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

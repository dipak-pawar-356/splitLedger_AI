"use client";

import { motion, useReducedMotion } from "framer-motion";
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
  const shouldReduceMotion = useReducedMotion();

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

  const factorList = [
    { key: "savings", label: "Savings", icon: PiggyBank, val: tf.savings, max: 15, color: "text-emerald-500", barBg: "bg-emerald-500" },
    { key: "debt", label: "Debt Ratio", icon: Scale, val: tf.debt, max: 10, color: "text-rose-500", barBg: "bg-rose-500" },
    { key: "budgetDiscipline", label: "Budgets", icon: Target, val: tf.budgetDiscipline, max: 10, color: "text-indigo-500", barBg: "bg-indigo-500" },
    { key: "settlementSpeed", label: "Settlements", icon: CheckCircle2, val: tf.settlementSpeed, max: 10, color: "text-teal-500", barBg: "bg-teal-500" },
    { key: "profileCompletion", label: "Profile", icon: UserCheck, val: tf.profileCompletion, max: 5, color: "text-cyan-500", barBg: "bg-cyan-500" },
    { key: "verification", label: "Verified", icon: ShieldCheck, val: tf.verification, max: 5, color: "text-blue-500", barBg: "bg-blue-500" },
    { key: "loanHealth", label: "Loans", icon: Briefcase, val: tf.loanHealth, max: 8, color: "text-violet-500", barBg: "bg-violet-500" },
    { key: "incomeStability", label: "Inflows", icon: Activity, val: tf.incomeStability, max: 8, color: "text-emerald-500", barBg: "bg-emerald-500" },
    { key: "expenseStability", label: "Outflow Var", icon: TrendingUp, val: tf.expenseStability, max: 7, color: "text-amber-500", barBg: "bg-amber-500" },
    { key: "emergencyFund", label: "Runway", icon: Zap, val: tf.emergencyFund, max: 7, color: "text-yellow-500", barBg: "bg-yellow-500" },
    { key: "recurringIncome", label: "Recurring", icon: Sparkles, val: tf.recurringIncome, max: 5, color: "text-indigo-500", barBg: "bg-indigo-500" },
    { key: "latePayments", label: "On-Time", icon: Clock, val: tf.latePayments, max: 5, color: "text-rose-500", barBg: "bg-rose-500" },
    { key: "pendingBills", label: "Bills Clear", icon: AlertTriangle, val: tf.pendingBills, max: 5, color: "text-orange-500", barBg: "bg-orange-500" },
  ];

  // SVG Gauge calculations
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden bg-card transition-all duration-300 hover:shadow-md">
      <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800/80 bg-gradient-to-r from-slate-50/80 via-emerald-50/20 to-teal-50/20 dark:from-slate-900/40 dark:via-emerald-950/20 dark:to-teal-950/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-xs shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                <span>Dynamic Financial Health Score</span>
                <Badge variant="outline" className="text-[10px] font-mono text-emerald-600 border-emerald-200 dark:border-emerald-800 bg-emerald-500/5">
                  13 FACTORS
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Recalculated in real-time from verified transactions, settlements, and budget allocations
              </CardDescription>
            </div>
          </div>
          <Badge className={`text-xs px-3.5 py-1 font-bold shadow-xs self-start sm:self-auto ${getGradeBadgeClass()}`}>
            {grade} ({score}/100)
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-5 sm:p-6 space-y-6">
        {/* Score Radial Visual & Overview */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-slate-50/90 to-slate-100/50 dark:from-slate-900/50 dark:to-slate-800/30 border border-slate-200/70 dark:border-slate-800">
          <div className="flex items-center gap-5">
            {/* Animated SVG Circular Progress Gauge with WAI-ARIA role */}
            <div
              role="progressbar"
              aria-valuenow={score}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Financial Health Score: ${score} out of 100 (${grade} grade)`}
              className="relative flex items-center justify-center w-24 h-24 shrink-0"
            >
              <svg className="w-full h-full -rotate-90" viewBox="0 0 88 88" aria-hidden="true">
                {/* Background circle */}
                <circle
                  cx="44"
                  cy="44"
                  r={radius}
                  className="stroke-slate-200 dark:stroke-slate-800"
                  strokeWidth="7"
                  fill="transparent"
                />
                {/* Animated progress circle */}
                <motion.circle
                  cx="44"
                  cy="44"
                  r={radius}
                  className={
                    score >= 70
                      ? "stroke-emerald-500"
                      : score >= 50
                      ? "stroke-amber-500"
                      : "stroke-rose-500"
                  }
                  strokeWidth="7"
                  strokeDasharray={circumference}
                  initial={shouldReduceMotion ? false : { strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset }}
                  transition={shouldReduceMotion ? { duration: 0 } : { duration: 1.0, ease: "easeOut" }}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-black font-mono tracking-tight tabular-nums text-slate-900 dark:text-slate-100">
                  {score}
                </span>
                <span className="text-[10px] text-slate-400 font-bold uppercase -mt-0.5">
                  / 100
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] uppercase font-bold text-slate-400">Rating Grade</span>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">
                {grade} Financial Posture
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-md">
                {score >= 70
                  ? "Your financial records reflect disciplined debt settlement, steady savings, and healthy liquidity."
                  : "Address pending group settlements and category budget limits to enhance your health rating."}
              </p>
            </div>
          </div>

          {/* Delta & Change Tracker */}
          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-200/60 dark:border-slate-800 shrink-0">
            <span className="text-[10px] uppercase font-bold text-slate-400">Score Delta</span>
            <div className="flex items-center gap-1.5 mt-1">
              {scoreDelta > 0 ? (
                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-mono tabular-nums font-bold text-xs gap-1">
                  <TrendingUp className="h-3 w-3" />
                  +{scoreDelta} pts
                </Badge>
              ) : scoreDelta < 0 ? (
                <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-mono tabular-nums font-bold text-xs gap-1">
                  <TrendingDown className="h-3 w-3" />
                  {scoreDelta} pts
                </Badge>
              ) : (
                <Badge variant="outline" className="font-mono tabular-nums font-bold text-xs gap-1">
                  <Minus className="h-3 w-3" />
                  0 pts
                </Badge>
              )}
            </div>
            <span className="text-[11px] font-mono tabular-nums text-slate-400 mt-1">Prev: {previousScore ?? score}</span>
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
            <span className="text-[11px] font-mono tabular-nums text-slate-400 font-semibold">100 Max Pts</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 text-xs">
            {factorList.map((f) => {
              const Icon = f.icon;
              const pct = Math.round((f.val / f.max) * 100);

              return (
                <div key={f.key} className="p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-card space-y-1.5 shadow-2xs">
                  <div className="flex items-center justify-between text-slate-500 min-w-0">
                    <span className="font-semibold flex items-center gap-1 truncate text-[11px] sm:text-xs">
                      <Icon className={`h-3 w-3 ${f.color} shrink-0`} />
                      <span className="truncate">{f.label}</span>
                    </span>
                    <span className="font-mono tabular-nums font-bold text-[11px] shrink-0">{f.val}/{f.max}</span>
                  </div>
                  <div
                    role="progressbar"
                    aria-valuenow={f.val}
                    aria-valuemin={0}
                    aria-valuemax={f.max}
                    aria-label={`${f.label}: ${f.val} of ${f.max} points`}
                    className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden"
                  >
                    <div
                      className={`${f.barBg} h-full rounded-full transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
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
                    <Button size="sm" variant="ghost" className="h-6 px-1.5 text-[10px] text-primary gap-0.5 focus-visible:ring-1 focus-visible:ring-primary">
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

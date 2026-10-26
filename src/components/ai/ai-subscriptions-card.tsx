"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Repeat, Calendar, ArrowUpRight, Sparkles, AlertCircle, RefreshCw, Zap } from "lucide-react";
import { getDetectedSubscriptions } from "@/actions/ai-assistant";
import { DetectedSubscription } from "@/lib/ai/subscription-detector";
import { formatCurrency } from "@/lib/utils";

export function AISubscriptionsCard() {
  const [subscriptions, setSubscriptions] = useState<DetectedSubscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadSubscriptions = async () => {
    setIsLoading(true);
    try {
      const data = await getDetectedSubscriptions();
      setSubscriptions(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const totalMonthlyRupees = subscriptions.reduce((sum, s) => sum + s.monthlyAmount, 0);
  const totalAnnualRupees = subscriptions.reduce((sum, s) => sum + s.annualizedCost, 0);

  return (
    <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden bg-card transition-all duration-300 hover:shadow-md">
      <CardHeader className="border-b border-slate-100 dark:border-slate-800/80 bg-gradient-to-r from-slate-50/80 via-purple-50/20 to-pink-50/20 dark:from-slate-900/40 dark:via-purple-950/20 dark:to-pink-950/10 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/20 shadow-xs shrink-0">
              <Repeat className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                <span>Recurring Subscriptions & Utility Calendar</span>
                <Badge variant="outline" className="text-[10px] text-purple-600 border-purple-200 dark:border-purple-800 bg-purple-500/5">
                  Auto-Tracked
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                AI-detected digital subscriptions, broadband, mobile bills, and recurring rents in INR (₹)
              </CardDescription>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 rounded-xl text-xs font-semibold gap-1.5 shadow-2xs self-start sm:self-auto hover:border-purple-500/50"
            onClick={loadSubscriptions}
            disabled={isLoading}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin text-purple-600" : ""}`} />
            <span>{isLoading ? "Scanning..." : "Scan History"}</span>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-5 sm:p-6 space-y-6">
        {/* Aggregated Totals */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <motion.div
            whileHover={{ y: -2 }}
            className="p-5 rounded-2xl bg-gradient-to-br from-slate-50/90 to-purple-50/20 dark:from-slate-900/50 dark:to-purple-950/20 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-1"
          >
            <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-purple-500" />
              Total Monthly Subscriptions Outflow
            </span>
            <p className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1 font-mono">
              {formatCurrency(totalMonthlyRupees, "INR")}
            </p>
            <span className="text-[11px] text-slate-400 block">
              Active recurring commitments
            </span>
          </motion.div>

          <motion.div
            whileHover={{ y: -2 }}
            className="p-5 rounded-2xl bg-gradient-to-br from-slate-50/90 to-pink-50/20 dark:from-slate-900/50 dark:to-pink-950/20 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-1"
          >
            <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-primary" />
              Annual Projected Run-Rate
            </span>
            <p className="text-2xl font-black text-primary mt-1 font-mono">
              {formatCurrency(totalAnnualRupees, "INR")}
            </p>
            <span className="text-[11px] text-slate-400 block">
              12-month projected total run-rate
            </span>
          </motion.div>
        </div>

        {/* Subscriptions List */}
        {subscriptions.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400 space-y-2 border border-dashed rounded-2xl">
            <Repeat className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-700" />
            <p className="font-semibold text-slate-700 dark:text-slate-300">
              {isLoading ? "Analyzing transaction history for recurring bills..." : "No recurring subscriptions detected yet."}
            </p>
            <p>Transactions matching recurring bill intervals will appear here automatically.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-2xs">
            {subscriptions.map((sub) => (
              <motion.div
                key={sub.id}
                whileHover={{ backgroundColor: "rgba(100, 116, 139, 0.04)" }}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                      {sub.name}
                    </span>
                    <Badge variant="outline" className="text-[10px] py-0 px-2 font-semibold">
                      {sub.category}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-500">
                    <span>Next Due: <strong className="text-slate-700 dark:text-slate-300">{sub.nextEstimatedBillingDate}</strong></span>
                    <span>•</span>
                    <span>Annual: <strong>{formatCurrency(sub.annualizedCost, "INR")}</strong></span>
                  </div>
                  {sub.savingRecommendation && (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1.5 font-medium">
                      <Sparkles className="h-3 w-3 shrink-0" />
                      <span>{sub.savingRecommendation}</span>
                    </p>
                  )}
                </div>

                <div className="text-left sm:text-right shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                  <p className="font-black text-base text-slate-900 dark:text-slate-100 font-mono">
                    {formatCurrency(sub.monthlyAmount, "INR")}
                  </p>
                  <p className="text-[10px] text-slate-400 capitalize">{sub.billingCycle} billing</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}


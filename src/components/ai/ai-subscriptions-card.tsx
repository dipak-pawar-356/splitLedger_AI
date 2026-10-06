"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Repeat, Calendar, ArrowUpRight, Sparkles, AlertCircle, RefreshCw } from "lucide-react";
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
    <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden bg-card">
      <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Repeat className="h-4 w-4 text-primary" />
              <span>Recurring Subscriptions & Utility Calendar</span>
            </CardTitle>
            <CardDescription className="text-xs">
              AI-detected digital subscriptions, broadband, mobile bills, and recurring rents in INR (₹)
            </CardDescription>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 rounded-xl text-xs gap-1"
            onClick={loadSubscriptions}
            disabled={isLoading}
          >
            <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
            <span>Scan History</span>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* Aggregated Totals */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800">
            <p className="text-xs text-slate-500 font-semibold">Total Monthly Subscriptions Outflow</p>
            <p className="text-xl font-black text-slate-900 dark:text-slate-100 mt-1">
              {formatCurrency(totalMonthlyRupees, "INR")}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800">
            <p className="text-xs text-slate-500 font-semibold">Annual Projected Run-Rate</p>
            <p className="text-xl font-black text-primary mt-1">
              {formatCurrency(totalAnnualRupees, "INR")}
            </p>
          </div>
        </div>

        {/* Subscriptions List */}
        {subscriptions.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            {isLoading ? "Analyzing transaction history for recurring bills..." : "No recurring subscriptions detected."}
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
            {subscriptions.map((sub) => (
              <div
                key={sub.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-900/30 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-900 dark:text-slate-100">
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
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                      <Sparkles className="h-3 w-3 shrink-0" />
                      <span>{sub.savingRecommendation}</span>
                    </p>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <p className="font-black text-sm text-slate-900 dark:text-slate-100">
                    {formatCurrency(sub.monthlyAmount, "INR")}
                  </p>
                  <p className="text-[10px] text-slate-400 capitalize">{sub.billingCycle} billing</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

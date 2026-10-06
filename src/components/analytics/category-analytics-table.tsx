"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { PieChart, TrendingUp, TrendingDown, Layers, ArrowUpDown } from "lucide-react";

interface CategoryAnalyticsTableProps {
  categories: Array<{
    id: number;
    name: string;
    totalExpense: number;
    transactionCount: number;
    averageExpense: number;
    highestExpense: number;
    lowestExpense: number;
    percentageOfTotal: number;
    previousPeriodExpense: number;
    growthPct: number;
  }>;
  totalExpense: number;
}

export function CategoryAnalyticsTable({
  categories,
  totalExpense,
}: CategoryAnalyticsTableProps) {
  return (
    <Card className="rounded-3xl border shadow-sm overflow-hidden">
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600">
              <PieChart className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-bold">Category-Wise Financial Analytics</CardTitle>
              <CardDescription className="text-xs">
                Deep dive analysis of spending patterns, transaction volume, and growth rates per category
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="text-xs font-mono">
            {categories.length} Categories
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {categories.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50/80 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-right">Total Spent (₹)</th>
                  <th className="py-3 px-4 text-right">% Share</th>
                  <th className="py-3 px-4 text-center">Tx Count</th>
                  <th className="py-3 px-4 text-right">Avg / Tx</th>
                  <th className="py-3 px-4 text-right">Highest / Lowest</th>
                  <th className="py-3 px-4 text-right">Period Growth</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {categories.map((c) => {
                  const isGrowthPositive = c.growthPct > 0;
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                        <span>{c.name}</span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-slate-900 dark:text-slate-100 font-mono">
                        {formatCurrency(c.totalExpense)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Badge variant="secondary" className="text-[10px] font-semibold">
                          {c.percentageOfTotal}%
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-center text-slate-600 dark:text-slate-400 font-medium">
                        {c.transactionCount}
                      </td>
                      <td className="py-3.5 px-4 text-right text-slate-700 dark:text-slate-300 font-mono">
                        {formatCurrency(c.averageExpense)}
                      </td>
                      <td className="py-3.5 px-4 text-right text-slate-500 font-mono text-[11px]">
                        <span className="text-emerald-600">{formatCurrency(c.highestExpense)}</span>
                        <span className="text-slate-400 mx-1">/</span>
                        <span className="text-slate-500">{formatCurrency(c.lowestExpense)}</span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Badge
                          variant="secondary"
                          className={`text-[10px] font-mono ${
                            isGrowthPositive
                              ? "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                              : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                          }`}
                        >
                          {c.growthPct >= 0 ? `+${c.growthPct}%` : `${c.growthPct}%`}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-slate-400 space-y-1 text-xs">
            <Layers className="h-8 w-8 mx-auto text-slate-300 mb-1" />
            <p className="font-semibold text-slate-700 dark:text-slate-300">No category transactions found</p>
            <p>Transactions recorded with categories will be itemized here.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

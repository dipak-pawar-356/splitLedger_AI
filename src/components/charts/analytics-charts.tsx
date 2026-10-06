"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

interface AnalyticsChartsProps {
  expensesByCategory: Array<{ categoryName: string | null; totalAmount: number; transactionCount: number }>;
  expensesByContact: Array<{ contactName: string | null; totalAmount: number; transactionCount: number }>;
  expensesByGroup: Array<{ groupName: string | null; totalAmount: number; transactionCount: number }>;
  monthlyTrend: Array<{ month: string; totalAmount: number }>;
  totalExpenses: number;
}

export default function AnalyticsCharts({
  expensesByCategory,
  expensesByContact,
  expensesByGroup,
  monthlyTrend,
  totalExpenses,
}: AnalyticsChartsProps) {
  const maxCategoryAmount = Math.max(...expensesByCategory.map(c => c.totalAmount), 1);
 const maxContactAmount = Math.max(...expensesByContact.map(c => c.totalAmount), 1);
  const maxGroupAmount = Math.max(...expensesByGroup.map(g => g.totalAmount), 1);
  const maxMonthlyAmount = Math.max(...monthlyTrend.map(m => m.totalAmount), 1);

  return (
    <div className="space-y-6">
      {/* Monthly Spending Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Spending Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {monthlyTrend.map((item) => {
              const percentage = (item.totalAmount / maxMonthlyAmount) * 100;
              const monthName = new Date(item.month).toLocaleString('default', { month: 'short', year: '2-digit' });
              return (
                <div key={item.month}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{monthName}</span>
                    <span className="text-slate-600 dark:text-slate-400">
                      {formatCurrency(item.totalAmount / 100)}
                    </span>
                  </div>
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Category Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Category Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {expensesByCategory.map((cat) => {
              const percentage = (cat.totalAmount / totalExpenses) * 100;
              return (
                <div key={cat.categoryName}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{cat.categoryName || "Uncategorized"}</span>
                    <span className="text-slate-600 dark:text-slate-400">
                      {formatCurrency(cat.totalAmount / 100)} ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Top Contacts */}
      <Card>
        <CardHeader>
          <CardTitle>Top Contacts by Spending</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {expensesByContact.map((contact) => {
              const percentage = (contact.totalAmount / maxContactAmount) * 100;
              return (
                <div key={contact.contactName}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{contact.contactName || "Personal"}</span>
                    <span className="text-slate-600 dark:text-slate-400">
                      {formatCurrency(contact.totalAmount / 100)} ({contact.transactionCount} tx)
                    </span>
                  </div>
                  <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Top Groups */}
      <Card>
        <CardHeader>
          <CardTitle>Top Groups by Spending</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {expensesByGroup.map((group) => {
              const percentage = (group.totalAmount / maxGroupAmount) * 100;
              return (
                <div key={group.groupName}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{group.groupName || "Personal"}</span>
                    <span className="text-slate-600 dark:text-slate-400">
                      {formatCurrency(group.totalAmount / 100)} ({group.transactionCount} tx)
                    </span>
                  </div>
                  <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-pink-500 to-rose-500 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

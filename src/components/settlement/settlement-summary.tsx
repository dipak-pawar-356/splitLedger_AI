import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { ArrowRight, TrendingUp, CheckCircle, AlertCircle, BarChart3 } from "lucide-react";
import type { Settlement, SettlementResult } from "@/lib/settlements/calculator";

interface SettlementSummaryProps {
  settlementResult: SettlementResult;
  onSettle?: (settlement: Settlement) => void;
  currency?: string;
}

export function SettlementSummary({ settlementResult, onSettle, currency }: SettlementSummaryProps) {
  const { settlements, totalAmount, transactionCount, savings, memberCount, guestCount } = settlementResult;
  const displayCurrency = currency || settlementResult.currency;

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Settlement Summary
          </CardTitle>
          {savings > 0 && (
            <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
              <TrendingUp className="h-3 w-3 mr-1" />
              {savings} fewer transactions
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overview Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg">
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Total Amount</p>
            <p className="font-semibold text-lg">
              {formatCurrency(totalAmount / 100, displayCurrency)}
            </p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg">
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Transactions</p>
            <p className="font-semibold text-lg">{transactionCount}</p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg">
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Members</p>
            <p className="font-semibold text-lg">{memberCount}</p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg">
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Guests</p>
            <p className="font-semibold text-lg">{guestCount}</p>
          </div>
        </div>

        {/* Settlements List */}
        {settlements.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Optimal Settlements</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Minimum transfers needed
              </p>
            </div>
            
            {settlements.map((settlement, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-lg border border-slate-200 dark:border-slate-800"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex items-center gap-2 flex-1">
                    <div className="text-right">
                      <p className="font-medium text-sm">{settlement.fromName || "Unknown"}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">owes</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-400 flex-shrink-0" />
                    <div className="text-left">
                      <p className="font-medium text-sm">{settlement.toName || "Unknown"}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">receives</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-bold text-lg text-primary">
                      {formatCurrency(settlement.amount / 100, displayCurrency)}
                    </p>
                  </div>
                  {onSettle && (
                    <Button
                      size="sm"
                      onClick={() => onSettle(settlement)}
                      className="flex-shrink-0"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Settle
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 mx-auto text-green-600 mb-3" />
            <p className="font-semibold text-green-600 dark:text-green-400">All Settled!</p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              No pending settlements needed
            </p>
          </div>
        )}

        {/* Info Banner */}
        {settlements.length > 0 && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-700 dark:text-blue-300">
                <p className="font-medium mb-1">Optimal Settlement Strategy</p>
                <p className="text-xs">
                  These {transactionCount} transactions are the minimum required to settle all debts. 
                  This saves {savings} additional transactions compared to individual settlements.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

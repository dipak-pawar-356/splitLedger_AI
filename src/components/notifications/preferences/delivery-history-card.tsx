"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { History, Search, RefreshCw, Mail, Bell, MessageSquare, CheckCircle2 } from "lucide-react";
import { getNotificationDeliveryHistory } from "@/actions/notifications";
import { formatDate, formatRelativeTime } from "@/lib/utils";

export function DeliveryHistoryCard() {
  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isLoading, setIsLoading] = useState(true);

  const loadHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const items = await getNotificationDeliveryHistory({
        category: selectedCategory,
      });
      setHistoryItems(items);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategory]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const filteredItems = historyItems.filter(
    (item) =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.message.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden bg-card">
      <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <History className="h-4 w-4 text-primary" />
              <span>Notification Delivery Audit History</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Immutable delivery logs tracking notification dispatches across In-App, Email, and WhatsApp channels
            </CardDescription>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 rounded-xl text-xs gap-1"
            onClick={loadHistory}
            disabled={isLoading}
          >
            <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh Logs</span>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-4">
        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full" suppressHydrationWarning>
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search delivery log history..."
              className="pl-8 h-8 rounded-xl text-xs bg-background"
              suppressHydrationWarning
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="h-8 px-2.5 rounded-xl border border-input text-xs bg-background focus:outline-hidden"
          >
            <option value="all">All Categories</option>
            <option value="expense">Expenses</option>
            <option value="settlement">Settlements</option>
            <option value="security">Security Alerts</option>
            <option value="invitation">Invitations</option>
            <option value="report">Reports</option>
          </select>
        </div>

        {/* Delivery Logs Table */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              {isLoading ? "Fetching delivery audit records..." : "No notification logs matching criteria."}
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-slate-50/50 dark:hover:bg-slate-900/30"
                >
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {item.title}
                      </span>
                      <Badge variant="outline" className="text-[10px] uppercase font-semibold py-0 px-1.5">
                        {item.category}
                      </Badge>
                      <Badge
                        variant="secondary"
                        className={`text-[10px] py-0 px-1.5 ${
                          item.priority === "critical"
                            ? "bg-rose-500/10 text-rose-600"
                            : item.priority === "high"
                            ? "bg-amber-500/10 text-amber-600"
                            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                        }`}
                      >
                        {item.priority}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate">{item.message}</p>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-slate-400 shrink-0">
                    <span className="font-mono">{item.deliveryChannel}</span>
                    <span>•</span>
                    <span suppressHydrationWarning>{formatRelativeTime(item.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

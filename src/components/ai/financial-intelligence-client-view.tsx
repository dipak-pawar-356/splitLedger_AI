"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FinancialIntelligenceData,
  getFinancialIntelligence,
} from "@/actions/financial-intelligence";
import { BudgetProgress } from "@/actions/budgets";
import { subscribeFinancialEvents } from "@/lib/events/financial-events";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Target,
  TrendingUp,
  ShieldCheck,
  Zap,
  Plus,
  Brain,
  Camera,
  Scale,
  FileText,
  Upload,
  RefreshCw,
  Search,
  Bot,
  Repeat,
  Mic,
} from "lucide-react";
import { FinancialHealthScoreCard } from "@/components/ai/financial-health-score-card";
import { AIInsightsFeed } from "@/components/ai/ai-insights-feed";
import { SmartRecommendationsView } from "@/components/ai/smart-recommendations-view";
import { FinancialForecastingCard } from "@/components/ai/financial-forecasting-card";
import { BudgetCard } from "@/components/budget/budget-card";
import { BudgetDialog } from "@/components/budget/budget-dialog";
import { AIFinancialAssistantCard } from "@/components/ai/ai-financial-assistant-card";
import { AISubscriptionsCard } from "@/components/ai/ai-subscriptions-card";
import { VoiceAssistantPanel } from "@/components/ai/voice-assistant-panel";
import { AutomationRulesBuilder } from "@/components/ai/automation-rules-builder";
import { BusinessIntelligenceCard } from "@/components/ai/business-intelligence-card";
import { AIFinancialCharts } from "@/components/ai/ai-financial-charts";
import { GlobalAISearchBar } from "@/components/ai/global-ai-search-bar";
import { AIReceiptScannerModal } from "@/components/receipts/ai-receipt-scanner-modal";
import { toast } from "sonner";

interface FinancialIntelligenceClientViewProps {
  initialData: FinancialIntelligenceData;
  categories: Array<{ id: number; name: string }>;
  groups: Array<{ id: number; name: string }>;
}

export function FinancialIntelligenceClientView({
  initialData,
  categories,
  groups,
}: FinancialIntelligenceClientViewProps) {
  const [data, setData] = useState<FinancialIntelligenceData>(initialData);
  const [isMounted, setIsMounted] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isBudgetDialogOpen, setIsBudgetDialogOpen] = useState(false);
  const [budgetToEdit, setBudgetToEdit] = useState<BudgetProgress | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Reload fresh data from database
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const freshData = await getFinancialIntelligence();
      setData(freshData);
      toast.success("Intelligence dashboard synchronized with database");
    } catch {
      toast.error("Failed to refresh financial intelligence data");
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Subscribe to universal real-time events across windows & tabs
  useEffect(() => {
    const unsubscribe = subscribeFinancialEvents((payload) => {
      console.log("Real-time financial update received:", payload.type);
      handleRefresh();
    });

    return () => {
      unsubscribe();
    };
  }, [handleRefresh]);

  const handleCreateBudget = () => {
    setBudgetToEdit(null);
    setIsBudgetDialogOpen(true);
  };

  const handleEditBudget = (b: BudgetProgress) => {
    setBudgetToEdit(b);
    setIsBudgetDialogOpen(true);
  };

  if (!isMounted) {
    return (
      <div className="space-y-6 pb-12 animate-pulse">
        <div className="h-14 bg-slate-100 dark:bg-slate-800 rounded-2xl w-2/3" />
        <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-2xl w-full" />
        <div className="h-64 bg-slate-100 dark:bg-slate-800 rounded-3xl w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12" suppressHydrationWarning>
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              AI Financial Intelligence & Assistant
            </h1>
            <Badge variant="secondary" className="bg-primary/10 text-primary font-bold text-xs">
              ₹ INR Live
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Realtime database-driven financial health, multilingual voice commands, automated rules, forecasting & OCR
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="rounded-xl text-xs font-semibold gap-1.5 h-9"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
            <span>{isRefreshing ? "Syncing..." : "Refresh"}</span>
          </Button>

          <Button
            size="sm"
            className="rounded-xl text-xs font-semibold gap-1.5 bg-primary h-9 shadow-sm"
            onClick={handleCreateBudget}
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Create Budget</span>
          </Button>
        </div>
      </div>

      {/* Global AI Search Bar */}
      <GlobalAISearchBar />

      {/* Main Feature Tabs */}
      <Tabs defaultValue="assistant" className="space-y-6">
        <TabsList className="bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl flex-wrap h-auto gap-1">
          <TabsTrigger value="assistant" className="rounded-xl text-xs font-semibold">
            <Bot className="h-3.5 w-3.5 mr-1.5 inline text-primary" />
            AI Assistant
          </TabsTrigger>
          <TabsTrigger value="voice-automation" className="rounded-xl text-xs font-semibold">
            <Mic className="h-3.5 w-3.5 mr-1.5 inline text-indigo-500" />
            Voice & Automation
          </TabsTrigger>
          <TabsTrigger value="insights" className="rounded-xl text-xs font-semibold">
            <Sparkles className="h-3.5 w-3.5 mr-1.5 inline text-amber-500" />
            Health & Business Intel
          </TabsTrigger>
          <TabsTrigger value="subscriptions" className="rounded-xl text-xs font-semibold">
            <Repeat className="h-3.5 w-3.5 mr-1.5 inline text-indigo-500" />
            Subscriptions
          </TabsTrigger>
          <TabsTrigger value="budgets" className="rounded-xl text-xs font-semibold">
            <Target className="h-3.5 w-3.5 mr-1.5 inline text-emerald-500" />
            Budget Tracker ({data.budgets.length})
          </TabsTrigger>
          <TabsTrigger value="forecasting" className="rounded-xl text-xs font-semibold">
            <TrendingUp className="h-3.5 w-3.5 mr-1.5 inline text-blue-500" />
            Forecasting & Charts
          </TabsTrigger>
          <TabsTrigger value="ocr" className="rounded-xl text-xs font-semibold">
            <Camera className="h-3.5 w-3.5 mr-1.5 inline text-rose-500" />
            Receipt OCR
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: AI Assistant & Q&A */}
        <TabsContent value="assistant" className="space-y-6">
          <AIFinancialAssistantCard />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AIInsightsFeed insights={data.aiInsights} />
            <SmartRecommendationsView
              recommendations={data.recommendations}
              onOpenBudgetDialog={handleCreateBudget}
            />
          </div>
        </TabsContent>

        {/* TAB 2: Multilingual Voice Assistant & Automation Rules */}
        <TabsContent value="voice-automation" className="space-y-6">
          <VoiceAssistantPanel onCommandExecuted={() => handleRefresh()} />
          <AutomationRulesBuilder />
        </TabsContent>

        {/* TAB 3: Financial Health Score & Business Intelligence */}
        <TabsContent value="insights" className="space-y-6">
          <FinancialHealthScoreCard healthScore={data.healthScore} />
          <BusinessIntelligenceCard intelligence={data} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AIInsightsFeed insights={data.aiInsights} />
            <SmartRecommendationsView
              recommendations={data.recommendations}
              onOpenBudgetDialog={handleCreateBudget}
            />
          </div>
        </TabsContent>

        {/* TAB 4: Subscriptions */}
        <TabsContent value="subscriptions" className="space-y-6">
          <AISubscriptionsCard />
        </TabsContent>

        {/* TAB 5: Live Budget Tracker */}
        <TabsContent value="budgets" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Active Spending Budgets
              </h2>
              <p className="text-xs text-slate-500">
                Live automated comparisons of actual expense outflow against your spending targets in INR (₹)
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl text-xs gap-1.5 font-bold"
              onClick={handleCreateBudget}
            >
              <Plus className="h-3.5 w-3.5 text-primary" />
              <span>Add Target</span>
            </Button>
          </div>

          {data.budgets.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {data.budgets.map((b) => (
                <BudgetCard key={b.id} budget={b} onEdit={handleEditBudget} />
              ))}
            </div>
          ) : (
            <Card className="rounded-3xl border-2 border-dashed p-10 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto text-primary">
                <Target className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">No Active Budgets Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Create your first monthly grocery, family, trip, or entertainment budget to keep spending within safe thresholds.
              </p>
              <Button size="sm" className="rounded-xl text-xs font-semibold" onClick={handleCreateBudget}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                Set Up First Budget
              </Button>
            </Card>
          )}
        </TabsContent>

        {/* TAB 6: Forecasting & Live Interactive Charts */}
        <TabsContent value="forecasting" className="space-y-6">
          <FinancialForecastingCard
            forecasts={data.forecasts}
            cashFlow={data.cashFlow}
          />
          <AIFinancialCharts
            cashFlow={data.cashFlow}
            categoryBreakdown={data.categoryBreakdown}
          />
        </TabsContent>

        {/* TAB 7: Receipt OCR Scanner */}
        <TabsContent value="ocr" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="rounded-3xl border shadow-sm p-6 space-y-4 hover:border-primary/40 transition-colors bg-card">
              <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 w-fit">
                <Camera className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-base font-bold">Receipt OCR Scanner</CardTitle>
                <p className="text-xs text-slate-500 mt-1">
                  Upload grocery, restaurant, or fuel bills to automatically extract amount, taxes, and log to database
                </p>
              </div>
              <Button
                size="sm"
                className="w-full rounded-xl text-xs font-semibold bg-primary"
                onClick={() => setIsReceiptModalOpen(true)}
              >
                <Upload className="h-3.5 w-3.5 mr-1.5" />
                Open OCR Scanner Modal
              </Button>
            </Card>

            <Card className="rounded-3xl border shadow-sm p-6 space-y-4 hover:border-primary/40 transition-colors bg-card">
              <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 w-fit">
                <Zap className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-base font-bold">Smart Categorization</CardTitle>
                <p className="text-xs text-slate-500 mt-1">
                  Automatically assigns categories and tags based on merchant title and recurring patterns
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="w-full rounded-xl text-xs font-semibold"
                onClick={() => {
                  toast.success("Categorization models active on all incoming ledger transactions.");
                }}
              >
                Categorization Active
              </Button>
            </Card>

            <Card className="rounded-3xl border shadow-sm p-6 space-y-4 hover:border-primary/40 transition-colors bg-card">
              <div className="p-3 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 w-fit">
                <Brain className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-base font-bold">Subscription Audit</CardTitle>
                <p className="text-xs text-slate-500 mt-1">
                  Identifies recurring monthly utilities, gym memberships, and duplicate digital subscriptions
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="w-full rounded-xl text-xs font-semibold"
                onClick={() => {
                  toast.info("Navigate to the Subscriptions tab to audit recurring outflows.");
                }}
              >
                View Subscriptions
              </Button>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Budget Modal */}
      <BudgetDialog
        open={isBudgetDialogOpen}
        onOpenChange={setIsBudgetDialogOpen}
        categories={categories}
        groups={groups}
        budgetToEdit={budgetToEdit}
      />

      {/* OCR Scanner Modal */}
      <AIReceiptScannerModal
        isOpen={isReceiptModalOpen}
        onOpenChange={setIsReceiptModalOpen}
        onExpenseCreated={() => handleRefresh()}
      />
    </div>
  );
}

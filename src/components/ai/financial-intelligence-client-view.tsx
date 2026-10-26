"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  const [activeTab, setActiveTab] = useState<string>("assistant");
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
      {/* Main Feature Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        {/* Responsive Horizontal Scrollable Sub-Subjects Bar */}
        <div className="relative">
          <div className="p-1.5 rounded-2xl bg-slate-100/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto scrollbar-none backdrop-blur-md shadow-xs">
            {[
              { id: "assistant", label: "AI Assistant", icon: Bot, color: "text-primary" },
              { id: "voice-automation", label: "Voice & Automation", icon: Mic, color: "text-indigo-500" },
              { id: "insights", label: "Health & Business Intel", icon: Sparkles, color: "text-amber-500" },
              { id: "subscriptions", label: "Subscriptions", icon: Repeat, color: "text-purple-500" },
              {
                id: "budgets",
                label: `Budget Tracker`,
                badge: data.budgets.length,
                icon: Target,
                color: "text-emerald-500"
              },
              { id: "forecasting", label: "Forecasting & Charts", icon: TrendingUp, color: "text-blue-500" },
              { id: "ocr", label: "Receipt OCR", icon: Camera, color: "text-rose-500" },
            ].map((sub) => {
              const isActive = activeTab === sub.id;
              const Icon = sub.icon;

              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setActiveTab(sub.id)}
                  className={`relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors shrink-0 ${
                    isActive
                      ? "text-slate-900 dark:text-slate-100"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="active-ai-subsubject-capsule"
                      className="absolute inset-0 bg-white dark:bg-slate-800 rounded-xl shadow-xs border border-slate-200/90 dark:border-slate-700/80"
                      transition={{ type: "spring", stiffness: 450, damping: 32 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-1.5">
                    <Icon className={`h-4 w-4 ${sub.color} shrink-0`} />
                    <span>{sub.label}</span>
                    {sub.badge !== undefined && (
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                        isActive
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                          : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                      }`}>
                        {sub.badge}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {/* TAB 1: AI Assistant & Q&A */}
          {activeTab === "assistant" && (
            <motion.div
              key="assistant"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="space-y-6"
            >
              <AIFinancialAssistantCard />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <AIInsightsFeed insights={data.aiInsights} />
                <SmartRecommendationsView
                  recommendations={data.recommendations}
                  onOpenBudgetDialog={handleCreateBudget}
                />
              </div>
            </motion.div>
          )}

          {/* TAB 2: Multilingual Voice Assistant & Automation Rules */}
          {activeTab === "voice-automation" && (
            <motion.div
              key="voice-automation"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="space-y-6"
            >
              <VoiceAssistantPanel onCommandExecuted={() => handleRefresh()} />
              <AutomationRulesBuilder />
            </motion.div>
          )}

          {/* TAB 3: Financial Health Score & Business Intelligence */}
          {activeTab === "insights" && (
            <motion.div
              key="insights"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="space-y-6"
            >
              <FinancialHealthScoreCard healthScore={data.healthScore} />
              <BusinessIntelligenceCard intelligence={data} />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <AIInsightsFeed insights={data.aiInsights} />
                <SmartRecommendationsView
                  recommendations={data.recommendations}
                  onOpenBudgetDialog={handleCreateBudget}
                />
              </div>
            </motion.div>
          )}

          {/* TAB 4: Subscriptions */}
          {activeTab === "subscriptions" && (
            <motion.div
              key="subscriptions"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="space-y-6"
            >
              <AISubscriptionsCard />
            </motion.div>
          )}

          {/* TAB 5: Live Budget Tracker */}
          {activeTab === "budgets" && (
            <motion.div
              key="budgets"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="space-y-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-slate-50 to-emerald-50/20 dark:from-slate-900/40 dark:to-emerald-950/20 border border-slate-200/80 dark:border-slate-800">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Target className="h-4 w-4 text-emerald-500" />
                    <span>Active Spending Budgets</span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Live automated comparisons of actual expense outflow against your spending targets in INR (₹)
                  </p>
                </div>
                <Button
                  size="sm"
                  className="rounded-xl text-xs gap-1.5 font-bold shadow-xs bg-emerald-600 hover:bg-emerald-700 text-white self-start sm:self-auto"
                  onClick={handleCreateBudget}
                >
                  <Plus className="h-3.5 w-3.5" />
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
                <Card className="rounded-3xl border-2 border-dashed p-10 text-center space-y-4 bg-card/50">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto text-primary shadow-xs">
                    <Target className="h-7 w-7" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">No Active Budgets Found</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                      Create your first monthly grocery, family, trip, or entertainment budget to keep spending within safe thresholds.
                    </p>
                  </div>
                  <Button size="sm" className="rounded-xl text-xs font-bold bg-primary shadow-sm" onClick={handleCreateBudget}>
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Set Up First Budget
                  </Button>
                </Card>
              )}
            </motion.div>
          )}

          {/* TAB 6: Forecasting & Live Interactive Charts */}
          {activeTab === "forecasting" && (
            <motion.div
              key="forecasting"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="space-y-6"
            >
              <FinancialForecastingCard
                forecasts={data.forecasts}
                cashFlow={data.cashFlow}
              />
              <AIFinancialCharts
                cashFlow={data.cashFlow}
                categoryBreakdown={data.categoryBreakdown}
              />
            </motion.div>
          )}

          {/* TAB 7: Receipt OCR Scanner */}
          {activeTab === "ocr" && (
            <motion.div
              key="ocr"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* OCR Scanner Card */}
                <motion.div
                  whileHover={{ y: -4, scale: 1.01 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-6 space-y-4 hover:border-blue-500/50 transition-all bg-card relative overflow-hidden group">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
                    <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 w-fit">
                      <Camera className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                          Receipt OCR Scanner
                        </CardTitle>
                        <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-bold">
                          AI Vision
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        Upload grocery, restaurant, or fuel bills to automatically extract amounts, taxes, and itemized splits.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      className="w-full rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-sm"
                      onClick={() => setIsReceiptModalOpen(true)}
                    >
                      <Upload className="h-3.5 w-3.5 mr-1.5" />
                      Open OCR Scanner Modal
                    </Button>
                  </Card>
                </motion.div>

                {/* Smart Categorization */}
                <motion.div
                  whileHover={{ y: -4, scale: 1.01 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-6 space-y-4 hover:border-emerald-500/50 transition-all bg-card relative overflow-hidden group">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
                    <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 w-fit">
                      <Zap className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                          Smart Categorization
                        </CardTitle>
                        <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                          Active
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        Automatically assigns categories and tags based on merchant title, transaction patterns, and notes.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full rounded-xl text-xs font-semibold hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                      onClick={() => {
                        toast.success("Categorization models active on all incoming ledger transactions.");
                      }}
                    >
                      Categorization Active
                    </Button>
                  </Card>
                </motion.div>

                {/* Subscription Audit */}
                <motion.div
                  whileHover={{ y: -4, scale: 1.01 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-6 space-y-4 hover:border-purple-500/50 transition-all bg-card relative overflow-hidden group">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500" />
                    <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 w-fit">
                      <Brain className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                          Subscription Audit
                        </CardTitle>
                        <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[10px] font-bold">
                          Recurring
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        Identifies recurring monthly utilities, gym memberships, and duplicate digital subscriptions.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full rounded-xl text-xs font-semibold hover:bg-purple-50 dark:hover:bg-purple-950/30"
                      onClick={() => {
                        setActiveTab("subscriptions");
                      }}
                    >
                      View Subscriptions
                    </Button>
                  </Card>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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

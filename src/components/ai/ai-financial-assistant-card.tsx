"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Send, 
  User, 
  ArrowUpRight, 
  CheckCircle2, 
  Search, 
  X, 
  RotateCcw, 
  ChevronDown, 
  ChevronUp, 
  HelpCircle, 
  Loader2, 
  Receipt,
  Users,
  TrendingUp,
  Scale,
  ShieldCheck, 
  FileSpreadsheet, 
  CornerDownLeft,
  Lock,
  ArrowRight
} from "lucide-react";
import { askFinancialAssistant, AIAssistantResponse } from "@/actions/ai-assistant";
import { FormattedAIAnswer, formatInlineText } from "@/components/ai/formatted-ai-answer";
import { TransactionApprovalCardGroup } from "@/components/ai/transaction-approval-card";
import { SplitLedgerAiIcon } from "@/components/ai/split-ledger-ai-icon";
import Link from "next/link";
import { toast } from "sonner";

interface ChatTurn {
  id: string;
  role: "user" | "assistant";
  content: string;
  response?: AIAssistantResponse;
  timestamp: string;
}

interface PromptQuery {
  id: string;
  category: "all" | "spending" | "friends" | "forecast" | "reports";
  icon: string;
  text: string;
  badge: string;
}

interface CapabilityPrompt {
  id: string;
  title: string;
  description: string;
  query: string;
  icon: React.ComponentType<{ className?: string; size?: number | string }>;
  badge: string;
}

const FINANCIAL_CAPABILITIES: CapabilityPrompt[] = [
  {
    id: "cap-log",
    title: "Log Expense via Natural Text",
    description: "Convert freeform text directly into audited ledger entries",
    query: "20 rs for water bottle and 50 rs for travel by bus",
    icon: Receipt,
    badge: "Smart Entry",
  },
  {
    id: "cap-receivables",
    title: "Track Net Receivables",
    description: "Audit who owes money across all shared groups & friends",
    query: "Who owes me money across all my groups?",
    icon: Users,
    badge: "Receivables",
  },
  {
    id: "cap-spending",
    title: "Analyze Monthly Burn Rate",
    description: "Review category distributions, peak transactions & velocity",
    query: "How much did I spend this month and what was my largest expense?",
    icon: TrendingUp,
    badge: "Analytics",
  },
  {
    id: "cap-settlements",
    title: "Debt Netting & Simplification",
    description: "Calculate optimal repayment flow to settle group balances",
    query: "Show pending group settlements and who I need to pay",
    icon: Scale,
    badge: "Settlement",
  },
];

const PROMPT_CATEGORIES = [
  { id: "all", label: "All Audit Inquiries" },
  { id: "spending", label: "Spending & Burn Rate" },
  { id: "friends", label: "Receivables & Groups" },
  { id: "forecast", label: "Health & Forecasting" },
  { id: "reports", label: "Reports & GST Audit" },
] as const;

const PROMPT_LIBRARY: PromptQuery[] = [
  // Spending & Velocity
  { id: "p1", category: "spending", icon: "📊", text: "Why did I spend so much this month?", badge: "Overview" },
  { id: "p2", category: "spending", icon: "💎", text: "What was my largest transaction?", badge: "Peak" },
  { id: "p3", category: "spending", icon: "📉", text: "What was my lowest recorded expense?", badge: "Minimum" },
  { id: "p4", category: "spending", icon: "⚡", text: "What is my daily burn rate?", badge: "Burn Rate" },
  { id: "p5", category: "spending", icon: "🍕", text: "How much did I spend on Food & Dining?", badge: "Food" },
  { id: "p6", category: "spending", icon: "⛽", text: "What are my total Petrol & Fuel expenses?", badge: "Fuel" },
  { id: "p7", category: "spending", icon: "🛒", text: "Show my Groceries & Supplies spending", badge: "Groceries" },
  { id: "p8", category: "spending", icon: "🛍️", text: "What is my Shopping & Retail total?", badge: "Shopping" },
  { id: "p9", category: "spending", icon: "📅", text: "Compare this month with last month", badge: "Comparison" },
  { id: "p10", category: "spending", icon: "🌙", text: "How much do I spend during late nights?", badge: "Late Night" },
  { id: "p11", category: "spending", icon: "🏖️", text: "What are my weekend expenses?", badge: "Weekends" },

  // Friends & Settlements
  { id: "p12", category: "friends", icon: "💰", text: "Who owes me money across groups?", badge: "Receivables" },
  { id: "p13", category: "friends", icon: "👤", text: "Who owes me the most money?", badge: "Top Debtor" },
  { id: "p14", category: "friends", icon: "🤝", text: "Who do I owe money to?", badge: "Payables" },
  { id: "p15", category: "friends", icon: "💵", text: "How much have I recovered from friends?", badge: "Recovered" },
  { id: "p16", category: "friends", icon: "🏆", text: "Which group has the highest spend?", badge: "Top Group" },
  { id: "p17", category: "friends", icon: "👥", text: "Show pending group settlements", badge: "Pending" },

  // Health & Forecasts
  { id: "p18", category: "forecast", icon: "🛡️", text: "What is my financial health score?", badge: "Health" },
  { id: "p19", category: "forecast", icon: "🎯", text: "Predict next month's spending", badge: "Forecast" },
  { id: "p20", category: "forecast", icon: "💳", text: "Where is my money going?", badge: "Distribution" },
  { id: "p21", category: "forecast", icon: "💡", text: "Give me AI financial recommendations", badge: "Advice" },
  { id: "p22", category: "forecast", icon: "📉", text: "How can I reduce my expenses?", badge: "Savings" },

  // Reports & Tax
  { id: "p23", category: "reports", icon: "📑", text: "Summarize my financial report", badge: "Executive" },
  { id: "p24", category: "reports", icon: "🏛️", text: "Show my business vs personal tax breakdown", badge: "Tax Audit" },
  { id: "p25", category: "reports", icon: "🧾", text: "What is my estimated GST input tax credit?", badge: "GST" },
  { id: "p26", category: "reports", icon: "🔒", text: "Explain data encryption and security", badge: "Security" },
  { id: "p27", category: "reports", icon: "👤", text: "Show my profile summary", badge: "Profile" },
];

interface AIFinancialAssistantCardProps {
  categories?: Array<{ id: number; name: string }>;
}

export function AIFinancialAssistantCard({ categories = [] }: AIFinancialAssistantCardProps = {}) {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPromptPanel, setShowPromptPanel] = useState(false);
  const [promptCategory, setPromptCategory] = useState<"all" | "spending" | "friends" | "forecast" | "reports">("all");
  const [promptSearchQuery, setPromptSearchQuery] = useState("");
  const [showAutocomplete, setShowAutocomplete] = useState(false);

  const shouldReduceMotion = useReducedMotion();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatScrollContainerRef = useRef<HTMLDivElement>(null);

  // Initial welcome message from SplitLedger In-House Assistant
  const [messages, setMessages] = useState<ChatTurn[]>([
    {
      id: "turn_welcome",
      role: "assistant",
      content: "Welcome to SplitLedger Financial Intelligence. I am your dedicated in-house chartered assistant, connected directly to your live ledger records with real-time INR (₹) precision. You can type or paste any expense, payment, or ledger question below (e.g. 'Paid 450 rs for dinner with Amit', 'Who owes me money?', 'Analyze my highest expenses this month').",
      timestamp: "Ready",
    },
  ]);

  // Filter prompt library based on search query & active category
  const filteredPrompts = useMemo(() => {
    return PROMPT_LIBRARY.filter((p) => {
      const matchesCat = promptCategory === "all" || p.category === promptCategory;
      const matchesSearch = !promptSearchQuery.trim() || 
        p.text.toLowerCase().includes(promptSearchQuery.toLowerCase()) ||
        p.badge.toLowerCase().includes(promptSearchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [promptCategory, promptSearchQuery]);

  // Autocomplete matching items as user types in the main query bar
  const autocompleteSuggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return PROMPT_LIBRARY.filter((p) => p.text.toLowerCase().includes(q)).slice(0, 4);
  }, [query]);

  // Smooth scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 1) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading]);

  const handleSend = async (questionText: string) => {
    const trimmed = questionText.trim();
    if (!trimmed || isLoading) return;

    const userTurn: ChatTurn = {
      id: `turn_usr_${Date.now()}`,
      role: "user",
      content: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userTurn]);
    setQuery("");
    setShowAutocomplete(false);
    setIsLoading(true);

    try {
      // Find active pending drafts from the most recent assistant turn
      const latestWithDrafts = [...messages]
        .reverse()
        .find((m) => m.role === "assistant" && m.response?.detectedTransactions && m.response.detectedTransactions.length > 0);
      const activeDrafts = latestWithDrafts?.response?.detectedTransactions?.filter(
        (t) => t.status !== "approved" && t.status !== "cancelled"
      );

      const res = await askFinancialAssistant(trimmed, activeDrafts);
      const assistantTurn: ChatTurn = {
        id: `turn_ai_${Date.now()}`,
        role: "assistant",
        content: res.answer,
        response: res,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, assistantTurn]);
    } catch (e: any) {
      toast.error(e?.message || "Failed to retrieve financial intelligence");
      setMessages((prev) => [
        ...prev,
        {
          id: `turn_err_${Date.now()}`,
          role: "assistant",
          content: "I experienced a secure connection timeout accessing your ledger. Please re-submit your financial query.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: `turn_welcome_${Date.now()}`,
        role: "assistant",
        content: "New financial audit session initiated. Ask any question about your spending velocity, shared groups, net balances, or forecasts.",
        timestamp: "Ready",
      },
    ]);
    toast.info("Financial conversation thread reset.");
  };

  return (
    <Card className="rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden bg-card transition-all duration-300 hover:shadow-md flex flex-col">
      {/* 1. Premium Chartered Financial Workspace Header */}
      <CardHeader className="border-b border-slate-200/80 dark:border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white pb-4 p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
          <div className="flex items-center gap-3">
            <div className="relative p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-300 border border-indigo-400/30 shadow-inner shrink-0">
              <SplitLedgerAiIcon size={22} />
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-950 animate-pulse" />
            </div>
            <div>
              <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2 text-white tracking-tight">
                <span>SplitLedger Financial Intelligence</span>
                <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-bold py-0 px-2 tracking-wider uppercase">
                  Chartered Core
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs text-slate-300 font-medium flex items-center gap-2 mt-0.5">
                <span className="flex items-center gap-1 text-slate-300">
                  <Lock className="h-3 w-3 text-emerald-400" />
                  <span>256-Bit Encrypted Session</span>
                </span>
                <span className="text-slate-500">•</span>
                <span>Connected to Live Ledger (INR ₹)</span>
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            <Badge variant="secondary" className="bg-indigo-500/15 text-indigo-200 text-[11px] font-bold py-1 px-2.5 shrink-0 flex items-center gap-1.5 border border-indigo-400/30 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Live Ledger Analysis</span>
            </Badge>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowPromptPanel((prev) => !prev)}
              className="h-8 rounded-xl text-[11px] gap-1 font-semibold text-slate-300 hover:text-white hover:bg-white/10"
              aria-label={showPromptPanel ? "Hide financial inquiry directory" : "Show financial inquiry directory"}
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-indigo-400" aria-hidden="true" />
              <span>{showPromptPanel ? "Hide Directory" : "Query Directory"}</span>
              {showPromptPanel ? (
                <ChevronUp className="h-3 w-3 opacity-60" aria-hidden="true" />
              ) : (
                <ChevronDown className="h-3 w-3 opacity-60" aria-hidden="true" />
              )}
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleResetChat}
              title="Reset conversation"
              aria-label="Start new conversation thread"
              className="h-8 w-8 p-0 rounded-xl text-slate-300 hover:text-white hover:bg-white/10"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 space-y-5 flex-1 flex flex-col bg-slate-50/30 dark:bg-slate-950/20">
        {/* 2. Categorized Financial Inquiry Directory Panel */}
        <AnimatePresence>
          {showPromptPanel && (
            <motion.div
              initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
              animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, height: "auto" }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <div className="p-4 rounded-2xl bg-card border border-slate-200/90 dark:border-slate-800 space-y-3.5 shadow-xs">
                {/* Search Bar for Prompts */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                    <Input
                      value={promptSearchQuery}
                      onChange={(e) => setPromptSearchQuery(e.target.value)}
                      placeholder="Search 25+ chartered queries (e.g. food, debts, burn rate, forecast, tax)..."
                      className="pl-8.5 pr-8 h-9 text-xs rounded-xl bg-background border-slate-200 dark:border-slate-800 shadow-2xs"
                      aria-label="Search prompt library"
                    />
                    {promptSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setPromptSearchQuery("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        aria-label="Clear search"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  <span className="text-[11px] font-mono tabular-nums text-slate-400 font-semibold shrink-0">
                    {filteredPrompts.length} Inquiries Available
                  </span>
                </div>

                {/* Category Filter Pills */}
                <div 
                  role="radiogroup" 
                  aria-label="Filter prompts by category"
                  className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none no-scrollbar"
                >
                  {PROMPT_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      role="radio"
                      aria-checked={promptCategory === cat.id}
                      onClick={() => setPromptCategory(cat.id)}
                      className={`px-3 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                        promptCategory === cat.id
                          ? "bg-slate-900 dark:bg-indigo-600 text-white shadow-xs"
                          : "bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-400/40 hover:text-slate-900 dark:hover:text-slate-200"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Prompts Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-52 overflow-y-auto pr-1">
                  {filteredPrompts.length > 0 ? (
                    filteredPrompts.map((p) => (
                      <motion.button
                        key={p.id}
                        type="button"
                        whileHover={shouldReduceMotion ? {} : { y: -1, scale: 1.01 }}
                        whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
                        onClick={() => handleSend(p.text)}
                        disabled={isLoading}
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 border border-slate-200/70 dark:border-slate-800 hover:border-indigo-400/40 text-left transition-colors flex items-start justify-between gap-2 shadow-2xs group cursor-pointer"
                        aria-label={`Ask query: ${p.text}`}
                      >
                        <div className="flex items-start gap-2 min-w-0">
                          <span className="text-sm shrink-0 mt-0.5" aria-hidden="true">{p.icon}</span>
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2">
                            {p.text}
                          </span>
                        </div>
                        <Badge variant="outline" className="text-[9px] font-mono shrink-0 text-slate-400 border-slate-200 dark:border-slate-800">
                          {p.badge}
                        </Badge>
                      </motion.button>
                    ))
                  ) : (
                    <div className="col-span-full py-6 text-center text-xs text-slate-400">
                      No matching inquiries found for &quot;{promptSearchQuery}&quot;. Type a custom query below.
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 3. Multi-Turn Financial Conversation Stream */}
        <div 
          ref={chatScrollContainerRef}
          role="log"
          aria-live="polite"
          aria-label="Financial conversation history"
          className="flex-1 min-h-[300px] max-h-[520px] overflow-y-auto space-y-4 p-3 sm:p-4 rounded-2xl bg-card border border-slate-200/80 dark:border-slate-800 shadow-inner"
        >
          {messages.map((msg, index) => (
            <div
              key={msg.id}
              className={`flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-200 ${
                msg.role === "user" ? "items-end" : "items-start"
              }`}
            >
              {/* User Bubble */}
              {msg.role === "user" && (
                <div className="max-w-[85%] sm:max-w-[75%] space-y-1">
                  <div className="flex items-center gap-1.5 justify-end text-[10px] text-slate-400 font-mono">
                    <User className="h-3 w-3" aria-hidden="true" />
                    <span>You</span>
                    <span>•</span>
                    <span>{msg.timestamp}</span>
                  </div>
                  <div className="p-3.5 px-4 rounded-2xl rounded-tr-xs bg-slate-900 dark:bg-indigo-900 text-white text-xs sm:text-sm font-medium shadow-xs leading-relaxed">
                    {msg.content}
                  </div>
                </div>
              )}

              {/* Assistant Response Card */}
              {msg.role === "assistant" && (
                <div className="max-w-[98%] sm:max-w-[92%] space-y-1.5 w-full">
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                    <SplitLedgerAiIcon size={13} className="text-indigo-500" />
                    <span className="font-bold text-slate-700 dark:text-slate-300">SplitLedger Financial Intelligence</span>
                    <span>•</span>
                    <span>{msg.timestamp}</span>
                  </div>

                  <div className="p-3.5 sm:p-5 rounded-2xl rounded-tl-xs bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-3.5 sm:space-y-4">
                    {/* Verified Status Banner */}
                    <div className="flex items-center justify-between border-b border-slate-200/70 dark:border-slate-800/80 pb-2.5">
                      <div className="flex items-center gap-2">
                        <div className="p-1 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                          <SplitLedgerAiIcon size={14} />
                        </div>
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider font-mono">
                          Ledger Intelligence Briefing
                        </span>
                      </div>
                      <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-300 dark:border-emerald-800 bg-emerald-500/5 font-semibold font-mono">
                        Audit Verified
                      </Badge>
                    </div>

                    {/* Rich Formatted Answer (Clean, zero raw asterisks) */}
                    <FormattedAIAnswer content={msg.content} />

                    {/* Interactive Capabilities Hub (Visible on welcome message) */}
                    {index === 0 && messages.length === 1 && (
                      <div className="pt-2 border-t border-slate-200/70 dark:border-slate-800/80 space-y-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                          Interactive Financial Capabilities
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {FINANCIAL_CAPABILITIES.map((cap) => {
                            const IconComp = cap.icon;
                            return (
                              <button
                                key={cap.id}
                                type="button"
                                onClick={() => handleSend(cap.query)}
                                disabled={isLoading}
                                className="p-3 rounded-xl bg-card hover:bg-indigo-50/60 dark:hover:bg-indigo-950/30 border border-slate-200/90 dark:border-slate-800 hover:border-indigo-400/40 text-left transition-all duration-150 flex flex-col justify-between group cursor-pointer shadow-2xs hover:-translate-y-0.5 active:translate-y-0"
                              >
                                <div className="flex items-start justify-between w-full">
                                  <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 group-hover:scale-105 transition-transform">
                                    <IconComp size={15} />
                                  </div>
                                  <Badge variant="outline" className="text-[9px] font-mono text-slate-400 border-slate-200 dark:border-slate-800">
                                    {cap.badge}
                                  </Badge>
                                </div>
                                <div className="mt-2">
                                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                    {cap.title}
                                  </p>
                                  <p className="text-[10.5px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                                    {cap.description}
                                  </p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Conversational Transaction Approval Workflow (Explicit User Approval Required) */}
                    {msg.response && msg.response.detectedTransactions && msg.response.detectedTransactions.length > 0 && (
                      <div className="pt-2 border-t border-slate-200/70 dark:border-slate-800/80">
                        <TransactionApprovalCardGroup
                          proposals={msg.response.detectedTransactions}
                          categories={categories}
                        />
                      </div>
                    )}

                    {/* Key Metrics Grid (rendered only when no transaction approval cards exist) */}
                    {msg.response && msg.response.keyMetrics && msg.response.keyMetrics.length > 0 && (!msg.response.detectedTransactions || msg.response.detectedTransactions.length === 0) && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-2.5 pt-2 border-t border-slate-200/70 dark:border-slate-800/80">
                        {msg.response.keyMetrics.map((m, idx) => (
                          <div
                            key={idx}
                            className="p-2 sm:p-2.5 sm:px-3 rounded-xl bg-card border border-slate-200/70 dark:border-slate-800 text-xs shadow-2xs"
                          >
                            <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block truncate font-mono">
                              {m.label}
                            </span>
                            <span className="font-mono tabular-nums font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 block mt-0.5 truncate whitespace-nowrap">
                              {m.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Explanatory Insights (rendered only when no transaction approval cards exist) */}
                    {msg.response && msg.response.insights && msg.response.insights.length > 0 && (!msg.response.detectedTransactions || msg.response.detectedTransactions.length === 0) && (
                      <div className="space-y-1.5 pt-2 border-t border-slate-200/70 dark:border-slate-800/80">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block font-mono">
                          Key Ledger Takeaways
                        </span>
                        <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                          {msg.response.insights.map((ins, iIdx) => (
                            <div key={iIdx} className="flex items-start gap-2">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
                              <span className="leading-relaxed">{formatInlineText(ins)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action Suggestion Buttons & Payment Method Quick Chips */}
                    {msg.response && msg.response.actionSuggestions && msg.response.actionSuggestions.length > 0 && (
                      <div className="flex items-center gap-1.5 sm:gap-2 pt-2 border-t border-slate-200/70 dark:border-slate-800/80 flex-wrap">
                        {msg.response.actionSuggestions.map((act, aIdx) =>
                          act.url.startsWith("action:payment:") ? (
                            <Button
                              key={aIdx}
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const val = act.url.replace("action:payment:", "");
                                handleSend(val);
                              }}
                              className="rounded-xl text-xs h-8 sm:h-7.5 px-3 gap-1.5 font-semibold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border-indigo-400/30 cursor-pointer shadow-2xs touch-press transition-all"
                            >
                              <span>{act.label}</span>
                            </Button>
                          ) : (
                            <Link key={aIdx} href={act.url}>
                              <Button variant="outline" size="sm" className="rounded-xl text-xs h-8 sm:h-7.5 px-3 gap-1.5 font-semibold hover:border-indigo-400/50 touch-press">
                                <span>{act.label}</span>
                                <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                              </Button>
                            </Link>
                          )
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex items-start gap-2.5 animate-in fade-in duration-200">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/20">
                <SplitLedgerAiIcon size={16} className="animate-pulse" />
              </div>
              <div className="p-3.5 px-4 rounded-2xl rounded-tl-xs bg-card border border-slate-200/90 dark:border-slate-800 shadow-xs text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="font-medium">Reconciling ledger records and computing financial analysis...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* 4. Chat Search & Command Input Bar */}
        <div className="space-y-2 relative">
          {/* Autocomplete Dropdown matching live typing */}
          {showAutocomplete && autocompleteSuggestions.length > 0 && (
            <div className="absolute bottom-full mb-2 left-0 right-0 z-20 p-2 rounded-2xl bg-card border border-slate-200 dark:border-slate-800 shadow-xl space-y-1 animate-in fade-in slide-in-from-bottom-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 block font-mono">
                Suggested Ledger Inquiries
              </span>
              {autocompleteSuggestions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setQuery(s.text);
                    handleSend(s.text);
                  }}
                  className="w-full text-left p-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-indigo-50/70 dark:hover:bg-indigo-950/40 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center justify-between transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span>{s.icon}</span>
                    <span className="truncate">{s.text}</span>
                  </div>
                  <CornerDownLeft className="h-3 w-3 text-slate-400 shrink-0" aria-hidden="true" />
                </button>
              ))}
            </div>
          )}

          <form
            role="search"
            aria-label="Ask financial assistant"
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(query);
            }}
            className="flex items-center gap-2"
            suppressHydrationWarning
          >
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" aria-hidden="true" />
              <Input
                value={query}
                onFocus={() => setShowAutocomplete(true)}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setShowAutocomplete(true);
                }}
                placeholder="Ask any financial inquiry (e.g. 'Paid ₹450 for lunch with Rahul', 'Who owes me?', 'Monthly forecast')..."
                className="rounded-2xl text-base sm:text-sm bg-background h-12 pl-10 pr-10 border-slate-200/90 dark:border-slate-800 focus-visible:ring-indigo-500/30 focus-visible:ring-2 shadow-xs"
                disabled={isLoading}
                aria-label="Ask a financial question"
                suppressHydrationWarning
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setShowAutocomplete(false);
                  }}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  aria-label="Clear input"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <Button
              type="submit"
              size="sm"
              className="rounded-2xl h-12 w-12 sm:w-auto px-0 sm:px-5 bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white font-bold gap-2 text-xs shadow-xs hover:shadow-md transition-all shrink-0 cursor-pointer touch-press flex items-center justify-center"
              disabled={isLoading || !query.trim()}
              aria-label={isLoading ? "Reconciling ledger records" : "Send query to financial assistant"}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  <span className="hidden sm:inline">Analyzing...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden sm:inline">Submit Inquiry</span>
                </>
              )}
            </Button>
          </form>

          {/* Quick Follow-up Suggestions Footer Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none no-scrollbar pt-1 touch-pan-x">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0 mr-1 flex items-center gap-1 font-mono">
              <HelpCircle className="h-3 w-3" aria-hidden="true" />
              <span>Quick:</span>
            </span>
            {[
              "Why did I spend so much this month?",
              "Who owes me money?",
              "What is my health score?",
              "Predict next month",
              "Where is my money going?"
            ].map((q, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSend(q)}
                disabled={isLoading}
                className="px-2.5 py-1.5 sm:py-1 min-h-[32px] sm:min-h-auto rounded-lg bg-card hover:bg-indigo-50/70 dark:hover:bg-indigo-950/40 hover:text-indigo-600 dark:hover:text-indigo-400 text-[11px] font-semibold text-slate-600 dark:text-slate-400 whitespace-nowrap transition-colors border border-slate-200/70 dark:border-slate-800 cursor-pointer shrink-0 touch-press"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

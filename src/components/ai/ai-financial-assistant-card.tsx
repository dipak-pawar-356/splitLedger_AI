"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Sparkles, 
  Send, 
  Bot, 
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
  Tag, 
  PiggyBank, 
  TrendingUp, 
  ShieldCheck, 
  Compass, 
  CornerDownLeft 
} from "lucide-react";
import { askFinancialAssistant, AIAssistantResponse } from "@/actions/ai-assistant";
import { FormattedAIAnswer, formatInlineText } from "@/components/ai/formatted-ai-answer";
import { TransactionApprovalCardGroup } from "@/components/ai/transaction-approval-card";
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

const PROMPT_CATEGORIES = [
  { id: "all", label: "All Questions" },
  { id: "spending", label: "Spending & Velocity" },
  { id: "friends", label: "Friends & Settlements" },
  { id: "forecast", label: "Health & Forecasts" },
  { id: "reports", label: "Reports & Tax" },
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
  { id: "p19", category: "forecast", icon: "🎯", text: "Predict next month's spending", badge: "AI Forecast" },
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

  // Initial welcome message from SplitLedger Copilot
  const [messages, setMessages] = useState<ChatTurn[]>([
    {
      id: "turn_welcome",
      role: "assistant",
      content: "Namaste! I am your SplitLedger AI Financial Copilot. You can type or paste any expense, payment, or question below (e.g. '20 rs for water bottle and 50 rs for travel by bus', 'Who owes me money?', 'How much did I spend this month?').",
      timestamp: "Just now",
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
      const res = await askFinancialAssistant(trimmed);
      const assistantTurn: ChatTurn = {
        id: `turn_ai_${Date.now()}`,
        role: "assistant",
        content: res.answer,
        response: res,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, assistantTurn]);
    } catch (e: any) {
      toast.error(e?.message || "Failed to get AI assistant answer");
      setMessages((prev) => [
        ...prev,
        {
          id: `turn_err_${Date.now()}`,
          role: "assistant",
          content: "I experienced a brief connection interruption retrieving your ledger data. Please try your question again.",
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
        content: "New conversation started. Ask any question about your live spending, split groups, friend balances, or forecasts.",
        timestamp: "Just now",
      },
    ]);
    toast.info("Conversation thread reset.");
  };

  return (
    <Card className="rounded-3xl border border-primary/20 dark:border-primary/30 shadow-sm overflow-hidden bg-card transition-all duration-300 hover:shadow-md flex flex-col">
      {/* 1. Header Bar with Pro Model Badge & Controls */}
      <CardHeader className="border-b border-primary/10 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/15 text-primary border border-primary/20 shadow-xs shrink-0">
              <Bot className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                <span>AI Financial Assistant & Chatbot</span>
                <Badge variant="secondary" className="bg-primary/15 text-primary text-[10px] font-bold py-0 px-2 font-mono">
                  Gemini Flash
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Conversational financial copilot connected to your live database records in INR (₹)
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            <Badge variant="secondary" className="bg-primary/10 text-primary text-[11px] font-bold py-1 px-2.5 shrink-0 flex items-center gap-1.5 border border-primary/20">
              <Sparkles className="h-3 w-3" aria-hidden="true" />
              <span>Live Data Context</span>
            </Badge>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowPromptPanel((prev) => !prev)}
              className="h-8 rounded-xl text-[11px] gap-1 font-semibold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label={showPromptPanel ? "Hide internal developer prompts" : "Show internal developer prompts"}
            >
              <Compass className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              <span>{showPromptPanel ? "Hide Prompts" : "Internal Prompts"}</span>
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
              className="h-8 w-8 p-0 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 space-y-5 flex-1 flex flex-col">
        {/* 2. Categorized & Searchable Prompts Command Panel */}
        <AnimatePresence>
          {showPromptPanel && (
            <motion.div
              initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
              animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, height: "auto" }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800/80 space-y-3.5 shadow-xs">
                {/* Search Bar for Prompts */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                    <Input
                      value={promptSearchQuery}
                      onChange={(e) => setPromptSearchQuery(e.target.value)}
                      placeholder="Search 25+ financial queries (e.g. food, debt, forecast, tax)..."
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
                    {filteredPrompts.length} Prompts Found
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
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "bg-background/80 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-800 hover:border-primary/40 hover:text-slate-900 dark:hover:text-slate-200"
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
                        className="p-2.5 rounded-xl bg-background/90 hover:bg-primary/5 border border-slate-200/70 dark:border-slate-800 hover:border-primary/40 text-left transition-colors flex items-start justify-between gap-2 shadow-2xs group cursor-pointer"
                        aria-label={`Ask query: ${p.text}`}
                      >
                        <div className="flex items-start gap-2 min-w-0">
                          <span className="text-sm shrink-0 mt-0.5" aria-hidden="true">{p.icon}</span>
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 group-hover:text-primary transition-colors line-clamp-2">
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
                      No matching financial queries found for &quot;{promptSearchQuery}&quot;. Type custom question below!
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 3. Multi-Turn Chatbot Stream Container */}
        <div 
          ref={chatScrollContainerRef}
          role="log"
          aria-live="polite"
          aria-label="Financial conversation history"
          className="flex-1 min-h-[300px] max-h-[520px] overflow-y-auto space-y-4 p-3 rounded-2xl bg-slate-50/40 dark:bg-slate-900/30 border border-slate-200/60 dark:border-slate-800/60"
        >
          {messages.map((msg) => (
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
                  <div className="p-3.5 px-4 rounded-2xl rounded-tr-xs bg-primary text-primary-foreground text-xs sm:text-sm font-medium shadow-xs">
                    {msg.content}
                  </div>
                </div>
              )}

              {/* Assistant Response Card */}
              {msg.role === "assistant" && (
                <div className="max-w-[96%] sm:max-w-[90%] space-y-1.5 w-full">
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                    <Bot className="h-3 w-3 text-primary" aria-hidden="true" />
                    <span className="font-bold text-slate-700 dark:text-slate-300">SplitLedger AI Copilot</span>
                    <span>•</span>
                    <span>{msg.timestamp}</span>
                  </div>

                  <div className="p-4 sm:p-5 rounded-2xl rounded-tl-xs bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
                    {/* Verified Status Banner */}
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-2.5">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                          Financial Assistant Analysis
                        </span>
                      </div>
                      <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-300 dark:border-emerald-800 bg-emerald-500/5 font-semibold">
                        Verified
                      </Badge>
                    </div>

                    {/* Rich Formatted Answer (No raw asterisks!) */}
                    <FormattedAIAnswer content={msg.content} />

                    {/* Conversational Transaction Approval Workflow (Explicit User Approval Required) */}
                    {msg.response && msg.response.detectedTransactions && msg.response.detectedTransactions.length > 0 && (
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
                        <TransactionApprovalCardGroup
                          proposals={msg.response.detectedTransactions}
                          categories={categories}
                        />
                      </div>
                    )}

                    {/* Key Metrics Grid (if returned by server action) */}
                    {msg.response && msg.response.keyMetrics && msg.response.keyMetrics.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                        {msg.response.keyMetrics.map((m, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 px-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs"
                          >
                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block truncate">
                              {m.label}
                            </span>
                            <span className="font-mono tabular-nums font-bold text-sm text-slate-900 dark:text-slate-100 block mt-0.5 truncate">
                              {m.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Explanatory Insights (if available) */}
                    {msg.response && msg.response.insights && msg.response.insights.length > 0 && (
                      <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                          Reasoning & Context
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

                    {/* Action Suggestion Buttons (if available) */}
                    {msg.response && msg.response.actionSuggestions && msg.response.actionSuggestions.length > 0 && (
                      <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex-wrap">
                        {msg.response.actionSuggestions.map((act, aIdx) => (
                          <Link key={aIdx} href={act.url}>
                            <Button variant="outline" size="sm" className="rounded-xl text-xs h-7.5 px-3 gap-1.5 font-semibold hover:border-primary/50">
                              <span>{act.label}</span>
                              <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                            </Button>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex items-start gap-2 animate-in fade-in duration-200">
              <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              </div>
              <div className="p-3.5 px-4 rounded-2xl rounded-tl-xs bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs text-xs text-slate-500 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
                <span>Analyzing ledger entries and calculating financial intelligence...</span>
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
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 block">
                Suggested Financial Queries
              </span>
              {autocompleteSuggestions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setQuery(s.text);
                    handleSend(s.text);
                  }}
                  className="w-full text-left p-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-primary/10 hover:text-primary flex items-center justify-between transition-colors cursor-pointer"
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
                placeholder="Ask anything about your money (e.g. 'Why did I spend ₹8,000?', 'Who owes me?', 'Next month forecast')..."
                className="rounded-2xl text-xs sm:text-sm bg-background h-12 pl-10 pr-10 border-slate-200/80 dark:border-slate-800 focus-visible:ring-primary/40 focus-visible:ring-2 shadow-xs"
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
              className="rounded-2xl h-12 px-5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold gap-2 text-xs shadow-xs hover:shadow-md transition-all shrink-0 focus-visible:ring-2 focus-visible:ring-primary/50 cursor-pointer"
              disabled={isLoading || !query.trim()}
              aria-label={isLoading ? "Analyzing database records" : "Send question to AI assistant"}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  <span className="hidden sm:inline">Analyzing...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden sm:inline">Ask AI</span>
                </>
              )}
            </Button>
          </form>

          {/* Quick Follow-up Suggestions Footer Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none no-scrollbar pt-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0 mr-1 flex items-center gap-1">
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
                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 hover:bg-primary/10 hover:text-primary text-[11px] font-semibold text-slate-600 dark:text-slate-400 whitespace-nowrap transition-colors border border-slate-200/50 dark:border-slate-700/50 cursor-pointer shrink-0"
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

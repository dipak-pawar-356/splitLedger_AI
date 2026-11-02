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
  FileText,
  BarChart3,
  CreditCard,
  PlusCircle
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

interface WelcomeSuggestion {
  id: string;
  label: string;
  description: string;
  query: string;
  isCreateMode?: boolean;
  icon: React.ComponentType<{ className?: string; size?: number | string }>;
}

export const WELCOME_SUGGESTION_CARDS: WelcomeSuggestion[] = [
  {
    id: "create-transactions",
    label: "Create Transactions",
    description: "Record new entries",
    query: "create transition ",
    isCreateMode: true,
    icon: Receipt,
  },
  {
    id: "explain-reports",
    label: "Explain Reports",
    description: "Monthly statements",
    query: "Explain my financial reports",
    icon: FileSpreadsheet,
  },
  {
    id: "review-expenses",
    label: "Review Expenses",
    description: "Recent spending trends",
    query: "Review my recent expenses and top categories",
    icon: TrendingUp,
  },
  {
    id: "budget-help",
    label: "Budget Help",
    description: "Spending limits & progress",
    query: "Help me review my active budgets",
    icon: Scale,
  },
  {
    id: "receivables",
    label: "Receivables",
    description: "Who owes you money",
    query: "Who owes me money?",
    icon: Users,
  },
  {
    id: "payables",
    label: "Payables",
    description: "Who you need to pay",
    query: "Who do I owe money to?",
    icon: CreditCard,
  },
  {
    id: "notes",
    label: "Notes",
    description: "Financial memos & logs",
    query: "Explain my financial notes",
    icon: FileText,
  },
  {
    id: "analytics",
    label: "Analytics",
    description: "Cashflow & velocity",
    query: "Explain my financial analytics",
    icon: BarChart3,
  },
  {
    id: "dashboard-help",
    label: "Dashboard Help",
    description: "Ledger navigation",
    query: "Help me understand my dashboard values",
    icon: HelpCircle,
  },
];

const PROMPT_CATEGORIES = [
  { id: "all", label: "All Financial Inquiries" },
  { id: "spending", label: "Spending & Outflows" },
  { id: "friends", label: "Receivables & Groups" },
  { id: "forecast", label: "Health & Forecasts" },
  { id: "reports", label: "Reports & Statements" },
] as const;

const PROMPT_LIBRARY: PromptQuery[] = [
  // Spending & Outflows
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
  { id: "p21", category: "forecast", icon: "💡", text: "Give me financial recommendations", badge: "Advice" },
  { id: "p22", category: "forecast", icon: "📉", text: "How can I reduce my expenses?", badge: "Savings" },

  // Reports & Tax
  { id: "p23", category: "reports", icon: "📑", text: "Summarize my financial report", badge: "Executive" },
  { id: "p24", category: "reports", icon: "🏛️", text: "Show my business vs personal tax breakdown", badge: "Tax Breakdown" },
  { id: "p25", category: "reports", icon: "🧾", text: "What is my estimated GST input tax credit?", badge: "GST" },
  { id: "p26", category: "reports", icon: "🔒", text: "Explain security and encryption", badge: "Security" },
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
  const inputRef = useRef<HTMLInputElement>(null);
  const chatScrollContainerRef = useRef<HTMLDivElement>(null);

  // Initial welcome message from SplitLedger Financial Assistant
  const [messages, setMessages] = useState<ChatTurn[]>([
    {
      id: "turn_welcome",
      role: "assistant",
      content: "Hello! How can I help you with your finances today?",
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

      const conversationHistory = messages.map((m) => ({ role: m.role, content: m.content }));
      const res = await askFinancialAssistant(trimmed, activeDrafts, conversationHistory);
      const assistantTurn: ChatTurn = {
        id: `turn_ai_${Date.now()}`,
        role: "assistant",
        content: res.answer,
        response: res,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, assistantTurn]);
    } catch (e: any) {
      toast.error("Financial records temporarily unavailable. Please try again in a moment.");
      setMessages((prev) => [
        ...prev,
        {
          id: `turn_err_${Date.now()}`,
          role: "assistant",
          content: "I couldn't retrieve your latest financial records right now. Please try again in a moment.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (item: WelcomeSuggestion) => {
    if (item.isCreateMode) {
      setQuery("create transition ");
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      handleSend(item.query);
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: `turn_welcome_${Date.now()}`,
        role: "assistant",
        content: "Hello! How can I help you with your finances today?",
        timestamp: "Ready",
      },
    ]);
    toast.info("Financial conversation thread reset.");
  };

  return (
    <Card className="rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden bg-card transition-all duration-300 hover:shadow-md flex flex-col">
      {/* 1. Simplified Professional Header */}
      <CardHeader className="border-b border-slate-200/80 dark:border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white pb-4 p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
          <div className="flex items-center gap-3">
            <div className="relative p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-300 border border-indigo-400/30 shadow-inner shrink-0">
              <SplitLedgerAiIcon size={22} />
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-950 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base sm:text-lg font-bold text-white tracking-tight">
                  SplitLedger Financial Assistant
                </CardTitle>
                <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-bold py-0 px-2 tracking-wider uppercase">
                  Active
                </Badge>
              </div>
              <CardDescription className="text-xs text-slate-300 font-medium flex items-center gap-2 mt-0.5">
                <span className="flex items-center gap-1 text-slate-300">
                  <Lock className="h-3 w-3 text-emerald-400" />
                  <span>Secure Session</span>
                </span>
                <span className="text-slate-500">•</span>
                <span className="text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Connected
                </span>
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleResetChat}
              title="Reset conversation"
              aria-label="Start new conversation thread"
              className="h-8 rounded-xl text-xs gap-1.5 text-slate-300 hover:text-white hover:bg-white/10"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>New Session</span>
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 space-y-5 flex-1 flex flex-col bg-slate-50/30 dark:bg-slate-950/20">
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
                    <span className="font-bold text-slate-700 dark:text-slate-300">SplitLedger Financial Assistant</span>
                    <span>•</span>
                    <span>{msg.timestamp}</span>
                  </div>

                  <div className="p-3.5 sm:p-5 rounded-2xl rounded-tl-xs bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-3.5 sm:space-y-4">
                    {/* Assistant Status Banner */}
                    <div className="flex items-center justify-between border-b border-slate-200/70 dark:border-slate-800/80 pb-2.5">
                      <div className="flex items-center gap-2">
                        <div className="p-1 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                          <SplitLedgerAiIcon size={14} />
                        </div>
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          SplitLedger Financial Assistant
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono font-medium">
                        {msg.response?.detectedTransactions && msg.response.detectedTransactions.length > 0 ? "Transaction Creation" : "Financial Support"}
                      </span>
                    </div>

                    {/* Render Rich Answer or Clean Empty State */}
                    {msg.content.includes("No matching financial records were found") ? (
                      <div className="p-3.5 rounded-xl bg-card border border-slate-200/80 dark:border-slate-800 space-y-3">
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                          <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                          <span className="text-xs font-medium">No matching financial records were found for your request.</span>
                        </div>
                        <div className="flex flex-wrap gap-2 pt-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setQuery("create transition ");
                              setTimeout(() => inputRef.current?.focus(), 50);
                            }}
                            className="text-xs h-7.5 px-3 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border-indigo-400/30"
                          >
                            Create Transactions
                          </Button>
                          <Link href="/dashboard">
                            <Button variant="outline" size="sm" className="text-xs h-7.5 px-3">
                              View Dashboard
                            </Button>
                          </Link>
                          <Link href="/dashboard/reports">
                            <Button variant="outline" size="sm" className="text-xs h-7.5 px-3">
                              Reports
                            </Button>
                          </Link>
                          <Link href="/dashboard/notes">
                            <Button variant="outline" size="sm" className="text-xs h-7.5 px-3">
                              Notes
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ) : (
                      <FormattedAIAnswer content={msg.content} />
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

                    {/* Key Metrics Grid (rendered only when no transaction approval cards exist and real metrics exist) */}
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

                    {/* Explanatory Insights (rendered only when no transaction approval cards exist and real insights exist) */}
                    {msg.response && msg.response.insights && msg.response.insights.length > 0 && (!msg.response.detectedTransactions || msg.response.detectedTransactions.length === 0) && (
                      <div className="space-y-1.5 pt-2 border-t border-slate-200/70 dark:border-slate-800/80">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block font-mono">
                          Key Takeaways
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
                        {msg.response.actionSuggestions.map((act, aIdx) => {
                          if (act.url.startsWith("action:payment:")) {
                            return (
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
                            );
                          }
                          if (act.url.startsWith("action:input:")) {
                            return (
                              <Button
                                key={aIdx}
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const val = act.url.replace("action:input:", "");
                                  setQuery(val);
                                  setTimeout(() => inputRef.current?.focus(), 50);
                                }}
                                className="rounded-xl text-xs h-8 sm:h-7.5 px-3 gap-1.5 font-semibold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border-indigo-400/30 cursor-pointer shadow-2xs touch-press transition-all"
                              >
                                <PlusCircle className="h-3 w-3" />
                                <span>{act.label}</span>
                              </Button>
                            );
                          }
                          if (act.url.startsWith("action:send:")) {
                            return (
                              <Button
                                key={aIdx}
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const val = act.url.replace("action:send:", "");
                                  handleSend(val);
                                }}
                                className="rounded-xl text-xs h-8 sm:h-7.5 px-3 gap-1.5 font-semibold hover:border-indigo-400/50 touch-press"
                              >
                                <span>{act.label}</span>
                              </Button>
                            );
                          }
                          return (
                            <Link key={aIdx} href={act.url}>
                              <Button variant="outline" size="sm" className="rounded-xl text-xs h-8 sm:h-7.5 px-3 gap-1.5 font-semibold hover:border-indigo-400/50 touch-press">
                                <span>{act.label}</span>
                                <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                              </Button>
                            </Link>
                          );
                        })}
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
                <span className="font-medium">Accessing verified ledger records...</span>
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
                Suggested Financial Inquiries
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
                ref={inputRef}
                value={query}
                onFocus={() => setShowAutocomplete(true)}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setShowAutocomplete(true);
                }}
                placeholder="Ask a financial question, or type 'create transition Petrol 500'..."
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
              aria-label={isLoading ? "Accessing financial records" : "Send query to financial assistant"}
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
              "Where did my money go?",
              "How much did I save?",
              "Which friend owes me the highest amount?",
              "Did I overspend?"
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

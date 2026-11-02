"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { askFinancialAssistant } from "@/actions/ai-assistant";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  X, 
  Send, 
  ArrowUpRight,
  ChevronDown,
  RotateCcw,
  ShieldCheck,
  CreditCard,
  TrendingUp,
  Users,
  FileSpreadsheet,
  Receipt,
  Scale,
  Lock,
  FileText,
  BarChart3,
  HelpCircle,
  PlusCircle
} from "lucide-react";
import { toast } from "sonner";
import { SUGGESTED_QUICK_QUESTIONS } from "@/lib/ai/prompts";
import { FormattedAIAnswer, formatInlineText } from "@/components/ai/formatted-ai-answer";
import { TransactionApprovalCardGroup } from "@/components/ai/transaction-approval-card";
import { ProposedTransaction } from "@/lib/ai/nlp-transaction-parser";
import { SplitLedgerAiIcon } from "@/components/ai/split-ledger-ai-icon";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  metrics?: Array<{ label: string; value: string }>;
  insights?: string[];
  actionSuggestions?: Array<{ label: string; url: string }>;
  timestamp: string;
  detectedTransactions?: ProposedTransaction[];
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

const INITIAL_GREETING: Message = {
  id: "welcome_financial_assistant",
  role: "assistant",
  content: "Hello! How can I help you with your finances today?",
  timestamp: "Ready",
};

export function FloatingAIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputQuery, setInputQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [messages, setMessages] = useState<Message[]>([INITIAL_GREETING]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading, isOpen]);

  const handleSend = async (queryText?: string) => {
    const query = queryText || inputQuery;
    if (!query.trim() || loading) return;

    const userMsg: Message = {
      id: `usr_${Date.now()}`,
      role: "user",
      content: query.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery("");
    setLoading(true);

    try {
      // Find active pending drafts from the most recent assistant message with drafts
      const latestWithDrafts = [...messages]
        .reverse()
        .find((m) => m.role === "assistant" && m.detectedTransactions && m.detectedTransactions.length > 0);
      const activeDrafts = latestWithDrafts?.detectedTransactions?.filter(
        (t) => t.status !== "approved" && t.status !== "cancelled"
      );

      const conversationHistory = messages.map((m) => ({ role: m.role, content: m.content }));
      const response = await askFinancialAssistant(query.trim(), activeDrafts, conversationHistory);
      const assistantMsg: Message = {
        id: `ai_${Date.now()}`,
        role: "assistant",
        content: response.answer,
        metrics: response.keyMetrics,
        insights: response.insights,
        actionSuggestions: response.actionSuggestions,
        detectedTransactions: response.detectedTransactions,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      toast.error("Financial records temporarily unavailable. Please try again in a moment.");
      setMessages((prev) => [
        ...prev,
        {
          id: `ai_err_${Date.now()}`,
          role: "assistant",
          content: "I couldn't retrieve your latest financial records right now. Please try again in a moment.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (item: WelcomeSuggestion) => {
    if (item.isCreateMode) {
      setInputQuery("create transition ");
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      handleSend(item.query);
    }
  };

  const resetChat = () => {
    setMessages([
      {
        ...INITIAL_GREETING,
        id: `welcome_${Date.now()}`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  };

  return (
    <>
      {/* Floating Financial Assistant Trigger Button (Bottom Right) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-40 h-12 px-3.5 sm:px-4 rounded-full bg-slate-900/95 dark:bg-slate-950 text-white shadow-xl hover:shadow-2xl border border-indigo-500/30 hover:border-indigo-400/60 transition-all duration-200 flex items-center gap-2.5 group cursor-pointer active:scale-95 touch-press backdrop-blur-md"
          aria-label="Open SplitLedger Financial Assistant"
        >
          <div className="relative flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-400/30 text-indigo-300 group-hover:text-indigo-200 transition-colors">
            <SplitLedgerAiIcon size={16} />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-slate-900 animate-pulse" />
          </div>
          <div className="flex flex-col text-left pr-1 hidden sm:flex">
            <span className="text-[11px] font-bold tracking-tight text-slate-100 flex items-center gap-1">
              SplitLedger Assistant
            </span>
            <span className="text-[9px] font-mono text-emerald-400/90 tracking-wider uppercase">
              Connected • Active
            </span>
          </div>
        </button>
      )}

      {/* Floating Financial Assistant Modal - Native Financial Drawer on Mobile */}
      {isOpen && (
        <>
          {/* Mobile Backdrop Overlay */}
          <div 
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 sm:hidden transition-opacity duration-300" 
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          <div className="fixed inset-x-0 bottom-0 z-50 sm:inset-auto sm:bottom-6 sm:right-6 w-full sm:w-[480px] md:w-[500px] shadow-2xl rounded-t-[28px] sm:rounded-3xl overflow-hidden border-t sm:border border-slate-200/90 dark:border-slate-800 bg-card animate-in fade-in slide-in-from-bottom-4 duration-250 ease-out flex flex-col max-h-[92vh] sm:max-h-[85vh]">
            <Card className="border-0 shadow-none rounded-none flex flex-col h-full bg-card">
              {/* Simplified Professional Header */}
              <CardHeader className="p-3.5 sm:p-4 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white flex flex-col border-b border-slate-800/80 shrink-0">
                {/* Mobile Drawer Grab Bar Indicator */}
                <div className="sm:hidden w-12 h-1 bg-white/20 rounded-full mx-auto mb-2 shrink-0" />
                
                <div className="flex flex-row items-center justify-between w-full">
                  <div className="flex items-center gap-3">
                    <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-500/10 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shadow-inner shrink-0">
                      <SplitLedgerAiIcon size={20} />
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-slate-950" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-xs sm:text-sm font-bold text-white tracking-tight">
                          SplitLedger Financial Assistant
                        </CardTitle>
                        <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[9px] py-0 px-1.5 font-mono font-bold uppercase tracking-wider">
                          Active
                        </Badge>
                      </div>
                      <CardDescription className="text-[10px] text-slate-300 font-medium flex items-center gap-1.5 mt-0.5">
                        <span className="flex items-center gap-1 text-slate-300">
                          <Lock className="h-2.5 w-2.5 text-emerald-400" />
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

                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      title="Reset Session"
                      className="h-8 w-8 p-0 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer touch-press"
                      onClick={resetChat}
                      aria-label="Reset conversation"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      title="Close Assistant"
                      className="h-8 w-8 p-0 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer touch-press"
                      onClick={() => setIsOpen(false)}
                      aria-label="Close Assistant window"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {/* Chat Messages Body */}
              <div 
                role="log"
                aria-live="polite"
                aria-label="Financial conversation stream"
                className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3.5 min-h-[240px] max-h-[58vh] bg-slate-50/50 dark:bg-slate-950/40"
              >
                {messages.map((msg, index) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col text-xs space-y-1 animate-in fade-in slide-in-from-bottom-2 duration-200 ${
                      msg.role === "user" ? "items-end" : "items-start"
                    }`}
                  >
                    {/* User Message Bubble */}
                    {msg.role === "user" ? (
                      <div className="max-w-[85%] space-y-1">
                        <div className="p-3 sm:p-3.5 rounded-2xl rounded-tr-xs bg-slate-900 dark:bg-indigo-900 text-white shadow-xs font-medium leading-relaxed">
                          <p className="whitespace-pre-line text-xs sm:text-sm">{msg.content}</p>
                        </div>
                        <span className="text-[9px] text-slate-400 block text-right px-1 font-mono">{msg.timestamp}</span>
                      </div>
                    ) : (
                      /* Assistant Financial Card */
                      <div className="w-full max-w-[96%] space-y-2">
                        <div className="p-3.5 sm:p-4 rounded-2xl rounded-tl-xs bg-card border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-3">
                          {/* Header of Assistant Response */}
                          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800/80">
                            <div className="flex items-center gap-2">
                              <div className="p-1 rounded-md bg-indigo-500/10 text-indigo-500 dark:text-indigo-400">
                                <SplitLedgerAiIcon size={14} />
                              </div>
                              <span className="text-[11px] font-bold tracking-tight text-slate-800 dark:text-slate-200">
                                SplitLedger Financial Assistant
                              </span>
                            </div>
                            <span className="text-[9.5px] font-mono text-slate-400 font-medium">
                              {msg.detectedTransactions && msg.detectedTransactions.length > 0 ? "Transaction Creation" : "Financial Support"}
                            </span>
                          </div>

                          {/* Render Rich Answer or Clean Empty State */}
                          {msg.content.includes("No matching financial records were found") ? (
                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-2.5">
                              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                                <span className="text-xs font-medium">No matching financial records were found for your request.</span>
                              </div>
                              <div className="flex flex-wrap gap-1.5 pt-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setInputQuery("create transition ");
                                    inputRef.current?.focus();
                                  }}
                                  className="text-[10.5px] px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-semibold cursor-pointer transition-colors"
                                >
                                  Create Transactions
                                </button>
                                <Link href="/dashboard">
                                  <button type="button" className="text-[10.5px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium cursor-pointer transition-colors">
                                    View Dashboard
                                  </button>
                                </Link>
                                <Link href="/dashboard/reports">
                                  <button type="button" className="text-[10.5px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium cursor-pointer transition-colors">
                                    Reports
                                  </button>
                                </Link>
                                <Link href="/dashboard/notes">
                                  <button type="button" className="text-[10.5px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium cursor-pointer transition-colors">
                                    Notes
                                  </button>
                                </Link>
                              </div>
                            </div>
                          ) : (
                            <FormattedAIAnswer content={msg.content} />
                          )}

                          {/* Conversational Transaction Approval Workflow */}
                          {msg.detectedTransactions && msg.detectedTransactions.length > 0 && (
                            <div className="mt-2.5 pt-2.5 border-t border-slate-200/80 dark:border-slate-800">
                              <TransactionApprovalCardGroup
                                proposals={msg.detectedTransactions}
                              />
                            </div>
                          )}

                          {/* Render metrics only when NO detected transaction cards exist AND metrics exist */}
                          {msg.metrics && msg.metrics.length > 0 && (!msg.detectedTransactions || msg.detectedTransactions.length === 0) && (
                            <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                              {msg.metrics.map((m, idx) => (
                                <div key={idx} className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800 text-[10px]">
                                  <p className="text-slate-400 font-bold uppercase tracking-wider text-[9px] font-mono truncate">{m.label}</p>
                                  <p className="font-bold text-slate-900 dark:text-slate-100 font-mono tabular-nums text-xs sm:text-sm mt-0.5 truncate">{m.value}</p>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Render insights only when NO detected transaction cards exist */}
                          {msg.insights && msg.insights.length > 0 && !msg.content.includes(msg.insights[0]) && (!msg.detectedTransactions || msg.detectedTransactions.length === 0) && (
                            <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-800 space-y-1 text-[11px] text-slate-600 dark:text-slate-300">
                              <p className="font-bold text-[10px] text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 uppercase font-mono tracking-wider">
                                <ShieldCheck className="h-3 w-3 text-emerald-500" />
                                Key Takeaways
                              </p>
                              <ul className="list-disc pl-3.5 space-y-0.5 text-[10.5px]">
                                {msg.insights.map((ins, idx) => (
                                  <li key={idx}>{formatInlineText(ins)}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Render action suggestions & quick chips */}
                          {msg.actionSuggestions && msg.actionSuggestions.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                              {msg.actionSuggestions.map((act, idx) => {
                                if (act.url.startsWith("action:payment:")) {
                                  return (
                                    <button
                                      key={idx}
                                      type="button"
                                      onClick={() => {
                                        const val = act.url.replace("action:payment:", "");
                                        handleSend(val);
                                      }}
                                      className="text-[11px] px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1 transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                                    >
                                      <span>{act.label}</span>
                                    </button>
                                  );
                                }
                                if (act.url.startsWith("action:input:")) {
                                  return (
                                    <button
                                      key={idx}
                                      type="button"
                                      onClick={() => {
                                        const val = act.url.replace("action:input:", "");
                                        setInputQuery(val);
                                        inputRef.current?.focus();
                                      }}
                                      className="text-[10.5px] px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1 transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                                    >
                                      <PlusCircle className="h-3 w-3" />
                                      <span>{act.label}</span>
                                    </button>
                                  );
                                }
                                if (act.url.startsWith("action:send:")) {
                                  return (
                                    <button
                                      key={idx}
                                      type="button"
                                      onClick={() => {
                                        const val = act.url.replace("action:send:", "");
                                        handleSend(val);
                                      }}
                                      className="text-[10.5px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium flex items-center gap-1 transition-colors cursor-pointer"
                                    >
                                      <span>{act.label}</span>
                                    </button>
                                  );
                                }
                                return (
                                  <Link key={idx} href={act.url}>
                                    <button
                                      type="button"
                                      className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium flex items-center gap-0.5 transition-colors cursor-pointer"
                                    >
                                      <span>{act.label}</span>
                                      <ArrowUpRight className="h-2.5 w-2.5 text-slate-400" />
                                    </button>
                                  </Link>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        <span className="text-[9px] text-slate-400 px-1 font-mono">{msg.timestamp}</span>
                      </div>
                    )}
                  </div>
                ))}

                {/* Loading / Analytical Thinking State */}
                {loading && (
                  <div className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-300 p-3 bg-card rounded-2xl w-fit animate-in fade-in duration-200 border border-slate-200/80 dark:border-slate-800 shadow-xs">
                    <SplitLedgerAiIcon size={16} className="text-indigo-500 animate-pulse" />
                    <span className="text-[11px] font-semibold tracking-tight">Accessing Ledger</span>
                    <div className="flex items-center gap-1 pl-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-dots-bounce [animation-delay:-0.32s]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-dots-bounce [animation-delay:-0.16s]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-dots-bounce" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Suggested Questions Drawer Accordion */}
              <div className="border-t border-slate-200/70 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 shrink-0">
                <div className="flex items-center justify-between px-3.5 py-1.5">
                  <div className="flex items-center gap-1.5">
                    <FileSpreadsheet className="h-3.5 w-3.5 text-indigo-500" />
                    <span className="text-[10.5px] font-semibold text-slate-700 dark:text-slate-300">
                      Suggested Inquiries
                    </span>
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-mono text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800">
                      {SUGGESTED_QUICK_QUESTIONS.length}
                    </Badge>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSuggestions(!showSuggestions)}
                    className="text-[10.5px] text-indigo-600 dark:text-indigo-400 hover:underline font-semibold flex items-center gap-0.5 cursor-pointer"
                  >
                    <span>{showSuggestions ? "Collapse" : "Explore"}</span>
                    <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${showSuggestions ? "rotate-180" : ""}`} />
                  </button>
                </div>

                {showSuggestions && (
                  <div className="px-3 pb-2.5 max-h-[140px] overflow-y-auto space-y-1.5 pr-1.5">
                    {SUGGESTED_QUICK_QUESTIONS.map((prompt, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSend(prompt)}
                        disabled={loading}
                        className="w-full text-left text-xs px-3 py-2 rounded-xl bg-card hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 hover:border-indigo-400/30 text-slate-700 dark:text-slate-300 transition-all duration-150 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between group cursor-pointer shadow-2xs disabled:opacity-50"
                      >
                        <span className="font-medium text-[11px] leading-snug pr-2 whitespace-normal break-words">
                          {prompt}
                        </span>
                        <ArrowUpRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-indigo-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Input Bar with Mode Guidance */}
              <div className="p-3 pb-safe sm:pb-3 bg-card border-t border-slate-200/80 dark:border-slate-800 flex items-center gap-2 shrink-0">
                <Input
                  ref={inputRef}
                  placeholder="Ask a question, or type 'create transition Petrol 500'..."
                  value={inputQuery}
                  onChange={(e) => setInputQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  className="h-10 text-base sm:text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                />
                <Button
                  size="sm"
                  className="h-10 w-10 p-0 rounded-xl shrink-0 bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white cursor-pointer active:scale-95 transition-all shadow-xs"
                  disabled={loading || !inputQuery.trim()}
                  onClick={() => handleSend()}
                  aria-label="Send financial query"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          </div>
        </>
      )}
    </>
  );
}

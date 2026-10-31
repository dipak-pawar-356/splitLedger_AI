"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { askFinancialAssistant } from "@/actions/ai-assistant";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Sparkles, 
  X, 
  Send, 
  Bot, 
  ArrowUpRight,
  ChevronDown,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { SUGGESTED_QUICK_QUESTIONS } from "@/lib/ai/prompts";
import { FormattedAIAnswer, formatInlineText } from "@/components/ai/formatted-ai-answer";
import { TransactionApprovalCardGroup } from "@/components/ai/transaction-approval-card";
import { ProposedTransaction } from "@/lib/ai/nlp-transaction-parser";

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

const QUICK_PROMPTS = SUGGESTED_QUICK_QUESTIONS;

export function FloatingAIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputQuery, setInputQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome_01",
      role: "assistant",
      content: "Namaste! I am your SplitLedger AI Financial Copilot. How can I assist your personal or group finances today?",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

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
      const response = await askFinancialAssistant(query.trim());
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
      toast.error("AI Assistant is currently offline.");
      setMessages((prev) => [
        ...prev,
        {
          id: `ai_err_${Date.now()}`,
          role: "assistant",
          content: "⚠️ I am currently experiencing a connection interruption. Please try your question again in a moment.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const resetChat = () => {
    setMessages([
      {
        id: `welcome_${Date.now()}`,
        role: "assistant",
        content: "Namaste! I am your SplitLedger AI Financial Copilot. How can I assist your personal or group finances today?",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  };

  return (
    <>
      {/* Floating Trigger Button (Bottom Right) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-20 sm:bottom-6 right-6 z-40 p-3.5 rounded-full bg-gradient-to-r from-primary via-indigo-600 to-primary text-white shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 flex items-center gap-2 group cursor-pointer"
          aria-label="Open AI Financial Assistant"
        >
          <Sparkles className="h-5 w-5 animate-pulse" />
          <span className="text-xs font-bold hidden sm:inline pr-1">Ask AI</span>
        </button>
      )}

      {/* Floating Assistant Modal */}
      {isOpen && (
        <div className="fixed bottom-20 sm:bottom-6 right-3 sm:right-6 z-50 w-[calc(100vw-1.5rem)] sm:w-[460px] md:w-[480px] shadow-2xl rounded-3xl overflow-hidden border border-slate-200/80 dark:border-slate-800 bg-card animate-in fade-in slide-in-from-bottom-5 flex flex-col max-h-[88vh]">
          <Card className="border-0 shadow-none rounded-none flex flex-col h-full bg-card">
            {/* Header */}
            <CardHeader className="p-3.5 sm:p-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-row items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/30 to-indigo-600/30 border border-primary/40 flex items-center justify-center text-primary shadow-xs">
                  <Bot className="h-4.5 w-4.5 text-indigo-400" />
                </div>
                <div>
                  <CardTitle className="text-sm font-black flex items-center gap-1.5 text-white">
                    <span>SplitLedger AI</span>
                    <Badge variant="secondary" className="bg-primary/25 text-indigo-200 border border-primary/30 text-[9px] py-0 px-1.5 font-bold uppercase tracking-wider">
                      PRO
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-[10px] text-slate-300 font-medium">
                    INR (₹) Real-time Financial Copilot
                  </CardDescription>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  title="Reset Chat"
                  className="h-7 w-7 p-0 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                  onClick={resetChat}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>

            {/* Chat Messages Body */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 min-h-[220px] max-h-[58vh]">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col text-xs space-y-1 animate-in fade-in slide-in-from-bottom-2 duration-200 ${
                    msg.role === "user" ? "items-end" : "items-start"
                  }`}
                >
                  <div
                    className={`p-3 sm:p-3.5 rounded-2xl leading-relaxed ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-none shadow-xs max-w-[88%]"
                        : msg.detectedTransactions && msg.detectedTransactions.length > 0
                        ? "bg-slate-50 dark:bg-slate-900/90 text-slate-800 dark:text-slate-200 rounded-bl-none border border-slate-200/80 dark:border-slate-800 w-full max-w-[98%]"
                        : "bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded-bl-none border border-slate-200/80 dark:border-slate-800 max-w-[88%]"
                    }`}
                  >
                    {msg.role === "assistant" ? (
                      <FormattedAIAnswer content={msg.content} />
                    ) : (
                      <p className="whitespace-pre-line">{msg.content}</p>
                    )}

                    {/* Conversational Transaction Approval Workflow */}
                    {msg.detectedTransactions && msg.detectedTransactions.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-slate-200/80 dark:border-slate-800">
                        <TransactionApprovalCardGroup
                          proposals={msg.detectedTransactions}
                        />
                      </div>
                    )}

                    {/* Render metrics only when NO detected transaction cards exist */}
                    {msg.metrics && msg.metrics.length > 0 && (!msg.detectedTransactions || msg.detectedTransactions.length === 0) && (
                      <div className="grid grid-cols-2 gap-1.5 mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                        {msg.metrics.map((m, idx) => (
                          <div key={idx} className="p-1.5 rounded-lg bg-background/80 text-[10px]">
                            <p className="text-slate-500 font-semibold">{m.label}</p>
                            <p className="font-bold text-slate-900 dark:text-slate-100">{m.value}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Render insights only when NO detected transaction cards exist */}
                    {msg.insights && msg.insights.length > 0 && !msg.content.includes(msg.insights[0]) && (!msg.detectedTransactions || msg.detectedTransactions.length === 0) && (
                      <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-800 space-y-1 text-[11px] text-slate-600 dark:text-slate-300">
                        <p className="font-semibold text-[10px] text-primary flex items-center gap-1">
                          <Sparkles className="h-2.5 w-2.5" />
                          Key Takeaways:
                        </p>
                        <ul className="list-disc pl-3.5 space-y-0.5 text-[10.5px]">
                          {msg.insights.map((ins, idx) => (
                            <li key={idx}>{formatInlineText(ins)}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Render action suggestions only when NO detected transaction cards exist */}
                    {msg.actionSuggestions && msg.actionSuggestions.length > 0 && (!msg.detectedTransactions || msg.detectedTransactions.length === 0) && (
                      <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                        {msg.actionSuggestions.map((act, idx) => (
                          <Link key={idx} href={act.url}>
                            <button
                              type="button"
                              className="text-[10px] px-2 py-0.5 rounded-md bg-primary/10 hover:bg-primary/20 text-primary font-medium flex items-center gap-0.5 transition-colors cursor-pointer"
                            >
                              <span>{act.label}</span>
                              <ArrowUpRight className="h-2.5 w-2.5" />
                            </button>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-[9px] text-slate-400 px-1">{msg.timestamp}</span>
                </div>
              ))}

              {loading && (
                <div className="flex items-center gap-2 text-xs text-slate-500 p-2.5 bg-slate-100/80 dark:bg-slate-900/80 rounded-2xl w-fit animate-in fade-in duration-200 border border-slate-200/60 dark:border-slate-800">
                  <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" />
                  <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">Thinking</span>
                  <div className="flex items-center gap-1 pl-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-dots-bounce [animation-delay:-0.32s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-dots-bounce [animation-delay:-0.16s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-dots-bounce" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Suggested Questions (Stacked Multiline Layout) */}
            <div className="border-t border-slate-200/70 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 shrink-0">
              <div className="flex items-center justify-between px-3.5 py-1.5">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 text-primary animate-pulse" />
                  <span className="text-[10.5px] font-semibold text-slate-600 dark:text-slate-300">
                    Suggested Questions
                  </span>
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-normal text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800">
                    {QUICK_PROMPTS.length}
                  </Badge>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSuggestions(!showSuggestions)}
                  className="text-[10px] text-primary hover:underline font-medium flex items-center gap-0.5 cursor-pointer"
                >
                  <span>{showSuggestions ? "Hide" : "Show"}</span>
                  <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${showSuggestions ? "rotate-180" : ""}`} />
                </button>
              </div>

              {showSuggestions && (
                <div className="px-3 pb-2.5 max-h-[150px] overflow-y-auto space-y-1.5 pr-1.5">
                  {QUICK_PROMPTS.map((prompt, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSend(prompt)}
                      disabled={loading}
                      className="w-full text-left text-xs px-3 py-2 rounded-xl bg-background/95 hover:bg-primary/10 dark:hover:bg-primary/20 hover:border-primary/40 text-slate-700 dark:text-slate-200 hover:text-primary dark:hover:text-primary transition-all duration-150 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between group cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      <span className="font-medium text-[11px] leading-snug pr-2 whitespace-normal break-words">
                        {prompt}
                      </span>
                      <ArrowUpRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Input Bar */}
            <div className="p-3 bg-slate-50 dark:bg-slate-900/70 border-t border-slate-200/80 dark:border-slate-800 flex items-center gap-2 shrink-0">
              <Input
                placeholder="Ask anything about your expenses..."
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                className="h-9 text-xs rounded-xl bg-background"
              />
              <Button
                size="sm"
                className="h-9 w-9 p-0 rounded-xl shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer"
                disabled={loading}
                onClick={() => handleSend()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}

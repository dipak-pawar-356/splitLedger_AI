"use client";

import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Send, Bot, ArrowUpRight, CheckCircle2, HelpCircle, Loader2 } from "lucide-react";
import { askFinancialAssistant, AIAssistantResponse } from "@/actions/ai-assistant";
import { FormattedAIAnswer } from "@/components/ai/formatted-ai-answer";
import Link from "next/link";
import { toast } from "sonner";

const QUICK_QUESTIONS = [
  "Why did I spend so much this month?",
  "What was my largest transaction?",
  "Who owes me money across groups?",
  "Give me an overview of my monthly expenses",
];

export function AIFinancialAssistantCard() {
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState<AIAssistantResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  const handleAsk = async (questionText: string) => {
    if (!questionText.trim()) return;
    setIsLoading(true);
    try {
      const res = await askFinancialAssistant(questionText);
      setResponse(res);
      setQuery("");
    } catch (e: any) {
      toast.error(e?.message || "Failed to get AI assistant answer");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="rounded-3xl border border-primary/20 dark:border-primary/30 shadow-sm overflow-hidden bg-card transition-all duration-300 hover:shadow-md">
      <CardHeader className="border-b border-primary/10 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/15 text-primary border border-primary/20 shadow-xs shrink-0">
              <Bot className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                <span>AI Financial Assistant</span>
                <Badge variant="secondary" className="bg-primary/15 text-primary text-[10px] font-bold py-0 px-2">
                  Gemini Flash
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Ask natural language questions about your spending, group splits, and debt balances in INR (₹)
              </CardDescription>
            </div>
          </div>

          <Badge variant="secondary" className="bg-primary/10 text-primary text-[11px] font-bold py-1 px-3 self-start sm:self-auto shrink-0 flex items-center gap-1.5 border border-primary/20">
            <Sparkles className="h-3 w-3" aria-hidden="true" />
            <span>Live Data Context</span>
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-5 sm:p-6 space-y-6">
        {/* Quick Question Chips */}
        <div className="space-y-2">
          <span className="text-[11px] uppercase font-bold text-slate-400 block">
            Suggested Prompts
          </span>
          <div
            role="toolbar"
            aria-label="Suggested financial questions"
            className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none no-scrollbar"
          >
            {QUICK_QUESTIONS.map((q, idx) => (
              <motion.button
                key={idx}
                type="button"
                whileHover={shouldReduceMotion ? {} : { y: -2, scale: 1.02 }}
                whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
                onClick={() => handleAsk(q)}
                disabled={isLoading}
                aria-label={`Ask: "${q}"`}
                className="px-3.5 py-2 min-h-[36px] rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-primary/10 hover:text-primary text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-2 border border-slate-200/60 dark:border-slate-700/60 shadow-2xs shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              >
                <HelpCircle className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden="true" />
                <span>{q}</span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Input Bar */}
        <form
          role="search"
          aria-label="Ask financial assistant"
          onSubmit={(e) => {
            e.preventDefault();
            handleAsk(query);
          }}
          className="flex items-center gap-2.5"
          suppressHydrationWarning
        >
          <div className="relative flex-1">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask AI anything (e.g. 'Why did I spend ₹8,000 this month?' or 'Who owes me?')..."
              className="rounded-2xl text-xs sm:text-sm bg-background h-11 px-4 border-slate-200/80 dark:border-slate-800 focus-visible:ring-primary/40 focus-visible:ring-2 shadow-xs"
              disabled={isLoading}
              aria-label="Ask a financial question"
              suppressHydrationWarning
            />
          </div>
          <Button
            type="submit"
            size="sm"
            className="rounded-2xl h-11 px-5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold gap-2 text-xs shadow-xs hover:shadow-md transition-all shrink-0 focus-visible:ring-2 focus-visible:ring-primary/50"
            disabled={isLoading || !query.trim()}
            aria-label={isLoading ? "Analyzing database records" : "Send question to AI assistant"}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                <span>Analyzing...</span>
              </>
            ) : (
              <>
                <Send className="h-4 w-4" aria-hidden="true" />
                <span>Ask AI</span>
              </>
            )}
          </Button>
        </form>

        {/* Render AI Response */}
        <AnimatePresence>
          {response && (
            <motion.div
              role="region"
              aria-live="polite"
              aria-label="AI financial assistant analysis"
              initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.99 }}
              animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -10, scale: 0.99 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-slate-50 via-indigo-50/20 to-purple-50/20 dark:from-slate-900/60 dark:via-indigo-950/20 dark:to-purple-950/20 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0 mt-0.5 border border-primary/20 shadow-xs">
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                </div>
                <div className="space-y-2 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                      Financial Assistant Analysis
                    </p>
                    <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-300 dark:border-emerald-800 bg-emerald-500/5 font-semibold">
                      Verified
                    </Badge>
                  </div>
                  <FormattedAIAnswer content={response.answer} />
                </div>
              </div>

              {/* Key Metrics */}
              {response.keyMetrics.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                  {response.keyMetrics.map((m, idx) => (
                    <motion.div
                      key={idx}
                      whileHover={shouldReduceMotion ? {} : { scale: 1.02 }}
                      className="p-3 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/70 dark:border-slate-700/70 text-xs shadow-2xs"
                    >
                      <p className="text-[11px] text-slate-500 font-semibold">{m.label}</p>
                      <p className="font-mono tabular-nums font-bold text-sm text-slate-900 dark:text-slate-100 mt-0.5">{m.value}</p>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Explanatory Insights */}
              {response.insights.length > 0 && (
                <div className="space-y-2 pt-3 border-t border-slate-200/60 dark:border-slate-800">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Detailed Breakdown & Reasoning
                  </p>
                  <div className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                    {response.insights.map((insight, idx) => (
                      <div key={idx} className="flex items-start gap-2.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
                        <span>{insight}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Suggestions */}
              {response.actionSuggestions.length > 0 && (
                <div className="flex items-center gap-2 pt-3 border-t border-slate-200/60 dark:border-slate-800 flex-wrap">
                  {response.actionSuggestions.map((act, idx) => (
                    <Link key={idx} href={act.url}>
                      <Button variant="outline" size="sm" className="rounded-xl text-xs h-8 gap-1.5 font-semibold hover:border-primary/50 focus-visible:ring-1 focus-visible:ring-primary">
                        <span>{act.label}</span>
                        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </Button>
                    </Link>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}


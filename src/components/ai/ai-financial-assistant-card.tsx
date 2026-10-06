"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Send, Bot, User, ArrowUpRight, CheckCircle2, TrendingUp, HelpCircle } from "lucide-react";
import { askFinancialAssistant, AIAssistantResponse } from "@/actions/ai-assistant";
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
    <Card className="rounded-3xl border border-primary/20 dark:border-primary/30 shadow-sm overflow-hidden bg-card">
      <CardHeader className="border-b border-primary/10 bg-primary/5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <Bot className="h-5 w-5 text-primary" />
              <span>AI Financial Assistant</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Ask natural language questions about your spending, group splits, and debt balances in INR (₹)
            </CardDescription>
          </div>

          <Badge variant="secondary" className="bg-primary/10 text-primary text-[11px] font-bold py-0.5 px-2.5 shrink-0">
            <Sparkles className="h-3 w-3 mr-1" />
            <span>Live Data Context</span>
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* Quick Question Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {QUICK_QUESTIONS.map((q, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleAsk(q)}
              disabled={isLoading}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-primary/10 hover:text-primary text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5"
            >
              <HelpCircle className="h-3 w-3 text-primary shrink-0" />
              <span>{q}</span>
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAsk(query);
          }}
          className="flex items-center gap-2"
          suppressHydrationWarning
        >
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask AI anything (e.g. 'Why did I spend ₹18,000 this month?')..."
            className="rounded-2xl text-xs bg-background h-10 flex-1"
            disabled={isLoading}
            suppressHydrationWarning
          />
          <Button
            type="submit"
            size="sm"
            className="rounded-2xl h-10 px-4 bg-primary gap-1.5 text-xs"
            disabled={isLoading || !query.trim()}
          >
            <Send className="h-3.5 w-3.5" />
            <span>{isLoading ? "Analyzing..." : "Ask"}</span>
          </Button>
        </form>

        {/* Render AI Response */}
        {response && (
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="space-y-1 flex-1">
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Assistant Analysis
                </p>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
                  {response.answer}
                </p>
              </div>
            </div>

            {/* Key Metrics */}
            {response.keyMetrics.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2">
                {response.keyMetrics.map((m, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 text-xs"
                  >
                    <p className="text-[10px] text-slate-500 font-semibold">{m.label}</p>
                    <p className="font-bold text-slate-900 dark:text-slate-100 mt-0.5">{m.value}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Explanatory Insights */}
            {response.insights.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Detailed Breakdown & Reasoning
                </p>
                <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                  {response.insights.map((insight, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span>{insight}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Suggestions */}
            {response.actionSuggestions.length > 0 && (
              <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800 flex-wrap">
                {response.actionSuggestions.map((act, idx) => (
                  <Link key={idx} href={act.url}>
                    <Button variant="outline" size="sm" className="rounded-xl text-[11px] h-7 gap-1">
                      <span>{act.label}</span>
                      <ArrowUpRight className="h-3 w-3" />
                    </Button>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

"use client";

import { useState } from "react";
import { askFinancialAssistant } from "@/actions/ai-assistant";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Sparkles, 
  X, 
  Send, 
  Bot, 
  TrendingUp, 
  TrendingDown, 
  Mic,
  Maximize2,
  Minimize2,
  ShieldCheck
} from "lucide-react";
import { toast } from "sonner";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  metrics?: Array<{ label: string; value: string }>;
  timestamp: string;
}

const QUICK_PROMPTS = [
  "How much did I spend this month?",
  "Who owes me the most?",
  "Predict next month's expenses.",
  "What is my financial health score?",
];

export function FloatingAIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputQuery, setInputQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome_01",
      role: "assistant",
      content: "Namaste! I am your SplitLedger AI Financial Copilot. How can I assist your personal or group finances today?",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

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
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      toast.error("AI Assistant is currently offline.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Trigger Button (Bottom Right) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-20 sm:bottom-6 right-6 z-40 p-3.5 rounded-full bg-gradient-to-r from-primary via-indigo-600 to-primary text-white shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 flex items-center gap-2 group"
          aria-label="Open AI Financial Assistant"
        >
          <Sparkles className="h-5 w-5 animate-pulse" />
          <span className="text-xs font-bold hidden sm:inline pr-1">Ask AI</span>
        </button>
      )}

      {/* Floating Assistant Modal */}
      {isOpen && (
        <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-96 shadow-2xl rounded-3xl overflow-hidden border border-slate-200/80 dark:border-slate-800 bg-card animate-in fade-in slide-in-from-bottom-5">
          <Card className="border-0 shadow-none rounded-none">
            {/* Header */}
            <CardHeader className="p-4 bg-slate-900 text-white flex flex-row items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                  <Bot className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-black flex items-center gap-1.5">
                    <span>SplitLedger AI</span>
                    <Badge variant="secondary" className="bg-primary/20 text-indigo-300 text-[9px] py-0 px-1 font-bold">
                      PRO
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-[10px] text-slate-400">
                    INR (₹) Financial Copilot
                  </CardDescription>
                </div>
              </div>

              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>

            {/* Chat Body */}
            <CardContent className="p-4 space-y-3 max-h-[380px] overflow-y-auto">
              <div className="space-y-3">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col text-xs space-y-1 animate-in fade-in slide-in-from-bottom-2 duration-200 ${
                      msg.role === "user" ? "items-end" : "items-start"
                    }`}
                  >
                    <div
                      className={`p-3 rounded-2xl max-w-[85%] leading-relaxed ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground rounded-br-none shadow-xs"
                          : "bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded-bl-none border border-slate-200/80 dark:border-slate-800"
                      }`}
                    >
                      <p>{msg.content}</p>

                      {msg.metrics && msg.metrics.length > 0 && (
                        <div className="grid grid-cols-2 gap-1.5 mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                          {msg.metrics.map((m, idx) => (
                            <div key={idx} className="p-1.5 rounded-lg bg-background/80 text-[10px]">
                              <p className="text-slate-500 font-semibold">{m.label}</p>
                              <p className="font-bold text-slate-900 dark:text-slate-100">{m.value}</p>
                            </div>
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
              </div>

              {/* Quick Prompts */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-1">
                {QUICK_PROMPTS.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(prompt)}
                    className="text-[10px] px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-900 hover:bg-primary/10 text-slate-600 dark:text-slate-400 hover:text-primary transition-colors text-left"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </CardContent>

            {/* Input Bar */}
            <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200/80 dark:border-slate-800 flex items-center gap-2">
              <Input
                placeholder="Ask anything about your expenses..."
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                className="h-9 text-xs rounded-xl bg-background"
              />
              <Button
                size="sm"
                className="h-9 w-9 p-0 rounded-xl shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground"
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

"use client";

import { useState } from "react";
import { parseVoiceCommand, ParsedVoiceCommand } from "@/lib/ai/voice-parser";
import { DEFAULT_AUTOMATION_RULES, AutomationRule } from "@/lib/ai/automation-engine";
import { generateExecutiveReportNarrative } from "@/lib/ai/executive-summary";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Mic, 
  MicOff, 
  Zap, 
  ShieldAlert, 
  FileSpreadsheet, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight,
  TrendingUp
} from "lucide-react";
import { toast } from "sonner";

export function AIVersion2Suite() {
  // Voice State
  const [isRecording, setIsRecording] = useState(false);
  const [voiceInput, setVoiceInput] = useState("");
  const [parsedVoice, setParsedVoice] = useState<ParsedVoiceCommand | null>(null);

  // Automation Rules State
  const [rules, setRules] = useState<AutomationRule[]>(DEFAULT_AUTOMATION_RULES);

  // Executive Summary Narrative
  const executiveNarrative = generateExecutiveReportNarrative("monthly", {
    totalSpent: 48500,
    totalBudget: 60000,
    topCategory: "Food & Dining",
  });

  const handleVoiceParse = (text: string) => {
    if (!text.trim()) return;
    const result = parseVoiceCommand(text);
    setParsedVoice(result);
    toast.info(`Voice command recognized: ${result.action}`);
  };

  const toggleRule = (ruleId: string) => {
    setRules((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, enabled: !r.enabled } : r))
    );
    toast.success("Automation rule updated.");
  };

  return (
    <div className="space-y-6">
      {/* 1. Multilingual Voice Assistant Card */}
      <Card className="rounded-3xl border border-primary/20 shadow-sm overflow-hidden bg-card">
        <CardHeader className="bg-primary/5 border-b border-primary/10">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Mic className="h-5 w-5 text-primary" />
                <span>Multilingual Voice Assistant (v2.0)</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Speak or type naturally in English, Hindi, or Hinglish to record expenses, create groups, or query balances
              </CardDescription>
            </div>
            <Badge variant="secondary" className="bg-primary/10 text-primary font-bold text-xs">
              Live NLP
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={isRecording ? "destructive" : "default"}
              className="rounded-2xl h-11 px-4 gap-2 text-xs shrink-0"
              onClick={() => {
                const next = !isRecording;
                setIsRecording(next);
                if (next) {
                  setVoiceInput("Add ₹500 Food Expense");
                  handleVoiceParse("Add ₹500 Food Expense");
                }
              }}
            >
              {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              <span>{isRecording ? "Listening..." : "Speak Command"}</span>
            </Button>

            <Input
              value={voiceInput}
              onChange={(e) => {
                setVoiceInput(e.target.value);
                handleVoiceParse(e.target.value);
              }}
              placeholder='Try "Add ₹500 Food Expense" or "Show my balance"...'
              className="rounded-2xl h-11 text-xs bg-background"
            />
          </div>

          {parsedVoice && (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Action: {parsedVoice.action.replace("_", " ").toUpperCase()}</span>
                </span>
                <Badge variant="outline" className="text-[10px]">
                  Confidence: {Math.round(parsedVoice.confidence * 100)}%
                </Badge>
              </div>
              <p className="text-slate-600 dark:text-slate-400">{parsedVoice.feedbackMessage}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. Chained Automation Rules Engine */}
      <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm bg-card">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" />
            <span>Chained Financial Automation Rules</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Event-driven triggers that automatically notify administrators, dispatch alerts, or update ledgers
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 space-y-3">
          <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-slate-100">{rule.name}</span>
                    <Badge variant={rule.enabled ? "default" : "secondary"} className="text-[10px]">
                      {rule.enabled ? "ACTIVE" : "PAUSED"}
                    </Badge>
                  </div>
                  <p className="text-slate-500 font-mono text-[11px]">
                    IF [{rule.trigger}] & {rule.condition.field} {rule.condition.operator} {rule.condition.value} → THEN [{rule.actions.join(" + ")}]
                  </p>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl text-xs h-8 shrink-0"
                  onClick={() => toggleRule(rule.id)}
                >
                  {rule.enabled ? "Disable" : "Enable"}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 3. Executive AI Summary Narrative */}
      <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm bg-card">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-emerald-500" />
              <span>Executive Business Intelligence & Risk Analysis</span>
            </CardTitle>
            <Badge variant="outline" className="text-xs font-bold text-emerald-600">
              Risk Score: {executiveNarrative.riskScore}/100
            </Badge>
          </div>
          <CardDescription className="text-xs">
            Automated narrative summarizing cash flow, budget variance, and department risk factors in INR (₹)
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 space-y-4 text-xs">
          <p className="font-semibold text-slate-800 dark:text-slate-200 leading-relaxed">
            {executiveNarrative.executiveSummary}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            {executiveNarrative.keyHighlights.map((hl, idx) => (
              <div key={idx} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800">
                <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300">{hl}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

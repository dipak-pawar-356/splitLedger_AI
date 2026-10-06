"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LayoutTemplate, Sparkles, IndianRupee, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface TemplateItem {
  id: string;
  name: string;
  category: string;
  template: string;
  sampleVariables: Record<string, string>;
}

const TEMPLATES: TemplateItem[] = [
  {
    id: "expense_created",
    name: "New Shared Expense Added",
    category: "Expense",
    template: "💸 {{User}} added '{{Expense}}' of {{Amount}} in '{{Group}}'. Your share: {{ShareAmount}}.",
    sampleVariables: {
      User: "Dipak Pawar",
      Expense: "Dinner at Taj",
      Amount: "₹ 4,200.00",
      Group: "Goa Trip 2026",
      ShareAmount: "₹ 1,050.00",
      Date: "30/08/2026",
    },
  },
  {
    id: "settlement_reminder",
    name: "Settlement & Payment Reminder",
    category: "Settlement",
    template: "⚠️ Friendly Reminder: You have an outstanding balance of {{Amount}} due to {{User}} in '{{Group}}'. Pay now via UPI.",
    sampleVariables: {
      Amount: "₹ 850.00",
      User: "Rahul Sharma",
      Group: "Roommates 2026",
      Date: "30/08/2026",
    },
  },
  {
    id: "group_invitation",
    name: "Group Token Invitation",
    category: "Invitation",
    template: "🤝 {{User}} invited you to join the split group '{{Group}}'. Click below to accept your invitation.",
    sampleVariables: {
      User: "Priya Patel",
      Group: "Weekend Trek",
      Date: "30/08/2026",
    },
  },
  {
    id: "report_ready",
    name: "Financial Statement Ready",
    category: "Report",
    template: "📊 Your monthly financial ledger statement for {{Month}} is ready for download in PDF & CSV.",
    sampleVariables: {
      Month: "August 2026",
      Date: "30/08/2026",
    },
  },
  {
    id: "security_alert",
    name: "New Device Login Security Alert",
    category: "Security",
    template: "🔒 Security Alert: New login detected on {{Device}} from IP {{IPAddress}} in {{Location}}. If this wasn't you, revoke session immediately.",
    sampleVariables: {
      Device: "Chrome on Windows 11",
      IPAddress: "49.36.120.15",
      Location: "Mumbai, India",
    },
  },
];

export function NotificationTemplatesCard() {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateItem>(TEMPLATES[0]);
  const [copied, setCopied] = useState(false);

  const renderPreview = (tmpl: TemplateItem) => {
    let output = tmpl.template;
    for (const [key, value] of Object.entries(tmpl.sampleVariables)) {
      output = output.replace(new RegExp(`{{\\s*${key}\\s*}}`, "g"), value);
    }
    return output;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedTemplate.template);
    setCopied(true);
    toast.success("Template syntax copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden bg-card">
      <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <LayoutTemplate className="h-4 w-4 text-primary" />
          <span>Notification Message Templates & Previews</span>
        </CardTitle>
        <CardDescription className="text-xs">
          Explore standardized notification formatting engines with dynamic variable interpolation in INR (₹)
        </CardDescription>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {TEMPLATES.map((tmpl) => (
            <button
              key={tmpl.id}
              type="button"
              onClick={() => setSelectedTemplate(tmpl)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedTemplate.id === tmpl.id
                  ? "bg-primary text-white shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200/60"
              }`}
            >
              {tmpl.name}
            </button>
          ))}
        </div>

        <div className="space-y-4 max-w-2xl">
          {/* Template Syntax Box */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Template Variable Syntax
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 text-[11px] gap-1"
                onClick={handleCopy}
              >
                {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                <span>{copied ? "Copied" : "Copy Syntax"}</span>
              </Button>
            </div>

            <p className="font-mono text-xs text-slate-800 dark:text-slate-200 bg-background p-2.5 rounded-xl border">
              {selectedTemplate.template}
            </p>
          </div>

          {/* Interpolated Live Preview */}
          <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Rendered Message Output (Live Interpolation)</span>
              </span>
              <Badge variant="outline" className="text-[10px] bg-background font-semibold">
                {selectedTemplate.category}
              </Badge>
            </div>

            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border text-xs text-slate-800 dark:text-slate-100 font-sans shadow-xs">
              {renderPreview(selectedTemplate)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

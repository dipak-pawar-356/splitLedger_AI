"use client";

import React from "react";
import { 
  Tag, 
  PiggyBank, 
  ArrowDownLeft, 
  ArrowUpRight, 
  ShieldCheck, 
  CheckCircle2, 
  Target, 
  AlertTriangle, 
  Clock, 
  Layers, 
  TrendingUp, 
  TrendingDown, 
  IndianRupee, 
  Calendar,
  Sparkles,
  Info
} from "lucide-react";

interface FormattedAIAnswerProps {
  content: string;
  className?: string;
}

/**
 * Cleanly format inline text by transforming markdown bold (**text**)
 * and italic (*text*) into styled elements and removing all raw asterisks.
 */
function formatInlineText(text: string): React.ReactNode {
  if (!text) return null;

  // Split by markdown bold (**...**)
  const parts = text.split(/(\*\*[^*]+?\*\*)/g);

  return parts.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      const cleanText = part.slice(2, -2).trim();
      const isNumberOrCurrency = /[₹$€£\d]/.test(cleanText);

      return (
        <strong
          key={idx}
          className={`font-semibold text-slate-900 dark:text-slate-100 ${
            isNumberOrCurrency ? "font-mono tabular-nums tracking-tight font-bold text-primary dark:text-indigo-400" : ""
          }`}
        >
          {cleanText}
        </strong>
      );
    }

    // Split any italic (*...*) in remaining segments
    const italicParts = part.split(/(\*[^*]+?\*)/g);
    if (italicParts.length > 1) {
      return (
        <React.Fragment key={idx}>
          {italicParts.map((sub, sIdx) => {
            if (sub.startsWith("*") && sub.endsWith("*")) {
              return (
                <em key={sIdx} className="italic text-slate-800 dark:text-slate-200">
                  {sub.slice(1, -1).trim()}
                </em>
              );
            }
            // Strip any leftover stray asterisks
            return sub.replace(/\*+/g, "");
          })}
        </React.Fragment>
      );
    }

    // Strip any stray asterisks from plain text
    return part.replace(/\*+/g, "");
  });
}

function getIconForLabel(label: string) {
  const l = label.toLowerCase();
  if (l.includes("category")) return <Tag className="h-3.5 w-3.5 text-indigo-500" aria-hidden="true" />;
  if (l.includes("saving")) return <PiggyBank className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />;
  if (l.includes("receivable") || l.includes("owe") || l.includes("recovered")) return <ArrowDownLeft className="h-3.5 w-3.5 text-teal-500" aria-hidden="true" />;
  if (l.includes("payable") || l.includes("debt") || l.includes("risk")) return <AlertTriangle className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />;
  if (l.includes("health") || l.includes("score")) return <ShieldCheck className="h-3.5 w-3.5 text-blue-500" aria-hidden="true" />;
  if (l.includes("confidence") || l.includes("discipline")) return <Target className="h-3.5 w-3.5 text-purple-500" aria-hidden="true" />;
  if (l.includes("rate") || l.includes("velocity") || l.includes("average")) return <TrendingUp className="h-3.5 w-3.5 text-primary" aria-hidden="true" />;
  if (l.includes("date") || l.includes("month") || l.includes("week")) return <Calendar className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />;
  return <Layers className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />;
}

export function FormattedAIAnswer({ content, className = "" }: FormattedAIAnswerProps) {
  if (!content) return null;

  // 1. Normalize line endings and inline bullet points
  const normalized = content
    .replace(/\r\n/g, "\n")
    .replace(/\s+•\s+/g, "\n• ")
    .replace(/\s+-\s+(?=[A-Z\*\d])/g, "\n• ");

  const rawLines = normalized.split("\n").map((l) => l.trim()).filter(Boolean);

  // Parse lines into structured sections
  const headers: string[] = [];
  const narratives: string[] = [];
  const keyValueBullets: Array<{ label: string; value: string }> = [];
  const plainBullets: string[] = [];
  const numberedList: Array<{ index: string; title: string; body: string }> = [];
  const footerNotes: string[] = [];

  for (const line of rawLines) {
    // Numbered list item: e.g. "1. **Title:** body" or "1. Title: body"
    const numberedMatch = line.match(/^(\d+)\.\s+(.*)$/);
    if (numberedMatch) {
      const idx = numberedMatch[1];
      const rest = numberedMatch[2];
      const colonSplit = rest.split(/:\s*(.*)/);
      if (colonSplit.length > 1) {
        numberedList.push({
          index: idx,
          title: colonSplit[0].replace(/\*+/g, "").trim(),
          body: colonSplit[1].trim(),
        });
      } else {
        numberedList.push({
          index: idx,
          title: "",
          body: rest,
        });
      }
      continue;
    }

    // Bullet item: e.g. "• **Highest Category:** Uncategorized (₹8,000.00)"
    if (line.startsWith("•") || line.startsWith("-") || line.startsWith("* ")) {
      const cleanBullet = line.replace(/^[•\-\*]\s*/, "").trim();
      // Check if it's key-value pair "Label: Value"
      const colonMatch = cleanBullet.match(/^(?:\*\*)?([^:*]+)(?:\*\*)?:\s*(.*)$/);
      if (colonMatch && colonMatch[1] && colonMatch[2]) {
        keyValueBullets.push({
          label: colonMatch[1].replace(/\*+/g, "").trim(),
          value: colonMatch[2].trim(),
        });
      } else {
        plainBullets.push(cleanBullet);
      }
      continue;
    }

    // Header line: e.g. "🎯 **AI Expense Forecast for Next Month:**" or "📊 **Executive Report**"
    if (line.startsWith("🎯") || line.startsWith("📊") || line.startsWith("###") || line.startsWith("💡 **AI Insight:**")) {
      headers.push(line);
      continue;
    }

    // Footer tip: e.g. "💡 ..."
    if (line.startsWith("💡")) {
      footerNotes.push(line);
      continue;
    }

    // Standard narrative paragraph
    narratives.push(line);
  }

  return (
    <div className={`space-y-3.5 ${className}`}>
      {/* 1. Header Banners (if any) */}
      {headers.map((h, i) => (
        <div 
          key={i}
          className="p-2.5 px-3 rounded-xl bg-primary/10 dark:bg-primary/20 border border-primary/20 text-xs font-bold text-primary dark:text-indigo-300 flex items-center gap-2"
        >
          <Sparkles className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <span>{formatInlineText(h)}</span>
        </div>
      ))}

      {/* 2. Main Narrative Overview Paragraphs */}
      {narratives.length > 0 && (
        <div className="space-y-2">
          {narratives.map((p, i) => (
            <p 
              key={i}
              className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-sans"
            >
              {formatInlineText(p)}
            </p>
          ))}
        </div>
      )}

      {/* 3. Structured Key-Value Highlights Grid */}
      {keyValueBullets.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
          {keyValueBullets.map((item, idx) => (
            <div
              key={idx}
              className="p-2.5 px-3 rounded-xl bg-white/90 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:border-primary/40 transition-colors flex items-start gap-2.5"
            >
              <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0 mt-0.5">
                {getIconForLabel(item.label)}
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block truncate">
                  {item.label}
                </span>
                <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 block mt-0.5 break-words">
                  {formatInlineText(item.value)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 4. Plain Bullet Points (if not key-value format) */}
      {plainBullets.length > 0 && (
        <div className="space-y-1.5 pl-1 pt-1">
          {plainBullets.map((bullet, idx) => (
            <div key={idx} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" aria-hidden="true" />
              <span className="leading-relaxed">{formatInlineText(bullet)}</span>
            </div>
          ))}
        </div>
      )}

      {/* 5. Numbered Recommendation Cards */}
      {numberedList.length > 0 && (
        <div className="space-y-2 pt-1">
          {numberedList.map((item, idx) => (
            <div
              key={idx}
              className="p-3 rounded-xl bg-background/80 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800 shadow-2xs flex items-start gap-3"
            >
              <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-primary/10 text-primary font-mono font-bold text-xs shrink-0 mt-0.5 border border-primary/20">
                {item.index}
              </span>
              <div className="space-y-0.5 text-xs flex-1">
                {item.title && (
                  <h5 className="font-bold text-slate-900 dark:text-slate-100">
                    {formatInlineText(item.title)}
                  </h5>
                )}
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  {formatInlineText(item.body)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 6. Footer Tips / Notes (if any) */}
      {footerNotes.map((note, i) => (
        <div 
          key={i}
          className="p-2.5 px-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2"
        >
          <Info className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" aria-hidden="true" />
          <span className="leading-relaxed">{formatInlineText(note)}</span>
        </div>
      ))}
    </div>
  );
}

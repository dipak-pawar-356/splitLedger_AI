"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Info, Sparkles, Database, Server, Code, ShieldCheck, Mail } from "lucide-react";
import Link from "next/link";

export function AboutSystemCard() {
  return (
    <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden bg-card">
      <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <Info className="h-4 w-4 text-primary" />
          <span>About SplitLedger AI</span>
        </CardTitle>
        <CardDescription className="text-xs">
          Platform version specifications, database runtime, licensing, and support contacts
        </CardDescription>
      </CardHeader>

      <CardContent className="p-6 space-y-6 max-w-2xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-linear-to-tr from-primary to-indigo-600 flex items-center justify-center text-white shadow-md">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">SplitLedger AI</h3>
              <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary font-bold py-0.5 px-2">
                v2.4.0 Enterprise
              </Badge>
            </div>
            <p className="text-xs text-slate-500">Autonomous Financial Intelligence & Group Expense Ledger</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 space-y-1">
            <span className="text-slate-400 font-medium flex items-center gap-1.5">
              <Database className="h-3.5 w-3.5 text-primary" />
              <span>Database Engine</span>
            </span>
            <p className="font-bold text-slate-800 dark:text-slate-200">PostgreSQL 16 (Neon Serverless)</p>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 space-y-1">
            <span className="text-slate-400 font-medium flex items-center gap-1.5">
              <Server className="h-3.5 w-3.5 text-indigo-500" />
              <span>Framework Runtime</span>
            </span>
            <p className="font-bold text-slate-800 dark:text-slate-200">Next.js 15 App Router & React 19</p>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 space-y-1">
            <span className="text-slate-400 font-medium flex items-center gap-1.5">
              <Code className="h-3.5 w-3.5 text-emerald-500" />
              <span>Build Identifier</span>
            </span>
            <p className="font-mono font-bold text-slate-800 dark:text-slate-200">2026.08.30-prod-v2.4</p>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 space-y-1">
            <span className="text-slate-400 font-medium flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-teal-500" />
              <span>Security Standard</span>
            </span>
            <p className="font-bold text-slate-800 dark:text-slate-200">AES-256 & Clerk Auth Encrypted</p>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <Link href="/terms" className="hover:text-primary transition-colors">
              Terms of Service
            </Link>
            <span>•</span>
            <Link href="/privacy" className="hover:text-primary transition-colors">
              Privacy Policy
            </Link>
          </div>

          <span className="flex items-center gap-1">
            <Mail className="h-3 w-3" />
            <span>support@splitledger.ai</span>
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

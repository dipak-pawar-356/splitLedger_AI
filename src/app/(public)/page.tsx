import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Sparkles,
  Users,
  Receipt,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  Lock,
  QrCode,
  Zap,
  LogIn,
  Compass,
  Smartphone,
  Shield
} from "lucide-react";

export default function Home() {
  const corePillars = [
    {
      icon: Receipt,
      color: "text-blue-600 bg-blue-500/10 border-blue-500/20",
      title: "Smart Group Splits",
      description:
        "Add expenses in two clicks. Split costs equally, by exact amounts, or custom shares with automatic balance updates for every member.",
      tag: "Effortless",
    },
    {
      icon: Zap,
      color: "text-amber-600 bg-amber-500/10 border-amber-500/20",
      title: "Optimized Debt Minimization",
      description:
        "Proprietary graph algorithm minimizes total payments across groups. Instead of 12 confusing transfers, settle cleanly in 2-3 direct transactions.",
      tag: "Algorithmic",
    },
    {
      icon: QrCode,
      color: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20",
      title: "Instant Dynamic UPI Settle",
      description:
        "Generates NPCI standard UPI QR codes pre-filled with the exact amount and payee. Scan with GPay, PhonePe, or Paytm with zero typing.",
      tag: "Zero Friction",
    },
  ];

  return (
    <div className="flex flex-col w-full overflow-hidden">
      {/* ================= HERO SECTION ================= */}
      <section className="relative pt-12 pb-16 md:pt-20 md:pb-24 overflow-hidden">
        {/* Ambient Gradient Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] sm:w-[900px] h-[450px] bg-gradient-to-tr from-primary/15 via-indigo-500/10 to-transparent rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="absolute top-1/2 -right-40 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center max-w-5xl">
          {/* Release / Status Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20 shadow-xs mb-6">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            <span>SplitLedger AI • Modern Group Expense Ledger</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.1] mb-6">
            Split shared expenses.{" "}
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Settle with zero friction.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto font-normal leading-relaxed mb-8">
            The cleanest, most intuitive way for roommates, trips, and friends to track expenses, minimize debts, and settle instantly with dynamic UPI.
          </p>

          {/* Primary Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12">
            <Link href="/sign-up" prefetch={true} className="w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full sm:w-auto h-12 px-7 rounded-2xl text-sm font-bold gap-2 bg-primary text-primary-foreground shadow-md hover:shadow-primary/25 hover:scale-[1.02] transition-all"
              >
                <span>Get Started Free</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>

            <Link href="/sign-in" prefetch={true} className="w-full sm:w-auto">
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto h-12 px-7 rounded-2xl text-sm font-bold gap-2 hover:bg-slate-100 dark:hover:bg-slate-900 hover:scale-[1.02] transition-all border-slate-200 dark:border-slate-800"
              >
                <LogIn className="h-4 w-4" />
                <span>Sign In</span>
              </Button>
            </Link>

            <Link href="/dashboard" prefetch={true} className="w-full sm:w-auto">
              <Button
                size="lg"
                variant="ghost"
                className="w-full sm:w-auto h-12 px-6 rounded-2xl text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <span>Live Dashboard</span>
              </Button>
            </Link>
          </div>

          {/* Interactive Glass Showcase Card */}
          <div className="relative mx-auto max-w-4xl rounded-3xl p-3 sm:p-4 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 shadow-2xl shadow-primary/5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
              {/* Card 1: Balance Card */}
              <div className="group p-4 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 space-y-3 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-emerald-500/10 hover:border-emerald-500/50 transition-all duration-300 cursor-pointer">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">Net Position</span>
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 group-hover:scale-110 transition-transform duration-200">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform duration-200 origin-left">
                    +₹14,850.00
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">You are owed in total</span>
                </div>
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Receivable:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">₹19,250</span>
                </div>
              </div>

              {/* Card 2: Group Expense Split */}
              <div className="group p-4 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 space-y-3 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-indigo-500/10 hover:border-indigo-500/50 transition-all duration-300 cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 group-hover:scale-110 transition-transform duration-200">
                      <Compass className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Goa Road Trip</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    4 Members
                  </span>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Villa &amp; Food Stay</span>
                    <span className="font-semibold text-slate-900 dark:text-white">₹32,400</span>
                  </div>
                  <div className="flex justify-between text-slate-500 text-[11px]">
                    <span>Equal 4-way split</span>
                    <span>₹8,100 / person</span>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  <span>Settlement Optimized</span>
                  <span>2 Payments Left</span>
                </div>
              </div>

              {/* Card 3: Instant UPI Settlement */}
              <div className="group p-4 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 space-y-3 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-amber-500/10 hover:border-amber-500/50 transition-all duration-300 cursor-pointer">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">Instant Settle</span>
                  <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 group-hover:scale-110 transition-transform duration-200">
                    <QrCode className="h-4 w-4" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 group-hover:border-amber-400/50 transition-colors">
                    <QrCode className="h-9 w-9 text-slate-900 dark:text-slate-100" />
                  </div>
                  <div className="text-xs">
                    <div className="font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">Scan with UPI</div>
                    <div className="text-[11px] text-slate-500">GPay, PhonePe, Paytm</div>
                    <div className="text-[11px] font-bold text-primary">₹2,450 to Rahul</div>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Status</span>
                  <span className="font-bold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Ready
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= SECURITY & RELIABILITY BAR ================= */}
      <section className="py-6 border-y border-slate-200/80 dark:border-slate-800 bg-white/60 dark:bg-slate-950/60 backdrop-blur-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-2 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              <span>256-Bit Bank Grade Encryption</span>
            </div>
            <div className="flex items-center gap-2 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer">
              <Lock className="h-4 w-4 text-blue-500" />
              <span>Zero-Knowledge Privacy</span>
            </div>
            <div className="flex items-center gap-2 hover:text-primary transition-colors cursor-pointer">
              <Smartphone className="h-4 w-4 text-primary" />
              <span>Standard NPCI Dynamic UPI</span>
            </div>
            <div className="flex items-center gap-2 hover:text-amber-600 dark:hover:text-amber-400 transition-colors cursor-pointer">
              <Zap className="h-4 w-4 text-amber-500" />
              <span>Fast Neon Cloud Architecture</span>
            </div>
          </div>
        </div>
      </section>

      {/* ================= CORE PILLARS (ESSENTIALS ONLY) ================= */}
      <section className="py-16 md:py-20 bg-slate-50/50 dark:bg-slate-900/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Everything You Need. Nothing You Don&apos;t.
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Built specifically for people who want fair, effortless shared expense accounting.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {corePillars.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  className="group p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1.5 hover:border-primary/40 transition-all duration-300 space-y-4 cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className={`p-3 rounded-2xl border transition-transform duration-300 group-hover:scale-110 ${item.color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                      {item.tag}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
                      {item.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================= CLEAN ACTION BANNER ================= */}
      <section className="py-16 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 text-white relative overflow-hidden">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center max-w-2xl relative z-10 space-y-5">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight">
            Ready to track and settle with your group?
          </h2>
          <p className="text-xs sm:text-sm text-blue-100 max-w-md mx-auto font-normal">
            Sign in to access your groups, or create a free account in 30 seconds.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/sign-in" prefetch={true} className="w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full sm:w-auto h-11 px-7 rounded-xl text-xs font-bold bg-white text-blue-600 hover:bg-blue-50 shadow-lg hover:scale-[1.02] transition-all"
              >
                Sign In to Account
              </Button>
            </Link>
            <Link href="/sign-up" prefetch={true} className="w-full sm:w-auto">
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto h-11 px-7 rounded-xl text-xs font-bold border-white/40 text-white hover:bg-white/10 hover:scale-[1.02] transition-all"
              >
                Create Free Account
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

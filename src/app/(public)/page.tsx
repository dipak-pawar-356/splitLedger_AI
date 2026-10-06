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
  FileText,
  Bot,
  PieChart,
  Compass,
  Wallet,
  Zap,
  ChevronRight,
  IndianRupee,
  Smartphone,
} from "lucide-react";
import { AnimatedCounter } from "@/components/ui/animated-counter";

export default function Home() {
  const stats = [
    { value: 12000000, prefix: "₹", suffix: "+", label: "Shared Expenses Tracked" },
    { value: 99.8, suffix: "%", label: "Settlement Accuracy" },
    { value: 10, prefix: "<", suffix: "s", label: "Average OCR Scan Time" },
    { value: 10000, suffix: "+", label: "Happy Active Users" },
  ];

  const features = [
    {
      icon: Receipt,
      color: "text-blue-600 bg-blue-500/10 border-blue-500/20",
      title: "Smart Expense Tracking & Splits",
      description:
        "Log personal or shared expenses in seconds. Split costs equally, by exact amount, percentages, or custom shares with automated ledger reconciliation.",
      badge: "Core Feature",
    },
    {
      icon: Users,
      color: "text-indigo-600 bg-indigo-500/10 border-indigo-500/20",
      title: "Groups & Trip Management",
      description:
        "Organize roommates, Goa trips, weekend getaways, or dinner parties. Everyone sees who paid, who owes, and real-time net balances.",
      badge: "Collaboration",
    },
    {
      icon: Zap,
      color: "text-amber-600 bg-amber-500/10 border-amber-500/20",
      title: "Greedy Debt Settlement",
      description:
        "Proprietary graph algorithm minimizes total payments across groups. Instead of 12 confusing transfers, settle cleanly in just 3 direct transactions.",
      badge: "Algorithm",
    },
    {
      icon: PieChart,
      color: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20",
      title: "Category Budgets & Alerts",
      description:
        "Set proactive monthly spending limits for dining, groceries, shopping, and travel. Receive instant notifications before you exceed your budget.",
      badge: "Financial Health",
    },
    {
      icon: FileText,
      color: "text-purple-600 bg-purple-500/10 border-purple-500/20",
      title: "Financial Notes & Journal",
      description:
        "Capture thoughts, attach invoice photos, document payment agreements, and organize notes with custom tags and rich markdown formatting.",
      badge: "Productivity",
    },
    {
      icon: Bot,
      color: "text-rose-600 bg-rose-500/10 border-rose-500/20",
      title: "AI Financial Assistant & OCR",
      description:
        "Snap photos of physical receipts for instant itemized extraction. Ask natural-language queries about your spending habits and upcoming dues.",
      badge: "Intelligent",
    },
  ];

  const comparison = [
    {
      feature: "Debt Settlement",
      spreadsheet: "Tangled web of who pays who",
      splitledger: "Optimal Greedy Graph (minimum payments)",
    },
    {
      feature: "UPI Payments",
      spreadsheet: "Manual copy-pasting of UPI IDs",
      splitledger: "Instant one-click NPCI UPI QR code generation",
    },
    {
      feature: "Receipt Capture",
      spreadsheet: "Manual typing of each item",
      splitledger: "AI-powered camera OCR extraction under 10s",
    },
    {
      feature: "Trip Variance",
      spreadsheet: "Hidden cost overruns discovered too late",
      splitledger: "Real-time estimated vs actual trip budget tracking",
    },
    {
      feature: "Privacy & Ads",
      spreadsheet: "Third-party ad trackers & data resale",
      splitledger: "Zero ads, 256-bit encrypted bank-grade privacy",
    },
  ];

  const faqs = [
    {
      q: "Is SplitLedger AI free to use?",
      a: "Yes! SplitLedger AI provides core personal expense tracking, group expense sharing, automated split calculations, and settlement generation completely free.",
    },
    {
      q: "How do dynamic UPI QR code payments work?",
      a: "When you want to settle a debt or record a payment, SplitLedger AI generates a standardized NPCI UPI QR code pre-filled with the exact payee VPA and amount. Anyone can scan it using Google Pay, PhonePe, Paytm, or BHIM to pay instantly without typing.",
    },
    {
      q: "Can I use SplitLedger AI for group trips and roommates?",
      a: "Absolutely! You can create dedicated groups for roommate flats, travel trips, dinner clubs, or family budgets. Every member can add expenses in real-time.",
    },
    {
      q: "Is my personal and financial data secure?",
      a: "Yes. All data is protected with 256-bit AES encryption at rest and TLS 1.3 in transit. We strictly adhere to privacy laws and will never sell or monetize your financial data.",
    },
    {
      q: "How does the AI Assistant and Receipt Scanner work?",
      a: "You can upload photos or PDFs of receipts, and our AI vision model extracts merchant names, line items, taxes, and totals in seconds. You can also chat with the AI assistant to summarize your monthly spending trends.",
    },
  ];

  return (
    <div className="flex flex-col w-full overflow-hidden">
      {/* ================= HERO SECTION ================= */}
      <section className="relative pt-12 pb-20 md:pt-20 md:pb-32 overflow-hidden">
        {/* Animated Radial Gradients */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] sm:w-[900px] h-[450px] bg-gradient-to-tr from-primary/15 via-indigo-500/10 to-transparent rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="absolute top-1/2 -right-40 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center max-w-5xl">
          {/* Version / Release Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20 shadow-sm mb-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            <span>SplitLedger AI v2.0 • Production Ready</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.1] mb-6">
            Smart Expense Sharing &{" "}
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Personal Finance Platform
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto font-normal leading-relaxed mb-8">
            Manage shared expenses, personal finances, trips, budgets, settlements, and financial notes effortlessly with AI-powered insights.
          </p>

          {/* CTA Button Group */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mb-14">
            <Link href="/sign-up" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full sm:w-auto h-12 px-7 rounded-2xl text-sm font-bold gap-2 bg-primary text-primary-foreground shadow-md hover:shadow-primary/25 hover:scale-[1.02] transition-all"
              >
                <span>Get Started Free</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>

            <Link href="/dashboard" className="w-full sm:w-auto">
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto h-12 px-7 rounded-2xl text-sm font-bold hover:bg-slate-100 dark:hover:bg-slate-900 hover:scale-[1.02] transition-all"
              >
                <span>Open Dashboard</span>
              </Button>
            </Link>
          </div>

          {/* Interactive Glass Mockup Preview */}
          <div className="relative mx-auto max-w-4xl rounded-3xl p-3 sm:p-4 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 shadow-2xl shadow-primary/5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
              {/* Card 1: Balance Card */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">Net Position</span>
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
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
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600">
                      <Compass className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">Goa Road Trip</span>
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
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">Instant Settle</span>
                  <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600">
                    <QrCode className="h-4 w-4" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <QrCode className="h-9 w-9 text-slate-900 dark:text-slate-100" />
                  </div>
                  <div className="text-xs">
                    <div className="font-bold text-slate-900 dark:text-white">Scan with UPI</div>
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

      {/* ================= ANIMATED STATS BAR ================= */}
      <section className="border-y border-slate-200/80 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm py-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {stats.map((stat, i) => (
              <div key={i} className="space-y-1">
                <div className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
                  <AnimatedCounter
                    value={stat.value}
                    prefix={stat.prefix}
                    suffix={stat.suffix}
                  />
                </div>
                <p className="text-xs sm:text-sm font-medium text-slate-500">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= SECURITY & TRUST BADGES ================= */}
      <section className="py-12 bg-slate-50/50 dark:bg-slate-950">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs font-semibold text-slate-500">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              <span>256-Bit AES Encryption</span>
            </div>
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-blue-500" />
              <span>Zero-Knowledge Financial Privacy</span>
            </div>
            <div className="flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-primary" />
              <span>NPCI Standard UPI QR Codes</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              <span>99.9% Uptime High Availability</span>
            </div>
          </div>
        </div>
      </section>

      {/* ================= FEATURE HIGHLIGHTS GRID (CLEAN SAAS) ================= */}
      <section className="py-20 bg-white dark:bg-slate-950 border-t border-slate-200/80 dark:border-slate-800">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">
              <span>Everything You Need</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
              Built for Modern Expense Sharing
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
              Powerful tools designed to simplify money management between roommates, travel buddies, couples, and personal savers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {features.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  className="group relative p-6 rounded-3xl bg-slate-50/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800/80 hover:border-primary/40 hover:bg-white dark:hover:bg-slate-900 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div className={`p-3 rounded-2xl border ${item.color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      {item.badge}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
                      {item.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-12 text-center">
            <Link href="/features">
              <Button variant="outline" className="rounded-2xl text-xs font-bold gap-2 px-6 h-11">
                <span>Explore All 18 Features</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ================= WHY SPLITLEDGER AI (COMPARISON) ================= */}
      <section className="py-20 bg-slate-50 dark:bg-slate-900/40 border-t border-slate-200/80 dark:border-slate-800">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-2">
            <h2 className="text-3xl font-black text-slate-900 dark:text-white">
              Why Choose SplitLedger AI?
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              See how we compare to traditional spreadsheets and cluttered expense trackers.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
            <div className="grid grid-cols-12 p-4 bg-slate-100/70 dark:bg-slate-800/70 text-xs font-bold text-slate-700 dark:text-slate-300 border-b border-slate-200/80 dark:border-slate-800">
              <div className="col-span-4">Capability</div>
              <div className="col-span-4 text-slate-500">Spreadsheets / Legacy Apps</div>
              <div className="col-span-4 text-primary">SplitLedger AI</div>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {comparison.map((row, i) => (
                <div key={i} className="grid grid-cols-12 p-4 items-center gap-2 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <div className="col-span-4 font-bold text-slate-900 dark:text-white">
                    {row.feature}
                  </div>
                  <div className="col-span-4 text-slate-500">
                    {row.spreadsheet}
                  </div>
                  <div className="col-span-4 font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                    <span>{row.splitledger}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ================= HOW IT WORKS (3 SIMPLE STEPS) ================= */}
      <section className="py-20 bg-white dark:bg-slate-950 border-t border-slate-200/80 dark:border-slate-800">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-bold">
              <span>Simple Workflow</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">
              Settle Shared Expenses in 3 Steps
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              No manual math. No awkward reminders. Just pure financial clarity.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="relative p-6 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-3 text-center sm:text-left">
              <div className="w-10 h-10 rounded-2xl bg-primary text-primary-foreground font-black text-sm flex items-center justify-center shadow-md">
                1
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Log or Snap Expenses
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Add an expense in two taps, speak voice commands, or snap a receipt photo to automatically extract bill details.
              </p>
            </div>

            <div className="relative p-6 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-3 text-center sm:text-left">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white font-black text-sm flex items-center justify-center shadow-md">
                2
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Split Automatically
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Select your group or individual contacts. Split equally, by percentages, or customize exact rupee shares effortlessly.
              </p>
            </div>

            <div className="relative p-6 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-3 text-center sm:text-left">
              <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white font-black text-sm flex items-center justify-center shadow-md">
                3
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                One-Click UPI Settle
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Generate dynamic UPI QR codes and pay instantly through GPay, PhonePe, or Paytm. Balances update in real time.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ================= TESTIMONIALS ================= */}
      <section className="py-20 bg-slate-50 dark:bg-slate-900/40 border-t border-slate-200/80 dark:border-slate-800">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-2">
            <h2 className="text-3xl font-black text-slate-900 dark:text-white">
              Loved by Groups &amp; Organizers
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Here is how SplitLedger AI is helping thousands simplify shared expenses.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-3">
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 italic leading-relaxed">
                &ldquo;We organized a 10-person trip to Manali. Instead of 45 back-and-forth payments, SplitLedger settled the entire ₹1.4 Lakh trip with only 4 UPI transfers!&rdquo;
              </p>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="font-bold text-xs text-slate-900 dark:text-white">Aarav Patel</div>
                <div className="text-[11px] text-slate-500">Trip Coordinator • Bangalore</div>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-3">
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 italic leading-relaxed">
                &ldquo;My 3 roommates and I used to dread the first week of the month for rent, wifi, and grocery splits. Now everyone scans the UPI QR code and it is done in 2 minutes.&rdquo;
              </p>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="font-bold text-xs text-slate-900 dark:text-white">Pooja Sharma</div>
                <div className="text-[11px] text-slate-500">Flatmate Lead • Mumbai</div>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-3">
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 italic leading-relaxed">
                &ldquo;The receipt scanner is genuinely magic. I photograph our restaurant bills and it categorizes items and tax automatically without any manual typing.&rdquo;
              </p>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="font-bold text-xs text-slate-900 dark:text-white">Rohan Iyer</div>
                <div className="text-[11px] text-slate-500">Freelance Designer • Pune</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= FAQ SECTION ================= */}
      <section id="faq" className="py-20 bg-white dark:bg-slate-950 border-t border-slate-200/80 dark:border-slate-800">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
          <div className="text-center space-y-2 mb-12">
            <h2 className="text-3xl font-black text-slate-900 dark:text-white">
              Frequently Asked Questions
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Clear answers to common questions about SplitLedger AI.
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-2 transition-all hover:border-slate-300 dark:hover:border-slate-700"
              >
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="text-primary font-black">Q.</span>
                  {faq.q}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 pl-5 leading-relaxed">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= FINAL HIGH-CONVERTING CTA ================= */}
      <section className="py-20 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/10 to-transparent pointer-events-none" />

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center max-w-3xl relative z-10 space-y-6">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight">
            Ready to Take Control of Your Shared Finances?
          </h2>
          <p className="text-sm sm:text-base text-blue-100 max-w-xl mx-auto font-normal">
            Join thousands of smart individuals, friends, and teams managing shared expenses with zero friction.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/sign-up" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full sm:w-auto h-12 px-8 rounded-2xl text-sm font-bold bg-white text-blue-600 hover:bg-blue-50 shadow-xl hover:scale-[1.02] transition-all"
              >
                Create Free Account
              </Button>
            </Link>
            <Link href="/dashboard" className="w-full sm:w-auto">
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto h-12 px-8 rounded-2xl text-sm font-bold border-white/30 text-white hover:bg-white/10 hover:scale-[1.02] transition-all"
              >
                Explore Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

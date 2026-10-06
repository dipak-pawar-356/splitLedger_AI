"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Wallet,
  Receipt,
  Users,
  PieChart,
  FileText,
  Compass,
  HandCoins,
  CheckCircle2,
  Contact,
  Bot,
  Mic,
  Camera,
  LineChart,
  Bell,
  LayoutDashboard,
  Moon,
  Smartphone,
  ArrowRight,
  Sparkles,
  Zap,
} from "lucide-react";

export default function FeaturesPage() {
  const [selectedCategory, setSelectedCategory] = React.useState<string>("All");

  const categories = [
    "All",
    "Splits & Groups",
    "Smart Automation & AI",
    "Budgeting & Personal",
    "Platform & UX",
  ];

  const featuresList = [
    {
      category: "Budgeting & Personal",
      icon: Wallet,
      color: "text-blue-600 bg-blue-500/10 border-blue-500/20",
      title: "Personal Finance",
      description:
        "Comprehensive tracking of your individual income, expenses, net balance, and financial trajectory with intuitive categorized records.",
      highlights: [
        "Income vs Expense tracking",
        "Net worth calculations",
        "Multi-currency support (INR ₹)",
        "Daily spending trends",
      ],
      ctaText: "Explore Finance",
      ctaLink: "/dashboard",
    },
    {
      category: "Budgeting & Personal",
      icon: Receipt,
      color: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20",
      title: "Expense Tracking",
      description:
        "Instant transaction logging with payment method tagging (UPI, Card, Cash), merchant categorization, and receipt attachments.",
      highlights: [
        "One-tap expense logging",
        "Payment mode breakdown",
        "Search & date filtering",
        "Custom category badges",
      ],
      ctaText: "Track Expenses",
      ctaLink: "/dashboard/transactions",
    },
    {
      category: "Splits & Groups",
      icon: Zap,
      color: "text-amber-600 bg-amber-500/10 border-amber-500/20",
      title: "Split Expenses",
      description:
        "Flexible bill splitting that accommodates every real-world scenario: equal splits, exact amounts, percentages, or weighted shares.",
      highlights: [
        "Equal 50/50 and multi-way split",
        "Exact rupee distribution",
        "Percentage based allocation",
        "Custom excluded members",
      ],
      ctaText: "Split a Bill",
      ctaLink: "/dashboard/groups",
    },
    {
      category: "Splits & Groups",
      icon: Users,
      color: "text-indigo-600 bg-indigo-500/10 border-indigo-500/20",
      title: "Groups",
      description:
        "Dedicated shared ledgers for flatmates, family units, workplace teams, and friend circles with live activity timelines.",
      highlights: [
        "Unlimited members per group",
        "Role-based group admin rights",
        "Live member balance summary",
        "Activity audit history",
      ],
      ctaText: "View Groups",
      ctaLink: "/dashboard/groups",
    },
    {
      category: "Budgeting & Personal",
      icon: LineChart,
      color: "text-purple-600 bg-purple-500/10 border-purple-500/20",
      title: "Reports & Visual Analytics",
      description:
        "Insightful financial health reports with category breakdown charts, monthly burn rate analysis, and exportable PDF/CSV reports.",
      highlights: [
        "Category distribution donuts",
        "Monthly velocity charts",
        "Exportable PDF summaries",
        "Payable vs Receivable balances",
      ],
      ctaText: "View Reports",
      ctaLink: "/dashboard/reports",
    },
    {
      category: "Budgeting & Personal",
      icon: FileText,
      color: "text-rose-600 bg-rose-500/10 border-rose-500/20",
      title: "Notes & Journal",
      description:
        "Integrated financial journal to store notes, bill agreements, warranty records, and tagged memos with markdown support.",
      highlights: [
        "Rich markdown formatting",
        "Pinned priority notes",
        "Color-coded category tags",
        "Quick search & instant filter",
      ],
      ctaText: "Open Journal",
      ctaLink: "/dashboard/notes",
    },
    {
      category: "Budgeting & Personal",
      icon: PieChart,
      color: "text-teal-600 bg-teal-500/10 border-teal-500/20",
      title: "Budgets & Spend Limits",
      description:
        "Establish proactive monthly spending budgets for food, shopping, entertainment, and utilities with automated progress tracking.",
      highlights: [
        "Category-wise monthly caps",
        "Real-time threshold progress",
        "Over-budget warning alerts",
        "Historical rollover analysis",
      ],
      ctaText: "Set Budgets",
      ctaLink: "/dashboard/budgets",
    },
    {
      category: "Splits & Groups",
      icon: Compass,
      color: "text-orange-600 bg-orange-500/10 border-orange-500/20",
      title: "Trips & Travel Events",
      description:
        "Tailored for group vacations and treks. Plan itineraries, estimate total trip expenses, and monitor budget variance in real time.",
      highlights: [
        "Estimated vs actual variance",
        "Day-wise itinerary linking",
        "Multi-payer trip ledger",
        "Packing checklists & notes",
      ],
      ctaText: "Plan Trips",
      ctaLink: "/dashboard/trips",
    },
    {
      category: "Budgeting & Personal",
      icon: HandCoins,
      color: "text-cyan-600 bg-cyan-500/10 border-cyan-500/20",
      title: "Peer Loans & EMIs",
      description:
        "Track personal lending and borrowing with friends and family. Calculate simple or compound interest and automated EMI schedules.",
      highlights: [
        "Lending & Borrowing records",
        "Interest rate calculations",
        "EMI amortization timelines",
        "Due date payment alerts",
      ],
      ctaText: "Manage Loans",
      ctaLink: "/dashboard/loans",
    },
    {
      category: "Splits & Groups",
      icon: CheckCircle2,
      color: "text-green-600 bg-green-500/10 border-green-500/20",
      title: "Smart Greedy Settlements",
      description:
        "Mathematical debt minimization algorithms that reduce multi-person debts to the absolute fewest direct payment transfers.",
      highlights: [
        "Greedy graph debt reduction",
        "Standardized NPCI UPI QR codes",
        "Instant settlement confirmation",
        "Zero-balance verification",
      ],
      ctaText: "Settle Debts",
      ctaLink: "/dashboard/settlements",
    },
    {
      category: "Splits & Groups",
      icon: Contact,
      color: "text-violet-600 bg-violet-500/10 border-violet-500/20",
      title: "Contacts Ledger",
      description:
        "Consolidated contact directory showing individual balances: exactly how much each friend owes you or you owe them across all groups.",
      highlights: [
        "Per-contact net balances",
        "Detailed settlement history",
        "Direct UPI payment trigger",
        "Contact activity logs",
      ],
      ctaText: "Manage Contacts",
      ctaLink: "/dashboard/contacts",
    },
    {
      category: "Smart Automation & AI",
      icon: Bot,
      color: "text-fuchsia-600 bg-fuchsia-500/10 border-fuchsia-500/20",
      title: "AI Financial Assistant",
      description:
        "Intelligent assistant ready to answer questions about your finances: 'How much did we spend on dining in Goa?' or 'Who owes me money?'",
      highlights: [
        "Natural language Q&A",
        "Automated spending categorization",
        "Smart financial recommendations",
        "Voice & text prompt support",
      ],
      ctaText: "Ask Assistant",
      ctaLink: "/dashboard/ai",
    },
    {
      category: "Smart Automation & AI",
      icon: Mic,
      color: "text-red-600 bg-red-500/10 border-red-500/20",
      title: "Voice Commands",
      description:
        "Hands-free expense recording. Speak naturally: 'Paid 450 rupees for coffee split with Priya' and watch SplitLedger log it automatically.",
      highlights: [
        "Speech-to-transaction parsing",
        "Entity & amount recognition",
        "Auto-assign to contacts",
        "Fast on-device recording",
      ],
      ctaText: "Try Voice Input",
      ctaLink: "/dashboard",
    },
    {
      category: "Smart Automation & AI",
      icon: Camera,
      color: "text-pink-600 bg-pink-500/10 border-pink-500/20",
      title: "OCR Receipt Scanner",
      description:
        "State-of-the-art optical character recognition turns restaurant bills and store invoices into structured line items in seconds.",
      highlights: [
        "Camera and file upload",
        "Automatic item extraction",
        "Tax & total validation",
        "Sub-10 second parse speeds",
      ],
      ctaText: "Scan Receipt",
      ctaLink: "/dashboard/transactions",
    },
    {
      category: "Platform & UX",
      icon: LineChart,
      color: "text-sky-600 bg-sky-500/10 border-sky-500/20",
      title: "Real-Time Analytics",
      description:
        "Live financial dashboard reflecting every payment, new group transaction, and settlement change with zero page reloads.",
      highlights: [
        "Zero-latency state sync",
        "Interactive hover charts",
        "Real-time balance updates",
        "Category percentage breakdown",
      ],
      ctaText: "View Analytics",
      ctaLink: "/dashboard/analytics",
    },
    {
      category: "Platform & UX",
      icon: Bell,
      color: "text-amber-600 bg-amber-500/10 border-amber-500/20",
      title: "Notifications & Alerts",
      description:
        "Customizable alert preferences ensuring you never miss an unpaid debt, budget threshold exceedance, or new group invite.",
      highlights: [
        "In-app notifications",
        "Email payment summaries",
        "Settlement reminder pings",
        "Budget warning notifications",
      ],
      ctaText: "Notification Center",
      ctaLink: "/dashboard/notifications",
    },
    {
      category: "Platform & UX",
      icon: LayoutDashboard,
      color: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20",
      title: "Responsive Dashboard",
      description:
        "Engineered with fluid responsiveness for laptops, desktops, tablets, and mobile smartphones with zero layout shifts.",
      highlights: [
        "Adaptive grid & sidebar",
        "Touch-optimized UI controls",
        "High-density data views",
        "Collapsible compact layouts",
      ],
      ctaText: "Open Dashboard",
      ctaLink: "/dashboard",
    },
    {
      category: "Platform & UX",
      icon: Moon,
      color: "text-indigo-600 bg-indigo-500/10 border-indigo-500/20",
      title: "Dark Mode & Contrast",
      description:
        "True OLED black dark mode paired with vibrant light mode, honoring system preferences and WCAG AA contrast standards.",
      highlights: [
        "Smooth color transitions",
        "Low eye-strain palette",
        "System preference sync",
        "High contrast typography",
      ],
      ctaText: "Toggle Theme",
      ctaLink: "/dashboard",
    },
    {
      category: "Platform & UX",
      icon: Smartphone,
      color: "text-purple-600 bg-purple-500/10 border-purple-500/20",
      title: "Progressive Web App (PWA)",
      description:
        "Install SplitLedger AI directly on your iPhone or Android home screen with offline caching and native app performance.",
      highlights: [
        "One-tap home screen install",
        "Fast cached offline mode",
        "Native app-like feel",
        "Low battery consumption",
      ],
      ctaText: "Install App",
      ctaLink: "/dashboard",
    },
  ];

  const filteredFeatures =
    selectedCategory === "All"
      ? featuresList
      : featuresList.filter((f) => f.category === selectedCategory);

  return (
    <div className="flex flex-col w-full overflow-hidden">
      {/* ================= HERO SECTION ================= */}
      <section className="relative py-16 md:py-24 bg-gradient-to-b from-slate-100/70 via-slate-50 to-white dark:from-slate-900/60 dark:via-slate-950 dark:to-slate-950 border-b border-slate-200/80 dark:border-slate-800">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center max-w-4xl space-y-5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20 shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            <span>Comprehensive Financial Toolset</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.15]">
            Engineered for Clarity,{" "}
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Built for Collaboration
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto font-normal leading-relaxed">
            Discover all 18 intelligent features designed to make tracking, splitting, and settling shared expenses effortless.
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all duration-150 ${
                  selectedCategory === cat
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-105"
                    : "bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-300"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ================= FEATURE CARDS GRID ================= */}
      <section className="py-16 md:py-24 bg-slate-50/50 dark:bg-slate-950">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {filteredFeatures.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  className="group relative flex flex-col justify-between p-6 sm:p-7 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-xl hover:shadow-primary/5 hover:border-primary/40 hover:-translate-y-1 transition-all duration-200"
                >
                  <div className="space-y-4">
                    {/* Header: Icon & Category Badge */}
                    <div className="flex items-center justify-between">
                      <div className={`p-3 rounded-2xl border ${item.color}`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700">
                        {item.category}
                      </span>
                    </div>

                    {/* Title & Description */}
                    <div className="space-y-2">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors">
                        {item.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
                        {item.description}
                      </p>
                    </div>

                    {/* Highlights Bullet List */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5">
                      {item.highlights.map((highlight, hIdx) => (
                        <div
                          key={hIdx}
                          className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          <span>{highlight}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* CTA Footer */}
                  <div className="pt-6 mt-4 border-t border-slate-100 dark:border-slate-800/80">
                    <Link href={item.ctaLink}>
                      <Button
                        variant="ghost"
                        className="w-full justify-between rounded-xl text-xs font-bold text-primary group-hover:bg-primary/10 transition-all p-2 h-auto"
                      >
                        <span>{item.ctaText}</span>
                        <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================= BOTTOM CTA ================= */}
      <section className="py-20 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 text-white relative">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center max-w-3xl space-y-6">
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
            Start Experience Every Feature Today
          </h2>
          <p className="text-sm sm:text-base text-blue-100 font-normal">
            No credit card required. Free forever for individuals, roommates, and travel groups.
          </p>
          <div className="pt-2 flex items-center justify-center gap-3">
            <Link href="/sign-up">
              <Button
                size="lg"
                className="h-12 px-8 rounded-2xl text-sm font-bold bg-white text-blue-600 hover:bg-blue-50 shadow-xl hover:scale-[1.02] transition-all"
              >
                Create Free Account
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button
                size="lg"
                variant="outline"
                className="h-12 px-8 rounded-2xl text-sm font-bold border-white/30 text-white hover:bg-white/10 hover:scale-[1.02] transition-all"
              >
                Go to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

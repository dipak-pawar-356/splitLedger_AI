"use client";

import * as React from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Receipt,
  Users,
  Sparkles,
  ArrowLeftRight,
  PieChart,
  FileText,
  Activity,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function FeaturesPage() {
  const [activeCategory, setActiveCategory] = React.useState("All");

  const categories = [
    "All",
    "Splitting & Groups",
    "AI & Automation",
    "Personal Finance",
    "Security",
  ];

  const features = [
    {
      category: "Splitting & Groups",
      icon: Receipt,
      title: "Shared Expense Management",
      description:
        "Track shared and personal expenses with custom categories, payment method tags, and digital receipt attachments.",
      color: "text-blue-500 bg-blue-500/10 border-blue-500/20",
      glowBg: "group-hover:border-blue-500/40 group-hover:shadow-blue-500/10",
    },
    {
      category: "Splitting & Groups",
      icon: Users,
      title: "Groups & Smart Splitting",
      description:
        "Organize housemates, trips, or projects with equal, percentage, exact, or custom share allocations and member roles.",
      color: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20",
      glowBg: "group-hover:border-indigo-500/40 group-hover:shadow-indigo-500/10",
    },
    {
      category: "AI & Automation",
      icon: Sparkles,
      title: "AI Smart Assistant",
      description:
        "Automate accounting with OCR receipt scanning, smart expense categorization, and conversational financial insights.",
      color: "text-amber-500 bg-amber-500/10 border-amber-500/20",
      glowBg: "group-hover:border-amber-500/40 group-hover:shadow-amber-500/10",
    },
    {
      category: "Splitting & Groups",
      icon: ArrowLeftRight,
      title: "Smart Settlements",
      description:
        "Minimize multi-person debts into the fewest direct payments and settle instantly using dynamic NPCI UPI QR codes.",
      color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
      glowBg: "group-hover:border-emerald-500/40 group-hover:shadow-emerald-500/10",
    },
    {
      category: "Personal Finance",
      icon: PieChart,
      title: "Budgets & Reports",
      description:
        "Set monthly spending limits, visualize category breakdowns, and export clean financial reports in PDF and CSV.",
      color: "text-purple-500 bg-purple-500/10 border-purple-500/20",
      glowBg: "group-hover:border-purple-500/40 group-hover:shadow-purple-500/10",
    },
    {
      category: "Personal Finance",
      icon: FileText,
      title: "Notes & Personal Finance",
      description:
        "Maintain daily financial journals, markdown memos, personal loan ledgers, and EMI schedules in one place.",
      color: "text-rose-500 bg-rose-500/10 border-rose-500/20",
      glowBg: "group-hover:border-rose-500/40 group-hover:shadow-rose-500/10",
    },
    {
      category: "AI & Automation",
      icon: Activity,
      title: "Real-Time Collaboration",
      description:
        "Stay aligned with instant member notifications, shared live activity feeds, member timelines, and contact ledgers.",
      color: "text-cyan-500 bg-cyan-500/10 border-cyan-500/20",
      glowBg: "group-hover:border-cyan-500/40 group-hover:shadow-cyan-500/10",
    },
    {
      category: "Security",
      icon: ShieldCheck,
      title: "Secure Platform",
      description:
        "Encrypted cloud synchronization with Clerk authentication, progressive web app offline support, and dark mode.",
      color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
      glowBg: "group-hover:border-emerald-500/40 group-hover:shadow-emerald-500/10",
    },
  ];

  const filteredFeatures =
    activeCategory === "All"
      ? features
      : features.filter((f) => f.category === activeCategory);

  return (
    <div className="w-full bg-white dark:bg-slate-950 py-16 md:py-24 text-slate-800 dark:text-slate-200 overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
        {/* ================= HERO HEADER ================= */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="text-center max-w-3xl mx-auto mb-12 md:mb-16 space-y-4"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Platform Capabilities</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
            Engineered for clarity, speed, and fairness.
          </h1>

          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 font-normal max-w-2xl mx-auto leading-relaxed">
            Everything you need to track shared expenses, eliminate debt friction, and stay financially aligned with zero clutter.
          </p>
        </motion.div>

        {/* ================= CATEGORY TABS ================= */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-wrap items-center justify-center gap-2 mb-12"
          role="tablist"
          aria-label="Filter features by category"
        >
          {categories.map((cat) => {
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`relative px-4 py-2 rounded-xl text-xs font-semibold transition-colors duration-200 ${
                  isActive
                    ? "text-primary dark:text-white"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="features-category-pill"
                    className="absolute inset-0 bg-primary/10 dark:bg-slate-800/80 border border-primary/20 dark:border-slate-700 rounded-xl -z-10 shadow-xs"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <span>{cat}</span>
              </button>
            );
          })}
        </motion.div>

        {/* ================= 8 CORE FEATURE CARDS ================= */}
        <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6 mb-20">
          <AnimatePresence mode="popLayout">
            {filteredFeatures.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  layout
                  key={feature.title}
                  initial={{ opacity: 0, scale: 0.96, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{
                    duration: 0.4,
                    delay: idx * 0.04,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className={`group relative p-6 rounded-2xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 transition-all duration-300 ease-out hover:-translate-y-2 hover:scale-[1.02] hover:shadow-2xl hover:shadow-slate-900/5 dark:hover:shadow-black/40 ${feature.glowBg}`}
                >
                  {/* Icon with hover rotation (8 deg) & scale bounce */}
                  <div
                    className={`p-3 rounded-xl w-fit mb-5 border transition-all duration-300 ease-out group-hover:scale-110 group-hover:rotate-8 group-hover:shadow-md ${feature.color}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>

                  {/* Title */}
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2 tracking-tight">
                    {feature.title}
                  </h3>

                  {/* Description (max 2 lines) */}
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2">
                    {feature.description}
                  </p>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>

        {/* ================= MINIMAL CALL TO ACTION ================= */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="text-center p-8 sm:p-12 rounded-3xl bg-slate-50/60 dark:bg-slate-900/40 border border-slate-200/70 dark:border-slate-800/70 max-w-3xl mx-auto space-y-6"
        >
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Ready to experience effortless expense sharing?
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-lg mx-auto">
              Create your first shared group in seconds. Free for roommates, trips, and friends.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/sign-up" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full sm:w-auto h-11 px-6 rounded-xl text-xs sm:text-sm font-semibold gap-2 bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 shadow-sm hover:shadow-xl transition-all duration-200 ease-out hover:scale-[1.03] active:scale-[0.97]"
              >
                <span>Get Started Free</span>
                <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1" />
              </Button>
            </Link>

            <Link href="/dashboard" className="w-full sm:w-auto">
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto h-11 px-6 rounded-xl text-xs sm:text-sm font-semibold border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 shadow-xs hover:shadow-md transition-all duration-200 ease-out hover:scale-[1.03] active:scale-[0.97]"
              >
                Explore Live Demo
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

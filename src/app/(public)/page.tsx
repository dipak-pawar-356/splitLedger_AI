"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Zap,
  QrCode,
  ArrowLeftRight,
  ShieldCheck,
  Users,
  Receipt,
  CheckCircle2,
  Cloud,
  RefreshCw,
} from "lucide-react";

export default function Home() {
  const features = [
    {
      icon: Zap,
      title: "Split Expenses",
      sentence: "Divide bills equally or by custom amounts with automatic balance updates for everyone.",
      color: "text-amber-500",
      glowBg: "group-hover:shadow-amber-500/10 group-hover:border-amber-500/40",
    },
    {
      icon: QrCode,
      title: "Dynamic UPI Payments",
      sentence: "Generate pre-filled NPCI standard QR codes to settle debts directly in any UPI app.",
      color: "text-primary",
      glowBg: "group-hover:shadow-primary/10 group-hover:border-primary/40",
    },
    {
      icon: ArrowLeftRight,
      title: "Smart Debt Settlement",
      sentence: "Graph minimization reduces complex multi-person transfers into the fewest direct payments.",
      color: "text-emerald-500",
      glowBg: "group-hover:shadow-emerald-500/10 group-hover:border-emerald-500/40",
    },
    {
      icon: ShieldCheck,
      title: "Secure Cloud Sync",
      sentence: "Real-time encrypted ledger synchronization keeps every group member on the same page.",
      color: "text-blue-500",
      glowBg: "group-hover:shadow-blue-500/10 group-hover:border-blue-500/40",
    },
  ];

  const steps = [
    {
      step: "01",
      icon: Users,
      title: "Create Group",
      description: "Start a shared ledger for your household, trip, or event and invite members.",
    },
    {
      step: "02",
      icon: Receipt,
      title: "Add Expenses",
      description: "Record bills as they happen with flexible split options and instant tallying.",
    },
    {
      step: "03",
      icon: CheckCircle2,
      title: "Settle Instantly",
      description: "Pay simplified balances directly using auto-generated dynamic UPI QR codes.",
    },
  ];

  return (
    <div className="flex flex-col w-full overflow-hidden">
      {/* ================= 2. HERO SECTION ================= */}
      <section
        className="relative pt-16 pb-12 md:pt-20 md:pb-16 text-center overflow-hidden"
        aria-labelledby="hero-heading"
      >
        {/* Subtle ambient moving glow behind headline */}
        <motion.div
          animate={{
            scale: [1, 1.1, 0.98, 1],
            opacity: [0.12, 0.2, 0.14, 0.12],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] sm:w-[700px] h-[340px] bg-gradient-to-tr from-primary/30 via-indigo-500/20 to-purple-500/20 rounded-full blur-3xl pointer-events-none -z-10"
          aria-hidden="true"
        />

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          {/* Main Headline */}
          <motion.h1
            id="hero-heading"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-slate-900 dark:text-white leading-[1.1]"
          >
            Split shared expenses.{" "}
            <span className="text-slate-400 dark:text-slate-500 font-semibold">
              Settle with zero friction.
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
            className="mt-5 text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto font-normal leading-relaxed"
          >
            The simplest way for roommates, trips, and friends to track expenses, minimize debts, and settle instantly with dynamic UPI.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
            className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5"
          >
            <Link href="/sign-up" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full sm:w-auto h-11 px-6 rounded-xl text-sm font-semibold gap-2 bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 shadow-sm hover:shadow-lg transition-all duration-200 ease-out hover:scale-[1.03] active:scale-[0.97]"
              >
                <span>Get Started Free</span>
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
              </Button>
            </Link>

            <Link href="/sign-in" className="w-full sm:w-auto">
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto h-11 px-6 rounded-xl text-sm font-semibold border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 shadow-xs hover:shadow-md transition-all duration-200 ease-out hover:scale-[1.03] active:scale-[0.97]"
              >
                Sign In
              </Button>
            </Link>

            <Link href="/dashboard" className="w-full sm:w-auto">
              <Button
                size="lg"
                variant="ghost"
                className="w-full sm:w-auto h-11 px-4 rounded-xl text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-all duration-200 ease-out hover:scale-[1.03] active:scale-[0.97]"
              >
                Live Demo
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ================= 3. WHY SPLITLEDGER ================= */}
      <section
        className="py-12 md:py-[72px] border-t border-slate-200/70 dark:border-slate-800/70 relative"
        aria-labelledby="why-heading"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="text-center max-w-xl mx-auto mb-8"
          >
            <h2
              id="why-heading"
              className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white"
            >
              Why SplitLedger
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{
                    duration: 0.5,
                    delay: idx * 0.06,
                    ease: "easeOut",
                  }}
                  className={`group relative p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 shadow-xs hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 hover:bg-slate-50/90 dark:hover:bg-slate-900/90 transition-all duration-250 ease-out hover:-translate-y-1.5 hover:scale-[1.02] cursor-pointer flex flex-col justify-start h-full ${feature.glowBg}`}
                >
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center text-slate-900 dark:text-slate-100 transition-all duration-250 ease-out group-hover:scale-[1.08] group-hover:rotate-3 group-hover:shadow-xs mb-4 shrink-0">
                    <Icon className={`h-5 w-5 ${feature.color}`} />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight transition-colors duration-200 group-hover:text-primary mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300 leading-relaxed font-normal transition-colors duration-200">
                    {feature.sentence}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================= 4. HOW IT WORKS ================= */}
      <section
        className="py-12 md:py-[72px] border-t border-slate-200/70 dark:border-slate-800/70 bg-slate-50/40 dark:bg-slate-900/20"
        aria-labelledby="how-it-works-heading"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="text-center max-w-xl mx-auto mb-8"
          >
            <h2
              id="how-it-works-heading"
              className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white"
            >
              How It Works
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.step}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{
                    duration: 0.5,
                    delay: idx * 0.08,
                    ease: "easeOut",
                  }}
                  className="group relative p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 shadow-xs hover:border-primary/40 dark:hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 hover:bg-slate-50/90 dark:hover:bg-slate-900/90 transition-all duration-250 ease-out hover:-translate-y-1.5 hover:scale-[1.02] cursor-pointer flex flex-col justify-start h-full"
                >
                  <div className="flex items-center justify-between mb-4 shrink-0">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center transition-all duration-250 ease-out group-hover:scale-[1.08] group-hover:rotate-3 group-hover:shadow-xs">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="font-mono text-xs font-semibold text-slate-400 dark:text-slate-500 transition-colors duration-200 group-hover:text-primary">
                      {step.step}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight transition-colors duration-200 group-hover:text-primary mb-2">
                    {step.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300 leading-relaxed font-normal transition-colors duration-200">
                    {step.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================= 5. TRUST SECTION ================= */}
      <section
        className="py-8 md:py-10 border-t border-slate-200/70 dark:border-slate-800/70"
        aria-label="Trust and Reliability"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs font-medium text-slate-600 dark:text-slate-400">
            <div className="inline-flex items-center gap-2 transition-transform duration-200 hover:scale-105 group cursor-default">
              <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>256-bit Encryption</span>
            </div>
            <div className="inline-flex items-center gap-2 transition-transform duration-200 hover:scale-105 group cursor-default">
              <QrCode className="h-4 w-4 text-primary" />
              <span>Dynamic UPI</span>
            </div>
            <div className="inline-flex items-center gap-2 transition-transform duration-200 hover:scale-105 group cursor-default">
              <Cloud className="h-4 w-4 text-blue-500" />
              <span>Cloud Sync</span>
            </div>
            <div className="inline-flex items-center gap-2 transition-transform duration-200 hover:scale-105 group cursor-default">
              <RefreshCw className="h-4 w-4 text-amber-500" />
              <span>Real-time Updates</span>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 6. FINAL CTA ================= */}
      <section
        className="py-14 md:py-[72px] border-t border-slate-200/70 dark:border-slate-800/70 text-center relative overflow-hidden"
        aria-labelledby="cta-heading"
      >
        {/* Soft radial glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] h-[220px] bg-primary/10 rounded-full blur-3xl pointer-events-none -z-10" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-2xl"
        >
          <h2
            id="cta-heading"
            className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-slate-900 dark:text-white"
          >
            Ready to split smarter?
          </h2>
          <div className="mt-6 flex justify-center">
            <Link href="/sign-up">
              <Button
                size="lg"
                className="h-11 px-7 rounded-xl text-sm font-semibold gap-2 bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 shadow-md hover:shadow-xl hover:shadow-primary/10 transition-all duration-200 ease-out hover:scale-[1.03] active:scale-[0.97]"
              >
                <span>Get Started Free</span>
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>
    </div>
  );
}

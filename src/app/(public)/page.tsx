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
        className="relative pt-20 pb-20 md:pt-28 md:pb-32 text-center overflow-hidden"
        aria-labelledby="hero-heading"
      >
        {/* Subtle ambient moving glow behind headline */}
        <motion.div
          animate={{
            scale: [1, 1.12, 0.98, 1],
            opacity: [0.12, 0.22, 0.15, 0.12],
            rotate: [0, 5, -5, 0],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] sm:w-[750px] h-[380px] bg-gradient-to-tr from-primary/30 via-indigo-500/20 to-purple-500/20 rounded-full blur-3xl pointer-events-none -z-10"
          aria-hidden="true"
        />

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          {/* Main Headline with smooth letter spacing & text reveal */}
          <motion.h1
            id="hero-heading"
            initial={{ opacity: 0, y: 24, letterSpacing: "-0.04em" }}
            animate={{ opacity: 1, y: 0, letterSpacing: "-0.03em" }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-slate-900 dark:text-white leading-[1.08]"
          >
            Split shared expenses.{" "}
            <span className="text-slate-400 dark:text-slate-500 font-semibold">
              Settle with zero friction.
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="mt-6 text-base sm:text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto font-normal leading-relaxed"
          >
            The simplest way for roommates, trips, and friends to track expenses, minimize debts, and settle instantly with dynamic UPI.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3.5"
          >
            <Link href="/sign-up" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full sm:w-auto h-12 px-7 rounded-xl text-sm font-semibold gap-2 bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 shadow-sm hover:shadow-xl hover:shadow-primary/10 transition-all duration-250 ease-out hover:scale-[1.03] active:scale-[0.97]"
              >
                <span>Get Started Free</span>
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
              </Button>
            </Link>

            <Link href="/sign-in" className="w-full sm:w-auto">
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto h-12 px-7 rounded-xl text-sm font-semibold border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 shadow-xs hover:shadow-md transition-all duration-250 ease-out hover:scale-[1.03] active:scale-[0.97]"
              >
                Sign In
              </Button>
            </Link>

            <Link href="/dashboard" className="w-full sm:w-auto">
              <Button
                size="lg"
                variant="ghost"
                className="w-full sm:w-auto h-12 px-5 rounded-xl text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-all duration-250 ease-out hover:scale-[1.03] active:scale-[0.97]"
              >
                Live Demo
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ================= 3. WHY SPLITLEDGER ================= */}
      <section
        className="py-20 md:py-24 border-t border-slate-200/70 dark:border-slate-800/70 relative"
        aria-labelledby="why-heading"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="text-center max-w-xl mx-auto mb-14"
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
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{
                    duration: 0.5,
                    delay: idx * 0.08,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className={`group p-6 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 shadow-xs hover:shadow-2xl hover:border-primary/40 transition-all duration-300 ease-out hover:-translate-y-2 hover:scale-[1.02] flex flex-col gap-3 ${feature.glowBg}`}
                >
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center text-slate-900 dark:text-slate-100 transition-all duration-300 ease-out group-hover:scale-110 group-hover:-rotate-8 group-hover:shadow-md">
                    <Icon className={`h-5 w-5 ${feature.color}`} />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                    {feature.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
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
        className="py-20 md:py-24 border-t border-slate-200/70 dark:border-slate-800/70 bg-slate-50/50 dark:bg-slate-900/20"
        aria-labelledby="how-it-works-heading"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="text-center max-w-xl mx-auto mb-14"
          >
            <h2
              id="how-it-works-heading"
              className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white"
            >
              How It Works
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.step}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{
                    duration: 0.5,
                    delay: idx * 0.1,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="group p-6 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 shadow-xs hover:border-primary/40 dark:hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-300 ease-out hover:-translate-y-2 hover:scale-[1.02] flex flex-col gap-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center transition-all duration-300 ease-out group-hover:scale-110 group-hover:rotate-8 group-hover:shadow-md group-hover:shadow-primary/20">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="font-mono text-xs font-semibold text-slate-400 dark:text-slate-500 transition-colors duration-200 group-hover:text-primary">
                      {step.step}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1 tracking-tight">
                    {step.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
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
        className="py-10 border-t border-slate-200/70 dark:border-slate-800/70"
        aria-label="Trust and Reliability"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs font-medium text-slate-600 dark:text-slate-400">
            <div className="inline-flex items-center gap-2 transition-transform duration-200 hover:scale-105 group cursor-default">
              <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 transition-transform group-hover:rotate-6" />
              <span>256-bit Encryption</span>
            </div>
            <div className="inline-flex items-center gap-2 transition-transform duration-200 hover:scale-105 group cursor-default">
              <QrCode className="h-4 w-4 text-primary transition-transform group-hover:rotate-6" />
              <span>Dynamic UPI</span>
            </div>
            <div className="inline-flex items-center gap-2 transition-transform duration-200 hover:scale-105 group cursor-default">
              <Cloud className="h-4 w-4 text-blue-500 transition-transform group-hover:rotate-6" />
              <span>Cloud Sync</span>
            </div>
            <div className="inline-flex items-center gap-2 transition-transform duration-200 hover:scale-105 group cursor-default">
              <RefreshCw className="h-4 w-4 text-amber-500 transition-transform group-hover:rotate-6" />
              <span>Real-time Updates</span>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 6. FINAL CTA ================= */}
      <section
        className="py-24 sm:py-32 border-t border-slate-200/70 dark:border-slate-800/70 text-center relative overflow-hidden"
        aria-labelledby="cta-heading"
      >
        {/* Soft radial glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[250px] bg-primary/10 rounded-full blur-3xl pointer-events-none -z-10" />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-2xl"
        >
          <h2
            id="cta-heading"
            className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-slate-900 dark:text-white"
          >
            Ready to split smarter?
          </h2>
          <div className="mt-8 flex justify-center">
            <Link href="/sign-up">
              <Button
                size="lg"
                className="h-12 px-8 rounded-xl text-sm font-semibold gap-2 bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 shadow-md hover:shadow-2xl hover:shadow-primary/20 transition-all duration-250 ease-out hover:scale-[1.03] active:scale-[0.97]"
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

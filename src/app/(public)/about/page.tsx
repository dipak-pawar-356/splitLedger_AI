"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Target,
  Users,
  Lightbulb,
  Shield,
  Sparkles,
  ArrowRight,
  Compass,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AboutPage() {
  const values = [
    {
      icon: Users,
      title: "User First",
      description: "Every architectural and design decision starts with what genuinely serves our users.",
      color: "text-blue-500 bg-blue-500/10 border-blue-500/20",
      glowBg: "group-hover:border-blue-500/40 group-hover:shadow-blue-500/10",
    },
    {
      icon: Lightbulb,
      title: "Innovation",
      description: "Continuously refining expense workflows with practical AI and modern engineering.",
      color: "text-amber-500 bg-amber-500/10 border-amber-500/20",
      glowBg: "group-hover:border-amber-500/40 group-hover:shadow-amber-500/10",
    },
    {
      icon: Shield,
      title: "Integrity & Trust",
      description: "Bank-level encryption, mathematical balance precision, and zero commercial tracking.",
      color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
      glowBg: "group-hover:border-emerald-500/40 group-hover:shadow-emerald-500/10",
    },
    {
      icon: Target,
      title: "Simplicity",
      description: "Solving complex multi-party debt reconciliations with elegant, friction-free UI.",
      color: "text-purple-500 bg-purple-500/10 border-purple-500/20",
      glowBg: "group-hover:border-purple-500/40 group-hover:shadow-purple-500/10",
    },
  ];

  const storyTimeline = [
    {
      period: "The Frustration",
      title: "Shared expenses shouldn't strain friendships",
      description:
        "Whether splitting a dinner bill, managing road trip receipts, or keeping track of household groceries, existing spreadsheets and tools were either overwhelmingly complicated or clunky.",
    },
    {
      period: "The Solution",
      title: "What if expense tracking was effortless?",
      description:
        "We set out to build a platform where optical character recognition scans receipts instantly, graph minimization simplifies debts into minimal transfers, and settlements happen directly via dynamic UPI QR codes.",
    },
    {
      period: "Today & Beyond",
      title: "Modern finance built for transparency",
      description:
        "SplitLedger AI empowers users with intelligent shared ledgers, private personal finances, and zero advertisement tracking. We're continuously engineering the future of personal finance.",
    },
  ];

  return (
    <div className="w-full bg-white dark:bg-slate-950 py-12 md:py-[72px] text-slate-800 dark:text-slate-200 overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
        {/* ================= HERO SECTION ================= */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="text-center max-w-3xl mx-auto mb-10 md:mb-14 space-y-3"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Our Purpose</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
            About SplitLedger AI
          </h1>

          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 font-normal max-w-2xl mx-auto leading-relaxed">
            We&apos;re on a mission to make shared expense management simple, smart, and completely stress-free for everyone.
          </p>
        </motion.div>

        {/* ================= MISSION & GOAL SECTION ================= */}
        <section className="mb-14 md:mb-16">
          <div className="grid md:grid-cols-12 gap-6 items-stretch">
            {/* Mission Statement */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="md:col-span-7 p-6 sm:p-8 rounded-3xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 flex flex-col justify-center space-y-4"
            >
              <div className="flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-wider">
                <Compass className="h-4 w-4" />
                <span>Our Mission</span>
              </div>

              <h2 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                Eliminating financial friction in everyday relationships.
              </h2>

              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                At SplitLedger AI, we believe managing shared expenditures shouldn&apos;t be awkward or complicated. We build tools that make it effortless to track, split, and settle expenses with friends, family, and colleagues.
              </p>

              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Powered by artificial intelligence and precision mathematical accounting, our platform automates the tedious administrative steps so you can focus on enjoying moments with the people you care about.
              </p>
            </motion.div>

            {/* Interactive Goal Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.08, ease: "easeOut" }}
              className="md:col-span-5 group relative p-6 sm:p-8 rounded-3xl bg-slate-900 text-white dark:bg-slate-900/90 dark:border dark:border-slate-800 flex flex-col justify-between shadow-xl transition-all duration-250 ease-out hover:-translate-y-1.5 hover:scale-[1.02] hover:shadow-2xl overflow-hidden cursor-pointer"
            >
              {/* Subtle ambient lighting */}
              <div className="absolute top-0 right-0 w-44 h-44 bg-primary/20 rounded-full blur-2xl pointer-events-none -z-0" />

              <div className="relative z-10 space-y-4">
                <div className="p-3 rounded-2xl bg-white/10 w-fit backdrop-blur-sm border border-white/10 text-white transition-all duration-250 group-hover:scale-[1.08] group-hover:rotate-3 group-hover:shadow-md">
                  <Target className="h-5 w-5" />
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg sm:text-xl font-bold tracking-tight">Our Goal</h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    To eliminate financial confusion by providing the most intuitive, fair, and mathematically accurate expense-sharing platform in the world.
                  </p>
                </div>
              </div>

              <div className="relative z-10 pt-5 border-t border-white/10 flex items-center gap-2 text-xs text-slate-400">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>Zero advertising • 100% Privacy-First</span>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ================= OUR VALUES ================= */}
        <section className="mb-14 md:mb-16">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="text-center max-w-xl mx-auto mb-8 space-y-2"
          >
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Core Principles
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              The fundamental standards that guide how we design, build, and ship.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {values.map((val, idx) => {
              const Icon = val.icon;
              return (
                <motion.div
                  key={val.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: idx * 0.06, ease: "easeOut" }}
                  className={`group relative p-5 sm:p-6 rounded-2xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 hover:border-primary/40 hover:shadow-xl hover:shadow-slate-900/5 dark:hover:shadow-black/40 hover:bg-slate-100/70 dark:hover:bg-slate-900/90 transition-all duration-250 ease-out hover:-translate-y-1.5 hover:scale-[1.02] cursor-pointer flex flex-col justify-start h-full ${val.glowBg}`}
                >
                  <div
                    className={`p-2.5 rounded-xl w-fit mb-4 border transition-all duration-250 ease-out group-hover:scale-[1.08] group-hover:rotate-3 group-hover:shadow-xs shrink-0 ${val.color}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2 tracking-tight transition-colors duration-200 group-hover:text-primary">
                    {val.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300 leading-relaxed font-normal transition-colors duration-200">
                    {val.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* ================= STORY TIMELINE ================= */}
        <section className="mb-14 md:mb-16 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="text-center mb-8 space-y-2"
          >
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              The Journey
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Why we started and where we are heading.
            </p>
          </motion.div>

          <div className="space-y-4 sm:space-y-5 relative before:absolute before:inset-0 before:left-4 sm:before:left-7 before:h-full before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
            {storyTimeline.map((item, idx) => (
              <motion.div
                key={item.period}
                initial={{ opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.08, ease: "easeOut" }}
                className="relative flex items-start gap-4 sm:gap-5 pl-1 sm:pl-3 group"
              >
                {/* Timeline Node */}
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-white dark:bg-slate-950 border-2 border-primary flex items-center justify-center shrink-0 z-10 transition-transform duration-200 group-hover:scale-110 group-hover:shadow-xs">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                </div>

                {/* Content Card */}
                <div className="flex-1 p-5 sm:p-6 rounded-2xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 hover:bg-slate-100/70 dark:hover:bg-slate-900/90 transition-all duration-200 ease-out hover:-translate-y-1 hover:shadow-md hover:border-primary/40 cursor-pointer">
                  <span className="text-[11px] font-mono font-bold text-primary tracking-wider uppercase">
                    {item.period}
                  </span>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1 mb-1.5">
                    {item.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ================= FINAL CTA ================= */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="text-center p-8 sm:p-10 rounded-3xl bg-slate-50/60 dark:bg-slate-900/40 border border-slate-200/70 dark:border-slate-800/70 max-w-3xl mx-auto space-y-5"
        >
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Join thousands experiencing simpler shared finances.
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-lg mx-auto">
              Get started for free today. No credit card required.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/sign-up" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full sm:w-auto h-11 px-6 rounded-xl text-xs sm:text-sm font-semibold gap-2 bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 shadow-sm hover:shadow-xl transition-all duration-200 ease-out hover:scale-[1.03] active:scale-[0.97]"
              >
                <span>Create Free Account</span>
                <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1" />
              </Button>
            </Link>

            <Link href="/features" className="w-full sm:w-auto">
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto h-11 px-6 rounded-xl text-xs sm:text-sm font-semibold border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 shadow-xs hover:shadow-md transition-all duration-200 ease-out hover:scale-[1.03] active:scale-[0.97]"
              >
                Explore Features
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

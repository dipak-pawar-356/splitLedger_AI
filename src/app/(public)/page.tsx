import Link from "next/link";
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
    },
    {
      icon: QrCode,
      title: "Dynamic UPI Payments",
      sentence: "Generate pre-filled NPCI standard QR codes to settle debts directly in any UPI app.",
    },
    {
      icon: ArrowLeftRight,
      title: "Smart Debt Settlement",
      sentence: "Graph minimization reduces complex multi-person transfers into the fewest direct payments.",
    },
    {
      icon: ShieldCheck,
      title: "Secure Cloud Sync",
      sentence: "Real-time encrypted ledger synchronization keeps every group member on the same page.",
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
    <div className="flex flex-col w-full">
      {/* ================= 2. HERO SECTION ================= */}
      <section
        className="relative pt-20 pb-20 md:pt-28 md:pb-28 text-center overflow-hidden"
        aria-labelledby="hero-heading"
      >
        {/* Subtle ambient glow behind headline */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] sm:w-[700px] h-[350px] bg-primary/10 rounded-full blur-3xl pointer-events-none -z-10"
          aria-hidden="true"
        />

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          {/* Main Headline */}
          <h1
            id="hero-heading"
            className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-slate-900 dark:text-white leading-[1.08]"
          >
            Split shared expenses.{" "}
            <span className="text-slate-400 dark:text-slate-500">
              Settle with zero friction.
            </span>
          </h1>

          {/* Subtitle (Max 2 lines) */}
          <p className="mt-6 text-base sm:text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto font-normal leading-relaxed">
            The simplest way for roommates, trips, and friends to track expenses, minimize debts, and settle instantly with dynamic UPI.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/sign-up" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full sm:w-auto h-12 px-7 rounded-xl text-sm font-semibold gap-2 bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 shadow-sm transition-all hover:scale-[1.01]"
              >
                <span>Get Started Free</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>

            <Link href="/sign-in" className="w-full sm:w-auto">
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto h-12 px-7 rounded-xl text-sm font-semibold border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 transition-all hover:scale-[1.01]"
              >
                Sign In
              </Button>
            </Link>

            <Link href="/dashboard" className="w-full sm:w-auto">
              <Button
                size="lg"
                variant="ghost"
                className="w-full sm:w-auto h-12 px-5 rounded-xl text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              >
                Live Demo
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ================= 3. WHY SPLITLEDGER ================= */}
      <section
        className="py-20 md:py-24 border-t border-slate-200/70 dark:border-slate-800/70"
        aria-labelledby="why-heading"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
          <div className="text-center max-w-xl mx-auto mb-14">
            <h2
              id="why-heading"
              className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white"
            >
              Why SplitLedger
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="p-6 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors flex flex-col gap-3"
                >
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center text-slate-900 dark:text-slate-100">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {feature.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
                    {feature.sentence}
                  </p>
                </div>
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
          <div className="text-center max-w-xl mx-auto mb-14">
            <h2
              id="how-it-works-heading"
              className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white"
            >
              How It Works
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.step}
                  className="p-6 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 shadow-xs flex flex-col gap-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="font-mono text-xs font-semibold text-slate-400 dark:text-slate-500">
                      {step.step}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                    {step.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
                    {step.description}
                  </p>
                </div>
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
            <div className="inline-flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>256-bit Encryption</span>
            </div>
            <div className="inline-flex items-center gap-2">
              <QrCode className="h-4 w-4 text-primary" />
              <span>Dynamic UPI</span>
            </div>
            <div className="inline-flex items-center gap-2">
              <Cloud className="h-4 w-4 text-blue-500" />
              <span>Cloud Sync</span>
            </div>
            <div className="inline-flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-amber-500" />
              <span>Real-time Updates</span>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 6. FINAL CTA ================= */}
      <section
        className="py-24 sm:py-32 border-t border-slate-200/70 dark:border-slate-800/70 text-center"
        aria-labelledby="cta-heading"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-2xl">
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
                className="h-12 px-8 rounded-xl text-sm font-semibold gap-2 bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 shadow-sm transition-all hover:scale-[1.01]"
              >
                <span>Get Started Free</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}


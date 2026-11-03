"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Repeat,
  Calendar,
  Sparkles,
  RefreshCw,
  Zap,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  ShieldCheck,
  ArrowRight,
  Pause,
  Play,
  Star,
  AlertCircle,
  CreditCard,
  Check,
  TrendingDown,
} from "lucide-react";
import { getDetectedSubscriptions } from "@/actions/ai-assistant";
import { DetectedSubscription } from "@/lib/ai/subscription-detector";
import { formatCurrency } from "@/lib/utils";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { toast } from "sonner";

// Pre-configured popular subscriptions catalog tailored for India / Global
interface PresetSubscription {
  name: string;
  category: DetectedSubscription["category"];
  monthlyAmount: number;
  billingCycle: "monthly" | "yearly";
  brandColor: string;
  iconInitials: string;
}

const POPULAR_PRESETS: PresetSubscription[] = [
  {
    name: "Netflix India",
    category: "Digital Subscription",
    monthlyAmount: 649,
    billingCycle: "monthly",
    brandColor: "from-red-600 to-rose-700",
    iconInitials: "NF",
  },
  {
    name: "ChatGPT Plus",
    category: "Digital Subscription",
    monthlyAmount: 1999,
    billingCycle: "monthly",
    brandColor: "from-teal-600 to-emerald-700",
    iconInitials: "AI",
  },
  {
    name: "Spotify Premium",
    category: "Digital Subscription",
    monthlyAmount: 119,
    billingCycle: "monthly",
    brandColor: "from-emerald-500 to-green-600",
    iconInitials: "SP",
  },
  {
    name: "Amazon Prime",
    category: "Digital Subscription",
    monthlyAmount: 299,
    billingCycle: "yearly",
    brandColor: "from-blue-500 to-sky-600",
    iconInitials: "AP",
  },
  {
    name: "Disney+ Hotstar",
    category: "Digital Subscription",
    monthlyAmount: 299,
    billingCycle: "yearly",
    brandColor: "from-indigo-600 to-blue-700",
    iconInitials: "DH",
  },
  {
    name: "JioFiber Broadband",
    category: "Utilities & Bills",
    monthlyAmount: 999,
    billingCycle: "monthly",
    brandColor: "from-blue-600 to-cyan-600",
    iconInitials: "JF",
  },
  {
    name: "GitHub Copilot",
    category: "Digital Subscription",
    monthlyAmount: 499,
    billingCycle: "monthly",
    brandColor: "from-slate-700 to-slate-900",
    iconInitials: "GH",
  },
  {
    name: "Claude Pro",
    category: "Digital Subscription",
    monthlyAmount: 1999,
    billingCycle: "monthly",
    brandColor: "from-amber-600 to-orange-700",
    iconInitials: "CP",
  },
];

// Default starter items for immediate rich visual experience
const DEFAULT_INITIAL_SUBSCRIPTIONS: DetectedSubscription[] = [
  {
    id: "sub-netflix-demo",
    name: "Netflix India",
    category: "Digital Subscription",
    monthlyAmount: 649,
    annualizedCost: 649 * 12,
    billingCycle: "monthly",
    nextEstimatedBillingDate: "2026-11-15",
    confidence: 0.95,
    lastPaymentDate: "2026-10-15",
    savingRecommendation: "Switching to annual billing saves ~16% annually",
  },
  {
    id: "sub-spotify-demo",
    name: "Spotify Premium",
    category: "Digital Subscription",
    monthlyAmount: 119,
    annualizedCost: 119 * 12,
    billingCycle: "monthly",
    nextEstimatedBillingDate: "2026-11-22",
    confidence: 0.92,
    lastPaymentDate: "2026-10-22",
  },
  {
    id: "sub-jio-demo",
    name: "JioFiber Broadband",
    category: "Utilities & Bills",
    monthlyAmount: 999,
    annualizedCost: 999 * 12,
    billingCycle: "monthly",
    nextEstimatedBillingDate: "2026-11-28",
    confidence: 0.96,
    lastPaymentDate: "2026-10-28",
    savingRecommendation: "Quarterly advance recharge offers 15 days bonus data",
  },
];

export function AISubscriptionsCard() {
  const [subscriptions, setSubscriptions] = useState<DetectedSubscription[]>([]);
  const [pausedIds, setPausedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [selectedPlanTier, setSelectedPlanTier] = useState<"pro" | "enterprise">("pro");
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("annual");

  // Form state for adding custom subscription
  const [customName, setCustomName] = useState("");
  const [customAmount, setCustomAmount] = useState("");
  const [customCycle, setCustomCycle] = useState<"monthly" | "yearly">("monthly");
  const [customCategory, setCustomCategory] = useState<DetectedSubscription["category"]>("Digital Subscription");
  const [customDate, setCustomDate] = useState("");

  const shouldReduceMotion = useReducedMotion();

  // Load from backend & merge with localStorage
  const loadSubscriptions = async () => {
    setIsLoading(true);
    try {
      const data = await getDetectedSubscriptions();
      const savedLocal = typeof window !== "undefined" ? localStorage.getItem("spl_user_subscriptions") : null;

      if (savedLocal) {
        try {
          const parsed = JSON.parse(savedLocal) as DetectedSubscription[];
          // Merge unique by ID or Name
          const merged = [...data];
          for (const item of parsed) {
            if (!merged.some((m) => m.name.toLowerCase() === item.name.toLowerCase())) {
              merged.push(item);
            }
          }
          setSubscriptions(merged.length > 0 ? merged : DEFAULT_INITIAL_SUBSCRIPTIONS);
        } catch {
          setSubscriptions(data.length > 0 ? data : DEFAULT_INITIAL_SUBSCRIPTIONS);
        }
      } else {
        setSubscriptions(data.length > 0 ? data : DEFAULT_INITIAL_SUBSCRIPTIONS);
      }
    } catch (e) {
      console.error(e);
      setSubscriptions(DEFAULT_INITIAL_SUBSCRIPTIONS);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSubscriptions();
  }, []);

  // Save changes to localStorage
  const persistSubscriptions = (items: DetectedSubscription[]) => {
    setSubscriptions(items);
    if (typeof window !== "undefined") {
      localStorage.setItem("spl_user_subscriptions", JSON.stringify(items));
    }
  };

  // Add 1-Click Preset
  const handleAddPreset = (preset: PresetSubscription) => {
    if (subscriptions.some((s) => s.name.toLowerCase() === preset.name.toLowerCase())) {
      toast.info(`${preset.name} is already in your active subscriptions`);
      return;
    }

    const today = new Date();
    const nextDate = new Date(today);
    nextDate.setDate(today.getDate() + 14); // Next renewal in 14 days

    const newSub: DetectedSubscription = {
      id: `sub-${Date.now()}-${preset.name.toLowerCase().replace(/\s+/g, "-")}`,
      name: preset.name,
      category: preset.category,
      monthlyAmount: preset.monthlyAmount,
      annualizedCost: preset.billingCycle === "yearly" ? preset.monthlyAmount : preset.monthlyAmount * 12,
      billingCycle: preset.billingCycle,
      nextEstimatedBillingDate: nextDate.toISOString().split("T")[0],
      confidence: 0.99,
      lastPaymentDate: today.toISOString().split("T")[0],
      savingRecommendation:
        preset.billingCycle === "monthly"
          ? "Switching to annual billing saves up to 20% each year"
          : undefined,
    };

    const updated = [newSub, ...subscriptions];
    persistSubscriptions(updated);
    toast.success(`Added ${preset.name} (${formatCurrency(preset.monthlyAmount)}/mo)`);
  };

  // Handle Custom Add
  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(customAmount);
    if (!customName.trim() || isNaN(amt) || amt <= 0) {
      toast.error("Please enter a valid subscription name and amount");
      return;
    }

    const nextBilling = customDate || new Date(Date.now() + 15 * 86400000).toISOString().split("T")[0];

    const newSub: DetectedSubscription = {
      id: `custom-sub-${Date.now()}`,
      name: customName.trim(),
      category: customCategory,
      monthlyAmount: customCycle === "monthly" ? amt : Math.round(amt / 12),
      annualizedCost: customCycle === "yearly" ? amt : amt * 12,
      billingCycle: customCycle,
      nextEstimatedBillingDate: nextBilling,
      confidence: 1.0,
      lastPaymentDate: new Date().toISOString().split("T")[0],
    };

    persistSubscriptions([newSub, ...subscriptions]);
    setIsAddDialogOpen(false);
    setCustomName("");
    setCustomAmount("");
    setCustomDate("");
    toast.success(`Created subscription for ${newSub.name}`);
  };

  // Remove subscription
  const handleDeleteSub = (id: string, name: string) => {
    const updated = subscriptions.filter((s) => s.id !== id);
    persistSubscriptions(updated);
    toast.info(`Removed ${name} from recurring calendar`);
  };

  // Toggle Pause/Active status
  const handleTogglePause = (id: string, name: string) => {
    setPausedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        toast.success(`Resumed tracking for ${name}`);
      } else {
        next.add(id);
        toast.info(`Paused tracking for ${name}`);
      }
      return next;
    });
  };

  // Days until renewal calculation
  const getDaysUntil = (dateStr: string) => {
    try {
      const target = new Date(dateStr).getTime();
      const now = new Date().getTime();
      const diffDays = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
      if (diffDays <= 0) return "Due Today";
      if (diffDays === 1) return "Due Tomorrow";
      return `Renews in ${diffDays} days`;
    } catch {
      return dateStr;
    }
  };

  // Calculations
  const activeSubs = subscriptions.filter((s) => !pausedIds.has(s.id));
  const totalMonthlyRupees = activeSubs.reduce((sum, s) => sum + s.monthlyAmount, 0);
  const totalAnnualRupees = activeSubs.reduce((sum, s) => sum + s.annualizedCost, 0);

  return (
    <div className="space-y-6">
      {/* MAIN SUBSCRIPTION CONTROL CARD */}
      <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden bg-card transition-all duration-300 hover:shadow-md">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800/80 bg-gradient-to-r from-slate-50/80 via-purple-50/20 to-pink-50/20 dark:from-slate-900/40 dark:via-purple-950/20 dark:to-pink-950/10 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/20 shadow-xs shrink-0">
                <Repeat className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <CardTitle className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                    Recurring Subscriptions & Utility Calendar
                  </CardTitle>
                  <Badge variant="outline" className="text-[10px] text-purple-600 border-purple-200 dark:border-purple-800 bg-purple-500/5 font-semibold">
                    Auto-Tracked & Managed
                  </Badge>
                </div>
                <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  AI-detected digital subscriptions, broadband, mobile bills, and recurring rents in INR (₹)
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
              <Button
                type="button"
                size="sm"
                onClick={() => setIsAddDialogOpen(true)}
                className="h-9 rounded-xl text-xs font-bold gap-1.5 shadow-2xs hover:border-purple-500/50"
              >
                <Plus className="h-4 w-4" />
                <span>Add Subscription</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 rounded-xl text-xs font-semibold gap-1.5 shadow-2xs hover:border-purple-500/50"
                onClick={loadSubscriptions}
                disabled={isLoading}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin text-purple-600" : ""}`} />
                <span>{isLoading ? "Scanning..." : "Scan History"}</span>
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5 sm:p-6 space-y-6">
          {/* QUICK-ADD POPULAR SERVICES CATALOG */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Quick-Add Popular Indian & Global Services
              </span>
              <span className="text-[11px] text-slate-400">1-Click Fast Track</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {POPULAR_PRESETS.map((preset) => {
                const isAlreadyAdded = subscriptions.some((s) => s.name.toLowerCase() === preset.name.toLowerCase());
                return (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => handleAddPreset(preset)}
                    disabled={isAlreadyAdded}
                    className={`p-3 rounded-2xl border text-left transition-all duration-200 flex items-center justify-between gap-2 group ${
                      isAlreadyAdded
                        ? "border-slate-200/50 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/30 opacity-60 cursor-default"
                        : "border-slate-200/80 dark:border-slate-800 bg-card hover:border-purple-500/50 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${preset.brandColor} text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform`}>
                        {preset.iconInitials}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                          {preset.name}
                        </p>
                        <p className="text-[11px] font-mono text-slate-500 font-semibold">
                          ₹{preset.monthlyAmount}/mo
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {isAlreadyAdded ? (
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <Plus className="h-3.5 w-3.5 text-slate-400 group-hover:text-primary transition-colors" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* AGGREGATED METRICS STRIP */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Total Monthly Commitments */}
            <div className="relative overflow-hidden p-5 rounded-2xl border border-purple-500/20 bg-purple-500/5 shadow-2xs space-y-1">
              <div className="fin-border-gradient bg-gradient-to-br from-purple-500/40 via-violet-500/25 to-purple-700/35 opacity-70" />
              <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-purple-500" />
                Monthly Subscriptions Outflow
              </span>
              <p className="text-2xl font-black text-purple-600 dark:text-purple-400 font-mono tabular-nums">
                <AnimatedCounter value={formatCurrency(totalMonthlyRupees, "INR")} duration={0.5} />
              </p>
              <span className="text-[11px] text-slate-400 block font-mono tabular-nums">
                {activeSubs.length} active recurring commitments
              </span>
            </div>

            {/* Annual Run-Rate */}
            <div className="relative overflow-hidden p-5 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 shadow-2xs space-y-1">
              <div className="fin-border-gradient bg-gradient-to-br from-indigo-500/40 via-blue-500/25 to-indigo-700/35 opacity-70" />
              <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-primary" />
                Annual Projected Run-Rate
              </span>
              <p className="text-2xl font-black text-primary font-mono tabular-nums">
                <AnimatedCounter value={formatCurrency(totalAnnualRupees, "INR")} duration={0.5} />
              </p>
              <span className="text-[11px] text-slate-400 block font-mono tabular-nums">
                12-month calculated drain pace
              </span>
            </div>

            {/* Average Monthly Bill */}
            <div className="relative overflow-hidden p-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 shadow-2xs space-y-1">
              <div className="fin-border-gradient bg-gradient-to-br from-emerald-500/40 via-teal-500/25 to-emerald-700/35 opacity-70" />
              <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                Average Cost per Active Bill
              </span>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
                <AnimatedCounter
                  value={formatCurrency(activeSubs.length > 0 ? Math.round(totalMonthlyRupees / activeSubs.length) : 0, "INR")}
                  duration={0.5}
                />
              </p>
              <span className="text-[11px] text-slate-400 block font-mono tabular-nums">
                Optimized per-service expense
              </span>
            </div>
          </div>

          {/* ACTIVE RECURRING SUBSCRIPTIONS LIST */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Active Recurring Ledger ({subscriptions.length})
              </span>
              <span className="text-[11px] text-slate-400">Sorted by payment date</span>
            </div>

            {subscriptions.length === 0 ? (
              <div className="p-10 text-center text-xs text-slate-400 space-y-2 border border-dashed rounded-2xl">
                <Repeat className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-700" />
                <p className="font-semibold text-slate-700 dark:text-slate-300">
                  {isLoading ? "Analyzing transaction history for recurring bills..." : "No recurring subscriptions configured."}
                </p>
                <p>Use &ldquo;+ Add Subscription&rdquo; or click any service from the quick catalog above.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-2xs bg-card">
                <AnimatePresence>
                  {subscriptions.map((sub) => {
                    const isPaused = pausedIds.has(sub.id);
                    const renewalPill = getDaysUntil(sub.nextEstimatedBillingDate);
                    const isDueSoon = renewalPill.includes("Today") || renewalPill.includes("Tomorrow") || (renewalPill.match(/\d+/) && parseInt(renewalPill.match(/\d+/)?.[0] || "99") <= 5);

                    return (
                      <motion.div
                        key={sub.id}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs transition-colors ${
                          isPaused ? "bg-slate-50/60 dark:bg-slate-900/40 opacity-70" : "hover:bg-slate-50/80 dark:hover:bg-slate-900/30"
                        }`}
                      >
                        <div className="space-y-1.5 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                              {sub.name}
                            </span>
                            <Badge variant="outline" className="text-[10px] py-0 px-2 font-semibold">
                              {sub.category}
                            </Badge>
                            <Badge
                              className={`text-[9px] py-0 px-1.5 font-mono ${
                                isPaused
                                  ? "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                                  : isDueSoon
                                  ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                  : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                              }`}
                            >
                              <Clock className="h-2.5 w-2.5 mr-1 inline" />
                              {isPaused ? "Paused" : renewalPill}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-3 text-[11px] text-slate-500">
                            <span>Next Billing: <strong className="text-slate-700 dark:text-slate-300 font-mono">{sub.nextEstimatedBillingDate}</strong></span>
                            <span>•</span>
                            <span>Annual Total: <strong className="font-mono tabular-nums">{formatCurrency(sub.annualizedCost, "INR")}</strong></span>
                          </div>

                          {sub.savingRecommendation && (
                            <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1.5 font-medium">
                              <Sparkles className="h-3 w-3 shrink-0" />
                              <span>{sub.savingRecommendation}</span>
                            </p>
                          )}
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                          <div className="text-left sm:text-right">
                            <p className="font-black text-base text-slate-900 dark:text-slate-100 font-mono tabular-nums">
                              {formatCurrency(sub.monthlyAmount, "INR")}
                            </p>
                            <p className="text-[10px] text-slate-400 capitalize">{sub.billingCycle} billing</p>
                          </div>

                          {/* Quick Controls: Pause and Delete */}
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleTogglePause(sub.id, sub.name)}
                              className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                              title={isPaused ? "Resume tracking" : "Pause tracking"}
                            >
                              {isPaused ? <Play className="h-3.5 w-3.5 text-emerald-500" /> : <Pause className="h-3.5 w-3.5" />}
                            </Button>

                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDeleteSub(sub.id, sub.name)}
                              className="h-8 w-8 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-500/10"
                              title="Delete subscription"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* SPLITLEDGER AI PRO & ENTERPRISE MEMBERSHIP TIERS SHOWCASE */}
      <Card className="rounded-3xl border border-primary/20 bg-gradient-to-b from-card via-card to-primary/5 shadow-md overflow-hidden">
        <CardHeader className="text-center pb-2 pt-6">
          <Badge className="w-fit mx-auto text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border-primary/30 mb-2">
            SplitLedger AI Memberships
          </Badge>
          <CardTitle className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">
            Supercharge Your Ledger with SplitLedger AI Pro
          </CardTitle>
          <CardDescription className="text-xs max-w-lg mx-auto">
            Unlock advanced mathematical forecasting, voice AI accounting, instant receipt OCR scanning, and automated WhatsApp settlement triggers.
          </CardDescription>

          {/* Monthly vs Annual Billing Toggle */}
          <div className="flex items-center justify-center gap-3 pt-4">
            <span className={`text-xs font-bold ${billingPeriod === "monthly" ? "text-slate-900 dark:text-slate-100" : "text-slate-400"}`}>
              Monthly
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={billingPeriod === "annual"}
              onClick={() => setBillingPeriod((p) => (p === "monthly" ? "annual" : "monthly"))}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                billingPeriod === "annual" ? "bg-primary" : "bg-slate-300 dark:bg-slate-700"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  billingPeriod === "annual" ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
            <div className="flex items-center gap-1.5">
              <span className={`text-xs font-bold ${billingPeriod === "annual" ? "text-slate-900 dark:text-slate-100" : "text-slate-400"}`}>
                Annually
              </span>
              <Badge className="text-[9px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                Save 20%
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5 sm:p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* PLAN 1: SPLITLEDGER AI PRO */}
            <div className="relative overflow-hidden rounded-3xl border-2 border-primary/40 bg-card p-6 shadow-xl flex flex-col justify-between group hover:border-primary transition-all">
              <div className="fin-border-gradient bg-gradient-to-br from-primary/50 via-indigo-500/30 to-purple-600/40 opacity-80" />
              <div className="pointer-events-none absolute -top-12 -right-12 h-32 w-32 rounded-full bg-primary/20 blur-2xl" />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Badge className="bg-primary text-primary-foreground font-bold text-[10px] px-2.5 py-0.5 shadow-xs">
                    MOST POPULAR
                  </Badge>
                  <span className="text-[11px] text-slate-400 font-mono">Personal & Freelance</span>
                </div>

                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">SplitLedger AI Pro</h3>
                  <div className="flex items-baseline gap-1 mt-1 font-mono">
                    <span className="text-3xl font-black text-slate-900 dark:text-slate-100 tabular-nums">
                      {billingPeriod === "annual" ? "₹399" : "₹499"}
                    </span>
                    <span className="text-xs text-slate-400">/ month</span>
                    {billingPeriod === "annual" && (
                      <span className="text-[10px] text-emerald-600 ml-1.5 font-bold">billed annually (₹4,788/yr)</span>
                    )}
                  </div>
                </div>

                <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300 border-t border-slate-100 dark:border-slate-800 pt-4">
                  {[
                    "Unlimited AI Financial Intelligence Queries",
                    "Automated Receipt & Invoice OCR Scanning",
                    "12-Month Mathematical Solvency & Cashflow Projections",
                    "WhatsApp & Telegram Instant Settlement Payment Links",
                    "Multi-Currency Split Ledger Auto-Reconciliation",
                    "Priority Double-Entry Integrity Verification",
                  ].map((feat) => (
                    <div key={feat} className="flex items-center gap-2">
                      <div className="p-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                        <Check className="h-3.5 w-3.5" />
                      </div>
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-6">
                <Button
                  onClick={() => {
                    setSelectedPlanTier("pro");
                    setIsUpgradeModalOpen(true);
                  }}
                  className="w-full h-11 rounded-2xl font-bold text-xs gap-2 shadow-md bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  <Star className="h-4 w-4 fill-current" />
                  <span>Upgrade to Pro</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* PLAN 2: ENTERPRISE & TEAMS */}
            <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-card p-6 shadow-sm flex flex-col justify-between hover:border-slate-400 dark:hover:border-slate-600 transition-all">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-[10px] font-bold">
                    TEAMS & ORGS
                  </Badge>
                  <span className="text-[11px] text-slate-400 font-mono">Business Scale</span>
                </div>

                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">SplitLedger Enterprise</h3>
                  <div className="flex items-baseline gap-1 mt-1 font-mono">
                    <span className="text-3xl font-black text-slate-900 dark:text-slate-100 tabular-nums">
                      {billingPeriod === "annual" ? "₹1,199" : "₹1,499"}
                    </span>
                    <span className="text-xs text-slate-400">/ month</span>
                    {billingPeriod === "annual" && (
                      <span className="text-[10px] text-emerald-600 ml-1.5 font-bold">billed annually</span>
                    )}
                  </div>
                </div>

                <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300 border-t border-slate-100 dark:border-slate-800 pt-4">
                  {[
                    "Everything in SplitLedger AI Pro",
                    "Unlimited Shared Workspaces & Team Members",
                    "Custom Role-Based Access Control (RBAC)",
                    "Direct Sync to QuickBooks, Tally & Zoho Books",
                    "Dedicated Webhook API & Audit Trail Log Streams",
                    "24/7 Dedicated Account Manager & Financial Concierge",
                  ].map((feat) => (
                    <div key={feat} className="flex items-center gap-2">
                      <div className="p-0.5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400">
                        <Check className="h-3.5 w-3.5" />
                      </div>
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedPlanTier("enterprise");
                    setIsUpgradeModalOpen(true);
                  }}
                  className="w-full h-11 rounded-2xl font-bold text-xs gap-2 hover:border-primary/50"
                >
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <span>Contact Enterprise Sales</span>
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* DIALOG 1: ADD CUSTOM SUBSCRIPTION */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 border border-slate-200 dark:border-slate-800 bg-card shadow-2xl">
          <DialogHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Plus className="h-4 w-4 text-primary" />
              <span>Add Recurring Subscription / Utility Bill</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Add any digital subscription, recurring rent, gym membership, or wifi bill in INR (₹)
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddCustom} className="space-y-4 pt-2 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Subscription / Bill Name</Label>
              <Input
                placeholder="e.g. Adobe Creative Cloud, Gym Fee, Rent"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                required
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Amount (₹ INR)</Label>
                <Input
                  type="number"
                  placeholder="e.g. 799"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  min="1"
                  step="any"
                  required
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Billing Frequency</Label>
                <select
                  value={customCycle}
                  onChange={(e) => setCustomCycle(e.target.value as any)}
                  className="w-full h-9 rounded-xl border border-input bg-background px-3 text-xs"
                >
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Category</Label>
                <select
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value as any)}
                  className="w-full h-9 rounded-xl border border-input bg-background px-3 text-xs"
                >
                  <option value="Digital Subscription">Digital Subscription</option>
                  <option value="Utilities & Bills">Utilities & Bills</option>
                  <option value="Housing & Rent">Housing & Rent</option>
                  <option value="Fitness & Memberships">Fitness & Memberships</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Next Renewal Date</Label>
                <Input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsAddDialogOpen(false)}
                className="rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" className="rounded-xl text-xs font-bold">
                Save Subscription
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG 2: UPGRADE PREVIEW MODAL */}
      <Dialog open={isUpgradeModalOpen} onOpenChange={setIsUpgradeModalOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 border border-slate-200 dark:border-slate-800 bg-card shadow-2xl">
          <DialogHeader className="border-b border-slate-100 dark:border-slate-800 pb-3 text-center">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary mx-auto flex items-center justify-center mb-2">
              <CreditCard className="h-6 w-6" />
            </div>
            <DialogTitle className="text-lg font-black">
              {selectedPlanTier === "pro" ? "Upgrade to SplitLedger AI Pro" : "SplitLedger Enterprise License"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Activate unlimited AI intelligence, automated OCR, and priority ledger syncing.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2 text-xs">
            <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 space-y-2">
              <div className="flex items-center justify-between font-bold">
                <span>Selected Plan:</span>
                <span className="text-primary capitalize">{selectedPlanTier} ({billingPeriod})</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Billed Total:</span>
                <span className="font-mono font-black text-sm text-slate-900 dark:text-slate-100">
                  {selectedPlanTier === "pro"
                    ? billingPeriod === "annual"
                      ? "₹4,788 / year"
                      : "₹499 / month"
                    : billingPeriod === "annual"
                    ? "₹14,388 / year"
                    : "₹1,499 / month"}
                </span>
              </div>
            </div>

            <div className="space-y-1.5 text-slate-500">
              <p className="flex items-center gap-1.5 text-[11px]">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                <span>30-day money-back guarantee, cancel anytime without penalties</span>
              </p>
              <p className="flex items-center gap-1.5 text-[11px]">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                <span>Instant activation across all connected devices and ledger accounts</span>
              </p>
            </div>

            <div className="pt-2 flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setIsUpgradeModalOpen(false)}
                className="w-1/2 rounded-xl text-xs font-semibold h-10"
              >
                Close
              </Button>
              <Button
                onClick={() => {
                  toast.success(`Welcome to SplitLedger AI ${selectedPlanTier.toUpperCase()}! Your membership is active.`);
                  setIsUpgradeModalOpen(false);
                }}
                className="w-1/2 rounded-xl text-xs font-bold h-10 bg-primary text-primary-foreground shadow-md"
              >
                Confirm & Activate
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

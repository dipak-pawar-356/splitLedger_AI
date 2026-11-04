"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Repeat,
  Calendar,
  Sparkles,
  RefreshCw,
  Zap,
  Search,
  Filter,
  ShieldCheck,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  PieChart as PieIcon,
  ExternalLink,
  Wallet,
  AlertCircle,
  Plus,
  MoreVertical,
  Edit3,
  Trash2,
  Receipt,
  CreditCard,
  Check,
  Tag,
  Bell,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  getUserSubscriptions,
  saveCustomSubscription,
  deleteCustomSubscription,
  recordSubscriptionPayment,
} from "@/actions/custom-subscriptions";
import {
  UserSubscription,
  advanceDateByBillingCycle,
  computeSubscriptionAmounts,
} from "@/lib/subscriptions/subscription-utils";
import { formatCurrency } from "@/lib/utils";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import Link from "next/link";
import { toast } from "sonner";

const LOCAL_STORAGE_KEY = "split_ledger_custom_subscriptions_v2";

function getLocalSubs(): UserSubscription[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalSubs(subs: UserSubscription[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(subs));
  } catch {}
}

// Compute relative days until payment date
function getRelativePaymentInfo(targetDateStr: string): {
  diffDays: number;
  label: string;
  badgeClass: string;
} {
  try {
    const target = new Date(targetDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);

    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      const absDays = Math.abs(diffDays);
      return {
        diffDays,
        label: `Overdue by ${absDays} day${absDays > 1 ? "s" : ""}`,
        badgeClass: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",
      };
    }
    if (diffDays === 0) {
      return {
        diffDays,
        label: "Due today",
        badgeClass: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 font-bold animate-pulse",
      };
    }
    if (diffDays === 1) {
      return {
        diffDays,
        label: "Due tomorrow",
        badgeClass: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
      };
    }
    return {
      diffDays,
      label: `In ${diffDays} days`,
      badgeClass: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    };
  } catch {
    return {
      diffDays: 0,
      label: "Upcoming",
      badgeClass: "bg-slate-500/10 text-slate-500 border-slate-500/20",
    };
  }
}

// Semantic badge color mapping based on subscription status
function getStatusBadgeStyle(status: string): { className: string; borderGlow: string } {
  switch (status) {
    case "Active":
      return {
        className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
        borderGlow: "from-emerald-500/40 via-teal-500/25 to-emerald-700/35",
      };
    case "Upcoming":
      return {
        className: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
        borderGlow: "from-amber-500/40 via-orange-500/25 to-amber-700/35",
      };
    case "Due Today":
      return {
        className: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30 font-bold",
        borderGlow: "from-orange-500/40 via-amber-500/25 to-orange-700/35",
      };
    case "Paid":
      return {
        className: "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30",
        borderGlow: "from-green-500/40 via-emerald-500/25 to-green-700/35",
      };
    case "Overdue":
      return {
        className: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",
        borderGlow: "from-rose-500/40 via-red-500/25 to-rose-700/35",
      };
    case "Paused":
      return {
        className: "bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30",
        borderGlow: "from-slate-500/40 via-zinc-500/25 to-slate-700/35",
      };
    case "Cancelled":
      return {
        className: "bg-zinc-500/15 text-zinc-500 dark:text-zinc-400 border-zinc-500/30 line-through opacity-70",
        borderGlow: "from-zinc-500/30 via-slate-500/20 to-zinc-700/25",
      };
    case "Trial":
      return {
        className: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30",
        borderGlow: "from-cyan-500/40 via-sky-500/25 to-cyan-700/35",
      };
    default:
      return {
        className: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30",
        borderGlow: "from-purple-500/40 via-violet-500/25 to-purple-700/35",
      };
  }
}

export function AISubscriptionsCard() {
  // ZERO hardcoded sample rows: starts strictly empty
  const [subscriptions, setSubscriptions] = useState<UserSubscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedFrequency, setSelectedFrequency] = useState<string>("all");

  // Modal states
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Add / Edit Form State
  const defaultNextDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split("T")[0];
  }, []);

  const [formData, setFormData] = useState({
    name: "",
    merchant: "",
    category: "Entertainment",
    amount: "",
    billingCycle: "monthly" as "monthly" | "weekly" | "quarterly" | "yearly" | "custom",
    startDate: new Date().toISOString().split("T")[0],
    nextBillingDate: defaultNextDate,
    paymentMethod: "UPI",
    autoRenewal: true,
    reminderDays: 3,
    status: "Active" as "Active" | "Upcoming" | "Due Today" | "Paid" | "Overdue" | "Paused" | "Cancelled" | "Trial",
    description: "",
  });

  // Action Dialogs: Add Related Transaction & Delete Confirmation
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);
  const [activeSubForTxn, setActiveSubForTxn] = useState<UserSubscription | null>(null);
  const [txnFormData, setTxnFormData] = useState({
    title: "",
    description: "",
    amount: "",
    categoryName: "Entertainment",
    paymentMethod: "UPI",
    date: new Date().toISOString().split("T")[0],
    notes: "",
  });
  const [isLoggingTxn, setIsLoggingTxn] = useState(false);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [subToDelete, setSubToDelete] = useState<UserSubscription | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const shouldReduceMotion = useReducedMotion();

  // Load subscriptions: combines user preferences and verified algorithmic detections
  const loadSubscriptions = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Try local cache first for instant responsive feel
      const local = getLocalSubs();
      if (local && local.length > 0) {
        setSubscriptions(local);
      }

      // 2. Fetch from database user preferences and verified transaction detections
      const result = await getUserSubscriptions();
      const combinedMap = new Map<string, UserSubscription>();

      // Algorithmic detections from real transactions
      for (const sub of result.detectedSubscriptions) {
        combinedMap.set(sub.id, sub);
      }

      // Custom subscriptions created by the user (override or add)
      for (const sub of result.customSubscriptions) {
        combinedMap.set(sub.id, sub);
      }

      const combinedList = Array.from(combinedMap.values());
      setSubscriptions(combinedList);
      saveLocalSubs(combinedList);
    } catch (e) {
      console.error("Failed to load user subscriptions:", e);
      // Fallback to local storage
      const fallback = getLocalSubs();
      setSubscriptions(fallback);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSubscriptions();
  }, [loadSubscriptions]);

  // Derived filter logic
  const filteredSubscriptions = useMemo(() => {
    return subscriptions.filter((sub) => {
      const matchesSearch =
        searchQuery.trim() === "" ||
        sub.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sub.merchant.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        selectedCategory === "all" || sub.category === selectedCategory;

      const matchesStatus =
        selectedStatus === "all" || sub.status.toLowerCase() === selectedStatus.toLowerCase();

      const matchesFrequency =
        selectedFrequency === "all" || sub.billingCycle === selectedFrequency;

      return matchesSearch && matchesCategory && matchesStatus && matchesFrequency;
    });
  }, [subscriptions, searchQuery, selectedCategory, selectedStatus, selectedFrequency]);

  // Derived 8 Mathematical Enterprise Metrics
  const activeSubs = subscriptions.filter(
    (s) => s.status !== "Cancelled" && s.status !== "Paused"
  );
  const totalMonthlyCost = activeSubs.reduce((sum, s) => sum + s.monthlyAmount, 0);
  const annualRunRate = activeSubs.reduce((sum, s) => sum + s.annualizedCost, 0);
  const averageSubCost =
    activeSubs.length > 0 ? Math.round(totalMonthlyCost / activeSubs.length) : 0;

  // Highest and Lowest recurring subscriptions
  const sortedByMonthly = [...activeSubs].sort((a, b) => b.monthlyAmount - a.monthlyAmount);
  const highestSub = sortedByMonthly.length > 0 ? sortedByMonthly[0] : null;
  const lowestSub = sortedByMonthly.length > 0 ? sortedByMonthly[sortedByMonthly.length - 1] : null;

  // Upcoming payments in the next 30 days
  const now = new Date();
  const next30DaysPayments = subscriptions.filter((sub) => {
    try {
      const nextDate = new Date(sub.nextBillingDate).getTime();
      const diffDays = Math.ceil((nextDate - now.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 30 && sub.status !== "Cancelled";
    } catch {
      return false;
    }
  });
  const upcoming30DaysCost = next30DaysPayments.reduce((sum, s) => sum + s.amount, 0);

  // Potential savings: 16% annual billing switch estimate on eligible services
  const potentialSavingsMonthly = subscriptions.reduce((sum, s) => {
    if (
      s.status !== "Cancelled" &&
      (s.category === "Entertainment" || s.category === "Software / AI" || s.category === "Cloud Services") &&
      s.billingCycle === "monthly"
    ) {
      return sum + Math.round(s.monthlyAmount * 0.16);
    }
    return sum;
  }, 0);

  // Category breakdown for distribution chart
  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, { count: number; totalMonthly: number }>();
    for (const sub of activeSubs) {
      const existing = map.get(sub.category) || { count: 0, totalMonthly: 0 };
      existing.count += 1;
      existing.totalMonthly += sub.monthlyAmount;
      map.set(sub.category, existing);
    }
    return Array.from(map.entries()).map(([cat, val]) => ({
      category: cat,
      count: val.count,
      totalMonthly: val.totalMonthly,
      percentage: totalMonthlyCost > 0 ? Math.round((val.totalMonthly / totalMonthlyCost) * 100) : 0,
    }));
  }, [activeSubs, totalMonthlyCost]);

  // Upcoming timeline groups
  const timelineGroups = useMemo(() => {
    const currentTime = Date.now();
    const groups: {
      today: UserSubscription[];
      thisWeek: UserSubscription[];
      nextMonth: UserSubscription[];
      later: UserSubscription[];
    } = {
      today: [],
      thisWeek: [],
      nextMonth: [],
      later: [],
    };

    for (const sub of subscriptions) {
      if (sub.status === "Cancelled") continue;
      try {
        const nextTime = new Date(sub.nextBillingDate).getTime();
        const diffDays = Math.ceil((nextTime - currentTime) / (1000 * 60 * 60 * 24));
        if (diffDays <= 0) groups.today.push(sub);
        else if (diffDays <= 7) groups.thisWeek.push(sub);
        else if (diffDays <= 30) groups.nextMonth.push(sub);
        else groups.later.push(sub);
      } catch {
        groups.later.push(sub);
      }
    }
    return groups;
  }, [subscriptions]);

  // Open modal in Create mode
  const handleOpenAddModal = () => {
    setEditingSubId(null);
    const d = new Date();
    d.setDate(d.getDate() + 30);
    setFormData({
      name: "",
      merchant: "",
      category: "Entertainment",
      amount: "",
      billingCycle: "monthly",
      startDate: new Date().toISOString().split("T")[0],
      nextBillingDate: d.toISOString().split("T")[0],
      paymentMethod: "UPI",
      autoRenewal: true,
      reminderDays: 3,
      status: "Active",
      description: "",
    });
    setIsAddEditOpen(true);
  };

  // Open modal in Edit mode
  const handleOpenEditModal = (sub: UserSubscription) => {
    setEditingSubId(sub.id);
    setFormData({
      name: sub.name,
      merchant: sub.merchant,
      category: sub.category,
      amount: sub.amount.toString(),
      billingCycle: sub.billingCycle,
      startDate: sub.startDate || new Date().toISOString().split("T")[0],
      nextBillingDate: sub.nextBillingDate,
      paymentMethod: sub.paymentMethod,
      autoRenewal: sub.autoRenewal ?? true,
      reminderDays: sub.reminderDays ?? 3,
      status: sub.status,
      description: sub.description || "",
    });
    setIsAddEditOpen(true);
  };

  // Save subscription (Create or Edit)
  const handleSaveSubscription = async () => {
    const amt = parseFloat(formData.amount);
    if (!formData.name.trim()) {
      toast.error("Please enter a subscription name");
      return;
    }
    if (isNaN(amt) || amt <= 0) {
      toast.error("Please enter a valid amount greater than 0");
      return;
    }
    if (!formData.nextBillingDate) {
      toast.error("Please select the next billing date");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        id: editingSubId || undefined,
        name: formData.name.trim(),
        merchant: formData.merchant.trim() || formData.name.trim(),
        category: formData.category,
        amount: Math.round(amt),
        billingCycle: formData.billingCycle,
        startDate: formData.startDate,
        nextBillingDate: formData.nextBillingDate,
        paymentMethod: formData.paymentMethod,
        autoRenewal: formData.autoRenewal,
        reminderDays: Number(formData.reminderDays) || 3,
        status: formData.status,
        description: formData.description.trim() || undefined,
      };

      const res = await saveCustomSubscription(payload);
      if (res.success && res.subscription) {
        // Optimistic UI state update
        setSubscriptions((prev) => {
          let updated: UserSubscription[];
          if (editingSubId) {
            updated = prev.map((s) => (s.id === editingSubId ? res.subscription! : s));
          } else {
            updated = [res.subscription!, ...prev];
          }
          saveLocalSubs(updated);
          return updated;
        });

        toast.success(
          editingSubId
            ? `Updated "${res.subscription.name}" successfully!`
            : `Tracked "${res.subscription.name}" in subscriptions portfolio!`
        );
        setIsAddEditOpen(false);
      } else {
        toast.error(res.error || "Failed to save subscription");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save subscription");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Delete Confirmation
  const handleOpenDelete = (sub: UserSubscription) => {
    setSubToDelete(sub);
    setDeleteConfirmOpen(true);
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!subToDelete) return;
    setIsDeleting(true);
    try {
      const res = await deleteCustomSubscription(subToDelete.id);
      if (res.success) {
        setSubscriptions((prev) => {
          const updated = prev.filter((s) => s.id !== subToDelete.id);
          saveLocalSubs(updated);
          return updated;
        });
        toast.success(`Removed "${subToDelete.name}" from subscriptions.`);
        setDeleteConfirmOpen(false);
        setSubToDelete(null);
      } else {
        toast.error(res.error || "Failed to delete subscription");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to delete subscription");
    } finally {
      setIsDeleting(false);
    }
  };

  // Open "Add Related Transaction" Dialog
  const handleOpenTransactionDialog = (sub: UserSubscription) => {
    setActiveSubForTxn(sub);
    setTxnFormData({
      title: sub.name,
      description: `Subscription renewal: ${sub.merchant} (${sub.billingCycle})`,
      amount: sub.amount.toString(),
      categoryName: sub.category,
      paymentMethod: sub.paymentMethod || "UPI",
      date: new Date().toISOString().split("T")[0],
      notes: sub.description || "",
    });
    setTransactionDialogOpen(true);
  };

  // Confirm and Log Transaction
  const handleConfirmTransaction = async () => {
    if (!activeSubForTxn) return;
    const amt = parseFloat(txnFormData.amount);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Please enter a valid transaction amount");
      return;
    }
    if (!txnFormData.title.trim()) {
      toast.error("Please enter a transaction title");
      return;
    }

    setIsLoggingTxn(true);
    try {
      const res = await recordSubscriptionPayment(activeSubForTxn.id, {
        title: txnFormData.title.trim(),
        description: txnFormData.description.trim() || `Subscription renewal: ${txnFormData.title}`,
        amount: Math.round(amt),
        categoryName: txnFormData.categoryName,
        paymentMethod: txnFormData.paymentMethod,
        date: txnFormData.date,
        notes: txnFormData.notes.trim() || undefined,
      });

      if (res.success && res.updatedSubscription) {
        // Update subscription state with new payment date and status
        setSubscriptions((prev) => {
          const updated = prev.map((s) =>
            s.id === activeSubForTxn.id ? res.updatedSubscription! : s
          );
          saveLocalSubs(updated);
          return updated;
        });

        toast.success(
          `Logged ₹${amt.toLocaleString("en-IN")} renewal for ${activeSubForTxn.name} to ledger!`
        );
        setTransactionDialogOpen(false);
        setActiveSubForTxn(null);
      } else {
        toast.error(res.error || "Failed to record transaction");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to record transaction");
    } finally {
      setIsLoggingTxn(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. MASTER SUBSCRIPTION CONTROL HEADER */}
      <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs bg-card overflow-hidden ai-glass-surface ai-border-subscriptions p-[1px]">
        <div className="bg-card/95 rounded-[23px] overflow-hidden">
          <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/40">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/20 shadow-xs shrink-0 ai-icon-container">
                  <Repeat className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <CardTitle className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 ai-card-title">
                      Recurring Subscriptions & Utility Calendar
                    </CardTitle>
                    <Badge
                      variant="outline"
                      className="text-[10px] text-purple-600 border-purple-300 dark:border-purple-800 bg-purple-500/5 font-bold"
                    >
                      Ledger-Verified Detection
                    </Badge>
                  </div>
                  <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Real-time pattern analysis across approved expenses, recurring utility bills, EMIs, and subscriptions
                  </CardDescription>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 px-3.5 rounded-xl text-xs font-bold gap-1.5 hover:border-purple-500/40 ai-btn-premium"
                  onClick={loadSubscriptions}
                  disabled={isLoading}
                  aria-label="Rescan transaction history for recurring bills"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin text-purple-600" : ""}`} />
                  <span>{isLoading ? "Scanning..." : "Rescan History"}</span>
                </Button>

                <Button
                  type="button"
                  size="sm"
                  className="h-9 px-3.5 rounded-xl text-xs font-bold gap-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-xs ai-btn-premium"
                  onClick={handleOpenAddModal}
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Subscription</span>
                </Button>
              </div>
            </div>
          </CardHeader>
        </div>
      </Card>

      {/* 2. TOP SUMMARY METRIC CARDS (8 LIVE ENTERPRISE CARDS) */}
      <motion.div
        variants={
          shouldReduceMotion
            ? undefined
            : {
                hidden: { opacity: 0 },
                show: { opacity: 1, transition: { staggerChildren: 0.03 } },
              }
        }
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {/* Card 1: Active Subscriptions */}
        <motion.div
          variants={
            shouldReduceMotion
              ? undefined
              : {
                  hidden: { opacity: 0, y: 14 },
                  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
                }
          }
          whileHover={
            shouldReduceMotion
              ? undefined
              : { y: -6, scale: 1.015, transition: { duration: 0.2, ease: "easeOut" } }
          }
        >
          <Card className="relative overflow-hidden h-full rounded-2xl border border-purple-500/20 bg-card p-4 space-y-2 shadow-2xs active:scale-[0.98] transition-all duration-200 cursor-pointer group ai-glass-surface ai-card-hover">
            <div className="fin-border-gradient bg-gradient-to-br from-purple-500/40 via-violet-500/25 to-purple-700/35 opacity-70 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10 flex items-center justify-between text-xs">
              <span className="font-bold uppercase tracking-wider text-[10px] text-purple-800 dark:text-purple-300 ai-card-title">
                Active Subscriptions
              </span>
              <div className="p-1.5 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/20 shadow-xs ai-icon-container">
                <Repeat className="h-4 w-4" />
              </div>
            </div>
            <div className="relative z-10 text-2xl font-black text-purple-600 dark:text-purple-400 font-mono tabular-nums ai-number-val">
              <AnimatedCounter value={activeSubs.length} duration={0.5} />
            </div>
            <div className="relative z-10 flex items-center justify-between text-[11px] text-slate-400 border-t border-purple-500/15 pt-1.5">
              <span>Verified Commitments</span>
              <span className="font-bold text-purple-600 dark:text-purple-400">
                {subscriptions.length} tracked total
              </span>
            </div>
          </Card>
        </motion.div>

        {/* Card 2: Monthly Subscription Cost */}
        <motion.div
          variants={
            shouldReduceMotion
              ? undefined
              : {
                  hidden: { opacity: 0, y: 14 },
                  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
                }
          }
          whileHover={
            shouldReduceMotion
              ? undefined
              : { y: -6, scale: 1.015, transition: { duration: 0.2, ease: "easeOut" } }
          }
        >
          <Card className="relative overflow-hidden h-full rounded-2xl border border-rose-500/20 bg-card p-4 space-y-2 shadow-2xs active:scale-[0.98] transition-all duration-200 cursor-pointer group ai-glass-surface ai-card-hover">
            <div className="fin-border-gradient bg-gradient-to-br from-rose-500/40 via-red-500/25 to-rose-700/35 opacity-70 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10 flex items-center justify-between text-xs">
              <span className="font-bold uppercase tracking-wider text-[10px] text-rose-800 dark:text-rose-300 ai-card-title">
                Monthly Subscription Cost
              </span>
              <div className="p-1.5 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20 shadow-xs ai-icon-container">
                <Calendar className="h-4 w-4" />
              </div>
            </div>
            <div className="relative z-10 text-2xl font-black text-rose-600 dark:text-rose-400 font-mono tabular-nums ai-number-val">
              <AnimatedCounter value={formatCurrency(totalMonthlyCost, "INR")} duration={0.5} />
            </div>
            <div className="relative z-10 flex items-center justify-between text-[11px] text-slate-400 border-t border-rose-500/15 pt-1.5">
              <span>Calculated Outflow</span>
              <span className="font-bold text-rose-600 dark:text-rose-400">Monthly recurring</span>
            </div>
          </Card>
        </motion.div>

        {/* Card 3: Annual Projected Cost */}
        <motion.div
          variants={
            shouldReduceMotion
              ? undefined
              : {
                  hidden: { opacity: 0, y: 14 },
                  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
                }
          }
          whileHover={
            shouldReduceMotion
              ? undefined
              : { y: -6, scale: 1.015, transition: { duration: 0.2, ease: "easeOut" } }
          }
        >
          <Card className="relative overflow-hidden h-full rounded-2xl border border-indigo-500/20 bg-card p-4 space-y-2 shadow-2xs active:scale-[0.98] transition-all duration-200 cursor-pointer group ai-glass-surface ai-card-hover">
            <div className="fin-border-gradient bg-gradient-to-br from-indigo-500/40 via-blue-500/25 to-indigo-700/35 opacity-70 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10 flex items-center justify-between text-xs">
              <span className="font-bold uppercase tracking-wider text-[10px] text-indigo-800 dark:text-indigo-300 ai-card-title">
                Annual Projected Cost
              </span>
              <div className="p-1.5 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shadow-xs ai-icon-container">
                <Zap className="h-4 w-4" />
              </div>
            </div>
            <div className="relative z-10 text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono tabular-nums ai-number-val">
              <AnimatedCounter value={formatCurrency(annualRunRate, "INR")} duration={0.5} />
            </div>
            <div className="relative z-10 flex items-center justify-between text-[11px] text-slate-400 border-t border-indigo-500/15 pt-1.5">
              <span>12-Month Projected Drain</span>
              <span className="font-bold text-indigo-600 dark:text-indigo-400">Prorated Pace</span>
            </div>
          </Card>
        </motion.div>

        {/* Card 4: Upcoming Payments (Next 30 Days) */}
        <motion.div
          variants={
            shouldReduceMotion
              ? undefined
              : {
                  hidden: { opacity: 0, y: 14 },
                  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
                }
          }
          whileHover={
            shouldReduceMotion
              ? undefined
              : { y: -6, scale: 1.015, transition: { duration: 0.2, ease: "easeOut" } }
          }
        >
          <Card className="relative overflow-hidden h-full rounded-2xl border border-amber-500/20 bg-card p-4 space-y-2 shadow-2xs active:scale-[0.98] transition-all duration-200 cursor-pointer group ai-glass-surface ai-card-hover">
            <div className="fin-border-gradient bg-gradient-to-br from-amber-500/40 via-orange-500/25 to-amber-700/35 opacity-70 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10 flex items-center justify-between text-xs">
              <span className="font-bold uppercase tracking-wider text-[10px] text-amber-800 dark:text-amber-300 ai-card-title">
                Upcoming (Next 30 Days)
              </span>
              <div className="p-1.5 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20 shadow-xs ai-icon-container">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <div className="relative z-10 text-2xl font-black text-amber-600 dark:text-amber-400 font-mono tabular-nums ai-number-val">
              <AnimatedCounter value={formatCurrency(upcoming30DaysCost, "INR")} duration={0.5} />
            </div>
            <div className="relative z-10 flex items-center justify-between text-[11px] text-slate-400 border-t border-amber-500/15 pt-1.5">
              <span>Due within 30 days</span>
              <span className="font-bold text-amber-600 dark:text-amber-400">
                {next30DaysPayments.length} bills pending
              </span>
            </div>
          </Card>
        </motion.div>

        {/* Card 5: Average Subscription Cost */}
        <motion.div
          variants={
            shouldReduceMotion
              ? undefined
              : {
                  hidden: { opacity: 0, y: 14 },
                  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
                }
          }
          whileHover={
            shouldReduceMotion
              ? undefined
              : { y: -6, scale: 1.015, transition: { duration: 0.2, ease: "easeOut" } }
          }
        >
          <Card className="relative overflow-hidden h-full rounded-2xl border border-emerald-500/20 bg-card p-4 space-y-2 shadow-2xs active:scale-[0.98] transition-all duration-200 cursor-pointer group ai-glass-surface ai-card-hover">
            <div className="fin-border-gradient bg-gradient-to-br from-emerald-500/40 via-teal-500/25 to-emerald-700/35 opacity-70 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10 flex items-center justify-between text-xs">
              <span className="font-bold uppercase tracking-wider text-[10px] text-emerald-800 dark:text-emerald-300 ai-card-title">
                Average Subscription Cost
              </span>
              <div className="p-1.5 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-xs ai-icon-container">
                <ShieldCheck className="h-4 w-4" />
              </div>
            </div>
            <div className="relative z-10 text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono tabular-nums ai-number-val">
              <AnimatedCounter value={formatCurrency(averageSubCost, "INR")} duration={0.5} />
            </div>
            <div className="relative z-10 flex items-center justify-between text-[11px] text-slate-400 border-t border-emerald-500/15 pt-1.5">
              <span>Mean Recurring Cost</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">per service</span>
            </div>
          </Card>
        </motion.div>

        {/* Card 6: Highest Subscription */}
        <motion.div
          variants={
            shouldReduceMotion
              ? undefined
              : {
                  hidden: { opacity: 0, y: 14 },
                  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
                }
          }
          whileHover={
            shouldReduceMotion
              ? undefined
              : { y: -6, scale: 1.015, transition: { duration: 0.2, ease: "easeOut" } }
          }
        >
          <Card className="relative overflow-hidden h-full rounded-2xl border border-blue-500/20 bg-card p-4 space-y-2 shadow-2xs active:scale-[0.98] transition-all duration-200 cursor-pointer group ai-glass-surface ai-card-hover">
            <div className="fin-border-gradient bg-gradient-to-br from-blue-500/40 via-indigo-500/25 to-blue-700/35 opacity-50 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10 flex items-center justify-between text-xs">
              <span className="font-bold uppercase tracking-wider text-[10px] text-blue-800 dark:text-blue-300 ai-card-title">
                Highest Subscription
              </span>
              <div className="p-1.5 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20 shadow-xs ai-icon-container">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <div className="relative z-10">
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                {highestSub ? highestSub.name : "None tracked"}
              </p>
              <p className="text-xl font-black text-slate-900 dark:text-slate-100 font-mono tabular-nums mt-0.5 ai-number-val">
                {highestSub ? formatCurrency(highestSub.monthlyAmount, "INR") : "₹0.00"}
              </p>
            </div>
            <div className="relative z-10 flex items-center justify-between text-[11px] text-slate-400 border-t border-blue-500/15 pt-1.5">
              <span>Peak commitment</span>
              <span className="font-bold text-slate-600 dark:text-slate-300">
                {highestSub ? highestSub.category : "—"}
              </span>
            </div>
          </Card>
        </motion.div>

        {/* Card 7: Lowest Subscription */}
        <motion.div
          variants={
            shouldReduceMotion
              ? undefined
              : {
                  hidden: { opacity: 0, y: 14 },
                  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
                }
          }
          whileHover={
            shouldReduceMotion
              ? undefined
              : { y: -6, scale: 1.015, transition: { duration: 0.2, ease: "easeOut" } }
          }
        >
          <Card className="relative overflow-hidden h-full rounded-2xl border border-teal-500/20 bg-card p-4 space-y-2 shadow-2xs active:scale-[0.98] transition-all duration-200 cursor-pointer group ai-glass-surface ai-card-hover">
            <div className="fin-border-gradient bg-gradient-to-br from-teal-500/40 via-emerald-500/25 to-teal-700/35 opacity-50 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10 flex items-center justify-between text-xs">
              <span className="font-bold uppercase tracking-wider text-[10px] text-teal-800 dark:text-teal-300 ai-card-title">
                Lowest Subscription
              </span>
              <div className="p-1.5 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/20 shadow-xs ai-icon-container">
                <TrendingDown className="h-4 w-4" />
              </div>
            </div>
            <div className="relative z-10">
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                {lowestSub ? lowestSub.name : "None tracked"}
              </p>
              <p className="text-xl font-black text-slate-900 dark:text-slate-100 font-mono tabular-nums mt-0.5 ai-number-val">
                {lowestSub ? formatCurrency(lowestSub.monthlyAmount, "INR") : "₹0.00"}
              </p>
            </div>
            <div className="relative z-10 flex items-center justify-between text-[11px] text-slate-400 border-t border-teal-500/15 pt-1.5">
              <span>Base commitment</span>
              <span className="font-bold text-slate-600 dark:text-slate-300">
                {lowestSub ? lowestSub.category : "—"}
              </span>
            </div>
          </Card>
        </motion.div>

        {/* Card 8: Potential Savings */}
        <motion.div
          variants={
            shouldReduceMotion
              ? undefined
              : {
                  hidden: { opacity: 0, y: 14 },
                  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
                }
          }
          whileHover={
            shouldReduceMotion
              ? undefined
              : { y: -6, scale: 1.015, transition: { duration: 0.2, ease: "easeOut" } }
          }
        >
          <Card className="relative overflow-hidden h-full rounded-2xl border border-emerald-500/20 bg-card p-4 space-y-2 shadow-2xs active:scale-[0.98] transition-all duration-200 cursor-pointer group ai-glass-surface ai-card-hover">
            <div className="fin-border-gradient bg-gradient-to-br from-emerald-500/40 via-teal-500/25 to-emerald-700/35 opacity-70 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10 flex items-center justify-between text-xs">
              <span className="font-bold uppercase tracking-wider text-[10px] text-emerald-800 dark:text-emerald-300 ai-card-title">
                Potential Savings
              </span>
              <div className="p-1.5 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-xs ai-icon-container">
                <Sparkles className="h-4 w-4" />
              </div>
            </div>
            <div className="relative z-10 text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono tabular-nums ai-number-val">
              <AnimatedCounter value={formatCurrency(potentialSavingsMonthly, "INR")} duration={0.5} />
            </div>
            <div className="relative z-10 flex items-center justify-between text-[11px] text-slate-400 border-t border-emerald-500/15 pt-1.5">
              <span>Optimization Room</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {potentialSavingsMonthly > 0 ? "Annual Switch Feasible" : "Optimized"}
              </span>
            </div>
          </Card>
        </motion.div>
      </motion.div>

      {/* 3. PREMIUM EMPTY STATE OR RESPONSIVE CARDS GRID */}
      {subscriptions.length === 0 && !isLoading ? (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-card shadow-xs overflow-hidden ai-glass-surface">
            <CardContent className="p-10 sm:p-16 text-center max-w-xl mx-auto space-y-6">
              <div className="relative mx-auto w-24 h-24 rounded-3xl bg-gradient-to-br from-purple-500/15 via-indigo-500/15 to-blue-500/15 border border-purple-500/30 flex items-center justify-center shadow-lg group">
                <Repeat className="h-12 w-12 text-purple-600 dark:text-purple-400 animate-pulse" />
              </div>

              <div className="space-y-2.5">
                <Badge
                  variant="outline"
                  className="text-xs font-bold text-purple-600 border-purple-300 dark:border-purple-800 bg-purple-500/5 uppercase tracking-wider"
                >
                  Dynamic Ledger Intelligence
                </Badge>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                  No Subscriptions Added Yet
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-sans max-w-md mx-auto">
                  Add your recurring subscriptions to monitor payments, billing cycles and upcoming expenses.
                  Zero placeholder data or sample rows are generated.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <Button
                  onClick={handleOpenAddModal}
                  className="rounded-xl text-xs font-bold gap-2 h-10 px-5 w-full sm:w-auto shadow-sm bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white ai-btn-premium"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Subscription</span>
                </Button>

                <Button
                  variant="outline"
                  onClick={loadSubscriptions}
                  disabled={isLoading}
                  className="rounded-xl text-xs font-bold gap-2 h-10 px-5 w-full sm:w-auto border-slate-200 dark:border-slate-800 hover:border-purple-500/40"
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin text-purple-600" : ""}`} />
                  <span>Scan Transaction History</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <>
          {/* SEARCH, REAL-TIME FILTERS & HEADER */}
          <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs bg-card overflow-hidden">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Repeat className="h-4 w-4 text-primary" />
                    <span>Active Recurring Subscriptions ({filteredSubscriptions.length})</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Individual portfolio cards with one-click payment logging, real-time schedule tracking, and action menus
                  </CardDescription>
                </div>

                {/* Search Bar */}
                <div className="relative w-full sm:w-64">
                  <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Search merchant or service..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8 pl-8 text-xs rounded-xl"
                  />
                </div>
              </div>

              {/* Filter Chips */}
              <div className="flex items-center gap-2 pt-2 overflow-x-auto no-scrollbar text-xs">
                {/* Category Filter */}
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="h-7 rounded-lg border border-input bg-background px-2 text-[11px] font-semibold"
                >
                  <option value="all">All Categories</option>
                  <option value="Entertainment">Entertainment</option>
                  <option value="Software / AI">Software / AI</option>
                  <option value="Cloud Services">Cloud Services</option>
                  <option value="Internet & Wifi">Internet & Wifi</option>
                  <option value="Utilities & Power">Utilities & Power</option>
                  <option value="Fitness & Gym">Fitness & Gym</option>
                  <option value="Housing & Rent">Housing & Rent</option>
                  <option value="Insurance">Insurance</option>
                  <option value="EMI & Loans">EMI & Loans</option>
                  <option value="Other">Other</option>
                </select>

                {/* Status Filter */}
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="h-7 rounded-lg border border-input bg-background px-2 text-[11px] font-semibold"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="due today">Due Today</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                  <option value="paused">Paused</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="trial">Trial</option>
                </select>

                {/* Frequency Filter */}
                <select
                  value={selectedFrequency}
                  onChange={(e) => setSelectedFrequency(e.target.value)}
                  className="h-7 rounded-lg border border-input bg-background px-2 text-[11px] font-semibold"
                >
                  <option value="all">All Frequencies</option>
                  <option value="monthly">Monthly</option>
                  <option value="weekly">Weekly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                  <option value="custom">Custom</option>
                </select>

                {(searchQuery || selectedCategory !== "all" || selectedStatus !== "all" || selectedFrequency !== "all") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-[10px] text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedCategory("all");
                      setSelectedStatus("all");
                      setSelectedFrequency("all");
                    }}
                  >
                    Reset Filters
                  </Button>
                )}
              </div>
            </CardHeader>

            {/* 4. INDIVIDUAL SUBSCRIPTION CARDS GRID (REPLACES FLAT TABLE) */}
            <CardContent className="p-4 sm:p-6">
              {filteredSubscriptions.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    No subscriptions match your search filters
                  </p>
                  <p className="text-xs text-slate-400">
                    Try adjusting your search query, status, or category filters.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4.5">
                  <AnimatePresence mode="popLayout">
                    {filteredSubscriptions.map((sub) => {
                      const relInfo = getRelativePaymentInfo(sub.nextBillingDate);
                      const statusStyle = getStatusBadgeStyle(sub.status);

                      return (
                        <motion.div
                          key={sub.id}
                          layout
                          initial={{ opacity: 0, scale: 0.96 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.96 }}
                          transition={{ duration: 0.25 }}
                          whileHover={
                            shouldReduceMotion
                              ? undefined
                              : { y: -5, scale: 1.015, transition: { duration: 0.2, ease: "easeOut" } }
                          }
                          className="relative"
                        >
                          <Card className="relative overflow-hidden h-full rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-card p-4 space-y-3 shadow-xs hover:shadow-md transition-all duration-200 group ai-glass-surface ai-card-hover flex flex-col justify-between">
                            {/* Ambient dynamic gradient border glow */}
                            <div
                              className={`fin-border-gradient bg-gradient-to-br ${statusStyle.borderGlow} opacity-30 group-hover:opacity-100 transition-opacity`}
                            />

                            <div className="relative z-10 space-y-3">
                              {/* Header: Name, Merchant, Status badge, and Three-Dot Menu */}
                              <div className="flex items-start justify-between gap-2">
                                <div className="space-y-1 min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
                                      {sub.name}
                                    </h3>
                                  </div>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                    {sub.merchant}
                                  </p>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  {/* Status badge */}
                                  <Badge className={`text-[10px] py-0 px-2 font-bold ${statusStyle.className}`}>
                                    {sub.status}
                                  </Badge>

                                  {/* Three-Dot Menu */}
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                                        onClick={(e) => e.stopPropagation()}
                                        aria-label="Subscription actions"
                                      >
                                        <MoreVertical className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent
                                      align="end"
                                      className="w-48 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 text-xs"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <DropdownMenuItem
                                        onClick={() => handleOpenTransactionDialog(sub)}
                                        className="gap-2 cursor-pointer text-slate-700 dark:text-slate-300 font-medium"
                                      >
                                        <Receipt className="h-3.5 w-3.5 text-emerald-500" />
                                        <span>Add Related Transaction</span>
                                      </DropdownMenuItem>

                                      <DropdownMenuItem
                                        onClick={() => handleOpenEditModal(sub)}
                                        className="gap-2 cursor-pointer text-slate-700 dark:text-slate-300 font-medium"
                                      >
                                        <Edit3 className="h-3.5 w-3.5 text-blue-500" />
                                        <span>Edit Subscription</span>
                                      </DropdownMenuItem>

                                      <DropdownMenuSeparator />

                                      <DropdownMenuItem
                                        onClick={() => handleOpenDelete(sub)}
                                        className="gap-2 cursor-pointer text-rose-600 dark:text-rose-400 font-medium focus:text-rose-600 focus:bg-rose-500/10"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                        <span>Delete Subscription</span>
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </div>

                              {/* Category and Auto-Renewal badges */}
                              <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                                <Badge variant="outline" className="font-mono text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800">
                                  {sub.category}
                                </Badge>
                                <Badge
                                  variant="secondary"
                                  className={`text-[9px] font-semibold ${
                                    sub.autoRenewal
                                      ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20"
                                      : "bg-slate-500/10 text-slate-500 border border-slate-500/20"
                                  }`}
                                >
                                  {sub.autoRenewal ? "Auto-Renewal ON" : "Manual"}
                                </Badge>
                              </div>

                              {/* Financial Details: Large Amount & Cycle */}
                              <div className="p-3 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80 space-y-1">
                                <div className="flex items-baseline justify-between">
                                  <span className="text-xl font-black font-mono text-slate-900 dark:text-slate-100 tabular-nums">
                                    {formatCurrency(sub.amount, "INR")}
                                  </span>
                                  <span className="text-xs font-semibold text-slate-400 capitalize">
                                    / {sub.billingCycle}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-[10px] text-slate-400">
                                  <span>Equivalent: {formatCurrency(sub.monthlyAmount, "INR")}/mo</span>
                                  <span>{formatCurrency(sub.annualizedCost, "INR")}/yr</span>
                                </div>
                              </div>

                              {/* Dates & Schedule: Next Payment & Last Payment */}
                              <div className="space-y-1.5 text-xs">
                                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                                  <span className="text-[11px] flex items-center gap-1">
                                    <Calendar className="h-3 w-3 text-slate-400" /> Next Payment:
                                  </span>
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-[11px]">
                                      {sub.nextBillingDate}
                                    </span>
                                    <Badge className={`text-[9px] py-0 px-1.5 font-bold ${relInfo.badgeClass}`}>
                                      {relInfo.label}
                                    </Badge>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800/60 pt-1.5">
                                  <span>Last Payment:</span>
                                  <span className="font-mono text-slate-600 dark:text-slate-300">
                                    {sub.lastPaymentDate ? sub.lastPaymentDate : "No payment recorded yet"}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Card Footer: Payment Method & Quick Actions */}
                            <div className="relative z-10 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 mt-2">
                              <div className="flex items-center gap-1 text-[11px] text-slate-500">
                                <CreditCard className="h-3 w-3 text-slate-400" />
                                <span className="font-medium truncate max-w-[110px]">{sub.paymentMethod}</span>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenTransactionDialog(sub);
                                  }}
                                  className="h-7 px-2.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 rounded-lg border-emerald-500/30 gap-1 active:scale-[0.98]"
                                >
                                  <CheckCircle2 className="h-3 w-3" />
                                  <span>Mark Paid</span>
                                </Button>
                              </div>
                            </div>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 5. UPCOMING PAYMENT TIMELINE & CATEGORY DISTRIBUTION */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Upcoming Payment Timeline */}
            <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs bg-card p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-purple-600" />
                  <CardTitle className="text-sm font-bold">Upcoming Payment Timeline</CardTitle>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono">
                  Chronological
                </Badge>
              </div>

              <div className="space-y-3 text-xs">
                {timelineGroups.today.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> Due Today / Overdue
                    </span>
                    {timelineGroups.today.map((s) => (
                      <div
                        key={s.id}
                        className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between"
                      >
                        <div>
                          <span className="font-bold text-rose-800 dark:text-rose-300">{s.name}</span>
                          <p className="text-[10px] text-rose-500 font-mono">Due: {s.nextBillingDate}</p>
                        </div>
                        <span className="font-mono font-bold text-rose-600">
                          {formatCurrency(s.amount, "INR")}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {timelineGroups.thisWeek.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">
                      This Week
                    </span>
                    {timelineGroups.thisWeek.map((s) => (
                      <div
                        key={s.id}
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between"
                      >
                        <div>
                          <p className="font-bold text-slate-900 dark:text-slate-100">{s.name}</p>
                          <span className="text-[10px] text-slate-400 font-mono">
                            Expected: {s.nextBillingDate}
                          </span>
                        </div>
                        <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                          {formatCurrency(s.amount, "INR")}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {timelineGroups.nextMonth.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Next 30 Days
                    </span>
                    {timelineGroups.nextMonth.slice(0, 4).map((s) => (
                      <div
                        key={s.id}
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between"
                      >
                        <div>
                          <p className="font-bold text-slate-900 dark:text-slate-100">{s.name}</p>
                          <span className="text-[10px] text-slate-400 font-mono">
                            Expected: {s.nextBillingDate}
                          </span>
                        </div>
                        <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                          {formatCurrency(s.amount, "INR")}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {timelineGroups.today.length === 0 &&
                  timelineGroups.thisWeek.length === 0 &&
                  timelineGroups.nextMonth.length === 0 && (
                    <p className="text-slate-400 text-center py-4 text-xs">
                      No immediate bills due in the upcoming cycle.
                    </p>
                  )}
              </div>
            </Card>

            {/* Cost Breakdown by Category */}
            <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs bg-card p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <PieIcon className="h-4 w-4 text-indigo-600" />
                  <CardTitle className="text-sm font-bold">Category Distribution Breakdown</CardTitle>
                </div>
                <span className="text-xs font-mono font-bold text-slate-500">
                  {formatCurrency(totalMonthlyCost, "INR")}/mo
                </span>
              </div>

              <div className="space-y-3 text-xs">
                {categoryBreakdown.length > 0 ? (
                  categoryBreakdown.map((cat) => (
                    <div key={cat.category} className="space-y-1">
                      <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                        <span className="font-bold">
                          {cat.category} ({cat.count})
                        </span>
                        <span className="font-mono font-bold">
                          {formatCurrency(cat.totalMonthly, "INR")} ({cat.percentage}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-primary h-full rounded-full transition-all duration-300"
                          style={{ width: `${cat.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-400 text-center py-6 text-xs">
                    No active categorized commitments yet.
                  </p>
                )}
              </div>
            </Card>
          </div>
        </>
      )}

      {/* 6. ADD / EDIT SUBSCRIPTION MODAL */}
      <Dialog open={isAddEditOpen} onOpenChange={setIsAddEditOpen}>
        <DialogContent className="sm:max-w-lg rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl bg-card max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <Repeat className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {editingSubId ? "Edit Subscription" : "Add Subscription"}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  {editingSubId
                    ? "Update recurring terms, billing schedule, and payment details"
                    : "Add recurring software, utility bills, OTT, or memberships to monitor payments"}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 pt-3 text-xs">
            {/* Subscription Name & Merchant */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Subscription Name <span className="text-rose-500">*</span>
                </Label>
                <Input
                  placeholder="e.g. Netflix, AWS, Cult.fit"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  className="rounded-xl h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Merchant / Provider</Label>
                <Input
                  placeholder="e.g. Netflix India, Amazon Web Services"
                  value={formData.merchant}
                  onChange={(e) => setFormData((prev) => ({ ...prev, merchant: e.target.value }))}
                  className="rounded-xl h-9 text-xs"
                />
              </div>
            </div>

            {/* Category & Amount */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Category</Label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                  className="w-full h-9 rounded-xl border border-input bg-background px-3 text-xs font-semibold"
                >
                  <option value="Entertainment">Entertainment</option>
                  <option value="Software / AI">Software / AI</option>
                  <option value="Cloud Services">Cloud Services</option>
                  <option value="Internet & Wifi">Internet & Wifi</option>
                  <option value="Utilities & Power">Utilities & Power</option>
                  <option value="Fitness & Gym">Fitness & Gym</option>
                  <option value="Housing & Rent">Housing & Rent</option>
                  <option value="Insurance">Insurance</option>
                  <option value="EMI & Loans">EMI & Loans</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Cycle Amount (INR ₹) <span className="text-rose-500">*</span>
                </Label>
                <Input
                  type="number"
                  placeholder="e.g. 649"
                  value={formData.amount}
                  onChange={(e) => setFormData((prev) => ({ ...prev, amount: e.target.value }))}
                  className="rounded-xl h-9 text-xs font-mono"
                  min="1"
                />
              </div>
            </div>

            {/* Billing Frequency & Payment Method */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Billing Frequency</Label>
                <select
                  value={formData.billingCycle}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      billingCycle: e.target.value as any,
                    }))
                  }
                  className="w-full h-9 rounded-xl border border-input bg-background px-3 text-xs font-semibold"
                >
                  <option value="monthly">Monthly</option>
                  <option value="weekly">Weekly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Payment Method</Label>
                <select
                  value={formData.paymentMethod}
                  onChange={(e) => setFormData((prev) => ({ ...prev, paymentMethod: e.target.value }))}
                  className="w-full h-9 rounded-xl border border-input bg-background px-3 text-xs font-semibold"
                >
                  <option value="UPI">UPI</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Debit Card">Debit Card</option>
                  <option value="Net Banking">Net Banking</option>
                  <option value="Auto Debit">Auto Debit / Mandate</option>
                  <option value="Cash">Cash</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            {/* Billing Dates: Start Date & Next Payment Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Billing Start Date</Label>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, startDate: e.target.value }))}
                  className="rounded-xl h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Next Payment Date <span className="text-rose-500">*</span>
                </Label>
                <Input
                  type="date"
                  value={formData.nextBillingDate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, nextBillingDate: e.target.value }))}
                  className="rounded-xl h-9 text-xs font-mono"
                />
              </div>
            </div>

            {/* Status & Reminder Days */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Subscription Status</Label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value as any }))}
                  className="w-full h-9 rounded-xl border border-input bg-background px-3 text-xs font-semibold"
                >
                  <option value="Active">Active</option>
                  <option value="Upcoming">Upcoming</option>
                  <option value="Due Today">Due Today</option>
                  <option value="Paid">Paid</option>
                  <option value="Overdue">Overdue</option>
                  <option value="Paused">Paused</option>
                  <option value="Cancelled">Cancelled</option>
                  <option value="Trial">Trial</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Reminder (Days Before)</Label>
                <select
                  value={formData.reminderDays}
                  onChange={(e) => setFormData((prev) => ({ ...prev, reminderDays: Number(e.target.value) }))}
                  className="w-full h-9 rounded-xl border border-input bg-background px-3 text-xs font-semibold"
                >
                  <option value={1}>1 day before renewal</option>
                  <option value={2}>2 days before renewal</option>
                  <option value={3}>3 days before renewal</option>
                  <option value={5}>5 days before renewal</option>
                  <option value={7}>7 days before renewal</option>
                </select>
              </div>
            </div>

            {/* Auto-Renewal Toggle */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Auto-Renewal Enabled
                </span>
                <p className="text-[11px] text-slate-400">
                  Subscription will automatically charge on the next payment date
                </p>
              </div>
              <input
                type="checkbox"
                checked={formData.autoRenewal}
                onChange={(e) => setFormData((prev) => ({ ...prev, autoRenewal: e.target.checked }))}
                className="h-4 w-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
              />
            </div>

            {/* Optional Description */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Notes / Description (Optional)</Label>
              <Input
                placeholder="e.g. 4-screen plan shared with family, renewal via Google Pay"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                className="rounded-xl h-9 text-xs"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="rounded-xl text-xs h-9"
                onClick={() => setIsAddEditOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                className="rounded-xl text-xs h-9 font-bold bg-primary text-primary-foreground shadow-xs px-5 gap-1.5"
                onClick={handleSaveSubscription}
                disabled={isSubmitting}
              >
                {isSubmitting && <RefreshCw className="h-3 w-3 animate-spin" />}
                <span>{editingSubId ? "Save Changes" : "Save Subscription"}</span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 7. ADD RELATED TRANSACTION MODAL */}
      <Dialog open={transactionDialogOpen} onOpenChange={setTransactionDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl bg-card">
          <DialogHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Receipt className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Record Subscription Payment
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Review and record this renewal transaction to your verified ledger
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 pt-3 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Transaction Title</Label>
              <Input
                value={txnFormData.title}
                onChange={(e) => setTxnFormData((prev) => ({ ...prev, title: e.target.value }))}
                className="rounded-xl h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Amount (INR ₹)</Label>
                <Input
                  type="number"
                  value={txnFormData.amount}
                  onChange={(e) => setTxnFormData((prev) => ({ ...prev, amount: e.target.value }))}
                  className="rounded-xl h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Payment Date</Label>
                <Input
                  type="date"
                  value={txnFormData.date}
                  onChange={(e) => setTxnFormData((prev) => ({ ...prev, date: e.target.value }))}
                  className="rounded-xl h-9 text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Category</Label>
                <Input
                  value={txnFormData.categoryName}
                  onChange={(e) => setTxnFormData((prev) => ({ ...prev, categoryName: e.target.value }))}
                  className="rounded-xl h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Payment Method</Label>
                <Input
                  value={txnFormData.paymentMethod}
                  onChange={(e) => setTxnFormData((prev) => ({ ...prev, paymentMethod: e.target.value }))}
                  className="rounded-xl h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Description</Label>
              <Input
                value={txnFormData.description}
                onChange={(e) => setTxnFormData((prev) => ({ ...prev, description: e.target.value }))}
                className="rounded-xl h-9 text-xs"
              />
            </div>

            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-[11px] leading-relaxed">
              Recording this transaction will create a verified ledger entry, update the subscription&apos;s last payment date to{" "}
              <strong>{txnFormData.date}</strong>, mark it as <strong>Paid</strong>, and advance the next billing schedule.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="rounded-xl text-xs h-9"
                onClick={() => setTransactionDialogOpen(false)}
                disabled={isLoggingTxn}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                className="rounded-xl text-xs h-9 font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs px-4 gap-1.5"
                onClick={handleConfirmTransaction}
                disabled={isLoggingTxn}
              >
                {isLoggingTxn && <RefreshCw className="h-3 w-3 animate-spin" />}
                <span>Confirm & Record Transaction</span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 8. DELETE CONFIRMATION MODAL */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl bg-card">
          <DialogHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Delete Subscription
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Confirm permanent removal of this subscription from tracking
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 pt-3 text-xs">
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed font-sans">
              Are you sure you want to delete{" "}
              <strong className="text-slate-900 dark:text-slate-100 font-bold">
                &ldquo;{subToDelete?.name}&rdquo;
              </strong>
              ? This will remove it from your recurring subscriptions tracking. Your historical ledger transactions will not be deleted.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="rounded-xl text-xs h-9"
                onClick={() => setDeleteConfirmOpen(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                className="rounded-xl text-xs h-9 font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-xs px-4 gap-1.5"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting && <RefreshCw className="h-3 w-3 animate-spin" />}
                <span>Delete Subscription</span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

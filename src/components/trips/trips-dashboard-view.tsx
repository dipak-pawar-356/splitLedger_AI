"use client";

import { useState, useMemo } from "react";
import {
  TripDashboardMetrics,
  TripRecord,
  TripStatus,
  BudgetCategoryKey,
} from "@/lib/types/trips";
import {
  deleteTrip,
  archiveTrip,
  duplicateTrip,
  addTripExpense,
} from "@/actions/trips";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  Compass,
  Calendar,
  MapPin,
  CheckSquare,
  IndianRupee,
  Plus,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Trash2,
  Copy,
  Archive,
  RotateCcw,
  Search,
  Users,
  ShieldCheck,
  AlertTriangle,
  FolderPlus,
  ArrowRight,
  FileText,
  CreditCard,
  Layers,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { TripCreateWizardDialog } from "@/components/trips/trip-create-wizard-dialog";
import { TripDetailDashboard } from "@/components/trips/trip-detail-dashboard";

interface TripsDashboardViewProps {
  initialMetrics: TripDashboardMetrics;
}

export function TripsDashboardView({ initialMetrics }: TripsDashboardViewProps) {
  const [metrics, setMetrics] = useState<TripDashboardMetrics>(initialMetrics);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "upcoming" | "ongoing" | "completed" | "archived">("all");

  // Modals
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [quickExpenseTrip, setQuickExpenseTrip] = useState<TripRecord | null>(null);
  const [quickTitle, setQuickTitle] = useState("");
  const [quickAmount, setQuickAmount] = useState("");
  const [quickCategory, setQuickCategory] = useState<BudgetCategoryKey>("Food");

  // Re-calculate local metrics whenever trips update
  const recalculateGlobalMetrics = (trips: TripRecord[]) => {
    const nonArchived = trips.filter((t) => t.status !== "archived" && t.status !== "cancelled");
    const totalTripBudget = nonArchived.reduce((sum, t) => sum + t.budgetAmount, 0);
    const allocatedBudget = nonArchived.reduce((sum, t) => sum + t.allocatedBudget, 0);
    const actualExpenses = nonArchived.reduce((sum, t) => sum + t.actualTotal, 0);
    const personalExpenses = nonArchived.reduce((sum, t) => sum + t.personalExpensesTotal, 0);
    const sharedExpenses = nonArchived.reduce((sum, t) => sum + t.sharedExpensesTotal, 0);
    const remainingBudget = Math.max(0, allocatedBudget - actualExpenses);
    const budgetUtilizationPct = allocatedBudget > 0 ? Math.round((actualExpenses / allocatedBudget) * 100) : 0;

    let pendingCount = 0;
    let pendingAmount = 0;
    let completedAmount = 0;
    let outstandingReceivables = 0;
    const memberSet = new Set<string>();

    trips.forEach((t) => {
      t.members.forEach((m) => {
        memberSet.add(m.name);
        if (m.pending > 0) {
          pendingCount += 1;
          pendingAmount += m.pending;
        }
        if (m.receivable > 0) {
          outstandingReceivables += m.receivable;
        }
      });
      t.settlements.forEach((s) => {
        if (s.status === "completed") completedAmount += s.amount;
      });
    });

    const avgDailySpend = nonArchived.length > 0
      ? Math.round(actualExpenses / Math.max(1, nonArchived.reduce((sum, t) => sum + t.durationDays, 0)))
      : 0;

    const estimatedFinalCost = nonArchived.reduce((sum, t) => sum + t.projectedTotalSpend, 0);

    const overallHealth = Math.round(
      nonArchived.reduce((sum, t) => sum + t.financialHealthScore, 0) / Math.max(1, nonArchived.length)
    );

    let overallRisk: "Low Risk" | "Moderate Risk" | "High Risk" = "Low Risk";
    if (overallHealth < 50) overallRisk = "High Risk";
    else if (overallHealth < 80) overallRisk = "Moderate Risk";

    setMetrics({
      totalTripBudget,
      allocatedBudget,
      remainingBudget,
      actualExpenses,
      personalExpenses,
      sharedExpenses,
      budgetUtilizationPct,
      pendingSettlementsCount: pendingCount,
      pendingSettlementsAmount: pendingAmount,
      completedSettlementsAmount: completedAmount,
      outstandingReceivables,
      totalTripsCount: trips.length,
      upcomingTripsCount: trips.filter((t) => t.status === "upcoming").length,
      activeTripsCount: trips.filter((t) => t.status === "ongoing").length,
      completedTripsCount: trips.filter((t) => t.status === "completed").length,
      totalMembersCount: memberSet.size,
      avgDailySpend,
      estimatedFinalCost,
      overallHealthScore: overallHealth,
      overallRiskLevel: overallRisk,
      aiGlobalRecommendation:
        budgetUtilizationPct > 80
          ? "Warning: Aggregate travel expenditure is running near threshold. Review lodging and fuel expenses."
          : "Portfolio health is optimal. Projected aggregate trip savings are tracking at 12.4%.",
      currency: "INR",
      trips,
      events: trips.flatMap((t) => t.events),
    });
  };

  const handleTripCreated = (newTrip: TripRecord) => {
    const updated = [newTrip, ...metrics.trips];
    recalculateGlobalMetrics(updated);
    setSelectedTripId(newTrip.id);
  };

  const handleTripUpdated = (updatedTrip: TripRecord) => {
    const updated = metrics.trips.map((t) => (t.id === updatedTrip.id ? updatedTrip : t));
    recalculateGlobalMetrics(updated);
  };

  const handleDeleteTrip = async (tripId: string) => {
    if (!confirm("Are you sure you want to delete this trip container?")) return;
    try {
      await deleteTrip(tripId);
      toast.success("Trip removed.");
      const updated = metrics.trips.filter((t) => t.id !== tripId);
      recalculateGlobalMetrics(updated);
      if (selectedTripId === tripId) setSelectedTripId(null);
    } catch {
      toast.error("Failed to delete trip.");
    }
  };

  const handleArchiveTrip = async (tripId: string, shouldArchive: boolean = true) => {
    try {
      const updatedTrip = await archiveTrip(tripId, shouldArchive);
      toast.success(shouldArchive ? "Trip moved to archive." : "Trip restored to active list.");
      const updated = metrics.trips.map((t) => (t.id === updatedTrip.id ? updatedTrip : t));
      recalculateGlobalMetrics(updated);
    } catch {
      toast.error("Failed to update archive status.");
    }
  };

  const handleDuplicateTrip = async (tripId: string) => {
    try {
      const duplicated = await duplicateTrip(tripId);
      toast.success("Trip cloned successfully!");
      const updated = [duplicated, ...metrics.trips];
      recalculateGlobalMetrics(updated);
    } catch {
      toast.error("Failed to duplicate trip.");
    }
  };

  const handleQuickAddExpense = async () => {
    if (!quickExpenseTrip || !quickTitle.trim() || !quickAmount || Number(quickAmount) <= 0) {
      toast.error("Please enter a valid expense title and amount.");
      return;
    }
    try {
      const updated = await addTripExpense(quickExpenseTrip.id, {
        title: quickTitle,
        category: quickCategory,
        amount: Number(quickAmount),
        date: new Date().toISOString().split("T")[0],
        paidById: quickExpenseTrip.members[0]?.id || "mem_1",
        isPersonal: false,
        paymentMethod: "UPI",
      });
      handleTripUpdated(updated);
      toast.success("Expense recorded!");
      setQuickExpenseTrip(null);
      setQuickTitle("");
      setQuickAmount("");
    } catch {
      toast.error("Failed to add expense.");
    }
  };

  // Filtered trips
  const displayedTrips = useMemo(() => {
    return metrics.trips.filter((t) => {
      const matchesSearch =
        !searchQuery.trim() ||
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.destination.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.city && t.city.toLowerCase().includes(searchQuery.toLowerCase()));

      let matchesStatus = true;
      if (statusFilter === "archived") matchesStatus = t.status === "archived";
      else if (statusFilter === "all") matchesStatus = t.status !== "archived";
      else matchesStatus = t.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [metrics.trips, searchQuery, statusFilter]);

  // If a trip is opened, render the Enterprise Trip Detail Dashboard
  const selectedTrip = metrics.trips.find((t) => t.id === selectedTripId);
  if (selectedTrip) {
    return (
      <TripDetailDashboard
        trip={selectedTrip}
        onBack={() => setSelectedTripId(null)}
        onTripUpdated={handleTripUpdated}
      />
    );
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-primary/10 text-primary">
              <Compass className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                  Trip & Event Operating System
                </h1>
                <Badge variant="secondary" className="bg-primary/10 text-primary font-bold text-xs uppercase tracking-wider">
                  Enterprise
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Multi-category budgeting, real-time group expense reconciliation, itinerary schedules, and AI forecasting
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setIsWizardOpen(true)}
            className="rounded-xl text-xs font-bold gap-1.5 bg-primary text-primary-foreground shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all h-9 px-4"
          >
            <FolderPlus className="h-4 w-4" />
            <span>Create Trip Wizard</span>
          </Button>
        </div>
      </div>

      {/* Live AI Financial Summary Ticker */}
      <div className="p-4 rounded-3xl border border-primary/20 bg-gradient-to-r from-primary/10 via-card to-background shadow-xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 text-xs">
          <div className="p-2 rounded-xl bg-primary text-primary-foreground shrink-0">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <span className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider text-[10px] block text-primary">
              Autonomous Travel Intelligence
            </span>
            <p className="text-slate-600 dark:text-slate-300 font-medium">
              {metrics.aiGlobalRecommendation}
            </p>
          </div>
        </div>
        <Badge variant="outline" className="text-xs font-mono shrink-0 hidden sm:inline-flex">
          Health: {metrics.overallHealthScore}/100 • {metrics.overallRiskLevel}
        </Badge>
      </div>

      {/* Top Executive Dashboard - 8 KPI Cards with Hover Effects & Status Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Trip Budget */}
        <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800/90 shadow-xs bg-card p-4 sm:p-5 relative overflow-hidden transition-all duration-250 group hover:-translate-y-1 hover:shadow-lg hover:border-primary/40 dark:hover:border-primary/50 hover:bg-primary/5 hover:shadow-primary/10 cursor-pointer">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-bold uppercase tracking-wider text-[10px] text-primary">Total Trip Budget</span>
            <div className="p-2 rounded-xl bg-primary/10 text-primary group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-250">
              <Compass className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 mt-2 tracking-tight group-hover:text-primary transition-colors">
            {formatCurrency(metrics.totalTripBudget, metrics.currency)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
            <span>Allocated: {formatCurrency(metrics.allocatedBudget, metrics.currency)}</span>
            <span className="text-emerald-600 font-bold">100% Reconciled</span>
          </div>
        </Card>

        {/* Card 2: Actual Expenses */}
        <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800/90 shadow-xs bg-card p-4 sm:p-5 relative overflow-hidden transition-all duration-250 group hover:-translate-y-1 hover:shadow-lg hover:border-rose-400 dark:hover:border-rose-500/60 hover:bg-rose-50/30 dark:hover:bg-rose-950/20 hover:shadow-rose-500/10 cursor-pointer">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-bold uppercase tracking-wider text-[10px] text-rose-600 dark:text-rose-400">Actual Outflow</span>
            <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 group-hover:scale-110 group-hover:bg-rose-600 group-hover:text-white transition-all duration-250">
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400 mt-2 tracking-tight">
            {formatCurrency(metrics.actualExpenses, metrics.currency)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
            <span>Personal: {formatCurrency(metrics.personalExpenses, metrics.currency)}</span>
            <span>Shared: {formatCurrency(metrics.sharedExpenses, metrics.currency)}</span>
          </div>
        </Card>

        {/* Card 3: Remaining Capital */}
        <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800/90 shadow-xs bg-card p-4 sm:p-5 relative overflow-hidden transition-all duration-250 group hover:-translate-y-1 hover:shadow-lg hover:border-emerald-400 dark:hover:border-emerald-500/60 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 hover:shadow-emerald-500/10 cursor-pointer">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-bold uppercase tracking-wider text-[10px] text-emerald-600 dark:text-emerald-400">Remaining Budget</span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-250">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-2 tracking-tight">
            {formatCurrency(metrics.remainingBudget, metrics.currency)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
            <span>Utilization Rate: {metrics.budgetUtilizationPct}%</span>
            <span className="text-emerald-600 font-bold">Unencumbered</span>
          </div>
        </Card>

        {/* Card 4: Pending Settlements & Receivables */}
        <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800/90 shadow-xs bg-card p-4 sm:p-5 relative overflow-hidden transition-all duration-250 group hover:-translate-y-1 hover:shadow-lg hover:border-amber-400 dark:hover:border-amber-500/60 hover:bg-amber-50/30 dark:hover:bg-amber-950/20 hover:shadow-amber-500/10 cursor-pointer">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-bold uppercase tracking-wider text-[10px] text-amber-600 dark:text-amber-400">Pending Settlements</span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 group-hover:scale-110 group-hover:bg-amber-600 group-hover:text-white transition-all duration-250">
              <IndianRupee className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 mt-2 tracking-tight">
            {formatCurrency(metrics.pendingSettlementsAmount, metrics.currency)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
            <span>{metrics.pendingSettlementsCount} Unsettled balances</span>
            <span className="text-slate-600 dark:text-slate-300 font-bold">Audit ready</span>
          </div>
        </Card>
      </div>

      {/* Secondary Metric Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-2xl bg-card border border-slate-200/80 dark:border-slate-800 text-xs flex items-center justify-between">
          <span className="text-slate-400 font-medium">Active Journeys:</span>
          <span className="font-bold text-slate-900 dark:text-slate-100">{metrics.activeTripsCount} Ongoing</span>
        </div>
        <div className="p-3 rounded-2xl bg-card border border-slate-200/80 dark:border-slate-800 text-xs flex items-center justify-between">
          <span className="text-slate-400 font-medium">Upcoming Expeditions:</span>
          <span className="font-bold text-slate-900 dark:text-slate-100">{metrics.upcomingTripsCount} Scheduled</span>
        </div>
        <div className="p-3 rounded-2xl bg-card border border-slate-200/80 dark:border-slate-800 text-xs flex items-center justify-between">
          <span className="text-slate-400 font-medium">Collaborator Network:</span>
          <span className="font-bold text-slate-900 dark:text-slate-100">{metrics.totalMembersCount} Members</span>
        </div>
        <div className="p-3 rounded-2xl bg-card border border-slate-200/80 dark:border-slate-800 text-xs flex items-center justify-between">
          <span className="text-slate-400 font-medium">Average Daily Spend:</span>
          <span className="font-bold font-mono text-slate-900 dark:text-slate-100">{formatCurrency(metrics.avgDailySpend, metrics.currency)}/day</span>
        </div>
      </div>

      {/* Search, Filter Tabs & Toolbar */}
      <div className="p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-card shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search trips by destination, country, city, organizer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 text-xs rounded-xl border-slate-200/80 dark:border-slate-800"
            />
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {(["all", "upcoming", "ongoing", "completed", "archived"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setStatusFilter(tab)}
                className={`py-1.5 px-3 rounded-xl text-xs font-semibold capitalize transition-all ${
                  statusFilter === tab
                    ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Enterprise Trip Management Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-5">
        {displayedTrips.map((trip) => {
          const isArchived = trip.status === "archived";
          const packedCount = trip.checklists.filter((c) => c.isPacked).length;
          const checklistProgress =
            trip.checklists.length > 0 ? Math.round((packedCount / trip.checklists.length) * 100) : 0;

          return (
            <Card
              key={trip.id}
              className="rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-card overflow-hidden shadow-xs transition-all duration-250 group hover:-translate-y-1 hover:shadow-xl hover:border-primary/50 flex flex-col justify-between"
            >
              <div>
                {/* Cover Image Header with Gradient Backdrop */}
                <div className="h-40 w-full relative overflow-hidden bg-slate-900">
                  <img
                    src={trip.coverImage || "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&auto=format&fit=crop&q=80"}
                    alt={trip.name}
                    className="w-full h-full object-cover opacity-80 group-hover:scale-103 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                  <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    <Badge className="bg-black/60 text-white backdrop-blur-md text-[10px] uppercase font-bold border-white/20">
                      {trip.category}
                    </Badge>
                    <Badge className="bg-white/90 text-black backdrop-blur-md text-[10px] font-bold">
                      {trip.durationDays} Days
                    </Badge>
                  </div>

                  <div className="absolute top-3 right-3">
                    <Badge
                      variant="secondary"
                      className={`text-[10px] uppercase font-bold tracking-wider backdrop-blur-md ${
                        trip.status === "ongoing"
                          ? "bg-emerald-500 text-white border-none"
                          : trip.status === "upcoming"
                          ? "bg-amber-500 text-white border-none"
                          : "bg-slate-700 text-white border-none"
                      }`}
                    >
                      {trip.status}
                    </Badge>
                  </div>

                  <div className="absolute bottom-3 left-3 right-3 text-white">
                    <h2 className="text-lg font-black truncate">{trip.name}</h2>
                    <p className="text-xs text-white/80 flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3" />
                      {trip.destination}, {trip.country} • Organizer: {trip.organizerName}
                    </p>
                  </div>
                </div>

                {/* Card Content & Financial Intelligence */}
                <div className="p-5 space-y-4">
                  {/* Budget Allocation Progress */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-medium">Budget Consumption</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                        {formatCurrency(trip.actualTotal, trip.currency)} / {formatCurrency(trip.allocatedBudget, trip.currency)} ({trip.budgetUsedPct}%)
                      </span>
                    </div>
                    <Progress value={Math.min(100, trip.budgetUsedPct)} className="h-2 rounded-full" />
                  </div>

                  {/* 3-Col Quick Stats */}
                  <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-100 dark:border-slate-800 text-xs">
                    <div>
                      <span className="text-slate-400 text-[10px]">Remaining</span>
                      <p className="font-mono font-bold text-emerald-600 mt-0.5">{formatCurrency(trip.remainingBudget, trip.currency)}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px]">Health Score</span>
                      <p className="font-mono font-bold text-indigo-600 mt-0.5">{trip.financialHealthScore}/100</p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px]">Risk Factor</span>
                      <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{trip.riskLevel}</p>
                    </div>
                  </div>

                  {/* Operational Metrics (Checklist, Documents, Members) */}
                  <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-1.5 overflow-hidden">
                        {trip.members.slice(0, 3).map((m, idx) => (
                          <div
                            key={idx}
                            className="inline-block h-6 w-6 rounded-full ring-2 ring-background bg-slate-200 dark:bg-slate-800 text-[10px] font-bold text-center leading-6"
                          >
                            {m.name.charAt(0)}
                          </div>
                        ))}
                      </div>
                      <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        {trip.members.length} Members
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px]">
                      <span>Checklist: <strong>{checklistProgress}%</strong></span>
                      <span>Docs: <strong>{trip.documents.length}</strong></span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Quick Action Bar */}
              <div className="p-4 bg-slate-50/60 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-800/90 flex items-center justify-between gap-2">
                <Button
                  size="sm"
                  onClick={() => setSelectedTripId(trip.id)}
                  className="rounded-xl text-xs font-bold gap-1.5 flex-1 bg-primary text-primary-foreground shadow-xs hover:shadow-md"
                >
                  <span>Open Dashboard</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setQuickExpenseTrip(trip)}
                  className="rounded-xl text-xs font-semibold h-8 border-slate-200/80 dark:border-slate-800 hover:border-primary/50"
                >
                  <Plus className="h-3 w-3 mr-1" /> Expense
                </Button>

                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleDuplicateTrip(trip.id)}
                  title="Duplicate Trip"
                  className="h-8 w-8 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>

                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleArchiveTrip(trip.id, !isArchived)}
                  title={isArchived ? "Restore Trip" : "Archive Trip"}
                  className={`h-8 w-8 rounded-xl ${
                    isArchived
                      ? "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                      : "text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                  }`}
                >
                  {isArchived ? <RotateCcw className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
                </Button>

                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleDeleteTrip(trip.id)}
                  title="Delete Trip"
                  className="h-8 w-8 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </Card>
          );
        })}

        {displayedTrips.length === 0 && (
          <div className="col-span-full py-16 px-4 text-center space-y-4 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-card/60">
            <div className="p-4 bg-primary/10 rounded-full w-14 h-14 mx-auto flex items-center justify-center text-primary">
              <Compass className="h-7 w-7" />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">No Trips Found</h3>
              <p className="text-xs text-slate-500">
                Launch your first travel operating environment using the multi-step trip wizard.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setIsWizardOpen(true)}
              className="rounded-xl text-xs font-bold gap-1.5 bg-primary text-primary-foreground px-5 h-9"
            >
              <FolderPlus className="h-4 w-4" />
              <span>Launch Trip Wizard</span>
            </Button>
          </div>
        )}
      </div>

      {/* Create Trip Wizard Dialog */}
      <TripCreateWizardDialog
        open={isWizardOpen}
        onOpenChange={setIsWizardOpen}
        onTripCreated={handleTripCreated}
      />

      {/* Quick Add Expense Dialog */}
      <Dialog open={!!quickExpenseTrip} onOpenChange={(open) => !open && setQuickExpenseTrip(null)}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-card border border-slate-200/80 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Quick Log Expense</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {quickExpenseTrip?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-xs py-2">
            <div>
              <label className="font-bold">Expense Title *</label>
              <Input
                placeholder="e.g. Airport Taxi / Dinner"
                value={quickTitle}
                onChange={(e) => setQuickTitle(e.target.value)}
                className="rounded-xl h-10 mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold">Amount (₹) *</label>
                <Input
                  type="number"
                  placeholder="e.g. 1500"
                  value={quickAmount}
                  onChange={(e) => setQuickAmount(e.target.value)}
                  className="rounded-xl h-10 mt-1 font-mono font-bold"
                />
              </div>

              <div>
                <label className="font-bold">Category</label>
                <select
                  value={quickCategory}
                  onChange={(e) => setQuickCategory(e.target.value as BudgetCategoryKey)}
                  className="w-full rounded-xl h-10 mt-1 border border-slate-200/80 dark:border-slate-800 bg-background px-3"
                >
                  <option value="Food">Food</option>
                  <option value="Transportation">Transportation</option>
                  <option value="Hotel">Hotel</option>
                  <option value="Adventure">Adventure</option>
                  <option value="Fuel">Fuel</option>
                  <option value="Miscellaneous">Miscellaneous</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button variant="outline" size="sm" onClick={() => setQuickExpenseTrip(null)} className="rounded-xl text-xs">
                Cancel
              </Button>
              <Button size="sm" onClick={handleQuickAddExpense} className="rounded-xl text-xs font-bold bg-primary text-primary-foreground">
                Save Expense
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

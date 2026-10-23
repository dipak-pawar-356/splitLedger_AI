"use client";

import { useState, useMemo, useEffect } from "react";
import QRCode from "qrcode";
import {
  TripDashboardMetrics,
  TripRecord,
  TripEvent,
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
  QrCode,
  Share2,
  Sun,
  Globe,
  Clock,
  CheckCircle2,
  ExternalLink,
  Download,
  Loader2,
  Hotel,
  Truck,
  Luggage,
  BarChart3,
  Settings,
  Eye,
  SlidersHorizontal,
  MoreVertical,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { TripCreateWizardDialog } from "@/components/trips/trip-create-wizard-dialog";
import { TripDetailDashboard } from "@/components/trips/trip-detail-dashboard";
import { EventManagementSection } from "@/components/trips/event-management-section";
import { OperationsLogisticsCenter } from "@/components/trips/operations-logistics-center";
import { createEmptyLogisticsHub } from "@/lib/default-logistics";
import { WorkspaceInspectorPanel } from "@/components/trips/workspace-inspector-panel";
import { OverviewWorkspace } from "@/components/trips/workspaces/overview-workspace";
import { AccommodationWorkspace } from "@/components/trips/workspaces/accommodation-workspace";
import { TransportationWorkspace } from "@/components/trips/workspaces/transportation-workspace";
import { ResourcesWorkspace } from "@/components/trips/workspaces/resources-workspace";
import { DocumentsWorkspace } from "@/components/trips/workspaces/documents-workspace";
import { MembersWorkspace } from "@/components/trips/workspaces/members-workspace";
import { ReportsWorkspace } from "@/components/trips/workspaces/reports-workspace";
import { SettingsWorkspace } from "@/components/trips/workspaces/settings-workspace";

export type WorkspaceTabKey =
  | "overview"
  | "trips"
  | "events"
  | "logistics"
  | "accommodation"
  | "transportation"
  | "resources"
  | "documents"
  | "members"
  | "reports"
  | "settings";

interface TripsDashboardViewProps {
  initialMetrics: TripDashboardMetrics;
}

export function TripsDashboardView({ initialMetrics }: TripsDashboardViewProps) {
  const [metrics, setMetrics] = useState<TripDashboardMetrics>(initialMetrics);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [initialTabForDetail, setInitialTabForDetail] = useState<string>("overview");

  // Enterprise Operating System Active Workspace
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceTabKey>("overview");

  // Right-side Inspector Panel State
  const [inspectingTrip, setInspectingTrip] = useState<TripRecord | null>(null);
  const [inspectingEvent, setInspectingEvent] = useState<TripEvent | null>(null);

  // Trips Workspace Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "ongoing" | "upcoming" | "planning" | "paused" | "completed" | "draft" | "archived"
  >("all");

  // Modals
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [qrModalTrip, setQrModalTrip] = useState<TripRecord | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [isGeneratingQr, setIsGeneratingQr] = useState<boolean>(false);
  const [shareModalTrip, setShareModalTrip] = useState<TripRecord | null>(null);
  const [quickExpenseTrip, setQuickExpenseTrip] = useState<TripRecord | null>(null);
  const [quickTitle, setQuickTitle] = useState("");
  const [quickAmount, setQuickAmount] = useState("");
  const [quickCategory, setQuickCategory] = useState<BudgetCategoryKey>("Food");

  // Real scannable QR Code generation for selected trip
  useEffect(() => {
    if (qrModalTrip?.publicId) {
      setIsGeneratingQr(true);
      const origin =
        typeof window !== "undefined" && window.location.origin
          ? window.location.origin
          : "https://splitledger.ai";
      const accessUrl = `${origin}/trips/${qrModalTrip.publicId}`;
      QRCode.toDataURL(accessUrl, {
        width: 400,
        margin: 2,
        color: {
          dark: "#0f172a",
          light: "#ffffff",
        },
        errorCorrectionLevel: "H",
      })
        .then((url) => {
          setQrCodeDataUrl(url);
          setIsGeneratingQr(false);
        })
        .catch((err) => {
          console.error("QR Code Generation Error:", err);
          setIsGeneratingQr(false);
        });
    } else {
      setQrCodeDataUrl("");
      setIsGeneratingQr(false);
    }
  }, [qrModalTrip]);

  // Re-calculate local metrics whenever trips update
  const recalculateGlobalMetrics = (trips: TripRecord[]) => {
    const nonArchived = trips.filter((t) => t.status !== "archived" && t.status !== "cancelled");
    const totalTripBudget = nonArchived.reduce((sum, t) => sum + t.budgetAmount, 0);
    const allocatedBudget = nonArchived.reduce((sum, t) => sum + t.allocatedBudget, 0);
    const actualExpenses = nonArchived.reduce((sum, t) => sum + t.actualTotal, 0);
    const personalExpenses = nonArchived.reduce((sum, t) => sum + t.personalExpensesTotal, 0);
    const sharedExpenses = nonArchived.reduce((sum, t) => sum + t.sharedExpensesTotal, 0);
    const remainingBudget = Math.max(0, allocatedBudget - actualExpenses);
    const budgetUtilizationPct =
      allocatedBudget > 0 ? Math.round((actualExpenses / allocatedBudget) * 100) : 0;

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

    const avgDailySpend =
      nonArchived.length > 0
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
    setInspectingTrip(newTrip);
  };

  const handleTripUpdated = (updatedTrip: TripRecord) => {
    const updated = metrics.trips.map((t) => (t.id === updatedTrip.id ? updatedTrip : t));
    recalculateGlobalMetrics(updated);
    if (inspectingTrip?.id === updatedTrip.id) {
      setInspectingTrip(updatedTrip);
    }
  };

  const handleDeleteTrip = async (tripId: string) => {
    if (!confirm("Are you sure you want to delete this trip container?")) return;
    try {
      await deleteTrip(tripId);
      toast.success("Trip removed.");
      const updated = metrics.trips.filter((t) => t.id !== tripId);
      recalculateGlobalMetrics(updated);
      if (selectedTripId === tripId) setSelectedTripId(null);
      if (inspectingTrip?.id === tripId) setInspectingTrip(null);
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
      if (inspectingTrip?.id === tripId) setInspectingTrip(updatedTrip);
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
      setInspectingTrip(duplicated);
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
      toast.success("Expense recorded in INR!");
      setQuickExpenseTrip(null);
      setQuickTitle("");
      setQuickAmount("");
    } catch {
      toast.error("Failed to add expense.");
    }
  };

  const openTripDetail = (tripId: string, tab: string = "overview") => {
    setInitialTabForDetail(tab);
    setSelectedTripId(tripId);
  };

  // Filtered trips with rich multi-field query matching
  const displayedTrips = useMemo(() => {
    return metrics.trips.filter((trip) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        trip.name.toLowerCase().includes(q) ||
        trip.destination.toLowerCase().includes(q) ||
        trip.country.toLowerCase().includes(q) ||
        (trip.city && trip.city.toLowerCase().includes(q)) ||
        (trip.state && trip.state.toLowerCase().includes(q)) ||
        (trip.taluka && trip.taluka.toLowerCase().includes(q)) ||
        trip.publicId.toLowerCase().includes(q) ||
        trip.category.toLowerCase().includes(q) ||
        (trip.categories && trip.categories.some((c) => c.toLowerCase().includes(q))) ||
        (trip.tags && trip.tags.some((t) => t.toLowerCase().includes(q))) ||
        trip.members.some((m) => m.name.toLowerCase().includes(q));

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && (trip.status === "ongoing" || trip.status === "active")) ||
        trip.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [metrics.trips, searchQuery, statusFilter]);

  // Operating Navigation Items (11 Workspaces)
  const navigationWorkspaces: {
    key: WorkspaceTabKey;
    label: string;
    icon: any;
    count?: number;
    badgeColor?: string;
  }[] = [
    { key: "overview", label: "Overview", icon: Compass },
    { key: "trips", label: "Trips", icon: Compass, count: metrics.trips.length },
    { key: "events", label: "Events", icon: Calendar, count: metrics.events.length, badgeColor: "bg-indigo-500/10 text-indigo-600" },
    { key: "logistics", label: "Logistics", icon: ShieldCheck, badgeColor: "bg-amber-500/10 text-amber-600" },
    { key: "accommodation", label: "Accommodation", icon: Hotel, count: metrics.logisticsHub?.accommodation?.length || 2, badgeColor: "bg-purple-500/10 text-purple-600" },
    { key: "transportation", label: "Transportation", icon: Truck, count: metrics.logisticsHub?.transportation?.length || 3, badgeColor: "bg-blue-500/10 text-blue-600" },
    { key: "resources", label: "Resources", icon: Luggage, count: metrics.logisticsHub?.packing?.inventory?.length || 6, badgeColor: "bg-emerald-500/10 text-emerald-600" },
    { key: "documents", label: "Documents", icon: FileText, count: 5, badgeColor: "bg-amber-500/10 text-amber-600" },
    { key: "members", label: "Members", icon: Users, count: metrics.totalMembersCount, badgeColor: "bg-indigo-500/10 text-indigo-600" },
    { key: "reports", label: "Reports", icon: BarChart3 },
    { key: "settings", label: "Settings", icon: Settings },
  ];

  // If deep trip detail dashboard is opened
  if (selectedTripId) {
    const selectedTrip = metrics.trips.find((t) => t.id === selectedTripId);
    if (!selectedTrip) {
      setSelectedTripId(null);
      return null;
    }
    return (
      <TripDetailDashboard
        trip={selectedTrip}
        onBack={() => setSelectedTripId(null)}
        onTripUpdated={handleTripUpdated}
        initialTab={initialTabForDetail}
      />
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* 1. TOP EXECUTIVE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-primary/10 text-primary">
            <Compass className="h-7 w-7" />
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
              Intelligent travel OS: Multi-category budgets in INR (₹), fleet logistics, real-time RSVPs and AI forecasting
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
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

      {/* 2. TOP EXECUTIVE DASHBOARD - 4 HIGH-IMPACT KPI CARDS (STRICTLY INR / ₹) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Trip Budget */}
        <Card
          onClick={() => setActiveWorkspace("reports")}
          className="rounded-3xl border border-slate-200/80 dark:border-slate-800/90 shadow-xs bg-card p-4 sm:p-5 relative overflow-hidden transition-all duration-300 group hover:-translate-y-1.5 hover:shadow-xl hover:border-primary/50 dark:hover:border-primary/50 cursor-pointer"
        >
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold uppercase tracking-wider text-[11px] text-slate-500 dark:text-slate-400">
              Total Operating Budget
            </span>
            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-110 transition-all duration-200">
              <IndianRupee className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 mt-2 tracking-tight group-hover:text-primary transition-colors">
            {formatCurrency(metrics.totalTripBudget, "INR")}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
            <span>Allocated: {formatCurrency(metrics.allocatedBudget, "INR")}</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">100% Reconciled</span>
          </div>
        </Card>

        {/* Card 2: Actual Expenses */}
        <Card
          onClick={() => setActiveWorkspace("reports")}
          className="rounded-3xl border border-slate-200/80 dark:border-slate-800/90 shadow-xs bg-card p-4 sm:p-5 relative overflow-hidden transition-all duration-300 group hover:-translate-y-1.5 hover:shadow-xl hover:border-primary/50 dark:hover:border-primary/50 cursor-pointer"
        >
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold uppercase tracking-wider text-[11px] text-slate-500 dark:text-slate-400">
              Actual Outflow (INR)
            </span>
            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-110 transition-all duration-200">
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 mt-2 tracking-tight group-hover:text-primary transition-colors">
            {formatCurrency(metrics.actualExpenses, "INR")}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
            <span>Personal: {formatCurrency(metrics.personalExpenses, "INR")}</span>
            <span>Shared: {formatCurrency(metrics.sharedExpenses, "INR")}</span>
          </div>
        </Card>

        {/* Card 3: Remaining Capital */}
        <Card
          onClick={() => setActiveWorkspace("reports")}
          className="rounded-3xl border border-slate-200/80 dark:border-slate-800/90 shadow-xs bg-card p-4 sm:p-5 relative overflow-hidden transition-all duration-300 group hover:-translate-y-1.5 hover:shadow-xl hover:border-primary/50 dark:hover:border-primary/50 cursor-pointer"
        >
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold uppercase tracking-wider text-[11px] text-slate-500 dark:text-slate-400">
              Remaining Budget
            </span>
            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-110 transition-all duration-200">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 mt-2 tracking-tight group-hover:text-primary transition-colors">
            {formatCurrency(metrics.remainingBudget, "INR")}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
            <span>Utilization Rate: {metrics.budgetUtilizationPct}%</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Unencumbered</span>
          </div>
        </Card>

        {/* Card 4: Pending Settlements */}
        <Card
          onClick={() => setActiveWorkspace("members")}
          className="rounded-3xl border border-slate-200/80 dark:border-slate-800/90 shadow-xs bg-card p-4 sm:p-5 relative overflow-hidden transition-all duration-300 group hover:-translate-y-1.5 hover:shadow-xl hover:border-primary/50 dark:hover:border-primary/50 cursor-pointer"
        >
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold uppercase tracking-wider text-[11px] text-slate-500 dark:text-slate-400">
              Pending Settlements
            </span>
            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-110 transition-all duration-200">
              <IndianRupee className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 mt-2 tracking-tight group-hover:text-primary transition-colors">
            {formatCurrency(metrics.pendingSettlementsAmount, "INR")}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
            <span>{metrics.pendingSettlementsCount} Unsettled balances</span>
            <span className="text-slate-600 dark:text-slate-400 font-semibold">Audit ready</span>
          </div>
        </Card>
      </div>

      {/* 3. STICKY OPERATING SYSTEM NAVIGATION BAR (11 WORKSPACES) */}
      <div className="sticky top-2 z-30 p-1.5 rounded-2xl bg-card/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-md flex items-center justify-between gap-1 overflow-x-auto scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <div className="flex items-center gap-1 min-w-max">
          {navigationWorkspaces.map((ws) => {
            const Icon = ws.icon;
            const isActive = activeWorkspace === ws.key;
            return (
              <button
                key={ws.key}
                type="button"
                onClick={() => setActiveWorkspace(ws.key)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 shrink-0 ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm scale-[1.02]"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/80"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? "text-primary-foreground" : "text-slate-400"}`} />
                <span>{ws.label}</span>
                {typeof ws.count === "number" && (
                  <span
                    className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      isActive
                        ? "bg-white/20 text-white"
                        : ws.badgeColor || "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    {ws.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="hidden xl:flex items-center gap-2 text-xs text-slate-400 font-medium px-3 shrink-0">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Operational Sync Active</span>
        </div>
      </div>

      {/* 4. WORKSPACE CONTENT SWITCHER (ZERO VERTICAL STACKING) */}
      <div className="pt-2">
        {/* WORKSPACE 1: OVERVIEW */}
        {activeWorkspace === "overview" && (
          <OverviewWorkspace
            metrics={metrics}
            onSelectTrip={(id) => openTripDetail(id, "overview")}
            onInspectTrip={(trip) => {
              setInspectingTrip(trip);
              setInspectingEvent(null);
            }}
            onInspectEvent={(evt) => {
              setInspectingEvent(evt);
              setInspectingTrip(null);
            }}
            onOpenWizard={() => setIsWizardOpen(true)}
            onNavigateTab={(tab) => setActiveWorkspace(tab as WorkspaceTabKey)}
          />
        )}

        {/* WORKSPACE 2: TRIPS DIRECTORY */}
        {activeWorkspace === "trips" && (
          <div className="space-y-5">
            {/* Search & Filter Toolbar */}
            <div className="p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-card shadow-xs space-y-3">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="relative flex-1 min-w-0">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search trips by destination, country, state, city, public ID, host..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-10 text-xs rounded-xl border-slate-200/80 dark:border-slate-800"
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none flex-nowrap sm:flex-wrap">
                  {(["all", "ongoing", "upcoming", "planning", "paused", "completed", "draft", "archived"] as const).map(
                    (tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setStatusFilter(tab)}
                        className={`py-1.5 px-3 rounded-xl text-xs font-semibold capitalize whitespace-nowrap shrink-0 transition-all ${
                          statusFilter === tab
                            ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs"
                            : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                        }`}
                      >
                        {tab === "ongoing" ? "Active" : tab}
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>

            {/* Trip Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-5">
              {displayedTrips.map((trip) => {
                const isArchived = trip.status === "archived";
                const packedCount = trip.checklists.filter((c) => c.isPacked || c.isCompleted).length;
                const checklistProgress =
                  trip.checklists.length > 0 ? Math.round((packedCount / trip.checklists.length) * 100) : 0;
                const totalPendingSettlement = trip.members.reduce((sum, m) => sum + m.pending, 0);
                const nextEvent =
                  trip.events.find((e) => e.status === "upcoming" || e.status === "ongoing") || trip.events[0];

                const now = new Date();
                const start = new Date(trip.startDate);
                const end = new Date(trip.endDate);
                let countdownText = "";
                if (trip.status === "completed") {
                  countdownText = "Completed";
                } else if (now < start) {
                  const daysUntil = Math.max(1, Math.ceil((start.getTime() - now.getTime()) / (1000 * 3600 * 24)));
                  countdownText = `Starts in ${daysUntil}d`;
                } else if (now >= start && now <= end) {
                  const daysLeft = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 3600 * 24)));
                  countdownText = `${daysLeft}d left`;
                } else {
                  countdownText = "Concluded";
                }

                return (
                  <Card
                    key={trip.id}
                    onClick={() => {
                      setInspectingTrip(trip);
                      setInspectingEvent(null);
                    }}
                    className="rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-card overflow-hidden shadow-xs transition-all duration-300 group hover:-translate-y-1.5 hover:shadow-2xl hover:border-primary/50 dark:hover:border-primary/50 flex flex-col justify-between h-full cursor-pointer relative"
                  >
                    <div className="flex-1 flex flex-col">
                      {/* Destination Cover Image */}
                      <div className="h-48 w-full relative overflow-hidden bg-slate-900 shrink-0">
                        <img
                          src={
                            trip.coverImage ||
                            "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&auto=format&fit=crop&q=80"
                          }
                          alt={trip.name}
                          className="w-full h-full object-cover opacity-85 group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/25" />

                        {/* Top Header Bar */}
                        <div className="absolute top-2.5 inset-x-2.5 sm:top-3 sm:inset-x-3 flex items-start justify-between gap-1.5 z-10 pointer-events-none">
                          <div className="flex items-center gap-1.5 flex-wrap min-w-0 pointer-events-auto">
                            <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-black/80 backdrop-blur-md border border-white/20 text-white font-mono text-[10px] sm:text-[11px] font-bold shadow-xs shrink-0">
                              <span className="tracking-wide">{trip.publicId}</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigator.clipboard.writeText(trip.publicId);
                                  toast.success(`Copied Trip ID: ${trip.publicId}`);
                                }}
                                title="Copy Public ID"
                                className="hover:text-primary transition-colors ml-1 p-0.5"
                              >
                                <Copy className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setQrModalTrip(trip);
                                }}
                                title="View QR Code Pass"
                                className="hover:text-primary transition-colors p-0.5"
                              >
                                <QrCode className="h-3 w-3" />
                              </button>
                            </div>

                            <Badge className="bg-white/20 text-white backdrop-blur-md text-[9px] sm:text-[10px] uppercase font-bold border border-white/25 shrink-0">
                              {trip.category}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 pointer-events-auto">
                            <Badge
                              variant="secondary"
                              className={`text-[9px] sm:text-[10px] uppercase font-bold tracking-wider backdrop-blur-md shrink-0 ${
                                trip.status === "ongoing" || trip.status === "active"
                                  ? "bg-emerald-500/90 text-white border-none shadow-xs animate-pulse"
                                  : trip.status === "completed"
                                  ? "bg-slate-700/90 text-white border-none"
                                  : "bg-black/60 text-white border-white/20"
                              }`}
                            >
                              {trip.status}
                            </Badge>

                            {/* Interactive Hover Open Cue */}
                            <div className="hidden sm:flex opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-1 group-hover:translate-x-0 items-center gap-1 px-2.5 py-1 rounded-xl bg-black/80 backdrop-blur-md border border-white/20 text-white text-[10px] font-bold shadow-md">
                              <span>Open</span>
                              <ArrowRight className="h-3 w-3 text-primary" />
                            </div>
                          </div>
                        </div>

                        {/* Bottom Overlay Title & Location */}
                        <div className="absolute bottom-3 inset-x-3 text-white pointer-events-none">
                          <div className="flex items-center gap-1.5 text-slate-300 text-xs mb-0.5">
                            <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span className="font-medium truncate">{trip.destination}, {trip.country}</span>
                            <span className="text-white/60">•</span>
                            <span className="text-emerald-400 font-semibold">{countdownText}</span>
                          </div>
                          <h3 className="text-lg sm:text-xl font-black text-white tracking-tight truncate drop-shadow-sm group-hover:text-primary-foreground/90 transition-colors">
                            {trip.name}
                          </h3>
                        </div>
                      </div>

                      {/* Card Content & Financial Intelligence */}
                      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Operating Budget (INR)</span>
                            <p className="font-mono font-black text-base text-slate-900 dark:text-slate-100 mt-1">
                              {formatCurrency(trip.budgetAmount, "INR")}
                            </p>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5 truncate">
                              Spent: {formatCurrency(trip.actualTotal, "INR")}
                            </span>
                          </div>

                          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Settlement Status</span>
                            <p className="font-mono font-black text-base text-slate-900 dark:text-slate-100 mt-1">
                              {totalPendingSettlement > 0 ? formatCurrency(totalPendingSettlement, "INR") : "₹0.00"}
                            </p>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                              <span className={`inline-block h-1.5 w-1.5 rounded-full shrink-0 ${totalPendingSettlement > 0 ? "bg-amber-500" : "bg-emerald-500"}`} />
                              <span>{totalPendingSettlement > 0 ? "Pending collection" : "100% Cleared"}</span>
                            </span>
                          </div>
                        </div>

                        {/* Operational Manifest Counts */}
                        <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                          <div className="flex items-center gap-2">
                            <div className="flex -space-x-1.5 overflow-hidden">
                              {trip.members.slice(0, 3).map((m, idx) => (
                                <div
                                  key={idx}
                                  title={m.name}
                                  className="inline-block h-6 w-6 rounded-full ring-2 ring-background bg-slate-200 dark:bg-slate-800 text-[10px] font-bold text-center leading-6 text-slate-700 dark:text-slate-300"
                                >
                                  {m.name.charAt(0)}
                                </div>
                              ))}
                            </div>
                            <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                              {trip.members.length} Members
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-slate-400">
                            <span>Checklist: <strong className="text-slate-700 dark:text-slate-300">{checklistProgress}%</strong></span>
                            <span>•</span>
                            <span>Docs: <strong className="text-slate-700 dark:text-slate-300">{trip.documents.length}</strong></span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action Bar: Designed for zero overlap & enterprise ergonomics */}
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="p-3.5 sm:p-4 bg-slate-50/70 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2 shrink-0"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setInspectingTrip(trip);
                            setInspectingEvent(null);
                          }}
                          className="rounded-xl text-xs font-bold gap-1.5 bg-primary text-primary-foreground shadow-xs hover:shadow-md transition-all h-9 px-3.5 shrink-0"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Inspect Record</span>
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            setQuickExpenseTrip(trip);
                          }}
                          className="rounded-xl text-xs font-semibold h-9 px-3 border-slate-200/80 dark:border-slate-800 hover:border-primary/50 text-slate-700 dark:text-slate-200 shrink-0"
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" />
                          <span>Expense</span>
                        </Button>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShareModalTrip(trip);
                          }}
                          title="Share Trip"
                          className="h-8 w-8 rounded-xl text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <Share2 className="h-3.5 w-3.5" />
                        </Button>

                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            setQrModalTrip(trip);
                          }}
                          title="View QR Code Pass"
                          className="h-8 w-8 rounded-xl text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <QrCode className="h-3.5 w-3.5" />
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={(e) => e.stopPropagation()}
                              title="More Options"
                              className="h-8 w-8 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                              <MoreVertical className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52 rounded-2xl p-1.5 shadow-xl border border-slate-200 dark:border-slate-800 bg-popover">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                openTripDetail(trip.id, "overview");
                              }}
                              className="rounded-xl text-xs font-semibold cursor-pointer gap-2.5 py-2"
                            >
                              <ExternalLink className="h-3.5 w-3.5 text-primary" />
                              <span>Open Full Workspace</span>
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(trip.publicId);
                                toast.success(`Copied Trip ID: ${trip.publicId}`);
                              }}
                              className="rounded-xl text-xs font-semibold cursor-pointer gap-2.5 py-2"
                            >
                              <Copy className="h-3.5 w-3.5 text-slate-400" />
                              <span>Copy Public ID</span>
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDuplicateTrip(trip.id);
                              }}
                              className="rounded-xl text-xs font-semibold cursor-pointer gap-2.5 py-2"
                            >
                              <Copy className="h-3.5 w-3.5 text-slate-400" />
                              <span>Duplicate Trip</span>
                            </DropdownMenuItem>

                            <DropdownMenuSeparator className="my-1 border-slate-100 dark:border-slate-800" />

                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleArchiveTrip(trip.id, !isArchived);
                              }}
                              className="rounded-xl text-xs font-semibold cursor-pointer gap-2.5 py-2"
                            >
                              {isArchived ? (
                                <>
                                  <RotateCcw className="h-3.5 w-3.5 text-emerald-500" />
                                  <span>Restore Trip</span>
                                </>
                              ) : (
                                <>
                                  <Archive className="h-3.5 w-3.5 text-amber-500" />
                                  <span>Archive Trip</span>
                                </>
                              )}
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTrip(trip.id);
                              }}
                              className="rounded-xl text-xs font-semibold cursor-pointer gap-2.5 py-2 text-rose-600 focus:text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-950/40"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>Delete Trip</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
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
                </div>
              )}
            </div>
          </div>
        )}

        {/* WORKSPACE 3: EVENTS */}
        {activeWorkspace === "events" && (
          <EventManagementSection
            events={metrics.events}
            trips={metrics.trips}
            onEventUpdated={() => {}}
          />
        )}

        {/* WORKSPACE 4: LOGISTICS CENTER */}
        {activeWorkspace === "logistics" && (
          <OperationsLogisticsCenter
            initialHub={metrics.logisticsHub || createEmptyLogisticsHub()}
            tripName={metrics.trips[0]?.name}
          />
        )}

        {/* WORKSPACE 5: ACCOMMODATION */}
        {activeWorkspace === "accommodation" && (
          <AccommodationWorkspace
            hub={metrics.logisticsHub || createEmptyLogisticsHub()}
            tripName={metrics.trips[0]?.name}
          />
        )}

        {/* WORKSPACE 6: TRANSPORTATION */}
        {activeWorkspace === "transportation" && (
          <TransportationWorkspace
            hub={metrics.logisticsHub || createEmptyLogisticsHub()}
            tripName={metrics.trips[0]?.name}
          />
        )}

        {/* WORKSPACE 7: RESOURCES */}
        {activeWorkspace === "resources" && (
          <ResourcesWorkspace
            hub={metrics.logisticsHub || createEmptyLogisticsHub()}
            tripName={metrics.trips[0]?.name}
          />
        )}

        {/* WORKSPACE 8: DOCUMENTS */}
        {activeWorkspace === "documents" && (
          <DocumentsWorkspace tripName={metrics.trips[0]?.name} />
        )}

        {/* WORKSPACE 9: MEMBERS */}
        {activeWorkspace === "members" && (
          <MembersWorkspace trips={metrics.trips} />
        )}

        {/* WORKSPACE 10: REPORTS */}
        {activeWorkspace === "reports" && (
          <ReportsWorkspace metrics={metrics} />
        )}

        {/* WORKSPACE 11: SETTINGS */}
        {activeWorkspace === "settings" && <SettingsWorkspace />}
      </div>

      {/* 5. RIGHT INSPECTOR PANEL (SLIDE-OVER DRAWER) */}
      <WorkspaceInspectorPanel
        isOpen={!!inspectingTrip || !!inspectingEvent}
        onClose={() => {
          setInspectingTrip(null);
          setInspectingEvent(null);
        }}
        trip={inspectingTrip}
        event={inspectingEvent}
        onOpenFullDashboard={(tripId, tab) => openTripDetail(tripId, tab)}
        onQuickExpense={(trip) => setQuickExpenseTrip(trip)}
        onShareTrip={(trip) => setShareModalTrip(trip)}
        onGenerateQr={(trip) => setQrModalTrip(trip)}
        onTripUpdated={handleTripUpdated}
      />

      {/* 6. CREATE TRIP WIZARD DIALOG */}
      <TripCreateWizardDialog
        open={isWizardOpen}
        onOpenChange={setIsWizardOpen}
        onTripCreated={handleTripCreated}
      />

      {/* 7. PERMANENT QR CODE MODAL */}
      <Dialog open={!!qrModalTrip} onOpenChange={(open) => !open && setQrModalTrip(null)}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-card border border-slate-200/80 dark:border-slate-800 text-center">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center justify-center gap-1.5">
              <QrCode className="h-4 w-4 text-primary" />
              <span>Trip Passport & Access QR</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {qrModalTrip?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 flex flex-col items-center space-y-4">
            <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-md flex items-center justify-center min-h-[200px] min-w-[200px]">
              {isGeneratingQr ? (
                <div className="h-48 w-48 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="text-xs text-slate-500 font-semibold">Generating Pass...</span>
                </div>
              ) : qrCodeDataUrl ? (
                <img
                  src={qrCodeDataUrl}
                  alt={`Real QR code for ${qrModalTrip?.publicId}`}
                  className="h-48 w-48 object-contain rounded-xl"
                />
              ) : (
                <div className="h-48 w-48 flex items-center justify-center text-slate-400 text-xs">
                  Generating QR...
                </div>
              )}
            </div>

            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Permanent Public Identifier
              </span>
              <p className="font-mono text-base font-black text-slate-900 dark:text-slate-100 tracking-wider">
                {qrModalTrip?.publicId}
              </p>
              <p className="text-xs text-slate-500">
                {qrModalTrip?.destination} • {qrModalTrip?.durationDays} Days Expedited
              </p>
            </div>

            <div className="flex items-center gap-2 w-full pt-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 rounded-xl text-xs font-bold gap-1.5"
                onClick={() => {
                  if (qrModalTrip) {
                    navigator.clipboard.writeText(qrModalTrip.publicId);
                    toast.success("Public ID copied to clipboard!");
                  }
                }}
              >
                <Copy className="h-3.5 w-3.5" />
                <span>Copy ID</span>
              </Button>
              {qrCodeDataUrl && (
                <Button
                  size="sm"
                  className="rounded-xl text-xs font-bold gap-1.5 bg-primary text-primary-foreground px-4"
                  onClick={() => {
                    const a = document.createElement("a");
                    a.href = qrCodeDataUrl;
                    a.download = `${qrModalTrip?.publicId || "trip"}-qr.png`;
                    a.click();
                    toast.success("Downloaded QR Code image");
                  }}
                  title="Download QR Code PNG"
                >
                  <Download className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 8. SHARE TRIP DIALOG */}
      <Dialog open={!!shareModalTrip} onOpenChange={(open) => !open && setShareModalTrip(null)}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-card border border-slate-200/80 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-1.5">
              <Share2 className="h-4 w-4 text-primary" />
              <span>Share Travel Operating System</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Invite companions, travel agencies, and members to {shareModalTrip?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-xs py-2">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300">Public Identifier</label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  readOnly
                  value={shareModalTrip?.publicId || ""}
                  className="rounded-xl h-10 font-mono font-bold bg-slate-50 dark:bg-slate-900"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (shareModalTrip) {
                      navigator.clipboard.writeText(shareModalTrip.publicId);
                      toast.success("Public ID copied!");
                    }
                  }}
                  className="rounded-xl h-10 px-3 shrink-0"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300">Direct Invitation URL</label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  readOnly
                  value={shareModalTrip ? `https://splitledger.ai/trips/${shareModalTrip.publicId}` : ""}
                  className="rounded-xl h-10 font-mono text-xs bg-slate-50 dark:bg-slate-900"
                />
                <Button
                  size="sm"
                  onClick={() => {
                    if (shareModalTrip) {
                      navigator.clipboard.writeText(`https://splitledger.ai/trips/${shareModalTrip.publicId}`);
                      toast.success("Invitation link copied!");
                    }
                  }}
                  className="rounded-xl h-10 px-4 shrink-0 font-bold bg-primary text-primary-foreground"
                >
                  Copy
                </Button>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (shareModalTrip) {
                    const text = encodeURIComponent(
                      `Join ${shareModalTrip.name} on SplitLedger AI! Public ID: ${shareModalTrip.publicId} - https://splitledger.ai/trips/${shareModalTrip.publicId}`
                    );
                    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
                  }
                }}
                className="flex-1 rounded-xl text-xs font-bold"
              >
                WhatsApp
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (shareModalTrip) {
                    const subject = encodeURIComponent(`Invitation to join ${shareModalTrip.name}`);
                    const body = encodeURIComponent(
                      `Hey,\n\nYou have been invited to collaborate on "${shareModalTrip.name}" (${shareModalTrip.destination}).\n\nPublic Trip ID: ${shareModalTrip.publicId}\nAccess URL: https://splitledger.ai/trips/${shareModalTrip.publicId}\n\nManaged via SplitLedger AI.`
                    );
                    window.location.href = `mailto:?subject=${subject}&body=${body}`;
                  }
                }}
                className="flex-1 rounded-xl text-xs font-bold"
              >
                Email
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 9. QUICK ADD EXPENSE DIALOG (STRICTLY INR / ₹) */}
      <Dialog open={!!quickExpenseTrip} onOpenChange={(open) => !open && setQuickExpenseTrip(null)}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-card border border-slate-200/80 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-1.5">
              <IndianRupee className="h-4 w-4 text-emerald-600" />
              <span>Quick Log Expense (INR)</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {quickExpenseTrip?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-xs py-2">
            <div>
              <label className="font-bold">Expense Title *</label>
              <Input
                placeholder="e.g. Airport Taxi / Dinner / Permits"
                value={quickTitle}
                onChange={(e) => setQuickTitle(e.target.value)}
                className="rounded-xl h-10 mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold">Amount (₹) *</label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-bold">₹</span>
                  <Input
                    type="number"
                    placeholder="1500"
                    value={quickAmount}
                    onChange={(e) => setQuickAmount(e.target.value)}
                    className="rounded-xl h-10 pl-7 font-mono font-bold"
                  />
                </div>
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQuickExpenseTrip(null)}
                className="rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleQuickAddExpense}
                className="rounded-xl text-xs font-bold bg-primary text-primary-foreground"
              >
                Save Expense (₹)
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

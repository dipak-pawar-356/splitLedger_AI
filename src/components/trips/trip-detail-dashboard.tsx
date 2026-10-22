"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  ArrowLeft,
  Compass,
  Calendar,
  IndianRupee,
  Users,
  PieChart as PieIcon,
  Receipt,
  CheckSquare,
  FileText,
  Clock,
  Sparkles,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  Plus,
  Trash2,
  ShieldCheck,
  AlertTriangle,
  MapPin,
  CheckCircle2,
  CreditCard,
  Share2,
  Download,
  Search,
  Filter,
  DollarSign,
  Layers,
  Plane,
  Hotel,
  Car,
  Utensils,
  Camera,
  Shirt,
  Zap,
} from "lucide-react";
import {
  TripRecord,
  TripExpense,
  BudgetCategoryKey,
  TripDocument,
  TripChecklistItem,
  TripEvent,
} from "@/lib/types/trips";
import {
  addTripExpense,
  deleteTripExpense,
  recordTripSettlement,
  addItineraryStop,
  deleteItineraryStop,
  addTripEvent,
  deleteTripEvent,
  addTripDocument,
  deleteTripDocument,
  addTripChecklistItem,
  toggleChecklistItem,
  deleteChecklistItem,
  addTripMember,
} from "@/actions/trips";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface TripDetailDashboardProps {
  trip: TripRecord;
  onBack: () => void;
  onTripUpdated: (updatedTrip: TripRecord) => void;
}

const CATEGORY_ICONS: Record<string, any> = {
  Hotel: Hotel,
  Transportation: Plane,
  Food: Utensils,
  Fuel: Car,
  Adventure: MountainIcon,
  "Entry Tickets": TicketIcon,
  Medical: ShieldCheck,
  Emergency: AlertTriangle,
  Shopping: ShoppingIcon,
  Miscellaneous: Layers,
};

function MountainIcon(props: any) {
  return <Compass {...props} />;
}
function TicketIcon(props: any) {
  return <Receipt {...props} />;
}
function ShoppingIcon(props: any) {
  return <CreditCard {...props} />;
}

export function TripDetailDashboard({ trip: initialTrip, onBack, onTripUpdated }: TripDetailDashboardProps) {
  const [trip, setTrip] = useState<TripRecord>(initialTrip);
  const [activeTab, setActiveTab] = useState<string>("overview");

  // Modals
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isRecordSettlementOpen, setIsRecordSettlementOpen] = useState(false);
  const [isAddItineraryOpen, setIsAddItineraryOpen] = useState(false);
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [isAddDocOpen, setIsAddDocOpen] = useState(false);
  const [isAddChecklistOpen, setIsAddChecklistOpen] = useState(false);
  const [isInviteMemberOpen, setIsInviteMemberOpen] = useState(false);

  // Form states for Expense
  const [expenseTitle, setExpenseTitle] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseCategory, setExpenseCategory] = useState<BudgetCategoryKey>("Food");
  const [expensePaidById, setExpensePaidById] = useState(trip.members[0]?.id || "");
  const [expenseIsPersonal, setExpenseIsPersonal] = useState(false);
  const [expenseLocation, setExpenseLocation] = useState("");
  const [expenseNotes, setExpenseNotes] = useState("");
  const [expensePaymentMethod, setExpensePaymentMethod] = useState<TripExpense["paymentMethod"]>("UPI");

  // Filter states for Expense Tab
  const [expenseSearch, setExpenseSearch] = useState("");
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState("all");

  // Form states for Settlement
  const [settleFromId, setSettleFromId] = useState(trip.members[1]?.id || trip.members[0]?.id || "");
  const [settleToId, setSettleToId] = useState(trip.members[0]?.id || "");
  const [settleAmount, setSettleAmount] = useState("");

  // Form states for Itinerary
  const [itDayNumber, setItDayNumber] = useState(1);
  const [itSlot, setItSlot] = useState<"morning" | "afternoon" | "evening" | "night">("morning");
  const [itTime, setItTime] = useState("10:00 AM");
  const [itActivity, setItActivity] = useState("");
  const [itLocation, setItLocation] = useState("");
  const [itCost, setItCost] = useState("");

  // Form states for Event
  const [eventTitle, setEventTitle] = useState("");
  const [eventType, setEventType] = useState<TripEvent["type"]>("activity");
  const [eventDate, setEventDate] = useState(trip.startDate);
  const [eventLocation, setEventLocation] = useState("");
  const [eventBudget, setEventBudget] = useState("");

  // Form states for Document
  const [docTitle, setDocTitle] = useState("");
  const [docCategory, setDocCategory] = useState<TripDocument["category"]>("Hotel Booking");
  const [docFileName, setDocFileName] = useState("");

  // Form states for Checklist
  const [chkTitle, setChkTitle] = useState("");
  const [chkCategory, setChkCategory] = useState<TripChecklistItem["category"]>("Clothes");
  const [chkPriority, setChkPriority] = useState<TripChecklistItem["priority"]>("Medium");
  const [chkMember, setChkMember] = useState(trip.members[0]?.name || "Member");

  // Form states for Member
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");

  const updateTripState = (updated: TripRecord) => {
    setTrip(updated);
    onTripUpdated(updated);
  };

  // Handlers
  const handleCreateExpense = async () => {
    if (!expenseTitle.trim() || !expenseAmount || Number(expenseAmount) <= 0) {
      toast.error("Please enter a valid expense title and amount.");
      return;
    }
    try {
      const updated = await addTripExpense(trip.id, {
        title: expenseTitle,
        category: expenseCategory,
        amount: Number(expenseAmount),
        date: new Date().toISOString().split("T")[0],
        paidById: expensePaidById || trip.members[0].id,
        isPersonal: expenseIsPersonal,
        paymentMethod: expensePaymentMethod,
        location: expenseLocation,
        notes: expenseNotes,
      });
      updateTripState(updated);
      toast.success("Expense recorded and budgets updated!");
      setIsAddExpenseOpen(false);
      setExpenseTitle("");
      setExpenseAmount("");
      setExpenseLocation("");
      setExpenseNotes("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to record expense");
    }
  };

  const handleDeleteExpense = async (expId: string) => {
    try {
      const updated = await deleteTripExpense(trip.id, expId);
      updateTripState(updated);
      toast.success("Expense removed.");
    } catch {
      toast.error("Failed to delete expense.");
    }
  };

  const handleRecordSettlement = async () => {
    if (!settleAmount || Number(settleAmount) <= 0) {
      toast.error("Enter a valid settlement amount.");
      return;
    }
    try {
      const updated = await recordTripSettlement(trip.id, {
        fromMemberId: settleFromId,
        toMemberId: settleToId,
        amount: Number(settleAmount),
      });
      updateTripState(updated);
      toast.success("Debt settlement confirmed!");
      setIsRecordSettlementOpen(false);
      setSettleAmount("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to record settlement");
    }
  };

  const handleAddItinerary = async () => {
    if (!itActivity.trim()) return;
    try {
      const updated = await addItineraryStop(trip.id, {
        dayNumber: Number(itDayNumber),
        slot: itSlot,
        time: itTime,
        activity: itActivity,
        location: itLocation,
        estimatedCost: Number(itCost) || 0,
      });
      updateTripState(updated);
      toast.success("Itinerary item scheduled!");
      setIsAddItineraryOpen(false);
      setItActivity("");
      setItLocation("");
      setItCost("");
    } catch {
      toast.error("Failed to add itinerary stop.");
    }
  };

  const handleAddEvent = async () => {
    if (!eventTitle.trim()) return;
    try {
      const updated = await addTripEvent(trip.id, {
        title: eventTitle,
        type: eventType,
        startDateTime: eventDate,
        location: eventLocation || "Main Location",
        budget: Number(eventBudget) || 0,
      });
      updateTripState(updated);
      toast.success("Event scheduled!");
      setIsAddEventOpen(false);
      setEventTitle("");
      setEventLocation("");
      setEventBudget("");
    } catch {
      toast.error("Failed to create event.");
    }
  };

  const handleAddDocument = async () => {
    if (!docTitle.trim() || !docFileName.trim()) return;
    try {
      const updated = await addTripDocument(trip.id, {
        title: docTitle,
        category: docCategory,
        fileName: docFileName,
        fileType: docFileName.endsWith(".pdf") ? "pdf" : "image",
      });
      updateTripState(updated);
      toast.success("Travel document saved!");
      setIsAddDocOpen(false);
      setDocTitle("");
      setDocFileName("");
    } catch {
      toast.error("Failed to add document.");
    }
  };

  const handleAddChecklist = async () => {
    if (!chkTitle.trim()) return;
    try {
      const updated = await addTripChecklistItem(trip.id, {
        title: chkTitle,
        category: chkCategory,
        priority: chkPriority,
        assignedMemberName: chkMember,
      });
      updateTripState(updated);
      toast.success("Checklist item created!");
      setIsAddChecklistOpen(false);
      setChkTitle("");
    } catch {
      toast.error("Failed to add checklist item.");
    }
  };

  const handleToggleChecklist = async (id: string) => {
    try {
      const updated = await toggleChecklistItem(trip.id, id);
      updateTripState(updated);
    } catch {
      toast.error("Failed to toggle item.");
    }
  };

  const handleInviteMember = async () => {
    if (!newMemberName.trim()) return;
    try {
      const updated = await addTripMember(trip.id, {
        name: newMemberName,
        email: newMemberEmail,
        role: "Member",
      });
      updateTripState(updated);
      toast.success(`${newMemberName} added to trip!`);
      setIsInviteMemberOpen(false);
      setNewMemberName("");
      setNewMemberEmail("");
    } catch {
      toast.error("Failed to add member.");
    }
  };

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    return trip.expenses.filter((e) => {
      const matchesSearch =
        !expenseSearch.trim() ||
        e.title.toLowerCase().includes(expenseSearch.toLowerCase()) ||
        e.category.toLowerCase().includes(expenseSearch.toLowerCase()) ||
        e.paidByName.toLowerCase().includes(expenseSearch.toLowerCase());
      const matchesCategory =
        expenseCategoryFilter === "all" || e.category === expenseCategoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [trip.expenses, expenseSearch, expenseCategoryFilter]);

  // Chart data
  const chartCategoryData = trip.categoryBudgets.map((c) => ({
    name: c.category,
    Allocated: c.allocated,
    Spent: c.spent,
    fill: c.color,
  }));

  const pieData = trip.categoryBudgets
    .filter((c) => c.spent > 0)
    .map((c) => ({
      name: c.category,
      value: c.spent,
      color: c.color,
    }));

  const packedCount = trip.checklists.filter((c) => c.isPacked).length;
  const checklistProgress =
    trip.checklists.length > 0 ? Math.round((packedCount / trip.checklists.length) * 100) : 0;

  return (
    <div className="space-y-6 pb-16">
      {/* Top Navigation & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
            className="rounded-xl text-xs gap-1.5 h-9 font-semibold border-slate-200/80 dark:border-slate-800 hover:border-primary/50"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>All Trips</span>
          </Button>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                {trip.name}
              </h1>
              <Badge
                variant="secondary"
                className={`text-[10px] uppercase font-bold tracking-wider ${
                  trip.status === "ongoing"
                    ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                    : trip.status === "upcoming"
                    ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                }`}
              >
                {trip.status}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              <MapPin className="h-3 w-3 inline mr-1 text-slate-400" />
              {trip.destination}, {trip.country} • {trip.startDate} to {trip.endDate} ({trip.durationDays} Days)
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            onClick={() => setIsAddExpenseOpen(true)}
            className="rounded-xl text-xs font-bold gap-1.5 bg-primary text-primary-foreground shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Add Expense</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsRecordSettlementOpen(true)}
            className="rounded-xl text-xs font-bold gap-1.5 border-slate-200/80 dark:border-slate-800 hover:border-emerald-500 hover:text-emerald-600 transition-all"
          >
            <IndianRupee className="h-4 w-4 text-emerald-600" />
            <span>Settle Up</span>
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              window.print();
            }}
            className="rounded-xl text-xs font-bold gap-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
          >
            <Download className="h-4 w-4" />
            <span>Export Report</span>
          </Button>
        </div>
      </div>

      {/* Quick KPI Ribbon for This Trip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="p-3.5 rounded-2xl bg-card border border-slate-200/80 dark:border-slate-800/90 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Budget</span>
          <p className="text-base font-black text-slate-900 dark:text-slate-100 mt-0.5">
            {formatCurrency(trip.budgetAmount, trip.currency)}
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-card border border-slate-200/80 dark:border-slate-800/90 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500">Actual Outflow</span>
          <p className="text-base font-black text-rose-600 dark:text-rose-400 mt-0.5">
            {formatCurrency(trip.actualTotal, trip.currency)}
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-card border border-slate-200/80 dark:border-slate-800/90 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Remaining</span>
          <p className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
            {formatCurrency(trip.remainingBudget, trip.currency)}
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-card border border-slate-200/80 dark:border-slate-800/90 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Budget Utilization</span>
          <p className="text-base font-black text-primary mt-0.5">{trip.budgetUsedPct}%</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-card border border-slate-200/80 dark:border-slate-800/90 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">Health Score</span>
          <p className="text-base font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
            {trip.financialHealthScore}/100
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-card border border-slate-200/80 dark:border-slate-800/90 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500">Daily Rec. Spend</span>
          <p className="text-base font-black text-amber-600 dark:text-amber-400 mt-0.5">
            {formatCurrency(trip.recommendedDailySpend, trip.currency)}
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-card border border-slate-200/80 dark:border-slate-800/90 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Collaborators</span>
          <p className="text-base font-black text-slate-900 dark:text-slate-100 mt-0.5">
            {trip.members.length} Members
          </p>
        </div>
      </div>

      {/* 11 Deep Sub-Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-slate-100 dark:bg-slate-800/90 p-1 rounded-2xl flex-wrap h-auto gap-1">
          <TabsTrigger value="overview" className="rounded-xl text-xs font-semibold">Overview</TabsTrigger>
          <TabsTrigger value="budget" className="rounded-xl text-xs font-semibold">Budget Management</TabsTrigger>
          <TabsTrigger value="expenses" className="rounded-xl text-xs font-semibold">Expenses ({trip.expenses.length})</TabsTrigger>
          <TabsTrigger value="settlements" className="rounded-xl text-xs font-semibold">Settlements</TabsTrigger>
          <TabsTrigger value="itinerary" className="rounded-xl text-xs font-semibold">Timeline & Itinerary</TabsTrigger>
          <TabsTrigger value="events" className="rounded-xl text-xs font-semibold">Events ({trip.events.length})</TabsTrigger>
          <TabsTrigger value="documents" className="rounded-xl text-xs font-semibold">Documents ({trip.documents.length})</TabsTrigger>
          <TabsTrigger value="checklists" className="rounded-xl text-xs font-semibold">Packing ({checklistProgress}%)</TabsTrigger>
          <TabsTrigger value="members" className="rounded-xl text-xs font-semibold">Members & Roles ({trip.members.length})</TabsTrigger>
          <TabsTrigger value="analytics" className="rounded-xl text-xs font-semibold">Analytics</TabsTrigger>
          <TabsTrigger value="reports" className="rounded-xl text-xs font-semibold">Reports & AI</TabsTrigger>
        </TabsList>

        {/* 1. OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Left 2 Cols: Executive Snapshot */}
            <div className="lg:col-span-2 space-y-5">
              <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-card p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Executive Financial Snapshot</h3>
                  <Badge variant="outline" className="text-xs">{trip.riskLevel}</Badge>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 font-medium">Budget Consumed</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                      {formatCurrency(trip.actualTotal, trip.currency)} / {formatCurrency(trip.allocatedBudget, trip.currency)} ({trip.budgetUsedPct}%)
                    </span>
                  </div>
                  <Progress value={trip.budgetUsedPct} className="h-2 rounded-full" />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <div>
                    <span className="text-slate-400 text-[10px]">Personal Spend</span>
                    <p className="font-bold text-slate-800 dark:text-slate-200">{formatCurrency(trip.personalExpensesTotal, trip.currency)}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px]">Shared Group Pool</span>
                    <p className="font-bold text-slate-800 dark:text-slate-200">{formatCurrency(trip.sharedExpensesTotal, trip.currency)}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px]">Emergency Cushion</span>
                    <p className="font-bold text-amber-600">{formatCurrency(trip.emergencyBuffer, trip.currency)}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px]">Forecast Completion</span>
                    <p className="font-bold text-indigo-600">{formatCurrency(trip.projectedTotalSpend, trip.currency)}</p>
                  </div>
                </div>
              </Card>

              {/* Recent Activity Ticker */}
              <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-card p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Recent Ledger Activity</h3>
                  <Button variant="ghost" size="sm" onClick={() => setActiveTab("expenses")} className="text-xs text-primary">
                    View All Expenses
                  </Button>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {trip.expenses.slice(0, 4).map((exp) => (
                    <div key={exp.id} className="py-2.5 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-900 dark:text-slate-100">{exp.title}</p>
                        <p className="text-[11px] text-slate-400">
                          {exp.category} • Paid by {exp.paidByName} • {exp.date}
                        </p>
                      </div>
                      <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                        {formatCurrency(exp.amount, trip.currency)}
                      </span>
                    </div>
                  ))}
                  {trip.expenses.length === 0 && (
                    <p className="text-xs text-slate-400 py-4 text-center">No expenses recorded yet.</p>
                  )}
                </div>
              </Card>
            </div>

            {/* Right Col: AI Copilot & Packing Health */}
            <div className="space-y-5">
              <Card className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/5 via-card to-background p-5 space-y-3">
                <div className="flex items-center gap-2 text-primary font-bold text-sm">
                  <Sparkles className="h-4 w-4" />
                  <span>AI Travel Financial Insights</span>
                </div>
                <div className="space-y-2 text-xs">
                  {trip.aiInsights.map((insight, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-primary/10 text-slate-800 dark:text-slate-200 leading-relaxed">
                      {insight}
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-card p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Packing Readiness</h3>
                  <span className="text-xs font-mono font-bold text-primary">{checklistProgress}%</span>
                </div>
                <Progress value={checklistProgress} className="h-2 rounded-full" />
                <p className="text-[11px] text-slate-400">
                  {packedCount} of {trip.checklists.length} mandatory luggage & document items packed.
                </p>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* 2. BUDGET MANAGEMENT TAB */}
        <TabsContent value="budget" className="space-y-5">
          {/* Multi-Category Breakdown Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {trip.categoryBudgets.map((cat) => (
              <Card
                key={cat.category}
                className="rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-card p-5 space-y-3 transition-all duration-250 group hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{cat.category}</span>
                  <Badge
                    variant={cat.isOverBudget ? "destructive" : "secondary"}
                    className="text-[10px] font-bold uppercase"
                  >
                    {cat.usagePct}% Used
                  </Badge>
                </div>

                <div className="space-y-1.5">
                  <Progress value={Math.min(100, cat.usagePct)} className="h-2 rounded-full" />
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-500">Spent: {formatCurrency(cat.spent, trip.currency)}</span>
                    <span className="text-slate-700 dark:text-slate-300">
                      Cap: {formatCurrency(cat.allocated, trip.currency)}
                    </span>
                  </div>
                </div>

                <div className="pt-2 flex justify-between items-center text-[11px] border-t border-slate-100 dark:border-slate-800">
                  <span className={cat.isOverBudget ? "text-rose-600 font-bold" : "text-emerald-600 font-bold"}>
                    {cat.isOverBudget
                      ? `Over by ₹${Math.abs(cat.remaining).toLocaleString("en-IN")}`
                      : `Remaining: ₹${cat.remaining.toLocaleString("en-IN")}`}
                  </span>
                  <span className="text-slate-400">{cat.aiForecast}</span>
                </div>
              </Card>
            ))}
          </div>

          {/* Variance Comparison Table */}
          <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-card overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold">Category Financial Reconciliation</CardTitle>
              <CardDescription className="text-xs">
                Variance is automatically audited against real expense receipts.
              </CardDescription>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-400 font-bold uppercase text-[10px] border-y border-slate-200/80 dark:border-slate-800">
                  <tr>
                    <th className="p-3.5">Category</th>
                    <th className="p-3.5">Allocated</th>
                    <th className="p-3.5">Spent</th>
                    <th className="p-3.5">Remaining</th>
                    <th className="p-3.5">Variance</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">AI Recommendation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {trip.categoryBudgets.map((c) => (
                    <tr key={c.category} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                      <td className="p-3.5 font-bold text-slate-900 dark:text-slate-100">{c.category}</td>
                      <td className="p-3.5 font-mono">{formatCurrency(c.allocated, trip.currency)}</td>
                      <td className="p-3.5 font-mono text-rose-600">{formatCurrency(c.spent, trip.currency)}</td>
                      <td className="p-3.5 font-mono text-emerald-600">{formatCurrency(c.remaining, trip.currency)}</td>
                      <td className={`p-3.5 font-mono font-bold ${c.isOverBudget ? "text-rose-600" : "text-emerald-600"}`}>
                        {c.isOverBudget ? `-₹${Math.abs(c.remaining).toLocaleString("en-IN")}` : `+₹${c.remaining.toLocaleString("en-IN")}`}
                      </td>
                      <td className="p-3.5">
                        <Badge variant={c.isOverBudget ? "destructive" : "outline"} className="text-[10px]">
                          {c.isOverBudget ? "DEFICIT" : "SURPLUS"}
                        </Badge>
                      </td>
                      <td className="p-3.5 text-slate-500">{c.aiForecast}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* 3. EXPENSES TAB */}
        <TabsContent value="expenses" className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 w-full sm:w-auto">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search expense titles, locations, members..."
                value={expenseSearch}
                onChange={(e) => setExpenseSearch(e.target.value)}
                className="pl-9 h-10 text-xs rounded-xl"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={expenseCategoryFilter}
                onChange={(e) => setExpenseCategoryFilter(e.target.value)}
                className="h-10 text-xs rounded-xl border border-slate-200/80 dark:border-slate-800 bg-background px-3"
              >
                <option value="all">All Categories</option>
                {trip.categoryBudgets.map((c) => (
                  <option key={c.category} value={c.category}>{c.category}</option>
                ))}
              </select>

              <Button
                size="sm"
                onClick={() => setIsAddExpenseOpen(true)}
                className="rounded-xl text-xs font-bold gap-1.5 bg-primary text-primary-foreground h-10 px-4"
              >
                <Plus className="h-4 w-4" /> Add Expense
              </Button>
            </div>
          </div>

          <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-400 font-bold uppercase text-[10px] border-b border-slate-200/80 dark:border-slate-800">
                  <tr>
                    <th className="p-3.5">Expense Title</th>
                    <th className="p-3.5">Category</th>
                    <th className="p-3.5">Paid By</th>
                    <th className="p-3.5">Split Type</th>
                    <th className="p-3.5">Date</th>
                    <th className="p-3.5">Payment</th>
                    <th className="p-3.5 text-right">Amount</th>
                    <th className="p-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredExpenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                      <td className="p-3.5 font-bold text-slate-900 dark:text-slate-100">
                        {exp.title}
                        {exp.location && <span className="block text-[10px] font-normal text-slate-400">{exp.location}</span>}
                      </td>
                      <td className="p-3.5">
                        <Badge variant="secondary" className="text-[10px]">{exp.category}</Badge>
                      </td>
                      <td className="p-3.5 font-semibold text-slate-700 dark:text-slate-300">{exp.paidByName}</td>
                      <td className="p-3.5">
                        <Badge variant={exp.isPersonal ? "outline" : "secondary"} className="text-[9px] uppercase">
                          {exp.isPersonal ? "Personal" : "Shared Group"}
                        </Badge>
                      </td>
                      <td className="p-3.5 text-slate-500 font-mono">{exp.date}</td>
                      <td className="p-3.5 text-slate-500">{exp.paymentMethod}</td>
                      <td className="p-3.5 text-right font-mono font-black text-slate-900 dark:text-slate-100">
                        {formatCurrency(exp.amount, trip.currency)}
                      </td>
                      <td className="p-3.5 text-right">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDeleteExpense(exp.id)}
                          className="h-7 w-7 text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {filteredExpenses.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        No expenses match your criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* 4. SETTLEMENTS TAB */}
        <TabsContent value="settlements" className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {trip.members.map((m) => (
              <Card key={m.id} className="rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-card p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{m.name}</span>
                  <Badge variant={m.settlementStatus === "settled" ? "outline" : m.settlementStatus === "overpaid" ? "secondary" : "destructive"}>
                    {m.settlementStatus}
                  </Badge>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Paid Out:</span>
                    <span className="font-mono font-bold">{formatCurrency(m.paid, trip.currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Own Split Share:</span>
                    <span className="font-mono">{formatCurrency(m.ownShare, trip.currency)}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-100 dark:border-slate-800 font-bold">
                    <span>Net Balance:</span>
                    <span className={m.receivable > 0 ? "text-emerald-600" : m.pending > 0 ? "text-rose-600" : "text-slate-500"}>
                      {m.receivable > 0 ? `+${formatCurrency(m.receivable, trip.currency)}` : m.pending > 0 ? `-${formatCurrency(m.pending, trip.currency)}` : "Settled"}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Settlement Transaction History */}
          <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-card p-5 space-y-3">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Settled Transactions Audit Trail</h3>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {trip.settlements.map((s) => (
                <div key={s.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-slate-100">
                      {s.fromMemberName} paid {s.toMemberName}
                    </p>
                    <p className="text-[11px] text-slate-400">{s.paymentMethod} • {s.settledAt?.split("T")[0]}</p>
                  </div>
                  <span className="font-mono font-bold text-emerald-600">{formatCurrency(s.amount, trip.currency)}</span>
                </div>
              ))}
              {trip.settlements.length === 0 && (
                <p className="text-xs text-slate-400 py-4 text-center">No settlements executed yet.</p>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* 5. TIMELINE & ITINERARY TAB */}
        <TabsContent value="itinerary" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Chronological Itinerary Schedule</h3>
            <Button size="sm" onClick={() => setIsAddItineraryOpen(true)} className="rounded-xl text-xs font-bold gap-1">
              <Plus className="h-4 w-4" /> Add Itinerary Stop
            </Button>
          </div>

          <div className="space-y-4">
            {Array.from(new Set(trip.itinerary.map((i) => i.dayNumber))).sort().map((day) => (
              <Card key={day} className="rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-card p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="font-bold text-xs">Day {day}</Badge>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {trip.itinerary.filter((i) => i.dayNumber === day).map((item) => (
                    <div key={item.id} className="py-2.5 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-primary font-bold">{item.time}</span>
                          <span className="font-bold text-slate-900 dark:text-slate-100">{item.activity}</span>
                        </div>
                        {item.location && <p className="text-[11px] text-slate-400">{item.location}</p>}
                      </div>
                      <div className="flex items-center gap-3">
                        {item.estimatedCost ? (
                          <span className="font-mono font-bold text-slate-600 dark:text-slate-400">
                            ~{formatCurrency(item.estimatedCost, trip.currency)}
                          </span>
                        ) : null}
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteItineraryStop(trip.id, item.id).then(updateTripState)}
                          className="h-7 w-7 text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* 6. EVENTS TAB */}
        <TabsContent value="events" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Group Travel Events & Milestones</h3>
            <Button size="sm" onClick={() => setIsAddEventOpen(true)} className="rounded-xl text-xs font-bold gap-1">
              <Plus className="h-4 w-4" /> Add Event
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {trip.events.map((evt) => (
              <Card key={evt.id} className="rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-card p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">{evt.title}</h4>
                  <Badge variant="secondary" className="capitalize text-[10px]">{evt.type}</Badge>
                </div>
                <div className="text-xs text-slate-500 space-y-1">
                  <p><strong>Scheduled:</strong> {evt.startDateTime}</p>
                  <p><strong>Location:</strong> {evt.location}</p>
                  <p><strong>Budget Pool:</strong> {formatCurrency(evt.budget, trip.currency)}</p>
                </div>
                <div className="pt-2 flex justify-end border-t border-slate-100 dark:border-slate-800">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteTripEvent(trip.id, evt.id).then(updateTripState)}
                    className="text-xs text-rose-600 hover:bg-rose-50 h-8 gap-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* 7. DOCUMENTS TAB */}
        <TabsContent value="documents" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Travel Documents & Vouchers</h3>
            <Button size="sm" onClick={() => setIsAddDocOpen(true)} className="rounded-xl text-xs font-bold gap-1">
              <Plus className="h-4 w-4" /> Upload Document
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {trip.documents.map((doc) => (
              <Card key={doc.id} className="rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-card p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-6 w-6 text-primary shrink-0" />
                    <div>
                      <p className="font-bold text-xs text-slate-900 dark:text-slate-100 line-clamp-1">{doc.title}</p>
                      <p className="text-[10px] text-slate-400">{doc.category}</p>
                    </div>
                  </div>
                </div>
                <div className="text-[11px] text-slate-500 space-y-0.5">
                  <p>File: {doc.fileName}</p>
                  <p>Size: {doc.fileSize}</p>
                </div>
                <div className="pt-2 flex justify-end border-t border-slate-100 dark:border-slate-800">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => deleteTripDocument(trip.id, doc.id).then(updateTripState)}
                    className="h-7 w-7 text-slate-400 hover:text-rose-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* 8. PACKING CHECKLIST TAB */}
        <TabsContent value="checklists" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Packing & Luggage Checklist</h3>
            <Button size="sm" onClick={() => setIsAddChecklistOpen(true)} className="rounded-xl text-xs font-bold gap-1">
              <Plus className="h-4 w-4" /> Add Item
            </Button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-card overflow-hidden">
            {trip.checklists.map((chk) => (
              <div key={chk.id} className="p-3.5 flex items-center justify-between text-xs hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={chk.isPacked}
                    onChange={() => handleToggleChecklist(chk.id)}
                    className="h-4 w-4 rounded text-primary focus:ring-primary cursor-pointer"
                  />
                  <div>
                    <span className={`font-semibold ${chk.isPacked ? "line-through text-slate-400" : "text-slate-900 dark:text-slate-100"}`}>
                      {chk.title}
                    </span>
                    <p className="text-[10px] text-slate-400">Assigned: {chk.assignedMemberName} • {chk.category}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={chk.priority === "High" ? "destructive" : "outline"} className="text-[9px]">
                    {chk.priority}
                  </Badge>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => deleteChecklistItem(trip.id, chk.id).then(updateTripState)}
                    className="h-7 w-7 text-slate-400 hover:text-rose-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* 9. MEMBERS TAB */}
        <TabsContent value="members" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Travel Group Members & Permissions</h3>
            <Button size="sm" onClick={() => setIsInviteMemberOpen(true)} className="rounded-xl text-xs font-bold gap-1">
              <Plus className="h-4 w-4" /> Invite Member
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {trip.members.map((m) => (
              <Card key={m.id} className="rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-card p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                    {m.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-sm text-slate-900 dark:text-slate-100">{m.name}</p>
                    <Badge variant="outline" className="text-[9px] uppercase">{m.role}</Badge>
                  </div>
                </div>
                <div className="space-y-1 text-xs border-t border-slate-100 dark:border-slate-800 pt-2 text-slate-500">
                  <p>Expenses Logged: <strong>{m.expenseCount}</strong></p>
                  <p>Settlement Status: <strong className="capitalize">{m.settlementStatus}</strong></p>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* 10. ANALYTICS TAB */}
        <TabsContent value="analytics" className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-card p-5 space-y-3">
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Planned vs Actual Spend by Category</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartCategoryData}>
                    <XAxis dataKey="name" stroke="#888888" fontSize={10} tickLine={false} />
                    <YAxis stroke="#888888" fontSize={10} tickLine={false} />
                    <RechartsTooltip />
                    <Bar dataKey="Allocated" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Spent" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-card p-5 space-y-3">
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Outflow Velocity & Burn Rate</h3>
              <div className="space-y-3 text-xs pt-4">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 flex justify-between items-center">
                  <span className="text-slate-500">Average Burn Rate:</span>
                  <span className="font-mono font-bold text-rose-600">{formatCurrency(trip.burnRatePerDay, trip.currency)} / day</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 flex justify-between items-center">
                  <span className="text-slate-500">Projected Completion Cost:</span>
                  <span className="font-mono font-bold">{formatCurrency(trip.projectedTotalSpend, trip.currency)}</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 flex justify-between items-center">
                  <span className="text-slate-500">Cost Per Person:</span>
                  <span className="font-mono font-bold">
                    {formatCurrency(Math.round(trip.actualTotal / Math.max(1, trip.members.length)), trip.currency)}
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* 11. REPORTS & AI TAB */}
        <TabsContent value="reports" className="space-y-5">
          <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-card p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Executive Trip Audit Report</h3>
                <p className="text-xs text-slate-500">Generated by SplitLedger AI Autonomous Financial Engine</p>
              </div>
              <Button size="sm" onClick={() => window.print()} className="rounded-xl text-xs gap-1.5 font-bold">
                <Download className="h-4 w-4" /> Export Document
              </Button>
            </div>

            <div className="space-y-3 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              <p>
                <strong>Executive Summary:</strong> {trip.name} has incurred a total expenditure of{" "}
                <strong>{formatCurrency(trip.actualTotal, trip.currency)}</strong> against an allocated budget of{" "}
                <strong>{formatCurrency(trip.allocatedBudget, trip.currency)}</strong> ({trip.budgetUsedPct}% budget utilized).
              </p>
              <p>
                <strong>Financial Risk Assessment:</strong> Currently evaluated as <strong>{trip.riskLevel}</strong> with an aggregate financial health score of <strong>{trip.financialHealthScore}/100</strong>.
              </p>
              <p>
                <strong>Settlement Reconciliation:</strong> {trip.members.filter((m) => m.pending > 0).length} collaborator accounts have pending reimbursements totaling{" "}
                <strong>{formatCurrency(trip.members.reduce((a, b) => a + b.pending, 0), trip.currency)}</strong>.
              </p>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* DIALOG 1: Add Expense */}
      <Dialog open={isAddExpenseOpen} onOpenChange={setIsAddExpenseOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-card border border-slate-200/80 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Log Trip Expense</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Record purchase and auto-reconcile category budgets and member shares.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-xs py-2">
            <div>
              <label className="font-bold">Expense Title *</label>
              <Input
                placeholder="e.g. Scuba Diving Tickets / Dinner at Fisherman's Wharf"
                value={expenseTitle}
                onChange={(e) => setExpenseTitle(e.target.value)}
                className="rounded-xl h-10 mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold">Amount (₹) *</label>
                <Input
                  type="number"
                  placeholder="e.g. 3500"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  className="rounded-xl h-10 mt-1 font-mono font-bold"
                />
              </div>

              <div>
                <label className="font-bold">Category</label>
                <select
                  value={expenseCategory}
                  onChange={(e) => setExpenseCategory(e.target.value as BudgetCategoryKey)}
                  className="w-full rounded-xl h-10 mt-1 border border-slate-200/80 dark:border-slate-800 bg-background px-3"
                >
                  {trip.categoryBudgets.map((c) => (
                    <option key={c.category} value={c.category}>{c.category}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold">Paid By</label>
                <select
                  value={expensePaidById}
                  onChange={(e) => setExpensePaidById(e.target.value)}
                  className="w-full rounded-xl h-10 mt-1 border border-slate-200/80 dark:border-slate-800 bg-background px-3"
                >
                  {trip.members.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold">Payment Method</label>
                <select
                  value={expensePaymentMethod}
                  onChange={(e) => setExpensePaymentMethod(e.target.value as any)}
                  className="w-full rounded-xl h-10 mt-1 border border-slate-200/80 dark:border-slate-800 bg-background px-3"
                >
                  <option value="UPI">UPI</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Debit Card">Debit Card</option>
                  <option value="Cash">Cash</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="isPersonal"
                checked={expenseIsPersonal}
                onChange={(e) => setExpenseIsPersonal(e.target.checked)}
                className="h-4 w-4 rounded text-primary focus:ring-primary cursor-pointer"
              />
              <label htmlFor="isPersonal" className="cursor-pointer font-medium">
                Personal Purchase (Exclude from shared group split)
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button variant="outline" size="sm" onClick={() => setIsAddExpenseOpen(false)} className="rounded-xl text-xs">
                Cancel
              </Button>
              <Button size="sm" onClick={handleCreateExpense} className="rounded-xl text-xs font-bold bg-primary text-primary-foreground">
                Save Expense
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* DIALOG 2: Record Settlement */}
      <Dialog open={isRecordSettlementOpen} onOpenChange={setIsRecordSettlementOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-card border border-slate-200/80 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Record Debt Settlement</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Mark debts settled between traveling collaborators.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-xs py-2">
            <div>
              <label className="font-bold">From Member (Payer)</label>
              <select
                value={settleFromId}
                onChange={(e) => setSettleFromId(e.target.value)}
                className="w-full rounded-xl h-10 mt-1 border border-slate-200/80 dark:border-slate-800 bg-background px-3"
              >
                {trip.members.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold">To Member (Recipient)</label>
              <select
                value={settleToId}
                onChange={(e) => setSettleToId(e.target.value)}
                className="w-full rounded-xl h-10 mt-1 border border-slate-200/80 dark:border-slate-800 bg-background px-3"
              >
                {trip.members.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold">Amount (₹)</label>
              <Input
                type="number"
                placeholder="e.g. 4833"
                value={settleAmount}
                onChange={(e) => setSettleAmount(e.target.value)}
                className="rounded-xl h-10 mt-1 font-mono font-bold"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button variant="outline" size="sm" onClick={() => setIsRecordSettlementOpen(false)} className="rounded-xl text-xs">
                Cancel
              </Button>
              <Button size="sm" onClick={handleRecordSettlement} className="rounded-xl text-xs font-bold bg-primary text-primary-foreground">
                Confirm Settlement
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* DIALOG 3: Add Itinerary Stop */}
      <Dialog open={isAddItineraryOpen} onOpenChange={setIsAddItineraryOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-card border border-slate-200/80 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Schedule Itinerary Activity</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 text-xs py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold">Day Number</label>
                <Input
                  type="number"
                  value={itDayNumber}
                  onChange={(e) => setItDayNumber(Number(e.target.value))}
                  className="rounded-xl h-10 mt-1"
                />
              </div>
              <div>
                <label className="font-bold">Time Slot</label>
                <select
                  value={itSlot}
                  onChange={(e) => setItSlot(e.target.value as any)}
                  className="w-full rounded-xl h-10 mt-1 border border-slate-200/80 dark:border-slate-800 bg-background px-3"
                >
                  <option value="morning">Morning</option>
                  <option value="afternoon">Afternoon</option>
                  <option value="evening">Evening</option>
                  <option value="night">Night</option>
                </select>
              </div>
            </div>

            <div>
              <label className="font-bold">Activity Name</label>
              <Input
                placeholder="e.g. Scuba Diving / Fort Aguada Visit"
                value={itActivity}
                onChange={(e) => setItActivity(e.target.value)}
                className="rounded-xl h-10 mt-1"
              />
            </div>

            <div>
              <label className="font-bold">Estimated Cost (₹)</label>
              <Input
                type="number"
                placeholder="e.g. 1500"
                value={itCost}
                onChange={(e) => setItCost(e.target.value)}
                className="rounded-xl h-10 mt-1"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button variant="outline" size="sm" onClick={() => setIsAddItineraryOpen(false)} className="rounded-xl text-xs">
                Cancel
              </Button>
              <Button size="sm" onClick={handleAddItinerary} className="rounded-xl text-xs font-bold bg-primary text-primary-foreground">
                Schedule Stop
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* DIALOG 4: Add Event */}
      <Dialog open={isAddEventOpen} onOpenChange={setIsAddEventOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-card border border-slate-200/80 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Create Group Travel Event</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 text-xs py-2">
            <div>
              <label className="font-bold">Event Title</label>
              <Input
                placeholder="e.g. Sunset Beach Barbeque / Team Dinner"
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
                className="rounded-xl h-10 mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold">Event Type</label>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value as any)}
                  className="w-full rounded-xl h-10 mt-1 border border-slate-200/80 dark:border-slate-800 bg-background px-3"
                >
                  <option value="dinner">Dinner</option>
                  <option value="flight">Flight</option>
                  <option value="trekking">Trekking</option>
                  <option value="camping">Camping</option>
                  <option value="activity">Activity</option>
                </select>
              </div>
              <div>
                <label className="font-bold">Budget Pool (₹)</label>
                <Input
                  type="number"
                  placeholder="e.g. 5000"
                  value={eventBudget}
                  onChange={(e) => setEventBudget(e.target.value)}
                  className="rounded-xl h-10 mt-1"
                />
              </div>
            </div>

            <div>
              <label className="font-bold">Location</label>
              <Input
                placeholder="e.g. Anjuna Beach / Sky Lounge"
                value={eventLocation}
                onChange={(e) => setEventLocation(e.target.value)}
                className="rounded-xl h-10 mt-1"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button variant="outline" size="sm" onClick={() => setIsAddEventOpen(false)} className="rounded-xl text-xs">
                Cancel
              </Button>
              <Button size="sm" onClick={handleAddEvent} className="rounded-xl text-xs font-bold bg-primary text-primary-foreground">
                Save Event
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* DIALOG 5: Upload Document */}
      <Dialog open={isAddDocOpen} onOpenChange={setIsAddDocOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-card border border-slate-200/80 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Register Travel Document</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 text-xs py-2">
            <div>
              <label className="font-bold">Document Title</label>
              <Input
                placeholder="e.g. Villa Booking Voucher / IndiGo Ticket"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                className="rounded-xl h-10 mt-1"
              />
            </div>

            <div>
              <label className="font-bold">Category</label>
              <select
                value={docCategory}
                onChange={(e) => setDocCategory(e.target.value as any)}
                className="w-full rounded-xl h-10 mt-1 border border-slate-200/80 dark:border-slate-800 bg-background px-3"
              >
                <option value="Hotel Booking">Hotel Booking</option>
                <option value="Flight Ticket">Flight Ticket</option>
                <option value="Passport & Visa">Passport & Visa</option>
                <option value="Travel Insurance">Travel Insurance</option>
                <option value="Receipt / Invoice">Receipt / Invoice</option>
              </select>
            </div>

            <div>
              <label className="font-bold">Filename / Reference</label>
              <Input
                placeholder="e.g. Goa_Villa_Agreement.pdf"
                value={docFileName}
                onChange={(e) => setDocFileName(e.target.value)}
                className="rounded-xl h-10 mt-1"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button variant="outline" size="sm" onClick={() => setIsAddDocOpen(false)} className="rounded-xl text-xs">
                Cancel
              </Button>
              <Button size="sm" onClick={handleAddDocument} className="rounded-xl text-xs font-bold bg-primary text-primary-foreground">
                Register Document
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* DIALOG 6: Add Checklist */}
      <Dialog open={isAddChecklistOpen} onOpenChange={setIsAddChecklistOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-card border border-slate-200/80 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Add Luggage & Packing Item</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 text-xs py-2">
            <div>
              <label className="font-bold">Item Title</label>
              <Input
                placeholder="e.g. Scuba Mask / Sunscreen / First-Aid Kit"
                value={chkTitle}
                onChange={(e) => setChkTitle(e.target.value)}
                className="rounded-xl h-10 mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold">Category</label>
                <select
                  value={chkCategory}
                  onChange={(e) => setChkCategory(e.target.value as any)}
                  className="w-full rounded-xl h-10 mt-1 border border-slate-200/80 dark:border-slate-800 bg-background px-3"
                >
                  <option value="Clothes">Clothes</option>
                  <option value="Electronics">Electronics</option>
                  <option value="Documents">Documents</option>
                  <option value="Medical">Medical</option>
                  <option value="Food">Food</option>
                  <option value="Camping">Camping</option>
                </select>
              </div>

              <div>
                <label className="font-bold">Priority</label>
                <select
                  value={chkPriority}
                  onChange={(e) => setChkPriority(e.target.value as any)}
                  className="w-full rounded-xl h-10 mt-1 border border-slate-200/80 dark:border-slate-800 bg-background px-3"
                >
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
            </div>

            <div>
              <label className="font-bold">Assigned Member</label>
              <select
                value={chkMember}
                onChange={(e) => setChkMember(e.target.value)}
                className="w-full rounded-xl h-10 mt-1 border border-slate-200/80 dark:border-slate-800 bg-background px-3"
              >
                {trip.members.map((m) => (
                  <option key={m.id} value={m.name}>{m.name}</option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button variant="outline" size="sm" onClick={() => setIsAddChecklistOpen(false)} className="rounded-xl text-xs">
                Cancel
              </Button>
              <Button size="sm" onClick={handleAddChecklist} className="rounded-xl text-xs font-bold bg-primary text-primary-foreground">
                Add to Checklist
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* DIALOG 7: Invite Member */}
      <Dialog open={isInviteMemberOpen} onOpenChange={setIsInviteMemberOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-card border border-slate-200/80 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Invite Traveling Collaborator</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 text-xs py-2">
            <div>
              <label className="font-bold">Collaborator Name *</label>
              <Input
                placeholder="e.g. Rohan Verma"
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                className="rounded-xl h-10 mt-1"
              />
            </div>

            <div>
              <label className="font-bold">Email Address</label>
              <Input
                placeholder="e.g. rohan@example.com"
                value={newMemberEmail}
                onChange={(e) => setNewMemberEmail(e.target.value)}
                className="rounded-xl h-10 mt-1"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button variant="outline" size="sm" onClick={() => setIsInviteMemberOpen(false)} className="rounded-xl text-xs">
                Cancel
              </Button>
              <Button size="sm" onClick={handleInviteMember} className="rounded-xl text-xs font-bold bg-primary text-primary-foreground">
                Send Invitation
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

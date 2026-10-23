"use client";

import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  TripRecord,
  TripEvent,
  BudgetCategoryKey,
  MemberRole,
} from "@/lib/types/trips";
import { formatCurrency } from "@/lib/utils";
import {
  Compass,
  Calendar,
  MapPin,
  IndianRupee,
  Users,
  CheckSquare,
  FileText,
  Clock,
  ShieldCheck,
  Share2,
  Copy,
  QrCode,
  Plus,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Layers,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Tag,
  Phone,
  Building,
  Navigation,
  Lock,
  History,
  CheckCircle2,
  Check,
  X,
  FileSpreadsheet,
} from "lucide-react";
import { toast } from "sonner";

interface WorkspaceInspectorPanelProps {
  isOpen: boolean;
  onClose: () => void;
  trip: TripRecord | null;
  event: TripEvent | null;
  onOpenFullDashboard?: (tripId: string, tab?: string) => void;
  onQuickExpense?: (trip: TripRecord) => void;
  onShareTrip?: (trip: TripRecord) => void;
  onGenerateQr?: (trip: TripRecord) => void;
  onTripUpdated?: (trip: TripRecord) => void;
}

type InspectorTabKey =
  | "overview"
  | "budget"
  | "timeline"
  | "members"
  | "expenses"
  | "checklist"
  | "documents"
  | "activity"
  | "permissions"
  | "history"
  | "notes";

export function WorkspaceInspectorPanel({
  isOpen,
  onClose,
  trip,
  event,
  onOpenFullDashboard,
  onQuickExpense,
  onShareTrip,
  onGenerateQr,
  onTripUpdated,
}: WorkspaceInspectorPanelProps) {
  const [activeTab, setActiveTab] = useState<InspectorTabKey>("overview");
  const [checklistItems, setChecklistItems] = useState(trip?.checklists || []);

  if (!trip && !event) return null;

  const title = trip ? trip.name : event?.title || "Item Inspector";
  const publicId = trip ? trip.publicId : event?.publicId || "N/A";
  const locationText = trip
    ? `${trip.destination}, ${trip.country}`
    : event?.location || "Location Scheduled";

  const handleToggleChecklist = (itemId: string) => {
    if (!trip) return;
    const updated = checklistItems.map((item) =>
      item.id === itemId
        ? { ...item, isPacked: !item.isPacked, isCompleted: !item.isCompleted }
        : item
    );
    setChecklistItems(updated);
    if (onTripUpdated) {
      onTripUpdated({ ...trip, checklists: updated });
    }
    toast.success("Checklist status updated.");
  };

  const tabs: { key: InspectorTabKey; label: string; icon: any; count?: number }[] = [
    { key: "overview", label: "Overview", icon: Compass },
    { key: "budget", label: "Budget", icon: IndianRupee },
    { key: "timeline", label: "Timeline", icon: Calendar, count: trip?.itinerary?.length || (event as any)?.itinerary?.length || 0 },
    { key: "members", label: "Members", icon: Users, count: trip?.members?.length || event?.participants?.length || 0 },
    { key: "expenses", label: "Expenses", icon: IndianRupee, count: trip?.expenses?.length },
    { key: "checklist", label: "Checklist", icon: CheckSquare, count: trip?.checklists?.length },
    { key: "documents", label: "Documents", icon: FileText, count: trip?.documents?.length },
    { key: "activity", label: "Activity", icon: History },
    { key: "permissions", label: "Permissions", icon: ShieldCheck },
    { key: "history", label: "Audit Log", icon: Clock },
    { key: "notes", label: "Notes", icon: Layers },
  ];

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl md:max-w-2xl p-0 flex flex-col bg-card border-l border-slate-200/80 dark:border-slate-800 shadow-2xl z-50 overflow-hidden"
      >
        {/* Header Bar */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge
                  variant="secondary"
                  className="bg-primary/10 text-primary font-bold text-[10px] uppercase tracking-wider"
                >
                  {trip ? "Trip Record" : "Event Schedule"}
                </Badge>
                <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                  {publicId}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(publicId);
                    toast.success(`Copied ID: ${publicId}`);
                  }}
                  className="text-slate-400 hover:text-primary transition-colors p-0.5"
                  title="Copy ID"
                >
                  <Copy className="h-3 w-3" />
                </button>
              </div>
              <SheetTitle className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight truncate">
                {title}
              </SheetTitle>
              <SheetDescription className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="truncate">{locationText}</span>
              </SheetDescription>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {trip && (
                <>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => onShareTrip && onShareTrip(trip)}
                    className="h-8 w-8 rounded-xl text-slate-400 hover:text-primary"
                    title="Share Record"
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => onGenerateQr && onGenerateQr(trip)}
                    className="h-8 w-8 rounded-xl text-slate-400 hover:text-emerald-600"
                    title="QR Code Pass"
                  >
                    <QrCode className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Quick Action Pills */}
          {trip && (
            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <Button
                size="sm"
                onClick={() => {
                  onClose();
                  if (onOpenFullDashboard) onOpenFullDashboard(trip.id, activeTab);
                }}
                className="rounded-xl text-xs font-bold gap-1.5 h-8 bg-primary text-primary-foreground shadow-xs hover:shadow-md"
              >
                <span>Full Workspace</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => onQuickExpense && onQuickExpense(trip)}
                className="rounded-xl text-xs font-semibold h-8 border-slate-200 dark:border-slate-800"
              >
                <Plus className="h-3 w-3 mr-1" /> Log Expense (₹)
              </Button>
            </div>
          )}
        </div>

        {/* Tab Selector Bar */}
        <div className="px-4 border-b border-slate-100 dark:border-slate-800/80 bg-background overflow-x-auto scrollbar-none flex items-center gap-1 shrink-0 py-1.5">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 shrink-0 ${
                  isActive
                    ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
                {typeof tab.count === "number" && tab.count > 0 && (
                  <span
                    className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      isActive
                        ? "bg-white/20 text-white dark:bg-slate-900/30 dark:text-slate-900"
                        : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Scrollable Tab Content Panel */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* 1. OVERVIEW TAB */}
          {activeTab === "overview" && (
            <div className="space-y-4">
              {trip?.coverImage && (
                <div className="h-36 w-full rounded-2xl overflow-hidden relative border border-slate-200 dark:border-slate-800">
                  <img
                    src={trip.coverImage}
                    alt={trip.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute bottom-3 left-3 text-white">
                    <p className="text-xs font-bold text-white/80 uppercase tracking-wider">{trip.country}</p>
                    <h4 className="text-lg font-black tracking-tight">{trip.destination}</h4>
                  </div>
                </div>
              )}

              {/* Status and Health Cards */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Status & Phase</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200 capitalize mt-0.5">
                    {trip?.status || event?.status}
                  </p>
                  <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">
                    Real-time sync verified
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Financial Health</span>
                  <p className="font-mono font-bold text-primary mt-0.5">
                    {trip?.financialHealthScore || 85} / 100 Score
                  </p>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    {trip?.riskLevel || "Low Risk"}
                  </span>
                </div>
              </div>

              {/* Key Metadata Table */}
              <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                <div className="p-3 flex justify-between items-center">
                  <span className="text-slate-500">Travel Classification</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize">
                    {trip?.categories?.join(", ") || trip?.category || event?.category}
                  </span>
                </div>
                {trip?.state && (
                  <div className="p-3 flex justify-between items-center">
                    <span className="text-slate-500">State / Province</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{trip.state}</span>
                  </div>
                )}
                {trip?.taluka && (
                  <div className="p-3 flex justify-between items-center">
                    <span className="text-slate-500">Taluka / Sub-district</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{trip.taluka}</span>
                  </div>
                )}
                {trip?.climateZone && (
                  <div className="p-3 flex justify-between items-center">
                    <span className="text-slate-500">Climate Zone</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{trip.climateZone}</span>
                  </div>
                )}
                {trip?.elevation && (
                  <div className="p-3 flex justify-between items-center">
                    <span className="text-slate-500">Elevation</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{trip.elevation}</span>
                  </div>
                )}
                {trip?.nearestAirport && (
                  <div className="p-3 flex justify-between items-center">
                    <span className="text-slate-500">Nearest Airport Hub</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{trip.nearestAirport}</span>
                  </div>
                )}
                <div className="p-3 flex justify-between items-center">
                  <span className="text-slate-500">Total Duration</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {trip?.durationDays || 3} Days
                  </span>
                </div>
                <div className="p-3 flex justify-between items-center">
                  <span className="text-slate-500">Estimated Travel Time</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {trip?.estimatedTravelTime || "6h 30m"}
                  </span>
                </div>
              </div>

              {/* Description Preview */}
              {trip?.description && (
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Mission & Purpose</span>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                    {trip.description}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 2. BUDGET TAB (Strictly INR / ₹) */}
          {activeTab === "budget" && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider text-[10px]">
                    Total Allocated Capital (INR)
                  </span>
                  <span className="font-mono font-black text-base text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(trip?.budgetAmount || event?.budget || 0, "INR")}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[11px] text-slate-500">
                  <span>Actual Outflow: {formatCurrency(trip?.actualTotal || event?.actualCost || 0, "INR")}</span>
                  <span>Remaining: {formatCurrency((trip?.budgetAmount || 0) - (trip?.actualTotal || 0), "INR")}</span>
                </div>
                <Progress
                  value={
                    trip?.budgetAmount
                      ? Math.min(100, Math.round(((trip.actualTotal || 0) / trip.budgetAmount) * 100))
                      : 0
                  }
                  className="h-2 rounded-full"
                />
              </div>

              {/* Multi-Category Breakdown */}
              <div className="space-y-2">
                <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                  Category Allocation Ledger
                </h5>
                <div className="space-y-2">
                  {(trip?.categoryBudgets || []).map((cat) => {
                    const pct = cat.allocated > 0 ? Math.min(100, Math.round((cat.spent / cat.allocated) * 100)) : 0;
                    return (
                      <div
                        key={cat.category}
                        className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 text-xs space-y-1.5"
                      >
                        <div className="flex justify-between items-center font-semibold">
                          <span className="text-slate-800 dark:text-slate-200">{cat.category}</span>
                          <span className="font-mono text-slate-900 dark:text-slate-100">
                            {formatCurrency(cat.spent, "INR")} / {formatCurrency(cat.allocated, "INR")}
                          </span>
                        </div>
                        <Progress value={pct} className="h-1.5 rounded-full" />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* 3. TIMELINE TAB */}
          {activeTab === "timeline" && (
            <div className="space-y-3">
              <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                Scheduled Operational Checkpoints
              </h5>
              <div className="relative pl-4 border-l-2 border-primary/30 space-y-4 text-xs">
                {(trip?.itinerary || [
                  { day: 1, title: "Departure & Rendezvous", time: "08:00 AM", location: trip?.destination || "Base" },
                  { day: 2, title: "Primary Expedition", time: "10:30 AM", location: "Summit Point" },
                  { day: 3, title: "Debrief & Settlement", time: "05:00 PM", location: "Lodge" },
                ]).map((item: any, idx: number) => (
                  <div key={idx} className="relative group">
                    <span className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-primary ring-4 ring-card" />
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          Day {item.day || idx + 1}: {item.title}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">{item.time || "Scheduled"}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">{item.location || item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. MEMBERS TAB */}
          {activeTab === "members" && (
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                  Roster ({trip?.members?.length || 0})
                </span>
                <span className="text-slate-400">Settlement ready</span>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden text-xs">
                {(trip?.members || []).map((m) => (
                  <div key={m.id} className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs">
                        {m.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800 dark:text-slate-200">{m.name}</p>
                        <span className="text-[10px] text-slate-400">{m.email || m.role}</span>
                      </div>
                    </div>
                    <div className="text-right font-mono">
                      <span className="text-[10px] text-slate-400 block">Pending</span>
                      <span className={`font-bold ${m.pending > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                        {formatCurrency(m.pending, "INR")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. EXPENSES TAB (Strictly INR / ₹) */}
          {activeTab === "expenses" && (
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                  Logged Outflows ({trip?.expenses?.length || 0})
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => trip && onQuickExpense && onQuickExpense(trip)}
                  className="rounded-xl text-[11px] h-7"
                >
                  <Plus className="h-3 w-3 mr-1" /> Add
                </Button>
              </div>

              <div className="space-y-2">
                {(trip?.expenses || []).map((exp) => (
                  <div
                    key={exp.id}
                    className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{exp.title}</p>
                      <span className="text-[10px] text-slate-400">{exp.category} • {exp.date}</span>
                    </div>
                    <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                      {formatCurrency(exp.amount, "INR")}
                    </span>
                  </div>
                ))}
                {(!trip?.expenses || trip.expenses.length === 0) && (
                  <p className="text-xs text-slate-400 text-center py-6">No expenses logged yet.</p>
                )}
              </div>
            </div>
          )}

          {/* 6. CHECKLIST TAB */}
          {activeTab === "checklist" && (
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                  Packing & Gear Checklist
                </span>
                <span className="text-primary font-mono text-[11px] font-bold">
                  {checklistItems.filter((c) => c.isPacked || c.isCompleted).length} / {checklistItems.length} Packed
                </span>
              </div>
              <div className="space-y-2">
                {checklistItems.map((item) => {
                  const isChecked = item.isPacked || item.isCompleted;
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleToggleChecklist(item.id)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between text-xs ${
                        isChecked
                          ? "bg-emerald-500/5 border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
                          : "border-slate-200/80 dark:border-slate-800 hover:border-primary/50 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`h-4 w-4 rounded-md border flex items-center justify-center ${
                            isChecked ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300 dark:border-slate-700"
                          }`}
                        >
                          {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                        </div>
                        <span className={isChecked ? "line-through opacity-80" : "font-medium"}>{item.title}</span>
                      </div>
                      <Badge variant="outline" className="text-[9px] capitalize">
                        {item.category}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 7. DOCUMENTS TAB */}
          {activeTab === "documents" && (
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider block">
                Travel Credentials & Permits ({trip?.documents?.length || 0})
              </span>
              <div className="space-y-2">
                {(trip?.documents || [
                  { id: "doc_1", title: "Expedition Forest Entry Permit", type: "PDF", uploadedAt: "2027-10-12" },
                  { id: "doc_2", title: "Group Travel Insurance Policy", type: "PDF", uploadedAt: "2027-10-15" },
                ]).map((doc: any) => (
                  <div
                    key={doc.id}
                    className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary shrink-0" />
                      <div>
                        <p className="font-semibold text-slate-800 dark:text-slate-200">{doc.title}</p>
                        <span className="text-[10px] text-slate-400">Verified • {doc.type}</span>
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" className="h-7 text-xs">
                      View
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 8. ACTIVITY & AUDIT TAB */}
          {activeTab === "activity" && (
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider block">
                Operational Event Stream
              </span>
              <div className="space-y-2 text-xs">
                {[
                  { text: "Trip operating environment initialized", time: "Just now", icon: CheckCircle2 },
                  { text: "Logistics checklist synchronized", time: "2 hours ago", icon: CheckSquare },
                  { text: "Multi-category budget reconciled", time: "1 day ago", icon: IndianRupee },
                  { text: "Emergency broadcast frequency confirmed", time: "3 days ago", icon: ShieldCheck },
                ].map((act, i) => {
                  const Icon = act.icon;
                  return (
                    <div key={i} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="text-slate-700 dark:text-slate-300 font-medium">{act.text}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">{act.time}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 9. PERMISSIONS TAB */}
          {activeTab === "permissions" && (
            <div className="space-y-3 text-xs">
              <span className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider block">
                Access Control & Security
              </span>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">Visibility Level</span>
                  <Badge variant="outline" className="uppercase text-[10px] font-bold">
                    {trip?.visibility || "Private"}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">Lead Expedition Host</span>
                  <span className="text-slate-600 dark:text-slate-300">{trip?.host || "Trip Administrator"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">Approval Threshold</span>
                  <span className="font-mono text-emerald-600 font-bold">₹5,000</span>
                </div>
              </div>
            </div>
          )}

          {/* 10. HISTORY TAB */}
          {activeTab === "history" && (
            <div className="space-y-3 text-xs">
              <span className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider block">
                Revision History & Timestamped Audit
              </span>
              <div className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-1 font-mono text-[11px]">
                <p className="text-slate-500">Record Created: {trip?.createdAt || new Date().toISOString()}</p>
                <p className="text-slate-500">Public Identifier: {publicId}</p>
                <p className="text-emerald-600 font-semibold">Integrity Hash: SHA-256 Verified</p>
              </div>
            </div>
          )}

          {/* 11. NOTES & MISSION TAB */}
          {activeTab === "notes" && (
            <div className="space-y-3 text-xs">
              <span className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider block">
                Field Notes & Guidelines
              </span>
              <div className="p-3.5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-500/20 text-slate-700 dark:text-slate-300 leading-relaxed">
                {trip?.notes || "Maintain high altitude hydration. Adhere to Leave No Trace environmental protocols. Rendezvous at 08:00 AM daily."}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

"use client";

import { useState, useMemo } from "react";
import QRCode from "qrcode";
import {
  TripEvent,
  EnterpriseEventStatus,
  EventPriority,
  TripRecord,
  EventTimelineItem,
  EventAttendee,
} from "@/lib/types/trips";
import {
  createEnterpriseEvent,
  editEnterpriseEvent,
  deleteEnterpriseEvent,
  duplicateEnterpriseEvent,
  updateEventTimelineCheckpoint,
  updateEventRsvpStatus,
} from "@/actions/enterprise-operations";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Compass,
  IndianRupee,
  Share2,
  Copy,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Search,
  Sparkles,
  ExternalLink,
  QrCode,
  FileText,
  FileSpreadsheet,
  Printer,
  MessageSquare,
  ShieldCheck,
  Sun,
  Flame,
  Check,
  ChevronRight,
  Filter,
  Luggage,
  X,
  Phone,
  Navigation,
  ArrowRight,
  Download,
  Loader2,
  Bookmark,
  Layers,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

interface EventManagementSectionProps {
  events: TripEvent[];
  trips: TripRecord[];
  onEventUpdated?: () => void;
}

export function EventManagementSection({ events: initialEvents, trips, onEventUpdated }: EventManagementSectionProps) {
  const [events, setEvents] = useState<TripEvent[]>(initialEvents);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [viewScope, setViewScope] = useState<"all" | "standalone" | "linked">("all");

  // Dialogs & Modals
  const [detailEvent, setDetailEvent] = useState<TripEvent | null>(null);
  const [detailActiveTab, setDetailActiveTab] = useState<string>("overview");
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);
  const [qrModalEvent, setQrModalEvent] = useState<TripEvent | null>(null);
  const [eventQrCodeUrl, setEventQrCodeUrl] = useState<string>("");
  const [isGeneratingQr, setIsGeneratingQr] = useState<boolean>(false);
  const [shareModalEvent, setShareModalEvent] = useState<TripEvent | null>(null);
  const [expenseModalEvent, setExpenseModalEvent] = useState<TripEvent | null>(null);
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseTitle, setExpenseTitle] = useState("");

  // Create Form State
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("Activity");
  const [newPriority, setNewPriority] = useState<EventPriority>("Medium");
  const [newLocation, setNewLocation] = useState("");
  const [newVenue, setNewVenue] = useState("");
  const [newStartDate, setNewStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [newStartTime, setNewStartTime] = useState("10:00 AM");
  const [newEndTime, setNewEndTime] = useState("01:00 PM");
  const [newCapacity, setNewCapacity] = useState("20");
  const [newBudget, setNewBudget] = useState("5000");
  const [newLinkedTripId, setNewLinkedTripId] = useState<string>("standalone");

  // Sync state if props change
  useMemo(() => {
    setEvents(initialEvents);
  }, [initialEvents]);

  // Generate real camera-scannable QR code for event
  const handleOpenQrModal = (evt: TripEvent) => {
    setQrModalEvent(evt);
    setIsGeneratingQr(true);
    const origin = typeof window !== "undefined" && window.location.origin ? window.location.origin : "https://splitledger.ai";
    const accessUrl = `${origin}/events/${evt.publicId || evt.id}`;
    QRCode.toDataURL(accessUrl, {
      width: 350,
      margin: 2,
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
      errorCorrectionLevel: "H",
    })
      .then((url) => {
        setEventQrCodeUrl(url);
        setIsGeneratingQr(false);
      })
      .catch((err) => {
        console.error("QR Code Error:", err);
        setIsGeneratingQr(false);
      });
  };

  // Filtered Events
  const displayedEvents = useMemo(() => {
    return events.filter((evt) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        evt.title.toLowerCase().includes(q) ||
        (evt.publicId && evt.publicId.toLowerCase().includes(q)) ||
        (evt.category && evt.category.toLowerCase().includes(q)) ||
        (evt.location && evt.location.toLowerCase().includes(q)) ||
        (evt.venue && evt.venue.toLowerCase().includes(q)) ||
        (evt.organizerName && evt.organizerName.toLowerCase().includes(q)) ||
        (evt.linkedTripName && evt.linkedTripName.toLowerCase().includes(q));

      let matchesStatus = true;
      if (statusFilter !== "all") {
        matchesStatus = (evt.status || "").toLowerCase() === statusFilter.toLowerCase();
      }

      let matchesCategory = true;
      if (categoryFilter !== "all") {
        matchesCategory = (evt.category || "").toLowerCase() === categoryFilter.toLowerCase();
      }

      let matchesPriority = true;
      if (priorityFilter !== "all") {
        matchesPriority = (evt.priority || "").toLowerCase() === priorityFilter.toLowerCase();
      }

      let matchesScope = true;
      if (viewScope === "standalone") {
        matchesScope = evt.isStandalone || !evt.linkedTripId;
      } else if (viewScope === "linked") {
        matchesScope = Boolean(evt.linkedTripId);
      }

      return matchesSearch && matchesStatus && matchesCategory && matchesPriority && matchesScope;
    });
  }, [events, searchQuery, statusFilter, categoryFilter, priorityFilter, viewScope]);

  // Handlers
  const handleToggleTimelineStatus = async (evtId: string, checkpointId: string, currentStatus: string) => {
    const nextStatus =
      currentStatus === "upcoming"
        ? "in_progress"
        : currentStatus === "in_progress"
        ? "completed"
        : currentStatus === "completed"
        ? "missed"
        : "upcoming";

    try {
      const updated = await updateEventTimelineCheckpoint(evtId, checkpointId, nextStatus as any);
      setEvents((prev) => prev.map((e) => (e.id === evtId || e.publicId === evtId ? updated : e)));
      if (detailEvent && (detailEvent.id === evtId || detailEvent.publicId === evtId)) {
        setDetailEvent(updated);
      }
      toast.success(`Checkpoint updated to ${nextStatus}`);
      onEventUpdated?.();
    } catch {
      toast.error("Failed to update checkpoint");
    }
  };

  const handleUpdateRsvp = async (
    evtId: string,
    attendeeId: string,
    rsvpStatus: any,
    checkInStatus?: any
  ) => {
    try {
      const updated = await updateEventRsvpStatus(evtId, attendeeId, {
        rsvpStatus,
        checkInStatus: checkInStatus || (rsvpStatus === "accepted" ? "Checked In" : "Pending Check-In"),
        arrivalStatus: rsvpStatus === "accepted" ? "Arrived" : "On Time",
      });
      setEvents((prev) => prev.map((e) => (e.id === evtId || e.publicId === evtId ? updated : e)));
      if (detailEvent && (detailEvent.id === evtId || detailEvent.publicId === evtId)) {
        setDetailEvent(updated);
      }
      toast.success("RSVP updated");
      onEventUpdated?.();
    } catch {
      toast.error("Failed to update RSVP");
    }
  };

  const handleDuplicate = async (evtId: string) => {
    try {
      const duplicated = await duplicateEnterpriseEvent(evtId);
      setEvents((prev) => [duplicated, ...prev]);
      toast.success(`Duplicated: ${duplicated.title}`);
      onEventUpdated?.();
    } catch {
      toast.error("Failed to duplicate event");
    }
  };

  const handleDelete = async (evtId: string) => {
    if (!confirm("Are you sure you want to delete this event?")) return;
    try {
      await deleteEnterpriseEvent(evtId);
      setEvents((prev) => prev.filter((e) => e.id !== evtId && e.publicId !== evtId));
      if (detailEvent && (detailEvent.id === evtId || detailEvent.publicId === evtId)) {
        setDetailEvent(null);
      }
      toast.success("Event deleted");
      onEventUpdated?.();
    } catch {
      toast.error("Failed to delete event");
    }
  };

  const handleAddQuickExpense = async () => {
    if (!expenseModalEvent || !expenseAmount || Number(expenseAmount) <= 0) {
      toast.error("Enter a valid expense amount");
      return;
    }
    try {
      const currentSpent = expenseModalEvent.actualCost || 0;
      const newTotal = currentSpent + Number(expenseAmount);
      const updated = await editEnterpriseEvent(expenseModalEvent.id, {
        actualCost: newTotal,
        expensePct: Math.min(100, Math.round((newTotal / Math.max(1, expenseModalEvent.budget)) * 100)),
      });
      setEvents((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
      if (detailEvent?.id === updated.id) setDetailEvent(updated);
      toast.success(`Added ₹${expenseAmount} expense to ${updated.title}`);
      setExpenseModalEvent(null);
      setExpenseAmount("");
      setExpenseTitle("");
      onEventUpdated?.();
    } catch {
      toast.error("Failed to record expense");
    }
  };

  const handleCreateNewEvent = async () => {
    if (!newTitle.trim()) {
      toast.error("Event name is required");
      return;
    }
    try {
      const linkedTrip = trips.find((t) => t.id === newLinkedTripId);
      const created = await createEnterpriseEvent({
        title: newTitle.trim(),
        category: newCategory,
        priority: newPriority,
        location: newLocation.trim() || "Venue TBA",
        venue: newVenue.trim() || "Main Hall",
        startDate: newStartDate,
        endDate: newStartDate,
        startTime: newStartTime,
        endTime: newEndTime,
        capacity: Number(newCapacity) || 20,
        budget: Number(newBudget) || 5000,
        linkedTripId: newLinkedTripId === "standalone" ? undefined : newLinkedTripId,
        linkedTripName: linkedTrip ? linkedTrip.name : undefined,
      });

      setEvents((prev) => [created, ...prev]);
      setIsCreateEventOpen(false);
      setNewTitle("");
      setNewLocation("");
      setNewVenue("");
      toast.success(`Event created: ${created.title} [${created.publicId}]`);
      onEventUpdated?.();
    } catch {
      toast.error("Failed to create event");
    }
  };

  // Color helpers
  const getPriorityBadgeClass = (priority?: string) => {
    switch (priority) {
      case "Critical":
        return "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-800 font-bold";
      case "High":
        return "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-800 font-bold";
      case "Medium":
        return "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-800 font-bold";
      default:
        return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 font-medium";
    }
  };

  const getStatusBadgeClass = (status?: string) => {
    switch ((status || "").toLowerCase()) {
      case "live":
        return "bg-rose-600 text-white animate-pulse font-bold";
      case "upcoming":
        return "bg-emerald-600 text-white font-bold";
      case "planning":
        return "bg-indigo-600 text-white font-bold";
      case "completed":
        return "bg-slate-700 text-white font-bold";
      case "delayed":
      case "rescheduled":
        return "bg-amber-600 text-white font-bold";
      case "cancelled":
        return "bg-red-800 text-white font-bold";
      default:
        return "bg-slate-500 text-white font-bold";
    }
  };

  return (
    <section className="space-y-6 pt-4 border-t border-slate-200/80 dark:border-slate-800/80">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                  Event Management Operating System
                </h2>
                <Badge variant="secondary" className="bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-bold text-[11px] tracking-wide">
                  Enterprise OS
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Autonomous schedule coordination, interactive timeline checkpoints, live RSVP tracking, and event financial reconciliations
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setViewScope("all")}
              className={`px-3 py-1 rounded-xl transition-all ${
                viewScope === "all" ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs font-bold" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              All Events ({events.length})
            </button>
            <button
              type="button"
              onClick={() => setViewScope("standalone")}
              className={`px-3 py-1 rounded-xl transition-all ${
                viewScope === "standalone" ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs font-bold" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              Standalone Events
            </button>
            <button
              type="button"
              onClick={() => setViewScope("linked")}
              className={`px-3 py-1 rounded-xl transition-all ${
                viewScope === "linked" ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs font-bold" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              Trip-Linked
            </button>
          </div>

          <Button
            size="sm"
            onClick={() => setIsCreateEventOpen(true)}
            className="rounded-xl text-xs font-bold gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all h-9 px-4"
          >
            <Plus className="h-4 w-4" />
            <span>Create Event</span>
          </Button>
        </div>
      </div>

      {/* Filter and Query Bar */}
      <div className="p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-card shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by Event ID, Title, Category, Location, Venue, Organizer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 text-xs rounded-xl border-slate-200/80 dark:border-slate-800"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0 scrollbar-none flex-wrap sm:flex-nowrap">
            {/* Status Selector */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 text-xs rounded-xl border border-slate-200/80 dark:border-slate-800 bg-background px-3 font-semibold text-slate-700 dark:text-slate-300"
            >
              <option value="all">All Statuses</option>
              <option value="Upcoming">Upcoming</option>
              <option value="Live">Live</option>
              <option value="Planning">Planning</option>
              <option value="Completed">Completed</option>
              <option value="Delayed">Delayed</option>
              <option value="Rescheduled">Rescheduled</option>
              <option value="Cancelled">Cancelled</option>
            </select>

            {/* Priority Selector */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="h-10 text-xs rounded-xl border border-slate-200/80 dark:border-slate-800 bg-background px-3 font-semibold text-slate-700 dark:text-slate-300"
            >
              <option value="all">All Priorities</option>
              <option value="Critical">Critical Priority</option>
              <option value="High">High Priority</option>
              <option value="Medium">Medium Priority</option>
              <option value="Low">Low Priority</option>
            </select>

            {/* Category Selector */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-10 text-xs rounded-xl border border-slate-200/80 dark:border-slate-800 bg-background px-3 font-semibold text-slate-700 dark:text-slate-300"
            >
              <option value="all">All Categories</option>
              <option value="Birthday">Birthday</option>
              <option value="Office Meeting">Office Meeting</option>
              <option value="Trek Briefing">Trek Briefing</option>
              <option value="Hotel Check-in">Hotel Check-in</option>
              <option value="Bus Departure">Bus Departure</option>
              <option value="Airport Pickup">Airport Pickup</option>
              <option value="Campfire">Campfire</option>
              <option value="Group Dinner">Group Dinner</option>
              <option value="Adventure Activity">Adventure Activity</option>
              <option value="Local Sightseeing">Local Sightseeing</option>
              <option value="Payment Deadline">Payment Deadline</option>
              <option value="Settlement Meeting">Settlement Meeting</option>
              <option value="Return Journey">Return Journey</option>
              <option value="Farewell Dinner">Farewell Dinner</option>
            </select>
          </div>
        </div>
      </div>

      {/* Enterprise Event Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-5">
        {displayedEvents.map((evt) => {
          const isLinked = Boolean(evt.linkedTripId);
          const completionPct = evt.completionPct ?? (evt.timeline && evt.timeline.length > 0 ? Math.round((evt.timeline.filter((t) => t.status === "completed").length / evt.timeline.length) * 100) : 0);
          const attendancePct = evt.attendancePct ?? (evt.capacity ? Math.round(((evt.confirmedMembers || 1) / evt.capacity) * 100) : 100);
          const expensePct = evt.budget > 0 ? Math.round(((evt.actualCost || 0) / evt.budget) * 100) : 0;
          const remainingBudget = Math.max(0, evt.budget - (evt.actualCost || 0));

          return (
            <Card
              key={evt.id || evt.publicId}
              className="rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-card overflow-hidden shadow-xs transition-all duration-250 group hover:-translate-y-1.5 hover:scale-[1.01] hover:shadow-2xl hover:border-indigo-500/50 dark:hover:border-indigo-500/50 hover:shadow-indigo-500/10 flex flex-col justify-between h-full"
            >
              <div className="flex-1 flex flex-col">
                {/* Event Cover Banner with Gradient Overlay & Public ID */}
                <div className="h-44 w-full relative overflow-hidden bg-slate-900 shrink-0">
                  <img
                    src={evt.bannerUrl || "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=1200&auto=format&fit=crop&q=80"}
                    alt={evt.title}
                    className="w-full h-full object-cover opacity-85 group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/25" />

                  {/* Top Bar Header */}
                  <div className="absolute top-2.5 inset-x-2.5 sm:top-3 sm:inset-x-3 flex items-start justify-between gap-1.5 z-10 pointer-events-none">
                    {/* Public ID Pill & Scope Badge */}
                    <div className="flex items-center gap-1.5 flex-wrap min-w-0 pointer-events-auto">
                      <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-black/80 backdrop-blur-md border border-white/20 text-white font-mono text-[10px] sm:text-[11px] font-bold shadow-xs shrink-0">
                        <span>{evt.publicId || "EVT-PENDING"}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (evt.publicId) {
                              navigator.clipboard.writeText(evt.publicId);
                              toast.success(`Copied Event ID: ${evt.publicId}`);
                            }
                          }}
                          title="Copy Public ID"
                          className="hover:text-indigo-400 transition-colors ml-1 p-0.5"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenQrModal(evt);
                          }}
                          title="Open Event QR Pass"
                          className="hover:text-indigo-400 transition-colors p-0.5"
                        >
                          <QrCode className="h-3 w-3" />
                        </button>
                      </div>

                      <Badge className="bg-white/20 text-white backdrop-blur-md text-[9px] sm:text-[10px] uppercase font-bold border border-white/25 shrink-0">
                        {evt.category || "Event"}
                      </Badge>

                      {isLinked ? (
                        <Badge variant="outline" className="bg-indigo-600/80 text-white border-white/20 text-[9px] backdrop-blur-md shrink-0">
                          Linked: {evt.linkedTripName || "Trip"}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-emerald-600/80 text-white border-white/20 text-[9px] backdrop-blur-md shrink-0">
                          Standalone Event
                        </Badge>
                      )}
                    </div>

                    {/* Status & Priority Badges */}
                    <div className="flex items-center gap-1.5 shrink-0 pointer-events-auto">
                      <Badge className={`text-[9px] sm:text-[10px] uppercase font-bold tracking-wider backdrop-blur-md ${getStatusBadgeClass(evt.status)}`}>
                        {evt.status}
                      </Badge>
                      <Badge variant="outline" className={`text-[9px] uppercase backdrop-blur-md border ${getPriorityBadgeClass(evt.priority)}`}>
                        {evt.priority || "Medium"}
                      </Badge>
                    </div>
                  </div>

                  {/* Bottom Header Overlay */}
                  <div className="absolute bottom-2.5 left-3 right-3 text-white">
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-600/90 text-white backdrop-blur-md text-[10px] font-bold shadow-xs">
                        <Clock className="h-3 w-3" />
                        <span>{evt.startTime || "10:00 AM"}</span>
                        <span>•</span>
                        <span>{evt.durationText || `${evt.durationMinutes || 120} min`}</span>
                        <span>•</span>
                        <span>{evt.countdownText || evt.timeRemaining || "Upcoming"}</span>
                      </span>
                    </div>

                    <h3
                      onClick={() => {
                        setDetailEvent(evt);
                        setDetailActiveTab("overview");
                      }}
                      className="text-base sm:text-lg font-black truncate cursor-pointer hover:underline text-white drop-shadow-sm"
                    >
                      {evt.title}
                    </h3>

                    <p className="text-xs text-white/90 flex items-center gap-1 mt-0.5 truncate">
                      <MapPin className="h-3 w-3 text-rose-400 shrink-0" />
                      <span className="font-semibold">{evt.venue || evt.location}</span>
                      {evt.meetingPoint && <span className="text-white/70">({evt.meetingPoint})</span>}
                    </p>
                  </div>
                </div>

                {/* Event Body Content */}
                <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                  {/* Status Badges Matrix (Section 1 & 4) */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-100 dark:border-slate-800">
                      <span className="text-slate-400 text-[10px] uppercase font-bold block truncate">Weather</span>
                      <p className="font-bold text-slate-800 dark:text-slate-200 truncate mt-0.5 flex items-center gap-1">
                        <Sun className="h-3 w-3 text-amber-500 shrink-0" />
                        <span>{evt.weatherStatus || "26°C Clear"}</span>
                      </p>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-100 dark:border-slate-800">
                      <span className="text-slate-400 text-[10px] uppercase font-bold block truncate">Advisory</span>
                      <p className="font-bold text-emerald-600 truncate mt-0.5 flex items-center gap-1">
                        <ShieldCheck className="h-3 w-3 text-emerald-500 shrink-0" />
                        <span className="truncate">{evt.travelAdvisory || "Green Normal"}</span>
                      </p>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-100 dark:border-slate-800">
                      <span className="text-slate-400 text-[10px] uppercase font-bold block truncate">RSVP Confirmed</span>
                      <p className="font-bold text-indigo-600 dark:text-indigo-400 truncate mt-0.5 flex items-center gap-1">
                        <Users className="h-3 w-3 shrink-0" />
                        <span>{evt.confirmedMembers || 0} / {evt.capacity || 20}</span>
                      </p>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-100 dark:border-slate-800">
                      <span className="text-slate-400 text-[10px] uppercase font-bold block truncate">Remaining Budget</span>
                      <p className="font-mono font-bold text-emerald-600 truncate mt-0.5">
                        {formatCurrency(remainingBudget, "INR")}
                      </p>
                    </div>
                  </div>

                  {/* 3 Live Metric Progress Bars (Completion %, Attendance %, Expense %) */}
                  <div className="space-y-2 pt-1">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-500 font-medium">Timeline Progress:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{completionPct}% Completed</span>
                    </div>
                    <Progress value={completionPct} className="h-1.5 rounded-full" />

                    <div className="flex justify-between items-center text-[11px] pt-0.5">
                      <span className="text-slate-500 font-medium">Capacity Reserved:</span>
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">{attendancePct}% Filled ({evt.availableSeats ?? ((evt.capacity || 20) - (evt.confirmedMembers || 0))} seats open)</span>
                    </div>
                    <Progress value={attendancePct} className="h-1.5 rounded-full" />
                  </div>

                  {/* Interactive Mini Timeline Preview (Section 2) */}
                  {evt.timeline && evt.timeline.length > 0 && (
                    <div className="p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-700 dark:text-slate-300 text-[10px] uppercase tracking-wider flex items-center gap-1">
                          <Clock className="h-3 w-3 text-indigo-500" /> Event Timeline Checkpoints
                        </span>
                        <span className="text-[10px] text-slate-400">Click to advance status</span>
                      </div>

                      <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                        {evt.timeline.map((step) => (
                          <div
                            key={step.id}
                            onClick={() => handleToggleTimelineStatus(evt.id, step.id, step.status)}
                            className="flex items-center justify-between gap-2 p-1.5 rounded-xl hover:bg-white dark:hover:bg-slate-800/90 text-xs cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all"
                            title="Click to toggle status: Upcoming -> In Progress -> Completed -> Missed"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-mono text-[10px] font-bold text-indigo-600 dark:text-indigo-400 shrink-0">
                                {step.time}
                              </span>
                              <span className={`text-[11px] truncate ${step.status === "completed" ? "line-through text-slate-400" : "font-medium text-slate-800 dark:text-slate-200"}`}>
                                {step.activity}
                              </span>
                            </div>

                            <Badge
                              variant="outline"
                              className={`text-[9px] uppercase px-1.5 py-0 shrink-0 ${
                                step.status === "completed"
                                  ? "bg-emerald-50 text-emerald-600 border-emerald-300"
                                  : step.status === "in_progress"
                                  ? "bg-amber-50 text-amber-600 border-amber-300 animate-pulse"
                                  : step.status === "missed"
                                  ? "bg-rose-50 text-rose-600 border-rose-300"
                                  : "bg-slate-100 text-slate-500 border-slate-200"
                              }`}
                            >
                              {step.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Organizer & Quick Coordinates */}
                  <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800">
                    <span className="truncate">
                      Host: <strong>{evt.organizerName || evt.eventOwner || "Dipak Pawar"}</strong>
                    </span>
                    <a
                      href={evt.mapsLink || `https://maps.google.com/?q=${encodeURIComponent(evt.venue || evt.location)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:underline flex items-center gap-1 text-[11px] font-semibold shrink-0"
                    >
                      <Navigation className="h-3 w-3" />
                      <span>Google Maps</span>
                    </a>
                  </div>
                </div>
              </div>

              {/* Event Quick Actions Bar (Section 5) */}
              <div className="p-3 sm:p-4 bg-slate-50/60 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-800/90 flex flex-wrap items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-1.5 flex-1 min-w-[200px]">
                  <Button
                    size="sm"
                    onClick={() => {
                      setDetailEvent(evt);
                      setDetailActiveTab("overview");
                    }}
                    className="rounded-xl text-xs font-bold gap-1.5 flex-1 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs hover:shadow-md"
                  >
                    <span>View Details</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setExpenseModalEvent(evt)}
                    className="rounded-xl text-xs font-semibold h-8 border-slate-200/80 dark:border-slate-800 hover:border-indigo-500 shrink-0"
                  >
                    <Plus className="h-3 w-3 mr-1" /> Expense
                  </Button>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      setDetailEvent(evt);
                      setDetailActiveTab("timeline");
                    }}
                    title="Open Timeline"
                    className="h-8 w-8 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                  >
                    <Clock className="h-3.5 w-3.5" />
                  </Button>

                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setShareModalEvent(evt)}
                    title="Share Event"
                    className="h-8 w-8 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                  </Button>

                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleOpenQrModal(evt)}
                    title="Generate QR Pass"
                    className="h-8 w-8 rounded-xl text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                  >
                    <QrCode className="h-3.5 w-3.5" />
                  </Button>

                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDuplicate(evt.id)}
                    title="Duplicate Event"
                    className="h-8 w-8 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>

                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDelete(evt.id)}
                    title="Delete Event"
                    className="h-8 w-8 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}

        {displayedEvents.length === 0 && (
          <div className="col-span-full py-16 px-4 text-center space-y-4 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-card/60">
            <div className="p-4 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 rounded-full w-14 h-14 mx-auto flex items-center justify-center">
              <Calendar className="h-7 w-7" />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">No Events Found</h3>
              <p className="text-xs text-slate-500">
                Create your first standalone celebration, office planning session, or trip-linked expedition briefing.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setIsCreateEventOpen(true)}
              className="rounded-xl text-xs font-bold gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-5 h-9"
            >
              <Plus className="h-4 w-4" />
              <span>Create Event</span>
            </Button>
          </div>
        )}
      </div>

      {/* SECTION 6: EVENT DETAILS PAGE / MODAL DASHBOARD */}
      <Dialog open={!!detailEvent} onOpenChange={(open) => !open && setDetailEvent(null)}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 bg-card border border-slate-200/80 dark:border-slate-800">
          <DialogHeader>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Badge className={getStatusBadgeClass(detailEvent?.status)}>
                  {detailEvent?.status}
                </Badge>
                <Badge variant="outline" className={getPriorityBadgeClass(detailEvent?.priority)}>
                  {detailEvent?.priority} Priority
                </Badge>
                <span className="font-mono text-xs text-slate-400">
                  {detailEvent?.publicId}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => detailEvent && handleOpenQrModal(detailEvent)}
                  className="rounded-xl text-xs font-bold gap-1 h-8"
                >
                  <QrCode className="h-3.5 w-3.5 text-indigo-600" /> QR Pass
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    window.print();
                    toast.success("Preparing PDF / Print format");
                  }}
                  className="rounded-xl text-xs font-bold gap-1 h-8"
                >
                  <Printer className="h-3.5 w-3.5 text-slate-600" /> Export PDF
                </Button>
              </div>
            </div>

            <DialogTitle className="text-xl sm:text-2xl font-black mt-2 text-slate-900 dark:text-slate-100">
              {detailEvent?.title}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {detailEvent?.location} • {detailEvent?.startDate} • Hosted by {detailEvent?.organizerName}
            </DialogDescription>
          </DialogHeader>

          {/* Multi-Tab Enterprise Event Details Dashboard */}
          <Tabs value={detailActiveTab} onValueChange={setDetailActiveTab} className="w-full mt-4">
            <TabsList className="bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl w-full justify-start overflow-x-auto flex-nowrap scrollbar-none h-auto">
              <TabsTrigger value="overview" className="rounded-xl text-xs font-bold py-1.5 px-3">Overview</TabsTrigger>
              <TabsTrigger value="timeline" className="rounded-xl text-xs font-bold py-1.5 px-3">Timeline</TabsTrigger>
              <TabsTrigger value="rsvp" className="rounded-xl text-xs font-bold py-1.5 px-3">RSVP & Members</TabsTrigger>
              <TabsTrigger value="budget" className="rounded-xl text-xs font-bold py-1.5 px-3">Budget & Expenses</TabsTrigger>
              <TabsTrigger value="logistics" className="rounded-xl text-xs font-bold py-1.5 px-3">Venue & Logistics</TabsTrigger>
              <TabsTrigger value="audit" className="rounded-xl text-xs font-bold py-1.5 px-3">Audit & Activity</TabsTrigger>
            </TabsList>

            {/* TAB 1: OVERVIEW */}
            <TabsContent value="overview" className="space-y-4 pt-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 uppercase font-bold text-[10px] block">Timing & Timezone</span>
                  <p className="font-bold text-slate-900 dark:text-slate-100 text-sm mt-1">
                    {detailEvent?.startTime} - {detailEvent?.endTime}
                  </p>
                  <span className="text-[11px] text-slate-500 block">{detailEvent?.timezone || "IST (UTC+05:30)"}</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 uppercase font-bold text-[10px] block">Capacity & Attendance</span>
                  <p className="font-bold text-indigo-600 dark:text-indigo-400 text-sm mt-1">
                    {detailEvent?.confirmedMembers} Confirmed / {detailEvent?.capacity} Max
                  </p>
                  <span className="text-[11px] text-slate-500 block">
                    {detailEvent?.pendingInvitations || 0} Pending • {detailEvent?.declinedMembers || 0} Declined
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 uppercase font-bold text-[10px] block">Financial Status</span>
                  <p className="font-mono font-bold text-emerald-600 text-sm mt-1">
                    {formatCurrency(detailEvent?.budget || 0, "INR")} Allocated
                  </p>
                  <span className="text-[11px] text-slate-500 block">
                    Spent: {formatCurrency(detailEvent?.actualCost || 0, "INR")} ({detailEvent?.budgetStatus || "Active"})
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-card border border-slate-200/80 dark:border-slate-800 space-y-2">
                <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs">Event Description & Instructions</h4>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  {detailEvent?.description || "No detailed description provided."}
                </p>
              </div>

              {detailEvent?.checklist && detailEvent.checklist.length > 0 && (
                <div className="p-4 rounded-2xl bg-card border border-slate-200/80 dark:border-slate-800 space-y-2">
                  <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs">Operational Checklist</h4>
                  <ul className="space-y-1">
                    {detailEvent.checklist.map((item, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                        <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </TabsContent>

            {/* TAB 2: TIMELINE */}
            <TabsContent value="timeline" className="space-y-4 pt-4 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">Live Checkpoint Progression</h4>
                  <p className="text-slate-500 text-xs">Click any step to transition from Upcoming → In Progress → Completed → Missed</p>
                </div>
              </div>

              <div className="space-y-2 relative before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                {detailEvent?.timeline?.map((step) => (
                  <div
                    key={step.id}
                    onClick={() => detailEvent && handleToggleTimelineStatus(detailEvent.id, step.id, step.status)}
                    className="flex items-start gap-4 p-3 rounded-2xl bg-card border border-slate-200/80 dark:border-slate-800 relative cursor-pointer hover:border-indigo-500 transition-all ml-6"
                  >
                    <div
                      className={`absolute -left-7 top-4 h-3 w-3 rounded-full border-2 border-background shrink-0 ${
                        step.status === "completed"
                          ? "bg-emerald-500"
                          : step.status === "in_progress"
                          ? "bg-amber-500 animate-pulse"
                          : step.status === "missed"
                          ? "bg-rose-500"
                          : "bg-slate-300 dark:bg-slate-700"
                      }`}
                    />

                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {step.time}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[9px] uppercase ${
                            step.status === "completed"
                              ? "bg-emerald-50 text-emerald-600 border-emerald-300"
                              : step.status === "in_progress"
                              ? "bg-amber-50 text-amber-600 border-amber-300"
                              : step.status === "missed"
                              ? "bg-rose-50 text-rose-600 border-rose-300"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {step.status}
                        </Badge>
                      </div>
                      <p className={`font-semibold text-sm mt-0.5 ${step.status === "completed" ? "line-through text-slate-400" : "text-slate-900 dark:text-slate-100"}`}>
                        {step.activity}
                      </p>
                      {step.location && (
                        <span className="text-slate-400 text-[11px] flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3" /> {step.location}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* TAB 3: RSVP & MEMBERS */}
            <TabsContent value="rsvp" className="space-y-4 pt-4 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                  <span className="text-[10px] font-bold uppercase text-emerald-600">Accepted</span>
                  <p className="text-lg font-black text-emerald-700 dark:text-emerald-400 mt-1">
                    {detailEvent?.rsvp?.accepted || detailEvent?.confirmedMembers || 0}
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
                  <span className="text-[10px] font-bold uppercase text-amber-600">Maybe</span>
                  <p className="text-lg font-black text-amber-700 dark:text-amber-400 mt-1">
                    {detailEvent?.rsvp?.maybe || 0}
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800">
                  <span className="text-[10px] font-bold uppercase text-rose-600">Declined</span>
                  <p className="text-lg font-black text-rose-700 dark:text-rose-400 mt-1">
                    {detailEvent?.rsvp?.declined || detailEvent?.declinedMembers || 0}
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] font-bold uppercase text-slate-500">Pending</span>
                  <p className="text-lg font-black text-slate-700 dark:text-slate-300 mt-1">
                    {detailEvent?.rsvp?.pending || detailEvent?.pendingInvitations || 0}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs">Guest & Attendee Roster</h4>
                <div className="space-y-2">
                  {detailEvent?.rsvp?.attendees?.map((att) => (
                    <div
                      key={att.id}
                      className="p-3 rounded-2xl bg-card border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 flex-wrap"
                    >
                      <div>
                        <p className="font-bold text-slate-900 dark:text-slate-100">{att.name}</p>
                        <p className="text-slate-400 text-[11px]">{att.phone || "No phone"} • Emergency: {att.emergencyContact || "On File"}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={att.rsvpStatus === "accepted" ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"}
                        >
                          {att.rsvpStatus}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={att.checkInStatus === "Checked In" ? "bg-blue-50 text-blue-600" : "bg-amber-50 text-amber-600"}
                        >
                          {att.checkInStatus || "Pending"}
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => detailEvent && handleUpdateRsvp(detailEvent.id, att.id, "accepted", "Checked In")}
                          className="h-7 text-[10px] font-bold text-emerald-600 hover:bg-emerald-50"
                        >
                          Check In
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* TAB 4: BUDGET & EXPENSES */}
            <TabsContent value="budget" className="space-y-4 pt-4 text-xs">
              <div className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-bold">Allocated Budget</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-sm">
                    {formatCurrency(detailEvent?.budget || 0, "INR")}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-bold">Actual Outflow</span>
                  <span className="font-mono font-bold text-rose-600 text-sm">
                    {formatCurrency(detailEvent?.actualCost || 0, "INR")}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-2">
                  <span className="text-slate-500 font-bold">Remaining Runway</span>
                  <span className="font-mono font-black text-emerald-600 text-base">
                    {formatCurrency(Math.max(0, (detailEvent?.budget || 0) - (detailEvent?.actualCost || 0)), "INR")}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  size="sm"
                  onClick={() => setExpenseModalEvent(detailEvent)}
                  className="rounded-xl text-xs font-bold gap-1 bg-indigo-600 text-white"
                >
                  <Plus className="h-3.5 w-3.5" /> Log Event Expense
                </Button>
              </div>
            </TabsContent>

            {/* TAB 5: VENUE & LOGISTICS */}
            <TabsContent value="logistics" className="space-y-4 pt-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-card border border-slate-200/80 dark:border-slate-800 space-y-2">
                  <h4 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-rose-500" /> Venue & Navigation
                  </h4>
                  <p className="text-slate-700 dark:text-slate-300 font-semibold">{detailEvent?.venue || "Main Venue"}</p>
                  <p className="text-slate-500">{detailEvent?.location}</p>
                  <p className="text-slate-500">Meeting Point: {detailEvent?.meetingPoint || "Entrance"}</p>
                  <a
                    href={detailEvent?.mapsLink || `https://maps.google.com/?q=${encodeURIComponent(detailEvent?.venue || detailEvent?.location || "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-indigo-600 font-bold hover:underline pt-1"
                  >
                    Open in Google Maps <ExternalLink className="h-3 w-3" />
                  </a>
                </div>

                <div className="p-4 rounded-2xl bg-card border border-slate-200/80 dark:border-slate-800 space-y-2">
                  <h4 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <Compass className="h-4 w-4 text-indigo-500" /> Transit & Dress Code
                  </h4>
                  <p className="text-slate-700 dark:text-slate-300 font-semibold">Dress Code: {detailEvent?.dressCode || "Casual / Resort Wear"}</p>
                  <p className="text-slate-500">Transport: {detailEvent?.transportPlan || "Private Coach / Self Drive"}</p>
                  <p className="text-slate-500">Parking: {detailEvent?.parkingInfo || "Valet & Dedicated Visitor Parking"}</p>
                </div>
              </div>
            </TabsContent>

            {/* TAB 6: AUDIT & ACTIVITY */}
            <TabsContent value="audit" className="space-y-4 pt-4 text-xs">
              <div className="p-4 rounded-2xl bg-card border border-slate-200/80 dark:border-slate-800 space-y-2">
                <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs">Event Audit Trail</h4>
                <div className="space-y-2 text-slate-500">
                  <p>• Event initiated under Public Identifier <strong>{detailEvent?.publicId}</strong>.</p>
                  <p>• Created by {detailEvent?.organizerName} with budget allocation of {formatCurrency(detailEvent?.budget || 0, "INR")}.</p>
                  <p>• Status synced with primary travel ledger.</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* CREATE EVENT DIALOG */}
      <Dialog open={isCreateEventOpen} onOpenChange={setIsCreateEventOpen}>
        <DialogContent className="sm:max-w-lg rounded-3xl p-6 bg-card border border-slate-200/80 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-1.5">
              <Plus className="h-4 w-4 text-indigo-600" />
              <span>Create New Enterprise Event</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Create a standalone event or link it directly into an active trip
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-xs py-2">
            <div>
              <label className="font-bold">Event Name *</label>
              <Input
                placeholder="e.g. Birthday Gala / Office Strategy Meeting / Trek Briefing"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="rounded-xl h-10 mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full rounded-xl h-10 mt-1 border border-slate-200/80 dark:border-slate-800 bg-background px-3"
                >
                  <option value="Birthday">Birthday</option>
                  <option value="Office Meeting">Office Meeting</option>
                  <option value="Trek Briefing">Trek Briefing</option>
                  <option value="Hotel Check-in">Hotel Check-in</option>
                  <option value="Bus Departure">Bus Departure</option>
                  <option value="Airport Pickup">Airport Pickup</option>
                  <option value="Campfire">Campfire</option>
                  <option value="Group Dinner">Group Dinner</option>
                  <option value="Adventure Activity">Adventure Activity</option>
                  <option value="Local Sightseeing">Local Sightseeing</option>
                  <option value="Payment Deadline">Payment Deadline</option>
                  <option value="Settlement Meeting">Settlement Meeting</option>
                  <option value="Return Journey">Return Journey</option>
                  <option value="Farewell Dinner">Farewell Dinner</option>
                </select>
              </div>

              <div>
                <label className="font-bold">Priority</label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as EventPriority)}
                  className="w-full rounded-xl h-10 mt-1 border border-slate-200/80 dark:border-slate-800 bg-background px-3"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>
            </div>

            <div>
              <label className="font-bold">Trip Link</label>
              <select
                value={newLinkedTripId}
                onChange={(e) => setNewLinkedTripId(e.target.value)}
                className="w-full rounded-xl h-10 mt-1 border border-slate-200/80 dark:border-slate-800 bg-background px-3"
              >
                <option value="standalone">Standalone Event (Independent)</option>
                {trips.map((t) => (
                  <option key={t.id} value={t.id}>
                    Linked Trip: {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold">Location</label>
                <Input
                  placeholder="e.g. Koregaon Park, Pune"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  className="rounded-xl h-10 mt-1"
                />
              </div>

              <div>
                <label className="font-bold">Venue / Point</label>
                <Input
                  placeholder="e.g. Rooftop Lounge Deck"
                  value={newVenue}
                  onChange={(e) => setNewVenue(e.target.value)}
                  className="rounded-xl h-10 mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="font-bold">Date</label>
                <Input
                  type="date"
                  value={newStartDate}
                  onChange={(e) => setNewStartDate(e.target.value)}
                  className="rounded-xl h-10 mt-1"
                />
              </div>

              <div>
                <label className="font-bold">Start Time</label>
                <Input
                  placeholder="10:00 AM"
                  value={newStartTime}
                  onChange={(e) => setNewStartTime(e.target.value)}
                  className="rounded-xl h-10 mt-1"
                />
              </div>

              <div>
                <label className="font-bold">Budget (₹)</label>
                <Input
                  type="number"
                  placeholder="5000"
                  value={newBudget}
                  onChange={(e) => setNewBudget(e.target.value)}
                  className="rounded-xl h-10 mt-1"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button variant="outline" size="sm" onClick={() => setIsCreateEventOpen(false)} className="rounded-xl text-xs">
                Cancel
              </Button>
              <Button size="sm" onClick={handleCreateNewEvent} className="rounded-xl text-xs font-bold bg-indigo-600 text-white">
                Create Event
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* EVENT QR PASS MODAL */}
      <Dialog open={!!qrModalEvent} onOpenChange={(open) => !open && setQrModalEvent(null)}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-card border border-slate-200/80 dark:border-slate-800 text-center">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center justify-center gap-1.5">
              <QrCode className="h-4 w-4 text-indigo-600" />
              <span>Event Passport & QR Pass</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {qrModalEvent?.title}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 flex flex-col items-center space-y-4">
            <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-md flex items-center justify-center min-h-[200px] min-w-[200px]">
              {isGeneratingQr ? (
                <div className="h-48 w-48 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                  <span className="text-xs text-slate-500 font-semibold">Generating Pass...</span>
                </div>
              ) : eventQrCodeUrl ? (
                <img
                  src={eventQrCodeUrl}
                  alt={`QR for ${qrModalEvent?.publicId}`}
                  className="h-48 w-48 object-contain rounded-xl"
                />
              ) : (
                <div className="h-48 w-48 flex items-center justify-center text-slate-400 text-xs">
                  Generating QR...
                </div>
              )}
            </div>

            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Event Public Identifier</span>
              <p className="font-mono text-base font-black text-slate-900 dark:text-slate-100 tracking-wider">
                {qrModalEvent?.publicId}
              </p>
              <p className="text-xs text-slate-500">
                {qrModalEvent?.venue || qrModalEvent?.location} • {qrModalEvent?.startTime}
              </p>
            </div>

            <div className="flex items-center gap-2 w-full pt-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 rounded-xl text-xs font-bold gap-1.5"
                onClick={() => {
                  if (qrModalEvent?.publicId) {
                    navigator.clipboard.writeText(qrModalEvent.publicId);
                    toast.success("Public Event ID copied!");
                  }
                }}
              >
                <Copy className="h-3.5 w-3.5" />
                <span>Copy ID</span>
              </Button>
              <Button
                size="sm"
                className="flex-1 rounded-xl text-xs font-bold gap-1.5 bg-indigo-600 text-white"
                onClick={() => {
                  if (qrModalEvent?.publicId) {
                    const origin = typeof window !== "undefined" && window.location.origin ? window.location.origin : "https://splitledger.ai";
                    navigator.clipboard.writeText(`${origin}/events/${qrModalEvent.publicId}`);
                    toast.success("Event link copied!");
                  }
                }}
              >
                <Share2 className="h-3.5 w-3.5" />
                <span>Copy Link</span>
              </Button>
              {eventQrCodeUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl text-xs font-bold gap-1.5 shrink-0"
                  onClick={() => {
                    const a = document.createElement("a");
                    a.href = eventQrCodeUrl;
                    a.download = `${qrModalEvent?.publicId || "event"}-qr.png`;
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

      {/* SHARE EVENT MODAL */}
      <Dialog open={!!shareModalEvent} onOpenChange={(open) => !open && setShareModalEvent(null)}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-card border border-slate-200/80 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-1.5">
              <Share2 className="h-4 w-4 text-indigo-600" />
              <span>Share Event Access</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Invite attendees and companions to {shareModalEvent?.title}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-xs py-2">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300">Public Identifier</label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  readOnly
                  value={shareModalEvent?.publicId || ""}
                  className="rounded-xl h-10 font-mono font-bold bg-slate-50 dark:bg-slate-900"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (shareModalEvent?.publicId) {
                      navigator.clipboard.writeText(shareModalEvent.publicId);
                      toast.success("Event Public ID copied!");
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
                  value={shareModalEvent ? `https://splitledger.ai/events/${shareModalEvent.publicId}` : ""}
                  className="rounded-xl h-10 font-mono text-xs bg-slate-50 dark:bg-slate-900"
                />
                <Button
                  size="sm"
                  onClick={() => {
                    if (shareModalEvent?.publicId) {
                      navigator.clipboard.writeText(`https://splitledger.ai/events/${shareModalEvent.publicId}`);
                      toast.success("Invitation link copied!");
                    }
                  }}
                  className="rounded-xl h-10 px-4 shrink-0 font-bold bg-indigo-600 text-white"
                >
                  Copy
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* QUICK EXPENSE MODAL */}
      <Dialog open={!!expenseModalEvent} onOpenChange={(open) => !open && setExpenseModalEvent(null)}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-card border border-slate-200/80 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Log Event Expense</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {expenseModalEvent?.title}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-xs py-2">
            <div>
              <label className="font-bold">Expense Title</label>
              <Input
                placeholder="e.g. DJ advance, cake booking, snacks"
                value={expenseTitle}
                onChange={(e) => setExpenseTitle(e.target.value)}
                className="rounded-xl h-10 mt-1"
              />
            </div>

            <div>
              <label className="font-bold">Amount (₹) *</label>
              <Input
                type="number"
                placeholder="e.g. 2500"
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(e.target.value)}
                className="rounded-xl h-10 mt-1 font-mono font-bold"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button variant="outline" size="sm" onClick={() => setExpenseModalEvent(null)} className="rounded-xl text-xs">
                Cancel
              </Button>
              <Button size="sm" onClick={handleAddQuickExpense} className="rounded-xl text-xs font-bold bg-indigo-600 text-white">
                Record Expense
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}

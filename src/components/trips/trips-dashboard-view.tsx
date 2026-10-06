"use client";

import { useState } from "react";
import {
  TripDashboardMetrics,
  TripRecord,
  EventRecord,
  TripCategory,
  EventCategory,
} from "@/lib/types/trips";
import {
  createTrip,
  deleteTrip,
  archiveTrip,
  duplicateTrip,
  createEvent,
  deleteEvent,
  addPlannedExpense,
  deletePlannedExpense,
  addChecklistItem,
  toggleChecklistItem,
  deleteChecklistItem,
} from "@/actions/trips";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Compass,
  Calendar,
  MapPin,
  CheckSquare,
  DollarSign,
  Plus,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  TrendingUp,
  Sparkles,
  Trash2,
  Copy,
  Archive,
  FolderPlus,
  CalendarPlus,
  FileSpreadsheet,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

interface TripsDashboardViewProps {
  initialMetrics: TripDashboardMetrics;
}

export function TripsDashboardView({ initialMetrics }: TripsDashboardViewProps) {
  const [metrics, setMetrics] = useState<TripDashboardMetrics>(initialMetrics);
  const [activeTab, setActiveTab] = useState("trips");

  // Create Trip Modal State
  const [isCreateTripOpen, setIsCreateTripOpen] = useState(false);
  const [newTripName, setNewTripName] = useState("");
  const [newTripDestination, setNewTripDestination] = useState("");
  const [newTripBudget, setNewTripBudget] = useState("");
  const [newTripCategory, setNewTripCategory] = useState<TripCategory>("vacation");
  const [isSavingTrip, setIsSavingTrip] = useState(false);

  // Create Event Modal State
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);
  const [newEventName, setNewEventName] = useState("");
  const [newEventLocation, setNewEventLocation] = useState("");
  const [newEventBudget, setNewEventBudget] = useState("");
  const [newEventCategory, setNewEventCategory] = useState<EventCategory>("custom");
  const [isSavingEvent, setIsSavingEvent] = useState(false);

  // Add Expense Modal State
  const [selectedTripForExpense, setSelectedTripForExpense] = useState<TripRecord | null>(null);
  const [expenseTitle, setExpenseTitle] = useState("");
  const [estimatedAmount, setEstimatedAmount] = useState("");
  const [actualAmount, setActualAmount] = useState("");
  const [isAddingExpense, setIsAddingExpense] = useState(false);

  // Add Checklist Item Modal State
  const [selectedTripForChecklist, setSelectedTripForChecklist] = useState<TripRecord | null>(null);
  const [checklistTitle, setChecklistTitle] = useState("");
  const [checklistCategory, setChecklistCategory] = useState("Packing");
  const [isAddingChecklist, setIsAddingChecklist] = useState(false);

  // Handlers
  const handleCreateTrip = async () => {
    if (!newTripName || !newTripBudget) {
      toast.error("Trip Name and Budget are required.");
      return;
    }
    const budget = parseFloat(newTripBudget);
    if (isNaN(budget) || budget <= 0) {
      toast.error("Enter a valid budget amount.");
      return;
    }

    setIsSavingTrip(true);
    try {
      const created = await createTrip({
        name: newTripName,
        destination: newTripDestination || "Flexible",
        category: newTripCategory,
        startDate: new Date().toISOString().split("T")[0],
        endDate: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
        budgetAmount: budget,
      });

      toast.success("New trip created successfully!");
      setMetrics((prev) => ({
        ...prev,
        trips: [created, ...prev.trips],
        totalTripsCount: prev.totalTripsCount + 1,
        activeTripsCount: prev.activeTripsCount + 1,
        totalTripBudget: prev.totalTripBudget + created.budgetAmount,
      }));

      setIsCreateTripOpen(false);
      setNewTripName("");
      setNewTripDestination("");
      setNewTripBudget("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to create trip.");
    } finally {
      setIsSavingTrip(false);
    }
  };

  const handleCreateEvent = async () => {
    if (!newEventName || !newEventBudget) {
      toast.error("Event Name and Budget are required.");
      return;
    }
    const budget = parseFloat(newEventBudget);
    if (isNaN(budget) || budget <= 0) {
      toast.error("Enter a valid budget amount.");
      return;
    }

    setIsSavingEvent(true);
    try {
      const created = await createEvent({
        name: newEventName,
        location: newEventLocation || "Flexible",
        eventDate: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
        category: newEventCategory,
        budgetAmount: budget,
      });

      toast.success("Shared event created!");
      setMetrics((prev) => ({
        ...prev,
        events: [created, ...prev.events],
        upcomingEventsCount: prev.upcomingEventsCount + 1,
      }));

      setIsCreateEventOpen(false);
      setNewEventName("");
      setNewEventLocation("");
      setNewEventBudget("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to create event.");
    } finally {
      setIsSavingEvent(false);
    }
  };

  const handleDeleteTrip = async (tripId: string) => {
    try {
      await deleteTrip(tripId);
      const deletedTrip = metrics.trips.find((t) => t.id === tripId);
      toast.success("Trip deleted.");

      setMetrics((prev) => ({
        ...prev,
        trips: prev.trips.filter((t) => t.id !== tripId),
        totalTripsCount: Math.max(0, prev.totalTripsCount - 1),
        activeTripsCount: Math.max(0, prev.activeTripsCount - (deletedTrip?.status === "ongoing" || deletedTrip?.status === "upcoming" ? 1 : 0)),
        totalTripBudget: Math.max(0, prev.totalTripBudget - (deletedTrip?.budgetAmount || 0)),
        totalTripSpent: Math.max(0, prev.totalTripSpent - (deletedTrip?.actualTotal || 0)),
      }));
    } catch (err: any) {
      toast.error("Failed to delete trip.");
    }
  };

  const handleArchiveTrip = async (tripId: string) => {
    try {
      const updated = await archiveTrip(tripId, true);
      toast.success("Trip archived.");
      setMetrics((prev) => ({
        ...prev,
        trips: prev.trips.map((t) => (t.id === updated.id ? updated : t)),
        activeTripsCount: Math.max(0, prev.activeTripsCount - 1),
      }));
    } catch (err: any) {
      toast.error("Failed to archive trip.");
    }
  };

  const handleDuplicateTrip = async (tripId: string) => {
    try {
      const duplicated = await duplicateTrip(tripId);
      toast.success("Trip duplicated!");
      setMetrics((prev) => ({
        ...prev,
        trips: [duplicated, ...prev.trips],
        totalTripsCount: prev.totalTripsCount + 1,
        activeTripsCount: prev.activeTripsCount + 1,
        totalTripBudget: prev.totalTripBudget + duplicated.budgetAmount,
      }));
    } catch (err: any) {
      toast.error("Failed to duplicate trip.");
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      await deleteEvent(eventId);
      toast.success("Event removed.");
      setMetrics((prev) => ({
        ...prev,
        events: prev.events.filter((e) => e.id !== eventId),
        upcomingEventsCount: Math.max(0, prev.upcomingEventsCount - 1),
      }));
    } catch (err: any) {
      toast.error("Failed to delete event.");
    }
  };

  const handleAddExpense = async () => {
    if (!selectedTripForExpense || !expenseTitle || !estimatedAmount) return;
    const est = parseFloat(estimatedAmount);
    const act = actualAmount ? parseFloat(actualAmount) : 0;

    if (isNaN(est) || est <= 0) {
      toast.error("Enter a valid estimated amount.");
      return;
    }

    setIsAddingExpense(true);
    try {
      const updated = await addPlannedExpense(selectedTripForExpense.id, {
        title: expenseTitle,
        category: "General",
        estimatedAmount: est,
        actualAmount: act,
      });
      toast.success("Planned expense recorded!");

      setMetrics((prev) => ({
        ...prev,
        trips: prev.trips.map((t) => (t.id === updated.id ? updated : t)),
        totalTripSpent: prev.trips.reduce((sum, t) => sum + (t.id === updated.id ? updated.actualTotal : t.actualTotal), 0),
      }));

      setSelectedTripForExpense(null);
      setExpenseTitle("");
      setEstimatedAmount("");
      setActualAmount("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to add expense.");
    } finally {
      setIsAddingExpense(false);
    }
  };

  const handleDeleteExpense = async (tripId: string, expenseId: string) => {
    try {
      const updated = await deletePlannedExpense(tripId, expenseId);
      toast.success("Planned expense removed.");

      setMetrics((prev) => ({
        ...prev,
        trips: prev.trips.map((t) => (t.id === updated.id ? updated : t)),
      }));
    } catch (err: any) {
      toast.error("Failed to remove expense.");
    }
  };

  const handleAddChecklist = async () => {
    if (!selectedTripForChecklist || !checklistTitle) return;

    setIsAddingChecklist(true);
    try {
      const updated = await addChecklistItem(selectedTripForChecklist.id, {
        title: checklistTitle,
        category: checklistCategory,
      });
      toast.success("Checklist item added!");

      setMetrics((prev) => ({
        ...prev,
        trips: prev.trips.map((t) => (t.id === updated.id ? updated : t)),
      }));

      setSelectedTripForChecklist(null);
      setChecklistTitle("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to add checklist item.");
    } finally {
      setIsAddingChecklist(false);
    }
  };

  const handleToggleChecklist = async (tripId: string, itemId: string) => {
    try {
      const updated = await toggleChecklistItem(tripId, itemId);
      setMetrics((prev) => ({
        ...prev,
        trips: prev.trips.map((t) => (t.id === updated.id ? updated : t)),
      }));
    } catch (err: any) {
      toast.error("Failed to update checklist.");
    }
  };

  const handleDeleteChecklist = async (tripId: string, itemId: string) => {
    try {
      const updated = await deleteChecklistItem(tripId, itemId);
      toast.success("Checklist item removed.");

      setMetrics((prev) => ({
        ...prev,
        trips: prev.trips.map((t) => (t.id === updated.id ? updated : t)),
      }));
    } catch (err: any) {
      toast.error("Failed to remove item.");
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Compass className="h-6 w-6 text-primary" />
            <span>Trip & Event Management</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Plan vacations, track planned vs actual expense variance, and manage packing checklists.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setIsCreateTripOpen(true)}
            className="rounded-xl text-xs font-bold gap-1.5 bg-primary text-primary-foreground shadow-sm"
          >
            <FolderPlus className="h-4 w-4" />
            <span>Create Trip</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsCreateEventOpen(true)}
            className="rounded-xl text-xs font-bold gap-1.5"
          >
            <CalendarPlus className="h-4 w-4 text-amber-500" />
            <span>New Event</span>
          </Button>
        </div>
      </div>

      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm bg-card">
          <CardHeader className="pb-2">
            <p className="text-xs font-semibold text-slate-500 flex items-center justify-between">
              <span>Total Trip Budget</span>
              <Compass className="h-4 w-4 text-primary" />
            </p>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-black text-slate-900 dark:text-slate-100">
              {formatCurrency(metrics.totalTripBudget, metrics.currency)}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm bg-card">
          <CardHeader className="pb-2">
            <p className="text-xs font-semibold text-slate-500 flex items-center justify-between">
              <span>Total Trip Outflow</span>
              <ArrowUpRight className="h-4 w-4 text-rose-500" />
            </p>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-black text-rose-600 dark:text-rose-400">
              {formatCurrency(metrics.totalTripSpent, metrics.currency)}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm bg-card">
          <CardHeader className="pb-2">
            <p className="text-xs font-semibold text-slate-500 flex items-center justify-between">
              <span>Active Trips & Treks</span>
              <MapPin className="h-4 w-4 text-emerald-500" />
            </p>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {metrics.activeTripsCount} Active
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm bg-card">
          <CardHeader className="pb-2">
            <p className="text-xs font-semibold text-slate-500 flex items-center justify-between">
              <span>Upcoming Shared Events</span>
              <Calendar className="h-4 w-4 text-amber-500" />
            </p>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-black text-amber-600">
              {metrics.upcomingEventsCount} Events
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl flex-wrap h-auto gap-1">
          <TabsTrigger value="trips" className="rounded-xl text-xs font-semibold">
            <Compass className="h-3.5 w-3.5 mr-1.5 inline text-primary" />
            Trips & Vacations ({metrics.trips.length})
          </TabsTrigger>
          <TabsTrigger value="events" className="rounded-xl text-xs font-semibold">
            <Calendar className="h-3.5 w-3.5 mr-1.5 inline text-amber-500" />
            Shared Events ({metrics.events.length})
          </TabsTrigger>
          <TabsTrigger value="planned-expenses" className="rounded-xl text-xs font-semibold">
            <TrendingUp className="h-3.5 w-3.5 mr-1.5 inline text-emerald-500" />
            Planned Expenses & Variance
          </TabsTrigger>
          <TabsTrigger value="checklists" className="rounded-xl text-xs font-semibold">
            <CheckSquare className="h-3.5 w-3.5 mr-1.5 inline text-indigo-500" />
            Packing & Document Checklists
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: Trips & Vacations */}
        <TabsContent value="trips" className="space-y-4">
          {metrics.trips.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {metrics.trips.map((trip) => (
                <Card key={trip.id} className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-card p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100">{trip.name}</h2>
                      <p className="text-[11px] text-slate-500">
                        Destination: <strong>{trip.destination}</strong> • Organizer: {trip.organizerName}
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className={`text-[10px] uppercase font-bold ${
                        trip.status === "ongoing"
                          ? "bg-emerald-500/10 text-emerald-600"
                          : trip.status === "upcoming"
                          ? "bg-amber-500/10 text-amber-600"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {trip.status}
                    </Badge>
                  </div>

                  <div className="flex justify-between items-center text-xs p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                    <div>
                      <p className="text-[10px] text-slate-400">Total Spent</p>
                      <p className="font-black text-rose-600 dark:text-rose-400">{formatCurrency(trip.actualTotal, trip.currency)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-slate-400">Allocated Budget</p>
                      <p className="font-bold text-slate-700 dark:text-slate-300">{formatCurrency(trip.budgetAmount, trip.currency)}</p>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 text-xs">
                    <span className="text-slate-400 text-[11px]">
                      Dates: {trip.startDate} to {trip.endDate}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl text-xs h-8 gap-1"
                        onClick={() => setSelectedTripForExpense(trip)}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Expense</span>
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl text-xs h-8 gap-1"
                        onClick={() => setSelectedTripForChecklist(trip)}
                      >
                        <CheckSquare className="h-3 w-3" />
                        <span>Checklist</span>
                      </Button>

                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-slate-400 hover:text-indigo-600"
                        onClick={() => handleDuplicateTrip(trip.id)}
                        title="Duplicate Trip"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>

                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-slate-400 hover:text-amber-600"
                        onClick={() => handleArchiveTrip(trip.id)}
                        title="Archive Trip"
                      >
                        <Archive className="h-3.5 w-3.5" />
                      </Button>

                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-slate-400 hover:text-rose-600"
                        onClick={() => handleDeleteTrip(trip.id)}
                        title="Delete Trip"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="py-16 px-4 text-center space-y-3 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-card">
              <div className="p-3 bg-primary/10 rounded-full w-12 h-12 mx-auto flex items-center justify-center text-primary">
                <Compass className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-base">No Trips Created Yet</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Create your first trip or vacation pool to plan budgets, manage group expenses, and track checklists.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => setIsCreateTripOpen(true)}
                className="rounded-xl text-xs font-bold gap-1.5 bg-primary text-primary-foreground"
              >
                <Plus className="h-4 w-4" />
                <span>Create Your First Trip</span>
              </Button>
            </div>
          )}
        </TabsContent>

        {/* TAB 2: Shared Events */}
        <TabsContent value="events" className="space-y-4">
          {metrics.events.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {metrics.events.map((evt) => (
                <Card key={evt.id} className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-card p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100">{evt.name}</h2>
                      <p className="text-[11px] text-slate-500">Location: {evt.location} • Venue: {evt.venue || "N/A"}</p>
                    </div>
                    <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 text-[10px] uppercase font-bold">
                      {evt.status}
                    </Badge>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <div>
                      <p className="text-[10px] text-slate-400">Event Date</p>
                      <p className="font-mono font-bold text-slate-900 dark:text-slate-100">{evt.eventDate}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-slate-400">Budget Pool</p>
                      <p className="font-bold text-emerald-600">{formatCurrency(evt.budgetAmount, "INR")}</p>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end border-t border-slate-100 dark:border-slate-800">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="rounded-xl text-xs h-8 text-rose-600 hover:bg-rose-50 gap-1"
                      onClick={() => handleDeleteEvent(evt.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Delete Event</span>
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="py-16 px-4 text-center space-y-3 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-card">
              <div className="p-3 bg-amber-500/10 rounded-full w-12 h-12 mx-auto flex items-center justify-center text-amber-600">
                <Calendar className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-base">No Upcoming Events</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Organize rooftop parties, office picnics, or group celebrations with dedicated event budget pools.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsCreateEventOpen(true)}
                className="rounded-xl text-xs font-bold gap-1.5"
              >
                <CalendarPlus className="h-4 w-4 text-amber-500" />
                <span>Create Shared Event</span>
              </Button>
            </div>
          )}
        </TabsContent>

        {/* TAB 3: Planned Expense Scheduler & Variance */}
        <TabsContent value="planned-expenses" className="space-y-4">
          {metrics.trips.some((t) => t.plannedExpenses.length > 0) ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-card overflow-hidden">
              {metrics.trips.flatMap((t) => t.plannedExpenses.map((pe) => ({ ...pe, tripId: t.id }))).map((pe) => (
                <div key={pe.id} className="p-4 flex items-center justify-between text-xs hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{pe.title}</span>
                      <Badge variant="secondary" className="bg-primary/10 text-primary text-[10px] uppercase font-bold">
                        {pe.category}
                      </Badge>
                    </div>
                    <p className="text-slate-500">
                      Assigned: <strong>{pe.responsibleMember}</strong> • Status: {pe.status}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right space-y-0.5">
                      <p className="font-bold text-slate-900 dark:text-slate-100">
                        Est: {formatCurrency(pe.estimatedAmount, "INR")} | Act: {formatCurrency(pe.actualAmount, "INR")}
                      </p>
                      <p className={`font-mono text-[11px] font-bold ${pe.variance <= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                        Variance: {pe.variance <= 0 ? `-₹${Math.abs(pe.variance).toLocaleString("en-IN")}` : `+₹${pe.variance.toLocaleString("en-IN")}`}
                      </p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-slate-400 hover:text-rose-600"
                      onClick={() => handleDeleteExpense(pe.tripId, pe.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-16 px-4 text-center space-y-2 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-card">
              <p className="font-bold text-sm">No Planned Expenses Recorded</p>
              <p className="text-xs text-slate-400">Select a trip above to add planned itemized expenses & calculate actual variance.</p>
            </div>
          )}
        </TabsContent>

        {/* TAB 4: Packing & Document Checklists */}
        <TabsContent value="checklists" className="space-y-4">
          {metrics.trips.some((t) => t.checklists.length > 0) ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-card overflow-hidden">
              {metrics.trips.flatMap((t) => t.checklists.map((c) => ({ ...c, tripId: t.id }))).map((chk) => (
                <div key={chk.id} className="p-4 flex items-center justify-between text-xs hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={chk.isCompleted}
                      onChange={() => handleToggleChecklist(chk.tripId, chk.id)}
                      className="h-4 w-4 rounded text-primary focus:ring-primary cursor-pointer"
                    />
                    <div>
                      <span className={`font-semibold text-sm ${chk.isCompleted ? "line-through text-slate-400" : "text-slate-900 dark:text-slate-100"}`}>
                        {chk.title}
                      </span>
                      <p className="text-slate-500 text-[11px]">Category: {chk.category} • Assigned: {chk.assignedMember}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={chk.isCompleted ? "secondary" : "outline"} className={chk.isCompleted ? "bg-emerald-500/10 text-emerald-600" : ""}>
                      {chk.isCompleted ? "DONE" : "PENDING"}
                    </Badge>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-slate-400 hover:text-rose-600"
                      onClick={() => handleDeleteChecklist(chk.tripId, chk.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-16 px-4 text-center space-y-2 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-card">
              <p className="font-bold text-sm">No Packing or Document Checklists</p>
              <p className="text-xs text-slate-400">Select a trip above to add items to your packing & document checklist.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Modal 1: Create Trip */}
      <Dialog open={isCreateTripOpen} onOpenChange={setIsCreateTripOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-card border border-slate-200/80 dark:border-slate-800">
          <DialogHeader className="pb-2 border-b border-slate-100 dark:border-slate-800">
            <DialogTitle className="text-base font-bold">Create New Trip / Vacation</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Set up a new trip pool, destination, and budget in INR (₹).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">Trip Name:</label>
              <Input
                placeholder="e.g. Goa Beach Vacation / Himalayan Trek"
                value={newTripName}
                onChange={(e) => setNewTripName(e.target.value)}
                className="h-10 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">Destination:</label>
              <Input
                placeholder="e.g. North Goa, India"
                value={newTripDestination}
                onChange={(e) => setNewTripDestination(e.target.value)}
                className="h-10 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">Allocated Budget (₹):</label>
              <Input
                type="number"
                placeholder="e.g. 50000"
                value={newTripBudget}
                onChange={(e) => setNewTripBudget(e.target.value)}
                className="h-10 text-sm rounded-xl font-bold font-mono"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl text-xs h-9"
                onClick={() => setIsCreateTripOpen(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={isSavingTrip}
                className="rounded-xl text-xs h-9 bg-primary text-primary-foreground px-4"
                onClick={handleCreateTrip}
              >
                {isSavingTrip ? "Creating..." : "Save & Launch Trip"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal 2: Create Shared Event */}
      <Dialog open={isCreateEventOpen} onOpenChange={setIsCreateEventOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-card border border-slate-200/80 dark:border-slate-800">
          <DialogHeader className="pb-2 border-b border-slate-100 dark:border-slate-800">
            <DialogTitle className="text-base font-bold">Create Shared Event</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Organize birthdays, picnics, or team building event pools.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">Event Name:</label>
              <Input
                placeholder="e.g. Birthday Rooftop Bash / Office Outing"
                value={newEventName}
                onChange={(e) => setNewEventName(e.target.value)}
                className="h-10 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">Location / Venue:</label>
              <Input
                placeholder="e.g. Lonavala Resort / Sky Lounge"
                value={newEventLocation}
                onChange={(e) => setNewEventLocation(e.target.value)}
                className="h-10 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">Budget Pool (₹):</label>
              <Input
                type="number"
                placeholder="e.g. 15000"
                value={newEventBudget}
                onChange={(e) => setNewEventBudget(e.target.value)}
                className="h-10 text-sm rounded-xl font-bold font-mono"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl text-xs h-9"
                onClick={() => setIsCreateEventOpen(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={isSavingEvent}
                className="rounded-xl text-xs h-9 bg-primary text-primary-foreground px-4"
                onClick={handleCreateEvent}
              >
                {isSavingEvent ? "Creating..." : "Save Event"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal 3: Add Planned Expense */}
      <Dialog open={!!selectedTripForExpense} onOpenChange={(open) => !open && setSelectedTripForExpense(null)}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-card border border-slate-200/80 dark:border-slate-800">
          <DialogHeader className="pb-2 border-b border-slate-100 dark:border-slate-800">
            <DialogTitle className="text-base font-bold">Plan Trip Expense</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {selectedTripForExpense?.name} • Target Destination: {selectedTripForExpense?.destination}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">Expense Title:</label>
              <Input
                placeholder="e.g. Villa Booking / Vehicle Rentals"
                value={expenseTitle}
                onChange={(e) => setExpenseTitle(e.target.value)}
                className="h-10 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">Estimated Amount (₹):</label>
              <Input
                type="number"
                placeholder="e.g. 15000"
                value={estimatedAmount}
                onChange={(e) => setEstimatedAmount(e.target.value)}
                className="h-10 text-sm rounded-xl font-bold font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">Actual Outflow (Optional ₹):</label>
              <Input
                type="number"
                placeholder="e.g. 14200"
                value={actualAmount}
                onChange={(e) => setActualAmount(e.target.value)}
                className="h-10 text-sm rounded-xl font-bold font-mono"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl text-xs h-9"
                onClick={() => setSelectedTripForExpense(null)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={isAddingExpense}
                className="rounded-xl text-xs h-9 bg-primary text-primary-foreground px-4"
                onClick={handleAddExpense}
              >
                {isAddingExpense ? "Saving..." : "Add Planned Expense"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal 4: Add Checklist Item */}
      <Dialog open={!!selectedTripForChecklist} onOpenChange={(open) => !open && setSelectedTripForChecklist(null)}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-card border border-slate-200/80 dark:border-slate-800">
          <DialogHeader className="pb-2 border-b border-slate-100 dark:border-slate-800">
            <DialogTitle className="text-base font-bold">Add Packing / Document Item</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {selectedTripForChecklist?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">Item Title:</label>
              <Input
                placeholder="e.g. Driving License & Govt IDs / First-Aid Kit"
                value={checklistTitle}
                onChange={(e) => setChecklistTitle(e.target.value)}
                className="h-10 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">Category:</label>
              <Input
                placeholder="e.g. Documents / Packing / Medical"
                value={checklistCategory}
                onChange={(e) => setChecklistCategory(e.target.value)}
                className="h-10 text-xs rounded-xl"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl text-xs h-9"
                onClick={() => setSelectedTripForChecklist(null)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={isAddingChecklist}
                className="rounded-xl text-xs h-9 bg-primary text-primary-foreground px-4"
                onClick={handleAddChecklist}
              >
                {isAddingChecklist ? "Saving..." : "Add to Checklist"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

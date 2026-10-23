"use client";

import { useMemo } from "react";
import { TripDashboardMetrics, TripRecord, TripEvent } from "@/lib/types/trips";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/utils";
import {
  Compass,
  Calendar,
  IndianRupee,
  Clock,
  Sparkles,
  ArrowRight,
  TrendingUp,
  MapPin,
  Users,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Hotel,
  Truck,
  Luggage,
  FileText,
  Activity,
  Plus,
} from "lucide-react";

interface OverviewWorkspaceProps {
  metrics: TripDashboardMetrics;
  onSelectTrip: (tripId: string) => void;
  onInspectTrip: (trip: TripRecord) => void;
  onInspectEvent: (event: TripEvent) => void;
  onOpenWizard: () => void;
  onNavigateTab: (tab: string) => void;
}

export function OverviewWorkspace({
  metrics,
  onSelectTrip,
  onInspectTrip,
  onInspectEvent,
  onOpenWizard,
  onNavigateTab,
}: OverviewWorkspaceProps) {
  // Sort trips by departure date
  const upcomingTrips = useMemo(() => {
    return [...metrics.trips]
      .filter((t) => t.status !== "archived" && t.status !== "cancelled")
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
      .slice(0, 3);
  }, [metrics.trips]);

  // Upcoming scheduled events across all trips and standalone
  const upcomingEvents = useMemo(() => {
    return [...metrics.events]
      .filter((e) => e.status !== "Completed" && e.status !== "Cancelled")
      .sort((a, b) => new Date(a.startDate || a.startDateTime || 0).getTime() - new Date(b.startDate || b.startDateTime || 0).getTime())
      .slice(0, 4);
  }, [metrics.events]);

  const totalBudget = metrics.totalTripBudget || 1;
  const burnRatePct = Math.min(100, Math.round(((metrics.actualExpenses || 0) / totalBudget) * 100));

  return (
    <div className="space-y-6">
      {/* 1. Autonomous Command Strip */}
      <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-primary/10 via-card to-background border border-primary/20 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-primary text-primary-foreground shrink-0 shadow-sm">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xs uppercase tracking-wider text-primary">
                Executive Command Center
              </span>
              <Badge variant="outline" className="text-[10px] font-mono border-primary/30">
                Health: {metrics.overallHealthScore}/100 • {metrics.overallRiskLevel}
              </Badge>
            </div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
              {metrics.aiGlobalRecommendation}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            onClick={onOpenWizard}
            className="rounded-xl text-xs font-bold gap-1.5 bg-primary text-primary-foreground shadow-xs hover:shadow-md"
          >
            <Plus className="h-4 w-4" />
            <span>Launch New Trip</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onNavigateTab("logistics")}
            className="rounded-xl text-xs font-semibold"
          >
            <ShieldCheck className="h-4 w-4 mr-1 text-primary" />
            <span>Logistics Hub</span>
          </Button>
        </div>
      </div>

      {/* 2. Top Executive Operational Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        {/* Left Column (8 cols): Departures & Mission Control */}
        <div className="md:col-span-8 space-y-5">
          {/* Upcoming Departures Card */}
          <div className="p-5 rounded-3xl bg-card border border-slate-200/80 dark:border-slate-800/90 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Compass className="h-4 w-4 text-primary" />
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                  Imminent Departures & Active Convoys
                </h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigateTab("trips")}
                className="text-xs text-primary font-bold h-7 gap-1"
              >
                <span>View All ({metrics.trips.length})</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="space-y-3">
              {upcomingTrips.map((trip) => {
                const now = new Date();
                const start = new Date(trip.startDate);
                const daysUntil = Math.max(0, Math.ceil((start.getTime() - now.getTime()) / (1000 * 3600 * 24)));

                return (
                  <div
                    key={trip.id}
                    onClick={() => onInspectTrip(trip)}
                    className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/90 hover:border-primary/50 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer bg-slate-50/50 dark:bg-slate-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {trip.coverImage ? (
                        <img
                          src={trip.coverImage}
                          alt={trip.name}
                          className="h-12 w-12 rounded-xl object-cover shrink-0 border border-slate-200 dark:border-slate-800 group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                          {trip.name.charAt(0)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-[10px] text-slate-400 font-bold">{trip.publicId}</span>
                          <Badge variant="secondary" className="text-[9px] uppercase font-bold py-0">
                            {trip.category}
                          </Badge>
                          <Badge
                            className={`text-[9px] uppercase font-bold py-0 ${
                              trip.status === "ongoing"
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                : "bg-primary/10 text-primary border-primary/20"
                            }`}
                          >
                            {trip.status}
                          </Badge>
                        </div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate mt-0.5 group-hover:text-primary transition-colors">
                          {trip.name}
                        </h4>
                        <p className="text-xs text-slate-500 truncate flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3 text-primary shrink-0" />
                          <span>{trip.destination}, {trip.country}</span>
                          <span>•</span>
                          <span>{trip.members.length} Members</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">
                          Budget (INR)
                        </span>
                        <span className="font-mono font-black text-sm text-slate-900 dark:text-slate-100">
                          {formatCurrency(trip.budgetAmount, "INR")}
                        </span>
                        <span className="text-[10px] text-emerald-600 font-semibold block">
                          {daysUntil === 0 ? "Departs Today" : `Departs in ${daysUntil}d`}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 rounded-xl p-0 text-slate-400 group-hover:text-primary group-hover:bg-primary/10"
                      >
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}

              {upcomingTrips.length === 0 && (
                <div className="py-8 text-center text-slate-400 text-xs">
                  No active or upcoming trips scheduled.
                </div>
              )}
            </div>
          </div>

          {/* Real-Time Event Checkpoint Schedule */}
          <div className="p-5 rounded-3xl bg-card border border-slate-200/80 dark:border-slate-800/90 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-indigo-500" />
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                  Critical Event Checkpoints & Agendas
                </h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigateTab("events")}
                className="text-xs text-primary font-bold h-7 gap-1"
              >
                <span>Event OS ({metrics.events.length})</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {upcomingEvents.map((evt) => (
                <div
                  key={evt.id}
                  onClick={() => onInspectEvent(evt)}
                  className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800/90 hover:border-indigo-500/50 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer bg-slate-50/50 dark:bg-slate-900/40 space-y-2 group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono text-[10px] text-slate-400 font-bold">{evt.publicId}</span>
                    <Badge
                      variant="outline"
                      className={`text-[9px] uppercase font-bold py-0 ${
                        evt.priority === "Critical" || evt.priority === "High"
                          ? "border-rose-500/30 text-rose-600 bg-rose-500/10"
                          : "border-slate-200 text-slate-600"
                      }`}
                    >
                      {evt.priority || "Normal"}
                    </Badge>
                  </div>

                  <div>
                    <h5 className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate group-hover:text-indigo-600 transition-colors">
                      {evt.title}
                    </h5>
                    <p className="text-[11px] text-slate-500 truncate flex items-center gap-1 mt-0.5">
                      <Clock className="h-3 w-3 text-slate-400 shrink-0" />
                      <span>{evt.startDate || evt.startDateTime?.split("T")[0] || "Upcoming"}</span>
                      {evt.location && (
                        <>
                          <span>•</span>
                          <span className="truncate">{evt.location}</span>
                        </>
                      )}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] font-mono">
                    <span className="text-slate-400">Budget</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {formatCurrency(evt.budget || 0, "INR")}
                    </span>
                  </div>
                </div>
              ))}

              {upcomingEvents.length === 0 && (
                <div className="col-span-full py-6 text-center text-slate-400 text-xs">
                  No upcoming event checkpoints found.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): Financial Health & Readiness */}
        <div className="md:col-span-4 space-y-5">
          {/* Capital Allocation & Burn Meter */}
          <div className="p-5 rounded-3xl bg-card border border-slate-200/80 dark:border-slate-800/90 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-xs uppercase tracking-wider text-slate-500">
                Operating Capital Burn (INR)
              </span>
              <IndianRupee className="h-4 w-4 text-emerald-600" />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-baseline">
                <span className="text-2xl font-black text-slate-900 dark:text-slate-100">
                  {formatCurrency(metrics.actualExpenses, "INR")}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  of {formatCurrency(metrics.totalTripBudget, "INR")}
                </span>
              </div>
              <Progress value={burnRatePct} className="h-2 rounded-full" />
              <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1">
                <span>Burn Rate: {burnRatePct}%</span>
                <span className="text-emerald-600 font-bold">Unencumbered: {formatCurrency(metrics.remainingBudget, "INR")}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Personal</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {formatCurrency(metrics.personalExpenses, "INR")}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Shared Pool</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {formatCurrency(metrics.sharedExpenses, "INR")}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Hub Navigation Cards */}
          <div className="p-5 rounded-3xl bg-card border border-slate-200/80 dark:border-slate-800/90 shadow-xs space-y-3">
            <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-500">
              Operations Subsystems
            </h4>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => onNavigateTab("accommodation")}
                className="w-full p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-primary/50 hover:bg-primary/5 hover:shadow-xs hover:-translate-y-0.5 flex items-center justify-between text-left transition-all duration-200 group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                    <Hotel className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-primary transition-colors">
                      Accommodation Command
                    </p>
                    <span className="text-[10px] text-slate-400">Hotels, Rooms & Sharing Matrix</span>
                  </div>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
              </button>

              <button
                type="button"
                onClick={() => onNavigateTab("transportation")}
                className="w-full p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-primary/50 hover:bg-primary/5 hover:shadow-xs hover:-translate-y-0.5 flex items-center justify-between text-left transition-all duration-200 group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <Truck className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-primary transition-colors">
                      Fleet & Transit Convoys
                    </p>
                    <span className="text-[10px] text-slate-400">Vehicles, Drivers & Flight PNRs</span>
                  </div>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
              </button>

              <button
                type="button"
                onClick={() => onNavigateTab("resources")}
                className="w-full p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-primary/50 hover:bg-primary/5 hover:shadow-xs hover:-translate-y-0.5 flex items-center justify-between text-left transition-all duration-200 group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <Luggage className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-primary transition-colors">
                      Packing & Gear Inventories
                    </p>
                    <span className="text-[10px] text-slate-400">Categorized Resource Lists</span>
                  </div>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
              </button>

              <button
                type="button"
                onClick={() => onNavigateTab("documents")}
                className="w-full p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-primary/50 hover:bg-primary/5 hover:shadow-xs hover:-translate-y-0.5 flex items-center justify-between text-left transition-all duration-200 group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-primary transition-colors">
                      Credentials & Documents Vault
                    </p>
                    <span className="text-[10px] text-slate-400">Passports, Permits & Insurance</span>
                  </div>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

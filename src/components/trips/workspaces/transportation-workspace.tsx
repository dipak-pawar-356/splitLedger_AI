"use client";

import { useState } from "react";
import { TripLogisticsHub, LogisticsVehicle } from "@/lib/types/trips";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Truck,
  Car,
  Plane,
  Train,
  Bus,
  Fuel,
  Users,
  Phone,
  MapPin,
  Clock,
  Plus,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Search,
  Filter,
} from "lucide-react";
import { toast } from "sonner";

interface TransportationWorkspaceProps {
  hub: TripLogisticsHub;
  tripName?: string;
  onUpdateHub?: (hub: TripLogisticsHub) => void;
}

export function TransportationWorkspace({ hub, tripName, onUpdateHub }: TransportationWorkspaceProps) {
  const [vehicles, setVehicles] = useState<LogisticsVehicle[]>(hub.transportation || []);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  const filteredVehicles = vehicles.filter((v) => {
    const routeText = `${v.pickupPoints?.join(" ")} ${v.dropPoints?.join(" ")}`;
    const matchesSearch =
      v.vehicleNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.driverName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      routeText.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "all" || v.type.toLowerCase().includes(filterType.toLowerCase());
    return matchesSearch && matchesType;
  });

  const handleCycleStatus = (vehicleId: string) => {
    const updated = vehicles.map((v) => {
      if (v.id === vehicleId) {
        const nextStatus =
          v.currentStatus === "Scheduled"
            ? "En Route"
            : v.currentStatus === "En Route"
            ? "Parked"
            : v.currentStatus === "Parked"
            ? "Maintenance"
            : "Scheduled";
        toast.success(`Vehicle ${v.vehicleNumber} status updated to ${nextStatus}`);
        return { ...v, currentStatus: nextStatus as any };
      }
      return v;
    });
    setVehicles(updated);
  };

  const getFuelPct = (fuel: string) => {
    switch (fuel) {
      case "Full":
        return 100;
      case "75%":
        return 75;
      case "Half":
        return 50;
      case "25%":
        return 25;
      case "Low":
        return 15;
      default:
        return 60;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Summary Banner */}
      <div className="p-5 rounded-3xl bg-card border border-slate-200/80 dark:border-slate-800/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
            <Truck className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                Fleet, Convoy & Transit Command
              </h2>
              <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 font-bold text-[10px] uppercase">
                {vehicles.length} Units Active
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Live transit fleet tracking, driver assignments, fuel capacity monitoring and seat allocations
            </p>
          </div>
        </div>

        <Button
          size="sm"
          onClick={() => {
            toast.info("Add new transit vehicle / convoy unit modal opened.");
          }}
          className="rounded-xl text-xs font-bold gap-1.5 h-9 bg-primary text-primary-foreground shadow-xs self-end sm:self-center"
        >
          <Plus className="h-4 w-4" />
          <span>Add Vehicle / Flight</span>
        </Button>
      </div>

      {/* Search & Filter Bar */}
      <div className="p-3 rounded-2xl bg-card border border-slate-200/80 dark:border-slate-800/90 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search license plate, driver, route..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs rounded-xl border-slate-200/80 dark:border-slate-800"
          />
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-center overflow-x-auto w-full sm:w-auto">
          {["all", "suv", "tempo", "bus", "bike", "flight"].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold uppercase whitespace-nowrap transition-all ${
                filterType === t
                  ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Vehicles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredVehicles.map((v) => {
          const fuelPct = getFuelPct(v.fuelStatus);
          const routeSummary =
            v.pickupPoints?.length && v.dropPoints?.length
              ? `${v.pickupPoints[0]} → ${v.dropPoints[0]}`
              : "Basecamp Route Transit";

          return (
            <Card
              key={v.id}
              className="rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-card overflow-hidden shadow-xs hover:shadow-lg hover:border-blue-500/40 transition-all duration-200 flex flex-col justify-between"
            >
              <div className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                        {v.vehicleNumber}
                      </span>
                      <Badge variant="outline" className="text-[9px] uppercase font-bold py-0">
                        {v.type}
                      </Badge>
                    </div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">{routeSummary}</h4>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <Users className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span>Capacity: {v.busCapacity} Seats Confirmed</span>
                    </p>
                  </div>

                  <Badge
                    onClick={() => handleCycleStatus(v.id)}
                    className={`cursor-pointer text-[10px] uppercase font-bold tracking-wider py-1 px-2.5 transition-transform active:scale-95 ${
                      v.currentStatus === "En Route"
                        ? "bg-emerald-500 text-white"
                        : v.currentStatus === "Scheduled"
                        ? "bg-blue-500 text-white"
                        : v.currentStatus === "Parked"
                        ? "bg-slate-500 text-white"
                        : "bg-amber-500 text-white"
                    }`}
                  >
                    {v.currentStatus}
                  </Badge>
                </div>

                {/* Fuel & Range Status */}
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Fuel className="h-3.5 w-3.5 text-amber-500" />
                      Fuel Status: {v.fuelStatus}
                    </span>
                    <span className="font-mono text-slate-500 font-semibold">{v.liveStatus || "On Track"}</span>
                  </div>
                  <Progress value={fuelPct} className="h-1.5 rounded-full" />
                </div>

                {/* Pickup & Arrival Info */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/40">
                    <span className="text-[10px] text-slate-400 block">Est. Arrival</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{v.estimatedArrival || "17:30 IST"}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/40">
                    <span className="text-[10px] text-slate-400 block">Checkpoint</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                      {v.dropPoints?.[0] || "Destination"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Contact & Control Bar */}
              <div className="p-3 bg-slate-50/60 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                  <Phone className="h-3.5 w-3.5 text-blue-600" />
                  <span className="font-medium">{v.driverName}:</span>
                  <span className="font-mono text-slate-400">{v.driverContact}</span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleCycleStatus(v.id)}
                  className="text-[11px] font-bold text-blue-600 hover:text-blue-700 h-7 gap-1"
                >
                  <RotateCcw className="h-3 w-3" /> Change Status
                </Button>
              </div>
            </Card>
          );
        })}

        {filteredVehicles.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-400 text-xs rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-card/60">
            No transit units matching current filter.
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { TripLogisticsHub, LogisticsVehicle } from "@/lib/types/trips";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Truck,
  Car,
  Plane,
  Bus,
  Fuel,
  Users,
  Phone,
  MapPin,
  Clock,
  Plus,
  CheckCircle2,
  RotateCcw,
  Search,
  Navigation,
  Gauge,
  Compass,
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

  // Modal States
  const [isAddVehicleOpen, setIsAddVehicleOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<LogisticsVehicle | null>(null);

  // New Vehicle Form State
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [vehicleType, setVehicleType] = useState("suv");
  const [driverName, setDriverName] = useState("");
  const [driverContact, setDriverContact] = useState("");
  const [busCapacity, setBusCapacity] = useState("7");
  const [pickupPoint, setPickupPoint] = useState("");
  const [dropPoint, setDropPoint] = useState("");
  const [estimatedArrival, setEstimatedArrival] = useState("");
  const [fuelStatus, setFuelStatus] = useState<LogisticsVehicle["fuelStatus"]>("Full");

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
    if (onUpdateHub) {
      onUpdateHub({ ...hub, transportation: updated });
    }
  };

  const handleCycleFuel = (vehicleId: string) => {
    const updated = vehicles.map((v) => {
      if (v.id === vehicleId) {
        const nextFuel =
          v.fuelStatus === "Full"
            ? "75%"
            : v.fuelStatus === "75%"
            ? "Half"
            : v.fuelStatus === "Half"
            ? "25%"
            : v.fuelStatus === "25%"
            ? "Low"
            : "Full";
        toast.success(`Fuel level on ${v.vehicleNumber} updated to ${nextFuel}`);
        return { ...v, fuelStatus: nextFuel as any };
      }
      return v;
    });
    setVehicles(updated);
    if (onUpdateHub) {
      onUpdateHub({ ...hub, transportation: updated });
    }
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

  const handleCreateVehicle = () => {
    if (!vehicleNumber.trim()) {
      toast.error("Please enter vehicle plate or PNR number");
      return;
    }

    const newUnit: LogisticsVehicle = {
      id: `veh_${Date.now()}`,
      vehicleNumber: vehicleNumber.trim().toUpperCase(),
      type: vehicleType,
      driverName: driverName.trim() || "Fleet Captain",
      driverContact: driverContact.trim() || "+91 98221 00000",
      busCapacity: parseInt(busCapacity, 10) || 6,
      currentStatus: "Scheduled",
      fuelStatus,
      pickupPoints: [pickupPoint.trim() || "Assembly Hub"],
      dropPoints: [dropPoint.trim() || "Camp Base"],
      estimatedArrival: estimatedArrival.trim() || "17:00 IST",
      liveStatus: "Pre-departure Readiness Check Passed",
    };

    const updated = [newUnit, ...vehicles];
    setVehicles(updated);
    if (onUpdateHub) {
      onUpdateHub({ ...hub, transportation: updated });
    }
    setIsAddVehicleOpen(false);
    setVehicleNumber("");
    setDriverName("");
    setPickupPoint("");
    setDropPoint("");
    toast.success(`Transit convoy unit "${newUnit.vehicleNumber}" added!`);
  };

  return (
    <div className="space-y-6">
      {/* Header Summary Banner */}
      <div className="p-5 rounded-3xl bg-card border border-slate-200/80 dark:border-slate-800/90 shadow-xs hover:border-blue-500/40 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
          onClick={() => setIsAddVehicleOpen(true)}
          className="rounded-xl text-xs font-bold gap-1.5 h-9 bg-blue-600 hover:bg-blue-700 text-white shadow-xs hover:shadow-md transition-all self-end sm:self-center"
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
              onClick={() => setSelectedVehicle(v)}
              className="rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-card overflow-hidden shadow-xs hover:shadow-2xl hover:border-blue-500/60 hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between cursor-pointer group"
            >
              <div className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-[10px] text-slate-400 font-bold">{v.id}</span>
                      <Badge variant="outline" className="text-[9px] uppercase font-bold py-0">
                        {v.type}
                      </Badge>
                      <Badge
                        className={`text-[9px] uppercase font-bold py-0 ${
                          v.currentStatus === "En Route"
                            ? "bg-blue-500/10 text-blue-600 border-blue-500/20 animate-pulse"
                            : v.currentStatus === "Parked"
                            ? "bg-slate-500/10 text-slate-600 border-slate-500/20"
                            : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                        }`}
                      >
                        {v.currentStatus}
                      </Badge>
                    </div>
                    <h3 className="font-black text-base text-slate-900 dark:text-slate-100 font-mono group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {v.vehicleNumber}
                    </h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3 text-blue-600 shrink-0" />
                      <span className="truncate">{routeSummary}</span>
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block font-mono">Passenger Capacity</span>
                    <span className="font-mono font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center justify-end gap-1">
                      <Users className="h-3 w-3 text-blue-600" />
                      {v.busCapacity} Seats
                    </span>
                  </div>
                </div>

                {/* Fuel & Range Status with interactive gauge toggle */}
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCycleFuel(v.id);
                  }}
                  className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 space-y-1.5 text-xs hover:border-blue-400 transition-colors cursor-pointer"
                  title="Click to toggle fuel gauge"
                >
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
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/40">
                    <span className="text-[10px] text-slate-400 block flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Est. Arrival
                    </span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{v.estimatedArrival || "17:30 IST"}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/40">
                    <span className="text-[10px] text-slate-400 block flex items-center gap-1">
                      <Navigation className="h-3 w-3" /> Checkpoint
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                      {v.dropPoints?.[0] || "Destination Hub"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Contact & Control Bar */}
              <div
                onClick={(e) => e.stopPropagation()}
                className="p-3.5 bg-slate-50/70 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                  <Phone className="h-3.5 w-3.5 text-blue-600" />
                  <span className="font-medium">{v.driverName}:</span>
                  <span className="font-mono text-slate-400">{v.driverContact}</span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleCycleStatus(v.id)}
                  className="text-[11px] font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30 h-7 gap-1 rounded-xl"
                >
                  <RotateCcw className="h-3 w-3" /> Change Status
                </Button>
              </div>
            </Card>
          );
        })}

        {filteredVehicles.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-400 text-xs rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-card/60">
            {vehicles.length === 0
              ? "No vehicles or transit convoys registered yet. Click 'Add Vehicle' to register coaches, flights, SUVs, or rentals."
              : "No transit units matching current filter."}
          </div>
        )}
      </div>

      {/* TRANSIT CONTROL MODAL */}
      <Dialog open={!!selectedVehicle} onOpenChange={(open) => !open && setSelectedVehicle(null)}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-card border border-slate-200/80 dark:border-slate-800">
          {selectedVehicle && (
            <div className="space-y-4">
              <DialogHeader>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-[10px] uppercase font-bold py-0.5">
                    {selectedVehicle.type} Unit
                  </Badge>
                  <Badge className="text-[10px] font-bold uppercase bg-blue-500/10 text-blue-600">
                    {selectedVehicle.currentStatus}
                  </Badge>
                </div>
                <DialogTitle className="text-lg font-black text-slate-900 dark:text-slate-100 text-left font-mono">
                  {selectedVehicle.vehicleNumber}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 text-left">
                  Assigned Captain: {selectedVehicle.driverName} ({selectedVehicle.driverContact})
                </DialogDescription>
              </DialogHeader>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Passenger Capacity:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{selectedVehicle.busCapacity} Seats</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Origin / Assembly:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedVehicle.pickupPoints?.[0] || "Basecamp"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Destination:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedVehicle.dropPoints?.[0] || "Destination Hub"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Live Fuel Gauge:</span>
                  <span className="font-mono font-bold text-amber-600">{selectedVehicle.fuelStatus}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    handleCycleFuel(selectedVehicle.id);
                    setSelectedVehicle({
                      ...selectedVehicle,
                      fuelStatus: selectedVehicle.fuelStatus === "Full" ? "75%" : selectedVehicle.fuelStatus === "75%" ? "Half" : "Full",
                    });
                  }}
                  className="rounded-xl text-xs flex-1 gap-1.5 h-9"
                >
                  <Fuel className="h-3.5 w-3.5 text-amber-500" />
                  Toggle Fuel
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    handleCycleStatus(selectedVehicle.id);
                    setSelectedVehicle(null);
                  }}
                  className="rounded-xl text-xs font-bold flex-1 bg-blue-600 hover:bg-blue-700 text-white h-9"
                >
                  Advance Status
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ADD VEHICLE MODAL */}
      <Dialog open={isAddVehicleOpen} onOpenChange={setIsAddVehicleOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-card border border-slate-200/80 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-1.5">
              <Truck className="h-4 w-4 text-blue-600" />
              <span>Add Vehicle or Flight Transit Unit</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Register convoy transport, private coaches, or group flight legs.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 text-xs py-2">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300">Vehicle Plate / Flight PNR *</label>
              <Input
                placeholder="e.g. MH-12-RN-9921 or 6E-204"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
                className="rounded-xl h-10 mt-1 uppercase"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Transport Type</label>
                <select
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                  className="w-full rounded-xl h-10 mt-1 border border-slate-200/80 dark:border-slate-800 bg-background px-3 text-xs"
                >
                  <option value="suv">4x4 SUV</option>
                  <option value="tempo">Tempo Traveller (16 Seater)</option>
                  <option value="bus">AC Luxury Coach (45 Seater)</option>
                  <option value="bike">Cruiser Bike</option>
                  <option value="flight">Domestic Flight</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Seat Capacity</label>
                <Input
                  type="number"
                  min="1"
                  value={busCapacity}
                  onChange={(e) => setBusCapacity(e.target.value)}
                  className="rounded-xl h-10 mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Driver / Lead Name</label>
                <Input
                  placeholder="e.g. Rajesh Shinde"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  className="rounded-xl h-10 mt-1"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Contact Phone</label>
                <Input
                  placeholder="+91 98221 44556"
                  value={driverContact}
                  onChange={(e) => setDriverContact(e.target.value)}
                  className="rounded-xl h-10 mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Pickup Location</label>
                <Input
                  placeholder="e.g. Pune Central Bay 2"
                  value={pickupPoint}
                  onChange={(e) => setPickupPoint(e.target.value)}
                  className="rounded-xl h-10 mt-1"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Drop Location</label>
                <Input
                  placeholder="e.g. Calangute Villa Gate"
                  value={dropPoint}
                  onChange={(e) => setDropPoint(e.target.value)}
                  className="rounded-xl h-10 mt-1"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAddVehicleOpen(false)}
                className="rounded-xl text-xs h-9"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleCreateVehicle}
                className="rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white h-9 px-4"
              >
                Save Transit Unit
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

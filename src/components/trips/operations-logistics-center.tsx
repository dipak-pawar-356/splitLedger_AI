"use client";

import { useState } from "react";
import {
  TripLogisticsHub,
  LogisticsVehicle,
  LogisticsAccommodation,
  LogisticsTaskItem,
} from "@/lib/types/trips";
import {
  updateLogisticsVehicle,
  updateLogisticsRoomSharing,
  updateLogisticsTaskAssignment,
  toggleLogisticsInventoryItem,
  addLogisticsAssignment,
} from "@/actions/enterprise-operations";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  Truck,
  Hotel,
  ShieldAlert,
  FileCheck,
  Luggage,
  UtensilsCrossed,
  Store,
  Clock,
  ListTodo,
  Phone,
  Fuel,
  Users,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  HeartPulse,
  Award,
  ChevronRight,
  Plus,
  Check,
  Star,
  ExternalLink,
  Flame,
  Droplets,
  Calendar,
  Sparkles,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

interface OperationsLogisticsCenterProps {
  initialHub: TripLogisticsHub;
  tripName?: string;
}

export function OperationsLogisticsCenter({ initialHub, tripName }: OperationsLogisticsCenterProps) {
  const [hub, setHub] = useState<TripLogisticsHub>(initialHub);
  const [activeTab, setActiveTab] = useState<string>("all");

  // New Assignment Modal
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskOwner, setNewTaskOwner] = useState("");
  const [newTaskDeadline, setNewTaskDeadline] = useState("Tomorrow, 12:00");

  // Interactive Task Completion Toggle
  const handleToggleTaskStatus = async (task: LogisticsTaskItem) => {
    const nextStatus =
      task.status === "Completed"
        ? "In Progress"
        : task.status === "In Progress"
        ? "Completed"
        : task.status === "Pending"
        ? "In Progress"
        : "Completed";

    const nextPct = nextStatus === "Completed" ? 100 : nextStatus === "In Progress" ? 50 : 0;

    try {
      const updated = await updateLogisticsTaskAssignment(task.id, nextStatus as any, nextPct);
      setHub({ ...updated });
      toast.success(`Task "${task.task}" marked as ${nextStatus} (${nextPct}%)`);
    } catch {
      toast.error("Failed to update assignment");
    }
  };

  // Interactive Inventory Item Toggle
  const handleToggleInventory = async (itemId: string) => {
    try {
      const updated = await toggleLogisticsInventoryItem(itemId);
      setHub({ ...updated });
      toast.success("Inventory item updated");
    } catch {
      toast.error("Failed to update inventory item");
    }
  };

  // Interactive Vehicle Fuel & Status updater
  const handleCycleVehicleStatus = async (vehicle: LogisticsVehicle) => {
    const nextStatus =
      vehicle.currentStatus === "Scheduled"
        ? "En Route"
        : vehicle.currentStatus === "En Route"
        ? "Parked"
        : vehicle.currentStatus === "Parked"
        ? "Maintenance"
        : "Scheduled";

    try {
      const updated = await updateLogisticsVehicle(vehicle.id, { currentStatus: nextStatus as any });
      setHub({ ...updated });
      toast.success(`Vehicle ${vehicle.vehicleNumber} status updated to ${nextStatus}`);
    } catch {
      toast.error("Failed to update vehicle status");
    }
  };

  const handleCycleFuelStatus = async (vehicle: LogisticsVehicle) => {
    const nextFuel =
      vehicle.fuelStatus === "Full"
        ? "75%"
        : vehicle.fuelStatus === "75%"
        ? "Half"
        : vehicle.fuelStatus === "Half"
        ? "25%"
        : vehicle.fuelStatus === "25%"
        ? "Low"
        : "Full";

    try {
      const updated = await updateLogisticsVehicle(vehicle.id, { fuelStatus: nextFuel as any });
      setHub({ ...updated });
      toast.success(`Vehicle ${vehicle.vehicleNumber} fuel gauge set to ${nextFuel}`);
    } catch {
      toast.error("Failed to update fuel gauge");
    }
  };

  // Add work assignment
  const handleCreateAssignment = async () => {
    if (!newTaskTitle.trim()) {
      toast.error("Please enter a task description");
      return;
    }
    try {
      const updated = await addLogisticsAssignment({
        task: newTaskTitle.trim(),
        owner: newTaskOwner.trim() || "Trip Member",
        deadline: newTaskDeadline.trim() || "Tomorrow",
      });
      setHub({ ...updated });
      setIsNewTaskOpen(false);
      setNewTaskTitle("");
      setNewTaskOwner("");
      toast.success("Work assignment added successfully!");
    } catch {
      toast.error("Failed to add task assignment");
    }
  };

  // Overall Operations Readiness Metric
  const totalAssignments = hub.assignments.length;
  const completedAssignments = hub.assignments.filter((a) => a.status === "Completed").length;
  const assignmentsPct = totalAssignments > 0 ? Math.round((completedAssignments / totalAssignments) * 100) : 100;

  return (
    <section className="space-y-6 pt-6 border-t border-slate-200/80 dark:border-slate-800/80">
      {/* Operations Section Title & Subheading */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <Truck className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                  Operations & Logistics Center
                </h2>
                <Badge variant="secondary" className="bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold text-[11px] tracking-wide">
                  Mission Command
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Manage every operational aspect before, during, and after the journey with 30-50 year expedition precision
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs font-mono py-1 px-3 border-amber-500/30 text-amber-600 bg-amber-50/50 dark:bg-amber-950/20">
            Readiness Score: {Math.round((hub.packing.completedPct + assignmentsPct) / 2)}%
          </Badge>

          <Button
            size="sm"
            onClick={() => setIsNewTaskOpen(true)}
            className="rounded-xl text-xs font-bold gap-1.5 bg-amber-600 hover:bg-amber-700 text-white shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all h-9 px-4"
          >
            <Plus className="h-4 w-4" />
            <span>Assign Work</span>
          </Button>
        </div>
      </div>

      {/* 9 Enterprise Operations Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* CARD 1: TRANSPORTATION COMMAND */}
        <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-card p-5 shadow-xs transition-all duration-250 group hover:-translate-y-1.5 hover:scale-[1.01] hover:shadow-xl hover:border-blue-500/50 hover:shadow-blue-500/10 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                  <Truck className="h-4 w-4" />
                </div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">Transportation</h3>
              </div>
              <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-none font-bold text-[10px]">
                {hub.transportation.length} Vehicles
              </Badge>
            </div>

            <div className="space-y-3">
              {hub.transportation.map((veh) => (
                <div
                  key={veh.id}
                  className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-100 dark:border-slate-800 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                      {veh.vehicleNumber}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCycleVehicleStatus(veh)}
                      className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                      title="Click to cycle status"
                    >
                      {veh.currentStatus}
                    </button>
                  </div>

                  <p className="text-slate-600 dark:text-slate-400 text-[11px] font-medium">{veh.type}</p>

                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-200/60 dark:border-slate-800">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Driver</span>
                      <a
                        href={`tel:${veh.driverContact}`}
                        className="font-bold text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <Phone className="h-3 w-3" /> {veh.driverName}
                      </a>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Fuel Level</span>
                      <button
                        type="button"
                        onClick={() => handleCycleFuelStatus(veh)}
                        className="font-bold text-amber-600 flex items-center gap-1 hover:underline"
                        title="Click to update fuel gauge"
                      >
                        <Fuel className="h-3 w-3" /> {veh.fuelStatus}
                      </button>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-500 pt-1">
                    <span>ETA: <strong>{veh.estimatedArrival}</strong></span>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">{veh.liveStatus}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 text-[10px] text-slate-400 flex items-center justify-between">
            <span>Fleet GPS Active</span>
            <span className="text-emerald-600 font-bold">100% Verified</span>
          </div>
        </Card>

        {/* CARD 2: ACCOMMODATION COMMAND */}
        <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-card p-5 shadow-xs transition-all duration-250 group hover:-translate-y-1.5 hover:scale-[1.01] hover:shadow-xl hover:border-purple-500/50 hover:shadow-purple-500/10 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
                  <Hotel className="h-4 w-4" />
                </div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">Accommodation</h3>
              </div>
              <Badge className="bg-purple-500/15 text-purple-600 dark:text-purple-400 border-none font-bold text-[10px]">
                {hub.accommodation.length} Resorts
              </Badge>
            </div>

            <div className="space-y-3">
              {hub.accommodation.map((acc) => (
                <div
                  key={acc.id}
                  className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-100 dark:border-slate-800 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-slate-100 truncate">
                      {acc.hotelName}
                    </span>
                    <Badge variant="outline" className="text-[9px] bg-emerald-50 text-emerald-600 border-emerald-300 font-bold shrink-0">
                      {acc.bookingStatus}
                    </Badge>
                  </div>

                  <p className="text-slate-500 text-[11px] truncate flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-rose-500 shrink-0" /> {acc.address}
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-200/60 dark:border-slate-800">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Check-in / Out</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{acc.checkInTime} / {acc.checkOutTime}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Manager Contact</span>
                      <span className="font-semibold text-purple-600 truncate block">{acc.hotelContact.split("(")[0]}</span>
                    </div>
                  </div>

                  <div className="pt-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Room Allocation & Sharing Matrix
                    </span>
                    <div className="space-y-1">
                      {acc.rooms.slice(0, 3).map((rm, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-[10px] p-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/80"
                        >
                          <span className="font-bold text-slate-700 dark:text-slate-300">{rm.roomNumber} ({rm.roomType})</span>
                          <span className="text-slate-500 truncate max-w-[130px]">{rm.occupants.join(", ")}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 text-[10px] text-slate-400 flex items-center justify-between">
            <span>Direct Vouchers Synced</span>
            <span className="text-emerald-600 font-bold">Key Handover Ready</span>
          </div>
        </Card>

        {/* CARD 3: EMERGENCY & MEDICAL RESCUE */}
        <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-card p-5 shadow-xs transition-all duration-250 group hover:-translate-y-1.5 hover:scale-[1.01] hover:shadow-xl hover:border-rose-500/50 hover:shadow-rose-500/10 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
                  <ShieldAlert className="h-4 w-4" />
                </div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">Emergency & Medical</h3>
              </div>
              <Badge className="bg-rose-500/15 text-rose-600 dark:text-rose-400 border-none font-bold text-[10px]">
                24x7 Active
              </Badge>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/60 space-y-1">
                <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block">Nearest Tertiary Hospital</span>
                <p className="font-bold text-slate-900 dark:text-slate-100">{hub.emergency.hospitalName}</p>
                <p className="text-rose-600 font-mono font-bold flex items-center gap-1">
                  <Phone className="h-3 w-3" /> {hub.emergency.hospitalContact}
                </p>
                <span className="text-[10px] text-slate-500">Distance: {hub.emergency.hospitalDistanceKm} km • Police: {hub.emergency.policeContact}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Trip Leader</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{hub.emergency.tripLeader}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Co-Leader (Medical)</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{hub.emergency.coLeader}</span>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Blood Group & Allergy Registry
                </span>
                <div className="grid grid-cols-2 gap-1.5 max-h-24 overflow-y-auto pr-1">
                  {hub.emergency.bloodGroupList.map((bg, idx) => (
                    <div
                      key={idx}
                      className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-[10px]"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{bg.memberName}</span>
                        <Badge variant="outline" className="text-[9px] px-1 py-0 font-bold bg-rose-50 text-rose-600 border-rose-300 shrink-0">
                          {bg.bloodGroup}
                        </Badge>
                      </div>
                      <span className="text-slate-400 truncate block">{bg.allergies || "No allergies"}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 text-[10px] text-slate-400 flex items-center justify-between">
            <span>Coast Guard & Mountain SAR</span>
            <span className="text-emerald-600 font-bold">Priority Channel 108</span>
          </div>
        </Card>

        {/* CARD 4: PERMISSIONS & COMPLIANCE */}
        <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-card p-5 shadow-xs transition-all duration-250 group hover:-translate-y-1.5 hover:scale-[1.01] hover:shadow-xl hover:border-emerald-500/50 hover:shadow-emerald-500/10 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                  <FileCheck className="h-4 w-4" />
                </div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">Permissions & Permits</h3>
              </div>
              <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-none font-bold text-[10px]">
                {hub.permissions.length} Cleared
              </Badge>
            </div>

            <div className="space-y-2 text-xs">
              {hub.permissions.slice(0, 5).map((prm) => (
                <div
                  key={prm.id}
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <span className="font-bold text-slate-800 dark:text-slate-200 truncate block text-[11px]">
                      {prm.title}
                    </span>
                    <span className="text-[10px] text-slate-400 block truncate">
                      {prm.category} • {prm.documentNumber || "Verified"}
                    </span>
                  </div>

                  <Badge
                    variant="outline"
                    className="text-[9px] bg-emerald-50 text-emerald-600 border-emerald-300 font-bold shrink-0 uppercase"
                  >
                    {prm.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 text-[10px] text-slate-400 flex items-center justify-between">
            <span>RTO & Forest Clearances</span>
            <span className="text-emerald-600 font-bold">100% Valid</span>
          </div>
        </Card>

        {/* CARD 5: PACKING PROGRESS & INVENTORY */}
        <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-card p-5 shadow-xs transition-all duration-250 group hover:-translate-y-1.5 hover:scale-[1.01] hover:shadow-xl hover:border-indigo-500/50 hover:shadow-indigo-500/10 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                  <Luggage className="h-4 w-4" />
                </div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">Packing & Inventory</h3>
              </div>
              <Badge className="bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-none font-bold text-[10px]">
                {hub.packing.completedPct}% Packed
              </Badge>
            </div>

            <div className="space-y-2 text-xs">
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-500 font-medium">Shared Mission Gear:</span>
                  <span className="font-bold text-indigo-600">{hub.packing.completedPct}%</span>
                </div>
                <Progress value={hub.packing.completedPct} className="h-2 rounded-full" />
              </div>

              <div className="p-2 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/60 text-[11px]">
                <span className="font-bold text-rose-600 block text-[10px] uppercase">Critical Expedited Gear:</span>
                <span className="text-slate-600 dark:text-slate-300 font-medium">
                  {hub.packing.criticalItems.join(" • ")}
                </span>
              </div>

              <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                {hub.packing.inventory.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleToggleInventory(item.id)}
                    className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-[11px] cursor-pointer hover:border-indigo-400 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`h-4 w-4 rounded-md border flex items-center justify-center ${item.packed ? "bg-emerald-600 border-emerald-600 text-white" : "border-slate-300"}`}>
                        {item.packed && <Check className="h-3 w-3" />}
                      </div>
                      <span className={`truncate font-medium ${item.packed ? "line-through text-slate-400" : "text-slate-800 dark:text-slate-200"}`}>
                        {item.item}
                      </span>
                    </div>

                    <span className="text-[10px] text-slate-400 font-mono shrink-0">Qty: {item.quantity}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 text-[10px] text-slate-400 flex items-center justify-between">
            <span>Missing: {hub.packing.missingItems.length} non-essential items</span>
            <span className="text-indigo-600 font-bold">Tap items to pack</span>
          </div>
        </Card>

        {/* CARD 6: FOOD LOGISTICS & MEAL PLANS */}
        <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-card p-5 shadow-xs transition-all duration-250 group hover:-translate-y-1.5 hover:scale-[1.01] hover:shadow-xl hover:border-orange-500/50 hover:shadow-orange-500/10 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400">
                  <UtensilsCrossed className="h-4 w-4" />
                </div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">Food Logistics</h3>
              </div>
              <Badge className="bg-orange-500/15 text-orange-600 dark:text-orange-400 border-none font-bold text-[10px]">
                {hub.foodLogistics.length} Meal Plans
              </Badge>
            </div>

            <div className="space-y-2 text-xs">
              {hub.foodLogistics.slice(0, 4).map((meal, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-slate-100">{meal.meal}</span>
                    <Badge
                      variant="outline"
                      className={`text-[9px] uppercase ${
                        meal.vendorStatus === "Confirmed"
                          ? "bg-emerald-50 text-emerald-600 border-emerald-300"
                          : meal.vendorStatus === "Delivered"
                          ? "bg-blue-50 text-blue-600 border-blue-300"
                          : "bg-amber-50 text-amber-600 border-amber-300"
                      }`}
                    >
                      {meal.vendorStatus}
                    </Badge>
                  </div>

                  <p className="text-slate-600 dark:text-slate-300 text-[11px] truncate">{meal.menu}</p>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                    <span>Timing: {meal.timing}</span>
                    <span className="text-orange-600 font-semibold">{meal.dietaryNotes}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 text-[10px] text-slate-400 flex items-center justify-between">
            <span>Drinking Water Supply</span>
            <span className="text-emerald-600 font-bold">20L Sealed Jars Delivered</span>
          </div>
        </Card>

        {/* CARD 7: VENDOR STATUS & MANAGEMENT */}
        <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-card p-5 shadow-xs transition-all duration-250 group hover:-translate-y-1.5 hover:scale-[1.01] hover:shadow-xl hover:border-teal-500/50 hover:shadow-teal-500/10 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400">
                  <Store className="h-4 w-4" />
                </div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">Vendor Management</h3>
              </div>
              <Badge className="bg-teal-500/15 text-teal-600 dark:text-teal-400 border-none font-bold text-[10px]">
                {hub.vendors.length} Partners
              </Badge>
            </div>

            <div className="space-y-2 text-xs">
              {hub.vendors.slice(0, 4).map((vnd) => (
                <div
                  key={vnd.id}
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-slate-100 truncate">{vnd.name}</span>
                    <span className="flex items-center text-amber-500 font-bold text-[10px] shrink-0">
                      <Star className="h-3 w-3 fill-amber-500 mr-0.5" /> {vnd.rating}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>{vnd.category}</span>
                    <Badge
                      variant="outline"
                      className={`text-[9px] uppercase ${
                        vnd.paymentStatus === "Paid" || vnd.paymentStatus === "Settled"
                          ? "bg-emerald-50 text-emerald-600 border-emerald-300"
                          : "bg-amber-50 text-amber-600 border-amber-300"
                      }`}
                    >
                      {vnd.paymentStatus}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                    <span>Contract: {formatCurrency(vnd.amount, "INR")}</span>
                    <span className="font-mono text-teal-600">{vnd.contact}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 text-[10px] text-slate-400 flex items-center justify-between">
            <span>Vendor SLA Protection</span>
            <span className="text-teal-600 font-bold">100% Contracted</span>
          </div>
        </Card>

        {/* CARD 8: OPERATIONAL TIMELINE */}
        <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-card p-5 shadow-xs transition-all duration-250 group hover:-translate-y-1.5 hover:scale-[1.01] hover:shadow-xl hover:border-cyan-500/50 hover:shadow-cyan-500/10 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400">
                  <Clock className="h-4 w-4" />
                </div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">Operational Timeline</h3>
              </div>
              <Badge className="bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-none font-bold text-[10px]">
                {hub.operationalTimeline.completedTasks.length} Completed
              </Badge>
            </div>

            <div className="space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-2 text-center text-[10px]">
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 text-emerald-700 dark:text-emerald-300 font-bold">
                  {hub.operationalTimeline.completedTasks.length} Done
                </div>
                <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 text-amber-700 dark:text-amber-300 font-bold">
                  {hub.operationalTimeline.upcomingTasks.length} Active
                </div>
              </div>

              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {hub.assignments.map((tsk) => (
                  <div
                    key={tsk.id}
                    className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]"
                  >
                    <div className="min-w-0">
                      <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">
                        {tsk.task}
                      </span>
                      <span className="text-[10px] text-slate-400">Lead: {tsk.owner} • Due: {tsk.deadline}</span>
                    </div>

                    <Badge
                      variant="outline"
                      className={`text-[9px] uppercase shrink-0 ${
                        tsk.status === "Completed"
                          ? "bg-emerald-50 text-emerald-600 border-emerald-300"
                          : tsk.status === "In Progress"
                          ? "bg-amber-50 text-amber-600 border-amber-300"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {tsk.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 text-[10px] text-slate-400 flex items-center justify-between">
            <span>Milestone Schedule</span>
            <span className="text-cyan-600 font-bold">Pacing on Track</span>
          </div>
        </Card>

        {/* CARD 9: MEMBER WORK ASSIGNMENTS */}
        <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-card p-5 shadow-xs transition-all duration-250 group hover:-translate-y-1.5 hover:scale-[1.01] hover:shadow-xl hover:border-amber-500/50 hover:shadow-amber-500/10 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                  <ListTodo className="h-4 w-4" />
                </div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">Work Assignments</h3>
              </div>
              <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-none font-bold text-[10px]">
                {hub.assignments.length} Tasks
              </Badge>
            </div>

            <div className="space-y-2 text-xs">
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-500 font-medium">Delegation Execution:</span>
                  <span className="font-bold text-amber-600">{assignmentsPct}% Finished</span>
                </div>
                <Progress value={assignmentsPct} className="h-2 rounded-full" />
              </div>

              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {hub.assignments.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleToggleTaskStatus(item)}
                    className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 text-[11px] cursor-pointer hover:border-amber-400 transition-colors"
                    title="Click to toggle completion status"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <div className={`h-3.5 w-3.5 rounded-full border flex items-center justify-center shrink-0 ${item.status === "Completed" ? "bg-emerald-600 border-emerald-600 text-white" : "border-slate-300"}`}>
                          {item.status === "Completed" && <Check className="h-2.5 w-2.5" />}
                        </div>
                        <span className={`font-bold truncate ${item.status === "Completed" ? "line-through text-slate-400" : "text-slate-800 dark:text-slate-200"}`}>
                          {item.task}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 ml-5 block truncate">Owner: {item.owner} • {item.deadline}</span>
                    </div>

                    <span className="font-mono text-[10px] font-bold text-amber-600 shrink-0">{item.completionPct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 text-[10px] text-slate-400 flex items-center justify-between">
            <span>Collaborative Workload</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsNewTaskOpen(true)}
              className="h-6 text-[10px] font-bold text-amber-600 hover:bg-amber-50 p-0"
            >
              + Add Work Item
            </Button>
          </div>
        </Card>
      </div>

      {/* ASSIGN WORK MODAL */}
      <Dialog open={isNewTaskOpen} onOpenChange={setIsNewTaskOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-card border border-slate-200/80 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-1.5">
              <Plus className="h-4 w-4 text-amber-600" />
              <span>Assign Operational Work</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Delegate responsibilities like food, medicine, vehicle fuel, camera, tents, ropes, and first aid
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-xs py-2">
            <div>
              <label className="font-bold">Task Description *</label>
              <Input
                placeholder="e.g. Carry first aid kit / Buy food / Fuel vehicle"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                className="rounded-xl h-10 mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold">Assigned Member</label>
                <Input
                  placeholder="e.g. Sneha Patel"
                  value={newTaskOwner}
                  onChange={(e) => setNewTaskOwner(e.target.value)}
                  className="rounded-xl h-10 mt-1"
                />
              </div>

              <div>
                <label className="font-bold">Deadline</label>
                <Input
                  placeholder="e.g. Tomorrow, 18:00"
                  value={newTaskDeadline}
                  onChange={(e) => setNewTaskDeadline(e.target.value)}
                  className="rounded-xl h-10 mt-1"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button variant="outline" size="sm" onClick={() => setIsNewTaskOpen(false)} className="rounded-xl text-xs">
                Cancel
              </Button>
              <Button size="sm" onClick={handleCreateAssignment} className="rounded-xl text-xs font-bold bg-amber-600 text-white">
                Assign Work
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}

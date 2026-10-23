"use client";

import { useState } from "react";
import { TripLogisticsHub, LogisticsAccommodation } from "@/lib/types/trips";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Hotel,
  Calendar,
  MapPin,
  Phone,
  IndianRupee,
  Users,
  Plus,
  CheckCircle2,
  Clock,
  Star,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Search,
  Filter,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

interface AccommodationWorkspaceProps {
  hub: TripLogisticsHub;
  tripName?: string;
  onUpdateHub?: (hub: TripLogisticsHub) => void;
}

export function AccommodationWorkspace({ hub, tripName, onUpdateHub }: AccommodationWorkspaceProps) {
  const [accommodations, setAccommodations] = useState<LogisticsAccommodation[]>(hub.accommodation || []);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const filteredAccommodations = accommodations.filter((acc) => {
    const matchesSearch =
      acc.hotelName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      acc.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      acc.rooms.some((r) => r.roomType.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = filterStatus === "all" || acc.bookingStatus.toLowerCase() === filterStatus.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  const getEstimatedCost = (acc: LogisticsAccommodation) => {
    return acc.totalRooms * 4500;
  };

  const totalCost = accommodations.reduce((sum, a) => sum + getEstimatedCost(a), 0);

  return (
    <div className="space-y-6">
      {/* Header Summary Banner */}
      <div className="p-5 rounded-3xl bg-card border border-slate-200/80 dark:border-slate-800/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 shrink-0">
            <Hotel className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                Accommodation & Hospitality Command
              </h2>
              <Badge variant="secondary" className="bg-purple-500/10 text-purple-600 font-bold text-[10px] uppercase">
                {accommodations.length} Properties
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Room allocation matrix, check-in schedules, front desk contacts, and total lodging budget
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-center">
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Lodging (INR)</span>
            <span className="font-mono font-black text-lg text-slate-900 dark:text-slate-100">
              {formatCurrency(totalCost, "INR")}
            </span>
          </div>
          <Button
            size="sm"
            onClick={() => {
              toast.info("Add new lodging reservation wizard opened.");
            }}
            className="rounded-xl text-xs font-bold gap-1.5 h-9 bg-primary text-primary-foreground shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>Add Property</span>
          </Button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="p-3 rounded-2xl bg-card border border-slate-200/80 dark:border-slate-800/90 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search hotel name, address, room type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs rounded-xl border-slate-200/80 dark:border-slate-800"
          />
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-center overflow-x-auto w-full sm:w-auto">
          {["all", "confirmed", "tentative", "paid", "pending"].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize whitespace-nowrap transition-all ${
                filterStatus === st
                  ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Accommodation Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredAccommodations.map((acc) => {
          const allOccupants = acc.rooms?.flatMap((r) => r.occupants) || [];
          const cost = getEstimatedCost(acc);

          return (
            <Card
              key={acc.id}
              className="rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-card overflow-hidden shadow-xs hover:shadow-lg hover:border-purple-500/40 transition-all duration-200 flex flex-col justify-between"
            >
              <div className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-[10px] text-slate-400 font-bold">{acc.id}</span>
                      <Badge
                        className={`text-[9px] uppercase font-bold py-0 ${
                          acc.bookingStatus === "Confirmed" || acc.bookingStatus === "Paid"
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                        }`}
                      >
                        {acc.bookingStatus}
                      </Badge>
                    </div>
                    <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">
                      {acc.hotelName}
                    </h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3 text-primary shrink-0" />
                      <span>{acc.address}</span>
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Estimated (INR)</span>
                    <span className="font-mono font-black text-base text-purple-600 dark:text-purple-400">
                      {formatCurrency(cost, "INR")}
                    </span>
                  </div>
                </div>

                {/* Schedule and Rooms */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Check-in</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                      {acc.checkInDate} {acc.checkInTime && `• ${acc.checkInTime}`}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Check-out</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                      {acc.checkOutDate} {acc.checkOutTime && `• ${acc.checkOutTime}`}
                    </p>
                  </div>
                </div>

                {/* Room Sharing Roster */}
                <div className="space-y-2 pt-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      Room Inventory: {acc.totalRooms} Rooms Allocated
                    </span>
                    <span className="text-slate-400 text-[11px]">{allOccupants.length} Occupants Registered</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {allOccupants.length > 0 ? (
                      allOccupants.map((member: string, i: number) => (
                        <Badge key={i} variant="outline" className="text-[10px] font-medium py-0.5">
                          <Users className="h-3 w-3 mr-1 text-slate-400" />
                          {member}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-[10px] text-slate-400">Roster pending check-in</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Contact & Action Bar */}
              <div className="p-3 bg-slate-50/60 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-slate-500">
                  <Phone className="h-3.5 w-3.5 text-purple-600" />
                  <span className="font-mono">{acc.hotelContact || "+91 832 227 8890"}</span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    toast.success(`Opening room allocation matrix for ${acc.hotelName}`);
                  }}
                  className="text-xs font-bold text-purple-600 hover:text-purple-700 h-7"
                >
                  Manage Rooms <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            </Card>
          );
        })}

        {filteredAccommodations.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-400 text-xs rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-card/60">
            No accommodation properties matching current filter.
          </div>
        )}
      </div>
    </div>
  );
}

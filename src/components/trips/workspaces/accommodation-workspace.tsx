"use client";

import { useState } from "react";
import { TripLogisticsHub, LogisticsAccommodation, LogisticsRoomSharing } from "@/lib/types/trips";
import { Card } from "@/components/ui/card";
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
  ChevronRight,
  ShieldCheck,
  Search,
  Bed,
  UserPlus,
  Trash2,
  X,
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

  // Dialog States
  const [isAddPropertyOpen, setIsAddPropertyOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<LogisticsAccommodation | null>(null);

  // New Property Form State
  const [hotelName, setHotelName] = useState("");
  const [address, setAddress] = useState("");
  const [checkInDate, setCheckInDate] = useState("2026-11-01");
  const [checkOutDate, setCheckOutDate] = useState("2026-11-05");
  const [checkInTime, setCheckInTime] = useState("12:00 PM");
  const [checkOutTime, setCheckOutTime] = useState("11:00 AM");
  const [totalRooms, setTotalRooms] = useState("4");
  const [bookingStatus, setBookingStatus] = useState<LogisticsAccommodation["bookingStatus"]>("Confirmed");
  const [hotelContact, setHotelContact] = useState("+91 832 227 8890");

  // New Occupant in Manage Rooms modal
  const [newOccupantName, setNewOccupantName] = useState("");
  const [targetRoomIndex, setTargetRoomIndex] = useState<number>(0);

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

  const handleCreateProperty = () => {
    if (!hotelName.trim()) {
      toast.error("Please enter property name");
      return;
    }

    const roomsCount = Math.max(1, parseInt(totalRooms, 10) || 1);
    const generatedRooms: LogisticsRoomSharing[] = Array.from({ length: roomsCount }).map((_, i) => ({
      roomNumber: `Room ${101 + i}`,
      roomType: i === 0 ? "Executive Sea View Suite" : "Deluxe Double Room",
      capacity: 2,
      status: "Vacant",
      occupants: [],
    }));

    const newProperty: LogisticsAccommodation = {
      id: `acc_${Date.now()}`,
      hotelName: hotelName.trim(),
      address: address.trim() || "Goa Coastal Beach Road",
      checkInDate,
      checkOutDate,
      checkInTime: checkInTime.trim() || "12:00 PM",
      checkOutTime: checkOutTime.trim() || "11:00 AM",
      totalRooms: roomsCount,
      bookingStatus,
      hotelContact: hotelContact.trim() || "+91 98220 11223",
      rooms: generatedRooms,
    };

    const updated = [newProperty, ...accommodations];
    setAccommodations(updated);
    if (onUpdateHub) {
      onUpdateHub({ ...hub, accommodation: updated });
    }
    setIsAddPropertyOpen(false);
    setHotelName("");
    setAddress("");
    toast.success(`Property "${newProperty.hotelName}" registered in accommodation command!`);
  };

  const handleAddOccupantToRoom = (roomIndex: number) => {
    if (!selectedProperty || !newOccupantName.trim()) return;

    const updatedRooms = [...selectedProperty.rooms];
    const room = updatedRooms[roomIndex];
    if (room) {
      room.occupants = [...room.occupants, newOccupantName.trim()];
      room.status = room.occupants.length >= room.capacity ? "Occupied" : "Reserved";

      const updatedProperty: LogisticsAccommodation = {
        ...selectedProperty,
        rooms: updatedRooms,
      };

      setSelectedProperty(updatedProperty);
      const nextList = accommodations.map((a) => (a.id === updatedProperty.id ? updatedProperty : a));
      setAccommodations(nextList);
      if (onUpdateHub) {
        onUpdateHub({ ...hub, accommodation: nextList });
      }
      setNewOccupantName("");
      toast.success(`Added ${newOccupantName.trim()} to ${room.roomNumber}`);
    }
  };

  const handleRemoveOccupant = (roomIndex: number, occupantIndex: number) => {
    if (!selectedProperty) return;

    const updatedRooms = [...selectedProperty.rooms];
    const room = updatedRooms[roomIndex];
    if (room) {
      const removed = room.occupants[occupantIndex];
      room.occupants = room.occupants.filter((_, idx) => idx !== occupantIndex);
      room.status = room.occupants.length === 0 ? "Vacant" : "Reserved";

      const updatedProperty: LogisticsAccommodation = {
        ...selectedProperty,
        rooms: updatedRooms,
      };

      setSelectedProperty(updatedProperty);
      const nextList = accommodations.map((a) => (a.id === updatedProperty.id ? updatedProperty : a));
      setAccommodations(nextList);
      if (onUpdateHub) {
        onUpdateHub({ ...hub, accommodation: nextList });
      }
      toast.info(`Removed ${removed} from ${room.roomNumber}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Summary Banner */}
      <div className="p-5 rounded-3xl bg-card border border-slate-200/80 dark:border-slate-800/90 shadow-xs hover:border-purple-500/40 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
            onClick={() => setIsAddPropertyOpen(true)}
            className="rounded-xl text-xs font-bold gap-1.5 h-9 bg-purple-600 hover:bg-purple-700 text-white shadow-xs hover:shadow-md transition-all"
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
              onClick={() => setSelectedProperty(acc)}
              className="rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-card overflow-hidden shadow-xs hover:shadow-2xl hover:border-purple-500/60 hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between cursor-pointer group"
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
                    <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                      {acc.hotelName}
                    </h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3 text-purple-600 shrink-0" />
                      <span className="truncate">{acc.address}</span>
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block font-mono">Estimated Lodging</span>
                    <span className="font-mono font-black text-sm text-slate-800 dark:text-slate-200">
                      {formatCurrency(cost, "INR")}
                    </span>
                  </div>
                </div>

                {/* Check-In / Check-Out Timetable */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 space-y-1">
                    <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-400">
                      <Calendar className="h-3 w-3 text-purple-600" />
                      Check-In
                    </div>
                    <p className="font-bold text-slate-800 dark:text-slate-200">{acc.checkInDate}</p>
                    <span className="text-[10px] text-slate-400 font-mono">{acc.checkInTime}</span>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 space-y-1">
                    <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-400">
                      <Calendar className="h-3 w-3 text-purple-600" />
                      Check-Out
                    </div>
                    <p className="font-bold text-slate-800 dark:text-slate-200">{acc.checkOutDate}</p>
                    <span className="text-[10px] text-slate-400 font-mono">{acc.checkOutTime}</span>
                  </div>
                </div>

                {/* Rooms Summary & Occupants */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-500 flex items-center gap-1">
                      <Bed className="h-3.5 w-3.5 text-purple-600" />
                      {acc.totalRooms} Rooms Allocated
                    </span>
                    <span className="text-purple-600 font-mono text-[11px]">
                      {allOccupants.length} Guests Assigned
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {allOccupants.length > 0 ? (
                      allOccupants.map((member, idx) => (
                        <Badge
                          key={idx}
                          variant="secondary"
                          className="bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-200/60 text-[10px] py-0.5"
                        >
                          <Users className="h-2.5 w-2.5 mr-1" />
                          {member}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">No guests assigned yet — click to manage rooms</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Contact & Action Bar */}
              <div
                onClick={(e) => e.stopPropagation()}
                className="p-3.5 bg-slate-50/70 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-1.5 text-slate-500">
                  <Phone className="h-3.5 w-3.5 text-purple-600" />
                  <span className="font-mono">{acc.hotelContact || "+91 832 227 8890"}</span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedProperty(acc)}
                  className="text-xs font-bold text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950/30 h-8 rounded-xl"
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

      {/* MANAGE ROOMS MATRIX MODAL */}
      <Dialog open={!!selectedProperty} onOpenChange={(open) => !open && setSelectedProperty(null)}>
        <DialogContent className="sm:max-w-xl rounded-3xl p-6 bg-card border border-slate-200/80 dark:border-slate-800 max-h-[85vh] overflow-y-auto">
          {selectedProperty && (
            <div className="space-y-4">
              <DialogHeader>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-[10px] uppercase font-bold py-0.5">
                    {selectedProperty.bookingStatus}
                  </Badge>
                  <span className="text-xs text-slate-400 font-mono">
                    Front Desk: {selectedProperty.hotelContact}
                  </span>
                </div>
                <DialogTitle className="text-lg font-black text-slate-900 dark:text-slate-100 text-left">
                  {selectedProperty.hotelName} — Room & Sharing Matrix
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 text-left">
                  {selectedProperty.address} • Check-in: {selectedProperty.checkInDate} ({selectedProperty.checkInTime})
                </DialogDescription>
              </DialogHeader>

              {/* Room Inventory List */}
              <div className="space-y-3 pt-2">
                {selectedProperty.rooms.map((room, rIdx) => (
                  <div
                    key={rIdx}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bed className="h-4 w-4 text-purple-600" />
                        <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100">
                          {room.roomNumber} ({room.roomType})
                        </h4>
                      </div>
                      <Badge
                        variant="secondary"
                        className={`text-[9px] uppercase font-bold ${
                          room.status === "Occupied"
                            ? "bg-rose-500/10 text-rose-600"
                            : room.status === "Reserved"
                            ? "bg-amber-500/10 text-amber-600"
                            : "bg-emerald-500/10 text-emerald-600"
                        }`}
                      >
                        {room.status} • {room.occupants.length}/{room.capacity}
                      </Badge>
                    </div>

                    {/* Occupants list */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {room.occupants.map((occ, oIdx) => (
                        <span
                          key={oIdx}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 font-medium shadow-xs"
                        >
                          <Users className="h-3 w-3 text-purple-600" />
                          <span>{occ}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveOccupant(rIdx, oIdx)}
                            className="text-slate-400 hover:text-rose-500 ml-1"
                            title="Remove guest"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}

                      {room.occupants.length === 0 && (
                        <span className="text-[11px] text-slate-400 italic">No guests allocated in this room</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Guest Form */}
              <div className="p-3.5 rounded-2xl bg-purple-500/5 border border-purple-500/20 space-y-2">
                <span className="text-xs font-bold text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
                  <UserPlus className="h-3.5 w-3.5 text-purple-600" />
                  Assign Guest to Room
                </span>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Guest full name (e.g. Sneha Patel)..."
                    value={newOccupantName}
                    onChange={(e) => setNewOccupantName(e.target.value)}
                    className="h-9 text-xs rounded-xl"
                  />
                  <select
                    value={targetRoomIndex}
                    onChange={(e) => setTargetRoomIndex(parseInt(e.target.value, 10))}
                    className="h-9 rounded-xl border border-slate-200 dark:border-slate-800 bg-background px-3 text-xs shrink-0"
                  >
                    {selectedProperty.rooms.map((rm, idx) => (
                      <option key={idx} value={idx}>
                        {rm.roomNumber} ({rm.occupants.length}/{rm.capacity})
                      </option>
                    ))}
                  </select>
                  <Button
                    size="sm"
                    onClick={() => handleAddOccupantToRoom(targetRoomIndex)}
                    className="rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white h-9 px-3 shrink-0"
                  >
                    Assign
                  </Button>
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  size="sm"
                  onClick={() => setSelectedProperty(null)}
                  className="rounded-xl text-xs h-9 px-4"
                >
                  Done
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ADD PROPERTY MODAL */}
      <Dialog open={isAddPropertyOpen} onOpenChange={setIsAddPropertyOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-card border border-slate-200/80 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-1.5">
              <Hotel className="h-4 w-4 text-purple-600" />
              <span>Add Hotel / Lodging Property</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Register accommodations, check-in schedules, and room inventory for the trip.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 text-xs py-2">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300">Property Name *</label>
              <Input
                placeholder="e.g. Taj Fort Aguada / Heritage Coastal Resort"
                value={hotelName}
                onChange={(e) => setHotelName(e.target.value)}
                className="rounded-xl h-10 mt-1"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300">Address / Location *</label>
              <Input
                placeholder="e.g. Sinquerim, Candolim, North Goa"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="rounded-xl h-10 mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Check-In Date</label>
                <Input
                  type="date"
                  value={checkInDate}
                  onChange={(e) => setCheckInDate(e.target.value)}
                  className="rounded-xl h-10 mt-1"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Check-Out Date</label>
                <Input
                  type="date"
                  value={checkOutDate}
                  onChange={(e) => setCheckOutDate(e.target.value)}
                  className="rounded-xl h-10 mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Total Rooms</label>
                <Input
                  type="number"
                  min="1"
                  value={totalRooms}
                  onChange={(e) => setTotalRooms(e.target.value)}
                  className="rounded-xl h-10 mt-1"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Status</label>
                <select
                  value={bookingStatus}
                  onChange={(e) => setBookingStatus(e.target.value as any)}
                  className="w-full rounded-xl h-10 mt-1 border border-slate-200/80 dark:border-slate-800 bg-background px-3 text-xs"
                >
                  <option value="Confirmed">Confirmed</option>
                  <option value="Paid">Paid</option>
                  <option value="Tentative">Tentative</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Phone</label>
                <Input
                  placeholder="+91 832 227 8890"
                  value={hotelContact}
                  onChange={(e) => setHotelContact(e.target.value)}
                  className="rounded-xl h-10 mt-1"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAddPropertyOpen(false)}
                className="rounded-xl text-xs h-9"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleCreateProperty}
                className="rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white h-9 px-4"
              >
                Save Property
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

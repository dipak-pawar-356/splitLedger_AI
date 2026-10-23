"use client";

import { useState, useMemo, useEffect } from "react";
import QRCode from "qrcode";
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
  Edit2,
  Copy,
  Lock,
  Unlock,
  Archive,
  RotateCcw,
  ShieldCheck,
  AlertTriangle,
  MapPin,
  CheckCircle2,
  CreditCard,
  Share2,
  Download,
  Search,
  Filter,
  Layers,
  Plane,
  Hotel,
  Car,
  Utensils,
  History,
  Activity,
  UserPlus,
  UserMinus,
  Crown,
  Snowflake,
  ExternalLink,
  Printer,
  FileSpreadsheet,
  Phone,
  Shield,
  Fuel,
  Navigation,
  Sun,
  CloudRain,
  Wind,
  Mountain,
  Eye,
  QrCode,
  Train,
  Bus,
  Check,
  Globe,
  Loader2,
} from "lucide-react";
import {
  TripRecord,
  TripExpense,
  BudgetCategoryKey,
  TripDocument,
  TripChecklistItem,
  TripEvent,
  TripStatus,
  TripEventStatus,
  MemberRole,
} from "@/lib/types/trips";
import {
  addTripExpense,
  editTripExpense,
  duplicateTripExpense,
  toggleExpensePersonalShared,
  deleteTripExpense,
  recordTripSettlement,
  cancelTripSettlement,
  addItineraryStop,
  deleteItineraryStop,
  addTripEvent,
  editTripEvent,
  duplicateTripEvent,
  deleteTripEvent,
  updateTripEventStatus,
  addTripDocument,
  deleteTripDocument,
  addTripChecklistItem,
  editTripChecklistItem,
  duplicateTripChecklistItem,
  toggleChecklistItem,
  deleteChecklistItem,
  addTripMember,
  removeTripMember,
  updateTripMemberRole,
  toggleMemberFreeze,
  toggleMemberPastExpenseInclusion,
  transferTripOwnership,
  updateTripDetails,
  updateTripStatus,
  updateCategoryBudget,
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
  initialTab?: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  Transportation: "#3b82f6",
  Hotel: "#8b5cf6",
  Food: "#10b981",
  Fuel: "#f59e0b",
  Shopping: "#ec4899",
  Adventure: "#06b6d4",
  "Entry Tickets": "#6366f1",
  Medical: "#ef4444",
  Emergency: "#f97316",
  Miscellaneous: "#64748b",
  Custom: "#14b8a6",
};

function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csvContent =
    "data:text/csv;charset=utf-8," +
    rows.map((e) => e.map((x) => `"${String(x ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function TripDetailDashboard({ trip: initialTrip, onBack, onTripUpdated, initialTab = "overview" }: TripDetailDashboardProps) {
  const [trip, setTrip] = useState<TripRecord>(initialTrip);
  const [activeTab, setActiveTab] = useState<string>(initialTab);

  // Modals for CRUD & Inspections
  const [isEditTripOpen, setIsEditTripOpen] = useState(false);
  const [isHealthBreakdownOpen, setIsHealthBreakdownOpen] = useState(false);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isEditExpenseOpen, setIsEditExpenseOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<TripExpense | null>(null);

  const [isRecordSettlementOpen, setIsRecordSettlementOpen] = useState(false);
  const [isAddItineraryOpen, setIsAddItineraryOpen] = useState(false);
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [isEditEventOpen, setIsEditEventOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<TripEvent | null>(null);

  const [isAddDocOpen, setIsAddDocOpen] = useState(false);
  const [isAddChecklistOpen, setIsAddChecklistOpen] = useState(false);
  const [isEditChecklistOpen, setIsEditChecklistOpen] = useState(false);
  const [editingChecklist, setEditingChecklist] = useState<TripChecklistItem | null>(null);

  const [isInviteMemberOpen, setIsInviteMemberOpen] = useState(false);
  const [isEditCategoryOpen, setIsEditCategoryOpen] = useState(false);
  const [editingCategoryKey, setEditingCategoryKey] = useState<BudgetCategoryKey>("Transportation");
  const [editingCategoryAllocated, setEditingCategoryAllocated] = useState("");

  // Edit Trip Form States
  const [editName, setEditName] = useState(trip.name);
  const [editDestination, setEditDestination] = useState(trip.destination);
  const [editCountry, setEditCountry] = useState(trip.country);
  const [editState, setEditState] = useState(trip.state || "");
  const [editCity, setEditCity] = useState(trip.city || "");
  const [editMeetingPoint, setEditMeetingPoint] = useState(trip.meetingPoint || "");
  const [editTravelType, setEditTravelType] = useState(trip.travelType || "Leisure / Holiday");
  const [editVisibility, setEditVisibility] = useState(trip.visibility || "shared");
  const [editDescription, setEditDescription] = useState(trip.description || "");
  const [editCoverImage, setEditCoverImage] = useState(trip.coverImage || "");
  const [editNotes, setEditNotes] = useState(trip.notes || "");
  const [editStartDate, setEditStartDate] = useState(trip.startDate);
  const [editEndDate, setEditEndDate] = useState(trip.endDate);
  const [editTotalBudget, setEditTotalBudget] = useState(String(trip.budgetAmount));
  const [editEmergencyBuffer, setEditEmergencyBuffer] = useState(String(trip.emergencyBuffer));

  // Form states for Expense Add/Edit
  const [expenseTitle, setExpenseTitle] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseCategory, setExpenseCategory] = useState<BudgetCategoryKey>("Food");
  const [expensePaidById, setExpensePaidById] = useState(trip.members[0]?.id || "");
  const [expenseIsPersonal, setExpenseIsPersonal] = useState(false);
  const [expenseLocation, setExpenseLocation] = useState("");
  const [expenseNotes, setExpenseNotes] = useState("");
  const [expensePaymentMethod, setExpensePaymentMethod] = useState<TripExpense["paymentMethod"]>("UPI");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split("T")[0]);
  const [expenseSplitMembers, setExpenseSplitMembers] = useState<string[]>(trip.members.map((m) => m.id));

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
  const [eventActualCost, setEventActualCost] = useState("");
  const [eventPriority, setEventPriority] = useState<"High" | "Medium" | "Low">("Medium");
  const [eventStatus, setEventStatus] = useState<TripEventStatus>("upcoming");
  const [eventMapsLink, setEventMapsLink] = useState("");
  const [eventNotes, setEventNotes] = useState("");
  const [eventVenue, setEventVenue] = useState("");
  const [eventAddress, setEventAddress] = useState("");
  const [eventDressCode, setEventDressCode] = useState("");
  const [eventTransportPlan, setEventTransportPlan] = useState("");
  const [eventParkingInfo, setEventParkingInfo] = useState("");
  const [eventWeatherForecast, setEventWeatherForecast] = useState("");
  const [selectedEventQr, setSelectedEventQr] = useState<TripEvent | null>(null);
  const [eventQrCodeUrl, setEventQrCodeUrl] = useState<string>("");
  const [isGeneratingEventQr, setIsGeneratingEventQr] = useState<boolean>(false);

  // Generate real camera-scannable QR code for the selected event pass
  useEffect(() => {
    if (selectedEventQr) {
      setIsGeneratingEventQr(true);
      const origin = typeof window !== "undefined" && window.location.origin ? window.location.origin : "https://splitledger.ai";
      const payload = `${origin}/events/${selectedEventQr.publicId || selectedEventQr.id}`;
      QRCode.toDataURL(payload, {
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
          setIsGeneratingEventQr(false);
        })
        .catch((err) => {
          console.error("Event QR generation failed", err);
          setIsGeneratingEventQr(false);
        });
    } else {
      setEventQrCodeUrl("");
      setIsGeneratingEventQr(false);
    }
  }, [selectedEventQr]);

  // Form states for Document
  const [docTitle, setDocTitle] = useState("");
  const [docCategory, setDocCategory] = useState<TripDocument["category"]>("Hotel Booking");
  const [docFileName, setDocFileName] = useState("");

  // Form states for Checklist
  const [chkTitle, setChkTitle] = useState("");
  const [chkCategory, setChkCategory] = useState<TripChecklistItem["category"]>("Clothes");
  const [chkPriority, setChkPriority] = useState<TripChecklistItem["priority"]>("Medium");
  const [chkMember, setChkMember] = useState(trip.members[0]?.name || "Member");
  const [chkDueDate, setChkDueDate] = useState("");

  // Form states for Member
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberRole, setNewMemberRole] = useState<MemberRole>("Member");
  const [newMemberContribution, setNewMemberContribution] = useState("0");

  const updateTripState = (updated: TripRecord) => {
    setTrip(updated);
    onTripUpdated(updated);
  };

  // Status Change Handler
  const handleStatusChange = async (newStatus: TripStatus) => {
    try {
      const updated = await updateTripStatus(trip.id, newStatus);
      updateTripState(updated);
      toast.success(`Trip status moved to ${newStatus.toUpperCase()}`);
    } catch {
      toast.error("Failed to update status");
    }
  };

  // Save Full Trip Details
  const handleSaveTripDetails = async () => {
    try {
      const updated = await updateTripDetails(trip.id, {
        name: editName,
        destination: editDestination,
        country: editCountry,
        state: editState,
        city: editCity,
        meetingPoint: editMeetingPoint,
        travelType: editTravelType,
        visibility: editVisibility as any,
        description: editDescription,
        coverImage: editCoverImage,
        notes: editNotes,
        startDate: editStartDate,
        endDate: editEndDate,
        budgetAmount: Number(editTotalBudget) || trip.budgetAmount,
        emergencyBuffer: Number(editEmergencyBuffer) || trip.emergencyBuffer,
      });
      updateTripState(updated);
      setIsEditTripOpen(false);
      toast.success("Trip configuration and budget parameters synchronized!");
    } catch (err: any) {
      toast.error(err?.message || "Failed to update trip details");
    }
  };

  // Expense Handlers
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
        date: expenseDate,
        paidById: expensePaidById || trip.members[0].id,
        isPersonal: expenseIsPersonal,
        splitBetweenMemberIds: expenseIsPersonal ? [expensePaidById] : expenseSplitMembers,
        paymentMethod: expensePaymentMethod,
        location: expenseLocation,
        notes: expenseNotes,
      });
      updateTripState(updated);
      toast.success("Expense recorded and budgets recalculated!");
      setIsAddExpenseOpen(false);
      setExpenseTitle("");
      setExpenseAmount("");
      setExpenseLocation("");
      setExpenseNotes("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to record expense");
    }
  };

  const handleOpenEditExpense = (exp: TripExpense) => {
    setEditingExpense(exp);
    setExpenseTitle(exp.title);
    setExpenseAmount(String(exp.amount));
    setExpenseCategory(exp.category);
    setExpensePaidById(exp.paidById);
    setExpenseIsPersonal(exp.isPersonal);
    setExpenseDate(exp.date);
    setExpensePaymentMethod(exp.paymentMethod);
    setExpenseLocation(exp.location || "");
    setExpenseNotes(exp.notes || "");
    setExpenseSplitMembers(exp.splitBetweenMemberIds || trip.members.map((m) => m.id));
    setIsEditExpenseOpen(true);
  };

  const handleSaveEditExpense = async () => {
    if (!editingExpense) return;
    try {
      const updated = await editTripExpense(trip.id, editingExpense.id, {
        title: expenseTitle,
        amount: Number(expenseAmount),
        category: expenseCategory,
        paidById: expensePaidById,
        isPersonal: expenseIsPersonal,
        date: expenseDate,
        paymentMethod: expensePaymentMethod,
        location: expenseLocation,
        notes: expenseNotes,
        splitBetweenMemberIds: expenseIsPersonal ? [expensePaidById] : expenseSplitMembers,
      });
      updateTripState(updated);
      setIsEditExpenseOpen(false);
      setEditingExpense(null);
      toast.success("Expense changes reconciled across all ledgers!");
    } catch (err: any) {
      toast.error(err?.message || "Failed to edit expense");
    }
  };

  const handleDuplicateExpense = async (expId: string) => {
    try {
      const updated = await duplicateTripExpense(trip.id, expId);
      updateTripState(updated);
      toast.success("Expense duplicated!");
    } catch {
      toast.error("Failed to duplicate expense.");
    }
  };

  const handleTogglePersonalShared = async (expId: string) => {
    try {
      const updated = await toggleExpensePersonalShared(trip.id, expId);
      updateTripState(updated);
      toast.success("Expense split type updated and shares re-distributed!");
    } catch {
      toast.error("Failed to convert expense.");
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

  // Category Budget Handlers
  const handleOpenEditCategory = (cat: BudgetCategoryKey, currentAllocated: number) => {
    setEditingCategoryKey(cat);
    setEditingCategoryAllocated(String(currentAllocated));
    setIsEditCategoryOpen(true);
  };

  const handleSaveCategoryAllocation = async () => {
    try {
      const updated = await updateCategoryBudget(
        trip.id,
        editingCategoryKey,
        Number(editingCategoryAllocated) || 0
      );
      updateTripState(updated);
      setIsEditCategoryOpen(false);
      toast.success(`Allocated budget updated for ${editingCategoryKey}!`);
    } catch {
      toast.error("Failed to update allocation.");
    }
  };

  const handleToggleCategoryLock = async (cat: BudgetCategoryKey, isCurrentlyLocked: boolean) => {
    try {
      const target = trip.categoryBudgets.find((c) => c.category === cat);
      const updated = await updateCategoryBudget(
        trip.id,
        cat,
        target?.allocated || 0,
        !isCurrentlyLocked,
        target?.isArchived
      );
      updateTripState(updated);
      toast.success(`${cat} is now ${!isCurrentlyLocked ? "Locked" : "Unlocked"}`);
    } catch {
      toast.error("Failed to toggle category lock");
    }
  };

  const handleToggleCategoryArchive = async (cat: BudgetCategoryKey, isCurrentlyArchived: boolean) => {
    try {
      const target = trip.categoryBudgets.find((c) => c.category === cat);
      const updated = await updateCategoryBudget(
        trip.id,
        cat,
        target?.allocated || 0,
        target?.isLocked,
        !isCurrentlyArchived
      );
      updateTripState(updated);
      toast.success(`${cat} is now ${!isCurrentlyArchived ? "Archived" : "Restored"}`);
    } catch {
      toast.error("Failed to archive category");
    }
  };

  // Settlement Handlers
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
      toast.success("Debt settlement confirmed and balances updated!");
      setIsRecordSettlementOpen(false);
      setSettleAmount("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to record settlement");
    }
  };

  const handleReverseSettlement = async (stlId: string) => {
    try {
      const updated = await cancelTripSettlement(trip.id, stlId);
      updateTripState(updated);
      toast.success("Settlement reversed and member balances adjusted.");
    } catch {
      toast.error("Failed to reverse settlement.");
    }
  };

  // Member Management Handlers
  const handleAddMember = async () => {
    if (!newMemberName.trim()) {
      toast.error("Member name is required.");
      return;
    }
    try {
      const updated = await addTripMember(trip.id, {
        name: newMemberName,
        email: newMemberEmail,
        role: newMemberRole,
        contribution: Number(newMemberContribution) || 0,
      });
      updateTripState(updated);
      setIsInviteMemberOpen(false);
      setNewMemberName("");
      setNewMemberEmail("");
      toast.success(`${newMemberName} added to the travel group!`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to add member");
    }
  };

  const handleMemberRoleChange = async (memberId: string, role: MemberRole) => {
    try {
      const updated = await updateTripMemberRole(trip.id, memberId, role);
      updateTripState(updated);
      toast.success("Member role updated!");
    } catch {
      toast.error("Failed to update role");
    }
  };

  const handleToggleFreeze = async (memberId: string) => {
    try {
      const updated = await toggleMemberFreeze(trip.id, memberId);
      updateTripState(updated);
      toast.success("Member access status toggled!");
    } catch {
      toast.error("Failed to toggle freeze state");
    }
  };

  const handleTogglePastExpenses = async (memberId: string) => {
    try {
      const updated = await toggleMemberPastExpenseInclusion(trip.id, memberId);
      updateTripState(updated);
      toast.success("Member past expense share recalculated!");
    } catch {
      toast.error("Failed to update past expense inclusion");
    }
  };

  const handleTransferOwnership = async (newOwnerId: string) => {
    if (!confirm("Are you sure you want to transfer full trip ownership?")) return;
    try {
      const updated = await transferTripOwnership(trip.id, newOwnerId);
      updateTripState(updated);
      toast.success("Ownership transferred successfully!");
    } catch (err: any) {
      toast.error(err?.message || "Failed to transfer ownership");
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm("Remove this member from the trip? Existing expenses will be re-split.")) return;
    try {
      const updated = await removeTripMember(trip.id, memberId);
      updateTripState(updated);
      toast.success("Member removed and group ledger rebalanced.");
    } catch (err: any) {
      toast.error(err?.message || "Failed to remove member");
    }
  };

  // Event Handlers
  const handleAddEvent = async () => {
    if (!eventTitle.trim()) return;
    try {
      const updated = await addTripEvent(trip.id, {
        title: eventTitle,
        type: eventType,
        startDateTime: eventDate,
        location: eventLocation || "Main Location",
        venue: eventVenue,
        address: eventAddress,
        budget: Number(eventBudget) || 0,
        dressCode: eventDressCode,
        transportPlan: eventTransportPlan,
        parkingInfo: eventParkingInfo,
        priority: eventPriority,
        notes: eventNotes,
      });
      updateTripState(updated);
      toast.success("Event scheduled!");
      setIsAddEventOpen(false);
      setEventTitle("");
      setEventLocation("");
      setEventVenue("");
      setEventAddress("");
      setEventBudget("");
      setEventDressCode("");
      setEventTransportPlan("");
      setEventParkingInfo("");
      setEventNotes("");
    } catch {
      toast.error("Failed to create event.");
    }
  };

  const handleOpenEditEvent = (evt: TripEvent) => {
    setEditingEvent(evt);
    setEventTitle(evt.title);
    setEventType(evt.type);
    setEventDate(evt.startDateTime);
    setEventLocation(evt.location);
    setEventVenue(evt.venue || "");
    setEventAddress(evt.address || "");
    setEventBudget(String(evt.budget || 0));
    setEventActualCost(String(evt.actualCost || 0));
    setEventPriority(evt.priority || "Medium");
    setEventStatus(evt.status);
    setEventMapsLink(evt.mapsLink || "");
    setEventDressCode(evt.dressCode || "");
    setEventTransportPlan(evt.transportPlan || "");
    setEventParkingInfo(evt.parkingInfo || "");
    setEventWeatherForecast(evt.weatherForecast || "");
    setEventNotes(evt.notes || "");
    setIsEditEventOpen(true);
  };

  const handleSaveEditEvent = async () => {
    if (!editingEvent) return;
    try {
      const updated = await editTripEvent(trip.id, editingEvent.id, {
        title: eventTitle,
        type: eventType,
        startDateTime: eventDate,
        location: eventLocation,
        venue: eventVenue,
        address: eventAddress,
        budget: Number(eventBudget) || 0,
        actualCost: Number(eventActualCost) || 0,
        priority: eventPriority,
        status: eventStatus,
        mapsLink: eventMapsLink,
        dressCode: eventDressCode,
        transportPlan: eventTransportPlan,
        parkingInfo: eventParkingInfo,
        weatherForecast: eventWeatherForecast,
        notes: eventNotes,
      });
      updateTripState(updated);
      setIsEditEventOpen(false);
      setEditingEvent(null);
      toast.success("Event details updated!");
    } catch {
      toast.error("Failed to update event.");
    }
  };

  const handleDuplicateEvent = async (evtId: string) => {
    try {
      const updated = await duplicateTripEvent(trip.id, evtId);
      updateTripState(updated);
      toast.success("Event duplicated!");
    } catch {
      toast.error("Failed to duplicate event.");
    }
  };

  const handleEventStatusChange = async (evtId: string, status: TripEventStatus) => {
    try {
      const updated = await updateTripEventStatus(trip.id, evtId, status);
      updateTripState(updated);
      toast.success(`Event status set to ${status}!`);
    } catch {
      toast.error("Failed to update event status.");
    }
  };

  // Checklist Handlers
  const handleToggleChecklist = async (itemId: string) => {
    try {
      const updated = await toggleChecklistItem(trip.id, itemId);
      updateTripState(updated);
    } catch {
      toast.error("Failed to toggle checklist item.");
    }
  };

  const handleOpenEditChecklist = (chk: TripChecklistItem) => {
    setEditingChecklist(chk);
    setChkTitle(chk.title);
    setChkCategory(chk.category);
    setChkPriority(chk.priority);
    setChkMember(chk.assignedMemberName);
    setChkDueDate(chk.dueDate || "");
    setIsEditChecklistOpen(true);
  };

  const handleSaveEditChecklist = async () => {
    if (!editingChecklist) return;
    try {
      const updated = await editTripChecklistItem(trip.id, editingChecklist.id, {
        title: chkTitle,
        category: chkCategory,
        priority: chkPriority,
        assignedMemberName: chkMember,
        dueDate: chkDueDate,
      });
      updateTripState(updated);
      setIsEditChecklistOpen(false);
      setEditingChecklist(null);
      toast.success("Checklist item updated!");
    } catch {
      toast.error("Failed to update checklist item.");
    }
  };

  const handleDuplicateChecklist = async (itemId: string) => {
    try {
      const updated = await duplicateTripChecklistItem(trip.id, itemId);
      updateTripState(updated);
      toast.success("Checklist item duplicated!");
    } catch {
      toast.error("Failed to duplicate checklist item.");
    }
  };

  // Filtered Expenses
  const filteredExpenses = useMemo(() => {
    return trip.expenses.filter((exp) => {
      const matchesSearch =
        exp.title.toLowerCase().includes(expenseSearch.toLowerCase()) ||
        exp.paidByName.toLowerCase().includes(expenseSearch.toLowerCase()) ||
        (exp.location && exp.location.toLowerCase().includes(expenseSearch.toLowerCase()));
      const matchesCategory =
        expenseCategoryFilter === "all" || exp.category === expenseCategoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [trip.expenses, expenseSearch, expenseCategoryFilter]);

  // Analytics Chart Data
  const chartCategoryData = useMemo(() => {
    return trip.categoryBudgets.map((c) => ({
      name: c.category,
      Allocated: c.allocated,
      Spent: c.spent,
    }));
  }, [trip.categoryBudgets]);

  const checklistProgress = useMemo(() => {
    if (!trip.checklists || trip.checklists.length === 0) return 0;
    const packed = trip.checklists.filter((c) => c.isPacked || c.isCompleted).length;
    return Math.round((packed / trip.checklists.length) * 100);
  }, [trip.checklists]);

  // Status Badge Styling Helper
  const getStatusBadgeClass = (status: TripStatus) => {
    switch (status) {
      case "active":
      case "ongoing":
        return "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30";
      case "upcoming":
      case "planning":
        return "bg-amber-500/15 text-amber-600 border border-amber-500/30";
      case "completed":
        return "bg-blue-500/15 text-blue-600 border border-blue-500/30";
      case "paused":
      case "draft":
        return "bg-purple-500/15 text-purple-600 border border-purple-500/30";
      case "cancelled":
      case "archived":
        return "bg-slate-500/15 text-slate-500 border border-slate-500/30";
      default:
        return "bg-slate-100 dark:bg-slate-800 text-slate-600";
    }
  };

  const handleExportExpensesCsv = () => {
    if (!trip.expenses || trip.expenses.length === 0) {
      toast.info("No expenses to export.");
      return;
    }
    const headers = ["Title", "Category", "Amount", "Currency", "Paid By", "Date", "Location", "Split Method", "Personal"];
    const rows = trip.expenses.map((e) => [
      `"${e.title.replace(/"/g, '""')}"`,
      `"${e.category}"`,
      e.amount,
      `"${trip.currency}"`,
      `"${e.paidByName}"`,
      `"${e.date}"`,
      `"${(e.location || "").replace(/"/g, '""')}"`,
      `"${e.splitMethod || "EQUAL"}"`,
      e.isPersonal ? "Yes" : "No",
    ]);
    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${trip.name.replace(/[^a-z0-9]/gi, "_")}_expenses.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Expenses CSV exported!");
  };

  const handleExportBudgetCsv = () => {
    if (!trip.categoryBudgets || trip.categoryBudgets.length === 0) {
      toast.info("No budget data to export.");
      return;
    }
    const headers = ["Category", "Allocated", "Spent", "Remaining", "Usage Pct", "Status", "Locked", "Archived"];
    const rows = trip.categoryBudgets.map((c) => [
      `"${c.category}"`,
      c.allocated,
      c.spent,
      c.allocated - c.spent,
      `${c.usagePct}%`,
      c.isOverBudget ? "Over Budget" : "Within Budget",
      c.isLocked ? "Yes" : "No",
      c.isArchived ? "Yes" : "No",
    ]);
    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${trip.name.replace(/[^a-z0-9]/gi, "_")}_budget_reconciliation.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Budget CSV exported!");
  };

  const handleExportMembersCsv = () => {
    if (!trip.members || trip.members.length === 0) {
      toast.info("No members to export.");
      return;
    }
    const headers = ["Member Name", "Role", "Paid Amount", "Fair Share", "Receivable", "Payable", "Status", "Frozen", "Excluded From Past"];
    const rows = trip.members.map((m) => [
      `"${m.name}"`,
      `"${m.role}"`,
      m.paid,
      m.ownShare,
      m.receivable,
      m.pending,
      `"${m.settlementStatus}"`,
      m.isFrozen ? "Yes" : "No",
      m.isExcludedFromPastExpenses ? "Yes" : "No",
    ]);
    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${trip.name.replace(/[^a-z0-9]/gi, "_")}_member_ledger.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Member Ledger CSV exported!");
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Header & Breadcrumb Nav */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={onBack}
            className="rounded-2xl h-10 w-10 border-slate-200/80 dark:border-slate-800 shrink-0 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                {trip.name}
              </h1>

              {/* Editable Trip Status Selector */}
              <select
                value={trip.status}
                onChange={(e) => handleStatusChange(e.target.value as TripStatus)}
                className={`text-[10px] uppercase font-bold tracking-wider rounded-lg px-2.5 py-1 border transition-all cursor-pointer ${getStatusBadgeClass(
                  trip.status
                )}`}
              >
                <option value="draft">Draft</option>
                <option value="planning">Planning</option>
                <option value="upcoming">Upcoming</option>
                <option value="active">Active</option>
                <option value="ongoing">Ongoing</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="archived">Archived</option>
              </select>

              {/* Health Score Pill (Clickable for Modal Breakdown) */}
              <button
                onClick={() => setIsHealthBreakdownOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 text-[10px] font-bold tracking-wider uppercase hover:bg-indigo-500/20 transition-all cursor-pointer"
                title="Click to view weighted health score audit"
              >
                <ShieldCheck className="h-3 w-3" />
                <span>
                  {trip.financialHealthScore}/100 Grade {trip.healthReport?.grade || "A"}
                </span>
              </button>
            </div>

            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1 flex-wrap">
              <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
              <span>
                {trip.destination}, {trip.country}
                {trip.state ? ` (${trip.state})` : ""} • {trip.startDate} to {trip.endDate} ({trip.durationDays} Days)
                • Organizer: <strong>{trip.organizerName}</strong>
              </span>
            </p>
          </div>
        </div>

        {/* Global Quick Action Bar */}
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
            variant="outline"
            onClick={() => setIsEditTripOpen(true)}
            className="rounded-xl text-xs font-bold gap-1.5 border-slate-200/80 dark:border-slate-800 hover:border-primary hover:text-primary transition-all"
          >
            <Edit2 className="h-3.5 w-3.5" />
            <span>Edit Trip</span>
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => window.print()}
            className="rounded-xl text-xs font-bold gap-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
          >
            <Printer className="h-4 w-4" />
            <span>Print PDF</span>
          </Button>
        </div>
      </div>

      {/* Live Budget Validation Warnings (Data-Driven Alerts) */}
      {trip.actualTotal > trip.allocatedBudget && (
        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between gap-3 text-xs text-rose-800 dark:text-rose-200">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
            <div>
              <span className="font-bold">Budget Overrun Detected:</span> Actual outflow exceeds category allocation by{" "}
              <strong>₹{(trip.actualTotal - trip.allocatedBudget).toLocaleString("en-IN")}</strong>.
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setActiveTab("budget")}
            className="rounded-xl text-[11px] h-7 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-bold"
          >
            Rebalance Budget
          </Button>
        </div>
      )}

      {trip.actualTotal <= trip.allocatedBudget && trip.budgetUsedPct >= 80 && (
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-xs text-amber-800 dark:text-amber-200">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <div>
              <span className="font-bold">80% Budget Ceiling Warning:</span> {trip.budgetUsedPct}% of allocated funds consumed.
              Recommended ceiling: <strong>₹{trip.recommendedDailySpend.toLocaleString("en-IN")}/day</strong>.
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setActiveTab("analytics")}
            className="rounded-xl text-[11px] h-7 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300 font-bold"
          >
            Inspect Velocity
          </Button>
        </div>
      )}

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

        <div
          onClick={() => setIsHealthBreakdownOpen(true)}
          className="p-3.5 rounded-2xl bg-card border border-slate-200/80 dark:border-slate-800/90 shadow-xs cursor-pointer hover:border-indigo-500 transition-all"
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 flex items-center justify-between">
            <span>Health Score</span>
            <span className="text-[9px] font-black underline">View</span>
          </span>
          <p className="text-base font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
            {trip.financialHealthScore}/100 <span className="text-xs font-bold">({trip.healthReport?.grade || "A"})</span>
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

      {/* 12 Deep Sub-Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-slate-100 dark:bg-slate-800/90 p-1 rounded-2xl flex-wrap h-auto gap-1">
          <TabsTrigger value="overview" className="rounded-xl text-xs font-semibold">Overview</TabsTrigger>
          <TabsTrigger value="destination" className="rounded-xl text-xs font-semibold flex items-center gap-1.5">
            <Compass className="h-3.5 w-3.5 text-cyan-500" />
            <span>Destination & GIS</span>
          </TabsTrigger>
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
          <TabsTrigger value="audit" className="rounded-xl text-xs font-semibold flex items-center gap-1">
            <History className="h-3 w-3" />
            <span>Audit Trail</span>
          </TabsTrigger>
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
                          {exp.category} • Paid by {exp.paidByName} • {exp.date} • {exp.isPersonal ? "Personal" : "Shared"}
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
                    <div key={idx} className="p-2.5 rounded-xl bg-background/80 border border-primary/20 text-slate-700 dark:text-slate-300">
                      • {insight}
                    </div>
                  ))}
                  {trip.aiInsights.length === 0 && (
                    <p className="text-slate-400">All trip systems are currently within optimal parameters.</p>
                  )}
                </div>
              </Card>

              {/* Checklist Progress Card */}
              <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-card p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">Luggage & Packing Health</h4>
                  <span className="font-mono font-bold text-xs text-primary">{checklistProgress}%</span>
                </div>
                <Progress value={checklistProgress} className="h-2 rounded-full" />
                <p className="text-[11px] text-slate-400">
                  {trip.checklists.filter((c) => c.isPacked || c.isCompleted).length} of {trip.checklists.length} essentials verified.
                </p>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* DESTINATION & GIS INTELLIGENCE HUB */}
        <TabsContent value="destination" className="space-y-6">
          {(() => {
            const dest = trip.destinationInfo;
            const coords = dest?.coordinates || { latitude: 15.2993, longitude: 74.1240, altitudeMeters: 10 };
            const climate = dest?.climate;
            const logistics = dest?.logistics;
            const amenities = dest?.amenities;
            const poi = dest?.pointsOfInterest;
            const safety = dest?.safetyRatings;
            const culture = dest?.cultureAndRules;
            const emergency = dest?.emergencyNumbers;

            const mapsQuery = encodeURIComponent(
              `${dest?.city || trip.city || trip.destination}, ${dest?.state || trip.state || ""}, ${dest?.country || trip.country}`
            );
            const googleMapsSearchUrl = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;
            const googleMapsDirUrl = `https://www.google.com/maps/dir/?api=1&destination=${coords.latitude},${coords.longitude}`;

            return (
              <div className="space-y-6">
                {/* 1. Destination Intelligence Hero Banner */}
                <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-gradient-to-r from-cyan-900/10 via-card to-indigo-900/10 p-6 md:p-8">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" className="font-mono text-[10px] uppercase font-bold tracking-wider">
                          {trip.publicId}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] uppercase font-bold text-cyan-600 dark:text-cyan-400 border-cyan-500/30">
                          GIS Active Hub
                        </Badge>
                        {culture?.unescoStatus && (
                          <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[10px]">
                            {culture.unescoStatus}
                          </Badge>
                        )}
                      </div>
                      <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <MapPin className="h-6 w-6 text-primary shrink-0" />
                        <span>{dest?.city || trip.city || trip.destination}</span>
                        <span className="text-sm md:text-base font-normal text-slate-400">
                          ({dest?.state || trip.state ? `${dest?.state || trip.state}, ` : ""}{dest?.country || trip.country})
                        </span>
                      </h2>
                      <p className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
                        <span><strong>Region:</strong> {dest?.region || trip.region || "Western Coast / Ghats"}</span>
                        <span>•</span>
                        <span><strong>District:</strong> {dest?.district || trip.district || "North Goa"}</span>
                        <span>•</span>
                        <span><strong>Timezone:</strong> {dest?.timezone || dest?.timeZone || trip.timezone || "IST (UTC+05:30)"}</span>
                        <span>•</span>
                        <span><strong>Currency:</strong> {dest?.currency || trip.currency} (₹)</span>
                        <span>•</span>
                        <span><strong>Language:</strong> {dest?.languages ? dest.languages.join(" / ") : dest?.language || "English / Hindi / Regional"}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap shrink-0">
                      <a
                        href={googleMapsSearchUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:opacity-95 shadow-xs transition-all"
                      >
                        <Navigation className="h-3.5 w-3.5" />
                        <span>Open in Google Maps</span>
                      </a>
                      <a
                        href={googleMapsDirUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-200/80 dark:border-slate-800 bg-background hover:bg-slate-50 dark:hover:bg-slate-900 transition-all"
                      >
                        <ArrowUpRight className="h-3.5 w-3.5" />
                        <span>Route & Directions</span>
                      </a>
                      {culture?.govtTourismUrl && (
                        <a
                          href={culture.govtTourismUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-primary transition-all"
                          title="Official Tourism Portal"
                        >
                          <Globe className="h-3.5 w-3.5" />
                          <span>Official Portal</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Four Executive Metrics Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-3xl bg-card border border-slate-200/80 dark:border-slate-800/90 shadow-xs space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-500 flex items-center gap-1">
                      <Compass className="h-3.5 w-3.5" /> Coordinates & ASL
                    </span>
                    <p className="text-sm font-black text-slate-900 dark:text-slate-100 font-mono">
                      {coords.latitude.toFixed(4)}°N, {coords.longitude.toFixed(4)}°E
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Altitude: {coords.altitudeMeters ?? 15}m above sea level
                    </p>
                  </div>

                  <div className="p-4 rounded-3xl bg-card border border-slate-200/80 dark:border-slate-800/90 shadow-xs space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1">
                      <Sun className="h-3.5 w-3.5" /> Live Temperature
                    </span>
                    <p className="text-sm font-black text-slate-900 dark:text-slate-100">
                      {climate?.avgTempCelsius ?? 27}°C <span className="text-xs font-normal text-slate-400">({climate?.expectedWeather || "Warm / Coastal"})</span>
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Range: {climate?.minTempCelsius ?? 22}°C – {climate?.maxTempCelsius ?? 32}°C
                    </p>
                  </div>

                  <div className="p-4 rounded-3xl bg-card border border-slate-200/80 dark:border-slate-800/90 shadow-xs space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 flex items-center gap-1">
                      <Wind className="h-3.5 w-3.5" /> Atmosphere & AQI
                    </span>
                    <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                      AQI {climate?.airQualityIndex ?? 42} ({climate?.airQualityStatus || "Good"})
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Rain Probability: {climate?.rainProbabilityPct ?? 10}%
                    </p>
                  </div>

                  <div className="p-4 rounded-3xl bg-card border border-slate-200/80 dark:border-slate-800/90 shadow-xs space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 flex items-center gap-1">
                      <Shield className="h-3.5 w-3.5" /> Safety & Crowd
                    </span>
                    <p className="text-sm font-black text-indigo-600 dark:text-indigo-400">
                      {safety?.overallSafetyScore ?? 92}/100 Index
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Crowd Level: {climate?.crowdLevel || "Moderate"}
                    </p>
                  </div>
                </div>

                {/* 3. Primary Grid: Logistics & Transit on Left | Emergency & Safety Command on Right */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Column: Transit, Logistics & Infrastructure */}
                  <div className="space-y-6">
                    {/* Transit Gateways Card */}
                    <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-card p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          <Plane className="h-4 w-4 text-primary" />
                          <span>Transit Gateways & Arrival Points</span>
                        </h3>
                        <Badge variant="outline" className="text-[10px]">Tri-Modal</Badge>
                      </div>

                      <div className="space-y-3 text-xs">
                        {/* Airport */}
                        {(() => {
                          const airport = dest?.nearestAirport;
                          const name = typeof airport === "object" ? airport.name : (airport || "Nearest Airport");
                          const iata = typeof airport === "object" && airport.iataCode ? ` (${airport.iataCode})` : "";
                          const dist = typeof airport === "object" && airport.distanceKm ? airport.distanceKm : 28;
                          const drive = typeof airport === "object" && airport.driveTimeHours ? airport.driveTimeHours : 0.7;

                          return (
                            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 flex items-start justify-between gap-3">
                              <div className="flex items-center gap-2.5">
                                <Plane className="h-4 w-4 text-cyan-500 shrink-0" />
                                <div>
                                  <p className="font-bold text-slate-900 dark:text-slate-100">
                                    {name}{iata}
                                  </p>
                                  <p className="text-[11px] text-slate-400">
                                    Domestic & International Gateway
                                  </p>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                                  {dist} km
                                </span>
                                <p className="text-[10px] text-slate-400">~{drive} hrs</p>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Railway Station */}
                        {(() => {
                          const rly = dest?.nearestRailwayStation;
                          const name = typeof rly === "object" ? rly.name : (rly || "Nearest Railway Station");
                          const code = typeof rly === "object" && rly.stationCode ? ` (${rly.stationCode})` : "";
                          const dist = typeof rly === "object" && rly.distanceKm ? rly.distanceKm : 22;

                          return (
                            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 flex items-start justify-between gap-3">
                              <div className="flex items-center gap-2.5">
                                <Train className="h-4 w-4 text-amber-500 shrink-0" />
                                <div>
                                  <p className="font-bold text-slate-900 dark:text-slate-100">
                                    {name}{code}
                                  </p>
                                  <p className="text-[11px] text-slate-400">Express, Vande Bharat & Mail Terminus</p>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                                  {dist} km
                                </span>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Bus Station */}
                        {(() => {
                          const bus = dest?.nearestBusStation;
                          const name = typeof bus === "object" ? bus.name : (bus || "Central Interstate Bus Terminal");
                          const dist = typeof bus === "object" && bus.distanceKm ? bus.distanceKm : 6;

                          return (
                            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 flex items-start justify-between gap-3">
                              <div className="flex items-center gap-2.5">
                                <Bus className="h-4 w-4 text-indigo-500 shrink-0" />
                                <div>
                                  <p className="font-bold text-slate-900 dark:text-slate-100">
                                    {name}
                                  </p>
                                  <p className="text-[11px] text-slate-400">State Transport & Private Volvos</p>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                                  {dist} km
                                </span>
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                        <span><strong>Best Season:</strong> {climate?.bestSeason || "October to March"}</span>
                        <span><strong>Sun:</strong> {climate?.sunriseTime || "06:15 AM"} ↑ / {climate?.sunsetTime || "06:45 PM"} ↓</span>
                      </div>
                    </Card>

                    {/* Logistics, Terrain & Utilities Card */}
                    <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-card p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          <Car className="h-4 w-4 text-primary" />
                          <span>Terrain, Utilities & Infrastructure</span>
                        </h3>
                        <Badge variant="secondary" className="text-[10px]">Verified Logistics</Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="p-3 rounded-2xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 space-y-0.5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Travel Difficulty</span>
                          <p className="font-bold text-slate-900 dark:text-slate-100">{logistics?.travelDifficulty || "Easy"}</p>
                        </div>

                        <div className="p-3 rounded-2xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 space-y-0.5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Road Conditions</span>
                          <p className="font-bold text-slate-900 dark:text-slate-100">{logistics?.roadCondition || "Paved Highways"}</p>
                        </div>

                        <div className="p-3 rounded-2xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 space-y-0.5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Cellular & Internet</span>
                          <p className="font-bold text-slate-900 dark:text-slate-100">
                            {logistics?.networkAvailability || "5G High Speed"} ({logistics?.internetSpeedMbps ?? 65} Mbps)
                          </p>
                        </div>

                        <div className="p-3 rounded-2xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 space-y-0.5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Electricity & Grid</span>
                          <p className="font-bold text-slate-900 dark:text-slate-100">{logistics?.electricityReliability || "24/7 Grid Power"}</p>
                        </div>

                        <div className="p-3 rounded-2xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 space-y-0.5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Drinking Water</span>
                          <p className="font-bold text-slate-900 dark:text-slate-100">{logistics?.drinkingWaterAvailability || "Readily Available"}</p>
                        </div>

                        <div className="p-3 rounded-2xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 space-y-0.5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Fuel Availability</span>
                          <p className="font-bold text-slate-900 dark:text-slate-100">{logistics?.fuelAvailability || "Regular Stations"}</p>
                        </div>
                      </div>

                      <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 text-xs flex items-center justify-between">
                        <span className="text-slate-500 font-medium">Parking Availability:</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">{logistics?.parkingAvailability || "Free Dedicated Parking"}</span>
                      </div>
                    </Card>

                    {/* Points of Interest, Natural Wonders & Attractions */}
                    <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-card p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          <Compass className="h-4 w-4 text-cyan-500" />
                          <span>Points of Interest & Attractions</span>
                        </h3>
                        <Badge variant="outline" className="text-[10px]">Top Picks</Badge>
                      </div>

                      <div className="space-y-2.5 text-xs">
                        {(poi?.topAttractions || []).map((att, i) => (
                          <div key={i} className="p-3 rounded-2xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                            <div>
                              <p className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                                <span>{att.name}</span>
                                <Badge variant="secondary" className="text-[9px] py-0">{att.type}</Badge>
                              </p>
                              <p className="text-[11px] text-slate-400">
                                Entry: {att.entryFee === 0 ? "Free Entry" : `₹${att.entryFee}`} • Distance: {att.distanceKm} km
                              </p>
                            </div>
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(att.mapsQuery || att.name)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary hover:underline text-[11px] flex items-center gap-1 font-bold shrink-0"
                            >
                              <ExternalLink className="h-3 w-3" /> Map
                            </a>
                          </div>
                        ))}

                        {/* Trek Routes */}
                        {(poi?.trekRoutes || []).length > 0 && (
                          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                            <span className="text-[10px] font-bold uppercase text-slate-400">Recommended Trek Routes</span>
                            <div className="mt-1 space-y-1.5">
                              {poi?.trekRoutes?.map((trek, i) => (
                                <div key={i} className="flex justify-between items-center text-xs p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60">
                                  <span className="font-bold text-slate-800 dark:text-slate-200">{trek.name}</span>
                                  <span className="text-[11px] text-slate-400 font-mono">
                                    {trek.difficulty} • {trek.durationHours} hrs • {trek.distanceKm} km
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Recommended Stays & Eateries */}
                        {(amenities?.nearbyHotels || []).length > 0 && (
                          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                            <span className="text-[10px] font-bold uppercase text-slate-400">Recommended Stays</span>
                            <div className="mt-1 grid grid-cols-2 gap-2">
                              {amenities?.nearbyHotels?.map((h, i) => (
                                <div key={i} className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 text-xs">
                                  <p className="font-bold truncate">{h.name}</p>
                                  <p className="text-[10px] text-slate-400">★ {h.rating} • ₹{h.approxPriceNight}/nt • {h.distanceKm}km</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </Card>
                  </div>

                  {/* Right Column: Emergency Hotlines, Safety Command & Local Rules */}
                  <div className="space-y-6">
                    {/* Emergency Response & Rapid Dial Hub */}
                    <Card className="rounded-3xl border border-rose-200 dark:border-rose-900/50 bg-gradient-to-br from-rose-500/5 via-card to-background p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-sm text-rose-600 dark:text-rose-400 flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          <span>Emergency Command & Rapid Dial Hotlines</span>
                        </h3>
                        <Badge variant="destructive" className="text-[10px]">24/7 Response</Badge>
                      </div>

                      {/* Rapid 1-Click Dial Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                        <a
                          href={`tel:${emergency?.nationalEmergency || "112"}`}
                          className="p-3 rounded-2xl bg-card border border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all text-center group"
                        >
                          <span className="text-[9px] font-bold uppercase text-slate-400">National Emergency</span>
                          <p className="text-base font-black text-rose-600 dark:text-rose-400 group-hover:scale-105 transition-transform">
                            {emergency?.nationalEmergency || "112"}
                          </p>
                          <span className="text-[9px] text-slate-400">All-in-One</span>
                        </a>

                        <a
                          href={`tel:${emergency?.ambulance || "108"}`}
                          className="p-3 rounded-2xl bg-card border border-slate-200 dark:border-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-all text-center group"
                        >
                          <span className="text-[9px] font-bold uppercase text-slate-400">Medical Ambulance</span>
                          <p className="text-base font-black text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
                            {emergency?.ambulance || "108"}
                          </p>
                          <span className="text-[9px] text-slate-400">Immediate EMT</span>
                        </a>

                        <a
                          href={`tel:${emergency?.police || "100"}`}
                          className="p-3 rounded-2xl bg-card border border-slate-200 dark:border-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-all text-center group"
                        >
                          <span className="text-[9px] font-bold uppercase text-slate-400">Police Hotline</span>
                          <p className="text-base font-black text-indigo-600 dark:text-indigo-400 group-hover:scale-105 transition-transform">
                            {emergency?.police || "100"}
                          </p>
                          <span className="text-[9px] text-slate-400">Law Enforcement</span>
                        </a>

                        <a
                          href={`tel:${emergency?.touristHelpline || "1363"}`}
                          className="p-3 rounded-2xl bg-card border border-slate-200 dark:border-slate-800 hover:bg-cyan-50 dark:hover:bg-cyan-950/30 transition-all text-center group"
                        >
                          <span className="text-[9px] font-bold uppercase text-slate-400">Tourist Support</span>
                          <p className="text-base font-black text-cyan-600 dark:text-cyan-400 group-hover:scale-105 transition-transform">
                            {emergency?.touristHelpline || "1363"}
                          </p>
                          <span className="text-[9px] text-slate-400">Govt 24/7 Multi-Lingual</span>
                        </a>

                        <a
                          href={`tel:${emergency?.womenHelpline || "1091"}`}
                          className="p-3 rounded-2xl bg-card border border-slate-200 dark:border-slate-800 hover:bg-purple-50 dark:hover:bg-purple-950/30 transition-all text-center group"
                        >
                          <span className="text-[9px] font-bold uppercase text-slate-400">Women Helpline</span>
                          <p className="text-base font-black text-purple-600 dark:text-purple-400 group-hover:scale-105 transition-transform">
                            {emergency?.womenHelpline || "1091"}
                          </p>
                          <span className="text-[9px] text-slate-400">Safety & Support</span>
                        </a>

                        <a
                          href={`tel:${emergency?.fire || "101"}`}
                          className="p-3 rounded-2xl bg-card border border-slate-200 dark:border-slate-800 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-all text-center group"
                        >
                          <span className="text-[9px] font-bold uppercase text-slate-400">Fire & Rescue</span>
                          <p className="text-base font-black text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform">
                            {emergency?.fire || "101"}
                          </p>
                          <span className="text-[9px] text-slate-400">Disaster Dispatch</span>
                        </a>
                      </div>

                      {/* Nearby Medical & Police Details */}
                      <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                        <div className="flex justify-between items-center p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60">
                          <div>
                            <p className="font-bold text-slate-900 dark:text-slate-100">{amenities?.nearbyHospital || "District Civil Hospital"}</p>
                            <p className="text-[11px] text-slate-400">{amenities?.medicalFacilities || "24/7 Trauma, ICU & Blood Bank"} • {amenities?.nearbyHospitalDistanceKm ?? 3.5} km</p>
                          </div>
                          <a href={`tel:${amenities?.nearbyHospitalPhone || "108"}`} className="font-mono font-bold text-emerald-600 text-xs px-2.5 py-1 rounded-lg bg-emerald-500/10">
                            Call {amenities?.nearbyHospitalPhone || "108"}
                          </a>
                        </div>

                        <div className="flex justify-between items-center p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60">
                          <div>
                            <p className="font-bold text-slate-900 dark:text-slate-100">{amenities?.policeStation || "Local Police Headquarters"}</p>
                            <p className="text-[11px] text-slate-400">Jurisdiction Center • {amenities?.policeStationDistanceKm ?? 2.1} km</p>
                          </div>
                          <a href={`tel:${amenities?.policeStationPhone || "112"}`} className="font-mono font-bold text-indigo-600 text-xs px-2.5 py-1 rounded-lg bg-indigo-500/10">
                            Call {amenities?.policeStationPhone || "112"}
                          </a>
                        </div>
                      </div>
                    </Card>

                    {/* Safety Matrix & Ratings */}
                    <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-card p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          <ShieldCheck className="h-4 w-4 text-emerald-500" />
                          <span>Safety Audit & Demographic Ratings</span>
                        </h3>
                        <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px]">
                          Score: {safety?.overallSafetyScore ?? 94}/100
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 text-center">
                          <span className="text-[9px] uppercase font-bold text-slate-400">Solo Travel</span>
                          <p className="font-bold text-emerald-600 mt-0.5">{safety?.soloFriendly !== false ? "Friendly ✓" : "Caution"}</p>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 text-center">
                          <span className="text-[9px] uppercase font-bold text-slate-400">Family Rating</span>
                          <p className="font-bold text-emerald-600 mt-0.5">{safety?.familyFriendly !== false ? "Top Tier ✓" : "Moderate"}</p>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 text-center">
                          <span className="text-[9px] uppercase font-bold text-slate-400">Night Safety</span>
                          <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{safety?.nightSafetyScore ?? 88}/100</p>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 text-center">
                          <span className="text-[9px] uppercase font-bold text-slate-400">Wheelchair</span>
                          <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{safety?.wheelchairAccessible ? "Accessible" : "Partial"}</p>
                        </div>
                      </div>

                      <p className="text-xs text-slate-500 italic p-3 rounded-2xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800">
                        &ldquo;{safety?.safetyRemarks || "High tourist footfall area with continuous police patrolling and illuminated pedestrian corridors."}&rdquo;
                      </p>
                    </Card>

                    {/* Culture, Heritage, Drone Laws & Luggage Recommendations */}
                    <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-card p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          <FileText className="h-4 w-4 text-primary" />
                          <span>Regulations, Heritage & Essential Packing</span>
                        </h3>
                        <Badge variant="outline" className="text-[10px]">Compliance</Badge>
                      </div>

                      <div className="space-y-3 text-xs">
                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60">
                          <span className="font-medium text-slate-600 dark:text-slate-400">Drone Flying Policy:</span>
                          <Badge variant="secondary" className="font-bold text-[10px]">
                            {culture?.droneRules || "Permitted with DGCA License"}
                          </Badge>
                        </div>

                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60">
                          <span className="font-medium text-slate-600 dark:text-slate-400">Photography Rules:</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200 text-right">
                            {culture?.photographyRules || "Permitted in public spaces; respect sacred spaces"}
                          </span>
                        </div>

                        {/* Local Rules */}
                        <div>
                          <span className="text-[10px] font-bold uppercase text-slate-400">Local Customs & Etiquette</span>
                          <ul className="mt-1 space-y-1 text-slate-600 dark:text-slate-400">
                            {(culture?.localRules || [
                              "Respect local community dress codes at temples and religious heritage monuments.",
                              "Carry digital and physical copies of government IDs.",
                              "Observe environmental zero-plastic rules in coastal and forested zones.",
                            ]).map((rule, idx) => (
                              <li key={idx} className="flex items-start gap-1.5">
                                <span className="text-primary mt-0.5">•</span>
                                <span>{rule}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Packing Suggestions */}
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                          <span className="text-[10px] font-bold uppercase text-slate-400">Suggested Packing Items</span>
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {(culture?.packingSuggestions || [
                              "Cotton apparel",
                              "Sunscreen SPF 50+",
                              "Comfortable walking shoes",
                              "Portable powerbank",
                              "Universal adapter",
                              "Govt Photo ID",
                            ]).map((item, idx) => (
                              <Badge key={idx} variant="outline" className="text-[10px] py-0.5 font-normal">
                                {item}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>
              </div>
            );
          })()}
        </TabsContent>

        {/* 2. BUDGET MANAGEMENT TAB */}
        <TabsContent value="budget" className="space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Category Allocations & Variance</h3>
              <p className="text-xs text-slate-500">
                Total Budget: {formatCurrency(trip.budgetAmount, trip.currency)} • Allocated: {formatCurrency(trip.allocatedBudget, trip.currency)} • Emergency Reserve: {formatCurrency(trip.emergencyBuffer, trip.currency)}
              </p>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => handleOpenEditCategory("Transportation", 0)}
              className="rounded-xl text-xs font-bold gap-1 border-slate-200/80 dark:border-slate-800"
            >
              <Plus className="h-4 w-4" /> Adjust Category Budget
            </Button>
          </div>

          {/* Multi-Category Breakdown Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {trip.categoryBudgets.map((cat) => (
              <Card
                key={cat.category}
                className={`rounded-3xl border bg-card p-5 space-y-3 transition-all duration-250 group hover:-translate-y-1 hover:shadow-lg ${
                  cat.isOverBudget
                    ? "border-rose-300 dark:border-rose-900/60"
                    : cat.isLocked
                    ? "border-amber-300 dark:border-amber-900/60 opacity-85"
                    : "border-slate-200/80 dark:border-slate-800/90"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{cat.category}</span>
                    {cat.isLocked && <span title="Category Locked"><Lock className="h-3 w-3 text-amber-500" /></span>}
                    {cat.isArchived && <span title="Category Archived"><Archive className="h-3 w-3 text-slate-400" /></span>}
                  </div>

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
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleOpenEditCategory(cat.category, cat.allocated)}
                      className="h-6 w-6 text-slate-400 hover:text-primary"
                      title="Edit Category Allocation"
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleToggleCategoryLock(cat.category, Boolean(cat.isLocked))}
                      className="h-6 w-6 text-slate-400 hover:text-amber-500"
                      title={cat.isLocked ? "Unlock Category" : "Lock Category"}
                    >
                      {cat.isLocked ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleToggleCategoryArchive(cat.category, Boolean(cat.isArchived))}
                      className="h-6 w-6 text-slate-400 hover:text-rose-500"
                      title={cat.isArchived ? "Restore Category" : "Archive Category"}
                    >
                      <Archive className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Variance Comparison Table */}
          <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-card overflow-hidden">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold">Category Financial Reconciliation</CardTitle>
                <CardDescription className="text-xs">
                  Variance is automatically audited against real expense receipts and logged allocations.
                </CardDescription>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleExportBudgetCsv}
                className="rounded-xl text-xs font-bold gap-1.5"
              >
                <Download className="h-3.5 w-3.5" /> Export Budget CSV
              </Button>
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
                      <td className="p-3.5 font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        {c.category}
                        {c.isLocked && <Badge variant="outline" className="text-[8px] py-0">Locked</Badge>}
                        {c.isArchived && <Badge variant="secondary" className="text-[8px] py-0">Archived</Badge>}
                      </td>
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

            <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
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
                variant="outline"
                onClick={handleExportExpensesCsv}
                className="rounded-xl text-xs font-bold gap-1 h-10 border-slate-200/80 dark:border-slate-800"
              >
                <Download className="h-3.5 w-3.5" /> CSV
              </Button>

              <Button
                size="sm"
                onClick={() => setIsAddExpenseOpen(true)}
                className="rounded-xl text-xs font-bold gap-1.5 bg-primary text-primary-foreground h-10 px-4"
              >
                <Plus className="h-4 w-4" /> Add Expense
              </Button>
            </div>
          </div>

          {/* Outflow Breakdown Bar */}
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between text-xs flex-wrap gap-2 font-mono">
            <span>Logged: <strong>{trip.expenses.length} Expenses</strong></span>
            <span>Personal Spend: <strong className="text-slate-800 dark:text-slate-200">{formatCurrency(trip.personalExpensesTotal, trip.currency)}</strong></span>
            <span>Shared Outflow: <strong className="text-primary">{formatCurrency(trip.sharedExpensesTotal, trip.currency)}</strong></span>
            <span>Reconciled Actual: <strong className="text-rose-600">{formatCurrency(trip.actualTotal, trip.currency)}</strong></span>
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
                    <th className="p-3.5 text-right">Actions</th>
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
                        <button
                          onClick={() => handleTogglePersonalShared(exp.id)}
                          className="cursor-pointer"
                          title="Click to toggle between Personal and Shared"
                        >
                          <Badge variant={exp.isPersonal ? "outline" : "secondary"} className="text-[9px] uppercase hover:bg-primary/20">
                            {exp.isPersonal ? "Personal" : "Shared Group"}
                          </Badge>
                        </button>
                      </td>
                      <td className="p-3.5 text-slate-500 font-mono">{exp.date}</td>
                      <td className="p-3.5 text-slate-500">{exp.paymentMethod}</td>
                      <td className="p-3.5 text-right font-mono font-black text-slate-900 dark:text-slate-100">
                        {formatCurrency(exp.amount, trip.currency)}
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleOpenEditExpense(exp)}
                            className="h-7 w-7 text-slate-400 hover:text-primary"
                            title="Edit Expense"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDuplicateExpense(exp.id)}
                            className="h-7 w-7 text-slate-400 hover:text-indigo-600"
                            title="Duplicate Expense"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDeleteExpense(exp.id)}
                            className="h-7 w-7 text-slate-400 hover:text-rose-600"
                            title="Delete Expense"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredExpenses.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        No expenses match your search criteria.
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
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Pairwise Debt & Balance Matrix</h3>
              <p className="text-xs text-slate-500">Every member balance automatically reconciles with shared expenses and completed transfers.</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleExportMembersCsv}
                className="rounded-xl text-xs font-bold gap-1"
              >
                <Download className="h-3.5 w-3.5" /> Ledger CSV
              </Button>
              <Button
                size="sm"
                onClick={() => setIsRecordSettlementOpen(true)}
                className="rounded-xl text-xs font-bold gap-1 bg-primary text-primary-foreground"
              >
                <Plus className="h-4 w-4" /> Settle Debt
              </Button>
            </div>
          </div>

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
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-emerald-600">{formatCurrency(s.amount, trip.currency)}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleReverseSettlement(s.id)}
                      className="text-xs text-rose-500 hover:text-rose-700 h-7"
                    >
                      Reverse
                    </Button>
                  </div>
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
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Group Travel Events & Milestones</h3>
              <p className="text-xs text-slate-500">Coordinate flights, stays, dining, and activities with permanent check-in IDs.</p>
            </div>
            <Button size="sm" onClick={() => setIsAddEventOpen(true)} className="rounded-xl text-xs font-bold gap-1 bg-primary text-primary-foreground shadow-xs">
              <Plus className="h-4 w-4" /> Add Event
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {trip.events.map((evt) => {
              const priorityColor =
                evt.priority === "High"
                  ? "border-rose-500/40 text-rose-600 dark:text-rose-400 bg-rose-500/10"
                  : evt.priority === "Low"
                  ? "border-slate-500/30 text-slate-500 bg-slate-500/10"
                  : "border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10";

              return (
                <Card
                  key={evt.id}
                  className="rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-card p-5 h-full flex flex-col justify-between hover:-translate-y-1.5 transition-all duration-200 hover:shadow-lg hover:border-primary/50 group"
                >
                  <div className="space-y-3">
                    {/* Header Bar */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(evt.publicId || evt.id);
                              toast.success("Event Public ID copied to clipboard!");
                            }}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-mono font-bold text-primary hover:bg-primary/10 transition-colors"
                            title="Click to copy permanent Public ID"
                          >
                            <span>{evt.publicId || evt.id}</span>
                            <Copy className="h-2.5 w-2.5 text-slate-400 group-hover:text-primary transition-colors" />
                          </button>
                          <Badge variant="outline" className={`text-[10px] font-bold uppercase ${priorityColor}`}>
                            {evt.priority || "Medium"} Priority
                          </Badge>
                          <Badge variant="secondary" className="capitalize text-[10px]">
                            {evt.type.replace(/_/g, " ")}
                          </Badge>
                        </div>
                        <h4 className="font-bold text-base text-slate-900 dark:text-slate-100 mt-0.5">
                          {evt.title}
                        </h4>
                      </div>

                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setSelectedEventQr(evt)}
                        className="h-8 w-8 text-slate-400 hover:text-primary shrink-0"
                        title="View Check-in QR Code"
                      >
                        <QrCode className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Schedule & Venue Meta */}
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                        <span className="flex items-center gap-1.5 font-medium">
                          <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span>{evt.startDateTime}</span>
                        </span>
                        {evt.endDateTime && (
                          <span className="text-[11px] text-slate-400">until {evt.endDateTime}</span>
                        )}
                      </div>

                      <div className="flex items-start justify-between gap-2 text-slate-600 dark:text-slate-300">
                        <span className="flex items-start gap-1.5 font-medium">
                          <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0 mt-0.5" />
                          <span>
                            {evt.venue ? `${evt.venue}, ` : ""}{evt.location}
                            {evt.address && <span className="block text-[11px] text-slate-400 font-normal">{evt.address}</span>}
                          </span>
                        </span>
                        {evt.mapsLink && (
                          <a
                            href={evt.mapsLink}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary hover:underline flex items-center gap-1 font-bold shrink-0 text-[11px]"
                          >
                            <ExternalLink className="h-3 w-3" /> Map
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Financial & Attendance Metrics */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Budget Allocation</span>
                        <p className="font-mono font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                          {formatCurrency(evt.budget, trip.currency)}
                        </p>
                        {evt.actualCost ? (
                          <p className="text-[10px] text-rose-500 font-mono">
                            Actual: {formatCurrency(evt.actualCost, trip.currency)}
                          </p>
                        ) : null}
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Attendance & Host</span>
                        <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                          {evt.currentAttendance ?? trip.members.length} / {evt.expectedAttendance ?? trip.members.length} Confirmed
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">
                          Host: {evt.organizerName || trip.organizerName}
                        </p>
                      </div>
                    </div>

                    {/* Operational Badges (Dress Code, Transport, Parking, Weather) */}
                    <div className="flex flex-wrap gap-1.5 text-[11px]">
                      {evt.dressCode && (
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/50 dark:border-slate-700/50">
                          Dress: {evt.dressCode}
                        </span>
                      )}
                      {evt.transportPlan && (
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/50 dark:border-slate-700/50">
                          Transit: {evt.transportPlan}
                        </span>
                      )}
                      {evt.parkingInfo && (
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/50 dark:border-slate-700/50">
                          Parking: {evt.parkingInfo}
                        </span>
                      )}
                      {evt.weatherForecast && (
                        <span className="px-2 py-0.5 rounded-md bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
                          Weather: {evt.weatherForecast}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Bottom Controls */}
                  <div className="pt-3 mt-3 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                    <select
                      value={evt.status}
                      onChange={(e) => handleEventStatusChange(evt.id, e.target.value as TripEventStatus)}
                      className="text-[10px] font-bold rounded-lg border border-slate-200 dark:border-slate-800 px-2 py-1 bg-background cursor-pointer"
                    >
                      <option value="upcoming">Upcoming</option>
                      <option value="ongoing">Ongoing</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="missed">Missed</option>
                      <option value="rescheduled">Rescheduled</option>
                    </select>

                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setSelectedEventQr(evt)}
                        className="h-7 w-7 text-slate-400 hover:text-cyan-500"
                        title="View Event Check-in QR"
                      >
                        <QrCode className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleOpenEditEvent(evt)}
                        className="h-7 w-7 text-slate-400 hover:text-primary"
                        title="Edit Event"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDuplicateEvent(evt.id)}
                        className="h-7 w-7 text-slate-400 hover:text-indigo-600"
                        title="Duplicate Event"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteTripEvent(trip.id, evt.id).then(updateTripState)}
                        className="h-7 w-7 text-slate-400 hover:text-rose-600"
                        title="Delete Event"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
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
                    checked={Boolean(chk.isPacked || chk.isCompleted)}
                    onChange={() => handleToggleChecklist(chk.id)}
                    className="h-4 w-4 rounded text-primary focus:ring-primary cursor-pointer"
                  />
                  <div>
                    <span className={`font-semibold ${chk.isPacked || chk.isCompleted ? "line-through text-slate-400" : "text-slate-900 dark:text-slate-100"}`}>
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
                    onClick={() => handleOpenEditChecklist(chk)}
                    className="h-7 w-7 text-slate-400 hover:text-primary"
                    title="Edit Item"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDuplicateChecklist(chk.id)}
                    className="h-7 w-7 text-slate-400 hover:text-indigo-600"
                    title="Duplicate Item"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => deleteChecklistItem(trip.id, chk.id).then(updateTripState)}
                    className="h-7 w-7 text-slate-400 hover:text-rose-600"
                    title="Delete Item"
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
              <UserPlus className="h-4 w-4" /> Invite Member
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {trip.members.map((m) => (
              <Card
                key={m.id}
                className={`rounded-3xl border bg-card p-5 space-y-3.5 transition-all ${
                  m.isFrozen
                    ? "border-amber-300 dark:border-amber-900/60 opacity-80"
                    : "border-slate-200/80 dark:border-slate-800/90"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                      {m.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        {m.name}
                        {m.role === "Owner" && <Crown className="h-3.5 w-3.5 text-amber-500" />}
                      </p>
                      <select
                        value={m.role}
                        disabled={m.role === "Owner"}
                        onChange={(e) => handleMemberRoleChange(m.id, e.target.value as MemberRole)}
                        className="text-[10px] font-bold rounded-lg border border-slate-200 dark:border-slate-800 px-2 py-0.5 bg-background cursor-pointer mt-0.5"
                      >
                        <option value="Owner">Owner</option>
                        <option value="Admin">Admin</option>
                        <option value="Member">Member</option>
                        <option value="Guest">Guest</option>
                      </select>
                    </div>
                  </div>

                  <Badge variant={m.settlementStatus === "settled" ? "outline" : m.settlementStatus === "overpaid" ? "secondary" : "destructive"}>
                    {m.settlementStatus}
                  </Badge>
                </div>

                <div className="space-y-1 text-xs border-t border-slate-100 dark:border-slate-800 pt-2 text-slate-500 font-mono">
                  <div className="flex justify-between">
                    <span>Paid Out:</span>
                    <strong className="text-slate-900 dark:text-slate-100">{formatCurrency(m.paid, trip.currency)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Own Share:</span>
                    <strong>{formatCurrency(m.ownShare, trip.currency)}</strong>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Net Balance:</span>
                    <span className={m.receivable > 0 ? "text-emerald-600" : m.pending > 0 ? "text-rose-600" : "text-slate-500"}>
                      {m.receivable > 0 ? `+${formatCurrency(m.receivable, trip.currency)}` : m.pending > 0 ? `-${formatCurrency(m.pending, trip.currency)}` : "Settled"}
                    </span>
                  </div>
                </div>

                {/* Member Governance Toggles */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] gap-2 flex-wrap">
                  <button
                    onClick={() => handleToggleFreeze(m.id)}
                    className="flex items-center gap-1 text-slate-500 hover:text-amber-600 transition-colors cursor-pointer"
                  >
                    <Snowflake className="h-3 w-3" />
                    <span>{m.isFrozen ? "Unfreeze" : "Freeze"}</span>
                  </button>

                  <button
                    onClick={() => handleTogglePastExpenses(m.id)}
                    className="text-slate-500 hover:text-primary transition-colors cursor-pointer"
                  >
                    {m.isExcludedFromPastExpenses ? "Include in Past" : "Exclude Past"}
                  </button>

                  {m.role !== "Owner" && (
                    <button
                      onClick={() => handleTransferOwnership(m.id)}
                      className="text-amber-600 hover:underline cursor-pointer"
                    >
                      Make Owner
                    </button>
                  )}

                  {m.role !== "Owner" && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleRemoveMember(m.id)}
                      className="h-6 w-6 text-slate-400 hover:text-rose-600"
                      title="Remove Member"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
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
                  <span className="text-slate-500">Average Daily Burn Rate:</span>
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
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 flex justify-between items-center">
                  <span className="text-slate-500">Expected Trip Savings:</span>
                  <span className="font-mono font-bold text-emerald-600">{formatCurrency(trip.potentialSavings, trip.currency)}</span>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* 11. REPORTS & AI TAB */}
        <TabsContent value="reports" className="space-y-5">
          <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-card p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 flex-wrap gap-2">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Executive Travel Financial Statement</h3>
                <p className="text-xs text-slate-500">Generated directly from dynamic SplitLedger records. Ready for audit or download.</p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleExportExpensesCsv}
                  className="rounded-xl text-xs font-bold gap-1"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" /> Export All CSVs
                </Button>
                <Button
                  size="sm"
                  onClick={() => window.print()}
                  className="rounded-xl text-xs font-bold gap-1.5 bg-primary text-primary-foreground"
                >
                  <Printer className="h-4 w-4" /> Print Statement
                </Button>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 font-mono">
                <div>
                  <span className="text-slate-400 text-[10px]">TOTAL BUDGET</span>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{formatCurrency(trip.budgetAmount, trip.currency)}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px]">TOTAL SPENT</span>
                  <p className="text-sm font-bold text-rose-600">{formatCurrency(trip.actualTotal, trip.currency)}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px]">REMAINING CUSHION</span>
                  <p className="text-sm font-bold text-emerald-600">{formatCurrency(trip.remainingBudget, trip.currency)}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px]">FINANCIAL GRADE</span>
                  <p className="text-sm font-bold text-indigo-600">{trip.financialHealthScore}/100 ({trip.healthReport?.grade || "A"})</p>
                </div>
              </div>

              <div className="pt-2 space-y-2">
                <h4 className="font-bold text-slate-900 dark:text-slate-100">AI Financial Diagnostic Summary</h4>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  {trip.healthReport?.summary ||
                    `The trip ledger is operating at ${trip.budgetUsedPct}% budget utilization with a projected final cost of ${formatCurrency(
                      trip.projectedTotalSpend,
                      trip.currency
                    )}.`}
                </p>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* 12. AUDIT TRAIL TAB */}
        <TabsContent value="audit" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Immutable Activity & Audit Trail</h3>
              <p className="text-xs text-slate-500">Every change to budgets, expenses, member access, and status is logged here.</p>
            </div>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-card overflow-hidden">
            {(trip.auditLogs || []).map((log) => (
              <div key={log.id} className="p-3.5 flex items-start justify-between text-xs hover:bg-slate-50/50 dark:hover:bg-slate-900/30 gap-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[9px] uppercase font-bold tracking-wider">
                      {log.category}
                    </Badge>
                    <span className="font-bold text-slate-900 dark:text-slate-100">{log.action}</span>
                  </div>
                  <p className="text-[11px] text-slate-500">{log.details}</p>
                </div>
                <div className="text-right text-[10px] text-slate-400 font-mono shrink-0">
                  <p>{log.actorName}</p>
                  <p>{new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                </div>
              </div>
            ))}
            {(!trip.auditLogs || trip.auditLogs.length === 0) && (
              <p className="text-xs text-slate-400 p-8 text-center">No audit trail entries recorded yet.</p>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* ========================================================================= */}
      {/* DIALOG 1: Edit Full Trip Details Modal */}
      {/* ========================================================================= */}
      <Dialog open={isEditTripOpen} onOpenChange={setIsEditTripOpen}>
        <DialogContent className="sm:max-w-xl rounded-3xl p-6 bg-card border border-slate-200/80 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Edit Trip Parameters & Budget</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              All modifications immediately trigger real-time ledger and analytics recalculations.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 text-xs py-2">
            <div>
              <label className="font-bold">Trip Name *</label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="rounded-xl h-10 mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold">Destination *</label>
                <Input
                  value={editDestination}
                  onChange={(e) => setEditDestination(e.target.value)}
                  className="rounded-xl h-10 mt-1"
                />
              </div>
              <div>
                <label className="font-bold">Country</label>
                <Input
                  value={editCountry}
                  onChange={(e) => setEditCountry(e.target.value)}
                  className="rounded-xl h-10 mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="font-bold">State / Province</label>
                <Input
                  value={editState}
                  onChange={(e) => setEditState(e.target.value)}
                  placeholder="e.g. Goa"
                  className="rounded-xl h-10 mt-1"
                />
              </div>
              <div>
                <label className="font-bold">City</label>
                <Input
                  value={editCity}
                  onChange={(e) => setEditCity(e.target.value)}
                  placeholder="e.g. Panaji"
                  className="rounded-xl h-10 mt-1"
                />
              </div>
              <div>
                <label className="font-bold">Meeting Point</label>
                <Input
                  value={editMeetingPoint}
                  onChange={(e) => setEditMeetingPoint(e.target.value)}
                  placeholder="e.g. Terminal 2"
                  className="rounded-xl h-10 mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold">Start Date</label>
                <Input
                  type="date"
                  value={editStartDate}
                  onChange={(e) => setEditStartDate(e.target.value)}
                  className="rounded-xl h-10 mt-1"
                />
              </div>
              <div>
                <label className="font-bold">End Date</label>
                <Input
                  type="date"
                  value={editEndDate}
                  onChange={(e) => setEditEndDate(e.target.value)}
                  className="rounded-xl h-10 mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold">Total Trip Budget (₹) *</label>
                <Input
                  type="number"
                  value={editTotalBudget}
                  onChange={(e) => setEditTotalBudget(e.target.value)}
                  className="rounded-xl h-10 mt-1 font-mono font-bold"
                />
              </div>
              <div>
                <label className="font-bold">Emergency Buffer (₹)</label>
                <Input
                  type="number"
                  value={editEmergencyBuffer}
                  onChange={(e) => setEditEmergencyBuffer(e.target.value)}
                  className="rounded-xl h-10 mt-1 font-mono font-bold"
                />
              </div>
            </div>

            <div>
              <label className="font-bold">Cover Image URL</label>
              <Input
                value={editCoverImage}
                onChange={(e) => setEditCoverImage(e.target.value)}
                placeholder="https://..."
                className="rounded-xl h-10 mt-1"
              />
            </div>

            <div>
              <label className="font-bold">Description & Notes</label>
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Trip vision, ground rules, packing requirements..."
                className="rounded-xl text-xs mt-1 min-h-[70px]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button variant="outline" size="sm" onClick={() => setIsEditTripOpen(false)} className="rounded-xl text-xs">
                Cancel
              </Button>
              <Button size="sm" onClick={handleSaveTripDetails} className="rounded-xl text-xs font-bold bg-primary text-primary-foreground">
                Save & Recalculate
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIALOG 2: Health Score Breakdown Modal */}
      {/* ========================================================================= */}
      <Dialog open={isHealthBreakdownOpen} onOpenChange={setIsHealthBreakdownOpen}>
        <DialogContent className="sm:max-w-lg rounded-3xl p-6 bg-card border border-slate-200/80 dark:border-slate-800 max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-indigo-600" />
              <span>Multi-Dimensional Health Score Audit</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Evaluated mathematically using weighted financial algorithms.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Top Grade Box */}
            <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-between">
              <div>
                <p className="font-bold text-sm text-indigo-900 dark:text-indigo-200">
                  Overall Grade: {trip.healthReport?.grade || "A"} ({trip.financialHealthScore}/100)
                </p>
                <p className="text-[11px] text-indigo-700 dark:text-indigo-300 mt-0.5">{trip.healthReport?.summary}</p>
              </div>
              <Badge className="text-sm font-black bg-indigo-600 text-white px-3 py-1">
                {trip.healthReport?.grade || "A"}
              </Badge>
            </div>

            {/* Dimension Breakdown */}
            <div className="space-y-3">
              {(trip.healthReport?.dimensions || []).map((dim) => (
                <div key={dim.name} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/80 space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      {dim.name} <span className="text-[10px] text-slate-400 font-normal">({Math.round(dim.weight * 100)}% Weight)</span>
                    </span>
                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{dim.score}/100</span>
                  </div>
                  <Progress value={dim.score} className="h-1.5 rounded-full" />
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">{dim.remarks}</p>
                  <p className="text-[11px] text-primary font-semibold">💡 Recommendation: {dim.recommendation}</p>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <Button size="sm" onClick={() => setIsHealthBreakdownOpen(false)} className="rounded-xl text-xs font-bold">
                Close Audit
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIALOG 3: Add Expense Modal */}
      {/* ========================================================================= */}
      <Dialog open={isAddExpenseOpen} onOpenChange={setIsAddExpenseOpen}>
        <DialogContent className="sm:max-w-lg rounded-3xl p-6 bg-card border border-slate-200/80 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Record Trip Expense</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Categorized outflow automatically updates category allocations and member shares.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-xs py-2">
            <div>
              <label className="font-bold">Expense Title *</label>
              <Input
                placeholder="e.g. Scuba Diving Tickets / Beachfront Dinner"
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
                    <option key={c.category} value={c.category}>
                      {c.category} {c.isLocked ? "(Locked)" : ""}
                    </option>
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
                    <option key={m.id} value={m.id}>
                      {m.name} {m.isFrozen ? "(Frozen)" : ""}
                    </option>
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
                  <option value="Net Banking">Net Banking</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold">Location</label>
                <Input
                  placeholder="e.g. Baga Beach"
                  value={expenseLocation}
                  onChange={(e) => setExpenseLocation(e.target.value)}
                  className="rounded-xl h-10 mt-1"
                />
              </div>

              <div>
                <label className="font-bold">Date</label>
                <Input
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="rounded-xl h-10 mt-1"
                />
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

      {/* ========================================================================= */}
      {/* DIALOG 4: Edit Expense Modal */}
      {/* ========================================================================= */}
      <Dialog open={isEditExpenseOpen} onOpenChange={setIsEditExpenseOpen}>
        <DialogContent className="sm:max-w-lg rounded-3xl p-6 bg-card border border-slate-200/80 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Edit Expense Record</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 text-xs py-2">
            <div>
              <label className="font-bold">Expense Title *</label>
              <Input
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
                  <option value="Net Banking">Net Banking</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="isPersonalEdit"
                checked={expenseIsPersonal}
                onChange={(e) => setExpenseIsPersonal(e.target.checked)}
                className="h-4 w-4 rounded text-primary focus:ring-primary cursor-pointer"
              />
              <label htmlFor="isPersonalEdit" className="cursor-pointer font-medium">
                Personal Purchase (Exclude from shared group split)
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button variant="outline" size="sm" onClick={() => setIsEditExpenseOpen(false)} className="rounded-xl text-xs">
                Cancel
              </Button>
              <Button size="sm" onClick={handleSaveEditExpense} className="rounded-xl text-xs font-bold bg-primary text-primary-foreground">
                Save & Recalculate
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIALOG 5: Adjust Category Allocation */}
      {/* ========================================================================= */}
      <Dialog open={isEditCategoryOpen} onOpenChange={setIsEditCategoryOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-card border border-slate-200/80 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Adjust Category Allocation</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Modifying allocations automatically recalculates total allocated budget and variances.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 text-xs py-2">
            <div>
              <label className="font-bold">Category</label>
              <select
                value={editingCategoryKey}
                onChange={(e) => setEditingCategoryKey(e.target.value as BudgetCategoryKey)}
                className="w-full rounded-xl h-10 mt-1 border border-slate-200/80 dark:border-slate-800 bg-background px-3"
              >
                {trip.categoryBudgets.map((c) => (
                  <option key={c.category} value={c.category}>{c.category}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold">Allocated Amount (₹)</label>
              <Input
                type="number"
                value={editingCategoryAllocated}
                onChange={(e) => setEditingCategoryAllocated(e.target.value)}
                className="rounded-xl h-10 mt-1 font-mono font-bold"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button variant="outline" size="sm" onClick={() => setIsEditCategoryOpen(false)} className="rounded-xl text-xs">
                Cancel
              </Button>
              <Button size="sm" onClick={handleSaveCategoryAllocation} className="rounded-xl text-xs font-bold bg-primary text-primary-foreground">
                Update Allocation
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIALOG 6: Record Debt Settlement */}
      {/* ========================================================================= */}
      <Dialog open={isRecordSettlementOpen} onOpenChange={setIsRecordSettlementOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-card border border-slate-200/80 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Record Debt Settlement</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Confirm payments made between travel group members.
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

      {/* ========================================================================= */}
      {/* DIALOG 7: Invite / Add Member */}
      {/* ========================================================================= */}
      <Dialog open={isInviteMemberOpen} onOpenChange={setIsInviteMemberOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-card border border-slate-200/80 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Invite Collaborator</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 text-xs py-2">
            <div>
              <label className="font-bold">Name *</label>
              <Input
                placeholder="e.g. Priya Sharma"
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                className="rounded-xl h-10 mt-1"
              />
            </div>

            <div>
              <label className="font-bold">Email Address</label>
              <Input
                placeholder="priya@example.com"
                value={newMemberEmail}
                onChange={(e) => setNewMemberEmail(e.target.value)}
                className="rounded-xl h-10 mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold">Role</label>
                <select
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value as MemberRole)}
                  className="w-full rounded-xl h-10 mt-1 border border-slate-200/80 dark:border-slate-800 bg-background px-3"
                >
                  <option value="Admin">Admin</option>
                  <option value="Member">Member</option>
                  <option value="Guest">Guest</option>
                </select>
              </div>

              <div>
                <label className="font-bold">Target Contribution (₹)</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={newMemberContribution}
                  onChange={(e) => setNewMemberContribution(e.target.value)}
                  className="rounded-xl h-10 mt-1 font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button variant="outline" size="sm" onClick={() => setIsInviteMemberOpen(false)} className="rounded-xl text-xs">
                Cancel
              </Button>
              <Button size="sm" onClick={handleAddMember} className="rounded-xl text-xs font-bold bg-primary text-primary-foreground">
                Add to Trip
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIALOG 8: Add Event Modal */}
      {/* ========================================================================= */}
      <Dialog open={isAddEventOpen} onOpenChange={setIsAddEventOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-card border border-slate-200/80 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Schedule Group Event</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 text-xs py-2 max-h-[75vh] overflow-y-auto pr-1">
            <div>
              <label className="font-bold">Event Title *</label>
              <Input
                placeholder="e.g. Mandovi Sunset Cruise & Dinner"
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
                  className="w-full rounded-xl h-10 mt-1 border border-slate-200/80 dark:border-slate-800 bg-background px-3 capitalize"
                >
                  <option value="activity">Activity</option>
                  <option value="flight">Flight</option>
                  <option value="train">Train</option>
                  <option value="bus">Bus</option>
                  <option value="hotel">Hotel</option>
                  <option value="hotel_checkin">Hotel Check-in</option>
                  <option value="check_in">Check-in</option>
                  <option value="check_out">Check-out</option>
                  <option value="dinner">Dinner</option>
                  <option value="breakfast">Breakfast</option>
                  <option value="lunch">Lunch</option>
                  <option value="trek">Trek</option>
                  <option value="trekking">Trekking</option>
                  <option value="camping">Camping</option>
                  <option value="adventure">Adventure</option>
                  <option value="sightseeing">Sightseeing</option>
                  <option value="meeting">Meeting</option>
                  <option value="photography">Photography</option>
                  <option value="shopping">Shopping</option>
                  <option value="festival">Festival</option>
                  <option value="temple_visit">Temple Visit</option>
                  <option value="beach_visit">Beach Visit</option>
                  <option value="water_sports">Water Sports</option>
                  <option value="emergency">Emergency</option>
                  <option value="reminder">Reminder</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              <div>
                <label className="font-bold">Priority</label>
                <select
                  value={eventPriority}
                  onChange={(e) => setEventPriority(e.target.value as any)}
                  className="w-full rounded-xl h-10 mt-1 border border-slate-200/80 dark:border-slate-800 bg-background px-3"
                >
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold">Date & Time</label>
                <Input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="rounded-xl h-10 mt-1"
                />
              </div>

              <div>
                <label className="font-bold">Budget Pool (₹)</label>
                <Input
                  type="number"
                  placeholder="e.g. 5000"
                  value={eventBudget}
                  onChange={(e) => setEventBudget(e.target.value)}
                  className="rounded-xl h-10 mt-1 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold">Location</label>
                <Input
                  placeholder="e.g. Panaji"
                  value={eventLocation}
                  onChange={(e) => setEventLocation(e.target.value)}
                  className="rounded-xl h-10 mt-1"
                />
              </div>

              <div>
                <label className="font-bold">Venue Name</label>
                <Input
                  placeholder="e.g. Captain of Ports Jetty"
                  value={eventVenue}
                  onChange={(e) => setEventVenue(e.target.value)}
                  className="rounded-xl h-10 mt-1"
                />
              </div>
            </div>

            <div>
              <label className="font-bold">Address / Landmark</label>
              <Input
                placeholder="e.g. Dayanand Bandodkar Marg, Panaji, Goa"
                value={eventAddress}
                onChange={(e) => setEventAddress(e.target.value)}
                className="rounded-xl h-10 mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold">Dress Code</label>
                <Input
                  placeholder="e.g. Smart Casual / Tropical"
                  value={eventDressCode}
                  onChange={(e) => setEventDressCode(e.target.value)}
                  className="rounded-xl h-10 mt-1"
                />
              </div>

              <div>
                <label className="font-bold">Transport Plan</label>
                <Input
                  placeholder="e.g. Shared Tempo Traveller"
                  value={eventTransportPlan}
                  onChange={(e) => setEventTransportPlan(e.target.value)}
                  className="rounded-xl h-10 mt-1"
                />
              </div>
            </div>

            <div>
              <label className="font-bold">Parking Details</label>
              <Input
                placeholder="e.g. Pay & park at Santa Monica Jetty"
                value={eventParkingInfo}
                onChange={(e) => setEventParkingInfo(e.target.value)}
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

      {/* ========================================================================= */}
      {/* DIALOG 9: Edit Event Modal */}
      {/* ========================================================================= */}
      <Dialog open={isEditEventOpen} onOpenChange={setIsEditEventOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-card border border-slate-200/80 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Edit Group Event</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 text-xs py-2 max-h-[75vh] overflow-y-auto pr-1">
            <div>
              <label className="font-bold">Event Title *</label>
              <Input
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
                  className="w-full rounded-xl h-10 mt-1 border border-slate-200/80 dark:border-slate-800 bg-background px-3 capitalize"
                >
                  <option value="activity">Activity</option>
                  <option value="flight">Flight</option>
                  <option value="train">Train</option>
                  <option value="bus">Bus</option>
                  <option value="hotel">Hotel</option>
                  <option value="hotel_checkin">Hotel Check-in</option>
                  <option value="check_in">Check-in</option>
                  <option value="check_out">Check-out</option>
                  <option value="dinner">Dinner</option>
                  <option value="breakfast">Breakfast</option>
                  <option value="lunch">Lunch</option>
                  <option value="trek">Trek</option>
                  <option value="trekking">Trekking</option>
                  <option value="camping">Camping</option>
                  <option value="adventure">Adventure</option>
                  <option value="sightseeing">Sightseeing</option>
                  <option value="meeting">Meeting</option>
                  <option value="photography">Photography</option>
                  <option value="shopping">Shopping</option>
                  <option value="festival">Festival</option>
                  <option value="temple_visit">Temple Visit</option>
                  <option value="beach_visit">Beach Visit</option>
                  <option value="water_sports">Water Sports</option>
                  <option value="emergency">Emergency</option>
                  <option value="reminder">Reminder</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              <div>
                <label className="font-bold">Status</label>
                <select
                  value={eventStatus}
                  onChange={(e) => setEventStatus(e.target.value as any)}
                  className="w-full rounded-xl h-10 mt-1 border border-slate-200/80 dark:border-slate-800 bg-background px-3"
                >
                  <option value="upcoming">Upcoming</option>
                  <option value="ongoing">Ongoing</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="missed">Missed</option>
                  <option value="rescheduled">Rescheduled</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold">Budget Pool (₹)</label>
                <Input
                  type="number"
                  value={eventBudget}
                  onChange={(e) => setEventBudget(e.target.value)}
                  className="rounded-xl h-10 mt-1 font-mono"
                />
              </div>

              <div>
                <label className="font-bold">Actual Cost (₹)</label>
                <Input
                  type="number"
                  value={eventActualCost}
                  onChange={(e) => setEventActualCost(e.target.value)}
                  className="rounded-xl h-10 mt-1 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold">Venue Name</label>
                <Input
                  value={eventVenue}
                  onChange={(e) => setEventVenue(e.target.value)}
                  className="rounded-xl h-10 mt-1"
                />
              </div>

              <div>
                <label className="font-bold">Priority</label>
                <select
                  value={eventPriority}
                  onChange={(e) => setEventPriority(e.target.value as any)}
                  className="w-full rounded-xl h-10 mt-1 border border-slate-200/80 dark:border-slate-800 bg-background px-3"
                >
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
            </div>

            <div>
              <label className="font-bold">Address / Landmark</label>
              <Input
                value={eventAddress}
                onChange={(e) => setEventAddress(e.target.value)}
                className="rounded-xl h-10 mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold">Dress Code</label>
                <Input
                  value={eventDressCode}
                  onChange={(e) => setEventDressCode(e.target.value)}
                  className="rounded-xl h-10 mt-1"
                />
              </div>

              <div>
                <label className="font-bold">Transport Plan</label>
                <Input
                  value={eventTransportPlan}
                  onChange={(e) => setEventTransportPlan(e.target.value)}
                  className="rounded-xl h-10 mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold">Parking Details</label>
                <Input
                  value={eventParkingInfo}
                  onChange={(e) => setEventParkingInfo(e.target.value)}
                  className="rounded-xl h-10 mt-1"
                />
              </div>

              <div>
                <label className="font-bold">Weather Forecast</label>
                <Input
                  placeholder="e.g. Sunny 28°C"
                  value={eventWeatherForecast}
                  onChange={(e) => setEventWeatherForecast(e.target.value)}
                  className="rounded-xl h-10 mt-1"
                />
              </div>
            </div>

            <div>
              <label className="font-bold">Maps Location Link</label>
              <Input
                placeholder="https://maps.google.com/..."
                value={eventMapsLink}
                onChange={(e) => setEventMapsLink(e.target.value)}
                className="rounded-xl h-10 mt-1"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button variant="outline" size="sm" onClick={() => setIsEditEventOpen(false)} className="rounded-xl text-xs">
                Cancel
              </Button>
              <Button size="sm" onClick={handleSaveEditEvent} className="rounded-xl text-xs font-bold bg-primary text-primary-foreground">
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIALOG 10: Add / Edit Checklist Item */}
      {/* ========================================================================= */}
      <Dialog open={isAddChecklistOpen} onOpenChange={setIsAddChecklistOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-card border border-slate-200/80 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Add Packing Item</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 text-xs py-2">
            <div>
              <label className="font-bold">Item Title *</label>
              <Input
                placeholder="e.g. Rain Jacket / DSLR Battery Charger"
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
                  <option value="Documents">Documents</option>
                  <option value="Electronics">Electronics</option>
                  <option value="Clothes">Clothes</option>
                  <option value="Medical">Medical</option>
                  <option value="Food">Food</option>
                  <option value="Camping">Camping</option>
                  <option value="Photography">Photography</option>
                  <option value="Personal">Personal</option>
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
              <Button
                size="sm"
                onClick={async () => {
                  if (!chkTitle.trim()) return;
                  const updated = await addTripChecklistItem(trip.id, {
                    title: chkTitle,
                    category: chkCategory,
                    priority: chkPriority,
                    assignedMemberName: chkMember,
                  });
                  updateTripState(updated);
                  setIsAddChecklistOpen(false);
                  setChkTitle("");
                  toast.success("Checklist item created!");
                }}
                className="rounded-xl text-xs font-bold bg-primary text-primary-foreground"
              >
                Save Item
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Checklist Item Dialog */}
      <Dialog open={isEditChecklistOpen} onOpenChange={setIsEditChecklistOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-card border border-slate-200/80 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Edit Packing Item</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 text-xs py-2">
            <div>
              <label className="font-bold">Item Title *</label>
              <Input
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
                  <option value="Documents">Documents</option>
                  <option value="Electronics">Electronics</option>
                  <option value="Clothes">Clothes</option>
                  <option value="Medical">Medical</option>
                  <option value="Food">Food</option>
                  <option value="Camping">Camping</option>
                  <option value="Photography">Photography</option>
                  <option value="Personal">Personal</option>
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
              <Button variant="outline" size="sm" onClick={() => setIsEditChecklistOpen(false)} className="rounded-xl text-xs">
                Cancel
              </Button>
              <Button size="sm" onClick={handleSaveEditChecklist} className="rounded-xl text-xs font-bold bg-primary text-primary-foreground">
                Save Item
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIALOG 11: Add Travel Document Modal */}
      {/* ========================================================================= */}
      <Dialog open={isAddDocOpen} onOpenChange={setIsAddDocOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-card border border-slate-200/80 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Upload Travel Document</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 text-xs py-2">
            <div>
              <label className="font-bold">Document Title *</label>
              <Input
                placeholder="e.g. Return Flight Booking Voucher"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                className="rounded-xl h-10 mt-1"
              />
            </div>

            <div>
              <label className="font-bold">Document Category</label>
              <select
                value={docCategory}
                onChange={(e) => setDocCategory(e.target.value as any)}
                className="w-full rounded-xl h-10 mt-1 border border-slate-200/80 dark:border-slate-800 bg-background px-3"
              >
                <option value="Hotel Booking">Hotel Booking</option>
                <option value="Flight Ticket">Flight Ticket</option>
                <option value="Train / Bus Ticket">Train / Bus Ticket</option>
                <option value="Passport & Visa">Passport & Visa</option>
                <option value="Driving License / ID">Driving License / ID</option>
                <option value="Travel Insurance">Travel Insurance</option>
                <option value="Receipt / Invoice">Receipt / Invoice</option>
                <option value="Medical & Vaccination">Medical & Vaccination</option>
              </select>
            </div>

            <div>
              <label className="font-bold">File Name *</label>
              <Input
                placeholder="e.g. Indigo_Ticket_PNR9284.pdf"
                value={docFileName}
                onChange={(e) => setDocFileName(e.target.value)}
                className="rounded-xl h-10 mt-1"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button variant="outline" size="sm" onClick={() => setIsAddDocOpen(false)} className="rounded-xl text-xs">
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={async () => {
                  if (!docTitle.trim() || !docFileName.trim()) return;
                  const updated = await addTripDocument(trip.id, {
                    title: docTitle,
                    category: docCategory,
                    fileName: docFileName,
                    fileType: docFileName.endsWith(".pdf") ? "pdf" : "image",
                  });
                  updateTripState(updated);
                  setIsAddDocOpen(false);
                  setDocTitle("");
                  setDocFileName("");
                  toast.success("Document uploaded!");
                }}
                className="rounded-xl text-xs font-bold bg-primary text-primary-foreground"
              >
                Save Document
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIALOG 12: Add Itinerary Stop Modal */}
      {/* ========================================================================= */}
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
              <Button
                size="sm"
                onClick={async () => {
                  if (!itActivity.trim()) return;
                  const updated = await addItineraryStop(trip.id, {
                    dayNumber: Number(itDayNumber),
                    slot: itSlot,
                    time: itTime,
                    activity: itActivity,
                    location: itLocation,
                    estimatedCost: Number(itCost) || 0,
                  });
                  updateTripState(updated);
                  setIsAddItineraryOpen(false);
                  setItActivity("");
                  setItCost("");
                  toast.success("Itinerary stop scheduled!");
                }}
                className="rounded-xl text-xs font-bold bg-primary text-primary-foreground"
              >
                Schedule Stop
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIALOG 14: Event QR Code Modal */}
      {/* ========================================================================= */}
      <Dialog open={!!selectedEventQr} onOpenChange={(open) => !open && setSelectedEventQr(null)}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-card border border-slate-200/80 dark:border-slate-800 text-center">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center justify-center gap-2">
              <QrCode className="h-5 w-5 text-primary" />
              <span>Event Digital Pass & QR</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Permanent check-in code and digital pass for group events.
            </DialogDescription>
          </DialogHeader>

          {selectedEventQr && (
            <div className="space-y-4 py-3 flex flex-col items-center">
              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-md min-h-[190px] min-w-[190px] flex items-center justify-center">
                {isGeneratingEventQr ? (
                  <div className="h-44 w-44 flex flex-col items-center justify-center gap-2">
                    <Loader2 className="h-7 w-7 animate-spin text-primary" />
                    <span className="text-xs text-slate-500 font-medium">Encoding Event Pass...</span>
                  </div>
                ) : eventQrCodeUrl ? (
                  <img
                    src={eventQrCodeUrl}
                    alt={`Real QR code for ${selectedEventQr.title}`}
                    className="w-44 h-44 object-contain rounded-xl"
                  />
                ) : (
                  <div className="h-44 w-44 flex items-center justify-center text-slate-400 text-xs">
                    Generating QR...
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <p className="font-bold text-sm text-slate-900 dark:text-slate-100">{selectedEventQr.title}</p>
                <div className="flex items-center justify-center gap-1.5 font-mono text-xs text-primary font-bold">
                  <span>{selectedEventQr.publicId || selectedEventQr.id}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 text-slate-400 hover:text-primary"
                    onClick={() => {
                      navigator.clipboard.writeText(selectedEventQr.publicId || selectedEventQr.id);
                      toast.success("Event Public ID copied to clipboard!");
                    }}
                    title="Copy Event Public ID"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <p className="text-[11px] text-slate-400">
                  {selectedEventQr.location} • {selectedEventQr.startDateTime}
                </p>
                {selectedEventQr.venue && (
                  <p className="text-[11px] text-slate-500 font-medium">
                    Venue: {selectedEventQr.venue}
                  </p>
                )}
              </div>

              <div className="pt-2 flex items-center justify-center gap-2 w-full">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedEventQr(null)}
                  className="rounded-xl text-xs px-4"
                >
                  Close
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(selectedEventQr.publicId || selectedEventQr.id);
                    toast.success("Event Public ID copied to clipboard!");
                  }}
                  className="rounded-xl text-xs px-4 font-bold bg-primary text-primary-foreground"
                >
                  Copy Event ID
                </Button>
                {eventQrCodeUrl && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const a = document.createElement("a");
                      a.href = eventQrCodeUrl;
                      a.download = `${selectedEventQr.publicId || selectedEventQr.id}-event-qr.png`;
                      a.click();
                      toast.success("Downloaded Event QR Pass");
                    }}
                    className="rounded-xl text-xs gap-1.5"
                    title="Download Event QR Pass"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download</span>
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

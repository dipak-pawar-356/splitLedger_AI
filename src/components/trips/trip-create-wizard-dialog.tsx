"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Compass,
  Calendar,
  IndianRupee,
  Users,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Plane,
  Car,
  Mountain,
  Utensils,
  Fuel,
  ShoppingBag,
  Ticket,
  Plus,
  Trash2,
} from "lucide-react";
import { createTripWizard } from "@/actions/trips";
import { TripCategory, BudgetCategoryKey, TripRecord } from "@/lib/types/trips";
import { WizardStep1Identity, WizardStep1State, createInitialStep1State } from "@/components/trips/wizard-step1-identity";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

interface TripCreateWizardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTripCreated: (trip: TripRecord) => void;
}

const COVER_PRESETS = [
  { label: "Tropical Beach", url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&auto=format&fit=crop&q=80" },
  { label: "Alpine Mountains", url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&auto=format&fit=crop&q=80" },
  { label: "Heritage City", url: "https://images.unsplash.com/photo-1477959858617-67f30bc75b82?w=1200&auto=format&fit=crop&q=80" },
  { label: "Forest Camping", url: "https://images.unsplash.com/photo-1510312305653-8ed496efae75?w=1200&auto=format&fit=crop&q=80" },
];

const DEFAULT_CATEGORY_ALLOCATIONS: { category: BudgetCategoryKey; pct: number }[] = [
  { category: "Hotel", pct: 35 },
  { category: "Transportation", pct: 25 },
  { category: "Food", pct: 20 },
  { category: "Adventure", pct: 10 },
  { category: "Emergency", pct: 10 },
];

export function TripCreateWizardDialog({ open, onOpenChange, onTripCreated }: TripCreateWizardDialogProps) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1: Enterprise Trip Identity & Metadata
  const [step1State, setStep1State] = useState<WizardStep1State>(createInitialStep1State);

  const updateStep1 = (updates: Partial<WizardStep1State>) => {
    setStep1State((prev) => ({ ...prev, ...updates }));
  };

  // Step 2: Dates
  const [startDate, setStartDate] = useState(new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0]);
  const [timezone, setTimezone] = useState("IST (UTC+05:30)");

  // Step 3: Budget
  const [totalBudget, setTotalBudget] = useState(50000);
  const [emergencyBuffer, setEmergencyBuffer] = useState(5000);
  const [categoryBudgets, setCategoryBudgets] = useState<Record<BudgetCategoryKey, number>>({
    Hotel: 17500,
    Accommodation: 0,
    Transportation: 12500,
    Food: 10000,
    Adventure: 5000,
    Camping: 0,
    Fuel: 0,
    Shopping: 0,
    Tickets: 0,
    "Entry Tickets": 0,
    Medical: 0,
    Insurance: 0,
    "Guide Charges": 0,
    Parking: 0,
    Emergency: 5000,
    Miscellaneous: 0,
    Custom: 0,
  });

  // Step 4: Members
  const [members, setMembers] = useState<{ name: string; email: string; role: "Owner" | "Admin" | "Member" | "Guest" }[]>([
    { name: "Aarav Sharma", email: "aarav@example.com", role: "Admin" },
    { name: "Sneha Patel", email: "sneha@example.com", role: "Member" },
  ]);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");

  // Step 5: Rules
  const [alertThreshold, setAlertThreshold] = useState(80);
  const [approvalThreshold, setApprovalThreshold] = useState(5000);

  // Helper to re-distribute categories based on total budget
  const handleBudgetChange = (amount: number) => {
    setTotalBudget(amount);
    const updated: any = { ...categoryBudgets };
    DEFAULT_CATEGORY_ALLOCATIONS.forEach((d) => {
      updated[d.category] = Math.round((amount * d.pct) / 100);
    });
    setCategoryBudgets(updated);
  };

  const handleAddMember = () => {
    if (!newMemberName.trim()) return;
    setMembers([...members, { name: newMemberName.trim(), email: newMemberEmail.trim(), role: "Member" }]);
    setNewMemberName("");
    setNewMemberEmail("");
  };

  const handleRemoveMember = (idx: number) => {
    setMembers(members.filter((_, i) => i !== idx));
  };

  const allocatedSum = Object.values(categoryBudgets).reduce((a, b) => a + b, 0);

  const handleSubmit = async () => {
    if (!step1State.name.trim()) {
      toast.error("Please enter a trip name");
      setStep(1);
      return;
    }
    if (totalBudget <= 0) {
      toast.error("Total budget must be greater than zero");
      setStep(3);
      return;
    }

    setIsSubmitting(true);
    try {
      const formattedBudgets = Object.entries(categoryBudgets)
        .filter(([_, val]) => val > 0)
        .map(([cat, val]) => ({
          category: cat as BudgetCategoryKey,
          allocated: val,
        }));

      const created = await createTripWizard({
        name: step1State.name,
        destination: step1State.destination,
        country: step1State.country,
        city: step1State.city,
        category: step1State.category,
        categories: step1State.categories,
        coverImage: step1State.coverImage,
        description: step1State.description,
        publicId: step1State.publicId,
        slug: step1State.slug,
        state: step1State.state,
        district: step1State.city,
        taluka: step1State.taluka,
        village: step1State.village,
        latitude: step1State.latitude,
        longitude: step1State.longitude,
        elevation: step1State.elevation,
        climateZone: step1State.climateZone,
        bestSeason: step1State.bestSeason,
        nearestAirport: step1State.nearestAirport,
        nearestRailwayStation: step1State.nearestRailwayStation,
        nearestBusStand: step1State.nearestBusStand,
        travelDistance: step1State.travelDistance,
        estimatedTravelTime: step1State.estimatedTravelTime,
        visibility: step1State.visibility,
        host: step1State.host,
        coHost: step1State.coHost,
        leadOrganizer: step1State.leadOrganizer,
        travelAgency: step1State.travelAgency,
        emergencyContact: step1State.emergencyContact,
        budgetStrategy: step1State.budgetStrategy,
        emergencyReservePct: step1State.emergencyReservePct,
        contingencyPct: step1State.contingencyPct,
        travelPace: step1State.travelPace,
        accommodationPreference: step1State.accommodationPreference,
        transportPreference: step1State.transportPreference,
        tags: step1State.tags,
        startDate,
        endDate,
        timezone,
        totalBudget,
        emergencyBuffer,
        categoryBudgets: formattedBudgets,
        members,
        preferences: {
          budgetAlertThreshold: alertThreshold,
          expenseApprovalThreshold: approvalThreshold,
          defaultSplitMethod: "equal",
        },
      });

      toast.success("Trip operating environment created successfully!");
      onTripCreated(created);
      onOpenChange(false);
      resetWizard();
    } catch (err: any) {
      toast.error(err?.message || "Failed to create trip.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetWizard = () => {
    setStep(1);
    setStep1State(createInitialStep1State());
    setTotalBudget(50000);
  };

  const durationDays = Math.max(
    1,
    Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 3600 * 24))
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl lg:max-w-5xl rounded-3xl p-5 sm:p-7 md:p-8 bg-card border border-slate-200/80 dark:border-slate-800 shadow-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader className="pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-primary/10 text-primary font-bold text-xs uppercase tracking-wider">
                  Enterprise Travel Wizard
                </Badge>
                <span className="text-xs text-slate-400">Step {step} of 6</span>
              </div>
              <DialogTitle className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
                {step === 1 && "Trip Details & Identity"}
                {step === 2 && "Itinerary Timeline & Dates"}
                {step === 3 && "Multi-Category Budget Allocation"}
                {step === 4 && "Members, Roles & Collaborators"}
                {step === 5 && "Financial Rules & Policies"}
                {step === 6 && "Executive Review & Launch"}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Architect a structured financial and operational container for group travel.
              </DialogDescription>
            </div>
            <div className="w-20">
              <Progress value={(step / 6) * 100} className="h-2 rounded-full" />
            </div>
          </div>
        </DialogHeader>

        {/* STEP 1: Enterprise Trip Identity & Metadata */}
        {step === 1 && (
          <WizardStep1Identity
            formData={step1State}
            onChange={updateStep1}
            onSaveDraft={() => {
              toast.success("Draft identity configuration saved to local cache.");
            }}
          />
        )}

        {/* STEP 2: Dates */}
        {step === 2 && (
          <div className="space-y-5 py-3">
            <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-primary">Calculated Duration</p>
                <p className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-0.5">{durationDays} Days / {Math.max(1, durationDays - 1)} Nights</p>
              </div>
              <Calendar className="h-8 w-8 text-primary opacity-60" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Start Date</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-11 rounded-xl text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">End Date</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-11 rounded-xl text-sm"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Local Destination Timezone</label>
              <Input
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                placeholder="e.g. IST (UTC+05:30) / GMT / CET"
                className="h-10 rounded-xl text-xs"
              />
            </div>
          </div>
        )}

        {/* STEP 3: Budget Allocation */}
        {step === 3 && (
          <div className="space-y-4 py-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-1">
                <label className="text-xs font-bold text-slate-500">Total Group Trip Budget (₹)</label>
                <Input
                  type="number"
                  value={totalBudget}
                  onChange={(e) => handleBudgetChange(Number(e.target.value))}
                  className="text-xl font-black font-mono h-11 rounded-xl"
                />
                <p className="text-[11px] text-slate-400">Total pool allocated across all travelers</p>
              </div>

              <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-1">
                <label className="text-xs font-bold text-amber-600 dark:text-amber-400">Emergency Reserve Buffer (₹)</label>
                <Input
                  type="number"
                  value={emergencyBuffer}
                  onChange={(e) => setEmergencyBuffer(Number(e.target.value))}
                  className="text-xl font-black font-mono h-11 rounded-xl text-amber-600 dark:text-amber-400"
                />
                <p className="text-[11px] text-slate-400">Untouchable safety cushion for medical or rerouting</p>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-2">
              <span className="font-bold text-slate-700 dark:text-slate-300">Category Budgets Breakdown</span>
              <span className={`font-mono font-bold ${allocatedSum <= totalBudget ? "text-emerald-600" : "text-rose-600"}`}>
                Sum: {formatCurrency(allocatedSum, "INR")} / {formatCurrency(totalBudget, "INR")}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto p-1">
              {(["Hotel", "Transportation", "Food", "Adventure", "Fuel", "Shopping", "Entry Tickets", "Medical"] as BudgetCategoryKey[]).map((cat) => (
                <div key={cat} className="p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2 bg-card">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{cat}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-slate-400">₹</span>
                    <Input
                      type="number"
                      value={categoryBudgets[cat] || 0}
                      onChange={(e) =>
                        setCategoryBudgets({
                          ...categoryBudgets,
                          [cat]: Math.max(0, Number(e.target.value)),
                        })
                      }
                      className="h-8 w-28 text-right font-mono font-bold text-xs rounded-lg"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 4: Members */}
        {step === 4 && (
          <div className="space-y-4 py-3">
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-2">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Invite Traveling Collaborator</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  placeholder="Full Name"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  className="h-10 text-xs rounded-xl flex-1"
                />
                <Input
                  placeholder="Email Address (Optional)"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  className="h-10 text-xs rounded-xl flex-1"
                />
                <Button size="sm" onClick={handleAddMember} className="rounded-xl text-xs font-bold gap-1 h-10 px-4">
                  <Plus className="h-4 w-4" /> Add Member
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Confirmed Trip Members ({members.length + 1})</p>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
                <div className="p-3 flex items-center justify-between text-xs bg-card">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold">
                      You
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-slate-100">Trip Organizer (You)</p>
                      <p className="text-[10px] text-slate-400">Primary Administrator</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-primary/10 text-primary text-[10px]">Owner</Badge>
                </div>

                {members.map((m, idx) => (
                  <div key={idx} className="p-3 flex items-center justify-between text-xs bg-card">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold">
                        {m.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 dark:text-slate-100">{m.name}</p>
                        <p className="text-[10px] text-slate-400">{m.email || "No email provided"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">{m.role}</Badge>
                      <Button size="icon" variant="ghost" onClick={() => handleRemoveMember(idx)} className="h-7 w-7 text-slate-400 hover:text-rose-600">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: Rules */}
        {step === 5 && (
          <div className="space-y-4 py-3">
            <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-card space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">Budget Overrun Threshold Alert</h4>
                  <p className="text-xs text-slate-500">Trigger notification when actual expenses reach this percentage of budget.</p>
                </div>
                <Badge className="font-mono text-xs">{alertThreshold}%</Badge>
              </div>
              <input
                type="range"
                min="50"
                max="95"
                step="5"
                value={alertThreshold}
                onChange={(e) => setAlertThreshold(Number(e.target.value))}
                className="w-full accent-primary cursor-pointer"
              />
            </div>

            <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-card space-y-2">
              <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">Co-Organizer Expense Approval Ceiling</h4>
              <p className="text-xs text-slate-500">Individual purchases above this amount require co-organizer approval.</p>
              <div className="flex items-center gap-2 pt-1">
                <span className="text-xs text-slate-400 font-bold">₹</span>
                <Input
                  type="number"
                  value={approvalThreshold}
                  onChange={(e) => setApprovalThreshold(Number(e.target.value))}
                  className="w-40 font-mono font-bold text-sm rounded-xl h-9"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 6: Review & Launch */}
        {step === 6 && (
          <div className="space-y-4 py-3">
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 bg-gradient-to-br from-primary/5 via-card to-background space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="secondary" className="bg-primary/10 text-primary text-[10px] uppercase font-bold">
                      Ready for Deployment
                    </Badge>
                    <span className="text-[10px] font-mono text-slate-400 font-semibold">{step1State.publicId}</span>
                  </div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 mt-1">{step1State.name}</h3>
                  <p className="text-xs text-slate-500">
                    {step1State.destination || "Destination TBD"}, {step1State.country} • {durationDays} Days
                  </p>
                  {step1State.categories?.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap mt-2">
                      {step1State.categories.slice(0, 4).map((c) => (
                        <Badge key={c} variant="outline" className="text-[10px] font-medium py-0">
                          {c}
                        </Badge>
                      ))}
                      {step1State.categories.length > 4 && (
                        <span className="text-[10px] text-slate-400">+{step1State.categories.length - 4} more</span>
                      )}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-400 font-semibold uppercase">Total Budget</p>
                  <p className="text-2xl font-black text-slate-900 dark:text-slate-100">{formatCurrency(totalBudget, "INR")}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                <div>
                  <p className="text-slate-400 text-[10px]">Start Date</p>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{startDate}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-[10px]">End Date</p>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{endDate}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-[10px]">Total Travelers</p>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{members.length + 1} Members</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 text-xs space-y-1">
                <p className="text-slate-500 font-medium">Estimated Daily Spend Ceiling:</p>
                <p className="text-base font-black text-primary font-mono">
                  {formatCurrency(Math.round(totalBudget / durationDays), "INR")} / day
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Footer Navigation Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
          {step > 1 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setStep(step - 1)}
              className="rounded-xl text-xs gap-1 font-semibold h-9"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                toast.success("Draft saved successfully!");
              }}
              className="rounded-xl text-xs gap-1 font-semibold h-9"
            >
              Save Draft
            </Button>
          )}

          {step < 6 ? (
            <Button
              type="button"
              size="sm"
              onClick={() => {
                if (step === 1 && !step1State.name.trim()) {
                  toast.error("Please enter a trip name");
                  return;
                }
                setStep(step + 1);
              }}
              className="rounded-xl text-xs gap-1.5 font-bold h-9 bg-primary text-primary-foreground shadow-sm hover:shadow-md"
            >
              Next Step <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              disabled={isSubmitting}
              onClick={handleSubmit}
              className="rounded-xl text-xs gap-1.5 font-bold h-10 px-6 bg-primary text-primary-foreground shadow-md hover:shadow-lg"
            >
              <CheckCircle2 className="h-4 w-4" />
              {isSubmitting ? "Deploying Trip Container..." : "Launch Trip Operating System"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

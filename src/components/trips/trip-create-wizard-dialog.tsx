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

  // Step 1: Details
  const [name, setName] = useState("");
  const [destination, setDestination] = useState("");
  const [country, setCountry] = useState("India");
  const [city, setCity] = useState("");
  const [category, setCategory] = useState<TripCategory>("vacation");
  const [coverImage, setCoverImage] = useState(COVER_PRESETS[0].url);
  const [description, setDescription] = useState("");

  // Step 2: Dates
  const [startDate, setStartDate] = useState(new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0]);
  const [timezone, setTimezone] = useState("IST (UTC+05:30)");

  // Step 3: Budget
  const [totalBudget, setTotalBudget] = useState(50000);
  const [emergencyBuffer, setEmergencyBuffer] = useState(5000);
  const [categoryBudgets, setCategoryBudgets] = useState<Record<BudgetCategoryKey, number>>({
    Hotel: 17500,
    Transportation: 12500,
    Food: 10000,
    Adventure: 5000,
    Fuel: 0,
    Shopping: 0,
    "Entry Tickets": 0,
    Medical: 0,
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
    if (!name.trim()) {
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
        name,
        destination,
        country,
        city,
        category,
        coverImage,
        description,
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
    setName("");
    setDestination("");
    setTotalBudget(50000);
  };

  const durationDays = Math.max(
    1,
    Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 3600 * 24))
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl rounded-3xl p-6 sm:p-8 bg-card border border-slate-200/80 dark:border-slate-800 shadow-2xl max-h-[92vh] overflow-y-auto">
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

        {/* STEP 1: Trip Details */}
        {step === 1 && (
          <div className="space-y-4 py-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Trip Name *</label>
              <Input
                placeholder="e.g. Goa Beach & Coastal Trail Expedition"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-11 rounded-xl text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Destination *</label>
                <Input
                  placeholder="e.g. Goa / Spiti / Bali"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="h-10 rounded-xl text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Country</label>
                <Input
                  placeholder="e.g. India"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="h-10 rounded-xl text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">City / District</label>
                <Input
                  placeholder="e.g. North Goa"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="h-10 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Travel Classification</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(["vacation", "road_trip", "trek", "camping", "business", "luxury", "backpacking", "custom"] as TripCategory[]).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all text-left capitalize ${
                      category === cat
                        ? "bg-primary/10 border-primary text-primary shadow-xs"
                        : "border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {cat.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Cover Backdrop Preset</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {COVER_PRESETS.map((p) => (
                  <div
                    key={p.label}
                    onClick={() => setCoverImage(p.url)}
                    className={`cursor-pointer rounded-2xl overflow-hidden border-2 relative transition-all ${
                      coverImage === p.url ? "border-primary shadow-md scale-102" : "border-transparent opacity-75 hover:opacity-100"
                    }`}
                  >
                    <img src={p.url} alt={p.label} className="h-16 w-full object-cover" />
                    <span className="absolute bottom-1 left-2 text-[10px] font-bold text-white bg-black/60 px-1.5 py-0.5 rounded-md">
                      {p.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Description & Mission</label>
              <Textarea
                placeholder="Key goals, hotel rules, transport rendezvous points..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="rounded-xl text-xs"
              />
            </div>
          </div>
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
                  <Badge variant="secondary" className="bg-primary/10 text-primary text-[10px] uppercase font-bold">
                    Ready for Deployment
                  </Badge>
                  <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 mt-1">{name}</h3>
                  <p className="text-xs text-slate-500">{destination}, {country} • {durationDays} Days</p>
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
            <div />
          )}

          {step < 6 ? (
            <Button
              type="button"
              size="sm"
              onClick={() => {
                if (step === 1 && !name.trim()) {
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

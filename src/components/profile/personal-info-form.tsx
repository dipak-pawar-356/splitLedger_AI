"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updatePersonalInfo } from "@/actions/profile";
import { toast } from "sonner";
import { Check, User, Globe, Briefcase, MapPin, QrCode, Smartphone, AlertCircle } from "lucide-react";
import { validateUpiId } from "@/lib/payments/upi";

interface PersonalInfoFormProps {
  initialData: {
    name: string | null;
    username: string | null;
    bio: string | null;
    occupation: string | null;
    company: string | null;
    gender: string | null;
    dateOfBirth: Date | null;
    country: string | null;
    state: string | null;
    city: string | null;
    pinCode: string | null;
    timezone: string;
    language: string;
    defaultCurrency: string;
    upiId?: string | null;
  };
  onSuccess?: () => void;
}

export function PersonalInfoForm({ initialData, onSuccess }: PersonalInfoFormProps) {
  const [formData, setFormData] = useState({
    name: initialData.name || "",
    username: initialData.username || "",
    bio: initialData.bio || "",
    occupation: initialData.occupation || "",
    company: initialData.company || "",
    gender: initialData.gender || "unspecified",
    dateOfBirth: initialData.dateOfBirth
      ? new Date(initialData.dateOfBirth).toISOString().split("T")[0]
      : "",
    country: initialData.country || "India",
    state: initialData.state || "",
    city: initialData.city || "",
    pinCode: initialData.pinCode || "",
    timezone: initialData.timezone || "Asia/Kolkata",
    language: initialData.language || "en",
    defaultCurrency: initialData.defaultCurrency || "INR",
    upiId: initialData.upiId || "",
  });
  const [upiError, setUpiError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Full name is required");
      return;
    }

    setIsPending(true);
    setUpiError(null);
    try {
      const upiTrimmed = formData.upiId.trim();
      if (upiTrimmed) {
        const val = validateUpiId(upiTrimmed);
        if (!val.isValid) {
          setUpiError(val.error || "Invalid UPI ID");
          toast.error(val.error || "Invalid UPI ID format");
          setIsPending(false);
          return;
        }
      }

      await updatePersonalInfo({
        name: formData.name,
        username: formData.username || undefined,
        bio: formData.bio || undefined,
        occupation: formData.occupation || undefined,
        company: formData.company || undefined,
        gender: formData.gender,
        dateOfBirth: formData.dateOfBirth || undefined,
        country: formData.country,
        state: formData.state || undefined,
        city: formData.city || undefined,
        pinCode: formData.pinCode || undefined,
        timezone: formData.timezone,
        language: formData.language,
        defaultCurrency: formData.defaultCurrency,
        upiId: formData.upiId,
      });

      toast.success("Personal information updated successfully!");
      if (onSuccess) onSuccess();
    } catch (e: any) {
      toast.error(e.message || "Failed to update personal information");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden bg-card">
      <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <User className="h-4 w-4 text-primary" />
          <span>Personal Information</span>
        </CardTitle>
        <CardDescription className="text-xs">
          Manage your public identity, occupational details, and regional settings
        </CardDescription>
      </CardHeader>

      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6" suppressHydrationWarning>
          {/* Identity Section */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Identity & Biography
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Full Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Dipak Pawar"
                  className="rounded-xl text-xs bg-background"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Username</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400">@</span>
                  <Input
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="dipakpawar"
                    className="pl-7 rounded-xl text-xs bg-background font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Gender</Label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full h-9 px-3 rounded-xl border border-input bg-background text-xs"
                >
                  <option value="unspecified">Prefer not to say</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Date of Birth</Label>
                <Input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  className="rounded-xl text-xs bg-background"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Biography</Label>
              <Textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Tell us a little bit about yourself..."
                className="rounded-2xl text-xs bg-background resize-none min-h-[80px]"
                maxLength={500}
              />
              <span className="text-[10px] text-slate-400 float-right">
                {formData.bio.length} / 500 characters
              </span>
            </div>
          </div>

          {/* Professional Details */}
          <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Briefcase className="h-3.5 w-3.5" />
              <span>Professional Details</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Occupation</Label>
                <Input
                  value={formData.occupation}
                  onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                  placeholder="e.g. Senior Software Engineer"
                  className="rounded-xl text-xs bg-background"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Company / Organization</Label>
                <Input
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  placeholder="e.g. SplitLedger Inc."
                  className="rounded-xl text-xs bg-background"
                />
              </div>
            </div>
          </div>

          {/* Location & Address */}
          <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              <span>Location & Regional</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Country</Label>
                <Input
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  placeholder="India"
                  className="rounded-xl text-xs bg-background"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">State / Province</Label>
                <Input
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  placeholder="Maharashtra"
                  className="rounded-xl text-xs bg-background"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">City</Label>
                <Input
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Mumbai"
                  className="rounded-xl text-xs bg-background"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">PIN / Postal Code</Label>
                <Input
                  value={formData.pinCode}
                  onChange={(e) => setFormData({ ...formData, pinCode: e.target.value })}
                  placeholder="400001"
                  className="rounded-xl text-xs bg-background font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Preferred Currency</Label>
                <select
                  value={formData.defaultCurrency}
                  onChange={(e) => setFormData({ ...formData, defaultCurrency: e.target.value })}
                  className="w-full h-9 px-3 rounded-xl border border-input bg-background text-xs font-bold text-emerald-600"
                >
                  <option value="INR">INR (₹) - Indian Rupee</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Timezone</Label>
                <select
                  value={formData.timezone}
                  onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                  className="w-full h-9 px-3 rounded-xl border border-input bg-background text-xs"
                >
                  <option value="Asia/Kolkata">Asia/Kolkata (IST +5:30)</option>
                  <option value="UTC">UTC (+0:00)</option>
                  <option value="America/New_York">America/New York (EST)</option>
                  <option value="Europe/London">Europe/London (GMT)</option>
                  <option value="Asia/Dubai">Asia/Dubai (GST +4:00)</option>
                  <option value="Asia/Singapore">Asia/Singapore (SGT +8:00)</option>
                </select>
              </div>
            </div>
          </div>

          {/* UPI Payment Configuration Section */}
          <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <QrCode className="h-3.5 w-3.5 text-emerald-500" />
                <span>Primary UPI Payment ID</span>
              </h4>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Required for Settlement QR
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Smartphone className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Primary UPI ID / VPA Handle</span>
                </Label>
                <Input
                  value={formData.upiId}
                  onChange={(e) => {
                    setFormData({ ...formData, upiId: e.target.value });
                    if (upiError) setUpiError(null);
                  }}
                  placeholder="e.g. yourname@okhdfcbank or 9876543210@paytm"
                  className="rounded-xl text-xs bg-background font-mono"
                />
                {upiError && (
                  <p className="text-[11px] text-rose-500 font-medium flex items-center gap-1 mt-1">
                    <AlertCircle className="h-3 w-3" />
                    <span>{upiError}</span>
                  </p>
                )}
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Settlement QR codes in your groups will automatically link to this UPI ID so other members can pay you directly.
                </p>
              </div>

              {/* Quick Handle Suggestions */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="text-[10px] text-slate-400 font-medium">Common Handles:</span>
                {["@okhdfcbank", "@okaxis", "@oksbi", "@ybl", "@paytm", "@ibl"].map((handle) => (
                  <button
                    key={handle}
                    type="button"
                    onClick={() => {
                      const prefix = formData.upiId.split("@")[0] || formData.username || "username";
                      setFormData({ ...formData, upiId: `${prefix}${handle}` });
                      if (upiError) setUpiError(null);
                    }}
                    className="text-[10px] px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-mono transition-colors"
                  >
                    {handle}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="submit"
              size="sm"
              className="rounded-xl text-xs gap-1.5 bg-primary px-5"
              disabled={isPending}
            >
              <Check className="h-3.5 w-3.5" />
              <span>{isPending ? "Saving Changes..." : "Save Personal Info"}</span>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updatePersonalInfo } from "@/actions/profile";
import { toast } from "sonner";
import { Check, User, Globe, Briefcase, MapPin } from "lucide-react";

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
  });
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Full name is required");
      return;
    }

    setIsPending(true);
    try {
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

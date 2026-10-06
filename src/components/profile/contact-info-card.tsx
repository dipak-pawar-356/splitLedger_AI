"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Mail, 
  Phone, 
  MessageSquare, 
  ShieldCheck, 
  Clock, 
  AlertCircle, 
  Check, 
  HeartHandshake 
} from "lucide-react";
import { updateContactInfo } from "@/actions/profile";
import { toast } from "sonner";

interface ContactInfoCardProps {
  primaryEmail: string;
  isEmailVerified: boolean;
  profile: {
    phone: string | null;
    secondaryEmail: string | null;
    secondaryPhone: string | null;
    whatsappNumber: string | null;
    emergencyContact: string | null;
    mobileVerified: boolean;
  };
  onSuccess?: () => void;
}

export function ContactInfoCard({
  primaryEmail,
  isEmailVerified,
  profile,
  onSuccess,
}: ContactInfoCardProps) {
  const [formData, setFormData] = useState({
    phone: profile.phone || "",
    secondaryEmail: profile.secondaryEmail || "",
    secondaryPhone: profile.secondaryPhone || "",
    whatsappNumber: profile.whatsappNumber || "",
    emergencyContact: profile.emergencyContact || "",
  });
  const [isPending, setIsPending] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPending(true);
    try {
      await updateContactInfo({
        phone: formData.phone || undefined,
        secondaryEmail: formData.secondaryEmail || undefined,
        secondaryPhone: formData.secondaryPhone || undefined,
        whatsappNumber: formData.whatsappNumber || undefined,
        emergencyContact: formData.emergencyContact || undefined,
      });

      toast.success("Contact details updated successfully!");
      if (onSuccess) onSuccess();
    } catch (e: any) {
      toast.error(e.message || "Failed to update contact information");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden bg-card">
      <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <Phone className="h-4 w-4 text-primary" />
          <span>Contact & Verification Center</span>
        </CardTitle>
        <CardDescription className="text-xs">
          Manage your email addresses, phone numbers, and check your identity verification badges
        </CardDescription>
      </CardHeader>

      <CardContent className="p-6">
        <form onSubmit={handleSave} className="space-y-6">
          {/* Email Section */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" />
              <span>Email Addresses</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Primary Email</Label>
                  {isEmailVerified ? (
                    <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-600 font-semibold gap-1 py-0 px-1.5">
                      <ShieldCheck className="h-2.5 w-2.5" />
                      <span>Verified</span>
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-200 font-semibold gap-1 py-0 px-1.5">
                      <Clock className="h-2.5 w-2.5" />
                      <span>Pending</span>
                    </Badge>
                  )}
                </div>
                <Input
                  value={primaryEmail}
                  disabled
                  className="rounded-xl text-xs bg-slate-50 dark:bg-slate-900 font-mono text-slate-500"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Secondary Email (Optional)</Label>
                <Input
                  type="email"
                  value={formData.secondaryEmail}
                  onChange={(e) => setFormData({ ...formData, secondaryEmail: e.target.value })}
                  placeholder="secondary@example.com"
                  className="rounded-xl text-xs bg-background font-mono"
                />
              </div>
            </div>
          </div>

          {/* Phone Numbers */}
          <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5" />
              <span>Phone Numbers & WhatsApp</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Primary Mobile</Label>
                  {profile.mobileVerified ? (
                    <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-600 font-semibold gap-1 py-0 px-1.5">
                      <ShieldCheck className="h-2.5 w-2.5" />
                      <span>Verified</span>
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-slate-400 py-0 px-1.5">
                      Unverified
                    </Badge>
                  )}
                </div>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                  className="rounded-xl text-xs bg-background font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Secondary Mobile (Optional)</Label>
                <Input
                  value={formData.secondaryPhone}
                  onChange={(e) => setFormData({ ...formData, secondaryPhone: e.target.value })}
                  placeholder="+91 98765 00000"
                  className="rounded-xl text-xs bg-background font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5 text-emerald-500" />
                  <span>WhatsApp Number</span>
                </Label>
                <Input
                  value={formData.whatsappNumber}
                  onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
                  placeholder="+91 98765 43210"
                  className="rounded-xl text-xs bg-background font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <HeartHandshake className="h-3.5 w-3.5 text-rose-500" />
                  <span>Emergency Contact (Optional)</span>
                </Label>
                <Input
                  value={formData.emergencyContact}
                  onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                  placeholder="Name / Relationship / Phone"
                  className="rounded-xl text-xs bg-background"
                />
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
              <span>{isPending ? "Saving..." : "Save Contact Info"}</span>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

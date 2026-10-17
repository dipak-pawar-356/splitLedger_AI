"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  Camera, 
  CheckCircle2, 
  ShieldCheck, 
  Calendar, 
  Mail, 
  Phone, 
  Sparkles, 
  Edit3, 
  MapPin,
  Wallet,
  Copy,
  Check,
  AlertCircle,
  QrCode
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { ProfilePictureModal } from "@/components/profile/profile-picture-modal";
import { toast } from "sonner";

interface ProfileHeaderCardProps {
  user: {
    name: string | null;
    email: string;
    avatar: string | null;
    emailVerified: boolean | null;
    createdAt: Date;
    upiId?: string | null;
    defaultCurrency?: string;
  };
  profile: {
    username: string | null;
    phone: string | null;
    mobileVerified: boolean;
    city: string | null;
    country: string | null;
    occupation: string | null;
    company: string | null;
    upiId?: string | null;
  };
  completion: {
    percentage: number;
    suggestions: string[];
  };
  financialSummary?: {
    totalReceivable: number;
    totalPayable: number;
    netBalance: number;
  };
  onEditClick: () => void;
  onAvatarUpdated: (newAvatar: string | null) => void;
  onUpiClick?: () => void;
  onVerifyPhoneClick?: () => void;
}

export function ProfileHeaderCard({
  user,
  profile,
  completion,
  financialSummary,
  onEditClick,
  onAvatarUpdated,
  onUpiClick,
  onVerifyPhoneClick,
}: ProfileHeaderCardProps) {
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);

  const activeUpi = user.upiId || profile.upiId || null;

  const handleCopyUpi = () => {
    if (!activeUpi) return;
    navigator.clipboard.writeText(activeUpi);
    setCopiedUpi(true);
    toast.success("UPI ID copied to clipboard!");
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  return (
    <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden bg-card">
      {/* Decorative gradient banner */}
      <div className="h-28 bg-gradient-to-r from-primary/20 via-indigo-500/10 to-emerald-500/20 relative" />

      <CardContent className="px-6 pb-6 pt-0 relative">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 -mt-14 mb-6">
          {/* Avatar with Camera Trigger */}
          <div className="relative group self-start">
            <Avatar className="h-24 w-24 rounded-3xl border-4 border-background shadow-xl ring-2 ring-primary/20">
              <AvatarImage src={user.avatar || undefined} className="object-cover" />
              <AvatarFallback className="text-xl font-bold bg-primary/10 text-primary">
                {(user.name || "U").charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <button
              type="button"
              onClick={() => setIsAvatarModalOpen(true)}
              className="absolute bottom-0 right-0 p-2 rounded-2xl bg-primary text-white shadow-md hover:bg-primary/90 transition-all duration-200 hover:scale-105"
              title="Change Profile Picture"
            >
              <Camera className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-xl text-xs gap-1.5"
              onClick={() => setIsAvatarModalOpen(true)}
            >
              <Camera className="h-3.5 w-3.5" />
              <span>Change Photo</span>
            </Button>

            <Button
              type="button"
              size="sm"
              className="rounded-xl text-xs gap-1.5 bg-primary"
              onClick={onEditClick}
            >
              <Edit3 className="h-3.5 w-3.5" />
              <span>Edit Profile</span>
            </Button>
          </div>
        </div>

        {/* User Identity Details & Live Financial Badge */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3.5">
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                  {user.name || "SplitLedger Member"}
                </h2>
                {user.emailVerified && (
                  <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold gap-1 py-0.5 px-2">
                    <ShieldCheck className="h-3 w-3" />
                    <span>Verified Identity</span>
                  </Badge>
                )}
                {profile.username && (
                  <span className="text-xs font-mono font-medium text-slate-400">
                    @{profile.username}
                  </span>
                )}
              </div>

              {(profile.occupation || profile.company) && (
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mt-1">
                  {[profile.occupation, profile.company].filter(Boolean).join(" at ")}
                </p>
              )}
            </div>

            {/* Quick Contact & Metadata */}
            <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
              <span className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-slate-400" />
                <span>{user.email}</span>
              </span>

              {profile.phone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  <span className="font-mono">{profile.phone}</span>
                  {profile.mobileVerified ? (
                    <span className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 font-semibold text-[10px]" title="Verified Mobile">
                      <ShieldCheck className="h-3 w-3 text-emerald-500" />
                      <span>Verified</span>
                    </span>
                  ) : onVerifyPhoneClick ? (
                    <button
                      type="button"
                      onClick={onVerifyPhoneClick}
                      className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold hover:underline bg-amber-500/10 px-1.5 py-0.2 rounded-md"
                    >
                      Verify Now
                    </button>
                  ) : null}
                </span>
              )}

              {(profile.city || profile.country) && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  <span>{[profile.city, profile.country].filter(Boolean).join(", ")}</span>
                </span>
              )}

              <span className="flex items-center gap-1.5" suppressHydrationWarning>
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                <span suppressHydrationWarning>Member since {formatDate(user.createdAt)}</span>
              </span>
            </div>

            {/* Live Financial Credentials Bar */}
            <div className="pt-2 flex items-center gap-2.5 flex-wrap">
              {/* Primary UPI VPA Badge */}
              {activeUpi ? (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs shadow-xs">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">UPI VPA:</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{activeUpi}</span>
                  <button
                    type="button"
                    onClick={handleCopyUpi}
                    className="p-1 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
                    title="Copy UPI ID"
                  >
                    {copiedUpi ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-slate-400 hover:text-emerald-500" />}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={onUpiClick}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-600 dark:text-amber-400 hover:bg-amber-500/15 transition-colors font-medium shadow-xs"
                >
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>Configure Primary UPI for Settlements</span>
                </button>
              )}

              {/* Live Net Settlement Standing */}
              {financialSummary && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 text-xs shadow-xs">
                  <Wallet className="h-3.5 w-3.5 text-primary" />
                  <span className="text-[11px] text-slate-500 font-medium">Net Settlement:</span>
                  <span className={`font-mono font-bold ${
                    financialSummary.netBalance > 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : financialSummary.netBalance < 0
                      ? "text-rose-600 dark:text-rose-400"
                      : "text-slate-700 dark:text-slate-300"
                  }`}>
                    {financialSummary.netBalance > 0 
                      ? `+₹${financialSummary.netBalance.toFixed(2)} to receive` 
                      : financialSummary.netBalance < 0 
                      ? `-₹${Math.abs(financialSummary.netBalance).toFixed(2)} to pay` 
                      : "Settled Up (₹0.00)"}
                  </span>
                </div>
              )}

              {/* Default Currency */}
              <div className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-[11px] font-semibold text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-800">
                <span>Currency: {user.defaultCurrency || "INR (₹)"}</span>
              </div>
            </div>
          </div>

          {/* Dynamic Profile Completion */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-2.5 h-fit">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span>Profile Completion</span>
              </span>
              <span className={`text-xs font-mono font-black ${
                completion.percentage >= 100
                  ? "text-emerald-600 dark:text-emerald-400 font-black"
                  : "text-primary"
              }`}>
                {completion.percentage}%
              </span>
            </div>

            <Progress
              value={completion.percentage}
              className={`h-2 rounded-full ${
                completion.percentage >= 100 ? "[&>div]:bg-emerald-500" : ""
              }`}
            />

            {completion.percentage >= 100 ? (
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 pt-0.5">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                <span>Profile 100% complete and fully verified!</span>
              </div>
            ) : completion.suggestions.length > 0 ? (
              <div className="flex items-center justify-between gap-1.5 pt-0.5">
                <p className="text-[11px] text-slate-500 leading-tight">
                  💡 <strong className="text-slate-700 dark:text-slate-300">Suggestion:</strong> {completion.suggestions[0]}
                </p>
                {onVerifyPhoneClick && completion.suggestions[0]?.toLowerCase().includes("mobile") && (
                  <button
                    type="button"
                    onClick={onVerifyPhoneClick}
                    className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline shrink-0"
                  >
                    Verify (+10%)
                  </button>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </CardContent>

      <ProfilePictureModal
        isOpen={isAvatarModalOpen}
        onClose={() => setIsAvatarModalOpen(false)}
        currentAvatar={user.avatar}
        userName={user.name || "User"}
        onAvatarUpdated={onAvatarUpdated}
      />
    </Card>
  );
}

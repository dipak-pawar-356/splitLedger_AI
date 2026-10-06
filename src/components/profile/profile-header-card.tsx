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
  UserCheck, 
  MapPin 
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { ProfilePictureModal } from "@/components/profile/profile-picture-modal";

interface ProfileHeaderCardProps {
  user: {
    name: string | null;
    email: string;
    avatar: string | null;
    emailVerified: boolean | null;
    createdAt: Date;
  };
  profile: {
    username: string | null;
    phone: string | null;
    mobileVerified: boolean;
    city: string | null;
    country: string | null;
    occupation: string | null;
    company: string | null;
  };
  completion: {
    percentage: number;
    suggestions: string[];
  };
  onEditClick: () => void;
  onAvatarUpdated: (newAvatar: string | null) => void;
}

export function ProfileHeaderCard({
  user,
  profile,
  completion,
  onEditClick,
  onAvatarUpdated,
}: ProfileHeaderCardProps) {
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

  return (
    <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden bg-card">
      <div className="h-28 bg-linear-to-r from-primary/20 via-indigo-500/10 to-teal-500/20 relative" />

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

        {/* User Identity Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                  {user.name || "SplitLedger User"}
                </h2>
                {user.emailVerified && (
                  <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold gap-1 py-0.5 px-2">
                    <ShieldCheck className="h-3 w-3" />
                    <span>Verified User</span>
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
            <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap pt-1">
              <span className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-slate-400" />
                <span>{user.email}</span>
              </span>

              {profile.phone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  <span>{profile.phone}</span>
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
          </div>

          {/* Dynamic Profile Completion (SECTION 10) */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span>Profile Completion</span>
              </span>
              <span className="text-xs font-mono font-black text-primary">
                {completion.percentage}%
              </span>
            </div>

            <Progress value={completion.percentage} className="h-2 rounded-full" />

            {completion.suggestions.length > 0 && (
              <p className="text-[11px] text-slate-500 leading-tight">
                💡 <strong className="text-slate-700 dark:text-slate-300">Suggestion:</strong> {completion.suggestions[0]}
              </p>
            )}
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

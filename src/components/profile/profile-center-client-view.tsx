"use client";

import { useState, useEffect } from "react";
import { ProfileDetails, getProfileDetails } from "@/actions/profile";
import { ProfileHeaderCard } from "@/components/profile/profile-header-card";
import { PersonalInfoForm } from "@/components/profile/personal-info-form";
import { ContactInfoCard } from "@/components/profile/contact-info-card";
import { UpiProfileManagerCard } from "@/components/profile/upi-profile-manager-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { 
  User, 
  Smartphone, 
  Phone, 
  QrCode, 
  AlertCircle
} from "lucide-react";
import { useRouter } from "next/navigation";

interface ProfileCenterClientViewProps {
  initialData: ProfileDetails;
}

export function ProfileCenterClientView({ initialData }: ProfileCenterClientViewProps) {
  const [data, setData] = useState<ProfileDetails>(initialData);
  const [activeTab, setActiveTab] = useState<"personal" | "financial" | "contact">("personal");
  const router = useRouter();

  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  // Synchronize with global profile events (e.g. top header changes)
  useEffect(() => {
    const handleProfileUpdated = (event: any) => {
      if (event?.detail?.name) {
        setData((prev) => ({
          ...prev,
          user: {
            ...prev.user,
            name: event.detail.name,
          },
        }));
      }
    };
    window.addEventListener("profile_updated", handleProfileUpdated);
    return () => {
      window.removeEventListener("profile_updated", handleProfileUpdated);
    };
  }, []);

  // Live DB re-fetch to ensure 100% database sync upon any update
  const refreshProfileFromDb = async () => {
    try {
      const freshData = await getProfileDetails();
      if (freshData) {
        setData(freshData);
      }
      router.refresh();
    } catch (err) {
      console.error("Failed to re-fetch profile from database:", err);
    }
  };

  const handleAvatarUpdated = async (newAvatar: string | null) => {
    setData((prev) => ({
      ...prev,
      user: {
        ...prev.user,
        avatar: newAvatar,
      },
    }));
    await refreshProfileFromDb();
  };

  const handleUpiUpdated = async (newUpiId: string) => {
    setData((prev) => ({
      ...prev,
      user: {
        ...prev.user,
        upiId: newUpiId,
      },
      profile: {
        ...prev.profile,
        upiId: newUpiId,
      },
    }));
    await refreshProfileFromDb();
  };

  const hasUpi = Boolean(data.user.upiId?.trim() || data.profile.upiId?.trim());

  return (
    <div className="space-y-6 pb-12 max-w-5xl mx-auto">
      {/* Professional Profile Header with Live Financial Credentials */}
      <ProfileHeaderCard
        user={data.user}
        profile={data.profile}
        completion={data.completion}
        financialSummary={data.financialSummary}
        onEditClick={() => setActiveTab("personal")}
        onUpiClick={() => setActiveTab("financial")}
        onVerifyPhoneClick={() => setActiveTab("contact")}
        onAvatarUpdated={handleAvatarUpdated}
      />

      {/* Mandatory UPI Missing Alert Banner */}
      {!hasUpi && (
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>Payment Settlement Configuration Required</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold uppercase tracking-wider">
                  Mandatory for Settlements
                </span>
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Configure your Primary UPI ID so other members can generate dynamic QR settlement payments directly to you.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => setActiveTab("financial")}
            className="rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white shrink-0 self-start sm:self-auto gap-1.5"
          >
            <Smartphone className="h-3.5 w-3.5" />
            <span>Configure UPI ID Now</span>
          </Button>
        </div>
      )}

      {/* Required Professional Profile Tabs */}
      <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="space-y-6">
        <TabsList className="bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl flex-wrap h-auto gap-1">
          <TabsTrigger value="personal" className="rounded-xl text-xs font-semibold gap-1.5 py-2 px-3.5">
            <User className="h-3.5 w-3.5" />
            <span>Personal &amp; Professional Profile</span>
          </TabsTrigger>

          <TabsTrigger value="financial" className="rounded-xl text-xs font-semibold gap-1.5 py-2 px-3.5">
            <QrCode className="h-3.5 w-3.5" />
            <span>Financial &amp; Settlement UPI</span>
          </TabsTrigger>

          <TabsTrigger value="contact" className="rounded-xl text-xs font-semibold gap-1.5 py-2 px-3.5">
            <Phone className="h-3.5 w-3.5" />
            <span>Contact &amp; Verification</span>
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: Personal & Professional Profile */}
        <TabsContent value="personal" className="focus:outline-none">
          <PersonalInfoForm
            initialData={{
              name: data.user.name,
              username: data.profile.username,
              bio: data.profile.bio,
              occupation: data.profile.occupation,
              company: data.profile.company,
              gender: data.profile.gender,
              dateOfBirth: data.profile.dateOfBirth,
              country: data.profile.country,
              state: data.profile.state,
              city: data.profile.city,
              pinCode: data.profile.pinCode,
              timezone: data.profile.timezone,
              language: data.profile.language,
              defaultCurrency: data.user.defaultCurrency,
              upiId: data.user.upiId,
            }}
            onSuccess={refreshProfileFromDb}
          />
        </TabsContent>

        {/* TAB 2: Financial & UPI Settlement Credentials */}
        <TabsContent value="financial" className="focus:outline-none">
          <UpiProfileManagerCard
            currentUpiId={data.user.upiId || data.profile.upiId}
            userName={data.user.name || "SplitLedger Member"}
            onUpiUpdated={handleUpiUpdated}
          />
        </TabsContent>

        {/* TAB 3: Contact Details & Identity Verification */}
        <TabsContent value="contact" className="focus:outline-none">
          <ContactInfoCard
            primaryEmail={data.user.email}
            isEmailVerified={Boolean(data.user.emailVerified)}
            profile={{
              phone: data.profile.phone,
              secondaryEmail: data.profile.secondaryEmail,
              secondaryPhone: data.profile.secondaryPhone,
              whatsappNumber: data.profile.whatsappNumber,
              emergencyContact: data.profile.emergencyContact,
              mobileVerified: data.profile.mobileVerified,
            }}
            onSuccess={refreshProfileFromDb}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

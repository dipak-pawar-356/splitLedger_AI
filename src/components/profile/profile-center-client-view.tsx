"use client";

import { useState } from "react";
import { ProfileDetails } from "@/actions/profile";
import { ProfileHeaderCard } from "@/components/profile/profile-header-card";
import { FinancialSummaryCards } from "@/components/profile/financial-summary-cards";
import { MyGroupsSummaryTable } from "@/components/profile/my-groups-summary-table";
import { PersonalInfoForm } from "@/components/profile/personal-info-form";
import { ContactInfoCard } from "@/components/profile/contact-info-card";
import { ProfileAnalyticsView } from "@/components/profile/profile-analytics-view";
import { ProfilePrivacySettings } from "@/components/profile/profile-privacy-settings";
import { UpiProfileManagerCard } from "@/components/profile/upi-profile-manager-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  User, 
  Wallet, 
  Phone, 
  BarChart3, 
  Eye, 
  History, 
  ArrowRight,
  Shield,
  Layers,
  Smartphone,
  QrCode,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface ProfileCenterClientViewProps {
  initialData: ProfileDetails;
}

export function ProfileCenterClientView({ initialData }: ProfileCenterClientViewProps) {
  const [data, setData] = useState<ProfileDetails>(initialData);
  const [activeTab, setActiveTab] = useState("overview");
  const router = useRouter();

  const handleAvatarUpdated = (newAvatar: string | null) => {
    setData((prev) => ({
      ...prev,
      user: {
        ...prev.user,
        avatar: newAvatar,
      },
    }));
    router.refresh();
  };

  const handleUpiUpdated = (newUpiId: string) => {
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
      completion: {
        ...prev.completion,
        missingFields: prev.completion.missingFields.filter((f) => f !== "Primary UPI ID"),
      },
    }));
    router.refresh();
  };

  const hasUpi = Boolean(data.user.upiId?.trim());

  return (
    <div className="space-y-6 pb-12">
      {/* Profile Header */}
      <ProfileHeaderCard
        user={data.user}
        profile={data.profile}
        completion={data.completion}
        onEditClick={() => setActiveTab("edit")}
        onAvatarUpdated={handleAvatarUpdated}
      />

      {/* Mandatory UPI Missing Alert Banner */}
      {!hasUpi && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>Payment Profile Incomplete</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold uppercase tracking-wider">
                  Mandatory for Settlements
                </span>
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                You must configure your Primary UPI ID before other members can generate and scan dynamic settlement QR codes to pay you.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => setActiveTab("payments")}
            className="rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white shrink-0 self-start sm:self-auto gap-1.5"
          >
            <Smartphone className="h-3.5 w-3.5" />
            <span>Configure UPI ID Now</span>
          </Button>
        </div>
      )}

      {/* Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl flex-wrap h-auto gap-1">
          <TabsTrigger value="overview" className="rounded-xl text-xs font-semibold gap-1.5">
            <Wallet className="h-3.5 w-3.5" />
            <span>Financials & Groups</span>
          </TabsTrigger>

          <TabsTrigger value="edit" className="rounded-xl text-xs font-semibold gap-1.5">
            <User className="h-3.5 w-3.5" />
            <span>Personal Information</span>
          </TabsTrigger>

          <TabsTrigger value="contact" className="rounded-xl text-xs font-semibold gap-1.5">
            <Phone className="h-3.5 w-3.5" />
            <span>Contact & Verification</span>
          </TabsTrigger>

          <TabsTrigger value="analytics" className="rounded-xl text-xs font-semibold gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" />
            <span>Activity Analytics</span>
          </TabsTrigger>

          <TabsTrigger value="privacy" className="rounded-xl text-xs font-semibold gap-1.5">
            <Eye className="h-3.5 w-3.5" />
            <span>Privacy Controls</span>
          </TabsTrigger>

          <TabsTrigger value="payments" className="rounded-xl text-xs font-semibold gap-1.5">
            <Smartphone className="h-3.5 w-3.5" />
            <span>UPI & Banking</span>
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: Financial Summary & Linked Groups */}
        <TabsContent value="overview" className="space-y-6">
          <FinancialSummaryCards summary={data.financialSummary} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <MyGroupsSummaryTable groups={data.groupsSummary} />
            </div>

            {/* Recent Activity Snapshot */}
            <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden bg-card h-fit">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <History className="h-4 w-4 text-primary" />
                  <span>Recent Activity</span>
                </CardTitle>
                <Link href="/dashboard/activity">
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-primary gap-1">
                    <span>View All</span>
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </CardHeader>

              <CardContent className="p-4 space-y-3">
                {data.recentActivity.length > 0 ? (
                  <div className="space-y-3">
                    {data.recentActivity.slice(0, 5).map((act) => (
                      <div key={act.id} className="text-xs space-y-0.5 pb-2 border-b border-slate-100 dark:border-slate-800/60 last:border-0 last:pb-0">
                        <p className="font-bold text-slate-800 dark:text-slate-200">{act.title}</p>
                        <p className="text-[11px] text-slate-500 truncate">{act.description}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 py-4 text-center">No recent actions logged</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 2: Edit Personal Info */}
        <TabsContent value="edit">
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
            onSuccess={() => router.refresh()}
          />
        </TabsContent>

        {/* TAB 3: Contact & Verification */}
        <TabsContent value="contact">
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
            onSuccess={() => router.refresh()}
          />
        </TabsContent>

        {/* TAB 4: Activity Analytics */}
        <TabsContent value="analytics">
          <ProfileAnalyticsView analytics={data.analytics} />
        </TabsContent>

        {/* TAB 5: Privacy Controls */}
        <TabsContent value="privacy">
          <ProfilePrivacySettings initialSettings={data.profile.privacySettings} />
        </TabsContent>

        {/* TAB 6: UPI Banking & Settlement Config */}
        <TabsContent value="payments">
          <UpiProfileManagerCard
            currentUpiId={data.user.upiId}
            userName={data.user.name || "SplitLedger Member"}
            onUpiUpdated={handleUpiUpdated}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

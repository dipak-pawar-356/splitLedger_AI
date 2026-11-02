import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo/config";
import { requireAuth } from "@/lib/auth";
import { getProfileDetails } from "@/actions/profile";
import { ProfileCenterClientView } from "@/components/profile/profile-center-client-view";

export const metadata: Metadata = createPageMetadata({
  title: "Personal Profile & Security Settings | SplitLedger AI",
  description:
    "Manage your SplitLedger user profile, security credentials, avatar, and personal preferences.",
  path: "/dashboard/profile",
  noIndex: true,
});

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  await requireAuth();
  const profileData = await getProfileDetails();

  return <ProfileCenterClientView initialData={profileData} />;
}

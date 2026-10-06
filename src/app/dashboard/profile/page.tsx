import { requireAuth } from "@/lib/auth";
import { getProfileDetails } from "@/actions/profile";
import { ProfileCenterClientView } from "@/components/profile/profile-center-client-view";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  await requireAuth();
  const profileData = await getProfileDetails();

  return <ProfileCenterClientView initialData={profileData} />;
}

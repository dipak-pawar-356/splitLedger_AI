import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function SettlementsPage() {
  // Settlements section removed as settlements are managed per-group (/dashboard/groups/[id]/settlements)
  redirect("/dashboard/groups");
}

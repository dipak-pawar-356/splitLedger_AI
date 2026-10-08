import { db } from "@/lib/db";
import { groups, invitations } from "@/lib/db/schema/schema";
import { eq, and, or } from "drizzle-orm";
import { getGroupJoinDetailsAction } from "@/actions/group-join-requests";
import { JoinGroupView } from "./join-group-view";
import { notFound } from "next/navigation";
import { isDbIntegerId } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function JoinGroupPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  let targetPublicId = token;
  const strToken = String(token).trim();

  // 1. Check if token matches an invitation token (new 15-20 digit or legacy)
  const [invitation] = await db
    .select({ groupId: invitations.groupId })
    .from(invitations)
    .where(or(eq(invitations.token, strToken), eq(invitations.legacyToken, strToken)))
    .limit(1);

  if (invitation) {
    const [groupFromInv] = await db
      .select({ publicId: groups.publicId })
      .from(groups)
      .where(and(eq(groups.id, invitation.groupId), eq(groups.isDeleted, false)))
      .limit(1);

    if (groupFromInv) {
      targetPublicId = groupFromInv.publicId;
    } else {
      notFound();
    }
  } else {
    // 2. Check if token matches a group's randomized publicId or legacyPublicId or DB id
    const isDbId = isDbIntegerId(strToken);
    const [groupDirect] = await db
      .select({ publicId: groups.publicId })
      .from(groups)
      .where(
        and(
          isDbId
            ? or(eq(groups.publicId, strToken), eq(groups.id, Number(strToken)), eq(groups.legacyPublicId, strToken))
            : or(eq(groups.publicId, strToken), eq(groups.legacyPublicId, strToken)),
          eq(groups.isDeleted, false)
        )
      )
      .limit(1);

    if (groupDirect) {
      targetPublicId = groupDirect.publicId;
    } else {
      notFound();
    }
  }

  const joinDetails = await getGroupJoinDetailsAction(targetPublicId);

  return (
    <JoinGroupView
      tokenOrPublicId={token}
      initialData={joinDetails}
    />
  );
}

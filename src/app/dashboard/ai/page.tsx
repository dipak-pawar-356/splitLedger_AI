import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { categories, groups, groupMembers } from "@/lib/db/schema/schema";
import { eq, and } from "drizzle-orm";
import { getFinancialIntelligence } from "@/actions/financial-intelligence";
import { FinancialIntelligenceClientView } from "@/components/ai/financial-intelligence-client-view";

export const dynamic = "force-dynamic";

export default async function AIAssistantPage() {
  const user = await requireAuth();

  const [intelligenceData, allCategories, userGroups] = await Promise.all([
    getFinancialIntelligence(),
    db
      .select({ id: categories.id, name: categories.name })
      .from(categories)
      .orderBy(categories.name),
    db
      .select({ id: groups.id, name: groups.name })
      .from(groups)
      .innerJoin(groupMembers, eq(groups.id, groupMembers.groupId))
      .where(
        and(
          eq(groupMembers.userId, user.id),
          eq(groups.isDeleted, false)
        )
      )
      .orderBy(groups.name),
  ]);

  return (
    <FinancialIntelligenceClientView
      initialData={intelligenceData}
      categories={allCategories}
      groups={userGroups}
    />
  );
}

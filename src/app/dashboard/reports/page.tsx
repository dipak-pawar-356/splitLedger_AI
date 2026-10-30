import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { categories, groups, contacts } from "@/lib/db/schema/schema";
import { eq, and, or, sql } from "drizzle-orm";
import { 
  getComprehensiveReport, 
  getReportAnalytics
} from "@/actions/reports";
import { ReportsClientView } from "@/components/reports/reports-client-view";

export const dynamic = 'force-dynamic';

export default async function ReportsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    period?: string;
    reportType?: string;
    groupId?: string;
    categoryId?: string;
  }>;
}) {
  const user = await requireAuth();
  const sParams = await searchParams;

  const initialPeriod = (sParams?.period || "all") as any;
  const initialType = (sParams?.reportType || "overview") as any;
  const initialGroupId = sParams?.groupId ? Number(sParams?.groupId) : undefined;
  const initialCategoryId = sParams?.categoryId ? Number(sParams?.categoryId) : undefined;

  // Fetch report data, analytics, categories, groups, contacts in parallel
  const [
    reportData,
    analyticsData,
    categoriesList,
    groupsList,
    contactsList,
  ] = await Promise.all([
    getComprehensiveReport({
      period: initialPeriod,
      reportType: initialType,
      groupId: initialGroupId,
      categoryId: initialCategoryId,
      limit: 50,
      page: 1,
    }),
    getReportAnalytics({
      period: initialPeriod,
      groupId: initialGroupId,
      categoryId: initialCategoryId,
    }),
    db
      .select({ id: categories.id, name: categories.name })
      .from(categories)
      .where(or(eq(categories.userId, user.id), eq(categories.isDefault, true))),
    db
      .select({ id: groups.id, name: groups.name })
      .from(groups)
      .where(
        and(
          eq(groups.isDeleted, false),
          sql`${groups.id} IN (
            SELECT id FROM groups WHERE created_by = ${user.id} AND is_deleted = false
            UNION
            SELECT group_id FROM group_members WHERE user_id = ${user.id}
          )`
        )
      ),
    db
      .select({ id: contacts.id, name: contacts.name })
      .from(contacts)
      .where(and(eq(contacts.userId, user.id), eq(contacts.isDeleted, false))),
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 mb-1">
            Financial Reports & Analytics
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            Enterprise-grade financial intelligence, behavioral spending analytics, smart settlement optimization & multi-format export (INR ₹)
          </p>
        </div>
      </div>

      {/* Main Reports & Analytics Client View */}
      <ReportsClientView
        initialReportData={reportData}
        analyticsData={analyticsData}
        categories={categoriesList}
        groups={groupsList}
        contacts={contactsList}
        userEmail={user.email || ""}
      />
    </div>
  );
}

import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo/config";
import { requireAuth } from "@/lib/auth";
import {
  getNotes,
  getNoteCategories,
  getNoteStats,
  getNoteTimeline,
  getNoteCalendar,
} from "@/actions/notes";
import { getFinancialNotesAnalysisAction } from "@/actions/notes-financial-analytics";
import { NotesClientView } from "@/components/notes/notes-client-view";

export const metadata: Metadata = createPageMetadata({
  title: "Financial Notes & Daily Journal | SplitLedger AI",
  description:
    "Record daily financial reflections, expense memos, budget goals, and audit trails tied to your ledger.",
  path: "/dashboard/notes",
  noIndex: true,
});

export const dynamic = "force-dynamic";

export default async function NotesPage({
  searchParams,
}: {
  searchParams?: Promise<{
    status?: string;
    categoryId?: string;
    tag?: string;
    search?: string;
  }>;
}) {
  const user = await requireAuth();
  const sParams = await searchParams;

  const initialStatus = (sParams?.status || "all") as any;
  const initialCatId = sParams?.categoryId ? Number(sParams?.categoryId) : undefined;
  const initialTag = sParams?.tag;
  const initialSearch = sParams?.search;

  const [notesData, categoriesList, statsData, timelineData, calendarData, financialNotesAnalytics] = await Promise.all([
    getNotes({
      status: initialStatus,
      categoryId: initialCatId,
      tag: initialTag,
      search: initialSearch,
      limit: 50,
    }),
    getNoteCategories(),
    getNoteStats(),
    getNoteTimeline(),
    getNoteCalendar(),
    getFinancialNotesAnalysisAction().catch(() => null),
  ]);

  return (
    <NotesClientView
      initialNotesData={notesData}
      categories={categoriesList}
      stats={statsData}
      timeline={timelineData}
      calendarData={calendarData}
      financialAnalytics={financialNotesAnalytics}
    />
  );
}

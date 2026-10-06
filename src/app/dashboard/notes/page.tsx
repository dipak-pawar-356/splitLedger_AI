import { requireAuth } from "@/lib/auth";
import {
  getNotes,
  getNoteCategories,
  getNoteStats,
  getNoteTimeline,
  getNoteCalendar,
} from "@/actions/notes";
import { NotesClientView } from "@/components/notes/notes-client-view";

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

  const [notesData, categoriesList, statsData, timelineData, calendarData] = await Promise.all([
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
  ]);

  return (
    <NotesClientView
      initialNotesData={notesData}
      categories={categoriesList}
      stats={statsData}
      timeline={timelineData}
      calendarData={calendarData}
    />
  );
}

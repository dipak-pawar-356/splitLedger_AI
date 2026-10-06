"use client";

import { useState, useEffect, useRef, useTransition, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import {
  FileText,
  Plus,
  Search,
  Pin,
  Star,
  Archive,
  Trash2,
  Folder,
  Tag,
  Clock,
  History,
  Copy,
  RotateCcw,
  Sparkles,
  BarChart3,
  Calendar as CalendarIcon,
  CheckSquare,
  Square,
  Download,
  Printer,
  Activity,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Wallet,
  User,
  Compass,
  Users,
  Briefcase,
  Lightbulb,
  ShoppingBag,
  HandCoins,
  PiggyBank,
  TrendingUp,
  Bell,
  Utensils,
  Filter,
  PanelLeftClose,
  PanelLeft,
  PanelBottomClose,
  PanelBottom,
  Columns,
  Columns2,
  Columns3,
  Maximize2,
  Minimize2,
  MoreHorizontal,
  ArrowLeft,
  Check,
  Loader2,
  X,
  Mic,
  Paperclip,
  MessageSquare,
  Zap,
  Share2,
  Link as LinkIcon,
  AlertTriangle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";
import {
  getNotes,
  createNote,
  updateNote,
  autoSaveNote,
  deleteNote,
  restoreNote,
  permanentDeleteNote,
  duplicateNote,
  bulkNoteAction,
  emptyTrash,
  exportNoteDocument,
  createNoteReminder,
  createChecklistItem,
} from "@/actions/notes";
import { RichTextEditor } from "@/components/notes/rich-text-editor";
import { NoteVersionHistoryDialog } from "@/components/notes/note-version-history-dialog";
import { NotesCategoryDialog } from "@/components/notes/notes-category-dialog";
import { NotesTimelineView } from "@/components/notes/notes-timeline-view";
import { NotesCalendarView } from "@/components/notes/notes-calendar-view";
import { NotesStatsDashboard } from "@/components/notes/notes-stats-dashboard";
import { NoteTasksWidget } from "@/components/notes/note-tasks-widget";
import { NoteVoiceWidget } from "@/components/notes/note-voice-widget";
import { NoteLinkedEntitiesWidget } from "@/components/notes/note-linked-entities-widget";
import { NoteAttachmentsWidget } from "@/components/notes/note-attachments-widget";
import { NoteCommentsWidget } from "@/components/notes/note-comments-widget";
import { DailyFinancialJournalView } from "@/components/notes/daily-financial-journal-view";
import { NoteActivityLogDialog } from "@/components/notes/note-activity-log-dialog";
import { QuickNoteDialog } from "@/components/notes/quick-note-dialog";
import { toast } from "sonner";

interface NotesClientViewProps {
  initialNotesData: {
    notes: any[];
    totalCount: number;
    totalPages: number;
    currentPage: number;
  };
  categories: any[];
  stats: any;
  timeline: any[];
  calendarData: Record<string, any>;
}

const NOTE_COLORS = [
  { id: "default", bg: "bg-white dark:bg-slate-900", border: "border-slate-200 dark:border-slate-800", label: "Default" },
  { id: "blue", bg: "bg-blue-50 dark:bg-blue-950/30", border: "border-blue-200 dark:border-blue-800", label: "Blue" },
  { id: "green", bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-emerald-200 dark:border-emerald-800", label: "Emerald" },
  { id: "yellow", bg: "bg-amber-50 dark:bg-amber-950/30", border: "border-amber-200 dark:border-amber-800", label: "Amber" },
  { id: "red", bg: "bg-rose-50 dark:bg-rose-950/30", border: "border-rose-200 dark:border-rose-800", label: "Rose" },
  { id: "purple", bg: "bg-purple-50 dark:bg-purple-950/30", border: "border-purple-200 dark:border-purple-800", label: "Purple" },
];

export function NotesClientView({
  initialNotesData,
  categories: initialCategories,
  stats: initialStats,
  timeline: initialTimeline,
  calendarData: initialCalendar,
}: NotesClientViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [notesData, setNotesData] = useState(initialNotesData);
  const [categories, setCategories] = useState(initialCategories);
  const [stats, setStats] = useState(initialStats);
  const [timeline, setTimeline] = useState(initialTimeline);
  const [calendarData, setCalendarData] = useState(initialCalendar);

  // Active View Modes: 'editor' | 'journal' | 'timeline' | 'calendar' | 'stats'
  const [viewMode, setViewMode] = useState<"editor" | "journal" | "timeline" | "calendar" | "stats">("editor");

  // Mobile navigation between list and editor ('list' | 'editor')
  const [mobileView, setMobileView] = useState<"list" | "editor">("list");

  // Mount state for SSR hydration safety
  const [isMounted, setIsMounted] = useState(false);

  // Fullscreen distraction-free editor mode
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Independent panel collapse states
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isNotesListOpen, setIsNotesListOpen] = useState(true);
  const [isBottomWidgetsOpen, setIsBottomWidgetsOpen] = useState(true);

  // Layout mode preset: "three_panel" | "split" | "focused" | "fullscreen"
  const [layoutMode, setLayoutMode] = useState<"three_panel" | "split" | "focused" | "fullscreen">("three_panel");

  // Filters State
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "pinned" | "favorite" | "archived" | "trash" | "quick_notes">("all");
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>(undefined);
  const [selectedTag, setSelectedTag] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");

  // Category Sidebar States
  const [isCategoriesExpanded, setIsCategoriesExpanded] = useState(true);
  const [catSearchQuery, setCatSearchQuery] = useState("");
  const [catSort, setCatSort] = useState<"alpha" | "most_notes">("most_notes");

  // Selected Note State for Editor
  const [activeNote, setActiveNote] = useState<any>(initialNotesData.notes[0] || null);
  const [editorTitle, setEditorTitle] = useState(activeNote?.title || "");
  const [editorContent, setEditorContent] = useState(activeNote?.content || "");
  const [editorColor, setEditorColor] = useState(activeNote?.color || "default");
  const [editorCategoryId, setEditorCategoryId] = useState<number | null>(activeNote?.categoryId || null);
  const [editorTags, setEditorTags] = useState<string[]>(activeNote?.tags || []);
  const [tagInput, setTagInput] = useState("");
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");

  // Bottom Widgets Tab State ("tasks" | "voice" | "attachments" | "comments" | "links")
  const [activeWidgetTab, setActiveWidgetTab] = useState<"tasks" | "voice" | "attachments" | "comments" | "links">("tasks");
  const [mobileAccordionOpen, setMobileAccordionOpen] = useState<"tasks" | "voice" | "attachments" | "comments" | "links" | null>("tasks");
  const [widgetsLayout, setWidgetsLayout] = useState<"tabs" | "grid">("tabs");

  // Bulk Selection State
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);

  // Dialog States
  const [isVersionDialogOpen, setIsVersionDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isActivityDialogOpen, setIsActivityDialogOpen] = useState(false);
  const [isQuickNoteOpen, setIsQuickNoteOpen] = useState(false);

  // Delete & Bulk Confirmation Dialog States (Parts 2 & 6)
  const [noteToDelete, setNoteToDelete] = useState<any | null>(null);
  const [noteToPermanentDelete, setNoteToPermanentDelete] = useState<any | null>(null);
  const [isEmptyTrashConfirmOpen, setIsEmptyTrashConfirmOpen] = useState(false);
  const [isBulkTrashConfirmOpen, setIsBulkTrashConfirmOpen] = useState(false);
  const [isBulkPermanentDeleteConfirmOpen, setIsBulkPermanentDeleteConfirmOpen] = useState(false);

  // Auto-Save Timer Ref
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Deduplicate Categories by lower-case name
  const deduplicatedCategories = useMemo(() => {
    const seen = new Set<string>();
    const result: any[] = [];
    for (const cat of categories) {
      const key = (cat.name || "").trim().toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        result.push(cat);
      }
    }
    return result;
  }, [categories]);

  // Filtered & Sorted Categories for Sidebar
  const processedCategories = useMemo(() => {
    let list = [...deduplicatedCategories];

    if (catSearchQuery.trim()) {
      const q = catSearchQuery.trim().toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(q));
    }

    if (catSort === "alpha") {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (catSort === "most_notes") {
      list.sort((a, b) => (b.noteCount || 0) - (a.noteCount || 0));
    }

    return list;
  }, [deduplicatedCategories, catSearchQuery, catSort]);

  useEffect(() => {
    if (activeNote) {
      setEditorTitle(activeNote.title || "");
      setEditorContent(activeNote.content || "");
      setEditorColor(activeNote.color || "default");
      setEditorCategoryId(activeNote.categoryId || null);
      setEditorTags(activeNote.tags || []);
      setSaveStatus("saved");
    }
  }, [activeNote]);

  // Hydration-safe restore of user layout preferences from localStorage
  useEffect(() => {
    setIsMounted(true);
    try {
      const saved = localStorage.getItem("splitLedger_notes_layout_prefs");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.layoutMode) setLayoutMode(parsed.layoutMode);
        if (typeof parsed.isSidebarOpen === "boolean") setIsSidebarOpen(parsed.isSidebarOpen);
        if (typeof parsed.isNotesListOpen === "boolean") setIsNotesListOpen(parsed.isNotesListOpen);
        if (typeof parsed.isBottomWidgetsOpen === "boolean") setIsBottomWidgetsOpen(parsed.isBottomWidgetsOpen);
        if (typeof parsed.isFullscreen === "boolean") setIsFullscreen(parsed.isFullscreen);
      }
    } catch {
      // Ignore localStorage error
    }
  }, []);

  const saveLayoutPrefs = (prefs: {
    layoutMode: "three_panel" | "split" | "focused" | "fullscreen";
    isSidebarOpen: boolean;
    isNotesListOpen: boolean;
    isBottomWidgetsOpen: boolean;
    isFullscreen: boolean;
  }) => {
    try {
      localStorage.setItem("splitLedger_notes_layout_prefs", JSON.stringify(prefs));
    } catch {
      // Ignore
    }
  };

  const applyLayoutMode = (mode: "three_panel" | "split" | "focused" | "fullscreen") => {
    setLayoutMode(mode);
    let newSidebar = true;
    let newList = true;
    let newBottom = true;
    let newFullscreen = false;

    if (mode === "three_panel") {
      newSidebar = true;
      newList = true;
      newBottom = true;
      newFullscreen = false;
    } else if (mode === "split") {
      newSidebar = false;
      newList = true;
      newBottom = true;
      newFullscreen = false;
    } else if (mode === "focused") {
      newSidebar = false;
      newList = false;
      newBottom = false;
      newFullscreen = false;
    } else if (mode === "fullscreen") {
      newSidebar = false;
      newList = false;
      newBottom = false;
      newFullscreen = true;
    }

    setIsSidebarOpen(newSidebar);
    setIsNotesListOpen(newList);
    setIsBottomWidgetsOpen(newBottom);
    setIsFullscreen(newFullscreen);

    saveLayoutPrefs({
      layoutMode: mode,
      isSidebarOpen: newSidebar,
      isNotesListOpen: newList,
      isBottomWidgetsOpen: newBottom,
      isFullscreen: newFullscreen,
    });
  };

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => {
      const next = !prev;
      saveLayoutPrefs({ layoutMode, isSidebarOpen: next, isNotesListOpen, isBottomWidgetsOpen, isFullscreen });
      return next;
    });
  };

  const toggleNotesList = () => {
    setIsNotesListOpen((prev) => {
      const next = !prev;
      saveLayoutPrefs({ layoutMode, isSidebarOpen, isNotesListOpen: next, isBottomWidgetsOpen, isFullscreen });
      return next;
    });
  };

  const toggleBottomWidgets = () => {
    setIsBottomWidgetsOpen((prev) => {
      const next = !prev;
      saveLayoutPrefs({ layoutMode, isSidebarOpen, isNotesListOpen, isBottomWidgetsOpen: next, isFullscreen });
      return next;
    });
  };

  const handleDuplicateDay = async (dateStr: string) => {
    try {
      const dayNotes = notesData.notes.filter((n) => {
        const targetMatch = n.targetDate && n.targetDate.startsWith(dateStr);
        const createdMatch = (n.createdAt || "").startsWith(dateStr);
        return targetMatch || createdMatch;
      });

      if (dayNotes.length === 0) {
        toast.info(`No notes found for ${dateStr} to duplicate.`);
        return;
      }

      let count = 0;
      for (const note of dayNotes) {
        await duplicateNote(note.publicId);
        count++;
      }
      toast.success(`Duplicated ${count} note(s) from ${dateStr}!`);
      refreshNotes();
    } catch (err: any) {
      toast.error(err.message || "Failed to duplicate day notes");
    }
  };

  const handleDeleteDayNotes = async (dateStr: string) => {
    const dayNotes = notesData.notes.filter((n) => {
      const targetMatch = n.targetDate && n.targetDate.startsWith(dateStr);
      const createdMatch = (n.createdAt || "").startsWith(dateStr);
      return targetMatch || createdMatch;
    });

    if (dayNotes.length === 0) {
      toast.info(`No notes found on ${dateStr} to delete.`);
      return;
    }

    if (!confirm(`Are you sure you want to move all ${dayNotes.length} notes from ${dateStr} to Trash?`)) return;

    try {
      for (const note of dayNotes) {
        await deleteNote(note.publicId);
      }
      toast.success(`Moved ${dayNotes.length} notes from ${dateStr} to Trash!`);
      refreshNotes();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete notes for day");
    }
  };

  // Reliable refresh function with explicit override options
  const refreshNotes = (options?: {
    status?: "all" | "draft" | "pinned" | "favorite" | "archived" | "trash" | "quick_notes";
    categoryId?: number | null; // null means uncategorized / all (clear category)
    tag?: string | null;        // null means clear tag
    search?: string;
  }) => {
    const targetStatus = options?.status !== undefined ? options.status : statusFilter;
    const targetCategory =
      options?.categoryId !== undefined
        ? options.categoryId === null
          ? undefined
          : options.categoryId
        : selectedCategory;
    const targetTag =
      options?.tag !== undefined
        ? options.tag === null
          ? undefined
          : options.tag
        : selectedTag;
    const targetSearch = options?.search !== undefined ? options.search : searchQuery;

    startTransition(async () => {
      try {
        const res = await getNotes({
          status: targetStatus,
          categoryId: targetCategory,
          tag: targetTag,
          search: targetSearch,
          limit: 50,
        });
        setNotesData(res);
        if (res.notes.length > 0) {
          if (!activeNote || !res.notes.some((n) => n.publicId === activeNote.publicId)) {
            setActiveNote(res.notes[0]);
          }
        }
      } catch (err) {
        toast.error("Failed to fetch notes");
      }
    });
  };

  const triggerAutoSave = (newTitle: string, newContent: string) => {
    if (!activeNote || activeNote.isDeleted) return;
    setSaveStatus("unsaved");

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

    autoSaveTimerRef.current = setTimeout(async () => {
      setSaveStatus("saving");
      try {
        const updated = await autoSaveNote(activeNote.publicId, {
          title: newTitle,
          content: newContent,
          categoryId: editorCategoryId,
          color: editorColor,
          tags: editorTags,
        });
        if (updated) {
          setActiveNote((prev: any) => ({ ...prev, title: newTitle, content: newContent }));
          setNotesData((prev) => ({
            ...prev,
            notes: prev.notes.map((n) => (n.publicId === activeNote.publicId ? { ...n, title: newTitle, content: newContent } : n)),
          }));
        }
        setSaveStatus("saved");
      } catch (err) {
        setSaveStatus("unsaved");
      }
    }, 1200);
  };

  const handleManualSave = async () => {
    if (!activeNote || activeNote.isDeleted) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    setSaveStatus("saving");
    try {
      const updated = await updateNote(activeNote.publicId, {
        title: editorTitle,
        content: editorContent,
        categoryId: editorCategoryId,
        color: editorColor,
        tags: editorTags,
      });
      if (updated) {
        setActiveNote((prev: any) => ({ ...prev, title: editorTitle, content: editorContent }));
        setNotesData((prev) => ({
          ...prev,
          notes: prev.notes.map((n) => (n.publicId === activeNote.publicId ? { ...n, title: editorTitle, content: editorContent } : n)),
        }));
        setSaveStatus("saved");
        toast.success("Note saved successfully!");
      }
    } catch (err) {
      setSaveStatus("unsaved");
      toast.error("Failed to save note");
    }
  };

  const handleCreateNewNote = async () => {
    try {
      const newNote = await createNote({
        title: "Untitled Note",
        content: "<p>Start typing your financial journal note here...</p>",
        categoryId: selectedCategory,
      });
      toast.success("New note created!");
      refreshNotes();
      setActiveNote(newNote);
      setViewMode("editor");
      setMobileView("editor");
    } catch (err: any) {
      toast.error(err.message || "Failed to create note");
    }
  };

  const handleSelectNote = (note: any) => {
    setActiveNote(note);
    setMobileView("editor");
  };

  const handleTogglePin = async (note: any, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      await updateNote(note.publicId, { isPinned: !note.isPinned });
      toast.success(note.isPinned ? "Note unpinned" : "Note pinned to top!");
      setActiveNote((prev: any) => prev && prev.id === note.id ? { ...prev, isPinned: !note.isPinned } : prev);
      refreshNotes();
    } catch (err: any) {
      toast.error(err.message || "Failed to toggle pin");
    }
  };

  const handleToggleFavorite = async (note: any, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      await updateNote(note.publicId, { isFavorite: !note.isFavorite });
      toast.success(note.isFavorite ? "Removed from favorites" : "Added to favorites!");
      setActiveNote((prev: any) => prev && prev.id === note.id ? { ...prev, isFavorite: !note.isFavorite } : prev);
      refreshNotes();
    } catch (err: any) {
      toast.error(err.message || "Failed to toggle favorite");
    }
  };

  const handleArchive = async (note: any, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      await updateNote(note.publicId, { isArchived: !note.isArchived });
      toast.success(note.isArchived ? "Unarchived note" : "Archived note");
      refreshNotes();
    } catch (err: any) {
      toast.error(err.message || "Failed to archive note");
    }
  };

  const handleDelete = (note: any, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (note.isDeleted || statusFilter === "trash") {
      setNoteToPermanentDelete(note);
    } else {
      setNoteToDelete(note);
    }
  };

  const confirmMoveToTrash = async () => {
    if (!noteToDelete) return;
    const note = noteToDelete;
    try {
      await deleteNote(note.publicId);
      toast.success(`Moved "${note.title || "Note"}" to Trash!`, {
        action: {
          label: "Undo",
          onClick: () => handleRestore(note),
        },
      });
      if (activeNote?.publicId === note.publicId) {
        const remaining = notesData.notes.filter((n) => n.publicId !== note.publicId);
        setActiveNote(remaining[0] || null);
      }
      setNoteToDelete(null);
      refreshNotes();
    } catch (err: any) {
      toast.error(err.message || "Failed to move note to trash");
    }
  };

  const confirmPermanentDelete = async () => {
    if (!noteToPermanentDelete) return;
    const note = noteToPermanentDelete;
    try {
      await permanentDeleteNote(note.publicId);
      toast.success("Note permanently deleted!");
      if (activeNote?.publicId === note.publicId) {
        const remaining = notesData.notes.filter((n) => n.publicId !== note.publicId);
        setActiveNote(remaining[0] || null);
      }
      setNoteToPermanentDelete(null);
      refreshNotes();
    } catch (err: any) {
      toast.error(err.message || "Failed to permanently delete note");
    }
  };

  const confirmEmptyTrash = async () => {
    try {
      const res = await emptyTrash();
      toast.success(`Emptied trash (${res.count} note${res.count === 1 ? "" : "s"} permanently purged)!`);
      setIsEmptyTrashConfirmOpen(false);
      refreshNotes();
    } catch (err: any) {
      toast.error(err.message || "Failed to empty trash");
    }
  };

  const confirmBulkTrash = async () => {
    if (selectedNoteIds.length === 0) return;
    try {
      const count = selectedNoteIds.length;
      await bulkNoteAction("delete", selectedNoteIds);
      toast.success(`Moved ${count} notes to Trash!`);
      setSelectedNoteIds([]);
      setIsBulkTrashConfirmOpen(false);
      refreshNotes();
    } catch (err: any) {
      toast.error(err.message || "Failed to move notes to trash");
    }
  };

  const confirmBulkPermanentDelete = async () => {
    if (selectedNoteIds.length === 0) return;
    try {
      const count = selectedNoteIds.length;
      await bulkNoteAction("permanent_delete", selectedNoteIds);
      toast.success(`Permanently deleted ${count} notes!`);
      setSelectedNoteIds([]);
      setIsBulkPermanentDeleteConfirmOpen(false);
      refreshNotes();
    } catch (err: any) {
      toast.error(err.message || "Failed to permanently delete notes");
    }
  };

  const handleCopyNoteLink = (note: any, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const url = `${window.location.origin}/dashboard/notes?id=${note.publicId}`;
      navigator.clipboard.writeText(url);
      toast.success("Note link copied to clipboard!");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleUpdateNoteCategory = async (note: any, catId: number | null, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      await updateNote(note.publicId, { categoryId: catId });
      toast.success("Category updated!");
      refreshNotes();
      if (activeNote?.publicId === note.publicId) {
        setActiveNote((prev: any) => ({ ...prev, categoryId: catId }));
        setEditorCategoryId(catId);
      }
    } catch (err: any) {
      toast.error("Failed to update category");
    }
  };

  const handleRestore = async (note: any, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      await restoreNote(note.publicId);
      toast.success("Note restored from Trash!");
      refreshNotes();
    } catch (err: any) {
      toast.error(err.message || "Failed to restore note");
    }
  };

  const handleDuplicate = async (note: any, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const dup = await duplicateNote(note.publicId);
      toast.success("Note duplicated!");
      refreshNotes();
      setActiveNote(dup);
      setMobileView("editor");
    } catch (err: any) {
      toast.error(err.message || "Failed to duplicate note");
    }
  };

  const handleExport = async (format: "pdf" | "txt" | "markdown" | "csv" | "json", targetNote?: any) => {
    const note = targetNote || activeNote;
    if (!note) return;
    try {
      const res = await exportNoteDocument(format, note.publicId);
      if (format === "pdf") {
        const win = window.open("", "_blank");
        if (win) {
          win.document.write(res.content);
          win.document.title = res.filename;
          win.document.close();
          setTimeout(() => {
            win.focus();
            win.print();
          }, 250);
        }
      } else {
        const blob = new Blob([res.content], { type: res.mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = res.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success(`Exported as ${format.toUpperCase()}`);
      }
    } catch (err: any) {
      toast.error(err.message || "Export failed");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleBulkAction = async (action: any, extraData?: any) => {
    if (selectedNoteIds.length === 0) return;
    try {
      const res = await bulkNoteAction(action, selectedNoteIds, extraData);
      toast.success(`Updated ${res.count} notes!`);
      setSelectedNoteIds([]);
      refreshNotes();
    } catch (err: any) {
      toast.error(err.message || "Bulk action failed");
    }
  };

  const handleAddTag = () => {
    if (!tagInput.trim()) return;
    const clean = tagInput.trim().startsWith("#") ? tagInput.trim() : `#${tagInput.trim()}`;
    if (!editorTags.includes(clean)) {
      const newTags = [...editorTags, clean];
      setEditorTags(newTags);
      if (activeNote) {
        updateNote(activeNote.publicId, { tags: newTags });
      }
    }
    setTagInput("");
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const newTags = editorTags.filter((t) => t !== tagToRemove);
    setEditorTags(newTags);
    if (activeNote) {
      updateNote(activeNote.publicId, { tags: newTags });
    }
  };

  const groupNotesByDate = (notesList: any[]) => {
    const groupsMap: Record<string, any[]> = {
      Today: [],
      Yesterday: [],
      Earlier: [],
    };

    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const yest = new Date(now);
    yest.setDate(yest.getDate() - 1);
    const yestStr = yest.toISOString().split("T")[0];

    for (const n of notesList) {
      try {
        const rawDate = n.updatedAt || n.createdAt;
        const d = rawDate ? new Date(rawDate) : null;
        if (!d || isNaN(d.getTime())) {
          groupsMap["Earlier"].push(n);
          continue;
        }
        const nDate = d.toISOString().split("T")[0];
        if (nDate === todayStr) {
          groupsMap["Today"].push(n);
        } else if (nDate === yestStr) {
          groupsMap["Yesterday"].push(n);
        } else {
          const formattedDate = formatDate(d);
          if (!groupsMap[formattedDate]) groupsMap[formattedDate] = [];
          groupsMap[formattedDate].push(n);
        }
      } catch {
        groupsMap["Earlier"].push(n);
      }
    }
    return groupsMap;
  };

  const groupedNotes = groupNotesByDate(notesData.notes);

  const renderCategoryIcon = (iconName: string, catName: string) => {
    const nameLower = (catName || "").toLowerCase();
    if (iconName === "Wallet" || nameLower.includes("finance")) return <Wallet className="h-3.5 w-3.5" />;
    if (iconName === "User" || nameLower.includes("personal")) return <User className="h-3.5 w-3.5" />;
    if (iconName === "Compass" || iconName === "Plane" || nameLower.includes("trip")) return <Compass className="h-3.5 w-3.5" />;
    if (iconName === "Users" || nameLower.includes("group")) return <Users className="h-3.5 w-3.5" />;
    if (iconName === "Briefcase" || nameLower.includes("business")) return <Briefcase className="h-3.5 w-3.5" />;
    if (iconName === "Lightbulb" || nameLower.includes("idea")) return <Lightbulb className="h-3.5 w-3.5" />;
    if (iconName === "ShoppingBag" || nameLower.includes("shopping")) return <ShoppingBag className="h-3.5 w-3.5" />;
    if (iconName === "Activity" || nameLower.includes("medical")) return <Activity className="h-3.5 w-3.5" />;
    if (iconName === "HandCoins" || nameLower.includes("loan")) return <HandCoins className="h-3.5 w-3.5" />;
    if (iconName === "PiggyBank" || nameLower.includes("saving")) return <PiggyBank className="h-3.5 w-3.5" />;
    if (iconName === "TrendingUp" || nameLower.includes("investment")) return <TrendingUp className="h-3.5 w-3.5" />;
    if (iconName === "Bell" || nameLower.includes("reminder")) return <Bell className="h-3.5 w-3.5" />;
    if (iconName === "Calendar" || nameLower.includes("meeting")) return <CalendarIcon className="h-3.5 w-3.5" />;
    if (iconName === "Utensils" || nameLower.includes("food")) return <Utensils className="h-3.5 w-3.5" />;
    return <Folder className="h-3.5 w-3.5" />;
  };

  if (!isMounted) {
    return (
      <div className="space-y-6 animate-pulse p-4" suppressHydrationWarning>
        <div className="flex items-center justify-between">
          <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-xl w-48" />
          <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-xl w-32" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-20 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          <div className="md:col-span-4 h-[550px] bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          <div className="md:col-span-8 h-[550px] bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" suppressHydrationWarning>
      {/* Top Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-1">Personal Financial Notes & Journal</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Capture expenses, ideas, notes & activity journals with auto-save & version history
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={toggleSidebar}
            className="rounded-xl text-xs gap-1.5 hidden lg:flex h-9 font-medium"
            title={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            suppressHydrationWarning
          >
            {isSidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
            <span>{isSidebarOpen ? "Hide Panel" : "Show Panel"}</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => setIsQuickNoteOpen(true)}
            className="rounded-xl font-semibold gap-1.5 h-9 text-xs sm:text-sm"
            suppressHydrationWarning
          >
            <Sparkles className="h-4 w-4 text-amber-500" />
            <span>Quick Note</span>
          </Button>

          <Button
            type="button"
            onClick={handleCreateNewNote}
            className="rounded-xl font-semibold gap-1.5 bg-primary shadow-sm h-9 text-xs sm:text-sm"
            suppressHydrationWarning
          >
            <Plus className="h-4 w-4" />
            <span>New Note</span>
          </Button>
        </div>
      </div>

      {/* Layout Presets & Independent Panel Toggles Bar */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 no-print scrollbar-none">
        {/* Layout Presets (Three Panel, Split View, Focused, Full Screen) */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-2xl border border-slate-200 dark:border-slate-800 shrink-0">
          <span className="text-[10px] uppercase font-bold text-slate-400 px-2 hidden sm:inline">Layout:</span>

          <button
            type="button"
            onClick={() => applyLayoutMode("three_panel")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
              layoutMode === "three_panel"
                ? "bg-white dark:bg-slate-900 text-primary shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
            title="Three Panel: Sidebar + Notes List + Editor"
            suppressHydrationWarning
          >
            <Columns3 className="h-3.5 w-3.5" />
            <span>Three Panel</span>
          </button>

          <button
            type="button"
            onClick={() => applyLayoutMode("split")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
              layoutMode === "split"
                ? "bg-white dark:bg-slate-900 text-primary shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
            title="Split View: Notes List + Editor"
            suppressHydrationWarning
          >
            <Columns2 className="h-3.5 w-3.5" />
            <span>Split View</span>
          </button>

          <button
            type="button"
            onClick={() => applyLayoutMode("focused")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
              layoutMode === "focused"
                ? "bg-white dark:bg-slate-900 text-primary shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
            title="Focused Editor: Full width distraction-free"
            suppressHydrationWarning
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Focused</span>
          </button>

          <button
            type="button"
            onClick={() => applyLayoutMode("fullscreen")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
              layoutMode === "fullscreen" || isFullscreen
                ? "bg-white dark:bg-slate-900 text-primary shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
            title="Full Screen Mode"
            suppressHydrationWarning
          >
            <Maximize2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Full Screen</span>
          </button>
        </div>

        {/* Individual Panel Visibility Toggles */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            type="button"
            variant={isSidebarOpen ? "secondary" : "outline"}
            size="sm"
            onClick={toggleSidebar}
            className={`h-7.5 px-2.5 rounded-xl text-xs gap-1.5 font-medium ${
              isSidebarOpen ? "bg-primary/10 text-primary font-semibold" : "text-slate-600 dark:text-slate-400"
            }`}
            title={isSidebarOpen ? "Hide Categories Sidebar" : "Show Categories Sidebar"}
            suppressHydrationWarning
          >
            {isSidebarOpen ? <PanelLeftClose className="h-3.5 w-3.5" /> : <PanelLeft className="h-3.5 w-3.5" />}
            <span className="hidden md:inline">Sidebar</span>
          </Button>

          <Button
            type="button"
            variant={isNotesListOpen ? "secondary" : "outline"}
            size="sm"
            onClick={toggleNotesList}
            className={`h-7.5 px-2.5 rounded-xl text-xs gap-1.5 font-medium ${
              isNotesListOpen ? "bg-primary/10 text-primary font-semibold" : "text-slate-600 dark:text-slate-400"
            }`}
            title={isNotesListOpen ? "Hide Notes List" : "Show Notes List"}
            suppressHydrationWarning
          >
            <Columns className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Notes List</span>
          </Button>

          <Button
            type="button"
            variant={isBottomWidgetsOpen ? "secondary" : "outline"}
            size="sm"
            onClick={toggleBottomWidgets}
            className={`h-7.5 px-2.5 rounded-xl text-xs gap-1.5 font-medium ${
              isBottomWidgetsOpen ? "bg-primary/10 text-primary font-semibold" : "text-slate-600 dark:text-slate-400"
            }`}
            title={isBottomWidgetsOpen ? "Hide Bottom Panels" : "Show Bottom Panels"}
            suppressHydrationWarning
          >
            {isBottomWidgetsOpen ? <PanelBottomClose className="h-3.5 w-3.5" /> : <PanelBottom className="h-3.5 w-3.5" />}
            <span className="hidden md:inline">Panels</span>
          </Button>
        </div>
      </div>

            {/* KPI Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 sm:gap-3 no-print">
        <button
          type="button"
          onClick={() => {
            setStatusFilter("all");
            setViewMode("editor");
            refreshNotes({ status: "all" });
          }}
          className={`card-lift p-3 rounded-2xl border text-left transition-all relative overflow-hidden cursor-pointer ${
            statusFilter === "all"
              ? "border-primary bg-primary/10 shadow-md ring-2 ring-primary/30 scale-[1.02]"
              : "border-slate-200 dark:border-slate-800 bg-card hover:bg-slate-50 dark:hover:bg-slate-800/40"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Notes</span>
            {statusFilter === "all" && <Check className="h-3 w-3 text-primary" />}
          </div>
          <span className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            <AnimatedCounter value={stats?.totalNotes || 0} />
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setStatusFilter("quick_notes");
            setViewMode("editor");
            refreshNotes({ status: "quick_notes" });
          }}
          className={`card-lift p-3 rounded-2xl border text-left transition-all relative overflow-hidden cursor-pointer ${
            statusFilter === "quick_notes"
              ? "border-amber-500 bg-amber-500/10 shadow-md ring-2 ring-amber-500/30 scale-[1.02]"
              : "border-slate-200 dark:border-slate-800 bg-card hover:bg-slate-50 dark:hover:bg-slate-800/40"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-400 block flex items-center gap-1">
              <Zap className="h-3 w-3 text-amber-500 fill-amber-500" />
              Quick Notes
            </span>
            {statusFilter === "quick_notes" && <Check className="h-3 w-3 text-amber-500" />}
          </div>
          <span className="text-lg font-bold text-amber-600 dark:text-amber-400 tracking-tight">
            <AnimatedCounter value={stats?.quickNotes || 0} />
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setStatusFilter("draft");
            setViewMode("editor");
            refreshNotes({ status: "draft" });
          }}
          className={`card-lift p-3 rounded-2xl border text-left transition-all relative overflow-hidden cursor-pointer ${
            statusFilter === "draft"
              ? "border-amber-500 bg-amber-500/10 shadow-md ring-2 ring-amber-500/30 scale-[1.02]"
              : "border-slate-200 dark:border-slate-800 bg-card hover:bg-slate-50 dark:hover:bg-slate-800/40"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Drafts</span>
            {statusFilter === "draft" && <Check className="h-3 w-3 text-amber-500" />}
          </div>
          <span className="text-lg font-bold text-amber-600 dark:text-amber-400 tracking-tight">
            <AnimatedCounter value={stats?.drafts || 0} />
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setStatusFilter("pinned");
            setViewMode("editor");
            refreshNotes({ status: "pinned" });
          }}
          className={`card-lift p-3 rounded-2xl border text-left transition-all relative overflow-hidden cursor-pointer ${
            statusFilter === "pinned"
              ? "border-blue-500 bg-blue-500/10 shadow-md ring-2 ring-blue-500/30 scale-[1.02]"
              : "border-slate-200 dark:border-slate-800 bg-card hover:bg-slate-50 dark:hover:bg-slate-800/40"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-400 block flex items-center gap-1">
              <Pin className="h-3 w-3 text-blue-500" />
              Pinned
            </span>
            {statusFilter === "pinned" && <Check className="h-3 w-3 text-blue-500" />}
          </div>
          <span className="text-lg font-bold text-blue-600 dark:text-blue-400 tracking-tight">
            <AnimatedCounter value={stats?.pinned || 0} />
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setStatusFilter("favorite");
            setViewMode("editor");
            refreshNotes({ status: "favorite" });
          }}
          className={`card-lift p-3 rounded-2xl border text-left transition-all relative overflow-hidden cursor-pointer ${
            statusFilter === "favorite"
              ? "border-emerald-500 bg-emerald-500/10 shadow-md ring-2 ring-emerald-500/30 scale-[1.02]"
              : "border-slate-200 dark:border-slate-800 bg-card hover:bg-slate-50 dark:hover:bg-slate-800/40"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-400 block flex items-center gap-1">
              <Star className="h-3 w-3 text-emerald-500" />
              Favorites
            </span>
            {statusFilter === "favorite" && <Check className="h-3 w-3 text-emerald-500" />}
          </div>
          <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">
            <AnimatedCounter value={stats?.favorites || 0} />
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setStatusFilter("archived");
            setViewMode("editor");
            refreshNotes({ status: "archived" });
          }}
          className={`card-lift p-3 rounded-2xl border text-left transition-all relative overflow-hidden cursor-pointer ${
            statusFilter === "archived"
              ? "border-purple-500 bg-purple-500/10 shadow-md ring-2 ring-purple-500/30 scale-[1.02]"
              : "border-slate-200 dark:border-slate-800 bg-card hover:bg-slate-50 dark:hover:bg-slate-800/40"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-400 block flex items-center gap-1">
              <Archive className="h-3 w-3 text-purple-500" />
              Archived
            </span>
            {statusFilter === "archived" && <Check className="h-3 w-3 text-purple-500" />}
          </div>
          <span className="text-lg font-bold text-purple-600 dark:text-purple-400 tracking-tight">
            <AnimatedCounter value={stats?.archived || 0} />
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setStatusFilter("trash");
            setViewMode("editor");
            refreshNotes({ status: "trash" });
          }}
          className={`card-lift p-3 rounded-2xl border text-left transition-all relative overflow-hidden cursor-pointer ${
            statusFilter === "trash"
              ? "border-rose-500 bg-rose-500/10 shadow-md ring-2 ring-rose-500/30 scale-[1.02]"
              : "border-slate-200 dark:border-slate-800 bg-card hover:bg-slate-50 dark:hover:bg-slate-800/40"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-400 block flex items-center gap-1">
              <Trash2 className="h-3 w-3 text-rose-500" />
              Trash Bin
            </span>
            {statusFilter === "trash" && <Check className="h-3 w-3 text-rose-500" />}
          </div>
          <span className="text-lg font-bold text-rose-600 dark:text-rose-400 tracking-tight">
            <AnimatedCounter value={stats?.trash || 0} />
          </span>
        </button>
      </div>

      {/* Filter Status Bar & Total Count (Part 3) */}
      <div className="flex items-center justify-between px-1 text-xs text-slate-500 no-print flex-wrap gap-2">
        <div className="flex items-center gap-1.5">
          <span>
            Showing <strong className="text-slate-900 dark:text-slate-100 font-semibold">{notesData.notes.length}</strong> of{" "}
            <strong className="text-slate-900 dark:text-slate-100 font-semibold">{stats?.totalNotes || 0}</strong> notes
          </span>
        </div>
        {statusFilter !== "all" && (
          <button
            type="button"
            onClick={() => {
              setStatusFilter("all");
              refreshNotes({ status: "all" });
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700 shadow-2xs"
          >
            <span>Showing: <strong className="capitalize">{statusFilter.replace("_", " ")}</strong> ({notesData.notes.length})</span>
            <X className="h-3 w-3 text-slate-400 hover:text-rose-500 ml-1" />
            <span className="text-[10px] text-rose-500 font-bold">Clear Filter</span>
          </button>
        )}
      </div>

      {/* Main Responsive Layout */}
      <div className="flex flex-col lg:flex-row gap-5 items-start">
        {/* PANE 1: Collapsible Sidebar */}
        {isSidebarOpen && (
          <Card className="w-full lg:w-64 xl:w-72 shrink-0 rounded-2xl border shadow-sm p-4 space-y-5 bg-card no-print">
            {/* View Mode Switcher */}
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Views</span>
              <Button
                type="button"
                variant={viewMode === "editor" ? "default" : "ghost"}
                size="sm"
                className="w-full justify-start text-xs rounded-xl h-8 font-semibold"
                onClick={() => setViewMode("editor")}
              >
                <FileText className="h-3.5 w-3.5 mr-2 text-primary" />
                Notes & Editor
              </Button>
              <Button
                type="button"
                variant={viewMode === "journal" ? "default" : "ghost"}
                size="sm"
                className="w-full justify-start text-xs rounded-xl h-8 font-semibold"
                onClick={() => setViewMode("journal")}
              >
                <BookOpen className="h-3.5 w-3.5 mr-2 text-emerald-500" />
                Daily Journal Mode
              </Button>
              <Button
                type="button"
                variant={viewMode === "timeline" ? "default" : "ghost"}
                size="sm"
                className="w-full justify-start text-xs rounded-xl h-8 font-semibold"
                onClick={() => setViewMode("timeline")}
              >
                <Clock className="h-3.5 w-3.5 mr-2 text-blue-500" />
                Timeline View
              </Button>
              <Button
                type="button"
                variant={viewMode === "calendar" ? "default" : "ghost"}
                size="sm"
                className="w-full justify-start text-xs rounded-xl h-8 font-semibold"
                onClick={() => setViewMode("calendar")}
              >
                <CalendarIcon className="h-3.5 w-3.5 mr-2 text-purple-500" />
                Calendar View
              </Button>
              <Button
                type="button"
                variant={viewMode === "stats" ? "default" : "ghost"}
                size="sm"
                className="w-full justify-start text-xs rounded-xl h-8 font-semibold"
                onClick={() => setViewMode("stats")}
              >
                <BarChart3 className="h-3.5 w-3.5 mr-2 text-amber-500" />
                Stats & Analytics
              </Button>
            </div>

            <div className="h-px bg-slate-100 dark:bg-slate-800" />

            {/* Quick Filters / Status */}
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Status Filters</span>
              <Button
                type="button"
                variant={statusFilter === "all" ? "secondary" : "ghost"}
                size="sm"
                className={`w-full justify-between text-xs rounded-xl h-7.5 font-medium ${statusFilter === "all" ? "bg-primary/10 text-primary font-semibold" : "text-slate-600 dark:text-slate-400"}`}
                onClick={() => {
                  setStatusFilter("all");
                  refreshNotes({ status: "all" });
                }}
              >
                <span className="flex items-center gap-2 truncate">
                  <FileText className="h-3.5 w-3.5 shrink-0" />
                  <span>All Notes</span>
                </span>
                <span className="text-[10px] font-mono shrink-0">{stats?.totalNotes || 0}</span>
              </Button>

              <Button
                type="button"
                variant={statusFilter === "quick_notes" ? "secondary" : "ghost"}
                size="sm"
                className={`w-full justify-between text-xs rounded-xl h-7.5 font-medium ${statusFilter === "quick_notes" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold" : "text-slate-600 dark:text-slate-400"}`}
                onClick={() => {
                  setStatusFilter("quick_notes");
                  refreshNotes({ status: "quick_notes" });
                }}
              >
                <span className="flex items-center gap-2 truncate">
                  <Zap className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  <span>Quick Notes</span>
                </span>
                <span className="text-[10px] font-mono shrink-0">{stats?.quickNotes || 0}</span>
              </Button>

              <Button
                type="button"
                variant={statusFilter === "pinned" ? "secondary" : "ghost"}
                size="sm"
                className={`w-full justify-between text-xs rounded-xl h-7.5 font-medium ${statusFilter === "pinned" ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold" : "text-slate-600 dark:text-slate-400"}`}
                onClick={() => {
                  setStatusFilter("pinned");
                  refreshNotes({ status: "pinned" });
                }}
              >
                <span className="flex items-center gap-2 truncate">
                  <Pin className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                  <span>Pinned</span>
                </span>
                <span className="text-[10px] font-mono shrink-0">{stats?.pinned || 0}</span>
              </Button>

              <Button
                type="button"
                variant={statusFilter === "favorite" ? "secondary" : "ghost"}
                size="sm"
                className={`w-full justify-between text-xs rounded-xl h-7.5 font-medium ${statusFilter === "favorite" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold" : "text-slate-600 dark:text-slate-400"}`}
                onClick={() => {
                  setStatusFilter("favorite");
                  refreshNotes({ status: "favorite" });
                }}
              >
                <span className="flex items-center gap-2 truncate">
                  <Star className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span>Favorites</span>
                </span>
                <span className="text-[10px] font-mono shrink-0">{stats?.favorites || 0}</span>
              </Button>

              <Button
                type="button"
                variant={statusFilter === "draft" ? "secondary" : "ghost"}
                size="sm"
                className={`w-full justify-between text-xs rounded-xl h-7.5 font-medium ${statusFilter === "draft" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold" : "text-slate-600 dark:text-slate-400"}`}
                onClick={() => {
                  setStatusFilter("draft");
                  refreshNotes({ status: "draft" });
                }}
              >
                <span className="flex items-center gap-2 truncate">
                  <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  <span>Drafts</span>
                </span>
                <span className="text-[10px] font-mono shrink-0">{stats?.drafts || 0}</span>
              </Button>

              <Button
                type="button"
                variant={statusFilter === "archived" ? "secondary" : "ghost"}
                size="sm"
                className={`w-full justify-between text-xs rounded-xl h-7.5 font-medium ${statusFilter === "archived" ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 font-semibold" : "text-slate-600 dark:text-slate-400"}`}
                onClick={() => {
                  setStatusFilter("archived");
                  refreshNotes({ status: "archived" });
                }}
              >
                <span className="flex items-center gap-2 truncate">
                  <Archive className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                  <span>Archived</span>
                </span>
                <span className="text-[10px] font-mono shrink-0">{stats?.archived || 0}</span>
              </Button>

              <Button
                type="button"
                variant={statusFilter === "trash" ? "secondary" : "ghost"}
                size="sm"
                className={`w-full justify-between text-xs rounded-xl h-7.5 font-medium ${statusFilter === "trash" ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 font-semibold" : "text-slate-600 dark:text-slate-400"}`}
                onClick={() => {
                  setStatusFilter("trash");
                  refreshNotes({ status: "trash" });
                }}
              >
                <span className="flex items-center gap-2 truncate">
                  <Trash2 className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                  <span>Trash Bin</span>
                </span>
                <span className="text-[10px] font-mono shrink-0">{stats?.trash || 0}</span>
              </Button>
            </div>

            <div className="h-px bg-slate-100 dark:bg-slate-800" />

            {/* CATEGORIES SIDEBAR SECTION */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsCategoriesExpanded(!isCategoriesExpanded)}
                  className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-slate-400 tracking-wider hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                >
                  {isCategoriesExpanded ? (
                    <ChevronDown className="h-3.5 w-3.5 text-primary" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                  )}
                  <span>Categories ({processedCategories.length})</span>
                </button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-5 px-1.5 text-[10px] text-primary font-semibold hover:bg-primary/10 rounded-md"
                  onClick={() => setIsCategoryDialogOpen(true)}
                >
                  + Manage
                </Button>
              </div>

              {isCategoriesExpanded && (
                <div className="space-y-2">
                  {/* Category Search Bar & Sort Dropdown */}
                  <div className="flex items-center gap-1.5">
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 top-2 h-3 w-3 text-slate-400" />
                      <Input
                        value={catSearchQuery}
                        onChange={(e) => setCatSearchQuery(e.target.value)}
                        placeholder="Search..."
                        className="pl-7 h-7 text-[11px] rounded-lg"
                      />
                    </div>

                    <select
                      value={catSort}
                      onChange={(e) => setCatSort(e.target.value as any)}
                      className="h-7 text-[10px] rounded-lg border border-slate-200 dark:border-slate-800 bg-background px-1 font-medium text-slate-600 dark:text-slate-400"
                    >
                      <option value="most_notes">Count</option>
                      <option value="alpha">A-Z</option>
                    </select>
                  </div>

                  {/* All Categories Item */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory(undefined);
                      refreshNotes({ categoryId: null });
                    }}
                    className={`w-full flex items-center justify-between p-2 rounded-xl border text-xs transition-all ${
                      selectedCategory === undefined
                        ? "border-primary bg-primary/10 text-primary font-bold shadow-xs ring-1 ring-primary/20"
                        : "border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <div className="p-1 rounded-lg bg-primary/10 text-primary shrink-0">
                        <Folder className="h-3.5 w-3.5" />
                      </div>
                      <span className="truncate font-semibold">All Categories</span>
                    </span>
                    <Badge variant="secondary" className="text-[10px] font-mono px-1.5 py-0 rounded-md shrink-0 ml-1.5">
                      {stats?.totalNotes || 0}
                    </Badge>
                  </button>

                  {/* Individual Deduplicated Category Cards */}
                  <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                    {processedCategories.map((cat) => {
                      const isSel = selectedCategory === cat.id;
                      const colorHex = cat.color || "#6366f1";

                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => {
                            setSelectedCategory(cat.id);
                            refreshNotes({ categoryId: cat.id });
                          }}
                          className={`w-full flex items-center justify-between p-2 rounded-xl border text-xs transition-all ${
                            isSel
                              ? "border-primary bg-primary/10 text-primary font-bold shadow-xs ring-1 ring-primary/20"
                              : "border-slate-100 dark:border-slate-800/60 bg-card text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div
                              className="p-1.5 rounded-lg shrink-0"
                              style={{ backgroundColor: `${colorHex}15`, color: colorHex }}
                            >
                              {renderCategoryIcon(cat.icon, cat.name)}
                            </div>
                            <span className="truncate text-xs font-semibold text-left">{cat.name}</span>
                          </div>

                          <Badge
                            variant={isSel ? "default" : "secondary"}
                            className="text-[10px] font-mono px-1.5 py-0 rounded-md shrink-0 ml-1.5"
                          >
                            {cat.noteCount || 0}
                          </Badge>
                        </button>
                      );
                    })}

                    {processedCategories.length === 0 && (
                      <p className="text-[11px] text-slate-400 text-center py-3">No categories match search.</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="h-px bg-slate-100 dark:bg-slate-800" />

            {/* Popular Tags Cloud */}
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Popular Tags</span>
              <div className="flex items-center gap-1 flex-wrap">
                {stats?.popularTags?.map((pt: any) => {
                  const isSelectedTag = selectedTag === pt.tag;
                  return (
                    <Badge
                      key={pt.tag}
                      variant={isSelectedTag ? "default" : "outline"}
                      className="cursor-pointer text-[10px] rounded-lg px-2 py-0.5 transition-colors"
                      onClick={() => {
                        const nextTag = isSelectedTag ? null : pt.tag;
                        setSelectedTag(nextTag ? pt.tag : undefined);
                        refreshNotes({ tag: nextTag });
                      }}
                    >
                      {pt.tag}
                    </Badge>
                  );
                })}
              </div>
            </div>
          </Card>
        )}

        {/* PANE 2 & 3: Main Dynamic Content Views */}
        <div className="flex-1 min-w-0 w-full space-y-4">
          {/* VIEW: DAILY FINANCIAL JOURNAL */}
          {viewMode === "journal" && <DailyFinancialJournalView />}

          {/* VIEW: STATS DASHBOARD */}
          {viewMode === "stats" && <NotesStatsDashboard stats={stats} />}

          {/* VIEW: TIMELINE */}
          {viewMode === "timeline" && (
            <NotesTimelineView
              timeline={timeline}
              onSelectNote={(publicId) => {
                const found = notesData.notes.find((n) => n.publicId === publicId);
                if (found) {
                  setActiveNote(found);
                  setViewMode("editor");
                  setMobileView("editor");
                }
              }}
            />
          )}

          {/* VIEW: CALENDAR */}
          {viewMode === "calendar" && (
            <NotesCalendarView
              calendarData={calendarData}
              onSelectDate={(dateStr) => {
                setSearchQuery(dateStr);
                refreshNotes({ search: dateStr });
                setViewMode("editor");
              }}
              onOpenTimeline={(dateStr) => {
                setViewMode("timeline");
              }}
              onDuplicateDay={handleDuplicateDay}
              onDeleteDayNotes={handleDeleteDayNotes}
              onCreateNoteOnDate={async (dateStr, type = "note") => {
                try {
                  let title = `Note for ${dateStr}`;
                  let content = `<p>Notes and financial items for ${dateStr}...</p>`;
                  let tags: string[] = [];

                  if (type === "journal") {
                    title = `Daily Financial Journal - ${dateStr}`;
                    content = `<h2>Daily Financial Journal - ${dateStr}</h2><p><strong>Highlights & Spending:</strong></p><ul><li></li></ul><p><strong>Financial Goals:</strong></p><ul><li></li></ul><p><strong>Notes:</strong></p><p></p>`;
                    tags = ["Journal", "Daily"];
                  } else if (type === "reminder") {
                    title = `Reminder - ${dateStr}`;
                    content = `<p>Scheduled reminder for ${dateStr}.</p>`;
                    tags = ["Reminder"];
                  } else if (type === "task") {
                    title = `Tasks - ${dateStr}`;
                    content = `<p>Checklist and action items for ${dateStr}.</p>`;
                    tags = ["Tasks"];
                  }

                  const newNote = await createNote({
                    title,
                    content,
                    categoryId: selectedCategory,
                    tags,
                    targetDate: dateStr,
                  });

                  if (type === "reminder") {
                    try {
                      await createNoteReminder(newNote.publicId, {
                        reminderDate: new Date(`${dateStr}T09:00:00`),
                        priority: "medium",
                      });
                    } catch (e) {
                      console.error("Failed to add initial reminder", e);
                    }
                  } else if (type === "task") {
                    try {
                      await createChecklistItem(newNote.publicId, {
                        title: `Action item for ${dateStr}`,
                        dueDate: new Date(`${dateStr}T17:00:00`),
                      });
                    } catch (e) {
                      console.error("Failed to add initial task", e);
                    }
                  }

                  setActiveNote(newNote);
                  setViewMode("editor");
                  setMobileView("editor");
                  refreshNotes();
                  toast.success(`Created ${type} for ${dateStr}!`);
                } catch (err) {
                  toast.error("Failed to create entry");
                }
              }}
            />
          )}

          {/* VIEW: NOTES EDITOR & LIST */}
          {viewMode === "editor" && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              {/* MIDDLE COLUMN: Notes List with Auto Date Grouping */}
              {isNotesListOpen && (
                <div
                  className={`${
                    mobileView === "editor" ? "hidden md:block" : "block"
                  } md:col-span-5 lg:col-span-5 xl:col-span-4 space-y-3 no-print`}
                >
                {/* Search Bar & Mobile Filter Indicators */}
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        refreshNotes({ search: e.target.value });
                      }}
                      placeholder="Search notes by title, content or tag..."
                      className="pl-9 h-8 text-xs rounded-xl"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery("");
                          refreshNotes({ search: "" });
                        }}
                        className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Active Filter Chips */}
                  {(selectedCategory !== undefined || selectedTag !== undefined || searchQuery) && (
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      <span className="text-[10px] text-slate-400 font-medium">Filtered by:</span>
                      {selectedCategory !== undefined && (
                        <Badge variant="secondary" className="text-[10px] gap-1 h-5 px-1.5 rounded-md">
                          Cat: {categories.find((c) => c.id === selectedCategory)?.name || selectedCategory}
                          <X
                            className="h-2.5 w-2.5 cursor-pointer hover:text-rose-500"
                            onClick={() => {
                              setSelectedCategory(undefined);
                              refreshNotes({ categoryId: null });
                            }}
                          />
                        </Badge>
                      )}
                      {selectedTag !== undefined && (
                        <Badge variant="secondary" className="text-[10px] gap-1 h-5 px-1.5 rounded-md">
                          Tag: {selectedTag}
                          <X
                            className="h-2.5 w-2.5 cursor-pointer hover:text-rose-500"
                            onClick={() => {
                              setSelectedTag(undefined);
                              refreshNotes({ tag: null });
                            }}
                          />
                        </Badge>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedCategory(undefined);
                          setSelectedTag(undefined);
                          setSearchQuery("");
                          refreshNotes({ categoryId: null, tag: null, search: "" });
                        }}
                        className="h-5 px-1.5 text-[10px] text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-md"
                      >
                        Clear All
                      </Button>
                    </div>
                  )}
                </div>

                {/* Trash Bin Notice Banner (Part 2) */}
                {statusFilter === "trash" && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-2xl flex items-center justify-between gap-3 text-xs animate-in fade-in">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-900/50 text-rose-600 shrink-0">
                        <Trash2 className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <h5 className="font-semibold text-rose-900 dark:text-rose-100 truncate">
                          Trash Bin ({stats?.trash || notesData.notes.length} notes)
                        </h5>
                        <p className="text-[11px] text-rose-600/80 dark:text-rose-400/80 line-clamp-1">
                          Items in trash can be restored or purged permanently.
                        </p>
                      </div>
                    </div>
                    {(stats?.trash || notesData.notes.length) > 0 && (
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={() => setIsEmptyTrashConfirmOpen(true)}
                        className="h-7 text-xs font-semibold px-2.5 rounded-xl shrink-0 gap-1.5 bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Empty Trash
                      </Button>
                    )}
                  </div>
                )}

                {/* Advanced Bulk Operations Toolbar (Part 6) */}
                {selectedNoteIds.length > 0 && (
                  <div className="flex items-center justify-between p-2.5 bg-slate-900 dark:bg-slate-800 text-white rounded-2xl shadow-lg border border-slate-700/60 text-xs animate-in fade-in slide-in-from-top-1 gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold bg-primary/20 text-primary-foreground px-2 py-0.5 rounded-lg border border-primary/30 text-[11px]">
                        {selectedNoteIds.length} selected
                      </span>
                    </div>

                    <div className="flex items-center gap-1 flex-wrap">
                      {statusFilter === "trash" ? (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-6.5 text-[11px] px-2 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40 rounded-lg gap-1 font-medium"
                            onClick={() => handleBulkAction("restore")}
                          >
                            <RotateCcw className="h-3 w-3" />
                            Restore
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            className="h-6.5 text-[11px] px-2 rounded-lg gap-1 bg-rose-600 hover:bg-rose-700 text-white font-medium"
                            onClick={() => setIsBulkPermanentDeleteConfirmOpen(true)}
                          >
                            <Trash2 className="h-3 w-3" />
                            Purge
                          </Button>
                        </>
                      ) : (
                        <>
                          {/* Bulk Category Submenu */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-6.5 text-[11px] px-2 text-slate-200 hover:text-white hover:bg-slate-700 rounded-lg gap-1 font-medium"
                              >
                                <Folder className="h-3 w-3 text-amber-400" />
                                <span className="hidden sm:inline">Category</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-48 rounded-xl p-1 bg-slate-900 border-slate-700 text-white text-xs">
                              <DropdownMenuItem
                                onClick={() => handleBulkAction("category", null)}
                                className="text-xs rounded-lg cursor-pointer hover:bg-slate-800"
                              >
                                (No Category)
                              </DropdownMenuItem>
                              {deduplicatedCategories.map((c) => (
                                <DropdownMenuItem
                                  key={c.id}
                                  onClick={() => handleBulkAction("category", c.id)}
                                  className="text-xs rounded-lg cursor-pointer hover:bg-slate-800"
                                >
                                  {c.name}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>

                          {/* Bulk Color Submenu */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-6.5 text-[11px] px-2 text-slate-200 hover:text-white hover:bg-slate-700 rounded-lg gap-1 font-medium"
                              >
                                <span className="h-3 w-3 rounded-full bg-gradient-to-tr from-blue-500 to-rose-500 inline-block" />
                                <span className="hidden sm:inline">Color</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-40 rounded-xl p-1.5 bg-slate-900 border-slate-700 text-white">
                              <div className="grid grid-cols-3 gap-1.5 p-1">
                                {NOTE_COLORS.map((c) => (
                                  <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => handleBulkAction("color", c.id)}
                                    className={`h-6 rounded-lg border border-slate-600 ${c.bg} hover:scale-110 transition-transform`}
                                    title={c.label}
                                  />
                                ))}
                              </div>
                            </DropdownMenuContent>
                          </DropdownMenu>

                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-6.5 text-[11px] px-2 text-blue-400 hover:text-blue-300 hover:bg-slate-700 rounded-lg gap-1 font-medium"
                            onClick={() => handleBulkAction("pin")}
                          >
                            <Pin className="h-3 w-3" />
                            <span className="hidden sm:inline">Pin</span>
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-6.5 text-[11px] px-2 text-purple-400 hover:text-purple-300 hover:bg-slate-700 rounded-lg gap-1 font-medium"
                            onClick={() => handleBulkAction("archive")}
                          >
                            <Archive className="h-3 w-3" />
                            <span className="hidden sm:inline">Archive</span>
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-6.5 text-[11px] px-2 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-lg gap-1 font-medium"
                            onClick={() => setIsBulkTrashConfirmOpen(true)}
                          >
                            <Trash2 className="h-3 w-3" />
                            <span className="hidden sm:inline">Trash</span>
                          </Button>
                        </>
                      )}

                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedNoteIds([])}
                        className="h-6.5 text-[11px] px-1.5 text-slate-400 hover:text-white rounded-lg"
                        title="Deselect All"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Grouped Notes List */}
                <div className="space-y-4 max-h-[calc(100vh-280px)] min-h-[400px] overflow-y-auto pr-1">
                  {Object.entries(groupedNotes).map(([groupTitle, groupItems]) => {
                    if (!groupItems || groupItems.length === 0) return null;

                    return (
                      <div key={groupTitle} className="space-y-1.5">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
                          <Clock className="h-3 w-3" />
                          <span>{groupTitle}</span>
                          <span className="text-[10px] font-mono">({groupItems.length})</span>
                        </div>

                        {groupItems.map((note) => {
                          const isActive = activeNote?.id === note.id;
                          const isSelected = selectedNoteIds.includes(note.publicId);
                          const isQuick = (note.tags || []).some((t: string) => t.toLowerCase().includes("quick note")) || note.title?.toLowerCase().startsWith("quick note");

                          return (
                            <div
                              key={note.id}
                              onClick={() => handleSelectNote(note)}
                              className={`p-3 rounded-2xl border cursor-pointer transition-all relative group ${
                                isActive
                                  ? "border-primary bg-primary/5 shadow-xs ring-1 ring-primary/20"
                                  : "border-slate-200 dark:border-slate-800 bg-card hover:bg-slate-50 dark:hover:bg-slate-800/60"
                              } ${isQuick ? "border-l-4 border-l-amber-500" : ""}`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedNoteIds((prev) =>
                                        isSelected ? prev.filter((id) => id !== note.publicId) : [...prev, note.publicId]
                                      );
                                    }}
                                    className="text-slate-400 hover:text-primary shrink-0"
                                  >
                                    {isSelected ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4" />}
                                  </button>

                                  {isQuick && (
                                    <span title="Quick Note">
                                      <Zap className="h-3.5 w-3.5 text-amber-500 fill-amber-500 shrink-0" />
                                    </span>
                                  )}

                                  <h4 className="font-semibold text-xs text-slate-900 dark:text-slate-100 truncate">
                                    {note.title || "Untitled Note"}
                                  </h4>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  {note.isPinned && <Pin className="h-3 w-3 text-blue-500 fill-blue-500" />}
                                  {note.isFavorite && <Star className="h-3 w-3 text-amber-500 fill-amber-500" />}

                                  {/* Trash Direct Action Buttons */}
                                  {note.isDeleted && (
                                    <div className="flex items-center gap-0.5">
                                      <button
                                        type="button"
                                        title="Restore Note"
                                        onClick={(e) => handleRestore(note, e)}
                                        className="p-1 rounded-md text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                                      >
                                        <RotateCcw className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        title="Delete Permanently"
                                        onClick={(e) => handleDelete(note, e)}
                                        className="p-1 rounded-md text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  )}

                                  {/* 3-Dots Action Menu (Part 5) */}
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <button
                                        type="button"
                                        onClick={(e) => e.stopPropagation()}
                                        className="h-6 w-6 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                        title="Note Actions"
                                      >
                                        <MoreHorizontal className="h-3.5 w-3.5" />
                                      </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-52 rounded-2xl p-1.5 shadow-xl border-slate-200 dark:border-slate-800" onClick={(e) => e.stopPropagation()}>
                                      <DropdownMenuItem
                                        onClick={() => {
                                          handleSelectNote(note);
                                          setMobileView("editor");
                                        }}
                                        className="gap-2 text-xs rounded-xl cursor-pointer"
                                      >
                                        <FileText className="h-3.5 w-3.5 text-slate-500" />
                                        <span>Edit Note</span>
                                      </DropdownMenuItem>

                                      <DropdownMenuItem onClick={(e) => handleDuplicate(note, e)} className="gap-2 text-xs rounded-xl cursor-pointer">
                                        <Copy className="h-3.5 w-3.5 text-slate-500" />
                                        <span>Duplicate</span>
                                      </DropdownMenuItem>

                                      <DropdownMenuItem onClick={(e) => handleTogglePin(note, e)} className="gap-2 text-xs rounded-xl cursor-pointer">
                                        <Pin className="h-3.5 w-3.5 text-blue-500" />
                                        <span>{note.isPinned ? "Unpin Note" : "Pin Note"}</span>
                                      </DropdownMenuItem>

                                      <DropdownMenuItem onClick={(e) => handleToggleFavorite(note, e)} className="gap-2 text-xs rounded-xl cursor-pointer">
                                        <Star className="h-3.5 w-3.5 text-amber-500" />
                                        <span>{note.isFavorite ? "Remove Favorite" : "Favorite Note"}</span>
                                      </DropdownMenuItem>

                                      {/* Move Category Submenu */}
                                      <DropdownMenuSub>
                                        <DropdownMenuSubTrigger className="gap-2 text-xs rounded-xl cursor-pointer">
                                          <Folder className="h-3.5 w-3.5 text-amber-500" />
                                          <span>Move to Category</span>
                                        </DropdownMenuSubTrigger>
                                        <DropdownMenuSubContent className="w-48 rounded-xl p-1">
                                          <DropdownMenuItem onClick={(e) => handleUpdateNoteCategory(note, null, e)} className="text-xs rounded-lg cursor-pointer">
                                            <span>(No Category)</span>
                                          </DropdownMenuItem>
                                          {deduplicatedCategories.map((c) => (
                                            <DropdownMenuItem
                                              key={c.id}
                                              onClick={(e) => handleUpdateNoteCategory(note, c.id, e)}
                                              className="text-xs rounded-lg cursor-pointer flex items-center justify-between"
                                            >
                                              <span className="truncate">{c.name}</span>
                                              {note.categoryId === c.id && <Check className="h-3 w-3 text-primary" />}
                                            </DropdownMenuItem>
                                          ))}
                                        </DropdownMenuSubContent>
                                      </DropdownMenuSub>

                                      <DropdownMenuItem onClick={(e) => handleArchive(note, e)} className="gap-2 text-xs rounded-xl cursor-pointer">
                                        <Archive className="h-3.5 w-3.5 text-purple-500" />
                                        <span>{note.isArchived ? "Unarchive" : "Archive Note"}</span>
                                      </DropdownMenuItem>

                                      <DropdownMenuSeparator />

                                      {note.isDeleted ? (
                                        <>
                                          <DropdownMenuItem onClick={(e) => handleRestore(note, e)} className="gap-2 text-xs rounded-xl cursor-pointer text-emerald-600 focus:text-emerald-600 font-medium">
                                            <RotateCcw className="h-3.5 w-3.5 text-emerald-500" />
                                            <span>Restore Note</span>
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={(e) => handleDelete(note, e)} className="gap-2 text-xs rounded-xl cursor-pointer text-rose-600 focus:text-rose-600 font-medium">
                                            <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                                            <span>Delete Permanently</span>
                                          </DropdownMenuItem>
                                        </>
                                      ) : (
                                        <DropdownMenuItem onClick={(e) => handleDelete(note, e)} className="gap-2 text-xs rounded-xl cursor-pointer text-rose-600 focus:text-rose-600 font-medium">
                                          <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                                          <span>Move to Trash</span>
                                        </DropdownMenuItem>
                                      )}

                                      <DropdownMenuSeparator />

                                      {/* Export Submenu */}
                                      <DropdownMenuSub>
                                        <DropdownMenuSubTrigger className="gap-2 text-xs rounded-xl cursor-pointer">
                                          <Download className="h-3.5 w-3.5 text-slate-500" />
                                          <span>Export Note</span>
                                        </DropdownMenuSubTrigger>
                                        <DropdownMenuSubContent className="w-40 rounded-xl p-1">
                                          <DropdownMenuItem onClick={() => handleExport("txt", note)} className="text-xs rounded-lg cursor-pointer">
                                            Export as TXT
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => handleExport("markdown", note)} className="text-xs rounded-lg cursor-pointer">
                                            Export as Markdown
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => handleExport("pdf", note)} className="text-xs rounded-lg cursor-pointer">
                                            Export as PDF
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={handlePrint} className="text-xs rounded-lg cursor-pointer flex items-center gap-1.5">
                                            <Printer className="h-3 w-3 text-slate-400" />
                                            <span>Print</span>
                                          </DropdownMenuItem>
                                        </DropdownMenuSubContent>
                                      </DropdownMenuSub>

                                      <DropdownMenuItem onClick={(e) => handleCopyNoteLink(note, e)} className="gap-2 text-xs rounded-xl cursor-pointer">
                                        <LinkIcon className="h-3.5 w-3.5 text-blue-500" />
                                        <span>Copy Note Link</span>
                                      </DropdownMenuItem>

                                      <DropdownMenuItem
                                        onClick={() => {
                                          setActiveNote(note);
                                          setIsVersionDialogOpen(true);
                                        }}
                                        className="gap-2 text-xs rounded-xl cursor-pointer"
                                      >
                                        <History className="h-3.5 w-3.5 text-slate-500" />
                                        <span>Version History</span>
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </div>

                              <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                                {note.plainText || "No additional text content..."}
                              </p>

                              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/60 text-[10px] text-slate-400">
                                <span>{formatDate(note.updatedAt || note.createdAt)}</span>

                                <div className="flex items-center gap-1">
                                  {isQuick && (
                                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-medium">
                                      #Quick Note
                                    </Badge>
                                  )}
                                  {note.categoryName && (
                                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 rounded-md">
                                      {note.categoryName}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}

                  {notesData.notes.length === 0 && (
                    <div className="py-16 text-center text-slate-400 text-xs bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-6">
                      <FileText className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                      <p className="font-semibold text-sm text-slate-700 dark:text-slate-300">No notes found</p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        {selectedCategory || selectedTag || searchQuery
                          ? "Try clearing your filters or search query to see all notes."
                          : "You don't have any notes in this folder yet."}
                      </p>
                      {(selectedCategory || selectedTag || searchQuery) && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedCategory(undefined);
                            setSelectedTag(undefined);
                            setSearchQuery("");
                            setStatusFilter("all");
                            refreshNotes({ categoryId: null, tag: null, search: "", status: "all" });
                          }}
                          className="mt-3 text-xs rounded-xl"
                        >
                          Clear All Filters
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

              {/* RIGHT COLUMN: Note Details & Rich Text Editor */}
              <div
                className={`${
                  mobileView === "list" ? "hidden md:block" : "block"
                } ${
                  isNotesListOpen
                    ? "md:col-span-7 lg:col-span-7 xl:col-span-8"
                    : "md:col-span-12"
                } space-y-4`}
              >
                {/* Mobile Back Button */}
                <div className="flex md:hidden items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800 no-print">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setMobileView("list")}
                    className="gap-1.5 text-xs text-primary font-semibold"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Back to Notes List</span>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleCreateNewNote}
                    className="h-8 text-xs rounded-xl gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>New Note</span>
                  </Button>
                </div>

                {activeNote ? (
                  <>
                    <Card
                      className={`rounded-2xl border shadow-sm p-4 space-y-4 bg-card transition-all ${
                        isFullscreen
                          ? "fixed inset-0 z-50 rounded-none overflow-y-auto p-6 bg-background max-w-none m-0"
                          : ""
                      }`}
                    >
                      <div className="space-y-3">
                        {/* Top Action Bar */}
                        <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800 flex-wrap">
                          {/* Color Palette & Auto-save status */}
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5">
                              {NOTE_COLORS.map((c) => (
                                <button
                                  key={c.id}
                                  type="button"
                                  title={c.label}
                                  onClick={() => {
                                    setEditorColor(c.id);
                                    updateNote(activeNote.publicId, { color: c.id });
                                  }}
                                  className={`h-4 w-4 rounded-full border transition-transform ${c.bg} ${
                                    editorColor === c.id
                                      ? "scale-125 ring-2 ring-primary ring-offset-1 border-primary"
                                      : "border-slate-300 dark:border-slate-700 hover:scale-110"
                                  }`}
                                />
                              ))}
                            </div>

                            {/* Auto-Save Indicator */}
                            <div className="flex items-center gap-1 text-[11px] text-slate-400">
                              {saveStatus === "saving" && (
                                <span className="flex items-center gap-1 text-amber-500 font-medium">
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                  Saving...
                                </span>
                              )}
                              {saveStatus === "saved" && (
                                <span className="flex items-center gap-1 text-emerald-500 font-medium">
                                  <Check className="h-3 w-3" />
                                  Saved
                                </span>
                              )}
                              {saveStatus === "unsaved" && (
                                <span className="text-slate-400">Unsaved changes</span>
                              )}
                            </div>
                          </div>

                          {/* Quick Actions & More Dropdown */}
                          <div className="flex items-center gap-1">
                            {/* Re-expand notes list button if collapsed */}
                            {!isNotesListOpen && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 px-2.5 rounded-lg text-xs gap-1.5 font-medium text-primary hidden md:inline-flex"
                                title="Show Notes List"
                                onClick={toggleNotesList}
                                suppressHydrationWarning
                              >
                                <Columns className="h-3.5 w-3.5" />
                                <span>Show List</span>
                              </Button>
                            )}

                            {/* Bottom panels toggle button */}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className={`h-8 w-8 p-0 rounded-lg hidden md:inline-flex ${
                                isBottomWidgetsOpen ? "text-primary hover:text-primary" : "text-slate-400 hover:text-slate-600"
                              }`}
                              title={isBottomWidgetsOpen ? "Hide Bottom Panels" : "Show Bottom Panels"}
                              onClick={toggleBottomWidgets}
                              suppressHydrationWarning
                            >
                              {isBottomWidgetsOpen ? (
                                <PanelBottomClose className="h-4 w-4" />
                              ) : (
                                <PanelBottom className="h-4 w-4" />
                              )}
                            </Button>

                            {/* Pin Toggle */}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 rounded-lg"
                              title={activeNote.isPinned ? "Unpin Note" : "Pin Note to Top"}
                              onClick={(e) => handleTogglePin(activeNote, e)}
                            >
                              <Pin
                                className={`h-4 w-4 ${
                                  activeNote.isPinned ? "text-blue-500 fill-blue-500" : "text-slate-400 hover:text-slate-600"
                                }`}
                              />
                            </Button>

                            {/* Favorite Toggle */}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 rounded-lg"
                              title={activeNote.isFavorite ? "Remove from Favorites" : "Mark as Favorite"}
                              onClick={(e) => handleToggleFavorite(activeNote, e)}
                            >
                              <Star
                                className={`h-4 w-4 ${
                                  activeNote.isFavorite ? "text-amber-500 fill-amber-500" : "text-slate-400 hover:text-slate-600"
                                }`}
                              />
                            </Button>

                            {/* Distraction-Free Fullscreen Toggle */}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 rounded-lg"
                              title={isFullscreen ? "Exit Fullscreen" : "Distraction-free Fullscreen"}
                              onClick={() => setIsFullscreen(!isFullscreen)}
                            >
                              {isFullscreen ? (
                                <Minimize2 className="h-4 w-4 text-primary" />
                              ) : (
                                <Maximize2 className="h-4 w-4 text-slate-400 hover:text-slate-600" />
                              )}
                            </Button>

                            {/* Secondary Actions in Dropdown Menu */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-8 px-2 rounded-lg text-xs gap-1"
                                  title="More Actions"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                  <span className="hidden sm:inline">Actions</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-lg">
                                <DropdownMenuSub>
                                  <DropdownMenuSubTrigger className="text-xs cursor-pointer">
                                    <Download className="h-3.5 w-3.5 mr-2" />
                                    <span>Export Document</span>
                                  </DropdownMenuSubTrigger>
                                  <DropdownMenuSubContent className="w-36 rounded-xl">
                                    <DropdownMenuItem onClick={() => handleExport("pdf")} className="text-xs cursor-pointer">
                                      Export as PDF
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleExport("markdown")} className="text-xs cursor-pointer">
                                      Export as Markdown
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleExport("txt")} className="text-xs cursor-pointer">
                                      Export as Text
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleExport("csv")} className="text-xs cursor-pointer">
                                      Export as CSV
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleExport("json")} className="text-xs cursor-pointer">
                                      Export as JSON
                                    </DropdownMenuItem>
                                  </DropdownMenuSubContent>
                                </DropdownMenuSub>

                                <DropdownMenuItem onClick={handlePrint} className="text-xs cursor-pointer">
                                  <Printer className="h-3.5 w-3.5 mr-2 text-slate-500" />
                                  <span>Print Note</span>
                                </DropdownMenuItem>

                                <DropdownMenuSeparator />

                                <DropdownMenuItem onClick={() => setIsVersionDialogOpen(true)} className="text-xs cursor-pointer">
                                  <History className="h-3.5 w-3.5 mr-2 text-primary" />
                                  <span>Version History</span>
                                </DropdownMenuItem>

                                <DropdownMenuItem onClick={() => setIsActivityDialogOpen(true)} className="text-xs cursor-pointer">
                                  <Activity className="h-3.5 w-3.5 mr-2 text-blue-500" />
                                  <span>Activity Log</span>
                                </DropdownMenuItem>

                                <DropdownMenuItem onClick={(e) => handleDuplicate(activeNote, e)} className="text-xs cursor-pointer">
                                  <Copy className="h-3.5 w-3.5 mr-2 text-slate-500" />
                                  <span>Duplicate Note</span>
                                </DropdownMenuItem>

                                {activeNote.tags?.some((t: string) => typeof t === "string" && t.toLowerCase() === "quick note") && (
                                  <DropdownMenuItem
                                    onClick={async () => {
                                      try {
                                        const updatedTags = (activeNote.tags || []).filter(
                                          (t: string) => typeof t === "string" && t.toLowerCase() !== "quick note"
                                        );
                                        const updated = await updateNote(activeNote.publicId, {
                                          tags: updatedTags,
                                        });
                                        setActiveNote(updated);
                                        setEditorTags(updatedTags);
                                        refreshNotes();
                                        toast.success("Converted to standard note!");
                                      } catch (e) {
                                        toast.error("Failed to convert note");
                                      }
                                    }}
                                    className="text-xs cursor-pointer text-blue-600 dark:text-blue-400 font-medium"
                                  >
                                    <FileText className="h-3.5 w-3.5 mr-2 text-blue-500" />
                                    <span>Convert to Standard Note</span>
                                  </DropdownMenuItem>
                                )}

                                <DropdownMenuSeparator />

                                <DropdownMenuItem onClick={(e) => handleArchive(activeNote, e)} className="text-xs cursor-pointer">
                                  <Archive className="h-3.5 w-3.5 mr-2 text-purple-500" />
                                  <span>{activeNote.isArchived ? "Unarchive Note" : "Archive Note"}</span>
                                </DropdownMenuItem>

                                {activeNote.isDeleted ? (
                                  <DropdownMenuItem onClick={(e) => handleRestore(activeNote, e)} className="text-xs cursor-pointer text-emerald-600 font-medium">
                                    <RotateCcw className="h-3.5 w-3.5 mr-2" />
                                    <span>Restore Note</span>
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem onClick={(e) => handleDelete(activeNote, e)} className="text-xs cursor-pointer text-rose-600 font-medium">
                                    <Trash2 className="h-3.5 w-3.5 mr-2" />
                                    <span>Move to Trash</span>
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>

                        {/* Note Title Input */}
                        <Input
                          value={editorTitle}
                          onChange={(e) => {
                            setEditorTitle(e.target.value);
                            triggerAutoSave(e.target.value, editorContent);
                          }}
                          placeholder="Note Title..."
                          className="text-lg sm:text-xl font-bold border-none shadow-none focus-visible:ring-0 px-0 h-10"
                        />

                        {/* Category & Tags Row */}
                        <div className="flex items-center gap-2 flex-wrap pb-1">
                          <select
                            value={editorCategoryId || ""}
                            onChange={(e) => {
                              const catId = e.target.value ? Number(e.target.value) : null;
                              setEditorCategoryId(catId);
                              updateNote(activeNote.publicId, { categoryId: catId });
                            }}
                            className="h-7 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-background px-2 font-medium text-slate-700 dark:text-slate-300"
                          >
                            <option value="">Uncategorized</option>
                            {processedCategories.map((cat) => (
                              <option key={cat.id} value={cat.id}>
                                {cat.name}
                              </option>
                            ))}
                          </select>

                          {editorTags.map((t) => (
                            <Badge key={t} variant="secondary" className="text-[10px] rounded-lg gap-1 h-6">
                              {t}
                              <button
                                type="button"
                                onClick={() => handleRemoveTag(t)}
                                className="hover:text-rose-500 ml-0.5"
                              >
                                ×
                              </button>
                            </Badge>
                          ))}

                          <div className="flex items-center gap-1">
                            <Input
                              value={tagInput}
                              onChange={(e) => setTagInput(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
                              placeholder="+ Add tag (#tag)"
                              className="h-7 w-28 text-[11px] rounded-lg px-2"
                            />
                          </div>
                        </div>

                        {/* Rich Text Editor */}
                        <RichTextEditor
                          initialContent={editorContent}
                          onChange={(newHtml) => {
                            setEditorContent(newHtml);
                            triggerAutoSave(editorTitle, newHtml);
                          }}
                          onManualSave={handleManualSave}
                          saveStatus={saveStatus}
                          wordCount={activeNote.wordCount}
                          characterCount={activeNote.characterCount}
                          readingTime={activeNote.readingTime}
                        />
                      </div>
                    </Card>

                    {/* Widgets Panel: Intelligent Drawer / Grid with Tabs */}
                    {!isFullscreen && isBottomWidgetsOpen && (
                      <div className="space-y-3 no-print">
                        {/* MOBILE ACCORDION MODE (< md screens): Renders only active panel to eliminate vertical scroll bloat */}
                        <div className="block md:hidden space-y-2">
                          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Note Panels & Tools</p>
                          
                          {/* Accordion Item: Tasks */}
                          <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-card">
                            <button
                              type="button"
                              onClick={() => setMobileAccordionOpen((prev) => (prev === "tasks" ? null : "tasks"))}
                              className="w-full p-3 flex items-center justify-between font-semibold text-xs text-slate-800 dark:text-slate-100 bg-slate-50/50 dark:bg-slate-900/30"
                            >
                              <span className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                                <CheckSquare className="h-4 w-4" />
                                <span>Checklists & Tasks</span>
                              </span>
                              {mobileAccordionOpen === "tasks" ? (
                                <ChevronDown className="h-4 w-4 text-slate-400" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-slate-400" />
                              )}
                            </button>
                            {mobileAccordionOpen === "tasks" && (
                              <div className="p-3 border-t border-slate-100 dark:border-slate-800">
                                <NoteTasksWidget notePublicId={activeNote.publicId} />
                              </div>
                            )}
                          </div>

                          {/* Accordion Item: Voice Notes */}
                          <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-card">
                            <button
                              type="button"
                              onClick={() => setMobileAccordionOpen((prev) => (prev === "voice" ? null : "voice"))}
                              className="w-full p-3 flex items-center justify-between font-semibold text-xs text-slate-800 dark:text-slate-100 bg-slate-50/50 dark:bg-slate-900/30"
                            >
                              <span className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                                <Mic className="h-4 w-4" />
                                <span>Voice Notes & Recordings</span>
                              </span>
                              {mobileAccordionOpen === "voice" ? (
                                <ChevronDown className="h-4 w-4 text-slate-400" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-slate-400" />
                              )}
                            </button>
                            {mobileAccordionOpen === "voice" && (
                              <div className="p-3 border-t border-slate-100 dark:border-slate-800">
                                <NoteVoiceWidget notePublicId={activeNote.publicId} />
                              </div>
                            )}
                          </div>

                          {/* Accordion Item: Attachments */}
                          <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-card">
                            <button
                              type="button"
                              onClick={() => setMobileAccordionOpen((prev) => (prev === "attachments" ? null : "attachments"))}
                              className="w-full p-3 flex items-center justify-between font-semibold text-xs text-slate-800 dark:text-slate-100 bg-slate-50/50 dark:bg-slate-900/30"
                            >
                              <span className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                                <Paperclip className="h-4 w-4" />
                                <span>Files & Attachments</span>
                              </span>
                              {mobileAccordionOpen === "attachments" ? (
                                <ChevronDown className="h-4 w-4 text-slate-400" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-slate-400" />
                              )}
                            </button>
                            {mobileAccordionOpen === "attachments" && (
                              <div className="p-3 border-t border-slate-100 dark:border-slate-800">
                                <NoteAttachmentsWidget notePublicId={activeNote.publicId} />
                              </div>
                            )}
                          </div>

                          {/* Accordion Item: Comments */}
                          <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-card">
                            <button
                              type="button"
                              onClick={() => setMobileAccordionOpen((prev) => (prev === "comments" ? null : "comments"))}
                              className="w-full p-3 flex items-center justify-between font-semibold text-xs text-slate-800 dark:text-slate-100 bg-slate-50/50 dark:bg-slate-900/30"
                            >
                              <span className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                                <MessageSquare className="h-4 w-4" />
                                <span>Comments & Discussion</span>
                              </span>
                              {mobileAccordionOpen === "comments" ? (
                                <ChevronDown className="h-4 w-4 text-slate-400" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-slate-400" />
                              )}
                            </button>
                            {mobileAccordionOpen === "comments" && (
                              <div className="p-3 border-t border-slate-100 dark:border-slate-800">
                                <NoteCommentsWidget notePublicId={activeNote.publicId} />
                              </div>
                            )}
                          </div>

                          {/* Accordion Item: Linked Entities */}
                          <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-card">
                            <button
                              type="button"
                              onClick={() => setMobileAccordionOpen((prev) => (prev === "links" ? null : "links"))}
                              className="w-full p-3 flex items-center justify-between font-semibold text-xs text-slate-800 dark:text-slate-100 bg-slate-50/50 dark:bg-slate-900/30"
                            >
                              <span className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                                <Compass className="h-4 w-4" />
                                <span>Linked Financial Entities</span>
                              </span>
                              {mobileAccordionOpen === "links" ? (
                                <ChevronDown className="h-4 w-4 text-slate-400" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-slate-400" />
                              )}
                            </button>
                            {mobileAccordionOpen === "links" && (
                              <div className="p-3 border-t border-slate-100 dark:border-slate-800">
                                <NoteLinkedEntitiesWidget linkedEntities={activeNote.linkedEntities || []} />
                              </div>
                            )}
                          </div>
                        </div>

                        {/* DESKTOP & TABLET VIEW (>= md screens) */}
                        <div className="hidden md:block space-y-3">
                          {/* Drawer Header with Tabs & Layout Toggle */}
                          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2 flex-wrap gap-2">
                            <div className="flex items-center gap-1 overflow-x-auto text-xs">
                              <button
                                type="button"
                                onClick={() => setActiveWidgetTab("tasks")}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition-all shrink-0 ${
                                  activeWidgetTab === "tasks" && widgetsLayout === "tabs"
                                    ? "bg-primary text-white shadow-xs"
                                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                                }`}
                              >
                                <CheckSquare className="h-3.5 w-3.5" />
                                <span>Tasks</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setActiveWidgetTab("voice")}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition-all shrink-0 ${
                                  activeWidgetTab === "voice" && widgetsLayout === "tabs"
                                    ? "bg-rose-500 text-white shadow-xs"
                                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                                }`}
                              >
                                <Mic className="h-3.5 w-3.5" />
                                <span>Voice Notes</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setActiveWidgetTab("attachments")}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition-all shrink-0 ${
                                  activeWidgetTab === "attachments" && widgetsLayout === "tabs"
                                    ? "bg-blue-600 text-white shadow-xs"
                                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                                }`}
                              >
                                <Paperclip className="h-3.5 w-3.5" />
                                <span>Attachments</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setActiveWidgetTab("comments")}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition-all shrink-0 ${
                                  activeWidgetTab === "comments" && widgetsLayout === "tabs"
                                    ? "bg-purple-600 text-white shadow-xs"
                                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                                }`}
                              >
                                <MessageSquare className="h-3.5 w-3.5" />
                                <span>Comments</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setActiveWidgetTab("links")}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition-all shrink-0 ${
                                  activeWidgetTab === "links" && widgetsLayout === "tabs"
                                    ? "bg-emerald-600 text-white shadow-xs"
                                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                                }`}
                              >
                                <Compass className="h-3.5 w-3.5" />
                                <span>Linked Entities</span>
                              </button>
                            </div>

                            <div className="flex items-center gap-1 border border-slate-200 dark:border-slate-800 rounded-xl p-0.5 bg-slate-50 dark:bg-slate-900">
                              <button
                                type="button"
                                onClick={() => setWidgetsLayout("tabs")}
                                className={`px-2 py-0.5 text-xs rounded-lg font-medium transition-all ${
                                  widgetsLayout === "tabs" ? "bg-white dark:bg-slate-800 text-primary shadow-xs" : "text-slate-500"
                                }`}
                              >
                                Focused Tab
                              </button>
                              <button
                                type="button"
                                onClick={() => setWidgetsLayout("grid")}
                                className={`px-2 py-0.5 text-xs rounded-lg font-medium transition-all ${
                                  widgetsLayout === "grid" ? "bg-white dark:bg-slate-800 text-primary shadow-xs" : "text-slate-500"
                                }`}
                              >
                                All Panels (Grid)
                              </button>
                            </div>
                          </div>

                          {/* Focused Tab View */}
                          {widgetsLayout === "tabs" && (
                            <div>
                              {activeWidgetTab === "tasks" && <NoteTasksWidget notePublicId={activeNote.publicId} />}
                              {activeWidgetTab === "voice" && <NoteVoiceWidget notePublicId={activeNote.publicId} />}
                              {activeWidgetTab === "attachments" && <NoteAttachmentsWidget notePublicId={activeNote.publicId} />}
                              {activeWidgetTab === "comments" && <NoteCommentsWidget notePublicId={activeNote.publicId} />}
                              {activeWidgetTab === "links" && <NoteLinkedEntitiesWidget linkedEntities={activeNote.linkedEntities || []} />}
                            </div>
                          )}

                          {/* All Panels Grid View */}
                          {widgetsLayout === "grid" && (
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                <NoteTasksWidget notePublicId={activeNote.publicId} />
                                <NoteVoiceWidget notePublicId={activeNote.publicId} />
                              </div>
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                <NoteAttachmentsWidget notePublicId={activeNote.publicId} />
                                <NoteCommentsWidget notePublicId={activeNote.publicId} />
                              </div>
                              <NoteLinkedEntitiesWidget linkedEntities={activeNote.linkedEntities || []} />
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <Card className="rounded-2xl border shadow-sm p-12 text-center text-slate-400 text-xs h-full min-h-[400px] flex flex-col items-center justify-center">
                    <FileText className="h-12 w-12 text-slate-300 dark:text-slate-700 mb-3" />
                    <p className="font-bold text-base text-slate-700 dark:text-slate-300">No Note Selected</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm">
                      Select a note from the list on the left to edit it, or create a brand new note to get started.
                    </p>
                    <Button
                      type="button"
                      onClick={handleCreateNewNote}
                      className="mt-4 rounded-xl text-xs gap-1.5 font-semibold"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Create New Note
                    </Button>
                  </Card>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dialog Modals */}
      {activeNote && (
        <>
          <NoteVersionHistoryDialog
            isOpen={isVersionDialogOpen}
            onClose={() => setIsVersionDialogOpen(false)}
            notePublicId={activeNote.publicId}
            versions={activeNote.versions || []}
            onVersionRestored={() => refreshNotes()}
          />

          <NoteActivityLogDialog
            isOpen={isActivityDialogOpen}
            onClose={() => setIsActivityDialogOpen(false)}
            notePublicId={activeNote.publicId}
          />
        </>
      )}

      <NotesCategoryDialog
        isOpen={isCategoryDialogOpen}
        onClose={() => setIsCategoryDialogOpen(false)}
        categories={categories}
        onCategoryChanged={() => {
          getNotes().then((res) => setNotesData(res));
        }}
      />

      <QuickNoteDialog
        isOpen={isQuickNoteOpen}
        onClose={() => setIsQuickNoteOpen(false)}
        categories={deduplicatedCategories}
        onNoteCreated={() => refreshNotes()}
      />

      {/* 1. Move to Trash Confirmation Dialog (Part 2) */}
      <Dialog open={!!noteToDelete} onOpenChange={(open) => !open && setNoteToDelete(null)}>
        <DialogContent className="sm:max-w-[400px] rounded-2xl">
          <DialogHeader>
            <div className="mx-auto w-11 h-11 rounded-2xl bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 mb-2">
              <Trash2 className="h-5 w-5" />
            </div>
            <DialogTitle className="text-center text-base font-bold">Move to Trash?</DialogTitle>
            <DialogDescription className="text-center text-xs text-slate-500 dark:text-slate-400">
              &quot;{noteToDelete?.title || "This note"}&quot; will be moved to the Trash Bin. You can restore it anytime from Trash.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:gap-2 mt-3">
            <Button variant="outline" onClick={() => setNoteToDelete(null)} className="rounded-xl text-xs flex-1">
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmMoveToTrash} className="rounded-xl text-xs bg-amber-600 hover:bg-amber-700 text-white flex-1 gap-1.5">
              <Trash2 className="h-3.5 w-3.5" />
              Move to Trash
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 2. Permanent Delete Confirmation Dialog (Part 2) */}
      <Dialog open={!!noteToPermanentDelete} onOpenChange={(open) => !open && setNoteToPermanentDelete(null)}>
        <DialogContent className="sm:max-w-[400px] rounded-2xl border-rose-200 dark:border-rose-900">
          <DialogHeader>
            <div className="mx-auto w-11 h-11 rounded-2xl bg-rose-100 dark:bg-rose-950/50 flex items-center justify-center text-rose-600 mb-2">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <DialogTitle className="text-center text-base font-bold text-rose-600">Delete Permanently?</DialogTitle>
            <DialogDescription className="text-center text-xs text-slate-500 dark:text-slate-400">
              This action cannot be undone. &quot;{noteToPermanentDelete?.title || "This note"}&quot; and all its attachments, tasks, checklists, and history will be erased forever.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:gap-2 mt-3">
            <Button variant="outline" onClick={() => setNoteToPermanentDelete(null)} className="rounded-xl text-xs flex-1">
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmPermanentDelete} className="rounded-xl text-xs bg-rose-600 hover:bg-rose-700 text-white flex-1 gap-1.5">
              <Trash2 className="h-3.5 w-3.5" />
              Delete Forever
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 3. Empty Trash Confirmation Dialog (Part 2) */}
      <Dialog open={isEmptyTrashConfirmOpen} onOpenChange={setIsEmptyTrashConfirmOpen}>
        <DialogContent className="sm:max-w-[400px] rounded-2xl border-rose-200 dark:border-rose-900">
          <DialogHeader>
            <div className="mx-auto w-11 h-11 rounded-2xl bg-rose-100 dark:bg-rose-950/50 flex items-center justify-center text-rose-600 mb-2">
              <Trash2 className="h-5 w-5" />
            </div>
            <DialogTitle className="text-center text-base font-bold text-rose-600">Empty Trash Bin?</DialogTitle>
            <DialogDescription className="text-center text-xs text-slate-500 dark:text-slate-400">
              Are you sure you want to permanently delete all {stats?.trash || notesData.notes.length} notes in the Trash? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:gap-2 mt-3">
            <Button variant="outline" onClick={() => setIsEmptyTrashConfirmOpen(false)} className="rounded-xl text-xs flex-1">
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmEmptyTrash} className="rounded-xl text-xs bg-rose-600 hover:bg-rose-700 text-white flex-1 gap-1.5">
              <Trash2 className="h-3.5 w-3.5" />
              Empty Trash Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 4. Bulk Move to Trash Dialog (Part 6) */}
      <Dialog open={isBulkTrashConfirmOpen} onOpenChange={setIsBulkTrashConfirmOpen}>
        <DialogContent className="sm:max-w-[400px] rounded-2xl">
          <DialogHeader>
            <div className="mx-auto w-11 h-11 rounded-2xl bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 mb-2">
              <Trash2 className="h-5 w-5" />
            </div>
            <DialogTitle className="text-center text-base font-bold">Move {selectedNoteIds.length} notes to Trash?</DialogTitle>
            <DialogDescription className="text-center text-xs text-slate-500 dark:text-slate-400">
              The selected notes will be moved to the Trash Bin. You can restore them anytime from Trash.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:gap-2 mt-3">
            <Button variant="outline" onClick={() => setIsBulkTrashConfirmOpen(false)} className="rounded-xl text-xs flex-1">
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmBulkTrash} className="rounded-xl text-xs bg-amber-600 hover:bg-amber-700 text-white flex-1">
              Move to Trash
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 5. Bulk Permanent Delete Dialog (Part 6) */}
      <Dialog open={isBulkPermanentDeleteConfirmOpen} onOpenChange={setIsBulkPermanentDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-[400px] rounded-2xl border-rose-200 dark:border-rose-900">
          <DialogHeader>
            <div className="mx-auto w-11 h-11 rounded-2xl bg-rose-100 dark:bg-rose-950/50 flex items-center justify-center text-rose-600 mb-2">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <DialogTitle className="text-center text-base font-bold text-rose-600">Delete {selectedNoteIds.length} notes forever?</DialogTitle>
            <DialogDescription className="text-center text-xs text-slate-500 dark:text-slate-400">
              This action cannot be undone. All selected notes and their attachments will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:gap-2 mt-3">
            <Button variant="outline" onClick={() => setIsBulkPermanentDeleteConfirmOpen(false)} className="rounded-xl text-xs flex-1">
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmBulkPermanentDelete} className="rounded-xl text-xs bg-rose-600 hover:bg-rose-700 text-white flex-1">
              Purge Forever
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

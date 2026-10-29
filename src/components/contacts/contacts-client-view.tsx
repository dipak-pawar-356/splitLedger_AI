"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Search,
  Filter,
  ChevronDown,
  Coins,
  Scale,
  Archive,
  Mail,
  Phone,
  MoreVertical,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  Contact,
  ArrowUpDown,
  X,
  Edit2,
  Trash2,
  RotateCcw,
  Copy,
  Share2,
  Download,
  Loader2,
  UploadCloud,
  FileSpreadsheet,
  FileText,
  Users,
  Merge,
  CheckSquare,
  History,
  Settings,
  Star,
  Building2,
  MapPin,
  Tag,
  CheckCircle2,
  Square,
  Sparkles,
  SlidersHorizontal,
  AlertTriangle,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ContactDialog } from "@/components/dialogs/contact-dialog";
import { ContactImportWizardDialog } from "@/components/contacts/contact-import-wizard-dialog";
import { ContactImportHistoryDialog } from "@/components/contacts/contact-import-history-dialog";
import { DuplicateManagerDialog } from "@/components/contacts/duplicate-manager-dialog";
import { ContactExportDialog } from "@/components/contacts/contact-export-dialog";
import {
  generateContactCsvTemplate,
  generateContactXlsxTemplateBlob,
  generateContactVcfTemplate,
  isTestingOrAssertionNote,
} from "@/lib/contacts/contact-parser";
import { archiveContact, deleteContact, updateContact } from "@/actions/contacts";
import { bulkUpdateContactsAction, purgeTestNotesFromContactsAction } from "@/actions/contact-import";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export interface ContactItem {
  id: number;
  publicId: string;
  name: string;
  email: string | null;
  phone: string | null;
  currency: string;
  openingBalance: number;
  notes: string | null;
  createdAt: Date;
  updatedAt?: Date | null;
  isArchived: boolean | null;
  balance: number;
  transactionCount: number;
  company?: string | null;
  address?: string | null;
  tags?: string[] | null;
  customFields?: Record<string, any> | null;
  isFavorite?: boolean | null;
  isBlocked?: boolean | null;
  category?: string | null;
}

export interface RecentContactActivityItem {
  id: number;
  publicId: string;
  title?: string | null;
  description: string;
  type: string;
  amount: number;
  currency: string;
  date: Date | string;
  status: string;
  contactId: number | null;
  contactName: string;
  contactPublicId: string;
}

interface ContactsClientViewProps {
  initialContacts: ContactItem[];
  monthlyTransactionsCount?: number;
  recentContactActivity?: RecentContactActivityItem[];
}

export function ContactsClientView({
  initialContacts,
  monthlyTransactionsCount = 0,
  recentContactActivity = [],
}: ContactsClientViewProps) {
  const router = useRouter();
  const [contactsList, setContactsList] = useState<ContactItem[]>(initialContacts);
  const [contactActivities, setContactActivities] = useState<RecentContactActivityItem[]>(recentContactActivity);
  const [monthlyTxCount, setMonthlyTxCount] = useState<number>(monthlyTransactionsCount || 0);
  const [searchQuery, setSearchQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [sortOrder, setSortOrder] = useState<"default" | "desc" | "asc" | "name_asc" | "name_desc">("default");

  // Filter state
  const [activeFilterTab, setActiveFilterTab] = useState<
    | "all"
    | "owed_to_you"
    | "you_owe"
    | "has_balance"
    | "settled"
    | "with_transactions"
    | "favorites"
    | "recently_added"
    | "recently_updated"
    | "has_email"
    | "has_phone"
    | "incomplete"
  >("all");
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkSelectionMode, setBulkSelectionMode] = useState(false);
  const [lastSelectedId, setLastSelectedId] = useState<number | null>(null);
  const [isBulkPending, setIsBulkPending] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const touchTimerRef = useRef<{ id: number; timer: NodeJS.Timeout; startX: number; startY: number } | null>(null);

  // Keyboard Escape to dismiss bulk selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && (selectedIds.size > 0 || bulkSelectionMode)) {
        setSelectedIds(new Set());
        setBulkSelectionMode(false);
        setLastSelectedId(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIds.size, bulkSelectionMode]);

  // Modal dialog states
  const [isImportWizardOpen, setIsImportWizardOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isDuplicateManagerOpen, setIsDuplicateManagerOpen] = useState(false);
  const [isImportHistoryOpen, setIsImportHistoryOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<ContactItem | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPurgingNotes, setIsPurgingNotes] = useState(false);

  // Detect leftover test assertion notes in contacts
  const testNotesCount = useMemo(() => {
    return contactsList.filter((c) => isTestingOrAssertionNote(c.notes)).length;
  }, [contactsList]);

  const handlePurgeTestNotes = async () => {
    if (
      !confirm(
        `Are you sure you want to clean test assertion comments from ${testNotesCount} contact(s)? Genuine contact details and notes will not be touched.`
      )
    ) {
      return;
    }
    setIsPurgingNotes(true);
    try {
      const res = await purgeTestNotesFromContactsAction();
      setContactsList((prev) =>
        prev.map((c) => (isTestingOrAssertionNote(c.notes) ? { ...c, notes: null } : c))
      );
      toast.success(`Successfully cleaned test notes from ${res.cleanedCount} contact(s)!`);
      router.refresh();
    } catch {
      toast.error("Failed to clean test notes");
    } finally {
      setIsPurgingNotes(false);
    }
  };

  // Synchronize when initialContacts changes
  useEffect(() => {
    setContactsList(initialContacts);
    if (!initialContacts || initialContacts.length === 0) {
      setContactActivities([]);
      setMonthlyTxCount(0);
    }
  }, [initialContacts]);

  useEffect(() => {
    setContactActivities(recentContactActivity || []);
  }, [recentContactActivity]);

  useEffect(() => {
    setMonthlyTxCount(monthlyTransactionsCount || 0);
  }, [monthlyTransactionsCount]);

  // Active vs Archived counts
  const activeContacts = useMemo(
    () => contactsList.filter((c) => !c.isArchived),
    [contactsList]
  );
  const archivedContacts = useMemo(
    () => contactsList.filter((c) => Boolean(c.isArchived)),
    [contactsList]
  );

  // Unique tags across all contacts
  const allUniqueTags = useMemo(() => {
    const set = new Set<string>();
    contactsList.forEach((c) => {
      if (Array.isArray(c.tags)) {
        c.tags.forEach((t) => set.add(t));
      }
    });
    return Array.from(set).sort();
  }, [contactsList]);

  // Filtered contacts based on search, active tab, tag, and archive status
  const displayedContacts = useMemo(() => {
    let result = showArchived ? archivedContacts : activeContacts;

    // Quick filter tab
    if (activeFilterTab === "owed_to_you") {
      result = result.filter((c) => (c.balance || 0) > 0);
    } else if (activeFilterTab === "you_owe") {
      result = result.filter((c) => (c.balance || 0) < 0);
    } else if (activeFilterTab === "has_balance") {
      result = result.filter((c) => (c.balance || 0) !== 0);
    } else if (activeFilterTab === "settled") {
      result = result.filter((c) => (c.balance || 0) === 0);
    } else if (activeFilterTab === "with_transactions") {
      result = result.filter((c) => (c.transactionCount || 0) > 0);
    } else if (activeFilterTab === "favorites") {
      result = result.filter((c) => Boolean(c.isFavorite));
    } else if (activeFilterTab === "recently_added") {
      const sevenDaysAgo = Date.now() - 7 * 86400000;
      result = result.filter((c) => new Date(c.createdAt).getTime() >= sevenDaysAgo);
    } else if (activeFilterTab === "recently_updated") {
      const sevenDaysAgo = Date.now() - 7 * 86400000;
      result = result.filter(
        (c) => c.updatedAt && new Date(c.updatedAt).getTime() >= sevenDaysAgo
      );
    } else if (activeFilterTab === "has_email") {
      result = result.filter((c) => Boolean(c.email && c.email.trim()));
    } else if (activeFilterTab === "has_phone") {
      result = result.filter((c) => Boolean(c.phone && c.phone.trim()));
    } else if (activeFilterTab === "incomplete") {
      result = result.filter((c) => !c.email || !c.phone);
    }

    // Tag filter
    if (selectedTagFilter) {
      result = result.filter(
        (c) => Array.isArray(c.tags) && c.tags.includes(selectedTagFilter)
      );
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.email && c.email.toLowerCase().includes(q)) ||
          (c.phone && c.phone.toLowerCase().includes(q)) ||
          (c.company && c.company.toLowerCase().includes(q)) ||
          (c.address && c.address.toLowerCase().includes(q)) ||
          (c.notes && c.notes.toLowerCase().includes(q)) ||
          (Array.isArray(c.tags) && c.tags.some((t) => t.toLowerCase().includes(q)))
      );
    }

    // Sorting
    if (sortOrder === "desc") {
      result = [...result].sort((a, b) => (b.balance || 0) - (a.balance || 0));
    } else if (sortOrder === "asc") {
      result = [...result].sort((a, b) => (a.balance || 0) - (b.balance || 0));
    } else if (sortOrder === "name_asc") {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortOrder === "name_desc") {
      result = [...result].sort((a, b) => b.name.localeCompare(a.name));
    }

    return result;
  }, [
    activeContacts,
    archivedContacts,
    showArchived,
    activeFilterTab,
    selectedTagFilter,
    searchQuery,
    sortOrder,
  ]);

  // Overall statistics calculated across active contacts
  const totalContactsCount = activeContacts.length;
  const totalOwedToYou = useMemo(
    () =>
      activeContacts
        .filter((c) => c.balance > 0)
        .reduce((sum, c) => sum + (c.balance || 0), 0) / 100,
    [activeContacts]
  );
  const totalYouOwe = useMemo(
    () =>
      Math.abs(
        activeContacts
          .filter((c) => c.balance < 0)
          .reduce((sum, c) => sum + (c.balance || 0), 0)
      ) / 100,
    [activeContacts]
  );
  const totalTransactionsCount = useMemo(
    () => activeContacts.reduce((sum, c) => sum + (c.transactionCount || 0), 0),
    [activeContacts]
  );
  const currentNetBalance = useMemo(
    () => totalOwedToYou - totalYouOwe,
    [totalOwedToYou, totalYouOwe]
  );
  const runningBalance = currentNetBalance;

  // Badge counts for quick filter tabs
  const owedToYouCount = useMemo(
    () => activeContacts.filter((c) => (c.balance || 0) > 0).length,
    [activeContacts]
  );
  const youOweCount = useMemo(
    () => activeContacts.filter((c) => (c.balance || 0) < 0).length,
    [activeContacts]
  );
  const withTransactionsCount = useMemo(
    () => activeContacts.filter((c) => (c.transactionCount || 0) > 0).length,
    [activeContacts]
  );
  const favoritesCount = useMemo(
    () => activeContacts.filter((c) => Boolean(c.isFavorite)).length,
    [activeContacts]
  );
  const hasBalanceCount = useMemo(
    () => activeContacts.filter((c) => (c.balance || 0) !== 0).length,
    [activeContacts]
  );
  const settledCount = useMemo(
    () => activeContacts.filter((c) => (c.balance || 0) === 0).length,
    [activeContacts]
  );

  const getFilterLabel = (tab: string) => {
    switch (tab) {
      case "owed_to_you":
        return "Owed to You";
      case "you_owe":
        return "You Owe";
      case "has_balance":
        return "Has Balance";
      case "settled":
        return "Settled (₹0)";
      case "with_transactions":
        return "With Transactions";
      case "favorites":
        return "Favorites";
      case "recently_added":
        return "Recently Added";
      case "recently_updated":
        return "Recently Updated";
      case "has_email":
        return "Has Email";
      case "has_phone":
        return "Has Phone";
      case "incomplete":
        return "Incomplete";
      default:
        return "All Contacts";
    }
  };

  const sortOrderLabels: Record<string, string> = {
    default: "Sort: Default",
    desc: "Balance: High to Low",
    asc: "Balance: Low to High",
    name_asc: "Name: A → Z",
    name_desc: "Name: Z → A",
  };

  // Selected contacts objects
  const selectedContactsList = useMemo(() => {
    return contactsList.filter((c) => selectedIds.has(c.id));
  }, [contactsList, selectedIds]);

  // Bulk selection handlers
  const toggleSelectContact = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleSelectAllDisplayed = () => {
    if (selectedIds.size === displayedContacts.length && displayedContacts.length > 0) {
      setSelectedIds(new Set());
      setLastSelectedId(null);
    } else {
      setSelectedIds(new Set(displayedContacts.map((c) => c.id)));
      setBulkSelectionMode(true);
    }
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
    setBulkSelectionMode(false);
    setLastSelectedId(null);
  };

  const handleInvertSelection = () => {
    const next = new Set<number>();
    displayedContacts.forEach((c) => {
      if (!selectedIds.has(c.id)) {
        next.add(c.id);
      }
    });
    setSelectedIds(next);
    setBulkSelectionMode(next.size > 0);
  };

  const handleSelectWithBalance = () => {
    const next = new Set<number>();
    displayedContacts.forEach((c) => {
      if ((c.balance || 0) !== 0) {
        next.add(c.id);
      }
    });
    setSelectedIds(next);
    setBulkSelectionMode(next.size > 0);
  };

  const handleSelectSettled = () => {
    const next = new Set<number>();
    displayedContacts.forEach((c) => {
      if ((c.balance || 0) === 0) {
        next.add(c.id);
      }
    });
    setSelectedIds(next);
    setBulkSelectionMode(next.size > 0);
  };

  // Selected contacts summary for safety modal
  const selectedSummary = useMemo(() => {
    const list = contactsList.filter((c) => selectedIds.has(c.id));
    const countWithBalance = list.filter((c) => (c.balance || 0) !== 0).length;
    const totalBalanceSum = list.reduce((sum, c) => sum + Math.abs(c.balance || 0), 0);
    return {
      count: list.length,
      countWithBalance,
      totalBalanceSum,
    };
  }, [contactsList, selectedIds]);

  // Touch gesture handlers for mobile photo-gallery multiselect
  const handleTouchStart = (contactId: number, e: React.TouchEvent) => {
    if (bulkSelectionMode || selectedIds.size > 0) return;
    const touch = e.touches[0];
    const timer = setTimeout(() => {
      if (typeof window !== "undefined" && "vibrate" in navigator) {
        try {
          navigator.vibrate(40);
        } catch {
          // ignore if vibration unsupported
        }
      }
      setBulkSelectionMode(true);
      setSelectedIds(new Set([contactId]));
      setLastSelectedId(contactId);
      touchTimerRef.current = null;
    }, 400);

    touchTimerRef.current = {
      id: contactId,
      timer,
      startX: touch.clientX,
      startY: touch.clientY,
    };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchTimerRef.current) return;
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchTimerRef.current.startX);
    const dy = Math.abs(touch.clientY - touchTimerRef.current.startY);
    if (dx > 10 || dy > 10) {
      clearTimeout(touchTimerRef.current.timer);
      touchTimerRef.current = null;
    }
  };

  const handleTouchEnd = () => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current.timer);
      touchTimerRef.current = null;
    }
  };

  // Card click interceptor for desktop Ctrl/Cmd + click and Shift + click range selection
  const handleContactCardClick = (e: React.MouseEvent, contact: ContactItem) => {
    const isCtrl = e.ctrlKey || e.metaKey;
    const isShift = e.shiftKey;

    if (bulkSelectionMode || selectedIds.size > 0 || isCtrl || isShift) {
      e.preventDefault();
      e.stopPropagation();

      if (isShift && lastSelectedId !== null) {
        const lastIdx = displayedContacts.findIndex((c) => c.id === lastSelectedId);
        const currentIdx = displayedContacts.findIndex((c) => c.id === contact.id);
        if (lastIdx !== -1 && currentIdx !== -1) {
          const start = Math.min(lastIdx, currentIdx);
          const end = Math.max(lastIdx, currentIdx);
          const rangeIds = displayedContacts.slice(start, end + 1).map((c) => c.id);
          setSelectedIds((prev) => {
            const next = new Set(prev);
            rangeIds.forEach((id) => next.add(id));
            return next;
          });
          setBulkSelectionMode(true);
          setLastSelectedId(contact.id);
          return;
        }
      }

      toggleSelectContact(contact.id);
      setLastSelectedId(contact.id);
      if (!bulkSelectionMode && !selectedIds.has(contact.id)) {
        setBulkSelectionMode(true);
      }
    }
  };

  // Toggle Favorite
  const handleToggleFavorite = async (contact: ContactItem) => {
    const willFavorite = !contact.isFavorite;
    setContactsList((prev) =>
      prev.map((c) => (c.id === contact.id ? { ...c, isFavorite: willFavorite } : c))
    );
    try {
      await updateContact(contact.id, { isFavorite: willFavorite });
      toast.success(willFavorite ? `Added ${contact.name} to favorites` : `Removed from favorites`);
    } catch {
      setContactsList((prev) =>
        prev.map((c) => (c.id === contact.id ? { ...c, isFavorite: !willFavorite } : c))
      );
      toast.error("Failed to update favorite status");
    }
  };

  // Archive toggle
  const handleToggleArchive = async (contact: ContactItem) => {
    const willArchive = !contact.isArchived;
    setContactsList((prev) =>
      prev.map((c) => (c.id === contact.id ? { ...c, isArchived: willArchive } : c))
    );
    try {
      await archiveContact(contact.id, willArchive);
      toast.success(
        willArchive ? `${contact.name} archived.` : `${contact.name} restored to active.`
      );
      router.refresh();
    } catch {
      setContactsList((prev) =>
        prev.map((c) => (c.id === contact.id ? { ...c, isArchived: !willArchive } : c))
      );
      toast.error("Failed to update archive status.");
    }
  };

  // Delete contact
  const handleDelete = async (contact: ContactItem) => {
    if (!confirm(`Are you sure you want to delete ${contact.name}?`)) return;
    setContactsList((prev) => {
      const remaining = prev.filter((c) => c.id !== contact.id);
      if (remaining.length === 0) {
        setContactActivities([]);
        setMonthlyTxCount(0);
      }
      return remaining;
    });
    setContactActivities((prev) =>
      prev.filter((a) => a.contactId !== contact.id && a.contactPublicId !== contact.publicId)
    );
    try {
      await deleteContact(contact.id);
      toast.success(`${contact.name} and related activities removed.`);
      router.refresh();
    } catch {
      setContactsList(initialContacts);
      setContactActivities(recentContactActivity || []);
      setMonthlyTxCount(monthlyTransactionsCount || 0);
      toast.error("Failed to delete contact.");
    }
  };

  // Bulk Operations
  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmBulkDelete = async () => {
    const count = selectedIds.size;
    if (count === 0) return;
    const deletedSet = new Set(selectedIds);
    setIsBulkPending(true);
    setIsDeleteDialogOpen(false);

    // Optimistic UI updates
    setContactsList((prev) => {
      const remaining = prev.filter((c) => !deletedSet.has(c.id));
      if (remaining.length === 0) {
        setContactActivities([]);
        setMonthlyTxCount(0);
      }
      return remaining;
    });
    setContactActivities((prev) =>
      prev.filter((a) => !a.contactId || !deletedSet.has(a.contactId))
    );

    try {
      await bulkUpdateContactsAction(Array.from(selectedIds), { type: "delete" });
      toast.success(`Deleted ${count} contact(s) and related activities.`);
      setSelectedIds(new Set());
      setBulkSelectionMode(false);
      setLastSelectedId(null);
      router.refresh();
    } catch (err) {
      setContactsList(initialContacts);
      setContactActivities(recentContactActivity || []);
      setMonthlyTxCount(monthlyTransactionsCount || 0);
      toast.error(err instanceof Error ? err.message : "Bulk delete failed");
    } finally {
      setIsBulkPending(false);
    }
  };

  const handleBulkArchive = async (archive: boolean) => {
    setIsBulkPending(true);
    try {
      await bulkUpdateContactsAction(Array.from(selectedIds), {
        type: archive ? "archive" : "unarchive",
      });
      toast.success(
        archive
          ? `Archived ${selectedIds.size} contacts`
          : `Restored ${selectedIds.size} contacts`
      );
      setSelectedIds(new Set());
      router.refresh();
    } catch (err) {
      toast.error("Bulk archive operation failed");
    } finally {
      setIsBulkPending(false);
    }
  };

  const handleBulkAddTag = async () => {
    const tag = prompt("Enter tag name to add to selected contacts:");
    if (!tag || !tag.trim()) return;
    setIsBulkPending(true);
    try {
      await bulkUpdateContactsAction(Array.from(selectedIds), {
        type: "add_tag",
        value: tag.trim(),
      });
      toast.success(`Added tag '${tag.trim()}' to ${selectedIds.size} contact(s)`);
      setSelectedIds(new Set());
      router.refresh();
    } catch (err) {
      toast.error("Bulk tagging failed");
    } finally {
      setIsBulkPending(false);
    }
  };

  const handleBulkUpdateCompany = async () => {
    const company = prompt("Enter company name for selected contacts:");
    if (company === null) return;
    setIsBulkPending(true);
    try {
      await bulkUpdateContactsAction(Array.from(selectedIds), {
        type: "update_company",
        value: company.trim(),
      });
      toast.success(`Updated company for ${selectedIds.size} contact(s)`);
      setSelectedIds(new Set());
      router.refresh();
    } catch (err) {
      toast.error("Bulk update company failed");
    } finally {
      setIsBulkPending(false);
    }
  };

  // Download Templates
  const handleDownloadXlsxTemplate = async () => {
    try {
      const blob = await generateContactXlsxTemplateBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "contacts-import-template.xlsx";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Downloaded Excel Import Template (.xlsx)");
    } catch {
      toast.error("Failed to generate Excel template");
    }
  };

  const handleDownloadCsvTemplate = () => {
    const csv = generateContactCsvTemplate();
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "contacts-import-template.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded CSV Import Template (.csv)");
  };

  const handleDownloadVcfTemplate = () => {
    const vcf = generateContactVcfTemplate();
    const blob = new Blob([vcf], { type: "text/vcard;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "contacts-import-template.vcf";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded vCard Import Template (.vcf)");
  };

  const handleEditClick = (contact: ContactItem) => {
    setEditingContact(contact);
    setIsEditDialogOpen(true);
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              Contacts
            </h1>
            <Badge variant="secondary" className="bg-primary/10 text-primary font-bold text-xs">
              {totalContactsCount} Active
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage your network, track split balances, import spreadsheets, and view transaction ledgers
          </p>
        </div>

        {/* Header Action Buttons & Enterprise Three Dot Menu */}
        <div className="flex items-center gap-2 flex-wrap">
          <ContactDialog
            onSuccess={() => router.refresh()}
            trigger={
              <Button className="rounded-xl shadow-xs font-semibold gap-1.5 bg-primary text-primary-foreground hover:shadow-md hover:-translate-y-0.5 transition-all h-9 text-xs">
                <Plus className="h-4 w-4" />
                <span>Add Contact</span>
              </Button>
            }
          />

          {/* Enterprise Three Dot Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="rounded-xl h-9 w-9 border-slate-200/80 dark:border-slate-800 hover:border-slate-400 text-slate-700 dark:text-slate-300"
                title="Contact Management Options"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60 rounded-2xl p-1.5 shadow-2xl bg-card border border-slate-200/80 dark:border-slate-800">
              <DropdownMenuItem
                onClick={() => setIsImportWizardOpen(true)}
                className="gap-2.5 cursor-pointer py-2 text-xs font-bold text-primary focus:bg-primary/10 focus:text-primary rounded-xl"
              >
                <UploadCloud className="h-4 w-4 text-primary" />
                <span>Import Contacts</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => setIsExportDialogOpen(true)}
                className="gap-2.5 cursor-pointer py-2 text-xs font-semibold rounded-xl"
              >
                <Download className="h-4 w-4 text-emerald-600" />
                <span>Export Contacts</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {/* Template Downloads */}
              <DropdownMenuItem
                onClick={handleDownloadXlsxTemplate}
                className="gap-2.5 cursor-pointer py-1.5 text-xs rounded-xl"
              >
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                <span>Download Excel Template</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={handleDownloadCsvTemplate}
                className="gap-2.5 cursor-pointer py-1.5 text-xs rounded-xl"
              >
                <FileText className="h-4 w-4 text-blue-600" />
                <span>Download CSV Template</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={handleDownloadVcfTemplate}
                className="gap-2.5 cursor-pointer py-1.5 text-xs rounded-xl"
              >
                <Contact className="h-4 w-4 text-amber-600" />
                <span>Download vCard Template</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={() => setIsDuplicateManagerOpen(true)}
                className="gap-2.5 cursor-pointer py-2 text-xs font-semibold rounded-xl"
              >
                <Users className="h-4 w-4 text-amber-600" />
                <span>Duplicate Manager</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => setIsDuplicateManagerOpen(true)}
                className="gap-2.5 cursor-pointer py-2 text-xs font-semibold rounded-xl"
              >
                <Merge className="h-4 w-4 text-purple-600" />
                <span>Merge Contacts</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => setBulkSelectionMode(!bulkSelectionMode)}
                className="gap-2.5 cursor-pointer py-2 text-xs font-semibold rounded-xl"
              >
                <CheckSquare className="h-4 w-4 text-teal-600" />
                <span>{bulkSelectionMode ? "Exit Bulk Selection" : "Bulk Update / Select"}</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={() => setIsImportHistoryOpen(true)}
                className="gap-2.5 cursor-pointer py-2 text-xs font-semibold rounded-xl"
              >
                <History className="h-4 w-4 text-slate-500" />
                <span>Import History</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => toast.info("Import settings: Strict UTF-8 validation and auto-mapping are active.")}
                className="gap-2.5 cursor-pointer py-2 text-xs font-semibold rounded-xl"
              >
                <Settings className="h-4 w-4 text-slate-500" />
                <span>Import Settings</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* 5 Core Contact Workspace Stat Cards (Requirement 5) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* 1. Current Balance */}
        <Card
          onClick={() => {
            setShowArchived(false);
            setActiveFilterTab("all");
            setSelectedTagFilter(null);
            setSearchQuery("");
            toast.info("Showing all active contacts");
          }}
          className={`rounded-3xl border p-4 shadow-xs cursor-pointer relative overflow-hidden transition-all duration-300 group hover:-translate-y-1 hover:shadow-lg ${
            currentNetBalance >= 0
              ? "bg-gradient-to-br from-emerald-500/10 via-card to-background border-emerald-500/30"
              : "bg-gradient-to-br from-rose-500/10 via-card to-background border-rose-500/30"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-bold uppercase tracking-wider text-[10px] text-slate-500 dark:text-slate-400">
              Current Balance
            </span>
            <div className={`p-2 rounded-xl text-white ${currentNetBalance >= 0 ? "bg-emerald-600" : "bg-rose-600"}`}>
              <Coins className="h-4 w-4" />
            </div>
          </div>
          <div className={`text-xl sm:text-2xl font-black mt-2 tracking-tight ${currentNetBalance >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
            {currentNetBalance >= 0 ? "+" : ""}{formatCurrency(currentNetBalance, "INR")}
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 font-medium">
            {currentNetBalance >= 0 ? "Net surplus from contacts" : "Net obligations to contacts"}
          </p>
        </Card>

        {/* 2. Amount Owed (They Owe You) */}
        <Card
          className={`rounded-3xl border p-4 shadow-xs relative overflow-hidden transition-all duration-300 group hover:-translate-y-1 hover:shadow-lg cursor-pointer ${
            !showArchived && activeFilterTab === "owed_to_you"
              ? "bg-gradient-to-br from-emerald-500/15 via-card to-background border-emerald-500/70 shadow-emerald-500/15 ring-2 ring-emerald-500/40"
              : "bg-card border-slate-200/80 dark:border-slate-800/90 hover:border-emerald-400"
          }`}
          onClick={() => {
            setShowArchived(false);
            setSelectedTagFilter(null);
            if (activeFilterTab === "owed_to_you") {
              setActiveFilterTab("all");
              toast.info("Showing all contacts");
            } else {
              setActiveFilterTab("owed_to_you");
              toast.info(`Filtered: Showing ${owedToYouCount} contact${owedToYouCount === 1 ? "" : "s"} who owe you`);
            }
          }}
        >
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-bold uppercase tracking-wider text-[10px] text-emerald-600 dark:text-emerald-400">
              Amount Owed
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2 tracking-tight">
            {formatCurrency(totalOwedToYou, "INR")}
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 font-medium">
            They Owe You ({owedToYouCount} contacts)
          </p>
        </Card>

        {/* 3. Amount You Owe */}
        <Card
          className={`rounded-3xl border p-4 shadow-xs relative overflow-hidden transition-all duration-300 group hover:-translate-y-1 hover:shadow-lg cursor-pointer ${
            !showArchived && activeFilterTab === "you_owe"
              ? "bg-gradient-to-br from-rose-500/15 via-card to-background border-rose-500/70 shadow-rose-500/15 ring-2 ring-rose-500/40"
              : "bg-card border-slate-200/80 dark:border-slate-800/90 hover:border-rose-400"
          }`}
          onClick={() => {
            setShowArchived(false);
            setSelectedTagFilter(null);
            if (activeFilterTab === "you_owe") {
              setActiveFilterTab("all");
              toast.info("Showing all contacts");
            } else {
              setActiveFilterTab("you_owe");
              toast.info(`Filtered: Showing ${youOweCount} contact${youOweCount === 1 ? "" : "s"} you owe`);
            }
          }}
        >
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-bold uppercase tracking-wider text-[10px] text-rose-600 dark:text-rose-400">
              Amount You Owe
            </span>
            <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 group-hover:scale-110 transition-transform">
              <TrendingDown className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 mt-2 tracking-tight">
            {formatCurrency(totalYouOwe, "INR")}
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 font-medium">
            You Owe ({youOweCount} contacts)
          </p>
        </Card>

        {/* 4. Monthly Transactions */}
        <Card
          className={`rounded-3xl border p-4 shadow-xs relative overflow-hidden transition-all duration-300 group hover:-translate-y-1 hover:shadow-lg cursor-pointer ${
            !showArchived && activeFilterTab === "with_transactions"
              ? "bg-gradient-to-br from-blue-500/15 via-card to-background border-blue-500/70 ring-2 ring-blue-500/40"
              : "bg-card border-slate-200/80 dark:border-slate-800/90 hover:border-blue-400"
          }`}
          onClick={() => {
            setShowArchived(false);
            setSelectedTagFilter(null);
            if (activeFilterTab === "with_transactions") {
              setActiveFilterTab("all");
              toast.info("Showing all contacts");
            } else {
              setActiveFilterTab("with_transactions");
              toast.info(`Filtered: Showing ${withTransactionsCount} contacts with transactions`);
            }
          }}
        >
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-bold uppercase tracking-wider text-[10px] text-blue-600 dark:text-blue-400">
              Monthly Transactions
            </span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 mt-2 tracking-tight">
            {contactsList.length === 0 ? 0 : (monthlyTxCount ?? totalTransactionsCount)}
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 font-medium">
            Recorded this month
          </p>
        </Card>

        {/* 5. Running Balance */}
        <Card className="rounded-3xl border p-4 shadow-xs relative overflow-hidden transition-all duration-300 bg-card border-slate-200/80 dark:border-slate-800/90">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-bold uppercase tracking-wider text-[10px] text-purple-600 dark:text-purple-400">
              Running Balance
            </span>
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
              <Scale className="h-4 w-4" />
            </div>
          </div>
          <div className={`text-xl sm:text-2xl font-black mt-2 tracking-tight ${runningBalance >= 0 ? "text-purple-600 dark:text-purple-400" : "text-rose-600 dark:text-rose-400"}`}>
            {runningBalance >= 0 ? "+" : ""}{formatCurrency(runningBalance, "INR")}
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 font-medium">
            Cumulative net network ledger
          </p>
        </Card>
      </div>

      {/* Recent Contact Activity (Requirement 5) */}
      {contactActivities && contactActivities.length > 0 && contactsList.length > 0 && (
        <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-card shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-primary" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                Recent Contact Activity
              </h3>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">
              Latest counterparty ledger updates
            </span>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {contactActivities.map((activity) => {
              const isPositive = activity.type === "received" || activity.type === "lent" || activity.type === "repaid";
              return (
                <Link
                  key={activity.id}
                  href={`/dashboard/contacts/${activity.contactPublicId}`}
                  className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                      {activity.contactName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-primary transition-colors truncate">
                          {activity.contactName}
                        </span>
                        <span className="text-[11px] text-slate-400 truncate">
                          • {activity.title || activity.description}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {formatDate(activity.date)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`text-xs font-black font-mono block ${isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                      {isPositive ? "+" : "-"}{formatCurrency(activity.amount / 100, activity.currency)}
                    </span>
                    <span className="text-[10px] uppercase font-mono text-slate-400 capitalize">
                      {activity.status}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </Card>
      )}

      {/* Filter & Search Toolbar */}
      <div className="p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-card shadow-xs space-y-3">
        {/* Search Input Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 group">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
            <Input
              type="text"
              placeholder="Search contacts by name, email, phone, company, address, tags, notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9 h-10 text-xs sm:text-sm rounded-xl border-slate-200/80 dark:border-slate-800 focus-visible:ring-primary/20"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter Dropdown Selection */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant={activeFilterTab !== "all" ? "default" : "outline"}
                  size="sm"
                  className={`rounded-xl text-xs gap-1.5 h-9 font-semibold transition-all cursor-pointer ${
                    activeFilterTab === "owed_to_you"
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500 shadow-xs"
                      : activeFilterTab === "you_owe"
                      ? "bg-rose-600 hover:bg-rose-700 text-white border-rose-500 shadow-xs"
                      : activeFilterTab !== "all"
                      ? "bg-primary text-white shadow-xs"
                      : "border-slate-200/80 dark:border-slate-800 hover:border-slate-400 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <Filter className="h-3.5 w-3.5" />
                  <span>Filter: {getFilterLabel(activeFilterTab)}</span>
                  <ChevronDown className="h-3 w-3 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 rounded-2xl p-1.5 shadow-xl max-h-96 overflow-y-auto">
                <DropdownMenuLabel className="text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 py-1">
                  Amounts & Balances
                </DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => {
                    setShowArchived(false);
                    setActiveFilterTab("owed_to_you");
                    toast.info("Filtered: Showing contacts who owe you (receivables)");
                  }}
                  className={`cursor-pointer text-xs rounded-xl flex items-center justify-between ${
                    activeFilterTab === "owed_to_you" ? "bg-emerald-50 dark:bg-emerald-950/40 font-bold" : ""
                  }`}
                >
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold">
                    <TrendingUp className="h-3.5 w-3.5" />
                    <span>Owed to You (Receivables)</span>
                  </div>
                  {owedToYouCount > 0 && (
                    <Badge variant="secondary" className="text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                      {owedToYouCount}
                    </Badge>
                  )}
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => {
                    setShowArchived(false);
                    setActiveFilterTab("you_owe");
                    toast.info("Filtered: Showing contacts you owe (payables)");
                  }}
                  className={`cursor-pointer text-xs rounded-xl flex items-center justify-between ${
                    activeFilterTab === "you_owe" ? "bg-rose-50 dark:bg-rose-950/40 font-bold" : ""
                  }`}
                >
                  <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-semibold">
                    <TrendingDown className="h-3.5 w-3.5" />
                    <span>You Owe (Payables)</span>
                  </div>
                  {youOweCount > 0 && (
                    <Badge variant="secondary" className="text-[10px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
                      {youOweCount}
                    </Badge>
                  )}
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => {
                    setShowArchived(false);
                    setActiveFilterTab("has_balance");
                    toast.info("Filtered: Showing contacts with non-zero balance");
                  }}
                  className={`cursor-pointer text-xs rounded-xl flex items-center justify-between ${
                    activeFilterTab === "has_balance" ? "bg-slate-100 dark:bg-slate-800 font-bold" : ""
                  }`}
                >
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <Coins className="h-3.5 w-3.5 text-slate-500" />
                    <span>Has Balance (Non-Zero)</span>
                  </div>
                  {hasBalanceCount > 0 && (
                    <Badge variant="secondary" className="text-[10px] font-bold">
                      {hasBalanceCount}
                    </Badge>
                  )}
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => {
                    setShowArchived(false);
                    setActiveFilterTab("settled");
                    toast.info("Filtered: Showing settled contacts (₹0 balance)");
                  }}
                  className={`cursor-pointer text-xs rounded-xl flex items-center justify-between ${
                    activeFilterTab === "settled" ? "bg-slate-100 dark:bg-slate-800 font-bold" : ""
                  }`}
                >
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <CheckCircle2 className="h-3.5 w-3.5 text-slate-500" />
                    <span>Settled / Zero Balance (₹0)</span>
                  </div>
                  {settledCount > 0 && (
                    <Badge variant="secondary" className="text-[10px] font-bold">
                      {settledCount}
                    </Badge>
                  )}
                </DropdownMenuItem>

                <DropdownMenuSeparator className="my-1" />
                <DropdownMenuLabel className="text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 py-1">
                  General & Activity
                </DropdownMenuLabel>

                <DropdownMenuItem
                  onClick={() => {
                    setShowArchived(false);
                    setActiveFilterTab("all");
                    toast.info("Showing all contacts");
                  }}
                  className={`cursor-pointer text-xs rounded-xl flex items-center justify-between ${
                    activeFilterTab === "all" ? "bg-slate-100 dark:bg-slate-800 font-bold" : ""
                  }`}
                >
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <Users className="h-3.5 w-3.5 text-slate-500" />
                    <span>All Contacts</span>
                  </div>
                  <Badge variant="secondary" className="text-[10px] font-bold">
                    {totalContactsCount}
                  </Badge>
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => {
                    setShowArchived(false);
                    setActiveFilterTab("with_transactions");
                    toast.info("Filtered: Showing contacts with transactions");
                  }}
                  className={`cursor-pointer text-xs rounded-xl flex items-center justify-between ${
                    activeFilterTab === "with_transactions" ? "bg-blue-50 dark:bg-blue-950/40 font-bold" : ""
                  }`}
                >
                  <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                    <ArrowUpRight className="h-3.5 w-3.5" />
                    <span>With Transactions</span>
                  </div>
                  {withTransactionsCount > 0 && (
                    <Badge variant="secondary" className="text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                      {withTransactionsCount}
                    </Badge>
                  )}
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => {
                    setShowArchived(false);
                    setActiveFilterTab("favorites");
                    toast.info("Filtered: Showing favorite contacts");
                  }}
                  className={`cursor-pointer text-xs rounded-xl flex items-center justify-between ${
                    activeFilterTab === "favorites" ? "bg-amber-50 dark:bg-amber-950/40 font-bold" : ""
                  }`}
                >
                  <div className="flex items-center gap-2 text-amber-500">
                    <Star className="h-3.5 w-3.5 fill-amber-500" />
                    <span>Favorites</span>
                  </div>
                  {favoritesCount > 0 && (
                    <Badge variant="secondary" className="text-[10px] font-bold">
                      {favoritesCount}
                    </Badge>
                  )}
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => {
                    setShowArchived(false);
                    setActiveFilterTab("recently_added");
                    toast.info("Filtered: Showing recently added contacts");
                  }}
                  className={`cursor-pointer text-xs rounded-xl ${
                    activeFilterTab === "recently_added" ? "bg-slate-100 dark:bg-slate-800 font-bold" : ""
                  }`}
                >
                  <span>Recently Added (7 days)</span>
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => {
                    setShowArchived(false);
                    setActiveFilterTab("recently_updated");
                    toast.info("Filtered: Showing recently updated contacts");
                  }}
                  className={`cursor-pointer text-xs rounded-xl ${
                    activeFilterTab === "recently_updated" ? "bg-slate-100 dark:bg-slate-800 font-bold" : ""
                  }`}
                >
                  <span>Recently Updated (7 days)</span>
                </DropdownMenuItem>

                <DropdownMenuSeparator className="my-1" />
                <DropdownMenuLabel className="text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 py-1">
                  Profile Completeness
                </DropdownMenuLabel>

                <DropdownMenuItem
                  onClick={() => {
                    setShowArchived(false);
                    setActiveFilterTab("has_email");
                    toast.info("Filtered: Showing contacts with email");
                  }}
                  className={`cursor-pointer text-xs rounded-xl ${
                    activeFilterTab === "has_email" ? "bg-slate-100 dark:bg-slate-800 font-bold" : ""
                  }`}
                >
                  <span>Has Email</span>
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => {
                    setShowArchived(false);
                    setActiveFilterTab("has_phone");
                    toast.info("Filtered: Showing contacts with phone");
                  }}
                  className={`cursor-pointer text-xs rounded-xl ${
                    activeFilterTab === "has_phone" ? "bg-slate-100 dark:bg-slate-800 font-bold" : ""
                  }`}
                >
                  <span>Has Phone</span>
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => {
                    setShowArchived(false);
                    setActiveFilterTab("incomplete");
                    toast.info("Filtered: Showing incomplete contacts");
                  }}
                  className={`cursor-pointer text-xs rounded-xl text-rose-500 font-semibold ${
                    activeFilterTab === "incomplete" ? "bg-rose-50 dark:bg-rose-950/40 font-bold" : ""
                  }`}
                >
                  <span>Incomplete (Missing Email/Phone)</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Archived Toggle Button */}
            <Button
              type="button"
              variant={showArchived ? "default" : "outline"}
              size="sm"
              onClick={() => setShowArchived(!showArchived)}
              className={`rounded-xl text-xs gap-1.5 h-9 font-semibold transition-all cursor-pointer ${
                showArchived
                  ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm"
                  : "border-slate-200/80 dark:border-slate-800 hover:border-slate-400 text-slate-700 dark:text-slate-300"
              }`}
            >
              <Archive className="h-3.5 w-3.5" />
              <span>Archived</span>
              {archivedContacts.length > 0 && (
                <Badge
                  variant="secondary"
                  className={`ml-1 px-1.5 py-0 text-[10px] font-bold ${
                    showArchived ? "bg-white/20 text-white dark:bg-black/20 dark:text-slate-900" : ""
                  }`}
                >
                  {archivedContacts.length}
                </Badge>
              )}
            </Button>

            {/* Sort Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant={sortOrder !== "default" ? "secondary" : "outline"}
                  size="sm"
                  className="rounded-xl text-xs gap-1.5 h-9 font-semibold transition-all border-slate-200/80 dark:border-slate-800 cursor-pointer"
                >
                  <ArrowUpDown className="h-3.5 w-3.5" />
                  <span>{sortOrderLabels[sortOrder]}</span>
                  <ChevronDown className="h-3 w-3 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 rounded-2xl p-1.5 shadow-xl">
                <DropdownMenuItem
                  onClick={() => setSortOrder("default")}
                  className={`cursor-pointer text-xs rounded-xl ${sortOrder === "default" ? "font-bold bg-slate-100 dark:bg-slate-800" : ""}`}
                >
                  Default Order
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setSortOrder("desc")}
                  className={`cursor-pointer text-xs rounded-xl ${sortOrder === "desc" ? "font-bold bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400" : ""}`}
                >
                  Balance: High to Low (Owed)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setSortOrder("asc")}
                  className={`cursor-pointer text-xs rounded-xl ${sortOrder === "asc" ? "font-bold bg-slate-100 dark:bg-slate-800 text-rose-600 dark:text-rose-400" : ""}`}
                >
                  Balance: Low to High (You Owe)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setSortOrder("name_asc")}
                  className={`cursor-pointer text-xs rounded-xl ${sortOrder === "name_asc" ? "font-bold bg-slate-100 dark:bg-slate-800" : ""}`}
                >
                  Name: A → Z
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setSortOrder("name_desc")}
                  className={`cursor-pointer text-xs rounded-xl ${sortOrder === "name_desc" ? "font-bold bg-slate-100 dark:bg-slate-800" : ""}`}
                >
                  Name: Z → A
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Multi-Selection Control & Dropdown Options */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant={selectedIds.size > 0 || bulkSelectionMode ? "default" : "outline"}
                  size="sm"
                  className={`rounded-xl text-xs gap-1.5 h-9 font-semibold transition-all cursor-pointer ${
                    selectedIds.size > 0
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "border-slate-200/80 dark:border-slate-800 hover:border-slate-400 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <CheckSquare className="h-3.5 w-3.5" />
                  <span>{selectedIds.size > 0 ? `${selectedIds.size} Selected` : "Select"}</span>
                  <ChevronDown className="h-3 w-3 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-2xl p-1.5 shadow-xl">
                <DropdownMenuItem
                  onClick={handleSelectAllDisplayed}
                  className="cursor-pointer text-xs rounded-xl flex items-center justify-between"
                >
                  <span>Select All Visible</span>
                  <span className="text-[10px] text-slate-400 font-mono">({displayedContacts.length})</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleDeselectAll}
                  disabled={selectedIds.size === 0}
                  className="cursor-pointer text-xs rounded-xl flex items-center justify-between"
                >
                  <span>Deselect All</span>
                  <span className="text-[10px] text-slate-400 font-mono">Esc</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleInvertSelection}
                  className="cursor-pointer text-xs rounded-xl"
                >
                  <span>Invert Selection</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleSelectWithBalance}
                  className="cursor-pointer text-xs rounded-xl"
                >
                  <span>Select with Balances (≠ ₹0)</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleSelectSettled}
                  className="cursor-pointer text-xs rounded-xl"
                >
                  <span>Select Settled (₹0)</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Quick Filter Pills Row (matching default layout with contextual active pills) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 text-xs">
          <Button
            type="button"
            variant={activeFilterTab === "all" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveFilterTab("all")}
            className="rounded-xl text-[11px] h-7 px-3 font-semibold shrink-0 cursor-pointer"
          >
            <span>All Contacts</span>
            <Badge
              variant="secondary"
              className={`ml-1.5 px-1.5 py-0 text-[10px] font-bold ${
                activeFilterTab === "all" ? "bg-white/20 text-white dark:bg-black/20 dark:text-slate-900" : ""
              }`}
            >
              {totalContactsCount}
            </Badge>
          </Button>

          {/* Contextual Active Pill if Owed to You is selected */}
          {activeFilterTab === "owed_to_you" && (
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() => setActiveFilterTab("all")}
              className="rounded-xl text-[11px] h-7 px-3 font-semibold gap-1.5 shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer animate-in fade-in-50"
            >
              <TrendingUp className="h-3 w-3" />
              <span>Owed to You</span>
              {owedToYouCount > 0 && (
                <Badge variant="secondary" className="ml-0.5 px-1.5 py-0 text-[10px] font-bold bg-white/20 text-white">
                  {owedToYouCount}
                </Badge>
              )}
              <X className="h-3 w-3 ml-0.5 opacity-70" />
            </Button>
          )}

          {/* Contextual Active Pill if You Owe is selected */}
          {activeFilterTab === "you_owe" && (
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() => setActiveFilterTab("all")}
              className="rounded-xl text-[11px] h-7 px-3 font-semibold gap-1.5 shrink-0 bg-rose-600 hover:bg-rose-700 text-white shadow-xs cursor-pointer animate-in fade-in-50"
            >
              <TrendingDown className="h-3 w-3" />
              <span>You Owe</span>
              {youOweCount > 0 && (
                <Badge variant="secondary" className="ml-0.5 px-1.5 py-0 text-[10px] font-bold bg-white/20 text-white">
                  {youOweCount}
                </Badge>
              )}
              <X className="h-3 w-3 ml-0.5 opacity-70" />
            </Button>
          )}

          {/* Contextual Active Pill if With Transactions is selected */}
          {activeFilterTab === "with_transactions" && (
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() => setActiveFilterTab("all")}
              className="rounded-xl text-[11px] h-7 px-3 font-semibold gap-1.5 shrink-0 bg-blue-600 hover:bg-blue-700 text-white shadow-xs cursor-pointer animate-in fade-in-50"
            >
              <ArrowUpRight className="h-3 w-3" />
              <span>With Transactions</span>
              {withTransactionsCount > 0 && (
                <Badge variant="secondary" className="ml-0.5 px-1.5 py-0 text-[10px] font-bold bg-white/20 text-white">
                  {withTransactionsCount}
                </Badge>
              )}
              <X className="h-3 w-3 ml-0.5 opacity-70" />
            </Button>
          )}

          {/* Contextual Active Pill if Settled is selected */}
          {activeFilterTab === "settled" && (
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() => setActiveFilterTab("all")}
              className="rounded-xl text-[11px] h-7 px-3 font-semibold gap-1.5 shrink-0 bg-slate-700 hover:bg-slate-800 text-white shadow-xs cursor-pointer animate-in fade-in-50"
            >
              <CheckCircle2 className="h-3 w-3" />
              <span>Settled (₹0)</span>
              {settledCount > 0 && (
                <Badge variant="secondary" className="ml-0.5 px-1.5 py-0 text-[10px] font-bold bg-white/20 text-white">
                  {settledCount}
                </Badge>
              )}
              <X className="h-3 w-3 ml-0.5 opacity-70" />
            </Button>
          )}

          <Button
            type="button"
            variant={activeFilterTab === "favorites" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveFilterTab(activeFilterTab === "favorites" ? "all" : "favorites")}
            className="rounded-xl text-[11px] h-7 px-3 font-semibold gap-1 shrink-0 cursor-pointer"
          >
            <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
            <span>Favorites</span>
            {favoritesCount > 0 && (
              <Badge
                variant="secondary"
                className={`ml-0.5 px-1.5 py-0 text-[10px] font-bold ${
                  activeFilterTab === "favorites" ? "bg-white/20 text-white" : ""
                }`}
              >
                {favoritesCount}
              </Badge>
            )}
          </Button>

          <Button
            type="button"
            variant={activeFilterTab === "recently_added" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveFilterTab(activeFilterTab === "recently_added" ? "all" : "recently_added")}
            className="rounded-xl text-[11px] h-7 px-3 font-semibold shrink-0 cursor-pointer"
          >
            Recently Added
          </Button>

          <Button
            type="button"
            variant={activeFilterTab === "recently_updated" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveFilterTab(activeFilterTab === "recently_updated" ? "all" : "recently_updated")}
            className="rounded-xl text-[11px] h-7 px-3 font-semibold shrink-0 cursor-pointer"
          >
            Recently Updated
          </Button>

          <Button
            type="button"
            variant={activeFilterTab === "has_email" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveFilterTab(activeFilterTab === "has_email" ? "all" : "has_email")}
            className="rounded-xl text-[11px] h-7 px-3 font-semibold shrink-0 cursor-pointer"
          >
            Has Email
          </Button>

          <Button
            type="button"
            variant={activeFilterTab === "has_phone" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveFilterTab(activeFilterTab === "has_phone" ? "all" : "has_phone")}
            className="rounded-xl text-[11px] h-7 px-3 font-semibold shrink-0 cursor-pointer"
          >
            Has Phone
          </Button>

          <Button
            type="button"
            variant={activeFilterTab === "has_balance" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveFilterTab(activeFilterTab === "has_balance" ? "all" : "has_balance")}
            className="rounded-xl text-[11px] h-7 px-3 font-semibold shrink-0 cursor-pointer"
          >
            Has Balance
          </Button>

          <Button
            type="button"
            variant={activeFilterTab === "incomplete" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveFilterTab(activeFilterTab === "incomplete" ? "all" : "incomplete")}
            className="rounded-xl text-[11px] h-7 px-3 font-semibold text-rose-600 dark:text-rose-400 shrink-0 cursor-pointer"
          >
            Incomplete
          </Button>

          {/* Tags Dropdown Selector if tags exist */}
          {allUniqueTags.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={selectedTagFilter ? "secondary" : "outline"}
                  size="sm"
                  className="rounded-xl text-[11px] h-7 px-2.5 font-semibold gap-1 ml-auto shrink-0"
                >
                  <Tag className="h-3 w-3" />
                  <span>{selectedTagFilter ? `Tag: ${selectedTagFilter}` : "Filter by Tag"}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-2xl max-h-56 overflow-y-auto">
                <DropdownMenuItem onClick={() => setSelectedTagFilter(null)}>
                  All Tags
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {allUniqueTags.map((tag) => (
                  <DropdownMenuItem
                    key={tag}
                    onClick={() => setSelectedTagFilter(tag)}
                    className="cursor-pointer text-xs"
                  >
                    {tag}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Active Filter Status Bar */}
      {activeFilterTab !== "all" && (
        <div className="flex items-center justify-between px-4 py-2.5 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-xs animate-in fade-in-50">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-500 font-medium">Filtered by:</span>
            <Badge
              className={`font-bold px-2 py-0.5 rounded-lg ${
                activeFilterTab === "owed_to_you"
                  ? "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                  : activeFilterTab === "you_owe"
                  ? "bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800"
                  : "bg-primary/10 text-primary border border-primary/20"
              }`}
            >
              {getFilterLabel(activeFilterTab)}
            </Badge>
            <span className="text-slate-600 dark:text-slate-400 font-medium">
              Showing {displayedContacts.length} of {activeContacts.length} contacts
              {activeFilterTab === "owed_to_you" && ` • Total Receivables: ${formatCurrency(totalOwedToYou, "INR")}`}
              {activeFilterTab === "you_owe" && ` • Total Payables: ${formatCurrency(totalYouOwe, "INR")}`}
            </span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setActiveFilterTab("all")}
            className="text-xs h-6 px-2 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 font-semibold gap-1 cursor-pointer"
          >
            <span>Clear Filter</span>
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Desktop Sticky Bulk Action Bar */}
      {(selectedIds.size > 0 || bulkSelectionMode) && (
        <div className="hidden sm:flex sticky top-4 z-20 p-3.5 rounded-2xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xl border border-slate-700/60 dark:border-slate-300 sm:items-center justify-between gap-3 animate-in fade-in-50 slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleSelectAllDisplayed}
              className="text-xs font-bold gap-1.5 h-8 px-2 text-white dark:text-slate-900 hover:bg-white/10 cursor-pointer"
            >
              {selectedIds.size === displayedContacts.length && displayedContacts.length > 0 ? (
                <>
                  <CheckSquare className="h-4 w-4" />
                  <span>Deselect All</span>
                </>
              ) : (
                <>
                  <Square className="h-4 w-4" />
                  <span>Select All ({displayedContacts.length})</span>
                </>
              )}
            </Button>
            <Badge className="bg-white/20 text-white dark:bg-black/20 dark:text-slate-900 text-xs px-2 py-0.5">
              {selectedIds.size} Selected
            </Badge>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={selectedIds.size === 0 || isBulkPending}
              onClick={() => setIsExportDialogOpen(true)}
              className="rounded-xl text-xs h-8 gap-1 font-semibold cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export</span>
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={selectedIds.size === 0 || isBulkPending}
              onClick={handleBulkAddTag}
              className="rounded-xl text-xs h-8 gap-1 font-semibold cursor-pointer"
            >
              <Tag className="h-3.5 w-3.5" />
              <span>Add Tag</span>
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={selectedIds.size === 0 || isBulkPending}
              onClick={handleBulkUpdateCompany}
              className="rounded-xl text-xs h-8 gap-1 font-semibold cursor-pointer"
            >
              <Building2 className="h-3.5 w-3.5" />
              <span>Company</span>
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={selectedIds.size === 0 || isBulkPending}
              onClick={() => handleBulkArchive(!showArchived)}
              className="rounded-xl text-xs h-8 gap-1 font-semibold cursor-pointer"
            >
              <Archive className="h-3.5 w-3.5" />
              <span>{showArchived ? "Restore" : "Archive"}</span>
            </Button>

            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={selectedIds.size === 0 || isBulkPending}
              onClick={handleBulkDelete}
              className="rounded-xl text-xs h-8 gap-1 font-semibold cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete</span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleDeselectAll}
              className="rounded-xl text-xs h-8 text-white/80 dark:text-slate-600 hover:text-white cursor-pointer"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Mobile Floating Action Toolbar (Thumb zone) */}
      {(selectedIds.size > 0 || bulkSelectionMode) && (
        <div className="fixed bottom-4 left-3 right-3 sm:hidden z-40 p-3 rounded-2xl bg-slate-900/95 text-white dark:bg-slate-950/95 dark:text-slate-100 backdrop-blur-md border border-slate-700/60 shadow-2xl flex items-center justify-between gap-2 animate-in fade-in-50 slide-in-from-bottom-2">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleDeselectAll}
              className="h-8 w-8 p-0 rounded-xl text-white/80 hover:text-white"
            >
              <X className="h-4 w-4" />
            </Button>
            <Badge className="bg-white/20 text-white text-xs px-2 py-0.5">
              {selectedIds.size} Selected
            </Badge>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleSelectAllDisplayed}
              className="text-xs h-8 px-2 font-semibold text-white/90"
            >
              {selectedIds.size === displayedContacts.length && displayedContacts.length > 0 ? "None" : "All"}
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={selectedIds.size === 0 || isBulkPending}
              onClick={handleBulkDelete}
              className="h-8 px-3 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white gap-1"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete ({selectedIds.size})</span>
            </Button>
          </div>
        </div>
      )}

      {/* Test Notes Cleanup Banner */}
      {testNotesCount > 0 && (
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-in fade-in-50">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-600 shrink-0" />
            <span>
              Found <strong>{testNotesCount}</strong> contact(s) with spreadsheet test assertion notes from previous imports.
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled={isPurgingNotes}
            onClick={handlePurgeTestNotes}
            className="h-7 text-xs rounded-xl border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 text-amber-800 dark:text-amber-200 hover:bg-amber-100 font-semibold gap-1.5 shrink-0 self-start sm:self-auto"
          >
            {isPurgingNotes ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Sparkles className="h-3 w-3 text-amber-600" />
            )}
            <span>Clean Test Notes ({testNotesCount})</span>
          </Button>
        </div>
      )}

      {/* Contacts Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-5">
        {displayedContacts.map((contact) => {
          const isNetOwedToMe = contact.balance > 0;
          const isNetIOwe = contact.balance < 0;
          const isSelected = selectedIds.has(contact.id);

          const theyOweYouAmount = isNetOwedToMe ? contact.balance / 100 : 0;
          const youOweThemAmount = isNetIOwe ? Math.abs(contact.balance) / 100 : 0;
          const lastUpdatedDate = contact.updatedAt || contact.createdAt;

          return (
            <Link
              key={contact.id}
              href={`/dashboard/contacts/${contact.publicId}`}
              onClick={(e) => handleContactCardClick(e, contact)}
              onTouchStart={(e) => handleTouchStart(contact.id, e)}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className="block group focus:outline-none select-none"
            >
              <Card
                className={`rounded-3xl border bg-card p-5 space-y-4 shadow-xs relative overflow-hidden transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-xl group-hover:shadow-primary/5 cursor-pointer ${
                  isSelected
                    ? "border-primary/80 ring-2 ring-primary/30 bg-primary/[0.04]"
                    : "border-slate-200/80 dark:border-slate-800/90 hover:border-primary/40 dark:hover:border-primary/50"
                }`}
              >
                {/* 1. Avatar, Name & Status */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Bulk Selection Checkbox */}
                    <div
                      className={`cursor-pointer p-0.5 rounded-lg transition-all duration-200 ${
                        bulkSelectionMode || selectedIds.size > 0 || isSelected
                          ? "opacity-100 scale-100"
                          : "opacity-0 sm:group-hover:opacity-100 scale-95 sm:group-hover:scale-100"
                      }`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleSelectContact(contact.id);
                        setLastSelectedId(contact.id);
                        if (!bulkSelectionMode) setBulkSelectionMode(true);
                      }}
                    >
                      <Checkbox
                        checked={isSelected}
                        className="rounded-md h-4 w-4 border-slate-400 dark:border-slate-600 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                    </div>

                    {/* Avatar */}
                    <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-primary/20 via-primary/10 to-transparent border border-primary/25 flex items-center justify-center shrink-0 font-extrabold text-primary group-hover:scale-105 transition-transform shadow-xs">
                      <span className="text-base font-black">
                        {contact.name.charAt(0).toUpperCase()}
                      </span>
                    </div>

                    {/* Name */}
                    <div className="min-w-0">
                      <h4 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100 truncate group-hover:text-primary transition-colors tracking-tight">
                        {contact.name}
                      </h4>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-2.5 py-0.5 font-bold uppercase tracking-wider shrink-0 ${
                      isNetOwedToMe
                        ? "border-emerald-500/30 text-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/40"
                        : isNetIOwe
                        ? "border-rose-500/30 text-rose-600 bg-rose-50/50 dark:bg-rose-950/40"
                        : "border-slate-300 text-slate-500 bg-slate-100 dark:bg-slate-800"
                    }`}
                  >
                    {isNetOwedToMe ? "They Owe You" : isNetIOwe ? "You Owe" : "Settled"}
                  </Badge>
                </div>

                {/* 2. Current Balance */}
                <div
                  className={`p-3.5 rounded-2xl border transition-colors ${
                    isNetOwedToMe
                      ? "bg-emerald-500/[0.06] dark:bg-emerald-950/20 border-emerald-500/20 dark:border-emerald-900/40"
                      : isNetIOwe
                      ? "bg-rose-500/[0.06] dark:bg-rose-950/20 border-rose-500/20 dark:border-rose-900/40"
                      : "bg-slate-50/80 dark:bg-slate-900/60 border-slate-100 dark:border-slate-800/80"
                  }`}
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                    Current Balance
                  </span>
                  <div
                    className={`text-xl font-black font-mono tracking-tight ${
                      isNetOwedToMe
                        ? "text-emerald-600 dark:text-emerald-400"
                        : isNetIOwe
                        ? "text-rose-600 dark:text-rose-400"
                        : "text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {isNetOwedToMe ? "+" : isNetIOwe ? "-" : ""}
                    {formatCurrency(Math.abs(contact.balance) / 100, contact.currency)}
                  </div>
                </div>

                {/* 3. Split: They Owe You vs You Owe Them */}
                <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100 dark:border-slate-800/80">
                  <div>
                    <span className="text-[10px] text-slate-400 font-medium block">They Owe You</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                      {formatCurrency(theyOweYouAmount, contact.currency)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-medium block">You Owe Them</span>
                    <span className="font-mono font-bold text-rose-600 dark:text-rose-400 text-xs">
                      {formatCurrency(youOweThemAmount, contact.currency)}
                    </span>
                  </div>
                </div>

                {/* 4. Last Updated & Transaction Count */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span>Updated {formatDate(lastUpdatedDate)}</span>
                  <span className="font-semibold text-slate-600 dark:text-slate-300">
                    {contact.transactionCount || 0} transactions
                  </span>
                </div>
              </Card>
            </Link>
          );
        })}

        {/* Empty State: Initial Zero Contacts */}
        {totalContactsCount === 0 && !showArchived && (
          <Card className="col-span-full rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-card/60 p-12 text-center transition-all duration-300 hover:border-primary/40 hover:shadow-md">
            <CardContent className="p-0 flex flex-col items-center justify-center space-y-4">
              <div className="p-4 rounded-3xl bg-primary/10 text-primary w-16 h-16 flex items-center justify-center">
                <Contact className="h-8 w-8" />
              </div>
              <div className="space-y-1 max-w-md">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  No contacts yet
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Add contacts individually or import your existing list from Excel, CSV, Google Contacts, or vCard.
                </p>
              </div>
              <div className="flex items-center gap-3 flex-wrap justify-center pt-2">
                <ContactDialog
                  onSuccess={() => router.refresh()}
                  trigger={
                    <Button
                      size="lg"
                      className="rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all font-semibold gap-2 bg-primary text-primary-foreground"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add First Contact</span>
                    </Button>
                  }
                />
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => setIsImportWizardOpen(true)}
                  className="rounded-xl font-semibold gap-2"
                >
                  <UploadCloud className="h-4 w-4 text-primary" />
                  <span>Import Spreadsheet</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty State: Filter or Search No Match */}
        {totalContactsCount > 0 && displayedContacts.length === 0 && (
          <div className="col-span-full py-16 px-4 text-center space-y-3 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-card">
            <div className="p-3 bg-primary/10 rounded-full w-12 h-12 mx-auto flex items-center justify-center text-primary">
              <Search className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                No matching contacts found
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No contacts match your active filter criteria. Try clearing search or resetting tags.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSearchQuery("");
                setActiveFilterTab("all");
                setSelectedTagFilter(null);
              }}
              className="rounded-xl text-xs font-bold"
            >
              Clear All Filters
            </Button>
          </div>
        )}
      </div>

      {/* Contact Import Wizard Dialog */}
      <ContactImportWizardDialog
        open={isImportWizardOpen}
        onOpenChange={setIsImportWizardOpen}
        onSuccess={() => router.refresh()}
      />

      {/* Export Contacts Dialog */}
      <ContactExportDialog
        open={isExportDialogOpen}
        onOpenChange={setIsExportDialogOpen}
        allContacts={contactsList}
        filteredContacts={displayedContacts}
        selectedContacts={selectedContactsList}
      />

      {/* Duplicate Manager & Merge Dialog */}
      <DuplicateManagerDialog
        open={isDuplicateManagerOpen}
        onOpenChange={setIsDuplicateManagerOpen}
        onSuccess={() => router.refresh()}
      />

      {/* Import History & Rollback Dialog */}
      <ContactImportHistoryDialog
        open={isImportHistoryOpen}
        onOpenChange={setIsImportHistoryOpen}
      />

      {/* Edit Contact Dialog */}
      {editingContact && (
        <ContactDialog
          contact={editingContact}
          open={isEditDialogOpen}
          onOpenChange={(open) => {
            setIsEditDialogOpen(open);
            if (!open) setEditingContact(null);
          }}
          onSuccess={() => {
            setIsEditDialogOpen(false);
            setEditingContact(null);
            router.refresh();
          }}
        />
      )}

      {/* Bulk Delete Safety Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-slate-900 text-white border border-slate-800 shadow-2xl">
          <DialogHeader className="space-y-2">
            <div className="h-12 w-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mb-1">
              <Trash2 className="h-6 w-6" />
            </div>
            <DialogTitle className="text-xl font-black text-white">
              Delete {selectedSummary.count} Contact{selectedSummary.count === 1 ? "" : "s"}?
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs leading-relaxed">
              This will remove the selected contact profile{selectedSummary.count === 1 ? "" : "s"} from your contact workspace.
            </DialogDescription>
          </DialogHeader>

          {selectedSummary.countWithBalance > 0 && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-rose-200">
                <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
                <span>Outstanding Balance Warning</span>
              </div>
              <p className="text-[11px] leading-relaxed text-rose-200/90">
                {selectedSummary.countWithBalance} of the selected contacts have outstanding balances totaling{" "}
                <strong>{formatCurrency(selectedSummary.totalBalanceSum / 100, "INR")}</strong>.
                Historical transactions and ledger audits remain saved in reports, but active contact cards will be deleted.
              </p>
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsDeleteDialogOpen(false)}
              className="rounded-xl text-xs h-9 px-4 text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isBulkPending}
              onClick={handleConfirmBulkDelete}
              className="rounded-xl text-xs h-9 px-4 font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/20 cursor-pointer"
            >
              {isBulkPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  <span>Confirm Delete ({selectedSummary.count})</span>
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

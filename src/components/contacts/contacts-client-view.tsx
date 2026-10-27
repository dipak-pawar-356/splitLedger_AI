"use client";

import { useState, useMemo, useEffect } from "react";
import QRCode from "qrcode";
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
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Search,
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
  QrCode,
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
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { ContactDialog } from "@/components/dialogs/contact-dialog";
import { ContactImportWizardDialog } from "@/components/contacts/contact-import-wizard-dialog";
import { ContactImportHistoryDialog } from "@/components/contacts/contact-import-history-dialog";
import { DuplicateManagerDialog } from "@/components/contacts/duplicate-manager-dialog";
import { ContactExportDialog } from "@/components/contacts/contact-export-dialog";
import {
  generateContactCsvTemplate,
  generateContactXlsxTemplateBlob,
  generateContactVcfTemplate,
} from "@/lib/contacts/contact-parser";
import { archiveContact, deleteContact, updateContact } from "@/actions/contacts";
import { bulkUpdateContactsAction } from "@/actions/contact-import";
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

interface ContactsClientViewProps {
  initialContacts: ContactItem[];
}

export function ContactsClientView({ initialContacts }: ContactsClientViewProps) {
  const router = useRouter();
  const [contactsList, setContactsList] = useState<ContactItem[]>(initialContacts);
  const [searchQuery, setSearchQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [sortOrder, setSortOrder] = useState<"default" | "desc" | "asc" | "name_asc" | "name_desc">("default");

  // Filter state
  const [activeFilterTab, setActiveFilterTab] = useState<
    | "all"
    | "favorites"
    | "recently_added"
    | "recently_updated"
    | "has_email"
    | "has_phone"
    | "has_balance"
    | "incomplete"
  >("all");
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkSelectionMode, setBulkSelectionMode] = useState(false);
  const [isBulkPending, setIsBulkPending] = useState(false);

  // Modal dialog states
  const [isImportWizardOpen, setIsImportWizardOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isDuplicateManagerOpen, setIsDuplicateManagerOpen] = useState(false);
  const [isImportHistoryOpen, setIsImportHistoryOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<ContactItem | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [qrModalContact, setQrModalContact] = useState<ContactItem | null>(null);
  const [contactQrUrl, setContactQrUrl] = useState<string>("");
  const [isGeneratingContactQr, setIsGeneratingContactQr] = useState<boolean>(false);

  // QR Code generation
  useEffect(() => {
    if (qrModalContact?.publicId) {
      setIsGeneratingContactQr(true);
      const origin =
        typeof window !== "undefined" && window.location.origin
          ? window.location.origin
          : "https://splitledger.ai";
      const accessUrl = `${origin}/dashboard/contacts/${qrModalContact.publicId}`;
      QRCode.toDataURL(accessUrl, {
        width: 350,
        margin: 2,
        color: {
          dark: "#0f172a",
          light: "#ffffff",
        },
        errorCorrectionLevel: "H",
      })
        .then((url) => {
          setContactQrUrl(url);
          setIsGeneratingContactQr(false);
        })
        .catch((err) => {
          console.error("Contact QR generation error:", err);
          setIsGeneratingContactQr(false);
        });
    } else {
      setContactQrUrl("");
      setIsGeneratingContactQr(false);
    }
  }, [qrModalContact]);

  // Synchronize when initialContacts changes
  useEffect(() => {
    setContactsList(initialContacts);
  }, [initialContacts]);

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
    if (activeFilterTab === "favorites") {
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
    } else if (activeFilterTab === "has_balance") {
      result = result.filter((c) => (c.balance || 0) !== 0);
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
    if (selectedIds.size === displayedContacts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(displayedContacts.map((c) => c.id)));
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
    setContactsList((prev) => prev.filter((c) => c.id !== contact.id));
    try {
      await deleteContact(contact.id);
      toast.success(`${contact.name} deleted.`);
      router.refresh();
    } catch {
      setContactsList(initialContacts);
      toast.error("Failed to delete contact.");
    }
  };

  // Bulk Operations
  const handleBulkDelete = async () => {
    const count = selectedIds.size;
    if (!confirm(`Are you sure you want to delete ${count} contact(s)?`)) return;
    setIsBulkPending(true);
    try {
      await bulkUpdateContactsAction(Array.from(selectedIds), { type: "delete" });
      toast.success(`Deleted ${count} contact(s).`);
      setSelectedIds(new Set());
      router.refresh();
    } catch (err) {
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

      {/* 4 Stat Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Contacts Card */}
        <Card
          onClick={() => {
            setShowArchived(false);
            setActiveFilterTab("all");
            setSelectedTagFilter(null);
            setSearchQuery("");
          }}
          className={`rounded-3xl border p-4 sm:p-5 shadow-xs cursor-pointer relative overflow-hidden transition-all duration-300 group hover:-translate-y-1 hover:shadow-lg ${
            !showArchived && activeFilterTab === "all"
              ? "bg-gradient-to-br from-primary/10 via-card to-background border-primary/50 shadow-primary/10 ring-2 ring-primary/20"
              : "bg-card border-slate-200/80 dark:border-slate-800/90 hover:border-primary/40"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-bold uppercase tracking-wider text-[10px] text-slate-500 dark:text-slate-400">
              Total Contacts
            </span>
            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-300">
              <Contact className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 mt-2 tracking-tight group-hover:text-primary transition-colors">
            {totalContactsCount}
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 font-medium">
            Active network connections
          </p>
        </Card>

        {/* Total Owed to You Card */}
        <Card
          className="rounded-3xl border p-4 sm:p-5 shadow-xs relative overflow-hidden transition-all duration-300 group hover:-translate-y-1 hover:shadow-lg bg-card border-slate-200/80 dark:border-slate-800/90 hover:border-emerald-400 dark:hover:border-emerald-500/60 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 hover:shadow-emerald-500/10 cursor-pointer"
          onClick={() => {
            setSortOrder("desc");
            toast.info("Showing contacts who owe you the most");
          }}
        >
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-bold uppercase tracking-wider text-[10px] text-emerald-600 dark:text-emerald-400">
              Total Owed to You
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-2 tracking-tight">
            {formatCurrency(totalOwedToYou, "INR")}
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 font-medium">
            Net receivables from contacts
          </p>
        </Card>

        {/* Total You Owe Card */}
        <Card
          className="rounded-3xl border p-4 sm:p-5 shadow-xs relative overflow-hidden transition-all duration-300 group hover:-translate-y-1 hover:shadow-lg bg-card border-slate-200/80 dark:border-slate-800/90 hover:border-rose-400 dark:hover:border-rose-500/60 hover:bg-rose-50/30 dark:hover:bg-rose-950/20 hover:shadow-rose-500/10 cursor-pointer"
          onClick={() => {
            setSortOrder("asc");
            toast.info("Showing contacts you owe the most");
          }}
        >
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-bold uppercase tracking-wider text-[10px] text-rose-600 dark:text-rose-400">
              Total You Owe
            </span>
            <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 group-hover:scale-110 group-hover:bg-rose-600 group-hover:text-white transition-all duration-300">
              <TrendingDown className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400 mt-2 tracking-tight">
            {formatCurrency(totalYouOwe, "INR")}
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 font-medium">
            Net payables to contacts
          </p>
        </Card>

        {/* Total Transactions Card */}
        <Card className="rounded-3xl border p-4 sm:p-5 shadow-xs relative overflow-hidden transition-all duration-300 group hover:-translate-y-1 hover:shadow-lg bg-card border-slate-200/80 dark:border-slate-800/90 hover:border-blue-400 dark:hover:border-blue-500/60 hover:bg-blue-50/30 dark:hover:bg-blue-950/20 hover:shadow-blue-500/10 cursor-pointer">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-bold uppercase tracking-wider text-[10px] text-blue-600 dark:text-blue-400">
              Total Transactions
            </span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 mt-2 tracking-tight group-hover:text-blue-600 transition-colors">
            {totalTransactionsCount}
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 font-medium">
            Lifetime entries recorded
          </p>
        </Card>
      </div>

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
            {/* Archived Toggle Button */}
            <Button
              type="button"
              variant={showArchived ? "default" : "outline"}
              size="sm"
              onClick={() => setShowArchived(!showArchived)}
              className={`rounded-xl text-xs gap-1.5 h-9 font-semibold transition-all ${
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

            {/* Sort Toggle */}
            <Button
              type="button"
              variant={sortOrder !== "default" ? "secondary" : "outline"}
              size="sm"
              onClick={() => {
                if (sortOrder === "default") setSortOrder("desc");
                else if (sortOrder === "desc") setSortOrder("asc");
                else if (sortOrder === "asc") setSortOrder("name_asc");
                else if (sortOrder === "name_asc") setSortOrder("name_desc");
                else setSortOrder("default");
              }}
              className="rounded-xl text-xs gap-1.5 h-9 font-semibold transition-all border-slate-200/80 dark:border-slate-800"
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
              <span>
                {sortOrder === "desc"
                  ? "Balance: High to Low"
                  : sortOrder === "asc"
                  ? "Balance: Low to High"
                  : sortOrder === "name_asc"
                  ? "Name: A → Z"
                  : sortOrder === "name_desc"
                  ? "Name: Z → A"
                  : "Sort"}
              </span>
            </Button>
          </div>
        </div>

        {/* Quick Filter Pills Row */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 text-xs">
          <Button
            type="button"
            variant={activeFilterTab === "all" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveFilterTab("all")}
            className="rounded-xl text-[11px] h-7 px-3 font-semibold"
          >
            All Contacts
          </Button>

          <Button
            type="button"
            variant={activeFilterTab === "favorites" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveFilterTab("favorites")}
            className="rounded-xl text-[11px] h-7 px-3 font-semibold gap-1"
          >
            <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
            <span>Favorites</span>
          </Button>

          <Button
            type="button"
            variant={activeFilterTab === "recently_added" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveFilterTab("recently_added")}
            className="rounded-xl text-[11px] h-7 px-3 font-semibold"
          >
            Recently Added
          </Button>

          <Button
            type="button"
            variant={activeFilterTab === "recently_updated" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveFilterTab("recently_updated")}
            className="rounded-xl text-[11px] h-7 px-3 font-semibold"
          >
            Recently Updated
          </Button>

          <Button
            type="button"
            variant={activeFilterTab === "has_email" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveFilterTab("has_email")}
            className="rounded-xl text-[11px] h-7 px-3 font-semibold"
          >
            Has Email
          </Button>

          <Button
            type="button"
            variant={activeFilterTab === "has_phone" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveFilterTab("has_phone")}
            className="rounded-xl text-[11px] h-7 px-3 font-semibold"
          >
            Has Phone
          </Button>

          <Button
            type="button"
            variant={activeFilterTab === "has_balance" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveFilterTab("has_balance")}
            className="rounded-xl text-[11px] h-7 px-3 font-semibold"
          >
            Has Balance
          </Button>

          <Button
            type="button"
            variant={activeFilterTab === "incomplete" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveFilterTab("incomplete")}
            className="rounded-xl text-[11px] h-7 px-3 font-semibold text-rose-600 dark:text-rose-400"
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

      {/* Sticky Bulk Action Bar (when contacts are selected or bulk mode is on) */}
      {(selectedIds.size > 0 || bulkSelectionMode) && (
        <div className="sticky top-4 z-20 p-3.5 rounded-2xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xl border border-slate-700/60 dark:border-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in-50 slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleSelectAllDisplayed}
              className="text-xs font-bold gap-1.5 h-8 px-2 text-white dark:text-slate-900 hover:bg-white/10"
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
              className="rounded-xl text-xs h-8 gap-1 font-semibold"
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
              className="rounded-xl text-xs h-8 gap-1 font-semibold"
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
              className="rounded-xl text-xs h-8 gap-1 font-semibold"
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
              className="rounded-xl text-xs h-8 gap-1 font-semibold"
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
              className="rounded-xl text-xs h-8 gap-1 font-semibold"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete</span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedIds(new Set());
                setBulkSelectionMode(false);
              }}
              className="rounded-xl text-xs h-8 text-white/80 dark:text-slate-600 hover:text-white"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Contacts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {displayedContacts.map((contact) => {
          const isNetOwedToMe = contact.balance > 0;
          const isNetIOwe = contact.balance < 0;
          const isSelected = selectedIds.has(contact.id);

          return (
            <Card
              key={contact.id}
              className={`rounded-3xl border bg-card p-5 space-y-3.5 shadow-xs relative overflow-hidden transition-all duration-300 group hover:-translate-y-1 hover:shadow-lg ${
                isSelected
                  ? "border-primary/60 ring-2 ring-primary/20 bg-primary/[0.02]"
                  : "border-slate-200/80 dark:border-slate-800/90 hover:border-primary/40 dark:hover:border-primary/50"
              }`}
            >
              {/* Card Top Row: Checkbox, Avatar, Name & Actions */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3 min-w-0">
                  {/* Selection Checkbox */}
                  <div
                    className="pt-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelectContact(contact.id);
                    }}
                  >
                    <Checkbox
                      checked={isSelected}
                      className="rounded-md h-4 w-4"
                    />
                  </div>

                  {/* Avatar Initial */}
                  <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0 border border-primary/20 group-hover:scale-105 group-hover:shadow-sm transition-transform duration-300">
                    <span className="text-base font-bold text-primary">
                      {contact.name.charAt(0).toUpperCase()}
                    </span>
                  </div>

                  {/* Name and Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-primary transition-colors">
                        {contact.name}
                      </h2>
                      {/* Favorite Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleFavorite(contact);
                        }}
                        className="text-slate-300 hover:text-amber-500 transition-colors p-0.5"
                        title={contact.isFavorite ? "Remove favorite" : "Mark favorite"}
                      >
                        <Star
                          className={`h-3.5 w-3.5 ${
                            contact.isFavorite
                              ? "text-amber-500 fill-amber-500"
                              : "text-slate-300 dark:text-slate-600"
                          }`}
                        />
                      </button>
                      {contact.isArchived && (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 uppercase text-slate-400 shrink-0">
                          Archived
                        </Badge>
                      )}
                    </div>

                    {/* Company and Address if present */}
                    {contact.company && (
                      <div className="flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-300 font-medium truncate mt-0.5">
                        <Building2 className="h-3 w-3 text-slate-400 shrink-0" />
                        <span className="truncate">{contact.company}</span>
                      </div>
                    )}

                    {/* Public ID Pill */}
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md font-semibold tracking-wide">
                        {contact.publicId}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(contact.publicId);
                          toast.success(`Copied: ${contact.publicId}`);
                        }}
                        title="Copy Public ID"
                        className="text-slate-400 hover:text-primary transition-colors p-0.5"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>

                    {/* Email and Phone */}
                    <div className="flex flex-col gap-0.5 mt-1">
                      {contact.email && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 truncate">
                          <Mail className="h-3 w-3 shrink-0" />
                          <span className="truncate">{contact.email}</span>
                        </div>
                      )}
                      {contact.phone && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                          <Phone className="h-3 w-3 shrink-0" />
                          <span>{contact.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* More Options Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 rounded-2xl">
                    <DropdownMenuItem asChild>
                      <Link
                        href={`/dashboard/contacts/${contact.publicId}`}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <ArrowUpRight className="h-4 w-4 text-primary" />
                        <span>View Ledger</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setQrModalContact(contact)}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <QrCode className="h-4 w-4 text-emerald-600" />
                      <span>Digital Pass & QR</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleEditClick(contact)}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Edit2 className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                      <span>Edit Contact</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleToggleArchive(contact)}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      {contact.isArchived ? (
                        <>
                          <RotateCcw className="h-4 w-4 text-emerald-600" />
                          <span>Restore Contact</span>
                        </>
                      ) : (
                        <>
                          <Archive className="h-4 w-4 text-amber-600" />
                          <span>Archive Contact</span>
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleDelete(contact)}
                      className="flex items-center gap-2 text-rose-600 dark:text-rose-400 cursor-pointer focus:bg-rose-50 dark:focus:bg-rose-950/40"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Delete Contact</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Tags Display */}
              {Array.isArray(contact.tags) && contact.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {contact.tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      onClick={() => setSelectedTagFilter(tag)}
                      className="text-[10px] px-2 py-0.5 rounded-lg cursor-pointer hover:bg-primary/20 hover:text-primary transition-colors"
                    >
                      #{tag}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Balance Container */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-100 dark:border-slate-800/90 group-hover:border-slate-200 dark:group-hover:border-slate-700/60 transition-colors space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">Net Balance</span>
                  <span
                    className={`font-black font-mono text-sm ${
                      isNetOwedToMe
                        ? "text-emerald-600 dark:text-emerald-400"
                        : isNetIOwe
                        ? "text-rose-600 dark:text-rose-400"
                        : "text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {isNetOwedToMe ? "+" : ""}
                    {formatCurrency((contact.balance || 0) / 100, contact.currency)}
                  </span>
                </div>

                <div className="flex justify-between items-center text-[11px] text-slate-500 pt-1 border-t border-slate-200/50 dark:border-slate-800/50">
                  <span>Transactions</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {contact.transactionCount || 0}
                  </span>
                </div>

                <div className="flex justify-between items-center text-[11px] text-slate-500">
                  <span>Currency</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {contact.currency}
                  </span>
                </div>
              </div>

              {contact.notes && (
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 px-1">
                  {contact.notes}
                </p>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/90">
                <Link href={`/dashboard/contacts/${contact.publicId}`} className="flex-1 min-w-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full rounded-xl text-xs h-8 gap-1 font-semibold hover:border-primary/50 hover:text-primary transition-all truncate"
                  >
                    <ArrowUpRight className="h-3.5 w-3.5 shrink-0" />
                    <span>Ledger</span>
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEditClick(contact)}
                  className="rounded-xl text-xs h-8 gap-1 font-semibold hover:border-primary/50 hover:text-primary transition-all shrink-0"
                >
                  <Edit2 className="h-3 w-3" />
                  <span>Edit</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQrModalContact(contact)}
                  className="rounded-xl text-xs h-8 px-2.5 font-semibold hover:border-emerald-500/50 hover:text-emerald-600 transition-all shrink-0"
                  title="View Digital Pass & QR"
                >
                  <QrCode className="h-3.5 w-3.5" />
                </Button>
              </div>
            </Card>
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

      {/* Digital Pass & QR Modal */}
      <Dialog open={!!qrModalContact} onOpenChange={(open) => !open && setQrModalContact(null)}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-card border border-slate-200/80 dark:border-slate-800 text-center">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center justify-center gap-1.5">
              <QrCode className="h-4 w-4 text-primary" />
              <span>Contact Pass & QR Code</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {qrModalContact?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 flex flex-col items-center space-y-4">
            <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-md flex items-center justify-center min-h-[200px] min-w-[200px]">
              {isGeneratingContactQr ? (
                <div className="h-48 w-48 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="text-xs text-slate-500 font-semibold">Generating Pass...</span>
                </div>
              ) : contactQrUrl ? (
                <img
                  src={contactQrUrl}
                  alt={`Real QR code for ${qrModalContact?.name}`}
                  className="h-48 w-48 object-contain rounded-xl"
                />
              ) : (
                <div className="h-48 w-48 flex items-center justify-center text-slate-400 text-xs">
                  Generating QR...
                </div>
              )}
            </div>

            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Permanent Public Identifier
              </span>
              <p className="font-mono text-base font-black text-slate-900 dark:text-slate-100 tracking-wider">
                {qrModalContact?.publicId}
              </p>
              <p className="text-xs text-slate-500">
                {qrModalContact?.email || qrModalContact?.phone || "Personal Connection"} • {qrModalContact?.currency} Ledger
              </p>
            </div>

            <div className="flex items-center gap-2 w-full pt-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 rounded-xl text-xs font-bold gap-1.5"
                onClick={() => {
                  if (qrModalContact) {
                    navigator.clipboard.writeText(qrModalContact.publicId);
                    toast.success("Contact ID copied!");
                  }
                }}
              >
                <Copy className="h-3.5 w-3.5" />
                <span>Copy ID</span>
              </Button>
              <Button
                size="sm"
                className="flex-1 rounded-xl text-xs font-bold gap-1.5 bg-primary text-primary-foreground"
                onClick={() => {
                  if (qrModalContact) {
                    const origin =
                      typeof window !== "undefined" && window.location.origin
                        ? window.location.origin
                        : "https://splitledger.ai";
                    navigator.clipboard.writeText(
                      `${origin}/dashboard/contacts/${qrModalContact.publicId}`
                    );
                    toast.success("Contact link copied!");
                  }
                }}
              >
                <Share2 className="h-3.5 w-3.5" />
                <span>Copy Link</span>
              </Button>
              {contactQrUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl text-xs font-bold gap-1.5 shrink-0"
                  onClick={() => {
                    const a = document.createElement("a");
                    a.href = contactQrUrl;
                    a.download = `${qrModalContact?.publicId || "contact"}-qr.png`;
                    a.click();
                    toast.success("Downloaded Contact QR image");
                  }}
                  title="Download Contact QR PNG"
                >
                  <Download className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

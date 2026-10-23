"use client";

import { useState, useMemo, useEffect } from "react";
import QRCode from "qrcode";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { ContactDialog } from "@/components/dialogs/contact-dialog";
import { archiveContact, deleteContact } from "@/actions/contacts";
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
  isArchived: boolean | null;
  balance: number;
  transactionCount: number;
}

interface ContactsClientViewProps {
  initialContacts: ContactItem[];
}

export function ContactsClientView({ initialContacts }: ContactsClientViewProps) {
  const router = useRouter();
  const [contactsList, setContactsList] = useState<ContactItem[]>(initialContacts);
  const [searchQuery, setSearchQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [sortOrder, setSortOrder] = useState<"default" | "desc" | "asc">("default");
  const [editingContact, setEditingContact] = useState<ContactItem | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [qrModalContact, setQrModalContact] = useState<ContactItem | null>(null);
  const [contactQrUrl, setContactQrUrl] = useState<string>("");
  const [isGeneratingContactQr, setIsGeneratingContactQr] = useState<boolean>(false);

  // Real scannable QR Code generation for selected contact
  useEffect(() => {
    if (qrModalContact?.publicId) {
      setIsGeneratingContactQr(true);
      const origin = typeof window !== "undefined" && window.location.origin ? window.location.origin : "https://splitledger.ai";
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

  // Synchronize when initialContacts changes (e.g. from server actions / refresh)
  useMemo(() => {
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

  // Filtered contacts based on search & archive filter
  const displayedContacts = useMemo(() => {
    let result = showArchived ? archivedContacts : activeContacts;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.email && c.email.toLowerCase().includes(q)) ||
          (c.phone && c.phone.toLowerCase().includes(q))
      );
    }

    if (sortOrder === "desc") {
      result = [...result].sort((a, b) => (b.balance || 0) - (a.balance || 0));
    } else if (sortOrder === "asc") {
      result = [...result].sort((a, b) => (a.balance || 0) - (b.balance || 0));
    }

    return result;
  }, [activeContacts, archivedContacts, showArchived, searchQuery, sortOrder]);

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

  const handleToggleArchive = async (contact: ContactItem) => {
    const willArchive = !contact.isArchived;
    // Optimistic UI update
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
      // Revert optimistic update
      setContactsList((prev) =>
        prev.map((c) => (c.id === contact.id ? { ...c, isArchived: !willArchive } : c))
      );
      toast.error("Failed to update archive status.");
    }
  };

  const handleDelete = async (contact: ContactItem) => {
    if (!confirm(`Are you sure you want to delete ${contact.name}?`)) return;
    // Optimistic remove
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

  const handleEditClick = (contact: ContactItem) => {
    setEditingContact(contact);
    setIsEditDialogOpen(true);
  };

  const cycleSortOrder = () => {
    if (sortOrder === "default") {
      setSortOrder("desc");
      toast.info("Sorted by balance: Highest to lowest");
    } else if (sortOrder === "desc") {
      setSortOrder("asc");
      toast.info("Sorted by balance: Lowest to highest");
    } else {
      setSortOrder("default");
      toast.info("Reset sorting to default");
    }
  };

  return (
    <div className="space-y-6 pb-12">
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
            Manage your contacts, track split balances, and view transaction ledgers
          </p>
        </div>

        <ContactDialog
          onSuccess={() => router.refresh()}
          trigger={
            <Button className="rounded-xl shadow-xs font-semibold gap-1.5 bg-primary text-primary-foreground hover:shadow-md hover:-translate-y-0.5 transition-all">
              <Plus className="h-4 w-4" />
              <span>Add Contact</span>
            </Button>
          }
        />
      </div>

      {/* 4 Stat Overview Cards with Interactive Theme-Adapted Hover Effects */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Contacts Card */}
        <Card
          onClick={() => {
            setShowArchived(false);
            setSearchQuery("");
          }}
          className={`rounded-3xl border p-4 sm:p-5 shadow-xs cursor-pointer relative overflow-hidden transition-all duration-300 group hover:-translate-y-1 hover:shadow-lg ${
            !showArchived
              ? "bg-gradient-to-br from-primary/10 via-card to-background border-primary/50 shadow-primary/10 ring-2 ring-primary/20"
              : "bg-card border-slate-200/80 dark:border-slate-800/90 hover:border-primary/40 dark:hover:border-primary/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 hover:shadow-primary/5"
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
      <div className="p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-card shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 group">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
            <Input
              type="text"
              placeholder="Search contacts by name, email, or phone..."
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

            {/* Sort by Balance Button */}
            <Button
              type="button"
              variant={sortOrder !== "default" ? "secondary" : "outline"}
              size="sm"
              onClick={cycleSortOrder}
              className={`rounded-xl text-xs gap-1.5 h-9 font-semibold transition-all border-slate-200/80 dark:border-slate-800 ${
                sortOrder === "desc"
                  ? "text-emerald-600 dark:text-emerald-400 border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-950/30"
                  : sortOrder === "asc"
                  ? "text-rose-600 dark:text-rose-400 border-rose-500/40 bg-rose-50/50 dark:bg-rose-950/30"
                  : "hover:border-slate-400 text-slate-700 dark:text-slate-300"
              }`}
            >
              {sortOrder === "desc" ? (
                <TrendingUp className="h-3.5 w-3.5" />
              ) : sortOrder === "asc" ? (
                <TrendingDown className="h-3.5 w-3.5" />
              ) : (
                <ArrowUpDown className="h-3.5 w-3.5" />
              )}
              <span>
                {sortOrder === "desc"
                  ? "Balance: High to Low"
                  : sortOrder === "asc"
                  ? "Balance: Low to High"
                  : "Sort by Balance"}
              </span>
            </Button>
          </div>
        </div>
      </div>

      {/* Contacts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {displayedContacts.map((contact) => {
          const isNetOwedToMe = contact.balance > 0;
          const isNetIOwe = contact.balance < 0;

          return (
            <Card
              key={contact.id}
              className="rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-card p-5 space-y-3.5 shadow-xs relative overflow-hidden transition-all duration-300 group hover:-translate-y-1 hover:shadow-lg hover:border-primary/40 dark:hover:border-primary/50 hover:bg-slate-50/40 dark:hover:bg-slate-900/30"
            >
              {/* Card Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0 border border-primary/20 group-hover:scale-105 group-hover:shadow-sm transition-transform duration-300">
                    <span className="text-base font-bold text-primary">
                      {contact.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-primary transition-colors">
                        {contact.name}
                      </h2>
                      {contact.isArchived && (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 uppercase text-slate-400 shrink-0">
                          Archived
                        </Badge>
                      )}
                    </div>
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

                {/* More Options Dropdown Menu */}
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

              {/* Balance & Financial Details Container */}
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
                  No contacts yet. Add your first contact to start tracking shared expenses.
                </p>
              </div>
              <ContactDialog
                onSuccess={() => router.refresh()}
                trigger={
                  <Button
                    size="lg"
                    className="rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all font-semibold gap-2 bg-primary text-primary-foreground"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Your First Contact</span>
                  </Button>
                }
              />
            </CardContent>
          </Card>
        )}

        {/* Empty State: Zero Archived Contacts */}
        {showArchived && displayedContacts.length === 0 && (
          <div className="col-span-full py-16 px-4 text-center space-y-3 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-card">
            <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full w-12 h-12 mx-auto flex items-center justify-center text-slate-500">
              <Archive className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                No Archived Contacts
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Contacts you archive will appear here safely out of your main ledger list.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowArchived(false)}
              className="rounded-xl text-xs font-bold"
            >
              Back to Active Contacts
            </Button>
          </div>
        )}

        {/* Empty State: Search Query No Match */}
        {!showArchived && totalContactsCount > 0 && displayedContacts.length === 0 && (
          <div className="col-span-full py-16 px-4 text-center space-y-3 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-card">
            <div className="p-3 bg-primary/10 rounded-full w-12 h-12 mx-auto flex items-center justify-center text-primary">
              <Search className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                No Contacts Matching &ldquo;{searchQuery}&rdquo;
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Check for typos or try searching by phone number or email address.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSearchQuery("")}
              className="rounded-xl text-xs font-bold"
            >
              Clear Search
            </Button>
          </div>
        )}
      </div>

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

      {/* Contact Digital Pass & QR Modal */}
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
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Permanent Public Identifier</span>
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
                    const origin = typeof window !== "undefined" && window.location.origin ? window.location.origin : "https://splitledger.ai";
                    navigator.clipboard.writeText(`${origin}/dashboard/contacts/${qrModalContact.publicId}`);
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

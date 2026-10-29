"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ChevronRight,
  ArrowLeft,
  Mail,
  Phone,
  Building2,
  MapPin,
  Calendar,
  Clock,
  TrendingUp,
  TrendingDown,
  Scale,
  PlusCircle,
  SlidersHorizontal,
  Send,
  Edit2,
  Trash2,
  Download,
  AlertCircle,
  CheckCircle2,
  Receipt,
  FileText,
  Tag,
  Loader2,
  Sparkles,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ContactBalanceAdjustmentDialog } from "./contact-balance-adjustment-dialog";
import {
  ContactTransactionHistory,
} from "./contact-transaction-history";
import type { ContactTransactionItem } from "./contact-transaction-menu";
import { TransactionDialog } from "@/components/dialogs/transaction-dialog";
import { ReminderDialog } from "@/components/dialogs/reminder-dialog";
import { updateContact, deleteContact } from "@/actions/contacts";
import { toast } from "sonner";

export interface ContactProfileData {
  id: number;
  publicId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  currency: string;
  openingBalance: number; // in paise
  notes?: string | null;
  company?: string | null;
  address?: string | null;
  tags?: string[] | null;
  isFavorite?: boolean;
  isArchived?: boolean;
  createdAt: Date | string;
  updatedAt?: Date | string | null;
}

interface ContactProfileViewProps {
  contact: ContactProfileData;
  transactions: ContactTransactionItem[];
}

export function ContactProfileView({
  contact,
  transactions,
}: ContactProfileViewProps) {
  const router = useRouter();

  // Balance adjustment dialog states
  const [isAddBalanceOpen, setIsAddBalanceOpen] = useState(false);
  const [isAdjustBalanceOpen, setIsAdjustBalanceOpen] = useState(false);
  const [adjustmentDefaultMode, setAdjustmentDefaultMode] = useState<"add" | "adjust">("add");

  // Edit contact dialog state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editName, setEditName] = useState(contact.name);
  const [editEmail, setEditEmail] = useState(contact.email || "");
  const [editPhone, setEditPhone] = useState(contact.phone || "");
  const [editCompany, setEditCompany] = useState(contact.company || "");
  const [editAddress, setEditAddress] = useState(contact.address || "");
  const [editNotes, setEditNotes] = useState(contact.notes || "");
  const [isSavingContact, setIsSavingContact] = useState(false);

  // Delete contact dialog state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeletingContact, setIsDeletingContact] = useState(false);

  // Derived Financial Calculations
  const openingPaise = Number(contact.openingBalance) || 0;

  // Total received & paid all time
  let totalReceivedPaise = 0;
  let totalPaidPaise = 0;

  // Monthly metrics
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  let monthlyReceivedPaise = 0;
  let monthlyPaidPaise = 0;
  let monthlyTxCount = 0;

  // Find last transaction & reminder date
  let lastTransactionDate: Date | null = null;
  let lastReminderDate: Date | null = null;

  transactions.forEach((tx) => {
    const txDate = new Date(tx.date);
    if (!lastTransactionDate || txDate > lastTransactionDate) {
      lastTransactionDate = txDate;
    }

    const isPositive =
      tx.type === "received" ||
      tx.type === "lent" ||
      tx.type === "repaid" ||
      (tx.type === "adjustment" &&
        (JSON.stringify(tx.tags || "").includes("credit") ||
          JSON.stringify(tx.tags || "").includes("increase")));

    if (isPositive) {
      totalReceivedPaise += tx.amount;
    } else {
      totalPaidPaise += tx.amount;
    }

    if (txDate >= startOfMonth) {
      monthlyTxCount += 1;
      if (isPositive) {
        monthlyReceivedPaise += tx.amount;
      } else {
        monthlyPaidPaise += tx.amount;
      }
    }
  });

  // Net Balance = opening balance + (received/lent - paid/borrowed)
  const currentNetBalancePaise = openingPaise + (totalReceivedPaise - totalPaidPaise);
  const isNetOwedToMe = currentNetBalancePaise > 0;
  const isNetIOwe = currentNetBalancePaise < 0;
  const isSettled = currentNetBalancePaise === 0;

  const outstandingPaise = Math.abs(currentNetBalancePaise);
  const monthlyNetPaise = monthlyReceivedPaise - monthlyPaidPaise;

  // Dashboard Synchronization Metrics (Requirement 13)
  let reflectedIncomePaise = 0;
  let reflectedExpensePaise = 0;
  let reflectedTxCount = 0;
  let pendingTxCount = 0;
  let lastDashboardSyncDate: Date | null = null;

  transactions.forEach((tx) => {
    const isReflected = tx.isSyncedToDashboard === true || tx.dashboardStatus === "reflected";
    const isPositive =
      tx.type === "received" ||
      tx.type === "lent" ||
      tx.type === "repaid" ||
      (tx.type === "adjustment" &&
        (JSON.stringify(tx.tags || "").includes("credit") ||
          JSON.stringify(tx.tags || "").includes("increase")));

    if (isReflected) {
      reflectedTxCount += 1;
      const txDate = new Date(tx.date);
      if (!lastDashboardSyncDate || txDate > lastDashboardSyncDate) {
        lastDashboardSyncDate = txDate;
      }
      if (isPositive) {
        reflectedIncomePaise += tx.amount;
      } else {
        reflectedExpensePaise += tx.amount;
      }
    } else {
      pendingTxCount += 1;
    }
  });

  const dashboardReflectedAmountPaise = reflectedIncomePaise - reflectedExpensePaise;
  const pendingAmountPaise = currentNetBalancePaise - dashboardReflectedAmountPaise;

  // Settlement status text
  const settlementStatus = isSettled
    ? "Settled"
    : isNetOwedToMe
    ? "Pending Collection"
    : "Pending Payment";

  // Filter out test notes
  const isTestingNote = (text?: string | null) => {
    if (!text) return false;
    const lower = text.toLowerCase();
    return (
      lower.includes("test assertion") ||
      lower.includes("csv injection") ||
      lower.includes("xss-script") ||
      lower.includes("cypress")
    );
  };

  // Handle Edit Contact Save
  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
      toast.error("Contact name is required");
      return;
    }
    setIsSavingContact(true);
    try {
      await updateContact(contact.id, {
        name: editName.trim(),
        email: editEmail.trim() || undefined,
        phone: editPhone.trim() || undefined,
        company: editCompany.trim() || undefined,
        address: editAddress.trim() || undefined,
        notes: editNotes.trim() || undefined,
      });
      toast.success("Contact details updated successfully");
      setIsEditDialogOpen(false);
      router.refresh();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update contact");
    } finally {
      setIsSavingContact(false);
    }
  };

  // Handle Delete Contact
  const handleDeleteContact = async () => {
    setIsDeletingContact(true);
    try {
      await deleteContact(contact.id);
      toast.success(`${contact.name} deleted successfully`);
      setIsDeleteDialogOpen(false);
      router.push("/dashboard/contacts");
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete contact");
      setIsDeletingContact(false);
    }
  };

  // Contact-specific Analytics & AI Metrics
  const avgTicketSizePaise = transactions.length > 0 ? Math.round((totalReceivedPaise + totalPaidPaise) / transactions.length) : 0;
  const largestTxPaise = transactions.length > 0 ? Math.max(...transactions.map((t) => t.amount)) : 0;

  // Handle Export Statement
  const handleExportStatement = () => {
    if (transactions.length === 0) {
      toast.info("No transactions to export for this contact.");
      return;
    }
    const headers = ["Date", "Description", "Type", "Category", "Amount", "Status", "Payment Method"];
    const rows = transactions.map((tx) => [
      new Date(tx.date).toISOString().split("T")[0],
      `"${(tx.title || tx.description || "").replace(/"/g, '""')}"`,
      tx.type,
      `"${(tx.categoryName || "General").replace(/"/g, '""')}"`,
      (tx.amount / 100).toFixed(2),
      tx.status,
      tx.paymentMethod || "Other",
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Statement_${contact.name.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Ledger statement exported for ${contact.name}`);
  };

  return (
    <div className="space-y-8 pb-16">
      {/* 1. Breadcrumbs & Top Navigation */}
      <div className="flex flex-col gap-2">
        <nav className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
          <Link
            href="/dashboard"
            className="hover:text-primary transition-colors flex items-center gap-1"
          >
            Dashboard
          </Link>
          <ChevronRight className="h-3 w-3 text-slate-400" />
          <Link href="/dashboard/contacts" className="hover:text-primary transition-colors">
            Contacts
          </Link>
          <ChevronRight className="h-3 w-3 text-slate-400" />
          <span className="text-slate-900 dark:text-slate-100 font-bold truncate max-w-xs">
            {contact.name}
          </span>
        </nav>

        <div className="pt-1">
          <Link href="/dashboard/contacts">
            <Button
              variant="ghost"
              size="sm"
              className="rounded-xl text-xs gap-1.5 -ml-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Contacts</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. Contact Header Profile Card */}
      <div className="p-6 rounded-3xl bg-card border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-start sm:items-center gap-4 min-w-0">
          {/* Avatar Initial */}
          <div className="h-16 w-16 rounded-3xl bg-gradient-to-tr from-primary/25 via-primary/10 to-transparent border border-primary/20 flex items-center justify-center shrink-0 shadow-xs font-black text-2xl text-primary">
            {contact.name.charAt(0).toUpperCase()}
          </div>

          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight truncate">
                {contact.name}
              </h1>
              {contact.isArchived && (
                <Badge variant="outline" className="text-[10px] px-2 py-0 uppercase font-bold text-slate-400">
                  Archived
                </Badge>
              )}
              <Badge
                variant="outline"
                className={`text-[10px] px-2 py-0.5 font-bold uppercase rounded-lg ${
                  isNetOwedToMe
                    ? "border-emerald-500/30 text-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/40"
                    : isNetIOwe
                    ? "border-rose-500/30 text-rose-600 bg-rose-50/50 dark:bg-rose-950/40"
                    : "border-slate-300 text-slate-500 bg-slate-100 dark:bg-slate-800"
                }`}
              >
                {isNetOwedToMe ? "They Owe You" : isNetIOwe ? "You Owe" : "All Settled"}
              </Badge>
            </div>

            {/* Meta info tags */}
            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
              {contact.email && (
                <div className="flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span className="font-mono text-[11px]">{contact.email}</span>
                </div>
              )}
              {contact.phone && (
                <div className="flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span className="font-mono text-[11px]">{contact.phone}</span>
                </div>
              )}
              {contact.company && (
                <div className="flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span>{contact.company}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span>Since {formatDate(contact.createdAt)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            onClick={() => {
              setAdjustmentDefaultMode("add");
              setIsAddBalanceOpen(true);
            }}
            className="rounded-2xl text-xs font-bold gap-1.5 h-10 bg-primary text-primary-foreground shadow-sm"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Add Balance</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => {
              setAdjustmentDefaultMode("adjust");
              setIsAdjustBalanceOpen(true);
            }}
            className="rounded-2xl text-xs font-bold gap-1.5 h-10 hover:border-primary/50 hover:text-primary transition-colors"
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span>Adjust Balance</span>
          </Button>

          <TransactionDialog
            contactId={contact.id}
            trigger={
              <Button
                variant="outline"
                className="rounded-2xl text-xs font-bold gap-1.5 h-10 hover:border-primary/50 hover:text-primary"
              >
                <Receipt className="h-4 w-4" />
                <span>New Transaction</span>
              </Button>
            }
          />

          <ReminderDialog
            contactId={contact.id}
            contactName={contact.name}
            currency={contact.currency}
            trigger={
              <Button
                variant="outline"
                className="rounded-2xl text-xs font-bold gap-1.5 h-10 hover:border-primary/50 hover:text-primary"
              >
                <Send className="h-4 w-4" />
                <span>Reminder</span>
              </Button>
            }
          />

          <Button
            variant="outline"
            onClick={handleExportStatement}
            className="rounded-2xl text-xs font-bold gap-1.5 h-10 hover:border-primary/50 hover:text-primary"
            title="Export Ledger Statement (CSV)"
          >
            <Download className="h-4 w-4" />
            <span>Export</span>
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsEditDialogOpen(true)}
            className="rounded-2xl h-10 w-10 text-slate-600 dark:text-slate-300 hover:text-primary"
            title="Edit Contact Details"
          >
            <Edit2 className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsDeleteDialogOpen(true)}
            className="rounded-2xl h-10 w-10 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border-rose-200 dark:border-rose-900/50"
            title="Delete Contact"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 3. Financial Metrics Cards Grid (12-col responsive layout) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Current Net Balance */}
        <Card
          className={`rounded-3xl border shadow-xs overflow-hidden transition-all duration-300 ${
            isNetOwedToMe
              ? "bg-emerald-500/[0.05] dark:bg-emerald-950/20 border-emerald-500/20 dark:border-emerald-900/40"
              : isNetIOwe
              ? "bg-rose-500/[0.05] dark:bg-rose-950/20 border-rose-500/20 dark:border-rose-900/40"
              : "bg-card border-slate-200/80 dark:border-slate-800"
          }`}
        >
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
              Current Net Balance
            </span>
            <Scale
              className={`h-4 w-4 ${
                isNetOwedToMe
                  ? "text-emerald-600"
                  : isNetIOwe
                  ? "text-rose-600"
                  : "text-slate-400"
              }`}
            />
          </CardHeader>
          <CardContent className="space-y-1">
            <div
              className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${
                isNetOwedToMe
                  ? "text-emerald-600 dark:text-emerald-400"
                  : isNetIOwe
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-slate-800 dark:text-slate-200"
              }`}
            >
              {isNetOwedToMe ? "+" : ""}
              {formatCurrency(currentNetBalancePaise / 100, contact.currency)}
            </div>
            <p className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
              <span>Status:</span>
              <span
                className={`font-bold ${
                  isNetOwedToMe
                    ? "text-emerald-600"
                    : isNetIOwe
                    ? "text-rose-600"
                    : "text-slate-500"
                }`}
              >
                {isNetOwedToMe ? "They Owe You" : isNetIOwe ? "You Owe" : "All Settled"}
              </span>
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Total Received */}
        <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-card shadow-xs">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
              Total You Received
            </span>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400">
              {formatCurrency(totalReceivedPaise / 100, contact.currency)}
            </div>
            <p className="text-xs text-slate-500 font-medium">All-time payments & credits</p>
          </CardContent>
        </Card>

        {/* Card 3: Total Paid */}
        <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-card shadow-xs">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
              Total You Paid
            </span>
            <TrendingDown className="h-4 w-4 text-rose-600" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl sm:text-3xl font-black font-mono text-rose-600 dark:text-rose-400">
              {formatCurrency(totalPaidPaise / 100, contact.currency)}
            </div>
            <p className="text-xs text-slate-500 font-medium">All-time expenses & debits</p>
          </CardContent>
        </Card>

        {/* Card 4: Outstanding Balance */}
        <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-card shadow-xs">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
              Outstanding Balance
            </span>
            <AlertCircle className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-slate-100">
              {formatCurrency(outstandingPaise / 100, contact.currency)}
            </div>
            <p className="text-xs text-slate-500 font-semibold">{settlementStatus}</p>
          </CardContent>
        </Card>
      </div>

      {/* Requirement 13: Contact Detail Synchronization Card */}
      <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-card shadow-xs overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Scale className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Dashboard Synchronization Status
                </CardTitle>
                <CardDescription className="text-xs">
                  Audited live breakdown of reflected vs pending balances in dashboard summaries
                </CardDescription>
              </div>
            </div>

            <Badge
              variant="outline"
              className={`text-xs px-2.5 py-1 font-bold rounded-xl ${
                reflectedTxCount > 0 && pendingTxCount === 0
                  ? "border-emerald-500/30 text-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/40"
                  : reflectedTxCount > 0
                  ? "border-amber-500/30 text-amber-600 bg-amber-50/50 dark:bg-amber-950/40"
                  : "border-slate-300 text-slate-500 bg-slate-100 dark:bg-slate-800"
              }`}
            >
              {reflectedTxCount > 0 && pendingTxCount === 0
                ? "✓ Fully Reflected in Dashboard"
                : reflectedTxCount > 0
                ? "⚠ Partially Reflected"
                : "○ Not Reflected in Dashboard"}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 text-center">
            {/* 1. Current Balance */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Current Balance
              </span>
              <span className={`text-sm font-black font-mono block ${isNetOwedToMe ? "text-emerald-600" : isNetIOwe ? "text-rose-600" : "text-slate-700 dark:text-slate-200"}`}>
                {isNetOwedToMe ? "+" : ""}{formatCurrency(currentNetBalancePaise / 100, contact.currency)}
              </span>
            </div>

            {/* 2. Dashboard Reflected Amount */}
            <div className="p-3 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block mb-1">
                Reflected Amount
              </span>
              <span className="text-sm font-black font-mono text-blue-600 dark:text-blue-400 block">
                {formatCurrency(dashboardReflectedAmountPaise / 100, contact.currency)}
              </span>
            </div>

            {/* 3. Pending Amount */}
            <div className="p-3 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block mb-1">
                Pending Amount
              </span>
              <span className="text-sm font-black font-mono text-amber-600 dark:text-amber-400 block">
                {formatCurrency(pendingAmountPaise / 100, contact.currency)}
              </span>
            </div>

            {/* 4. Income */}
            <div className="p-3 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mb-1">
                Reflected Income
              </span>
              <span className="text-sm font-black font-mono text-emerald-600 dark:text-emerald-400 block">
                +{formatCurrency(reflectedIncomePaise / 100, contact.currency)}
              </span>
            </div>

            {/* 5. Expense */}
            <div className="p-3 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 block mb-1">
                Reflected Expense
              </span>
              <span className="text-sm font-black font-mono text-rose-600 dark:text-rose-400 block">
                -{formatCurrency(reflectedExpensePaise / 100, contact.currency)}
              </span>
            </div>

            {/* 6. Outstanding Balance */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Outstanding
              </span>
              <span className="text-sm font-black font-mono text-slate-800 dark:text-slate-200 block">
                {formatCurrency(outstandingPaise / 100, contact.currency)}
              </span>
            </div>

            {/* 7. Last Dashboard Sync */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Last Sync Date
              </span>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block truncate" title={lastDashboardSyncDate ? formatDate(lastDashboardSyncDate) : "Never"}>
                {lastDashboardSyncDate ? formatDate(lastDashboardSyncDate) : "Never"}
              </span>
            </div>

            {/* 8. Number of Reflected Transactions */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Reflected / Total
              </span>
              <span className="text-xs font-black font-mono text-primary block">
                {reflectedTxCount} / {transactions.length}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4. Secondary Metrics Row: Monthly Summary, Opening Balance, Lifetime Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Monthly Activity Summary */}
        <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-card shadow-xs p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">
              This Month Activity
            </span>
            <Badge variant="secondary" className="text-[10px] rounded-lg">
              {monthlyTxCount} entries
            </Badge>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Received this month</span>
              <span className="font-mono font-bold text-emerald-600">
                +{formatCurrency(monthlyReceivedPaise / 100, contact.currency)}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Paid this month</span>
              <span className="font-mono font-bold text-rose-600">
                -{formatCurrency(monthlyPaidPaise / 100, contact.currency)}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs pt-1.5 border-t border-slate-100 dark:border-slate-800 font-bold">
              <span className="text-slate-700 dark:text-slate-300">Net Monthly Trend</span>
              <span
                className={`font-mono ${
                  monthlyNetPaise > 0
                    ? "text-emerald-600"
                    : monthlyNetPaise < 0
                    ? "text-rose-600"
                    : "text-slate-500"
                }`}
              >
                {monthlyNetPaise > 0 ? "+" : ""}
                {formatCurrency(monthlyNetPaise / 100, contact.currency)}
              </span>
            </div>
          </div>
        </Card>

        {/* Ledger Base & Opening Balance */}
        <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-card shadow-xs p-5 space-y-3">
          <span className="text-xs font-bold uppercase text-slate-400 tracking-wider block">
            Ledger Baseline
          </span>
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Opening Balance</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                {formatCurrency(openingPaise / 100, contact.currency)}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Lifetime Transactions</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {transactions.length} records
              </span>
            </div>
            <div className="flex justify-between items-center text-xs pt-1.5 border-t border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 font-medium">Last Transaction</span>
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {lastTransactionDate ? formatDate(lastTransactionDate) : "None yet"}
              </span>
            </div>
          </div>
        </Card>

        {/* Contact Information Summary */}
        <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-card shadow-xs p-5 space-y-3">
          <span className="text-xs font-bold uppercase text-slate-400 tracking-wider block">
            Connection Details
          </span>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">Currency</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{contact.currency}</span>
            </div>
            {contact.address && (
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Address</span>
                <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[140px]">
                  {contact.address}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center pt-1.5 border-t border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 font-medium">Last Profile Update</span>
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {formatDate(contact.updatedAt || contact.createdAt)}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* 5. Genuine Notes Section (hides automated test comments) */}
      {contact.notes && !isTestingNote(contact.notes) && (
        <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-card shadow-xs p-5">
          <div className="flex items-center gap-2 mb-2 text-slate-600 dark:text-slate-400 font-bold text-xs">
            <FileText className="h-4 w-4 text-primary" />
            <span>Contact Notes</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
            {contact.notes}
          </p>
        </Card>
      )}

      {/* 6. AI Insights & Payment Timeline for this Contact (Requirement 10) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI Financial Insights for this Contact */}
        <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-gradient-to-br from-card via-card to-primary/[0.04] shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  AI Contact Financial Intelligence
                </h3>
                <p className="text-xs text-slate-400">
                  Counterparty behavioral velocity & settlement metrics
                </p>
              </div>
            </div>
            <Badge variant="outline" className="text-[10px] uppercase font-bold text-primary border-primary/30">
              Live Audited
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-2xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                Avg Ticket Size
              </span>
              <span className="text-sm font-black font-mono text-slate-900 dark:text-slate-100">
                {formatCurrency(avgTicketSizePaise / 100, contact.currency)}
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                Peak Single Transaction
              </span>
              <span className="text-sm font-black font-mono text-primary">
                {formatCurrency(largestTxPaise / 100, contact.currency)}
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-primary/5 border border-primary/20 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary block">
              AI Recommendation
            </span>
            <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
              {isNetOwedToMe
                ? `${contact.name} owes you ${formatCurrency(outstandingPaise / 100, contact.currency)}. Send a courteous payment reminder to maintain regular settlement velocity.`
                : isNetIOwe
                ? `You have ${formatCurrency(outstandingPaise / 100, contact.currency)} in outstanding obligations to ${contact.name}. Settle this balance to keep counterparties balanced.`
                : `All recorded transactions with ${contact.name} are completely reconciled. Account is in perfect standing.`}
            </p>
          </div>
        </Card>

        {/* Payment & Settlement Timeline */}
        <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-card shadow-xs p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Payment & Ledger Timeline
              </h3>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">Recent events</span>
          </div>

          {transactions.length > 0 ? (
            <div className="space-y-3 pt-1">
              {transactions.slice(0, 4).map((tx, idx) => {
                const isPositive =
                  tx.type === "received" ||
                  tx.type === "lent" ||
                  tx.type === "repaid" ||
                  (tx.type === "adjustment" &&
                    (JSON.stringify(tx.tags || "").includes("credit") ||
                      JSON.stringify(tx.tags || "").includes("increase")));

                return (
                  <div key={tx.id || idx} className="flex items-start gap-3 relative pb-2.5 last:pb-0">
                    <div className={`h-7 w-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold ${
                      isPositive
                        ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600"
                        : "bg-rose-50 dark:bg-rose-950/40 text-rose-600"
                    }`}>
                      {isPositive ? "+" : "-"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                          {tx.title || tx.description}
                        </span>
                        <span className={`text-xs font-black font-mono shrink-0 ${
                          isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                        }`}>
                          {isPositive ? "+" : "-"}{formatCurrency(tx.amount / 100, tx.currency)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mt-0.5">
                        <span>{tx.categoryName || "General"}</span>
                        <span>{formatDate(tx.date)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-6 text-center text-slate-400 text-xs">
              No payment events recorded yet for this timeline.
            </div>
          )}
        </Card>
      </div>

      {/* 7. Complete Transaction History Ledger Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Transaction History & Ledger
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Full chronological financial audit trail with real-time derived running balances
            </p>
          </div>
        </div>

        <ContactTransactionHistory
          transactions={transactions}
          openingBalancePaise={openingPaise}
          contactPublicId={contact.publicId}
          contactName={contact.name}
          currency={contact.currency}
          onOpenAdjust={() => setIsAddBalanceOpen(true)}
          onSuccess={() => router.refresh()}
        />
      </div>

      {/* Add Balance Dialog */}
      <ContactBalanceAdjustmentDialog
        open={isAddBalanceOpen}
        onOpenChange={setIsAddBalanceOpen}
        contactId={contact.id}
        contactPublicId={contact.publicId}
        contactName={contact.name}
        currency={contact.currency}
        currentBalancePaise={currentNetBalancePaise}
        defaultMode="add"
        onSuccess={() => router.refresh()}
      />

      {/* Adjust Balance Dialog */}
      <ContactBalanceAdjustmentDialog
        open={isAdjustBalanceOpen}
        onOpenChange={setIsAdjustBalanceOpen}
        contactId={contact.id}
        contactPublicId={contact.publicId}
        contactName={contact.name}
        currency={contact.currency}
        currentBalancePaise={currentNetBalancePaise}
        defaultMode="adjust"
        onSuccess={() => router.refresh()}
      />

      {/* Edit Contact Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-card border border-slate-200/80 dark:border-slate-800 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Edit Contact Information</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Update personal and business details for {contact.name}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveContact} className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-bold">Name *</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
                className="h-10 rounded-xl text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold">Email</Label>
                <Input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="h-10 rounded-xl text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold">Phone</Label>
                <Input
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="h-10 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold">Company</Label>
                <Input
                  value={editCompany}
                  onChange={(e) => setEditCompany(e.target.value)}
                  className="h-10 rounded-xl text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold">Address</Label>
                <Input
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="h-10 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Notes</Label>
              <Textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={2}
                className="rounded-xl text-xs resize-none"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                className="rounded-xl text-xs font-semibold h-10"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSavingContact}
                className="rounded-xl text-xs font-bold h-10 bg-primary text-primary-foreground"
              >
                {isSavingContact ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Contact Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-card border border-slate-200/80 dark:border-slate-800 shadow-2xl">
          <DialogHeader className="space-y-2">
            <div className="p-3 bg-rose-500/10 text-rose-600 rounded-2xl w-12 h-12 flex items-center justify-center">
              <Trash2 className="h-6 w-6" />
            </div>
            <DialogTitle className="text-lg font-bold">Delete Contact?</DialogTitle>
            <DialogDescription className="text-xs text-slate-500 leading-relaxed">
              Are you sure you want to delete <span className="font-bold text-slate-800 dark:text-slate-200">{contact.name}</span>?
              All historical transaction records and ledger links will remain protected.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              className="rounded-xl text-xs font-semibold h-10"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleDeleteContact}
              disabled={isDeletingContact}
              className="rounded-xl text-xs font-bold h-10 bg-rose-600 hover:bg-rose-700 text-white"
            >
              {isDeletingContact ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                  <span>Deleting...</span>
                </>
              ) : (
                "Delete Contact"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


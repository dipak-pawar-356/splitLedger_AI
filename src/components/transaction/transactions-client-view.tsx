"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Filter, 
  TrendingUp, 
  TrendingDown, 
  Receipt, 
  Edit, 
  Trash2, 
  RotateCcw, 
  FileText,
  Calendar,
  DollarSign,
  Plus,
  ArrowRight,
  ArrowUpRight,
  ArrowDownLeft,
  Eye
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";
import { EditTransactionDialog } from "@/components/dialogs/edit-transaction-dialog";
import { DeleteConfirmDialog } from "@/components/dialogs/delete-confirm-dialog";
import { RestoreConfirmDialog } from "@/components/dialogs/restore-confirm-dialog";
import { deleteTransaction } from "@/actions/transactions";
import { useRouter } from "next/navigation";

interface ActiveTransactionItem {
  id: number;
  publicId: string;
  title?: string | null;
  description: string;
  type: string;
  amount: number;
  currency: string;
  date: Date | string;
  status: string;
  paymentMethod?: string | null;
  receiptUrl?: string | null;
  location?: string | null;
  tags?: string[] | any;
  contactName?: string | null;
  contactId?: number | null;
  categoryName?: string | null;
  categoryId?: number | null;
  groupName?: string | null;
  groupId?: number | null;
  createdBy: number;
  creatorName?: string | null;
}

interface DeletedTransactionItem {
  id: number;
  publicId: string;
  title?: string | null;
  description: string;
  type: string;
  amount: number;
  currency: string;
  date: Date | string;
  deletedAt?: Date | string | null;
  deletedBy?: number | null;
  deletedByName?: string | null;
  contactName?: string | null;
  categoryName?: string | null;
  groupName?: string | null;
}

interface TransactionsClientViewProps {
  activeTransactions: ActiveTransactionItem[];
  deletedTransactions: DeletedTransactionItem[];
  currentUserId: number;
}

export function TransactionsClientView({
  activeTransactions,
  deletedTransactions,
  currentUserId,
}: TransactionsClientViewProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("active");
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Dialog State
  const [deletingTx, setDeletingTx] = useState<ActiveTransactionItem | null>(null);
  const [restoringTx, setRestoringTx] = useState<DeletedTransactionItem | null>(null);

  // Filter Active
  const filteredActive = activeTransactions.filter((tx) => {
    const matchesSearch = 
      (tx.title && tx.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      tx.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tx.contactName && tx.contactName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (tx.groupName && tx.groupName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (tx.categoryName && tx.categoryName.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesType = typeFilter === "all" || tx.type === typeFilter;
    const matchesStatus = statusFilter === "all" || tx.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  // Filter Deleted
  const filteredDeleted = deletedTransactions.filter((tx) => {
    return (
      (tx.title && tx.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      tx.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tx.contactName && tx.contactName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (tx.groupName && tx.groupName.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  const handleDeleteConfirm = async () => {
    if (deletingTx) {
      await deleteTransaction(deletingTx.publicId);
      setDeletingTx(null);
      router.refresh();
    }
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
          <TabsList className="rounded-xl p-1 bg-slate-100 dark:bg-slate-800">
            <TabsTrigger value="active" className="rounded-lg text-xs font-semibold px-4 gap-2">
              <span>Active Transactions</span>
              <Badge variant="secondary" className="rounded-full text-[10px] px-1.5 py-0 h-4 font-mono">
                {activeTransactions.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="deleted" className="rounded-lg text-xs font-semibold px-4 gap-2">
              <span>Deleted / Trash</span>
              {deletedTransactions.length > 0 && (
                <Badge variant="destructive" className="rounded-full text-[10px] px-1.5 py-0 h-4 font-mono">
                  {deletedTransactions.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Search & Type Filters */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <div className="relative min-w-[200px] flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                type="text"
                placeholder="Search transactions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs rounded-xl"
              />
            </div>

            {activeTab === "active" && (
              <>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="h-9 px-3 text-xs rounded-xl border border-input bg-background font-medium"
                >
                  <option value="all">All Types</option>
                  <option value="paid">Paid</option>
                  <option value="received">Received</option>
                  <option value="lent">Lent</option>
                  <option value="borrowed">Borrowed</option>
                  <option value="repaid">Repaid</option>
                  <option value="adjustment">Adjustment</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-9 px-3 text-xs rounded-xl border border-input bg-background font-medium"
                >
                  <option value="all">All Statuses</option>
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </>
            )}
          </div>
        </div>

        {/* TAB 1: ACTIVE TRANSACTIONS */}
        <TabsContent value="active" className="space-y-4 mt-2">
          <Card className="rounded-2xl border shadow-sm overflow-hidden">
            <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
              <AnimatePresence mode="popLayout">
                {filteredActive.map((tx) => {
                  const isPositive = tx.type === "received" || tx.type === "lent" || tx.type === "repaid";

                  return (
                    <motion.div
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      whileHover={{ x: 4 }}
                      whileTap={{ scale: 0.995 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      key={tx.id}
                      className="p-4 flex items-center justify-between hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition-all gap-4 group cursor-pointer"
                    >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-200 ${
                        isPositive 
                          ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400" 
                          : "bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400"
                      }`}>
                        {isPositive ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownLeft className="h-5 w-5" />}
                      </div>

                      <div className="min-w-0">
                        <Link
                          href={`/dashboard/transactions/${tx.publicId}`}
                          className="font-semibold text-sm hover:text-primary hover:underline block truncate text-slate-900 dark:text-slate-100"
                        >
                          {tx.title || tx.description}
                        </Link>
                        <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap mt-0.5">
                          {tx.groupName ? (
                            <span className="font-medium text-primary">Group: {tx.groupName}</span>
                          ) : tx.contactName ? (
                            <span>Contact: {tx.contactName}</span>
                          ) : (
                            <span>Personal</span>
                          )}
                          <span>•</span>
                          <span>{tx.categoryName || "General"}</span>
                          <span>•</span>
                          <span>{formatDate(tx.date)}</span>
                          {tx.receiptUrl && (
                            <>
                              <span>•</span>
                              <span className="inline-flex items-center gap-1 text-purple-600 dark:text-purple-400 font-medium">
                                <Receipt className="h-3 w-3 inline" />
                                Receipt
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <p className={`font-bold text-sm sm:text-base ${
                          isPositive 
                            ? "text-emerald-600 dark:text-emerald-400" 
                            : "text-rose-600 dark:text-rose-400"
                        }`}>
                          {isPositive ? "+" : "-"}
                          {formatCurrency(tx.amount / 100, tx.currency)}
                        </p>
                        <Badge variant="outline" className={`text-[10px] capitalize font-medium ${
                          tx.status === "completed" 
                            ? "border-emerald-200 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20" 
                            : tx.status === "cancelled"
                              ? "border-slate-200 text-slate-500"
                              : "border-amber-200 text-amber-700 bg-amber-50 dark:bg-amber-950/20"
                        }`}>
                          {tx.status}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-1">
                        <Link href={`/dashboard/transactions/${tx.publicId}`}>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg text-slate-500">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        
                        <EditTransactionDialog
                          transactionPublicId={tx.publicId}
                          initialData={{
                            title: tx.title,
                            description: tx.description,
                            type: tx.type as any,
                            amount: tx.amount,
                            currency: tx.currency,
                            date: tx.date,
                            contactId: tx.contactId,
                            categoryId: tx.categoryId,
                            groupId: tx.groupId,
                            paymentMethod: tx.paymentMethod,
                            status: tx.status as any,
                            receiptUrl: tx.receiptUrl,
                            location: tx.location,
                            tags: tx.tags,
                          }}
                          trigger={
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg text-slate-500 hover:text-slate-900">
                              <Edit className="h-4 w-4" />
                            </Button>
                          }
                        />

                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                          onClick={() => setDeletingTx(tx)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

              {filteredActive.length === 0 && (
                <div className="text-center py-16 text-slate-500 space-y-3">
                  <DollarSign className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-700" />
                  <p className="font-semibold text-sm">No transactions match your filters</p>
                  <p className="text-xs text-slate-400">Try adjusting search keywords or filters above.</p>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* TAB 2: DELETED TRANSACTIONS */}
        <TabsContent value="deleted" className="space-y-4 mt-2">
          <Card className="rounded-2xl border shadow-sm overflow-hidden">
            <CardHeader className="p-4 pb-2 border-b border-slate-100 dark:border-slate-800 bg-rose-50/20 dark:bg-rose-950/10">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold text-rose-700 dark:text-rose-300">
                    Trash / Soft-Deleted Transactions
                  </CardTitle>
                  <CardDescription className="text-xs">
                    These transactions are excluded from calculations and can be restored anytime by owners/admins.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {filteredDeleted.map((tx) => (
                <div
                  key={tx.id}
                  className="p-4 flex items-center justify-between bg-slate-50/40 dark:bg-slate-900/20 hover:bg-slate-100/50 transition-colors gap-4 opacity-80"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-500 flex items-center justify-center shrink-0">
                      <Trash2 className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm line-through text-slate-500 truncate">
                        {tx.title || tx.description}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Deleted: {formatDate(tx.deletedAt)} by {tx.deletedByName || "User"}
                        {tx.groupName && ` • Group: ${tx.groupName}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="font-semibold text-sm line-through text-slate-400">
                        {formatCurrency(tx.amount / 100, tx.currency)}
                      </p>
                      <Badge variant="destructive" className="text-[10px]">
                        Deleted
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link href={`/dashboard/transactions/${tx.publicId}`}>
                        <Button variant="outline" size="sm" className="rounded-xl text-xs h-8">
                          View
                        </Button>
                      </Link>
                      <Button
                        variant="default"
                        size="sm"
                        className="rounded-xl text-xs h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => setRestoringTx(tx)}
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Restore
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              {filteredDeleted.length === 0 && (
                <div className="text-center py-16 text-slate-500 space-y-2">
                  <RotateCcw className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-700" />
                  <p className="font-medium text-sm">Trash is empty</p>
                  <p className="text-xs text-slate-400">No soft-deleted transactions found.</p>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirm Modal */}
      {deletingTx && (
        <DeleteConfirmDialog
          open={!!deletingTx}
          onOpenChange={(open) => !open && setDeletingTx(null)}
          onConfirm={handleDeleteConfirm}
          itemName={deletingTx.title || deletingTx.description}
          itemType="Transaction"
        />
      )}

      {/* Restore Confirm Modal */}
      {restoringTx && (
        <RestoreConfirmDialog
          open={!!restoringTx}
          onOpenChange={(open) => !open && setRestoringTx(null)}
          transactionPublicId={restoringTx.publicId}
          transactionTitle={restoringTx.title || restoringTx.description}
        />
      )}
    </div>
  );
}

import { requireAuth } from "@/lib/auth";
import { 
  getTransaction, 
  getTransactionVersionHistory, 
  getTransactionAuditLogs 
} from "@/actions/transactions";
import { getComments } from "@/actions/comments";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, 
  ArrowUpRight,
  ArrowDownLeft,
  Calendar, 
  DollarSign, 
  Receipt as ReceiptIcon, 
  TrendingUp, 
  TrendingDown, 
  MessageSquare, 
  History, 
  Activity, 
  Users, 
  MapPin, 
  Tag, 
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Clock,
  User,
  ShieldAlert,
  CreditCard
} from "lucide-react";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { TransactionActionButtons } from "@/components/transaction/transaction-action-buttons";
import { VersionHistory } from "@/components/transaction/version-history";
import { TransactionTimeline } from "@/components/transaction/transaction-timeline";
import { ReceiptManager } from "@/components/transaction/receipt-manager";
import { TransactionComments } from "@/components/transaction/transaction-comments";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const dynamic = 'force-dynamic';

export default async function TransactionDetailPage({ 
  params,
  searchParams 
}: { 
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ tab?: string }>;
}) {
  const user = await requireAuth();
  const { id: publicId } = await params;
  const sParams = await searchParams;
  const initialTab = sParams?.tab || "overview";

  let txData: any;
  let versions: any[] = [];
  let auditLogs: any[] = [];
  let comments: any[] = [];

  try {
    txData = await getTransaction(publicId);
    [versions, auditLogs, comments] = await Promise.all([
      getTransactionVersionHistory(publicId).catch(() => []),
      getTransactionAuditLogs(publicId).catch(() => []),
      getComments(txData.id).catch(() => []),
    ]);
  } catch (error) {
    redirect("/dashboard/transactions");
  }

  if (!txData) {
    redirect("/dashboard/transactions");
  }

  const isPositive = txData.type === "received" || txData.type === "lent" || txData.type === "repaid";
  const payerName = txData.paidByName || txData.paidByContactName || "Self";

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link 
          href="/dashboard/transactions" 
          className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Back to All Transactions
        </Link>

        <TransactionActionButtons
          transaction={txData}
          permissions={txData.permissions}
        />
      </div>

      {/* Deleted Banner if Soft Deleted */}
      {txData.isDeleted && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-rose-900 dark:text-rose-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">This transaction is currently in Trash (Soft-Deleted)</p>
              <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5">
                Deleted on {formatDate(txData.deletedAt)} by {txData.deletedByName || "User"}. It is excluded from active ledger totals, settlements, and reports.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Header Banner */}
      <Card className="rounded-3xl border shadow-sm overflow-hidden bg-card">
        <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${
              isPositive 
                ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400" 
                : "bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400"
            }`}>
              {isPositive ? <ArrowUpRight className="h-7 w-7" /> : <ArrowDownLeft className="h-7 w-7" />}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  {txData.title || txData.description}
                </h1>
                <Badge variant="outline" className="font-mono text-xs text-slate-500 rounded-lg">
                  {txData.publicId}
                </Badge>
                {txData.version > 1 && (
                  <Badge variant="secondary" className="text-xs font-semibold rounded-lg">
                    v{txData.version}
                  </Badge>
                )}
              </div>

              <p className="text-sm text-slate-500">{txData.description}</p>

              <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap pt-1">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDate(txData.date)}
                </span>
                <span>•</span>
                <span className="capitalize font-medium text-slate-700 dark:text-slate-300">
                  Type: {txData.type}
                </span>
                {txData.groupName && (
                  <>
                    <span>•</span>
                    <Link href={`/dashboard/groups/${txData.groupId}`} className="text-primary font-medium hover:underline">
                      Group: {txData.groupName}
                    </Link>
                  </>
                )}
                {txData.contactName && (
                  <>
                    <span>•</span>
                    <Link href={`/dashboard/contacts/${txData.contactId}`} className="text-primary font-medium hover:underline">
                      Contact: {txData.contactName}
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="text-left md:text-right border-t md:border-t-0 pt-4 md:pt-0 border-slate-100 dark:border-slate-800">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Total Amount</p>
            <p className={`text-3xl font-extrabold tracking-tight mt-0.5 ${
              isPositive 
                ? "text-emerald-600 dark:text-emerald-400" 
                : "text-rose-600 dark:text-rose-400"
            }`}>
              {isPositive ? "+" : "-"}
              {formatCurrency(txData.amount / 100, txData.currency)}
            </p>
            <div className="mt-1 flex md:justify-end">
              <Badge className={`text-xs capitalize font-semibold px-2.5 py-0.5 rounded-full ${
                txData.status === "completed"
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 hover:bg-emerald-100"
                  : txData.status === "cancelled"
                    ? "bg-slate-100 text-slate-600 dark:bg-slate-800 hover:bg-slate-100"
                    : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 hover:bg-amber-100"
              }`}>
                {txData.status}
              </Badge>
            </div>
          </div>
        </div>
      </Card>

      {/* Detail Tabs */}
      <Tabs defaultValue={initialTab} className="w-full">
        <TabsList className="w-full justify-start rounded-2xl p-1 bg-slate-100 dark:bg-slate-800/80 overflow-x-auto">
          <TabsTrigger value="overview" className="rounded-xl text-xs font-semibold px-4 gap-1.5">
            <DollarSign className="h-3.5 w-3.5" />
            <span>Overview & Splits</span>
          </TabsTrigger>
          <TabsTrigger value="versions" className="rounded-xl text-xs font-semibold px-4 gap-1.5">
            <History className="h-3.5 w-3.5" />
            <span>Version History</span>
            <Badge variant="secondary" className="rounded-full text-[10px] px-1.5 py-0 h-4 font-mono ml-1">
              {versions.length || 1}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="timeline" className="rounded-xl text-xs font-semibold px-4 gap-1.5">
            <Activity className="h-3.5 w-3.5" />
            <span>Audit & Timeline</span>
            <Badge variant="secondary" className="rounded-full text-[10px] px-1.5 py-0 h-4 font-mono ml-1">
              {auditLogs.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="receipt" className="rounded-xl text-xs font-semibold px-4 gap-1.5">
            <ReceiptIcon className="h-3.5 w-3.5" />
            <span>Receipt Proof</span>
            {txData.receiptUrl && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 ml-1" />
            )}
          </TabsTrigger>
          <TabsTrigger value="comments" className="rounded-xl text-xs font-semibold px-4 gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Discussion</span>
            <Badge variant="secondary" className="rounded-full text-[10px] px-1.5 py-0 h-4 font-mono ml-1">
              {comments.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: OVERVIEW */}
        <TabsContent value="overview" className="mt-4 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left Col: Main Details */}
            <Card className="md:col-span-2 rounded-2xl border shadow-sm">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-base font-semibold">Transaction Details</CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl space-y-1">
                    <span className="text-xs text-slate-500 font-medium">Category</span>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {txData.categoryName || "General / Uncategorized"}
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl space-y-1">
                    <span className="text-xs text-slate-500 font-medium">Payment Method</span>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {txData.paymentMethod || "UPI / Direct"}
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl space-y-1">
                    <span className="text-xs text-slate-500 font-medium">Paid By</span>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {payerName}
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl space-y-1">
                    <span className="text-xs text-slate-500 font-medium">Transaction Date</span>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {formatDate(txData.date)}
                    </p>
                  </div>
                </div>

                {txData.location && (
                  <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 p-2 bg-slate-50 dark:bg-slate-900/40 rounded-xl">
                    <MapPin className="h-4 w-4 text-primary" />
                    <span>Location: <strong>{txData.location}</strong></span>
                  </div>
                )}

                {txData.tags && txData.tags.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-xs text-slate-500 font-medium">Tags</span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {txData.tags.map((tag: string, idx: number) => (
                        <Badge key={idx} variant="secondary" className="text-xs font-normal rounded-lg">
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {txData.notes && (
                  <div className="space-y-1.5">
                    <span className="text-xs text-slate-500 font-medium">Notes & Context</span>
                    <p className="text-xs text-slate-700 dark:text-slate-300 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border leading-relaxed">
                      {txData.notes}
                    </p>
                  </div>
                )}

                {/* Split Participants Breakdown */}
                {txData.splits && txData.splits.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Expense Split Breakdown ({txData.splits.length} participants)
                      </span>
                      <span className="text-xs text-slate-500 capitalize">
                        Method: {txData.splits[0]?.splitMethod || "Equal"}
                      </span>
                    </div>

                    <div className="divide-y divide-slate-100 dark:divide-slate-800/80 rounded-xl border overflow-hidden">
                      {txData.splits.map((split: any) => (
                        <div key={split.id} className="p-3 flex items-center justify-between text-xs bg-card">
                          <div className="flex items-center gap-2.5">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={split.userAvatar || split.contactAvatar || undefined} />
                              <AvatarFallback className="text-[10px]">
                                {(split.userName || split.contactName || "M").charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-slate-800 dark:text-slate-200">
                              {split.userName || split.contactName || "Participant"}
                            </span>
                            {split.isExcluded && (
                              <Badge variant="outline" className="text-[10px] text-slate-400">Excluded</Badge>
                            )}
                          </div>
                          <div className="text-right font-semibold text-slate-900 dark:text-slate-100">
                            {formatCurrency(split.amount / 100, txData.currency)}
                            {split.percentage && (
                              <span className="text-[10px] text-slate-400 block font-normal">
                                {split.percentage}%
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Right Col: Metadata & Quick Info */}
            <div className="space-y-6">
              <Card className="rounded-2xl border shadow-sm">
                <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                  <CardTitle className="text-sm font-semibold">Audit & Creation</CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3 text-xs">
                  <div>
                    <span className="text-slate-400 block">Created By</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {txData.creatorName || "System User"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Created At</span>
                    <span className="text-slate-600 dark:text-slate-400">
                      {formatDateTime(txData.createdAt)}
                    </span>
                  </div>
                  {txData.updatedByName && (
                    <div>
                      <span className="text-slate-400 block">Last Edited By</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {txData.updatedByName}
                      </span>
                    </div>
                  )}
                  <div>
                    <span className="text-slate-400 block">Last Updated</span>
                    <span className="text-slate-600 dark:text-slate-400">
                      {formatDateTime(txData.updatedAt)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Version Number</span>
                    <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                      v{txData.version}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {txData.receiptUrl && (
                <Card className="rounded-2xl border shadow-sm">
                  <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold">Receipt Attached</CardTitle>
                      <ReceiptIcon className="h-4 w-4 text-purple-600" />
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 space-y-2 text-xs">
                    <a
                      href={txData.receiptUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline font-medium block truncate"
                    >
                      View Receipt Document
                    </a>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* TAB 2: VERSION HISTORY */}
        <TabsContent value="versions" className="mt-4">
          <Card className="rounded-2xl border shadow-sm p-6">
            <VersionHistory versions={versions} currency={txData.currency} />
          </Card>
        </TabsContent>

        {/* TAB 3: ACTIVITY TIMELINE */}
        <TabsContent value="timeline" className="mt-4">
          <Card className="rounded-2xl border shadow-sm p-6">
            <TransactionTimeline logs={auditLogs} />
          </Card>
        </TabsContent>

        {/* TAB 4: RECEIPTS */}
        <TabsContent value="receipt" className="mt-4">
          <Card className="rounded-2xl border shadow-sm p-6">
            <ReceiptManager
              transactionPublicId={txData.publicId}
              receiptUrl={txData.receiptUrl}
              canEdit={txData.permissions.canEdit}
            />
          </Card>
        </TabsContent>

        {/* TAB 5: COMMENTS */}
        <TabsContent value="comments" className="mt-4">
          <Card className="rounded-2xl border shadow-sm p-6">
            <TransactionComments
              transactionId={txData.id}
              transactionPublicId={txData.publicId}
              initialComments={comments}
              currentUserId={user.id}
            />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

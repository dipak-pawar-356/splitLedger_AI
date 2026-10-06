"use client";

import { useState } from "react";
import { LoanDashboardMetrics, LoanRecord, LoanType, InterestType, LoanCategory, EmiCadence } from "@/lib/types/loans";
import { 
  createLoan, 
  updateLoan, 
  deleteLoan, 
  archiveLoan, 
  duplicateLoan,
  recordLoanRepayment,
  generateLoanPaymentQrData
} from "@/actions/loans";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  HandCoins,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  CreditCard,
  QrCode,
  CheckCircle2,
  AlertCircle,
  Clock,
  DollarSign,
  Plus,
  Scale,
  MoreVertical,
  Edit2,
  Copy,
  Archive,
  Trash2,
  Sparkles,
  FileText,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

interface LoansDashboardViewProps {
  initialMetrics: LoanDashboardMetrics;
}

export function LoansDashboardView({ initialMetrics }: LoansDashboardViewProps) {
  const [metrics, setMetrics] = useState<LoanDashboardMetrics>(initialMetrics);
  const [activeTab, setActiveTab] = useState("lent");

  // Create / Edit Loan Modal State
  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<LoanRecord | null>(null);
  const [loanTitle, setLoanTitle] = useState("");
  const [loanDescription, setLoanDescription] = useState("");
  const [loanType, setLoanType] = useState<LoanType>("borrowed");
  const [loanCategory, setLoanCategory] = useState<LoanCategory>("personal");
  const [borrowerName, setBorrowerName] = useState("");
  const [lenderName, setLenderName] = useState("");
  const [borrowerUpiId, setBorrowerUpiId] = useState("");
  const [lenderUpiId, setLenderUpiId] = useState("");
  const [principalAmount, setPrincipalAmount] = useState("");
  const [interestType, setInterestType] = useState<InterestType>("none");
  const [interestRate, setInterestRate] = useState("0");
  const [tenureMonths, setTenureMonths] = useState("6");
  const [emiCadence, setEmiCadence] = useState<EmiCadence>("monthly");
  const [isSavingLoan, setIsSavingLoan] = useState(false);

  // Repayment / QR Modal State
  const [selectedLoan, setSelectedLoan] = useState<LoanRecord | null>(null);
  const [repaymentAmount, setRepaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"UPI" | "Bank Transfer" | "Cash">("UPI");
  const [isRepaying, setIsRepaying] = useState(false);

  // EMI Schedule Viewer Modal State
  const [viewEmiLoan, setViewEmiLoan] = useState<LoanRecord | null>(null);

  const openCreateModal = (defaultType: LoanType = "borrowed") => {
    setEditingLoan(null);
    setLoanTitle("");
    setLoanDescription("");
    setLoanType(defaultType);
    setLoanCategory("personal");
    setBorrowerName(defaultType === "borrowed" ? "Me" : "");
    setLenderName(defaultType === "lent" ? "Me" : "");
    setBorrowerUpiId("");
    setLenderUpiId("");
    setPrincipalAmount("");
    setInterestType("none");
    setInterestRate("0");
    setTenureMonths("6");
    setEmiCadence("monthly");
    setIsLoanModalOpen(true);
  };

  const handleSaveLoan = async () => {
    if (!loanTitle.trim()) {
      toast.error("Please enter a loan title.");
      return;
    }
    const amt = parseFloat(principalAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Enter a valid principal loan amount.");
      return;
    }

    setIsSavingLoan(true);
    try {
      if (editingLoan) {
        const updated = await updateLoan(editingLoan.id, {
          title: loanTitle,
          description: loanDescription,
          borrowerName,
          lenderName,
          borrowerUpiId,
          lenderUpiId,
        });
        toast.success(`Updated loan '${updated.title}'`);
        setMetrics((prev) => ({
          ...prev,
          loans: prev.loans.map((l) => (l.id === updated.id ? updated : l)),
        }));
      } else {
        const created = await createLoan({
          title: loanTitle,
          description: loanDescription,
          borrowerName: borrowerName || "Borrower",
          lenderName: lenderName || "Lender",
          borrowerUpiId,
          lenderUpiId,
          principalAmount: amt,
          loanType,
          category: loanCategory,
          interestType,
          interestRate: parseFloat(interestRate) || 0,
          tenureMonths: parseInt(tenureMonths) || 6,
          emiCadence,
        });

        toast.success(`Created ${loanType} loan '${created.title}'`);
        setMetrics((prev) => ({
          ...prev,
          loans: [...prev.loans, created],
          totalLent: created.loanType === "lent" ? prev.totalLent + created.outstandingBalance : prev.totalLent,
          totalBorrowed: created.loanType === "borrowed" ? prev.totalBorrowed + created.outstandingBalance : prev.totalBorrowed,
          netDebtPosition:
            created.loanType === "lent"
              ? prev.netDebtPosition + created.outstandingBalance
              : prev.netDebtPosition - created.outstandingBalance,
        }));
      }
      setIsLoanModalOpen(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to save loan.");
    } finally {
      setIsSavingLoan(false);
    }
  };

  const handleDuplicate = async (publicId: string) => {
    try {
      const dup = await duplicateLoan(publicId);
      toast.success(`Duplicated loan '${dup.title}'`);
      setMetrics((prev) => ({
        ...prev,
        loans: [...prev.loans, dup],
      }));
    } catch (err: any) {
      toast.error(err?.message || "Failed to duplicate loan.");
    }
  };

  const handleArchive = async (publicId: string) => {
    try {
      const arch = await archiveLoan(publicId);
      toast.success(`Archived loan '${arch.title}'`);
      setMetrics((prev) => ({
        ...prev,
        loans: prev.loans.map((l) => (l.id === arch.id ? arch : l)),
      }));
    } catch (err: any) {
      toast.error(err?.message || "Failed to archive loan.");
    }
  };

  const handleDelete = async (publicId: string) => {
    try {
      await deleteLoan(publicId);
      toast.success("Loan record deleted.");
      setMetrics((prev) => ({
        ...prev,
        loans: prev.loans.filter((l) => l.id !== publicId),
      }));
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete loan.");
    }
  };

  const handleRecordRepayment = async () => {
    if (!selectedLoan || !repaymentAmount) return;
    const amt = parseFloat(repaymentAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Enter a valid repayment amount.");
      return;
    }

    setIsRepaying(true);
    try {
      const updated = await recordLoanRepayment(selectedLoan.id, {
        amount: amt,
        paymentMethod,
        notes: `Direct repayment via ${paymentMethod}`,
      });
      toast.success(`Repayment of ₹${amt.toLocaleString("en-IN")} recorded!`);

      setMetrics((prev) => ({
        ...prev,
        loans: prev.loans.map((l) => (l.id === updated.id ? updated : l)),
        totalBorrowed:
          updated.loanType === "borrowed"
            ? Math.max(0, prev.totalBorrowed - amt)
            : prev.totalBorrowed,
        totalLent:
          updated.loanType === "lent"
            ? Math.max(0, prev.totalLent - amt)
            : prev.totalLent,
      }));

      setSelectedLoan(null);
      setRepaymentAmount("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to record repayment.");
    } finally {
      setIsRepaying(false);
    }
  };

  const activeLoans = metrics.loans.filter((l) => l.status !== "archived");
  const lentLoans = activeLoans.filter((l) => l.loanType === "lent");
  const borrowedLoans = activeLoans.filter((l) => l.loanType === "borrowed");

  return (
    <div className="space-y-6 pb-12">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            Loan & Debt Management Center
            <Badge variant="secondary" className="bg-primary/10 text-primary text-xs font-bold">
              ₹ INR
            </Badge>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Track borrowing, lending, automated EMI schedules, UPI QR repayments, and net debt positions.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={() => openCreateModal("borrowed")} className="rounded-xl text-xs font-bold gap-1.5 shadow-sm bg-rose-600 hover:bg-rose-700 text-white">
            <ArrowDownLeft className="h-4 w-4" />
            <span>Borrow Money</span>
          </Button>
          <Button size="sm" onClick={() => openCreateModal("lent")} className="rounded-xl text-xs font-bold gap-1.5 shadow-sm bg-emerald-600 hover:bg-emerald-700 text-white">
            <ArrowUpRight className="h-4 w-4" />
            <span>Lend Money</span>
          </Button>
        </div>
      </div>

      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="card-lift group rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm bg-card cursor-pointer hover:border-emerald-500/50 transition-all">
          <CardHeader className="pb-2">
            <p className="text-xs font-semibold text-slate-500 flex items-center justify-between">
              <span className="group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors">Total Lent (Receivable)</span>
              <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300">
                <ArrowUpRight className="h-4 w-4 text-emerald-500" />
              </div>
            </p>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
              <AnimatedCounter value={formatCurrency(metrics.totalLent, metrics.currency)} />
            </p>
          </CardContent>
        </Card>

        <Card className="card-lift group rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm bg-card cursor-pointer hover:border-rose-500/50 transition-all">
          <CardHeader className="pb-2">
            <p className="text-xs font-semibold text-slate-500 flex items-center justify-between">
              <span className="group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors">Total Borrowed (Payable)</span>
              <div className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300">
                <ArrowDownLeft className="h-4 w-4 text-rose-500" />
              </div>
            </p>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-black text-rose-600 dark:text-rose-400 tracking-tight">
              <AnimatedCounter value={formatCurrency(metrics.totalBorrowed, metrics.currency)} />
            </p>
          </CardContent>
        </Card>

        <Card className="card-lift group rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm bg-card cursor-pointer hover:border-primary/50 transition-all">
          <CardHeader className="pb-2">
            <p className="text-xs font-semibold text-slate-500 flex items-center justify-between">
              <span className="group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors">Net Debt Position</span>
              <div className="p-1.5 rounded-lg bg-primary/10 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300">
                <Scale className="h-4 w-4 text-primary" />
              </div>
            </p>
          </CardHeader>
          <CardContent>
            <p
              className={`text-2xl font-black tracking-tight ${
                metrics.netDebtPosition >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
              }`}
            >
              <AnimatedCounter value={`${metrics.netDebtPosition >= 0 ? "+" : ""}${formatCurrency(metrics.netDebtPosition, metrics.currency)}`} />
            </p>
          </CardContent>
        </Card>

        <Card className="card-lift group rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm bg-card cursor-pointer hover:border-amber-500/50 transition-all">
          <CardHeader className="pb-2">
            <p className="text-xs font-semibold text-slate-500 flex items-center justify-between">
              <span className="group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors">Upcoming EMI Due</span>
              <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300">
                <Clock className="h-4 w-4 text-amber-500" />
              </div>
            </p>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-black text-amber-600 dark:text-amber-400 tracking-tight">
              <AnimatedCounter value={formatCurrency(metrics.upcomingEmiAmount, metrics.currency)} />
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl flex-wrap h-auto gap-1">
          <TabsTrigger value="lent" className="rounded-xl text-xs font-semibold">
            <ArrowUpRight className="h-3.5 w-3.5 mr-1.5 inline text-emerald-500" />
            Lent to Others ({lentLoans.length})
          </TabsTrigger>
          <TabsTrigger value="borrowed" className="rounded-xl text-xs font-semibold">
            <ArrowDownLeft className="h-3.5 w-3.5 mr-1.5 inline text-rose-500" />
            Borrowed by Me ({borrowedLoans.length})
          </TabsTrigger>
          <TabsTrigger value="repayments" className="rounded-xl text-xs font-semibold">
            <CreditCard className="h-3.5 w-3.5 mr-1.5 inline text-indigo-500" />
            Repayment Ledger
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: Lent to Others */}
        <TabsContent value="lent" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {lentLoans.map((loan) => (
              <Card key={loan.id} className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-card p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100">{loan.title}</h2>
                    <p className="text-[11px] text-slate-500">
                      Borrower: <strong>{loan.borrowerName}</strong> • {loan.interestRate}% {loan.interestType} p.a.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 text-[10px] uppercase font-bold">
                      {loan.status}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-lg">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl text-xs">
                        <DropdownMenuItem onClick={() => setViewEmiLoan(loan)}>
                          <FileText className="h-3.5 w-3.5 mr-2" />
                          View EMI Schedule
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicate(loan.id)}>
                          <Copy className="h-3.5 w-3.5 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleArchive(loan.id)}>
                          <Archive className="h-3.5 w-3.5 mr-2 text-amber-500" />
                          Archive
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(loan.id)} className="text-rose-600">
                          <Trash2 className="h-3.5 w-3.5 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span>Recovered: {formatCurrency(loan.totalPaid, loan.currency)}</span>
                    <span className="text-slate-500">Principal: {formatCurrency(loan.principalAmount, loan.currency)}</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.round((loan.totalPaid / (loan.principalAmount + loan.totalInterestAccrued)) * 100)
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-between items-center border-t border-slate-100 dark:border-slate-800 text-xs">
                  <span className="text-slate-400 text-[11px]">
                    Remaining: <strong className="text-emerald-600">{formatCurrency(loan.outstandingBalance, loan.currency)}</strong>
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl text-xs h-8 gap-1"
                    onClick={() => setSelectedLoan(loan)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Record Recovery</span>
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          {lentLoans.length === 0 && (
            <div className="py-16 text-center border-2 border-dashed rounded-3xl p-8 bg-slate-50/50 dark:bg-slate-900/30">
              <ArrowUpRight className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">No Money Lent Records Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                Record money lent to friends, family, business partners, or employees to track repayments.
              </p>
              <Button size="sm" onClick={() => openCreateModal("lent")} className="rounded-xl text-xs font-bold gap-1.5 bg-emerald-600 text-white">
                <Plus className="h-4 w-4" />
                <span>Lend Money</span>
              </Button>
            </div>
          )}
        </TabsContent>

        {/* TAB 2: Borrowed by Me */}
        <TabsContent value="borrowed" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {borrowedLoans.map((loan) => (
              <Card key={loan.id} className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-card p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100">{loan.title}</h2>
                    <p className="text-[11px] text-slate-500">
                      Lender: <strong>{loan.lenderName}</strong> • {loan.interestRate}% {loan.interestType} p.a.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-rose-500/10 text-rose-600 text-[10px] uppercase font-bold">
                      {loan.status}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-lg">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl text-xs">
                        <DropdownMenuItem onClick={() => setViewEmiLoan(loan)}>
                          <FileText className="h-3.5 w-3.5 mr-2" />
                          View EMI Schedule
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicate(loan.id)}>
                          <Copy className="h-3.5 w-3.5 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleArchive(loan.id)}>
                          <Archive className="h-3.5 w-3.5 mr-2 text-amber-500" />
                          Archive
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(loan.id)} className="text-rose-600">
                          <Trash2 className="h-3.5 w-3.5 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span>Paid: {formatCurrency(loan.totalPaid, loan.currency)}</span>
                    <span className="text-slate-500">EMI: {formatCurrency(loan.emiAmount || 0, loan.currency)}/mo</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-rose-500"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.round((loan.totalPaid / (loan.principalAmount + loan.totalInterestAccrued)) * 100)
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-between items-center border-t border-slate-100 dark:border-slate-800 text-xs">
                  <span className="text-slate-400 text-[11px]">
                    Payable: <strong className="text-rose-600">{formatCurrency(loan.outstandingBalance, loan.currency)}</strong>
                  </span>
                  <Button
                    size="sm"
                    className="rounded-xl text-xs h-8 gap-1 bg-primary text-primary-foreground"
                    onClick={() => {
                      setSelectedLoan(loan);
                      setRepaymentAmount(String(loan.emiAmount || loan.outstandingBalance));
                    }}
                  >
                    <QrCode className="h-3.5 w-3.5 mr-1" />
                    <span>Pay EMI / QR</span>
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          {borrowedLoans.length === 0 && (
            <div className="py-16 text-center border-2 border-dashed rounded-3xl p-8 bg-slate-50/50 dark:bg-slate-900/30">
              <ArrowDownLeft className="h-10 w-10 text-rose-500 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">No Borrowed Loans Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                Record personal financing, trip advances, or EMI obligations to track repayment schedules.
              </p>
              <Button size="sm" onClick={() => openCreateModal("borrowed")} className="rounded-xl text-xs font-bold gap-1.5 bg-rose-600 text-white">
                <Plus className="h-4 w-4" />
                <span>Borrow Money</span>
              </Button>
            </div>
          )}
        </TabsContent>

        {/* TAB 3: Repayment Ledger */}
        <TabsContent value="repayments" className="space-y-4">
          <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-card overflow-hidden">
            {metrics.loans.flatMap((l) => l.repayments).map((rep) => (
              <div key={rep.id} className="p-4 flex items-center justify-between text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{formatCurrency(rep.amount, "INR")}</span>
                    <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 text-[10px] uppercase font-bold">
                      {rep.paymentMethod}
                    </Badge>
                  </div>
                  <p className="text-slate-500">
                    Ref: <span className="font-mono">{rep.referenceNumber}</span> • Date: {rep.date}
                  </p>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="text-[10px]">
                    {rep.status}
                  </Badge>
                </div>
              </div>
            ))}
            {metrics.loans.flatMap((l) => l.repayments).length === 0 && (
              <div className="p-12 text-center text-xs text-slate-500">
                No repayments recorded yet. Select an active loan to record a payment.
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Create / Edit Loan Modal */}
      <Dialog open={isLoanModalOpen} onOpenChange={setIsLoanModalOpen}>
        <DialogContent className="sm:max-w-lg rounded-3xl p-6 bg-card border border-slate-200/80 dark:border-slate-800">
          <DialogHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <DialogTitle className="text-base font-bold">
              {editingLoan ? "Edit Loan Details" : `Create ${loanType.toUpperCase()} Loan`}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Configure loan principal, interest rates, EMI schedule, and UPI handles.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">Loan Title:</label>
                <Input
                  placeholder="e.g. Home Office Financing"
                  value={loanTitle}
                  onChange={(e) => setLoanTitle(e.target.value)}
                  className="h-9 text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">Category:</label>
                <select
                  value={loanCategory}
                  onChange={(e) => setLoanCategory(e.target.value as LoanCategory)}
                  className="w-full h-9 text-xs rounded-xl border bg-background px-3 font-medium"
                >
                  <option value="personal">Personal</option>
                  <option value="friend_family">Friend / Family</option>
                  <option value="group">Group Split</option>
                  <option value="trip_advance">Trip Advance</option>
                  <option value="business">Business</option>
                  <option value="emergency">Emergency</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">Borrower Name:</label>
                <Input
                  placeholder="e.g. Rahul Sharma"
                  value={borrowerName}
                  onChange={(e) => setBorrowerName(e.target.value)}
                  className="h-9 text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">Lender Name:</label>
                <Input
                  placeholder="e.g. HDFC Personal Finance"
                  value={lenderName}
                  onChange={(e) => setLenderName(e.target.value)}
                  className="h-9 text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">Lender UPI VPA (for QR Pay):</label>
                <Input
                  placeholder="e.g. lender@upi"
                  value={lenderUpiId}
                  onChange={(e) => setLenderUpiId(e.target.value)}
                  className="h-9 text-xs rounded-xl font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">Principal Amount (₹):</label>
                <Input
                  type="number"
                  placeholder="e.g. 50000"
                  value={principalAmount}
                  onChange={(e) => setPrincipalAmount(e.target.value)}
                  className="h-9 text-xs rounded-xl font-bold font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">Interest Calculation:</label>
                <select
                  value={interestType}
                  onChange={(e) => setInterestType(e.target.value as InterestType)}
                  className="w-full h-9 text-xs rounded-xl border bg-background px-3 font-medium"
                >
                  <option value="none">0% Interest Free</option>
                  <option value="simple">Simple Interest</option>
                  <option value="compound">Compound Interest</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">Annual Rate (% p.a.):</label>
                <Input
                  type="number"
                  placeholder="e.g. 10"
                  value={interestRate}
                  onChange={(e) => setInterestRate(e.target.value)}
                  className="h-9 text-xs rounded-xl font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button size="sm" variant="outline" onClick={() => setIsLoanModalOpen(false)} className="rounded-xl text-xs h-9">
                Cancel
              </Button>
              <Button size="sm" disabled={isSavingLoan} onClick={handleSaveLoan} className="rounded-xl text-xs h-9 bg-primary text-primary-foreground px-4">
                {isSavingLoan ? "Saving..." : editingLoan ? "Update Loan" : "Create Loan"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pay / Repay Modal with Dynamic UPI QR Code */}
      <Dialog open={!!selectedLoan} onOpenChange={(open) => !open && setSelectedLoan(null)}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-card border border-slate-200/80 dark:border-slate-800">
          <DialogHeader className="pb-2 border-b border-slate-100 dark:border-slate-800">
            <DialogTitle className="text-base font-bold">
              {selectedLoan?.loanType === "borrowed" ? "Pay EMI / Repay Loan" : "Record Loan Recovery"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {selectedLoan?.title} • Outstanding: {formatCurrency(selectedLoan?.outstandingBalance || 0, "INR")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Dynamic UPI QR Display for Borrowed Loans */}
            {selectedLoan?.loanType === "borrowed" && selectedLoan.lenderUpiId && (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex flex-col items-center gap-2">
                <div className="p-2 bg-white rounded-xl shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://quickchart.io/qr?text=${encodeURIComponent(
                      `upi://pay?pa=${selectedLoan.lenderUpiId}&pn=${encodeURIComponent(
                        selectedLoan.lenderName
                      )}&am=${repaymentAmount || selectedLoan.emiAmount || selectedLoan.outstandingBalance}&cu=INR&tn=${encodeURIComponent(
                        selectedLoan.title
                      )}`
                    )}&size=140`}
                    alt="UPI Payment QR"
                    className="w-32 h-32 rounded-lg"
                  />
                </div>
                <p className="text-[11px] text-slate-500 text-center font-mono">
                  Scan with GPay/PhonePe to Pay <strong className="text-primary">{selectedLoan.lenderUpiId}</strong>
                </p>
              </div>
            )}

            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">Repayment Amount (₹):</label>
              <Input
                type="number"
                placeholder="e.g. 5000"
                value={repaymentAmount}
                onChange={(e) => setRepaymentAmount(e.target.value)}
                className="h-10 text-sm rounded-xl font-bold font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">Payment Mode:</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full h-10 px-3 rounded-xl border border-input bg-background font-medium text-xs"
              >
                <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                <option value="Bank Transfer">NEFT / IMPS Bank Transfer</option>
                <option value="Cash">Cash on Hand</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl text-xs h-9"
                onClick={() => setSelectedLoan(null)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={isRepaying}
                className="rounded-xl text-xs h-9 bg-primary text-primary-foreground px-4"
                onClick={handleRecordRepayment}
              >
                {isRepaying ? "Recording..." : "Confirm Repayment"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* EMI Schedule Viewer Modal */}
      <Dialog open={!!viewEmiLoan} onOpenChange={(open) => !open && setViewEmiLoan(null)}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-card border border-slate-200/80 dark:border-slate-800">
          <DialogHeader className="pb-2 border-b border-slate-100 dark:border-slate-800">
            <DialogTitle className="text-base font-bold">EMI Schedule Breakdown</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {viewEmiLoan?.title} • {viewEmiLoan?.installments.length} Installments
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs max-h-80 overflow-y-auto">
            {viewEmiLoan?.installments.map((inst) => (
              <div key={inst.installmentNumber} className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900 dark:text-slate-100">
                    EMI #{inst.installmentNumber} • {formatCurrency(inst.amount, "INR")}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Due: {inst.dueDate} (P: ₹{inst.principal} | I: ₹{inst.interest})
                  </p>
                </div>
                <Badge variant="secondary" className={`text-[10px] uppercase font-bold ${inst.status === "paid" ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"}`}>
                  {inst.status}
                </Badge>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

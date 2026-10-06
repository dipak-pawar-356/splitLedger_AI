"use client";

import { useState } from "react";
import { OrganizationSummary, CorporateExpenseApproval } from "@/lib/types/enterprise";
import { reviewCorporateExpense } from "@/actions/organizations";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Building2, 
  Briefcase, 
  Users, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Layers, 
  FolderKanban, 
  CreditCard,
  Plus,
  ShieldCheck,
  TrendingUp
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

interface EnterpriseClientViewProps {
  initialSummary: OrganizationSummary;
}

export function EnterpriseClientView({ initialSummary }: EnterpriseClientViewProps) {
  const [summary, setSummary] = useState<OrganizationSummary>(initialSummary);
  const [activeTab, setActiveTab] = useState("approvals");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const org = summary.organization;

  const handleReview = async (approvalId: string, action: "approve" | "reject") => {
    setProcessingId(approvalId);
    try {
      const updated = await reviewCorporateExpense(org.id, approvalId, action);
      toast.success(action === "approve" ? "Expense claim approved!" : "Expense claim rejected.");

      setSummary((prev) => ({
        ...prev,
        pendingApprovals: prev.pendingApprovals.map((a) => (a.id === approvalId ? updated : a)),
      }));
    } catch (err: any) {
      toast.error(err?.message || "Failed to update approval status.");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Organization Header */}
      <div className="p-6 rounded-3xl bg-slate-900 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 border border-slate-800">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5 flex-wrap">
            <Building2 className="h-6 w-6 text-indigo-400" />
            <h1 className="text-xl sm:text-2xl font-black">{org.name}</h1>
            <Badge variant="secondary" className="bg-indigo-500/20 text-indigo-300 font-bold text-xs">
              {org.status.toUpperCase()}
            </Badge>
            <Badge variant="outline" className="text-slate-300 border-slate-700 text-xs">
              {org.baseCurrency} (₹)
            </Badge>
          </div>
          <p className="text-xs text-slate-400">
            GSTIN: <strong>{org.gstNumber || "N/A"}</strong> • PAN: <strong>{org.panNumber || "N/A"}</strong> • {org.industry}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-[11px] text-slate-400 font-semibold">Total Corporate Budget</p>
            <p className="text-lg font-black text-emerald-400">
              {formatCurrency(summary.totalAllocatedBudget, org.baseCurrency)}
            </p>
          </div>
        </div>
      </div>

      {/* Main Enterprise Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl flex-wrap h-auto gap-1">
          <TabsTrigger value="approvals" className="rounded-xl text-xs font-semibold">
            <Clock className="h-3.5 w-3.5 mr-1.5 inline text-amber-500" />
            Expense Approvals ({summary.pendingApprovals.length})
          </TabsTrigger>
          <TabsTrigger value="departments" className="rounded-xl text-xs font-semibold">
            <Layers className="h-3.5 w-3.5 mr-1.5 inline text-indigo-500" />
            Departments & Teams ({summary.departments.length})
          </TabsTrigger>
          <TabsTrigger value="projects" className="rounded-xl text-xs font-semibold">
            <FolderKanban className="h-3.5 w-3.5 mr-1.5 inline text-emerald-500" />
            Projects ({summary.projects.length})
          </TabsTrigger>
          <TabsTrigger value="employees" className="rounded-xl text-xs font-semibold">
            <Users className="h-3.5 w-3.5 mr-1.5 inline text-blue-500" />
            Employee Directory ({summary.employees.length})
          </TabsTrigger>
          <TabsTrigger value="accounts" className="rounded-xl text-xs font-semibold">
            <CreditCard className="h-3.5 w-3.5 mr-1.5 inline text-rose-500" />
            Business Accounts ({summary.businessAccounts.length})
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: Expense Approvals Queue */}
        <TabsContent value="approvals" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Corporate Expense Review Queue
              </h2>
              <p className="text-xs text-slate-500">
                Multi-stage ladder review: Employee claim verification, manager approval & finance audit
              </p>
            </div>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-card overflow-hidden shadow-sm">
            {summary.pendingApprovals.map((claim) => (
              <div
                key={claim.id}
                className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-900/30 text-xs"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                      {claim.title}
                    </span>
                    <Badge
                      variant="secondary"
                      className={`text-[10px] font-bold ${
                        claim.state === "approved"
                          ? "bg-emerald-500/10 text-emerald-600"
                          : claim.state === "rejected"
                          ? "bg-rose-500/10 text-rose-600"
                          : "bg-amber-500/10 text-amber-600"
                      }`}
                    >
                      {claim.state.replace("_", " ").toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-slate-500 text-xs">{claim.description}</p>
                  <div className="flex items-center gap-3 text-[11px] text-slate-400">
                    <span>Submitted by: <strong>{claim.employeeName}</strong></span>
                    <span>•</span>
                    <span>Reviewer: <strong>{claim.currentApproverRole}</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <p className="font-black text-base text-slate-900 dark:text-slate-100">
                      {formatCurrency(claim.amount, claim.currency)}
                    </p>
                    <p className="text-[10px] text-slate-400">Claims Ledger</p>
                  </div>

                  {claim.state !== "approved" && claim.state !== "rejected" && (
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl text-xs h-8 text-rose-600 hover:bg-rose-50 border-rose-200"
                        disabled={processingId === claim.id}
                        onClick={() => handleReview(claim.id, "reject")}
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1" />
                        <span>Reject</span>
                      </Button>
                      <Button
                        size="sm"
                        className="rounded-xl text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
                        disabled={processingId === claim.id}
                        onClick={() => handleReview(claim.id, "approve")}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                        <span>Approve</span>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* TAB 2: Departments & Teams */}
        <TabsContent value="departments" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {summary.departments.map((dept) => (
              <Card key={dept.id} className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-[10px] font-bold">
                      {dept.code}
                    </Badge>
                    <span className="text-xs font-bold text-emerald-600">
                      Budget: {formatCurrency(dept.budget, dept.currency)}
                    </span>
                  </div>
                  <CardTitle className="text-base font-bold mt-2">{dept.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs text-slate-500">
                  <p>Staff: <strong>{dept.employeeCount} Employees</strong></p>
                  <p>Sub-teams: <strong>{dept.teamCount} Teams</strong></p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* TAB 3: Projects */}
        <TabsContent value="projects" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {summary.projects.map((proj) => (
              <Card key={proj.id} className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="text-[10px] font-bold">
                      {proj.code}
                    </Badge>
                    <Badge variant="outline" className="text-xs capitalize">
                      {proj.status}
                    </Badge>
                  </div>
                  <CardTitle className="text-base font-bold mt-2">{proj.name}</CardTitle>
                  <CardDescription className="text-xs">Client: {proj.clientName}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Spent / Budget:</span>
                    <strong className="text-slate-900 dark:text-slate-100">
                      {formatCurrency(proj.spentAmount, proj.currency)} / {formatCurrency(proj.budget, proj.currency)}
                    </strong>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-primary h-full rounded-full"
                      style={{ width: `${Math.min(100, Math.round((proj.spentAmount / proj.budget) * 100))}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* TAB 4: Employee Directory */}
        <TabsContent value="employees" className="space-y-6">
          <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-card overflow-hidden">
            {summary.employees.map((emp) => (
              <div key={emp.id} className="p-4 flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <strong className="text-slate-900 dark:text-slate-100">{emp.name}</strong>
                    <Badge variant="outline" className="text-[10px]">{emp.employeeCode}</Badge>
                  </div>
                  <p className="text-slate-500">{emp.designation} • {emp.departmentName}</p>
                </div>
                <Badge variant="secondary" className="capitalize text-[10px] font-bold">
                  {emp.employmentType.replace("_", " ")}
                </Badge>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* TAB 5: Business Accounts */}
        <TabsContent value="accounts" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {summary.businessAccounts.map((acc) => (
              <Card key={acc.id} className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-bold">{acc.name}</CardTitle>
                  <CardDescription className="text-xs">A/C: **** {acc.accountNumber.slice(-4)}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-1 text-xs">
                  <p className="text-slate-500">Available Liquid Balance:</p>
                  <p className="text-xl font-black text-emerald-600">
                    {formatCurrency(acc.balance, acc.currency)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

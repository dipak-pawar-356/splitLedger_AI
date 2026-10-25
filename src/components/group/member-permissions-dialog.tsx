"use client";

import { useState, useMemo, useTransition, useCallback, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  ShieldCheck, 
  ShieldAlert, 
  Loader2, 
  CheckCircle2, 
  Users, 
  Receipt, 
  ArrowLeftRight, 
  QrCode, 
  FileText, 
  Activity, 
  Mail, 
  KeyRound,
  Search,
  RotateCcw,
  UserCheck,
  UserX,
  UserPlus,
  Settings2,
  PieChart,
  Download,
  Bell,
  Clock,
  Sparkles,
  Layers,
  FileSpreadsheet,
  Check,
  X
} from "lucide-react";
import { 
  type DelegatedGroupPermission, 
  DELEGATED_PERMISSIONS_LIST 
} from "@/lib/security/rbac";
import { updateMemberDelegatedPermissionsAction } from "@/actions/group-permissions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { PermissionCard } from "./permissions/permission-card";
import { PermissionGroup } from "./permissions/permission-group";

interface MemberPermissionsDialogProps {
  groupId: number;
  targetUserId: number;
  targetUserName: string;
  targetUserEmail?: string | null;
  initialPermissions?: Record<string, boolean>;
  canEdit: boolean;
  trigger?: React.ReactNode;
}

interface PermissionItemDefinition {
  id: string;
  backendKey: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  category: "group_management" | "financial_access" | "reporting" | "system";
  dependency?: string;
  hoverExplanation?: string;
  required?: boolean;
}

export function MemberPermissionsDialog({
  groupId,
  targetUserId,
  targetUserName,
  targetUserEmail,
  initialPermissions = {},
  canEdit,
  trigger,
}: MemberPermissionsDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const previousStateRef = useRef<Record<string, boolean>>({ ...initialPermissions });

  const [permissions, setPermissions] = useState<Record<string, boolean>>({
    ...initialPermissions,
  });

  // Master definition of all categorized enterprise permissions
  const ALL_PERMISSIONS: PermissionItemDefinition[] = useMemo(() => [
    // 1. GROUP MANAGEMENT
    {
      id: "group:invite_members",
      backendKey: "group:manage_invitations",
      title: "Invite Members",
      description: "Generate invitations, shareable links, and QR codes to onboard new members.",
      icon: <UserPlus className="w-4 h-4" />,
      category: "group_management",
      hoverExplanation: "Grants permission to issue invite links and view invitation telemetry.",
    },
    {
      id: "group:remove_members",
      backendKey: "group:manage_permissions",
      title: "Remove Members",
      description: "Permission to remove unsettled or inactive members from group rosters.",
      icon: <UserX className="w-4 h-4" />,
      category: "group_management",
      dependency: "Group Admin",
      hoverExplanation: "High-privilege capability. Requires all balances to be settled.",
    },
    {
      id: "group:edit_members",
      backendKey: "group:manage_permissions",
      title: "Edit Members",
      description: "Update member nicknames, UPI addresses, and contact metadata.",
      icon: <Settings2 className="w-4 h-4" />,
      category: "group_management",
    },
    {
      id: "group:approve_members",
      backendKey: "group:approve_members",
      title: "Approve Members",
      description: "Review, accept, or reject incoming membership requests.",
      icon: <UserCheck className="w-4 h-4" />,
      category: "group_management",
      hoverExplanation: "Direct authority to activate pending join requests.",
    },
    {
      id: "group:manage_roles",
      backendKey: "group:manage_permissions",
      title: "Manage Roles",
      description: "Assign administrator rights and delegate sub-privileges to others.",
      icon: <KeyRound className="w-4 h-4" />,
      category: "group_management",
      dependency: "Owner delegation",
    },

    // 2. FINANCIAL ACCESS
    {
      id: "group:view_transactions",
      backendKey: "group:view_transactions",
      title: "View Expenses",
      description: "Full visibility into transaction lists, receipts, and split breakdowns.",
      icon: <Receipt className="w-4 h-4" />,
      category: "financial_access",
      required: true,
      hoverExplanation: "Baseline capability required to participate in financial audits.",
    },
    {
      id: "expense:create",
      backendKey: "group:view_transactions",
      title: "Create Expense",
      description: "Submit new group expenditures and assign payer contributions.",
      icon: <Receipt className="w-4 h-4 text-emerald-400" />,
      category: "financial_access",
    },
    {
      id: "expense:edit",
      backendKey: "group:view_transactions",
      title: "Edit Expense",
      description: "Modify existing group transactions, categories, and split allocations.",
      icon: <Receipt className="w-4 h-4 text-amber-400" />,
      category: "financial_access",
      dependency: "View Expenses",
    },
    {
      id: "expense:delete",
      backendKey: "group:view_transactions",
      title: "Delete Expense",
      description: "Void and soft-delete past expenses from the active ledger.",
      icon: <Receipt className="w-4 h-4 text-rose-400" />,
      category: "financial_access",
      dependency: "Edit Expense",
    },
    {
      id: "group:view_settlements",
      backendKey: "group:view_settlements",
      title: "Settlement Access",
      description: "Inspect optimal repayment paths, debtor obligations, and debt graphs.",
      icon: <ArrowLeftRight className="w-4 h-4" />,
      category: "financial_access",
      hoverExplanation: "Access to calculated settlement graph suggestions.",
    },
    {
      id: "group:view_payments",
      backendKey: "group:view_payments",
      title: "Payment Access",
      description: "Access recorded payment receipts and verify UPI confirmations.",
      icon: <CheckCircle2 className="w-4 h-4" />,
      category: "financial_access",
    },
    {
      id: "group:qr_access",
      backendKey: "group:view_payments",
      title: "QR Access",
      description: "Generate and display dynamic settlement payment QR codes.",
      icon: <QrCode className="w-4 h-4" />,
      category: "financial_access",
    },

    // 3. REPORTING
    {
      id: "reports:view",
      backendKey: "group:view_activity",
      title: "Reports",
      description: "Access monthly executive summaries and categorized spending analysis.",
      icon: <FileText className="w-4 h-4" />,
      category: "reporting",
    },
    {
      id: "analytics:view",
      backendKey: "group:view_activity",
      title: "Analytics",
      description: "View spending trends, category distributions, and predictive forecasts.",
      icon: <PieChart className="w-4 h-4" />,
      category: "reporting",
    },
    {
      id: "group:view_audit_logs",
      backendKey: "group:view_audit_logs",
      title: "Audit Logs",
      description: "Inspect immutable tamper-evident logs of administrative actions.",
      icon: <ShieldAlert className="w-4 h-4" />,
      category: "reporting",
      hoverExplanation: "Contains timestamped audit events with IP records and user agents.",
    },
    {
      id: "reports:export_pdf",
      backendKey: "group:view_activity",
      title: "Export PDF",
      description: "Generate professional branded PDF statements and settlement certificates.",
      icon: <Download className="w-4 h-4" />,
      category: "reporting",
    },
    {
      id: "reports:export_csv",
      backendKey: "group:view_activity",
      title: "Export CSV",
      description: "Download raw ledger rows in CSV or Excel format for accounting software.",
      icon: <FileSpreadsheet className="w-4 h-4" />,
      category: "reporting",
    },
    {
      id: "group:view_history",
      backendKey: "group:view_activity",
      title: "History",
      description: "Browse historical activity feed and past settlement runs.",
      icon: <Clock className="w-4 h-4" />,
      category: "reporting",
    },

    // 4. SYSTEM
    {
      id: "system:permissions",
      backendKey: "group:manage_permissions",
      title: "Permissions",
      description: "Inspect security boundary configurations and access matrices.",
      icon: <KeyRound className="w-4 h-4" />,
      category: "system",
    },
    {
      id: "group:view_activity",
      backendKey: "group:view_activity",
      title: "Activity",
      description: "Live notification feed for group events and expense revisions.",
      icon: <Activity className="w-4 h-4" />,
      category: "system",
    },
    {
      id: "system:notifications",
      backendKey: "group:view_activity",
      title: "Notifications",
      description: "Configure group email digests and real-time push alerts.",
      icon: <Bell className="w-4 h-4" />,
      category: "system",
    },
    {
      id: "system:reminders",
      backendKey: "group:view_payments",
      title: "Reminder Center",
      description: "Schedule automated gentle settlement reminders to pending debtors.",
      icon: <Mail className="w-4 h-4" />,
      category: "system",
    },
    {
      id: "system:ai_access",
      backendKey: "group:view_activity",
      title: "AI Access",
      description: "Enable SplitLedger AI receipt scanner, natural language expense queries, and insights.",
      icon: <Sparkles className="w-4 h-4 text-indigo-400" />,
      category: "system",
    },
  ], []);

  // Sync initial permissions into state when modal opens
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      setPermissions({ ...initialPermissions });
      previousStateRef.current = { ...initialPermissions };
      setSearchQuery("");
      setSaveStatus("idle");
    }
  };

  // Perform optimistic background update
  const persistChanges = useCallback(
    async (nextPermissions: Record<string, boolean>) => {
      if (!canEdit) return;

      setIsSaving(true);
      setSaveStatus("saving");

      try {
        // Map backend keys
        const payloadPermissions: Record<DelegatedGroupPermission, boolean> = {} as any;
        for (const item of DELEGATED_PERMISSIONS_LIST) {
          payloadPermissions[item.key] = Boolean(nextPermissions[item.key]);
        }

        // Also merge in all granular IDs
        const fullPayload = {
          ...nextPermissions,
          ...payloadPermissions,
        };

        const res = await updateMemberDelegatedPermissionsAction({
          groupId,
          targetUserId,
          permissions: fullPayload as any,
        });

        if (res.success) {
          setSaveStatus("saved");
          previousStateRef.current = { ...nextPermissions };
          toast.success(`Permissions updated for ${targetUserName}`, {
            duration: 2000,
          });
        }
      } catch (err: any) {
        setSaveStatus("error");
        // Rollback state
        setPermissions({ ...previousStateRef.current });
        toast.error(err?.message || "Failed to update permissions. Changes rolled back.");
      } finally {
        setIsSaving(false);
      }
    },
    [canEdit, groupId, targetUserId, targetUserName]
  );

  // Toggle single permission optimistically
  const handleToggle = (permId: string, backendKey: string, checked: boolean) => {
    if (!canEdit) return;

    const nextState = {
      ...permissions,
      [permId]: checked,
      [backendKey]: checked,
    };

    setPermissions(nextState);
    persistChanges(nextState);
  };

  // Preset Configurations
  const applyPreset = (presetName: "viewer" | "accountant" | "manager" | "moderator" | "admin" | "owner") => {
    if (!canEdit) return;

    const nextState: Record<string, boolean> = {};

    switch (presetName) {
      case "viewer":
        // Read only
        [
          "group:view_transactions",
          "reports:view",
          "group:view_history",
          "group:view_activity",
          "analytics:view",
        ].forEach((k) => (nextState[k] = true));
        break;

      case "accountant":
        // Financial & reporting
        [
          "group:view_transactions",
          "expense:create",
          "group:view_settlements",
          "group:view_payments",
          "group:qr_access",
          "reports:view",
          "analytics:view",
          "reports:export_pdf",
          "reports:export_csv",
          "group:view_history",
          "system:reminders",
        ].forEach((k) => (nextState[k] = true));
        break;

      case "manager":
        // Group management + Financials
        [
          "group:invite_members",
          "group:approve_members",
          "group:edit_members",
          "group:view_transactions",
          "expense:create",
          "expense:edit",
          "group:view_settlements",
          "group:view_payments",
          "group:qr_access",
          "reports:view",
          "analytics:view",
          "reports:export_pdf",
          "reports:export_csv",
          "group:view_history",
          "group:view_activity",
          "system:notifications",
          "system:reminders",
          "system:ai_access",
        ].forEach((k) => (nextState[k] = true));
        break;

      case "moderator":
        // Membership & audit
        [
          "group:invite_members",
          "group:remove_members",
          "group:approve_members",
          "group:view_transactions",
          "group:view_audit_logs",
          "group:view_history",
          "group:view_activity",
        ].forEach((k) => (nextState[k] = true));
        break;

      case "admin":
      case "owner":
        // All permissions
        ALL_PERMISSIONS.forEach((p) => {
          nextState[p.id] = true;
          nextState[p.backendKey] = true;
        });
        break;
    }

    // Map backend keys for matching
    ALL_PERMISSIONS.forEach((p) => {
      if (nextState[p.id]) {
        nextState[p.backendKey] = true;
      }
    });

    setPermissions(nextState);
    persistChanges(nextState);
    toast.info(`Applied "${presetName.toUpperCase()}" permission preset`);
  };

  // Bulk actions
  const handleSelectAll = () => {
    if (!canEdit) return;
    const nextState: Record<string, boolean> = {};
    ALL_PERMISSIONS.forEach((p) => {
      nextState[p.id] = true;
      nextState[p.backendKey] = true;
    });
    setPermissions(nextState);
    persistChanges(nextState);
  };

  const handleClearAll = () => {
    if (!canEdit) return;
    const nextState: Record<string, boolean> = {};
    setPermissions(nextState);
    persistChanges(nextState);
  };

  const handleResetDefault = () => {
    if (!canEdit) return;
    setPermissions({ ...initialPermissions });
    persistChanges({ ...initialPermissions });
    toast.info("Permissions reset to defaults");
  };

  // Filtered lists based on search
  const filteredPermissions = useMemo(() => {
    if (!searchQuery.trim()) return ALL_PERMISSIONS;
    const q = searchQuery.toLowerCase();
    return ALL_PERMISSIONS.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    );
  }, [ALL_PERMISSIONS, searchQuery]);

  const groupManagementList = filteredPermissions.filter((p) => p.category === "group_management");
  const financialAccessList = filteredPermissions.filter((p) => p.category === "financial_access");
  const reportingList = filteredPermissions.filter((p) => p.category === "reporting");
  const systemList = filteredPermissions.filter((p) => p.category === "system");

  const totalActiveCount = Object.values(permissions).filter(Boolean).length;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            variant="ghost"
            size="sm"
            className="rounded-xl text-xs gap-1.5 text-slate-400 hover:text-indigo-400 hover:bg-indigo-950/40"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            <span>Permissions</span>
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-slate-950 border-slate-800 text-slate-100 rounded-3xl shadow-2xl">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b border-slate-800/80 bg-slate-900/60 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-2xl shrink-0">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                  <span>Delegated Permissions</span>
                  <Badge className="bg-indigo-950 text-indigo-300 border-indigo-700/60 font-mono text-[10px]">
                    {totalActiveCount} Active
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400 mt-0.5">
                  Granular administrative authority for{" "}
                  <strong className="text-slate-200">{targetUserName}</strong>
                  {targetUserEmail ? ` (${targetUserEmail})` : ""}
                </DialogDescription>
              </div>
            </div>

            {/* Live Synchronized Status Badge */}
            <div className="flex items-center gap-2 self-start sm:self-center">
              {saveStatus === "saving" && (
                <span className="text-[11px] font-semibold text-amber-400 flex items-center gap-1.5 animate-pulse bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Syncing changes...
                </span>
              )}
              {saveStatus === "saved" && (
                <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1.5 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                  <CheckCircle2 className="w-3 h-3" />
                  Saved
                </span>
              )}
            </div>
          </div>

          {/* Quick Presets Bar */}
          {canEdit && (
            <div className="mt-4 pt-3 border-t border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0 mr-1">
                  Presets:
                </span>
                {(["viewer", "accountant", "manager", "moderator", "admin", "owner"] as const).map(
                  (preset) => (
                    <Button
                      key={preset}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => applyPreset(preset)}
                      disabled={isSaving}
                      className="h-6 px-2 text-[10px] rounded-lg font-bold uppercase tracking-wider border-slate-800 hover:border-indigo-500/40 hover:bg-indigo-950/30 text-slate-300 hover:text-indigo-300 transition-all shrink-0"
                    >
                      {preset}
                    </Button>
                  )
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleSelectAll}
                  disabled={isSaving}
                  className="h-6 px-2 text-[11px] text-slate-400 hover:text-slate-200"
                >
                  <Check className="w-3 h-3 mr-1" />
                  Select All
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAll}
                  disabled={isSaving}
                  className="h-6 px-2 text-[11px] text-slate-400 hover:text-slate-200"
                >
                  <X className="w-3 h-3 mr-1" />
                  Clear
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleResetDefault}
                  disabled={isSaving}
                  className="h-6 px-2 text-[11px] text-slate-400 hover:text-slate-200"
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Reset
                </Button>
              </div>
            </div>
          )}

          {/* Search Filter */}
          <div className="relative mt-3">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
            <Input
              type="text"
              placeholder="Search permissions by name, description, or keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 pr-3 text-xs bg-slate-900 border-slate-800 placeholder:text-slate-500 rounded-xl"
            />
          </div>
        </DialogHeader>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Informative Security Banner */}
          <div className="p-3 bg-slate-900/60 rounded-2xl border border-slate-800 text-xs text-slate-400 flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-200">
                Enterprise Zero-Trust Delegation:
              </span>{" "}
              Changes apply instantly with optimistic client state and server-side verification. The member will receive only the exact capabilities enabled below.
            </div>
          </div>

          {/* Section 1: GROUP MANAGEMENT */}
          {groupManagementList.length > 0 && (
            <PermissionGroup
              id="group_management"
              title="Group Management"
              description="Member roster controls, join requests, and role administration."
              icon={<Users className="w-4 h-4" />}
              activeCount={groupManagementList.filter((p) => Boolean(permissions[p.id] || permissions[p.backendKey])).length}
              totalCount={groupManagementList.length}
              defaultExpanded={true}
            >
              <div className="grid grid-cols-1 gap-2">
                {groupManagementList.map((item) => {
                  const isChecked = Boolean(permissions[item.id] || permissions[item.backendKey]);
                  return (
                    <PermissionCard
                      key={item.id}
                      id={item.id}
                      icon={item.icon}
                      title={item.title}
                      description={item.description}
                      checked={isChecked}
                      onChange={(val) => handleToggle(item.id, item.backendKey, val)}
                      disabled={!canEdit || isSaving}
                      dependency={item.dependency}
                      hoverExplanation={item.hoverExplanation}
                      required={item.required}
                    />
                  );
                })}
              </div>
            </PermissionGroup>
          )}

          {/* Section 2: FINANCIAL ACCESS */}
          {financialAccessList.length > 0 && (
            <PermissionGroup
              id="financial_access"
              title="Financial Access"
              description="Expenditure management, settlement graphs, and payment confirmations."
              icon={<Receipt className="w-4 h-4" />}
              activeCount={financialAccessList.filter((p) => Boolean(permissions[p.id] || permissions[p.backendKey])).length}
              totalCount={financialAccessList.length}
              defaultExpanded={true}
            >
              <div className="grid grid-cols-1 gap-2">
                {financialAccessList.map((item) => {
                  const isChecked = Boolean(permissions[item.id] || permissions[item.backendKey]);
                  return (
                    <PermissionCard
                      key={item.id}
                      id={item.id}
                      icon={item.icon}
                      title={item.title}
                      description={item.description}
                      checked={isChecked}
                      onChange={(val) => handleToggle(item.id, item.backendKey, val)}
                      disabled={!canEdit || isSaving}
                      dependency={item.dependency}
                      hoverExplanation={item.hoverExplanation}
                      required={item.required}
                    />
                  );
                })}
              </div>
            </PermissionGroup>
          )}

          {/* Section 3: REPORTING */}
          {reportingList.length > 0 && (
            <PermissionGroup
              id="reporting"
              title="Reporting & Intelligence"
              description="Financial exports, category analytics, and security audit logs."
              icon={<FileText className="w-4 h-4" />}
              activeCount={reportingList.filter((p) => Boolean(permissions[p.id] || permissions[p.backendKey])).length}
              totalCount={reportingList.length}
              defaultExpanded={true}
            >
              <div className="grid grid-cols-1 gap-2">
                {reportingList.map((item) => {
                  const isChecked = Boolean(permissions[item.id] || permissions[item.backendKey]);
                  return (
                    <PermissionCard
                      key={item.id}
                      id={item.id}
                      icon={item.icon}
                      title={item.title}
                      description={item.description}
                      checked={isChecked}
                      onChange={(val) => handleToggle(item.id, item.backendKey, val)}
                      disabled={!canEdit || isSaving}
                      dependency={item.dependency}
                      hoverExplanation={item.hoverExplanation}
                      required={item.required}
                    />
                  );
                })}
              </div>
            </PermissionGroup>
          )}

          {/* Section 4: SYSTEM */}
          {systemList.length > 0 && (
            <PermissionGroup
              id="system"
              title="System & AI Features"
              description="Automated notifications, reminders, and SplitLedger AI tools."
              icon={<Sparkles className="w-4 h-4 text-indigo-400" />}
              activeCount={systemList.filter((p) => Boolean(permissions[p.id] || permissions[p.backendKey])).length}
              totalCount={systemList.length}
              defaultExpanded={true}
            >
              <div className="grid grid-cols-1 gap-2">
                {systemList.map((item) => {
                  const isChecked = Boolean(permissions[item.id] || permissions[item.backendKey]);
                  return (
                    <PermissionCard
                      key={item.id}
                      id={item.id}
                      icon={item.icon}
                      title={item.title}
                      description={item.description}
                      checked={isChecked}
                      onChange={(val) => handleToggle(item.id, item.backendKey, val)}
                      disabled={!canEdit || isSaving}
                      dependency={item.dependency}
                      hoverExplanation={item.hoverExplanation}
                      required={item.required}
                    />
                  );
                })}
              </div>
            </PermissionGroup>
          )}

          {filteredPermissions.length === 0 && (
            <div className="p-8 text-center text-slate-500 space-y-2">
              <Search className="w-8 h-8 mx-auto text-slate-600" />
              <p className="text-xs">No permissions found matching &quot;{searchQuery}&quot;</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSearchQuery("")}
                className="text-xs h-7"
              >
                Clear Search
              </Button>
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="p-4 px-6 border-t border-slate-800/80 bg-slate-900/40 flex items-center justify-between sm:justify-between shrink-0">
          <div className="text-[11px] text-slate-400">
            {canEdit ? (
              <span>All toggles automatically save and synchronize in real-time.</span>
            ) : (
              <span>You have read-only permissions for this member.</span>
            )}
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            className="rounded-xl text-xs font-semibold px-4 border-slate-800 hover:bg-slate-800 text-slate-200"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

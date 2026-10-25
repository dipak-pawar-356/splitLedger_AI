"use client";

import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Settings, Shield, Users, AlertTriangle, Trash2, LogOut, ArrowRight, UserCheck, Archive, RefreshCw, Calculator, HelpCircle, CheckCircle2 } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { updateGroup, deleteGroup, leaveGroup, transferGroupOwnership, archiveGroup, restoreGroup } from "@/actions/groups";
import { updateMemberRole, removeGroupMember, getGroupMembers } from "@/actions/group-members";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { AdminSplitConfigPanel } from "@/components/group/admin-split-config-panel";

const groupSettingsSchema = z.object({
  name: z.string().min(1, "Group name is required"),
  description: z.string().optional(),
  type: z.enum(["trip", "home", "friends", "family", "couples", "office", "event", "shared_bills", "custom"]),
  splitMethod: z.enum(["equal", "exact", "percentage", "shares"]),
  coverImage: z.string().url("Invalid URL").optional().or(z.literal("")),
});

type GroupSettingsFormData = z.infer<typeof groupSettingsSchema>;

interface GroupSettingsDialogProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  groupId: number | string;
  publicId: string;
  isOwner?: boolean;
  isAdmin?: boolean;
  isActive?: boolean;
  defaultTab?: string;
  initialData: {
    name: string;
    description: string;
    currency: string;
    type: string;
    splitMethod: string;
    coverImage?: string;
  };
  onSuccess?: () => void;
}

const GROUP_TYPES = [
  { value: "trip", label: "Trip / Vacation" },
  { value: "home", label: "Home / Flatmates" },
  { value: "friends", label: "Friends" },
  { value: "family", label: "Family" },
  { value: "couples", label: "Couples" },
  { value: "office", label: "Office / Project" },
  { value: "event", label: "Event / Party" },
  { value: "custom", label: "Custom / Other" },
];

const SPLIT_METHODS = [
  { value: "equal", label: "Equal Split (1/N)" },
  { value: "exact", label: "Exact Amount (₹ INR)" },
  { value: "percentage", label: "Percentage Split (%)" },
  { value: "shares", label: "Shares Ratio" },
];

export function GroupSettingsDialog({ 
  trigger, 
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  groupId,
  publicId,
  isOwner = true,
  isAdmin = true,
  isActive = true,
  defaultTab = "general",
  initialData,
  onSuccess 
}: GroupSettingsDialogProps) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? setControlledOpen! : setInternalOpen;
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(defaultTab);

  // Members list in settings
  const [members, setMembers] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Danger Zone confirmation inputs
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [transferTargetUserId, setTransferTargetUserId] = useState<string>("");

  // Split Method Confirmation State (Option A: Future Only vs Option B: Recalculate All Existing)
  const [showSplitConfirm, setShowSplitConfirm] = useState(false);
  const [pendingGeneralData, setPendingGeneralData] = useState<GroupSettingsFormData | null>(null);
  const [recalculateChoice, setRecalculateChoice] = useState<"future" | "all">("future");

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<GroupSettingsFormData>({
    resolver: zodResolver(groupSettingsSchema),
    defaultValues: {
      name: initialData.name,
      description: initialData.description || "",
      type: (initialData.type as any) || "friends",
      splitMethod: (initialData.splitMethod as any) || "equal",
      coverImage: initialData.coverImage || "",
    },
  });

  const selectedSplitMethod = watch("splitMethod");

  const loadMembers = useCallback(async () => {
    setLoadingMembers(true);
    try {
      const data = await getGroupMembers(publicId);
      setMembers(data);
    } catch (err) {
      console.error("Failed to fetch members:", err);
    } finally {
      setLoadingMembers(false);
    }
  }, [publicId]);

  useEffect(() => {
    if (open) {
      if (defaultTab) {
        setActiveTab(defaultTab);
      }
      reset({
        name: initialData.name,
        description: initialData.description || "",
        type: (initialData.type as any) || "friends",
        splitMethod: (initialData.splitMethod as any) || "equal",
        coverImage: initialData.coverImage || "",
      });
      loadMembers();
    }
  }, [open, initialData, reset, loadMembers, defaultTab]);

  const executeSave = async (data: GroupSettingsFormData, recalculateExisting: boolean) => {
    setIsLoading(true);
    setError(null);

    try {
      await updateGroup(publicId, {
        name: data.name,
        description: data.description,
        type: data.type as any,
        splitMethod: data.splitMethod as any,
        coverImage: data.coverImage,
        recalculateExistingExpenses: recalculateExisting,
      });

      const methodLabel = SPLIT_METHODS.find((m) => m.value === data.splitMethod)?.label || data.splitMethod;
      if (recalculateExisting) {
        toast.success(`Group updated: calculation engine set to ${methodLabel} and all existing expenses recalculated!`);
      } else {
        toast.success(`Group settings saved! New expenses will default to ${methodLabel}.`);
      }

      setOpen(false);
      setShowSplitConfirm(false);
      onSuccess?.();
      router.refresh();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update group settings";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmitGeneral = async (data: GroupSettingsFormData) => {
    const isMethodChanged = data.splitMethod !== (initialData.splitMethod || "equal");
    if (isMethodChanged) {
      setPendingGeneralData(data);
      setShowSplitConfirm(true);
      return;
    }
    await executeSave(data, false);
  };

  const handleRoleChange = async (memberId: number, newIsAdmin: boolean) => {
    try {
      await updateMemberRole(memberId, publicId, newIsAdmin);
      toast.success("Member role updated successfully");
      await loadMembers();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update role");
    }
  };

  const handleRemoveMember = async (memberId: number, name: string) => {
    if (!confirm(`Are you sure you want to remove ${name} from this group?`)) return;
    try {
      await removeGroupMember(memberId, publicId);
      toast.success(`Removed ${name} from the group`);
      await loadMembers();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove member");
    }
  };

  const handleTransferOwnership = async () => {
    if (!transferTargetUserId) {
      toast.error("Please select a member to transfer ownership to.");
      return;
    }

    setIsLoading(true);
    try {
      await transferGroupOwnership(publicId, Number(transferTargetUserId));
      toast.success("Group ownership transferred successfully!");
      setOpen(false);
      onSuccess?.();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to transfer ownership");
    } finally {
      setIsLoading(false);
    }
  };

  const handleArchiveToggle = async () => {
    setIsLoading(true);
    try {
      if (isActive) {
        await archiveGroup(publicId);
        toast.success("Group archived successfully");
      } else {
        await restoreGroup(publicId);
        toast.success("Group restored successfully");
      }
      setOpen(false);
      onSuccess?.();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (!confirm("Are you sure you want to leave this group?")) return;

    setIsLoading(true);
    try {
      await leaveGroup(publicId);
      toast.success("You have left the group");
      setOpen(false);
      router.push("/dashboard/groups");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to leave group");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (deleteConfirmText.trim() !== initialData.name.trim()) {
      toast.error(`Please type "${initialData.name}" exactly to confirm deletion.`);
      return;
    }

    setIsLoading(true);
    try {
      await deleteGroup(publicId, deleteConfirmText);
      toast.success(`Group "${initialData.name}" deleted successfully.`);
      setOpen(false);
      router.push("/dashboard/groups");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete group");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && (
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[760px] max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Settings className="h-5 w-5 text-primary" />
            Group Settings — {initialData.name}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Configure group details, member roles, split calculation engine, and danger zone actions.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="px-6 border-b">
            <TabsList className="grid grid-cols-5 w-full">
              <TabsTrigger value="general" className="text-xs">General</TabsTrigger>
              <TabsTrigger value="split" className="text-xs font-semibold text-primary">Split Engine</TabsTrigger>
              <TabsTrigger value="permissions" className="text-xs">Permissions</TabsTrigger>
              <TabsTrigger value="members" className="text-xs">Members</TabsTrigger>
              <TabsTrigger value="danger" className="text-xs text-red-600 dark:text-red-400">Danger Zone</TabsTrigger>
            </TabsList>
          </div>

          {/* Tab 1: General */}
          <TabsContent value="general" className="p-6 pt-4 space-y-4">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-2 rounded-lg text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmitGeneral)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="editName" className="text-sm font-medium">Group Name *</Label>
                <Input
                  id="editName"
                  {...register("name")}
                  disabled={isLoading || !isAdmin}
                />
                {errors.name && (
                  <p className="text-xs text-red-600 dark:text-red-400">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="editDesc" className="text-sm font-medium">Description</Label>
                <Textarea
                  id="editDesc"
                  {...register("description")}
                  rows={2}
                  disabled={isLoading || !isAdmin}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="editType" className="text-sm font-medium">Category</Label>
                  <Select
                    defaultValue={initialData.type || "friends"}
                    onValueChange={(val: any) => setValue("type", val)}
                    disabled={isLoading || !isAdmin}
                  >
                    <SelectTrigger id="editType">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {GROUP_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Currency</Label>
                  <Input value="₹ INR (Indian Rupee)" disabled className="bg-slate-100 dark:bg-slate-800 font-medium" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="editSplitMethod" className="text-sm font-medium flex items-center justify-between">
                  <span>Default Split Method (Calculation Engine)</span>
                  <span className="text-[11px] text-primary font-normal">Authoritative Group Engine</span>
                </Label>
                <Select
                  value={selectedSplitMethod || initialData.splitMethod || "equal"}
                  onValueChange={(val: any) => setValue("splitMethod", val, { shouldDirty: true })}
                  disabled={isLoading || !isAdmin}
                >
                  <SelectTrigger id="editSplitMethod">
                    <SelectValue placeholder="Split Method" />
                  </SelectTrigger>
                  <SelectContent>
                    {SPLIT_METHODS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-slate-500">
                  {selectedSplitMethod === "exact"
                    ? "Exact Amount: Each member has a fixed allocated INR (₹) amount (Sum must equal total expense)."
                    : selectedSplitMethod === "percentage"
                    ? "Percentage Split: Distributed according to member percentages (Total must equal 100%)."
                    : selectedSplitMethod === "shares"
                    ? "Shares Ratio: Divided proportionally based on share units assigned to members."
                    : "Equal Split: Expense divided evenly (1/N) among all included members."}
                </p>
                {!isAdmin && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 font-medium">
                    Only group owners and admins can modify the default calculation engine.
                  </p>
                )}
              </div>

              {/* Dedicated Admin Configuration Panel when non-equal engine selected */}
              {selectedSplitMethod !== "equal" && (
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <Calculator className="h-3.5 w-3.5 text-primary" />
                      <span>Member Responsibility & Allocation Rules</span>
                    </Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveTab("split")}
                      className="text-xs h-6 text-primary hover:underline px-2"
                    >
                      Expanded View &rarr;
                    </Button>
                  </div>
                  <AdminSplitConfigPanel
                    groupId={groupId}
                    publicId={publicId}
                    splitMethod={selectedSplitMethod}
                    isAdmin={isAdmin}
                    isOwner={isOwner}
                    currency={initialData.currency}
                    compact={true}
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="editCover" className="text-sm font-medium">Cover Image URL</Label>
                <Input
                  id="editCover"
                  type="url"
                  {...register("coverImage")}
                  placeholder="https://..."
                  disabled={isLoading || !isAdmin}
                />
              </div>

              {isAdmin && (
                <div className="flex justify-end gap-2 pt-3 border-t">
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Saving Changes..." : "Save General Settings"}
                  </Button>
                </div>
              )}
            </form>
          </TabsContent>

          {/* Tab 2: Dedicated Split Engine Tab */}
          <TabsContent value="split" className="p-6 pt-4 space-y-4">
            <AdminSplitConfigPanel
              groupId={groupId}
              publicId={publicId}
              splitMethod={selectedSplitMethod}
              isAdmin={isAdmin}
              isOwner={isOwner}
              currency={initialData.currency}
              onSuccess={() => {
                onSuccess?.();
              }}
            />
          </TabsContent>

          {/* Tab 3: Permissions Guide */}
          <TabsContent value="permissions" className="p-6 pt-4 space-y-4">
            <div className="space-y-3">
              <div className="p-3.5 rounded-lg border bg-slate-50 dark:bg-slate-900">
                <div className="flex items-center gap-2 font-semibold text-primary text-sm mb-1">
                  <Shield className="h-4 w-4" />
                  Owner
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Full control. Can edit settings, manage members, delete group, transfer ownership, and create/manage all expenses and settlements.
                </p>
              </div>

              <div className="p-3.5 rounded-lg border bg-slate-50 dark:bg-slate-900">
                <div className="flex items-center gap-2 font-semibold text-blue-600 text-sm mb-1">
                  <UserCheck className="h-4 w-4" />
                  Admin
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Can invite/remove members, manage expenses for any member, update group settings, and view all reports.
                </p>
              </div>

              <div className="p-3.5 rounded-lg border bg-slate-50 dark:bg-slate-900">
                <div className="flex items-center gap-2 font-semibold text-emerald-600 text-sm mb-1">
                  <Users className="h-4 w-4" />
                  Member
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Can create expenses, edit own created expenses, comment, upload receipts, and participate in settlements.
                </p>
              </div>

              <div className="p-3.5 rounded-lg border bg-slate-50 dark:bg-slate-900">
                <div className="flex items-center gap-2 font-semibold text-amber-600 text-sm mb-1">
                  <Users className="h-4 w-4" />
                  Guest
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Non-registered contact participating in expenses and settlements. Can be merged into a registered account upon invitation acceptance.
                </p>
              </div>
            </div>
          </TabsContent>

          {/* Tab 3: Members Management */}
          <TabsContent value="members" className="p-6 pt-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Group Members ({members.length})</h3>
            </div>

            {loadingMembers ? (
              <div className="text-center py-6 text-xs text-slate-500">Loading members...</div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {members.map((m) => {
                  const displayName = m.nickname || m.userName || m.contactName || "Member";
                  return (
                    <div key={m.id} className="flex items-center justify-between p-2.5 rounded-lg border bg-slate-50 dark:bg-slate-900">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary text-xs">
                          {displayName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-semibold">{displayName}</p>
                          <p className="text-[11px] text-slate-500">{m.userEmail || m.contactEmail || (m.isGuest ? "Guest Member" : "User")}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isAdmin && !m.isGuest && m.userId && (
                          <Select
                            defaultValue={m.isAdmin ? "admin" : "member"}
                            onValueChange={(val) => handleRoleChange(m.id, val === "admin")}
                          >
                            <SelectTrigger className="h-7 text-xs w-[95px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="member">Member</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                            onClick={() => handleRemoveMember(m.id, displayName)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Tab 4: Danger Zone */}
          <TabsContent value="danger" className="p-6 pt-4 space-y-6">
            {/* Archive / Restore */}
            {isAdmin && (
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <Archive className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                      {isActive ? "Archive Group" : "Restore Group"}
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {isActive ? "Archiving marks the group as inactive but preserves all history." : "Restoring returns the group to active status."}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleArchiveToggle} disabled={isLoading}>
                    {isActive ? "Archive" : "Restore"}
                  </Button>
                </div>
              </div>
            )}

            {/* Transfer Ownership */}
            {isOwner && members.filter((m) => m.userId && m.userId !== undefined).length > 1 && (
              <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 space-y-3">
                <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-2">
                  <ArrowRight className="h-4 w-4" />
                  Transfer Ownership
                </h4>
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  Transfer full owner rights to another registered group member.
                </p>
                <div className="flex gap-2">
                  <Select value={transferTargetUserId} onValueChange={setTransferTargetUserId}>
                    <SelectTrigger className="text-xs h-9">
                      <SelectValue placeholder="Select a registered member..." />
                    </SelectTrigger>
                    <SelectContent>
                      {members.filter((m) => m.userId).map((m) => (
                        <SelectItem key={m.userId} value={String(m.userId)}>
                          {m.nickname || m.userName || m.userEmail}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={handleTransferOwnership} disabled={isLoading || !transferTargetUserId}>
                    Transfer
                  </Button>
                </div>
              </div>
            )}

            {/* Leave Group */}
            {!isOwner && (
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <LogOut className="h-4 w-4" />
                    Leave Group
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Remove yourself from this group. Requires all balances to be settled first.
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={handleLeaveGroup} disabled={isLoading}>
                  Leave
                </Button>
              </div>
            )}

            {/* Delete Group (Owner only) */}
            {isOwner && (
              <div className="p-4 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/40 dark:bg-red-950/20 space-y-3">
                <h4 className="text-sm font-semibold text-red-800 dark:text-red-300 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  Delete Group Permanently
                </h4>
                <p className="text-xs text-red-700 dark:text-red-400">
                  Deleting this group will soft-delete all expenses, settlements, invitations, reports, and history.
                </p>
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-600 dark:text-slate-400">
                    Type <span className="font-bold text-red-600">{initialData.name}</span> to confirm:
                  </Label>
                  <Input
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder={initialData.name}
                    className="text-xs"
                  />
                </div>
                <Button
                  variant="destructive"
                  className="w-full text-xs"
                  onClick={handleDeleteGroup}
                  disabled={isLoading || deleteConfirmText.trim() !== initialData.name.trim()}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-2" />
                  Delete Group
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>

    {/* Confirmation Dialog for Split Method Change (Option A vs Option B) */}
    <Dialog open={showSplitConfirm} onOpenChange={setShowSplitConfirm}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Calculator className="h-5 w-5 text-primary" />
            Update Group Calculation Engine
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            You are changing the group&apos;s default split method from{" "}
            <strong className="text-slate-800 dark:text-slate-200">
              {SPLIT_METHODS.find((m) => m.value === initialData.splitMethod)?.label || initialData.splitMethod}
            </strong>{" "}
            to{" "}
            <strong className="text-primary">
              {SPLIT_METHODS.find((m) => m.value === pendingGeneralData?.splitMethod)?.label || pendingGeneralData?.splitMethod}
            </strong>
            .
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            How would you like to apply this new calculation method?
          </p>

          <RadioGroup
            value={recalculateChoice}
            onValueChange={(val: any) => setRecalculateChoice(val)}
            className="gap-3"
          >
            {/* Option A: Future Only */}
            <label
              htmlFor="opt-future"
              className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                recalculateChoice === "future"
                  ? "border-primary bg-primary/5 dark:bg-primary/10 shadow-xs"
                  : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900"
              }`}
            >
              <RadioGroupItem value="future" id="opt-future" className="mt-0.5" />
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  Option A: Future Expenses Only
                  <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold">Recommended</span>
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Existing expenses and historical balances remain unchanged. All new expenses created in this group will default to the newly selected calculation engine.
                </p>
              </div>
            </label>

            {/* Option B: Recalculate All Existing */}
            <label
              htmlFor="opt-all"
              className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                recalculateChoice === "all"
                  ? "border-primary bg-primary/5 dark:bg-primary/10 shadow-xs"
                  : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900"
              }`}
            >
              <RadioGroupItem value="all" id="opt-all" className="mt-0.5" />
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  Option B: Recalculate All Existing Expenses
                  <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-semibold">Ledger Recompute</span>
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Immediately recalculates every existing expense in this group using the new split method. Member balances, own shares, and settlement suggestions will be synchronized.
                </p>
              </div>
            </label>
          </RadioGroup>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowSplitConfirm(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => pendingGeneralData && executeSave(pendingGeneralData, recalculateChoice === "all")}
            disabled={isLoading}
            className="gap-1.5"
          >
            {isLoading ? "Updating..." : "Confirm & Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}

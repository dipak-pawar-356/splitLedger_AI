"use client";

import { useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import { 
  ShieldCheck, 
  ShieldAlert, 
  Lock, 
  Loader2, 
  UserCog, 
  CheckCircle2, 
  Users, 
  Receipt, 
  ArrowLeftRight, 
  QrCode, 
  FileText, 
  Activity, 
  Mail, 
  KeyRound 
} from "lucide-react";
import { 
  type DelegatedGroupPermission, 
  DELEGATED_PERMISSIONS_LIST 
} from "@/lib/security/rbac";
import { updateMemberDelegatedPermissionsAction } from "@/actions/group-permissions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface MemberPermissionsDialogProps {
  groupId: number;
  targetUserId: number;
  targetUserName: string;
  targetUserEmail?: string | null;
  initialPermissions?: Record<string, boolean>;
  canEdit: boolean;
  trigger?: React.ReactNode;
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
  const [permissions, setPermissions] = useState<Record<string, boolean>>({
    ...initialPermissions,
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleToggle = (key: DelegatedGroupPermission, checked: boolean) => {
    if (!canEdit) return;
    setPermissions((prev) => ({
      ...prev,
      [key]: checked,
    }));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const res = await updateMemberDelegatedPermissionsAction({
        groupId,
        targetUserId,
        permissions: permissions as Record<DelegatedGroupPermission, boolean>,
      });

      if (res.success) {
        toast.success(`Permissions updated for ${targetUserName}`);
        setOpen(false);
        router.refresh();
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to update member permissions");
    } finally {
      setIsSaving(false);
    }
  };

  const activeCount = Object.values(permissions).filter(Boolean).length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            variant="ghost"
            size="sm"
            className="rounded-xl text-xs gap-1.5 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Permissions</span>
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-xl max-h-[88vh] overflow-y-auto rounded-3xl p-6">
        <DialogHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-2xl">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>Delegated Permissions</span>
                <Badge variant="outline" className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-200">
                  {activeCount} active
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Configure independent administrative responsibilities for{" "}
                <span className="font-semibold text-slate-800 dark:text-slate-200">{targetUserName}</span>
                {targetUserEmail ? ` (${targetUserEmail})` : ""}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Information banner */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                Independent Granular Access:
              </span>{" "}
              The member receives only the specific capabilities toggled below. Backend API authorization strictly verifies each permission before performing actions.
            </div>
          </div>

          {/* Permissions List */}
          <div className="space-y-2.5">
            {DELEGATED_PERMISSIONS_LIST.map((item) => {
              const isChecked = Boolean(permissions[item.key]);

              return (
                <div
                  key={item.key}
                  className={`p-3.5 rounded-2xl border transition-all flex items-start justify-between gap-4 ${
                    isChecked
                      ? "border-indigo-200 dark:border-indigo-800/80 bg-indigo-50/40 dark:bg-indigo-950/20"
                      : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60"
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {item.label}
                      </span>
                      {isChecked && (
                        <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/60 px-2 py-0.2 rounded-full">
                          Enabled
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  <div className="pt-0.5 shrink-0">
                    <Switch
                      checked={isChecked}
                      disabled={!canEdit || isSaving}
                      onCheckedChange={(val) => handleToggle(item.key, val)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <DialogFooter className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setOpen(false)}
            className="rounded-xl text-xs font-semibold"
          >
            Cancel
          </Button>

          {canEdit && (
            <Button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold gap-1.5 shadow-sm px-5"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
              <span>Save Permissions</span>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

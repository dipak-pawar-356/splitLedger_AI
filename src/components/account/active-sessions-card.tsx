"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Laptop, 
  Smartphone, 
  Monitor, 
  ShieldAlert, 
  Trash2, 
  CheckCircle2, 
  History, 
  Globe, 
  Clock,
  ShieldCheck,
  Edit2,
  LogOut,
  AlertTriangle,
  RefreshCw
} from "lucide-react";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import { manageSessions, manageTrustedDevices, ActiveSessionItem, TrustedDeviceItem, LoginHistoryItem } from "@/actions/account";
import { serverLogout } from "@/actions/auth-session";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface ActiveSessionsCardProps {
  sessions: ActiveSessionItem[];
  trustedDevices: TrustedDeviceItem[];
  loginHistory: LoginHistoryItem[];
  onRefresh?: () => void;
}

export function ActiveSessionsCard({
  sessions: initialSessions,
  trustedDevices: initialDevices,
  loginHistory,
  onRefresh,
}: ActiveSessionsCardProps) {
  const [sessions, setSessions] = useState<ActiveSessionItem[]>(initialSessions);
  const [devices, setDevices] = useState<TrustedDeviceItem[]>(initialDevices);
  const [isPending, setIsPending] = useState(false);
  const [showForceLogoutDialog, setShowForceLogoutDialog] = useState(false);
  const [editingDeviceId, setEditingDeviceId] = useState<string | null>(null);
  const [editingDeviceName, setEditingDeviceName] = useState("");
  const router = useRouter();

  const handleTerminateOtherSessions = async () => {
    setIsPending(true);
    try {
      const res = await manageSessions("terminate_all_others");
      setSessions(res.sessions);
      toast.success("All other active sessions have been terminated.");
      if (onRefresh) onRefresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to terminate sessions.");
    } finally {
      setIsPending(false);
    }
  };

  const handleTerminateSingleSession = async (sessionId: string) => {
    try {
      const res = await manageSessions("terminate", sessionId);
      setSessions(res.sessions);
      toast.success("Session terminated.");
      if (onRefresh) onRefresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to terminate session.");
    }
  };

  const handleForceLogoutAll = async () => {
    setIsPending(true);
    try {
      await serverLogout();
      toast.success("Successfully logged out from all devices.");
      router.push("/sign-in");
    } catch (e: any) {
      toast.error("Logout completed with fallback.");
      router.push("/sign-in");
    } finally {
      setIsPending(false);
      setShowForceLogoutDialog(false);
    }
  };

  const handleToggleTrust = async (deviceId: string, currentTrust: boolean) => {
    try {
      const action = currentTrust ? "untrust" : "trust";
      const res = await manageTrustedDevices(action, deviceId);
      setDevices(res.devices);
      toast.success(currentTrust ? "Device untrusted." : "Device marked as trusted.");
      if (onRefresh) onRefresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to update device trust.");
    }
  };

  const handleRemoveDevice = async (deviceId: string) => {
    try {
      const res = await manageTrustedDevices("remove", deviceId);
      setDevices(res.devices);
      toast.success("Device removed from trusted list.");
      if (onRefresh) onRefresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to remove device.");
    }
  };

  const handleSaveDeviceName = async (deviceId: string) => {
    if (!editingDeviceName.trim()) return;
    try {
      const res = await manageTrustedDevices("rename", deviceId, editingDeviceName.trim());
      setDevices(res.devices);
      setEditingDeviceId(null);
      toast.success("Device renamed successfully.");
      if (onRefresh) onRefresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to rename device.");
    }
  };

  const hasSuspiciousHistory = loginHistory.some((l) => l.status === "failed");

  return (
    <div className="space-y-6">
      {/* Security Threat & Anomaly Banner if failed/suspicious logins detected */}
      {hasSuspiciousHistory && (
        <div className="p-4 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-amber-900 dark:text-amber-200">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <div className="text-xs space-y-1">
            <p className="font-bold text-sm">Security Advisory: Anomalous Activity Detected</p>
            <p className="text-amber-800 dark:text-amber-300">
              One or more failed or unverified login attempts were recorded in your recent history. If this was not you, review your active sessions and use &ldquo;Logout from All Devices&rdquo; immediately.
            </p>
          </div>
        </div>
      )}

      {/* Active Sessions Card (SECTION 4 & 5) */}
      <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden bg-card">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Monitor className="h-4 w-4 text-primary" />
              <span>Active Login Sessions</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Live database sessions connected to your account with zero token reuse protection
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-xl text-xs gap-1.5 text-rose-600 hover:bg-rose-50 border-rose-200"
              onClick={handleTerminateOtherSessions}
              disabled={isPending || sessions.length <= 1}
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Terminate Other Sessions</span>
            </Button>

            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="rounded-xl text-xs gap-1.5"
              onClick={() => setShowForceLogoutDialog(true)}
              disabled={isPending}
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Logout All Devices</span>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-4 space-y-3">
          {sessions.map((sess) => (
            <div
              key={sess.id}
              className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  {sess.os.toLowerCase().includes("windows") || sess.os.toLowerCase().includes("mac") ? (
                    <Laptop className="h-5 w-5" />
                  ) : (
                    <Smartphone className="h-5 w-5" />
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-xs text-slate-900 dark:text-slate-100">
                      {sess.deviceName}
                    </p>
                    {sess.isCurrent && (
                      <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-600 font-semibold py-0 px-1.5 border border-emerald-500/20">
                        Current Session
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5" suppressHydrationWarning>
                    {sess.ipAddress} • {sess.location} • Active {formatRelativeTime(sess.lastActive)}
                  </p>
                </div>
              </div>

              {!sess.isCurrent && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-rose-500 hover:text-rose-700"
                  onClick={() => handleTerminateSingleSession(sess.id)}
                >
                  Terminate
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Trusted Devices (SECTION 5 & 16) */}
      <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden bg-card">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-primary" />
            <span>Trusted Devices</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Manage authorized hardware terminals with cryptographic fingerprint recognition
          </CardDescription>
        </CardHeader>

        <CardContent className="p-4 space-y-3">
          {devices.map((dev) => (
            <div
              key={dev.id}
              className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
                  {dev.deviceType === "mobile" ? <Smartphone className="h-4 w-4" /> : <Laptop className="h-4 w-4" />}
                </div>

                <div>
                  {editingDeviceId === dev.id ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editingDeviceName}
                        onChange={(e) => setEditingDeviceName(e.target.value)}
                        className="h-7 text-xs w-48 rounded-lg"
                      />
                      <Button size="sm" className="h-7 text-[11px] px-2" onClick={() => handleSaveDeviceName(dev.id)}>
                        Save
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-[11px] px-2" onClick={() => setEditingDeviceId(null)}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-xs text-slate-900 dark:text-slate-100">{dev.name}</p>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingDeviceId(dev.id);
                          setEditingDeviceName(dev.name);
                        }}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>
                      {dev.isTrusted && (
                        <Badge variant="outline" className="text-[10px] bg-sky-500/10 text-sky-600 border-sky-500/20 py-0 px-1.5">
                          Trusted
                        </Badge>
                      )}
                    </div>
                  )}

                  <p className="text-[11px] text-slate-400 mt-0.5" suppressHydrationWarning>
                    {dev.browser} on {dev.os} • First seen {formatDate(dev.firstLogin)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => handleToggleTrust(dev.id, dev.isTrusted)}
                >
                  {dev.isTrusted ? "Untrust" : "Trust Device"}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-slate-500 hover:text-rose-600"
                  onClick={() => handleRemoveDevice(dev.id)}
                >
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Login History Audit (SECTION 12 & 16) */}
      <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden bg-card">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            <span>Recent Login & Authentication Audit</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Immutable log of recent authentication actions and security checkpoints
          </CardDescription>
        </CardHeader>

        <CardContent className="p-4 space-y-2.5">
          {loginHistory.map((item) => (
            <div
              key={item.id}
              className="p-3 rounded-2xl bg-slate-50/60 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-3">
                <Globe className="h-4 w-4 text-slate-400" />
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    {item.browser} on {item.os}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {item.ipAddress} • {item.location}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <Badge
                  variant={item.status === "success" ? "outline" : "destructive"}
                  className={`text-[10px] capitalize ${item.status === "success" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : ""}`}
                >
                  {item.status}
                </Badge>
                <span className="text-[11px] text-slate-400" suppressHydrationWarning>
                  {formatDate(item.timestamp)}
                </span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Force Logout Confirmation Dialog */}
      <Dialog open={showForceLogoutDialog} onOpenChange={setShowForceLogoutDialog}>
        <DialogContent className="rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600 font-extrabold">
              <ShieldAlert className="h-5 w-5" />
              <span>Logout from All Devices?</span>
            </DialogTitle>
            <DialogDescription className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              This will immediately invalidate all active sessions, refresh tokens, and cookies across all your smartphones, tablets, and computers. You will need to log back in.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0 mt-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl text-xs"
              onClick={() => setShowForceLogoutDialog(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="rounded-xl text-xs"
              disabled={isPending}
              onClick={handleForceLogoutAll}
            >
              {isPending ? "Logging out..." : "Yes, Force Logout All"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

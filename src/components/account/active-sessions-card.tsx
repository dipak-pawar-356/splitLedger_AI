"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Laptop, 
  Smartphone, 
  Monitor, 
  ShieldAlert, 
  Trash2, 
  CheckCircle2, 
  History, 
  Globe, 
  Clock 
} from "lucide-react";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import { manageSessions, manageTrustedDevices, ActiveSessionItem, TrustedDeviceItem, LoginHistoryItem } from "@/actions/account";
import { toast } from "sonner";

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

  return (
    <div className="space-y-6">
      {/* Active Sessions Card (SECTION 5) */}
      <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden bg-card">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Monitor className="h-4 w-4 text-primary" />
              <span>Active Login Sessions</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Devices and browsers currently logged into your SplitLedger AI account
            </CardDescription>
          </div>

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
                      <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-600 font-semibold py-0 px-1.5">
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
                  onClick={() => manageSessions("terminate", sess.id)}
                >
                  Terminate
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Trusted Devices (SECTION 6) */}
      <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden bg-card">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-primary" />
            <span>Trusted Devices</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Devices that you have marked as recognized for faster authentication
          </CardDescription>
        </CardHeader>

        <CardContent className="p-4 space-y-3">
          {devices.map((dev) => (
            <div
              key={dev.id}
              className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3"
            >
              <div>
                <p className="font-bold text-xs text-slate-900 dark:text-slate-100">{dev.name}</p>
                <p className="text-[11px] text-slate-400" suppressHydrationWarning>
                  {dev.browser} on {dev.os} • First login {formatDate(dev.firstLogin)}
                </p>
              </div>

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
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

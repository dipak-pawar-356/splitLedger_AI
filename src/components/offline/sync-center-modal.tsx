"use client";

import { useState } from "react";
import {
  getPendingSyncQueue,
  processSyncQueue,
  SyncQueueItem,
  resolveConflict,
} from "@/lib/offline/sync-engine";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  RefreshCw,
  Wifi,
  WifiOff,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";

interface SyncCenterModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SyncCenterModal({ isOpen, onOpenChange }: SyncCenterModalProps) {
  const [queue, setQueue] = useState<SyncQueueItem[]>(getPendingSyncQueue());
  const [isSyncing, setIsSyncing] = useState(false);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const result = await processSyncQueue();
      setQueue(getPendingSyncQueue());
      toast.success(`Synchronized ${result.synced} items with cloud server!`);
    } catch (err: any) {
      toast.error("Sync failed. Changes remain safely cached locally.");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-card border border-slate-200/80 dark:border-slate-800">
        <DialogHeader className="pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
              </div>
              <div>
                <DialogTitle className="text-base font-bold">Cloud Sync Diagnostics</DialogTitle>
                <DialogDescription className="text-[11px] text-slate-500">
                  Cross-device synchronization & offline queue manager
                </DialogDescription>
              </div>
            </div>

            <Badge variant="outline" className="text-[10px] font-mono gap-1">
              <Wifi className="h-3 w-3 text-emerald-500" />
              <span>ONLINE</span>
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2 text-xs">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-slate-500 font-semibold">Offline Queue Status</p>
              <p className="text-base font-bold text-slate-900 dark:text-slate-100">
                {queue.length === 0 ? "All Records Synced" : `${queue.length} Changes Pending`}
              </p>
            </div>
            <Button
              size="sm"
              disabled={isSyncing}
              className="rounded-xl text-xs h-9 gap-1.5 px-4"
              onClick={handleManualSync}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
              <span>{isSyncing ? "Syncing..." : "Sync Now"}</span>
            </Button>
          </div>

          <div className="space-y-2">
            <p className="text-[11px] font-semibold text-slate-500">Pending Sync Items:</p>
            {queue.length === 0 ? (
              <div className="p-6 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
                <CheckCircle2 className="h-6 w-6 mx-auto text-emerald-500 mb-1" />
                <p>Local state is identical to cloud database.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden max-h-48 overflow-y-auto">
                {queue.map((item) => (
                  <div key={item.id} className="p-3 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-800 dark:text-slate-200 uppercase text-[10px]">
                        {item.action.replace("_", " ")}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono">{item.idempotencyKey.slice(0, 24)}...</p>
                    </div>
                    <Badge variant="secondary" className="text-[9px]">
                      {item.status.toUpperCase()}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

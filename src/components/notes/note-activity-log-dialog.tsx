"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Activity, Clock } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { getNoteActivityLog } from "@/actions/notes";

interface NoteActivityLogDialogProps {
  isOpen: boolean;
  onClose: () => void;
  notePublicId: string;
}

export function NoteActivityLogDialog({ isOpen, onClose, notePublicId }: NoteActivityLogDialogProps) {
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen && notePublicId) {
      getNoteActivityLog(notePublicId).then((res) => setLogs(res));
    }
  }, [isOpen, notePublicId]);

  return (
    <Dialog open={isOpen} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-md rounded-2xl p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <Activity className="h-5 w-5 text-primary" />
            Immutable Audit Activity Log
          </DialogTitle>
          <DialogDescription className="text-slate-500 text-xs">
            Complete audit trail of all creations, edits, links, and permission changes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 max-h-64 overflow-y-auto my-2 pr-1">
          {logs.map((log) => (
            <div
              key={log.id}
              className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-xs space-y-1"
            >
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-[10px] capitalize font-mono">
                  {log.action}
                </Badge>
                <span className="text-[10px] text-slate-400 font-mono">
                  {formatDate(log.createdAt)}
                </span>
              </div>
              <p className="text-slate-700 dark:text-slate-300 font-medium text-[11px]">
                {log.details || log.action}
              </p>
              <p className="text-[10px] text-slate-400">By {log.userName}</p>
            </div>
          ))}

          {logs.length === 0 && (
            <div className="py-8 text-center text-slate-400 text-xs">No audit logs recorded</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

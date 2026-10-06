"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { History, RotateCcw, Clock, FileText, CheckCircle2 } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { restoreNoteVersion } from "@/actions/notes";
import { toast } from "sonner";

interface VersionHistoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  notePublicId: string;
  versions: any[];
  onVersionRestored: () => void;
}

export function NoteVersionHistoryDialog({
  isOpen,
  onClose,
  notePublicId,
  versions,
  onVersionRestored,
}: VersionHistoryDialogProps) {
  const [selectedVersion, setSelectedVersion] = useState<any>(versions[0] || null);
  const [isRestoring, setIsRestoring] = useState(false);

  const handleRestore = async (versionPublicId: string) => {
    setIsRestoring(true);
    try {
      await restoreNoteVersion(notePublicId, versionPublicId);
      toast.success("Note restored to selected version!");
      onVersionRestored();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to restore version");
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-3xl rounded-2xl p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <History className="h-5 w-5 text-primary" />
            Note Version History
          </DialogTitle>
          <DialogDescription className="text-slate-500 text-xs">
            Review past snapshots, inspect edit summaries, and restore any previous version without losing history.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2 max-h-[60vh]">
          {/* Versions List */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-2 overflow-y-auto space-y-1.5 max-h-[50vh]">
            {versions.map((ver) => {
              const isSelected = selectedVersion?.id === ver.id;
              return (
                <div
                  key={ver.id}
                  onClick={() => setSelectedVersion(ver)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors text-xs border ${
                    isSelected
                      ? "border-primary bg-primary/10 font-semibold"
                      : "border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-[10px] bg-white dark:bg-slate-900">
                      Version {ver.versionNumber}
                    </Badge>
                    <span className="text-[10px] text-slate-400">
                      {formatDate(ver.createdAt)}
                    </span>
                  </div>
                  <p className="font-medium text-slate-800 dark:text-slate-200 mt-1 truncate">
                    {ver.title}
                  </p>
                  {ver.summary && (
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">{ver.summary}</p>
                  )}
                </div>
              );
            })}

            {versions.length === 0 && (
              <div className="py-8 text-center text-xs text-slate-400">No previous versions</div>
            )}
          </div>

          {/* Preview Details */}
          <div className="md:col-span-2 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col justify-between overflow-y-auto max-h-[50vh]">
            {selectedVersion ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <div>
                    <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                      {selectedVersion.title}
                    </h3>
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                      <Clock className="h-3 w-3 inline" />
                      Created: {formatDate(selectedVersion.createdAt)}
                    </p>
                  </div>
                  <Badge variant="default" className="text-xs bg-primary">
                    v{selectedVersion.versionNumber}
                  </Badge>
                </div>

                <div className="prose dark:prose-invert max-w-none text-xs text-slate-700 dark:text-slate-300 min-h-[160px] bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                  <div dangerouslySetInnerHTML={{ __html: selectedVersion.content || "<i>Empty content</i>" }} />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs py-12">
                Select a version from the left panel to preview details.
              </div>
            )}

            {selectedVersion && (
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  disabled={isRestoring}
                  onClick={() => handleRestore(selectedVersion.publicId)}
                  className="rounded-xl gap-1.5 bg-primary text-xs"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Restore Version {selectedVersion.versionNumber}
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

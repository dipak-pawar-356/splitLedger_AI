"use client";

import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { History, RotateCcw, Clock, FileText, CheckCircle2, GitCompare, Eye, User, PlusCircle, MinusCircle, Loader2 } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { restoreNoteVersion, getNoteVersions } from "@/actions/notes";
import { toast } from "sonner";

interface VersionHistoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  notePublicId: string;
  versions?: any[];
  currentContent?: string;
  currentTitle?: string;
  onVersionRestored: () => void;
}

interface DiffLine {
  type: "added" | "removed" | "unchanged";
  text: string;
}

function stripHtml(html: string = ""): string {
  if (!html) return "";
  return html
    .replace(/<br\s*[\/]?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function computeDiff(oldStr: string, newStr: string): { lines: DiffLine[]; additions: number; deletions: number } {
  const oldLines = oldStr.split("\n").map((l) => l.trimEnd()).filter((l) => l.length > 0);
  const newLines = newStr.split("\n").map((l) => l.trimEnd()).filter((l) => l.length > 0);

  const oldSet = new Set(oldLines);
  const newSet = new Set(newLines);

  const diff: DiffLine[] = [];
  let additions = 0;
  let deletions = 0;

  let i = 0;
  let j = 0;

  while (i < oldLines.length || j < newLines.length) {
    if (i < oldLines.length && j < newLines.length && oldLines[i] === newLines[j]) {
      diff.push({ type: "unchanged", text: oldLines[i] });
      i++;
      j++;
    } else if (j < newLines.length && !oldSet.has(newLines[j])) {
      diff.push({ type: "added", text: newLines[j] });
      additions++;
      j++;
    } else if (i < oldLines.length && !newSet.has(oldLines[i])) {
      diff.push({ type: "removed", text: oldLines[i] });
      deletions++;
      i++;
    } else {
      if (i < oldLines.length) {
        diff.push({ type: "removed", text: oldLines[i] });
        deletions++;
        i++;
      }
      if (j < newLines.length) {
        diff.push({ type: "added", text: newLines[j] });
        additions++;
        j++;
      }
    }
  }

  return { lines: diff, additions, deletions };
}

export function NoteVersionHistoryDialog({
  isOpen,
  onClose,
  notePublicId,
  versions = [],
  currentContent = "",
  currentTitle = "",
  onVersionRestored,
}: VersionHistoryDialogProps) {
  const [versionList, setVersionList] = useState<any[]>(versions);
  const [selectedVersion, setSelectedVersion] = useState<any>(versions[0] || null);
  const [viewMode, setViewMode] = useState<"preview" | "diff">("preview");
  const [isLoading, setIsLoading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  // Fetch latest version snapshots directly from DB whenever dialog opens
  useEffect(() => {
    if (isOpen && notePublicId) {
      setIsLoading(true);
      getNoteVersions(notePublicId)
        .then((res) => {
          if (Array.isArray(res)) {
            setVersionList(res);
            setSelectedVersion(res[0] || null);
          }
        })
        .catch(() => {
          // fallback to props if any
          setVersionList(versions);
          setSelectedVersion(versions[0] || null);
        })
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, notePublicId, versions]);

  const diffResult = useMemo(() => {
    if (!selectedVersion) return { lines: [], additions: 0, deletions: 0 };
    const oldText = stripHtml(selectedVersion.content || "");
    const newText = stripHtml(currentContent || "");
    return computeDiff(oldText, newText);
  }, [selectedVersion, currentContent]);

  const handleRestore = async (versionPublicId: string) => {
    if (!selectedVersion) return;
    setIsRestoring(true);
    try {
      await restoreNoteVersion(notePublicId, versionPublicId);
      toast.success(`Note restored to Version ${selectedVersion.versionNumber}!`);
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
      <DialogContent className="max-w-4xl rounded-2xl p-6 border-slate-200 dark:border-slate-800">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <History className="h-5 w-5 text-primary" />
              Note Version History & Diff Inspection
            </DialogTitle>
          </div>
          <DialogDescription className="text-slate-500 text-xs">
            Inspect every saved snapshot, compare textual diffs against current state, and safely restore past versions without data loss.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2 max-h-[65vh]">
          {/* Versions List (Left Column) */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-2 overflow-y-auto space-y-1.5 max-h-[55vh] bg-slate-50/50 dark:bg-slate-900/30">
            <div className="px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Snapshots ({versionList.length})</span>
              {isLoading && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
            </div>

            {versionList.map((ver) => {
              const isSelected = selectedVersion?.id === ver.id;
              return (
                <div
                  key={ver.id || ver.publicId}
                  onClick={() => setSelectedVersion(ver)}
                  className={`p-3 rounded-xl cursor-pointer transition-all text-xs border ${
                    isSelected
                      ? "border-primary bg-primary/10 shadow-sm font-semibold"
                      : "border-slate-200/80 dark:border-slate-800 bg-card hover:bg-slate-100/70 dark:hover:bg-slate-800"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 font-mono ${isSelected ? "border-primary text-primary" : "bg-white dark:bg-slate-900"}`}>
                      Version {ver.versionNumber}
                    </Badge>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {formatDate(ver.createdAt)}
                    </span>
                  </div>

                  <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {ver.title || "Untitled Note"}
                  </p>

                  <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400">
                    <span className="truncate max-w-[130px]">{ver.summary || "Snapshot saved"}</span>
                    {ver.userName && (
                      <span className="flex items-center gap-0.5 text-slate-500 font-medium">
                        <User className="h-2.5 w-2.5" />
                        {ver.userName}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {!isLoading && versionList.length === 0 && (
              <div className="py-12 text-center text-xs text-slate-400">
                <Clock className="h-8 w-8 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
                No saved versions yet.
                <p className="text-[10px] mt-1">Manual and auto saves generate version snapshots automatically.</p>
              </div>
            )}
          </div>

          {/* Right Column: Preview & Diff Views */}
          <div className="md:col-span-2 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col justify-between overflow-y-auto max-h-[55vh] bg-card">
            {selectedVersion ? (
              <div className="space-y-3">
                {/* Header row with Tab Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                        {selectedVersion.title}
                      </h3>
                      <Badge variant="default" className="text-[10px] bg-primary">
                        v{selectedVersion.versionNumber}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                      <span><Clock className="h-3 w-3 inline mr-1" />{formatDate(selectedVersion.createdAt)}</span>
                      {selectedVersion.userName && (
                        <span>• Edited by <strong>{selectedVersion.userName}</strong></span>
                      )}
                      {selectedVersion.summary && (
                        <span>• <em>{selectedVersion.summary}</em></span>
                      )}
                    </p>
                  </div>

                  {/* View Mode Toggle: Preview vs Compare Diff */}
                  <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => setViewMode("preview")}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                        viewMode === "preview"
                          ? "bg-white dark:bg-slate-900 text-primary shadow-xs"
                          : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                      }`}
                    >
                      <Eye className="h-3 w-3" />
                      <span>Preview</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("diff")}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                        viewMode === "diff"
                          ? "bg-white dark:bg-slate-900 text-primary shadow-xs"
                          : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                      }`}
                    >
                      <GitCompare className="h-3 w-3" />
                      <span>Compare Diff</span>
                    </button>
                  </div>
                </div>

                {/* Tab 1: Preview Snapshot */}
                {viewMode === "preview" && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      Snapshot Content (Version {selectedVersion.versionNumber})
                    </p>
                    <div className="prose dark:prose-invert max-w-none text-xs text-slate-700 dark:text-slate-300 min-h-[220px] max-h-[340px] overflow-y-auto bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                      <div dangerouslySetInnerHTML={{ __html: selectedVersion.content || "<i>Empty content in this snapshot</i>" }} />
                    </div>
                  </div>
                )}

                {/* Tab 2: Compare Diff with Current */}
                {viewMode === "diff" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        Diff: Version {selectedVersion.versionNumber} ➔ Current Note State
                      </p>
                      <div className="flex items-center gap-2 text-[10px]">
                        <span className="flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
                          <PlusCircle className="h-3 w-3" /> +{diffResult.additions} added
                        </span>
                        <span className="flex items-center gap-0.5 text-rose-600 dark:text-rose-400 font-semibold bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 rounded">
                          <MinusCircle className="h-3 w-3" /> -{diffResult.deletions} removed
                        </span>
                      </div>
                    </div>

                    <div className="min-h-[220px] max-h-[340px] overflow-y-auto bg-slate-900 text-slate-200 p-3 rounded-xl font-mono text-[11px] leading-relaxed border border-slate-800 divide-y divide-slate-800/50">
                      {diffResult.lines.map((line, idx) => {
                        if (line.type === "added") {
                          return (
                            <div key={idx} className="bg-emerald-950/50 text-emerald-300 px-2 py-1 flex items-start gap-2">
                              <span className="text-emerald-500 font-bold select-none">+</span>
                              <span className="break-all">{line.text}</span>
                            </div>
                          );
                        }
                        if (line.type === "removed") {
                          return (
                            <div key={idx} className="bg-rose-950/50 text-rose-300 px-2 py-1 flex items-start gap-2">
                              <span className="text-rose-500 font-bold select-none">-</span>
                              <span className="line-through opacity-80 break-all">{line.text}</span>
                            </div>
                          );
                        }
                        return (
                          <div key={idx} className="text-slate-400 px-2 py-0.5 flex items-start gap-2 hover:bg-slate-800/30">
                            <span className="text-slate-600 select-none">&nbsp;</span>
                            <span className="break-all">{line.text}</span>
                          </div>
                        );
                      })}

                      {diffResult.lines.length === 0 && (
                        <div className="py-12 text-center text-slate-500 text-xs font-sans">
                          No textual differences detected between this version and the current note.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs py-16">
                <History className="h-8 w-8 mb-2 text-slate-300 dark:text-slate-700" />
                Select a version snapshot from the left panel to preview or inspect diffs.
              </div>
            )}

            {/* Bottom Actions Row */}
            {selectedVersion && (
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 hidden sm:inline">
                  Restoring creates a new snapshot retaining full history.
                </span>
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  disabled={isRestoring}
                  onClick={() => handleRestore(selectedVersion.publicId)}
                  className="rounded-xl gap-1.5 bg-primary hover:bg-primary/90 text-xs font-semibold ml-auto"
                >
                  {isRestoring ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Restoring Version {selectedVersion.versionNumber}...</span>
                    </>
                  ) : (
                    <>
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>Restore Version {selectedVersion.versionNumber}</span>
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Activity,
  Clock,
  Search,
  User,
  Download,
  Printer,
  Edit,
  PlusCircle,
  Trash2,
  RotateCcw,
  Archive,
  Copy,
  CheckSquare,
  Paperclip,
  Calendar,
  Filter,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { getNoteActivityLog } from "@/actions/notes";

interface NoteActivityLogDialogProps {
  isOpen: boolean;
  onClose: () => void;
  notePublicId: string;
}

type FilterCategory = "all" | "edits" | "exports" | "lifecycle" | "tasks";

export function NoteActivityLogDialog({ isOpen, onClose, notePublicId }: NoteActivityLogDialogProps) {
  const [logs, setLogs] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<FilterCategory>("all");
  const [isLoading, setIsLoading] = useState(false);

  const fetchLogs = () => {
    if (!notePublicId) return;
    setIsLoading(true);
    getNoteActivityLog(notePublicId)
      .then((res) => setLogs(Array.isArray(res) ? res : []))
      .catch(() => setLogs([]))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    if (isOpen && notePublicId) {
      fetchLogs();
      setSearchQuery("");
      setActiveCategory("all");
    }
  }, [isOpen, notePublicId]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const action = (log.action || "").toLowerCase();
      const details = (log.details || "").toLowerCase();
      const userName = (log.userName || "").toLowerCase();
      const query = searchQuery.toLowerCase().trim();

      // Text search match
      const matchesQuery =
        !query ||
        action.includes(query) ||
        details.includes(query) ||
        userName.includes(query);

      if (!matchesQuery) return false;

      // Category filter match
      if (activeCategory === "all") return true;

      if (activeCategory === "edits") {
        return (
          action.includes("edit") ||
          action.includes("create") ||
          action.includes("version") ||
          action.includes("tag") ||
          action.includes("category")
        );
      }

      if (activeCategory === "exports") {
        return action.includes("export") || action.includes("print");
      }

      if (activeCategory === "lifecycle") {
        return (
          action.includes("archive") ||
          action.includes("unarchive") ||
          action.includes("delete") ||
          action.includes("restore") ||
          action.includes("duplicate")
        );
      }

      if (activeCategory === "tasks") {
        return (
          action.includes("task") ||
          action.includes("attachment") ||
          action.includes("reminder") ||
          action.includes("link")
        );
      }

      return true;
    });
  }, [logs, searchQuery, activeCategory]);

  const getActionIcon = (action: string) => {
    const act = (action || "").toLowerCase();
    if (act.includes("print")) return <Printer className="h-3.5 w-3.5 text-amber-500" />;
    if (act.includes("export")) return <Download className="h-3.5 w-3.5 text-cyan-500" />;
    if (act.includes("create")) return <PlusCircle className="h-3.5 w-3.5 text-emerald-500" />;
    if (act.includes("restore")) return <RotateCcw className="h-3.5 w-3.5 text-emerald-500" />;
    if (act.includes("delete")) return <Trash2 className="h-3.5 w-3.5 text-rose-500" />;
    if (act.includes("archive")) return <Archive className="h-3.5 w-3.5 text-purple-500" />;
    if (act.includes("duplicate")) return <Copy className="h-3.5 w-3.5 text-indigo-500" />;
    if (act.includes("task")) return <CheckSquare className="h-3.5 w-3.5 text-blue-500" />;
    if (act.includes("attachment")) return <Paperclip className="h-3.5 w-3.5 text-violet-500" />;
    return <Edit className="h-3.5 w-3.5 text-slate-500" />;
  };

  const getBadgeStyle = (action: string) => {
    const act = (action || "").toLowerCase();
    if (act.includes("print")) return "bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800";
    if (act.includes("export")) return "bg-cyan-100 dark:bg-cyan-950/40 text-cyan-800 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800";
    if (act.includes("create") || act.includes("restore")) return "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
    if (act.includes("delete")) return "bg-rose-100 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800";
    if (act.includes("archive")) return "bg-purple-100 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800";
    if (act.includes("duplicate")) return "bg-indigo-100 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800";
    if (act.includes("task")) return "bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800";
    return "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700";
  };

  return (
    <Dialog open={isOpen} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-2xl rounded-2xl p-6 border-slate-200 dark:border-slate-800">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <Activity className="h-5 w-5 text-primary" />
              Immutable Activity & Audit Stream
            </DialogTitle>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={fetchLogs}
              disabled={isLoading}
              className="h-8 w-8 p-0 rounded-lg text-slate-400 hover:text-slate-600"
              title="Refresh audit stream"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
          <DialogDescription className="text-slate-500 text-xs">
            Complete cryptographic audit trail of all creations, edits, prints, exports, category/tag shifts, and lifecycle transitions.
          </DialogDescription>
        </DialogHeader>

        {/* Search & Category Filter Bar */}
        <div className="space-y-2.5 mt-2">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by action, details, actor, or keyword..."
              className="pl-9 h-9 text-xs rounded-xl border-slate-200 dark:border-slate-800"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setActiveCategory("all")}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                activeCategory === "all"
                  ? "bg-primary text-white"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
              }`}
            >
              All ({logs.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory("edits")}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                activeCategory === "edits"
                  ? "bg-primary text-white"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
              }`}
            >
              Edits & Saves
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory("exports")}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                activeCategory === "exports"
                  ? "bg-primary text-white"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
              }`}
            >
              Exports & Prints
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory("lifecycle")}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                activeCategory === "lifecycle"
                  ? "bg-primary text-white"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
              }`}
            >
              Lifecycle (Trash/Archive)
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory("tasks")}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                activeCategory === "tasks"
                  ? "bg-primary text-white"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
              }`}
            >
              Tasks & Media
            </button>
          </div>
        </div>

        {/* Activity Logs Stream */}
        <div className="space-y-2 max-h-[380px] overflow-y-auto my-1 pr-1 border border-slate-100 dark:border-slate-800 rounded-xl p-2 bg-slate-50/40 dark:bg-slate-900/40">
          {filteredLogs.map((log) => (
            <div
              key={log.id}
              className="p-3 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-card text-xs space-y-1.5 shadow-xs transition-colors hover:border-slate-300 dark:hover:border-slate-700"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  {getActionIcon(log.action)}
                  <Badge variant="outline" className={`text-[10px] capitalize font-mono px-1.5 py-0 border ${getBadgeStyle(log.action)}`}>
                    {log.action.replace(/_/g, " ")}
                  </Badge>
                </div>
                <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                  <Clock className="h-3 w-3 inline text-slate-400" />
                  {formatDate(log.createdAt)}
                </span>
              </div>

              <p className="text-slate-800 dark:text-slate-200 font-medium text-xs leading-relaxed">
                {log.details || log.action}
              </p>

              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                <span className="flex items-center gap-1">
                  <User className="h-2.5 w-2.5" />
                  Actor: <strong className="text-slate-600 dark:text-slate-300">{log.userName || "You"}</strong>
                </span>
                <span className="font-mono text-slate-400">Audit ID #{log.id}</span>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="py-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span>Loading audit logs...</span>
            </div>
          )}

          {!isLoading && filteredLogs.length === 0 && (
            <div className="py-12 text-center text-slate-400 text-xs">
              <Activity className="h-8 w-8 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
              {searchQuery || activeCategory !== "all"
                ? "No matching audit events found for current filter."
                : "No audit events recorded for this note yet."}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
          <span>Total audit events: <strong>{filteredLogs.length}</strong></span>
          <Button type="button" variant="outline" size="sm" onClick={onClose} className="rounded-xl text-xs h-8">
            Close Audit Stream
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

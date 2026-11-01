"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Zap, Plus, Pin, Star, Loader2, Check } from "lucide-react";
import { createNote, linkNoteToEntity } from "@/actions/notes";
import { toast } from "sonner";

interface QuickNoteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  categories?: any[];
  entityType?: "transaction" | "group" | "trip" | "budget" | "loan" | "settlement";
  entityId?: number;
  entityPublicId?: string;
  defaultTitle?: string;
  onNoteCreated?: (createdNote?: any) => void;
}

const NOTE_COLORS = [
  { id: "default", label: "Default", colorHex: "#64748b", borderHex: "#94a3b8", shadowColor: "rgba(100, 116, 139, 0.45)", checkColor: "text-white" },
  { id: "blue", label: "Ocean Blue", colorHex: "#3b82f6", borderHex: "#93c5fd", shadowColor: "rgba(59, 130, 246, 0.55)", checkColor: "text-white" },
  { id: "green", label: "Emerald", colorHex: "#10b981", borderHex: "#6ee7b7", shadowColor: "rgba(16, 185, 129, 0.55)", checkColor: "text-white" },
  { id: "yellow", label: "Amber", colorHex: "#f59e0b", borderHex: "#fde047", shadowColor: "rgba(245, 158, 11, 0.55)", checkColor: "text-slate-950 font-black" },
  { id: "red", label: "Rose", colorHex: "#ef4444", borderHex: "#fca5a5", shadowColor: "rgba(239, 68, 68, 0.55)", checkColor: "text-white" },
  { id: "purple", label: "Purple", colorHex: "#8b5cf6", borderHex: "#c4b5fd", shadowColor: "rgba(139, 92, 246, 0.55)", checkColor: "text-white" },
  { id: "teal", label: "Teal", colorHex: "#06b6d4", borderHex: "#67e8f9", shadowColor: "rgba(6, 182, 212, 0.55)", checkColor: "text-white" },
];

export function QuickNoteDialog({
  isOpen,
  onClose,
  categories = [],
  entityType,
  entityId,
  entityPublicId,
  defaultTitle = "",
  onNoteCreated,
}: QuickNoteDialogProps) {
  const [title, setTitle] = useState(defaultTitle || "");
  const [content, setContent] = useState("");
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined);
  const [color, setColor] = useState("default");
  const [isPinned, setIsPinned] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !title.trim()) {
      return toast.error("Please enter a note title or content");
    }

    setIsSubmitting(true);
    try {
      const finalTitle = title.trim() || ("Quick Note - " + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      const finalContent = content.trim() ? ("<p>" + content.trim() + "</p>") : "<p>Quick note</p>";

      const newNote = await createNote({
        title: finalTitle,
        content: finalContent,
        categoryId: categoryId || undefined,
        color,
        tags: ["Quick Note"],
        isPinned,
        isFavorite,
      });

      if (entityType && entityId) {
        await linkNoteToEntity({
          notePublicId: newNote.publicId,
          entityType,
          entityId,
          entityPublicId,
        });
      }

      toast.success("Quick Note saved!");
      setTitle("");
      setContent("");
      setCategoryId(undefined);
      setColor("default");
      setIsPinned(false);
      setIsFavorite(false);
      onNoteCreated?.(newNote);
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to create quick note");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-md rounded-2xl p-5 sm:p-6" suppressHydrationWarning>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <div className="p-1.5 rounded-xl bg-amber-500/10 text-amber-500">
              <Zap className="h-4 w-4" />
            </div>
            <span>Instant Quick Note</span>
          </DialogTitle>
          <DialogDescription className="text-slate-500 text-xs">
            {entityType
              ? ("Link a quick note to this " + entityType)
              : "Instantly capture thoughts, receipt notes, or reminders. Auto-tagged #Quick Note."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 my-2">
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Title <span className="text-slate-400 font-normal">(optional)</span>
            </Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Flight booking remarks"
              className="h-8.5 text-xs rounded-xl"
              autoFocus
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Content</Label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Start typing your quick note content here..."
              rows={3}
              className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Category & Color Picker Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-slate-500">Category</Label>
              <select
                value={categoryId || ""}
                onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : undefined)}
                className="w-full h-8 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-background px-2 font-medium text-slate-700 dark:text-slate-300 outline-none"
              >
                <option value="">General / None</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold text-slate-500">Note Accent Color</Label>
              <div role="radiogroup" aria-label="Note accent color" className="flex items-center gap-2 h-9 overflow-x-auto no-scrollbar py-0.5">
                {NOTE_COLORS.map((c) => {
                  const isSelected = color === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      title={c.label}
                      aria-label={c.label}
                      onClick={() => setColor(c.id)}
                      style={{
                        backgroundColor: c.colorHex,
                        borderColor: isSelected ? "#ffffff" : c.borderHex,
                        boxShadow: isSelected
                          ? `0 0 0 2px #0f172a, 0 0 0 4px ${c.colorHex}, 0 4px 10px ${c.shadowColor}`
                          : `0 2px 4px ${c.shadowColor}`,
                      }}
                      className={`h-7 w-7 min-w-[28px] min-h-[28px] rounded-full flex items-center justify-center transition-all duration-150 cursor-pointer shrink-0 relative border-2 ${
                        isSelected
                          ? "scale-110 z-10"
                          : "hover:scale-115 opacity-90 hover:opacity-100"
                      }`}
                    >
                      {isSelected && (
                        <Check className={`h-4 w-4 ${c.checkColor} stroke-[3.5] drop-shadow-md animate-in zoom-in-75 duration-150`} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Pin & Favorite Toggles */}
          <div className="flex items-center gap-4 pt-1 text-xs">
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 dark:text-slate-400">
              <input
                type="checkbox"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                className="h-3.5 w-3.5 rounded text-primary focus:ring-primary"
              />
              <span className="flex items-center gap-1">
                <Pin className="h-3.5 w-3.5 text-blue-500" />
                Pin to top
              </span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 dark:text-slate-400">
              <input
                type="checkbox"
                checked={isFavorite}
                onChange={(e) => setIsFavorite(e.target.checked)}
                className="h-3.5 w-3.5 rounded text-primary focus:ring-primary"
              />
              <span className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5 text-amber-500" />
                Favorite
              </span>
            </label>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="rounded-xl text-xs gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold"
            >
              {isSubmitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Zap className="h-3.5 w-3.5" />
              )}
              <span>Save Quick Note</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

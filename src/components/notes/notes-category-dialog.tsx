"use client";

import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Folder,
  Plus,
  Trash2,
  Search,
  Wallet,
  User,
  Compass,
  Users,
  Briefcase,
  Lightbulb,
  ShoppingBag,
  Activity,
  HandCoins,
  PiggyBank,
  TrendingUp,
  Bell,
  Calendar,
  Utensils,
  Tag,
  Check,
} from "lucide-react";
import { createNoteCategory, deleteNoteCategory } from "@/actions/notes";
import { toast } from "sonner";

interface NotesCategoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  categories: any[];
  onCategoryChanged: () => void;
}

const PRESET_COLORS = [
  "#10b981", "#3b82f6", "#f97316", "#8b5cf6", 
  "#6366f1", "#eab308", "#ec4899", "#ef4444", 
  "#f43f5e", "#059669", "#7c3aed", "#d97706",
  "#06b6d4", "#84cc16", "#64748b"
];

const PRESET_ICONS = [
  { id: "Wallet", name: "Wallet", icon: Wallet },
  { id: "User", name: "User", icon: User },
  { id: "Compass", name: "Compass", icon: Compass },
  { id: "Users", name: "Users", icon: Users },
  { id: "Briefcase", name: "Briefcase", icon: Briefcase },
  { id: "Lightbulb", name: "Ideas", icon: Lightbulb },
  { id: "ShoppingBag", name: "Shopping", icon: ShoppingBag },
  { id: "Activity", name: "Medical", icon: Activity },
  { id: "HandCoins", name: "Loans", icon: HandCoins },
  { id: "PiggyBank", name: "Savings", icon: PiggyBank },
  { id: "TrendingUp", name: "Investment", icon: TrendingUp },
  { id: "Bell", name: "Reminder", icon: Bell },
  { id: "Calendar", name: "Meeting", icon: Calendar },
  { id: "Utensils", name: "Food", icon: Utensils },
  { id: "Folder", name: "Folder", icon: Folder },
];

export function NotesCategoryDialog({
  isOpen,
  onClose,
  categories,
  onCategoryChanged,
}: NotesCategoryDialogProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#10b981");
  const [selectedIcon, setSelectedIcon] = useState("Wallet");
  const [description, setDescription] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Deduplicate categories by case-insensitive name
  const deduplicatedCategories = useMemo(() => {
    const seen = new Set<string>();
    const result: any[] = [];
    for (const cat of categories) {
      const key = (cat.name || "").trim().toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        result.push(cat);
      }
    }
    return result;
  }, [categories]);

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return deduplicatedCategories;
    const q = searchQuery.trim().toLowerCase();
    return deduplicatedCategories.filter((cat) => cat.name.toLowerCase().includes(q));
  }, [deduplicatedCategories, searchQuery]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Category name is required");

    // Check duplicate
    const exists = deduplicatedCategories.some(
      (c) => c.name.trim().toLowerCase() === name.trim().toLowerCase()
    );
    if (exists) {
      return toast.error(`Category "${name.trim()}" already exists!`);
    }

    setIsSubmitting(true);
    try {
      await createNoteCategory({
        name: name.trim(),
        color,
        icon: selectedIcon,
        description: description.trim(),
      });
      toast.success("Category created!");
      setName("");
      setDescription("");
      onCategoryChanged();
    } catch (err: any) {
      toast.error(err.message || "Failed to create category");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (publicId: string) => {
    if (!confirm("Are you sure? Notes in this category will become Uncategorized.")) return;
    try {
      await deleteNoteCategory(publicId);
      toast.success("Category deleted!");
      onCategoryChanged();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete category");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-lg rounded-2xl p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <Folder className="h-5 w-5 text-primary" />
            Category Workspace Manager
          </DialogTitle>
          <DialogDescription className="text-slate-500 text-xs">
            Organize, search, create, and manage your financial note categories.
          </DialogDescription>
        </DialogHeader>

        {/* Search Bar */}
        <div className="relative my-1">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter categories by name..."
            className="pl-9 h-8 text-xs rounded-xl"
          />
        </div>

        {/* Category List */}
        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 my-1">
          {filteredCategories.map((cat) => (
            <div
              key={cat.id}
              className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-xs"
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-3 w-3 rounded-full shrink-0"
                  style={{ backgroundColor: cat.color || "#6366f1" }}
                />
                <span className="font-semibold text-slate-800 dark:text-slate-200">{cat.name}</span>
                {cat.noteCount !== undefined && (
                  <Badge variant="secondary" className="text-[10px] rounded-md px-1.5 font-mono">
                    {cat.noteCount} Notes
                  </Badge>
                )}
                {cat.isDefault && (
                  <span className="text-[10px] text-slate-400 font-mono">(System)</span>
                )}
              </div>

              {!cat.isDefault && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-rose-500 hover:text-rose-700"
                  onClick={() => handleDelete(cat.publicId)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}

          {filteredCategories.length === 0 && (
            <p className="text-center text-xs text-slate-400 py-4">No matching categories found.</p>
          )}
        </div>

        {/* Create Form */}
        <form onSubmit={handleCreate} className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <h4 className="font-semibold text-xs text-slate-700 dark:text-slate-300">+ Add Custom Category</h4>

          <div className="space-y-1">
            <Label className="text-xs">Category Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Real Estate Investments"
              className="h-8 text-xs rounded-xl"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Icon</Label>
            <div className="flex items-center gap-1.5 flex-wrap max-h-24 overflow-y-auto p-1 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
              {PRESET_ICONS.map((ic) => {
                const IconComp = ic.icon;
                const isSel = selectedIcon === ic.id;
                return (
                  <button
                    key={ic.id}
                    type="button"
                    onClick={() => setSelectedIcon(ic.id)}
                    className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 transition-all ${
                      isSel ? "border-primary bg-primary/10 text-primary font-bold" : "border-transparent text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800"
                    }`}
                  >
                    <IconComp className="h-3.5 w-3.5" />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Color Theme</Label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-5 w-5 rounded-full border transition-transform ${
                    color === c ? "scale-125 border-slate-900 dark:border-white ring-2 ring-primary/40" : "border-transparent"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="rounded-xl text-xs gap-1 bg-primary"
            >
              <Plus className="h-3.5 w-3.5" />
              Create Category
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

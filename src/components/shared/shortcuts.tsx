"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Keyboard, Command } from "lucide-react";

interface Shortcut {
  key: string;
  description: string;
  action: () => void;
}

interface ShortcutsDialogProps {
  shortcuts: Shortcut[];
  trigger?: React.ReactNode;
}

export function ShortcutsDialog({ shortcuts, trigger }: ShortcutsDialogProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "?") {
        e.preventDefault();
        setOpen(!open);
      }

      for (const shortcut of shortcuts) {
        if (e.key === shortcut.key && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
          shortcut.action();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, shortcuts]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon">
            <Keyboard className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>
            Press <kbd className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-xs">?</kbd> to toggle this dialog
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {shortcuts.map((shortcut, index) => (
            <div key={index} className="flex items-center justify-between p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800">
              <span className="text-sm">{shortcut.description}</span>
              <kbd className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-xs font-mono">
                {shortcut.key}
              </kbd>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

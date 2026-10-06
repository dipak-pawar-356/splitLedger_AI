"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Highlighter,
  Link as LinkIcon,
  Minus,
  RotateCcw,
  RotateCw,
  RemoveFormatting,
  Clock,
  FileText,
  CheckCircle2,
  Loader2,
  Table as TableIcon,
  Code,
  Smile,
  Save,
  Plus,
  Trash2,
  Copy,
  Split,
  Combine,
  Paintbrush,
  Palette,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";

interface RichTextEditorProps {
  initialContent: string;
  onChange: (content: string) => void;
  onManualSave?: () => void;
  onAutoSave?: (content: string) => void;
  readOnly?: boolean;
  saveStatus?: "saved" | "saving" | "unsaved";
  wordCount?: number;
  characterCount?: number;
  readingTime?: number;
}

const EMOJI_LIST = [
  "💰", "📈", "📉", "💡", "🚀", "📝", "⚠️", "✅", "❌", "📌",
  "🎯", "📅", "🏷️", "💼", "🛒", "🍽️", "🔒", "⭐", "🔥", "🤝",
  "📊", "💳", "🏦", "💵", "🧾", "🎉", "👀", "✨", "❤️", "👍"
];

const HIGHLIGHT_COLORS = [
  { label: "Yellow", color: "#fef08a" },
  { label: "Green", color: "#bbf7d0" },
  { label: "Blue", color: "#bfdbfe" },
  { label: "Pink", color: "#fbcfe8" },
  { label: "Orange", color: "#fed7aa" },
];

const TABLE_THEMES = [
  { name: "Professional Dark", bg: "#0f172a", text: "#f8fafc", border: "#334155" },
  { name: "Indigo Executive", bg: "#312e81", text: "#ffffff", border: "#4338ca" },
  { name: "Emerald Growth", bg: "#064e3b", text: "#ffffff", border: "#047857" },
  { name: "Amber Warm", bg: "#78350f", text: "#ffffff", border: "#b45309" },
  { name: "Minimal Light", bg: "#f1f5f9", text: "#0f172a", border: "#cbd5e1" },
];

export function RichTextEditor({
  initialContent,
  onChange,
  onManualSave,
  onAutoSave,
  readOnly = false,
  saveStatus = "saved",
  wordCount = 0,
  characterCount = 0,
  readingTime = 1,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [contentHtml, setContentHtml] = useState(initialContent || "");
  const [activeFormats, setActiveFormats] = useState<Record<string, boolean>>({});

  // Table Context Menu State
  const [tableMenu, setTableMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    cell: HTMLTableCellElement | null;
    table: HTMLTableElement | null;
  }>({ visible: false, x: 0, y: 0, cell: null, table: null });

  // Floating Table Quick Actions
  const [hoveredTable, setHoveredTable] = useState<HTMLTableElement | null>(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== initialContent) {
      editorRef.current.innerHTML = initialContent || "";
      setContentHtml(initialContent || "");
    }
  }, [initialContent]);

  // Close context menu on outside click or scroll
  useEffect(() => {
    const handleGlobalClick = (e: Event) => {
      if (!(e.target as HTMLElement)?.closest(".table-context-menu")) {
        setTableMenu((prev) => (prev.visible ? { ...prev, visible: false } : prev));
      }
    };
    const handleKeyDownGlobal = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setTableMenu((prev) => (prev.visible ? { ...prev, visible: false } : prev));
      }
    };

    window.addEventListener("click", handleGlobalClick);
    window.addEventListener("keydown", handleKeyDownGlobal);
    window.addEventListener("scroll", handleGlobalClick, true);

    return () => {
      window.removeEventListener("click", handleGlobalClick);
      window.removeEventListener("keydown", handleKeyDownGlobal);
      window.removeEventListener("scroll", handleGlobalClick, true);
    };
  }, []);

  const updateActiveFormats = () => {
    if (typeof document === "undefined") return;
    setActiveFormats({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
      strikeThrough: document.queryCommandState("strikeThrough"),
      insertUnorderedList: document.queryCommandState("insertUnorderedList"),
      insertOrderedList: document.queryCommandState("insertOrderedList"),
    });
  };

  const execCommand = useCallback(
    (command: string, value: string | null = null) => {
      if (readOnly) return;
      document.execCommand(command, false, value || undefined);
      if (editorRef.current) {
        const html = editorRef.current.innerHTML;
        setContentHtml(html);
        onChange(html);
      }
      updateActiveFormats();
    },
    [readOnly, onChange]
  );

  const handleInput = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      setContentHtml(html);
      onChange(html);
    }
    updateActiveFormats();
  };

  const focusCell = (el: HTMLElement | null) => {
    if (!el) return;
    const range = document.createRange();
    const sel = window.getSelection();
    range.selectNodeContents(el);
    range.collapse(false);
    sel?.removeAllRanges();
    sel?.addRange(range);
    el.focus();
  };

  const addLink = () => {
    const url = prompt("Enter link URL (e.g. https://example.com):");
    if (url) {
      const formatted = url.startsWith("http://") || url.startsWith("https://") ? url : `https://${url}`;
      execCommand("createLink", formatted);
    }
  };

  // 1. Spreadsheet-like Clean Table Insertion (NO "Cell 1,1" text, focuses 1st cell)
  const insertTable = (rows: number = 3, cols: number = 3, themeIndex: number = 0) => {
    if (readOnly || !editorRef.current) return;
    const theme = TABLE_THEMES[themeIndex] || TABLE_THEMES[0];

    let tableHtml = `<div class="note-table-wrapper" style="overflow-x: auto; max-width: 100%; margin: 14px 0; border-radius: 12px; border: 1px solid #e2e8f0;"><table class="note-editor-table" style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: left;"><thead style="position: sticky; top: 0; z-index: 10;"><tr>`;

    // Header Row (Empty cells, Professional Dark theme)
    for (let c = 1; c <= cols; c++) {
      tableHtml += `<th style="border: 1px solid ${theme.border}; padding: 10px 14px; background-color: ${theme.bg}; color: ${theme.text}; font-weight: 600; min-width: 110px;"><br></th>`;
    }
    tableHtml += `</tr></thead><tbody>`;

    // Body Rows (Empty cells)
    for (let r = 1; r < rows; r++) {
      tableHtml += `<tr>`;
      for (let c = 1; c <= cols; c++) {
        tableHtml += `<td style="border: 1px solid #cbd5e1; padding: 8px 12px; min-width: 110px;"><br></td>`;
      }
      tableHtml += `</tr>`;
    }
    tableHtml += `</tbody></table></div><p><br></p>`;

    execCommand("insertHTML", tableHtml);

    // Immediately focus inside the very first cell of the newly inserted table
    setTimeout(() => {
      if (editorRef.current) {
        const tables = editorRef.current.querySelectorAll("table.note-editor-table");
        const latestTable = tables[tables.length - 1];
        if (latestTable) {
          const firstCell = latestTable.querySelector("th, td") as HTMLElement;
          focusCell(firstCell);
        }
      }
    }, 40);
  };

  // Table Row / Column Operations
  const handleInsertRow = (cell: HTMLTableCellElement, table: HTMLTableElement, above: boolean) => {
    const tr = cell.closest("tr");
    if (!tr) return;
    const colCount = tr.children.length;
    const newRow = document.createElement("tr");

    for (let i = 0; i < colCount; i++) {
      const td = document.createElement("td");
      td.innerHTML = "<br>";
      td.style.cssText = "border: 1px solid #cbd5e1; padding: 8px 12px; min-width: 110px;";
      newRow.appendChild(td);
    }

    if (above) {
      tr.parentElement?.insertBefore(newRow, tr);
    } else {
      tr.parentElement?.insertBefore(newRow, tr.nextSibling);
    }

    setTableMenu((prev) => ({ ...prev, visible: false }));
    handleInput();
    const cellIdx = Math.min(cell.cellIndex, newRow.children.length - 1);
    focusCell(newRow.children[cellIdx] as HTMLElement);
  };

  const handleDeleteRow = (cell: HTMLTableCellElement, table: HTMLTableElement) => {
    const tr = cell.closest("tr");
    if (!tr) return;
    const tbody = tr.parentElement;
    tr.remove();

    if (tbody && tbody.children.length === 0) {
      table.closest(".note-table-wrapper")?.remove() || table.remove();
    }

    setTableMenu((prev) => ({ ...prev, visible: false }));
    handleInput();
  };

  const handleDuplicateRow = (cell: HTMLTableCellElement) => {
    const tr = cell.closest("tr");
    if (!tr) return;
    const clone = tr.cloneNode(true) as HTMLTableRowElement;
    tr.parentElement?.insertBefore(clone, tr.nextSibling);
    setTableMenu((prev) => ({ ...prev, visible: false }));
    handleInput();
  };

  const handleInsertColumn = (cell: HTMLTableCellElement, table: HTMLTableElement, left: boolean) => {
    const colIdx = cell.cellIndex;
    const rows = table.rows;

    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      const isHeader = row.children[0]?.tagName.toLowerCase() === "th";
      const newCell = document.createElement(isHeader ? "th" : "td");
      newCell.innerHTML = "<br>";

      if (isHeader) {
        const sampleTh = row.querySelector("th");
        const bg = sampleTh?.style.backgroundColor || "#0f172a";
        const color = sampleTh?.style.color || "#f8fafc";
        const border = sampleTh?.style.borderColor || "#334155";
        newCell.style.cssText = `border: 1px solid ${border}; padding: 10px 14px; background-color: ${bg}; color: ${color}; font-weight: 600; min-width: 110px;`;
      } else {
        newCell.style.cssText = "border: 1px solid #cbd5e1; padding: 8px 12px; min-width: 110px;";
      }

      const refCell = row.children[left ? colIdx : colIdx + 1];
      row.insertBefore(newCell, refCell || null);
    }

    setTableMenu((prev) => ({ ...prev, visible: false }));
    handleInput();
  };

  const handleDeleteColumn = (cell: HTMLTableCellElement, table: HTMLTableElement) => {
    const colIdx = cell.cellIndex;
    const rows = table.rows;

    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      if (row.children[colIdx]) {
        row.children[colIdx].remove();
      }
    }

    if (rows[0] && rows[0].children.length === 0) {
      table.closest(".note-table-wrapper")?.remove() || table.remove();
    }

    setTableMenu((prev) => ({ ...prev, visible: false }));
    handleInput();
  };

  const handleDuplicateColumn = (cell: HTMLTableCellElement, table: HTMLTableElement) => {
    const colIdx = cell.cellIndex;
    const rows = table.rows;

    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      const targetCell = row.children[colIdx];
      if (targetCell) {
        const clone = targetCell.cloneNode(true) as HTMLElement;
        row.insertBefore(clone, targetCell.nextSibling);
      }
    }

    setTableMenu((prev) => ({ ...prev, visible: false }));
    handleInput();
  };

  const handleToggleHeader = (table: HTMLTableElement) => {
    if (table.rows.length === 0) return;
    const firstRow = table.rows[0];
    const isCurrentlyHeader = firstRow.children[0]?.tagName.toLowerCase() === "th";
    const newRow = document.createElement("tr");

    for (let i = 0; i < firstRow.children.length; i++) {
      const oldCell = firstRow.children[i] as HTMLElement;
      const newCell = document.createElement(isCurrentlyHeader ? "td" : "th");
      newCell.innerHTML = oldCell.innerHTML || "<br>";

      if (!isCurrentlyHeader) {
        newCell.style.cssText = "border: 1px solid #334155; padding: 10px 14px; background-color: #0f172a; color: #f8fafc; font-weight: 600; min-width: 110px;";
      } else {
        newCell.style.cssText = "border: 1px solid #cbd5e1; padding: 8px 12px; min-width: 110px;";
      }
      newRow.appendChild(newCell);
    }

    firstRow.replaceWith(newRow);
    setTableMenu((prev) => ({ ...prev, visible: false }));
    handleInput();
  };

  const handleApplyTableTheme = (table: HTMLTableElement, theme: typeof TABLE_THEMES[0]) => {
    const ths = table.querySelectorAll("th");
    ths.forEach((th) => {
      (th as HTMLElement).style.backgroundColor = theme.bg;
      (th as HTMLElement).style.color = theme.text;
      (th as HTMLElement).style.borderColor = theme.border;
    });
    setTableMenu((prev) => ({ ...prev, visible: false }));
    handleInput();
  };

  const handleMergeCells = (cell: HTMLTableCellElement) => {
    const next = cell.nextElementSibling as HTMLTableCellElement | null;
    if (next) {
      cell.colSpan = (cell.colSpan || 1) + (next.colSpan || 1);
      if (next.textContent?.trim()) {
        cell.innerHTML = `${cell.innerHTML} ${next.innerHTML}`;
      }
      next.remove();
      setTableMenu((prev) => ({ ...prev, visible: false }));
      handleInput();
    }
  };

  const handleSplitCells = (cell: HTMLTableCellElement) => {
    const span = cell.colSpan || 1;
    if (span > 1) {
      cell.colSpan = 1;
      const isHeader = cell.tagName.toLowerCase() === "th";
      for (let i = 1; i < span; i++) {
        const newCell = document.createElement(isHeader ? "th" : "td");
        newCell.innerHTML = "<br>";
        newCell.style.cssText = isHeader
          ? "border: 1px solid #334155; padding: 10px 14px; background-color: #0f172a; color: #f8fafc; font-weight: 600; min-width: 110px;"
          : "border: 1px solid #cbd5e1; padding: 8px 12px; min-width: 110px;";
        cell.parentElement?.insertBefore(newCell, cell.nextSibling);
      }
      setTableMenu((prev) => ({ ...prev, visible: false }));
      handleInput();
    }
  };

  const handleDeleteTable = (table: HTMLTableElement) => {
    table.closest(".note-table-wrapper")?.remove() || table.remove();
    setTableMenu((prev) => ({ ...prev, visible: false }));
    handleInput();
  };

  // Right-Click Context Menu Trigger
  const handleEditorContextMenu = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const cell = target.closest("td, th") as HTMLTableCellElement | null;
    const table = target.closest("table") as HTMLTableElement | null;

    if (cell && table) {
      e.preventDefault();
      setTableMenu({
        visible: true,
        x: Math.min(e.clientX, window.innerWidth - 240),
        y: Math.min(e.clientY, window.innerHeight - 360),
        cell,
        table,
      });
    } else {
      setTableMenu((prev) => ({ ...prev, visible: false }));
    }
  };

  const insertCodeBlock = () => {
    if (readOnly || !editorRef.current) return;
    const codeHtml = `<pre style="background:#0f172a; color:#f8fafc; padding:12px 16px; border-radius:12px; font-family:monospace; font-size:12px; overflow-x:auto; margin:12px 0;"><code>// Write notes or code snippet...\n</code></pre><p><br></p>`;
    execCommand("insertHTML", codeHtml);
  };

  const insertEmoji = (emoji: string) => {
    execCommand("insertText", emoji);
  };

  // Keyboard Shortcuts & Spreadsheet Table Navigation (Tab, Shift+Tab, Arrow Keys)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const isModifier = e.ctrlKey || e.metaKey;

    if (isModifier && e.key.toLowerCase() === "s") {
      e.preventDefault();
      if (onManualSave) {
        onManualSave();
      }
      return;
    } else if (isModifier && e.key.toLowerCase() === "b") {
      e.preventDefault();
      execCommand("bold");
      return;
    } else if (isModifier && e.key.toLowerCase() === "i") {
      e.preventDefault();
      execCommand("italic");
      return;
    } else if (isModifier && e.key.toLowerCase() === "u") {
      e.preventDefault();
      execCommand("underline");
      return;
    } else if (isModifier && e.key.toLowerCase() === "k") {
      e.preventDefault();
      addLink();
      return;
    }

    // Spreadsheet Navigation inside Tables
    const sel = window.getSelection();
    const anchorNode = sel?.anchorNode;
    const cellElement = (
      anchorNode instanceof HTMLElement ? anchorNode : anchorNode?.parentElement
    )?.closest("td, th") as HTMLTableCellElement | null;

    if (cellElement) {
      const row = cellElement.parentElement as HTMLTableRowElement | null;
      const table = cellElement.closest("table") as HTMLTableElement | null;

      if (e.key === "Tab" && row && table) {
        e.preventDefault();
        if (!e.shiftKey) {
          // Tab forward
          const nextInRow = cellElement.nextElementSibling as HTMLElement | null;
          if (nextInRow) {
            focusCell(nextInRow);
          } else {
            const nextRow = row.nextElementSibling as HTMLTableRowElement | null;
            if (nextRow && nextRow.firstElementChild) {
              focusCell(nextRow.firstElementChild as HTMLElement);
            } else {
              // At the very last cell of the table! Automatically add a new row!
              const colCount = row.children.length;
              const newRow = document.createElement("tr");
              for (let i = 0; i < colCount; i++) {
                const td = document.createElement("td");
                td.innerHTML = "<br>";
                td.style.cssText = "border: 1px solid #cbd5e1; padding: 8px 12px; min-width: 110px;";
                newRow.appendChild(td);
              }
              (row.parentElement || table).appendChild(newRow);
              handleInput();
              focusCell(newRow.firstElementChild as HTMLElement);
            }
          }
        } else {
          // Shift + Tab backward
          const prevInRow = cellElement.previousElementSibling as HTMLElement | null;
          if (prevInRow) {
            focusCell(prevInRow);
          } else {
            const prevRow = row.previousElementSibling as HTMLTableRowElement | null;
            if (prevRow && prevRow.lastElementChild) {
              focusCell(prevRow.lastElementChild as HTMLElement);
            }
          }
        }
      } else if (e.key === "ArrowUp" && row) {
        const prevRow = row.previousElementSibling as HTMLTableRowElement | null;
        if (prevRow) {
          const targetCell = prevRow.children[cellElement.cellIndex] as HTMLElement | null;
          if (targetCell) {
            e.preventDefault();
            focusCell(targetCell);
          }
        }
      } else if (e.key === "ArrowDown" && row) {
        const nextRow = row.nextElementSibling as HTMLTableRowElement | null;
        if (nextRow) {
          const targetCell = nextRow.children[cellElement.cellIndex] as HTMLElement | null;
          if (targetCell) {
            e.preventDefault();
            focusCell(targetCell);
          }
        }
      }
    }
  };

  return (
    <div className="relative flex flex-col h-full border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm transition-all focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20">
      {/* Editor Toolbar */}
      {!readOnly && (
        <div className="flex items-center gap-1 flex-wrap p-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-200 backdrop-blur-xs select-none">
          {/* Text Styling */}
          <Button
            type="button"
            variant={activeFormats.bold ? "secondary" : "ghost"}
            size="sm"
            className="h-8 w-8 p-0 hover:bg-slate-200 dark:hover:bg-slate-800"
            title="Bold (Ctrl+B)"
            aria-label="Bold"
            onClick={() => execCommand("bold")}
          >
            <Bold className="h-4 w-4 font-bold" />
          </Button>

          <Button
            type="button"
            variant={activeFormats.italic ? "secondary" : "ghost"}
            size="sm"
            className="h-8 w-8 p-0 hover:bg-slate-200 dark:hover:bg-slate-800"
            title="Italic (Ctrl+I)"
            aria-label="Italic"
            onClick={() => execCommand("italic")}
          >
            <Italic className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            variant={activeFormats.underline ? "secondary" : "ghost"}
            size="sm"
            className="h-8 w-8 p-0 hover:bg-slate-200 dark:hover:bg-slate-800"
            title="Underline (Ctrl+U)"
            aria-label="Underline"
            onClick={() => execCommand("underline")}
          >
            <Underline className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            variant={activeFormats.strikeThrough ? "secondary" : "ghost"}
            size="sm"
            className="h-8 w-8 p-0 hover:bg-slate-200 dark:hover:bg-slate-800"
            title="Strikethrough"
            aria-label="Strikethrough"
            onClick={() => execCommand("strikeThrough")}
          >
            <Strikethrough className="h-4 w-4" />
          </Button>

          <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-1 shrink-0" />

          {/* Headings */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 font-bold hover:bg-slate-200 dark:hover:bg-slate-800"
            title="Heading 1"
            aria-label="Heading 1"
            onClick={() => execCommand("formatBlock", "<h1>")}
          >
            <Heading1 className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 font-semibold hover:bg-slate-200 dark:hover:bg-slate-800"
            title="Heading 2"
            aria-label="Heading 2"
            onClick={() => execCommand("formatBlock", "<h2>")}
          >
            <Heading2 className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-slate-200 dark:hover:bg-slate-800"
            title="Heading 3"
            aria-label="Heading 3"
            onClick={() => execCommand("formatBlock", "<h3>")}
          >
            <Heading3 className="h-4 w-4" />
          </Button>

          <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-1 shrink-0" />

          {/* Lists & Quotes */}
          <Button
            type="button"
            variant={activeFormats.insertUnorderedList ? "secondary" : "ghost"}
            size="sm"
            className="h-8 w-8 p-0 hover:bg-slate-200 dark:hover:bg-slate-800"
            title="Bullet List"
            aria-label="Bullet List"
            onClick={() => execCommand("insertUnorderedList")}
          >
            <List className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            variant={activeFormats.insertOrderedList ? "secondary" : "ghost"}
            size="sm"
            className="h-8 w-8 p-0 hover:bg-slate-200 dark:hover:bg-slate-800"
            title="Numbered List"
            aria-label="Numbered List"
            onClick={() => execCommand("insertOrderedList")}
          >
            <ListOrdered className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-slate-200 dark:hover:bg-slate-800"
            title="Blockquote"
            aria-label="Blockquote"
            onClick={() => execCommand("formatBlock", "<blockquote>")}
          >
            <Quote className="h-4 w-4" />
          </Button>

          <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-1 shrink-0" />

          {/* Highlighter Color Picker */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-slate-200 dark:hover:bg-slate-800"
                title="Highlight Text"
                aria-label="Highlight Text"
              >
                <Highlighter className="h-4 w-4 text-amber-500" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="p-2 space-y-1">
              <span className="text-[10px] font-semibold text-slate-400 px-2 uppercase">Highlight Colors</span>
              {HIGHLIGHT_COLORS.map((h) => (
                <DropdownMenuItem
                  key={h.color}
                  onClick={() => execCommand("backColor", h.color)}
                  className="flex items-center gap-2 text-xs cursor-pointer py-1.5"
                >
                  <span className="h-3.5 w-3.5 rounded-full border border-slate-300 shrink-0" style={{ backgroundColor: h.color }} />
                  <span>{h.label}</span>
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem
                onClick={() => execCommand("backColor", "transparent")}
                className="text-xs cursor-pointer text-slate-500 py-1.5"
              >
                Clear Highlight
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Spreadsheet Table Insertion Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-slate-200 dark:hover:bg-slate-800"
                title="Insert Spreadsheet Table"
                aria-label="Insert Table"
              >
                <TableIcon className="h-4 w-4 text-emerald-600" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="p-1 min-w-[180px]">
              <span className="text-[10px] font-semibold text-slate-400 px-2 py-1 block uppercase">Insert Table (Empty)</span>
              <DropdownMenuItem onClick={() => insertTable(3, 2)} className="text-xs cursor-pointer">
                2 Columns × 2 Rows
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => insertTable(4, 3)} className="text-xs cursor-pointer">
                3 Columns × 3 Rows
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => insertTable(5, 4)} className="text-xs cursor-pointer">
                4 Columns × 4 Rows
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => insertTable(6, 5)} className="text-xs cursor-pointer">
                5 Columns × 5 Rows
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="text-xs cursor-pointer gap-2">
                  <Palette className="h-3.5 w-3.5 text-indigo-500" />
                  <span>Themes</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="p-1 min-w-[160px]">
                  {TABLE_THEMES.map((theme, idx) => (
                    <DropdownMenuItem
                      key={theme.name}
                      onClick={() => insertTable(3, 3, idx)}
                      className="text-xs cursor-pointer flex items-center gap-2"
                    >
                      <span className="h-3 w-3 rounded-full border border-slate-300" style={{ backgroundColor: theme.bg }} />
                      <span>{theme.name}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Code Block */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-slate-200 dark:hover:bg-slate-800"
            title="Insert Code Snippet"
            aria-label="Insert Code Block"
            onClick={insertCodeBlock}
          >
            <Code className="h-4 w-4 text-indigo-500" />
          </Button>

          {/* Emoji Picker */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-slate-200 dark:hover:bg-slate-800"
                title="Insert Emoji"
                aria-label="Insert Emoji"
              >
                <Smile className="h-4 w-4 text-amber-500" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="p-2 w-64">
              <div className="grid grid-cols-6 gap-1.5">
                {EMOJI_LIST.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => insertEmoji(emoji)}
                    className="h-8 w-8 flex items-center justify-center text-lg hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-transform hover:scale-110 active:scale-95"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Link */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-slate-200 dark:hover:bg-slate-800"
            title="Add Link (Ctrl+K)"
            aria-label="Add Link"
            onClick={addLink}
          >
            <LinkIcon className="h-4 w-4 text-blue-500" />
          </Button>

          {/* Horizontal Line */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-slate-200 dark:hover:bg-slate-800"
            title="Horizontal Divider"
            aria-label="Horizontal Line"
            onClick={() => execCommand("insertHorizontalRule")}
          >
            <Minus className="h-4 w-4" />
          </Button>

          <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-1 shrink-0" />

          {/* Undo / Redo */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-slate-200 dark:hover:bg-slate-800"
            title="Undo (Ctrl+Z)"
            aria-label="Undo"
            onClick={() => execCommand("undo")}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-slate-200 dark:hover:bg-slate-800"
            title="Redo (Ctrl+Y)"
            aria-label="Redo"
            onClick={() => execCommand("redo")}
          >
            <RotateCw className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-slate-200 dark:hover:bg-slate-800"
            title="Clear Formatting"
            aria-label="Clear Formatting"
            onClick={() => execCommand("removeFormat")}
          >
            <RemoveFormatting className="h-4 w-4" />
          </Button>

          {/* Manual Save Button */}
          <div className="ml-auto flex items-center gap-1.5">
            {onManualSave && (
              <Button
                type="button"
                size="sm"
                variant={saveStatus === "unsaved" ? "default" : "outline"}
                className={`h-7 text-xs rounded-xl px-2.5 gap-1.5 font-medium transition-all ${
                  saveStatus === "unsaved"
                    ? "bg-primary text-white shadow-xs animate-pulse"
                    : "text-slate-600 dark:text-slate-300"
                }`}
                title="Save Now (Ctrl+S)"
                aria-label="Save Note"
                onClick={onManualSave}
                disabled={saveStatus === "saving"}
              >
                {saveStatus === "saving" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                <span>Save</span>
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Editable Canvas */}
      <div
        ref={editorRef}
        contentEditable={!readOnly}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onKeyUp={updateActiveFormats}
        onMouseUp={updateActiveFormats}
        onContextMenu={handleEditorContextMenu}
        className="flex-1 p-5 outline-none overflow-y-auto prose dark:prose-invert max-w-none text-slate-800 dark:text-slate-100 min-h-[280px] focus:outline-none"
        style={{ minHeight: "280px" }}
      />

      {/* Floating Spreadsheet Table Context Menu */}
      {tableMenu.visible && tableMenu.cell && tableMenu.table && (
        <div
          className="table-context-menu fixed z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-1.5 min-w-[210px] text-xs animate-in fade-in zoom-in-95 duration-100"
          style={{ top: tableMenu.y, left: tableMenu.x }}
        >
          <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 mb-1 flex items-center justify-between">
            <span>Table Controls</span>
            <span className="font-mono text-primary font-semibold">Row {((tableMenu.cell.parentElement as HTMLTableRowElement)?.rowIndex ?? 0) + 1}, Col {tableMenu.cell.cellIndex + 1}</span>
          </div>

          <button
            type="button"
            onClick={() => handleInsertRow(tableMenu.cell!, tableMenu.table!, true)}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-left font-medium"
          >
            <ArrowUp className="h-3.5 w-3.5 text-blue-500" />
            <span>Insert Row Above</span>
          </button>

          <button
            type="button"
            onClick={() => handleInsertRow(tableMenu.cell!, tableMenu.table!, false)}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-left font-medium"
          >
            <ArrowDown className="h-3.5 w-3.5 text-blue-500" />
            <span>Insert Row Below</span>
          </button>

          <button
            type="button"
            onClick={() => handleDuplicateRow(tableMenu.cell!)}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-left font-medium"
          >
            <Copy className="h-3.5 w-3.5 text-slate-500" />
            <span>Duplicate Row</span>
          </button>

          <button
            type="button"
            onClick={() => handleDeleteRow(tableMenu.cell!, tableMenu.table!)}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 text-left font-medium"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Delete Row</span>
          </button>

          <div className="h-px bg-slate-100 dark:border-slate-800 my-1" />

          <button
            type="button"
            onClick={() => handleInsertColumn(tableMenu.cell!, tableMenu.table!, true)}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-left font-medium"
          >
            <ArrowLeft className="h-3.5 w-3.5 text-emerald-500" />
            <span>Insert Column Left</span>
          </button>

          <button
            type="button"
            onClick={() => handleInsertColumn(tableMenu.cell!, tableMenu.table!, false)}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-left font-medium"
          >
            <ArrowRight className="h-3.5 w-3.5 text-emerald-500" />
            <span>Insert Column Right</span>
          </button>

          <button
            type="button"
            onClick={() => handleDuplicateColumn(tableMenu.cell!, tableMenu.table!)}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-left font-medium"
          >
            <Copy className="h-3.5 w-3.5 text-slate-500" />
            <span>Duplicate Column</span>
          </button>

          <button
            type="button"
            onClick={() => handleDeleteColumn(tableMenu.cell!, tableMenu.table!)}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 text-left font-medium"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Delete Column</span>
          </button>

          <div className="h-px bg-slate-100 dark:border-slate-800 my-1" />

          <button
            type="button"
            onClick={() => handleToggleHeader(tableMenu.table!)}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-left font-medium"
          >
            <Paintbrush className="h-3.5 w-3.5 text-indigo-500" />
            <span>Toggle Header Row</span>
          </button>

          {/* Theme Palette Submenu inside context menu */}
          <div className="px-2.5 py-1.5 text-[11px] text-slate-500">
            <span className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Header Theme</span>
            <div className="flex items-center gap-1.5">
              {TABLE_THEMES.map((theme) => (
                <button
                  key={theme.name}
                  type="button"
                  onClick={() => handleApplyTableTheme(tableMenu.table!, theme)}
                  className="h-4 w-4 rounded-full border border-slate-300 hover:scale-125 transition-transform"
                  style={{ backgroundColor: theme.bg }}
                  title={theme.name}
                />
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleMergeCells(tableMenu.cell!)}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-left font-medium"
          >
            <Combine className="h-3.5 w-3.5 text-purple-500" />
            <span>Merge Right Cell</span>
          </button>

          {(tableMenu.cell.colSpan || 1) > 1 && (
            <button
              type="button"
              onClick={() => handleSplitCells(tableMenu.cell!)}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-left font-medium"
            >
              <Split className="h-3.5 w-3.5 text-purple-500" />
              <span>Split Cells</span>
            </button>
          )}

          <div className="h-px bg-slate-100 dark:border-slate-800 my-1" />

          <button
            type="button"
            onClick={() => handleDeleteTable(tableMenu.table!)}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 text-left font-semibold"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Delete Table</span>
          </button>
        </div>
      )}

      {/* Footer Info & Auto-Save Indicator */}
      <div className="flex items-center justify-between px-4 py-2 text-xs border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 text-slate-500 select-none">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <span className="flex items-center gap-1 text-[11px]">
            <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <strong>{wordCount}</strong> words
          </span>
          <span className="hidden sm:inline">•</span>
          <span className="text-[11px]">
            <strong>{characterCount}</strong> chars
          </span>
          <span className="hidden sm:inline">•</span>
          <span className="flex items-center gap-1 text-[11px]">
            <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            {readingTime} min read
          </span>
        </div>

        {/* Auto Save Feedback */}
        <div className="flex items-center gap-2 shrink-0">
          {saveStatus === "saving" && (
            <Badge variant="outline" className="gap-1 border-amber-200 text-amber-700 bg-amber-50 dark:bg-amber-950/20 text-[10px]">
              <Loader2 className="h-3 w-3 animate-spin" />
              Saving...
            </Badge>
          )}
          {saveStatus === "saved" && (
            <Badge variant="outline" className="gap-1 border-emerald-200 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/20 text-[10px]">
              <CheckCircle2 className="h-3 w-3" />
              Saved
            </Badge>
          )}
          {saveStatus === "unsaved" && (
            <Badge variant="outline" className="gap-1 border-slate-300 text-slate-600 dark:bg-slate-800 text-[10px]">
              Unsaved
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Download,
  Printer,
  FileText,
  FileSpreadsheet,
  FileCode,
  FileCheck2,
  CheckCircle2,
  Sparkles,
  Layout,
  Palette,
  Eye,
  Loader2,
  RefreshCw,
  Sliders,
  DollarSign,
  TrendingUp,
  Receipt,
  HelpCircle,
} from "lucide-react";
import { exportNoteDocument, recordNotePrintActivity, type ExportNoteOptions } from "@/actions/notes";
import {
  extractExpensesFromNote,
  getNoteFinancialSummary,
  type ExtractedNoteExpense,
  type NoteFinancialSummary,
} from "@/lib/notes/financial-note-analyzer";
import { toast } from "sonner";

interface ExportDocumentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  note: any;
  overrideTitle?: string;
  overrideContent?: string;
}

type ExportFormat = "pdf" | "docx" | "markdown" | "txt" | "csv" | "json";

const FORMAT_OPTIONS: {
  id: ExportFormat;
  label: string;
  ext: string;
  desc: string;
  icon: any;
  color: string;
}[] = [
  {
    id: "pdf",
    label: "PDF Report",
    ext: ".pdf",
    desc: "Publication-grade accounting layout with print pagination",
    icon: FileText,
    color: "text-rose-500",
  },
  {
    id: "docx",
    label: "Word Document",
    ext: ".docx",
    desc: "Microsoft Word document with formatted financial tables",
    icon: FileCheck2,
    color: "text-blue-500",
  },
  {
    id: "markdown",
    label: "Markdown",
    ext: ".md",
    desc: "GitHub flavored Markdown with breakdown tables",
    icon: FileCode,
    color: "text-emerald-500",
  },
  {
    id: "txt",
    label: "Plain Text",
    ext: ".txt",
    desc: "Clean ASCII financial report with itemized columns",
    icon: FileText,
    color: "text-slate-400",
  },
  {
    id: "csv",
    label: "CSV Spreadsheet",
    ext: ".csv",
    desc: "Structured comma-separated rows for Excel & Sheets",
    icon: FileSpreadsheet,
    color: "text-amber-500",
  },
  {
    id: "json",
    label: "Structured JSON",
    ext: ".json",
    desc: "Raw audited JSON payload for programmatic systems",
    icon: FileCode,
    color: "text-purple-500",
  },
];

export function ExportDocumentDialog({
  isOpen,
  onClose,
  note,
  overrideTitle,
  overrideContent,
}: ExportDocumentDialogProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>("pdf");
  const [paperSize, setPaperSize] = useState<"a4" | "letter" | "legal">("a4");
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const [theme, setTheme] = useState<"print" | "light" | "dark">("print");

  // Section options
  const [includeFinancialSummary, setIncludeFinancialSummary] = useState(true);
  const [includeIncomeTransactions, setIncludeIncomeTransactions] = useState(true);
  const [includeExpenseTransactions, setIncludeExpenseTransactions] = useState(true);
  const [includeReceivables, setIncludeReceivables] = useState(true);
  const [includePayables, setIncludePayables] = useState(true);
  const [includeMonthlyStats, setIncludeMonthlyStats] = useState(true);
  const [includeOriginalNote, setIncludeOriginalNote] = useState(true);
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [includeActivitySummary, setIncludeActivitySummary] = useState(false);

  // Live preview state
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [showPreviewMobile, setShowPreviewMobile] = useState(false);

  // Dynamic real-time financial calculation
  const noteContentToUse = overrideContent !== undefined ? overrideContent : note?.content || note?.plainText || "";
  const noteTitleToUse = overrideTitle !== undefined ? overrideTitle : note?.title || "Untitled Note";

  const extractedData = useMemo(() => {
    if (!noteContentToUse) return { items: [], summary: null };
    const items: ExtractedNoteExpense[] = extractExpensesFromNote(
      noteContentToUse,
      note?.createdAt ? new Date(note.createdAt) : new Date(),
      note?.id,
      noteTitleToUse
    );
    const summary: NoteFinancialSummary = getNoteFinancialSummary(items, noteTitleToUse);
    return { items, summary };
  }, [noteContentToUse, note?.createdAt, note?.id, noteTitleToUse]);

  const { items: extractedItems, summary: financialSummary } = extractedData;

  const currentOptions: ExportNoteOptions = useMemo(
    () => ({
      includeFinancialSummary,
      includeIncomeTransactions,
      includeExpenseTransactions,
      includeReceivables,
      includePayables,
      includeMonthlyStats,
      includeOriginalNote,
      includeMetadata,
      includeActivitySummary,
      paperSize,
      orientation,
      theme,
      overrideTitle: noteTitleToUse,
      overrideContent: noteContentToUse,
    }),
    [
      includeFinancialSummary,
      includeIncomeTransactions,
      includeExpenseTransactions,
      includeReceivables,
      includePayables,
      includeMonthlyStats,
      includeOriginalNote,
      includeMetadata,
      includeActivitySummary,
      paperSize,
      orientation,
      theme,
      noteTitleToUse,
      noteContentToUse,
    ]
  );

  // Generate live preview with debouncing
  useEffect(() => {
    if (!isOpen || !note?.publicId) return;

    let isMounted = true;
    setIsPreviewLoading(true);

    const timer = setTimeout(async () => {
      try {
        const res = await exportNoteDocument("pdf", note.publicId, currentOptions);
        if (isMounted) {
          setPreviewHtml(res.content);
        }
      } catch (err) {
        console.error("Preview generation failed:", err);
      } finally {
        if (isMounted) setIsPreviewLoading(false);
      }
    }, 250);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [isOpen, note?.publicId, currentOptions]);

  // Execute export download
  const handleExport = async () => {
    if (!note?.publicId) return;
    setIsExporting(true);

    try {
      const res = await exportNoteDocument(selectedFormat, note.publicId, currentOptions);

      if (selectedFormat === "pdf") {
        // Open printable dialog with pre-styled print media
        const win = window.open("", "_blank");
        if (win) {
          win.document.open();
          win.document.write(res.content);
          win.document.close();
          win.focus();
          setTimeout(() => {
            win.print();
          }, 350);
          toast.success("Opened print/save dialog for PDF");
        } else {
          // Fallback to HTML blob download if popup is blocked
          const blob = new Blob([res.content], { type: "text/html" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = res.filename.replace(/\.pdf$/, ".html");
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          toast.info("Popup blocked. Downloaded printable document as HTML.");
        }
      } else {
        const blob = new Blob([res.content], { type: res.mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = res.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success(`Exported ${res.filename} successfully`);
      }

      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to export document");
    } finally {
      setIsExporting(false);
    }
  };

  // Instant Print
  const handleDirectPrint = async () => {
    if (!note?.publicId) return;
    setIsPrinting(true);

    try {
      const printOptions: ExportNoteOptions = {
        ...currentOptions,
        theme: "print",
        paperSize: "a4",
        orientation: "portrait",
      };

      const res = await exportNoteDocument("pdf", note.publicId, printOptions);
      recordNotePrintActivity(note.publicId).catch(() => {});

      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      iframe.style.visibility = "hidden";
      document.body.appendChild(iframe);

      const frameDoc = iframe.contentWindow?.document;
      if (frameDoc) {
        frameDoc.open();
        frameDoc.write(res.content);
        frameDoc.close();

        setTimeout(() => {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }, 3000);
        }, 350);
      }

      toast.success("Sent document to printer");
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Print preparation failed");
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-6xl max-h-[92vh] rounded-2xl p-6 border-slate-200 dark:border-slate-800 flex flex-col gap-0 overflow-hidden bg-white dark:bg-slate-950">
        <DialogHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary/10 rounded-xl text-primary">
                <Download className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  Export Document & Financial Report
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Customizable publication-grade reporting strictly isolated to “{noteTitleToUse}”
                </DialogDescription>
              </div>
            </div>

            {/* Reconciliation Validation Pill */}
            {financialSummary && (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>
                  Audit: Income ₹{financialSummary.totalIncome.toLocaleString("en-IN", { minimumFractionDigits: 0 })} • Expense ₹{financialSummary.totalExpense.toLocaleString("en-IN", { minimumFractionDigits: 0 })} • Net {financialSummary.netCashflow >= 0 ? "+" : ""}₹{financialSummary.netCashflow.toLocaleString("en-IN", { minimumFractionDigits: 0 })}
                </span>
              </div>
            )}
          </div>
        </DialogHeader>

        {/* Main Content: Split View Controls & Live Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 py-4 flex-1 overflow-hidden min-h-0">
          {/* Left Column: Configuration Controls (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-4 overflow-y-auto pr-1">
            {/* Format Selection */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 block">
                Export Format
              </label>
              <div className="grid grid-cols-2 gap-2">
                {FORMAT_OPTIONS.map((f) => {
                  const Icon = f.icon;
                  const isSelected = selectedFormat === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setSelectedFormat(f.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                        isSelected
                          ? "border-primary bg-primary/5 dark:bg-primary/10 shadow-sm ring-1 ring-primary/40"
                          : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40"
                      }`}
                    >
                      <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${f.color}`} />
                      <div className="overflow-hidden">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                            {f.label}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">{f.ext}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">{f.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Page & Style Layout (Shown for PDF / DOCX) */}
            {(selectedFormat === "pdf" || selectedFormat === "docx") && (
              <div className="p-3 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 space-y-3">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Layout className="h-3.5 w-3.5 text-primary" />
                  <span>Page Setup & Styling</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-500 block mb-1">Paper Size</span>
                    <select
                      value={paperSize}
                      onChange={(e) => setPaperSize(e.target.value as any)}
                      className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="a4">A4 (Standard)</option>
                      <option value="letter">Letter (US)</option>
                      <option value="legal">Legal</option>
                    </select>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 block mb-1">Orientation</span>
                    <select
                      value={orientation}
                      onChange={(e) => setOrientation(e.target.value as any)}
                      className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="portrait">Portrait</option>
                      <option value="landscape">Landscape</option>
                    </select>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 block mb-1">Theme</span>
                    <select
                      value={theme}
                      onChange={(e) => setTheme(e.target.value as any)}
                      className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="print">Print Friendly</option>
                      <option value="light">Modern Light</option>
                      <option value="dark">Dark Slate</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Document Content Sections Checklist */}
            <div className="p-3 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 space-y-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Sliders className="h-3.5 w-3.5 text-primary" />
                  Included Sections
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {extractedItems.length} parsed items
                </span>
              </div>

              <div className="space-y-1.5 text-xs">
                <label className="flex items-center gap-2 cursor-pointer hover:text-slate-900 dark:hover:text-slate-100 py-0.5">
                  <Checkbox
                    checked={includeFinancialSummary}
                    onCheckedChange={(c) => setIncludeFinancialSummary(Boolean(c))}
                  />
                  <span>Financial Summary KPI Cards</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer hover:text-slate-900 dark:hover:text-slate-100 py-0.5">
                  <Checkbox
                    checked={includeIncomeTransactions}
                    onCheckedChange={(c) => setIncludeIncomeTransactions(Boolean(c))}
                  />
                  <span>Income Transactions Table</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer hover:text-slate-900 dark:hover:text-slate-100 py-0.5">
                  <Checkbox
                    checked={includeExpenseTransactions}
                    onCheckedChange={(c) => setIncludeExpenseTransactions(Boolean(c))}
                  />
                  <span>Expense Transactions Table</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer hover:text-slate-900 dark:hover:text-slate-100 py-0.5">
                  <Checkbox
                    checked={includeReceivables && includePayables}
                    onCheckedChange={(c) => {
                      setIncludeReceivables(Boolean(c));
                      setIncludePayables(Boolean(c));
                    }}
                  />
                  <span>Receivables & Payables Sections</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer hover:text-slate-900 dark:hover:text-slate-100 py-0.5">
                  <Checkbox
                    checked={includeMonthlyStats}
                    onCheckedChange={(c) => setIncludeMonthlyStats(Boolean(c))}
                  />
                  <span>Monthly Analytics & Spending Statistics</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer hover:text-slate-900 dark:hover:text-slate-100 py-0.5">
                  <Checkbox
                    checked={includeOriginalNote}
                    onCheckedChange={(c) => setIncludeOriginalNote(Boolean(c))}
                  />
                  <span>Original Note Content Transcript</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer hover:text-slate-900 dark:hover:text-slate-100 py-0.5">
                  <Checkbox
                    checked={includeMetadata}
                    onCheckedChange={(c) => setIncludeMetadata(Boolean(c))}
                  />
                  <span>Metadata (Author, Category, Tags, Timestamps)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer hover:text-slate-900 dark:hover:text-slate-100 py-0.5">
                  <Checkbox
                    checked={includeActivitySummary}
                    onCheckedChange={(c) => setIncludeActivitySummary(Boolean(c))}
                  />
                  <span>Audit Activity Trail Log</span>
                </label>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Live Document Preview (7 cols) */}
          <div className="lg:col-span-7 flex flex-col h-full border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-100/70 dark:bg-slate-950/50">
            {/* Preview Toolbar */}
            <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300">
                <Eye className="h-3.5 w-3.5 text-primary" />
                <span>Live Document Preview</span>
                <span className="text-[10px] text-slate-400 font-mono">({paperSize.toUpperCase()} • {orientation})</span>
              </div>
              <div className="flex items-center gap-2">
                {isPreviewLoading && (
                  <span className="flex items-center gap-1 text-[11px] text-primary">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Rendering...
                  </span>
                )}
                <Badge variant="outline" className="text-[10px] font-mono capitalize">
                  {theme} theme
                </Badge>
              </div>
            </div>

            {/* Preview Iframe Container */}
            <div className="flex-1 relative overflow-auto p-3 flex justify-center bg-slate-200/50 dark:bg-slate-950">
              <div
                className={`w-full bg-white shadow-md rounded-md overflow-hidden transition-all duration-200 border border-slate-200 dark:border-slate-800 ${
                  orientation === "landscape" ? "max-w-[850px]" : "max-w-[650px]"
                } min-h-[480px] h-full flex flex-col`}
              >
                {previewHtml ? (
                  <iframe
                    title="Document Export Preview"
                    srcDoc={previewHtml}
                    className="w-full flex-1 border-0"
                    sandbox="allow-same-origin allow-scripts"
                  />
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400 gap-2">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <span className="text-xs">Generating interactive document preview...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Dialog Footer Actions */}
        <DialogFooter className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between sm:justify-between w-full">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>
              Target: <strong className="text-slate-700 dark:text-slate-300 font-mono">{noteTitleToUse}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs rounded-xl"
            >
              Cancel
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDirectPrint}
              disabled={isPrinting || isExporting}
              className="text-xs rounded-xl gap-1.5"
            >
              {isPrinting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Printer className="h-3.5 w-3.5 text-slate-500" />
              )}
              <span>Print Directly</span>
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleExport}
              disabled={isExporting || isPrinting}
              className="text-xs rounded-xl gap-1.5 bg-primary text-white hover:bg-primary/90"
            >
              {isExporting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              <span>
                Export {selectedFormat === "pdf" ? "PDF Report" : `${selectedFormat.toUpperCase()} Document`}
              </span>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

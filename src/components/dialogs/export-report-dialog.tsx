"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Download, FileText, FileJson, File, FileSpreadsheet } from "lucide-react";
import { exportReportData, type ReportFilterOptions } from "@/actions/reports";
import { toast } from "sonner";

interface ExportReportDialogProps {
  reportType?: ReportFilterOptions["reportType"];
  filters?: ReportFilterOptions;
  trigger?: React.ReactNode;
}

export default function ExportReportDialog({
  reportType = "overview",
  filters = {},
  trigger,
}: ExportReportDialogProps) {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<"csv" | "json" | "pdf" | "excel">("csv");
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    try {
      setIsExporting(true);

      const exportResult = await exportReportData(format, {
        ...filters,
        reportType,
      });

      if (format === "pdf") {
        const win = window.open("", "_blank");
        if (win) {
          win.document.write(exportResult.content);
          win.document.close();
        } else {
          toast.info("Please allow pop-ups to view printable PDF");
        }
      } else {
        const blob = new Blob([exportResult.content], { type: exportResult.mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = exportResult.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

      setOpen(false);
      toast.success(`Report exported as ${format.toUpperCase()}`);
    } catch (error: any) {
      console.error("Export failed:", error);
      toast.error(error.message || "Failed to export report. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="rounded-xl text-xs gap-1.5">
            <Download className="h-4 w-4" />
            <span>Export Report</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[460px] rounded-2xl border shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Export Financial Report</DialogTitle>
          <DialogDescription className="text-xs">
            Choose the format for your financial ledger and report export
          </DialogDescription>
        </DialogHeader>

        <div className="py-3 space-y-3">
          <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Export Format</Label>
          <div className="grid grid-cols-1 gap-2.5 text-xs">
            <label className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-colors ${
              format === "csv" ? "border-primary bg-primary/5 font-semibold text-primary" : "border-slate-200 dark:border-slate-800"
            }`}>
              <input
                type="radio"
                name="export-fmt"
                value="csv"
                checked={format === "csv"}
                onChange={() => setFormat("csv")}
                className="h-4 w-4 text-primary"
              />
              <FileText className="h-4 w-4 text-primary" />
              <div>
                <span className="block">CSV (Comma Separated Values)</span>
                <span className="text-[11px] font-normal text-slate-400">Raw flattened spreadsheet format</span>
              </div>
            </label>

            <label className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-colors ${
              format === "excel" ? "border-primary bg-primary/5 font-semibold text-primary" : "border-slate-200 dark:border-slate-800"
            }`}>
              <input
                type="radio"
                name="export-fmt"
                value="excel"
                checked={format === "excel"}
                onChange={() => setFormat("excel")}
                className="h-4 w-4 text-emerald-600"
              />
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
              <div>
                <span className="block">Excel Spreadsheet (.xlsx / XML)</span>
                <span className="text-[11px] font-normal text-slate-400">Multi-sheet structured workbook with INR formatting</span>
              </div>
            </label>

            <label className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-colors ${
              format === "pdf" ? "border-primary bg-primary/5 font-semibold text-primary" : "border-slate-200 dark:border-slate-800"
            }`}>
              <input
                type="radio"
                name="export-fmt"
                value="pdf"
                checked={format === "pdf"}
                onChange={() => setFormat("pdf")}
                className="h-4 w-4 text-rose-600"
              />
              <File className="h-4 w-4 text-rose-600" />
              <div>
                <span className="block">PDF (Printable Layout)</span>
                <span className="text-[11px] font-normal text-slate-400">Professional layout with company header & summary tables</span>
              </div>
            </label>

            <label className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-colors ${
              format === "json" ? "border-primary bg-primary/5 font-semibold text-primary" : "border-slate-200 dark:border-slate-800"
            }`}>
              <input
                type="radio"
                name="export-fmt"
                value="json"
                checked={format === "json"}
                onChange={() => setFormat("json")}
                className="h-4 w-4 text-amber-600"
              />
              <FileJson className="h-4 w-4 text-amber-600" />
              <div>
                <span className="block">JSON (Machine Readable)</span>
                <span className="text-[11px] font-normal text-slate-400">Formatted nested JSON with relational records</span>
              </div>
            </label>
          </div>
        </div>

        <DialogFooter className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" className="rounded-xl text-xs" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button size="sm" className="rounded-xl text-xs px-4 font-semibold" onClick={handleExport} disabled={isExporting}>
            {isExporting ? "Exporting..." : `Export ${format.toUpperCase()}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

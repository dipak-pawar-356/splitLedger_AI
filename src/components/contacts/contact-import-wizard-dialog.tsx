"use client";

import { useState, useRef, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  UploadCloud,
  FileSpreadsheet,
  FileText,
  Contact,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Download,
  Copy,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  Check,
  X,
} from "lucide-react";
import {
  analyzeContactFile,
  SYSTEM_FIELDS,
  type AnalyzedFileSummary,
} from "@/lib/contacts/contact-parser";
import { importContactsAction, type ImportResult } from "@/actions/contact-import";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface ContactImportWizardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

type WizardStep = "source" | "analyze" | "mapping" | "duplicates" | "importing" | "complete";

export function ContactImportWizardDialog({
  open,
  onOpenChange,
  onSuccess,
}: ContactImportWizardDialogProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<WizardStep>("source");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<AnalyzedFileSummary | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mapping state: applicationField -> spreadsheetColumn
  const [mapping, setMapping] = useState<Record<string, string>>({});

  // Duplicate Strategy state
  const [duplicateStrategy, setDuplicateStrategy] = useState<
    "skip" | "update" | "merge" | "create_copy"
  >("merge");

  // Import progress & completion
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Reset wizard on dialog close
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen && isImporting) {
      if (!confirm("An import is currently running. Are you sure you want to exit?")) {
        return;
      }
    }
    if (!isOpen) {
      setStep("source");
      setSelectedFile(null);
      setAnalysis(null);
      setError(null);
      setImportResult(null);
      setImportProgress(0);
    }
    onOpenChange(isOpen);
  };

  // Step 1: File selection & upload
  const handleFileChosen = async (file: File) => {
    setError(null);
    setSelectedFile(file);
    setIsAnalyzing(true);
    setStep("analyze");

    try {
      const summary = await analyzeContactFile(file);
      setAnalysis(summary);
      setMapping(summary.suggestedMapping);
    } catch (err) {
      console.error("File analysis error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to parse the selected file. Please verify file integrity."
      );
      setStep("source");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Step 2 -> 3: Move to mapping
  const handleProceedToMapping = () => {
    if (!analysis) return;
    setStep("mapping");
  };

  // Step 3 -> 4: Move to duplicate settings
  const handleProceedToDuplicates = () => {
    // Validate required field (name or firstName)
    if (!mapping.name && !mapping.firstName) {
      toast.error("Please map either 'Full Name' or 'First Name' to proceed.");
      return;
    }
    setStep("duplicates");
  };

  // Step 4 -> 5: Run import
  const handleExecuteImport = async () => {
    if (!analysis || !selectedFile) return;

    setStep("importing");
    setIsImporting(true);
    setImportProgress(20);

    try {
      // Build mapped contact records from sample / analyzed rows
      const recordsToImport: any[] = [];
      const rawRows = analysis.sampleRows; // In client parser we have sample rows; for larger files, read full sheet
      // Let's re-read the full file using XLSX to get every row
      const XLSX = await import("xlsx");
      let allRawRows: any[] = [];

      if (analysis.fileType === "vcf") {
        const text = await selectedFile.text();
        const { parseVCardContent } = await import("@/lib/contacts/contact-parser");
        allRawRows = parseVCardContent(text);
      } else {
        const buffer = await selectedFile.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        allRawRows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" });
      }

      setImportProgress(45);

      for (const row of allRawRows) {
        // Resolve mapped name
        let name = "";
        if (mapping.name && row[mapping.name]) {
          name = String(row[mapping.name]).trim();
        } else if (mapping.firstName) {
          const fn = String(row[mapping.firstName] || "").trim();
          const ln = mapping.lastName ? String(row[mapping.lastName] || "").trim() : "";
          name = `${fn} ${ln}`.trim();
        }

        if (!name) continue;

        const email = mapping.email && row[mapping.email] ? String(row[mapping.email]).trim() : null;
        const phone = mapping.phone && row[mapping.phone] ? String(row[mapping.phone]).trim() : null;
        const company = mapping.company && row[mapping.company] ? String(row[mapping.company]).trim() : null;
        const address = mapping.address && row[mapping.address] ? String(row[mapping.address]).trim() : null;
        const notes = mapping.notes && row[mapping.notes] ? String(row[mapping.notes]).trim() : null;

        let tags: string[] = [];
        if (mapping.tags && row[mapping.tags]) {
          const tVal = String(row[mapping.tags]);
          tags = tVal.split(/[,;|]/).map((t) => t.trim()).filter(Boolean);
        }

        let openingBalance = 0;
        if (mapping.openingBalance && row[mapping.openingBalance]) {
          const num = parseFloat(String(row[mapping.openingBalance]).replace(/[^0-9.-]/g, ""));
          if (!isNaN(num)) openingBalance = num;
        }

        recordsToImport.push({
          name,
          email,
          phone,
          company,
          address,
          notes,
          tags,
          openingBalance,
        });
      }

      setImportProgress(70);

      const result = await importContactsAction({
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        fileType: analysis.fileType,
        records: recordsToImport,
        duplicateStrategy,
      });

      setImportProgress(100);
      setImportResult(result);
      setStep("complete");
      toast.success(
        `Import completed: ${result.importedRecords} imported, ${result.updatedRecords} updated!`
      );
      onSuccess?.();
      router.refresh();
    } catch (err) {
      console.error("Import execution failed:", err);
      const msg = err instanceof Error ? err.message : "Failed to import contacts";
      setError(msg);
      toast.error(msg);
      setStep("duplicates");
    } finally {
      setIsImporting(false);
    }
  };

  // Download error report if any rows failed
  const handleDownloadErrorReport = () => {
    if (!importResult?.errorReport || importResult.errorReport.length === 0) return;
    const csvContent =
      "Row Number,Contact Name,Error Reason\r\n" +
      importResult.errorReport
        .map((e) => `"${e.row}","${(e.name || "").replace(/"/g, '""')}","${e.error.replace(/"/g, '""')}"`)
        .join("\r\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `import-errors-${importResult.publicId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Error report downloaded.");
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[780px] max-h-[92vh] overflow-y-auto rounded-3xl p-6 sm:p-7 bg-card border border-slate-200/80 dark:border-slate-800 shadow-2xl">
        {/* Header with Wizard Step Progress */}
        <DialogHeader className="pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-xs">
                <Contact className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                  Contact Import Center
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Import contacts from Excel, CSV, Google Contacts, Outlook, or vCard files
                </DialogDescription>
              </div>
            </div>

            {/* Step Pills */}
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
              <span className={step === "source" ? "text-primary font-black" : ""}>Source</span>
              <span>→</span>
              <span className={step === "analyze" ? "text-primary font-black" : ""}>Analyze</span>
              <span>→</span>
              <span className={step === "mapping" ? "text-primary font-black" : ""}>Mapping</span>
              <span>→</span>
              <span className={step === "duplicates" || step === "importing" ? "text-primary font-black" : ""}>Review</span>
            </div>
          </div>
        </DialogHeader>

        {/* Global Error Banner */}
        {error && (
          <div className="mt-4 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-2.5 text-xs text-rose-600 dark:text-rose-400">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Import Notice</p>
              <p className="mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* STEP 1: CHOOSE SOURCE */}
        {step === "source" && (
          <div className="space-y-6 pt-4">
            {/* Drag and Drop Zone */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleFileChosen(e.dataTransfer.files[0]);
                }
              }}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-primary/50 dark:hover:border-primary/50 bg-slate-50/50 dark:bg-slate-900/40 rounded-3xl p-8 sm:p-10 text-center cursor-pointer transition-all duration-300 group hover:-translate-y-0.5 hover:shadow-md"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv,.vcf,.txt"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileChosen(e.target.files[0]);
                  }
                }}
              />

              <div className="flex flex-col items-center justify-center space-y-3">
                <div className="p-4 rounded-2xl bg-primary/10 text-primary group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                  <UploadCloud className="h-8 w-8" />
                </div>
                <div>
                  <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100">
                    Drop your contact spreadsheet or file here
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Supports Excel (.xlsx, .xls), CSV (.csv), Google Contacts Export, Outlook Contacts, and vCard (.vcf)
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-xl text-xs font-bold pointer-events-none"
                >
                  Browse Files
                </Button>
              </div>
            </div>

            {/* Supported Formats Grid */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Supported File Formats & Providers
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 flex items-center gap-2.5">
                  <FileSpreadsheet className="h-4 w-4 text-emerald-600 shrink-0" />
                  <div>
                    <span className="font-bold block text-slate-800 dark:text-slate-200">Excel (.xlsx)</span>
                    <span className="text-[10px] text-slate-400">Microsoft Office</span>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 flex items-center gap-2.5">
                  <FileText className="h-4 w-4 text-blue-600 shrink-0" />
                  <div>
                    <span className="font-bold block text-slate-800 dark:text-slate-200">CSV (.csv)</span>
                    <span className="text-[10px] text-slate-400">Comma Separated</span>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 flex items-center gap-2.5">
                  <Contact className="h-4 w-4 text-amber-600 shrink-0" />
                  <div>
                    <span className="font-bold block text-slate-800 dark:text-slate-200">Google Contacts</span>
                    <span className="text-[10px] text-slate-400">Google Workspace</span>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 flex items-center gap-2.5">
                  <FileSpreadsheet className="h-4 w-4 text-indigo-600 shrink-0" />
                  <div>
                    <span className="font-bold block text-slate-800 dark:text-slate-200">vCard (.vcf)</span>
                    <span className="text-[10px] text-slate-400">Apple / Android Pass</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Security Guard Notice */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 flex items-center gap-2.5 text-xs text-slate-500">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>
                Files are analyzed client-side first with automatic CSV/formula injection sanitization and strict authenticated user protection.
              </span>
            </div>
          </div>
        )}

        {/* STEP 2: ANALYZE FILE */}
        {step === "analyze" && (
          <div className="space-y-6 pt-4">
            {isAnalyzing ? (
              <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-xs font-semibold">
                  Analyzing spreadsheet structure, detecting headers & validating rows...
                </p>
              </div>
            ) : analysis ? (
              <div className="space-y-5">
                {/* File Header Card */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
                      <FileSpreadsheet className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                        {analysis.fileName}
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        {(analysis.fileSize / 1024).toFixed(1)} KB • {analysis.fileType.toUpperCase()} file
                      </p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setStep("source")}
                    className="rounded-xl text-xs h-8"
                  >
                    Change File
                  </Button>
                </div>

                {/* Analysis Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div className="p-3.5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 text-center">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 mx-auto" />
                    <span className="text-lg font-black text-emerald-600 mt-1 block">
                      {analysis.totalRows}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">Records Found</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 text-center">
                    <Check className="h-4 w-4 text-emerald-600 mx-auto" />
                    <span className="text-lg font-black text-emerald-600 mt-1 block">
                      {analysis.validRowsCount}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">Valid Ready</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/20 text-center">
                    <AlertTriangle className="h-4 w-4 text-amber-600 mx-auto" />
                    <span className="text-lg font-black text-amber-600 mt-1 block">
                      {analysis.duplicateRowsCount}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">Duplicates</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-blue-500/5 border border-blue-500/20 text-center">
                    <AlertCircle className="h-4 w-4 text-blue-600 mx-auto" />
                    <span className="text-lg font-black text-blue-600 mt-1 block">
                      {analysis.invalidEmailCount}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">Invalid Emails</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-rose-500/5 border border-rose-500/20 text-center col-span-2 sm:col-span-1">
                    <X className="h-4 w-4 text-rose-600 mx-auto" />
                    <span className="text-lg font-black text-rose-600 mt-1 block">
                      {analysis.missingNameCount}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">Missing Name</span>
                  </div>
                </div>

                {/* Detected Columns Pills */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Detected Spreadsheet Columns ({analysis.detectedHeaders.length})
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {analysis.detectedHeaders.map((header) => (
                      <Badge
                        key={header}
                        variant="secondary"
                        className="text-xs px-2.5 py-1 font-mono rounded-lg"
                      >
                        {header}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Action footer */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep("source")}
                    className="rounded-xl text-xs font-semibold h-10"
                  >
                    Back
                  </Button>

                  <Button
                    type="button"
                    onClick={handleProceedToMapping}
                    className="rounded-xl text-xs font-bold h-10 px-5 gap-1.5 bg-primary text-primary-foreground shadow-sm"
                  >
                    <span>Proceed to Field Mapping</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* STEP 3: FIELD MAPPING */}
        {step === "mapping" && analysis && (
          <div className="space-y-6 pt-4">
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Map Spreadsheet Columns to System Fields
              </h4>
              <p className="text-xs text-slate-500">
                We have automatically matched columns based on your headers. Adjust mappings if needed.
              </p>
            </div>

            {/* Mapping Grid */}
            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
              {SYSTEM_FIELDS.map((field) => {
                const currentVal = mapping[field.key] || "";

                return (
                  <div
                    key={field.key}
                    className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          {field.label}
                        </span>
                        {field.required && (
                          <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/20 text-[9px] px-1 py-0">
                            Required
                          </Badge>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">
                        field: {field.key}
                      </span>
                    </div>

                    <div className="w-full sm:w-64">
                      <Select
                        value={currentVal || "__none__"}
                        onValueChange={(val) => {
                          setMapping((prev) => ({
                            ...prev,
                            [field.key]: val === "__none__" ? "" : val,
                          }));
                        }}
                      >
                        <SelectTrigger className="rounded-xl text-xs h-9 border-slate-200/80 dark:border-slate-800">
                          <SelectValue placeholder="Do Not Map" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl">
                          <SelectItem value="__none__">-- Do Not Map --</SelectItem>
                          {analysis.detectedHeaders.map((hdr) => (
                            <SelectItem key={hdr} value={hdr}>
                              {hdr}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Action footer */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("analyze")}
                className="rounded-xl text-xs font-semibold h-10"
              >
                Back to Analysis
              </Button>

              <Button
                type="button"
                onClick={handleProceedToDuplicates}
                className="rounded-xl text-xs font-bold h-10 px-5 gap-1.5 bg-primary text-primary-foreground shadow-sm"
              >
                <span>Duplicate Handling & Strategy</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 4: DUPLICATE RESOLUTION STRATEGY */}
        {step === "duplicates" && analysis && (
          <div className="space-y-6 pt-4">
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Duplicate Handling Strategy
              </h4>
              <p className="text-xs text-slate-500">
                Choose how to resolve contacts that match existing entries by phone, email, or name.
              </p>
            </div>

            {/* Strategy Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Option 1: Smart Merge */}
              <div
                onClick={() => setDuplicateStrategy("merge")}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  duplicateStrategy === "merge"
                    ? "bg-primary/5 border-primary ring-1 ring-primary/20 shadow-xs"
                    : "bg-card border-slate-200/80 dark:border-slate-800 hover:border-slate-300"
                }`}
              >
                <div className="flex items-start justify-between">
                  <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                    Smart Merge (Recommended)
                  </span>
                  <Badge variant="secondary" className="text-[9px] px-1.5 py-0 font-bold">
                    Safe
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Combines tags, merges notes, and updates missing phone/email without overwriting existing data.
                </p>
              </div>

              {/* Option 2: Update Existing */}
              <div
                onClick={() => setDuplicateStrategy("update")}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  duplicateStrategy === "update"
                    ? "bg-primary/5 border-primary ring-1 ring-primary/20 shadow-xs"
                    : "bg-card border-slate-200/80 dark:border-slate-800 hover:border-slate-300"
                }`}
              >
                <span className="font-bold text-xs text-slate-900 dark:text-slate-100 block">
                  Update Existing
                </span>
                <p className="text-[11px] text-slate-500 mt-1">
                  Overwrites contact fields with fresh spreadsheet values while preserving transaction history.
                </p>
              </div>

              {/* Option 3: Skip Existing */}
              <div
                onClick={() => setDuplicateStrategy("skip")}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  duplicateStrategy === "skip"
                    ? "bg-primary/5 border-primary ring-1 ring-primary/20 shadow-xs"
                    : "bg-card border-slate-200/80 dark:border-slate-800 hover:border-slate-300"
                }`}
              >
                <span className="font-bold text-xs text-slate-900 dark:text-slate-100 block">
                  Skip Existing
                </span>
                <p className="text-[11px] text-slate-500 mt-1">
                  Keeps existing contacts untouched and only imports completely new records.
                </p>
              </div>

              {/* Option 4: Create Copy */}
              <div
                onClick={() => setDuplicateStrategy("create_copy")}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  duplicateStrategy === "create_copy"
                    ? "bg-primary/5 border-primary ring-1 ring-primary/20 shadow-xs"
                    : "bg-card border-slate-200/80 dark:border-slate-800 hover:border-slate-300"
                }`}
              >
                <span className="font-bold text-xs text-slate-900 dark:text-slate-100 block">
                  Create New Copy
                </span>
                <p className="text-[11px] text-slate-500 mt-1">
                  Imports duplicates as distinct separate records with a &apos;(Copy)&apos; suffix.
                </p>
              </div>
            </div>

            {/* Action footer */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("mapping")}
                className="rounded-xl text-xs font-semibold h-10"
              >
                Back to Mapping
              </Button>

              <Button
                type="button"
                onClick={handleExecuteImport}
                className="rounded-xl text-xs font-bold h-10 px-6 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md hover:shadow-lg transition-all"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Start Import ({analysis.validRowsCount} Records)</span>
              </Button>
            </div>
          </div>
        )}

        {/* STEP 5: IMPORTING IN PROGRESS */}
        {step === "importing" && (
          <div className="py-16 text-center space-y-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
            <div className="space-y-1">
              <h4 className="font-bold text-base text-slate-900 dark:text-slate-100">
                Importing Contacts to Live Database...
              </h4>
              <p className="text-xs text-slate-500">
                Validating fields, checking duplicates, and creating contact records
              </p>
            </div>
            <div className="max-w-md mx-auto space-y-1.5 pt-2">
              <Progress value={importProgress} className="h-2 rounded-full" />
              <span className="text-[11px] text-slate-400 font-mono">{importProgress}% complete</span>
            </div>
          </div>
        )}

        {/* STEP 6: IMPORT COMPLETE */}
        {step === "complete" && importResult && (
          <div className="py-8 text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto border border-emerald-500/20">
              <Check className="h-8 w-8" />
            </div>

            <div className="space-y-1 max-w-md mx-auto">
              <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">
                Import Completed Successfully!
              </h3>
              <p className="text-xs text-slate-500">
                Processed in {(importResult.durationMs / 1000).toFixed(2)} seconds. Your contacts are ready to use in groups and expense splits.
              </p>
            </div>

            {/* Results Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-lg mx-auto text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400">Imported</span>
                <span className="text-lg font-black text-emerald-600 block mt-1">
                  {importResult.importedRecords}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400">Updated</span>
                <span className="text-lg font-black text-blue-600 block mt-1">
                  {importResult.updatedRecords}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400">Skipped</span>
                <span className="text-lg font-black text-slate-600 block mt-1">
                  {importResult.skippedRecords}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400">Failed</span>
                <span className={`text-lg font-black block mt-1 ${importResult.failedRecords > 0 ? "text-rose-600" : "text-slate-600"}`}>
                  {importResult.failedRecords}
                </span>
              </div>
            </div>

            {/* Error report button if any failed */}
            {importResult.failedRecords > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownloadErrorReport}
                className="rounded-xl text-xs gap-1.5 font-bold text-rose-600 border-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download Error Report ({importResult.failedRecords})</span>
              </Button>
            )}

            <div className="pt-2 flex justify-center">
              <Button
                type="button"
                onClick={() => handleOpenChange(false)}
                className="rounded-xl font-bold text-xs h-10 px-8 bg-primary text-primary-foreground shadow-md"
              >
                Done & View Contacts
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState, useRef, useMemo, useEffect } from "react";
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
import { Input } from "@/components/ui/input";
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
  XCircle,
  Search,
  Filter,
  Info,
  Building2,
  Mail,
  Phone,
  HelpCircle,
  FileDown,
  User,
  MapPin,
  Tag,
  Coins,
  DollarSign,
  RotateCcw,
  Ban,
  ShieldAlert,
} from "lucide-react";
import {
  analyzeContactFile,
  SYSTEM_FIELDS,
  validateAndPrepareImportRows,
  getColumnSamples,
  type AnalyzedFileSummary,
  type ValidatedImportRow,
  type ValidationSummary,
  type MappingConfidence,
  generateContactCsvTemplate,
  generateContactXlsxTemplateBlob,
  generateContactVcfTemplate,
} from "@/lib/contacts/contact-parser";
import { MappingColumnDropdown } from "./mapping-column-dropdown";
import {
  importContactsAction,
  getExistingContactsForImportPreviewAction,
  type ImportResult,
} from "@/actions/contact-import";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

function getFieldMeta(key: string) {
  switch (key) {
    case "name":
      return {
        icon: <User className="h-4 w-4" />,
        bg: "bg-blue-500/10 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20",
      };
    case "firstName":
    case "lastName":
      return {
        icon: <User className="h-4 w-4" />,
        bg: "bg-indigo-500/10 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
      };
    case "email":
      return {
        icon: <Mail className="h-4 w-4" />,
        bg: "bg-sky-500/10 dark:bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/20",
      };
    case "phone":
      return {
        icon: <Phone className="h-4 w-4" />,
        bg: "bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
      };
    case "company":
      return {
        icon: <Building2 className="h-4 w-4" />,
        bg: "bg-amber-500/10 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20",
      };
    case "address":
      return {
        icon: <MapPin className="h-4 w-4" />,
        bg: "bg-purple-500/10 dark:bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/20",
      };
    case "tags":
      return {
        icon: <Tag className="h-4 w-4" />,
        bg: "bg-pink-500/10 dark:bg-pink-500/15 text-pink-600 dark:text-pink-400 border-pink-500/20",
      };
    case "openingBalance":
      return {
        icon: <Coins className="h-4 w-4" />,
        bg: "bg-teal-500/10 dark:bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/20",
      };
    case "currency":
      return {
        icon: <DollarSign className="h-4 w-4" />,
        bg: "bg-cyan-500/10 dark:bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
      };
    case "notes":
      return {
        icon: <FileText className="h-4 w-4" />,
        bg: "bg-slate-500/10 dark:bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/20",
      };
    default:
      return {
        icon: <FileSpreadsheet className="h-4 w-4" />,
        bg: "bg-primary/10 text-primary border-primary/20",
      };
  }
}

interface ContactImportWizardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

type WizardStep = "source" | "analyzing" | "mapping" | "preview" | "importing" | "complete";

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
  const [analysisStage, setAnalysisStage] = useState<string>("Reading file contents...");
  const [error, setError] = useState<string | null>(null);

  // Mapping state: applicationField -> spreadsheetColumn
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [userOverriddenFields, setUserOverriddenFields] = useState<Set<string>>(new Set());

  // Duplicate Strategy state: default for conflicted rows
  const [defaultStrategy, setDefaultStrategy] = useState<"merge" | "update" | "skip">("merge");

  // Validated Preview rows and summary metrics
  const [existingContacts, setExistingContacts] = useState<any[]>([]);
  const [previewRows, setPreviewRows] = useState<ValidatedImportRow[]>([]);
  const [previewFilter, setPreviewFilter] = useState<"all" | "ready" | "conflicts" | "invalid">("all");
  const [previewSearch, setPreviewSearch] = useState("");

  // Import progress & completion
  const [importProgress, setImportProgress] = useState(0);
  const [importStage, setImportStage] = useState("Validating and parsing records...");
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Pre-calculate sample values map across all detected headers (O(1) lookup)
  const columnSamplesMap = useMemo(() => {
    if (!analysis) return new Map<string, string[]>();
    const map = new Map<string, string[]>();
    for (const h of analysis.detectedHeaders) {
      map.set(h, getColumnSamples(analysis.allRawRows, h, 4));
    }
    return map;
  }, [analysis]);

  // Track duplicate mappings: which column is mapped to multiple fields
  const duplicateColumnsMap = useMemo(() => {
    const colToFields = new Map<string, string[]>();
    for (const [fieldKey, col] of Object.entries(mapping)) {
      if (!col) continue;
      const list = colToFields.get(col) || [];
      list.push(fieldKey);
      colToFields.set(col, list);
    }
    const dupes = new Map<string, string[]>();
    for (const [col, fields] of colToFields.entries()) {
      if (fields.length > 1) {
        dupes.set(col, fields);
      }
    }
    return dupes;
  }, [mapping]);

  const isNameMapped = Boolean(
    (mapping.name && mapping.name.trim()) || (mapping.firstName && mapping.firstName.trim())
  );

  const hasEmailOrPhone = Boolean(
    (mapping.email && mapping.email.trim()) || (mapping.phone && mapping.phone.trim())
  );

  const mappedCount = useMemo(() => {
    return Object.values(mapping).filter((c) => Boolean(c && c.trim())).length;
  }, [mapping]);

  // Handle single column mapping change
  const handleColumnSelect = (fieldKey: string, column: string) => {
    setMapping((prev) => ({
      ...prev,
      [fieldKey]: column,
    }));
    setUserOverriddenFields((prev) => new Set(prev).add(fieldKey));

    if (fieldKey === "notes" && column) {
      toast.info(`Notes mapped to '${column}'. Values will be stored as contact descriptions.`);
    }
  };

  // Re-apply auto-detection
  const handleAutoMapAll = () => {
    if (!analysis) return;
    const initialMapping: Record<string, string> = { ...analysis.suggestedMapping };
    initialMapping.notes = ""; // Notes always unmapped by default
    setMapping(initialMapping);
    setUserOverriddenFields(new Set());
    toast.success("Auto-mapped all fields with high confidence!");
  };

  // Clear all mappings
  const handleClearAllMappings = () => {
    const cleared: Record<string, string> = {};
    SYSTEM_FIELDS.forEach((f) => {
      cleared[f.key] = "";
    });
    setMapping(cleared);
    setUserOverriddenFields(new Set(SYSTEM_FIELDS.map((f) => f.key)));
    toast.info("All column mappings cleared.");
  };

  // Explicitly map detected notes column
  const handleMapNotes = (column: string) => {
    setMapping((prev) => ({ ...prev, notes: column }));
    setUserOverriddenFields((prev) => new Set(prev).add("notes"));
    toast.warning(`Notes mapped to '${column}'. Verify it contains real descriptions.`);
  };

  // Unmap notes
  const handleUnmapNotes = () => {
    setMapping((prev) => ({ ...prev, notes: "" }));
    setUserOverriddenFields((prev) => new Set(prev).add("notes"));
    toast.success("Notes column unmapped.");
  };

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
      setPreviewRows([]);
      setUserOverriddenFields(new Set());
    }
    onOpenChange(isOpen);
  };

  // Step 1: File selection & upload
  const handleFileChosen = async (file: File) => {
    // 1. Immediately reset all previous state to prevent stale data between uploads
    setError(null);
    setSelectedFile(file);
    setAnalysis(null);
    setMapping({});
    setUserOverriddenFields(new Set());
    setDefaultStrategy("merge");
    setExistingContacts([]);
    setPreviewRows([]);
    setPreviewFilter("all");
    setPreviewSearch("");
    setImportResult(null);
    setImportProgress(0);
    setIsImporting(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    setStep("analyzing");
    setAnalysisStage("Scanning worksheets & extracting headers...");

    try {
      // 1. Analyze uploaded file afresh
      const summary = await analyzeContactFile(file);
      setAnalysis(summary);

      // Pre-populate mapping (Notes intentionally defaults to unmapped)
      const initialMapping: Record<string, string> = { ...summary.suggestedMapping };
      if (!initialMapping.notes) initialMapping.notes = ""; // Force unmapped default
      setMapping(initialMapping);
      setUserOverriddenFields(new Set());

      setAnalysisStage("Checking against existing contact records...");
      // 2. Fetch existing contacts for duplicate resolution
      const existing = await getExistingContactsForImportPreviewAction();
      setExistingContacts(existing || []);

      // Brief animation pause for professional transition
      setTimeout(() => {
        setStep("mapping");
      }, 500);
    } catch (err) {
      console.error("File analysis error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to parse the selected file. Please verify file integrity."
      );
      setStep("source");
    }
  };

  // Step 2 -> 3: Move from Mapping to Preview & Conflict Resolution
  const handleProceedToPreview = () => {
    if (!analysis) return;

    // Validate required field (name or firstName)
    if (!isNameMapped) {
      toast.error("Required: Please map either 'Full Name' or 'First Name' to proceed.");
      return;
    }

    // Validate duplicate column mappings
    if (duplicateColumnsMap.size > 0) {
      const duplicateCols = Array.from(duplicateColumnsMap.keys());
      toast.error(
        `Duplicate mapping detected: Column '${duplicateCols[0]}' is mapped to multiple fields. Each column must be mapped uniquely.`
      );
      return;
    }

    // Generate comprehensive preview rows
    const { rows } = validateAndPrepareImportRows(
      analysis.allRawRows,
      mapping,
      existingContacts,
      defaultStrategy
    );

    setPreviewRows(rows);
    setStep("preview");
  };

  // Re-run validation whenever defaultStrategy changes while on preview
  const handleDefaultStrategyChange = (newStrat: "merge" | "update" | "skip") => {
    setDefaultStrategy(newStrat);
    if (!analysis) return;
    const { rows } = validateAndPrepareImportRows(
      analysis.allRawRows,
      mapping,
      existingContacts,
      newStrat
    );
    setPreviewRows(rows);
  };

  // Allow user to override action for a specific row
  const handleRowActionChange = (
    rowNumber: number,
    action: "new" | "update" | "merge" | "skip"
  ) => {
    setPreviewRows((prev) =>
      prev.map((r) => (r.rowNumber === rowNumber ? { ...r, userAction: action } : r))
    );
  };

  // Filtered preview rows based on search and tab
  const filteredPreviewRows = useMemo(() => {
    return previewRows.filter((r) => {
      // Tab filter
      if (previewFilter === "ready" && (r.status === "invalid" || r.userAction === "skip")) {
        return false;
      }
      if (
        previewFilter === "conflicts" &&
        !(r.status === "warning" || Boolean(r.conflictReason) || Boolean(r.matchedContact))
      ) {
        return false;
      }
      if (previewFilter === "invalid" && r.status !== "invalid") {
        return false;
      }

      // Search filter
      if (previewSearch.trim()) {
        const q = previewSearch.toLowerCase().trim();
        const matchesName = r.name.toLowerCase().includes(q);
        const matchesEmail = r.email ? r.email.toLowerCase().includes(q) : false;
        const matchesPhone = r.phone ? r.phone.toLowerCase().includes(q) : false;
        const matchesCompany = r.company ? r.company.toLowerCase().includes(q) : false;
        const matchesNotes = r.rawNotesComment ? r.rawNotesComment.toLowerCase().includes(q) : false;
        return matchesName || matchesEmail || matchesPhone || matchesCompany || matchesNotes;
      }

      return true;
    });
  }, [previewRows, previewFilter, previewSearch]);

  // Preview metrics
  const previewMetrics: ValidationSummary = useMemo(() => {
    let newCount = 0;
    let updateCount = 0;
    let mergeCount = 0;
    let skipCount = 0;
    let invalidCount = 0;

    for (const r of previewRows) {
      if (r.status === "invalid") {
        invalidCount++;
      } else if (r.userAction === "skip") {
        skipCount++;
      } else if (r.userAction === "update") {
        updateCount++;
      } else if (r.userAction === "merge") {
        mergeCount++;
      } else {
        newCount++;
      }
    }

    return {
      totalRows: previewRows.length,
      newCount,
      updateCount,
      mergeCount,
      skipCount,
      invalidCount,
    };
  }, [previewRows]);

  // Valid rows ready for actual import
  const rowsReadyToImportCount = useMemo(() => {
    return previewRows.filter((r) => r.status !== "invalid" && r.userAction !== "skip").length;
  }, [previewRows]);

  // Total conflicting rows count
  const conflictRowsCount = useMemo(() => {
    return previewRows.filter(
      (r) => r.status === "warning" || Boolean(r.conflictReason) || Boolean(r.matchedContact)
    ).length;
  }, [previewRows]);

  // Step 4 -> 5: Run Import
  const handleExecuteImport = async () => {
    if (!analysis || !selectedFile || previewRows.length === 0) return;

    if (rowsReadyToImportCount === 0) {
      toast.error("No valid contacts are selected to import.");
      return;
    }

    setStep("importing");
    setIsImporting(true);
    setImportProgress(15);
    setImportStage("Preparing validated contact payload...");

    try {
      // Build final records payload respecting user actions per row
      const finalRecordsToImport = previewRows.map((r) => ({
        rowNumber: r.rowNumber,
        name: r.name,
        email: r.email,
        phone: r.phone,
        company: r.company,
        address: r.address,
        tags: r.tags,
        // STRICT: Only send notes if user explicitly mapped it in mapping step!
        notes: r.notes || null,
        openingBalance: r.openingBalance,
        currency: r.currency,
        action: r.userAction,
        existingContactId: r.matchedContact ? r.matchedContact.id : null,
      }));

      // Simulate progressive progress stages
      setTimeout(() => {
        setImportProgress(40);
        setImportStage("Validating records & sanitizing formula prefixes...");
      }, 300);

      setTimeout(() => {
        setImportProgress(70);
        setImportStage("Executing atomic database updates & merging...");
      }, 700);

      const result = await importContactsAction({
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        fileType: analysis.fileType,
        records: finalRecordsToImport,
        duplicateStrategy: defaultStrategy,
      });

      setImportProgress(100);
      setImportStage("Import finalized successfully!");
      setImportResult(result);
      setStep("complete");

      toast.success(
        `Import completed: ${result.importedRecords} created, ${result.updatedRecords} updated/merged!`
      );
      onSuccess?.();
      router.refresh();
    } catch (err) {
      console.error("Import execution failed:", err);
      const msg = err instanceof Error ? err.message : "Failed to import contacts";
      setError(msg);
      toast.error(msg);
      setStep("preview");
    } finally {
      setIsImporting(false);
    }
  };

  // Download comprehensive CSV report of import execution
  const handleDownloadReport = () => {
    if (!previewRows || previewRows.length === 0) return;

    const headers = [
      "Row Number",
      "Name",
      "Email",
      "Phone",
      "Company",
      "Opening Balance",
      "Action Assigned",
      "Status",
      "Conflict Details / Errors",
      "Original File Note",
    ];

    const rows = [headers.join(",")];

    for (const r of previewRows) {
      const errDetail = r.validationErrors.length > 0
        ? r.validationErrors.join("; ")
        : r.conflictReason || "Valid";

      const fields = [
        String(r.rowNumber),
        r.name || "",
        r.email || "",
        r.phone || "",
        r.company || "",
        String(r.openingBalance),
        r.userAction.toUpperCase(),
        r.status.toUpperCase(),
        errDetail,
        r.rawNotesComment || "",
      ];

      rows.push(fields.map((f) => `"${String(f).replace(/"/g, '""')}"`).join(","));
    }

    const blob = new Blob([rows.join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `import-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded comprehensive import report (CSV)");
  };

  // Sample data preview helper for Mapping step
  const getSampleValuesForColumn = (columnName: string) => {
    if (!analysis || !columnName) return [];
    return analysis.sampleRows
      .map((r) => r[columnName])
      .filter((v) => v !== undefined && v !== null && String(v).trim().length > 0)
      .slice(0, 3);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[92vh] flex flex-col p-0 rounded-3xl overflow-hidden border border-slate-200/90 dark:border-slate-800 shadow-2xl bg-card">
        {/* Header Bar */}
        <DialogHeader className="p-5 sm:p-6 pb-4 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                <UploadCloud className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>Import Contacts</span>
                  <Badge variant="outline" className="text-[10px] font-semibold uppercase tracking-wider text-primary border-primary/30">
                    Enterprise
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Import, validate, deduplicate, and map spreadsheet contacts into your ledger
                </DialogDescription>
              </div>
            </div>

            {/* Stepper Pill Indicator */}
            <div className="hidden sm:flex items-center gap-1 text-xs font-semibold bg-slate-100/90 dark:bg-slate-900/90 p-1 rounded-2xl border border-slate-200/80 dark:border-slate-800 backdrop-blur-md shadow-2xs">
              <span className={`px-2.5 py-1 rounded-xl transition-all duration-200 ${step === "source" ? "bg-primary text-primary-foreground font-bold shadow-xs" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}>
                1. Upload
              </span>
              <span className={`px-2.5 py-1 rounded-xl transition-all duration-200 ${step === "mapping" ? "bg-primary text-primary-foreground font-bold shadow-xs" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}>
                2. Mapping
              </span>
              <span className={`px-2.5 py-1 rounded-xl transition-all duration-200 ${step === "preview" ? "bg-primary text-primary-foreground font-bold shadow-xs" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}>
                3. Preview
              </span>
              <span className={`px-2.5 py-1 rounded-xl transition-all duration-200 ${step === "complete" ? "bg-emerald-600 text-white font-bold shadow-xs" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}>
                4. Done
              </span>
            </div>
          </div>
        </DialogHeader>

        {/* Dynamic Step Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex items-center gap-3 text-xs text-rose-700 dark:text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span className="flex-1 font-medium">{error}</span>
              <Button size="sm" variant="ghost" className="h-7 px-2 text-rose-600" onClick={() => setError(null)}>
                Dismiss
              </Button>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 1: FILE SOURCE SELECTION */}
          {/* ========================================================================= */}
          {step === "source" && (
            <div className="space-y-6">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-3xl p-8 sm:p-12 text-center cursor-pointer hover:border-primary/60 hover:bg-primary/[0.02] transition-all duration-300 group"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept=".xlsx,.xls,.csv,.vcf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileChosen(file);
                  }}
                />
                <div className="h-16 w-16 mx-auto rounded-3xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 shadow-sm">
                  <UploadCloud className="h-8 w-8" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 mt-4">
                  Choose or drag spreadsheet to import
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
                  Supports Excel (.xlsx, .xls), Comma-Separated Values (.csv), and vCard (.vcf) up to 15MB and 5,000 contacts.
                </p>

                <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                  <Badge variant="secondary" className="text-[11px] font-semibold py-1 px-2.5 rounded-lg">
                    Excel (.xlsx, .xls)
                  </Badge>
                  <Badge variant="secondary" className="text-[11px] font-semibold py-1 px-2.5 rounded-lg">
                    CSV (.csv)
                  </Badge>
                  <Badge variant="secondary" className="text-[11px] font-semibold py-1 px-2.5 rounded-lg">
                    vCard (.vcf)
                  </Badge>
                </div>
              </div>

              {/* Template Download Utility */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <FileSpreadsheet className="h-5 w-5 text-emerald-600 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      Need a sample template?
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Download pre-formatted templates with headers for instant auto-mapping.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs font-semibold rounded-xl gap-1.5"
                    onClick={async () => {
                      const blob = await generateContactXlsxTemplateBlob();
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = "contacts-template.xlsx";
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                  >
                    <Download className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Excel Template</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs font-semibold rounded-xl gap-1.5"
                    onClick={() => {
                      const csv = generateContactCsvTemplate();
                      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = "contacts-template.csv";
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                  >
                    <Download className="h-3.5 w-3.5 text-primary" />
                    <span>CSV Template</span>
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 2: ANIMATED ANALYZING STAGE */}
          {/* ========================================================================= */}
          {step === "analyzing" && (
            <div className="py-12 flex flex-col items-center justify-center space-y-5 text-center">
              <div className="relative">
                <div className="h-20 w-20 rounded-3xl bg-primary/10 text-primary flex items-center justify-center animate-pulse">
                  <Sparkles className="h-9 w-9 text-primary animate-spin" />
                </div>
              </div>

              <div className="space-y-1.5 max-w-sm">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                  Analyzing Spreadsheet
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {analysisStage}
                </p>
              </div>

              <div className="w-full max-w-xs space-y-2">
                <Progress value={65} className="h-2" />
                <span className="text-[11px] text-slate-400 font-mono">Scanning rows & security tokens...</span>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 2: ENTERPRISE FIELD MAPPING ENGINE */}
          {/* ========================================================================= */}
          {step === "mapping" && analysis && (
            <div className="space-y-4">
              {/* File Overview Card */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-primary/[0.04] border border-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0 shadow-xs">
                    <FileSpreadsheet className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2 truncate">
                      <span className="truncate">{analysis.fileName}</span>
                      <Badge variant="secondary" className="text-[10px] font-bold shrink-0">
                        {analysis.totalRows} Rows Detected
                      </Badge>
                      <Badge variant="outline" className="text-[10px] font-mono uppercase shrink-0 text-slate-500">
                        {analysis.fileType}
                      </Badge>
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Intelligently map spreadsheet columns to contact attributes. Unmapped columns are safely ignored.
                    </p>
                  </div>
                </div>

                {analysis.formulaInjectionsFound > 0 && (
                  <Badge variant="outline" className="text-amber-700 dark:text-amber-300 border-amber-300 bg-amber-50 dark:bg-amber-950/40 text-[10px] gap-1 py-1 px-2.5 shrink-0 self-start sm:self-auto font-bold">
                    <ShieldCheck className="h-3.5 w-3.5 text-amber-600" />
                    <span>{analysis.formulaInjectionsFound} Formula Prefixes Auto-Sanitized</span>
                  </Badge>
                )}
              </div>

              {/* Sticky Mapping Summary Panel */}
              <div className="sticky top-0 z-10 p-3 sm:p-3.5 rounded-2xl bg-slate-900/95 text-white dark:bg-slate-900/95 dark:text-white shadow-xl border border-slate-800 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-3 animate-in fade-in-50">
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap text-xs">
                  <div className="flex items-center gap-1.5 font-bold">
                    <span className="text-slate-400">Rows:</span>
                    <span className="font-mono text-sm text-slate-100">{analysis.totalRows}</span>
                  </div>
                  <div className="h-3 w-px bg-slate-700" />
                  <div className="flex items-center gap-1.5 font-bold">
                    <span className="text-slate-400">Mapped:</span>
                    <span className="font-mono text-sm text-slate-100">{mappedCount}/{SYSTEM_FIELDS.length}</span>
                    <div className="w-12 sm:w-16 h-1.5 rounded-full bg-slate-800 overflow-hidden ml-1 hidden sm:block">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 rounded-full transition-all duration-300"
                        style={{ width: `${Math.round((mappedCount / SYSTEM_FIELDS.length) * 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="h-3 w-px bg-slate-700" />
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400 font-bold">Name:</span>
                    {isNameMapped ? (
                      <Badge className="bg-emerald-500/20 text-emerald-300 text-[10px] py-0 px-1.5 border-0 font-bold">
                        ✓ Mapped
                      </Badge>
                    ) : (
                      <Badge className="bg-rose-500/20 text-rose-300 text-[10px] py-0 px-1.5 border-0 font-bold">
                        ✖ Missing
                      </Badge>
                    )}
                  </div>
                  <div className="h-3 w-px bg-slate-700" />
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400 font-bold">Channels:</span>
                    {hasEmailOrPhone ? (
                      <Badge className="bg-emerald-500/20 text-emerald-300 text-[10px] py-0 px-1.5 border-0 font-bold">
                        {mapping.email && mapping.phone ? "✓ Email & Phone" : mapping.email ? "✓ Email" : "✓ Phone"}
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-500/20 text-amber-300 text-[10px] py-0 px-1.5 border-0 font-bold">
                        ⚠ No Email/Phone
                      </Badge>
                    )}
                  </div>
                  {duplicateColumnsMap.size > 0 && (
                    <>
                      <div className="h-3 w-px bg-slate-700" />
                      <Badge className="bg-rose-500/20 text-rose-300 text-[10px] py-0 px-1.5 border-0 font-bold animate-pulse">
                        ⚠ {duplicateColumnsMap.size} Duplicate Mapping(s)
                      </Badge>
                    </>
                  )}
                </div>

                {/* Quick Auto-Map & Clear Actions */}
                <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={handleAutoMapAll}
                    className="group text-xs font-bold gap-1.5 h-8 px-2.5 text-slate-100 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
                    title="Re-run intelligent auto-detection on all columns"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-amber-400 group-hover:rotate-12 transition-transform" />
                    <span>Auto-Map All</span>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={handleClearAllMappings}
                    className="group text-xs font-bold gap-1.5 h-8 px-2.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
                    title="Set all columns to [ Do Not Map ]"
                  >
                    <RotateCcw className="h-3.5 w-3.5 group-hover:-rotate-45 transition-transform" />
                    <span>Reset All</span>
                  </Button>
                </div>
              </div>

              {/* QA & Test Notes Protection Banner */}
              {analysis.detectedNotesColumn && (
                mapping.notes ? (
                  <div className="p-3.5 rounded-2xl bg-amber-500/15 dark:bg-amber-950/30 border border-amber-500/35 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-in fade-in-50">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <h5 className="font-bold text-amber-900 dark:text-amber-100">
                          ⚠️ Notes Column Explicitly Mapped to &ldquo;{mapping.notes}&rdquo;
                        </h5>
                        <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5 leading-relaxed">
                          Values from column &ldquo;{mapping.notes}&rdquo; will be stored as permanent contact descriptions. Please verify this column contains genuine descriptions rather than QA benchmark notes.
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleUnmapNotes}
                      className="rounded-xl text-xs h-7 px-3 border-amber-400 text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/50 font-semibold shrink-0 cursor-pointer"
                    >
                      Revert to [ Do Not Map ]
                    </Button>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-2xl bg-amber-500/[0.08] dark:bg-amber-950/20 border border-amber-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-start gap-2.5">
                      <ShieldCheck className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <h5 className="font-bold text-amber-900 dark:text-amber-200">
                          Spreadsheet Notes Column Protected (&ldquo;{analysis.detectedNotesColumn}&rdquo;)
                        </h5>
                        <p className="text-[11px] text-amber-800 dark:text-amber-300/90 mt-0.5 leading-relaxed">
                          This spreadsheet contains a notes column with test assertions (e.g. &ldquo;Valid contact - baseline&rdquo;, &ldquo;CSV Injection Test&rdquo;). It is left unmapped by default so test comments do not become contact descriptions. You can inspect test notes in the Preview step!
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleMapNotes(analysis.detectedNotesColumn!)}
                      className="rounded-xl text-xs h-7 px-3 border-amber-400 text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/50 font-semibold shrink-0 cursor-pointer"
                    >
                      Map Column Anyway
                    </Button>
                  </div>
                )
              )}

              {/* Desktop Table View (>= 768px) */}
              <div className="hidden md:block rounded-2xl border border-slate-200/90 dark:border-slate-800/80 overflow-hidden shadow-xs bg-card/60 backdrop-blur-sm">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/60 dark:bg-slate-900/60 border-b border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold">
                      <th className="py-3 px-4 w-[28%]">Target Contact Field</th>
                      <th className="py-3 px-4 w-[30%]">Spreadsheet Column</th>
                      <th className="py-3 px-4 w-[28%]">Sample Value from File</th>
                      <th className="py-3 px-4 w-[14%] text-right">Mapping Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {SYSTEM_FIELDS.map((field) => {
                      const currentMapped = mapping[field.key] || "";
                      const samples = currentMapped ? columnSamplesMap.get(currentMapped) || [] : [];
                      const isOverridden = userOverriddenFields.has(field.key);
                      const confidence = analysis.mappingConfidences?.[field.key];
                      const isDupe = Boolean(currentMapped && duplicateColumnsMap.has(currentMapped));
                      const dupeFieldKeys = isDupe ? duplicateColumnsMap.get(currentMapped)! : [];
                      const otherDupeLabels = dupeFieldKeys
                        .filter((k) => k !== field.key)
                        .map((k) => SYSTEM_FIELDS.find((f) => f.key === k)?.label || k);
                      const isRequired = field.key === "name" && !isNameMapped;
                      const meta = getFieldMeta(field.key);

                      return (
                        <tr
                          key={field.key}
                          className={`group transition-all duration-200 ${
                            isDupe
                              ? "bg-amber-500/[0.04] dark:bg-amber-950/20"
                              : isRequired
                              ? "bg-rose-500/[0.03] dark:bg-rose-950/20"
                              : currentMapped
                              ? "bg-primary/[0.015] hover:bg-slate-100/40 dark:hover:bg-slate-800/40"
                              : "hover:bg-slate-50/60 dark:hover:bg-slate-900/40"
                          }`}
                        >
                          {/* Target Field */}
                          <td className="py-3.5 px-4 align-top">
                            <div className="flex items-start gap-2.5">
                              <div className={`p-2 rounded-xl border shrink-0 mt-0.5 shadow-2xs transition-transform duration-200 group-hover:scale-105 ${meta.bg}`}>
                                {meta.icon}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-extrabold text-slate-900 dark:text-slate-100 text-xs">
                                    {field.label}
                                  </span>
                                  {field.required ? (
                                    <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[9px] py-0 px-1 border border-rose-500/20 font-bold">
                                      Required
                                    </Badge>
                                  ) : (
                                    <span className="text-[10px] text-slate-400 font-medium">Optional</span>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                                  {field.description}
                                </p>
                                {isDupe && (
                                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold block mt-1">
                                    ⚠️ Column &ldquo;{currentMapped}&rdquo; is also mapped to {otherDupeLabels.join(", ")}
                                  </span>
                                )}
                                {isRequired && (
                                  <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold block mt-1">
                                    ✖ Full Name or First Name must be mapped to proceed
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Dropdown Selector */}
                          <td className="py-3.5 px-4 align-top">
                            <MappingColumnDropdown
                              fieldKey={field.key}
                              fieldLabel={field.label}
                              currentValue={currentMapped}
                              detectedHeaders={analysis.detectedHeaders}
                              suggestedColumn={analysis.suggestedMapping[field.key]}
                              confidence={confidence}
                              isUserOverridden={isOverridden}
                              duplicateWithFields={otherDupeLabels}
                              columnSamplesMap={columnSamplesMap}
                              onSelect={(col) => handleColumnSelect(field.key, col)}
                            />
                          </td>

                          {/* Live Samples from File */}
                          <td className="py-3.5 px-4 align-top">
                            {currentMapped ? (
                              samples.length > 0 ? (
                                <div className="flex flex-wrap gap-1 max-w-sm">
                                  {samples.slice(0, 4).map((s, idx) => (
                                    <span
                                      key={idx}
                                      className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-lg text-[10px] font-mono truncate max-w-[150px] inline-block border border-slate-200/60 dark:border-slate-700/60 shadow-2xs"
                                      title={s}
                                    >
                                      {s}
                                    </span>
                                  ))}
                                  {samples.length > 4 && (
                                    <span className="text-[9px] font-semibold text-slate-400 self-center px-1">
                                      +{samples.length - 4} more
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400 italic text-[11px]">No sample data in this column</span>
                              )
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">[ Do Not Map ] — field will be ignored</span>
                            )}
                          </td>

                          {/* Mapping Status Badge */}
                          <td className="py-3.5 px-4 align-top text-right">
                            {isDupe ? (
                              <Badge variant="outline" className="text-[10px] border-amber-300 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-bold">
                                Duplicate
                              </Badge>
                            ) : isRequired ? (
                              <Badge variant="outline" className="text-[10px] border-rose-300 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-bold animate-pulse">
                                Missing
                              </Badge>
                            ) : currentMapped ? (
                              isOverridden ? (
                                <Badge variant="outline" className="text-[10px] border-blue-300 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold">
                                  ✓ User Selected
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] border-emerald-400/80 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold shadow-2xs">
                                  ✓ Auto Mapped ({confidence?.confidence || 100}%)
                                </Badge>
                              )
                            ) : (
                              <Badge variant="outline" className="text-[10px] border-slate-200 dark:border-slate-800 text-slate-400 font-medium">
                                Ignored
                              </Badge>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Stacked Cards View (< 768px) */}
              <div className="block md:hidden space-y-3">
                {SYSTEM_FIELDS.map((field) => {
                  const currentMapped = mapping[field.key] || "";
                  const samples = currentMapped ? columnSamplesMap.get(currentMapped) || [] : [];
                  const isOverridden = userOverriddenFields.has(field.key);
                  const confidence = analysis.mappingConfidences?.[field.key];
                  const isDupe = Boolean(currentMapped && duplicateColumnsMap.has(currentMapped));
                  const dupeFieldKeys = isDupe ? duplicateColumnsMap.get(currentMapped)! : [];
                  const otherDupeLabels = dupeFieldKeys
                    .filter((k) => k !== field.key)
                    .map((k) => SYSTEM_FIELDS.find((f) => f.key === k)?.label || k);
                  const isRequired = field.key === "name" && !isNameMapped;
                  const meta = getFieldMeta(field.key);

                  return (
                    <div
                      key={field.key}
                      className={`p-3.5 rounded-2xl border space-y-2.5 transition-all duration-200 ${
                        isDupe
                          ? "border-amber-400 bg-amber-500/[0.04] dark:bg-amber-950/20 shadow-xs"
                          : isRequired
                          ? "border-rose-400 bg-rose-500/[0.03] dark:bg-rose-950/20 shadow-xs"
                          : currentMapped
                          ? "border-slate-200 dark:border-slate-800 bg-card hover:border-primary/40 shadow-xs"
                          : "border-slate-200/80 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-900/30"
                      }`}
                    >
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`p-2 rounded-xl border shrink-0 ${meta.bg}`}>
                            {meta.icon}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-slate-900 dark:text-slate-100 text-xs block truncate">
                              {field.label}
                            </span>
                            <span className="text-[10px] text-slate-400 block truncate">
                              {field.description}
                            </span>
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-1">
                          {field.required ? (
                            <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[9px] py-0 px-1 border border-rose-500/20 font-bold">
                              Required
                            </Badge>
                          ) : (
                            <span className="text-[9px] text-slate-400 font-medium">Optional</span>
                          )}
                          {isDupe ? (
                            <Badge variant="outline" className="text-[9px] border-amber-300 text-amber-700 dark:text-amber-300 font-bold">
                              Duplicate
                            </Badge>
                          ) : isRequired ? (
                            <Badge variant="outline" className="text-[9px] border-rose-300 text-rose-600 dark:text-rose-400 font-bold">
                              Missing
                            </Badge>
                          ) : currentMapped ? (
                            <Badge variant="outline" className="text-[9px] border-emerald-300 text-emerald-700 dark:text-emerald-300 font-bold">
                              Mapped
                            </Badge>
                          ) : null}
                        </div>
                      </div>

                      {/* Dropdown Selector */}
                      <MappingColumnDropdown
                        fieldKey={field.key}
                        fieldLabel={field.label}
                        currentValue={currentMapped}
                        detectedHeaders={analysis.detectedHeaders}
                        suggestedColumn={analysis.suggestedMapping[field.key]}
                        confidence={confidence}
                        isUserOverridden={isOverridden}
                        duplicateWithFields={otherDupeLabels}
                        columnSamplesMap={columnSamplesMap}
                        onSelect={(col) => handleColumnSelect(field.key, col)}
                      />

                      {/* Live Samples from File */}
                      {currentMapped && samples.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {samples.slice(0, 3).map((s, idx) => (
                            <span
                              key={idx}
                              className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-lg text-[10px] font-mono truncate max-w-[140px] inline-block border border-slate-200/60 dark:border-slate-700/60"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 4: ENTERPRISE PREVIEW & CONFLICT RESOLUTION */}
          {/* ========================================================================= */}
          {step === "preview" && (
            <div className="space-y-4">
              {/* Top Metrics Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Analyzed</span>
                  <span className="text-lg font-black text-slate-900 dark:text-slate-100">{previewMetrics.totalRows}</span>
                </div>
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                  <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">New Records</span>
                  <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">{previewMetrics.newCount}</span>
                </div>
                <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-center">
                  <span className="text-[10px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider block">Updates</span>
                  <span className="text-lg font-black text-blue-600 dark:text-blue-400">{previewMetrics.updateCount}</span>
                </div>
                <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-center">
                  <span className="text-[10px] font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wider block">Merges</span>
                  <span className="text-lg font-black text-purple-600 dark:text-purple-400">{previewMetrics.mergeCount}</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-500/10 border border-slate-500/20 text-center">
                  <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">Skipped</span>
                  <span className="text-lg font-black text-slate-600 dark:text-slate-400">{previewMetrics.skipCount}</span>
                </div>
                <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center">
                  <span className="text-[10px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider block">Invalid (Blocked)</span>
                  <span className="text-lg font-black text-rose-600 dark:text-rose-400">{previewMetrics.invalidCount}</span>
                </div>
              </div>

              {/* Control Toolbar: Default Strategy & Search / Filter */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                {/* Filter Pills */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setPreviewFilter("all")}
                    className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all ${
                      previewFilter === "all"
                        ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                    }`}
                  >
                    All Rows ({previewMetrics.totalRows})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewFilter("ready")}
                    className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all ${
                      previewFilter === "ready"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 hover:bg-emerald-100"
                    }`}
                  >
                    Ready ({rowsReadyToImportCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewFilter("conflicts")}
                    className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all ${
                      previewFilter === "conflicts"
                        ? "bg-amber-600 text-white shadow-xs"
                        : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 hover:bg-amber-100"
                    }`}
                  >
                    Conflicts ({conflictRowsCount})
                  </button>
                  {previewMetrics.invalidCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setPreviewFilter("invalid")}
                      className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all ${
                        previewFilter === "invalid"
                          ? "bg-rose-600 text-white shadow-xs"
                          : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 hover:bg-rose-100"
                      }`}
                    >
                      Invalid ({previewMetrics.invalidCount})
                    </button>
                  )}
                </div>

                {/* Default Strategy Selector */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap">Duplicate Rule:</span>
                  <Select
                    value={defaultStrategy}
                    onValueChange={(val: any) => handleDefaultStrategyChange(val)}
                  >
                    <SelectTrigger className="h-8 text-xs font-semibold rounded-xl w-44 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="merge" className="text-xs font-medium">
                        Smart Merge (Keep existing)
                      </SelectItem>
                      <SelectItem value="update" className="text-xs font-medium">
                        Update Existing Records
                      </SelectItem>
                      <SelectItem value="skip" className="text-xs font-medium">
                        Skip Duplicates
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Search Bar for Preview */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <Input
                  value={previewSearch}
                  onChange={(e) => setPreviewSearch(e.target.value)}
                  placeholder="Filter preview rows by name, email, phone, company, or test note..."
                  className="pl-8 h-8 text-xs rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                />
              </div>

              {/* Preview Matrix Table */}
              <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 overflow-hidden shadow-xs max-h-[380px] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-slate-100/90 dark:bg-slate-900/95 backdrop-blur-md z-10 border-b border-slate-200/80 dark:border-slate-800 font-bold text-slate-600 dark:text-slate-400">
                    <tr>
                      <th className="py-2.5 px-3 w-12 text-center">Row</th>
                      <th className="py-2.5 px-3 w-14 text-center">Status</th>
                      <th className="py-2.5 px-3 min-w-[150px]">Contact Name</th>
                      <th className="py-2.5 px-3 min-w-[160px]">Email & Mobile</th>
                      <th className="py-2.5 px-3 min-w-[110px]">Opening Bal</th>
                      <th className="py-2.5 px-3 min-w-[160px]">File Test Note</th>
                      <th className="py-2.5 px-3 min-w-[140px] text-right">Action to Take</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 bg-white/50 dark:bg-slate-950/40">
                    {filteredPreviewRows.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-10 text-center text-slate-400 italic text-xs">
                          No rows match your active preview filter.
                        </td>
                      </tr>
                    ) : (
                      filteredPreviewRows.map((row) => {
                        const isInvalid = row.status === "invalid";
                        const hasConflict = Boolean(row.matchedContact);

                        return (
                          <tr
                            key={row.rowNumber}
                            className={`transition-colors ${
                              isInvalid
                                ? "bg-rose-500/[0.04] hover:bg-rose-500/[0.08]"
                                : hasConflict
                                ? "bg-amber-500/[0.03] hover:bg-amber-500/[0.06]"
                                : "hover:bg-slate-50/60 dark:hover:bg-slate-900/30"
                            }`}
                          >
                            {/* Row Number */}
                            <td className="py-3 px-3 text-center text-slate-400 font-mono text-[11px] font-semibold">
                              #{row.rowNumber}
                            </td>

                            {/* Status Icon */}
                            <td className="py-3 px-3 text-center">
                              {isInvalid ? (
                                <span title={row.validationErrors.join(", ")} className="inline-block">
                                  <XCircle className="h-4 w-4 text-rose-600 mx-auto" />
                                </span>
                              ) : hasConflict ? (
                                <span title={row.conflictReason || "Conflict with existing contact"} className="inline-block">
                                  <AlertTriangle className="h-4 w-4 text-amber-500 mx-auto" />
                                </span>
                              ) : (
                                <CheckCircle2 className="h-4 w-4 text-emerald-600 mx-auto" />
                              )}
                            </td>

                            {/* Contact Name & Company */}
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-2">
                                <div className="h-7 w-7 rounded-xl bg-primary/10 text-primary font-bold flex items-center justify-center text-xs shrink-0">
                                  {row.name ? row.name.charAt(0).toUpperCase() : "?"}
                                </div>
                                <div className="min-w-0">
                                  <span className="font-bold text-slate-900 dark:text-slate-100 block truncate text-xs">
                                    {row.name || <span className="text-rose-500 italic">Missing Name</span>}
                                  </span>
                                  {row.company && (
                                    <span className="text-[10px] text-slate-500 flex items-center gap-1 truncate">
                                      <Building2 className="h-2.5 w-2.5" />
                                      {row.company}
                                    </span>
                                  )}
                                  {isInvalid && (
                                    <span className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold block truncate">
                                      {row.validationErrors[0]}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Email & Mobile */}
                            <td className="py-3 px-3">
                              <div className="space-y-0.5">
                                {row.email ? (
                                  <div className="flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-300 truncate font-mono">
                                    <Mail className="h-3 w-3 text-slate-400 shrink-0" />
                                    <span className="truncate">{row.email}</span>
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-slate-400 italic">No email</span>
                                )}
                                {row.phone ? (
                                  <div className="flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-300 font-mono">
                                    <Phone className="h-3 w-3 text-slate-400 shrink-0" />
                                    <span>{row.phone}</span>
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-slate-400 italic">No mobile</span>
                                )}
                              </div>
                            </td>

                            {/* Opening Balance */}
                            <td className="py-3 px-3 font-mono text-xs font-bold">
                              <span
                                className={
                                  row.openingBalance > 0
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : row.openingBalance < 0
                                    ? "text-rose-600 dark:text-rose-400"
                                    : "text-slate-500"
                                }
                              >
                                {row.openingBalance > 0 ? "+" : ""}
                                {formatCurrency(row.openingBalance, row.currency)}
                              </span>
                            </td>

                            {/* File Test Note (Muted Inspection Badge) */}
                            <td className="py-3 px-3 max-w-[180px]">
                              {row.rawNotesComment ? (
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] font-normal py-0.5 px-2 rounded-lg truncate max-w-full block bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                                  title={`File test note: "${row.rawNotesComment}" (will NOT be saved as contact description)`}
                                >
                                  {row.rawNotesComment}
                                </Badge>
                              ) : (
                                <span className="text-[10px] text-slate-400 italic">—</span>
                              )}
                              {hasConflict && (
                                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold block truncate mt-0.5">
                                  {row.conflictReason}
                                </span>
                              )}
                            </td>

                            {/* Action to Take */}
                            <td className="py-3 px-3 text-right">
                              {isInvalid ? (
                                <Badge variant="outline" className="text-[10px] text-rose-600 border-rose-300 bg-rose-50 dark:bg-rose-950/40">
                                  Blocked (Invalid)
                                </Badge>
                              ) : (
                                <Select
                                  value={row.userAction}
                                  onValueChange={(val: any) => handleRowActionChange(row.rowNumber, val)}
                                >
                                  <SelectTrigger className="h-7 text-[11px] font-bold rounded-lg w-32 ml-auto bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent align="end" className="rounded-xl">
                                    <SelectItem value="new" className="text-xs font-semibold text-emerald-600">
                                      Import as New
                                    </SelectItem>
                                    <SelectItem value="merge" className="text-xs font-semibold text-purple-600">
                                      Merge Existing
                                    </SelectItem>
                                    <SelectItem value="update" className="text-xs font-semibold text-blue-600">
                                      Update Existing
                                    </SelectItem>
                                    <SelectItem value="skip" className="text-xs font-semibold text-slate-500">
                                      Skip Row
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 5: ANIMATED IMPORTING STAGE */}
          {/* ========================================================================= */}
          {step === "importing" && (
            <div className="py-12 flex flex-col items-center justify-center space-y-5 text-center">
              <div className="relative">
                <div className="h-20 w-20 rounded-3xl bg-primary/10 text-primary flex items-center justify-center shadow-lg shadow-primary/10">
                  <Loader2 className="h-10 w-10 text-primary animate-spin" />
                </div>
              </div>

              <div className="space-y-1.5 max-w-sm">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                  Importing Contacts
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {importStage}
                </p>
              </div>

              <div className="w-full max-w-xs space-y-2">
                <Progress value={importProgress} className="h-2.5 rounded-full" />
                <div className="flex justify-between text-[11px] font-mono text-slate-400">
                  <span>Progress</span>
                  <span>{importProgress}%</span>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 6: SUMMARY REPORT & COMPLETE */}
          {/* ========================================================================= */}
          {step === "complete" && importResult && (
            <div className="py-6 space-y-6 text-center">
              <div className="h-16 w-16 mx-auto rounded-3xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center shadow-md shadow-emerald-500/10">
                <CheckCircle2 className="h-8 w-8" />
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
                  Import Completed Successfully!
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Processed in {(importResult.durationMs / 1000).toFixed(1)}s with session ID{" "}
                  <code className="font-mono text-primary font-bold">{importResult.publicId}</code>
                </p>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-lg mx-auto">
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                  <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">Imported</span>
                  <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{importResult.importedRecords}</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20">
                  <span className="text-[10px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider block">Updated / Merged</span>
                  <span className="text-2xl font-black text-blue-600 dark:text-blue-400">{importResult.updatedRecords}</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-500/10 border border-slate-500/20">
                  <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">Skipped</span>
                  <span className="text-2xl font-black text-slate-600 dark:text-slate-400">{importResult.skippedRecords}</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                  <span className="text-[10px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider block">Invalid</span>
                  <span className="text-2xl font-black text-rose-600 dark:text-rose-400">{importResult.failedRecords}</span>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadReport}
                  className="rounded-xl text-xs font-semibold gap-1.5 h-9"
                >
                  <FileDown className="h-4 w-4 text-emerald-600" />
                  <span>Download Full CSV Report</span>
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleOpenChange(false)}
                  className="rounded-xl text-xs font-bold gap-1.5 h-9 bg-primary text-primary-foreground shadow-sm"
                >
                  <span>Done & View Contacts</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation Bar */}
        {step !== "analyzing" && step !== "importing" && step !== "complete" && (
          <div className="p-4 px-6 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 flex items-center justify-between">
            {step === "source" && (
              <>
                <span className="text-[11px] text-slate-400">Step 1 of 4: File Selection</span>
                <Button variant="ghost" size="sm" onClick={() => handleOpenChange(false)} className="rounded-xl text-xs">
                  Cancel
                </Button>
              </>
            )}

            {step === "mapping" && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStep("source")}
                  className="rounded-xl text-xs font-semibold gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span>Back</span>
                </Button>
                <Button
                  size="sm"
                  onClick={handleProceedToPreview}
                  className="rounded-xl text-xs font-bold gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-primary/25 hover:shadow-lg transition-all cursor-pointer group"
                >
                  <span>Preview & Resolve Conflicts</span>
                  <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                </Button>
              </>
            )}

            {step === "preview" && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStep("mapping")}
                  className="rounded-xl text-xs font-semibold gap-1.5"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span>Back to Mapping</span>
                </Button>
                <Button
                  size="sm"
                  onClick={handleExecuteImport}
                  disabled={rowsReadyToImportCount === 0}
                  className="rounded-xl text-xs font-bold gap-1.5 bg-primary text-primary-foreground shadow-md hover:shadow-lg transition-all"
                >
                  <Check className="h-4 w-4" />
                  <span>Execute Import ({rowsReadyToImportCount} Contacts)</span>
                </Button>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

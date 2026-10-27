"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Download,
  FileSpreadsheet,
  FileText,
  Contact,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import {
  exportContactsToCsv,
  exportContactsToVcf,
  exportContactsToXlsxBlob,
} from "@/lib/contacts/contact-parser";
import { toast } from "sonner";

interface ContactExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allContacts: any[];
  filteredContacts: any[];
  selectedContacts: any[];
}

export function ContactExportDialog({
  open,
  onOpenChange,
  allContacts,
  filteredContacts,
  selectedContacts,
}: ContactExportDialogProps) {
  const [format, setFormat] = useState<"xlsx" | "csv" | "vcf">("xlsx");
  const [scope, setScope] = useState<"selected" | "filtered" | "all">(
    selectedContacts.length > 0 ? "selected" : "all"
  );
  const [isExporting, setIsExporting] = useState(false);

  const contactsToExport =
    scope === "selected" && selectedContacts.length > 0
      ? selectedContacts
      : scope === "filtered"
      ? filteredContacts
      : allContacts;

  const handleExecuteExport = async () => {
    setIsExporting(true);
    try {
      const timestamp = new Date().toISOString().slice(0, 10);

      if (format === "csv") {
        const csv = exportContactsToCsv(contactsToExport);
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `contacts-export-${timestamp}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } else if (format === "vcf") {
        const vcf = exportContactsToVcf(contactsToExport);
        const blob = new Blob([vcf], { type: "text/vcard;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `contacts-export-${timestamp}.vcf`;
        a.click();
        URL.revokeObjectURL(url);
      } else if (format === "xlsx") {
        const blob = await exportContactsToXlsxBlob(contactsToExport);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `contacts-export-${timestamp}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
      }

      toast.success(
        `Exported ${contactsToExport.length} contact(s) as ${format.toUpperCase()}!`
      );
      onOpenChange(false);
    } catch (err) {
      console.error("Export error:", err);
      toast.error("Failed to generate export file");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-card border border-slate-200/80 dark:border-slate-800 shadow-2xl">
        <DialogHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <Download className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Export Contacts
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Download your contacts with balances and metadata
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Format Selection */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Export Format
            </Label>
            <div className="grid grid-cols-3 gap-2">
              <div
                onClick={() => setFormat("xlsx")}
                className={`p-3 rounded-2xl border text-center cursor-pointer transition-all ${
                  format === "xlsx"
                    ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-600 font-bold"
                    : "bg-slate-50 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-800 text-slate-600"
                }`}
              >
                <FileSpreadsheet className="h-5 w-5 mx-auto mb-1" />
                <span className="text-xs block">Excel (.xlsx)</span>
              </div>

              <div
                onClick={() => setFormat("csv")}
                className={`p-3 rounded-2xl border text-center cursor-pointer transition-all ${
                  format === "csv"
                    ? "bg-blue-500/10 border-blue-500/50 text-blue-600 font-bold"
                    : "bg-slate-50 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-800 text-slate-600"
                }`}
              >
                <FileText className="h-5 w-5 mx-auto mb-1" />
                <span className="text-xs block">CSV (.csv)</span>
              </div>

              <div
                onClick={() => setFormat("vcf")}
                className={`p-3 rounded-2xl border text-center cursor-pointer transition-all ${
                  format === "vcf"
                    ? "bg-indigo-500/10 border-indigo-500/50 text-indigo-600 font-bold"
                    : "bg-slate-50 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-800 text-slate-600"
                }`}
              >
                <Contact className="h-5 w-5 mx-auto mb-1" />
                <span className="text-xs block">vCard (.vcf)</span>
              </div>
            </div>
          </div>

          {/* Scope Selection */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Export Scope ({contactsToExport.length} Contacts)
            </Label>
            <RadioGroup
              value={scope}
              onValueChange={(val: any) => setScope(val)}
              className="space-y-2 text-xs"
            >
              {selectedContacts.length > 0 && (
                <div className="flex items-center space-x-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                  <RadioGroupItem value="selected" id="scope-selected" />
                  <Label htmlFor="scope-selected" className="cursor-pointer font-semibold flex-1">
                    Selected Contacts Only ({selectedContacts.length})
                  </Label>
                </div>
              )}

              <div className="flex items-center space-x-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                <RadioGroupItem value="filtered" id="scope-filtered" />
                <Label htmlFor="scope-filtered" className="cursor-pointer font-semibold flex-1">
                  Current Filtered Results ({filteredContacts.length})
                </Label>
              </div>

              <div className="flex items-center space-x-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                <RadioGroupItem value="all" id="scope-all" />
                <Label htmlFor="scope-all" className="cursor-pointer font-semibold flex-1">
                  Entire Contact List ({allContacts.length})
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Security notice */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 text-[11px] text-slate-500 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>Formula injection protection automatically applied to all fields.</span>
          </div>

          {/* Action button */}
          <div className="pt-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleExecuteExport}
              disabled={isExporting || contactsToExport.length === 0}
              className="rounded-xl text-xs font-bold gap-1.5 bg-primary text-primary-foreground shadow-sm"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export {contactsToExport.length} Contacts</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

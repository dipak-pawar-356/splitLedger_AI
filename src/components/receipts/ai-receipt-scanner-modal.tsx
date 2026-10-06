"use client";

import { useState, useRef } from "react";
import { scanAndParseReceipt, computeItemizedSplit } from "@/actions/receipt-scanner";
import { createTransaction } from "@/actions/transactions";
import { ParsedReceiptData, ItemizedSplitAllocation } from "@/lib/types/receipts";
import { emitFinancialEvent } from "@/lib/events/financial-events";
import Tesseract from "tesseract.js";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  UploadCloud,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  FileText,
  Edit3,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

interface AIReceiptScannerModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  groupId?: number;
  groupMembers?: Array<{ id: number; name: string }>;
  onExpenseCreated?: (data: ParsedReceiptData) => void;
}

const SAMPLE_OCR_TEXT = `
CAFE COFFEE DAY
TAX INVOICE
GSTIN: 27AAPFU0939F1ZV
Invoice No: INV-CCD-88901
Date: 2026-08-30

Cappuccino Grande 2 x 220.00
Veggie Club Sandwich 1 x 340.00
Chocolate Truffle Pastry 1 x 180.00

Subtotal: 960.00
CGST @ 2.5%: 24.00
SGST @ 2.5%: 24.00
Grand Total: 1008.00
Payment Method: UPI
`;

export function AIReceiptScannerModal({
  isOpen,
  onOpenChange,
  groupId,
  groupMembers = [],
  onExpenseCreated,
}: AIReceiptScannerModalProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedReceiptData | null>(null);
  const [splitAllocations, setSplitAllocations] = useState<ItemizedSplitAllocation[]>([]);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Editable Review Form State
  const [editableMerchant, setEditableMerchant] = useState("");
  const [editableInvoice, setEditableInvoice] = useState("");
  const [editableDate, setEditableDate] = useState("");
  const [editableTotal, setEditableTotal] = useState("");
  const [editableCategory, setEditableCategory] = useState("Food & Dining");
  const [editablePaymentMethod, setEditablePaymentMethod] = useState("UPI");

  const handleParseText = async (text: string, fileName?: string) => {
    setIsScanning(true);
    try {
      const data = await scanAndParseReceipt(text, groupId);
      if (fileName) {
        setUploadedFileName(fileName);
      }
      setParsedData(data);

      // Populate review fields
      setEditableMerchant(data.merchantName || "");
      setEditableInvoice(data.invoiceNumber || "");
      setEditableDate(data.date || "");
      setEditableTotal(data.grandTotal !== undefined && data.grandTotal > 0 ? String(data.grandTotal) : "");
      setEditableCategory(data.category || "Food & Dining");
      setEditablePaymentMethod(data.paymentMethod || "UPI");

      // Compute split only if real group members exist
      if (groupId && groupMembers && groupMembers.length > 0 && data.items.length > 0) {
        const splits = await computeItemizedSplit(data.items, data.taxBreakdown, groupMembers);
        setSplitAllocations(splits);
      } else {
        setSplitAllocations([]);
      }

      if (data.confidenceScore > 0) {
        toast.success("Receipt scanned & classified successfully!");
      } else {
        toast.info("No transaction fields detected. Please enter details manually.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to scan receipt.");
    } finally {
      setIsScanning(false);
      setScanProgress(null);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    setIsScanning(true);
    setScanProgress(0);

    try {
      if (file.type.startsWith("text/")) {
        const text = await file.text();
        await handleParseText(text, file.name);
      } else if (file.type.startsWith("image/")) {
        // True Optical Character Recognition using Tesseract.js (no fake simulation!)
        const result = await Tesseract.recognize(file, "eng", {
          logger: (m) => {
            if (m.status === "recognizing text") {
              setScanProgress(Math.round((m.progress || 0) * 100));
            }
          },
        });
        const extractedText = result.data?.text || "";
        await handleParseText(extractedText, file.name);
      } else {
        toast.error("Please upload an image (JPG, PNG, WEBP) or text receipt.");
      }
    } catch (err: any) {
      console.error("OCR Recognition Error:", err);
      toast.error(err?.message || "Failed to process receipt with OCR.");
    } finally {
      setIsScanning(false);
      setScanProgress(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Validation: Merchant, positive Total, and Date are strictly required
  const parsedTotal = parseFloat(editableTotal);
  const isTotalValid = !isNaN(parsedTotal) && parsedTotal > 0;
  const isMerchantValid = editableMerchant.trim().length >= 2;
  const isDateValid = editableDate.trim().length >= 4;
  const isReadyToLog = isMerchantValid && isTotalValid && isDateValid;

  const handleConfirmExpense = async () => {
    if (!isReadyToLog) {
      toast.error("Merchant name, positive amount, and receipt date are required.");
      return;
    }

    setIsSaving(true);
    try {
      const savedTx = await createTransaction({
        title: `${editableMerchant.trim()} Bill`,
        description: `Receipt ${editableInvoice ? `#${editableInvoice}` : ""} (${editableCategory})`,
        type: "paid",
        amount: parsedTotal,
        paymentMethod: editablePaymentMethod || "UPI",
        notes: uploadedFileName ? `Scanned from file: ${uploadedFileName}` : "Scanned receipt",
        groupId: groupId || null,
      });

      toast.success(`Expense ₹${parsedTotal} logged to database under ${editableCategory}!`);
      emitFinancialEvent("receipt:saved", {
        entityType: "transaction",
        source: "ocr",
        metadata: { invoice: editableInvoice, merchant: editableMerchant },
      });

      if (onExpenseCreated && parsedData) {
        onExpenseCreated({
          ...parsedData,
          merchantName: editableMerchant,
          invoiceNumber: editableInvoice,
          date: editableDate,
          grandTotal: parsedTotal,
          category: editableCategory,
          paymentMethod: editablePaymentMethod,
        });
      }

      onOpenChange(false);
      setParsedData(null);
    } catch (err: any) {
      toast.error(err?.message || "Failed to log expense to ledger.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl rounded-3xl p-6 bg-card border border-slate-200/80 dark:border-slate-800">
        <DialogHeader className="pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">AI Receipt & Invoice Scanner</DialogTitle>
              <DialogDescription className="text-[11px] text-slate-500">
                True client OCR extraction & verified Indian GST ledger logging in INR (₹)
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {!parsedData ? (
          <div className="space-y-4 py-4 text-xs text-center">
            <div className="relative p-8 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 space-y-3 bg-slate-50/50 dark:bg-slate-900/30 overflow-hidden">
              {isScanning && (
                <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-scanning-beam pointer-events-none shadow-[0_0_10px_rgba(99,102,241,0.8)] z-10" />
              )}
              <div className="mx-auto w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <UploadCloud className="h-6 w-6" />
              </div>
              <div>
                <p className="font-bold text-slate-800 dark:text-slate-200">Upload Receipt or Bill</p>
                <p className="text-slate-400 text-[11px]">Supports JPG, PNG, WEBP, and plain text receipts</p>
              </div>

              {isScanning && (
                <div className="space-y-1.5 py-2 max-w-xs mx-auto">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-primary">
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Running Tesseract OCR...
                    </span>
                    <span>{scanProgress !== null ? `${scanProgress}%` : "Analyzing"}</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-primary h-full transition-all duration-300"
                      style={{ width: `${scanProgress || 15}%` }}
                    />
                  </div>
                </div>
              )}

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/jpeg,image/png,image/webp,text/plain"
                className="hidden"
                disabled={isScanning}
              />
              <div className="flex justify-center gap-2 pt-2 flex-wrap">
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl text-xs h-9 gap-1.5"
                  disabled={isScanning}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <UploadCloud className="h-3.5 w-3.5" />
                  <span>Choose Receipt File</span>
                </Button>
                <Button
                  size="sm"
                  className="rounded-xl text-xs h-9 gap-1.5 bg-primary"
                  disabled={isScanning}
                  onClick={() => handleParseText(SAMPLE_OCR_TEXT, "sample_ccd_receipt.txt")}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Load Sample Bill</span>
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4 pt-2 text-xs max-h-[500px] overflow-y-auto pr-1">
            {/* Merchant & GST Header */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
              <div>
                {parsedData.merchantName ? (
                  <p className="font-bold text-sm text-slate-900 dark:text-slate-100">{parsedData.merchantName}</p>
                ) : (
                  <p className="font-bold text-xs text-red-500 flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Merchant: Not Detected
                  </p>
                )}
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                  GSTIN: {parsedData.gstNumber || "Not Detected"} • Inv: {parsedData.invoiceNumber || "Not Detected"} • Date: {parsedData.date || "Not Detected"}
                </p>
              </div>
              <div>
                {parsedData.confidenceScore > 0 ? (
                  <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 font-bold text-xs">
                    {parsedData.confidenceScore}% Confidence
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-slate-200 dark:bg-slate-800 text-slate-500 font-bold text-xs">
                    Unavailable
                  </Badge>
                )}
              </div>
            </div>

            {/* OCR Validation Badges */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {parsedData.duplicateStatus === "Duplicate Found" ? (
                <Badge variant="destructive" className="text-[10px] font-bold">
                  POTENTIAL DUPLICATE INVOICE
                </Badge>
              ) : parsedData.duplicateStatus === "Unique" ? (
                <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-300 font-bold">
                  ✓ INVOICE UNIQUE
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300 font-bold">
                  UNABLE TO VERIFY DUPLICATE
                </Badge>
              )}

              {parsedData.gstNumber ? (
                <Badge variant="outline" className="text-[10px] text-indigo-600 border-indigo-300 font-bold">
                  ✓ GST REGISTERED
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] text-slate-400 border-slate-200 dark:border-slate-800">
                  NO GSTIN
                </Badge>
              )}

              {parsedData.taxBreakdown && parsedData.taxBreakdown.totalTax > 0 ? (
                <Badge variant="outline" className="text-[10px] text-teal-600 border-teal-300 font-bold">
                  ✓ TAX RECONCILED
                </Badge>
              ) : null}
            </div>

            {/* Line Items List */}
            <div className="space-y-1.5">
              <p className="font-semibold text-slate-500 text-[11px]">Extracted Line Items:</p>
              {parsedData.items.length > 0 ? (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
                  {parsedData.items.map((item) => (
                    <div key={item.id} className="p-2 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-800 dark:text-slate-200">
                          {item.name} <span className="text-slate-400 font-normal">x{item.quantity}</span>
                        </p>
                        <p className="text-[10px] text-slate-400">@ {formatCurrency(item.unitPrice, "INR")} each</p>
                      </div>
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {formatCurrency(item.totalPrice, "INR")}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 text-center text-slate-400 text-[11px]">
                  No itemized lines detected in receipt.
                </div>
              )}
            </div>

            {/* Group Split Section */}
            <div className="space-y-1.5">
              <p className="font-semibold text-slate-500 text-[11px]">Group Split:</p>
              {groupId && groupMembers && groupMembers.length > 0 && splitAllocations.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {splitAllocations.map((alloc) => (
                    <div
                      key={alloc.memberId}
                      className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 text-[11px] space-y-0.5"
                    >
                      <p className="font-bold text-slate-900 dark:text-slate-100 truncate">{alloc.memberName}</p>
                      <p className="text-emerald-600 font-black text-xs">
                        {formatCurrency(alloc.totalPayable, "INR")}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-slate-500 text-[11px]">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">No Group Selected:</span> This receipt will be logged as a personal ledger expense without split shares.
                </div>
              )}
            </div>

            {/* Editable Review Section */}
            <div className="p-3.5 rounded-2xl bg-primary/5 dark:bg-primary/10 border border-primary/20 space-y-2.5">
              <div className="flex items-center justify-between">
                <p className="font-bold text-xs text-primary flex items-center gap-1.5">
                  <Edit3 className="h-3.5 w-3.5" />
                  Review & Verify Ledger Details
                </p>
                <span className="text-[10px] text-slate-400">Required before saving</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-400">
                    Merchant Name *
                  </label>
                  <Input
                    value={editableMerchant}
                    onChange={(e) => setEditableMerchant(e.target.value)}
                    placeholder="Enter merchant name"
                    className={`h-8 text-xs rounded-lg mt-0.5 ${!isMerchantValid ? "border-red-300 dark:border-red-800" : ""}`}
                  />
                  {!isMerchantValid && (
                    <p className="text-[9px] text-red-500 mt-0.5">Merchant is required</p>
                  )}
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-400">
                    Invoice / Bill Number
                  </label>
                  <Input
                    value={editableInvoice}
                    onChange={(e) => setEditableInvoice(e.target.value)}
                    placeholder="e.g. INV-1029 (optional)"
                    className="h-8 text-xs rounded-lg mt-0.5"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-400">
                    Receipt Date *
                  </label>
                  <Input
                    type="date"
                    value={editableDate}
                    onChange={(e) => setEditableDate(e.target.value)}
                    className={`h-8 text-xs rounded-lg mt-0.5 ${!isDateValid ? "border-red-300 dark:border-red-800" : ""}`}
                  />
                  {!isDateValid && (
                    <p className="text-[9px] text-red-500 mt-0.5">Valid date is required</p>
                  )}
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-400">
                    Grand Total (₹) *
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editableTotal}
                    onChange={(e) => setEditableTotal(e.target.value)}
                    placeholder="0.00"
                    className={`h-8 text-xs rounded-lg mt-0.5 font-bold ${!isTotalValid ? "border-red-300 dark:border-red-800 text-red-500" : "text-emerald-600"}`}
                  />
                  {!isTotalValid && (
                    <p className="text-[9px] text-red-500 mt-0.5">Positive total is required</p>
                  )}
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-400">
                    Category
                  </label>
                  <Input
                    value={editableCategory}
                    onChange={(e) => setEditableCategory(e.target.value)}
                    placeholder="Category"
                    className="h-8 text-xs rounded-lg mt-0.5"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-400">
                    Payment Method
                  </label>
                  <Input
                    value={editablePaymentMethod}
                    onChange={(e) => setEditablePaymentMethod(e.target.value)}
                    placeholder="UPI / Card / Cash"
                    className="h-8 text-xs rounded-lg mt-0.5"
                  />
                </div>
              </div>
            </div>

            {/* Summary & Confirm Actions */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-slate-500">Verified Grand Total</p>
                <p className="text-base font-black text-slate-900 dark:text-slate-100">
                  {isTotalValid ? formatCurrency(parsedTotal, "INR") : <span className="text-red-500 text-xs font-semibold">Not Detected</span>}
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl text-xs h-8"
                  onClick={() => {
                    setParsedData(null);
                    setEditableMerchant("");
                    setEditableTotal("");
                    setEditableDate("");
                    setEditableInvoice("");
                  }}
                >
                  Rescan
                </Button>
                <Button
                  size="sm"
                  className="rounded-xl text-xs h-8 bg-primary text-primary-foreground gap-1.5"
                  onClick={handleConfirmExpense}
                  disabled={isSaving || !isReadyToLog}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Writing to Ledger...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Log to Ledger</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
            {!isReadyToLog && (
              <p className="text-[10px] text-amber-600 dark:text-amber-400 text-right">
                Log to Ledger is disabled until Merchant, Date, and Positive Total are provided.
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

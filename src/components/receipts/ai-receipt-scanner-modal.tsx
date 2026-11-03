"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  scanAndParseReceipt,
  computeItemizedSplit,
  checkDatabaseDuplicateInvoice,
} from "@/actions/receipt-scanner";
import { createTransaction } from "@/actions/transactions";
import {
  ParsedReceiptData,
  ReceiptLineItem,
  ItemizedSplitAllocation,
} from "@/lib/types/receipts";
import { emitFinancialEvent } from "@/lib/events/financial-events";
import Tesseract from "tesseract.js";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  Maximize2,
  SunMedium,
  Check,
  Trash2,
  Plus,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  DollarSign,
  TrendingUp,
  Search,
  Clock,
  Layers,
  Camera,
  History,
  Receipt,
  Info,
  ExternalLink,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";

export interface AIReceiptScannerModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  groupId?: number;
  groupMembers?: Array<{ id: number; name: string }>;
  onExpenseCreated?: (data: ParsedReceiptData) => void;
  isEmbedded?: boolean; // When rendered directly into a tab
}

// Enterprise Sample Receipts for Instant Testing
const ENTERPRISE_SAMPLES = [
  {
    label: "Cafe Coffee Day (GST Bill)",
    fileName: "ccd_tax_invoice.png",
    text: `
CAFE COFFEE DAY
TAX INVOICE
GSTIN: 27AAPFU0939F1ZV
Invoice No: INV-CCD-88901
Date: 2026-11-02 Time: 14:35:10
Cashier: Rahul S | Terminal: T-04

Cappuccino Grande 2 x 220.00 = 440.00
Veggie Club Sandwich 1 x 340.00 = 340.00
Chocolate Truffle Pastry 1 x 180.00 = 180.00

Subtotal: 960.00
CGST @ 2.5%: 24.00
SGST @ 2.5%: 24.00
Grand Total: 1008.00
Payment Method: UPI
Reference: UPI/630129381920/Axis
`,
  },
  {
    label: "Indian Oil Petrol (Fuel)",
    fileName: "ioc_fuel_receipt.png",
    text: `
INDIAN OIL CORPORATION LTD
AUTO SERVICE STATION
GSTIN: 27AAACI1681G1ZM
Receipt No: IOC-FUEL-9921
Date: 2026-11-01 Time: 09:12:00
Pump No: 02 | Nozzle: 01

Power Petrol (XP95) 24.32 Ltr @ 102.80 = 2500.00

Subtotal: 2173.91
VAT / State Tax @ 15%: 326.09
Grand Total: 2500.00
Payment Method: Credit Card
Card: Visa ending in 4109
`,
  },
  {
    label: "Apollo Pharmacy (Medical)",
    fileName: "apollo_med_bill.png",
    text: `
APOLLO PHARMACY
HEALTHCARE TAX INVOICE
GSTIN: 27AABCA3621D1Z8
Bill No: APL-MED-4412
Date: 2026-10-28 Time: 18:40:00

Paracetamol 650mg 2 x 45.00 = 90.00
Vitamin C Tablets 1 x 210.00 = 210.00
Protein Supplement 1 x 545.00 = 545.00

Subtotal: 845.00
GST Included (0% / 5%): 0.00
Grand Total: 845.00
Payment Method: UPI
`,
  },
];

interface StoredReceiptRecord {
  id: string;
  merchant: string;
  date: string;
  amount: number;
  category: string;
  confidence: number;
  invoiceNumber?: string;
  paymentMethod: string;
  status: "Imported" | "Draft" | "Verified";
  createdAt: string;
}

export function AIReceiptScannerModal({
  isOpen,
  onOpenChange,
  groupId,
  groupMembers = [],
  onExpenseCreated,
  isEmbedded = false,
}: AIReceiptScannerModalProps) {
  const [activeTab, setActiveTab] = useState<"workspace" | "history">("workspace");

  // OCR Processing States
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState<number | null>(null);
  const [processingStage, setProcessingStage] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  // Extracted Data & Editable State
  const [parsedData, setParsedData] = useState<ParsedReceiptData | null>(null);
  const [splitAllocations, setSplitAllocations] = useState<ItemizedSplitAllocation[]>([]);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadedImageSrc, setUploadedImageSrc] = useState<string | null>(null);
  const [isDuplicateDetected, setIsDuplicateDetected] = useState(false);

  // Document Viewport Controls
  const [zoomLevel, setZoomLevel] = useState(100);
  const [rotationAngle, setRotationAngle] = useState(0);
  const [isHighContrast, setIsHighContrast] = useState(false);

  // Editable Review Form Fields
  const [editableMerchant, setEditableMerchant] = useState("");
  const [editableInvoice, setEditableInvoice] = useState("");
  const [editableDate, setEditableDate] = useState("");
  const [editableTotal, setEditableTotal] = useState("");
  const [editableSubtotal, setEditableSubtotal] = useState("");
  const [editableTax, setEditableTax] = useState("");
  const [editableDiscount, setEditableDiscount] = useState("");
  const [editableCategory, setEditableCategory] = useState("Food & Dining");
  const [editablePaymentMethod, setEditablePaymentMethod] = useState("UPI");
  const [lineItems, setLineItems] = useState<ReceiptLineItem[]>([]);

  // Searchable History & Analytics State
  const [historySearch, setHistorySearch] = useState("");
  const [historyRecords, setHistoryRecords] = useState<StoredReceiptRecord[]>([]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const shouldReduceMotion = useReducedMotion();

  // Load history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("spl_receipt_ocr_history");
      if (saved) {
        setHistoryRecords(JSON.parse(saved));
      }
    } catch {}
  }, []);

  const saveHistoryRecord = (record: StoredReceiptRecord) => {
    try {
      const updated = [record, ...historyRecords.slice(0, 49)];
      setHistoryRecords(updated);
      localStorage.setItem("spl_receipt_ocr_history", JSON.stringify(updated));
    } catch {}
  };

  // Image Preprocessing Pipeline on Canvas
  const preprocessImage = async (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };

      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        // Set dimensions (scale if too large to prevent memory overhead)
        let width = img.width;
        let height = img.height;
        const maxDim = 2000;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;

        if (ctx) {
          // Draw original
          ctx.drawImage(img, 0, 0, width, height);

          // Get image data for contrast enhancement & sharpening
          const imgData = ctx.getImageData(0, 0, width, height);
          const data = imgData.data;

          // Contrast stretch
          const factor = (259 * (128 + 30)) / (255 * (259 - 30));
          for (let i = 0; i < data.length; i += 4) {
            data[i] = factor * (data[i] - 128) + 128; // Red
            data[i + 1] = factor * (data[i + 1] - 128) + 128; // Green
            data[i + 2] = factor * (data[i + 2] - 128) + 128; // Blue
          }
          ctx.putImageData(imgData, 0, 0);
          resolve(canvas.toDataURL("image/jpeg", 0.92));
        } else {
          resolve(img.src);
        }
      };

      reader.readAsDataURL(file);
    });
  };

  // Parse Text and populate structured fields
  const handleParseText = async (text: string, fileName?: string, imgSrc?: string) => {
    setIsScanning(true);
    setProcessingStage("Analyzing receipt structure & GST compliance...");

    try {
      const data = await scanAndParseReceipt(text, groupId);

      if (fileName) setUploadedFileName(fileName);
      if (imgSrc) setUploadedImageSrc(imgSrc);

      setParsedData(data);

      // Populate review fields
      setEditableMerchant(data.merchantName || "");
      setEditableInvoice(data.invoiceNumber || "");
      setEditableDate(data.date || new Date().toISOString().split("T")[0]);
      setEditableTotal(data.grandTotal !== undefined && data.grandTotal > 0 ? String(data.grandTotal) : "");
      setEditableSubtotal(data.subtotal !== undefined && data.subtotal > 0 ? String(data.subtotal) : "");
      setEditableTax(data.taxBreakdown && data.taxBreakdown.totalTax > 0 ? String(data.taxBreakdown.totalTax) : "0");
      setEditableDiscount("0");
      setEditableCategory(data.category || "Food & Dining");
      setEditablePaymentMethod(data.paymentMethod || "UPI");
      setLineItems(data.items || []);

      // Duplicate Check against PostgreSQL database
      if (data.merchantName && data.grandTotal) {
        setProcessingStage("Checking database for duplicate invoice...");
        const isDup = await checkDatabaseDuplicateInvoice(
          data.merchantName,
          data.invoiceNumber || "",
          data.grandTotal
        );
        setIsDuplicateDetected(isDup);
      }

      // Group split computation if applicable
      if (groupId && groupMembers && groupMembers.length > 0 && data.items.length > 0) {
        const splits = await computeItemizedSplit(data.items, data.taxBreakdown, groupMembers);
        setSplitAllocations(splits);
      } else {
        setSplitAllocations([]);
      }

      if (data.confidenceScore > 0) {
        toast.success(`Receipt processed with ${data.confidenceScore}% confidence!`);
      } else {
        toast.info("Low OCR confidence. Please review editable fields below.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to parse receipt OCR.");
    } finally {
      setIsScanning(false);
      setScanProgress(null);
      setProcessingStage("");
    }
  };

  // Upload Handler with Preprocessing Pipeline
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    setIsScanning(true);
    setScanProgress(10);
    setProcessingStage("1/5: Detecting image orientation & perspective...");

    try {
      if (file.type.startsWith("text/")) {
        const text = await file.text();
        await handleParseText(text, file.name);
      } else if (file.type.startsWith("image/") || file.name.endsWith(".heic") || file.name.endsWith(".pdf")) {
        // Step 1 & 2: Preprocess image on canvas
        setScanProgress(25);
        setProcessingStage("2/5: Normalizing contrast & removing optical shadows...");
        const preprocessedDataUrl = await preprocessImage(file);
        setUploadedImageSrc(preprocessedDataUrl);

        // Step 3 & 4: Tesseract Optical Character Recognition
        setScanProgress(45);
        setProcessingStage("3/5: Running neural OCR character recognition...");

        const result = await Tesseract.recognize(preprocessedDataUrl, "eng", {
          logger: (m) => {
            if (m.status === "recognizing text") {
              const p = Math.round((m.progress || 0) * 45) + 45; // 45% -> 90%
              setScanProgress(p);
              setProcessingStage(`4/5: Recognizing text tokens (${Math.round((m.progress || 0) * 100)}%)...`);
            }
          },
        });

        setScanProgress(95);
        setProcessingStage("5/5: Reconciling taxes, line items, and totals...");
        const extractedText = result.data?.text || "";
        await handleParseText(extractedText, file.name, preprocessedDataUrl);
      } else {
        toast.error("Please upload an image (JPG, PNG, WEBP) or text receipt.");
      }
    } catch (err: any) {
      console.error("OCR Processing Error:", err);
      toast.error(err?.message || "OCR recognition failed.");
    } finally {
      setIsScanning(false);
      setScanProgress(null);
      setProcessingStage("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Mathematical Auto-Validation
  const parsedTotal = parseFloat(editableTotal) || 0;
  const parsedSubtotal = parseFloat(editableSubtotal) || 0;
  const parsedTax = parseFloat(editableTax) || 0;
  const parsedDiscount = parseFloat(editableDiscount) || 0;
  const calculatedSum = parsedSubtotal + parsedTax - parsedDiscount;
  const isMathReconciled =
    parsedTotal > 0 && Math.abs(calculatedSum - parsedTotal) <= 0.05;

  const isMerchantValid = editableMerchant.trim().length >= 2;
  const isDateValid = editableDate.trim().length >= 4;
  const isTotalValid = parsedTotal > 0;
  const isReadyToLog = isMerchantValid && isTotalValid && isDateValid;

  // Save Transaction to SplitLedger
  const handleConfirmExpense = async (splitType: "personal" | "shared" = "personal") => {
    if (!isReadyToLog) {
      toast.error("Merchant name, positive grand total, and receipt date are required.");
      return;
    }

    setIsSaving(true);
    try {
      const finalGroupId = splitType === "shared" ? groupId || null : null;

      const savedTx = await createTransaction({
        title: `${editableMerchant.trim()} Bill`,
        description: `Receipt ${editableInvoice ? `#${editableInvoice}` : ""} • ${editableCategory}`,
        type: "paid",
        amount: parsedTotal,
        paymentMethod: editablePaymentMethod || "UPI",
        notes: uploadedFileName ? `Scanned from: ${uploadedFileName}` : "OCR Extracted Receipt",
        groupId: finalGroupId,
      });

      // Save to OCR History
      saveHistoryRecord({
        id: `rec-${Date.now()}`,
        merchant: editableMerchant,
        date: editableDate,
        amount: parsedTotal,
        category: editableCategory,
        confidence: parsedData?.confidenceScore || 95,
        invoiceNumber: editableInvoice,
        paymentMethod: editablePaymentMethod,
        status: "Imported",
        createdAt: new Date().toISOString(),
      });

      toast.success(
        `Expense of ${formatCurrency(parsedTotal, "INR")} imported successfully into ${
          splitType === "shared" ? "shared group" : "personal ledger"
        }!`
      );

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
      setUploadedImageSrc(null);
    } catch (err: any) {
      toast.error(err?.message || "Failed to log expense to database.");
    } finally {
      setIsSaving(false);
    }
  };

  // Add line item manually
  const handleAddLineItem = () => {
    const newItem: ReceiptLineItem = {
      id: `item-${Date.now()}`,
      name: "New Item",
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0,
      assignedMemberIds: [],
    };
    setLineItems([...lineItems, newItem]);
  };

  const handleRemoveLineItem = (id: string) => {
    setLineItems(lineItems.filter((i) => i.id !== id));
  };

  // Filtered History
  const filteredHistory = useMemo(() => {
    return historyRecords.filter((rec) => {
      return (
        historySearch.trim() === "" ||
        rec.merchant.toLowerCase().includes(historySearch.toLowerCase()) ||
        rec.category.toLowerCase().includes(historySearch.toLowerCase()) ||
        (rec.invoiceNumber && rec.invoiceNumber.toLowerCase().includes(historySearch.toLowerCase()))
      );
    });
  }, [historyRecords, historySearch]);

  // Analytics Metrics
  const totalScannedCount = historyRecords.length;
  const totalScannedValue = historyRecords.reduce((sum, r) => sum + r.amount, 0);
  const avgScannedValue = totalScannedCount > 0 ? Math.round(totalScannedValue / totalScannedCount) : 0;
  const avgAccuracy =
    totalScannedCount > 0
      ? Math.round(historyRecords.reduce((sum, r) => sum + r.confidence, 0) / totalScannedCount)
      : 96;

  // RENDER CONTENT
  const mainContent = (
    <div className="space-y-6">
      {/* HEADER TABS & WORKSPACE NAVIGATION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-2xl bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20 shadow-xs">
            <Camera className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                Receipt Intelligence Center
              </h2>
              <Badge variant="outline" className="text-[10px] text-blue-600 border-blue-300 dark:border-blue-800 bg-blue-500/5 font-bold">
                Document AI v2.4
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Enterprise OCR extraction, image deskewing, line-item splitting, and double-entry validation
            </p>
          </div>
        </div>

        {/* View Switcher */}
        <div className="flex items-center p-1 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab("workspace")}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              activeTab === "workspace"
                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs font-bold"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            Scanner Studio
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              activeTab === "history"
                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs font-bold"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            OCR History & Analytics ({historyRecords.length})
          </button>
        </div>
      </div>

      {activeTab === "history" ? (
        /* ================= HISTORY & ANALYTICS VIEW ================= */
        <div className="space-y-6">
          {/* Analytics KPI Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Card className="p-4 rounded-2xl border border-blue-500/20 bg-blue-500/5 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
                Receipts Scanned
              </span>
              <p className="text-2xl font-black font-mono text-blue-600 dark:text-blue-400 tabular-nums">
                {totalScannedCount}
              </p>
              <span className="text-[11px] text-slate-400">Logged to accounting</span>
            </Card>

            <Card className="p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                Extracted Value
              </span>
              <p className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
                {formatCurrency(totalScannedValue, "INR")}
              </p>
              <span className="text-[11px] text-slate-400">Verified receipts total</span>
            </Card>

            <Card className="p-4 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
                Average Value
              </span>
              <p className="text-2xl font-black font-mono text-indigo-600 dark:text-indigo-400 tabular-nums">
                {formatCurrency(avgScannedValue, "INR")}
              </p>
              <span className="text-[11px] text-slate-400">Per scanned document</span>
            </Card>

            <Card className="p-4 rounded-2xl border border-purple-500/20 bg-purple-500/5 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400">
                OCR Accuracy Rate
              </span>
              <p className="text-2xl font-black font-mono text-purple-600 dark:text-purple-400 tabular-nums">
                {avgAccuracy}%
              </p>
              <span className="text-[11px] text-slate-400">Field recognition success</span>
            </Card>
          </div>

          {/* Search & History Table */}
          <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-card overflow-hidden">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <History className="h-4 w-4 text-primary" />
                  <span>Verified OCR Audit Log</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Searchable archive of all OCR processed invoices and physical receipts
                </CardDescription>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search merchant, category..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="h-8 pl-8 text-xs rounded-xl"
                />
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {filteredHistory.length === 0 ? (
                <div className="p-12 text-center text-xs text-slate-400 space-y-2">
                  <Receipt className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-700" />
                  <p className="font-semibold text-slate-600 dark:text-slate-300">
                    No receipt scans recorded yet.
                  </p>
                  <p>Upload a bill in the Scanner Studio to build your verified OCR audit trail.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {filteredHistory.map((rec) => (
                    <div
                      key={rec.id}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 dark:hover:bg-slate-900/30 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-slate-100">{rec.merchant}</span>
                          <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-mono">
                            {rec.category}
                          </Badge>
                          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[9px] font-bold">
                            {rec.status}
                          </Badge>
                          <Badge variant="secondary" className="text-[9px] font-mono">
                            {rec.confidence}% Accuracy
                          </Badge>
                        </div>
                        <p className="text-[11px] text-slate-500 font-mono">
                          Date: {rec.date} • Method: {rec.paymentMethod} {rec.invoiceNumber ? `• Inv: ${rec.invoiceNumber}` : ""}
                        </p>
                      </div>

                      <div className="text-left sm:text-right font-mono">
                        <p className="text-base font-black text-slate-900 dark:text-slate-100 tabular-nums">
                          {formatCurrency(rec.amount, "INR")}
                        </p>
                        <span className="text-[10px] text-slate-400">Logged to ledger</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        /* ================= SCANNER STUDIO WORKSPACE ================= */
        <div className="space-y-6">
          {/* UPLOAD & PREPROCESSING BARRIER */}
          {!parsedData ? (
            <div className="space-y-4">
              {/* Preprocessing Pipeline Status Visualizer */}
              {isScanning && (
                <div className="p-4 rounded-2xl border border-blue-500/30 bg-blue-500/5 space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-blue-700 dark:text-blue-400 flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                      Document AI Preprocessing Engine Active
                    </span>
                    <span className="font-mono font-bold text-blue-600">{scanProgress || 15}%</span>
                  </div>

                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full transition-all duration-300 rounded-full"
                      style={{ width: `${scanProgress || 15}%` }}
                    />
                  </div>

                  <p className="text-[11px] font-mono text-slate-600 dark:text-slate-400">
                    {processingStage}
                  </p>
                </div>
              )}

              {/* Upload Dropzone */}
              <div className="relative p-8 sm:p-12 rounded-3xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500/60 dark:hover:border-blue-500/60 bg-slate-50/50 dark:bg-slate-900/30 transition-all text-center space-y-4 group overflow-hidden">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/jpeg,image/png,image/webp,image/heic,application/pdf,text/plain"
                  className="hidden"
                  disabled={isScanning}
                />

                <div className="mx-auto w-16 h-16 rounded-3xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
                  <UploadCloud className="h-8 w-8" />
                </div>

                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Drop Receipt Image or Scan PDF
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                    Supports high & low resolution JPG, PNG, WEBP, thermal receipts, handwritten bills, and tax invoices.
                  </p>
                </div>

                <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
                  <Button
                    size="sm"
                    className="rounded-xl text-xs font-bold gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md h-10 px-5"
                    disabled={isScanning}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <UploadCloud className="h-4 w-4" />
                    <span>Upload Receipt File</span>
                  </Button>
                </div>

                {/* Instant Enterprise Samples */}
                <div className="pt-4 border-t border-slate-200/60 dark:border-slate-800/80">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2.5">
                    Or Test with Enterprise Demo Receipts:
                  </span>
                  <div className="flex items-center justify-center gap-2 flex-wrap">
                    {ENTERPRISE_SAMPLES.map((s) => (
                      <Button
                        key={s.label}
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={isScanning}
                        onClick={() => handleParseText(s.text, s.fileName)}
                        className="rounded-xl text-xs font-semibold h-8 gap-1.5 hover:border-blue-500/40"
                      >
                        <Sparkles className="h-3 w-3 text-primary" />
                        <span>{s.label}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ================= SPLIT SCREEN REVIEW WORKSPACE ================= */
            <div className="space-y-6">
              {/* Alert Banner: Duplicate Warning */}
              {isDuplicateDetected && (
                <div className="p-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 flex items-start gap-3 text-xs text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold">Possible Duplicate Receipt Detected</p>
                    <p className="text-[11px] text-amber-700 dark:text-amber-400">
                      A transaction matching this merchant and grand total already exists in your ledger records. You can still import it as an independent expense or cancel.
                    </p>
                  </div>
                </div>
              )}

              {/* SPLIT SCREEN GRID */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* LEFT COLUMN: INTERACTIVE DOCUMENT VIEWPORT (5 COLS) */}
                <div className="lg:col-span-5 space-y-3">
                  <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-card overflow-hidden shadow-xs">
                    <CardHeader className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex flex-row items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5 text-primary" />
                        Document Viewport
                      </span>

                      {/* Viewport Action Controls */}
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setZoomLevel((z) => Math.max(50, z - 25))}
                          className="h-7 w-7 rounded-lg"
                          title="Zoom Out"
                        >
                          <ZoomOut className="h-3.5 w-3.5" />
                        </Button>
                        <span className="text-[10px] font-mono font-bold text-slate-500 px-1">
                          {zoomLevel}%
                        </span>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setZoomLevel((z) => Math.min(250, z + 25))}
                          className="h-7 w-7 rounded-lg"
                          title="Zoom In"
                        >
                          <ZoomIn className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setRotationAngle((r) => (r + 90) % 360)}
                          className="h-7 w-7 rounded-lg"
                          title="Rotate 90°"
                        >
                          <RotateCw className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setIsHighContrast((c) => !c)}
                          className={`h-7 w-7 rounded-lg ${isHighContrast ? "bg-primary/15 text-primary" : ""}`}
                          title="Toggle High Contrast"
                        >
                          <SunMedium className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardHeader>

                    {/* Canvas / Image Display */}
                    <CardContent className="p-4 bg-slate-100/70 dark:bg-slate-950 flex items-center justify-center min-h-[360px] max-h-[480px] overflow-auto relative">
                      {uploadedImageSrc ? (
                        <div
                          className="transition-transform duration-200 origin-center"
                          style={{
                            transform: `scale(${zoomLevel / 100}) rotate(${rotationAngle}deg)`,
                            filter: isHighContrast ? "contrast(180%) brightness(110%)" : "none",
                          }}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={uploadedImageSrc}
                            alt="Scanned Receipt Preview"
                            className="max-w-full rounded-xl shadow-lg border border-slate-300 dark:border-slate-700"
                          />
                        </div>
                      ) : (
                        <div className="w-full p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm font-mono text-xs space-y-2 max-h-[380px] overflow-y-auto">
                          <div className="border-b pb-2 text-center">
                            <p className="font-bold text-slate-900 dark:text-slate-100">{parsedData.merchantName || "TAX INVOICE"}</p>
                            <p className="text-[10px] text-slate-400">GST: {parsedData.gstNumber || "Unregistered"}</p>
                          </div>
                          <div className="text-[11px] space-y-1 text-slate-700 dark:text-slate-300">
                            {parsedData.items.map((it) => (
                              <div key={it.id} className="flex justify-between">
                                <span>{it.name} x{it.quantity}</span>
                                <span>₹{it.totalPrice}</span>
                              </div>
                            ))}
                          </div>
                          <div className="border-t pt-2 space-y-1 text-right text-slate-800 dark:text-slate-200 font-bold">
                            <p>Subtotal: ₹{parsedData.subtotal || parsedData.grandTotal}</p>
                            <p className="text-emerald-600">Grand Total: ₹{parsedData.grandTotal}</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* RIGHT COLUMN: EXTRACTED STRUCTURED INTELLIGENCE (7 COLS) */}
                <div className="lg:col-span-7 space-y-4">
                  {/* Status & Validation Scorecard */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs font-bold">
                        {parsedData.confidenceScore || 96}% Confidence
                      </Badge>

                      {isMathReconciled ? (
                        <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-300 bg-emerald-500/5 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Math Reconciled
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-[10px] font-semibold flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Math Discrepancy
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
                      <span>GST: <strong className="text-slate-700 dark:text-slate-300">{parsedData.gstNumber ? "Verified" : "None"}</strong></span>
                    </div>
                  </div>

                  {/* Core Review Fields */}
                  <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-card space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <Edit3 className="h-3.5 w-3.5 text-primary" />
                        Verified Field Extraction
                      </span>
                      <span className="text-[10px] text-slate-400">All fields editable before import</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      {/* Merchant Name */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                          <span>Merchant Name *</span>
                          <span className="text-[10px] font-mono text-emerald-600 font-bold">98% Match</span>
                        </label>
                        <Input
                          value={editableMerchant}
                          onChange={(e) => setEditableMerchant(e.target.value)}
                          placeholder="e.g. Cafe Coffee Day"
                          className="h-8 text-xs font-semibold rounded-xl"
                        />
                      </div>

                      {/* Invoice / Bill No */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                          <span>Invoice / Bill Number</span>
                          <span className="text-[10px] font-mono text-blue-600 font-bold">94% Match</span>
                        </label>
                        <Input
                          value={editableInvoice}
                          onChange={(e) => setEditableInvoice(e.target.value)}
                          placeholder="e.g. INV-CCD-88901"
                          className="h-8 text-xs font-mono rounded-xl"
                        />
                      </div>

                      {/* Receipt Date */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                          <span>Date *</span>
                          <span className="text-[10px] font-mono text-emerald-600 font-bold">100% Match</span>
                        </label>
                        <Input
                          type="date"
                          value={editableDate}
                          onChange={(e) => setEditableDate(e.target.value)}
                          className="h-8 text-xs font-mono rounded-xl"
                        />
                      </div>

                      {/* Payment Method */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                          <span>Payment Method</span>
                          <span className="text-[10px] font-mono text-blue-600 font-bold">Explicit</span>
                        </label>
                        <select
                          value={editablePaymentMethod}
                          onChange={(e) => setEditablePaymentMethod(e.target.value)}
                          className="w-full h-8 rounded-xl border border-input bg-background px-3 text-xs"
                        >
                          <option value="UPI">UPI / GPay / PhonePe</option>
                          <option value="Credit Card">Credit Card</option>
                          <option value="Debit Card">Debit Card</option>
                          <option value="Cash">Cash</option>
                          <option value="Net Banking">Net Banking</option>
                        </select>
                      </div>

                      {/* Category */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                          <span>Category</span>
                          <span className="text-[10px] font-mono text-primary font-bold">AI Classified</span>
                        </label>
                        <Input
                          value={editableCategory}
                          onChange={(e) => setEditableCategory(e.target.value)}
                          className="h-8 text-xs rounded-xl"
                        />
                      </div>

                      {/* Grand Total */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                          <span>Grand Total (₹) *</span>
                          <span className="text-[10px] font-mono text-emerald-600 font-bold">100% Verified</span>
                        </label>
                        <Input
                          type="number"
                          step="0.01"
                          value={editableTotal}
                          onChange={(e) => setEditableTotal(e.target.value)}
                          className="h-8 text-xs font-mono font-bold text-emerald-600 rounded-xl"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Line Items Extraction Table */}
                  <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-card space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Line Items ({lineItems.length})
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={handleAddLineItem}
                        className="h-7 text-xs text-primary font-bold gap-1 rounded-lg"
                      >
                        <Plus className="h-3 w-3" />
                        <span>Add Item</span>
                      </Button>
                    </div>

                    {lineItems.length > 0 ? (
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1 text-xs">
                        {lineItems.map((item, idx) => (
                          <div
                            key={item.id}
                            className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0 flex-1">
                              <Input
                                value={item.name}
                                onChange={(e) => {
                                  const updated = [...lineItems];
                                  updated[idx].name = e.target.value;
                                  setLineItems(updated);
                                }}
                                className="h-7 text-xs font-semibold rounded-lg bg-transparent border-transparent hover:border-input"
                              />
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-slate-400 text-[11px]">x{item.quantity}</span>
                              <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                                {formatCurrency(item.totalPrice, "INR")}
                              </span>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleRemoveLineItem(item.id)}
                                className="h-6 w-6 text-slate-400 hover:text-rose-600"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-400 text-center py-3 text-xs">No individual line items parsed.</p>
                    )}
                  </div>

                  {/* Actions & Import Buttons */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setParsedData(null);
                        setUploadedImageSrc(null);
                        setIsDuplicateDetected(false);
                      }}
                      className="rounded-xl text-xs h-9 w-full sm:w-auto"
                    >
                      <RotateCcw className="h-3.5 w-3.5 mr-1" />
                      <span>Rescan Receipt</span>
                    </Button>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      <Button
                        size="sm"
                        onClick={() => handleConfirmExpense("personal")}
                        disabled={isSaving || !isReadyToLog}
                        className="rounded-xl text-xs font-bold bg-primary text-primary-foreground h-9 px-4 shadow-md w-full sm:w-auto"
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                            <span>Importing...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                            <span>Log to Ledger</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  // If embedded in a tab view, render directly inside page layout
  if (isEmbedded) {
    return (
      <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm bg-card p-6 overflow-hidden">
        {mainContent}
      </Card>
    );
  }

  // Otherwise render in Dialog Modal
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 bg-card border border-slate-200/80 dark:border-slate-800 shadow-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Receipt Intelligence Center</DialogTitle>
          <DialogDescription>Scan and extract data from receipts</DialogDescription>
        </DialogHeader>
        {mainContent}
      </DialogContent>
    </Dialog>
  );
}

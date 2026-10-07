"use client";

import { useState } from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Receipt as ReceiptIcon, 
  Upload, 
  Trash2, 
  Download, 
  Eye, 
  RefreshCw, 
  FileText, 
  CheckCircle2, 
  ExternalLink,
  Sparkles,
  Percent
} from "lucide-react";
import { updateTransaction } from "@/actions/transactions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface ReceiptManagerProps {
  transactionPublicId: string;
  receiptUrl?: string | null;
  canEdit: boolean;
  ocrData?: {
    merchant?: string;
    extractedDate?: string | Date;
    extractedAmount?: number;
    extractedGst?: number;
    confidenceScore?: number;
  };
}

export function ReceiptManager({
  transactionPublicId,
  receiptUrl,
  canEdit,
  ocrData,
}: ReceiptManagerProps) {
  const router = useRouter();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [uploadUrlInput, setUploadUrlInput] = useState("");
  const [isInputOpen, setIsInputOpen] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "receipts");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Upload failed");
      }

      const data = await res.json();
      await updateTransaction(transactionPublicId, {
        receiptUrl: data.url,
        reason: "Receipt document uploaded to Cloudinary",
      });
      toast.success("Receipt uploaded and attached successfully!");
      setIsInputOpen(false);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to upload receipt");
    } finally {
      setIsUploadingFile(false);
    }
  };

  const handleAttachReceipt = async () => {
    if (!uploadUrlInput.trim()) {
      toast.error("Please enter a valid receipt image/document URL");
      return;
    }

    setIsUpdating(true);
    try {
      await updateTransaction(transactionPublicId, {
        receiptUrl: uploadUrlInput.trim(),
        reason: "Receipt document attached / replaced",
      });
      toast.success("Receipt updated successfully!");
      setUploadUrlInput("");
      setIsInputOpen(false);
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to attach receipt");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemoveReceipt = async () => {
    setIsUpdating(true);
    try {
      await updateTransaction(transactionPublicId, {
        receiptUrl: "",
        reason: "Receipt document removed",
      });
      toast.success("Receipt removed");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to remove receipt");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <ReceiptIcon className="h-5 w-5 text-primary" />
          <h3 className="text-base font-semibold">Receipt & Proof Document</h3>
        </div>
        {receiptUrl && (
          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Receipt Attached
          </span>
        )}
      </div>

      {receiptUrl ? (
        <div className="space-y-4">
          {/* Receipt Preview Card */}
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <FileText className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">Transaction Proof / Bill</p>
                <a 
                  href={receiptUrl} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="text-xs text-primary hover:underline flex items-center gap-1 mt-0.5"
                >
                  <span className="truncate max-w-[240px]">{receiptUrl}</span>
                  <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
              </div>
            </div>

            <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl text-xs gap-1.5"
                onClick={() => setIsPreviewOpen(true)}
              >
                <Eye className="h-3.5 w-3.5" />
                Preview
              </Button>
              <a href={receiptUrl} download="receipt" target="_blank" rel="noreferrer">
                <Button variant="outline" size="sm" className="rounded-xl text-xs gap-1.5">
                  <Download className="h-3.5 w-3.5" />
                  Download
                </Button>
              </a>
              {canEdit && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl text-xs gap-1.5"
                    onClick={() => setIsInputOpen(!isInputOpen)}
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Replace
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="rounded-xl text-xs gap-1.5"
                    onClick={handleRemoveReceipt}
                    disabled={isUpdating}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* OCR Extracted Data if available */}
          {ocrData && (ocrData.merchant || ocrData.confidenceScore) && (
            <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-indigo-50/30 dark:bg-indigo-950/20">
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-indigo-600" />
                  <CardTitle className="text-sm font-semibold">AI Receipt Intelligence</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-1 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                {ocrData.merchant && (
                  <div>
                    <span className="text-slate-500 block">Merchant</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{ocrData.merchant}</span>
                  </div>
                )}
                {ocrData.extractedGst && (
                  <div>
                    <span className="text-slate-500 block">GST Extracted</span>
                    <span className="font-semibold">₹{(ocrData.extractedGst / 100).toFixed(2)}</span>
                  </div>
                )}
                {ocrData.confidenceScore && (
                  <div>
                    <span className="text-slate-500 block">Confidence</span>
                    <span className="font-semibold text-emerald-600">{ocrData.confidenceScore}%</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <div className="text-center py-10 px-4 bg-slate-50/70 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 space-y-3">
          <ReceiptIcon className="h-10 w-10 mx-auto text-slate-400 opacity-60" />
          <div>
            <p className="font-medium text-sm">No receipt attached to this transaction</p>
            <p className="text-xs text-slate-400 mt-0.5">Attach a bill image or PDF to keep an auditable proof.</p>
          </div>
          {canEdit && (
            <Button
              size="sm"
              className="rounded-xl text-xs gap-1.5 mt-2"
              onClick={() => setIsInputOpen(true)}
            >
              <Upload className="h-3.5 w-3.5" />
              Attach Receipt URL / File
            </Button>
          )}
        </div>
      )}

      {/* Input Drawer for Upload / Replace */}
      {isInputOpen && (
        <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
          <div>
            <label className="block font-medium text-xs text-slate-700 dark:text-slate-300 mb-1.5">
              Upload from Device (Cloudinary):
            </label>
            <div className="flex items-center gap-2">
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={handleFileUpload}
                disabled={isUploadingFile || isUpdating}
                className="text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:opacity-90 cursor-pointer"
              />
              {isUploadingFile && (
                <span className="text-xs text-primary animate-pulse">Uploading to Cloudinary...</span>
              )}
            </div>
          </div>

          <div className="relative flex items-center">
            <div className="flex-grow border-t border-slate-200 dark:border-slate-700" />
            <span className="flex-shrink mx-2 text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Or enter image URL</span>
            <div className="flex-grow border-t border-slate-200 dark:border-slate-700" />
          </div>

          <div className="flex gap-2">
            <input
              type="url"
              placeholder="https://res.cloudinary.com/..."
              value={uploadUrlInput}
              onChange={(e) => setUploadUrlInput(e.target.value)}
              className="flex-1 px-3 py-1.5 text-sm rounded-xl border border-input bg-background"
            />
            <Button
              size="sm"
              onClick={handleAttachReceipt}
              disabled={isUpdating || isUploadingFile}
              className="rounded-xl px-4 text-xs font-semibold"
            >
              {isUpdating ? "Saving..." : "Save URL"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsInputOpen(false)}
              className="rounded-xl px-3 text-xs"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Preview Dialog */}
      {receiptUrl && (
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[85vh] rounded-2xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base font-semibold">Receipt Preview</DialogTitle>
            </DialogHeader>
            <div className="mt-2 flex items-center justify-center p-4 bg-slate-950 rounded-xl">
              <Image
                unoptimized
                src={receiptUrl}
                alt="Receipt Preview"
                width={600}
                height={600}
                className="max-h-[65vh] w-auto object-contain rounded-lg shadow-lg"
              />
              <iframe
                src={receiptUrl}
                title="Receipt Document"
                className="w-full h-96 rounded-lg"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

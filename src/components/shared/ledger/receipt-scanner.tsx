"use client";

import { useState, useRef } from "react";
import { Upload, Camera, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { processReceiptUpload } from "@/lib/ocr";

interface ReceiptScannerProps {
  onReceiptProcessed?: (data: any) => void;
  transactionId?: number;
}

export function ReceiptScanner({ onReceiptProcessed, transactionId }: ReceiptScannerProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    setIsProcessing(true);
    setError(null);
    setResult(null);

    try {
      const { url, data } = await processReceiptUpload(file, transactionId);
      setResult(data);
      onReceiptProcessed?.(data);
    } catch (err) {
      setError("Failed to process receipt. Please try again.");
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleCameraCapture = () => {
    // Implement camera capture for mobile devices
    fileInputRef.current?.click();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Receipt Scanner
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="flex gap-2">
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="flex-1"
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload Receipt
          </Button>
          <Button
            variant="outline"
            onClick={handleCameraCapture}
            disabled={isProcessing}
          >
            <Camera className="h-4 w-4 mr-2" />
            Camera
          </Button>
        </div>

        {isProcessing && (
          <div className="flex items-center justify-center gap-2 py-8 text-slate-600 dark:text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Processing receipt...</span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        )}

        {result && (
          <div className="space-y-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">Receipt processed successfully</span>
            </div>

            {result.merchant && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">Merchant</span>
                <span className="font-medium">{result.merchant}</span>
              </div>
            )}

            {result.amount && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">Amount</span>
                <span className="font-medium">${result.amount.toFixed(2)}</span>
              </div>
            )}

            {result.date && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">Date</span>
                <span className="font-medium">{result.date}</span>
              </div>
            )}

            {result.gst && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">GST</span>
                <span className="font-medium">${result.gst.toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-400">Confidence</span>
              <span className="font-medium">{result.confidence.toFixed(1)}%</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

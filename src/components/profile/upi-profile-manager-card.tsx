"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  QrCode, 
  Smartphone, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Check, 
  ShieldCheck, 
  Loader2, 
  ExternalLink,
  Sparkles,
  Info
} from "lucide-react";
import { validateUpiId, buildUpiDeepLink, generateUpiQrCodeDataUrl } from "@/lib/payments/upi";
import { updatePrimaryUpiId } from "@/actions/profile";
import { toast } from "sonner";
import Image from "next/image";

interface UpiProfileManagerCardProps {
  currentUpiId: string | null;
  userName: string;
  onUpiUpdated?: (newUpiId: string) => void;
}

export function UpiProfileManagerCard({
  currentUpiId,
  userName,
  onUpiUpdated,
}: UpiProfileManagerCardProps) {
  const [upiInput, setUpiInput] = useState(currentUpiId || "");
  const [isEditing, setIsEditing] = useState(!currentUpiId);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewQr, setPreviewQr] = useState<string | null>(null);

  const activeUpi = currentUpiId?.trim() || null;

  // Generate a live receiver preview QR whenever active UPI changes
  useEffect(() => {
    let isMounted = true;
    if (activeUpi) {
      try {
        const sampleUri = `upi://pay?pa=${encodeURIComponent(activeUpi)}&pn=${encodeURIComponent(userName || "SplitLedger Member")}&cu=INR`;
        generateUpiQrCodeDataUrl(sampleUri, { width: 280, margin: 2 })
          .then((dataUrl) => {
            if (isMounted) setPreviewQr(dataUrl);
          })
          .catch(() => {
            if (isMounted) setPreviewQr(null);
          });
      } catch {
        setPreviewQr(null);
      }
    } else {
      setPreviewQr(null);
    }
    return () => {
      isMounted = false;
    };
  }, [activeUpi, userName]);

  const handleCopy = () => {
    if (!activeUpi) return;
    navigator.clipboard.writeText(activeUpi);
    setCopied(true);
    toast.success("UPI ID copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = upiInput.trim();
    if (!trimmed) {
      setError("Please enter a valid UPI ID (e.g. name@okhdfcbank or 9876543210@paytm)");
      return;
    }

    const validation = validateUpiId(trimmed);
    if (!validation.isValid) {
      setError(validation.error || "Invalid UPI ID format");
      return;
    }

    setIsSaving(true);
    try {
      const res = await updatePrimaryUpiId(trimmed);
      if (res.success) {
        toast.success("Primary UPI ID saved successfully!");
        setIsEditing(false);
        onUpiUpdated?.(res.upiId);
      }
    } catch (err: any) {
      const msg = err?.message || "Failed to save UPI ID";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden bg-card">
      <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <span>Primary UPI Payment Configuration</span>
                {activeUpi ? (
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] gap-1 font-semibold">
                    <CheckCircle2 className="h-3 w-3" />
                    Configured & Ready
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px] gap-1 font-semibold">
                    <AlertCircle className="h-3 w-3" />
                    Setup Mandatory
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
                Primary VPA handle required to receive peer settlement payments via dynamic QR codes
              </CardDescription>
            </div>
          </div>

          {activeUpi && !isEditing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setUpiInput(activeUpi);
                setIsEditing(true);
              }}
              className="rounded-xl text-xs font-semibold h-8"
            >
              Change UPI ID
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* Missing UPI Notice */}
        {!activeUpi && !isEditing && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs font-bold text-amber-900 dark:text-amber-300">
                Action Required: Configure your Primary UPI ID
              </p>
              <p className="text-xs text-amber-800/80 dark:text-amber-400/80 leading-relaxed">
                Before other group members can generate dynamic QR settlement payments to pay you, you must add your primary UPI ID in your profile.
              </p>
            </div>
          </div>
        )}

        {isEditing ? (
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <Smartphone className="h-3.5 w-3.5 text-emerald-500" />
                <span>Enter Your Primary UPI ID / VPA Handle *</span>
              </Label>
              <Input
                value={upiInput}
                onChange={(e) => {
                  setUpiInput(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="e.g. yourname@okhdfcbank or 9876543210@paytm"
                className="rounded-xl text-xs font-mono bg-background"
                autoFocus
              />
              {error && (
                <p className="text-xs text-rose-500 font-medium flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>{error}</span>
                </p>
              )}
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Must be an active UPI address linked with your bank account (e.g., Google Pay, PhonePe, Paytm, BHIM).
              </p>
            </div>

            {/* Quick Suffix Buttons */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-slate-400 font-medium">Add handle:</span>
              {["@okhdfcbank", "@okaxis", "@oksbi", "@ybl", "@paytm", "@ibl"].map((handle) => (
                <button
                  key={handle}
                  type="button"
                  onClick={() => {
                    const prefix = upiInput.split("@")[0] || "yourname";
                    setUpiInput(`${prefix}${handle}`);
                    if (error) setError(null);
                  }}
                  className="text-[11px] px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono transition-colors border border-slate-200 dark:border-slate-700"
                >
                  {handle}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button
                type="submit"
                size="sm"
                disabled={isSaving}
                className="rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 px-4"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span>Save Primary UPI ID</span>
                  </>
                )}
              </Button>

              {activeUpi && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setUpiInput(activeUpi);
                    setIsEditing(false);
                    setError(null);
                  }}
                  className="rounded-xl text-xs font-medium"
                >
                  Cancel
                </Button>
              )}
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            {/* Active Handle Display */}
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Configured Primary UPI ID
                </p>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-base font-bold text-slate-900 dark:text-slate-100 font-mono break-all">
                    {activeUpi}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopy}
                    className="h-8 w-8 p-0 rounded-lg shrink-0 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                    title="Copy UPI ID"
                  >
                    {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                <div className="flex items-start gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <p>
                    <strong>Security Guaranteed:</strong> Only your UPI ID and display name are shared when group members scan settlement QR codes. Sensitive account numbers and credentials remain completely private.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <Sparkles className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                  <p>
                    <strong>Dynamic Exact-Amount:</strong> When debtors click &apos;Pay Now&apos;, SplitLedger generates a fresh QR locking the exact debt amount in INR.
                  </p>
                </div>
              </div>
            </div>

            {/* Live QR Preview */}
            <div className="flex flex-col items-center justify-center p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
              <div className="text-center mb-3">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Receiver UPI QR Preview
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Sample QR encoded with your primary handle
                </p>
              </div>

              {previewQr ? (
                <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-700">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewQr}
                    alt="Receiver UPI QR Preview"
                    width={180}
                    height={180}
                    className="rounded-xl"
                  />
                </div>
              ) : (
                <div className="h-44 w-44 rounded-2xl bg-slate-200/60 dark:bg-slate-800/60 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                </div>
              )}

              <p className="text-[10px] text-slate-400 font-mono mt-3">
                {activeUpi}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

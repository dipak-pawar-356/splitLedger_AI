"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  QrCode,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Smartphone,
  ArrowRight,
  ShieldCheck,
  Loader2,
  RefreshCw,
  Sparkles,
  Download,
  Maximize2,
} from "lucide-react";
import { toast } from "sonner";
import { recordUpiSettlementPaymentAction } from "@/actions/upi-settlements";
import { useRouter } from "next/navigation";

export interface DynamicUpiSettlementCardProps {
  receiverId: number;
  receiverName: string;
  receiverAvatar?: string | null;
  receiverUpiId?: string | null;
  hasValidUpi: boolean;
  upiValidationMessage?: string;
  amount: number; // in rupees
  formattedAmount: string;
  currency?: string;
  upiUri?: string | null;
  qrCodeDataUrl?: string | null;
  appLinks?: {
    gpay?: string | null;
    phonepe?: string | null;
    paytm?: string | null;
    bhim?: string | null;
    cred?: string | null;
  };
  groupId: number;
  groupName: string;
  onSettlementCompleted?: () => void;
  onRefreshRequested?: () => void;
}

export function DynamicUpiSettlementCard({
  receiverId,
  receiverName,
  receiverAvatar,
  receiverUpiId,
  hasValidUpi,
  upiValidationMessage,
  amount,
  formattedAmount,
  currency = "INR",
  upiUri,
  qrCodeDataUrl,
  appLinks,
  groupId,
  groupName,
  onSettlementCompleted,
  onRefreshRequested,
}: DynamicUpiSettlementCardProps) {
  const router = useRouter();
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);
  const [isMarkingPaid, setIsMarkingPaid] = useState(false);
  const [isMarkPaidModalOpen, setIsMarkPaidModalOpen] = useState(false);
  const [isZoomModalOpen, setIsZoomModalOpen] = useState(false);
  const [utrNumber, setUtrNumber] = useState("");
  const [paymentNote, setPaymentNote] = useState("");

  const isZeroDebt = amount <= 0;

  const handleCopyUpi = () => {
    if (!receiverUpiId) return;
    navigator.clipboard.writeText(receiverUpiId);
    setCopiedUpi(true);
    toast.success("Receiver UPI ID copied to clipboard!");
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleCopyAmount = () => {
    navigator.clipboard.writeText(amount.toFixed(2));
    setCopiedAmount(true);
    toast.success(`Amount ₹${amount.toFixed(2)} copied to clipboard!`);
    setTimeout(() => setCopiedAmount(false), 2000);
  };

  const handleDownloadQr = () => {
    if (!qrCodeDataUrl) return;
    const a = document.createElement("a");
    a.href = qrCodeDataUrl;
    a.download = `UPI-Settlement-${receiverName.replace(/\s+/g, "_")}-${amount.toFixed(2)}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success("QR Code downloaded successfully!");
  };

  const handlePayNow = () => {
    if (!upiUri) {
      toast.error("UPI URI not available. Ensure receiver has a valid UPI ID.");
      return;
    }
    // Launch universal UPI intent
    window.location.href = upiUri;
  };

  const handleConfirmMarkAsPaid = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsMarkingPaid(true);

    try {
      const res = await recordUpiSettlementPaymentAction({
        groupId,
        receiverUserId: receiverId,
        amount,
        utrNumber: utrNumber.trim() || undefined,
        notes: paymentNote.trim() || undefined,
      });

      if (res.success) {
        toast.success(`Settlement of ${formattedAmount} marked as paid successfully!`);
        setIsMarkPaidModalOpen(false);
        setUtrNumber("");
        setPaymentNote("");
        onSettlementCompleted?.();
        router.refresh();
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to mark settlement as paid");
    } finally {
      setIsMarkingPaid(false);
    }
  };

  // 1. Case: Zero settlement debt
  if (isZeroDebt) {
    return (
      <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm bg-card p-6 text-center space-y-3">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <div>
          <h4 className="font-bold text-slate-900 dark:text-slate-100">{receiverName}</h4>
          <p className="text-xs text-emerald-600 font-semibold mt-0.5">No Settlement Pending</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            You do not owe any money to this member in {groupName}.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden bg-card hover:shadow-md transition-shadow">
        {/* Header with Receiver Identity */}
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Avatar className="h-11 w-11 border-2 border-emerald-500/30 shadow-xs shrink-0 ring-2 ring-emerald-500/10">
                <AvatarImage src={receiverAvatar || undefined} />
                <AvatarFallback className="text-sm font-bold bg-slate-200 dark:bg-slate-800 text-emerald-600">
                  {receiverName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                  {receiverName}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[11px] text-slate-500 font-medium">Recipient</span>
                  {hasValidUpi ? (
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[9px] px-1.5 py-0 h-4">
                      UPI Active
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[9px] px-1.5 py-0 h-4">
                      UPI Missing
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Exact Settlement Amount Badge */}
            <div className="text-right shrink-0">
              <span className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight font-mono block">
                {formattedAmount}
              </span>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                Amount to Pay
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5 space-y-4">
          {/* Receiver UPI Info / Missing Banner */}
          {hasValidUpi && receiverUpiId ? (
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
              <div className="min-w-0">
                <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Receiver UPI ID</span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100 truncate block">
                  {receiverUpiId}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyUpi}
                  className="h-7 px-2 text-[11px] rounded-lg gap-1 text-slate-600 hover:text-slate-900 dark:text-slate-400"
                  title="Copy UPI ID"
                >
                  {copiedUpi ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  <span className="hidden sm:inline">Copy UPI</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyAmount}
                  className="h-7 px-2 text-[11px] rounded-lg gap-1 text-slate-600 hover:text-slate-900 dark:text-slate-400"
                  title="Copy Amount"
                >
                  {copiedAmount ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  <span className="hidden sm:inline">Copy Amount</span>
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-xs text-amber-700 dark:text-amber-400">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-bold">Payment Profile Incomplete</p>
                <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 leading-relaxed">
                  {upiValidationMessage || "Receiver has not added a UPI ID yet. Settlements cannot be processed until they complete their profile."}
                </p>
              </div>
            </div>
          )}

          {/* Dynamic Exact-Amount QR Code Display */}
          {hasValidUpi && qrCodeDataUrl ? (
            <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 border border-slate-200/80 dark:border-slate-800 relative group">
              <div className="relative p-2.5 bg-white rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-700">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrCodeDataUrl}
                  alt={`UPI Settlement QR for ${receiverName}`}
                  width={200}
                  height={200}
                  className="rounded-xl mx-auto"
                />

                {/* Floating Quick Action Overlay Buttons */}
                <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 dark:bg-slate-900/90 p-1 rounded-xl shadow-xs border border-slate-200 dark:border-slate-700">
                  <button
                    onClick={() => setIsZoomModalOpen(true)}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300"
                    title="Enlarge QR"
                  >
                    <Maximize2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={handleDownloadQr}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300"
                    title="Download QR"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-2.5">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Scan with GPay, PhonePe, Paytm, or any UPI App</span>
              </div>
            </div>
          ) : null}

          {/* Preferred UPI Apps Deep-Link Launchers (Mobile / Web) */}
          {hasValidUpi && appLinks && (
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                Pay via App Directly
              </span>
              <div className="grid grid-cols-4 gap-2">
                {appLinks.gpay && (
                  <a
                    href={appLinks.gpay}
                    className="p-2 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 hover:bg-blue-50 dark:bg-slate-900 dark:hover:bg-slate-800 text-center transition-colors block text-[11px] font-bold text-slate-700 dark:text-slate-300"
                  >
                    GPay
                  </a>
                )}
                {appLinks.phonepe && (
                  <a
                    href={appLinks.phonepe}
                    className="p-2 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 hover:bg-purple-50 dark:bg-slate-900 dark:hover:bg-slate-800 text-center transition-colors block text-[11px] font-bold text-slate-700 dark:text-slate-300"
                  >
                    PhonePe
                  </a>
                )}
                {appLinks.paytm && (
                  <a
                    href={appLinks.paytm}
                    className="p-2 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 hover:bg-sky-50 dark:bg-slate-900 dark:hover:bg-slate-800 text-center transition-colors block text-[11px] font-bold text-slate-700 dark:text-slate-300"
                  >
                    Paytm
                  </a>
                )}
                {appLinks.bhim && (
                  <a
                    href={appLinks.bhim}
                    className="p-2 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 hover:bg-emerald-50 dark:bg-slate-900 dark:hover:bg-slate-800 text-center transition-colors block text-[11px] font-bold text-slate-700 dark:text-slate-300"
                  >
                    BHIM
                  </a>
                )}
              </div>
            </div>
          )}
        </CardContent>

        {/* Action Buttons Footer */}
        <CardFooter className="p-4 pt-0 flex items-center gap-2">
          {hasValidUpi ? (
            <Button
              onClick={handlePayNow}
              size="sm"
              className="flex-1 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-sm"
            >
              <Smartphone className="h-3.5 w-3.5" />
              <span>Pay Now ({formattedAmount})</span>
            </Button>
          ) : (
            <Button
              disabled
              size="sm"
              variant="outline"
              className="flex-1 rounded-xl text-xs font-semibold text-slate-400 border-dashed"
            >
              <span>UPI Unavailable</span>
            </Button>
          )}

          <Button
            onClick={() => setIsMarkPaidModalOpen(true)}
            variant="outline"
            size="sm"
            className="rounded-xl text-xs font-semibold gap-1.5 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
          >
            <Check className="h-3.5 w-3.5" />
            <span>Mark Paid</span>
          </Button>
        </CardFooter>
      </Card>

      {/* Mark As Paid Dialog */}
      <Dialog open={isMarkPaidModalOpen} onOpenChange={setIsMarkPaidModalOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              <span>Record Settlement Payment</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Confirm your direct UPI transfer to {receiverName} for {formattedAmount}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleConfirmMarkAsPaid} className="space-y-4 pt-2">
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Receiver:</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{receiverName}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Exact Amount:</span>
                <span className="font-bold font-mono text-emerald-600">{formattedAmount}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Payment Mode:</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">UPI Instant Settlement</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">UPI Reference / UTR Number (Optional)</Label>
              <Input
                value={utrNumber}
                onChange={(e) => setUtrNumber(e.target.value)}
                placeholder="12-digit UPI Ref ID from your banking app"
                className="rounded-xl text-xs font-mono bg-background"
                maxLength={30}
              />
              <span className="text-[10px] text-slate-400">
                Helps verify the payment in settlement audit history
              </span>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Payment Notes (Optional)</Label>
              <Input
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                placeholder="e.g. Paid via Google Pay"
                className="rounded-xl text-xs bg-background"
                maxLength={80}
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsMarkPaidModalOpen(false)}
                className="rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isMarkingPaid}
                className="rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
              >
                {isMarkingPaid ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Confirming...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span>Confirm & Settle Debt</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Enlarge QR Modal */}
      {qrCodeDataUrl && (
        <Dialog open={isZoomModalOpen} onOpenChange={setIsZoomModalOpen}>
          <DialogContent className="sm:max-w-[360px] rounded-3xl p-6 text-center">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">
                Scan to Pay {receiverName}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 font-mono">
                {formattedAmount} via {receiverUpiId}
              </DialogDescription>
            </DialogHeader>

            <div className="p-4 bg-white rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 mx-auto my-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrCodeDataUrl}
                alt="Enlarged QR Code"
                width={260}
                height={260}
                className="rounded-xl mx-auto"
              />
            </div>

            <DialogFooter className="justify-center sm:justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadQr}
                className="rounded-xl text-xs gap-1.5"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Save QR Image</span>
              </Button>
              <Button
                size="sm"
                onClick={handlePayNow}
                className="rounded-xl text-xs font-bold bg-emerald-600 text-white gap-1.5"
              >
                <Smartphone className="h-3.5 w-3.5" />
                <span>Pay Now</span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

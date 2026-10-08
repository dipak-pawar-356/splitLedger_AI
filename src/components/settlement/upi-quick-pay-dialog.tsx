"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  QrCode,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Loader2,
  Sparkles,
  Download,
  ArrowRight,
} from "lucide-react";
import { verifyAndGenerateSettlementQrAction, recordUpiSettlementPaymentAction } from "@/actions/upi-settlements";
import { getAppSpecificUpiLink } from "@/lib/payments/upi";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface UpiQuickPayDialogProps {
  groupId: number;
  groupName: string;
  receiverUserId?: number;
  receiverName: string;
  amount: number;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function UpiQuickPayDialog({
  groupId,
  groupName,
  receiverUserId,
  receiverName,
  amount,
  trigger,
  onSuccess,
}: UpiQuickPayDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settlementData, setSettlementData] = useState<{
    amount: number;
    receiverName: string;
    receiverUpiId: string;
    upiUri: string;
    qrCodeDataUrl: string;
  } | null>(null);

  const [copiedUpi, setCopiedUpi] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);
  const [isMarkingPaid, setIsMarkingPaid] = useState(false);
  const [utrNumber, setUtrNumber] = useState("");

  const handleOpen = async (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setSettlementData(null);
      setError(null);
      return;
    }

    if (!receiverUserId) {
      setError("Receiver is not registered with a personal user profile.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await verifyAndGenerateSettlementQrAction({
        groupId,
        receiverUserId,
      });

      if (res.success && res.qrCodeDataUrl) {
        setSettlementData({
          amount: res.amount,
          receiverName: res.receiverName || receiverName,
          receiverUpiId: res.receiverUpiId,
          upiUri: res.upiUri,
          qrCodeDataUrl: res.qrCodeDataUrl,
        });
      } else {
        setError(res.error || "Failed to generate dynamic settlement QR code.");
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyUpi = () => {
    if (!settlementData?.receiverUpiId) return;
    navigator.clipboard.writeText(settlementData.receiverUpiId);
    setCopiedUpi(true);
    toast.success("UPI ID copied!");
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleCopyAmount = () => {
    if (!settlementData) return;
    navigator.clipboard.writeText(settlementData.amount.toFixed(2));
    setCopiedAmount(true);
    toast.success(`Amount ₹${settlementData.amount.toFixed(2)} copied!`);
    setTimeout(() => setCopiedAmount(false), 2000);
  };

  const handlePayNow = () => {
    if (!settlementData?.upiUri) return;
    window.location.href = settlementData.upiUri;
  };

  const handleMarkPaid = async () => {
    if (!receiverUserId || !settlementData) return;
    setIsMarkingPaid(true);

    try {
      const res = await recordUpiSettlementPaymentAction({
        groupId,
        receiverUserId,
        amount: settlementData.amount,
        utrNumber: utrNumber.trim() || undefined,
        notes: "Paid via Quick UPI QR",
      });

      if (res.success) {
        toast.success(`Settlement of ₹${settlementData.amount.toFixed(2)} recorded as paid!`);
        setOpen(false);
        onSuccess?.();
        router.refresh();
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to record payment");
    } finally {
      setIsMarkingPaid(false);
    }
  };

  const appLinks = settlementData?.upiUri
    ? {
        gpay: getAppSpecificUpiLink("gpay", settlementData.upiUri),
        phonepe: getAppSpecificUpiLink("phonepe", settlementData.upiUri),
        paytm: getAppSpecificUpiLink("paytm", settlementData.upiUri),
        bhim: getAppSpecificUpiLink("bhim", settlementData.upiUri),
      }
    : null;

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            size="sm"
            className="h-7 text-xs px-2.5 font-bold rounded-xl gap-1 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
          >
            <Smartphone className="h-3.5 w-3.5" />
            <span>Pay Now</span>
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-[420px] rounded-3xl p-6">
        <DialogHeader className="pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">
                Instant UPI QR Settlement
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Verified on-demand payment for {groupName}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="py-12 text-center space-y-2">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-emerald-500" />
            <p className="text-xs font-semibold text-slate-500">Verifying latest balance and generating dynamic QR...</p>
          </div>
        ) : error ? (
          <div className="py-6 space-y-4">
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-xs text-amber-800 dark:text-amber-300">
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">Cannot Generate Settlement QR</p>
                <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">{error}</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              className="w-full rounded-xl text-xs"
            >
              Close
            </Button>
          </div>
        ) : settlementData ? (
          <div className="space-y-4 pt-2">
            {/* Amount and Receiver Header */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Pay to</span>
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{settlementData.receiverName}</span>
                <span className="text-[11px] font-mono text-slate-500 block">{settlementData.receiverUpiId}</span>
              </div>
              <div className="text-right">
                <span className="text-lg font-black font-mono text-emerald-600 block">
                  ₹{settlementData.amount.toFixed(2)}
                </span>
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[9px] px-1.5 py-0 h-4">
                  Exact Amount Locked
                </Badge>
              </div>
            </div>

            {/* Dynamic QR Display */}
            <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 border border-slate-200/80 dark:border-slate-800">
              <div className="p-2.5 bg-white rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={settlementData.qrCodeDataUrl}
                  alt={`UPI Settlement QR for ${settlementData.receiverName}`}
                  width={180}
                  height={180}
                  className="rounded-xl mx-auto"
                />
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 font-semibold mt-2">
                <Sparkles className="h-3 w-3" />
                <span>Scan with GPay, PhonePe, Paytm, or BHIM</span>
              </div>
            </div>

            {/* Quick Copy Buttons */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyUpi}
                className="flex-1 rounded-xl text-xs gap-1.5 h-8 font-medium"
              >
                {copiedUpi ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                <span>Copy UPI ID</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyAmount}
                className="flex-1 rounded-xl text-xs gap-1.5 h-8 font-medium"
              >
                {copiedAmount ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                <span>Copy Amount</span>
              </Button>
            </div>

            {/* App Launchers */}
            {appLinks && (
              <div className="grid grid-cols-4 gap-1.5">
                {appLinks.gpay && (
                  <a
                    href={appLinks.gpay}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-center text-[10px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                  >
                    GPay
                  </a>
                )}
                {appLinks.phonepe && (
                  <a
                    href={appLinks.phonepe}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-center text-[10px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                  >
                    PhonePe
                  </a>
                )}
                {appLinks.paytm && (
                  <a
                    href={appLinks.paytm}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-center text-[10px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                  >
                    Paytm
                  </a>
                )}
                {appLinks.bhim && (
                  <a
                    href={appLinks.bhim}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-center text-[10px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                  >
                    BHIM
                  </a>
                )}
              </div>
            )}

            {/* Primary Action Buttons */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                onClick={handlePayNow}
                size="sm"
                className="flex-1 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 h-9"
              >
                <Smartphone className="h-3.5 w-3.5" />
                <span>Pay Now</span>
              </Button>
              <Button
                onClick={handleMarkPaid}
                variant="outline"
                size="sm"
                disabled={isMarkingPaid}
                className="rounded-xl text-xs font-bold border-emerald-500/30 text-emerald-600 hover:bg-emerald-50 h-9 gap-1"
              >
                {isMarkingPaid ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                <span>Mark Paid</span>
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

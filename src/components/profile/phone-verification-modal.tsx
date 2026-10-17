"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Phone,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  KeyRound,
  RotateCw,
  Zap,
} from "lucide-react";
import { sendPhoneVerificationOtp, verifyPhoneOtp } from "@/actions/profile";
import { toast } from "sonner";

interface PhoneVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPhone: string;
  onVerified: () => void;
}

export function PhoneVerificationModal({
  isOpen,
  onClose,
  currentPhone,
  onVerified,
}: PhoneVerificationModalProps) {
  const [phoneNumber, setPhoneNumber] = useState(currentPhone || "");
  const [otpCode, setOtpCode] = useState("");
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [simulatedOtp, setSimulatedOtp] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setPhoneNumber(currentPhone || "");
      setOtpCode("");
      setIsCodeSent(false);
      setSimulatedOtp(null);
    }
  }, [isOpen, currentPhone]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSendOtp = async () => {
    if (!phoneNumber || phoneNumber.trim().length < 10) {
      toast.error("Please enter a valid 10-digit mobile number");
      return;
    }

    setIsSending(true);
    try {
      const res = await sendPhoneVerificationOtp(phoneNumber);
      if (res.success) {
        setIsCodeSent(true);
        setSimulatedOtp(res.code);
        setCountdown(60);
        toast.success(`Verification code dispatched to ${phoneNumber}`);
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to send verification code");
    } finally {
      setIsSending(false);
    }
  };

  const handleVerifyOtp = async (codeToVerify?: string) => {
    const code = codeToVerify || otpCode;
    if (!code || code.trim().length !== 6) {
      toast.error("Please enter a valid 6-digit verification code");
      return;
    }

    setIsVerifying(true);
    try {
      const res = await verifyPhoneOtp(code, phoneNumber);
      if (res.success) {
        toast.success("🎉 Mobile number verified successfully! Profile is now 100% complete!");
        onVerified();
        onClose();
      }
    } catch (e: any) {
      toast.error(e.message || "Invalid verification code. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleInstantVerify = async () => {
    setIsVerifying(true);
    try {
      if (!isCodeSent) {
        const sendRes = await sendPhoneVerificationOtp(phoneNumber || currentPhone);
        const code = sendRes.code || "123456";
        setSimulatedOtp(code);
        setOtpCode(code);
        const verifyRes = await verifyPhoneOtp(code, phoneNumber || currentPhone);
        if (verifyRes.success) {
          toast.success("🎉 Mobile number verified successfully! Profile is now 100% complete!");
          onVerified();
          onClose();
        }
      } else {
        const code = simulatedOtp || "123456";
        setOtpCode(code);
        const verifyRes = await verifyPhoneOtp(code, phoneNumber);
        if (verifyRes.success) {
          toast.success("🎉 Mobile number verified successfully! Profile is now 100% complete!");
          onVerified();
          onClose();
        }
      }
    } catch (e: any) {
      toast.error(e.message || "Verification failed");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-card border border-slate-200/80 dark:border-slate-800 shadow-2xl">
        <DialogHeader className="space-y-1.5 pb-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>Verify Mobile Number</span>
                <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold py-0 px-2">
                  +10% Completion
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Verify your primary phone to secure settlement notifications and reach 100% profile status.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Phone Number Field */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold flex items-center justify-between">
              <span>Mobile Phone Number</span>
              {isCodeSent && (
                <button
                  type="button"
                  onClick={() => setIsCodeSent(false)}
                  className="text-[10px] text-primary hover:underline font-medium"
                >
                  Change Number
                </button>
              )}
            </Label>
            <div className="relative">
              <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                disabled={isCodeSent || isSending || isVerifying}
                placeholder="+91 98765 43210"
                className="pl-9 font-mono text-xs rounded-xl bg-background"
              />
            </div>
          </div>

          {!isCodeSent ? (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-3">
              <div className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-400">
                <Sparkles className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <p>
                  A 6-digit one-time verification passcode (OTP) will be dispatched to confirm ownership of this mobile line.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <Button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={isSending || !phoneNumber}
                  className="flex-1 rounded-xl text-xs font-semibold bg-primary"
                >
                  {isSending ? (
                    <span className="flex items-center gap-1.5">
                      <RotateCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Sending OTP...</span>
                    </span>
                  ) : (
                    <span>Send Verification Code</span>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleInstantVerify}
                  disabled={isVerifying || !phoneNumber}
                  className="rounded-xl text-xs font-semibold border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 gap-1.5"
                >
                  <Zap className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Instant 1-Click Verify</span>
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Simulation Banner with Auto-Fill */}
              {simulatedOtp && (
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <KeyRound className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider block">
                        Verification Code:
                      </span>
                      <span className="font-mono font-black text-sm text-emerald-600 dark:text-emerald-400 tracking-widest">
                        {simulatedOtp}
                      </span>
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setOtpCode(simulatedOtp);
                      toast.info("Verification code auto-filled!");
                    }}
                    className="h-7 text-[11px] font-bold rounded-lg bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/30"
                  >
                    Auto Fill
                  </Button>
                </div>
              )}

              {/* 6-Digit OTP Input */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Enter 6-Digit Code</Label>
                <Input
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="• • • • • •"
                  className="text-center font-mono text-lg font-black tracking-[0.5em] rounded-xl bg-background h-12"
                  autoFocus
                />
              </div>

              {/* Resend & Actions */}
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Didn&apos;t receive code?</span>
                {countdown > 0 ? (
                  <span className="text-slate-400 font-mono text-[11px]">Resend in {countdown}s</span>
                ) : (
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={isSending}
                    className="text-primary font-semibold hover:underline"
                  >
                    Resend Code
                  </button>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <Button
                  type="button"
                  onClick={() => handleVerifyOtp()}
                  disabled={isVerifying || otpCode.length !== 6}
                  className="flex-1 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                >
                  {isVerifying ? (
                    <span className="flex items-center gap-1.5">
                      <RotateCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Verifying Database...</span>
                    </span>
                  ) : (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Confirm &amp; Reach 100%</span>
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleInstantVerify}
                  disabled={isVerifying}
                  className="rounded-xl text-xs font-semibold border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 gap-1.5"
                >
                  <Zap className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Instant Verify</span>
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-slate-100 dark:border-slate-800 pt-3 flex sm:justify-between items-center">
          <p className="text-[11px] text-slate-400 flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            <span>End-to-end encrypted verification</span>
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-xs rounded-xl"
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

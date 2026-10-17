"use client";

import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Phone,
  ShieldCheck,
  CheckCircle2,
  Lock,
  ArrowRight,
  RotateCw,
  MessageSquare,
  Sparkles,
  Edit2,
  AlertTriangle,
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
  const [step, setStep] = useState<"phone" | "otp">(currentPhone ? "otp" : "phone");
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Format phone display
  const formatPhoneDisplay = (num: string) => {
    const cleaned = num.replace(/\D/g, "");
    if (cleaned.length === 10) {
      return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
    }
    if (cleaned.length > 10 && cleaned.startsWith("91")) {
      const rest = cleaned.slice(2);
      return `+91 ${rest.slice(0, 5)} ${rest.slice(5)}`;
    }
    return num;
  };

  // Reset state on modal open
  useEffect(() => {
    if (isOpen) {
      const initialNum = currentPhone || "";
      setPhoneNumber(initialNum);
      setDigits(["", "", "", "", "", ""]);
      setHasError(false);
      setErrorMessage(null);

      // If phone already provided, automatically initiate first OTP dispatch cleanly
      if (initialNum.trim().length >= 10) {
        setStep("otp");
        sendOtpCode(initialNum);
      } else {
        setStep("phone");
      }
    }
  }, [isOpen, currentPhone]);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Auto-focus first empty box on entering OTP step
  useEffect(() => {
    if (step === "otp" && isOpen) {
      const timer = setTimeout(() => {
        const firstEmpty = digits.findIndex((d) => d === "");
        const idxToFocus = firstEmpty === -1 ? 0 : firstEmpty;
        inputRefs.current[idxToFocus]?.focus();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [step, isOpen]);

  // Send OTP
  const sendOtpCode = async (phoneToSend: string) => {
    const cleaned = phoneToSend.trim().replace(/[\s\-()]/g, "");
    if (!cleaned || cleaned.length < 10) {
      toast.error("Please enter a valid 10-digit mobile number");
      return;
    }

    setIsSending(true);
    setHasError(false);
    setErrorMessage(null);

    try {
      const res = await sendPhoneVerificationOtp(cleaned);
      if (res.success) {
        setCountdown(60);
        setStep("otp");

        // High-grade SMS simulation notification
        toast("💬 SMS • SplitLedger Security", {
          description: `Your verification code is ${res.code}. Valid for 5 minutes. Never share this code.`,
          duration: 9000,
          action: {
            label: "Copy Code",
            onClick: () => {
              navigator.clipboard.writeText(res.code);
              toast.success("Code copied to clipboard!");
            },
          },
        });
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to dispatch verification code");
      setStep("phone");
    } finally {
      setIsSending(false);
    }
  };

  // Handle single digit input
  const handleDigitChange = (index: number, value: string) => {
    // Only accept numeric digit
    const digit = value.replace(/\D/g, "").slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);
    setHasError(false);
    setErrorMessage(null);

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Check if full 6 digits are filled
    if (digit && index === 5 && newDigits.every((d) => d !== "")) {
      submitVerification(newDigits.join(""));
    }
  };

  // Handle key down (Backspace, Arrow keys)
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (digits[index] === "" && index > 0) {
        const newDigits = [...digits];
        newDigits[index - 1] = "";
        setDigits(newDigits);
        inputRefs.current[index - 1]?.focus();
      } else {
        const newDigits = [...digits];
        newDigits[index] = "";
        setDigits(newDigits);
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle clipboard paste
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "");
    if (!pastedData) return;

    const chars = pastedData.slice(0, 6).split("");
    const newDigits = ["", "", "", "", "", ""];
    chars.forEach((char, i) => {
      newDigits[i] = char;
    });
    setDigits(newDigits);
    setHasError(false);
    setErrorMessage(null);

    const nextIndex = Math.min(chars.length, 5);
    inputRefs.current[nextIndex]?.focus();

    if (chars.length === 6) {
      submitVerification(newDigits.join(""));
    }
  };

  // Submit verification to database
  const submitVerification = async (codeToVerify: string) => {
    if (codeToVerify.length !== 6) {
      setErrorMessage("Please enter all 6 digits of the code");
      setHasError(true);
      return;
    }

    setIsVerifying(true);
    setHasError(false);
    setErrorMessage(null);

    try {
      const res = await verifyPhoneOtp(codeToVerify, phoneNumber);
      if (res.success) {
        toast.success("Mobile phone verified! Profile is now 100% complete.", {
          icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
        });
        onVerified();
        onClose();
      }
    } catch (e: any) {
      setHasError(true);
      setErrorMessage(e.message || "Invalid or expired code. Please try again.");
      setDigits(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md rounded-3xl p-6 sm:p-7 bg-card border border-slate-200/80 dark:border-slate-800 shadow-2xl">
        <DialogHeader className="space-y-2 text-center items-center pb-2">
          <div className="relative flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-tr from-emerald-500/20 via-teal-500/15 to-primary/20 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 shadow-inner">
            <ShieldCheck className="h-7 w-7" />
            <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[9px] text-white font-bold">
              <Lock className="h-2.5 w-2.5" />
            </span>
          </div>

          <DialogTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {step === "phone" ? "Enter Phone Number" : "Two-Step Phone Verification"}
          </DialogTitle>

          <DialogDescription className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
            {step === "phone"
              ? "Provide your primary mobile number to secure your financial settlements and unlock 100% profile status."
              : "We sent a 6-digit security code via SMS to confirm your identity."}
          </DialogDescription>
        </DialogHeader>

        {step === "phone" ? (
          /* STEP 1: Phone Input */
          <div className="space-y-5 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Primary Mobile Number
              </Label>
              <div className="relative flex rounded-xl border border-slate-200 dark:border-slate-800 bg-background overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
                <div className="flex items-center gap-1.5 px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-400 shrink-0">
                  <span>🇮🇳</span>
                  <span>+91</span>
                </div>
                <Input
                  type="tel"
                  value={phoneNumber.replace(/^\+91/, "").trim()}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="98765 43210"
                  className="border-0 shadow-none focus-visible:ring-0 text-sm font-mono tracking-wider bg-transparent h-auto py-2.5"
                  autoFocus
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Standard SMS rates may apply. Used strictly for settlement verification.
              </p>
            </div>

            <Button
              type="button"
              onClick={() => sendOtpCode(phoneNumber)}
              disabled={isSending || phoneNumber.replace(/\D/g, "").length < 10}
              className="w-full h-11 rounded-xl text-xs font-semibold bg-primary hover:bg-primary/95 text-white gap-2 shadow-xs"
            >
              {isSending ? (
                <>
                  <RotateCw className="h-4 w-4 animate-spin" />
                  <span>Dispatching Code...</span>
                </>
              ) : (
                <>
                  <span>Send Security Code</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        ) : (
          /* STEP 2: 6-Box Segmented OTP Input */
          <div className="space-y-5 py-2">
            {/* Phone badge with Edit */}
            <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center gap-2 text-xs">
                <Phone className="h-3.5 w-3.5 text-slate-400" />
                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                  {formatPhoneDisplay(phoneNumber)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setStep("phone")}
                className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1"
              >
                <Edit2 className="h-3 w-3" />
                <span>Edit</span>
              </button>
            </div>

            {/* 6 Segmented PIN Boxes */}
            <div className="space-y-2">
              <div
                className="flex items-center justify-center gap-2 sm:gap-2.5"
                onPaste={handlePaste}
              >
                {digits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      inputRefs.current[idx] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    className={`w-11 h-13 sm:w-12 sm:h-14 text-center font-mono text-xl sm:text-2xl font-black rounded-xl sm:rounded-2xl border transition-all duration-150 outline-none select-none ${
                      hasError
                        ? "border-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-400 ring-2 ring-rose-500/20"
                        : digit
                        ? "border-emerald-500/50 bg-emerald-500/5 text-slate-900 dark:text-slate-100 shadow-xs"
                        : "border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 text-slate-900 dark:text-slate-100 focus:border-primary focus:bg-background focus:ring-4 focus:ring-primary/15 focus:scale-[1.03]"
                    }`}
                  />
                ))}
              </div>

              {/* Error feedback */}
              {errorMessage && (
                <div className="flex items-center justify-center gap-1.5 text-xs text-rose-500 font-medium pt-1">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </div>

            {/* Resend Cooldown */}
            <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
              <span>Didn&apos;t receive code?</span>
              {countdown > 0 ? (
                <span className="font-mono text-slate-400 text-[11px]">
                  Resend in 0:{countdown < 10 ? `0${countdown}` : countdown}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => sendOtpCode(phoneNumber)}
                  disabled={isSending}
                  className="font-semibold text-primary hover:underline"
                >
                  Resend SMS Code
                </button>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-1">
              <Button
                type="button"
                onClick={() => submitVerification(digits.join(""))}
                disabled={isVerifying || digits.some((d) => d === "")}
                className="w-full h-11 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-xs transition-all"
              >
                {isVerifying ? (
                  <>
                    <RotateCw className="h-4 w-4 animate-spin" />
                    <span>Verifying Code with Database...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Verify &amp; Reach 100% Profile</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        <div className="border-t border-slate-100 dark:border-slate-800 pt-3 flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <Lock className="h-3 w-3 text-emerald-500" />
            <span>256-bit encrypted SMS gateway</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="hover:text-slate-600 dark:hover:text-slate-300 font-medium transition-colors"
          >
            Cancel
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

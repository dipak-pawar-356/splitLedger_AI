"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { 
  Key, 
  Eye, 
  EyeOff, 
  Check, 
  X, 
  ShieldCheck, 
  AlertCircle 
} from "lucide-react";
import { changeAccountPassword } from "@/actions/account";
import { toast } from "sonner";

export function PasswordManagementForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [isPending, setIsPending] = useState(false);

  // Password strength checklist
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);

  let strengthScore = 0;
  if (hasMinLength) strengthScore += 20;
  if (hasUppercase) strengthScore += 20;
  if (hasLowercase) strengthScore += 20;
  if (hasNumber) strengthScore += 20;
  if (hasSpecial) strengthScore += 20;

  const getStrengthLabel = (score: number) => {
    if (score >= 80) return { label: "Strong", color: "text-emerald-600" };
    if (score >= 60) return { label: "Moderate", color: "text-amber-600" };
    return { label: "Weak", color: "text-rose-600" };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!hasMinLength || !hasUppercase || !hasLowercase || !hasNumber || !hasSpecial) {
      toast.error("Please meet all password requirements before continuing.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setIsPending(true);
    try {
      await changeAccountPassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      toast.success("Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e: any) {
      toast.error(e.message || "Failed to update password.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden bg-card">
      <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <Key className="h-4 w-4 text-primary" />
          <span>Password & Authentication</span>
        </CardTitle>
        <CardDescription className="text-xs">
          Update your login password and ensure compliance with security standards
        </CardDescription>
      </CardHeader>

      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-5 max-w-xl" suppressHydrationWarning>
          <div className="space-y-1.5" suppressHydrationWarning>
            <Label className="text-xs font-semibold">Current Password</Label>
            <div className="relative" suppressHydrationWarning>
              <Input
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="pr-9 rounded-xl text-xs bg-background"
                required
                suppressHydrationWarning
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                suppressHydrationWarning
              >
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5" suppressHydrationWarning>
            <Label className="text-xs font-semibold">New Password</Label>
            <div className="relative" suppressHydrationWarning>
              <Input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new strong password"
                className="pr-9 rounded-xl text-xs bg-background"
                required
                suppressHydrationWarning
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                suppressHydrationWarning
              >
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Password Strength Meter */}
          {newPassword && (
            <div className="space-y-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-500">Password Strength</span>
                <span className={getStrengthLabel(strengthScore).color}>
                  {getStrengthLabel(strengthScore).label} ({strengthScore}%)
                </span>
              </div>
              <Progress value={strengthScore} className="h-1.5 rounded-full" />

              <div className="grid grid-cols-2 gap-1.5 pt-2 text-[11px]">
                <span className={`flex items-center gap-1 ${hasMinLength ? "text-emerald-600 font-semibold" : "text-slate-400"}`}>
                  {hasMinLength ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                  <span>Min 8 characters</span>
                </span>
                <span className={`flex items-center gap-1 ${hasUppercase ? "text-emerald-600 font-semibold" : "text-slate-400"}`}>
                  {hasUppercase ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                  <span>Uppercase letter</span>
                </span>
                <span className={`flex items-center gap-1 ${hasLowercase ? "text-emerald-600 font-semibold" : "text-slate-400"}`}>
                  {hasLowercase ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                  <span>Lowercase letter</span>
                </span>
                <span className={`flex items-center gap-1 ${hasNumber ? "text-emerald-600 font-semibold" : "text-slate-400"}`}>
                  {hasNumber ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                  <span>Number (0-9)</span>
                </span>
                <span className={`flex items-center gap-1 ${hasSpecial ? "text-emerald-600 font-semibold" : "text-slate-400"}`}>
                  {hasSpecial ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                  <span>Special character (!@#)</span>
                </span>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Confirm New Password</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="rounded-xl text-xs bg-background"
              required
            />
          </div>

          <div className="flex items-center justify-end pt-3">
            <Button
              type="submit"
              size="sm"
              className="rounded-xl text-xs gap-1.5 bg-primary px-5"
              disabled={isPending || strengthScore < 80}
            >
              <Check className="h-3.5 w-3.5" />
              <span>{isPending ? "Updating..." : "Update Password"}</span>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

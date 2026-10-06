"use client";

import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Bell, MessageCircle, Mail, Copy, Check, Send, AlertCircle, DollarSign, User, Users } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { createReminder } from "@/actions/reminders";
import { toast } from "sonner";

interface ReminderDialogProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  recipientName?: string;
  recipientPhone?: string;
  recipientEmail?: string;
  contactId?: number | string;
  contactName?: string;
  groupId?: number | string;
  groupPublicId?: string;
  groupName?: string;
  amount?: number;
  currency?: string;
  onSuccess?: () => void;
}

export function ReminderDialog({ 
  trigger,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  recipientName,
  recipientPhone,
  recipientEmail,
  contactId, 
  contactName,
  groupId,
  groupPublicId,
  groupName,
  amount,
  currency = "INR",
  onSuccess 
}: ReminderDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? setControlledOpen! : setInternalOpen;

  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [method, setMethod] = useState<"whatsapp" | "email" | "copy">("whatsapp");
  const [templateType, setTemplateType] = useState<"payment" | "settlement" | "general">("payment");

  // Editable Form fields
  const [targetName, setTargetName] = useState(recipientName || contactName || "Friend");
  const [targetPhone, setTargetPhone] = useState(recipientPhone || "");
  const [targetEmail, setTargetEmail] = useState(recipientEmail || "");
  const [targetAmount, setTargetAmount] = useState<number>(amount ? Math.abs(amount) : 0);
  const [message, setMessage] = useState("");

  const effectiveGroupName = groupName || "our group";

  // Build message based on template
  const buildTemplateMessage = useCallback((type: "payment" | "settlement" | "general", nameVal: string, amountVal: number) => {
    const formattedAmt = amountVal > 0 ? formatCurrency(amountVal) : "the pending amount";
    const greetingName = nameVal ? nameVal : "there";

    if (type === "payment") {
      return `Hey ${greetingName}! 👋 Just a friendly reminder to settle ${formattedAmt} for our shared expenses${groupName ? ` in ${groupName}` : ""} on SplitLedger. You can settle it when convenient. Thanks!`;
    } else if (type === "settlement") {
      return `Hey ${greetingName}! We have pending settlements totaling ${formattedAmt}${groupName ? ` in ${groupName}` : ""}. Let's settle up when you get a chance!`;
    } else {
      return `Hey ${greetingName}! Just a quick reminder about our shared expenses${groupName ? ` in ${groupName}` : ""}. Please check SplitLedger to review the breakdown.`;
    }
  }, [groupName]);

  // Sync state when props or dialog open
  useEffect(() => {
    if (open) {
      const initialName = recipientName || contactName || "Friend";
      const initialAmt = amount ? Math.abs(amount) : 0;
      setTargetName(initialName);
      setTargetPhone(recipientPhone || "");
      setTargetEmail(recipientEmail || "");
      setTargetAmount(initialAmt);
      setMessage(buildTemplateMessage(templateType, initialName, initialAmt));
    }
  }, [open, recipientName, contactName, recipientPhone, recipientEmail, amount, groupName, buildTemplateMessage, templateType]);

  const handleTemplateChange = (type: "payment" | "settlement" | "general") => {
    setTemplateType(type);
    setMessage(buildTemplateMessage(type, targetName, targetAmount));
  };

  const handleSendReminder = async () => {
    if (!message.trim()) {
      toast.error("Please enter a reminder message");
      return;
    }

    setIsLoading(true);
    try {
      const res = await createReminder({
        recipientType: groupId ? "group" : "contact",
        recipientId: groupId || contactId || 0,
        groupId: groupId || undefined,
        contactId: contactId || undefined,
        recipientName: targetName,
        recipientPhone: targetPhone || undefined,
        recipientEmail: targetEmail || undefined,
        method,
        message: message.trim(),
        amount: targetAmount,
        currency: "INR",
      });

      if (method === "whatsapp") {
        if (res.whatsappLink) {
          window.open(res.whatsappLink, "_blank");
        }
        toast.success(`WhatsApp reminder prepared for ${targetName}!`);
      } else if (method === "email") {
        toast.success(`Reminder email sent to ${targetEmail || targetName}!`);
      } else {
        navigator.clipboard.writeText(message);
        setCopied(true);
        toast.success("Reminder message copied to clipboard!");
        setTimeout(() => setCopied(false), 2500);
      }

      onSuccess?.();
      setOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to send reminder";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const copyMessageOnly = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    toast.success("Reminder message copied!");
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="font-semibold text-xs">
            <Bell className="h-3.5 w-3.5 mr-1.5 text-amber-500" />
            Send Reminder
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Bell className="h-5 w-5 text-amber-500" />
            Send Payment Reminder
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Send a friendly payment reminder via WhatsApp, Email, or copy message.
          </DialogDescription>
        </DialogHeader>

        {/* Recipient & Amount Preview Card */}
        <div className="bg-slate-50 dark:bg-slate-900 border rounded-xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-slate-500" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                To: {targetName}
              </span>
            </div>
            {targetAmount > 0 && (
              <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 font-mono font-bold text-xs">
                {formatCurrency(targetAmount)}
              </Badge>
            )}
          </div>
          {effectiveGroupName && (
            <p className="text-[11px] text-slate-500">
              Group: <span className="font-semibold text-slate-700 dark:text-slate-300">{effectiveGroupName}</span>
            </p>
          )}
        </div>

        {/* Method & Templates Selection */}
        <div className="space-y-4 pt-1">
          {/* Send Via Tabs */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
              Send Via
            </Label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant={method === "whatsapp" ? "default" : "outline"}
                size="sm"
                className={`text-xs font-semibold ${method === "whatsapp" ? "bg-[#25D366] hover:bg-[#1EBE5D] text-white" : ""}`}
                onClick={() => setMethod("whatsapp")}
              >
                <MessageCircle className="h-3.5 w-3.5 mr-1.5" />
                WhatsApp
              </Button>
              <Button
                type="button"
                variant={method === "email" ? "default" : "outline"}
                size="sm"
                className="text-xs font-semibold"
                onClick={() => setMethod("email")}
              >
                <Mail className="h-3.5 w-3.5 mr-1.5" />
                Email
              </Button>
              <Button
                type="button"
                variant={method === "copy" ? "default" : "outline"}
                size="sm"
                className="text-xs font-semibold"
                onClick={() => setMethod("copy")}
              >
                <Copy className="h-3.5 w-3.5 mr-1.5" />
                Copy Text
              </Button>
            </div>
          </div>

          {/* Contact Details Input based on Method */}
          {method === "whatsapp" && (
            <div className="space-y-1">
              <Label htmlFor="remPhone" className="text-xs font-medium">WhatsApp Number (Optional)</Label>
              <Input
                id="remPhone"
                value={targetPhone}
                onChange={(e) => setTargetPhone(e.target.value)}
                placeholder="+91 9876543210"
                className="text-xs"
              />
              <p className="text-[10px] text-slate-500">If left blank, WhatsApp will let you pick any contact.</p>
            </div>
          )}

          {method === "email" && (
            <div className="space-y-1">
              <Label htmlFor="remEmail" className="text-xs font-medium">Recipient Email *</Label>
              <Input
                id="remEmail"
                type="email"
                value={targetEmail}
                onChange={(e) => setTargetEmail(e.target.value)}
                placeholder="friend@example.com"
                required
                className="text-xs"
              />
            </div>
          )}

          {/* Template Type Selector */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
              Template Type
            </Label>
            <div className="flex gap-2">
              {(["payment", "settlement", "general"] as const).map((t) => (
                <Button
                  key={t}
                  type="button"
                  size="sm"
                  variant={templateType === t ? "secondary" : "ghost"}
                  className={`text-xs capitalize font-medium ${templateType === t ? "bg-slate-200 dark:bg-slate-800 font-bold" : ""}`}
                  onClick={() => handleTemplateChange(t)}
                >
                  {t}
                </Button>
              ))}
            </div>
          </div>

          {/* Message Textarea */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="remMsg" className="text-xs font-medium">Message</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={copyMessageOnly}
                className="h-6 px-2 text-[10px] text-slate-500"
              >
                {copied ? <Check className="h-3 w-3 mr-1 text-emerald-600" /> : <Copy className="h-3 w-3 mr-1" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            <Textarea
              id="remMsg"
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="text-xs leading-relaxed"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 font-medium text-xs"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isLoading || !message.trim()}
              className={`flex-1 font-bold text-xs ${
                method === "whatsapp" ? "bg-[#25D366] hover:bg-[#1EBE5D] text-white" : ""
              }`}
              onClick={handleSendReminder}
            >
              {isLoading ? (
                "Sending..."
              ) : method === "whatsapp" ? (
                <>
                  <MessageCircle className="h-3.5 w-3.5 mr-1.5" />
                  Open WhatsApp
                </>
              ) : method === "email" ? (
                <>
                  <Mail className="h-3.5 w-3.5 mr-1.5" />
                  Send Email
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 mr-1.5" />
                  Copy Reminder
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

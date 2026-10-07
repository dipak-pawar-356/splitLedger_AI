"use client";

import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Bell, 
  MessageCircle, 
  Mail, 
  Copy, 
  Check, 
  Send, 
  AlertCircle, 
  DollarSign, 
  User, 
  Users, 
  ArrowRight,
  CreditCard,
  Info,
  CheckCircle2
} from "lucide-react";
import { formatCurrency, cn, getBaseAppUrl } from "@/lib/utils";
import { createReminder } from "@/actions/reminders";
import { toast } from "sonner";

export interface CreditorDebtItem {
  name: string;
  amount: number;
  userId?: number;
  contactId?: number;
  email?: string;
  phone?: string;
}

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
  owesToList?: CreditorDebtItem[];
  receivesFromList?: CreditorDebtItem[];
  totalGroupExpense?: number;
  totalMembers?: number;
  memberPaidAmount?: number;
  memberOwnShare?: number;
  memberNetPosition?: number;
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
  onSuccess,
  owesToList = [],
  receivesFromList = [],
  totalGroupExpense,
  totalMembers,
  memberPaidAmount,
  memberOwnShare,
  memberNetPosition,
}: ReminderDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? setControlledOpen! : setInternalOpen;

  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [method, setMethod] = useState<"whatsapp" | "email" | "copy">("whatsapp");
  const [templateType, setTemplateType] = useState<"payment" | "settlement" | "general">("payment");

  // Selection state for who gets payment credit (if debtor owes multiple creditors)
  const [selectedCreditor, setSelectedCreditor] = useState<CreditorDebtItem | "all" | null>(null);
  // Selection state for which debtor(s) to remind (if creditor is viewing debtors)
  const [selectedDebtors, setSelectedDebtors] = useState<CreditorDebtItem[]>([]);

  // Editable Form fields
  const [targetName, setTargetName] = useState(recipientName || contactName || "Friend");
  const [targetPhone, setTargetPhone] = useState(recipientPhone || "");
  const [targetEmail, setTargetEmail] = useState(recipientEmail || "");
  const [targetAmount, setTargetAmount] = useState<number>(amount ? Math.abs(amount) : 0);
  const [message, setMessage] = useState("");

  const effectiveGroupName = groupName || "our group";

  // Build message based on template, creditor, and debtor(s)
  const buildTemplateMessage = useCallback((
    type: "payment" | "settlement" | "general", 
    nameVal: string, 
    amountVal: number,
    creditorItem?: CreditorDebtItem | "all" | null,
    debtorsList?: CreditorDebtItem[]
  ) => {
    const formattedAmt = amountVal > 0 ? formatCurrency(amountVal) : "₹0.00";
    const groupText = groupName ? ` in "${groupName}"` : "";
    const baseUrl = getBaseAppUrl();
    const appUrl = groupPublicId ? `${baseUrl}/dashboard/groups/${groupPublicId}` : baseUrl;

    const hasGroupStats = Boolean(totalGroupExpense && totalGroupExpense > 0);
    const avgPerPerson = totalMembers && totalMembers > 0 && totalGroupExpense
      ? totalGroupExpense / totalMembers 
      : memberOwnShare || 0;
    
    const formattedTotalExp = hasGroupStats ? formatCurrency(totalGroupExpense!) : null;
    const formattedAvgShare = avgPerPerson > 0 ? formatCurrency(avgPerPerson) : null;
    const formattedPaid = memberPaidAmount !== undefined && memberPaidAmount > 0 ? formatCurrency(memberPaidAmount) : null;

    // Thematic row emoji header and clean divider
    const headerRow = `✨ ═══════ 💰 ═══════ ✨`;
    const divider = `━━━━━━━━━━━━━━━━━━━━━━━━━`;

    // ─────────────────────────────────────────────────────────────
    // SCENARIO 1: CREDITOR VIEW (Person who paid extra, e.g. Person A)
    // ─────────────────────────────────────────────────────────────
    const isCreditorCard = (receivesFromList && receivesFromList.length > 0) || (memberNetPosition !== undefined && memberNetPosition > 0.01);

    if (isCreditorCard && recipientName) {
      const extraAmtVal = Math.max(0, memberNetPosition || (memberPaidAmount && avgPerPerson ? memberPaidAmount - avgPerPerson : amountVal));
      const formattedExtra = formatCurrency(extraAmtVal > 0 ? extraAmtVal : amountVal);

      // Subcase 1A: Multiple debtors selected (e.g. DIPAK PAWAR & Rahul)
      if (debtorsList && debtorsList.length > 1) {
        const namesList = debtorsList.map(d => d.name).join(" and ");
        const breakdownLines = debtorsList.map(d => `▫️ *${d.name}:* *${formatCurrency(d.amount)}*`).join("\n");
        const totalDebtorsAmt = formatCurrency(debtorsList.reduce((sum, d) => sum + d.amount, 0));

        if (type === "settlement") {
          return `${headerRow}
⚡ *SPLITLEDGER AI — SETTLEMENT AUDIT*
${divider}
👥 *Group:* ${groupName || "Shared Expenses"}
${formattedTotalExp ? `📊 *Total Group Expenses (T):* ${formattedTotalExp}\n` : ""}${formattedAvgShare ? `⚖️ *Average Fair Share (T/N):* ${formattedAvgShare} per member\n` : ""}${divider}

🌟 *CREDIT SUMMARY FOR ${recipientName.toUpperCase()}:*
*${recipientName}* paid a total of *${formattedPaid || formattedExtra}*, which is an extra *+${formattedExtra}* above the fair share.

📋 *RECEIVABLES BREAKDOWN:*
To settle this extra amount, the following members owe *${recipientName}*:
${breakdownLines}
${divider}
💰 *Total Settlement Amount:* *${totalDebtorsAmt}*

📲 *HOW TO SETTLE:*
1️⃣ *Pay in App:* Open SplitLedger AI to scan instant UPI QR:
👉 ${appUrl}
2️⃣ *Pay Manually:* Transfer via GPay / PhonePe / Paytm / UPI to *${recipientName}*.
3️⃣ Mark as settled in the app once completed.

🤝 _Please verify and complete payment to balance the ledger. Thanks!_`;
        }

        if (type === "general") {
          return `${headerRow}
🔔 *SPLITLEDGER AI — QUICK CHECK-IN*
${divider}
Hey ${namesList}! 👋 Quick reminder regarding our shared group expenses in *${groupName || "our group"}*.

*${recipientName}* paid an extra *+${formattedExtra}* for the group. Pending shares to clear:
${breakdownLines}

💰 *Total Pending:* *${totalDebtorsAmt}*
👉 Review & pay on SplitLedger AI: ${appUrl}
Thanks! 🙏`;
        }

        // Default "payment" tone
        return `${headerRow}
🌟 *SPLITLEDGER AI — PAYMENT REMINDER* 🌟
${divider}
👥 *Group:* ${groupName || "Shared Expenses"}
${formattedTotalExp ? `📊 *Total Group Spending:* ${formattedTotalExp}\n` : ""}${formattedAvgShare ? `⚖️ *Average Fair Share:* ${formattedAvgShare} per person\n` : ""}${divider}

✨ *CREDIT SUMMARY FOR ${recipientName.toUpperCase()}:*
*${recipientName}* paid a total of *${formattedPaid || formattedExtra}* (an extra *+${formattedExtra}* over the fair share) to cover our shared expenses.

📋 *PENDING RECEIVABLES (WHO OWES ${recipientName.toUpperCase()}):*
To settle this amount, *${recipientName}* is due to receive:
${breakdownLines}
${divider}
💰 *Total to be Settled:* *${totalDebtorsAmt}*

📲 *HOW TO SETTLE:*
1️⃣ *Pay via SplitLedger App:* Open group to scan instant dynamic UPI QR:
👉 ${appUrl}
2️⃣ *Pay Manually:* Transfer via GPay / PhonePe / Paytm directly to *${recipientName}*.
3️⃣ Confirm or record settlement in the group once paid.

🙏 _Please clear your respective shares when convenient. Thank you!_`;
      }

      // Subcase 1B: Single debtor selected (e.g. DIPAK PAWAR owes Raj Pawar ₹490)
      if (debtorsList && debtorsList.length === 1) {
        const d = debtorsList[0];
        const debtorAmt = formatCurrency(d.amount);

        if (type === "settlement") {
          return `${headerRow}
⚡ *SPLITLEDGER AI — SETTLEMENT NOTICE*
${divider}
👋 Hi *${d.name}*,

👥 *Group:* ${groupName || "Shared Expenses"}
${formattedTotalExp ? `📊 *Total Group Spending:* ${formattedTotalExp}\n` : ""}${formattedAvgShare ? `⚖️ *Per Person Fair Share:* ${formattedAvgShare}\n` : ""}${divider}

🌟 *EXPENSE AUDIT:*
*${recipientName}* paid a total of *${formattedPaid || formattedExtra}* (an extra *+${formattedExtra}* over the fair share) to cover group costs.

💳 *YOUR PENDING SHARE:*
▫️ Payable to *${recipientName}:* *${debtorAmt}*
${divider}
💰 *Total Due from You:* *${debtorAmt}*

📲 *HOW TO SETTLE:*
1️⃣ *Pay in App:* Open SplitLedger AI to scan instant UPI QR:
👉 ${appUrl}
2️⃣ *Pay Manually:* Transfer directly to *${recipientName}* via GPay / PhonePe / Paytm / UPI.
3️⃣ Record as settled in the app once paid.

🤝 _Let's keep our group balances cleared. Thank you!_`;
        }

        if (type === "general") {
          return `${headerRow}
🔔 *SPLITLEDGER AI — FRIENDLY REMINDER*
${divider}
Hi *${d.name}*! 👋 Just a quick check-in for *${groupName || "our group"}*.
*${recipientName}* paid extra for the group, and your share of *${debtorAmt}* is pending.
👉 Settle up on SplitLedger AI: ${appUrl}
Thank you! 🙏`;
        }

        // Default "payment" tone
        return `${headerRow}
🌟 *SPLITLEDGER AI — PAYMENT REMINDER* 🌟
${divider}
👋 Hi *${d.name}*,

👥 *Group:* ${groupName || "Shared Expenses"}
${formattedTotalExp ? `📊 *Total Group Spending:* ${formattedTotalExp}\n` : ""}${formattedAvgShare ? `⚖️ *Average Fair Share:* ${formattedAvgShare} per person\n` : ""}${divider}

✨ *SUMMARY:*
*${recipientName}* paid a total of *${formattedPaid || formattedExtra}* (an extra *+${formattedExtra}* over the fair share) to cover our shared expenses.

💳 *YOUR PENDING SHARE:*
▫️ Payable to *${recipientName}:* *${debtorAmt}*
${divider}
💰 *Total Payable by You:* *${debtorAmt}*

📲 *HOW TO SETTLE:*
1️⃣ *Pay in App:* Open SplitLedger AI to scan instant dynamic UPI QR:
👉 ${appUrl}
2️⃣ *Pay Manually:* Transfer directly to *${recipientName}* via GPay / PhonePe / Paytm / UPI.
3️⃣ Mark as settled in the app once transferred.

🤝 _Please settle up when convenient to keep group balances square. Thank you!_`;
      }
    }

    // ─────────────────────────────────────────────────────────────
    // SCENARIO 2: DEBTOR VIEW (Person who paid less than share, e.g. Person B / C)
    // ─────────────────────────────────────────────────────────────
    const isDebtorCard = (owesToList && owesToList.length > 0) || (memberNetPosition !== undefined && memberNetPosition < -0.01);

    if (isDebtorCard && recipientName) {
      const shortfallVal = Math.abs(memberNetPosition || (avgPerPerson && memberPaidAmount ? avgPerPerson - memberPaidAmount : amountVal));
      const formattedShortfall = formatCurrency(shortfallVal > 0 ? shortfallVal : amountVal);

      let creditors: CreditorDebtItem[] = [];
      if (creditorItem === "all" || !creditorItem) {
        creditors = owesToList || [];
      } else {
        creditors = [creditorItem];
      }

      const creditorLines = creditors.length > 0
        ? creditors.map(c => `▫️ Pay to *${c.name}:* *${formatCurrency(c.amount)}*`).join("\n")
        : `▫️ Pay to *Creditor:* *${formattedAmt}*`;

      const totalPayableAmt = creditors.length > 0
        ? formatCurrency(creditors.reduce((sum, c) => sum + c.amount, 0))
        : formattedAmt;

      if (type === "settlement") {
        return `${headerRow}
⚡ *SPLITLEDGER AI — SETTLEMENT AUDIT*
${divider}
👋 Hi *${recipientName}*,

Official settlement audit summary for *${groupName || "our group"}*.

📊 *LEDGER BREAKDOWN:*
${formattedTotalExp ? `▪️ Total Group Expenses: *${formattedTotalExp}*\n` : ""}${formattedAvgShare ? `▪️ Per Person Fair Share: *${formattedAvgShare}*\n` : ""}${formattedPaid ? `▪️ Amount You Paid: *${formattedPaid}*\n` : ""}⚠️ *Shortfall (You Paid Less Than You Owe):* *-${formattedShortfall}*
${divider}

💳 *ACTION REQUIRED (WHO TO PAY):*
Please settle your pending share with the following member(s):
${creditorLines}
${divider}
💰 *Total Payable Amount:* *${totalPayableAmt}*

📲 *HOW TO SETTLE:*
1️⃣ *Pay in App:* Open SplitLedger AI to scan instant UPI QR:
👉 ${appUrl}
2️⃣ *Pay Manually:* Transfer via GPay / PhonePe / Paytm / UPI to the payee(s).
3️⃣ Confirm settlement in the app once transferred.

🤝 _Let's balance the ledger. Thank you!_`;
      }

      if (type === "general") {
        return `${headerRow}
🔔 *SPLITLEDGER AI — FRIENDLY REMINDER*
${divider}
Hi *${recipientName}*! 👋 Just a quick reminder about *${groupName || "our group"}*.
You have a pending settlement balance of *${totalPayableAmt}*.
${creditorLines}
👉 Pay & confirm in SplitLedger AI: ${appUrl}
Thanks! 🙏`;
      }

      // Default "payment" tone
      return `${headerRow}
🌟 *SPLITLEDGER AI — SETTLEMENT REMINDER* 🌟
${divider}
👋 Hi *${recipientName}*,

This is a friendly reminder regarding your pending balance in *${groupName || "our group"}*.

📊 *EXPENSE & SHARE SUMMARY:*
${formattedTotalExp ? `▪️ Total Group Spending: *${formattedTotalExp}*\n` : ""}${formattedAvgShare ? `▪️ Per Person Fair Share: *${formattedAvgShare}*\n` : ""}${formattedPaid ? `▪️ Amount You Paid: *${formattedPaid}*\n` : ""}⚠️ *Shortfall (You Paid Less Than You Owe):* *-${formattedShortfall}*
${divider}

💳 *PAYMENT BREAKDOWN (WHO TO PAY):*
Please settle your pending share with the following member(s):
${creditorLines}
${divider}
💰 *Total Payable Amount:* *${totalPayableAmt}*

📲 *HOW TO PAY:*
1️⃣ *Pay in App:* Open SplitLedger AI to scan instant dynamic UPI QR:
👉 ${appUrl}
2️⃣ *Pay Manually:* Transfer directly via GPay / PhonePe / Paytm / UPI.
3️⃣ Mark as paid in the app once completed.

🤝 _Let's keep our group balances cleared! Thank you!_`;
    }

    // ─────────────────────────────────────────────────────────────
    // SCENARIO 3: GENERAL / CONTACT FALLBACK
    // ─────────────────────────────────────────────────────────────
    const greetingName = nameVal || recipientName || "Friend";
    return `${headerRow}
🌟 *SPLITLEDGER AI — PAYMENT REMINDER* 🌟
${divider}
👋 Hi *${greetingName}*,

Just a friendly reminder regarding shared expenses${groupText}.

💳 *PAYMENT DETAILS:*
▫️ Total Pending Amount: *${formattedAmt}*
${divider}

📲 *HOW TO SETTLE:*
1️⃣ *Pay in App:* Open SplitLedger AI to view breakdown and scan UPI QR:
👉 ${appUrl}
2️⃣ *Pay Manually:* Transfer via GPay / PhonePe / Paytm / UPI.

🙏 _Please settle when convenient. Thanks!_`;
  }, [
    groupName, 
    groupPublicId, 
    recipientName, 
    totalGroupExpense, 
    totalMembers, 
    memberPaidAmount, 
    memberOwnShare, 
    memberNetPosition, 
    receivesFromList, 
    owesToList
  ]);

  const applyDebtorSelection = useCallback((list: CreditorDebtItem[], currentType: "payment" | "settlement" | "general" = templateType) => {
    setSelectedDebtors(list);
    if (list.length === 0) {
      setTargetName(recipientName || contactName || "Friend");
      setTargetAmount(0);
      setTargetEmail("");
      setTargetPhone("");
      setMessage(buildTemplateMessage(currentType, recipientName || "Friend", 0, null, []));
    } else if (list.length === 1) {
      const d = list[0];
      setTargetName(d.name);
      setTargetAmount(d.amount);
      setTargetEmail(d.email || "");
      setTargetPhone(d.phone || "");
      setMessage(buildTemplateMessage(currentType, d.name, d.amount, null, list));
    } else {
      const names = list.map((d) => d.name).join(" & ");
      const totalAmt = list.reduce((sum, d) => sum + d.amount, 0);
      const emails = list.map((d) => d.email).filter(Boolean).join(", ");
      const phones = list.map((d) => d.phone).filter(Boolean).join(", ");
      setTargetName(names);
      setTargetAmount(totalAmt);
      setTargetEmail(emails);
      setTargetPhone(phones);
      setMessage(buildTemplateMessage(currentType, names, totalAmt, null, list));
    }
  }, [recipientName, contactName, templateType, buildTemplateMessage]);

  // Sync state when props or dialog open
  useEffect(() => {
    if (open) {
      const hasOwes = owesToList && owesToList.length > 0;
      const hasReceives = receivesFromList && receivesFromList.length > 0;

      let initCreditor: CreditorDebtItem | "all" | null = null;
      let initDebtors: CreditorDebtItem[] = [];
      let initName = recipientName || contactName || "Friend";
      let initPhone = recipientPhone || "";
      let initEmail = recipientEmail || "";
      let initAmt = amount ? Math.abs(amount) : 0;

      if (hasOwes) {
        initCreditor = owesToList[0];
        initAmt = owesToList[0].amount;
      } else if (hasReceives) {
        initDebtors = [...receivesFromList];
        if (receivesFromList.length === 1) {
          initName = receivesFromList[0].name;
          initPhone = receivesFromList[0].phone || "";
          initEmail = receivesFromList[0].email || "";
          initAmt = receivesFromList[0].amount;
        } else {
          initName = receivesFromList.map((d) => d.name).join(" & ");
          initPhone = receivesFromList.map((d) => d.phone).filter(Boolean).join(", ");
          initEmail = receivesFromList.map((d) => d.email).filter(Boolean).join(", ");
          initAmt = receivesFromList.reduce((sum, d) => sum + d.amount, 0);
        }
      }

      setSelectedCreditor(initCreditor);
      setSelectedDebtors(initDebtors);
      setTargetName(initName);
      setTargetPhone(initPhone);
      setTargetEmail(initEmail);
      setTargetAmount(initAmt);
      setMessage(buildTemplateMessage(templateType, initName, initAmt, initCreditor, initDebtors));
    }
  }, [open, recipientName, contactName, recipientPhone, recipientEmail, amount, groupName, owesToList, receivesFromList, buildTemplateMessage, templateType]);

  const handleSelectCreditor = (creditor: CreditorDebtItem | "all") => {
    setSelectedCreditor(creditor);
    let newAmt = targetAmount;
    if (creditor === "all") {
      newAmt = owesToList.reduce((sum, c) => sum + c.amount, 0);
    } else {
      newAmt = creditor.amount;
    }
    setTargetAmount(newAmt);
    setMessage(buildTemplateMessage(templateType, targetName, newAmt, creditor, []));
  };

  // Toggle debtor on single click (select or deselect)
  const handleToggleDebtor = (debtor: CreditorDebtItem) => {
    const exists = selectedDebtors.some((d) => d.name === debtor.name);
    let updated: CreditorDebtItem[];
    if (exists) {
      updated = selectedDebtors.filter((d) => d.name !== debtor.name);
    } else {
      updated = [...selectedDebtors, debtor];
    }
    applyDebtorSelection(updated);
  };

  // Double-click explicit deselect
  const handleDeselectDebtor = (debtor: CreditorDebtItem) => {
    const updated = selectedDebtors.filter((d) => d.name !== debtor.name);
    applyDebtorSelection(updated);
  };

  const handleSelectAllDebtors = () => {
    applyDebtorSelection([...receivesFromList]);
  };

  const handleClearDebtors = () => {
    applyDebtorSelection([]);
  };

  const handleTemplateChange = (type: "payment" | "settlement" | "general") => {
    setTemplateType(type);
    setMessage(buildTemplateMessage(type, targetName, targetAmount, selectedCreditor, selectedDebtors));
  };

  const handleSendReminder = async () => {
    if (!message.trim()) {
      toast.error("Please enter a reminder message");
      return;
    }

    if (method === "email" && !targetEmail.trim()) {
      toast.error("Please enter a recipient email address");
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
        totalGroupExpense,
        fairShare: memberOwnShare || (totalGroupExpense && totalMembers ? totalGroupExpense / totalMembers : undefined),
        paidAmount: memberPaidAmount,
        netPosition: memberNetPosition,
      });

      if (method === "whatsapp") {
        if (res.whatsappLink) {
          window.open(res.whatsappLink, "_blank");
        }
        toast.success(`WhatsApp reminder prepared for ${targetName}!`);
      } else if (method === "email") {
        if (res.emailSent === false || res.emailError) {
          if (res.isSandboxRestriction) {
            toast.error(
              `Resend Sandbox Limit: Free test mode only permits sending to dipakpawar3747@gmail.com. To send to ${targetEmail}, please configure SMTP in .env or verify a domain on Resend.`,
              { duration: 8000 }
            );
          } else {
            toast.error(`Email delivery failed: ${res.emailError || "Unknown delivery error"}`, { duration: 6000 });
          }
        } else {
          toast.success(`Reminder email sent successfully to ${targetEmail || targetName}!`);
        }
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
          <Button variant="outline" size="sm" className="font-semibold text-xs rounded-xl gap-1.5">
            <Bell className="h-3.5 w-3.5 text-amber-500" />
            <span>Send Reminder</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[560px] max-h-[92vh] overflow-y-auto p-0 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-2xl">
        <DialogHeader className="p-6 pb-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-xs">
              <Bell className="h-5 w-5" />
            </div>
            <div className="space-y-0.5">
              <DialogTitle className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
                Send Settlement Reminder
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                Notify members via WhatsApp, Email, or copy formatted message.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 pt-4 space-y-4">
          {/* Recipient & Amount Preview Card */}
          <div className="p-4 rounded-2xl bg-slate-900/90 dark:bg-slate-900/95 border border-slate-800 shadow-sm text-white space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0">
                  <User className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Reminder For</span>
                    {effectiveGroupName && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700/60 truncate max-w-[150px]">
                        {effectiveGroupName}
                      </span>
                    )}
                  </div>
                  <p className="font-black text-sm sm:text-base text-white truncate tracking-tight mt-0.5">
                    {targetName}
                  </p>
                </div>
              </div>
              {targetAmount > 0 && (
                <div className="shrink-0 text-right">
                  <div className="inline-flex items-center px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono font-black text-sm shadow-xs">
                    {formatCurrency(targetAmount)}
                  </div>
                </div>
              )}
            </div>

            {/* Financial Ledger Context Strip (If group financial figures are provided) */}
            {(totalGroupExpense !== undefined && totalGroupExpense > 0) && (
              <div className="pt-2.5 border-t border-slate-800/80 grid grid-cols-3 gap-2 text-[11px]">
                <div className="bg-slate-800/60 p-2 rounded-xl border border-slate-700/50">
                  <span className="text-slate-400 text-[10px] font-semibold block uppercase">Total Group (T)</span>
                  <span className="font-bold text-white font-mono">{formatCurrency(totalGroupExpense)}</span>
                </div>
                <div className="bg-slate-800/60 p-2 rounded-xl border border-slate-700/50">
                  <span className="text-slate-400 text-[10px] font-semibold block uppercase">Fair Share (T/N)</span>
                  <span className="font-bold text-white font-mono">
                    {formatCurrency(totalMembers ? totalGroupExpense / totalMembers : memberOwnShare || 0)}
                  </span>
                </div>
                <div className="bg-slate-800/60 p-2 rounded-xl border border-slate-700/50">
                  <span className="text-slate-400 text-[10px] font-semibold block uppercase">
                    {memberNetPosition && memberNetPosition > 0 ? "Extra Paid" : "Shortfall"}
                  </span>
                  <span className={cn(
                    "font-bold font-mono",
                    memberNetPosition && memberNetPosition > 0 ? "text-emerald-400" : "text-rose-400"
                  )}>
                    {memberNetPosition && memberNetPosition > 0 ? `+${formatCurrency(memberNetPosition)}` : formatCurrency(Math.abs(memberNetPosition || targetAmount))}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* SECTION: WHO GETS PAYMENT CREDIT (If debtor owes multiple people) */}
          {owesToList.length > 0 && (
            <div className="space-y-2.5 p-4 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                  <CreditCard className="h-3.5 w-3.5" />
                  <span>Credit Recipient (Who Gets Payment Credit):</span>
                </Label>
                <span className="text-[10px] text-emerald-600 font-medium">Select person</span>
              </div>
              <div className="flex flex-wrap gap-2 pt-0.5">
                {owesToList.map((c) => {
                  const isSelected = selectedCreditor !== "all" && selectedCreditor?.name === c.name;
                  return (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => handleSelectCreditor(c)}
                      className={cn(
                        "text-xs px-3 py-2 rounded-xl border text-left font-semibold transition-all flex items-center gap-2 select-none",
                        isSelected
                          ? "bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/20 ring-2 ring-emerald-500/30"
                          : "bg-white dark:bg-slate-900 border-emerald-200 dark:border-emerald-900/60 text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                      )}
                    >
                      <span>{c.name}</span>
                      <Badge variant="outline" className={cn("text-[10px] py-0 px-1 font-mono", isSelected ? "border-white/50 text-white" : "border-emerald-300 text-emerald-700 dark:text-emerald-300")}>
                        +{formatCurrency(c.amount)}
                      </Badge>
                    </button>
                  );
                })}

                {owesToList.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleSelectCreditor("all")}
                    className={cn(
                      "text-xs px-3 py-2 rounded-xl border text-left font-semibold transition-all flex items-center gap-2 select-none",
                      selectedCreditor === "all"
                        ? "bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/20 ring-2 ring-emerald-500/30"
                        : "bg-white dark:bg-slate-900 border-emerald-200 dark:border-emerald-900/60 text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                    )}
                  >
                    <span>All Creditors</span>
                    <Badge variant="outline" className={cn("text-[10px] py-0 px-1 font-mono", selectedCreditor === "all" ? "border-white/50 text-white" : "border-emerald-300 text-emerald-700 dark:text-emerald-300")}>
                      +{formatCurrency(owesToList.reduce((sum, c) => sum + c.amount, 0))}
                    </Badge>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* SECTION: SELECT DEBTOR TO REMIND (If card is for a creditor with incoming credits) */}
          {receivesFromList.length > 0 && owesToList.length === 0 && (
            <div className="space-y-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500">
                    <Users className="h-4 w-4" />
                  </div>
                  <Label className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Pending Debtors (Who Owes {recipientName})
                  </Label>
                </div>
                {receivesFromList.length > 1 && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={handleSelectAllDebtors}
                      className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 transition-colors"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={handleClearDebtors}
                      className="text-[11px] font-bold px-2 py-1 rounded-lg bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                <span>Click debtor to select or deselect • Structured multi-debtor message generated automatically</span>
              </div>

              <div className="flex flex-wrap gap-2 pt-0.5">
                {receivesFromList.map((d) => {
                  const isSelected = selectedDebtors.some((item) => item.name === d.name);
                  return (
                    <button
                      key={d.name}
                      type="button"
                      onClick={() => handleToggleDebtor(d)}
                      onDoubleClick={() => handleDeselectDebtor(d)}
                      title={isSelected ? "Selected (Click to deselect)" : "Click to select"}
                      className={cn(
                        "text-xs px-3 py-2 rounded-xl border text-left font-semibold transition-all duration-150 flex items-center gap-2 select-none shadow-xs cursor-pointer",
                        isSelected
                          ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/25 ring-2 ring-blue-500/40 scale-[1.01]"
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                      )}
                    >
                      {isSelected && <Check className="h-3.5 w-3.5 text-white stroke-[2.5]" />}
                      <span>{d.name}</span>
                      <span
                        className={cn(
                          "text-[10px] py-0.5 px-1.5 rounded-md font-mono font-bold",
                          isSelected
                            ? "bg-blue-700/60 text-blue-100 border border-blue-400/30"
                            : "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40"
                        )}
                      >
                        -{formatCurrency(d.amount)}
                      </span>
                    </button>
                  );
                })}
              </div>

              {selectedDebtors.length > 1 && (
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center gap-2.5 text-xs text-blue-800 dark:text-blue-300 font-medium">
                  <CheckCircle2 className="h-4 w-4 text-blue-500 shrink-0" />
                  <span>
                    <strong>{selectedDebtors.length} debtors selected:</strong> Automatic structured payment breakdown generated below.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Send Via Tabs */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Send Via
            </Label>
            <div className="grid grid-cols-3 gap-2 bg-slate-100 dark:bg-slate-900/80 p-1 rounded-2xl border border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setMethod("whatsapp")}
                className={cn(
                  "flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all",
                  method === "whatsapp"
                    ? "bg-[#25D366] text-slate-950 shadow-md shadow-[#25D366]/20 font-black"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                <MessageCircle className="h-4 w-4" />
                <span>WhatsApp</span>
              </button>
              <button
                type="button"
                onClick={() => setMethod("email")}
                className={cn(
                  "flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all",
                  method === "email"
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/20 font-black"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                <Mail className="h-4 w-4" />
                <span>Email</span>
              </button>
              <button
                type="button"
                onClick={() => setMethod("copy")}
                className={cn(
                  "flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all",
                  method === "copy"
                    ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm font-black"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                <Copy className="h-4 w-4" />
                <span>Copy Text</span>
              </button>
            </div>
          </div>

          {/* Contact Details Input based on Method */}
          {method === "whatsapp" && (
            <div className="space-y-1">
              <Label htmlFor="remPhone" className="text-xs font-bold text-slate-700 dark:text-slate-300">WhatsApp Number (Optional)</Label>
              <Input
                id="remPhone"
                value={targetPhone}
                onChange={(e) => setTargetPhone(e.target.value)}
                placeholder="+91 9876543210"
                className="text-xs h-10 rounded-xl"
              />
              <p className="text-[10px] text-slate-500">If left blank, WhatsApp will let you pick any contact or chat.</p>
            </div>
          )}

          {method === "email" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="remEmail" className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-blue-500" />
                  <span>Recipient Email Address *</span>
                </Label>
                {targetEmail.includes(",") && (
                  <Badge variant="outline" className="text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30">
                    {targetEmail.split(",").filter(Boolean).length} recipients
                  </Badge>
                )}
              </div>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <Input
                  id="remEmail"
                  type="email"
                  value={targetEmail}
                  onChange={(e) => setTargetEmail(e.target.value)}
                  placeholder="friend@example.com, friend2@example.com"
                  required
                  className="pl-10 text-xs h-10 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus-visible:ring-blue-500"
                />
              </div>
              <div className="p-2.5 rounded-xl bg-slate-100/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                <span>Emails can be delivered to any organization or email address. Multiple emails can be comma-separated.</span>
              </div>
            </div>
          )}

          {/* Template Tone Selector */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Template Tone
            </Label>
            <div className="grid grid-cols-3 gap-2 bg-slate-100 dark:bg-slate-900/80 p-1 rounded-2xl border border-slate-200 dark:border-slate-800">
              {(["payment", "settlement", "general"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleTemplateChange(t)}
                  className={cn(
                    "py-1.5 px-3 rounded-xl text-xs font-bold capitalize transition-all text-center",
                    templateType === t
                      ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-black"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Message Textarea */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="remMsg" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Message Preview &amp; Edit
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={copyMessageOnly}
                className="h-7 px-2.5 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-lg gap-1.5"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? "Copied" : "Copy Message"}</span>
              </Button>
            </div>
            <Textarea
              id="remMsg"
              rows={7}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="text-xs leading-relaxed font-sans bg-slate-50 dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 rounded-xl p-3 text-slate-800 dark:text-slate-200 focus-visible:ring-blue-500 resize-none min-h-[160px]"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-11 rounded-xl text-xs font-bold border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isLoading || !message.trim()}
              className={cn(
                "flex-1 h-11 rounded-xl text-xs font-bold transition-all shadow-md",
                method === "whatsapp"
                  ? "bg-[#25D366] hover:bg-[#1EBE5D] text-slate-950 shadow-[#25D366]/20 font-black"
                  : method === "email"
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-600/25"
                  : "bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white"
              )}
              onClick={handleSendReminder}
            >
              {isLoading ? (
                "Sending..."
              ) : method === "whatsapp" ? (
                <>
                  <MessageCircle className="h-4 w-4 mr-1.5" />
                  Open WhatsApp
                </>
              ) : method === "email" ? (
                <>
                  <Mail className="h-4 w-4 mr-1.5" />
                  Send Email
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-1.5" />
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

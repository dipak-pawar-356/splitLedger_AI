"use client";

import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Phone, Link as LinkIcon, Copy, Check, UserPlus, MessageCircle, Share2, Sparkles, RefreshCw } from "lucide-react";
import { createInvitation, getOrCreateGroupInviteLink } from "@/actions/invitations";
import { getGroups } from "@/actions/groups";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface InvitationDialogProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
  groupId?: number | string;
}

export function InvitationDialog({ trigger, open: controlledOpen, onOpenChange: setControlledOpen, onSuccess, groupId }: InvitationDialogProps) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? setControlledOpen! : setInternalOpen;

  const [selectedGroupId, setSelectedGroupId] = useState<number | string | undefined>(groupId);
  const [userGroups, setUserGroups] = useState<Array<{ id: number; name: string; publicId: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Link Tab State
  const [inviteUrl, setInviteUrl] = useState<string>("");
  const [whatsappLink, setWhatsappLink] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [loadingLink, setLoadingLink] = useState(false);

  // Email Tab State
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [emailSentSuccess, setEmailSentSuccess] = useState(false);

  const loadGroupLink = useCallback(async (targetGroupId?: number | string) => {
    const idToUse = targetGroupId || selectedGroupId;
    if (!idToUse) return;
    setLoadingLink(true);
    setError(null);
    try {
      const data = await getOrCreateGroupInviteLink(idToUse);
      setInviteUrl(data.invitationUrl);
      setWhatsappLink(data.whatsappLink);
    } catch (err) {
      console.error("Failed to generate link:", err);
      setError("Failed to generate invitation link. Please retry.");
    } finally {
      setLoadingLink(false);
    }
  }, [selectedGroupId]);

  const loadUserGroups = useCallback(async () => {
    try {
      const res = await getGroups({ status: "active" });
      const list = Array.isArray(res) ? res : [];
      setUserGroups(list);
      if (list.length > 0) {
        const firstId = list[0].id;
        setSelectedGroupId(firstId);
        loadGroupLink(firstId);
      }
    } catch (err) {
      console.error("Failed to load user groups:", err);
    }
  }, [loadGroupLink]);

  useEffect(() => {
    if (open) {
      if (groupId) {
        setSelectedGroupId(groupId);
        loadGroupLink(groupId);
      } else {
        loadUserGroups();
      }
    }
  }, [open, groupId, loadGroupLink, loadUserGroups]);

  const copyToClipboard = () => {
    if (inviteUrl) {
      navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      toast.success("Group invitation link copied to clipboard!");
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Please provide a valid email address");
      return;
    }

    const targetId = selectedGroupId || groupId;
    if (!targetId) {
      setError("Please select a group to send invitation for.");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await createInvitation({
        groupId: targetId,
        email: email.trim(),
        name: name.trim() || undefined,
        phone: phone.trim() || undefined,
      });

      setEmailSentSuccess(true);
      toast.success(`Invitation email sent to ${email}!`);
      setEmail("");
      setName("");
      setPhone("");
      onSuccess?.();
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to send invitation";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && (
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <UserPlus className="h-5 w-5 text-primary" />
            Invite Members to Group
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Share an instant link or send email invitations to split expenses together.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 p-3 rounded-lg text-xs font-medium">
            {error}
          </div>
        )}

        <Tabs defaultValue="link" className="w-full pt-2">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="link" className="text-xs font-semibold">
              <LinkIcon className="h-3.5 w-3.5 mr-1.5" />
              Shareable Link & WhatsApp
            </TabsTrigger>
            <TabsTrigger value="email" className="text-xs font-semibold">
              <Mail className="h-3.5 w-3.5 mr-1.5" />
              Send Email Invite
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Share Link & WhatsApp */}
          <TabsContent value="link" className="space-y-4 pt-4">
            <div className="bg-slate-50 dark:bg-slate-900 border rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Group Invitation Link
                </Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => loadGroupLink()}
                  disabled={loadingLink}
                  className="h-6 px-2 text-[11px] text-slate-500"
                >
                  <RefreshCw className={`h-3 w-3 mr-1 ${loadingLink ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>

              <div className="flex gap-2">
                <Input
                  value={loadingLink ? "Generating secure invite link..." : inviteUrl}
                  readOnly
                  className="font-mono text-xs select-all bg-white dark:bg-slate-950"
                />
                <Button
                  onClick={copyToClipboard}
                  disabled={loadingLink || !inviteUrl}
                  className="shrink-0 font-medium text-xs px-3"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 mr-1.5 text-green-400" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 mr-1.5" />
                      Copy Link
                    </>
                  )}
                </Button>
              </div>

              <p className="text-[11px] text-slate-500">
                Anyone with this link can view the group details and join with their account.
              </p>
            </div>

            {whatsappLink && (
              <Button
                className="w-full bg-[#25D366] hover:bg-[#1EBE5D] text-white font-semibold py-5 shadow-sm text-sm"
                onClick={() => window.open(whatsappLink, "_blank")}
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Share Group Link on WhatsApp
              </Button>
            )}
          </TabsContent>

          {/* Tab 2: Send Email Invite */}
          <TabsContent value="email" className="space-y-4 pt-4">
            {emailSentSuccess && (
              <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 p-3 rounded-lg text-xs font-medium flex items-center justify-between">
                <span>Invitation email sent successfully!</span>
                <Button variant="ghost" size="sm" onClick={() => setEmailSentSuccess(false)} className="h-6 text-[10px]">
                  Send Another
                </Button>
              </div>
            )}

            <form onSubmit={handleSendEmail} className="space-y-3.5">
              <div className="space-y-1.5">
                <Label htmlFor="invEmail" className="text-xs font-medium">Email Address *</Label>
                <Input
                  id="invEmail"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="friend@example.com"
                  required
                  disabled={isLoading}
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="invName" className="text-xs font-medium">Name (Optional)</Label>
                  <Input
                    id="invName"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Rahul Sharma"
                    disabled={isLoading}
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="invPhone" className="text-xs font-medium">Phone (Optional)</Label>
                  <Input
                    id="invPhone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 9876543210"
                    disabled={isLoading}
                    className="text-xs"
                  />
                </div>
              </div>

              <Button type="submit" disabled={isLoading || !email.trim()} className="w-full font-semibold text-xs mt-2">
                {isLoading ? "Sending Email..." : "Send Invitation Email"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Link as LinkIcon, 
  Copy, 
  Check, 
  QrCode, 
  Mail, 
  RefreshCw, 
  Ban, 
  Clock, 
  Users, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  ExternalLink
} from "lucide-react";
import { 
  getOrCreateGroupInviteLink, 
  revokeGroupInviteLink, 
  generateNewGroupInviteLink, 
  createInvitation, 
  getGroupInvitationsHistory,
  cancelInvitation,
  resendInvitation
} from "@/actions/invitations";
import { toast } from "sonner";
import { formatDate, formatRelativeTime, generateInvitationUrl, generateGroupJoinUrl } from "@/lib/utils";
import { generateQrCodeDataUrl } from "@/lib/payments/upi";

interface UniqueGroupInvitationDialogProps {
  groupId: number | string;
  publicId?: string;
  groupName?: string;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function UniqueGroupInvitationDialog({
  groupId,
  publicId,
  groupName,
  trigger,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: UniqueGroupInvitationDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? setControlledOpen! : setInternalOpen;

  const [activeTab, setActiveTab] = useState<"link" | "qr" | "whatsapp" | "email" | "history">("link");
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Link Data
  const [inviteUrl, setInviteUrl] = useState<string>("");
  const [whatsappLink, setWhatsappLink] = useState<string>("");
  const [whatsappMessage, setWhatsappMessage] = useState<string>("");
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [currentGroupName, setCurrentGroupName] = useState<string>(groupName || "");
  const [copied, setCopied] = useState(false);

  // Email form
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  // History data
  const [history, setHistory] = useState<{
    pending: any[];
    accepted: any[];
    rejected: any[];
    expired: any[];
    cancelled: any[];
    joinedMembers: any[];
  } | null>(null);

  const [localQrDataUrl, setLocalQrDataUrl] = useState<string>("");
  const targetIdentifier = publicId || String(groupId);

  const loadInviteData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getOrCreateGroupInviteLink(targetIdentifier);
      const inviteLinkUrl = data.invitationUrl;

      setInviteUrl(inviteLinkUrl);
      setWhatsappLink(data.whatsappLink);
      setWhatsappMessage(data.whatsappMessage);
      setExpiresAt(new Date(data.expiresAt));
      if (data.groupName) setCurrentGroupName(data.groupName);

      try {
        const qrDataUrl = await generateQrCodeDataUrl(inviteLinkUrl, { width: 320, margin: 2 });
        setLocalQrDataUrl(qrDataUrl);
      } catch (qrErr) {
        console.error("Failed to generate local QR code:", qrErr);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load group invite link");
    } finally {
      setLoading(false);
    }
  }, [targetIdentifier]);

  const loadHistoryData = useCallback(async () => {
    try {
      const hist = await getGroupInvitationsHistory(groupId);
      setHistory(hist);
      if (hist.group?.name) setCurrentGroupName(hist.group.name);
    } catch (err) {
      console.error("Failed to load invitation history:", err);
    }
  }, [groupId]);

  useEffect(() => {
    if (open) {
      loadInviteData();
      loadHistoryData();
    }
  }, [open, loadInviteData, loadHistoryData]);

  const handleCopyLink = () => {
    if (inviteUrl) {
      navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      toast.success("Group invite link copied to clipboard!");
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleRevoke = async () => {
    if (!confirm("Are you sure you want to revoke all active links for this group? Anyone with the old link will no longer be able to join.")) {
      return;
    }
    setActionLoading(true);
    try {
      await revokeGroupInviteLink(groupId);
      toast.success("Active invitation links revoked");
      await loadInviteData();
      await loadHistoryData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to revoke invitation links");
    } finally {
      setActionLoading(false);
    }
  };

  const handleGenerateNew = async () => {
    setActionLoading(true);
    try {
      const data = await generateNewGroupInviteLink(groupId);
      setInviteUrl(data.invitationUrl);
      setWhatsappLink(data.whatsappLink);
      setWhatsappMessage(data.whatsappMessage);
      setExpiresAt(new Date(data.expiresAt));

      try {
        const qrDataUrl = await generateQrCodeDataUrl(data.invitationUrl, { width: 320, margin: 2 });
        setLocalQrDataUrl(qrDataUrl);
      } catch (qrErr) {
        console.error("Failed to update QR code on new link generation:", qrErr);
      }

      toast.success("Generated new unique invite link for this group!");
      await loadHistoryData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate new link");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Please enter a valid email address");
      return;
    }
    setActionLoading(true);
    try {
      const res = await createInvitation({
        groupId,
        email: email.trim(),
        name: name.trim() || undefined,
        phone: phone.trim() || undefined,
      });

      if (res.emailSent) {
        toast.success(`Invitation email delivered to ${email.trim()}!`);
      } else if (res.isSandboxRestriction) {
        toast.warning(
          `Invite link created, but Resend is in free sandbox mode (only sends to account email). Add Gmail App Password in .env to email any address!`,
          { duration: 8000 }
        );
      } else if (res.emailError) {
        toast.warning(`Invite link created, but email dispatch failed: ${res.emailError}`, { duration: 6000 });
      } else {
        toast.success(`Invitation link created for ${email.trim()}`);
      }

      setEmail("");
      setName("");
      setPhone("");
      await loadHistoryData();
      setActiveTab("history");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send invitation email");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelSingleInvite = async (inviteId: number) => {
    try {
      await cancelInvitation(inviteId);
      toast.success("Invitation cancelled");
      await loadHistoryData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to cancel invitation");
    }
  };

  const handleResendSingleInvite = async (inviteId: number) => {
    try {
      const res = await resendInvitation(inviteId);
      if (res.emailSent) {
        toast.success("Invitation refreshed and email delivered!");
      } else if (res.isSandboxRestriction) {
        toast.warning("Invitation link refreshed. (Resend sandbox only sends to registered email. Configure Gmail SMTP in .env to email anyone)", { duration: 7000 });
      } else if (res.emailError) {
        toast.warning(`Invitation link refreshed, but email dispatch failed: ${res.emailError}`, { duration: 6000 });
      } else {
        toast.success("Invitation refreshed successfully");
      }
      await loadHistoryData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to resend invitation");
    }
  };

  const qrImageUrl = inviteUrl 
    ? `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(inviteUrl)}&margin=8&format=svg`
    : "";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && (
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
      )}

      <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto p-0 rounded-3xl border-slate-200 dark:border-slate-800">
        <DialogHeader className="p-6 pb-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
          <div className="flex items-center justify-between gap-2">
            <div>
              <DialogTitle className="text-lg font-black tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>Invite to {currentGroupName || "Group"}</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Every group has a completely unique invitation link and independent access control.
              </DialogDescription>
            </div>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs font-bold shrink-0">
              Unique Group Link
            </Badge>
          </div>
        </DialogHeader>

        <div className="p-6 pt-4 space-y-4">
          <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="w-full">
            <TabsList className="grid grid-cols-5 w-full bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl">
              <TabsTrigger value="link" className="text-xs font-bold rounded-xl py-1.5 gap-1">
                <LinkIcon className="h-3.5 w-3.5" />
                <span>Link</span>
              </TabsTrigger>
              <TabsTrigger value="qr" className="text-xs font-bold rounded-xl py-1.5 gap-1">
                <QrCode className="h-3.5 w-3.5" />
                <span>QR Code</span>
              </TabsTrigger>
              <TabsTrigger value="whatsapp" className="text-xs font-bold rounded-xl py-1.5 gap-1">
                <span className="text-emerald-500 font-bold">WA</span>
                <span>WhatsApp</span>
              </TabsTrigger>
              <TabsTrigger value="email" className="text-xs font-bold rounded-xl py-1.5 gap-1">
                <Mail className="h-3.5 w-3.5" />
                <span>Email</span>
              </TabsTrigger>
              <TabsTrigger value="history" className="text-xs font-bold rounded-xl py-1.5 gap-1">
                <Clock className="h-3.5 w-3.5" />
                <span>History</span>
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: Unique Invite Link */}
            <TabsContent value="link" className="space-y-4 pt-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-3">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Unique Secure Invite Link
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={loading ? "Generating group link..." : inviteUrl}
                    className="font-mono text-xs bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 h-10"
                  />
                  <Button
                    type="button"
                    onClick={handleCopyLink}
                    disabled={loading || !inviteUrl}
                    className="shrink-0 h-10 px-4 font-bold text-xs gap-1.5"
                  >
                    {copied ? <Check className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
                    <span>{copied ? "Copied!" : "Copy"}</span>
                  </Button>
                </div>

                {expiresAt && (
                  <p className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-1">
                    <Clock className="h-3.5 w-3.5 text-amber-500" />
                    <span>Valid until: <strong className="text-slate-600 dark:text-slate-300">{formatDate(expiresAt)}</strong></span>
                  </p>
                )}
              </div>

              {/* Action Controls: Revoke & Generate New */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateNew}
                  disabled={actionLoading || loading}
                  className="w-full sm:w-auto text-xs font-bold gap-1.5 rounded-xl border-slate-200 dark:border-slate-800"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${actionLoading ? "animate-spin" : ""}`} />
                  <span>Generate New Link</span>
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRevoke}
                  disabled={actionLoading || loading}
                  className="w-full sm:w-auto text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 gap-1.5 rounded-xl"
                >
                  <Ban className="h-3.5 w-3.5" />
                  <span>Revoke Current Link</span>
                </Button>
              </div>
            </TabsContent>

            {/* TAB 2: Dynamic QR Code */}
            <TabsContent value="qr" className="space-y-4 pt-4 text-center">
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 inline-block mx-auto shadow-sm">
                {(localQrDataUrl || qrImageUrl) ? (
                  <Image
                    unoptimized
                    src={localQrDataUrl || qrImageUrl}
                    alt={`Invite QR code for ${currentGroupName}`}
                    width={192}
                    height={192}
                    className="w-48 h-48 mx-auto rounded-xl shadow-inner border border-slate-100 dark:border-slate-800 object-contain"
                  />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center text-slate-400">
                    <QrCode className="h-12 w-12 animate-pulse" />
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <p className="font-bold text-xs text-slate-800 dark:text-slate-200">
                  Scan to Join {currentGroupName}
                </p>
                <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                  Open your camera or QR scanner. Anyone scanning this code joins this specific group immediately upon confirmation.
                </p>
              </div>
            </TabsContent>

            {/* TAB 3: WhatsApp Share */}
            <TabsContent value="whatsapp" className="space-y-4 pt-4">
              <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 space-y-3">
                <Label className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  WhatsApp Invite Preview
                </Label>
                <div className="p-3 bg-white dark:bg-slate-950 rounded-xl border border-emerald-100 dark:border-emerald-900/30 text-xs text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed font-sans">
                  {whatsappMessage || `Hey! Join our group "${currentGroupName}" on SplitLedger AI to split expenses effortlessly.\n\n${inviteUrl}`}
                </div>
                <a
                  href={whatsappLink || `https://wa.me/?text=${encodeURIComponent(inviteUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <Button
                    type="button"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-10 gap-2 rounded-xl shadow-sm"
                  >
                    <span>Open in WhatsApp</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </a>
              </div>
            </TabsContent>

            {/* TAB 4: Send Email Invite */}
            <TabsContent value="email" className="space-y-4 pt-4">
              <form onSubmit={handleSendEmail} className="space-y-3.5">
                <div className="space-y-1.5">
                  <Label htmlFor="inv-email" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Recipient Email Address <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="inv-email"
                    type="email"
                    placeholder="friend@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="rounded-xl h-10 text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="inv-name" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Recipient Name (Optional)
                    </Label>
                    <Input
                      id="inv-name"
                      placeholder="e.g. Alex"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="rounded-xl h-10 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="inv-phone" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Mobile Number (Optional)
                    </Label>
                    <Input
                      id="inv-phone"
                      placeholder="+91 98765 43210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="rounded-xl h-10 text-xs"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={actionLoading || !email.trim()}
                  className="w-full rounded-xl h-10 font-bold text-xs gap-1.5 mt-2"
                >
                  <Mail className="h-4 w-4" />
                  <span>{actionLoading ? "Sending Email..." : "Send Invitation Email"}</span>
                </Button>
              </form>
            </TabsContent>

            {/* TAB 5: Invitation History & Joined Members */}
            <TabsContent value="history" className="space-y-4 pt-4">
              {history ? (
                <div className="space-y-4">
                  {/* Pending Invitations */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                      <span>Pending Invitations ({history.pending.length})</span>
                    </div>
                    {history.pending.length > 0 ? (
                      <div className="divide-y divide-slate-100 dark:divide-slate-800 border rounded-2xl overflow-hidden bg-slate-50/50 dark:bg-slate-900/30">
                        {history.pending.map((inv) => {
                          const isPublicShare = inv.email === "invite@splitledger.app";
                          const directUrl = inv.token ? generateInvitationUrl(inv.token) : "";
                          return (
                            <div key={inv.id} className="p-3 flex items-center justify-between text-xs gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <p className="font-bold text-slate-900 dark:text-slate-100 truncate">
                                    {isPublicShare ? "Public Share Link / QR Code" : inv.email}
                                  </p>
                                  {isPublicShare ? (
                                    <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                                      Reusable Link / QR
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-[10px] text-slate-500">
                                      Email Invite
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-400 mt-0.5">
                                  Expires: {formatDate(inv.expiresAt)}
                                  {inv.name ? ` • Name: ${inv.name}` : ""}
                                </p>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                {directUrl && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      navigator.clipboard.writeText(directUrl);
                                      toast.success("Invitation link copied!");
                                    }}
                                    className="h-7 text-[11px] px-2 gap-1 text-slate-600 dark:text-slate-300"
                                    title="Copy Invite URL"
                                  >
                                    <Copy className="h-3 w-3" />
                                    <span>Copy</span>
                                  </Button>
                                )}
                                {!isPublicShare && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleResendSingleInvite(inv.id)}
                                    className="h-7 text-[11px] px-2 text-primary hover:text-primary"
                                  >
                                    Resend
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleCancelSingleInvite(inv.id)}
                                  className="h-7 text-[11px] px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic p-2 border rounded-2xl bg-slate-50/50 dark:bg-slate-900/30">
                        No active pending invitations.
                      </p>
                    )}
                  </div>

                  {/* Joined Members */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                      <span>Joined Members ({history.joinedMembers.length})</span>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800 border rounded-2xl overflow-hidden bg-slate-50/50 dark:bg-slate-900/30">
                      {history.joinedMembers.map((m) => (
                        <div key={m.id} className="p-3 flex items-center justify-between text-xs">
                          <div>
                            <p className="font-bold text-slate-900 dark:text-slate-100">{m.name}</p>
                            <p className="text-[11px] text-slate-400">{m.email || m.phone || "Member"}</p>
                          </div>
                          <Badge variant="outline" className="text-[10px] capitalize">
                            {m.isAdmin ? "Admin" : m.isGuest ? "Guest" : "Member"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Past / Completed Invitations Log */}
                  {((history.accepted && history.accepted.length > 0) ||
                    (history.expired && history.expired.length > 0) ||
                    (history.cancelled && history.cancelled.length > 0)) && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                        <span>
                          Past Invitations History (
                          {(history.accepted?.length || 0) +
                            (history.expired?.length || 0) +
                            (history.cancelled?.length || 0)}
                          )
                        </span>
                      </div>
                      <div className="divide-y divide-slate-100 dark:divide-slate-800 border rounded-2xl overflow-hidden bg-slate-50/50 dark:bg-slate-900/30 max-h-48 overflow-y-auto">
                        {history.accepted?.map((inv: any) => (
                          <div key={inv.id} className="p-2.5 flex items-center justify-between text-xs">
                            <div className="truncate mr-2">
                              <p className="font-medium text-slate-800 dark:text-slate-200 truncate">
                                {inv.email === "invite@splitledger.app" ? "Public Link / QR" : inv.email}
                              </p>
                              <p className="text-[10px] text-slate-400">Accepted {formatDate(inv.acceptedAt)}</p>
                            </div>
                            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] shrink-0">
                              Accepted
                            </Badge>
                          </div>
                        ))}
                        {history.cancelled?.map((inv: any) => (
                          <div key={inv.id} className="p-2.5 flex items-center justify-between text-xs">
                            <div className="truncate mr-2">
                              <p className="font-medium text-slate-600 dark:text-slate-400 truncate">
                                {inv.email === "invite@splitledger.app" ? "Public Link / QR" : inv.email}
                              </p>
                              <p className="text-[10px] text-slate-400">Cancelled {formatDate(inv.cancelledAt)}</p>
                            </div>
                            <Badge variant="outline" className="text-[10px] text-rose-500 border-rose-200 dark:border-rose-900 shrink-0">
                              Cancelled
                            </Badge>
                          </div>
                        ))}
                        {history.expired?.map((inv: any) => (
                          <div key={inv.id} className="p-2.5 flex items-center justify-between text-xs">
                            <div className="truncate mr-2">
                              <p className="font-medium text-slate-500 truncate">
                                {inv.email === "invite@splitledger.app" ? "Public Link / QR" : inv.email}
                              </p>
                              <p className="text-[10px] text-slate-400">Expired {formatDate(inv.expiresAt)}</p>
                            </div>
                            <Badge variant="outline" className="text-[10px] text-slate-400 shrink-0">
                              Expired
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-slate-400">
                  Loading invitation history...
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}

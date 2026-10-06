"use client";

import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Search, Mail, Phone, User, Check, X, Copy, Share2, MessageCircle, Link as LinkIcon, RefreshCw } from "lucide-react";
import { searchMembers, addExistingUserToGroup, createGuestMember, addContactToGroup } from "@/actions/smart-member";
import { getOrCreateGroupInviteLink } from "@/actions/invitations";
import { SearchResult } from "@/actions/smart-member";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface SmartAddMemberDialogProps {
  groupId: number | string;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function SmartAddMemberDialog({ groupId, trigger, onSuccess }: SmartAddMemberDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("search");

  // Search Tab State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Group Invite Link State
  const [inviteUrl, setInviteUrl] = useState<string>("");
  const [whatsappLink, setWhatsappLink] = useState<string>("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [loadingLink, setLoadingLink] = useState(false);

  // Guest invitation success state
  const [inviteSuccessData, setInviteSuccessData] = useState<{
    memberName: string;
    invitationUrl: string;
    whatsappLink: string | null;
  } | null>(null);
  
  // Guest form state
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestNickname, setGuestNickname] = useState("");
  const [guestNotes, setGuestNotes] = useState("");
  const [guestRelationship, setGuestRelationship] = useState("");

  const loadGroupLink = useCallback(async () => {
    setLoadingLink(true);
    try {
      const data = await getOrCreateGroupInviteLink(groupId);
      setInviteUrl(data.invitationUrl);
      setWhatsappLink(data.whatsappLink);
    } catch (err) {
      console.error("Failed to generate group link:", err);
    } finally {
      setLoadingLink(false);
    }
  }, [groupId]);

  useEffect(() => {
    if (open && groupId) {
      loadGroupLink();
    }
  }, [open, groupId, loadGroupLink]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    setError(null);

    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await searchMembers(query.trim());
      setSearchResults(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddExistingUser = async (userId: number) => {
    setIsAdding(true);
    setError(null);
    try {
      await addExistingUserToGroup(groupId, userId);
      toast.success("User added to group successfully!");
      setOpen(false);
      onSuccess?.();
      router.refresh();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to add user";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsAdding(false);
    }
  };

  const handleAddContact = async (contactId: number) => {
    setIsAdding(true);
    setError(null);
    try {
      await addContactToGroup(groupId, contactId);
      toast.success("Contact added to group successfully!");
      setOpen(false);
      onSuccess?.();
      router.refresh();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to add contact";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsAdding(false);
    }
  };

  const handleCreateGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdding(true);
    setError(null);

    try {
      const result = await createGuestMember({
        groupId,
        name: guestName.trim(),
        email: guestEmail.trim() || undefined,
        phone: guestPhone.trim() || undefined,
        nickname: guestNickname.trim() || undefined,
        notes: guestNotes.trim() || undefined,
        relationship: guestRelationship.trim() || undefined,
      });

      toast.success(`Guest member "${guestName}" added to group!`);

      setInviteSuccessData({
        memberName: guestName.trim(),
        invitationUrl: result.invitationUrl,
        whatsappLink: result.whatsappLink,
      });

      onSuccess?.();
      router.refresh();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create guest member";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsAdding(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    toast.success("Invitation link copied to clipboard!");
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const resetForm = () => {
    setSearchQuery("");
    setSearchResults([]);
    setInviteSuccessData(null);
    setGuestName("");
    setGuestEmail("");
    setGuestPhone("");
    setGuestNickname("");
    setGuestNotes("");
    setGuestRelationship("");
    setError(null);
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      resetForm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" className="font-semibold shadow-sm">
            <UserPlus className="h-4 w-4 mr-2" />
            Invite Member
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <UserPlus className="h-5 w-5 text-primary" />
            {inviteSuccessData ? "Guest Added & Invitation Ready" : "Add or Invite Group Members"}
          </DialogTitle>
        </DialogHeader>

        {inviteSuccessData ? (
          <div className="space-y-5 py-2">
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 text-center">
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900 rounded-full flex items-center justify-center mx-auto mb-3 text-emerald-600">
                <Check className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-emerald-950 dark:text-emerald-200 text-lg">
                {inviteSuccessData.memberName} Added as Guest!
              </h3>
              <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-1">
                They can participate in expense splits right now. Share the invite link below so they can claim their account.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Personal Invitation Link (Expires in 7 days)
              </Label>
              <div className="flex gap-2">
                <Input
                  value={inviteSuccessData.invitationUrl}
                  readOnly
                  className="font-mono text-xs select-all bg-slate-50 dark:bg-slate-900"
                />
                <Button
                  variant="outline"
                  onClick={() => copyToClipboard(inviteSuccessData.invitationUrl)}
                >
                  <Copy className="h-4 w-4 mr-1.5" />
                  Copy
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              {inviteSuccessData.whatsappLink && (
                <Button
                  className="bg-[#25D366] hover:bg-[#1EBE5D] text-white font-semibold w-full"
                  onClick={() => window.open(inviteSuccessData.whatsappLink!, "_blank")}
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Send Invitation on WhatsApp
                </Button>
              )}
              <Button
                variant="outline"
                className="w-full font-medium"
                onClick={() => {
                  setOpen(false);
                  resetForm();
                }}
              >
                Done
              </Button>
            </div>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full pt-1">
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="search" className="text-xs font-semibold">
                <Search className="h-3.5 w-3.5 mr-1" />
                Search User
              </TabsTrigger>
              <TabsTrigger value="guest" className="text-xs font-semibold">
                <UserPlus className="h-3.5 w-3.5 mr-1" />
                Add Guest
              </TabsTrigger>
              <TabsTrigger value="link" className="text-xs font-semibold">
                <LinkIcon className="h-3.5 w-3.5 mr-1" />
                Group Link
              </TabsTrigger>
            </TabsList>

            {/* Tab 1: Search */}
            <TabsContent value="search" className="space-y-4 pt-4">
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 p-2.5 rounded-lg text-xs font-medium">
                  {error}
                </div>
              )}

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by registered email or name..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-9 text-xs"
                  disabled={isAdding}
                />
              </div>

              {isSearching && (
                <div className="text-center text-slate-500 py-4 text-xs">
                  Searching registered users & contacts...
                </div>
              )}

              {searchResults.length > 0 && (
                <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                  {searchResults.map((result) => (
                    <div
                      key={`${result.type}-${result.id}`}
                      className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 border rounded-xl hover:border-primary/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-xs">
                          {result.name ? result.name.charAt(0).toUpperCase() : "U"}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-xs text-slate-900 dark:text-slate-100">{result.name}</p>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                              {result.type === "user" ? "User" : "Contact"}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500">{result.email || result.phone || "No contact info"}</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        className="h-7 text-xs px-2.5 font-medium"
                        onClick={() => {
                          if (result.type === "user" && result.id) {
                            handleAddExistingUser(result.id);
                          } else if (result.type === "contact" && result.id) {
                            handleAddContact(result.id);
                          }
                        }}
                        disabled={isAdding}
                      >
                        <Check className="h-3.5 w-3.5 mr-1" />
                        Add
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {searchQuery.trim().length >= 2 && searchResults.length === 0 && !isSearching && (
                <div className="text-center py-6 border border-dashed rounded-xl p-4">
                  <User className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                  <p className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                    No registered user found for &quot;{searchQuery}&quot;
                  </p>
                  <p className="text-[11px] text-slate-500 mb-3 mt-0.5">
                    Add them as a guest member so you can split expenses with them right now.
                  </p>
                  <Button
                    size="sm"
                    onClick={() => {
                      setGuestName(searchQuery.includes("@") ? "" : searchQuery);
                      if (searchQuery.includes("@")) setGuestEmail(searchQuery);
                      setActiveTab("guest");
                    }}
                    disabled={isAdding}
                  >
                    <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                    Create Guest Member
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* Tab 2: Guest Member */}
            <TabsContent value="guest" className="space-y-3.5 pt-4">
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 p-2.5 rounded-lg text-xs font-medium">
                  {error}
                </div>
              )}

              <form onSubmit={handleCreateGuest} className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="guestName" className="text-xs font-medium">Full Name *</Label>
                  <Input
                    id="guestName"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    disabled={isAdding}
                    required
                    className="text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="guestEmail" className="text-xs font-medium">
                      <Mail className="h-3 w-3 inline mr-1 text-slate-500" />
                      Email (Optional)
                    </Label>
                    <Input
                      id="guestEmail"
                      type="email"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      placeholder="rahul@example.com"
                      disabled={isAdding}
                      className="text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="guestPhone" className="text-xs font-medium">
                      <Phone className="h-3 w-3 inline mr-1 text-slate-500" />
                      Phone / WhatsApp
                    </Label>
                    <Input
                      id="guestPhone"
                      type="tel"
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
                      placeholder="+91 9876543210"
                      disabled={isAdding}
                      className="text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="guestNickname" className="text-xs font-medium">Nickname (Optional)</Label>
                    <Input
                      id="guestNickname"
                      value={guestNickname}
                      onChange={(e) => setGuestNickname(e.target.value)}
                      placeholder="e.g. Rahul"
                      disabled={isAdding}
                      className="text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="guestRelationship" className="text-xs font-medium">Relationship</Label>
                    <Input
                      id="guestRelationship"
                      value={guestRelationship}
                      onChange={(e) => setGuestRelationship(e.target.value)}
                      placeholder="e.g. Friend, Flatmate"
                      disabled={isAdding}
                      className="text-xs"
                    />
                  </div>
                </div>

                <Button type="submit" disabled={isAdding || !guestName.trim()} className="w-full font-semibold text-xs mt-2">
                  {isAdding ? "Adding Guest..." : "Add Guest & Generate Invite"}
                </Button>
              </form>
            </TabsContent>

            {/* Tab 3: Group Link */}
            <TabsContent value="link" className="space-y-4 pt-4">
              <div className="bg-slate-50 dark:bg-slate-900 border rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    General Group Invitation Link
                  </Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={loadGroupLink}
                    disabled={loadingLink}
                    className="h-6 px-2 text-[11px] text-slate-500"
                  >
                    <RefreshCw className={`h-3 w-3 mr-1 ${loadingLink ? "animate-spin" : ""}`} />
                    Refresh
                  </Button>
                </div>

                <div className="flex gap-2">
                  <Input
                    value={loadingLink ? "Generating link..." : inviteUrl}
                    readOnly
                    className="font-mono text-xs select-all bg-white dark:bg-slate-950"
                  />
                  <Button
                    onClick={() => copyToClipboard(inviteUrl)}
                    disabled={loadingLink || !inviteUrl}
                    className="shrink-0 font-medium text-xs px-3"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="h-3.5 w-3.5 mr-1 text-green-400" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 mr-1" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>

                <p className="text-[11px] text-slate-500">
                  Anyone with this link can join this group and participate in shared expense settlements.
                </p>
              </div>

              {whatsappLink && (
                <Button
                  className="w-full bg-[#25D366] hover:bg-[#1EBE5D] text-white font-semibold py-4 text-xs"
                  onClick={() => window.open(whatsappLink, "_blank")}
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Share Group Link on WhatsApp
                </Button>
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
